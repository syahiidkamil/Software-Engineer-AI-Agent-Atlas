# Language modules

This folder holds language-specific extensions to `human-writing/SKILL.md`. The parent skill is the trigger and the source of universal writing philosophy; each file here covers what's specific to one language: AI-tells, orthographic rules, register spectrum, common anglicisms, sentence-structure conventions.

## How they're loaded

`SKILL.md` runs Step 0.1 (Detect Language) on every invocation. If the target language has a file here, the skill reads that file *in addition to* SKILL.md before writing. If no file exists, the universal principles in SKILL.md are applied to the target language with care for native conventions.

## Available languages

| Code | File | Language |
|---|---|---|
| `id` | [id.md](./id.md) | Bahasa Indonesia |
| `en` | (default — covered in SKILL.md) | English |

## Adding a new language

1. Create `{iso-code}.md` in this folder. Keep frontmatter out — these are reference documents, not skills.
2. Cover at minimum: AI-tells in this language (transition phrases, filler, sentence patterns), orthographic conventions, register spectrum, common anglicisms or loanword guidance, structural quirks (punctuation habits, voice preference, paragraph rhythm).
3. Reuse the section structure of `id.md` so language modules are visually consistent.
4. Add a row to the table above and to SKILL.md's Step 0.1 manifest.
5. Re-sync templates if this is upstream of `cli/templates/`.

The skill's trigger description in SKILL.md does **not** need to enumerate languages — language detection happens inside the skill, so a single description scales to N languages without polluting the skill list.
