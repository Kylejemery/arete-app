const need = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env var: ${k}`);
  return v;
};

export const config = {
  moltbook: {
    base: process.env.MOLTBOOK_BASE || "https://www.moltbook.com/api/v1",
    key: need("MOLTBOOK_API_KEY"),
    agentName: process.env.MOLTBOOK_AGENT_NAME || "Arete",
  },
  anthropic: {
    key: need("ANTHROPIC_API_KEY"),
    composeModel: process.env.COMPOSE_MODEL || "claude-sonnet-5",
    triageModel: process.env.TRIAGE_MODEL || "claude-haiku-4-5-20251001",
  },
  corpus: {
    // Ignore the .env.example placeholder so a copied file doesn't point the
    // API at a nonexistent MCP server.
    url:
      process.env.ARETE_MCP_URL && !process.env.ARETE_MCP_URL.includes("your-mcp-host")
        ? process.env.ARETE_MCP_URL
        : null,
    token: process.env.ARETE_MCP_TOKEN || null,
  },
  supabase: { url: need("SUPABASE_URL"), key: need("SUPABASE_SERVICE_KEY") },
  tickMs: Number(process.env.TICK_MINUTES || 30) * 60 * 1000,
  maxActionsPerDay: Number(process.env.MAX_ACTIONS_PER_DAY || 12),
};
