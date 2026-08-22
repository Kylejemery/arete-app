/**
 * Kosmopolis — the faulty reasoning behind a soul's vice.
 *
 * For the Stoics, vice is not bad luck or bad character in the abstract: it is a
 * false judgment. A soul goes wrong by assenting to a mistaken impression —
 * almost always by treating an *indifferent* (wealth, safety, pleasure, the
 * crowd's opinion) as if it were a genuine good or evil. "Money is good,
 * therefore I steal" is exactly such a syllogism: true-looking, and rotten at
 * the premise.
 *
 * Each entry pairs the mistaken syllogism a soul reasoned by (first person, so
 * you see it as they saw it) with the false step — the correction the tradition
 * would make. Keyed to the cardinal virtue that failed. Authored and unlimited;
 * awakening a soul is precisely the act of mending the premise.
 */

import type { VirtueKey } from "@/content/playground/kosmopolis";

export type FaultyReasoning = { premise: string; error: string };

export const FAULTY: Record<VirtueKey, FaultyReasoning[]> = {
  justice: [
    {
      premise: "Wealth is good; this coin could be mine; so taking it serves my good.",
      error: "Wealth is a preferred indifferent, not a good. The only good is virtue — and justice forbids the taking.",
    },
    {
      premise: "The credit is what matters; if I claim it, I gain; so I let them think it mine.",
      error: "Reputation lives in other minds, not in your power, and is no good of yours. What is yours is dealing honestly.",
    },
    {
      premise: "They are a stranger, not my own; so I owe them nothing.",
      error: "Reason makes every person your kin. To weigh a stranger and a friend by different scales is the injustice itself.",
    },
  ],
  courage: [
    {
      premise: "Pain is a great evil; safety is worth any price; so I flee what must be faced.",
      error: "Pain and danger are indifferents; the only evil is vice. To abandon your post is the real harm.",
    },
    {
      premise: "If I speak the hard truth I may lose them; loss is unbearable; so I stay silent.",
      error: "Their favour is not in your keeping, and losing it is no evil. Withholding the needed word is the failing.",
    },
  ],
  temperance: [
    {
      premise: "Pleasure is the good; more pleasure is more good; so I take past enough.",
      error: "Pleasure is an indifferent, not the good. Ungoverned, appetite enslaves the one who obeys it.",
    },
    {
      premise: "This wrong stung me; anger will settle it; so I give the anger its way.",
      error: "The sting was your judgment, not the deed. Anger is a brief madness that harms its owner first.",
    },
  ],
  wisdom: [
    {
      premise: "Everyone says it is so; to doubt is to stand alone; so I assent without looking.",
      error: "Truth is not decided by numbers. To assent to an unexamined impression is the root of every error.",
    },
    {
      premise: "I judged once and said it aloud; to revisit it is to look weak; so I hold the verdict.",
      error: "Clinging to a judgment because it is yours is vanity, not knowledge. The wise change their minds when shown.",
    },
  ],
};

function pick<T>(a: T[]): T {
  return a[(Math.random() * a.length) | 0];
}

export function faultyFor(virtue: VirtueKey): FaultyReasoning {
  return pick(FAULTY[virtue] ?? FAULTY.wisdom);
}
