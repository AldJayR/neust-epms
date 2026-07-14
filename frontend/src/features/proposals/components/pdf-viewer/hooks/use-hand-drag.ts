import { useRef, useState } from "react";

interface UseHandDragOptions {
	scrollRef: React.RefObject<HTMLDivElement | null>;
	toolMode: "hand" | "comment";
}

export function useHandDrag({ scrollRef, toolMode }: UseHandDragOptions) {
	const [isDragging, setIsDragging] = useState(false);
	const dragStartScroll = useRef({ left: 0, top: 0, x: 0, y: 0 });

	const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (toolMode !== "hand" || !scrollRef.current) return;
		if (e.button !== 0) return;

		const target = e.target as HTMLElement;
		if (
			target.closest("button") ||
			target.closest("textarea") ||
			target.closest("input") ||
			target.closest("[role='tooltip']") ||
			target.closest(".cursor-pointer") ||
			target.closest(".textLayer span")
		) {
			return;
		}

		setIsDragging(true);
		dragStartScroll.current = {
			left: scrollRef.current.scrollLeft,
			top: scrollRef.current.scrollTop,
			x: e.clientX,
			y: e.clientY,
		};
	};

	const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging || toolMode !== "hand" || !scrollRef.current) return;
		e.preventDefault();

		const dx = e.clientX - dragStartScroll.current.x;
		const dy = e.clientY - dragStartScroll.current.y;

		scrollRef.current.scrollLeft = dragStartScroll.current.left - dx;
		scrollRef.current.scrollTop = dragStartScroll.current.top - dy;
	};

	const onMouseUpOrLeave = () => setIsDragging(false);

	return {
		isDragging,
		handlers: {
			onMouseDown,
			onMouseMove,
			onMouseUp: onMouseUpOrLeave,
			onMouseLeave: onMouseUpOrLeave,
		},
	};
}
