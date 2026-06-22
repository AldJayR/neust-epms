import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MoaStatusBadge({ status }: { status: string }) {
	if (status === "Valid") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373] shadow-sm"
			>
				<CheckCircle2 className="size-3 text-green-500" />
				Valid
			</Badge>
		);
	}
	if (status === "Renewal Needed") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373] shadow-sm"
			>
				<AlertCircle className="size-3 text-orange-500" />
				Renewal Needed
			</Badge>
		);
	}
	if (status === "Expired" || status === "Terminated") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373] shadow-sm"
			>
				<XCircle className="size-3 text-red-500" />
				{status}
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="text-[#737373]">
			{status}
		</Badge>
	);
}
