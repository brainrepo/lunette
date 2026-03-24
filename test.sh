#!/usr/bin/env bash
# Lunette manual test runner
# Usage: ./test.sh              → interactive menu
#        ./test.sh <test-name>  → run single test
#        ./test.sh all          → run all sequentially
#        ./test.sh --help       → list tests

LUNETTE="${LUNETTE_BIN:-lunette}"
FIXTURES="$(cd "$(dirname "$0")" && pwd)/fixtures"

if ! command -v "$LUNETTE" &>/dev/null; then
  echo "Error: lunette not found. Set LUNETTE_BIN or add it to PATH."
  echo "  export LUNETTE_BIN=./src-tauri/target/release/lunette"
  exit 1
fi

# ── Test descriptions (parallel arrays) ───────────────────────────────────────

ALL_TESTS=(
  mermaid-pipe
  mermaid-sequence
  mermaid-architecture
  mermaid-sequence-full
  mermaid-gantt
  markdown-pipe
  markdown-document
  excalidraw-pipe
  excalidraw-whiteboard
  json-pipe
  json-array
  json-file
  latex-math
  latex-document
  latex-inline
  deeplink-base64
  deeplink-zlib
  deeplink-file
  single-instance
  empty-input
)

declare -A TEST_DESC=(
  [mermaid-pipe]="Simple flowchart A → B"
  [mermaid-sequence]="Short sequence diagram"
  [mermaid-architecture]="Large architecture — 30+ nodes, subgraphs"
  [mermaid-sequence-full]="Checkout sequence — 8 participants, error path"
  [mermaid-gantt]="Gantt chart — Q2 plan, 25+ tasks"
  [markdown-pipe]="Short markdown with code block"
  [markdown-document]="Full tech doc — tables, code, blockquotes"
  [excalidraw-pipe]="Empty Excalidraw canvas"
  [excalidraw-whiteboard]="Architecture whiteboard — boxes, arrows, text"
  [json-pipe]="Simple JSON object — syntax highlight + search"
  [json-array]="JSON array — multiple items"
  [json-file]="Nested JSON from fixture file"
  [latex-math]="Display math — quadratic formula + integral"
  [latex-document]="Full LaTeX document with preamble"
  [latex-inline]="Mixed text with inline and display math"
  [deeplink-base64]="Deep link with base64 mermaid"
  [deeplink-zlib]="Deep link with zlib+base64 markdown"
  [deeplink-file]="Deep link with temp file"
  [single-instance]="Second payload to running instance"
  [empty-input]="Empty pipe → error screen"
)

declare -A TEST_SECTION=(
  [mermaid-pipe]="Mermaid"
  [mermaid-sequence]="Mermaid"
  [mermaid-architecture]="Mermaid"
  [mermaid-sequence-full]="Mermaid"
  [mermaid-gantt]="Mermaid"
  [markdown-pipe]="Markdown"
  [markdown-document]="Markdown"
  [excalidraw-pipe]="Excalidraw"
  [excalidraw-whiteboard]="Excalidraw"
  [json-pipe]="JSON"
  [json-array]="JSON"
  [json-file]="JSON"
  [latex-math]="LaTeX"
  [latex-document]="LaTeX"
  [latex-inline]="LaTeX"
  [deeplink-base64]="Deep Link"
  [deeplink-zlib]="Deep Link"
  [deeplink-file]="Deep Link"
  [single-instance]="Behaviour"
  [empty-input]="Behaviour"
)

# ── Helpers ───────────────────────────────────────────────────────────────────

run_test() {
  local name="$1"
  local desc="$2"
  shift 2
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST: $name"
  echo "DESC: $desc"
  echo "CMD:  $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  "$@"
}

# ── Test implementations ──────────────────────────────────────────────────────

run_single_test() {
  local t="$1"
  case "$t" in
    mermaid-pipe)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'printf "graph TD\n  A[Start] --> B[End]" | '"$LUNETTE" ;;
    mermaid-sequence)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'printf "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi!" | '"$LUNETTE" ;;
    mermaid-architecture)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'cat "'"$FIXTURES"'/architecture.mmd" | '"$LUNETTE" ;;
    mermaid-sequence-full)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'cat "'"$FIXTURES"'/sequence.mmd" | '"$LUNETTE" ;;
    mermaid-gantt)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'cat "'"$FIXTURES"'/gantt.mmd" | '"$LUNETTE" ;;
    markdown-pipe)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'printf "# Lunette Test\n\nHello **world**.\n\n\`\`\`js\nconsole.log(\"hi\")\n\`\`\`" | '"$LUNETTE" ;;
    markdown-document)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'cat "'"$FIXTURES"'/document.md" | '"$LUNETTE" ;;
    excalidraw-pipe)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'echo '"'"'{"elements":[],"appState":{"viewBackgroundColor":"#ffffff"}}'"'"' | '"$LUNETTE" ;;
    excalidraw-whiteboard)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'cat "'"$FIXTURES"'/whiteboard.excalidraw.json" | '"$LUNETTE" ;;
    json-pipe)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'echo '"'"'{"name":"lunette","version":"0.1.0","features":["mermaid","excalidraw","markdown","json"]}'"'"' | '"$LUNETTE" ;;
    json-array)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'echo '"'"'[{"id":1,"type":"mermaid"},{"id":2,"type":"markdown"},{"id":3,"type":"json"}]'"'"' | '"$LUNETTE" ;;
    json-file)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'cat "'"$FIXTURES"'/package.json" | '"$LUNETTE" ;;
    latex-math)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'printf "\\\\[\n  x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}\n\\\\]\n\n\\\\[\n  \\\\int_{-\\\\infty}^{\\\\infty} e^{-x^2}\\\\, dx = \\\\sqrt{\\\\pi}\n\\\\]" | '"$LUNETTE" ;;
    latex-document)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'printf "\\\\documentclass{article}\n\\\\begin{document}\n\nEuler'\''s identity: \\$e^{i\\\\pi} + 1 = 0\\$\n\n\\\\begin{equation}\n  \\\\sum_{n=1}^{\\\\infty} \\\\frac{1}{n^2} = \\\\frac{\\\\pi^2}{6}\n\\\\end{equation}\n\n\\\\end{document}" | '"$LUNETTE" ;;
    latex-inline)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'printf "The energy-mass relation \\$E = mc^2\\$ and the Pythagorean theorem \\$a^2 + b^2 = c^2\\$ are fundamental.\n\n\\\\[\n  \\\\nabla \\\\times \\\\vec{B} = \\\\mu_0 \\\\left( \\\\vec{J} + \\\\varepsilon_0 \\\\frac{\\\\partial \\\\vec{E}}{\\\\partial t} \\\\right)\n\\\\]" | '"$LUNETTE" ;;
    deeplink-base64)
      local data
      data=$(printf "graph LR\n  X --> Y --> Z" | base64)
      run_test "$t" "${TEST_DESC[$t]}" \
        open "lunette://?data=${data}" ;;
    deeplink-zlib)
      local data
      data=$(python3 -c "
import zlib, base64
raw = b'# Zlib Test\n\nThis content was **compressed**.'
print(base64.b64encode(zlib.compress(raw)).decode())
")
      run_test "$t" "${TEST_DESC[$t]}" \
        open "lunette://?data=${data}" ;;
    deeplink-file)
      local tmpfile="/tmp/lunette_test_$$.txt"
      printf "## File Test\n\nLoaded from a temp file." > "$tmpfile"
      run_test "$t" "${TEST_DESC[$t]}" \
        open "lunette://?file=${tmpfile}"
      sleep 2
      if [ -f "$tmpfile" ]; then
        echo "  WARN: temp file was not deleted: $tmpfile"
      else
        echo "  OK: temp file was deleted"
      fi ;;
    single-instance)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'printf "graph TD\n  SingleInstance --> Works" | '"$LUNETTE" ;;
    empty-input)
      run_test "$t" "${TEST_DESC[$t]}" \
        bash -c 'echo "" | '"$LUNETTE" ;;
    *)
      echo "Unknown test: $t"
      return 1 ;;
  esac
}

# ── Interactive menu ──────────────────────────────────────────────────────────

show_menu() {
  local prev_section=""
  echo ""
  echo "┌──────────────────────────────────────────────┐"
  echo "│          Lunette Test Runner                  │"
  echo "└──────────────────────────────────────────────┘"
  echo ""

  for i in "${!ALL_TESTS[@]}"; do
    local t="${ALL_TESTS[$i]}"
    local section="${TEST_SECTION[$t]}"
    local num=$((i + 1))

    if [[ "$section" != "$prev_section" ]]; then
      [[ -n "$prev_section" ]] && echo ""
      printf "  \033[1;36m── %s ──\033[0m\n" "$section"
      prev_section="$section"
    fi

    printf "  \033[33m%2d\033[0m  %-26s \033[2m%s\033[0m\n" "$num" "$t" "${TEST_DESC[$t]}"
  done

  echo ""
  printf "  \033[33m a\033[0m  Run all sequentially\n"
  printf "  \033[33m q\033[0m  Quit\n"
  echo ""
}

interactive_loop() {
  while true; do
    show_menu
    read -rp "  Pick a test (number, name, or q): " choice

    # Quit
    [[ "$choice" == "q" || "$choice" == "Q" ]] && break

    # Run all
    if [[ "$choice" == "a" || "$choice" == "A" || "$choice" == "all" ]]; then
      for t in "${ALL_TESTS[@]}"; do
        run_single_test "$t"
        echo ""
        read -rp "  → Press Enter for next test (or q to stop)... " cont
        [[ "$cont" == "q" || "$cont" == "Q" ]] && break
      done
      continue
    fi

    # By number
    if [[ "$choice" =~ ^[0-9]+$ ]]; then
      local idx=$((choice - 1))
      if (( idx >= 0 && idx < ${#ALL_TESTS[@]} )); then
        run_single_test "${ALL_TESTS[$idx]}"
      else
        echo "  Invalid number. Pick 1–${#ALL_TESTS[@]}."
      fi
      continue
    fi

    # By name
    local found=false
    for t in "${ALL_TESTS[@]}"; do
      if [[ "$t" == "$choice" ]]; then
        run_single_test "$t"
        found=true
        break
      fi
    done
    $found || echo "  Unknown test: $choice"
  done
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

case "${1:-}" in
  "")
    interactive_loop ;;
  all)
    echo "Running all Lunette tests sequentially."
    echo ""
    for t in "${ALL_TESTS[@]}"; do
      run_single_test "$t"
      echo ""
      read -rp "  → Press Enter for next test..." _
    done
    echo "All tests done." ;;
  --help|-h)
    echo "Usage: $0              interactive menu"
    echo "       $0 <test-name>  run single test"
    echo "       $0 all          run all sequentially"
    echo ""
    echo "Available tests:"
    for i in "${!ALL_TESTS[@]}"; do
      printf "  %-26s %s\n" "${ALL_TESTS[$i]}" "${TEST_DESC[${ALL_TESTS[$i]}]}"
    done ;;
  *)
    run_single_test "$1" || exit 1 ;;
esac
