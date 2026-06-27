import { useReducer } from "react";
import { stateReducer } from "@/lib/state-reducer";
import { DEFAULT_SCALE, ZOOM_STEPS } from "../pdf-constants";

interface ZoomState {
	scale: number;
}

const initialState: ZoomState = {
	scale: DEFAULT_SCALE,
};

export function usePdfZoom(initialScale = DEFAULT_SCALE) {
	const [state, dispatch] = useReducer(stateReducer, {
		...initialState,
		scale: initialScale,
	});

	function zoomIn() {
		dispatch((prev) => {
			let nextScale = ZOOM_STEPS[ZOOM_STEPS.length - 1] ?? DEFAULT_SCALE;
			for (const s of ZOOM_STEPS) {
				if (s > prev.scale) {
					nextScale = s;
					break;
				}
			}
			return { scale: nextScale };
		});
	}

	function zoomOut() {
		dispatch((prev) => {
			let nextScale = ZOOM_STEPS[0] ?? DEFAULT_SCALE;
			for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) {
				const s = ZOOM_STEPS[i];
				if (s !== undefined && s < prev.scale) {
					nextScale = s;
					break;
				}
			}
			return { scale: nextScale };
		});
	}

	function resetZoom() {
		dispatch({ scale: DEFAULT_SCALE });
	}

	return {
		scale: state.scale,
		zoomIn,
		zoomOut,
		resetZoom,
	};
}
