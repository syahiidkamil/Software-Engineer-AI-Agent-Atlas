# JavaScript/TypeScript Guidelines

Language-specific patterns for JavaScript and TypeScript projects.

## Module System

- Prefer named exports over default exports (clearer imports, better refactoring)
- Use ES modules (`import`/`export`) over CommonJS when possible

## Async Patterns

- Avoid nested callbacks deeper than 2 levels - use async/await
- Prefer `Promise.all()` for parallel operations
- Always handle promise rejections

## Documentation

- Use JSDoc for public API functions
- Include `@param`, `@returns`, and `@throws` annotations
- Add `@example` for complex functions

## Type Safety (TypeScript)

- Prefer `interface` over `type` for object shapes
- Use `unknown` over `any` when type is truly unknown
- Enable strict mode in tsconfig
