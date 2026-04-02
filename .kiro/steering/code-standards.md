# Code Standards

## Purpose

This file captures the project-wide coding expectations that should shape implementation decisions before the codebase grows.

## Control Flow

- Prefer early returns over deeply nested conditionals
- Keep branches shallow and easy to scan
- Let impossible states fail loudly instead of adding defensive noise for scenarios that should never happen

## Comments

- Comments are rare and must earn their keep
- Comment only when the code cannot express why something exists
- Good comment topics:
  - rationale for a non-obvious choice
  - domain constraints
  - edge cases or gotchas the reader cannot infer from code
- Do not add comments that narrate obvious code behavior
- Do not add comments describing refactors, improvements, or previous behavior

## Error Handling

- Handle errors at real system boundaries:
  - YAML loading
  - parsing
  - validation
  - user input
- Do not scatter speculative try/catch blocks through pure application logic
- Validation failures at boundaries are useful and should propagate clearly

## Simplicity Rules

- YAGNI applies by default
- Prefer small, understandable functions over broad abstractions
- Reduce duplication when it improves clarity and maintainability
- Do not introduce backward compatibility behavior unless it is explicitly requested

## TypeScript Rules

- Never use `any`
- Avoid `@ts-ignore` and `@ts-expect-error`
- Use `unknown` when data is genuinely unknown before validation
- Minimize `as` assertions
- Prefer optional chaining and nullish coalescing over loose fallback logic
- Prefer functions and object composition over classes

## Boundary Discipline

- Components should not parse YAML
- Components should not implement graph algorithms directly
- Validation belongs at data boundaries
- Derived graph data should be computed from validated input, not authored manually
