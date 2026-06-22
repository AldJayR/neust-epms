import { TrendingUp } from "lucide-react";
import { cn } from "#/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
	label: string;
	value?: string | number;
	trend?: string;
	college?: string;
	contributors?: number;
	className?: string;
	variant?: "default" | "card";
}

export function MetricCard({
	label,
	value,
	trend,
	college,
	contributors,
	className,
	variant = "default",
}: MetricCardProps) {
	if (variant === "card") {
		return (
			<Card
				className={cn(
					"border-[#ebebeb] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] rounded-[12px]",
					className,
				)}
			>
				<CardHeader className="flex flex-row items-center justify-between gap-y-0 pb-2">
					<CardTitle className="text-sm font-normal text-[#666]">
						{label}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-4xl font-semibold text-[#11215a]">{value}</div>
				</CardContent>
			</Card>
		);
	}

	const isFacultyCustom = !!college;
	return (
		<div
			className={cn(
				"flex flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]",
				isFacultyCustom ? "h-[116px]" : "h-[104px]",
				className,
			)}
		>
			<p className="text-[14px] leading-4 text-[#666]">{label}</p>
			{isFacultyCustom ? (
				<div className="flex flex-col gap-1">
					<p className="text-[16px] font-medium leading-5 text-[#11215a] truncate">
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
						<p className="text-[14px] text-[#666]">
							+{contributors} Contributors
						</p>
					</div>
				</div>
			) : (
				<div className="flex items-end gap-4">
					<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
						{value}
					</p>
					{trend && (
						<div className="flex h-[22px] items-center gap-1 rounded-lg border border-[#e5e5e5] bg-white px-1.5 py-0.5 shadow-sm">
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
