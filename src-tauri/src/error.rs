use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "kind", content = "detail")]
pub enum LunetteError {
    #[error("Input vuoto o solo whitespace")]
    EmptyInput,

    #[error("Nessun payload fornito: avviare Lunette tramite pipe o deep link")]
    NoPayload,

    #[error("Contenuto non interpretabile: il payload non è testo UTF-8 valido né un formato riconoscibile")]
    UnrecognizedContent,

    #[error("Parametro URL mancante: né 'data' né 'file' presenti")]
    MissingParam,

    #[error("Decodifica Base64 fallita: {0}")]
    Base64DecodeError(String),

    #[error("Decompressione zlib fallita: {0}")]
    ZlibDecompressError(String),

    #[error("File temporaneo non trovato o non leggibile: {path}")]
    TempFileNotFound { path: String },

    #[error("Path file temporaneo non valido (deve iniziare con /tmp/lunette_): {path}")]
    InvalidTempFilePath { path: String },

    #[error("IPC: impossibile contattare l'istanza esistente")]
    IpcConnectionFailed,

    #[error("Plugin '{name}': {message}")]
    PluginError { name: String, message: String },

    #[error("Plugin '{name}': timeout dopo 10 secondi")]
    PluginTimeout { name: String },
}
