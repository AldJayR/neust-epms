import { useEffect, useReducer } from "react";
import { stateReducer } from "@/lib/state-reducer";

const BUFFER_PAGES = 1;

interface VisibilityState {
	visiblePages: Set<number>;
	currentPage: number;
}

const initialState: VisibilityState = {
	visiblePages: new Set([1]),
	currentPage: 1,
};

export function usePdfVisibility(
	scrollRef: React.RefObject<HTMLDivElement | null>,
	numPages: number,
	loadingDoc: boolean,
	pageRefs: React.MutableRefObject<Map<number, HTMLDivElement>>,
) {
	const [state, dispatch] = useReducer(stateReducer, initialState);

	useEffect(() => {
		const scrollEl = scrollRef.current;
		if (!scrollEl || numPages === 0) return;

		// Virtualization preload observer
		const preloadObserver = new IntersectionObserver(
			(entries) => {
				dispatch((prev) => {
					const next = new Set(prev.visiblePages);
					for (const entry of entries) {
						const pg = Number((entry.target as HTMLElement).dataset.page);
						if (entry.isIntersecting) {
							next.add(pg);
						} else {
							next.delete(pg);
						}
					}
					return { visiblePages: next };
				});
			},
			{
				root: scrollEl,
				rootMargin: `${BUFFER_PAGES * 200}px 0px`,
				threshold: 0,
			},
		);

		// Precise active-page tracker observer
		const pageTrackerObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const pg = Number((entry.target as HTMLElement).dataset.page);
						dispatch({ currentPage: pg });
					}
				}
			},
			{
				root: scrollEl,
				rootMargin: "-10% 0px -80% 0px",
				threshold: 0,
			},
		);

		// Small delay to ensure elements are mounted before registration
		const timer = setTimeout(() => {
			for (const [, el] of pageRefs.current) {
				preloadObserver.observe(el);
				pageTrackerObserver.observe(el);
			}
		}, 100);

		return () => {
			clearTimeout(timer);
			preloadObserver.disconnect();
			pageTrackerObserver.disconnect();
		};
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadingDoc triggers re-observe after PDF loads
	}, [numPages, loadingDoc, scrollRef, pageRefs]);

	return {
		visiblePages: state.visiblePages,
		currentPage: state.currentPage,
	};
}
