import { NextRequest, NextResponse } from "next/server";
import { callOracle, type HistoryTurn } from "@/lib/oracle";
import { VIRTUE_KEYS, type VirtueKey } from "@/content/playground/kosmopolis";

/**
 * Seek the corpus on a dilemma.
 *
 * POST /api/playground/kosmopolis/scripture
 *   body: { scene, virtue, soulName? }
 *   → { passage, sources, remaining }
 *
 * The dilemma flow is normally authored and free (see the choice route). This
 * is the deliberate, costly alternative: instead of the curated verdict, ask
 * the Oracle to draw — live, from the corpus — the passage that most bears on
 * the choice, and return it with its sources. It spends one Oracle call against
 * the daily limit, which is the point: a real passage, sought on purpose.
 */

function isVirtue(v: unknown): v is VirtueKey {
  return typeof v === "string" && (VIRTUE_KEYS as string[]).includes(v);
}

export async function POST(request: NextRequest) {
  let payload: { scene?: unknown; virtue?: unknown; soulName?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const scene = typeof payload.scene === "string" ? payload.scene.trim().slice(0, 600) : "";
  const virtue = isVirtue(payload.virtue) ? payload.virtue : null;
  const soulName = typeof payload.soulName === "string" ? payload.soulName.trim().slice(0, 80) : "a soul";
  if (!scene || !virtue) {
    return NextResponse.json({ error: "A scene and a virtue are required." }, { status: 400 });
  }

  const situation =
    `In a simulated world whose one law is that virtue is its own reward, ${soulName} faces this moment: ${scene} ` +
    `The course the tradition would counsel draws chiefly on ${virtue}. ` +
    `Answer with the single passage from the corpus that most bears on this choice — quote or closely paraphrase it, then in a sentence say how it guides ${soulName} here. Be brief, and let the passage lead.`;

  const history: HistoryTurn[] = [
    { role: "user", content: situation },
    { role: "assistant", content: "Understood — I will bring the one passage that speaks to this, from the corpus, and say briefly how it guides." },
  ];

  const question = `What does the corpus say that bears on this choice, and how should it guide ${soulName}?`;

  const reply = await callOracle({ question, author: null, history });

  if (!reply) {
    return NextResponse.json({ error: "The corpus could not be reached. Try again." }, { status: 502 });
  }
  if (!reply.answer) {
    return NextResponse.json(
      {
        error:
          reply.remaining === 0
            ? "The Oracle has spoken fifteen times today. Return tomorrow to seek the corpus again."
            : "The corpus was silent. Try again.",
        remaining: reply.remaining,
      },
      { status: 429 }
    );
  }

  return NextResponse.json({ passage: reply.answer, sources: reply.sources ?? null, remaining: reply.remaining });
}
