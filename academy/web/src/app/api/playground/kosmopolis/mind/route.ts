import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { callOracle, type HistoryTurn } from "@/lib/oracle";
import { arete, virtueFromText, VIRTUE_KEYS, type VirtueKey } from "@/content/playground/kosmopolis";

/**
 * Awaken a soul.
 *
 * POST /api/playground/kosmopolis/mind
 *   body: { soul: { name, virtues }, epoch?, year?, harmony?, fortune? }
 *   → { reflection, virtue, remaining }
 *
 * Most of Kosmopolis runs in the browser on simple leanings. This route is the
 * rare, deliberate moment where a soul is given reason: the Oracle speaks in the
 * soul's own voice, deliberates its way — from within the corpus — to a
 * virtuous act, and names the virtue it draws on. The awakening is remembered in
 * the shared ledger. It costs one Oracle call against the daily limit, which is
 * the point: consciousness here is precious, not automatic.
 */

type Virtues = Record<VirtueKey, number>;

function readVirtues(v: unknown): Virtues | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const out = {} as Virtues;
  for (const k of VIRTUE_KEYS) {
    const n = obj[k];
    if (typeof n !== "number" || !isFinite(n)) return null;
    out[k] = Math.min(1, Math.max(0, n));
  }
  return out;
}

function line(v: Virtues): string {
  return VIRTUE_KEYS.map((k) => `${k} ${(v[k] * 100) | 0}`).join(", ");
}

export async function POST(request: NextRequest) {
  let payload: {
    soul?: { name?: unknown; virtues?: unknown };
    epoch?: unknown;
    year?: unknown;
    harmony?: unknown;
    fortune?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload.soul?.name === "string" ? payload.soul.name.trim().slice(0, 80) : "";
  const virtues = readVirtues(payload.soul?.virtues);
  if (!name || !virtues) {
    return NextResponse.json({ error: "A soul (name and virtues) is required." }, { status: 400 });
  }

  const epoch = typeof payload.epoch === "string" ? payload.epoch.slice(0, 40) : null;
  const year = typeof payload.year === "number" && isFinite(payload.year) ? Math.round(payload.year) : null;
  const fortune = typeof payload.fortune === "string" && payload.fortune ? payload.fortune.slice(0, 60) : null;
  const a = arete(virtues);

  // The framing rides in history (unbounded upstream); the question stays short.
  const situation =
    `A soul named ${name} has just awakened to reason inside a simulated world whose one law is that virtue is its own reward. ` +
    `Its character leans thus (0–100): ${line(virtues)}. ` +
    (epoch ? `The age is "${epoch}". ` : "") +
    (fortune ? `${fortune[0].toUpperCase()}${fortune.slice(1)} is upon the world. ` : "") +
    `Speak in this soul's own voice as it deliberates, for the very first time, how to act well here. ` +
    `Grant what its strong virtues make easy, and press where its weak ones will fail it. ` +
    `Choose one concrete virtuous act it will now take, and make plain which cardinal virtue — wisdom, justice, courage, or temperance — it draws on.`;

  const history: HistoryTurn[] = [
    { role: "user", content: situation },
    { role: "assistant", content: "Understood — I hold this soul's character and moment in view, and I will answer in its voice." },
  ];

  const question = `I am ${name}, newly able to reason. Given what I am, what is the virtuous thing for me to do now — and which virtue does it ask of me?`;

  const reply = await callOracle({ question, author: null, history });

  if (!reply) {
    return NextResponse.json({ error: "The Oracle could not be reached. The soul stays dormant." }, { status: 502 });
  }
  if (!reply.answer) {
    // Upstream 429 comes back as an empty answer with remaining 0.
    return NextResponse.json(
      {
        error:
          reply.remaining === 0
            ? "The Oracle has given reason to fifteen souls today. Return tomorrow to awaken another."
            : "The Oracle was silent. The soul stays dormant.",
        remaining: reply.remaining,
      },
      { status: 429 }
    );
  }

  const virtue = virtueFromText(reply.answer);

  // Remember the awakening in the shared annals. A failure here must not lose
  // the reflection the visitor is owed, so we persist best-effort.
  try {
    const supabase = createAdminClient();
    await supabase.from("kosmopolis_lives").insert({
      kind: "awakening",
      soul_name: name,
      epoch,
      world_year: year,
      arete: a,
      virtue,
      reflection: reply.answer,
    });
  } catch (err) {
    console.error("[api/playground/kosmopolis/mind persist]", err);
  }

  return NextResponse.json({ reflection: reply.answer, virtue, remaining: reply.remaining });
}
