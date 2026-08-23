/**
 * Kosmopolis — a small Enchiridion (handbook), the world's own book of doctrine.
 *
 * These are short, plain statements of the Stoic teachings the simulation runs
 * on, in the spirit of Epictetus's Enchiridion: not decoration, but the rules of
 * this world made readable. Each entry names the chapter, a title, the teaching,
 * and — where one fits — the cardinal virtue it chiefly serves, so the handbook
 * can open itself to the page a struggling soul most needs.
 */

import type { VirtueKey } from "@/content/playground/kosmopolis";

export type Chapter = { n: number; title: string; body: string; virtue?: VirtueKey };

export const ENCHIRIDION: Chapter[] = [
  {
    n: 1,
    title: "What is up to you, and what is not",
    body: "Some things are within our power — our judgments, our impulses, our own acts — and some are not — the body, property, reputation, fortune. Fix your good in what is yours, and no one can hinder or harm you.",
  },
  {
    n: 2,
    title: "Virtue is the only good",
    body: "Wealth, health, esteem, even life are indifferents — preferred or not, but never good or evil in themselves. The only good is a virtuous character; the only evil, a vicious one.",
  },
  {
    n: 3,
    title: "It is not things that disturb us",
    body: "Men are troubled not by events, but by their judgments about events. When you are thwarted, blame your own opinion, not the world. The fault, and the remedy, are within.",
    virtue: "wisdom",
  },
  {
    n: 4,
    title: "Assent with care",
    body: "Every impression asks your agreement. Do not be swept along; say to the impression, 'Wait — let me test whether you are what you seem.' To assent without looking is the root of every error.",
    virtue: "wisdom",
  },
  {
    n: 5,
    title: "Give each their due",
    body: "Reason makes every person your kin. Weigh a stranger and a friend by the same scale; render what is owed. Injustice harms the one who does it before any other.",
    virtue: "justice",
  },
  {
    n: 6,
    title: "Hold your post",
    body: "Pain and danger are indifferents; only the flight from duty is evil. Stand where you are set, speak the needed word, and do not abandon your place for fear of what is not up to you.",
    virtue: "courage",
  },
  {
    n: 7,
    title: "At the banquet of life",
    body: "Is something passed to you? Reach out a measured hand and take your share. Does it pass you by? Do not clutch. Is it not yet come? Do not stretch your desire toward it, but wait.",
    virtue: "temperance",
  },
  {
    n: 8,
    title: "Rehearse the loss",
    body: "Of all that you love, say each morning: it is mortal, and not my own. Kiss your child, your friend, your fortune, as things given back tomorrow. So fortune, when it takes, finds nothing it can wound.",
  },
  {
    n: 9,
    title: "The circle drawn inward",
    body: "Care begins with the self, then the household, the city, and at last all rational beings. The task is to draw the outer circles in, until you count every soul a citizen of one cosmos.",
    virtue: "justice",
  },
  {
    n: 10,
    title: "The sage is unshaken",
    body: "Fortune strikes all alike; the wise are moved the least. Adversity is the trainer of virtue — fire tries gold, and hardship met well leaves a soul stronger than ease ever could.",
    virtue: "courage",
  },
];

/** Open the handbook to the page a soul most needs: the chapter for the virtue it
 *  is weakest in, else the first law of all — what is up to us. */
export function chapterFor(weakest: VirtueKey): Chapter {
  return ENCHIRIDION.find((c) => c.virtue === weakest) ?? ENCHIRIDION[0];
}
