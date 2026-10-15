import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ icon: Icon, title, description, action }: { icon?: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
          <Icon aria-hidden className="size-6" />
        </span>
      )}
      <h3 className="font-display text-md font-semibold text-primary">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
