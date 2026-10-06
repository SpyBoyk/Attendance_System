import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyTableRow({
  colSpan,
  icon,
  title,
  subtitle,
  action,
}: {
  colSpan: number;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt ring-1 ring-hairline">
            {icon ?? <Inbox className="h-5 w-5 text-ink-faint" />}
          </div>
          <p className="mt-3 text-sm font-medium text-ink">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-ink-faint">{subtitle}</p>}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-3 rounded-lg border border-hairline-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-alt"
            >
              {action.label}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
