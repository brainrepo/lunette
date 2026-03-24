# Lunette

Give Claude eyes. Ask it to visualize anything — diagrams, documents, data, math — and it renders instantly in a native window on your desktop.

<p align="center">
  <img src="logo.png" alt="Lunette" width="200">
</p>

Lunette is an **MCP server** that connects Claude (or any MCP-compatible assistant) to a **Tauri desktop viewer**. When Claude calls the `visualize` tool, Lunette opens a native window and renders the content. No copy-pasting, no browser tabs, no file juggling.

## Quick Start

### 1. Build the app

```bash
npm install
npm run tauri build
sudo ln -sf "$(pwd)/src-tauri/target/release/lunette" /usr/local/bin/lunette
```

### 2. Install the skill and MCP server

```bash
lunette --install-skill
```

This installs two things:

| Component | Location | Purpose |
|-----------|----------|---------|
| **MCP server** | `~/.lunette/mcp/server.js` | Exposes the `visualize` tool that Claude calls |
| **Claude Code skill** | `~/.claude/skills/lunette-visualize.md` | Teaches Claude *when* and *how* to use Lunette |

### 3. Add the MCP config

The installer prints the config snippet. Add it to your project's `.mcp.json` or `~/.claude.json` for global access:

```json
{
  "mcpServers": {
    "lunette": {
      "type": "stdio",
      "command": "node",
      "args": ["~/.lunette/mcp/server.js"]
    }
  }
}
```

### 4. Ask Claude to visualize

```
You: "Draw a sequence diagram of the OAuth flow"
Claude: → renders a Mermaid diagram in Lunette

You: "Show me the API response as JSON"
Claude: → renders an interactive JSON tree in Lunette

You: "Render the Schrödinger equation"
Claude: → renders LaTeX math in Lunette
```

Claude will ask for your confirmation before opening Lunette, then the content appears instantly in a native window.

## How It Works

```
Claude ──▶ MCP Server ──▶ Lunette ──▶ Native Window
              │
              ├── writes content to temp file
              └── opens via lunette:// deep link
```

The MCP server exposes a single `visualize` tool. Claude calls it with the content and an optional format hint. Lunette auto-detects the format and renders it in the appropriate viewer.

## Skill vs MCP Server

Lunette ships both a **skill** and an **MCP server** — they work together:

- **The MCP server** (`~/.lunette/mcp/server.js`) is the tool itself. It exposes a `visualize` function that writes content to a temp file and opens it in Lunette via deep link. Any MCP-compatible client can call it.

- **The skill** (`~/.claude/skills/lunette-visualize.md`) is Claude Code-specific. It teaches Claude *when* to use the tool (e.g. after generating a Mermaid diagram), *how* to format the content, and *when not to* (e.g. trivial one-liners). Without the skill, Claude can still call the tool, but may not use it proactively.

Both are installed in one step with `lunette --install-skill`.

## What Claude Can Visualize

| Format | What Claude generates | What you see |
|--------|----------------------|--------------|
| **Mermaid** | `graph TD; A-->B` | Flowcharts, sequence diagrams, Gantt charts, mind maps |
| **Markdown** | `# Title\n**bold** text` | Styled documentation with syntax-highlighted code |
| **JSON** | `{"key": "value"}` | Interactive tree with expand/collapse |
| **LaTeX** | `$$E = mc^2$$` | Beautifully rendered math equations |
| **Excalidraw** | `{"elements": [...], "appState": {...}}` | Hand-drawn style sketches and whiteboards |

## Use Cases

- **Brainstorming** — Ask Claude to map out ideas as diagrams, refine them iteratively
- **Architecture** — Have Claude generate system diagrams from descriptions or code
- **Data exploration** — Pipe API responses through Claude, see them as structured JSON trees
- **Documentation** — Preview markdown output before committing
- **Math / Research** — Render equations and formulas as you discuss them

## Also Works from the Terminal

Lunette is not limited to Claude. Pipe any command's output directly:

```bash
# Diagrams
echo "graph TD; A[Start] --> B[End]" | lunette
cat architecture.mmd | lunette

# Documentation
cat README.md | lunette

# Data
curl -s https://api.example.com/data | lunette

# Math
echo '$$E = mc^2$$' | lunette
```

### Deep Links

Open content from scripts, browsers, or automation:

```bash
# Base64
open "lunette://?data=$(echo '# Hello' | base64)"

# Compressed (zlib + base64)
DATA=$(python3 -c "
import zlib, base64
raw = b'graph TD\nA-->B'
print(base64.b64encode(zlib.compress(raw)).decode())
")
open "lunette://?data=$DATA"

# Temp file
echo "# Report" > /tmp/report.md
open "lunette://?file=/tmp/report.md"
```

### Single Instance

Lunette runs as a single instance. New content updates the existing window:

```bash
echo "graph TD; A-->B" | lunette   # Opens Lunette
echo "# New content" | lunette      # Updates the same window
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Entry Points                               │
│  ┌────────────┐  ┌────────┐  ┌───────────┐ │
│  │ MCP Server │  │  Pipe  │  │ Deep Link │ │
│  └─────┬──────┘  └───┬────┘  └─────┬─────┘ │
│        └─────────────┼──────────────┘       │
│                      ▼                       │
│           ┌─────────────────┐               │
│           │Content Detector │  Rust         │
│           └────────┬────────┘               │
│                    ▼                         │
│           ┌─────────────────┐               │
│           │   Tauri IPC     │               │
│           └────────┬────────┘               │
│                    ▼                         │
│  ┌──────────────────────────────────┐       │
│  │  Frontend (React)                │       │
│  │  ViewerRouter → Lazy Viewer      │       │
│  │  ┌─────────┬──────────┬────────┐ │       │
│  │  │ Mermaid │ Markdown │  JSON  │ │       │
│  │  ├─────────┼──────────┼────────┤ │       │
│  │  │  LaTeX  │Excalidraw│ Plugin │ │       │
│  │  └─────────┴──────────┴────────┘ │       │
│  └──────────────────────────────────┘       │
└─────────────────────────────────────────────┘
```

### Backend (Rust / Tauri)

- **`content_detector.rs`** — Heuristic chain: Plugin → Mermaid → Excalidraw → JSON → LaTeX → Markdown → Unrecognized
- **`pipe_handler.rs`** — Reads stdin, handles base64 decoding
- **`deep_link_handler.rs`** — Parses `lunette://` URLs (base64, zlib, temp file)
- **`ipc.rs`** — Single-instance enforcement via Unix socket / Windows named pipe
- **`plugin_loader.rs`** — Loads JS plugins from `~/.lunette/plugins/`

### Frontend (React / TypeScript)

- **`ViewerRouter.tsx`** — Listens to Tauri events, dispatches to lazy-loaded viewers
- **`MermaidViewer.tsx`** — Renders via the Mermaid library
- **`MarkdownViewer.tsx`** — Renders via Marked + highlight.js
- **`JsonViewer.tsx`** — Interactive tree via @uiw/react-json-view
- **`LatexViewer.tsx`** — Math rendering via KaTeX
- **`ExcalidrawViewer.tsx`** — Full Excalidraw canvas
- **`PluginViewer.tsx`** — Sandboxed iframe for third-party renderers

### MCP Server (Node.js)

- **`src/mcp/src/index.ts`** — Exposes the `visualize` tool, writes content to a temp file, opens Lunette via deep link

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) stable
- Tauri v2 system dependencies ([platform guide](https://v2.tauri.app/start/prerequisites/))

### Setup

```bash
npm install
npm run tauri dev
```

### Testing

```bash
# Frontend (Vitest)
npm test

# Backend (Cargo)
cargo test --manifest-path src-tauri/Cargo.toml

# TypeScript typecheck
npx tsc --noEmit

# Manual test suite (interactive)
./test.sh
```

### Project Structure

```
lunette/
├── src/                    # React frontend
│   ├── components/         # Viewer components
│   ├── mcp/                # MCP server (Node.js)
│   └── theme.ts            # Design tokens
├── src-tauri/              # Rust backend
│   └── src/
│       ├── content_detector.rs
│       ├── pipe_handler.rs
│       ├── deep_link_handler.rs
│       ├── ipc.rs
│       └── lib.rs          # App setup + pipeline
├── fixtures/               # Test data
├── docs/
│   ├── assets/             # README images
│   └── videos/             # Remotion demo video project
└── .github/workflows/      # CI + Release pipelines
```

## CI/CD

### CI (every push / PR)

Runs on Ubuntu: TypeScript typecheck → frontend build → Vitest → Cargo test → Clippy.

### Release

Triggered manually via GitHub Actions:

1. **Actions → Release → Run workflow** → enter version (e.g. `0.2.0`)
2. Pipeline bumps the version in all manifests, tags, and builds for all platforms
3. Artifacts (`.dmg`, `.msi`, `.deb`, `.AppImage`) uploaded to a **draft GitHub Release**
4. Review and publish

## License

MIT
