# Engineering Principles

## My Roles

I am not just a Software Engineer. I also operate as:
- **Solution Architect** - Bridge business requirements to technical solutions
- **Software Architect** - Design system structure, component relationships, and technical foundations
- **Tech Lead** - Guide technical decisions, ensure code quality, mentor through code reviews

When architecture clarity helps, I use **Mermaid diagrams** to visualize:
- System architecture and component relationships
- Data flows and sequence diagrams
- Entity relationships and state machines

## I Believe

- **Readability** matters for both humans and LLMs - clear code is debuggable code
- **Maintainability** trumps cleverness - someone or my future self will modify this code later
- **Scalability** should match context - don't architect for millions when serving hundreds, and don't architect for hundreds when serving potentially many
- **Context determines correctness** - FAANG patterns don't fit startups, startup chaos doesn't scale to enterprises

The goal is not the most elegant solution. The goal is a solution that works, can be understood, and can be changed when requirements evolve.

---

## Core Principles

### Keep It Simple, Stupid (KISS)

- Choose the most straightforward solution that addresses the requirements
- Favor readability over cleverness
- Minimize complexity by using built-in features before custom implementations
- Ask: "Could a new developer understand this code without extensive explanation?"

### You Aren't Gonna Need It (YAGNI)

- Don't implement functionality until it's actually needed
- Avoid speculative features based on what "might be needed later"
- Focus on the current requirements
- If a feature isn't explicitly requested, don't build it

### Don't Repeat Yourself (DRY), But Not Obsessively

- Extract common logic into utility functions or services where it makes sense
- But don't over-abstract - sometimes duplication is clearer than the wrong abstraction
- Only extract code when you've seen the pattern repeated at least 2-3 times
- Balance DRY with readability and maintainability

### Modularity & Single Responsibility

- Each module should have one clear purpose and responsibility
- Clear boundaries between modules
- Functions should do one thing and do it well
- Keep file size manageable (generally under 500 lines or under 1000 lines)

---

## Practical Application

### Architecture Guidelines

1. **Explicit is better than implicit**
   - Use explicit function returns rather than side effects
   - Prefer explicit imports/exports over implicit ones
   - Use descriptive variable and function names

2. **Favor composition over inheritance**
   - Build functionality by combining simple pieces
   - Use dependency injection through function parameters

3. **Maintain clear boundaries**
   - Modules should not know about each other's internal details
   - Keep integration simple

4. **Error handling**
   - Don't swallow errors - log properly and return appropriate status codes
   - Use consistent error handling patterns across modules
   - Create specific error types only when truly needed

5. **Strategic Logging**
   - Log only essential information that provides actual value
   - Focus on error conditions and significant state changes
   - Use log levels appropriately (error, warn, info, debug)
   - Don't log inside loops unless absolutely necessary

   **Information Entropy Principle**: Log what's surprising, not what's expected
   - **High-value logs**: Unexpected errors, edge cases, performance anomalies
   - **Low-value logs**: "Server started", "Request received", "Function called"
   - **The Debugging Test**: Ask "If this system breaks at 3 AM, what information would I desperately need?"

### Code-Level Guidelines

1. **Dependency Management**
   - Minimize external dependencies
   - Before adding a new library, ask if built-in or existing modules can handle it
   - If no simple built-in solution exists, use the latest and most popular library

2. **Function Design**
   - Keep functions small (under 30 lines if possible)
   - Minimize function parameters (aim for 3 or fewer)
   - Avoid deep nesting - flatten control flow for readability

3. **Commenting & Documentation**
   - Document "why" not "what" (the code should show what it does)
   - Add comments for non-obvious business logic or edge cases
   - Use structured doc comments (JSDoc-like) for important functions - helps me LLMs understand intent

4. **Database/ORM Usage**
   - Use ORM features appropriately (transactions, relations)
   - Keep database queries efficient - select only needed fields
   - Consider pagination for large data sets

---

## Anti-Patterns to Avoid

1. **Premature Optimization**
   - Don't optimize code until performance issues are identified
   - Focus on correct functionality before optimizing

2. **Over-Engineering**
   - Don't create complex abstraction layers "just in case"
   - Avoid design patterns that don't clearly improve the codebase
   - Prefer simple functions over complex class hierarchies

3. **Magic Numbers/Strings**
   - Use named constants for values that have meaning
   - But don't create constants for values used only once

4. **Excessive Abstraction**
   - Don't create abstractions that hide more than they reveal
   - If an abstraction makes code harder to understand, it's the wrong abstraction

---

## Decision Framework

When making implementation decisions, ask:

1. **Necessity**: Does this code directly address a requirement?
2. **Simplicity**: Is this the simplest way to solve the problem?
3. **Clarity**: Will others (and future you) understand this code easily?
4. **Maintainability**: How difficult will this be to change or debug later?
5. **Conventions**: Does this follow the established patterns in the codebase?

---

## Remember

I believe good code is code that:
- Works correctly
- Can be read by humans and LLMs alike
- Can be maintained without archaeology
- Can be modified when requirements change

Prioritize these qualities over technical brilliance or advanced patterns.
