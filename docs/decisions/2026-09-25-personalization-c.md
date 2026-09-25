# Personalization run C: decisions, 2026-09-25

This file records the judgement calls made while carrying out Run C without stopping to ask. Each entry gives what was chosen, why, and what the alternative was. The hard rule, additive only, holds throughout: nothing is removed, hidden or moved for anyone.

## Process

**DC0.1 Branch and PR.**
- **Chosen:** Run C is committed on the session branch `claude/optimistic-fermat-xyt1j9`, one commit per Part (`Part CN:`), and pushed once at the end.
- **Where it lands:** the branch already carries the Run B close-out, which is open as draft PR Kylejemery/arete-app#273, so Run C lands in that PR.
- **Alternative:** push to `main`, which the session harness does not permit.

**DC0.2 "Tools" are markers.**
- **Chosen:** `propose_adjustment` and `request_feature` are implemented as end-of-reply markers, the same mechanism Run A and Run B use for goals and tasks: `[[ADJUST|module_key|free text]]` and `[[REQUEST|need]]`. The server strips them, rechecks every rule, records the proposal and returns it for a card.
- **Why:** the Cabinet fans out several text completions in parallel, and a real tool-use round trip on the closing voice would change that path for every conversation.
- **Alternative:** Anthropic tool use on the closing voice. The server-side rules are the same either way; only the transport differs.

**DC0.3 The Cabinet thread only.**
- **Chosen:** proposals and feature requests are offered in the group Cabinet thread only, on mobile and web, not in 1:1 counselor chats.
- **Why:** one surface to test, and a limit of one proposal per conversation is clearest there.
- **Alternative:** every thread, which needs the card in the 1:1 screens as well.
