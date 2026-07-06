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
			variant: "outline" as const,
			label: "Action Required",
		},
		WAIT: {
			icon: Clock,
			variant: "secondary" as const,
			label: "Waiting",
		},
		WATCH: {
			icon: Eye,
			variant: "outline" as const,
			label: "Watching",
		},
	};

	const { icon: Icon, variant, label } = config[state];

	return (
		<Badge
			variant={variant}
			aria-label={`${label} - ${owner}. Reason: ${reason}`}
			title={reason}
			className={cn("gap-1", className)}
		>
			<Icon className="size-3 shrink-0" aria-hidden="true" />
			{label}: {owner}
		</Badge>
	);
}
