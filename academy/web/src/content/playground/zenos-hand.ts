/**
 * Zeno's Hand — content for the Playground experiment.
 *
 * The gesture is reported by Cicero, Academica 2.145 (the Lucullus). Four
 * positions of the hand, four stages of Stoic epistemology. The renderings of
 * Cicero here are close paraphrase, not quotation: the standard English
 * translations are still in copyright, so the words are our own and the
 * reference is given so they can be checked against any edition.
 *
 * The trial's cases are drawn from the ancient debate itself — the examples
 * the Stoics and Academics actually threw at each other — each with the
 * source it comes from.
 */

export type StageId = 'impression' | 'assent' | 'katalepsis' | 'knowledge'

export type Stage = {
  id: StageId
  index: number
  /** Short English name */
  name: string
  latin: string
  greek: string
  /** What the hand is doing */
  hand: string
  /** Close paraphrase of Cicero's report of what Zeno said at this position */
  cicero: string
  /** The gloss: what the stage means and why it sits where it does */
  gloss: string
}

export const stages: Stage[] = [
  {
    id: 'impression',
    index: 0,
    name: 'Impression',
    latin: 'visum',
    greek: 'φαντασία · phantasia',
    hand: 'The open hand, fingers spread',
    cicero:
      'Holding out his hand with the fingers spread, Zeno would say: an impression is like this.',
    gloss:
      'Something appears to you. The world presses on the senses, or on the mind, and leaves a print the way a seal leaves its mark in wax. Nothing has been done yet. The impression is simply there, received but not accepted or refused, and it arrives whether you like it or not. It is the raw material of every belief, and the point where the Stoic says the work starts.',
  },
  {
    id: 'assent',
    index: 1,
    name: 'Assent',
    latin: 'adsensus',
    greek: 'συγκατάθεσις · synkatathesis',
    hand: 'The fingers drawn in a little',
    cicero: 'Then, closing the fingers a little, he would say: assent is like this.',
    gloss:
      'The one act that is yours. You cannot choose what appears to you, but taking an impression as true is something the mind does, and could decline to do. This is where freedom and responsibility enter the Stoic picture, and where error enters too. Nobody is fooled by an impression. People are fooled only by assenting to one they should have left open.',
  },
  {
    id: 'katalepsis',
    index: 2,
    name: 'Grasp',
    latin: 'comprehensio',
    greek: 'κατάληψις · katalepsis',
    hand: 'The closed fist',
    cicero:
      'Then, closing the hand fully and making a fist, he said that this was cognition, and from the likeness he gave the thing a name it had not had before: katalepsis, a grasp.',
    gloss:
      'Assent to the right kind of impression: one stamped from what is, exactly as it is, in a way that could not have come from what is not. Zeno coined the word from the gesture. A grasp is a single secure hold on a single truth, and anyone can have one. That is the part the story is usually told without. The fist is not yet knowledge.',
  },
  {
    id: 'knowledge',
    index: 3,
    name: 'Knowledge',
    latin: 'scientia',
    greek: 'ἐπιστήμη · epistēmē',
    hand: 'The left hand closed over the fist',
    cicero:
      'Then, bringing his left hand over and gripping the fist with it, tight and hard, he said that knowledge was like this, and that no one had it but the wise.',
    gloss:
      'A grasp that cannot be argued loose, because it is held in place by every other grasp the mind has, and none of them is loose. That is what the second hand is. Not a firmer version of the fist, but everything else you hold, closing around it. The school defined knowledge as a grasp that is secure and cannot be overturned by reason. Only someone who never assents to an uncertain impression can have that, which is why Zeno gave it to the sage alone.',
  },
]

export type Impression = {
  id: string
  /** The scene, in the second person */
  scene: string
  /** A handle for the case in running prose, e.g. "the round tower" */
  short: string
  /** Should a well-ordered mind assent to this? */
  clear: boolean
  /** One-line verdict */
  verdict: string
  /** Why */
  why: string
  source: string
}

export const impressions: Impression[] = [
  {
    id: 'hand',
    short: 'your own hand',
    scene:
      'You hold your own hand up in front of your face, in full daylight, and look at it.',
    clear: true,
    verdict: 'Close the hand.',
    why:
      'This is the Stoic model case: an impression from what is, stamped exactly as it is, under conditions with nothing wrong in them. Sextus preserves the school’s checklist: the organ sound, the object near, the light good, the mind attending. Withholding here is not caution. It is refusing a truth that is standing in front of you.',
    source: 'Sextus Empiricus, Against the Logicians 1.424; Diogenes Laertius 7.46',
  },
  {
    id: 'tower',
    short: 'the round tower',
    scene: 'From the harbour you look up at a tower on the headland. It seems round.',
    clear: false,
    verdict: 'Keep the hand open.',
    why:
      'Distance is one of the conditions that spoils an impression. Up close the round tower is square, a stock example in the ancient argument about the senses. The impression is true as an impression, it really does look round. But what you would be assenting to is that the tower is round, and that has not been stamped clearly enough to hold. Walk closer.',
    source: 'Lucretius 4.353–363; Sextus Empiricus, Outlines of Pyrrhonism 1.118',
  },
  {
    id: 'noon',
    short: 'the noon sun',
    scene:
      'It is noon. You are standing in the open with the sun on your shoulders. The impression: it is day.',
    clear: true,
    verdict: 'Close the hand.',
    why:
      'The Stoics’ favourite example proposition, “it is day,” is the kind of thing a grasp is made of: plain, present, and checkable by anyone standing where you stand. A fool can have this grasp as securely as a sage. What differs between them is not this fist, but what else each of them is holding.',
    source: 'Diogenes Laertius 7.65–71',
  },
  {
    id: 'pomegranate',
    short: 'the wax pomegranate',
    scene:
      'At a royal dinner a bowl of pomegranates is set in front of you. The whole court is watching. You reach for one.',
    clear: false,
    verdict: 'Keep the hand open.',
    why:
      'This happened to a Stoic. Sphaerus, dining with King Ptolemy, took a wax pomegranate for a real one, and when the court laughed he answered that he had not assented to their being pomegranates, only to its being reasonable that they were. The story survived because the distinction is exactly the one Zeno’s hand draws. A fist closed on a probability is not a grasp, whatever it looked like from outside.',
    source: 'Diogenes Laertius 7.177',
  },
  {
    id: 'dion',
    short: 'Dion in the street',
    scene:
      'Dion, whom you have known for thirty years, walks past you in the street at midday and nods.',
    clear: true,
    verdict: 'Close the hand.',
    why:
      'Recognising someone long known, in good light and at close range, is the kind of impression the theory was built around. It comes from what is, matches it, and carries a mark that could not belong to anything else. The Academic will ask about Dion’s twin. The Stoic answer is that Dion has no twin, and if he did, you would learn to tell them apart.',
    source: 'Sextus Empiricus, Against the Logicians 1.247–252',
  },
  {
    id: 'twins',
    short: 'the twin',
    scene:
      'One of the twins, Castor and Pollux, greets you by name and says he is Castor. You have never once managed to tell them apart.',
    clear: false,
    verdict: 'Keep the hand open.',
    why:
      'The Academics loved this case. If two impressions are indistinguishable, how can either be a grasp? The Stoic answer was that no two things are truly alike and a trained eye can always find the difference: the egg-keepers of Delos, they said, could tell which hen had laid which egg. But until you can see the mark, you cannot see it. Withhold, and learn the mark.',
    source: 'Cicero, Academica 2.56–57, 2.84–86',
  },
  {
    id: 'syllogism',
    short: 'Chrysippus’ syllogism',
    scene:
      'You are reading Chrysippus. If it is day, it is light. It is day. Therefore it is light.',
    clear: true,
    verdict: 'Close the hand.',
    why:
      'Not every grasp comes through the senses. A valid demonstration from grasped premises yields a grasp of the conclusion, and this argument is the school’s first indemonstrable, the form to which every other proof reduces. Knowledge, the second hand, is largely made of grasps like this one, tied to each other by exactly such links.',
    source: 'Diogenes Laertius 7.79–81',
  },
  {
    id: 'brother',
    short: 'the man in your brother’s cloak',
    scene:
      'A man walks up the road toward you in your brother’s cloak, with your brother’s gait. Your brother was lost at sea last spring.',
    clear: false,
    verdict: 'Keep the hand open.',
    why:
      'The later Stoics added a clause to the theory: a grasping impression commands assent provided it meets no obstacle. Their example was Admetus, who sees Alcestis brought back from the dead and does not assent, because everything else he holds says she is dead. That is the second hand working in the negative: a well-ordered mind checks a new impression against the whole and refuses the one that will not fit. If it really is your brother, he will still be your brother when you have had a closer look.',
    source: 'Sextus Empiricus, Against the Logicians 1.253–257',
  },
  {
    id: 'fever',
    short: 'the breathing wall',
    scene:
      'You are in bed with a fever. The wall of the room seems to breathe, in and out, as you watch it.',
    clear: false,
    verdict: 'Keep the hand open.',
    why:
      'Cicero presses the Stoics with the madman and the dreamer, whose impressions can be as vivid as anyone’s: Hercules in his madness saw his own children as an enemy’s, and assented. The Stoic reply is that the sage knows the state he is in and does not assent to impressions received in it. You know you have a fever. That is part of what you hold, and it should close around this.',
    source: 'Cicero, Academica 2.88–90',
  },
]

/** The Stoic definition that the second hand illustrates. */
export const definition = {
  text:
    'Knowledge is a grasp that is secure and cannot be overturned by reason. Opinion is weak and false assent. Between them stands the grasp itself, which the wise and the unwise share.',
  by: 'After Sextus Empiricus, Against the Logicians 1.151–152',
}
