import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface ProjectsChartProps {
	chartData: { label: string; value: number }[];
}

export default function ProjectsChart({ chartData }: ProjectsChartProps) {
	return (
		<ResponsiveContainer width="100%" height="100%" key="projects-chart">
			<BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
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
				<Bar dataKey="value" fill="#14369c" radius={[4, 4, 0, 0]} barSize={50} />
			</BarChart>
		</ResponsiveContainer>
	);
}
