import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

interface DetailsRowProps {
	label: ReactNode;
	children: ReactNode;
	className?: string;
}

export function DetailsRow({ label, children, className }: DetailsRowProps) {
	return (
		<div className={cn("flex items-center justify-between px-6 py-3", className)}>
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium">{children}</span>
		</div>
	);
}
