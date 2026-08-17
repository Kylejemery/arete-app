"use client";

import { useEffect, useRef, useState } from "react";
import type { Situation } from "@/content/playground/situations";
import CorpusDiscussion from "@/components/playground/CorpusDiscussion";

/**
 * The Situations Game as a master–detail view: a rail of situations on the
 * left, the selected one (verdict, reasoning, canon, and its own corpus
 * discussion) in the main pane. Replaces the long single scroll.
 *
 * The selection lives in the URL hash (#<id>) so a situation can be linked to
 * directly and the back/forward buttons move between them.
 */
export default function SituationsGame({ situations }: { situations: Situation[] }) {
  const [activeId, setActiveId] = useState<string>(situations[0]?.id ?? "");
  const mainRef = useRef<HTMLDivElement>(null);
  const didMount = useRef(false);

  // Adopt an initial selection from the hash, and follow hash changes (back/fwd).
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (id && situations.some((s) => s.id === id)) setActiveId(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [situations]);

  function select(id: string) {
    setActiveId(id);
    if (window.location.hash !== `#${id}`) {
      history.pushState(null, "", `#${id}`);
    }
    // On narrow screens the rail sits above the pane — bring the detail into view.
    if (window.matchMedia("(max-width: 860px)").matches) {
      requestAnimationFrame(() =>
        mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  }

  const activeIndex = Math.max(
    0,
    situations.findIndex((s) => s.id === activeId)
  );
  const s = situations[activeIndex];

  // Reset the pane scroll when the situation changes (after the first render).
  useEffect(() => {
    if (didMount.current) {
      mainRef.current?.scrollTo?.({ top: 0 });
    } else {
      didMount.current = true;
    }
  }, [activeId]);

  if (!s) return null;

  const prev = situations[activeIndex - 1];
  const next = situations[activeIndex + 1];

  return (
    <div className="pg-sit-layout">
      <nav className="pg-sit-nav" aria-label="Situations">
        {situations.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className="pg-sit-navitem"
            aria-current={item.id === activeId}
            onClick={() => select(item.id)}
          >
            <span className="pg-sit-navnum">{String(i + 1).padStart(2, "0")}</span>
            <span className="pg-sit-navtext">
              <span className="pg-sit-navtag">{item.tag}</span>
              <span className="pg-sit-navtitle">{item.title}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="pg-sit-main" ref={mainRef}>
        <article className="pg-situation" key={s.id} id={s.id}>
          <div className="pg-situation-head">
            <p className="pg-sit-tag">
              {s.tag}
              <span className="pg-sit-progress">
                {activeIndex + 1} / {situations.length}
              </span>
            </p>
            <h2>{s.title}</h2>
            <p className="pg-sit-scene">{s.scene}</p>
          </div>

          <div className="pg-sit-response">
            <p className="pg-sit-response-ref">
              <span className="pg-diamond" aria-hidden="true" />
              {s.ref.work}
              <span style={{ opacity: 0.45 }}>/</span>
              {s.ref.text_ref}
            </p>
            <p className="pg-sit-verdict">{s.verdict}</p>
            <p className="pg-sit-reason">{s.reason}</p>
          </div>

          {/* key forces a fresh thread load when switching situations */}
          <CorpusDiscussion
            key={s.id}
            threadKey={`situation:${s.id}`}
            context={
              `A situation from the Situations Game — "${s.title}" (${s.tag}). ` +
              `The scene: ${s.scene} ` +
              `The tradition's verdict, resting on ${s.ref.work} ${s.ref.text_ref}: ` +
              `"${s.verdict}" Reasoning: ${s.reason} ` +
              `The reader is agreeing or disagreeing with this verdict.`
            }
            heading="Do you buy the verdict?"
            placeholder="Agree, disagree, or complicate it — the corpus will answer."
          />
        </article>

        <div className="pg-sit-pager">
          <button
            type="button"
            className="pg-sit-pagerbtn"
            disabled={!prev}
            onClick={() => prev && select(prev.id)}
          >
            ← {prev ? prev.title : "Start"}
          </button>
          <button
            type="button"
            className="pg-sit-pagerbtn pg-sit-pagerbtn-next"
            disabled={!next}
            onClick={() => next && select(next.id)}
          >
            {next ? next.title : "End"} →
          </button>
        </div>
      </div>
    </div>
  );
}
