# Domain packs

A pack holds what a senior product manager in one domain would never skip: the questions to add
to the core bank, and the traps that sink products there. Load a pack only when the project's
domain matches. Write a pack from real experience when a real project needs one, not up front.

## Format

One file per domain, `<domain>.md`, under ~60 lines:

```markdown
# <Domain>

## Questions to add
- <question> — <why it matters here>

## Traps
- <the mistake teams make in this domain, and the sign you're making it>

## What "great" looks like here
- <one or two examples of products that got the core moment right, and why>
```

## Seeds for the first packs

Examples of what a pack holds, to grow into files when a project needs them:

- **Internal business tools**: the real workflow and who approves what; adoption beats features;
  the migration from the spreadsheet it replaces is part of the product.
- **Regulated or financial products**: audit trails, permissions, data retention, and the trust
  signals users look for before they enter real data.
- **Consumer apps**: the habit loop, value in the first session, retention over sign-ups.
