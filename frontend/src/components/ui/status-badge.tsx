import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Loader2,
	Play,
	RotateCcw,
	XCircle,
} from "lucide-react";
import { type ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "#/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { getStatusDescription } from "@/lib/status-descriptions";

interface StatusConfig {
	label: string;
	icon: ComponentType<{ className?: string }>;
	iconClassName?: string;
	iconSpin?: boolean;
}

const STATUS_MAP: Record<string, StatusConfig> = {
	Approved: {
		label: "Approved",
		icon: CheckCircle2,
		iconClassName: "text-green-500",
	},
	"Pending Review": {
		label: "For Review",
		icon: Loader2,
		iconClassName: "text-amber-500",
		iconSpin: true,
	},
	Endorsed: {
		label: "For Review",
		icon: Loader2,
		iconClassName: "text-amber-500",
		iconSpin: true,
	},
	Returned: {
		label: "Needs Revision",
		icon: RotateCcw,
		iconClassName: "text-orange-500",
	},
	Ongoing: {
		label: "Ongoing",
		icon: Play,
		iconClassName: "text-blue-500 fill-blue-500",
	},
	Overdue: {
		label: "Overdue",
		icon: AlertTriangle,
		iconClassName: "text-red-500",
	},
	"Pending Closure": {
		label: "Pending Closure",
		icon: Clock,
		iconClassName: "text-amber-500",
	},
	Valid: {
		label: "Valid",
		icon: CheckCircle2,
		iconClassName: "text-green-500",
	},
	"Renewal Needed": {
		label: "Renewal Needed",
		icon: AlertCircle,
		iconClassName: "text-orange-500",
	},
	Expired: {
		label: "Expired",
		icon: XCircle,
		iconClassName: "text-red-500",
	},
	Terminated: {
		label: "Terminated",
		icon: XCircle,
		iconClassName: "text-red-500",
	},
	Active: {
		label: "Active",
		icon: CheckCircle2,
		iconClassName: "text-emerald-500",
	},
	Deactivated: {
		label: "Deactivated",
		icon: XCircle,
		iconClassName: "text-red-500",
	},
	Draft: {
		label: "Draft",
		icon: Clock,
		iconClassName: "text-muted-foreground",
	},
	Completed: {
		label: "Completed",
		icon: CheckCircle2,
		iconClassName: "text-green-500",
	},
	Rejected: {
		label: "Rejected",
		icon: XCircle,
		iconClassName: "text-red-500",
	},
	Closed: {
		label: "Closed",
		icon: XCircle,
		iconClassName: "text-muted-foreground",
	},
};

interface StatusBadgeProps {
	status: string;
	variant?: "default" | "outline";
	className?: string;
}

export function StatusBadge({
	status,
	variant = "default",
	className,
}: StatusBadgeProps) {
	const config = STATUS_MAP[status];
	const { label, explanation } = getStatusDescription(status);

	if (!config) {
		return (
			<Tooltip>
				<TooltipTrigger
					render={
						<Badge
							role="status"
							aria-label={`${status}. ${explanation}`}
							variant="outline"
							className={cn("text-muted-foreground", className)}
						>
							{status}
						</Badge>
					}
				/>
				<TooltipContent>
					<p>{explanation}</p>
				</TooltipContent>
			</Tooltip>
		);
	}

	const { icon: Icon, iconClassName, iconSpin } = config;

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Badge
						role="status"
						aria-label={`${label}. ${explanation}`}
						variant={variant}
						className={cn(
							"flex w-fit items-center gap-1 border-border px-2 py-0.5 text-xs font-medium text-muted-foreground bg-background",
							variant === "outline" && "h-[22px] rounded-lg px-1.5 py-0.5",
							className,
						)}
					>
						<Icon
							className={cn(
								"size-3",
								iconClassName,
								iconSpin && "animate-spin",
							)}
						/>
						{label}
					</Badge>
				}
			/>
			<TooltipContent>
				<p>{explanation}</p>
			</TooltipContent>
		</Tooltip>
	);
}

