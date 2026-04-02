# Objective

This is the start of a new project. No code has been implemented yet.

## Purpose

The purpose of this project is to create a tool for project planning, with a focus on software development projects. It is not meant to be collaborative — it's a tool used by individual developers to think about how work can be broken up into work packages and the dependencies among them.

## Plan Spec

The tool should define a **plan spec** described by a Zod schema (using Zod v4). The spec will include:

- Information about the plan itself
- All work items required to implement the project
- Dependency relationships between work packages
- Various other fields for recording additional information about tasks

## Product

The tool is named **Task Garden**. Task Garden will feature a web app that renders an interactive graph visualization of the project plan. It should support:

- Basic graph analysis
- Configurable colorization options
- Search and filter
- Other features that make project plans easy to understand and reason about

## Tech Stack

- React application written in TypeScript
- Graph visualization using **React Flow**
- Choose a popular graph data structure library with good TypeScript support so we're not reinventing the wheel.
- Open to suggestions for other technologies to use.

## Additional Requirements

- The web server should automatically pick up changes to the plan spec and update the information displayed in the UI accordingly.
