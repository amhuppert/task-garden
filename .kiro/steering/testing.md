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

Colocation matters here for the same reason it does elsewhere in the project: code and tests that change together should live together.

## Mocking Policy

Prefer this order:

1. No mock: test pure, deterministic logic with real inputs and outputs
2. Injected test double: pass a fake implementation through parameters, factories, or React context
3. Module mock for third-party side effects: use `vi.mock` only when a dependency cannot be controlled through injection

Avoid mocking internal modules with `vi.mock`. Replacing the project's own modules at import time is usually a design smell because it couples the test to implementation details instead of the unit's real contract.

If a component, hook, or service feels hard to test without mocking an internal module, fix the boundary instead:

- introduce an explicit interface
- inject the dependency through context or a factory parameter
- move side-effecting code behind a thin adapter

## Acceptable Uses of `vi.mock`

Use `vi.mock` sparingly for third-party or environment-owned boundaries such as:

- browser or runtime globals that the test environment does not provide naturally
- file system, process, or timer APIs
- network-bound libraries or framework singletons that cannot be injected cleanly

Even in those cases, prefer mocking a thin adapter owned by the boundary layer over scattering module mocks through feature tests.

## Problematic Mocking Patterns

Treat these as warning signs:

- mocking internal service, utility, or state modules
- tests that mostly assert a mocked return value was passed through unchanged
- tests that only verify call sequences on mocks without asserting a meaningful observable outcome
- tests that break whenever internals move around but user-visible behavior stays the same

A useful check is: if the production code were replaced with "return the mocked value directly," would the test still pass? If yes, the test is probably validating the mock setup more than the production behavior.

## Dependency Injection Pattern

When external data sources or services are introduced, align testing with the project's DI guidance:

- components and hooks depend on interfaces, not concrete implementations
- service implementations handle boundary concerns such as fetching and validation
- tests provide fake services through the same context or factory path used in production

Example shape:

```typescript
const mockPlanService: PlanService = {
  loadPlan: vi.fn().mockResolvedValue(testPlan),
};

render(
  <ServiceContext.Provider value={{ planService: mockPlanService }}>
    <PlanGraph />
  </ServiceContext.Provider>
);
```

This keeps tests close to production wiring without requiring internal module replacement.

## Review Checklist

- Does this test increase confidence in real production behavior?
- Is it asserting behavior rather than implementation details?
- Could injected doubles replace a module mock?
- Is `vi.mock` limited to third-party or environment-owned side effects?
- Would the test still be valuable after an internal refactor that preserves behavior?
