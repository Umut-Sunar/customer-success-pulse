import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export interface ChartShellProps {
  /** Tailwind height class, e.g. h-64 — container must have definite height for Recharts */
  heightClass: string;
  /** When true, show EmptyState instead of chart */
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}

/**
 * Wraps Recharts ResponsiveContainer so charts render only after the container has
 * non-zero width/height (avoids width(-1)/height(-1) warnings in flex/hidden layouts).
 */
export function ChartShell({
  heightClass,
  empty,
  emptyTitle = 'No data',
  emptyDescription = 'Nothing to display in this chart yet.',
  children,
}: ChartShellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ w: cr.width, h: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = size.w > 0 && size.h > 0;

  if (empty) {
    return (
      <div className={`min-w-0 ${heightClass}`}>
        <div className="flex h-full min-h-[8rem] items-center justify-center overflow-hidden px-1">
          <EmptyState title={emptyTitle} description={emptyDescription} compact />
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`min-w-0 ${heightClass}`}>
      {ready ? (
        children
      ) : (
        <div className="flex h-full min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 text-sm text-slate-500">
          Preparing chart…
        </div>
      )}
    </div>
  );
}
