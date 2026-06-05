import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const academicRankLabels: Record<string, string> = {
	"instructor-1": "Instructor I",
	"instructor-2": "Instructor II",
	"instructor-3": "Instructor III",
	"assistant-prof-1": "Assistant Professor I",
	"assistant-prof-2": "Assistant Professor II",
	"associate-prof-1": "Associate Professor I",
	"associate-prof-2": "Associate Professor II",
	"professor-1": "Professor I",
};

export function formatAcademicRank(rank: string | null): string {
	if (!rank) return "Faculty";
	return academicRankLabels[rank] ?? rank;
}
