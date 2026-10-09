import { useQuery } from "@tanstack/react-query";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSpecialOrderSignedUrlFn } from "@/features/projects/public";
import type { ProjectMember } from "@/types/project";

const SpecialOrderPages = lazy(
	() => import("./pdf-viewer/special-order-pages"),
);

function SpecialOrderSection({
	member,
	scrollRoot,
	width,
}: {
	member: ProjectMember;
	scrollRoot: React.RefObject<HTMLElement | null>;
	width: number;
}) {
	const sectionRef = useRef<HTMLElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);
	const [measuredHeight, setMeasuredHeight] = useState(900);
	const pageRatios = useRef(new Map<number, number>());
	const [isNear, setIsNear] = useState(false);
	const [attempt, setAttempt] = useState(0);
	const order = member.specialOrder;
	const { data, error, isFetching, refetch } = useQuery({
		queryKey: ["special-order-viewer-url", order?.specialOrderId],
		queryFn: () =>
			getSpecialOrderSignedUrlFn({ data: order?.specialOrderId ?? "" }),
		enabled: isNear && !!order?.storagePath,
		staleTime: 0,
		gcTime: 0,
		refetchOnWindowFocus: false,
		retry: false,
	});

	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;
		const observer = new IntersectionObserver(
			([entry]) => setIsNear(entry.isIntersecting),
			{ root: scrollRoot.current, rootMargin: "600px 0px" },
		);
		observer.observe(section);
		return () => observer.disconnect();
	}, [scrollRoot]);

	useEffect(() => {
		const body = bodyRef.current;
		if (!body || !isNear) return;
		const observer = new ResizeObserver(() => {
			// Keep the last complete layout while URLs/PDFs reload on re-entry.
			if (body.querySelector("[data-pdf-pages]")) {
				setMeasuredHeight(body.getBoundingClientRect().height);
			}
		});
		observer.observe(body);
		return () => observer.disconnect();
	}, [isNear]);

	return (
		<section
			ref={sectionRef}
			id={`special-order-${member.memberId}`}
			aria-label={`${member.name} special order`}
			className="relative border-b border-border"
		>
			<div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
				<div className="min-w-0">
					<h3 className="text-sm font-semibold break-words">{member.name}</h3>
					<p className="text-xs text-muted-foreground">
						{member.role} · {order?.soNumber}
					</p>
				</div>
				{isNear && data && !isFetching && !error && (
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							window.open(data.url, "_blank", "noopener,noreferrer")
						}
					>
						<Download className="size-4" />
						<span className="sr-only sm:not-sr-only">Original PDF</span>
					</Button>
				)}
			</div>
			{isNear ? (
				<div ref={bodyRef} className="min-h-[300px]">
					{error ? (
						<div role="alert" className="p-6 text-center space-y-3">
							<p className="text-sm">Unable to load this special order.</p>
							<Button variant="outline" onClick={() => void refetch()}>
								Retry
							</Button>
						</div>
					) : data && !isFetching ? (
						<Suspense
							fallback={
								<p
									role="status"
									style={{ height: measuredHeight }}
									className="p-6 text-center text-sm"
								>
									Loading PDF viewer…
								</p>
							}
						>
							<SpecialOrderPages
								key={`${data.url}-${attempt}`}
								url={data.url}
								width={width}
								pageRatios={pageRatios.current}
								placeholderHeight={measuredHeight}
								scrollRoot={scrollRoot}
								onRetry={() => {
									setAttempt((value) => value + 1);
									void refetch();
								}}
							/>
						</Suspense>
					) : (
						<p
							role="status"
							style={{ height: measuredHeight }}
							className="p-6 text-center text-sm"
						>
							Loading special order…
						</p>
					)}
				</div>
			) : (
				<div
					style={{ height: measuredHeight }}
					className="flex items-center justify-center text-sm text-muted-foreground"
				>
					Scroll here to load this special order
				</div>
			)}
		</section>
	);
}

export function SpecialOrdersViewer({
	members,
	isTheaterMode,
	onToggleTheaterMode,
}: {
	members: ProjectMember[];
	isTheaterMode: boolean;
	onToggleTheaterMode: () => void;
}) {
	const uploaded = members.filter((member) => member.specialOrder?.storagePath);
	const scrollRef = useRef<HTMLElement>(null);
	const [width, setWidth] = useState(650);

	useEffect(() => {
		const root = scrollRef.current;
		if (!root) return;
		const updateWidth = () =>
			setWidth(Math.max(200, Math.min(800, root.clientWidth - 32)));
		updateWidth();
		const observer = new ResizeObserver(updateWidth);
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex flex-wrap items-center gap-3 border-b border-border bg-card p-3">
				<div className="flex-1">
					<h2 className="text-sm font-semibold">Member Special Orders</h2>
					<p className="text-xs text-muted-foreground">
						{uploaded.length} of {members.length} uploaded
					</p>
				</div>
				<select
					aria-label="Jump to member special order"
					defaultValue=""
					className="max-w-full rounded-md border border-border bg-background p-2 text-sm sm:max-w-[240px]"
					onChange={(event) => {
						const root = scrollRef.current;
						const section = document.getElementById(
							`special-order-${event.target.value}`,
						);
						if (root && section) {
							root.scrollTo({
								top:
									root.scrollTop +
									section.getBoundingClientRect().top -
									root.getBoundingClientRect().top,
								behavior: "instant",
							});
						}
						event.target.value = "";
					}}
				>
					<option value="" disabled>
						Jump to member…
					</option>
					{members.map((member) => (
						<option
							key={member.memberId}
							value={member.memberId}
							disabled={!member.specialOrder?.storagePath}
						>
							{member.name}
							{!member.specialOrder?.storagePath && " — Not uploaded"}
						</option>
					))}
				</select>
				<Button
					variant="ghost"
					size="icon"
					aria-label={
						isTheaterMode ? "Exit theater mode" : "Enter theater mode"
					}
					onClick={onToggleTheaterMode}
				>
					{isTheaterMode ? (
						<Minimize2 className="size-4" />
					) : (
						<Maximize2 className="size-4" />
					)}
				</Button>
			</div>
			<section
				ref={scrollRef}
				className="min-h-0 flex-1 overflow-auto"
				aria-label="All member special order PDFs"
			>
				{uploaded.length === 0 ? (
					<p className="p-8 text-center text-sm text-muted-foreground">
						No member special orders have been uploaded yet.
					</p>
				) : (
					uploaded.map((member) => (
						<SpecialOrderSection
							key={`${member.memberId}:${member.specialOrder?.specialOrderId}:${member.specialOrder?.storagePath}`}
							member={member}
							scrollRoot={scrollRef}
							width={width}
						/>
					))
				)}
			</section>
		</div>
	);
}
