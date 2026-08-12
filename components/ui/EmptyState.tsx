import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-border bg-card px-8 py-12 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      {description && <p className="max-w-[380px] text-[13px] leading-[1.6] text-ink/55">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-2 flex items-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
