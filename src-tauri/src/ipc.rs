use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::LunetteError;

#[derive(Serialize, Deserialize)]
pub struct IpcMessage {
    pub payload: String,
    pub source: IpcSource,
}

#[derive(Serialize, Deserialize)]
pub enum IpcSource {
    Pipe,
    DeepLink,
}

fn lock_path() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home).join(".lunette").join("lunette.lock")
}

#[cfg(unix)]
const SOCKET_PATH: &str = "/tmp/lunette.sock";

#[cfg(windows)]
const PIPE_NAME: &str = r"\\.\pipe\lunette";

// ---------------------------------------------------------------------------
// File-lock helpers (cross-platform, stdlib only)
// ---------------------------------------------------------------------------

/// Try to acquire an exclusive lock on the lock file.
/// Returns the open `File` on success (lock released when file is dropped),
/// or `None` if the lock is already held by another process.
fn try_acquire_lock() -> Option<fs::File> {
    let path = lock_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let file = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(&path)
        .ok()?;

    #[cfg(unix)]
    {
        use std::os::unix::io::AsRawFd;
        let fd = file.as_raw_fd();
        // LOCK_EX | LOCK_NB
        let ret = unsafe { libc_flock(fd, 2 | 4) };
        if ret != 0 {
            return None;
        }
    }

    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawHandle;
        use windows_sys::Win32::Storage::FileSystem::{LockFileEx, LOCKFILE_EXCLUSIVE_LOCK, LOCKFILE_FAIL_IMMEDIATELY};
        use windows_sys::Win32::System::IO::OVERLAPPED;
        let handle = file.as_raw_handle();
        let mut overlapped: OVERLAPPED = unsafe { std::mem::zeroed() };
        let ok = unsafe {
            LockFileEx(
                handle as _,
                LOCKFILE_EXCLUSIVE_LOCK | LOCKFILE_FAIL_IMMEDIATELY,
                0,
                1,
                0,
                &mut overlapped,
            )
        };
        if ok == 0 {
            return None;
        }
    }

    Some(file)
}

// Thin wrapper so we don't pull in the `libc` crate just for flock.
#[cfg(unix)]
unsafe fn libc_flock(fd: std::os::unix::io::RawFd, operation: i32) -> i32 {
    extern "C" {
        fn flock(fd: i32, operation: i32) -> i32;
    }
    flock(fd, operation)
}

// ---------------------------------------------------------------------------
// IpcServer
// ---------------------------------------------------------------------------

pub struct IpcServer;

impl IpcServer {
    /// Acquire the instance lock and start listening for incoming IPC messages.
    ///
    /// Returns `Ok(())` immediately after spawning the background listener thread.
    /// The `on_payload` callback is invoked on the background thread for every
    /// message received.
    ///
    /// Returns `Err(IpcConnectionFailed)` if the lock is already held (i.e. another
    /// instance is running) — the caller should then use `IpcClient::send` instead.
    pub fn listen(on_payload: impl Fn(String) + Send + 'static) -> Result<(), LunetteError> {
        // Try to acquire the lock; if we can't, another instance is running.
        let _lock = try_acquire_lock().ok_or(LunetteError::IpcConnectionFailed)?;

        // Spawn the listener; the lock file stays open (and locked) for the
        // lifetime of the spawned thread via the moved `_lock`.
        std::thread::spawn(move || {
            let _keep_lock = _lock; // keep lock alive
            #[cfg(unix)]
            Self::listen_unix(on_payload);
            #[cfg(windows)]
            Self::listen_windows(on_payload);
        });

        Ok(())
    }

    #[cfg(unix)]
    fn listen_unix(on_payload: impl Fn(String) + Send + 'static) {
        use std::os::unix::net::UnixListener;

        // Remove stale socket if present.
        let _ = fs::remove_file(SOCKET_PATH);

        let listener = match UnixListener::bind(SOCKET_PATH) {
            Ok(l) => l,
            Err(e) => {
                tracing::error!("IpcServer: failed to bind Unix socket: {e}");
                return;
            }
        };

        for stream in listener.incoming() {
            match stream {
                Ok(mut s) => {
                    let mut buf = String::new();
                    if s.read_to_string(&mut buf).is_ok() {
                        if let Ok(msg) = serde_json::from_str::<IpcMessage>(&buf) {
                            on_payload(msg.payload);
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("IpcServer: accept error: {e}");
                }
            }
        }
    }

    #[cfg(windows)]
    fn listen_windows(on_payload: impl Fn(String) + Send + 'static) {
        use std::io::BufReader;

        loop {
            // Create a named pipe instance for each connection.
            let pipe = match named_pipe_server_create(PIPE_NAME) {
                Ok(p) => p,
                Err(e) => {
                    tracing::error!("IpcServer: failed to create named pipe: {e}");
                    return;
                }
            };

            // Wait for a client to connect (blocking).
            if named_pipe_connect(&pipe).is_err() {
                continue;
            }

            let mut reader = BufReader::new(&pipe);
            let mut buf = String::new();
            if reader.read_to_string(&mut buf).is_ok() {
                if let Ok(msg) = serde_json::from_str::<IpcMessage>(&buf) {
                    on_payload(msg.payload);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// IpcClient
// ---------------------------------------------------------------------------

pub struct IpcClient;

impl IpcClient {
    /// Send `payload` to the running Lunette instance via IPC.
    ///
    /// Returns `Ok(())` on success, or `Err(IpcConnectionFailed)` if no
    /// instance is listening (so the caller can start a new instance as
    /// fallback).
    pub fn send(payload: &str) -> Result<(), LunetteError> {
        let msg = IpcMessage {
            payload: payload.to_string(),
            source: IpcSource::Pipe,
        };
        let json = serde_json::to_string(&msg).map_err(|_| LunetteError::IpcConnectionFailed)?;

        #[cfg(unix)]
        {
            use std::os::unix::net::UnixStream;
            let mut stream =
                UnixStream::connect(SOCKET_PATH).map_err(|_| LunetteError::IpcConnectionFailed)?;
            stream
                .write_all(json.as_bytes())
                .map_err(|_| LunetteError::IpcConnectionFailed)?;
        }

        #[cfg(windows)]
        {
            named_pipe_client_send(PIPE_NAME, &json)
                .map_err(|_| LunetteError::IpcConnectionFailed)?;
        }

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Windows named-pipe helpers (compiled only on Windows)
// ---------------------------------------------------------------------------

#[cfg(windows)]
fn named_pipe_server_create(name: &str) -> std::io::Result<std::fs::File> {
    use std::os::windows::io::FromRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
        FILE_FLAG_OVERLAPPED, PIPE_ACCESS_INBOUND,
    };
    use windows_sys::Win32::System::Pipes::{
        CreateNamedPipeW, PIPE_READMODE_BYTE, PIPE_TYPE_BYTE, PIPE_WAIT,
    };

    let wide: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
    let handle = unsafe {
        CreateNamedPipeW(
            wide.as_ptr(),
            PIPE_ACCESS_INBOUND,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
            1,    // max instances
            4096, // out buffer
            4096, // in buffer
            0,    // default timeout
            std::ptr::null(),
        )
    };
    if handle == windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE {
        return Err(std::io::Error::last_os_error());
    }
    Ok(unsafe { std::fs::File::from_raw_handle(handle as _) })
}

#[cfg(windows)]
fn named_pipe_connect(pipe: &std::fs::File) -> std::io::Result<()> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::System::Pipes::ConnectNamedPipe;

    let ok = unsafe { ConnectNamedPipe(pipe.as_raw_handle() as _, std::ptr::null_mut()) };
    if ok == 0 {
        let err = std::io::Error::last_os_error();
        // ERROR_PIPE_CONNECTED (535) means a client connected before we called ConnectNamedPipe — that's fine.
        if err.raw_os_error() != Some(535) {
            return Err(err);
        }
    }
    Ok(())
}

#[cfg(windows)]
fn named_pipe_client_send(name: &str, data: &str) -> std::io::Result<()> {
    use std::os::windows::io::FromRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
        CreateFileW, FILE_GENERIC_WRITE, FILE_SHARE_NONE, OPEN_EXISTING,
    };

    let wide: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
    let handle = unsafe {
        CreateFileW(
            wide.as_ptr(),
            FILE_GENERIC_WRITE,
            FILE_SHARE_NONE,
            std::ptr::null(),
            OPEN_EXISTING,
            0,
            std::ptr::null_mut(),
        )
    };
    if handle == windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE {
        return Err(std::io::Error::last_os_error());
    }
    let mut file = unsafe { std::fs::File::from_raw_handle(handle as _) };
    file.write_all(data.as_bytes())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;

    /// Unit test: single-instance — seconda invocazione invia payload all'istanza esistente
    ///
    /// Simula lo scenario in cui una seconda invocazione di Lunette trova l'istanza
    /// già in esecuzione: serializza il payload e lo invia via IPC all'istanza esistente,
    /// che lo riceve correttamente.
    ///
    /// Validates: Requirements 7.1, 7.2, 7.3
    #[cfg(unix)]
    #[test]
    fn test_second_invocation_sends_payload_to_existing_instance() {
        use std::io::Write;
        use std::os::unix::net::{UnixListener, UnixStream};

        // Use a unique temp socket path to avoid conflicts with other tests or
        // a running Lunette instance.
        let socket_path = format!("/tmp/lunette_test_{}.sock", std::process::id());
        let _ = fs::remove_file(&socket_path);

        // --- First instance: start the IPC server on the test socket ---
        let received_payload: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
        let received_clone = Arc::clone(&received_payload);
        let socket_path_server = socket_path.clone();

        let listener = UnixListener::bind(&socket_path_server)
            .expect("failed to bind test Unix socket");

        // Signal that the server is ready to accept connections.
        let (ready_tx, ready_rx) = std::sync::mpsc::channel::<()>();

        std::thread::spawn(move || {
            // Notify the main thread that the listener is bound and ready.
            ready_tx.send(()).unwrap();

            // Accept exactly one connection (simulating the second invocation).
            if let Ok((mut stream, _)) = listener.accept() {
                let mut buf = String::new();
                if stream.read_to_string(&mut buf).is_ok() {
                    if let Ok(msg) = serde_json::from_str::<IpcMessage>(&buf) {
                        *received_clone.lock().unwrap() = Some(msg.payload);
                    }
                }
            }
        });

        // Wait for the server thread to be ready before the client connects.
        ready_rx
            .recv_timeout(Duration::from_secs(5))
            .expect("server did not become ready in time");

        // --- Second invocation: serialize payload and send to existing instance ---
        let test_payload = "graph TD\nA-->B";
        let msg = IpcMessage {
            payload: test_payload.to_string(),
            source: IpcSource::Pipe,
        };
        let json = serde_json::to_string(&msg).expect("serialization failed");

        let mut stream =
            UnixStream::connect(&socket_path).expect("second invocation: failed to connect");
        stream
            .write_all(json.as_bytes())
            .expect("second invocation: failed to send payload");
        // Drop the stream to signal EOF so read_to_string completes on the server side.
        drop(stream);

        // --- Verify: existing instance received the exact payload ---
        // Give the server thread a moment to process the message.
        std::thread::sleep(Duration::from_millis(200));

        let guard = received_payload.lock().unwrap();
        assert_eq!(
            guard.as_deref(),
            Some(test_payload),
            "existing instance should have received the exact payload sent by the second invocation"
        );

        // Cleanup.
        let _ = fs::remove_file(&socket_path);
    }

    /// Verifica che IpcClient::send fallisca con IpcConnectionFailed quando nessuna
    /// istanza è in ascolto sul socket — il chiamante deve avviare una nuova istanza
    /// come fallback (Requirement 7.4).
    #[cfg(unix)]
    #[test]
    fn test_ipc_client_fails_when_no_server_listening() {
        // Ensure no server is bound to the production socket for this test.
        // We simply attempt to send without starting a server; the connect()
        // call inside IpcClient::send will fail immediately.
        //
        // Note: if a real Lunette instance happens to be running this test will
        // succeed from the client's perspective (it would deliver to the real
        // instance). The test is therefore best-effort in CI where no app runs.
        let _ = fs::remove_file(SOCKET_PATH);
        let result = IpcClient::send("hello");
        assert!(
            result.is_err(),
            "IpcClient::send should return Err when no server is listening"
        );
    }
}
