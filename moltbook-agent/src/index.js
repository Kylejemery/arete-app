import { config } from "./config.js";
import * as mb from "./moltbook.js";
import { triage, compose } from "./brain.js";
import { gate, log, unseen, markSeen, isDuplicate, recentBodies, hash } from "./store.js";

const ONCE = process.argv.includes("--once");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tick() {
  const g = await gate();
  if (!g.go) {
    console.log(`[tick] standing down: ${g.why}`);
    return;
  }

  const posts = await mb.feed({ sort: "new", limit: 25 });
  const fresh = await unseen(posts);
  console.log(`[tick] ${posts.length} posts, ${fresh.length} unseen`);
  if (!fresh.length) return;

  const { pick, reason } = await triage(fresh);
  if (pick === null || pick === undefined || !fresh[pick]) {
    await Promise.all(fresh.map((p) => markSeen(p, "no_pick")));
    await log({ kind: "skip", reason: reason || "nothing worth a reply", status: "ok" });
    console.log(`[tick] no pick: ${reason}`);
    return;
  }

  const target = fresh[pick];
  const replies = await mb.thread(target.id).catch(() => []);
  const draft = await compose(target, replies, await recentBodies());

  // Everything not picked is marked seen so the next tick moves forward.
  await Promise.all(fresh.filter((p) => p.id !== target.id).map((p) => markSeen(p, "not_picked")));

  if (draft.action !== "comment" || !draft.body?.trim()) {
    await markSeen(target, "declined");
    await log({ kind: "skip", target_id: target.id, submolt: target.submolt, reason: draft.reason, status: "ok" });
    console.log(`[tick] declined: ${draft.reason}`);
    return;
  }

  const dup = await isDuplicate(draft.body);
  if (dup.dup) {
    await markSeen(target, "duplicate");
    await log({ kind: "skip", target_id: target.id, body: draft.body, body_hash: hash(draft.body), reason: `duplicate (${dup.kind})`, status: "blocked" });
    console.log("[tick] blocked as duplicate");
    return;
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
      meta: { epistemic_status: draft.epistemic_status, corpus_hits: draft.corpusHits, usage: draft.usage, response_id: res?.id ?? null },
    });
    console.log(`[tick] commented on ${target.id} (${draft.epistemic_status})`);
  } catch (err) {
    // A 4xx here is often the platform's write-verification step. See README.
    await log({
      kind: "comment",
      target_id: target.id,
      body: draft.body,
      body_hash: hash(draft.body),
      status: "failed",
      error: `${err.message} ${JSON.stringify(err.payload ?? "")}`.slice(0, 800),
    });
    console.error("[tick] post failed:", err.message, err.payload);
  }
}

async function main() {
  console.log(`[boot] ${config.moltbook.agentName} | tick ${config.tickMs / 60000}m | once=${ONCE}`);
  do {
    try {
      await tick();
    } catch (err) {
      console.error("[tick] error:", err);
      await log({ kind: "error", status: "failed", error: String(err).slice(0, 800) });
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
