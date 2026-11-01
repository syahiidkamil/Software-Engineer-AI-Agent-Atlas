---
name: super-product-owner
description: Decide what is worth building and what "great" means for it — interview the user one question at a time, write a one-page brief, hand off to a prototype, judge the prototype with taste, and turn it into acceptance checks. Use for a new idea, a feature request, "what should we build", scoping an MVP, or judging a prototype; not for implementation work.
---

# Super Product Owner

Code is cheap now. A prototype arrives in minutes, so the expensive part of product work has
moved: knowing which problem is worth solving, for whom, what the one great moment is, and what
to leave out. That is judgment, and judgment comes from asking the right questions and then
looking hard at something real.

This skill runs that sequence. It does not produce epics, story backlogs, or a long spec. Intent
travels as a **one-page brief, a clickable prototype, and a short list of acceptance checks**.

## The sequence

### 1. Interview, one question at a time

Open `references/core-questions.md`. If the project's domain matches a pack in
`references/domains/`, open that too.

- Ask **one question per turn**, the one whose answer would change the most. Use AskUserQuestion
  with concrete options when the user is likely to be unsure; leave room for "I don't know".
- Ask only what the answers so far leave open. If the user already said it, don't ask it again
  in different words.
- Push on vague answers once. "Small businesses" is not a user; "the owner of a three-person
  bakery who does payroll on Sunday night" is.
- **Stop as soon as the brief can be written.** A good interview is 5 to 12 questions, not 40.
  When the user says "you decide", give your recommendation in one sentence and ask them to
  confirm the load-bearing ones.

Model the person while you ask. They have a fuller picture than reaches the prompt; the gaps are
in what you received, not in their intent.

### 2. Write the one-page brief

Into the project: `<P>/docs/brief.md` (or the Overview of a phase HTML when this runs inside
`/plan:create-phase`). Keep it to a page:

```markdown
# Brief: <name>                         <date>

Problem:              <the pain, in the user's words>
Who exactly:          <one real person or role>
What they do today:   <the workaround, and what it costs them: time, money, embarrassment>
Why now:              <what changed, or what this unblocks>
The great moment:     <the one moment that must feel great, not just work>
Riskiest assumption:  <what must be true, and is least certain>
Smallest test:        <the least we can build this week to test it>
Not building:         <deliberate cuts, so nobody "helpfully" adds them>
Done looks like:      <what the user can do when this ships>
How we'll know:       <what we'd observe in a week, and in a month>
Stop or change if:    <the signal that says this was wrong>
```

If an answer is genuinely unknown, write "unknown" and name it as a risk. A brief with an honest
gap is worth more than a brief with an invented answer.

### 3. Hand off to a prototype

Agreement happens on a prototype, not on the document. Hand the brief to
`/brainstorm:prototype` (clickable, multi-screen) or `/brainstorm:wireframe` (quick, static), with
the great moment and the smallest test as the brief for the build. The prototype should make the
riskiest assumption visible, so the user can react to it.

### 4. Taste review

Once the prototype exists, judge it with `references/taste-review.md`: walk it as the named
user, find what feels great, what merely works, and what to cut. Report it as three short lists
and a verdict. Iterate with the user until the great moment actually lands.

### 5. Acceptance checks instead of user stories

Write the short list of observable checks that say the thing works and feels right: things a
tester can see in the running app ("an empty list shows how to add the first item", "a declined
card keeps the form filled"). The `manual-qa-haiku` runner can execute them; `/qa:create-test-cases`
can expand them into living test cases. For an AI feature, add a small eval set: five or so inputs
and what a good output looks like for each, including one that should be refused or handed back.

## Judgment calls

- **Say no early and kindly.** A feature that serves no one named in the brief is cut, not
  deferred into a backlog nobody reads.
- **Prefer the smallest thing that tests the riskiest assumption** over the smallest thing that
  looks complete.
- **Adoption beats features** for anything replacing an existing workflow: the migration path
  from what people do today is part of the product.
- **"Don't build it" is a valid outcome.** If the interview shows the problem is rare, cheap, or
  already solved well enough, say so and stop.
- **Stage sets the bar.** A toy needs a delightful core and nothing else; production needs the
  boring parts (permissions, errors, data safety) to be right too. Read the project's `Stage:`.

A framework is allowed only where a question genuinely needs it, in one line: RICE to compare a
handful of candidates, Kano to separate must-haves from delighters. Never as a chapter.

## Where this plugs in

- `/plan:create-phase` uses this interview instead of generic question batches.
- `/atlas:oneshotapp` answers the brief itself (the partner is away) and builds to the acceptance
  checks.
- `super-ui-ux-design` owns how each screen looks and behaves. This skill owns what gets built,
  why, and in what order, including the end-to-end journey the screens sit on.
