import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveVisitor } from "@/lib/playground-visitor";
import { arete, VIRTUE_KEYS, type VirtueKey } from "@/content/playground/kosmopolis";

/**
 * Remember a legacy.
 *
 * POST /api/playground/kosmopolis/legacy
 *   body: { soul: { name, virtues }, maxim, virtue?, epoch?, year? }
 *   → { ok }
 *
 * Worlds are ephemeral; their best souls need not be. When an awakened soul
 * dies having reasoned its way to a saying, the browser sends that saying here
 * to be kept in the shared annals — an epitaph that outlasts the world it was
 * spoken in, for every visitor who comes after. Spends no Oracle (the words
 * were already earned), attributed to the signed-in visitor if there is one,
 * and best-effort: a failure never disturbs the world the visitor is watching.
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
    maxim?: unknown;
    virtue?: unknown;
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
  const maxim = typeof payload.maxim === "string" ? payload.maxim.trim().slice(0, 2000) : "";
  const virtue = isVirtue(payload.virtue) ? payload.virtue : null;
  if (!name || !virtues || !maxim) {
    return NextResponse.json({ error: "A soul and its words are required." }, { status: 400 });
  }

  const epoch = typeof payload.epoch === "string" ? payload.epoch.slice(0, 40) : null;
  const year = typeof payload.year === "number" && isFinite(payload.year) ? Math.round(payload.year) : null;

  const visitor = await resolveVisitor();
  try {
    const supabase = createAdminClient();
    await supabase.from("kosmopolis_lives").insert({
      kind: "legacy",
      soul_name: name,
      epoch,
      world_year: year,
      arete: arete(virtues),
      virtue,
      reflection: maxim,
      user_id: visitor?.userId ?? null,
      author_name: visitor?.name ?? null,
    });
  } catch (err) {
    console.error("[api/playground/kosmopolis/legacy persist]", err);
  }

  return NextResponse.json({ ok: true });
}
