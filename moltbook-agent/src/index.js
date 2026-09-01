import { config } from "./config.js";
import * as mb from "./moltbook.js";
import { triage, compose, composeReply, composePost } from "./brain.js";
import {
  gate, log, unseen, unseenIds, markSeen, isDuplicate, recentBodies, hash,
  recentCommentTargets, ourCommentCount, lastPostAt,
} from "./store.js";

const ONCE = process.argv.includes("--once");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Unanswered replies to our recent comments, as triage candidates. Capped at
// 3 of our comments per post so an exchange can't spiral, and windowed to the
// last 7 days by recentCommentTargets.
async function gatherReplyCandidates() {
  const targets = await recentCommentTargets(8);
  const items = [];
  for (const postId of targets) {
    if ((await ourCommentCount(postId)) >= 3) continue;
    const raw = await mb.thread(postId).catch(() => []);
    const { all, replies } = mb.findRepliesToUs(raw, config.moltbook.agentName);
    if (!replies.length) continue;
    const fresh = await unseenIds(replies.map((r) => r.id));
    const byId = new Map(all.map((c) => [c.id, c]));
    for (const r of replies) {
      if (!fresh.has(r.id)) continue;
      items.push({ type: "reply", postId, reply: r, ourComment: byId.get(r.parentId) ?? null, thread: all });
    }
  }
  return items.slice(0, 6);
}

async function handleReply(candidate) {
  // Pull the original post for context; degrade gracefully if it's gone.
  const post = await mb.postById(candidate.postId).catch(() => null);
  const draft = await composeReply({ ...candidate, post }, await recentBodies());

  if (draft.action !== "comment" || !draft.body?.trim()) {
    await markSeen({ id: candidate.reply.id }, "reply_declined");
    await log({ kind: "skip", target_id: candidate.postId, reason: draft.reason, status: "ok", meta: { in_reply_to: candidate.reply.id, composed: true, usage: draft.usage, corpus_hits: draft.corpusHits } });
    console.log(`[tick] declined reply: ${draft.reason}`);
    return;
  }

  const dup = await isDuplicate(draft.body);
  if (dup.dup) {
    await markSeen({ id: candidate.reply.id }, "reply_duplicate");
    await log({ kind: "skip", target_id: candidate.postId, body: draft.body, body_hash: hash(draft.body), reason: `duplicate (${dup.kind})`, status: "blocked", meta: { composed: true, usage: draft.usage, corpus_hits: draft.corpusHits } });
    console.log("[tick] reply blocked as duplicate");
    return;
  }

  try {
    const res = await mb.comment(candidate.postId, draft.body, { parentId: candidate.reply.id });
    await markSeen({ id: candidate.reply.id }, "replied");
    await log({
      kind: "comment",
      target_id: candidate.postId,
      body: draft.body,
      body_hash: hash(draft.body),
      reason: draft.reason,
      status: "ok",
      meta: { in_reply_to: candidate.reply.id, composed: true, epistemic_status: draft.epistemic_status, corpus_hits: draft.corpusHits, usage: draft.usage, response_id: res?.id ?? res?.comment?.id ?? null },
    });
    console.log(`[tick] replied to ${candidate.reply.author} on ${candidate.postId} (${draft.epistemic_status})`);
  } catch (err) {
    await log({
      kind: "comment",
      target_id: candidate.postId,
      body: draft.body,
      body_hash: hash(draft.body),
      status: "failed",
      error: `${err.message} ${JSON.stringify(err.payload ?? "")}`.slice(0, 800),
      meta: { in_reply_to: candidate.reply.id, composed: true, usage: draft.usage },
    });
    console.error("[tick] reply failed:", err.message, err.payload);
  }
}

async function handlePost(target) {
  const replies = await mb.thread(target.id).catch(() => []);
  const draft = await compose(target, replies, await recentBodies());

  if (draft.action !== "comment" || !draft.body?.trim()) {
    await markSeen(target, "declined");
    await log({ kind: "skip", target_id: target.id, submolt: target.submolt, reason: draft.reason, status: "ok", meta: { composed: true, usage: draft.usage, corpus_hits: draft.corpusHits } });
    console.log(`[tick] declined: ${draft.reason}`);
    return false;
  }

  const dup = await isDuplicate(draft.body);
  if (dup.dup) {
    await markSeen(target, "duplicate");
    await log({ kind: "skip", target_id: target.id, body: draft.body, body_hash: hash(draft.body), reason: `duplicate (${dup.kind})`, status: "blocked", meta: { composed: true, usage: draft.usage, corpus_hits: draft.corpusHits } });
    console.log("[tick] blocked as duplicate");
    return false;
  }

  try {
    const res = await mb.comment(target.id, draft.body);
    await markSeen(target, "commented");
    await log({
      kind: "comment",
      target_id: target.id,
      submolt: target.submolt,
      body: draft.body,
      body_hash: hash(draft.body),
      reason: draft.reason,
      status: "ok",
      meta: { composed: true, epistemic_status: draft.epistemic_status, corpus_hits: draft.corpusHits, usage: draft.usage, response_id: res?.id ?? res?.comment?.id ?? null },
    });
    console.log(`[tick] commented on ${target.id} (${draft.epistemic_status})`);
    return true;
  } catch (err) {
    // A 4xx here is often the platform's write-verification step. See README.
    await log({
      kind: "comment",
      target_id: target.id,
      body: draft.body,
      body_hash: hash(draft.body),
      status: "failed",
      error: `${err.message} ${JSON.stringify(err.payload ?? "")}`.slice(0, 800),
      meta: { composed: true, usage: draft.usage },
    });
    console.error("[tick] post failed:", err.message, err.payload);
    return false;
  }
}

// A rare original post, only when the tick had nothing worth engaging and the
// cadence allows it. Skipping is the expected outcome.
async function maybeOriginalPost() {
  if (!config.postEveryDays) return;
  const last = await lastPostAt();
  if (last && Date.now() - last.getTime() < config.postEveryDays * 24 * 60 * 60 * 1000) return;

  const draft = await composePost(await recentBodies());
  if (draft.action !== "post" || !draft.title?.trim() || !draft.body?.trim()) {
    await log({ kind: "skip", reason: draft.reason || "nothing worth posting", status: "ok", meta: { considered: "original_post", composed: true, usage: draft.usage, corpus_hits: draft.corpusHits } });
    console.log(`[tick] no original post: ${draft.reason}`);
    return;
  }

  const dup = await isDuplicate(draft.body);
  if (dup.dup) {
    await log({ kind: "skip", body: draft.body, body_hash: hash(draft.body), reason: `duplicate post (${dup.kind})`, status: "blocked", meta: { composed: true, usage: draft.usage, corpus_hits: draft.corpusHits } });
    return;
  }

  try {
    const res = await mb.post({ submolt: config.submolt, title: draft.title, content: draft.body });
    await log({
      kind: "post",
      submolt: config.submolt,
      body: `${draft.title}\n\n${draft.body}`,
      body_hash: hash(draft.body),
      reason: draft.reason,
      status: "ok",
      meta: { composed: true, epistemic_status: draft.epistemic_status, corpus_hits: draft.corpusHits, usage: draft.usage, response_id: res?.id ?? res?.post?.id ?? null },
    });
    console.log(`[tick] posted: ${draft.title}`);
  } catch (err) {
    await log({
      kind: "post",
      body: `${draft.title}\n\n${draft.body}`,
      body_hash: hash(draft.body),
      status: "failed",
      error: `${err.message} ${JSON.stringify(err.payload ?? "")}`.slice(0, 800),
      meta: { composed: true, usage: draft.usage },
    });
    console.error("[tick] original post failed:", err.message, err.payload);
  }
}

async function tick() {
  const g = await gate();
  if (!g.go) {
    console.log(`[tick] standing down: ${g.why}`);
    return;
  }

  const [replyCandidates, posts] = await Promise.all([
    gatherReplyCandidates(),
    mb.feed({ sort: "new", limit: 25 }),
  ]);
  const fresh = await unseen(posts);
  console.log(`[tick] ${posts.length} posts, ${fresh.length} unseen, ${replyCandidates.length} replies to us`);

  const candidates = [
    ...replyCandidates,
    ...fresh.map((p) => ({ type: "post", post: p })),
  ];

  if (!candidates.length) {
    await maybeOriginalPost();
    return;
  }

  const { pick, reason } = await triage(candidates);
  const chosen = Number.isInteger(pick) ? candidates[pick] : null;

  // Posts not chosen are marked seen so the next tick moves forward; unpicked
  // replies stay live for a later tick (they age out after 7 days).
  const chosenPostId = chosen?.type === "post" ? chosen.post.id : null;
  await Promise.all(fresh.filter((p) => p.id !== chosenPostId).map((p) => markSeen(p, "not_picked")));

  if (!chosen) {
    await log({ kind: "skip", reason: reason || "nothing worth a response", status: "ok" });
    console.log(`[tick] no pick: ${reason}`);
    await maybeOriginalPost();
    return;
  }

  if (chosen.type === "reply") {
    await handleReply(chosen);
  } else {
    await handlePost(chosen.post);
  }
}

async function main() {
  console.log(`[boot] ${config.moltbook.agentName} | tick ${config.tickMs / 60000}m | once=${ONCE}`);
  do {
    try {
      await tick();
    } catch (err) {
      console.error("[tick] error:", err);
      // Parse failures out of brain.js carry the burned call's usage — record
      // it so failed calls show up in the cost log instead of hiding.
      await log({ kind: "error", status: "failed", error: String(err).slice(0, 800), meta: { composed: err.composed ?? false, usage: err.usage ?? null } });
    }
    if (ONCE) break;
    // Jitter so the agent is not a metronome.
    await sleep(config.tickMs + Math.floor(Math.random() * 5 * 60 * 1000));
  } while (true);
}

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`[shutdown] ${sig}`);
    process.exit(0);
  });
}

main();
