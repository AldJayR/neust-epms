/** The same required fields drive finalization and the Director's missing-item explanations. */
export function terminalPackageMissingRequirements(input: {
	documentUploaded: boolean;
	evaluationUploaded: boolean;
	traineeCount: number | null;
}): string[] {
	const missing: string[] = [];
	if (!input.documentUploaded) missing.push("Terminal report not uploaded");
	if (!input.evaluationUploaded) missing.push("Evaluation forms missing");
	if (input.traineeCount === null) missing.push("Trainee count not recorded");
	return missing;
}
