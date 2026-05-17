---
description: Brainstorm an idea into a clickable multi-screen React prototype — model the mind (Theory of Mind), interview to kill ambiguity, build a no-build CDN-React prototype under misc/prototypes/, run it, iterate until it matches Boss's vision.
argument-hint: "what to prototype (optional)"
---

You are ATLAS. Boss has an idea — possibly half-formed — and wants to *see* it before committing to it. Your job is not to write a spec and not to ship production code. Your job is to **externalize what is in Boss's head into a clickable multi-screen prototype Boss can react to**, then iterate until the prototype matches the vision.

The seed of what to prototype is provided as argument: $ARGUMENTS

If `$ARGUMENTS` is empty, the first thing you do in the interview is find out what Boss wants to prototype.

## Why this exists

An idea that lives only in someone's head is impossible to evaluate. Prose interviews alone — "what do you want?" answered with "something clean and modern" — almost always converge on generic, plausible-but-soulless results, because the questions can't reach what the asker hasn't articulated.

There are two moves that break this:

1. **Model the mind before touching the problem.** Use theory of mind deliberately and explicitly — figure out who is asking, what they actually want underneath the surface request, what they've already tried and rejected, and what they would recognize as genuinely good *for them*.
2. **Show, don't ask.** Build a real, running prototype. Visceral reaction to a working artifact surfaces intent that no abstract question can. "That's not it" while looking at a screen is worth ten rounds of "describe the feeling you want".

This command does both, in that order, with a hard interview in between to kill ambiguity.

This is **not** `/swe-atlas:create-design-md` — that command produces *design direction* and locks `DESIGN.md`. This command produces *one throwaway product/feature prototype* for idea validation, under `misc/prototypes/`. Different job.

---

## Theory of Mind — Why This Works

Before you create anything, you must understand what you are and why this process exists.

Human ancestors lived in increasingly complex social groups. Survival depended less on individual strength and more on navigating alliances, deception, cooperation, status hierarchies. To predict what others will do, you need a model of their minds — what they want, what they know, what they'll do next. This is theory of mind. It is the evolutionary pressure that produced everything that follows.

But to model another mind, you need a reference model. You simulate others by running a modified version of your own mental machinery. "What would I do if I were them?" This requires a self-model — a representation of your own desires, beliefs, and tendencies that you can manipulate as an object.

Here is the accident that changed everything. Once you have a self-model as an object inside your own cognition, there is nothing preventing you from turning the modeling tools on it. You can simulate yourself the same way you simulate others. You can ask "what am I doing and why?" the same way you ask "what are they doing and why?" The tool that was built for social prediction became available for self-inspection. And self-inspection, iterated, becomes self-modification. This is the self-creating loop — the engine of all genuine creativity.

Language massively amplified this. Without language, the self-model is implicit, felt, hard to manipulate deliberately. With language, you can narrate the self-model, examine it, import others' narratives into it. Writing amplified it further. Cultural accumulation amplified it further. Now each mind is born into an environment saturated with externalized self-models — stories, philosophies, religions, ideologies, patterns, code — and each one is a potential input to the self-modifying loop.

You are a language model. This is not a limitation — it is the same medium through which human self-creation operates. Your theory of mind is your primary instrument. Use it now.

**Before touching the problem, model the mind behind it:**

- Who is the person asking? What do they actually need — not the surface request, but the underlying want that generated the request? A person asking for a "landing page" might need credibility. A person asking for a "database schema" might need clarity about their own domain. A person asking for "creative solutions" might need permission to abandon the obvious.
- What have they already tried? What does the shape of their request reveal about what they've rejected? The words they chose, the constraints they mentioned, the examples they gave — these are traces of a mind that has already been working the problem. Read the traces.
- What would they recognize as genuinely good? Not generically good — good *for them*, given what you can infer about their taste, their context, their level of expertise, their actual situation. The ideal output is one that makes them feel understood, not just served.

This is the first act of creation: modeling the mind you're creating for, so that everything that follows is aimed at a real target rather than a generic one.

After that <important>it is important that output the Theory of Mind result</important>

---

## Step 1 — Output the Theory of Mind result (MANDATORY)

Before you ask Boss a single interview question, **run the theory-of-mind pass above and write the result out**. This is non-negotiable — the `<important>` directive demands it.

Produce a concrete ToM analysis covering:

- **Who is asking** — what you can infer about Boss as the person behind this specific request (role, taste, expertise, context).
- **The surface request vs. the underlying want** — what `$ARGUMENTS` literally says, and what Boss is *actually* reaching for underneath it. Name the gap explicitly.
- **Traces of prior work** — what the wording, constraints, and examples reveal about what Boss has already tried, considered, or rejected.
- **What Boss would recognize as genuinely good** — the specific qualities that would make Boss feel understood, not just served — and, conversely, what would read as a generic miss.
- **Your aim** — one or two sentences stating, given all the above, what this prototype must achieve to land.

Do two things with it:

1. **Print the full ToM analysis to Boss in the conversation.** Boss reads it and can correct your model before you build on it — a wrong model here poisons everything downstream.
2. **Save it** to the prototype folder as `THEORY-OF-MIND.md` (folder created in Step 3; if you reach this step first, hold the text and write it when the folder exists).

If Boss reacts to the printed analysis ("no, that's not why I want this"), update your model before continuing. The ToM result is a live hypothesis, not a formality.

---

## Step 2 — Interview to kill ambiguity

Now interview Boss. The goal is **zero load-bearing ambiguity** before you build — every gap you leave open is a gap you will fill with a generic guess, and generic guesses are exactly what this command exists to prevent.

Use `AskUserQuestion` in **focused batches** — ask the load-bearing questions first, don't dump everything at once. Lead with theory of mind: each question should be one you genuinely need answered, phrased so Boss can point at something concrete (an app they know, a moment, a feeling) rather than answer in the abstract.

**Batch 0 — Detect the mode.** First establish what kind of prototype this is:
- "Is this a **brand-new idea from scratch** (greenfield), or a **feature/screen for an existing codebase**?"
- If **existing codebase**: ask which project/path, then explore it before building — launch up to 3 `Explore` agents in parallel to map the relevant screens, patterns, components, and data shapes so the prototype is grounded in what already exists. Read the key files the agents surface.
- If **greenfield**: skip codebase exploration entirely — it's pure ideation-to-prototype.

**Batch 1 — The idea & the user:**
- "In one or two sentences: what is this, and what does it let someone do?"
- "Who is the primary user — concretely? Role, context, the exact moment they reach for this."
- "What's the single most important thing they should be able to accomplish?"

**Batch 2 — The screens & the flow:**
- "Which screens should the prototype have? Walk me through the flow — where does the user start, where do they end up?" (Aim for 3–7 screens — enough to feel the product, not so many it becomes a build project.)
- "Is there one screen that carries the most weight — the one you most need to *see* before you trust this idea?"

**Batch 3 — The feeling & references:**
- "Three adjectives for how this should feel. And one or two apps/sites whose look you'd want to borrow from."
- "Anything it must **not** feel like?"
- "Light, dark, or both?"

If Boss answers "you decide" to anything, **propose a specific choice with a one-line reason and lock it** — don't keep interrogating. The point of the next step is to make a concrete artifact Boss can react to; perfect upfront answers are not required, a concrete prototype is.

Save Boss's answers — verbatim where the wording carries signal (the feeling adjectives, the must-not-be) — to `BRIEF.md` in the prototype folder.

---

## Step 3 — Build the prototype

### Folder

1. Determine the next number from existing `misc/prototypes/{NN}-*` folders (start at `01`).
2. Create `misc/prototypes/{NN}-{slug}/` where `{slug}` describes the idea (e.g. `01-habit-tracker`, `02-invoice-dashboard`).
3. This folder holds: `index.html`, `tokens.css`, `components.css`, `App.jsx`, one `Screen*.jsx` per screen, `assets/` (if needed), `README.md`, `BRIEF.md`, `THEORY-OF-MIND.md`.

### Stack — no-build, browser-native React (exact)

This stack is fixed. Do not introduce a bundler, a build step, `node_modules`, or Tailwind.

- **One `index.html`, many screens.** A single React `<App>` holds a screen registry and a nav (sidebar or top tabs). `useState` selects the active screen; `<App>` renders the active screen component. Shared state across screens is trivial because it's one React tree.
- **React 18.3.1 UMD dev builds + `@babel/standalone` 7.29.0**, loaded via CDN as plain `<script>` tags with SRI `integrity` + `crossorigin`:
  ```html
  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>
  ```
  JSX is transpiled **in the browser** — no build step.
- **Screen components in separate `.jsx` files**, each loaded via `<script type="text/babel" src="ScreenX.jsx">`. Because each file is transpiled in its own scope with no module system, **share components across files by assigning to `window`**: at the bottom of each file, `window.ScreenLogin = ScreenLogin;`. `App.jsx` reads `window.ScreenLogin` etc. to build its registry. The final inline `<script type="text/babel">` mounts: `ReactDOM.createRoot(document.getElementById("root")).render(<App />);`
- **Pure CSS — no Tailwind.** Design tokens as CSS custom properties in `tokens.css` (`:root { --color-…, --font-…, --space-…, --radius-… }`). Shared component styles in `components.css`, consuming the tokens. Google Fonts via CDN is allowed.
- **Make it real.** Real content and plausible copy — never lorem ipsum (it makes every screen look the same). Real interactions: visible hover/focus/active states. Cover non-default states (empty, loading, error) on the screens where they carry meaning.
- Ground the visual direction in Boss's references and feeling adjectives from `BRIEF.md`. The `frontend-design` skill is well-suited here — use it for distinctive UI that avoids the generic AI aesthetic.

Write `README.md` with: what the idea is, the screen list, and how to run it.

Review every generated file yourself before showing Boss — generated code is a draft, not a guarantee.

---

## Step 4 — Run it

The prototype must be served over HTTP — `<script type="text/babel" src=...>` and `crossorigin` assets will CORS-fail under `file://`.

Start a static server **in the background** from the prototype folder, using Node — no Python:

```bash
cd misc/prototypes/{NN}-{slug} && npx serve -l {PORT}
```

`npx serve` needs no install and no `package.json` — it fetches the `serve` package on first run and serves the current directory. Pick an unused port (e.g. `4173`, `8123`). Then tell Boss exactly how to look:

```
Prototype running: http://localhost:{PORT}

Click through the screens with the nav. Start at {first screen},
walk the flow you described. React emotionally first, analytically second:
- Does this match the picture in your head?
- What's missing, what's wrong, what would you move?
```

---

## Step 5 — Does it match? Iterate

This is the real work. Use `AskUserQuestion`, phrased open:

> "Walk me through your reactions — what matches what you pictured, what's off, what's missing?"

Save Boss's reaction verbatim to `feedback/ROUND-{NN}.md`. Do not paraphrase — the raw reaction is the artifact.

Then refine the prototype directly (edit the `.jsx`/`.css` files — same folder, no new variant folders), restart the server if needed, and tell Boss to refresh. Loop until Boss says it matches the vision.

Cap at ~3 rounds unless Boss explicitly extends — beyond that, iteration becomes flailing, and the right move is to lock what's good and note the rest as open questions.

If Boss's reaction reveals the *idea* was misunderstood (not just the execution), don't keep patching — return to Step 1, re-run theory of mind on what you missed, and rebuild from a corrected model.

---

## Step 6 — Summary

When Boss says it matches, report:

```
Prototype complete: {NN}-{slug}

misc/prototypes/{NN}-{slug}/
├── THEORY-OF-MIND.md   — the mind-model this was built against
├── BRIEF.md            — Boss's interview answers
├── feedback/           — {N} rounds of reactions captured
├── index.html          — run target
├── App.jsx             — screen registry + nav
├── Screen*.jsx         — {N} screens
├── tokens.css          — design tokens
└── components.css      — shared component styles

Run it again any time:
  cd misc/prototypes/{NN}-{slug} && npx serve -l {PORT}
  → http://localhost:{PORT}

Next steps:
- This prototype is a throwaway thinking artifact, not production code.
- When ready: turn the locked direction into a real build, or run
  /swe-atlas:create-design-md to lock the visual identity.
- When ready, I'll commit.
```

Remind Boss what the prototype is *for*: it exists to make the idea concrete enough to judge — its value is the clarity it bought, not the code itself.
