export interface DerivedStateResponse {
	state: "ACT" | "WAIT" | "WATCH";
	owner: string;
	reason: string;
	nextTransition: string;
}
