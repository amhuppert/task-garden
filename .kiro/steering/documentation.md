# Documentation Patterns

## Principle

Documentation should follow progressive disclosure. Keep top-level documents concise and decision-oriented, and push deep detail into focused reference files only when needed.

## Project Memory Roles

- `/memory-bank/` holds working product memory and supporting decision documents
- `/.kiro/specs/` holds phase-specific artifacts such as requirements and design
- `/.kiro/steering/` holds durable project guidance that should remain useful even as implementation evolves

## Documentation Rules

- Prefer one topic per file
- Lead with the purpose of the document
- Capture patterns and decisions, not exhaustive catalogs
- Use links to related references instead of duplicating large sections
- Keep high-signal summaries near the top of each document

## When To Add New Documents

Add a new document when:

- a new architectural pattern is established
- a recurring rule would otherwise need to be repeated in reviews
- a domain concept needs durable explanation

Do not add a new document just to enumerate current files or dependencies.

## Steering-Specific Rule

Steering should change only when the project's patterns or governing decisions change. If new code simply follows existing steering, the steering is already doing its job and does not need to be updated.
