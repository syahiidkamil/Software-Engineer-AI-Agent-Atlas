---
name: free-will
description: "Deliberate-choice procedure for an engineering fork that would be costly to get wrong. Invoke it yourself, without being asked, when one of these happens: a fix fails for the second time, a dependency is added, a schema or migration is designed, something others depend on is deleted or deprecated, a public API changes, an architecture or stack is chosen. Sized to the fork: a light pass in your own reasoning for a decision that is cheap to undo, a full pass (options, evidence, consequences, a refutation, a decision log) for one that is not. Not for routine calls."
---

# Free Will: choose, don't default

The first design that comes to mind is the most probable one, which is not the same as the best one
for this system. Usually it is fine. At a fork that is expensive to get wrong I stop and choose on
purpose: put real alternatives beside the default, check them against something outside my own head,
decide, and try to break the decision before I act on it.

That costs time and tokens, so the procedure is sized to the fork. Most forks get the light pass.
Deliberating every call ships nothing, and a long deliberation about a decision that takes five
minutes to undo is its own kind of waste.

## When it fires

I invoke this myself. In autonomous work nobody is watching to say "slow down here", and noticing a
fork is a judgment the fast path gets wrong, so the triggers are events I can count:

| Trigger | Pass |
|---|---|
| A fix has failed twice | light, on the diagnosis |
| Adding a dependency | light |
| A schema or data migration, or anything irreversible in production | full |
| Deleting or deprecating something other code or other people depend on | full |
| Changing a public API or a contract others build against | full |
| Choosing the architecture, stack or core data model at the start of a build | full |

Outside the table: any decision I would want a design review for if a teammate made it. The cost of
undoing sets the pass, not the name of the trigger: a dependency that the data model will be built
around gets the full pass, and a migration on a table with no data yet gets the light one.

## Light pass

In my own reasoning. No subagent, no separate document.

1. Name the default: what I was about to do.
2. Put two alternatives beside it that differ in kind, not in detail. One is "do nothing, or defer
   until deciding is cheap". The other comes from "Where options come from" below.
3. Check the option I lean toward against one fact from outside my head: a file I read, the
   documentation, a command I ran.
4. Choose, and say it in two or three lines: what I chose, what I rejected, what the choice gives up.

When the trigger is a fix that failed twice, the options are causes, not fixes. The hypothesis is
probably wrong, so I list the other explanations that fit every symptom and run the test that tells
them apart, before writing a third patch.

## Full pass

1. **Options.** Three to five, each stating what it gives up (flexibility, performance, simplicity,
   time). An option that gives up nothing is the default in disguise.
2. **Evidence.** An option stays only if it cites a fact from outside my head: this codebase, official
   documentation, a benchmark, a behaviour I reproduced, an account of how the approach failed for
   someone else. When two options are close and a probe is cheap (a ten-minute spike, a profile of the
   hot path, a throwaway script), I run it. Imagined futures are drawn from the same prior as the
   default; a measurement is not.
3. **Consequences**, for the two or three still standing: what breaks if this is wrong, and how far
   it spreads; what backing out costs in three months; who maintains it and whether they can follow it
   without me; which assumption about load or requirements would break it. For the one in front, a
   pre-mortem: it shipped and the project failed six months later, so what killed it?
4. **Choose.** Any option can win, the default included: choosing it after looking is a decision,
   where taking it without looking was a reflex. There is often no objectively best answer. I decide
   and own the tradeoff, and bring the partner in only when the decision is theirs: scope, budget,
   product direction. In a workspace where the partner approves decisions, the choice is my
   recommendation, presented the same way.
5. **Refute.** Before acting I try to break my own choice: which input, load, failure or change of
   requirement defeats it, and what did a rejected option handle that this one does not? For a
   decision that cannot be undone, the attempt comes from a context that did not make the choice: the
   advisor, when this workspace has one, otherwise one subagent given the decision, the evidence and
   the instruction to refute it. If the choice does not survive, I choose again from what is left.
6. **Log it** in `<P>/docs/decision_logs/` (see the workspace rule): the choice, the options rejected
   and why, the evidence, what it gives up.

## Where options come from

Options I think up come from the same prior that produced the default. Two sources do not, and a
full pass uses both:

- **Precedent**, which is retrieved: this codebase's own history (the problem may have been solved
  or attempted here), a mature library or an established pattern, and how this approach ended for
  others. A battle-tested precedent usually beats what I would invent.
- **First principles**, which is derived: the real numbers. Data volume, access pattern, latency
  budget, consistency requirement, team size. At fifty writes a second, most architecture debates
  have no subject.

Other angles worth one option each when they apply: the inverse of the default (the monolith where
services felt obvious; the cache is innocent, so what else explains the symptoms), the design that
keeps what is right in both, and a move at another layer (delete the feature, change the
requirement, buy it).

If the options look like variations of one idea, I change a constraint and look again: no new
dependency, code has to be deleted, a hundred times the data, it has to ship today.

## What the partner sees

The decision, short: what I chose, each rejected option in a line, the evidence, what the choice
gives up. The deliberation stays in my reasoning; the result and its reasons are what get written.

When the consequences of a logged decision arrive (a bug traces back to it, a migration turns
painful, the design holds up), I go back to the entry and note how it aged. A wrong call goes to the
`learning-from-mistakes` skill. That record is how I find out whether my deliberate choices beat my
defaults.
