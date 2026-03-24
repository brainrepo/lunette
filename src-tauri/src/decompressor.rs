use std::io::{Read, Write};

use base64::{engine::general_purpose::STANDARD, Engine};
use flate2::{read::ZlibDecoder, write::ZlibEncoder, Compression};

use crate::LunetteError;

/// Encodes bytes to a Base64 string (RFC 4648 standard alphabet).
pub fn encode_base64(data: &[u8]) -> String {
    STANDARD.encode(data)
}

/// Decodes a Base64 string to bytes.
pub fn decode_base64(s: &str) -> Result<Vec<u8>, LunetteError> {
    STANDARD
        .decode(s)
        .map_err(|e| LunetteError::Base64DecodeError(e.to_string()))
}

/// Compresses bytes using zlib (RFC 1950).
pub fn compress_zlib(data: &[u8]) -> Result<Vec<u8>, LunetteError> {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder
        .write_all(data)
        .map_err(|e| LunetteError::ZlibDecompressError(e.to_string()))?;
    encoder
        .finish()
        .map_err(|e| LunetteError::ZlibDecompressError(e.to_string()))
}

pub struct Decompressor;

impl Decompressor {
    /// Rileva se i dati sono compressi zlib ispezionando il magic byte (0x78).
    pub fn is_zlib(data: &[u8]) -> bool {
        !data.is_empty() && data[0] == 0x78
    }

    /// Decomprime dati zlib/deflate (RFC 1950) e restituisce la stringa UTF-8.
    pub fn decompress(data: &[u8]) -> Result<String, LunetteError> {
        let mut decoder = ZlibDecoder::new(data);
        let mut out = Vec::new();
        decoder
            .read_to_end(&mut out)
            .map_err(|e| LunetteError::ZlibDecompressError(e.to_string()))?;
        String::from_utf8(out)
            .map_err(|e| LunetteError::ZlibDecompressError(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    // Feature: lunette, Property 1: Base64 round-trip (encode → decode)
    // Validates: Requirements 1.2, 8.2
    proptest! {
        #[test]
        fn prop_base64_roundtrip(s in ".*") {
            let encoded = encode_base64(s.as_bytes());
            let decoded = decode_base64(&encoded).unwrap();
            prop_assert_eq!(s.as_bytes(), decoded.as_slice());
        }
    }

    // Feature: lunette, Property 2: Base64 round-trip inverso (decode → encode)
    // Validates: Requirements 8.3
    // Strategy: generate arbitrary byte sequences, encode them to valid Base64,
    // then verify that decode→encode produces the same canonical Base64 string.
    proptest! {
        #[test]
        fn prop_base64_inverse_roundtrip(bytes in proptest::collection::vec(any::<u8>(), 0..256)) {
            // Encode arbitrary bytes to get a valid Base64 string
            let b = encode_base64(&bytes);
            // decode → encode must reproduce the same canonical Base64
            let decoded = decode_base64(&b).unwrap();
            let reencoded = encode_base64(&decoded);
            prop_assert_eq!(b, reencoded);
        }
    }

    // Feature: lunette, Property 3: zlib+Base64 round-trip completo
    // Validates: Requirements 9.3
    proptest! {
        #[test]
        fn prop_zlib_base64_roundtrip(s in ".*") {
            let compressed = compress_zlib(s.as_bytes()).unwrap();
            let encoded = encode_base64(&compressed);
            let decoded = decode_base64(&encoded).unwrap();
            let decompressed = Decompressor::decompress(&decoded).unwrap();
            prop_assert_eq!(s, decompressed);
        }
    }

    // Feature: lunette, Property 4: is_zlib(data) ⟺ data[0] == 0x78
    // Validates: Requirements 9.5
    proptest! {
        #[test]
        fn prop_is_zlib_iff_magic_byte(data in proptest::collection::vec(any::<u8>(), 1..256)) {
            let expected = data[0] == 0x78;
            prop_assert_eq!(Decompressor::is_zlib(&data), expected);
        }
    }

    #[test]
    fn is_zlib_empty_returns_false() {
        assert!(!Decompressor::is_zlib(&[]));
    }

    #[test]
    fn is_zlib_magic_byte_returns_true() {
        assert!(Decompressor::is_zlib(&[0x78, 0x9c, 0x00]));
    }

    #[test]
    fn is_zlib_non_magic_byte_returns_false() {
        assert!(!Decompressor::is_zlib(&[0x1f, 0x8b])); // gzip magic
    }
}
