use std::path::{Path, PathBuf};

use serde::Deserialize;
use tracing::warn;

pub type PluginId = String;

#[derive(Deserialize)]
pub struct PackageJson {
    pub lunette: Option<LunetteManifest>,
}

#[derive(Deserialize)]
pub struct LunetteManifest {
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub version: String,
    #[serde(rename = "entryPoint")]
    pub entry_point: String,
    pub detect: String,
    pub render: String,
}

pub struct PluginMeta {
    pub id: PluginId,
    pub display_name: String,
    pub version: semver::Version,
    pub entry_point: PathBuf,
    pub detect_fn: String,
    pub render_fn: String,
}

impl Clone for PluginMeta {
    fn clone(&self) -> Self {
        Self {
            id: self.id.clone(),
            display_name: self.display_name.clone(),
            version: self.version.clone(),
            entry_point: self.entry_point.clone(),
            detect_fn: self.detect_fn.clone(),
            render_fn: self.render_fn.clone(),
        }
    }
}

pub struct PluginRegistry {
    plugins: Vec<PluginMeta>,
}

impl PluginRegistry {
    pub fn new(plugins: Vec<PluginMeta>) -> Self {
        Self { plugins }
    }

    pub fn plugins(&self) -> &[PluginMeta] {
        &self.plugins
    }

    pub fn is_empty(&self) -> bool {
        self.plugins.is_empty()
    }

    pub fn len(&self) -> usize {
        self.plugins.len()
    }
}

impl Clone for PluginRegistry {
    fn clone(&self) -> Self {
        Self {
            plugins: self.plugins.clone(),
        }
    }
}

pub struct PluginLoader;

impl PluginLoader {
    /// Scans Plugin_Directory and returns the Plugin_Registry.
    /// If the directory does not exist, returns an empty registry without errors.
    pub fn load(plugin_dir: &Path) -> PluginRegistry {
        if !plugin_dir.exists() {
            return PluginRegistry::new(vec![]);
        }

        let entries = match std::fs::read_dir(plugin_dir) {
            Ok(e) => e,
            Err(err) => {
                warn!("Unable to read Plugin_Directory {:?}: {}", plugin_dir, err);
                return PluginRegistry::new(vec![]);
            }
        };

        let mut plugins = Vec::new();

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let folder_name = match path.file_name().and_then(|n| n.to_str()) {
                Some(n) => n.to_string(),
                None => {
                    warn!("Plugin folder with invalid name: {:?}", path);
                    continue;
                }
            };

            let manifest_path = path.join("package.json");
            if !manifest_path.exists() {
                warn!("Plugin '{}': package.json not found, folder skipped", folder_name);
                continue;
            }

            let content = match std::fs::read_to_string(&manifest_path) {
                Ok(c) => c,
                Err(err) => {
                    warn!("Plugin '{}': unable to read package.json: {}", folder_name, err);
                    continue;
                }
            };

            let pkg: PackageJson = match serde_json::from_str(&content) {
                Ok(p) => p,
                Err(err) => {
                    warn!("Plugin '{}': invalid package.json: {}", folder_name, err);
                    continue;
                }
            };

            let manifest = match pkg.lunette {
                Some(m) => m,
                None => {
                    warn!("Plugin '{}': missing 'lunette' field in package.json", folder_name);
                    continue;
                }
            };

            // Validate displayName
            if manifest.display_name.is_empty() {
                warn!("Plugin '{}': 'displayName' field is empty", folder_name);
                continue;
            }

            // Validate version (SemVer)
            let version = match semver::Version::parse(&manifest.version) {
                Ok(v) => v,
                Err(_) => {
                    warn!(
                        "Plugin '{}': 'version' field is not valid SemVer: '{}'",
                        folder_name, manifest.version
                    );
                    continue;
                }
            };

            // Validate entryPoint (no path traversal)
            if manifest.entry_point.contains("../") {
                warn!(
                    "Plugin '{}': 'entryPoint' field contains path traversal: '{}'",
                    folder_name, manifest.entry_point
                );
                continue;
            }

            // Validate detect and render are non-empty
            if manifest.detect.is_empty() {
                warn!("Plugin '{}': 'detect' field is empty", folder_name);
                continue;
            }
            if manifest.render.is_empty() {
                warn!("Plugin '{}': 'render' field is empty", folder_name);
                continue;
            }

            // Validate entry point file exists
            let entry_point_abs = path.join(&manifest.entry_point);
            if !entry_point_abs.exists() {
                warn!(
                    "Plugin '{}': entryPoint not found: {:?}",
                    folder_name, entry_point_abs
                );
                continue;
            }

            plugins.push(PluginMeta {
                id: folder_name,
                display_name: manifest.display_name,
                version,
                entry_point: entry_point_abs,
                detect_fn: manifest.detect,
                render_fn: manifest.render,
            });
        }

        PluginRegistry::new(plugins)
    }
}

/// Returns the path of the default Plugin_Directory: `~/.lunette/plugins/`
pub fn default_plugin_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok().map(PathBuf::from).or({
        #[cfg(target_os = "windows")]
        {
            std::env::var("USERPROFILE").ok().map(PathBuf::from)
        }
        #[cfg(not(target_os = "windows"))]
        {
            None
        }
    })?;
    Some(home.join(".lunette").join("plugins"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn make_valid_plugin(dir: &Path, name: &str, entry_file: &str) {
        let plugin_dir = dir.join(name);
        fs::create_dir_all(&plugin_dir).unwrap();
        let manifest = serde_json::json!({
            "name": name,
            "lunette": {
                "displayName": format!("{} Display", name),
                "version": "1.0.0",
                "entryPoint": entry_file,
                "detect": "detect",
                "render": "render"
            }
        });
        fs::write(plugin_dir.join("package.json"), manifest.to_string()).unwrap();
        fs::write(plugin_dir.join(entry_file), "// plugin entry").unwrap();
    }

    #[test]
    fn test_load_nonexistent_dir_returns_empty() {
        let registry = PluginLoader::load(Path::new("/nonexistent/path/that/does/not/exist"));
        assert!(registry.is_empty());
    }

    #[test]
    fn test_load_empty_dir_returns_empty() {
        let tmp = TempDir::new().unwrap();
        let registry = PluginLoader::load(tmp.path());
        assert!(registry.is_empty());
    }

    #[test]
    fn test_load_valid_plugin() {
        let tmp = TempDir::new().unwrap();
        make_valid_plugin(tmp.path(), "my-plugin", "index.js");
        let registry = PluginLoader::load(tmp.path());
        assert_eq!(registry.len(), 1);
        let plugin = &registry.plugins()[0];
        assert_eq!(plugin.id, "my-plugin");
        assert_eq!(plugin.display_name, "my-plugin Display");
        assert_eq!(plugin.version, semver::Version::parse("1.0.0").unwrap());
        assert_eq!(plugin.detect_fn, "detect");
        assert_eq!(plugin.render_fn, "render");
        assert!(plugin.entry_point.exists());
    }

    #[test]
    fn test_skip_plugin_without_package_json() {
        let tmp = TempDir::new().unwrap();
        fs::create_dir(tmp.path().join("no-manifest")).unwrap();
        let registry = PluginLoader::load(tmp.path());
        assert!(registry.is_empty());
    }

    #[test]
    fn test_skip_plugin_without_lunette_field() {
        let tmp = TempDir::new().unwrap();
        let plugin_dir = tmp.path().join("no-lunette");
        fs::create_dir_all(&plugin_dir).unwrap();
        fs::write(plugin_dir.join("package.json"), r#"{"name":"test"}"#).unwrap();
        let registry = PluginLoader::load(tmp.path());
        assert!(registry.is_empty());
    }

    #[test]
    fn test_skip_plugin_empty_display_name() {
        let tmp = TempDir::new().unwrap();
        let plugin_dir = tmp.path().join("bad-plugin");
        fs::create_dir_all(&plugin_dir).unwrap();
        let manifest = serde_json::json!({
            "lunette": {
                "displayName": "",
                "version": "1.0.0",
                "entryPoint": "index.js",
                "detect": "detect",
                "render": "render"
            }
        });
        fs::write(plugin_dir.join("package.json"), manifest.to_string()).unwrap();
        fs::write(plugin_dir.join("index.js"), "").unwrap();
        let registry = PluginLoader::load(tmp.path());
        assert!(registry.is_empty());
    }

    #[test]
    fn test_skip_plugin_invalid_semver() {
        let tmp = TempDir::new().unwrap();
        let plugin_dir = tmp.path().join("bad-version");
        fs::create_dir_all(&plugin_dir).unwrap();
        let manifest = serde_json::json!({
            "lunette": {
                "displayName": "Bad Version",
                "version": "not-semver",
                "entryPoint": "index.js",
                "detect": "detect",
                "render": "render"
            }
        });
        fs::write(plugin_dir.join("package.json"), manifest.to_string()).unwrap();
        fs::write(plugin_dir.join("index.js"), "").unwrap();
        let registry = PluginLoader::load(tmp.path());
        assert!(registry.is_empty());
    }

    #[test]
    fn test_skip_plugin_path_traversal() {
        let tmp = TempDir::new().unwrap();
        let plugin_dir = tmp.path().join("traversal-plugin");
        fs::create_dir_all(&plugin_dir).unwrap();
        let manifest = serde_json::json!({
            "lunette": {
                "displayName": "Traversal Plugin",
                "version": "1.0.0",
                "entryPoint": "../evil.js",
                "detect": "detect",
                "render": "render"
            }
        });
        fs::write(plugin_dir.join("package.json"), manifest.to_string()).unwrap();
        let registry = PluginLoader::load(tmp.path());
        assert!(registry.is_empty());
    }

    #[test]
    fn test_skip_plugin_missing_entry_point_file() {
        let tmp = TempDir::new().unwrap();
        let plugin_dir = tmp.path().join("missing-entry");
        fs::create_dir_all(&plugin_dir).unwrap();
        let manifest = serde_json::json!({
            "lunette": {
                "displayName": "Missing Entry",
                "version": "1.0.0",
                "entryPoint": "nonexistent.js",
                "detect": "detect",
                "render": "render"
            }
        });
        fs::write(plugin_dir.join("package.json"), manifest.to_string()).unwrap();
        let registry = PluginLoader::load(tmp.path());
        assert!(registry.is_empty());
    }

    #[test]
    fn test_load_multiple_plugins_only_valid_registered() {
        let tmp = TempDir::new().unwrap();
        make_valid_plugin(tmp.path(), "valid-1", "index.js");
        make_valid_plugin(tmp.path(), "valid-2", "main.js");
        // invalid: no package.json
        fs::create_dir(tmp.path().join("invalid")).unwrap();
        let registry = PluginLoader::load(tmp.path());
        assert_eq!(registry.len(), 2);
    }

    #[test]
    fn test_skip_empty_detect_or_render() {
        let tmp = TempDir::new().unwrap();
        for (name, detect, render) in [
            ("empty-detect", "", "render"),
            ("empty-render", "detect", ""),
        ] {
            let plugin_dir = tmp.path().join(name);
            fs::create_dir_all(&plugin_dir).unwrap();
            let manifest = serde_json::json!({
                "lunette": {
                    "displayName": "Test",
                    "version": "1.0.0",
                    "entryPoint": "index.js",
                    "detect": detect,
                    "render": render
                }
            });
            fs::write(plugin_dir.join("package.json"), manifest.to_string()).unwrap();
            fs::write(plugin_dir.join("index.js"), "").unwrap();
        }
        let registry = PluginLoader::load(tmp.path());
        assert!(registry.is_empty());
    }
}
