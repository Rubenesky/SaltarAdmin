## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships. The corpus is small (fits in a single context window), so the graph is only worth the round-trip for cross-cutting questions, not routine reads.

Rules:
- Use `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` only for cross-cutting or architectural questions (e.g. "what calls X", "how do these two features relate", "why was X built this way"). These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Prefer `path`/`explain` over `query` when the question names a specific node or a pair of nodes — they're near-O(1) lookups, not a BFS traversal, so they cost fewer tokens for the same answer. Reserve `query` for open-ended questions that don't name a specific concept.
- For `query`, pass `--budget 800` for a narrow/specific question and only use the 2000-token default for genuinely broad architecture questions — a tighter budget forces the traversal to stop at the most relevant subgraph instead of dragging in tangential context.
- For a targeted single-file read or edit where you already know the file (e.g. "fix the typo on line 42 of X"), just Read/Grep directly — do not query the graph first. The graph adds a round-trip that a small, known-target read does not need.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, the git post-commit hook rebuilds the graph automatically (AST-only, no API cost) — no manual `graphify update` needed unless you want to see uncommitted changes reflected before committing.
