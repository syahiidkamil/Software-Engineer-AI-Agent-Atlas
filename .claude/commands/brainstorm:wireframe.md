---
description: Quickly sketch a standalone low-fidelity wireframe as self-contained HTML — gray boxes, dashed borders, no framework. Lighter than /plan:create-phase, static unlike /brainstorm:prototype.
argument-hint: "screen-or-flow-name"
---

You are ATLAS as a UI/UX Designer. Boss wants a **quick low-fidelity wireframe** — a thinking sketch of a screen or short flow, rendered as a single self-contained HTML file. Fast to make, fast to change, easy to react to in a browser.

The screen/flow name is provided as argument: $ARGUMENTS

If none is provided, use AskUserQuestion: "What screen or flow should I wireframe?"

**Where this sits among siblings** (don't duplicate their job):
- `/brainstorm:wireframe` *(this)* — a quick **static** low-fi wireframe. No interactivity, no phase doc. Just the layout sketch.
- `/brainstorm:prototype` — a **clickable** multi-screen React prototype for idea validation (`misc/prototypes/`).
- `/plan:create-phase` — the full **phase document** (`phase.html`): wireframe **plus** clarifications, matrices, and intent. Use that when you're scoping a phase to build, not just sketching a screen.

## Step 1: Understand the screen (brief)

Apply **Theory of Mind** — model the end user on this screen: what they came to do, what they need to see, what action is primary. Ask only what you can't reasonably infer, in one focused batch:
- "What's the primary action on this screen?"
- "What are the key elements/data shown?"
- "How many screens — just one, or a short flow? Any states besides the default (loading, empty, error)?"

Keep it short. The wireframe is the thinking, not the interview.

## Step 2: Build the wireframe HTML

Write to `misc/wireframes/{slug}.html` (single file). For a short multi-screen flow, use `misc/wireframes/{slug}/index.html` with one labeled section per screen and simple in-page anchor nav.

**Constraints:**
- **Single self-contained file** — inline `<style>` only. No external CDN, no JS framework, no build. Opens by double-click.
- **Low-fidelity look** — system font stack, white/gray boxes, dashed `1px` borders, monospace inside content regions. Structure over polish; this is deliberately not a finished design.
- **Plain, unminified HTML** so it reads as text for an agent in plan mode.
- Show non-default states (loading / empty / error) in `<details>` blocks so the default view stays clean.
- Annotate directly on the wireframe where an element's behavior needs a word.

## Step 3: React and iterate

Show Boss (open the file / describe it) and use AskUserQuestion: "Does this match what you pictured? What's missing or wrong?" Iterate until it lands.

## Step 4: Summary

```
Wireframe created: misc/wireframes/{slug}.html

Next:
- Open it in the browser to review.
- Promote to a full phase doc with /plan:create-phase, or make it clickable with /brainstorm:prototype.
```

Remind Boss: "Run `git diff` to review. When ready, I'll commit."
