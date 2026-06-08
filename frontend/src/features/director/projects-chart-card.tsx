import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const ProjectsChart = React.lazy(() => import("./projects-chart"));

interface ProjectsChartCardProps {
	chartData: { label: string; value: number }[];
	campuses: { id: number; name: string }[];
	selectedCampus: string;
	onCampusChange: (campus: string) => void;
}

export default function ProjectsChartCard({
	chartData,
	campuses,
	selectedCampus,
	onCampusChange,
}: ProjectsChartCardProps) {
	return (
		<div className="h-[370px] overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<div className="flex h-[72px] items-start justify-between border-b border-white px-6 pt-4 pb-3">
				<div className="leading-tight">
					<p className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">
						Total Projects
					</p>
					<p className="text-[14px] leading-5 text-[#666]">per college</p>
				</div>
				<Select value={selectedCampus} onValueChange={onCampusChange} modal={false}>
					<SelectTrigger className="h-9 w-[200px] rounded-md border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#737373] shadow-[0px_1px_1px_rgba(0,0,0,0.1)]">
						<SelectValue placeholder="Select campus..." />
					</SelectTrigger>
					<SelectContent side="bottom" sideOffset={8} align="start" alignItemWithTrigger={false}>
						{campuses.map((campus) => (
							<SelectItem key={campus.id} value={campus.name}>
								{campus.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="h-[298px] px-6 pb-6 pt-10">
				<ClientOnly
					fallback={
						<div className="flex h-full items-center justify-center">
							<Loader2 className="size-8 animate-spin text-brand-primary/20" />
						</div>
					}
				>
					<React.Suspense
						fallback={
							<div className="flex h-full items-center justify-center">
								<Loader2 className="size-8 animate-spin text-brand-primary/20" />
							</div>
						}
					>
						<ProjectsChart chartData={chartData} />
					</React.Suspense>
				</ClientOnly>
			</div>
		</div>
	);
}
