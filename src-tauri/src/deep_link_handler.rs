use base64::{engine::general_purpose::STANDARD, Engine};

use crate::{decompressor::Decompressor, temp_file::TempFileHandler, LunetteError};

pub struct DeepLinkHandler;

impl DeepLinkHandler {
    /// Parsa un URL `lunette://` e restituisce il payload decodificato.
    ///
    /// - Se `file` presente → delega a `TempFileHandler`
    /// - Se `data` presente → decodifica Base64, decomprime zlib se necessario
    /// - Altrimenti → `MissingParam`
    pub fn parse(url: &str) -> Result<String, LunetteError> {
        let query = Self::extract_query(url);

        // Look for `file` param first
        if let Some(file_value) = Self::get_param(query, "file") {
            return TempFileHandler::read_and_delete(&file_value);
        }

        // Look for `data` param
        if let Some(data_value) = Self::get_param(query, "data") {
            let decoded = STANDARD
                .decode(data_value.as_bytes())
                .map_err(|e| LunetteError::Base64DecodeError(e.to_string()))?;

            if Decompressor::is_zlib(&decoded) {
                return Decompressor::decompress(&decoded);
            }

            return String::from_utf8(decoded)
                .map_err(|e| LunetteError::Base64DecodeError(e.to_string()));
        }

        Err(LunetteError::MissingParam)
    }

    /// Extracts the query string portion from a URL (everything after `?`).
    fn extract_query(url: &str) -> &str {
        url.find('?').map(|i| &url[i + 1..]).unwrap_or("")
    }

    /// Finds the value of a query parameter by name, percent-decoding it.
    fn get_param(query: &str, name: &str) -> Option<String> {
        for pair in query.split('&') {
            if let Some(eq) = pair.find('=') {
                let key = &pair[..eq];
                let value = &pair[eq + 1..];
                if key == name {
                    return Some(percent_decode(value));
                }
            }
        }
        None
    }
}

/// Minimal percent-decoding: replaces `%XX` sequences and `+` with space.
fn percent_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(hi), Some(lo)) = (
                hex_digit(bytes[i + 1]),
                hex_digit(bytes[i + 2]),
            ) {
                out.push((hi << 4 | lo) as char);
                i += 3;
                continue;
            }
        } else if bytes[i] == b'+' {
            out.push(' ');
            i += 1;
            continue;
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

fn hex_digit(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}
