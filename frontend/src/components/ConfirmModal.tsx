import { Button, type ButtonProps } from "@/components/ui/button";
import { CHAMFER } from "@/lib/shapes";

export function ConfirmModal({
  message,
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        role="alertdialog"
        className="w-full max-w-sm rounded-xl border border-hairline bg-surface p-4 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-ink">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" className={CHAMFER} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} size="sm" className={CHAMFER} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
