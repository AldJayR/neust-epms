import { AlertCircle, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "#/lib/utils";

interface DerivedStateBadgeProps {
	state: "ACT" | "WAIT" | "WATCH";
	owner: string;
	reason: string;
	className?: string;
}

export function DerivedStateBadge({
	state,
	owner,
	reason,
	className,
}: DerivedStateBadgeProps) {
	const config = {
		ACT: {
			icon: AlertCircle,
			color: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20",
			label: "Action Required",
		},
		WAIT: {
			icon: Clock,
			color: "bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20",
			label: "Waiting",
		},
		WATCH: {
			icon: Eye,
			color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
			label: "Watching",
		},
	};

	const { icon: Icon, color, label } = config[state];

	return (
		<Badge
			variant="outline"
			aria-label={`${label} - ${owner}. Reason: ${reason}`}
			title={reason}
			className={cn(
				"inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs transition-colors",
				color,
				className,
			)}
		>
			<Icon className="size-3.5 shrink-0" aria-hidden="true" />
			<span>
				{label}: <span className="font-medium">{owner}</span>
			</span>
		</Badge>
	);
}
