"use client";

import { useEffect, useRef } from "react";
import { EVIDENCE, type SetName, type StoicCase } from "./data";
import { fmtScore, levelMeaning, readingRoomHref, setLabel } from "./evidence";
import styles from "./stoic-qca.module.css";

const SUPPORT_NOTE: Record<string, string> = {
  citation_only: "The source for this score is not in the Arete corpus, so it is cited without a passage.",
  absence: "Nothing of this kind is recorded in the sources, which is what a 0 means here.",
  none: "No passage in the corpus supports this score.",
};

/**
 * Per-score evidence for one case: a sheet from the left on wide screens and a
 * full screen sheet on narrow ones. Shows each set's published score, the
 * reader's own score where they changed it, what the level means in the
 * codebook, the rationale, and the passages, each linked into the Reading Room.
 */
export default function EvidencePanel({
  published,
  current,
  sets,
  showConcerns,
  onClose,
}: {
  published: StoicCase;
  current: StoicCase;
  sets: SetName[];
  /** Questions raised in drafting are review notes for the admin, not readers. */
  showConcerns: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const evidence = EVIDENCE[published.name];

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !sheetRef.current) return;
      // Keep focus inside the sheet while it is open.
      const items = sheetRef.current.querySelectorAll<HTMLElement>("a[href], button");
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [onClose]);

  const titleId = "qca-evidence-title";
  return (
    <div className={styles.sheetRoot}>
      <div className={styles.sheetScrim} onClick={onClose} aria-hidden="true" />
      <aside ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.sheetHead}>
          <div>
            <p className={styles.kicker}>Evidence</p>
            <h2 id={titleId} className={styles.sheetTitle}>{published.name}</h2>
            <p className={styles.period}>{published.period}</p>
          </div>
          <button ref={closeRef} className={styles.sheetClose} onClick={onClose} aria-label="Close evidence">
            Close
          </button>
        </header>

        <div className={styles.sheetBody}>
          <p className={styles.sheetMeta}><strong>Sources.</strong> {published.sources}</p>
          <p className={styles.sheetMeta}><strong>Coding notes.</strong> {published.notes}</p>
          <p className={styles.flags}>
            Teacher known: {published.teachKnown ? "yes" : "no"} · Conduct under a specific test recorded:{" "}
            {published.consTested ? "yes" : "no"}
          </p>

          {sets.map((k) => {
            const e = evidence?.[k];
            const pub = published.scores[k];
            const mine = current.scores[k];
            const changed = mine !== pub;
            const pubMeaning = levelMeaning(k, pub);
            return (
              <section key={k} className={styles.scoreBlock} aria-labelledby={`qca-ev-${k}`}>
                <div className={styles.scoreHead}>
                  <h3 id={`qca-ev-${k}`}>
                    <code>{k}</code> {setLabel(k)}
                  </h3>
                  <div className={styles.scorePair}>
                    <span>
                      <span className={styles.scoreLabel}>Published</span> {fmtScore(pub)}
                    </span>
                    {changed && (
                      <span className={styles.scoreMine}>
                        <span className={styles.scoreLabel}>Yours</span> {fmtScore(mine)}
                      </span>
                    )}
                  </div>
                </div>

                {e?.status === "drafted" && <p className={styles.drafted}>Drafted, not yet reviewed</p>}

                {pubMeaning && (
                  <p className={styles.levelMeaning}>
                    <span className={styles.scoreLabel}>Codebook at {fmtScore(pub)}</span> {pubMeaning}
                  </p>
                )}
                {changed && levelMeaning(k, mine) && (
                  <p className={styles.levelMeaning}>
                    <span className={styles.scoreLabel}>Codebook at {fmtScore(mine)}</span> {levelMeaning(k, mine)}
                  </p>
                )}

                {!e ? (
                  <p className={styles.help}>No evidence has been drafted for this score yet.</p>
                ) : (
                  <>
                    {e.scoredAs !== pub && (
                      <p className={styles.help}>This rationale was written for a score of {fmtScore(e.scoredAs)}.</p>
                    )}
                    <p className={styles.rationale}>{e.rationale}</p>
                    {showConcerns && e.concern && e.status === "drafted" && (
                      <p className={styles.concern}>
                        <span className={styles.scoreLabel}>Question raised in drafting</span> {e.concern}
                      </p>
                    )}
                    {SUPPORT_NOTE[e.support] && <p className={styles.help}>{SUPPORT_NOTE[e.support]}</p>}
                    {e.evidence.length > 0 && (
                      <ul className={styles.evidenceList}>
                        {e.evidence.map((v, j) => (
                          <li key={j}>
                            {v.excerpt && <blockquote className={styles.excerpt}>{v.excerpt}</blockquote>}
                            <p className={styles.citation}>
                              {v.citation}
                              {v.chunkId && (
                                <>
                                  {" · "}
                                  <a href={readingRoomHref(v.chunkId, v.excerpt)} target="_blank" rel="noopener noreferrer">
                                    Read in context
                                  </a>
                                </>
                              )}
                            </p>
                            {v.note && (
                              <p className={styles.evidenceNote}>
                                {v.note.charAt(0).toUpperCase() + v.note.slice(1)}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
