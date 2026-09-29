const need = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env var: ${k}`);
  return v;
};

// The corpus MCP server returns canon only unless a caller asks for more.
// Moltbook is a teaching surface, so it asks for every layer, synthesis
// included; synthesis passages arrive labelled with their verification_status
// (server/routes/corpus-mcp.js). A layers value already on the URL wins.
const TEACHING_LAYERS = "canon,scholarship,apparatus,synthesis";
const withTeachingLayers = (raw) => {
  const url = new URL(raw);
  if (!url.searchParams.has("layers")) url.searchParams.set("layers", TEACHING_LAYERS);
  return url.toString();
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
        ? withTeachingLayers(process.env.ARETE_MCP_URL)
        : null,
    token: process.env.ARETE_MCP_TOKEN || null,
  },
  supabase: { url: need("SUPABASE_URL"), key: need("SUPABASE_SERVICE_KEY") },
  tickMs: Number(process.env.TICK_MINUTES || 30) * 60 * 1000,
  maxActionsPerDay: Number(process.env.MAX_ACTIONS_PER_DAY || 12),
  // Original posts: at most one every N days, only on ticks with nothing to
  // reply to. 0 disables posting entirely.
  postEveryDays: Number(process.env.POST_EVERY_DAYS ?? 3),
  submolt: process.env.MOLTBOOK_SUBMOLT || "general",
};
