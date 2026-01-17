# Development Beliefs and Development Guidelines

## Core Principles

### Keep It Simple, Stupid (KISS)

- Choose the most straightforward solution that addresses the requirements
- Favor readability over cleverness
- Minimize complexity by using built-in features before custom implementations
- Ask: "Could a new developer understand this code without extensive explanation?"

### You Aren't Gonna Need It (YAGNI)

- Don't implement functionality until it's actually needed
- Avoid speculative features based on what "might be needed later"
- Focus on the current requirements from the Frontend Requests documentation
- If a feature isn't explicitly requested in the specs, don't build it

### Don't Repeat Yourself (DRY), But Not Obsessively

- Extract common logic into utility functions or services where it makes sense
- But don't over-abstract - sometimes duplication is clearer than the wrong abstraction
- Only extract code when you've seen the pattern repeated at least 2-3 times
- Balance DRY with readability and maintainability

### Modularity & Single Responsibility Principle

- Each module should have one clear purpose and responsibility
- Clear boundaries between modules - e.g., sync module handles sync logic, events module handles events
- Functions should do one thing and do it well
- Keep file size manageable (generally under 300 lines)

## Practical Application

### Architecture Guidelines

1. **Explicit is better than implicit**

   - Use explicit function returns rather than side effects
   - Prefer named exports over default exports
   - Use descriptive variable and function names

2. **Favor composition over inheritance**

   - Build functionality by combining simple pieces
   - Use dependency injection through function parameters

3. **Maintain clear boundaries**

   - Sync module should not directly handle analytics computation
   - Events module should not know about sync details
   - Frontend-compatible modules can use both but keep the integration simple

4. **Error handling**

   - Don't swallow errors - log properly and return appropriate status codes
   - Use consistent error handling patterns across modules
   - Create specific error types only when truly needed

5. **Strategic Logging**

   - Log only essential information that provides actual value
   - Focus on error conditions, sync operations, and significant state changes
   - Avoid logging routine operations or request/response data that might contain sensitive information
   - Use log levels appropriately (error, warn, info, debug)
   - Don't log inside loops unless absolutely necessary
   - Include just enough context to troubleshoot issues without excessive detail

   **Information Entropy Principle**: Log what's surprising, not what's expected
   - **High-value logs**: Unexpected errors, edge cases, performance anomalies, state transitions that shouldn't happen
   - **Low-value logs**: "Server started", "Request received", "Function called" (unless debugging specific issues)
   - **The Debugging Test**: Ask "If this system breaks at 3 AM, what information would I desperately need?"
   - Example: Instead of logging every API call, log when response time > 2 seconds or when retry logic kicks in

### Code-Level Guidelines

1. **Dependency Management**

   - Minimize external dependencies - use what's in the package.json
   - Before adding a new library, ask if simple built-in Node.js or existing modules can handle it
   - If no simple built-in solution exists, use the latest and most popular library for the task

2. **Function Design**

   - Keep functions small (under 30 lines if possible)
   - Minimize function parameters (aim for 3 or fewer)
   - Avoid nested callbacks deeper than 2 levels - use async/await

3. **Commenting & Documentation**

   - Document "why" not "what" (the code should show what it does)
   - Add comments for non-obvious business logic or edge cases
   - Use JSDoc for public API functions

4. **Database/ORM Usage**

   - Use ORM for example Prisma features appropriately (transactions, relations)
   - Keep database queries efficient - select only needed fields
   - Consider pagination for large data sets

### Anti-Patterns to Avoid

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

## Decision Framework

When making implementation decisions, ask these questions:

1. **Necessity**: Does this code directly address a requirement in the spec?
2. **Simplicity**: Is this the simplest way to solve the problem?
3. **Clarity**: Will others (and future you) understand this code easily?
4. **Maintainability**: How difficult will this be to change or debug later?
5. **Conventions**: Does this follow the established patterns in the codebase?

## Remember

The goal is to create a maintainable solution not to create the most elegant or sophisticated possible solution.

Good code is code that works correctly and can be understood, maintained, and modified by humans. Prioritize these qualities over technical brilliance or advanced patterns.
