export type MoaValidityStatus = "Valid" | "Renewal Needed" | "Expired" | "Not Yet Effective" | "Missing Document";

export interface MoaItem {
	id: string;
	partnerOrganization: string;
	dateSigned: string;
	daysToExpiry: number | string;
	status: MoaValidityStatus | "Terminated";
}

export interface MoaDetails {
	moaId: string;
	partnerId: string;
	partnerName: string;
	storagePath: string | null;
	validFrom: string;
	validUntil: string;
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
	status: MoaValidityStatus;
	daysToExpiry: number | "Expired";
}

export interface MoaRepositoryResponse {
	items: MoaItem[];
	total: number;
	metrics: {
		totalMoas: number;
		expiringWithin90Days: number;
		activePartnerships: number;
	};
}

export interface ActiveMoa {
	moaId: string;
	partnerName: string;
	validFrom: string;
	validUntil: string;
}
