import { TrendingUp } from "lucide-react";
import { cn } from "#/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
	label: string;
	value?: string | number;
	trend?: string;
	college?: string;
	contributors?: number;
	className?: string;
	variant?: "default" | "card";
	isLoading?: boolean;
}

export function MetricCard({
	label,
	value,
	trend,
	college,
	contributors,
	className,
	variant = "default",
	isLoading = false,
}: MetricCardProps) {
	if (variant === "card") {
		return (
			<Card
				className={cn(
					"border-border shadow-[0px_1px_3px_0px_var(--shadow-card)] rounded-[12px]",
					className,
				)}
			>
				<CardHeader className="flex flex-row items-center justify-between gap-y-0 pb-2">
					<CardTitle className="text-sm font-normal text-muted-foreground">
						{label}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-10 w-24 rounded" />
					) : (
						<div className="text-4xl font-semibold text-heading">{value}</div>
					)}
				</CardContent>
			</Card>
		);
	}

	const isFacultyCustom = !!college;
	return (
		<div
			className={cn(
				"flex flex-col gap-4 overflow-hidden rounded-[12px] border border-border bg-background p-4 shadow-[0px_1px_3px_0px_var(--shadow-card)]",
				isFacultyCustom ? "h-[116px]" : "h-[104px]",
				className,
			)}
		>
			<p className="text-[14px] leading-4 text-muted-foreground">{label}</p>
			{isLoading ? (
				isFacultyCustom ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-5 w-3/4 rounded" />
						<div className="flex items-center gap-2">
							<div className="flex -space-x-2">
								{[1, 2, 3].map((i) => (
									<Skeleton
										key={i}
										className="size-6 rounded-full border border-white bg-muted"
									/>
								))}
							</div>
							<Skeleton className="h-4 w-28 rounded" />
						</div>
					</div>
				) : (
					<div className="flex items-end gap-4">
						<Skeleton className="h-9 w-20 rounded" />
					</div>
				)
			) : isFacultyCustom ? (
				<div className="flex flex-col gap-1">
					<p className="text-[16px] font-medium leading-5 text-heading truncate">
						{college}
					</p>
					<div className="flex items-center gap-2">
						<div className="flex -space-x-2">
							{[1, 2, 3].map((i) => (
								<Avatar key={i} className="size-6 border-2 border-white">
									<AvatarFallback className="bg-[#ddd] text-[8px]" />
								</Avatar>
							))}
						</div>
						<p className="text-[14px] text-muted-foreground">
							+{contributors} Contributors
						</p>
					</div>
				</div>
			) : (
				<div className="flex items-end gap-4">
					<p className="text-[36px] font-semibold leading-9 text-heading">
						{value}
					</p>
					{trend && (
						<div className="flex h-[22px] items-center gap-1 rounded-lg border border-border bg-background px-1.5 py-0.5 shadow-sm">
							<TrendingUp className="size-3 text-[#22c55e]" />
							<span className="text-[12px] font-medium text-[#22c55e]">
								{trend}
							</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
