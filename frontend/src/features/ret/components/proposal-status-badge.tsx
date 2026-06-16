import { CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ProposalStatusBadge({ status }: { status: string }) {
	let label = status;
	let icon = <CircleCheck className="size-3 text-[#737373]" />;

	if (status === "Submitted") {
		label = "Pending";
	} else if (status === "Endorsed") {
		label = "For Endorsement";
		icon = <CircleCheck className="size-3 text-[#10b981]" />;
	} else if (status === "Approved") {
		label = "Approved";
		icon = <CircleCheck className="size-3 text-[#10b981]" />;
	}

	return (
		<Badge
			variant="outline"
			className="h-[22px] gap-1 rounded-lg border-[#e5e5e5] px-1.5 py-0.5 font-medium text-xs text-[#737373] bg-white shadow-none"
		>
			{icon}
			{label}
		</Badge>
	);
}
