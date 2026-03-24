use std::io::{self, Read};

use base64::{engine::general_purpose::STANDARD, Engine};

use crate::LunetteError;

pub struct PipeHandler;

impl PipeHandler {
    /// Legge stdin fino a EOF, restituisce il payload decodificato.
    /// - Se vuoto/solo whitespace → `EmptyInput`
    /// - Tenta decodifica Base64; se fallisce usa testo as-is
    pub fn read() -> Result<String, LunetteError> {
        let mut buf = Vec::new();
        io::stdin()
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
