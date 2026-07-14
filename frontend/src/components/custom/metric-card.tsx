import { TrendingUp } from "lucide-react";
import { cn } from "#/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricContributorAvatar {
	userId: string;
	name: string;
	avatarUrl: string | null;
}

interface MetricCardProps {
	label: string;
	value?: string | number;
	trend?: string;
	college?: string;
	contributors?: number;
	contributorAvatars?: MetricContributorAvatar[];
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
	contributorAvatars,
	className,
	variant = "default",
	isLoading = false,
}: MetricCardProps) {
	if (variant === "card") {
		return (
			<Card
				className={cn(
					"rounded-xl border-border bg-card shadow-[0_1px_2px_0_var(--shadow-card)]",
					className,
				)}
			>
				<CardHeader className="flex flex-row items-center justify-between gap-y-0 pb-3">
					<CardTitle className="text-sm font-normal text-muted-foreground">
						{label}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-10 w-24 rounded" />
					) : (
						<div className="text-3xl font-semibold leading-none text-heading">{value}</div>
					)}
				</CardContent>
			</Card>
		);
	}

	const isFacultyCustom = !!college;
	return (
		<div
			className={cn(
				"flex min-h-[104px] flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_0_var(--shadow-card)]",
				className,
			)}
		>
			<p className="text-sm leading-4 text-muted-foreground">{label}</p>
			{isLoading ? (
				isFacultyCustom ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-5 w-3/4 rounded" />
						<Skeleton className="h-4 w-28 rounded" />
					</div>
				) : (
					<div className="flex items-end gap-4">
						<Skeleton className="h-9 w-20 rounded" />
					</div>
				)
			) : isFacultyCustom ? (
				<div className="flex flex-col gap-1">
					<p className="truncate text-base font-medium leading-5 text-heading">
						{college}
					</p>
					<div className="flex items-center gap-2">
						{contributorAvatars && contributorAvatars.length > 0 && (
							<AvatarGroup
								size={28}
								max={4}
								role="img"
								aria-label={`${contributors ?? 0} contributors in ${college}`}
								renderOverflow={() => (
									<div className="inline-flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
										+{Math.max((contributors ?? 0) - 3, 1)}
									</div>
								)}
							>
								{contributorAvatars.map((contributor) => (
									<Avatar
										key={contributor.userId}
										className="border-2 border-card"
									>
										{contributor.avatarUrl && (
											<AvatarImage
												src={contributor.avatarUrl}
												alt={contributor.name}
											/>
										)}
										<AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
											{getInitials(contributor.name)}
										</AvatarFallback>
									</Avatar>
								))}
							</AvatarGroup>
						)}
						<p className="text-sm text-muted-foreground">
							{contributors ?? 0} contributors
						</p>
					</div>
				</div>
			) : (
				<div className="flex items-end gap-4">
					<p className="text-3xl font-semibold leading-none text-heading">
						{value}
					</p>
					{trend && (
						<div className="flex items-center gap-1 rounded-md border border-success/20 bg-success/10 px-1.5 py-1">
							<TrendingUp className="size-3 text-success" />
							<span className="text-xs font-medium text-success">
								{trend}
							</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function getInitials(name: string) {
	return (
		name
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0])
			.join("")
			.toUpperCase() || "?"
	);
}
