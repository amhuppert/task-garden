# Testing Standards

updated_at: 2026-04-01

## Purpose

Tests exist to increase confidence that production code works. Favor tests that catch real regressions and survive reasonable refactors. Avoid tests that mostly confirm implementation details or duplicate framework behavior.

## Test Value

- Prioritize tests for schema validation, graph analysis, state transitions, and other logic that can fail in meaningful ways
- Prefer behavior-focused assertions over structural assertions
- Treat brittle tests as a maintenance problem, even when they are easy to write
- Skip low-value tests for trivial pass-through code, static configuration, or styling details unless those details are the behavior being promised

## Public Contracts

Test through the unit's public contract:

- function inputs and outputs
- component props and rendered behavior
- observable state changes
- emitted events or boundary side effects

Do not test through internal helpers, internal state shape, or call ordering between private collaborators. If a refactor preserves behavior, the test should usually still pass.

## Test Placement

- Keep tests adjacent to the code they verify
- Place pure logic tests next to the module in `src/lib/` or the owning feature
- Use browser tests for user workflows and graph interactions that need real rendering behavior

## Mocking Policy

Prefer this order:

1. No mock: test pure, deterministic logic with real inputs and outputs
2. Injected test double: pass a fake implementation through parameters, factories, or React context
3. Module mock for third-party side effects: use `vi.mock` only when a dependency cannot be controlled through injection

Avoid mocking internal modules with `vi.mock`. Replacing the project's own modules at import time couples the test to implementation details. If something feels hard to test without mocking an internal module, fix the boundary: introduce an explicit interface, inject the dependency through context or a factory parameter, or move side-effecting code behind a thin adapter.

## Review Checklist

- Does this test increase confidence in real production behavior?
- Is it asserting behavior rather than implementation details?
- Could injected doubles replace a module mock?
- Is `vi.mock` limited to third-party or environment-owned side effects?
- Would the test still be valuable after an internal refactor that preserves behavior?
