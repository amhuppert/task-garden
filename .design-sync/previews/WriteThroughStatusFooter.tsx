import { WriteThroughStatusFooter } from "task-garden";

// WriteThroughStatusFooter reads the write-through status store and takes no
// props. Its default (idle) state is the steady "Synced" footer: a moss done-dot
// beside muted status copy, the resting line shown beneath the editing panels.

export function Synced() {
  return (
    <div style={{ width: 260 }} className="atlas-panel overflow-hidden">
      <WriteThroughStatusFooter />
    </div>
  );
}
