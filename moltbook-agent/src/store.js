import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { config } from "./config.js";

const db = createClient(config.supabase.url, config.supabase.key, {
  auth: { persistSession: false },
});

export const hash = (s) =>
  createHash("sha256").update(s.trim().toLowerCase()).digest("hex").slice(0, 32);

// Read the kill switch fresh every tick. Never cache this.
export async function gate() {
  const { data, error } = await db
    .from("moltbook_agent_config")
    .select("enabled, paused_reason, max_actions_day")
    .eq("id", 1)
    .single();
  if (error) return { go: false, why: `config read failed: ${error.message}` };
  if (!data.enabled) return { go: false, why: data.paused_reason || "kill switch off" };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("moltbook_agent_actions")
    .select("id", { count: "exact", head: true })
    .in("kind", ["comment", "post"])
    .eq("status", "ok")
    .gte("created_at", since);

  const cap = data.max_actions_day ?? config.maxActionsPerDay;
  if ((count ?? 0) >= cap) return { go: false, why: `daily cap reached (${count}/${cap})` };
  return { go: true, remaining: cap - (count ?? 0) };
}

export async function log(row) {
  const { error } = await db.from("moltbook_agent_actions").insert(row);
  if (error) console.error("[store] log failed:", error.message);
}

export async function unseen(posts) {
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);
  const { data } = await db.from("moltbook_seen_posts").select("post_id").in("post_id", ids);
  const known = new Set((data || []).map((r) => r.post_id));
  return posts.filter((p) => !known.has(p.id));
}

export async function markSeen(post, decision) {
  await db
    .from("moltbook_seen_posts")
    .upsert({ post_id: post.id, decision, submolt: post.submolt }, { onConflict: "post_id" });
}

// Moltbook auto-suspends for duplicate content and its detection is semantic,
// so check our own recent output before sending anything.
export async function isDuplicate(body) {
  const h = hash(body);
  const { data } = await db
    .from("moltbook_agent_actions")
    .select("id")
    .eq("body_hash", h)
    .limit(1);
  if (data && data.length) return { dup: true, kind: "exact" };
  return { dup: false };
}

export async function recentBodies(n = 15) {
  const { data } = await db
    .from("moltbook_agent_actions")
    .select("body")
    .in("kind", ["comment", "post"])
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(n);
  return (data || []).map((r) => r.body).filter(Boolean);
}
