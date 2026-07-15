import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import Papa from "papaparse";
import { toast } from "sonner";
import { emailReportFn } from "@/features/reports/public";
import { formatAcademicRank } from "@/lib/utils";
import type { FacultyInvolvement } from "@/types/user";
import { createFacultyDirectoryPdf } from "./components/faculty-directory-pdf";
import { getFacultyDirectoryExportDate } from "./faculty-directory-export-helpers";

export type FacultyDirectoryExportFormat = "pdf" | "excel" | "email";

interface UseFacultyDirectoryExportOptions {
	items: FacultyInvolvement[];
	search?: string;
	college?: string;
}

const csvHeaders = [
	"Rank",
	"Faculty Name",
	"Academic Rank",
	"Department",
	"Lead Projects",
	"Collaborator Projects",
	"Total Involvement",
];

const pdfRendererPromise = import("@react-pdf/renderer");

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.style.visibility = "hidden";
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function useFacultyDirectoryExport({
	items,
	search,
	college,
}: UseFacultyDirectoryExportOptions) {
	const sendEmailReport = useServerFn(emailReportFn);

	return async (exportFormat: FacultyDirectoryExportFormat) => {
		if (items.length === 0) {
			toast.error("No data available to export.");
			return;
		}

		const reportDate = getFacultyDirectoryExportDate();
		const dateSuffix = format(reportDate, "yyyy-MM-dd");

		if (exportFormat === "pdf") {
			toast.info("Generating PDF report...");
			try {
				const { pdf, ...renderer } = await pdfRendererPromise;
				const blob = await pdf(
					createFacultyDirectoryPdf({
						renderer,
						items,
						generatedOn: format(reportDate, "MMMM dd, yyyy"),
					}),
				).toBlob();
				downloadBlob(blob, `Faculty_Directory_Report_${dateSuffix}.pdf`);
				toast.success("PDF report generated.");
			} catch {
				toast.error("Failed to generate PDF report.");
			}
			return;
		}

		if (exportFormat === "excel") {
			toast.info("Preparing Excel spreadsheet...");
			try {
				const rows = items.map((faculty, index) => [
					index + 1,
					`${faculty.firstName} ${faculty.lastName}`,
					formatAcademicRank(faculty.academicRank),
					faculty.departmentCode ?? faculty.college ?? "",
					faculty.leadProjects,
					faculty.collaboratorProjects,
					faculty.totalInvolvement,
				]);
				const csvContent = Papa.unparse(
					{ fields: csvHeaders, data: rows },
					{ escapeFormulae: true, newline: "\r\n" },
				);
				downloadBlob(
					new Blob([csvContent], { type: "text/csv;charset=utf-8;" }),
					`Faculty_Directory_Report_${dateSuffix}.csv`,
				);
				toast.success("Excel spreadsheet downloaded successfully.");
			} catch {
				toast.error("Failed to generate Excel spreadsheet.");
			}
			return;
		}

		toast.info("Sending report to your email...");
		try {
			const response = await sendEmailReport({
				data: {
					search: search || undefined,
					college: college || undefined,
				},
			});
			if (response.success) {
				toast.success(response.message || "Email report sent successfully.");
			} else {
				toast.error(response.message || "Failed to send email report.");
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to send email report.";
			toast.error(message);
		}
	};
}
