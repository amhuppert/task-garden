import { NewItemForm } from "task-garden";
import { samplePlan } from "../preview-fixtures";

// NewItemForm is the flagship "add a work item" modal: a floating, scroll-locked
// dialog over a blurred backdrop with ID/Title/Summary fields, a Lane/Status/Value
// row, prefilled dependency chips, and a CreateBar footer. The form portals to the
// document body and opens with empty required fields (the honest just-opened state),
// so the footer hint reads "Form has unresolved fields" with the primary CTA
// disabled until a slug/title are entered. Lanes come from the sample plan; the
// prefill seeds the lane and an upstream dependency. Callbacks are no-ops and
// patchPlan is stubbed so static capture never writes.

const noop = () => {};
const stubPatch = async () =>
  ({ ok: true, operationId: "preview-op", revision: 2 }) as const;

export function NewWorkItem() {
  return (
    <div style={{ width: 520, padding: 16 }}>
      <NewItemForm
        open
        onClose={noop}
        lanes={samplePlan.lanes}
        baseRevision={7}
        prefill={{ lane: "graph", dependsOn: ["flow-projection"] }}
        patchPlan={stubPatch}
      />
    </div>
  );
}
