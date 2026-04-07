export type SkeletonVariant = 'card' | 'table-row' | 'chart';

export interface SkeletonCardProps {
  variant: SkeletonVariant;
  className?: string;
}

export function SkeletonCard({ variant, className = '' }: SkeletonCardProps) {
  const base = 'animate-pulse bg-slate-200 rounded';

  if (variant === 'card') {
    return (
      <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
        <div className={`${base} h-4 w-24 mb-2`} />
        <div className={`${base} h-8 w-16 mb-2`} />
        <div className={`${base} h-3 w-full max-w-[140px]`} />
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <tr className="border-b border-slate-100">
        <td className="py-3 pr-4"><div className={`${base} h-4 w-32`} /></td>
        <td className="py-3 pr-4"><div className={`${base} h-4 w-12`} /></td>
        <td className="py-3 pr-4"><div className={`${base} h-4 w-16`} /></td>
        <td className="py-3 pr-4"><div className={`${base} h-4 w-24`} /></td>
        <td className="py-3"><div className={`${base} h-5 w-14 rounded-full`} /></td>
      </tr>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
        <div className={`${base} h-5 w-40 mb-4`} />
        <div className={`${base} h-64 w-full rounded`} />
      </div>
    );
  }

  return null;
}
