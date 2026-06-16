import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ isActive }: { isActive: boolean }) {
	if (isActive) {
		return (
			<Badge
				variant="outline"
				className="h-[22px] gap-1 rounded-lg border-[#e5e5e5] px-2 font-medium text-[#737373] bg-white"
			>
				<CheckCircle2 className="size-3 text-[#10b981]" />
				Active
			</Badge>
		);
	}

	return (
		<Badge
			variant="outline"
			className="h-[22px] gap-1 rounded-lg border-[#e5e5e5] px-2 font-medium text-[#737373] bg-white"
		>
			<XCircle className="size-3 text-[#ef4444]" />
			Deactivated
		</Badge>
	);
}
