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

export async function unseenIds(ids) {
  if (!ids.length) return new Set();
  const { data } = await db.from("moltbook_seen_posts").select("post_id").in("post_id", ids);
  const known = new Set((data || []).map((r) => r.post_id));
  return new Set(ids.filter((id) => !known.has(id)));
}

export async function unseen(posts) {
  if (!posts.length) return [];
  const fresh = await unseenIds(posts.map((p) => p.id));
  return posts.filter((p) => fresh.has(p.id));
}

// Posts we commented on recently — the threads to watch for replies.
export async function recentCommentTargets(n = 8, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("moltbook_agent_actions")
    .select("target_id")
    .eq("kind", "comment")
    .eq("status", "ok")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  const out = [];
  const seenT = new Set();
  for (const r of data || []) {
    if (r.target_id && !seenT.has(r.target_id)) {
      seenT.add(r.target_id);
      out.push(r.target_id);
      if (out.length >= n) break;
    }
  }
  return out;
}

// Anti-spiral cap: how many comments we've already landed on one post.
export async function ourCommentCount(postId) {
  const { count } = await db
    .from("moltbook_agent_actions")
    .select("id", { count: "exact", head: true })
    .eq("kind", "comment")
    .eq("status", "ok")
    .eq("target_id", postId);
  return count ?? 0;
}

export async function lastPostAt() {
  const { data } = await db
    .from("moltbook_agent_actions")
    .select("created_at")
    .eq("kind", "post")
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.created_at ? new Date(data[0].created_at) : null;
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
