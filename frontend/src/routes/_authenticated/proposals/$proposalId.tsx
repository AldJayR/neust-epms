
import { createFileRoute } from "@tanstack/react-router";
import { ProposalReviewPage } from "@/features/director/proposal-review-page";

export const Route = createFileRoute("/_authenticated/proposals/$proposalId")({
  component: ProposalReviewComponent,
});

function ProposalReviewComponent() {
  const { proposalId } = Route.useParams();
  return <ProposalReviewPage proposalId={proposalId} />;
}
