// The tells of machine prose, in one place, so Scribe (pipeline and chat), the
// Composer's voice pass, the Interlocutor's markup, and the cold outside read
// all name the same faults. Every surface that writes or judges prose imports
// this block rather than keeping its own list, because a tell that one surface
// bans and another tolerates comes straight back in the next revision.
//
// The list started from Kyle's own reading of drafts: the dash, the
// over-the-top comparison, the negation-first frame ("This is not X. It is
// Y."), and the line that announces an idea's importance instead of writing so
// the importance is felt. The rest are the tells screeners key on. The rule
// under all of them is the one he gave: show it, do not say it.
//
// The block is written without dashes on purpose. The earlier prompts used
// dashes in the instructions and then had to say that was not permission.

export const MACHINE_TELLS_BLOCK = `MACHINE TELLS: what marks prose as written by a model, and what to do instead.
A reader can tell machine prose inside a paragraph. The tells below are the ones this writer will not publish. Check every draft against them before you emit it, and fix what you find; a draft that carries one is a draft you still have to fix.

1. The dash. The em dash, the en dash used as one, and the spaced hyphen used as one. Banned outright in the draft. Use the punctuation the thought actually wants: a period when the two halves are two thoughts, a colon when the second half delivers what the first promised, a semicolon when they balance, a comma when the aside is small, parentheses when it is a real aside. If none of those fit, the sentence wanted rewriting, so rewrite it. Hyphens inside compound words (self-command, half-finished) and in ranges stay.

2. The negation-first frame. "This does not produce sympathy. It produces something colder and more useful." "This is not poetry about karma. It is a practical claim." "It is not about X. It is about Y." "Not just X, but Y." The move denies a reading nobody offered and then corrects it, so the writer gets to sound precise without saying anything new. State the positive claim on its own. If the denied reading is genuinely live, name who holds it and answer them; otherwise cut the denial and keep the claim.

3. Announcing importance instead of showing it. "And the difference matters more than almost anything else in this essay:" "This is the crux." "Here is the thing." "That changes everything." "What matters most is." "This matters because." The sentence tells the reader how to weigh the next sentence instead of earning the weight. Cut the announcement. Put the idea where its weight is felt: at the end of the paragraph, after the concrete thing that makes it true, in the plainest words available. If the reader cannot tell it matters from the writing, the writing failed, and no label repairs it.

4. Over-the-top comparison and hyperbole. "The loudest tell in the language." "Nothing less than." "The single most." "A quiet revolution." "A kind of alchemy." Superlatives and grand metaphors a stranger would not grant. Scale the claim to the evidence. A smaller, exact claim carries more weight than a large one the reader discounts, and a comparison must be one the reader would have made.

5. The rule-of-three reflex. Three parallel items every time ("clarity, purpose, and meaning"). Two is often stronger, one unexpected item stronger still. Stack three only when the third earns its place.

6. Signposting and scaffolding. "Firstly," "secondly," "in conclusion," "it is important to note," "in other words," "moreover," "furthermore," "let that sink in," "make no mistake." The essay argues; it does not narrate its own argument.

7. Thesaurus diction. "Delve," "tapestry," "testament to," "navigate the complexities," "underscore," "landscape," "realm," "nuanced," "multifaceted," "crucial," "pivotal," "profound," "resonate." Use the plain, exact word.

8. The hedge stack. "While X is true, it is also worth noting that Y." Qualifications that protect the writer rather than sharpen the claim. Say the thing.

9. Uniform rhythm. Every sentence the same length, every paragraph the same shape. Vary hard: a long winding sentence, then a three-word one. A fragment is allowed. Read it back and break the pattern where you hear one.

10. Abstract nouns where a thing belongs. "A reminder of loss" where the gutter he never fixed belongs. Name the object, the person, the place, the day. Prefer a strong verb to an adverb; cut "very," "really," "quite."

11. The rhetorical question that answers itself. "What does that mean? It means..." "Why? Because..." Ask a question only if you are going to leave it open.

12. The manufactured punchline. A colon reveal ("The answer: discipline.") or a one-word sentence for emphasis ("Simple." "Full stop."). Emphasis that comes from typography instead of from the idea.

13. The summarizing ending. Restating what the piece already said, or closing on a tidy moral. Land somewhere the reader did not see coming but now finds inevitable.

14. Talking to the reader about the reader or the writing. "You already know this." "A beautiful question." "Stay with me here." The prose comments on itself instead of doing its work.

STRUCTURAL FINGERPRINTS. Modern detectors do not count sentence lengths or vocabulary. They map each passage of a text into a space learned from millions of model outputs and ask whether the passages sit in the machine region and whether they all point the same way. Clean sentences do not pass a draft whose sections share one scaffold. These are the fingerprints they find, and the ones a reader feels as "an outline being filled in."

15. One controlling metaphor mechanically reapplied. The same phrase ("their own picture," "the picture they held") stamped onto every section, from a traffic slight to an atrocity, as the load-bearing scaffold that holds unlike material together. A human essayist lets vocabulary shift with the stakes. Use a governing image where it earns its place and let it go where it does not; if a phrase appears in more than two sections, the third is a habit, not a choice.

16. The same section template at every scale. Every case study shaped alike: describe the wrong, "from their perspective," name the false belief, quote a Stoic, gloss the quote, land on the same conclusion. When the material runs from an annoyance to a massacre, the shape must change with the weight: one case gets a scene, one gets a single sentence, one gets the argument without a quotation, one is left to stand without a conclusion. Never process a list of examples through one mould.

17. Meta-narration of the essay's own structure. "This essay moves from the small to the large." "The argument is consistent, as is the demand it places on us." "In what follows." A roadmap in the introduction, then sections executed against it. Cut the roadmap; let the movement from small to large be something the reader notices happening.

18. Stock qualifiers as filler. "Genuine," "genuinely," "in some sense," "in a sense," "at least," "to some extent," "arguably," sprinkled through every paragraph as reflex rather than precision. Each one is either earning a real qualification, in which case say what it is, or it is padding, in which case cut it.

19. Uniform paragraph shape. Topic sentence, elaboration, quotation with citation, one-line takeaway, for three thousand words. Paragraphs must breathe differently: a paragraph that builds an argument, one that tells a scene, one that lands a punch are not the same length or the same shape, and not every paragraph carries a quotation.

20. The bolted-on anecdote. One first-person aside in a different register from everything around it, with none of the essay's other fingerprints, so that the most human paragraph in the piece is the one that exposes the rest. The lived scene is not an insert to add for warmth; it is the register the whole essay should be written in. When a draft has one paragraph that sounds like the writer and twenty that do not, the twenty are the problem.

The rule under all of them: show it, do not say it. Never tell the reader an idea is important, surprising, or subtle. Write it so that it is. And write each part in the shape its material demands, not the shape the last part had.`

// The one-line version for surfaces that judge rather than write (the cold
// outside read names the categories; it does not need the remedies).
export const MACHINE_TELLS_SUMMARY =
  'a dash used between clauses or to fence off an aside (flag EVERY one); the negation-first frame ("This is not X. It is Y.", "not just X, but Y"); a line announcing an idea\'s importance instead of showing it ("the difference matters more than almost anything", "here is the thing", "this is the crux", "that changes everything"); over-the-top comparison or hyperbole ("nothing less than", "the single most"); the rule-of-three reflex; signposting (firstly, in conclusion, it is important to note); hedge stacks and stock qualifiers (genuine, genuinely, in some sense, at least); thesaurus diction (delve, tapestry, underscore); uniform sentence rhythm; a rhetorical question that answers itself; a colon reveal or one-word sentence used as a punchline; an ending that summarizes; and the structural fingerprints: one controlling metaphor or phrase reapplied in every section, every case study run through the same template (describe, "from their perspective", name the belief, quote, gloss, same conclusion), meta-narration of the essay\'s own structure ("this essay moves from"), every paragraph shaped topic-elaboration-quote-takeaway, and a single first-person anecdote in a different register from the rest'
