import React, { Suspense } from "react";

const ResponsiveContainer = React.lazy(() =>
	import("recharts").then((m) => ({ default: m.ResponsiveContainer })),
);
const BarChart = React.lazy(() =>
	import("recharts").then((m) => ({ default: m.BarChart })),
);
const CartesianGrid = React.lazy(() =>
	import("recharts").then((m) => ({ default: m.CartesianGrid })),
);
const XAxis = React.lazy(() =>
	import("recharts").then((m) => ({ default: m.XAxis })),
);
const YAxis = React.lazy(() =>
	import("recharts").then((m) => ({ default: m.YAxis })),
);
const Tooltip = React.lazy(() =>
	import("recharts").then((m) => ({ default: m.Tooltip })),
);
const Bar = React.lazy(() =>
	import("recharts").then((m) => ({ default: m.Bar })),
);

interface ProjectsChartProps {
	chartData: { label: string; value: number }[];
}

export default function ProjectsChart({ chartData }: ProjectsChartProps) {
	return (
		<Suspense
			fallback={
				<div className="h-full w-full bg-[#fcfcfc] animate-pulse rounded" />
			}
		>
			<ResponsiveContainer width="100%" height="100%" key="projects-chart">
				<BarChart
					data={chartData}
					margin={{ top: 0, right: 0, left: -30, bottom: 0 }}
				>
					<CartesianGrid vertical={false} stroke="#ebebeb" />
					<XAxis
						dataKey="label"
						axisLine={false}
						tickLine={false}
						tick={{ fill: "#737373", fontSize: 12 }}
						dy={10}
					/>
					<YAxis
						axisLine={false}
						tickLine={false}
						tick={{ fill: "#737373", fontSize: 12 }}
					/>
					<Tooltip
						cursor={{ fill: "transparent" }}
						contentStyle={{ borderRadius: "8px", border: "1px solid #ebebeb" }}
					/>
					<Bar
						dataKey="value"
						fill="var(--brand-primary)"
						radius={[4, 4, 0, 0]}
						barSize={50}
					/>
				</BarChart>
			</ResponsiveContainer>
		</Suspense>
	);
}
