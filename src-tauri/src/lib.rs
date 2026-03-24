pub mod content_detector;
pub mod deep_link_handler;
pub mod decompressor;
pub mod error;
pub mod ipc;
pub mod pipe_handler;
pub mod plugin_loader;
pub mod skill_installer;
pub mod temp_file;

pub use error::LunetteError;

use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

use content_detector::{ContentDetector, ContentType};
use deep_link_handler::DeepLinkHandler;
use ipc::{IpcClient, IpcServer};
use pipe_handler::PipeHandler;
use plugin_loader::{PluginLoader, PluginRegistry};

#[derive(Serialize, Clone)]
#[serde(untagged)]
pub enum ContentTypeDto {
    Simple(String),
    Plugin(PluginDto),
}

#[derive(Serialize, Clone)]
pub struct PluginDto {
    pub plugin: PluginDtoInner,
}

#[derive(Serialize, Clone)]
pub struct PluginDtoInner {
    pub id: String,
    #[serde(rename = "entryPoint")]
    pub entry_point: String,
}

#[derive(Serialize, Clone)]
pub struct NewContentPayload {
    pub content: String,
    #[serde(rename = "contentType")]
    pub content_type: ContentTypeDto,
}

#[derive(Serialize, Clone)]
pub struct ErrorPayload {
    pub title: String,
    pub message: String,
}

pub struct RegistryState(pub Arc<Mutex<PluginRegistry>>);

/// Pending payload: set at startup or by on_open_url before frontend is ready.
/// Once frontend_ready is called, this is drained and future payloads go direct.
pub struct PendingPayload {
    pub content: Mutex<Option<String>>,
    pub frontend_ready: Mutex<bool>,
}

pub mod commands {
    use std::sync::Arc;
    use tauri::{AppHandle, Emitter, State};
    use crate::{run_pipeline, ErrorPayload, RegistryState, PendingPayload};

    #[tauri::command]
    pub fn frontend_ready(
        app: AppHandle,
        registry: State<RegistryState>,
        pending: State<Arc<PendingPayload>>,
    ) {
        // Mark frontend as ready
        *pending.frontend_ready.lock().unwrap() = true;

        let content = pending.content.lock().unwrap().take();
        match content {
            Some(c) => {
                let reg = registry.0.lock().unwrap();
                run_pipeline(&app, c, &reg);
            }
            None => {
                let _ = app.emit(
                    "lunette://error",
                    ErrorPayload {
                        title: "Come usare Lunette".into(),
                        message: "Avvia Lunette tramite pipe o deep link.".into(),
                    },
                );
            }
        }
    }

    #[tauri::command]
    pub fn copy_source(_content: String) -> Result<(), String> { Ok(()) }

    #[tauri::command]
    pub fn export_png(_data_url: String) -> Result<(), String> { Ok(()) }
}

fn content_type_to_dto(ct: &ContentType, registry: &PluginRegistry) -> Option<ContentTypeDto> {
    match ct {
        ContentType::Mermaid => Some(ContentTypeDto::Simple("mermaid".into())),
        ContentType::Excalidraw => Some(ContentTypeDto::Simple("excalidraw".into())),
        ContentType::Json => Some(ContentTypeDto::Simple("json".into())),
        ContentType::Latex => Some(ContentTypeDto::Simple("latex".into())),
        ContentType::Markdown => Some(ContentTypeDto::Simple("markdown".into())),
        ContentType::Plugin(id) => {
            let entry_point = registry
                .plugins()
                .iter()
                .find(|p| &p.id == id)
                .map(|p| p.entry_point.to_string_lossy().into_owned())
                .unwrap_or_default();
            Some(ContentTypeDto::Plugin(PluginDto {
                plugin: PluginDtoInner { id: id.clone(), entry_point },
            }))
        }
        ContentType::Unrecognized => None,
    }
}

pub fn run_pipeline(app: &AppHandle, content: String, registry: &PluginRegistry) {
    let detector = ContentDetector::new(Arc::new(registry.clone()));
    let ct = detector.detect(&content);
    match content_type_to_dto(&ct, registry) {
        Some(dto) => {
            let _ = app.emit("lunette://new-content", NewContentPayload { content, content_type: dto });
        }
        None => {
            let _ = app.emit("lunette://error", ErrorPayload {
                title: "Formato non riconoscibile".into(),
                message: "Il payload non e testo UTF-8 valido ne un formato riconoscibile.".into(),
            });
        }
    }
}

fn focus_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
}

enum PayloadSource { Pipe(String), DeepLink(String), None }

fn detect_payload_source() -> PayloadSource {
    use std::io::IsTerminal;
    if !std::io::stdin().is_terminal() {
        match PipeHandler::read() {
            Ok(content) => return PayloadSource::Pipe(content),
            Err(LunetteError::EmptyInput) => return PayloadSource::Pipe(String::new()),
            Err(e) => { eprintln!("Lunette: errore lettura stdin: {e}"); return PayloadSource::None; }
        }
    }
    for arg in std::env::args().skip(1) {
        if arg.starts_with("lunette://") {
            match DeepLinkHandler::parse(&arg) {
                Ok(content) => return PayloadSource::DeepLink(content),
                Err(e) => { eprintln!("Lunette: errore parsing deep link: {e}"); return PayloadSource::None; }
            }
        }
    }
    PayloadSource::None
}

pub fn run() {
    // Handle --install-skill before starting the GUI
    if std::env::args().any(|a| a == "--install-skill") {
        skill_installer::install();
        std::process::exit(0);
    }

    let startup_payload: Option<String> = match detect_payload_source() {
        PayloadSource::Pipe(s) | PayloadSource::DeepLink(s) => Some(s),
        PayloadSource::None => None,
    };

    let (ipc_tx, ipc_rx) = std::sync::mpsc::channel::<String>();
    let ipc_result = IpcServer::listen(move |payload| { let _ = ipc_tx.send(payload); });

    match ipc_result {
        Err(LunetteError::IpcConnectionFailed) => {
            if let Some(ref payload) = startup_payload {
                if let Err(e) = IpcClient::send(payload) {
                    eprintln!("Lunette: impossibile inviare payload: {e}");
                } else {
                    std::process::exit(0);
                }
            } else {
                std::process::exit(0);
            }
        }
        Err(e) => { eprintln!("Lunette: errore IPC: {e}"); }
        Ok(()) => {}
    }

    let plugin_dir = plugin_loader::default_plugin_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("/nonexistent"));
    let registry = std::thread::spawn(move || PluginLoader::load(&plugin_dir))
        .join()
        .unwrap_or_else(|_| PluginRegistry::new(vec![]));

    let registry_arc = Arc::new(Mutex::new(registry));
    let registry_for_ipc = Arc::clone(&registry_arc);

    let pending = Arc::new(PendingPayload {
        content: Mutex::new(startup_payload),
        frontend_ready: Mutex::new(false),
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .manage(RegistryState(registry_arc))
        .manage(pending)
        .invoke_handler(tauri::generate_handler![
            commands::frontend_ready,
            commands::copy_source,
            commands::export_png
        ])
        .setup(move |app| {
            // IPC thread
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(payload) = ipc_rx.recv() {
                    let reg = registry_for_ipc.lock().unwrap();
                    run_pipeline(&app_handle, payload, &reg);
                    focus_window(&app_handle);
                }
            });

            // Deep link handler
            let app_handle_dl = app.handle().clone();
            let registry_for_dl = Arc::clone(&app.state::<RegistryState>().0);
            let pending_dl = Arc::clone(&app.state::<Arc<PendingPayload>>());
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    match DeepLinkHandler::parse(url.as_str()) {
                        Ok(content) => {
                            let ready = *pending_dl.frontend_ready.lock().unwrap();
                            if ready {
                                // Frontend is up — emit directly
                                let reg = registry_for_dl.lock().unwrap();
                                run_pipeline(&app_handle_dl, content, &reg);
                                focus_window(&app_handle_dl);
                            } else {
                                // Frontend not ready yet — store for frontend_ready to pick up
                                *pending_dl.content.lock().unwrap() = Some(content);
                            }
                        }
                        Err(e) => {
                            let _ = app_handle_dl.emit("lunette://error", ErrorPayload {
                                title: "Errore deep link".into(),
                                message: e.to_string(),
                            });
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("errore durante l avvio di Lunette");
}
