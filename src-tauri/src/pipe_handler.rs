use std::io::{self, Read};

use base64::{engine::general_purpose::STANDARD, Engine};

use crate::LunetteError;

/// Maximum payload size accepted from stdin (50 MB).
const MAX_STDIN_BYTES: u64 = 50 * 1024 * 1024;

pub struct PipeHandler;

impl PipeHandler {
    /// Reads stdin until EOF and returns the decoded payload.
    /// - If empty/whitespace-only → `EmptyInput`
    /// - Attempts Base64 decode; falls back to raw text
    /// - Rejects payloads larger than 50 MB
    pub fn read() -> Result<String, LunetteError> {
        let mut buf = Vec::new();
        io::stdin()
            .take(MAX_STDIN_BYTES)
            .read_to_end(&mut buf)
            .map_err(|e| LunetteError::Base64DecodeError(e.to_string()))?;

        // Check empty / whitespace-only
        if buf.iter().all(|b| b.is_ascii_whitespace()) {
            return Err(LunetteError::EmptyInput);
        }

        // Trim trailing whitespace (newlines from shell pipes)
        let trimmed = buf
            .iter()
            .rev()
            .skip_while(|b| b.is_ascii_whitespace())
            .count();
        let trimmed_buf = &buf[..trimmed];

        // Attempt Base64 decode; fall back to raw text
        let text = match STANDARD.decode(trimmed_buf) {
            Ok(decoded) => String::from_utf8(decoded)
                .unwrap_or_else(|_| String::from_utf8_lossy(trimmed_buf).into_owned()),
            Err(_) => String::from_utf8_lossy(trimmed_buf).into_owned(),
        };

        Ok(text)
    }
}
