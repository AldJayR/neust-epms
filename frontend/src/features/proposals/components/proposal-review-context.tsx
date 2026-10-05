import { createContext, type ReactNode, useContext } from "react";
import type {
	ProjectDetailsResponse,
	ProjectHistoryItem,
} from "@/features/projects/public";

export interface ProposalReviewContextValue {
	data: ProjectDetailsResponse;
	endorsement: ProjectHistoryItem | undefined;
	activeAttachmentId: string | null;
	setActiveAttachmentId: (id: string) => void;
	isReviewable: boolean;
	handleDeny: (comments?: string) => Promise<void> | void;
	handleReject: (comments?: string) => Promise<void> | void;
	handleApprove: (comments?: string) => Promise<void> | void;
	isPending: boolean;
	isRET: boolean;
	bypassedRetChair: boolean;
}

const ProposalReviewContext = createContext<ProposalReviewContextValue | null>(
	null,
);

export function ProposalReviewProvider({
	value,
	children,
}: {
	value: ProposalReviewContextValue;
	children: ReactNode;
}) {
	return (
		<ProposalReviewContext.Provider value={value}>
			{children}
		</ProposalReviewContext.Provider>
	);
}

export function useProposalReview() {
	const context = useContext(ProposalReviewContext);
	if (!context) {
		throw new Error(
			"useProposalReview must be used within a ProposalReviewProvider",
		);
	}
	return context;
}
