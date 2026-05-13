# TaskGarden CLI Implementation Plan

## Overview

Convert Task Garden from a Vite-bundled static SPA into an installable CLI that boots a tiny local web server. Invoking `taskgarden /path/to/plan.yaml` reads the plan from disk, serves the pre-built SPA, watches the file for changes, and streams updates to the browser over SSE. Markdown references in the plan resolve relative to the plan file's parent directory and are served on demand by the same server. Existing compile-time mechanisms (`VITE_PLAN_KEY`, `import.meta.glob` for plans/docs, HMR-driven plan refresh) are removed entirely. Dev workflow follows the same path: `bun run dev` accepts a plan path and `--port` and defaults the plan path to `src/plans/task-garden-v1.yaml`.

## Distribution Decision

**Bun-only, local install. Not published to npm in v1.**

- The CLI uses `Bun.serve()` and `Bun.file()` directly; no Node-compat shim.
- `package.json` keeps `"private": true`. Distribution is via `bun link` from a checkout, or `bun install -g <path>` against the built tree. No `npm publish`, no `npx` support.
- README must document Bun as a hard prerequisite and show the install command.
- Rationale: Task Garden is a single-user developer tool; the developer audience already has Bun (it's the project's stated runtime). Avoiding the Node-compat code path keeps the CLI smaller (≈80 fewer lines) and keeps `Bun.file()`'s built-in async I/O and `Bun.serve()`'s native streaming. If a publish target ever becomes needed, switching to `node:http` + `node:fs/promises` is a contained refactor; we are not designing for it now.

## Invalid-Plan UX Decision

**Drop the "keep last valid plan + banner" behavior for validation errors. Reserve last-valid only for transient filesystem errors during atomic save.**

- The approved Kiro spec and existing e2e coverage (`e2e/invalid-plan.spec.ts`) assert that an invalid current plan does NOT render the graph canvas. Changing this is a requirements-level change and out of scope for the CLI migration.
- Validation errors (YAML parse failure, Zod failure, DAG check failure) render the existing full-canvas validation error UI, as today.
- The only "keep last valid" path is for filesystem-error events during atomic save (chokidar `unlink` followed quickly by `add`): if `sourceError` is set and `source` is briefly `null`, the UI shows a full-screen filesystem error panel. No last-valid retention.
- `ParseErrorBanner.tsx` is **not** added. `PlanWorkspacePage` does not gain a `lastValidProcessed` ref. The browser-side state model has the same observable behavior as today for invalid input.

## Architecture

Two processes, one runtime contract:

- **CLI server** (`cli/`, Bun runtime): HTTP server using `Bun.serve()`, file watcher via `chokidar`, in-memory plan state.
- **Browser SPA** (`src/`, unchanged build pipeline): Fetches the plan from `/api/plan`, subscribes to `/api/events` for updates, fetches Markdown docs via `/api/document?path=...`.
- **Dev orchestrator** (`scripts/dev.ts`): Boots Vite's dev server programmatically with a custom plugin (`vite-plugins/taskgarden-plan-server.ts`) that mounts the same routes as Connect middleware. UI HMR continues to work while plan-file watching is layered on top.

The route handlers are factored into runtime-agnostic functions that take a `Request` and return a `Response`. `Bun.serve()` (production CLI) calls into them directly. The Vite dev plugin uses a Connect adapter (lives under `vite-plugins/`, not `cli/`) to call the same handlers and to bridge the SSE response.

Wire format:

- Server treats the plan file as an opaque blob. It never parses YAML or runs Zod validation. Browser owns parse + validate + DAG analysis (existing `plan-processing-pipeline.ts`, after refactor).
- Server only reports filesystem-level errors (file missing, unreadable).

### SSE Bridging (Bun and Connect/Node paths)

The `/api/events` route is the only streaming route; both runtimes must handle it explicitly.

- **Bun.serve path**: route handler returns `Response` whose body is a `ReadableStream`. The stream's `start(controller)` subscribes to `planState`, writes the initial snapshot event, sets up a 25s keepalive timer, and on cancellation (`req.signal` fires) unsubscribes and clears the timer.
- **Connect/Node path** (Vite dev plugin): the adapter recognizes the SSE content type on the route's `Response` and switches into streaming mode via a helper:

  ```ts
  function bridgeSseResponse(res: ServerResponse, fetchRes: Response, abortController: AbortController): Promise<void>
  ```

  The helper writes status + headers immediately (`res.writeHead(200, headers); res.flushHeaders?.()`), pipes the `ReadableStream` chunk-by-chunk to `res.write` (awaiting on backpressure), and attaches `res.on('close', () => abortController.abort())` so the route's `req.signal` fires and the planState subscription is released. Non-SSE responses use the normal "buffer body then `res.end()`" path.

- Middleware ordering: the plugin registers via `configureServer(server) { return () => { ... }` so that `/api/*` middleware installs *before* Vite's internal middleware stack and the SSE response can flush headers without Vite intercepting.

### Local Security / Threat Model

- The server binds to `127.0.0.1`, not `0.0.0.0`. Loopback-only.
- The server validates the `Host` header of every request against `localhost[:port]` and `127.0.0.1[:port]`. Mismatches return 403. This blocks DNS-rebinding attacks where a remote site resolves a hostname to `127.0.0.1`.
- Without CORS headers, browser JS on other origins cannot read responses from `127.0.0.1:<port>`; the Host check is the load-bearing defense, not CORS. No `Access-Control-Allow-Origin` header is set.
- README states this is a single-user local tool and the server should not be exposed to other machines.

## Technology Stack

- **Runtime**: Bun (required). Shebang `#!/usr/bin/env bun` on the bin entry.
- **Server**: `Bun.serve()` (built-in).
- **File watcher**: `chokidar@^4.0.3`.
- **Browser opener**: `open@^10.1.0` (best-effort; failure is silent).
- **Arg parser**: `node:util.parseArgs` (built-in; no dep).
- **DOM test env**: `happy-dom` (devDep; chosen over jsdom for Bun compatibility).
- **React testing**: `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom` (devDeps).
- **Bun typings**: provided by `bun` runtime; verify whether a separate `bun-types` devDep is needed once `cli/tsconfig.json` exists. Add only if `tsc --noEmit --project cli/tsconfig.json` fails without it.
- **Frontend**: unchanged — React 19, Vite, Zod, YAML, Graphology, React Flow, Zustand, Tailwind.

## File Structure

```
/cli
  bin.ts                       # entry; shebang; calls main()
  main.ts                      # arg parsing, orchestration, signal handling, Host validation
  server.ts                    # Bun.serve() wiring; binds 127.0.0.1; calls routes.ts
  routes.ts                    # Request -> Response pure handlers (incl. SSE ReadableStream)
  plan-state.ts                # in-memory state + revision counter + subscribers
  file-watcher.ts              # chokidar wrapper; reads file on event; debounce; emits to plan-state
  document-resolver.ts         # cross-platform safe relative-path resolution within plan dir
  static-assets.ts             # serves built SPA; SPA-fallback to index.html; path.resolve(import.meta.dir, '..')
  tsconfig.json                # Bun-targeted TS config
  routes.test.ts
  document-resolver.test.ts
  plan-state.test.ts
  file-watcher.test.ts
  main.test.ts

/vite-plugins
  taskgarden-plan-server.ts    # Vite plugin: registers watcher + routes as middleware
  connect-adapter.ts           # Connect (req,res) <-> Fetch Request/Response, including SSE bridge
  connect-adapter.test.ts

/scripts
  dev.ts                       # boots vite.createServer() with plan path and --port

/src
  app/App.tsx                  # rewritten: no PlanRuntimeConfig; uses useTaskGardenPlanState
  lib/plan/
    result.ts                                   # NEW: Result<T,E> type extracted from plan-runtime-config
    plan-api-client.ts                          # fetch /api/plan, /api/document; EventSource subscribe
    plan-api-client.test.ts
    use-task-garden-plan-state.ts               # browser hook; replaces useSelectedPlanSource
    use-task-garden-plan-state.test.ts
    use-document.ts                             # browser hook; async doc fetch w/ loading/error states
    use-document.test.ts
    reference-resolver.ts                       # refactored: classifyReference; no bundled registry
    reference-resolver.test.ts                  # updated
    plan-processing-pipeline.ts                 # REFACTORED: depends on PlanStateSnapshot, not PlanSourceEmission/PlanKey
    plan-processing-pipeline.test.ts            # updated for new contract
    task-garden-plan.schema.ts                  # unchanged
    task-garden-plan.schema.test.ts             # unchanged
  features/plan-workspace/
    PlanWorkspacePage.tsx                       # prop shape: { source, revision, planFileName, sourceError }; NO last-valid retention
    document-preview/
      DocumentPreviewModal.tsx                  # NEW or rewritten: consumes useDocument; renders loading/error/loaded phases
      DocumentPreviewModal.test.tsx             # updated/new

/src/plans
  task-garden-v1.yaml          # kept as default sample
  invalid-plan-test.yaml       # kept as test fixture
  example-plan.test.ts         # NEW: validates the bundled sample via disk read

# DELETED:
#  src/lib/plan/plan-registry.ts                      (and .test.ts)
#  src/lib/plan/plan-runtime-config.ts                (and .test.ts) — Result<T,E> moves to result.ts
#  src/lib/plan/plan-source-subscription.ts           (and .test.ts)
#  src/plans/bundled-plans.schema.test.ts
#  e2e/missing-key.spec.ts                            (concept removed; replaced by CLI unit test)
```

Notes on layout:
- `cli/` is a bounded feature directory. Node-only adapter code lives in `vite-plugins/connect-adapter.ts`, not `cli/`, so the production CLI bundle does not carry Node-specific code.
- `plan-loader.ts` is folded into `file-watcher.ts` (the loader was a three-line `Bun.file().text()` wrapper with a try/catch).
- `static-assets.ts` is kept as a separate module so its tests (including the existence-check) stay isolated.
- The eight `cli/*.ts` files remain because each has a non-trivial public contract; we do not target a specific module count.

## CLI Specification

### Synopsis

```
taskgarden <plan-file> [--port <n>] [--no-open] [--help] [--version]
```

### Arguments

- **Positional `<plan-file>`** (required): Path to a plan YAML. Resolved with `path.resolve(process.cwd(), arg)`. No extension enforcement.
- **`--port <n>`**: TCP port. Default `4173`. Invalid input (non-numeric or out of range) → exit 2 with usage.
- **`--no-open`**: Skip auto-opening the browser.
- **`--help` / `-h`**: Print usage to stdout, exit 0.
- **`--version` / `-v`**: Print `package.json` version, exit 0.

### Startup Behavior

1. Parse args via `node:util.parseArgs`. On error, print usage to stderr, exit 2.
2. If no positional arg, print usage to stderr, exit 2.
3. Resolve plan path to absolute. If file does not exist or is unreadable: print `Plan file not found: <abs-path>` to stderr, exit 1.
4. Initialize `planState` by reading the file synchronously. Source is set to the file contents; `sourceError` is null.
5. Start chokidar watcher on the plan path with `awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 }` and `ignoreInitial: true`.
6. Start `Bun.serve({ hostname: '127.0.0.1', port })`. On `EADDRINUSE`: print `Port <n> is in use. Pass --port <other> to use a different port.` to stderr, exit 1.
7. Print `Task Garden running at http://localhost:<port>` and `Plan: <abs-path>` to stdout.
8. Unless `--no-open`: call `open('http://localhost:<port>')`. Ignore the returned promise's outcome.
9. Register SIGINT/SIGTERM handlers: close watcher, stop server, exit 0.

### Watcher Behavior

- chokidar `change` and `add` events → re-read file. On read success: update source, clear `sourceError`, increment revision, push `plan-state` SSE event. On read failure: keep last source, set `sourceError` to `{ message }`, increment revision, push event.
- chokidar `unlink` event → set source to `null`, `sourceError` to `{ message: "Plan file no longer exists at <path>" }`, increment revision, push event. Watcher continues; if file reappears, `add` re-hydrates state.
- Symlinks: chokidar default (follows symlinks). Document resolution uses `path.dirname(planPath)` (the symlink's parent), not the resolved target. README must document this behavior.

### Exit Codes

- `0`: clean exit (signal, --help, --version).
- `1`: startup runtime failure (missing file, port in use).
- `2`: invalid CLI usage (bad args).

## HTTP API Specification

All responses include `X-Content-Type-Options: nosniff`. All requests are gated on a `Host` header check (`localhost`/`127.0.0.1` only, on the configured port); mismatches return 403 `{ error: "host_not_allowed" }`.

### `GET /api/plan`

200 response, `Content-Type: application/json`:

```json
{
  "revision": 14,
  "source": "version: 1\nplan_id: ...",
  "sourceError": null,
  "planFileName": "task-garden-v1.yaml"
}
```

When the file is missing or unreadable:

```json
{
  "revision": 15,
  "source": null,
  "sourceError": { "message": "Plan file no longer exists at /abs/path" },
  "planFileName": "task-garden-v1.yaml"
}
```

Fields:
- `revision`: monotonically-increasing integer; starts at `1` on first successful initial load.
- `source`: raw YAML string, or `null` if a filesystem error occurred and the file has no readable content.
- `sourceError`: `null` or `{ message: string }`. Filesystem-level only; never YAML/Zod errors.
- `planFileName`: basename of the plan path (used by the SPA for display).

### `GET /api/events` (SSE)

`Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`.

Initial event on connect:

```
event: plan-state
data: {"revision":14,"source":"...","sourceError":null,"planFileName":"task-garden-v1.yaml"}

```

Subsequent updates emit the same `plan-state` event shape. Keepalive every 25 seconds: `:keepalive\n\n`.

No replay on reconnect; the browser re-fetches `/api/plan` after EventSource fires `open` post-`error`.

### `GET /api/document?path=<relative-path>`

200 response, `Content-Type: text/markdown; charset=utf-8`, body is the raw Markdown file contents.

- `path` query param is required.
- Path is rejected with 400 `{ error: "unsafe_path" }` if any of:
  - `path.isAbsolute(requestedPath)` returns true (cross-platform; rejects `/foo`, `C:\foo`, `\\server\share\foo`).
  - After `path.normalize(requestedPath)`, any segment equals `..`.
  - After `path.resolve(planDir, requestedPath)`, the result is not within `planDir` (boundary check via `path.relative(planDir, resolved)` — reject if the result starts with `..` or is itself absolute).
- File missing → 404 `{ error: "document_not_found" }`.
- Read failure → 500 `{ error: "document_read_failed" }`.

### Static Routes

- `GET /`: serve `<dist>/index.html`.
- `GET /assets/*`: serve files under `<dist>/assets/` with correct content type via `Bun.file()`.
- Any other path that does not match an API or asset route: serve `<dist>/index.html` (SPA fallback).

Here `<dist>` is the resolved SPA root (see `cli/static-assets.ts` below). In dev mode, the Vite plugin owns static serving and this code is unused.

## Component Specifications

### `cli/plan-state.ts`

In-memory store, single instance per process.

```ts
type PlanStateSnapshot = {
  revision: number;
  source: string | null;
  sourceError: { message: string } | null;
  planFileName: string;
};

interface PlanState {
  get(): PlanStateSnapshot;
  setSource(source: string): void;          // increments revision, clears error
  setError(message: string, keepLastSource: boolean): void; // increments revision
  setMissing(): void;                       // source = null, sets error
  subscribe(fn: (s: PlanStateSnapshot) => void): () => void;
}
```

`planFileName` is set at construction from `path.basename(planAbsPath)`.

### `cli/file-watcher.ts`

```ts
type WatcherFactory = (absPath: string) => Watcher;  // wraps chokidar.watch

function startPlanWatcher(
  absPath: string,
  planState: PlanState,
  deps?: { createWatcher?: WatcherFactory },
): { close: () => Promise<void> };
```

Internals:
- Default `createWatcher` calls `chokidar.watch(absPath, { awaitWriteFinish: {...}, ignoreInitial: true })`.
- Listens for `change`, `add`, `unlink`. On `change`/`add`: read file via `Bun.file(absPath).text()` (the former `plan-loader.ts` inlined here). On read success → `planState.setSource(...)`. On read failure → `planState.setError(message, true)`. On `unlink` → `planState.setMissing()`.
- Tests inject a fake `WatcherFactory` that exposes `emit('change')`/`emit('unlink')` and assert on the resulting `planState.get()` snapshot — i.e. observable behavior, not call ordering on `setSource`/`setError`.

### `cli/document-resolver.ts`

```ts
type DocResult =
  | { ok: true; content: string }
  | { ok: false; status: 400 | 404 | 500; code: "unsafe_path" | "document_not_found" | "document_read_failed" };

function resolveDocument(planDir: string, requestedPath: string): Promise<DocResult>;
```

Safety (in order):
1. Reject if `path.isAbsolute(requestedPath)`.
2. Compute `path.normalize(requestedPath)`; split on `path.sep`; reject if any segment is exactly `..`.
3. `const resolved = path.resolve(planDir, requestedPath)`.
4. Reject if `path.relative(planDir, resolved)` starts with `..` or is absolute.
5. Read via `Bun.file(resolved).text()`. Map missing-file errors to 404, other read errors to 500.

### `cli/routes.ts`

```ts
type RouteCtx = {
  planState: PlanState;
  planDir: string;
  staticAssetsRoot: string;       // empty string when running under Vite dev plugin
  hostAllowList: ReadonlySet<string>;  // e.g. {"localhost:4173","127.0.0.1:4173"}
};

function handleRequest(req: Request, ctx: RouteCtx): Promise<Response>;
```

Dispatches by URL after the Host check:
- `/api/plan` → JSON snapshot.
- `/api/events` → returns a `Response` with a `ReadableStream` body. The stream's `start(controller)` subscribes to `planState`, writes the initial snapshot, then a `plan-state` event on each update. Keepalive every 25s. Cleanup on `req.signal.aborted`.
- `/api/document` → calls `resolveDocument` and maps to `Response` with `Content-Type: text/markdown; charset=utf-8`.
- Static routes via `cli/static-assets.ts` when `staticAssetsRoot` is non-empty.

### `cli/static-assets.ts`

```ts
function resolveStaticAssetsRoot(): string;  // path.resolve(import.meta.dir, '..')
function assertSpaBuilt(root: string): void; // throws if <root>/index.html missing (prod CLI only)
function handleStaticRequest(req: Request, root: string): Promise<Response>;
```

- `resolveStaticAssetsRoot()` returns `path.resolve(import.meta.dir, '..')`. With the bundled CLI at `<install>/dist/cli/bin.js`, `import.meta.dir` is `<install>/dist/cli/` and the resolved root is `<install>/dist/`. (The previous `../dist` was wrong: from `<install>/dist/cli/` it resolved to `<install>/dist/dist/`.)
- `assertSpaBuilt(root)` is called from `cli/main.ts` after arg parsing; if `<root>/index.html` is missing it exits 1 with `Built SPA not found at <root>. Did 'bun run build' succeed?`.
- In dev mode (Vite plugin), neither `assertSpaBuilt` nor `handleStaticRequest` is invoked.

### `vite-plugins/connect-adapter.ts`

```ts
function toFetchRequest(req: IncomingMessage, originHost: string): Request;
function writeFetchResponse(res: ServerResponse, fetchRes: Response): Promise<void>;
function bridgeSseResponse(res: ServerResponse, fetchRes: Response, abort: AbortController): Promise<void>;
```

`writeFetchResponse` dispatches to `bridgeSseResponse` when `fetchRes.headers.get('content-type')` starts with `text/event-stream`. The bridge:
1. Calls `res.writeHead(200, headersFromFetchResponse)`, `res.flushHeaders?.()`.
2. Reads `fetchRes.body!.getReader()` in a loop, `await res.write(chunk)` honoring backpressure (`'drain'` event when `write` returns false).
3. Attaches `res.on('close', () => abort.abort())` so the route's `req.signal` fires and the subscription is released.

### `vite-plugins/taskgarden-plan-server.ts`

```ts
function taskGardenPlanServerPlugin(opts: { planAbsPath: string }): Plugin;
```

Hooks:
- `configResolved`: initialize `planState`, start watcher.
- `configureServer(server)`:
  - Register Connect middleware for `/api/plan`, `/api/events`, `/api/document` that delegates to `handleRequest` via `connect-adapter`.
  - Subscribe to dev-server shutdown: `server.httpServer?.on('close', stopAllResources)`.
  - Return a cleanup function that also calls `stopAllResources` (covers the post-middleware-install case).
- **Removed**: previous `closeBundle`/`buildEnd` hooks — those are build-phase, not dev-server-lifetime. Watcher teardown ties to the dev server's HTTP-server `close` event.

Vite continues to serve `index.html` and `src/` modules; the plugin only adds the `/api/*` namespace.

### `scripts/dev.ts`

```ts
// Parses `bun scripts/dev.ts [plan-path] [--port <n>]` via node:util.parseArgs.
// plan-path defaults to "src/plans/task-garden-v1.yaml".
// --port defaults to undefined (Vite chooses).
// Calls vite.createServer({ plugins: [taskGardenPlanServerPlugin({ planAbsPath })] })
// server.listen(port) then logs URL.
```

Invocation:
- `bun scripts/dev.ts` (default plan, default port)
- `bun scripts/dev.ts path/to/plan.yaml --port 5174`

### `src/lib/plan/result.ts` (NEW)

Extracted from the deleted `plan-runtime-config.ts`. Sole content:

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

Importers (`reference-resolver.ts`, `plan-processing-pipeline.ts` if it still uses `Result`) update their imports.

### `src/lib/plan/plan-processing-pipeline.ts` (REFACTORED)

Not unchanged. The current module imports `PlanKey` from `./plan-runtime-config` and `PlanSourceEmission` from `./plan-source-subscription`; both are deletion targets.

Changes:
- Remove imports of `PlanKey` and `PlanSourceEmission`.
- New input contract: `{ source: string; revision: number }` from `PlanStateSnapshot`. The pipeline keys its reprocessing on `revision` (not `refreshKey`).
- Remove HMR/subscription wiring; the hook around the pipeline (`usePlanProcessing`) is invoked from `PlanWorkspacePage` with the snapshot directly.
- Update `plan-processing-pipeline.test.ts` to pass `{ source, revision }` directly.

### `src/lib/plan/plan-api-client.ts`

```ts
type PlanStateSnapshot = {
  revision: number;
  source: string | null;
  sourceError: { message: string } | null;
  planFileName: string;
};

function fetchPlanState(): Promise<PlanStateSnapshot>;
function fetchDocument(path: string): Promise<
  | { ok: true; content: string }
  | { ok: false; status: number; code: "unsafe_path" | "document_not_found" | "document_read_failed" }
>;

type SubscribeDeps = { EventSourceCtor?: typeof EventSource };
function subscribePlanState(
  onEvent: (s: PlanStateSnapshot) => void,
  onReconnect: () => void,
  deps?: SubscribeDeps,
): () => void;
```

`subscribePlanState` opens `new (deps?.EventSourceCtor ?? EventSource)('/api/events')`. Tests inject a fake `EventSource` constructor and drive it via its own `emit('message', ...)` API; production passes nothing.

### `src/lib/plan/use-task-garden-plan-state.ts`

```ts
type HookValue =
  | { phase: "loading" }
  | { phase: "ready"; snapshot: PlanStateSnapshot };

function useTaskGardenPlanState(): HookValue;
```

On mount: `fetchPlanState()` → set ready, record `lastAppliedRevision`. Open subscription; on event, if `event.revision > lastAppliedRevision` update snapshot and bump the counter (this dedupes the initial SSE event whose revision matches the just-completed `/api/plan` fetch). On reconnect, re-fetch.

### `src/lib/plan/reference-resolver.ts` (refactored)

Removes the bundled-doc registry and the `import.meta.glob` call. New API:

```ts
type ReferenceTargetKind =
  | { kind: "external_url"; label: string; href: string }
  | { kind: "document_path"; label: string; documentPath: string };

type ReferenceClassification =
  | { ok: true; value: ReferenceTargetKind }
  | { ok: false; error: { type: "unsupported_target_format"; target: string; message: string } };

function classifyReference(target: string, label: string): ReferenceClassification;
```

Returns the *classification* only — document fetching happens inside the preview component via `useDocument`. External-URL behavior is unchanged. Repo-relative `.md` paths (regex unchanged) are classified as `document_path`.

### `src/lib/plan/use-document.ts`

```ts
type DocState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "loaded"; content: string }
  | { phase: "error"; code: "unsafe_path" | "document_not_found" | "document_read_failed"; status: number };

function useDocument(documentPath: string | null): DocState;
```

`useEffect`-driven fetch; aborts on path change/unmount via `AbortController`.

### `src/app/App.tsx` (rewritten)

- Remove `PlanRuntimeConfig`, `useSelectedPlanSource`, and the planKey prop.
- Render based on `useTaskGardenPlanState()`:
  - `phase === "loading"`: minimal centered loading panel.
  - `phase === "ready" && snapshot.source === null`: full-screen filesystem error panel with `sourceError.message`.
  - `phase === "ready" && snapshot.source !== null`: render `<PlanWorkspacePage source={snapshot.source} revision={snapshot.revision} planFileName={snapshot.planFileName} />`.

### `src/features/plan-workspace/PlanWorkspacePage.tsx`

Prop shape changes:

```ts
type Props = {
  source: string;       // raw YAML
  revision: number;     // triggers reprocessing
  planFileName: string;
};
```

Internally the existing pipeline call is keyed on `revision` (replaces the old `refreshKey`). The page renders the existing loading/invalid/ready states from `usePlanProcessing`. **No `lastValidProcessed` ref, no `ParseErrorBanner`.** Invalid input shows the existing validation error UI as today.

### Document-Preview Consumer Migration

The current code path passes `ResolvedReference.bundled_document.rawDocument: string` synchronously from `reference-resolver.ts` into the preview UI. After this change, document content is fetched asynchronously via `useDocument`.

Enumerated migration:

1. `src/features/plan-workspace/document-preview/DocumentPreviewModal.tsx` (or wherever the preview lives — likely under `features/plan-workspace/`): change props from receiving `rawDocument` to receiving `documentPath`. Internally call `useDocument(documentPath)` and render four states: idle (no doc selected), loading (spinner), loaded (existing renderer), error (per-code message).
2. Any reference-link component (e.g. `ReferenceChip`, `ReferenceLink`) that previously read `kind === "bundled_document"`: update to handle `kind === "document_path"` and pass `documentPath` to the preview modal on click.
3. Update each component's tests (`*.test.tsx`) to assert loading and error phases. Use the injected `fetchDocument` boundary or a happy-dom MSW-style fetch fake; do not `vi.mock` internal modules.

Search-and-replace audit: grep for `rawDocument` and `bundled_document` across `src/` to confirm no stragglers.

## Implementation Steps

1. **Install new deps**:
   - `bun add chokidar@^4 open@^10`
   - `bun add -d @testing-library/react @testing-library/dom @testing-library/jest-dom happy-dom`
   - Verify whether `bun-types` is needed once `cli/tsconfig.json` exists; add only if `tsc` fails without it.

2. **Create `src/lib/plan/result.ts`** with the `Result<T,E>` type extracted from `plan-runtime-config.ts`. Update `reference-resolver.ts` and any other importer to point at the new file.

3. **Refactor `plan-processing-pipeline.ts`** to remove imports of `PlanKey` and `PlanSourceEmission`. New input shape `{ source: string; revision: number }`. Update its tests.

4. **Delete `plan-runtime-config.ts`, `plan-source-subscription.ts`, `plan-registry.ts`** (and their `.test.ts` files), and `src/plans/bundled-plans.schema.test.ts`. Run `bun run typecheck` to confirm no dangling imports.

5. **Refactor `reference-resolver.ts`** to `classifyReference`. Remove the `import.meta.glob` registry. Update its tests.

6. **Add browser hooks and client**:
   1. `plan-api-client.ts` + tests (inject `fetch` via a thin wrapper or use happy-dom + `vi.fn()` on the global; inject `EventSource` constructor as documented).
   2. `use-task-garden-plan-state.ts` + tests (RTL, happy-dom env).
   3. `use-document.ts` + tests.

7. **Document-preview consumer migration**: itemize and execute the enumerated migration in the section above. Each component change is a separate commit.

8. **Update `App.tsx`** and **`PlanWorkspacePage.tsx`** for the new contract. Confirm e2e fixture loads.

9. **Create `cli/tsconfig.json`** with `module: ESNext`, `target: ES2022`, `moduleResolution: Bundler`, `types: ["bun"]` (or `["bun-types"]` if added), `strict: true`, `noEmit: true`. Extends root `tsconfig.json` but overrides `lib` to exclude DOM.

10. **Create CLI modules** in this order, each with red-green TDD:
   1. `cli/plan-state.ts` + tests (snapshots, subscriber notifications, revision increments).
   2. `cli/document-resolver.ts` + tests (safe path, unsafe path with `..`, POSIX absolute `/foo`, Windows absolute `C:\foo`, encoded traversal, missing file, outside-dir resolution).
   3. `cli/file-watcher.ts` + tests (inject fake `WatcherFactory`; assert resulting `planState.get()` snapshot for `change`/`add`/`unlink`).
   4. `cli/routes.ts` + tests (construct `Request` objects; assert response status/headers/body per route. For SSE, read the first event from the `ReadableStream`. For Host check, assert 403 on bad Host header).
   5. `cli/static-assets.ts` + tests (resolves `dist/`, throws when `index.html` missing, serves index/asset/fallback).
   6. `cli/server.ts` (wires `Bun.serve({ hostname: '127.0.0.1', ... })` to `handleRequest`).
   7. `cli/main.ts` + tests (arg parse including `--port` errors; missing-file exits 1; `assertSpaBuilt` failure exits 1; signal handlers close watcher and server).
   8. `cli/bin.ts` (shebang + `await main(process.argv.slice(2))`).

11. **Create `vite-plugins/connect-adapter.ts`** + tests. Tests cover: simple GET round-trip (Request shape correctness), JSON response writeback, SSE bridge (boot a small `http.createServer` in-test, route to `bridgeSseResponse`, write a chunk, read it from the HTTP client, close the client, assert the AbortController fired).

12. **Create `vite-plugins/taskgarden-plan-server.ts`** using `cli/routes.ts` + `cli/plan-state.ts` + `cli/file-watcher.ts` + the new connect-adapter. Plugin emits warnings to console on filesystem errors.

13. **Create `scripts/dev.ts`** that parses `[plan-path] [--port <n>]` and calls `vite.createServer()` with the plugin.

14. **Update steering docs**:
    - Rewrite `.kiro/steering/tech.md` to describe the CLI architecture, remove the `VITE_PLAN_KEY` reference, document the wire contract (`/api/plan`, `/api/events`, `/api/document`), and note the Bun-only runtime.
    - Add a one-line note in `.kiro/steering/structure.md` for the new `cli/` and `vite-plugins/` directories.

15. **Update `vite.config.ts`**: no changes (the plugin lives in `scripts/dev.ts`, programmatic). Keep `vite.config.ts` clean. Verify `test.environment` is set such that hook tests can opt into `happy-dom` (per-file pragma is fine if the default stays `node` for `cli/` tests).

16. **Update `package.json`**:
    - Keep `"private": true`.
    - `"bin": { "taskgarden": "./dist/cli/bin.js" }`
    - `"files": ["dist"]` (informational only while private)
    - Scripts:
      - `"dev": "bun scripts/dev.ts"`
      - `"build": "vite build && bun run build:cli"`
      - `"build:cli": "bun build cli/bin.ts --target=bun --outfile=dist/cli/bin.js --banner='#!/usr/bin/env bun'"`
      - `"start": "bun cli/bin.ts"`
      - `"typecheck": "tsc --noEmit && tsc --noEmit --project cli/tsconfig.json"` (covers both `src/` and `cli/`)
      - Keep `test`, `test:watch`, `test:e2e`, `test:e2e:ui`.
      - `"lint": "biome check ."` — confirm Biome includes `cli/` and `vite-plugins/` (no `files.ignore` exclusion). Adjust `biome.json` if needed.
    - Remove `.env` mention.

17. **Update `README.md`**:
    - Replace the `VITE_PLAN_KEY` / `.env` section with: `taskgarden path/to/plan.yaml` and `bun run dev src/plans/task-garden-v1.yaml --port 5173`.
    - Document `--port` and `--no-open`.
    - Update "Using Plans" section: plans are now any YAML file on disk; references resolve relative to the plan file's directory.
    - Add a "Symlinks" note: document resolution uses the *symlink's* directory, not the resolved target.
    - Add a "Local security" note: server binds to `127.0.0.1`, Host header is validated; the server is not safe to expose to other machines.
    - Add an "Install" note: Bun required; `bun link` for development, or `bun install -g <path>` from a checkout.

18. **Update `e2e/`** Playwright tests:
    - **`default`**: `bun run dev src/plans/task-garden-v1.yaml --port 5173` (valid plan).
    - **`invalid-plan`**: `bun run dev src/plans/invalid-plan-test.yaml --port 5174` (schema-invalid plan; existing assertions hold because we are NOT introducing last-valid-with-banner).
    - **`missing-key`**: **deleted**. Remove `e2e/missing-key.spec.ts` and the project from `playwright.config.ts`. Replace coverage with a `cli/main.test.ts` unit test that asserts `main(['./does-not-exist.yaml'])` exits 1 with the expected stderr message — the failure happens before any browser renders, so a browser test adds no information.

19. **Smoke test the bundled binary** (manual, after implementation):
    - `bun run build` → produces `dist/` with SPA + CLI bundle.
    - `bun dist/cli/bin.js src/plans/task-garden-v1.yaml --no-open` → server starts, prints URL, fetch `/api/plan` returns valid JSON. (Bun-only runtime; `node dist/cli/bin.js` is NOT a supported invocation.)
    - Curl `/api/events` → initial event + keepalives observed; edit YAML file → new event emitted.
    - `curl -H 'Host: evil.example.com' http://127.0.0.1:<port>/api/plan` → 403.
    - Open the URL in a browser → graph renders.
    - Edit YAML → graph re-renders.
    - Save invalid YAML → existing validation error UI appears (no banner).
    - Save valid YAML → returns to the rendered graph.
    - Reference `.md` in plan → preview loads via `/api/document` with loading state then content.

## Build & Distribution

- `bun run build` produces:
  - `dist/index.html`, `dist/assets/*` (Vite SPA build, unchanged).
  - `dist/cli/bin.js` (Bun-bundled CLI with shebang preserved via `--banner`).
- `package.json` is `"private": true`. Install is `bun link` from a checkout or `bun install -g <path>`. No `npm publish` in v1.
- Bun is a hard runtime requirement and is documented in README.

## Configuration

- No `.env` files. No `VITE_PLAN_KEY`. No `import.meta.env` usage in any plan-related code.
- All runtime configuration comes from CLI args.

## Edge Cases

- **File deleted while running**: `unlink` event → `source: null`, `sourceError: { message }`. App.tsx renders full-screen filesystem error. There is no last-valid retention; the file is genuinely gone and the user needs to know.
- **File temporarily missing during atomic save** (rename-replace pattern): `awaitWriteFinish` prevents firing until the replacement is stable. The brief unlink may not surface; the browser eventually receives a valid `plan-state` event with new source.
- **Multiple browser tabs**: each opens its own SSE connection; each gets the same events. Plan state in the CLI is single-source-of-truth.
- **Port already in use**: hard fail with clear stderr message. User passes `--port`.
- **Path traversal in `/api/document?path=...`**: 400 `unsafe_path`. Validated via cross-platform `path.isAbsolute`, segment-wise `..` check after `path.normalize`, plus post-resolve `path.relative` boundary check.
- **DNS rebinding**: every request's `Host` header is validated against `localhost`/`127.0.0.1` on the configured port; mismatches return 403.
- **Symlinked plan file**: chokidar follows the symlink; document resolution uses `dirname` of the original CLI arg (the symlink's location), not the resolved target. Documented in README.
- **Plan file is a directory or special file**: `Bun.file().text()` rejects; falls into `setError` path.
- **SSE connection lost** (proxy/network): EventSource auto-reconnects; on `open` after `error`, browser re-fetches `/api/plan`. The `lastAppliedRevision` dedupe in the hook prevents double-render when the initial SSE event matches the post-reconnect fetch.
- **Invalid CLI args** (missing path, bad `--port`, unknown flag): exit 2 with usage.
- **`bun run dev` with non-existent default file**: `scripts/dev.ts` errors at startup with the same message as the production CLI.
- **Invalid YAML at startup**: server pushes the raw bytes; browser pipeline fails on first revision; the workspace renders the existing validation error UI (no last-valid retention, no banner).

## Testing Requirements

- **`cli/*` unit tests**: vitest in node environment. Tests use injected factories (e.g., `WatcherFactory`, `EventSourceCtor`) rather than `vi.mock` of chokidar / EventSource / fetch. Assertions target observable state (planState snapshot, hook return value), not collaborator call ordering on `setSource`/`setError`/`setMissing`.
- **Route tests**: construct `Request` objects and call `handleRequest` directly; no real server boot. Cover Host header rejection.
- **SSE test (cli/routes.ts)**: read from the `ReadableStream` returned in the SSE `Response.body`; assert initial event, subsequent event after `planState.setSource()`, cleanup after `AbortController.abort()`.
- **SSE integration test (vite-plugins/connect-adapter.test.ts)**: boot a small `http.createServer`, mount the adapter routed at `/api/events`, open an `http` client, read the initial chunk, abort the client, assert the AbortController fired and the route subscription is released.
- **Browser hook tests**: vitest + `@testing-library/react` + `happy-dom`. Inject fake `EventSource` and `fetch`.
- **Component tests**: document-preview migration components include loading-state and error-state assertions.
- **E2E**: Playwright projects `default` and `invalid-plan` updated to new dev script. `missing-key` deleted and replaced by a CLI unit test in `cli/main.test.ts`.
- **Test coverage required**:
  - `plan-state` revision increments and subscriber fan-out.
  - `document-resolver` path-traversal rejection: at minimum POSIX absolute (`/etc/passwd`), Windows absolute (`C:\foo`, `\\server\share\foo`), `..` segment after normalize, encoded traversal (`%2e%2e/foo`), and a post-resolve boundary case (`./../../../outside.md`).
  - `routes` returns 400/404/500 with correct shapes; 403 on bad Host.
  - `file-watcher` translates injected-watcher events into the right `planState` snapshot transitions.
  - `use-task-garden-plan-state` re-renders on SSE event, dedupes on revision, refetches on reconnect.
  - `reference-resolver.classifyReference` for all three target shapes.
  - `static-assets` resolves `<install>/dist/` (not `<install>/dist/dist/`), `assertSpaBuilt` throws on missing index.html.
  - `main.ts` exits 1 on missing plan file, exits 2 on bad args, registers signal handlers.
  - `example-plan.test.ts` validates `task-garden-v1.yaml` against the Zod schema and DAG check via disk read.

## Removed Code Summary

| File | Reason |
|------|--------|
| `src/lib/plan/plan-registry.ts` + test | Compile-time bundled plan registry is gone. |
| `src/lib/plan/plan-runtime-config.ts` + test | `VITE_PLAN_KEY` env-based selection is removed. `Result<T,E>` moves to `result.ts`. |
| `src/lib/plan/plan-source-subscription.ts` + test | HMR-driven refresh replaced by SSE. |
| `src/plans/bundled-plans.schema.test.ts` | Bundle no longer exists; replaced by `example-plan.test.ts`. |
| `e2e/missing-key.spec.ts` | Concept ("unregistered plan key") removed; replaced by `cli/main.test.ts` unit coverage of missing-file startup failure. |
| Reference-resolver bundled-doc registry | Documents are fetched on demand via `/api/document`. |
| `PlanWorkspacePage` last-valid retention / `ParseErrorBanner` | NOT introduced. Existing invalid-plan UX preserved per approved requirements. |
