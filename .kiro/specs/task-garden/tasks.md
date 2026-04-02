# Implementation Plan

- [ ] 1. Establish selected-plan startup and source boundaries
- [ ] 1.1 Build the app shell that boots one selected plan instance and separates loading, invalid, and ready presentation states
  - Start the application around one selected plan per running instance instead of in-app plan switching.
  - Keep the root shell ready to host graph, panels, validation feedback, and bundled document preview behavior.
  - Make missing or invalid startup selection fail through clear source-loading feedback rather than silent fallback behavior.
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 1.2 Register bundled plans and bundled Markdown documents for selected-plan loading and followable repo-relative references
  - Support different authored plans across runs without exposing arbitrary path access.
  - Expose enough source metadata to identify the selected plan in the UI.
  - Restrict repo-relative document access to the bundled document set used by the application.
  - _Requirements: 1.2, 2.2, 8.4_

- [ ] 1.3 Implement the reactive selected-plan source emission that reissues current source input whenever the selected YAML or schema changes during development
  - Make source emission the single trigger for plan reprocessing.
  - Carry source identity and schema identity together so YAML edits and schema edits follow the same refresh path.
  - Surface source-resolution failures through the same boundary used by the normal startup flow.
  - _Requirements: 11.1, 11.2, 11.4_

- [ ] 2. Validate authored plans and replace stale output safely
- [ ] 2.1 (P) Define the authored plan rules for plan metadata, lanes, work items, optional metadata, and reference targets
  - Accept plan-authored lanes rather than a fixed project-specific lane list.
  - Validate plan references and item links as either external URLs or allowlisted repo-relative document paths.
  - Preserve the YAML plan as the authoritative displayed source of planning information.
  - _Requirements: 2.2, 2.4, 5.4, 8.3, 8.4_

- [ ] 2.2 (P) Enforce plan-integrity rules for missing lanes, missing dependencies, duplicate identifiers, duplicate dependencies, self-dependencies, and cycles
  - Reject invalid dependency structure at the validation boundary instead of letting it leak into rendering.
  - Return actionable validation feedback tied to the current input.
  - Treat invalid current input as invalid even if a prior valid snapshot existed.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 2.3 Implement reference resolution so external URLs stay followable and repo-relative Markdown documents open through bundled previews
  - Resolve plan references and work-item links through one consistent rule set.
  - Show unresolved bundled documents as disabled references with explanatory feedback.
  - Keep reference behavior consistent between local development and production builds.
  - _Requirements: 2.2, 8.4_

- [ ] 2.4 Implement the processing pipeline that turns each source emission into either a ready snapshot or current validation feedback
  - Parse YAML, validate current input, and build ready state only from trusted data.
  - Replace prior ready output immediately when the current source becomes invalid.
  - Treat YAML changes and schema changes as equivalent reprocessing triggers.
  - _Requirements: 1.4, 2.4, 3.1, 3.5, 11.1, 11.2, 11.3, 11.4_

- [ ] 3. Derive graph structure and projection behavior
- [ ] 3.1 Build the canonical graph snapshot with lane order, dependents, roots, leaves, levels, and topological order
  - Derive structural graph data from validated input rather than authored helper fields.
  - Preserve enough lane information to support both one-lane and multi-lane plans cleanly.
  - Keep the snapshot reusable across graph rendering, details, and insights.
  - _Requirements: 4.2, 5.1, 5.2, 5.3, 9.1, 9.5_

- [ ] 3.2 Compute comparison metrics and longest dependency chain results for structural insight
  - Provide graph metrics suitable for color and size comparison modes.
  - Label path analysis as the longest dependency chain rather than schedule-accurate critical path behavior.
  - Preserve enough metric context to explain importance comparisons in the UI.
  - _Requirements: 9.3, 9.4, 9.5, 9.6, 10.3, 10.4, 10.5_

- [ ] 3.3 Implement graph projection outputs for renderable nodes, edges, legends, highlighted relationships, and cached layout positions
  - Keep renderable graph data separate from the canonical analysis snapshot.
  - Include edge highlight state for selected neighborhoods and active scopes.
  - Reuse cached positions for styling-only changes and invalidate layout when the visible topology changes.
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 7.1, 7.5, 10.1, 10.2, 10.6_

- [ ] 3.4 Define focus-versus-context behavior for search, filters, and scoped exploration
  - Apply search and structured filters conjunctively inside the active scope.
  - Preserve structural context through explicit focus and context visibility rules instead of letting the graph disappear abruptly.
  - Keep filtered-out selections visible as context and report hidden counts consistently.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4. Build shared exploration and display controls
- [ ] 4.1 (P) Implement shared exploration state for selection, scope, search, and structured filters
  - Keep graph, details, and insights synchronized around one current selection and one current scope.
  - Reset scope safely when selection is cleared.
  - Expose combined filter criteria rather than disconnected filter views.
  - _Requirements: 4.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.5_

- [ ] 4.2 (P) Implement shared display state for color modes, size modes, and insight presentation modes
  - Keep graph comparison settings consistent across graph and insight surfaces.
  - Make encoding changes explicit and reversible.
  - Preserve readable defaults when requested data is unavailable.
  - _Requirements: 9.2, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 4.3 Build the control rail for search, filters, scope changes, encoding changes, and visibility summaries
  - Expose lane, status, priority, and tag filters from current plan data.
  - Make active scope and active encoding understandable to the user.
  - Surface hidden-count and filtered-selection context when needed.
  - _Requirements: 2.3, 6.1, 6.3, 6.5, 7.5, 10.1, 10.5_

- [ ] 5. Build the main graph workspace surfaces
- [ ] 5.1 (P) Build the plan overview surface for title, summary, last-updated information, lanes, and plan references
  - Present the selected plan context before item inspection.
  - Show plan-defined lanes even when the plan only contains one lane.
  - Render followable references only after resolution succeeds.
  - _Requirements: 2.1, 2.2, 2.3, 5.3, 8.4_

- [ ] 5.2 (P) Build the read-only graph surface with lane-aware nodes, directed edges, viewport navigation, focus/context styling, and highlighted edges
  - Render work items clearly enough to identify them without consulting the source file.
  - Support graph navigation when the layout extends beyond the visible area.
  - Distinguish selection, lane grouping, and active comparison modes visually.
  - _Requirements: 4.1, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 10.1, 10.2, 10.4_

- [ ] 5.3 (P) Build the validation and empty-state surfaces for source failures, parse errors, invalid plans, and no-match results
  - Present current validation feedback instead of stale output.
  - Keep ready-only experiences unavailable while the current input is invalid.
  - Explain no-match conditions without confusing them with invalid input.
  - _Requirements: 1.4, 3.1, 3.5, 6.5, 10.6, 11.3_

- [ ] 6. Build details and insights surfaces
- [ ] 6.1 (P) Build the details surface for neutral and selected-item states
  - Show core fields, lane, status, priority, dependencies, dependents, and optional metadata.
  - Allow the user to follow resolved links and references from the selected item.
  - Keep the panel anchored to a context-only selection when filters hide the selected match.
  - _Requirements: 5.1, 7.1, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 6.2 (P) Build the insights surface for ordering, longest dependency chain, roots, leaves, important items, metrics, and encoding explanations
  - Present topological ordering in a readable form.
  - Explain the active scope and encoding in terms the user can act on.
  - Surface structural importance comparisons without overstating schedule accuracy.
  - _Requirements: 7.5, 9.2, 9.3, 9.4, 9.5, 9.6, 10.5, 10.6_

- [ ] 7. Integrate workspace behavior end to end
- [ ] 7.1 Compose the full workspace from source emission, processing states, overview, controls, graph, details, insights, validation feedback, and bundled document preview
  - Make loading, invalid, ready, and preview behaviors consistent inside one app shell.
  - Ensure current ready snapshots only come from the latest processed source emission.
  - Keep one selected plan visible per running instance.
  - _Requirements: 1.1, 1.3, 3.5, 11.1, 11.2, 11.3, 11.4_

- [ ] 7.2 Wire synchronized user behavior across graph, controls, details, and insights
  - Keep selection, scope, search, filters, hidden counts, and encoding changes aligned across surfaces.
  - Preserve structural context when narrowing the plan.
  - Ensure filtered-out selections remain understandable rather than disappearing silently.
  - _Requirements: 4.4, 6.1, 6.2, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.5_

- [ ] 7.3 Finalize styling and interaction polish for the Botanical Systems Atlas workspace
  - Apply the atlas visual system consistently across overview, controls, graph, and panels.
  - Make lane bands, surface hierarchy, and selection states legible on desktop and mobile.
  - Keep the interface analytical and restrained rather than dashboard-like.
  - _Requirements: 2.1, 4.2, 4.5, 5.1, 5.2, 10.2, 10.4_

- [ ] 8. Verify and harden core behaviors
- [ ] 8.1 (P) Add unit coverage for startup selection, source emission, schema validation, reference resolution, graph analysis, and projection semantics
  - Cover invalid current input replacement, focus/context rules, and highlighted relationship edges.
  - Cover longest dependency chain terminology and metric-driven encodings.
  - Keep boundary logic testable without depending on the UI.
  - _Requirements: 1.1, 1.4, 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 9.1, 9.3, 9.4, 9.5, 9.6, 10.2, 10.3, 10.6, 11.1, 11.2, 11.3, 11.4_

- [ ] 8.2 (P) Add integration and browser coverage for selected-plan boot, invalid replacement, graph exploration, reference following, and dev refresh
  - Cover one-plan startup behavior, lane visibility, search and filter interactions, and details or insights synchronization.
  - Cover repo-relative document previews and external links.
  - Cover YAML and schema edits refreshing the visible state through the source-emission boundary.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.5, 4.1, 4.3, 4.4, 5.1, 6.1, 6.5, 7.5, 8.1, 8.4, 9.2, 10.1, 10.4, 11.1, 11.2, 11.3, 11.4_
