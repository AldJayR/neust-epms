import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Loader2,
	Play,
	RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ProjectStatusBadge({ status }: { status: string }) {
	if (status === "Approved") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]"
			>
				<CheckCircle2 className="size-3 text-green-500" />
				Approved
			</Badge>
		);
	}
	if (status === "Pending Review" || status === "Endorsed") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]"
			>
				<Loader2 className="size-3 animate-spin" />
				For Review
			</Badge>
		);
	}
	if (status === "Returned") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]"
			>
				<RotateCcw className="size-3 text-orange-500" />
				Needs Revision
			</Badge>
		);
	}
	if (status === "Ongoing") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]"
			>
				<Play className="size-3 text-blue-500 fill-blue-500" />
				Ongoing
			</Badge>
		);
	}
	if (status === "Overdue") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]"
			>
				<AlertTriangle className="size-3 text-red-500" />
				Overdue
			</Badge>
		);
	}
	if (status === "Pending Closure") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]"
			>
				<Clock className="size-3 text-amber-500" />
				Pending Closure
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="text-[#737373]">
			{status}
		</Badge>
	);
}
