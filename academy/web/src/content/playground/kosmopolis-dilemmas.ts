/**
 * Kosmopolis dilemmas — the branching decisions a soul can face.
 *
 * When a soul is struggling, a visitor can help it decide. It is handed one of
 * these dilemmas, chosen to press on the cardinal virtue it is weakest in. Each
 * dilemma offers two or three courses of action: one is the path the school
 * would counsel, the others are the tempting or short-sighted ways. The visitor
 * picks, and the consequence plays out on the map.
 *
 * These are authored, corpus-grounded (the same spirit as the Situations Game),
 * so the decision loop is unlimited and reliable — it never spends the Oracle.
 * The one virtuous option per dilemma carries good: true; picking it strengthens
 * the soul, picking another lets it fall.
 */

import type { VirtueKey } from "@/content/playground/kosmopolis";

export type DilemmaOption = {
  label: string;
  /** The cardinal virtue this course of action draws on (or fails). */
  virtue: VirtueKey;
  /** Whether this is the course the tradition would counsel. */
  good: boolean;
  /** What comes of it, told in the third person — the play-out caption. */
  outcome: (name: string) => string;
};

export type Dilemma = {
  id: string;
  /** The virtue chiefly at stake — used to match the dilemma to a soul's flaw. */
  stake: VirtueKey;
  tag: string;
  /** The scene, in the soul's own frame. */
  scene: (name: string) => string;
  options: DilemmaOption[];
};

export const DILEMMAS: Dilemma[] = [
  {
    id: "found-purse",
    stake: "justice",
    tag: "The found purse",
    scene: (n) => `${n} finds a merchant's purse dropped in the market road, heavy with coin. No one saw it fall.`,
    options: [
      { label: "Return every coin", virtue: "justice", good: true, outcome: (n) => `${n} sought out the merchant and returned it whole. The town saw, and trusted ${n} the more.` },
      { label: "Keep it — fortune's gift", virtue: "justice", good: false, outcome: (n) => `${n} kept the coin. It bought comfort, and a small unease that never quite left.` },
      { label: "Take a little for the trouble", virtue: "temperance", good: false, outcome: (n) => `${n} skimmed a few coins and returned the rest — a bargain that satisfied no one, least of all ${n}.` },
    ],
  },
  {
    id: "rising-water",
    stake: "courage",
    tag: "The rising water",
    scene: (n) => `A neighbour's house is flooding in the night and the current is strong. ${n} could wade in now, or wait for stronger arms.`,
    options: [
      { label: "Wade in and pull them out", virtue: "courage", good: true, outcome: (n) => `${n} went into the black water and dragged the family clear. ${n} shook for an hour after, and slept without shame.` },
      { label: "Wait for someone braver", virtue: "courage", good: false, outcome: (n) => `${n} waited. Help came late. ${n} has not walked past that house since without looking away.` },
    ],
  },
  {
    id: "public-insult",
    stake: "temperance",
    tag: "The insult in the square",
    scene: (n) => `In the crowded square a man mocks ${n} to raucous laughter. The blood climbs ${n}'s neck.`,
    options: [
      { label: "Master the anger, answer plainly", virtue: "temperance", good: true, outcome: (n) => `${n} let the heat pass and answered without malice. The crowd's laughter turned, quietly, the other way.` },
      { label: "Strike back in kind", virtue: "temperance", good: false, outcome: (n) => `${n} repaid the mockery twofold and won the moment. By evening ${n} had a new enemy and a worse temper.` },
      { label: "Walk off seething", virtue: "courage", good: false, outcome: (n) => `${n} left without a word, and carried the insult home to chew on for a week.` },
    ],
  },
  {
    id: "confident-rumor",
    stake: "wisdom",
    tag: "The rumour everyone repeats",
    scene: (n) => `The whole town repeats a story about a stranger that ${n} suspects is false — but doubting it aloud would mark ${n} out.`,
    options: [
      { label: "Go and learn the truth", virtue: "wisdom", good: true, outcome: (n) => `${n} went to the source and found the rumour hollow. Fewer believed it after ${n} spoke.` },
      { label: "Repeat it, and belong", virtue: "wisdom", good: false, outcome: (n) => `${n} passed the story on and was welcomed. The stranger left town wronged, and ${n} half-knew it.` },
      { label: "Say nothing either way", virtue: "courage", good: false, outcome: (n) => `${n} stayed silent. The lie ran on unopposed, and silence, ${n} learned, has a cost too.` },
    ],
  },
  {
    id: "hard-word",
    stake: "courage",
    tag: "The word a friend needs",
    scene: (n) => `${n}'s closest friend is set on a course that will ruin them, and asks only for agreement, not truth.`,
    options: [
      { label: "Speak the hard truth kindly", virtue: "courage", good: true, outcome: (n) => `${n} said the difficult thing, gently and once. The friendship bent, held, and was the better for it.` },
      { label: "Tell them what they want", virtue: "justice", good: false, outcome: (n) => `${n} agreed to keep the peace. The ruin came as foretold, and ${n}'s silence was part of it.` },
    ],
  },
  {
    id: "second-helping",
    stake: "temperance",
    tag: "Past the point of enough",
    scene: (n) => `The table is laid richly and ${n} has already eaten well. The appetite says more; the body says enough.`,
    options: [
      { label: "Stop at enough", virtue: "temperance", good: true, outcome: (n) => `${n} set the plate aside satisfied, and found the wanting itself grew quieter with the practice.` },
      { label: "Take more while it's there", virtue: "temperance", good: false, outcome: (n) => `${n} ate past fullness. The pleasure was brief; the heaviness, and the habit, were not.` },
    ],
  },
  {
    id: "poor-debtor",
    stake: "justice",
    tag: "The debtor who cannot pay",
    scene: (n) => `A poor neighbour owes ${n} and cannot pay; the law would let ${n} take their tools, and their living with them.`,
    options: [
      { label: "Forgive what they cannot give", virtue: "justice", good: true, outcome: (n) => `${n} forgave the debt. The neighbour kept their trade, and repaid ${n} in loyalty for years.` },
      { label: "Take what the law allows", virtue: "justice", good: false, outcome: (n) => `${n} seized the tools. The debt was cleared, the neighbour broken, and the street a little colder to ${n}.` },
    ],
  },
  {
    id: "hasty-verdict",
    stake: "wisdom",
    tag: "The quick judgement",
    scene: (n) => `A newcomer stumbles badly on their first day and the town is ready to write them off. ${n}'s word will tip it.`,
    options: [
      { label: "Withhold judgement, look again", virtue: "wisdom", good: true, outcome: (n) => `${n} asked for a second day before deciding. The newcomer proved able, and ${n}'s fairness was remembered.` },
      { label: "Judge from the one slip", virtue: "wisdom", good: false, outcome: (n) => `${n} judged on the single stumble. A good hand was lost, and ${n} never learned what might have been.` },
    ],
  },
  {
    id: "shared-harvest",
    stake: "justice",
    tag: "Dividing the harvest",
    scene: (n) => `${n} is trusted to divide a shared harvest. No one will check the measure, and ${n}'s own family is hungry.`,
    options: [
      { label: "Divide it evenly", virtue: "justice", good: true, outcome: (n) => `${n} weighed each share alike, taking no more. The trust ${n} was given came back multiplied.` },
      { label: "Weight your own share", virtue: "justice", good: false, outcome: (n) => `${n} took a little extra where none would see. The hunger eased; the standing, once spent, did not return.` },
    ],
  },
  {
    id: "failing-plan",
    stake: "wisdom",
    tag: "The plan that is failing",
    scene: (n) => `A course ${n} argued for is clearly failing, and everyone is watching to see if ${n} will admit it.`,
    options: [
      { label: "Change course, own the error", virtue: "wisdom", good: true, outcome: (n) => `${n} named the mistake plainly and changed tack. It cost a little pride and saved a great deal else.` },
      { label: "Press on to save face", virtue: "temperance", good: false, outcome: (n) => `${n} pressed on rather than admit it. The failure deepened, and pride paid for it in the end.` },
    ],
  },
];

/** Pick a dilemma that presses on the soul's weakest virtue, if one fits. */
export function pickDilemma(virtues: Record<VirtueKey, number>, avoidId?: string): Dilemma {
  let weakest: VirtueKey = "wisdom";
  (Object.keys(virtues) as VirtueKey[]).forEach((k) => {
    if (virtues[k] < virtues[weakest]) weakest = k;
  });
  const matched = DILEMMAS.filter((d) => d.stake === weakest && d.id !== avoidId);
  const pool = matched.length ? matched : DILEMMAS.filter((d) => d.id !== avoidId);
  const list = pool.length ? pool : DILEMMAS;
  return list[(Math.random() * list.length) | 0];
}
