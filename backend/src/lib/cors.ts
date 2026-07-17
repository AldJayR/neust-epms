export type AppEnvironment = "development" | "production" | "test";

const LOCAL_ORIGINS = ["http://localhost:3001", "http://localhost:5173"];

export function parseCorsOrigins(
	value: string | undefined,
	nodeEnv: AppEnvironment,
): string[] {
	const origins = (value ?? "")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);

	if (origins.length === 0) {
		if (nodeEnv === "production") {
			throw new Error("CORS_ORIGINS must be configured in production");
		}
		return [...LOCAL_ORIGINS];
	}

	for (const origin of origins) {
		if (origin === "*" || origin.includes("*")) {
			throw new Error("CORS_ORIGINS cannot contain wildcard origins");
		}

		let parsed: URL;
		try {
			parsed = new URL(origin);
		} catch {
			throw new Error(`Invalid CORS origin: ${origin}`);
		}

		if (
			!["http:", "https:"].includes(parsed.protocol) ||
			parsed.origin !== origin
		) {
			throw new Error(`CORS origins must be exact HTTP(S) origins: ${origin}`);
		}
	}

	return origins;
}
