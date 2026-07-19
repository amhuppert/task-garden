import { Toast } from "../ui/Toast";
import { useEditStore, useLastWriteResult } from "./edit.store";

const AUTO_DISMISS_MS = 6000;

const NON_VALIDATION_CODES = new Set(["network", "write_failed", "unknown"]);

// Must render inside ui/ToastViewport (mounted once in PlanWorkspacePage).
export function ValidationToast() {
  const lastWriteResult = useLastWriteResult();

  if (
    lastWriteResult.phase !== "error" ||
    NON_VALIDATION_CODES.has(lastWriteResult.copy.code)
  ) {
    return null;
  }

  const { copy, key } = lastWriteResult;

  return (
    <Toast
      // Remount per error key so a new error restarts the auto-dismiss timer.
      key={key}
      open
      onOpenChange={(open) => {
        if (!open) useEditStore.getState().resetErrorFor(key);
      }}
      duration={AUTO_DISMISS_MS}
      title={copy.title}
      description={
        <>
          {copy.detail}
          <span className="mt-2 block font-mono text-[0.58rem] uppercase tracking-[0.18em]">
            {copy.code}
          </span>
        </>
      }
    />
  );
}
