import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

interface PageCardProps {
  children: ReactNode;
  className?: string;
  /** Remove default overflow-hidden (e.g., for scrollable content) */
  noOverflow?: boolean;
}

export function PageCard({ children, className, noOverflow }: PageCardProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-border bg-background shadow-[0px_1px_3px_0px_var(--shadow-card)]",
        !noOverflow && "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
