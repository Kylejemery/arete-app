import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * A signed-in visitor's saved world.
 *
 * GET    → { authenticated, world }   the caller's own world (or null)
 * PUT     { state }  → { ok }         upsert the caller's world (auth required)
 * DELETE → { ok }                     forget the caller's world (auth required)
 *
 * Everything runs through the caller's cookie session, so row-level security is
 * the guard: a visitor can only ever read or write their own row in
 * kosmopolis_worlds. Anonymous callers get { authenticated: false } and persist
 * to localStorage in the browser instead.
 */

export const dynamic = "force-dynamic";

// A world is small (≤150 souls + a bounded chronicle). Cap the serialized size
// so a malformed or hostile payload can't bloat the row.
const MAX_STATE_CHARS = 400_000;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ authenticated: false, world: null });

    const { data, error } = await supabase
      .from("kosmopolis_worlds")
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({ authenticated: true, world: data?.state ?? null });
  } catch (err) {
    console.error("[api/playground/kosmopolis/world GET]", err);
    return NextResponse.json({ authenticated: false, world: null, error: "Could not load your world." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let payload: { state?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const state = payload.state;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return NextResponse.json({ error: "A world state object is required." }, { status: 400 });
  }
  if (JSON.stringify(state).length > MAX_STATE_CHARS) {
    return NextResponse.json({ error: "World is too large to save." }, { status: 413 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to save your world across devices." }, { status: 401 });

    const { error } = await supabase
      .from("kosmopolis_worlds")
      .upsert({ user_id: user.id, state, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/playground/kosmopolis/world PUT]", err);
    return NextResponse.json({ error: "Could not save your world." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { error } = await supabase.from("kosmopolis_worlds").delete().eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/playground/kosmopolis/world DELETE]", err);
    return NextResponse.json({ error: "Could not forget your world." }, { status: 500 });
  }
}
