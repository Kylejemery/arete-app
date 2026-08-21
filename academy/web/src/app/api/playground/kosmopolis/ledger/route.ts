import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * The Kosmopolis ledger — the shared mythology.
 *
 * GET /api/playground/kosmopolis/ledger
 *   → { lives: Life[] }  (most recent first)
 *
 * Worlds are ephemeral; this is what outlasts them. It returns the notable
 * lives recorded across every visitor's world — souls awakened, souls
 * counselled — so the panel can show that this one world has a history.
 * Writes happen only in the mind and counsel routes; this is read-only.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("kosmopolis_lives")
      .select("id, kind, soul_name, epoch, world_year, arete, virtue, counselor, author_name, reflection, created_at")
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw error;
    return NextResponse.json({ lives: data ?? [] });
  } catch (err) {
    console.error("[api/playground/kosmopolis/ledger GET]", err);
    return NextResponse.json({ error: "Could not open the annals." }, { status: 500 });
  }
}
