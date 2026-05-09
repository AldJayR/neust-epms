import * as React from "react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";

const ProjectsChart = React.lazy(() => import("./projects-chart"));

interface ProjectsChartCardProps {
	chartData: { label: string; value: number }[];
}

export default function ProjectsChartCard({
	chartData,
}: ProjectsChartCardProps) {
	return (
		<div className="h-[370px] overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<div className="flex h-[72px] items-start justify-between border-b border-white px-6 pt-4 pb-3">
				<div className="leading-tight">
					<p className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">Total Projects</p>
					<p className="text-[14px] leading-5 text-[#666]">per college</p>
				</div>
				<button
					type="button"
					className="flex h-9 w-[200px] items-center justify-between rounded-md border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#737373] shadow-[0px_1px_1px_rgba(0,0,0,0.1)]"
				>
					<span>Select campus…</span>
					<ChevronsUpDown className="size-4 opacity-50" />
				</button>
			</div>
			<div className="h-[298px] px-6 pb-6 pt-10">
				<ClientOnly
					fallback={
						<div className="flex h-full items-center justify-center">
							<Loader2 className="size-8 animate-spin text-[#14369c]/20" />
						</div>
					}
				>
					<React.Suspense
						fallback={
							<div className="flex h-full items-center justify-center">
								<Loader2 className="size-8 animate-spin text-[#14369c]/20" />
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
