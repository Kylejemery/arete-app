/**
 * The Situations Game.
 *
 * Everyday situations people actually face, each paired with the response the
 * tradition would give — a one-line verdict, the passage it rests on, and the
 * reasoning. Readers can agree or disagree with the verdict and take it up with
 * the corpus underneath (thread_key = `situation:<id>`).
 *
 * Canon renderings are close paraphrase from public-domain translations and
 * carry standard references so they can be read against any edition. To add a
 * situation, append a record; the hub count and the page update automatically.
 */

export type Situation = {
  id: string;
  /** Short domain label, e.g. "At work", "Online", "Family". */
  tag: string;
  /** The prompt, phrased as a title. */
  title: string;
  /** The everyday scene, in the second person. */
  scene: string;
  /** The source the response rests on. */
  ref: { work: string; text_ref: string };
  /** The one-line philosophical response. */
  verdict: string;
  /** Why the tradition answers this way. */
  reason: string;
};

export const situations: Situation[] = [
  {
    id: "the-slow-line",
    tag: "Everyday friction",
    title: "The line that will not move",
    scene:
      "You have six minutes to be somewhere and the checkout has stopped. The person ahead is disputing a coupon, the second register just closed, and you can feel the heat climbing your neck.",
    ref: { work: "Epictetus", text_ref: "Enchiridion 5" },
    verdict:
      "The line is not doing this to you; your verdict about the line is. Drop the verdict and the heat has nothing to burn.",
    reason:
      "Men are disturbed not by things but by their judgments about things. The delay is indifferent — it is neither good nor bad in itself. What stings is the added opinion 'this must not be happening to me,' which you supplied and can withdraw. Keep the fact (I will be late), discard the protest against the fact, and act from there.",
  },
  {
    id: "the-stolen-credit",
    tag: "At work",
    title: "The colleague who took the credit",
    scene:
      "In the meeting your idea comes out of someone else's mouth, the room nods, and their name is now on it. You did the work in the dark for three weeks.",
    ref: { work: "Epictetus", text_ref: "Enchiridion 1" },
    verdict:
      "Your work was up to you and you did it well; the credit was never up to you. Guard the first and hold the second loosely.",
    reason:
      "Reputation sits among the things not in our power — it lives in other people's judgments, which you do not govern. What is yours is the quality of the work and how you conduct yourself now: whether you state the record plainly without resentment, or hand your peace to a person who has already shown you they will spend it. The theft is real; the ruin of your evening over it is optional.",
  },
  {
    id: "the-cancelled-flight",
    tag: "Plans undone",
    title: "The flight the airline cancelled",
    scene:
      "The board flips to CANCELLED. There is no crew, no rebooking until tomorrow, and the thing you were flying for happens tonight without you.",
    ref: { work: "Epictetus", text_ref: "Enchiridion 8" },
    verdict:
      "Do not ask that the flight had not been cancelled. Ask what is now yours to do, and want that.",
    reason:
      "Do not seek to have events happen as you wish, but wish them to happen as they do, and your life will go smoothly. Wishing the cancellation undone is a quarrel with a fact already settled, and you always lose that quarrel. The open question — the phone call you make, the night you salvage, the composure you keep — is the only field left where your choice still decides the outcome.",
  },
  {
    id: "the-insult-online",
    tag: "Online",
    title: "The stranger who insulted you online",
    scene:
      "A reply notification. Someone you have never met has called you, publicly, something contemptuous, and thirty people have liked it. Your thumb is already hovering over the reply box.",
    ref: { work: "Epictetus", text_ref: "Enchiridion 20" },
    verdict:
      "It is not the insult that wounds you but your decision that it is wounding. The reply box is where you hand them the power.",
    reason:
      "Remember that what is insulting is not the person who abuses you but your judgment that they are insulting. When you feel provoked, notice that it is your own opinion that has provoked you. The pause before the reply is the whole discipline: in it you can see that a stranger's contempt is their impression, not your worth, and that the like count measures their impressions too — not you.",
  },
  {
    id: "the-friend-who-flaked",
    tag: "Friendship",
    title: "The friend who cancelled at the last minute",
    scene:
      "Twenty minutes before you were due to meet, the text arrives: something came up, rain check. It is the third time. You had rearranged your day around it.",
    ref: { work: "Marcus Aurelius", text_ref: "Meditations II.1" },
    verdict:
      "You already knew this was possible today; meet it as a known feature of people, not an ambush, and keep your own conduct clean.",
    reason:
      "Begin the day telling yourself you will meet the unreliable, the ungrateful, the self-absorbed — and that none of them can implicate you in ugliness or make you hate them, for we were made to work together. The flake is disappointing and you may say so. What is not required is the story that you have been wronged by a monster; the same person you value is the one who does this, and your task is to respond as the friend you mean to be, not to be conscripted into resentment.",
  },
  {
    id: "the-promotion-lost",
    tag: "At work",
    title: "The promotion that went to someone else",
    scene:
      "The email goes out congratulating them. You were told you were the frontrunner. You can already picture the year ahead in the same seat, doing the same work, passed over.",
    ref: { work: "Epictetus", text_ref: "Enchiridion 2" },
    verdict:
      "You aimed desire at a thing outside your control and it missed. Move desire onto what you can actually secure and you stop being hostage to the committee.",
    reason:
      "Desire promises the getting of what you want, but whoever fixes desire on things not in their power is bound to be disappointed. The title was theirs to give, not yours to take — so wanting it as if it were owed sets you up to be crushed by their decision. Redirect the wanting to what is yours: the excellence of your work, your steadiness, the next move you actually control. That desire never returns empty.",
  },
  {
    id: "the-thing-you-cannot-fix",
    tag: "Family",
    title: "The parent you cannot fix",
    scene:
      "The diagnosis is not going to improve. You have made the calls, moved the money, read everything. And still, at 2 a.m., you lie awake trying to solve a thing that has no solution.",
    ref: { work: "Epictetus", text_ref: "Enchiridion 1" },
    verdict:
      "Sort the situation into what is yours and what is not. Pour yourself into the first without reserve; lay the second down, not because you are cold, but because it was never in your hands.",
    reason:
      "Some things are up to us and some are not. Up to us are our judgments and our actions; not up to us are the body, the outcome, the course of a disease. The love, the presence, the care you give are wholly yours and worth everything. The cure is not yours to command, and the night spent demanding it from a power you do not have takes strength from the care that is real. This is not resignation. It is aiming your whole force at the part that will answer to it.",
  },
];

export function getSituation(id: string): Situation | undefined {
  return situations.find((s) => s.id === id);
}
