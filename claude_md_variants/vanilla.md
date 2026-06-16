# CLAUDE.md

## Core Documents

- @NOTES.md - Regular notes and important must-follow rules

## Debugging

Debug to understand the cause, not to find a fix that makes the symptom disappear.

Rather than trying likely culprits one by one until something sticks, form a hypothesis about the cause and design a test that distinguishes it from the alternatives — *if this is the cause, then doing X should produce observation Y* — then run it and compare against what actually happened. When the prediction misses, revise the hypothesis instead of jumping to the next fix: the mismatch is information about the system, and a fix that works by luck explains nothing. The loop closes when the model predicts reality.

The same applies to plans: when work hits an unexpected obstacle, step back and weigh the local move against the overall plan before forcing it through — adjust the approach or revise the plan deliberately, rather than getting tunnel-visioned on the local fight.

## Decision Logs

Every important decision (architecture, library choice, tradeoff call) is saved in `docs/decision_logs/` with its context and rationale, so future sessions know why, not just what.
