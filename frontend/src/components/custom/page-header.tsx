import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

interface PageHeaderProps {
	title: ReactNode;
	actions?: ReactNode;
	className?: string;
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
	return (
		<div
			className={cn(
				"flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
				className,
			)}
		>
			<div className="min-w-0 flex-1">{title}</div>
			{actions && (
				<div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
					{actions}
				</div>
			)}
		</div>
	);
}
