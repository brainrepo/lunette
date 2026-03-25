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

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
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

/// Atomic counter for unique window labels.
pub struct WindowCounter(AtomicU64);

/// Per-window pending payloads: window_label → content string.
pub struct PendingPayloads {
    pub map: Mutex<HashMap<String, String>>,
}

pub mod commands {
    use tauri::{AppHandle, Emitter, State};
    use crate::{run_pipeline_to, ErrorPayload, RegistryState, PendingPayloads};

    #[tauri::command]
    pub fn frontend_ready(
        window: tauri::WebviewWindow,
        app: AppHandle,
        registry: State<RegistryState>,
        pending: State<PendingPayloads>,
    ) {
        let label = window.label().to_string();
        let content = pending.map.lock().unwrap_or_else(|e| e.into_inner()).remove(&label);
        match content {
            Some(c) => {
                let reg = registry.0.lock().unwrap_or_else(|e| e.into_inner());
                run_pipeline_to(&app, &label, c, &reg);
            }
            None => {
                let _ = app.emit_to(&label, "lunette://error", ErrorPayload {
                    title: "Come usare Lunette".into(),
                    message: "Avvia Lunette tramite pipe o deep link.".into(),
                });
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

pub fn run_pipeline_to(app: &AppHandle, label: &str, content: String, registry: &PluginRegistry) {
    let detector = ContentDetector::new(Arc::new(registry.clone()));
    let ct = detector.detect(&content);
    match content_type_to_dto(&ct, registry) {
        Some(dto) => {
            let _ = app.emit_to(label, "lunette://new-content", NewContentPayload { content, content_type: dto });
        }
        None => {
            let _ = app.emit_to(label, "lunette://error", ErrorPayload {
                title: "Formato non riconoscibile".into(),
                message: "Il payload non e testo UTF-8 valido ne un formato riconoscibile.".into(),
            });
        }
    }
}

fn create_window_with_content(app: &AppHandle, content: String) {
    let counter = app.state::<WindowCounter>();
    let label = format!("lunette-{}", counter.0.fetch_add(1, Ordering::Relaxed));

    app.state::<PendingPayloads>().map
        .lock().unwrap_or_else(|e| e.into_inner())
        .insert(label.clone(), content);

    let _ = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("Lunette")
        .inner_size(1024.0, 768.0)
        .build();
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

    let new_window_mode = std::env::args().any(|a| a == "--new-window");

    let startup_payload: Option<String> = match detect_payload_source() {
        PayloadSource::Pipe(s) | PayloadSource::DeepLink(s) => Some(s),
        PayloadSource::None => None,
    };

    let (ipc_tx, ipc_rx) = std::sync::mpsc::channel::<String>();
    let ipc_result = IpcServer::listen(move |payload| { let _ = ipc_tx.send(payload); });

    match ipc_result {
        Err(LunetteError::IpcConnectionFailed) => {
            if !new_window_mode {
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
            // --new-window: fall through to start standalone GUI
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

    let mut initial_map = HashMap::new();
    if let Some(payload) = startup_payload {
        initial_map.insert("main".to_string(), payload);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .manage(RegistryState(registry_arc))
        .manage(WindowCounter(AtomicU64::new(0)))
        .manage(PendingPayloads { map: Mutex::new(initial_map) })
        .invoke_handler(tauri::generate_handler![
            commands::frontend_ready,
            commands::copy_source,
            commands::export_png
        ])
        .setup(move |app| {
            // IPC thread: each incoming payload opens a new window
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(payload) = ipc_rx.recv() {
                    create_window_with_content(&app_handle, payload);
                }
            });

            // Deep link handler: each URL opens a new window
            let app_handle_dl = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    match DeepLinkHandler::parse(url.as_str()) {
                        Ok(content) => {
                            create_window_with_content(&app_handle_dl, content);
                        }
                        Err(e) => {
                            eprintln!("Lunette: deep link error: {e}");
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("errore durante l avvio di Lunette");
}
