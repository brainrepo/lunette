use std::fs;
use std::time::{Duration, Instant};

use crate::LunetteError;

const TEMP_FILE_PREFIX: &str = "/tmp/lunette_";
const DELETE_TIMEOUT: Duration = Duration::from_secs(5);

pub struct TempFileHandler;

impl TempFileHandler {
    /// Legge il payload da un file temporaneo e lo elimina
    pub fn read_and_delete(path: &str) -> Result<String, LunetteError> {
        // Validate path prefix
        if !path.starts_with(TEMP_FILE_PREFIX) {
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
        let result = TempFileHandler::read_and_delete("/tmp/other_file");
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
    fn reads_and_deletes_valid_temp_file() {
        let path = "/tmp/lunette_test_read_delete";
        fs::write(path, "hello lunette").unwrap();

        let result = TempFileHandler::read_and_delete(path);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "hello lunette");

        // File should be deleted
        assert!(!std::path::Path::new(path).exists());
    }

    #[test]
    fn returns_error_for_nonexistent_file() {
        let result = TempFileHandler::read_and_delete("/tmp/lunette_nonexistent_xyz_12345");
        assert!(matches!(result, Err(LunetteError::TempFileNotFound { .. })));
    }
}
