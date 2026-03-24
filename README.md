# Lunette

A macOS desktop app that receives content via stdin pipe or `lunette://` deep link, auto-detects the format, and renders it in a native window.

## Supported formats

- **Mermaid** — diagrams (`graph TD`, `sequenceDiagram`, etc.)
- **Excalidraw** — JSON with `elements` + `appState` keys
- **Markdown** — any UTF-8 text (catch-all)
- **Plugins** — third-party JS renderers from `~/.lunette/plugins/`

## Install

```bash
npm run tauri build
sudo ln -sf "$(pwd)/src-tauri/target/release/lunette" /usr/local/bin/lunette
```

Or copy the `.app` bundle:

```bash
cp -r src-tauri/target/release/bundle/macos/Lunette.app /Applications/
```

## Usage

### Pipe

```bash
echo "graph TD\nA-->B" | lunette
echo "# Hello" | lunette
cat drawing.excalidraw | lunette
```

### Deep link — inline data (base64)

```bash
open "lunette://?data=$(echo 'graph TD\nA-->B' | base64)"
```

### Deep link — compressed (base64 + zlib)

```bash
DATA=$(python3 -c "
import zlib, base64, sys
raw = b'graph TD\nA-->B'
print(base64.b64encode(zlib.compress(raw)).decode())
")
open "lunette://?data=$DATA"
```

### Deep link — temp file

```bash
echo "# Hello from file" > /tmp/lunette_test.txt
open "lunette://?file=/tmp/lunette_test.txt"
```

---

## Manual tests

### Mermaid

```bash
echo "graph TD\n  A[Start] --> B[End]" | lunette
```
Expected: flowchart renders in the window.

```bash
open "lunette://?data=$(printf 'sequenceDiagram\nAlice->>Bob: Hi' | base64)"
```
Expected: sequence diagram renders.

### Excalidraw

```bash
echo '{"elements":[],"appState":{"viewBackgroundColor":"#ffffff"}}' | lunette
```
Expected: empty Excalidraw canvas renders.

### Markdown

```bash
printf '# Title\n\n- item 1\n- item 2\n\n```js\nconsole.log("hi")\n```' | lunette
```
Expected: styled markdown with syntax-highlighted code block.

### Deep link (base64)

```bash
open "lunette://?data=$(printf '## Deep link test\nThis came from a URL.' | base64)"
```
Expected: markdown renders with the heading and paragraph.

### Single-instance forwarding

```bash
# With Lunette already open:
echo "graph LR\n  X-->Y" | lunette
```
Expected: the existing window updates — no second window opens.

### Unknown format

```bash
echo "" | lunette
```
Expected: error screen "Formato non riconoscibile".

---

## Run tests

```bash
# Frontend unit tests
npm test

# Rust unit + property-based tests
cargo test --manifest-path src-tauri/Cargo.toml
```
