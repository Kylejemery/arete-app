import { createClient } from "@/lib/supabase-server";

/**
 * Who, if anyone, is making this playground request.
 *
 * The playground is a public surface, so most callers are anonymous. But a
 * visitor who is signed into the academy carries their session cookie here too,
 * and these routes can read it. Used to sync a signed-in visitor's own world
 * and to attribute their awakenings in the shared annals; anonymous callers get
 * null and everything degrades to localStorage / an unattributed act.
 */
export type Visitor = { userId: string; name: string };

export async function resolveVisitor(): Promise<Visitor | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    let name = "";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("handle, email")
        .eq("id", user.id)
        .single();
      name = (profile?.handle as string) || "";
      if (!name && typeof profile?.email === "string") name = profile.email.split("@")[0];
    } catch {
      /* profile read is best-effort; fall back to the auth email below */
    }
    if (!name && typeof user.email === "string") name = user.email.split("@")[0];
    name = (name || "A student").slice(0, 80);

    return { userId: user.id, name };
  } catch {
    return null;
  }
}
