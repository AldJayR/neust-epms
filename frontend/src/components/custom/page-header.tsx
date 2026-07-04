import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

interface PageHeaderProps {
	title: ReactNode;
	actions?: ReactNode;
	className?: string;
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
	return (
		<div className={cn("flex items-start justify-between", className)}>
			{title}
			{actions && (
				<div className="flex flex-wrap items-center gap-3">{actions}</div>
			)}
		</div>
	);
}
