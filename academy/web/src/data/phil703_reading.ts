// PHIL 703 — Required Reading (data seed)
// Transcribed verbatim from PHIL_701_704_Required_Reading.docx.
// Not yet wired into any component — a data seed for the future PHIL 703 build.
// Keyed by session number (1–11).

export interface ReadingItem {
  source: string;
  passage: string;
  note: string;
}

export const PHIL703_READING: Record<number, ReadingItem[]> = {
  "1": [
    {
      "source": "Epictetus",
      "passage": "Discourses I.1–2 (complete)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Epictetus",
      "passage": "Encheiridion (complete — re-read from PHIL 701)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Long, Epictetus Ch. 1",
      "passage": "as assigned",
      "note": "Historical and biographical context."
    }
  ],
  "2": [
    {
      "source": "Epictetus",
      "passage": "Discourses I.4 (on progress); I.11 (on family affection)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Long, Epictetus Ch. 2",
      "passage": "as assigned",
      "note": "Epictetus as inheritor of Socratic method."
    }
  ],
  "3": [
    {
      "source": "Epictetus",
      "passage": "Discourses I.17–20 (on logic and life)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Epictetus",
      "passage": "Discourses I.28 (that we should not be angry with men)",
      "note": "With I.18, the intellectualism core — the foundation PHIL 706 develops in Year 2."
    },
    {
      "source": "Long, Epictetus Ch. 3",
      "passage": "as assigned",
      "note": "How Epictetus uses argument as a tool for life."
    }
  ],
  "4": [
    {
      "source": "Epictetus",
      "passage": "Discourses II.1–5 (on freedom and the good)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Long, Epictetus Ch. 4",
      "passage": "as assigned",
      "note": "The good, freedom, and the dichotomy of control."
    }
  ],
  "5": [
    {
      "source": "Epictetus",
      "passage": "Discourses II.8–10 (on character and roles)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Long, Epictetus Ch. 5",
      "passage": "as assigned",
      "note": "The prokopton, moral development, Stoic pedagogy."
    }
  ],
  "6": [
    {
      "source": "Epictetus",
      "passage": "Discourses II.14–18 (on society and the Cynic)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Long, Epictetus Ch. 6",
      "passage": "as assigned",
      "note": "Stoic social ethics and oikeiōsis."
    }
  ],
  "7": [
    {
      "source": "Epictetus",
      "passage": "Discourses III.1–5 (on God and nature)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Long, Epictetus Ch. 7",
      "passage": "as assigned",
      "note": "Stoic providence and the logos."
    }
  ],
  "8": [
    {
      "source": "Epictetus",
      "passage": "Discourses III.22–24 (the Cynic and the philosopher)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Long, Epictetus Ch. 8",
      "passage": "as assigned",
      "note": "The inner citadel and inviolable selfhood."
    }
  ],
  "9": [
    {
      "source": "Epictetus",
      "passage": "Discourses IV.1 (complete — on freedom; the longest discourse)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Hadot, PhWoL Ch. 5",
      "passage": "as assigned",
      "note": "Socrates as model for philosophical transformation. Best in PHIL 703 seminar."
    }
  ],
  "10": [
    {
      "source": "Epictetus",
      "passage": "Encheiridion (complete — read as a unified text, not passage by passage)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Epictetus",
      "passage": "Fragments (selected)",
      "note": "Primary text — required reading."
    },
    {
      "source": "Hadot, PhWoL Ch. 7",
      "passage": "as assigned",
      "note": "Argument vs. practice. Best in PHIL 703 with Epictetus's methodology."
    }
  ],
  "11": [
    {
      "source": "Student-selected passage from the Discourses (the one you most want to contest or defend)",
      "passage": "see text",
      "note": "Primary text — required reading."
    },
    {
      "source": "Long, Epictetus Ch. 9",
      "passage": "as assigned",
      "note": "Why Epictetus matters — modern relevance and influence."
    }
  ]
};
