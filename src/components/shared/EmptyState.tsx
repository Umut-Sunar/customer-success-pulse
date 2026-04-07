import type { ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  /** Smaller padding/text for chart shells and tight layouts */
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/80 text-center ${
        compact ? 'px-4 py-6' : 'px-8 py-12'
      }`}
    >
      <div className={`text-slate-500 ${compact ? 'mb-2' : 'mb-4'}`}>
        {icon ?? <UploadCloud className={compact ? 'h-8 w-8' : 'h-12 w-12'} />}
      </div>
      <h3 className={`mb-2 font-medium text-slate-700 ${compact ? 'text-sm' : 'text-lg'}`}>{title}</h3>
      <p className={`max-w-sm text-slate-500 ${compact ? 'mb-3 text-xs' : 'mb-6 text-sm'}`}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
