#!/bin/bash
# execution/graphify-refresh.sh
# Refreshes the knowledge graph by rescanning the project.
# Run this at the end of a sprint, after large merges, or before a new agent
# starts working for the first time.
#
# Usage:
#   ./execution/graphify-refresh.sh           # AST-only, no API cost
#   ./execution/graphify-refresh.sh --full    # Full rescan (requires LLM)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GRAPH_DIR="$PROJECT_ROOT/graphify-out"

echo "🔍 Graphify refresh started: $PROJECT_ROOT"
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

if [[ "${1:-}" == "--full" ]]; then
  echo "⚠️  Full rescan — LLM API calls will be made."
  echo "   This may take a few minutes..."
  echo ""
  # Remove and recreate the graph for a full rescan.
  if [[ -f "$GRAPH_DIR/graph.json" ]]; then
    mv "$GRAPH_DIR/graph.json" "$GRAPH_DIR/graph.json.bak"
    echo "📦 Previous graph backed up: graphify-out/graph.json.bak"
  fi
  echo "💡 Start a full scan in OpenCode by running the /graphify command."
else
  # AST-only update — no API cost, completes in seconds.
  echo "⚡ AST-only update (no API cost)..."
  cd "$PROJECT_ROOT"
  timeout 120 graphify update . || {
    echo "❌ TIMEOUT or ERROR: graphify update . failed"
    exit 1
  }
  echo ""
  echo "✅ Graph updated: $GRAPH_DIR/graph.json"
fi

# Benchmark — show token savings.
echo ""
echo "📊 Token savings benchmark:"
graphify benchmark "$GRAPH_DIR/graph.json" 2>/dev/null || echo "   (graph.json is required for benchmark)"

echo ""
echo "🏁 Done. Agents can now use the updated graph."
