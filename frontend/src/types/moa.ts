export interface MoaItem {
	id: string;
	partnerOrganization: string;
	dateSigned: string;
	daysToExpiry: number | string;
	status: "Valid" | "Renewal Needed" | "Expired" | "Terminated";
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
	status: "Valid" | "Renewal Needed" | "Expired";
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
