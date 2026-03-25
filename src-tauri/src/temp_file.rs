use std::fs;
use std::path::Path;
use std::time::{Duration, Instant};

use crate::LunetteError;

const DELETE_TIMEOUT: Duration = Duration::from_secs(5);

/// Returns the expected temp file prefix for the current platform.
pub fn temp_file_prefix() -> String {
    let mut prefix = std::env::temp_dir();
    prefix.push("lunette_");
    prefix.to_string_lossy().into_owned()
}

pub struct TempFileHandler;

impl TempFileHandler {
    /// Reads the payload from a temporary file and deletes it
    pub fn read_and_delete(path: &str) -> Result<String, LunetteError> {
        let expected_prefix = temp_file_prefix();

        // Validate path prefix and reject path traversal
        let canonical = Path::new(path);
        let path_str = canonical.to_string_lossy();
        if !path_str.starts_with(&expected_prefix) || path_str.contains("..") {
            return Err(LunetteError::InvalidTempFilePath {
                path: path.to_string(),
            });
        }

        // Read file content
        let content = fs::read_to_string(path).map_err(|_| LunetteError::TempFileNotFound {
            path: path.to_string(),
        })?;

        // Delete file immediately after reading, with 5s timeout
        let deadline = Instant::now() + DELETE_TIMEOUT;
        loop {
            match fs::remove_file(path) {
                Ok(_) => break,
                Err(_) if Instant::now() < deadline => {
                    std::thread::sleep(Duration::from_millis(100));
                }
                Err(e) => {
                    eprintln!(
                        "[lunette] WARNING: failed to delete temp file '{}': {}",
                        path, e
                    );
                    break;
                }
            }
        }

        Ok(content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_path_not_starting_with_tmp_lunette() {
        let mut bad = std::env::temp_dir();
        bad.push("other_file");
        let result = TempFileHandler::read_and_delete(&bad.to_string_lossy());
        assert!(matches!(result, Err(LunetteError::InvalidTempFilePath { .. })));
    }

    #[test]
    fn rejects_relative_path() {
        let result = TempFileHandler::read_and_delete("lunette_payload");
        assert!(matches!(result, Err(LunetteError::InvalidTempFilePath { .. })));
    }

    #[test]
    fn rejects_etc_path() {
        let result = TempFileHandler::read_and_delete("/etc/lunette_passwd");
        assert!(matches!(result, Err(LunetteError::InvalidTempFilePath { .. })));
    }

    #[test]
    fn rejects_path_traversal() {
        let traversal = format!("{}../etc/passwd", temp_file_prefix());
        let result = TempFileHandler::read_and_delete(&traversal);
        assert!(matches!(result, Err(LunetteError::InvalidTempFilePath { .. })));
    }

    #[test]
    fn reads_and_deletes_valid_temp_file() {
        let path = format!("{}test_read_delete", temp_file_prefix());
        fs::write(&path, "hello lunette").unwrap();

        let result = TempFileHandler::read_and_delete(&path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "hello lunette");

        // File should be deleted
        assert!(!Path::new(&path).exists());
    }

    #[test]
    fn returns_error_for_nonexistent_file() {
        let path = format!("{}nonexistent_xyz_12345", temp_file_prefix());
        let result = TempFileHandler::read_and_delete(&path);
        assert!(matches!(result, Err(LunetteError::TempFileNotFound { .. })));
    }
}
