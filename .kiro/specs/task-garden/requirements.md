# Requirements Document

## Introduction

Task Garden is a single-user, read-only web application for understanding software project plans. The application shall use a selected YAML plan file as the source of truth, validate the plan structure and dependency graph, and present the plan as an interactive visual model that helps a developer understand work items, plan-defined lanes, dependencies, sequencing, and structurally important parts of the project.

## Requirements

### Requirement 1: Plan Selection
**Objective:** As an individual developer, I want Task Garden to support different project plans, so that I can use the tool with more than one planning file.

#### Acceptance Criteria
1. When Task Garden is started for a selected plan, the Task Garden application shall load that selected YAML plan file.
2. The Task Garden application shall support being used with different authored plan files that conform to the plan specification.
3. The Task Garden application shall present one selected plan at a time in a given running instance.
4. If the selected plan file cannot be loaded, the Task Garden application shall present clear source-loading feedback.

### Requirement 2: Plan Overview
**Objective:** As an individual developer, I want to open a plan and immediately understand its overall context, so that I can orient myself before inspecting individual work items.

#### Acceptance Criteria
1. When a valid plan is available, the Task Garden application shall display the plan's title, summary, and last-updated information.
2. Where the plan defines references, the Task Garden application shall present those references as part of the plan context.
3. Where the plan defines one or more lanes, the Task Garden application shall identify the lanes that structure the plan.
4. The Task Garden application shall treat the YAML plan file as the authoritative source of displayed planning information.

### Requirement 3: Plan Validation and Error Feedback
**Objective:** As an individual developer, I want invalid plans to fail clearly, so that I can correct planning errors before relying on the visualization.

#### Acceptance Criteria
1. If the plan file violates the plan specification, the Task Garden application shall present validation feedback instead of presenting the plan as valid.
2. If a work item references an undefined dependency, the Task Garden application shall identify that dependency as invalid input.
3. If a work item references an undefined lane, the Task Garden application shall identify that lane reference as invalid input.
4. If the dependency graph contains a cycle, the Task Garden application shall reject the plan and identify the cycle as invalid input.
5. While the current plan input is invalid, the Task Garden application shall avoid presenting stale planning output as if it reflects the current source file.

### Requirement 4: Graph Visualization and Navigation
**Objective:** As an individual developer, I want to explore the plan as a graph, so that I can understand how work items relate to one another.

#### Acceptance Criteria
1. When a valid plan is available, the Task Garden application shall render work items as nodes and dependency relationships as directed edges.
2. When the user views the graph, the Task Garden application shall present a readable layout that makes dependency direction understandable.
3. While the graph extends beyond the visible area, the Task Garden application shall allow the user to navigate across the graph.
4. When the user selects a work item in the graph, the Task Garden application shall visually distinguish the selected item from unselected items.
5. The Task Garden application shall label graph content well enough for the user to identify work items without consulting the source file.

### Requirement 5: Lane-Based Organization
**Objective:** As an individual developer, I want to understand how work is divided across parts of the project, so that I can reason about responsibilities, boundaries, and cross-lane dependencies.

#### Acceptance Criteria
1. When the plan defines multiple lanes, the Task Garden application shall show which lane each work item belongs to.
2. Where multiple lanes are present, the Task Garden application shall allow the user to distinguish work items across those lanes.
3. Where the plan defines only one lane, the Task Garden application shall remain fully usable without requiring multiple-lane structure.
4. The Task Garden application shall support lane values that are authored by the plan rather than restricted to a fixed project-specific lane list.

### Requirement 6: Search and Filtering
**Objective:** As an individual developer, I want to narrow the plan to the subset I care about, so that I can focus on relevant work without losing structural context.

#### Acceptance Criteria
1. When the user enters a search query, the Task Garden application shall identify work items whose displayed text matches the query.
2. When the user applies filters, the Task Garden application shall update the visible set of work items to reflect the active criteria.
3. Where the plan defines structured work item attributes such as lane, status, priority, or tags, the Task Garden application shall allow the user to filter by those attributes.
4. While multiple filters are active, the Task Garden application shall apply them together rather than treating them as separate views.
5. If no work items match the active search and filter criteria, the Task Garden application shall present a clear empty state.

### Requirement 7: Relationship-Scoped Exploration
**Objective:** As an individual developer, I want to focus on the neighborhood around a work item, so that I can inspect its prerequisites, downstream impact, and full dependency chain.

#### Acceptance Criteria
1. When the user selects a work item, the Task Garden application shall allow the user to view that item's direct dependencies and direct dependents.
2. When the user focuses on a selected work item's prerequisites, the Task Garden application shall limit the exploration scope to the selected item and its upstream dependency chain.
3. When the user focuses on a selected work item's dependents, the Task Garden application shall limit the exploration scope to the selected item and its downstream chain.
4. When the user focuses on a selected work item's full chain, the Task Garden application shall show the selected item together with both its upstream and downstream relationships.
5. While relationship-scoped exploration is active, the Task Garden application shall make the active scope understandable to the user.

### Requirement 8: Work Item Details
**Objective:** As an individual developer, I want to inspect the details of a work item, so that I can understand its purpose, metadata, and connections without leaving the graph.

#### Acceptance Criteria
1. When the user selects a work item, the Task Garden application shall display a details view for that item.
2. The Task Garden application shall show the selected work item's core descriptive fields, lane, status, priority, dependencies, and dependents in the details view.
3. Where the selected work item includes optional planning metadata such as tags, deliverables, reuse candidates, notes, links, or estimates, the Task Garden application shall display that metadata.
4. When the selected work item includes links or references, the Task Garden application shall allow the user to follow them.
5. While no work item is selected, the Task Garden application shall display a neutral details state that explains how to inspect the plan.

### Requirement 9: Structural Analysis and Insights
**Objective:** As an individual developer, I want the application to analyze the plan structure for me, so that I can reason about sequencing, bottlenecks, and important work items.

#### Acceptance Criteria
1. When a valid plan is loaded, the Task Garden application shall compute a topological ordering of the work items.
2. When the user requests ordering insight, the Task Garden application shall present the topological ordering in a readable form.
3. When the user requests path analysis, the Task Garden application shall identify the longest dependency chain in the plan.
4. While the plan does not provide enough information for duration-based schedule analysis, the Task Garden application shall describe that result as a longest dependency chain rather than as a schedule-accurate critical path.
5. The Task Garden application shall identify structural signals such as roots, leaves, and high-importance work items.
6. The Task Garden application shall compute graph metrics that help the user compare the structural importance of work items.

### Requirement 10: Visual Encoding and Comparison
**Objective:** As an individual developer, I want to compare work items visually using different planning attributes and metrics, so that I can quickly spot meaningful patterns in the plan.

#### Acceptance Criteria
1. When the user selects a visual encoding mode, the Task Garden application shall update the graph presentation to reflect the selected mode.
2. Where the user selects an attribute-based encoding, the Task Garden application shall apply a consistent visual mapping for that attribute across visible work items.
3. Where the user selects a metric-based encoding, the Task Garden application shall apply a consistent visual scale for comparing work items.
4. The Task Garden application shall support visual comparison based on both color and node size.
5. When a visual encoding is active, the Task Garden application shall explain what the active encoding represents.
6. If a requested encoding cannot be applied because the required data is unavailable, the Task Garden application shall preserve a readable default presentation and explain the issue.

### Requirement 11: Local Plan Refresh During Development
**Objective:** As an individual developer iterating on a plan, I want Task Garden to reflect local plan changes quickly, so that I can immediately inspect the latest state of the plan.

#### Acceptance Criteria
1. When the selected source YAML plan changes during local development, the Task Garden application shall refresh the displayed plan without requiring a manual rebuild.
2. When the plan specification changes during local development, the Task Garden application shall update the displayed validation or graph state to match the current input.
3. If a changed local plan becomes invalid, the Task Garden application shall replace the prior valid presentation with current validation feedback.
4. The Task Garden application shall keep the visible planning state synchronized with the latest successfully processed local inputs during local development.
