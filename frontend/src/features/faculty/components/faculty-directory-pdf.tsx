import { formatAcademicRank } from "@/lib/utils";
import type { FacultyInvolvement } from "@/types/user";

interface FacultyPdfRenderer {
	Document: React.ElementType;
	Page: React.ElementType;
	Text: React.ElementType;
	View: React.ElementType;
}

const facultyPdfStyles = {
	page: {
		padding: 30,
		fontFamily: "Helvetica",
		fontSize: 9,
		color: "#17202a",
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 9,
		color: "#566573",
		marginBottom: 16,
	},
	table: {
		width: "100%",
		borderWidth: 1,
		borderColor: "#d5d8dc",
	},
	row: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#d5d8dc",
	},
	headerRow: {
		flexDirection: "row",
		backgroundColor: "#eaeded",
		borderBottomWidth: 1,
		borderBottomColor: "#d5d8dc",
	},
	cell: {
		padding: 6,
		borderRightWidth: 1,
		borderRightColor: "#d5d8dc",
	},
	rank: { width: "7%" },
	name: { width: "21%" },
	academicRank: { width: "18%" },
	department: { width: "20%" },
	metric: { width: "11.33%", textAlign: "right" },
	header: { fontWeight: "bold" },
} as const;

const columns = [
	["Rank", "rank"],
	["Faculty Name", "name"],
	["Academic Rank", "academicRank"],
	["Department", "department"],
	["Lead Projects", "metric"],
	["Collaborator Projects", "metric"],
	["Total Involvement", "metric"],
] as const;

export function createFacultyDirectoryPdf({
	renderer,
	items,
	generatedOn,
}: {
	renderer: FacultyPdfRenderer;
	items: FacultyInvolvement[];
	generatedOn: string;
}) {
	const { Document, Page, Text, View } = renderer;

	return (
		<Document title="Faculty Directory Report">
			<Page size="A4" orientation="landscape" style={facultyPdfStyles.page}>
				<Text style={facultyPdfStyles.title}>Faculty Directory Report</Text>
				<Text style={facultyPdfStyles.subtitle}>
					Academic Year 2024-2025 | Generated on {generatedOn}
				</Text>
				<View style={facultyPdfStyles.table}>
					<View style={facultyPdfStyles.headerRow}>
						{columns.map(([label, width]) => (
							<Text
								key={label}
								style={[
									facultyPdfStyles.cell,
									facultyPdfStyles[width],
									facultyPdfStyles.header,
								]}
							>
								{label}
							</Text>
						))}
					</View>
					{items.map((faculty, index) => (
						<View style={facultyPdfStyles.row} key={faculty.userId}>
							<Text style={[facultyPdfStyles.cell, facultyPdfStyles.rank]}>
								{index + 1}
							</Text>
							<Text style={[facultyPdfStyles.cell, facultyPdfStyles.name]}>
								{faculty.firstName} {faculty.lastName}
							</Text>
							<Text
								style={[facultyPdfStyles.cell, facultyPdfStyles.academicRank]}
							>
								{formatAcademicRank(faculty.academicRank)}
							</Text>
							<Text
								style={[facultyPdfStyles.cell, facultyPdfStyles.department]}
							>
								{faculty.departmentCode ?? faculty.college ?? ""}
							</Text>
							{[
								faculty.leadProjects,
								faculty.collaboratorProjects,
								faculty.totalInvolvement,
							].map((value, metricIndex) => (
								<Text
									key={`${faculty.userId}-${metricIndex}`}
									style={[facultyPdfStyles.cell, facultyPdfStyles.metric]}
								>
									{value}
								</Text>
							))}
						</View>
					))}
				</View>
			</Page>
		</Document>
	);
}
