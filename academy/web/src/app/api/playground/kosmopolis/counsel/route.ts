import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { callOracle, type HistoryTurn } from "@/lib/oracle";
import {
  arete,
  virtueFromText,
  counselorById,
  VIRTUE_KEYS,
  type VirtueKey,
} from "@/content/playground/kosmopolis";

/**
 * Counsel a soul.
 *
 * POST /api/playground/kosmopolis/counsel
 *   body: { soul: { name, virtues }, counselor: <id>, advice, epoch?, year? }
 *   → { reply, counselor, virtue, remaining }
 *
 * A visitor speaks into the world: they advise a soul through one of the Cabinet
 * voices, and that voice answers in character, grounded in the corpus. The
 * virtue the counsel presses on is read back from the reply and returned so the
 * browser can nudge the soul — the visitor's guidance visibly changes a life.
 * Like awakening, it costs one Oracle call against the daily limit.
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
    counselor?: unknown;
    advice?: unknown;
    epoch?: unknown;
    year?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload.soul?.name === "string" ? payload.soul.name.trim().slice(0, 80) : "";
  const virtues = readVirtues(payload.soul?.virtues);
  const counselor = counselorById(typeof payload.counselor === "string" ? payload.counselor : "");
  const advice = typeof payload.advice === "string" ? payload.advice.trim() : "";

  if (!name || !virtues) {
    return NextResponse.json({ error: "A soul (name and virtues) is required." }, { status: 400 });
  }
  if (!counselor) {
    return NextResponse.json({ error: "Choose a voice to counsel through." }, { status: 400 });
  }
  if (!advice) {
    return NextResponse.json({ error: "Write your counsel first." }, { status: 400 });
  }
  if (advice.length > 2000) {
    return NextResponse.json({ error: "Counsel is too long (2000 characters max)." }, { status: 400 });
  }

  const epoch = typeof payload.epoch === "string" ? payload.epoch.slice(0, 40) : null;
  const year = typeof payload.year === "number" && isFinite(payload.year) ? Math.round(payload.year) : null;
  const a = arete(virtues);

  const situation =
    `In a simulated world whose one law is that virtue is its own reward, a soul named ${name} is being counselled. ` +
    `Its character leans thus (0–100): ${line(virtues)}. ` +
    (epoch ? `The age is "${epoch}". ` : "") +
    `A visitor addresses ${name} with the counsel that follows. ` +
    `Answer ${name} directly, in your own voice, grounded in the corpus: take up the counsel, grant what is right in it, correct what is not, and point ${name} toward the virtuous path — naming the cardinal virtue (wisdom, justice, courage, or temperance) it most needs to practise now.`;

  const history: HistoryTurn[] = [
    { role: "user", content: situation },
    { role: "assistant", content: `Understood — I will answer ${name} in my own voice, from the corpus.` },
  ];

  const reply = await callOracle({ question: advice, author: counselor.author, history });

  if (!reply) {
    return NextResponse.json({ error: "The counsel could not reach the world. Try again." }, { status: 502 });
  }
  if (!reply.answer) {
    return NextResponse.json(
      {
        error:
          reply.remaining === 0
            ? "The Oracle has spoken fifteen times today. Return tomorrow to counsel again."
            : "The voice was silent. Try again.",
        remaining: reply.remaining,
      },
      { status: 429 }
    );
  }

  const virtue = virtueFromText(reply.answer);

  try {
    const supabase = createAdminClient();
    await supabase.from("kosmopolis_lives").insert({
      kind: "counsel",
      soul_name: name,
      epoch,
      world_year: year,
      arete: a,
      virtue,
      counselor: counselor.name,
      advice,
      reflection: reply.answer,
    });
  } catch (err) {
    console.error("[api/playground/kosmopolis/counsel persist]", err);
  }

  return NextResponse.json({ reply: reply.answer, counselor: counselor.name, virtue, remaining: reply.remaining });
}
