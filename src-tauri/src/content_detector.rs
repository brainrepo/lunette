use std::sync::Arc;
use std::time::Duration;

use tracing::warn;

use crate::plugin_loader::{PluginId, PluginRegistry};

/// The detected content type for a given payload.
#[derive(Debug, PartialEq, Clone)]
pub enum ContentType {
    Mermaid,
    Excalidraw,
    Json,
    Latex,
    Markdown,
    Plugin(PluginId),
    /// Payload is binary, non-UTF-8, or completely empty.
    Unrecognized,
}

pub struct ContentDetector {
    registry: Arc<PluginRegistry>,
}

/// Timeout for querying all plugins in the registry.
const PLUGIN_DETECT_TIMEOUT: Duration = Duration::from_millis(200);

/// Mermaid diagram type keywords (start-of-content detection).
const MERMAID_KEYWORDS: &[&str] = &[
    "graph ",
    "graph\n",
    "graph\t",
    "sequenceDiagram",
    "flowchart ",
    "flowchart\n",
    "flowchart\t",
    "classDiagram",
    "erDiagram",
    "gantt",
    "pie",
    "gitGraph",
    "mindmap",
    "timeline",
    "stateDiagram",
    "journey",
    "quadrantChart",
    "requirementDiagram",
    "C4Context",
    "C4Container",
    "C4Component",
    "C4Dynamic",
    "C4Deployment",
    "block-beta",
    "xychart-beta",
    "sankey-beta",
    "packet-beta",
    "architecture-beta",
];

impl ContentDetector {
    pub fn new(registry: Arc<PluginRegistry>) -> Self {
        Self { registry }
    }

    /// Detect the content type of the given payload.
    ///
    /// Detection order (per spec):
    /// 1. Plugin_Registry (timeout 200ms total)
    /// 2. Mermaid
    /// 3. Excalidraw
    /// 4. JSON (valid JSON object or array, not Excalidraw)
    /// 5. LaTeX (document or math expressions)
    /// 6. Markdown (any valid non-empty UTF-8)
    /// 7. Unrecognized
    pub fn detect(&self, content: &str) -> ContentType {
        // 1. Query plugin registry with a 200ms total timeout
        if !self.registry.is_empty() {
            if let Some(plugin_id) = self.detect_with_plugins(content) {
                return ContentType::Plugin(plugin_id);
            }
        }

        // 2. Mermaid detection
        if is_mermaid(content) {
            return ContentType::Mermaid;
        }

        // 3. Excalidraw detection
        if is_excalidraw(content) {
            return ContentType::Excalidraw;
        }

        // 4. JSON: valid JSON object or array (not already claimed as Excalidraw)
        if is_json(content) {
            return ContentType::Json;
        }

        // 5. LaTeX: document or math expressions
        if is_latex(content) {
            return ContentType::Latex;
        }

        // 6. Markdown: any valid non-empty UTF-8 text
        // (content is already &str so it's valid UTF-8; just check non-empty)
        if !content.trim().is_empty() {
            return ContentType::Markdown;
        }

        // 7. Unrecognized (empty or binary)
        ContentType::Unrecognized
    }

    /// Query all plugins in the registry within the 200ms timeout.
    /// Returns the id of the first matching plugin, or None.
    /// Exceptions (panics) in detect functions are caught and logged as warnings.
    fn detect_with_plugins(&self, _content: &str) -> Option<PluginId> {
        use std::time::Instant;

        let deadline = Instant::now() + PLUGIN_DETECT_TIMEOUT;

        for plugin in self.registry.plugins() {
            if Instant::now() >= deadline {
                warn!(
                    "Plugin detection timeout (200ms) reached, skipping remaining plugins"
                );
                break;
            }

            // Plugin detect functions run in the WebView (frontend), not in Rust.
            // Here in the backend registry we only have metadata; actual JS detect()
            // calls happen in the frontend. This backend detect_with_plugins is a
            // placeholder that always returns None — the real plugin priority logic
            // is enforced in the frontend ViewerRouter by consulting the registry
            // metadata sent via Tauri events.
            //
            // However, to satisfy the ContentType::Plugin path for the backend
            // pipeline (e.g. IPC forwarding), we expose the plugin list so the
            // frontend can make the final call. We return None here to let the
            // frontend handle plugin dispatch.
            let _ = plugin; // suppress unused warning
        }

        None
    }
}

/// Returns true if the content looks like a Mermaid diagram.
///
/// Matches:
/// - A ` ```mermaid ` fenced code block anywhere in the content
/// - Content that starts (after trimming) with a known Mermaid diagram keyword
fn is_mermaid(content: &str) -> bool {
    // Check for ```mermaid fence
    if content.contains("```mermaid") {
        return true;
    }

    let trimmed = content.trim();

    // Check for known Mermaid diagram type keywords at the start
    for keyword in MERMAID_KEYWORDS {
        if trimmed.starts_with(keyword) {
            return true;
        }
    }

    false
}

/// Returns true if the content is valid JSON starting with `{` or `[`.
///
/// Called after Excalidraw detection, so Excalidraw JSON is already handled.
fn is_json(content: &str) -> bool {
    let trimmed = content.trim();
    if !trimmed.starts_with('{') && !trimmed.starts_with('[') {
        return false;
    }
    serde_json::from_str::<serde_json::Value>(trimmed).is_ok()
}

/// LaTeX math command patterns used for density-based detection.
const LATEX_MATH_COMMANDS: &[&str] = &[
    r"\frac", r"\sum", r"\int", r"\sqrt", r"\alpha", r"\beta", r"\gamma",
    r"\delta", r"\theta", r"\lambda", r"\sigma", r"\omega", r"\pi",
    r"\infty", r"\partial", r"\nabla", r"\cdot", r"\times", r"\leq",
    r"\geq", r"\neq", r"\approx", r"\equiv", r"\forall", r"\exists",
    r"\lim", r"\prod", r"\binom", r"\left", r"\right", r"\mathbb",
    r"\mathbf", r"\mathrm", r"\text", r"\vec", r"\hat", r"\bar",
];

/// Returns true if the content looks like LaTeX.
///
/// Strong indicators (any one is sufficient):
/// - Contains `\documentclass` or `\begin{document}` (full document)
/// - Contains a LaTeX math environment (`\begin{equation}`, `\begin{align}`, etc.)
/// - Starts with `$$` or `\[` (bare display math)
///
/// Density indicator (fallback):
/// - Contains at least 3 distinct LaTeX math commands
fn is_latex(content: &str) -> bool {
    let trimmed = content.trim();

    // Strong: full document markers
    if trimmed.contains(r"\documentclass") || trimmed.contains(r"\begin{document}") {
        return true;
    }

    // Strong: math environments
    const MATH_ENVS: &[&str] = &[
        r"\begin{equation}", r"\begin{equation*}",
        r"\begin{align}", r"\begin{align*}",
        r"\begin{gather}", r"\begin{gather*}",
        r"\begin{multline}", r"\begin{multline*}",
        r"\begin{matrix}", r"\begin{pmatrix}",
        r"\begin{bmatrix}", r"\begin{vmatrix}",
        r"\begin{cases}",
    ];
    for env in MATH_ENVS {
        if trimmed.contains(env) {
            return true;
        }
    }

    // Strong: bare display math delimiters at the start
    if trimmed.starts_with("$$") || trimmed.starts_with(r"\[") {
        return true;
    }

    // Density: at least 3 distinct LaTeX math commands present
    let match_count = LATEX_MATH_COMMANDS.iter().filter(|cmd| trimmed.contains(*cmd)).count();
    match_count >= 3
}

/// Returns true if the content is a JSON object with top-level `elements` and `appState` keys.
fn is_excalidraw(content: &str) -> bool {
    let trimmed = content.trim();
    if !trimmed.starts_with('{') {
        return false;
    }

    match serde_json::from_str::<serde_json::Value>(trimmed) {
        Ok(serde_json::Value::Object(map)) => {
            map.contains_key("elements") && map.contains_key("appState")
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin_loader::{PluginLoader, PluginRegistry};
    use std::sync::Arc;

    fn empty_registry() -> Arc<PluginRegistry> {
        Arc::new(PluginLoader::load(std::path::Path::new(
            "/nonexistent/path/that/does/not/exist",
        )))
    }

    fn detector() -> ContentDetector {
        ContentDetector::new(empty_registry())
    }

    // --- Mermaid ---

    #[test]
    fn test_mermaid_fence() {
        let d = detector();
        assert_eq!(d.detect("```mermaid\ngraph TD\nA-->B\n```"), ContentType::Mermaid);
    }

    #[test]
    fn test_mermaid_graph_keyword() {
        let d = detector();
        assert_eq!(d.detect("graph TD\nA-->B"), ContentType::Mermaid);
    }

    #[test]
    fn test_mermaid_sequence_diagram() {
        let d = detector();
        assert_eq!(d.detect("sequenceDiagram\nA->>B: hello"), ContentType::Mermaid);
    }

    #[test]
    fn test_mermaid_flowchart() {
        let d = detector();
        assert_eq!(d.detect("flowchart LR\nA-->B"), ContentType::Mermaid);
    }

    #[test]
    fn test_mermaid_pie() {
        let d = detector();
        assert_eq!(d.detect("pie\ntitle Pets\n\"Dogs\" : 386"), ContentType::Mermaid);
    }

    #[test]
    fn test_mermaid_with_leading_whitespace() {
        let d = detector();
        assert_eq!(d.detect("  graph TD\nA-->B"), ContentType::Mermaid);
    }

    // --- Excalidraw ---

    #[test]
    fn test_excalidraw_valid() {
        let d = detector();
        let json = r##"{"elements": [], "appState": {"viewBackgroundColor": "#fff"}}"##;
        assert_eq!(d.detect(json), ContentType::Excalidraw);
    }

    #[test]
    fn test_excalidraw_missing_app_state() {
        let d = detector();
        let json = r#"{"elements": []}"#;
        // Valid JSON, not Excalidraw → detected as Json
        assert_eq!(d.detect(json), ContentType::Json);
    }

    #[test]
    fn test_excalidraw_missing_elements() {
        let d = detector();
        let json = r#"{"appState": {}}"#;
        // Valid JSON, not Excalidraw → detected as Json
        assert_eq!(d.detect(json), ContentType::Json);
    }

    #[test]
    fn test_json_object() {
        let d = detector();
        assert_eq!(d.detect(r#"{"name": "lunette", "version": 1}"#), ContentType::Json);
    }

    #[test]
    fn test_json_array() {
        let d = detector();
        assert_eq!(d.detect(r#"[1, 2, 3]"#), ContentType::Json);
    }

    #[test]
    fn test_json_does_not_match_plain_text() {
        let d = detector();
        // Plain text is not JSON
        assert_eq!(d.detect("hello world"), ContentType::Markdown);
    }

    // --- Markdown ---

    #[test]
    fn test_markdown_plain_text() {
        let d = detector();
        assert_eq!(d.detect("# Hello\nThis is markdown"), ContentType::Markdown);
    }

    #[test]
    fn test_markdown_any_utf8_text() {
        let d = detector();
        assert_eq!(d.detect("just some plain text"), ContentType::Markdown);
    }

    // --- Unrecognized ---

    #[test]
    fn test_unrecognized_empty() {
        let d = detector();
        assert_eq!(d.detect(""), ContentType::Unrecognized);
    }

    #[test]
    fn test_unrecognized_whitespace_only() {
        let d = detector();
        assert_eq!(d.detect("   \n\t  "), ContentType::Unrecognized);
    }

    // --- Priority: Mermaid before Excalidraw/Markdown ---

    #[test]
    fn test_mermaid_takes_priority_over_markdown() {
        let d = detector();
        // A mermaid diagram is also valid UTF-8 text, but should be Mermaid
        assert_eq!(d.detect("graph TD\nA-->B\nsome text"), ContentType::Mermaid);
    }

    // --- Excalidraw before Markdown ---

    #[test]
    fn test_excalidraw_takes_priority_over_markdown() {
        let d = detector();
        let json = r#"{"elements": [{"id": "1"}], "appState": {"zoom": 1}}"#;
        assert_eq!(d.detect(json), ContentType::Excalidraw);
    }
}
