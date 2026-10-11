import { sql } from "drizzle-orm";
import { moas } from "@/db/schema/moas.js";

export const MOA_STATUSES = ["Valid", "Renewal Needed", "Expired", "Not Yet Effective", "Missing Document"] as const;
export type MoaValidityStatus = (typeof MOA_STATUSES)[number];
type MoaValidity = { validFrom: Date; validUntil: Date; archivedAt: Date | null; storagePath: string | null };

export function isMoaCurrentlyValid(moa: MoaValidity, now = new Date()): boolean {
	return !moa.archivedAt && Boolean(moa.storagePath?.trim()) && moa.validFrom <= now && now < moa.validUntil;
}

export function getMoaValidityStatus(moa: MoaValidity, now = new Date()): MoaValidityStatus {
	if (moa.archivedAt || moa.validUntil <= now) return "Expired";
	if (moa.validFrom > now) return "Not Yet Effective";
	if (!moa.storagePath?.trim()) return "Missing Document";
	return moa.validUntil.getTime() - now.getTime() <= 30 * 24 * 60 * 60 * 1000 ? "Renewal Needed" : "Valid";
}

/** SQL counterpart used by both repository filtering and displayed statuses. */
export function moaValidityStatusExpression(now = new Date()) {
	const renewalBoundary = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	return sql<MoaValidityStatus>`CASE
		WHEN ${moas.archivedAt} IS NOT NULL OR ${moas.validUntil} <= ${now.toISOString()} THEN 'Expired'
		WHEN ${moas.validFrom} > ${now.toISOString()} THEN 'Not Yet Effective'
		WHEN coalesce(trim(${moas.storagePath}), '') = '' THEN 'Missing Document'
		WHEN ${moas.validUntil} <= ${renewalBoundary.toISOString()} THEN 'Renewal Needed'
		ELSE 'Valid' END`;
}
