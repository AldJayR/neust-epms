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
				"rounded-xl border border-border bg-card shadow-[0_1px_2px_0_var(--shadow-card)]",
				!noOverflow && "overflow-hidden",
				className,
			)}
		>
			{children}
		</div>
	);
}
