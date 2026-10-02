// When Kyle last opened the admin Comments tab, kept in his browser. The
// Comments tab writes it; the Overview card counts comments newer than it.
// Browser storage can be missing or blocked, so both sides treat it as
// optional.

const SEEN_KEY = 'arete.admin.commentsSeenAt';

export function readCommentsSeenAt(): string | null {
  try {
    const v = window.localStorage.getItem(SEEN_KEY);
    return v && !Number.isNaN(Date.parse(v)) ? v : null;
  } catch {
    return null;
  }
}

export function writeCommentsSeenAt(iso: string): void {
  try {
    window.localStorage.setItem(SEEN_KEY, iso);
  } catch {
    /* private window or blocked storage: nothing to keep */
  }
}
