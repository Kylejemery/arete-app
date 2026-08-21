import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveVisitor } from "@/lib/playground-visitor";
import { arete, VIRTUE_KEYS, type VirtueKey } from "@/content/playground/kosmopolis";

/**
 * Remember a decision.
 *
 * POST /api/playground/kosmopolis/choice
 *   body: { soul: { name, virtues }, virtue, outcome, epoch?, year? }
 *   → { ok }
 *
 * The dilemma flow runs entirely in the browser from the authored library, so
 * this route spends no Oracle — it only records notable choices in the shared
 * annals, attributed to the signed-in visitor who guided them. Best-effort:
 * a failure here never blocks the play-out the visitor already saw.
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

function isVirtue(v: unknown): v is VirtueKey {
  return typeof v === "string" && (VIRTUE_KEYS as string[]).includes(v);
}

export async function POST(request: NextRequest) {
  let payload: {
    soul?: { name?: unknown; virtues?: unknown };
    virtue?: unknown;
    outcome?: unknown;
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
  const virtue = isVirtue(payload.virtue) ? payload.virtue : null;
  const outcome = typeof payload.outcome === "string" ? payload.outcome.trim().slice(0, 2000) : "";
  if (!name || !virtues || !outcome) {
    return NextResponse.json({ error: "A soul, a virtue, and an outcome are required." }, { status: 400 });
  }

  const epoch = typeof payload.epoch === "string" ? payload.epoch.slice(0, 40) : null;
  const year = typeof payload.year === "number" && isFinite(payload.year) ? Math.round(payload.year) : null;

  const visitor = await resolveVisitor();
  try {
    const supabase = createAdminClient();
    await supabase.from("kosmopolis_lives").insert({
      kind: "choice",
      soul_name: name,
      epoch,
      world_year: year,
      arete: arete(virtues),
      virtue,
      reflection: outcome,
      user_id: visitor?.userId ?? null,
      author_name: visitor?.name ?? null,
    });
  } catch (err) {
    console.error("[api/playground/kosmopolis/choice persist]", err);
  }

  return NextResponse.json({ ok: true });
}
