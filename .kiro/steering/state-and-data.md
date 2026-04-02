# State and Data Patterns

## Zustand Usage

Use Zustand for shared view state, not as the default home for every piece of state.

### Preferred Pattern

- Multiple small stores
- One store per concern or feature slice
- Store files named `{feature}.store.ts`
- Custom selector hooks exported from the same module
- Actions named for user or system events rather than generic setters

Examples of appropriate shared state:

- selected work item
- active filters
- search query
- active visual encoding
- current graph scope
- details panel visibility or mode

Examples of state that should remain local:

- uncontrolled input state used in one component
- transient hover state
- purely presentational toggles that do not affect other consumers

## Colocation Rule

Place each store in the feature directory that owns the behavior. Do not create a top-level global store directory unless a store is truly application-wide and reused broadly.

## Data Model Layers

Task Garden should keep these layers distinct:

1. Authored plan input
2. Validated plan model
3. Derived graph analysis
4. UI presentation state

Do not blur those layers by attaching transient UI state to authored models or by letting presentation components become the place where graph analysis is computed.

## Validation Rule

All plan data loaded from YAML should be parsed and validated immediately. After validation:

- the validated model becomes the trusted source
- derived fields are computed from that model
- UI code consumes validated and derived data rather than raw YAML objects

## Future Service Boundary

V1 does not need a backend API, but if future versions introduce remote data or multiple loaders:

- use service interfaces
- use factory functions rather than classes
- keep implementation details behind service boundaries
- inject services through React context rather than importing concrete implementations directly in components

This keeps the UI insulated from transport details and preserves testability.
