# Core question bank

Pick from this list; never read it out. Each question has a probe for when the first answer is
too soft. Refine the bank as real projects show which questions earn their place.

## Problem and user

- **Who exactly has this problem? Name one real person or role.**
  Probe: "Picture them doing it. Where are they, what time is it, what's open on their screen?"
- **What do they do today instead?**
  Probe: "What does that cost them: time, money, embarrassment, risk?" A problem with no current
  workaround is often a problem nobody has.
- **How often does it happen?**
  Probe: "Daily, weekly, once a year?" Hair-on-fire beats nice-to-have; frequency decides
  whether a habit can form.

## Value

- **Why would they switch from what they do now?**
  Probe: "What would make them tell someone else about it?"
- **What is the one moment that must feel great, not just work?**
  Probe: "If the product only did that one thing well, would it still be worth it?"

## Risk and scope

- **What must be true for this to succeed? Which of those is least certain?**
  That one is the riskiest assumption; the first build should test it.
- **What is the smallest thing we can build to test that, this week?**
  Probe: "Could a clickable prototype test it before any backend exists?"
- **What are we deliberately not building?**
  Probe: "What will someone ask for in week two that we should already have said no to?"

## Success

- **What would we observe in one week if it worked? In one month?**
  Observable beats aspirational: "three of the five testers came back on day two", not
  "users love it".
- **What would make us stop or change direction?**

## Constraints

- **What can't change?** Existing data, tools people already use, compliance, budget, a date.
- **Who else has to say yes?** An approver, a team that maintains it, a customer contract.

## AI-specific

- **What can the model do reliably today, and where does it fail?**
  Probe: "Have you seen it fail on this? What did the failure look like?"
- **Is it worth building slightly ahead of what works now, for the next model?**
  Only when the product still holds up if the improvement arrives late.
- **What does a good output look like? Can we write five examples as an eval?**
  Include an input that should be refused or handed to a human.
- **What happens when it is wrong?** Who notices, how much does it cost, can the user fix it?
