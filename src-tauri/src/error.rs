use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "kind", content = "detail")]
pub enum LunetteError {
    #[error("Empty input or whitespace only")]
    EmptyInput,

    #[error("No payload provided: launch Lunette via pipe or deep link")]
    NoPayload,

    #[error("Unrecognized content: payload is not valid UTF-8 text or a recognized format")]
    UnrecognizedContent,

    #[error("Missing URL parameter: neither 'data' nor 'file' present")]
    MissingParam,

    #[error("Base64 decode failed: {0}")]
    Base64DecodeError(String),

    #[error("Zlib decompression failed: {0}")]
    ZlibDecompressError(String),

    #[error("Temporary file not found or not readable: {path}")]
    TempFileNotFound { path: String },

    #[error("Invalid temporary file path (must start with <temp_dir>/lunette_): {path}")]
    InvalidTempFilePath { path: String },

    #[error("IPC: unable to contact existing instance")]
    IpcConnectionFailed,

    #[error("Plugin '{name}': {message}")]
    PluginError { name: String, message: String },

    #[error("Plugin '{name}': timed out after 10 seconds")]
    PluginTimeout { name: String },
}
