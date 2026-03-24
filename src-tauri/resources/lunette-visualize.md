# Lunette Visualize

Lunette is a desktop content viewer that renders Mermaid diagrams, Excalidraw drawings, and Markdown documents in a native window with a cinematic dark UI.

## MCP Tool — `visualize` (primary method)

When the `lunette` MCP server is available, use the `visualize` tool to send content to Lunette.

### Parameters

- **`content`** (string, required): The raw content — mermaid definition, markdown text, or excalidraw JSON.
- **`contentType`** (string, optional): Hint — `"mermaid"`, `"markdown"`, or `"excalidraw"`. Lunette auto-detects format, but a hint helps with ambiguous content.

### When to use

Call `visualize` whenever you generate:

- **Mermaid diagrams**: Content starting with `graph`, `sequenceDiagram`, `flowchart`, `classDiagram`, `erDiagram`, `gantt`, `pie`, `gitGraph`, `mindmap`, `timeline`, `stateDiagram`, `journey`, `quadrantChart`, `C4Context`, `block-beta`, `xychart-beta`, `sankey-beta`, `architecture-beta`, or containing a ` ```mermaid ` fenced block.
- **Excalidraw JSON**: JSON objects with both `elements` and `appState` top-level keys.
- **Rich Markdown**: Documents with headings, tables, code blocks, or embedded diagrams that benefit from rendered viewing.

### Workflow

1. Render the content in the terminal as a normal code block first.
2. Call the `visualize` tool with the content.
3. After the tool returns, display the deep link URL so the user can click it to re-open the visualization.

### Example

When generating a mermaid diagram:

```
Here is the architecture diagram:

` ` `mermaid
graph TD
  A[Frontend] --> B[API Gateway]
  B --> C[Service]
` ` `

[Call visualize tool with the mermaid content above]

🔭 Open in Lunette: lunette://?file=/tmp/lunette_<uuid>.txt
```

### When NOT to use

- Trivial one-liners (e.g., a single `# Title`)
- The user explicitly asks for terminal-only output
- Small code snippets that are not complete visual artifacts

## Direct CLI — Open with Lunette (fallback)

If the MCP server is not available, open content in Lunette directly via the command line.

### Method 1: Pipe (simplest)

```bash
echo 'graph TD
  A[Start] --> B[End]' | lunette
```

Best for short content when `lunette` is in PATH.

### Method 2: Temp file + deep link (recommended for large content)

```bash
# Write content to a temp file (path MUST start with /tmp/lunette_)
cat > /tmp/lunette_$(uuidgen).txt << 'EOF'
graph TD
  A[Frontend] --> B[API Gateway]
  B --> C[Service]
EOF

# Open in Lunette
open "lunette://?file=/tmp/lunette_<filename>.txt"
```

The temp file is automatically deleted after Lunette reads it.

### Method 3: Inline deep link (small content only)

```bash
# Base64-encode the content
DATA=$(echo -n 'graph TD\n  A-->B' | base64)
open "lunette://?data=${DATA}"
```

### Method 4: Zlib-compressed deep link (large content as URL)

```bash
DATA=$(python3 -c "
import zlib, base64, sys
raw = sys.stdin.buffer.read()
print(base64.b64encode(zlib.compress(raw)).decode())
" < content.mmd)
open "lunette://?data=${DATA}"
```

## Constraints

- Temp file paths **must** start with `/tmp/lunette_` — Lunette rejects other paths for security.
- Deep link scheme: `lunette://`
- Query params: `?file=<path>` (temp file) or `?data=<base64>` (inline, optionally zlib-compressed).
- Lunette is a single-instance app: new content updates the existing window.
