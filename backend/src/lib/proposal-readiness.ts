import { sql } from "drizzle-orm";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposalSubmissions } from "@/db/schema/proposal-submissions.js";
import { proposals } from "@/db/schema/proposals.js";
import { PROPOSAL_STATUS } from "./types.js";

/** Correlated predicates: callers must join the proposals table. */
export function institutionalScansRecorded() {
	return sql<boolean>`(${proposals.status} = ${PROPOSAL_STATUS.INSTITUTIONALLY_APPROVED}
		AND nullif(trim(${proposals.institutionalApprovalDocPath}), '') IS NOT NULL
		AND nullif(trim(${proposals.signedSpecialOrderDocPath}), '') IS NOT NULL)`;
}

export function submittedSpecialOrderExists() {
	return sql<boolean>`EXISTS (
		SELECT 1 FROM ${proposalDocuments}
		WHERE ${proposalDocuments.proposalId} = ${proposals.proposalId}
		AND ${proposalDocuments.documentType} = 'Special Orders'
		AND ${proposalDocuments.documentId} = (
			SELECT ${proposalSubmissions.specialOrderDocumentId} FROM ${proposalSubmissions}
			WHERE ${proposalSubmissions.proposalId} = ${proposals.proposalId}
			ORDER BY ${proposalSubmissions.sequence} DESC LIMIT 1
		)
	)`;
}
