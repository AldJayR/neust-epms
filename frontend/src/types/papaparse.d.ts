declare module "papaparse" {
	interface UnparseConfig {
		escapeFormulae?: boolean;
		newline?: string;
	}

	interface PapaParse {
		unparse(
			input: { fields: string[]; data: unknown[][] },
			config?: UnparseConfig,
		): string;
	}

	const Papa: PapaParse;
	export default Papa;
}
