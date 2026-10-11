// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloseProjectDialog } from "./close-project-dialog";

const api = vi.hoisted(() => ({ close: vi.fn(), invalidate: vi.fn() }));
vi.mock("../functions", () => ({ closeProjectFn: api.close }));
vi.mock("@/lib/workflow-queries", () => ({ invalidateWorkflowQueries: api.invalidate }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const projectId = "ffffffff-6666-4666-8666-ffffffffffff";
function mount() {
	const onOpenChange = vi.fn();
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	render(<QueryClientProvider client={client}>
		<CloseProjectDialog open onOpenChange={onOpenChange} projectId={projectId} projectTitle="Community Training" traineeCount={12} />
	</QueryClientProvider>);
	return { onOpenChange };
}
function selectFile() {
	const file = new File(["%PDF-1.4\nsigned report"], "signed.pdf", { type: "application/pdf" });
	fireEvent.change(screen.getByLabelText("Signed Terminal Report"), { target: { files: [file] } });
	return file;
}
beforeEach(() => {
	vi.resetAllMocks();
	api.close.mockResolvedValue({ message: "Project closed" });
	api.invalidate.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("CloseProjectDialog", () => {
	it("requires both a signed file and explicit confirmation", () => {
		mount();
		const submit = screen.getByRole("button", { name: "Upload and Close Project" }) as HTMLButtonElement;
		expect(submit.disabled).toBe(true);
		selectFile();
		expect(submit.disabled).toBe(true);
		fireEvent.change(screen.getByLabelText("Type CLOSE to confirm"), { target: { value: "CLOSE" } });
		expect(submit.disabled).toBe(false);
		expect(api.close).not.toHaveBeenCalled();
	});

	it("uploads the signed file, closes the dialog, and refreshes project data", async () => {
		const { onOpenChange } = mount();
		selectFile();
		fireEvent.change(screen.getByLabelText("Type CLOSE to confirm"), { target: { value: "CLOSE" } });
		fireEvent.click(screen.getByRole("button", { name: "Upload and Close Project" }));
		await waitFor(() => expect(api.close).toHaveBeenCalledOnce());
		const data = api.close.mock.calls[0]![0].data as FormData;
		expect(data.get("projectId")).toBe(projectId);
		expect((data.get("file") as File).name).toBe("signed.pdf");
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
		expect(api.invalidate).toHaveBeenCalledOnce();
	});

	it("keeps the file and dialog available for retry after a failed upload", async () => {
		api.close.mockRejectedValueOnce(new Error("Unable to upload signed report"));
		const { onOpenChange } = mount();
		selectFile();
		fireEvent.change(screen.getByLabelText("Type CLOSE to confirm"), { target: { value: "CLOSE" } });
		fireEvent.click(screen.getByRole("button", { name: "Upload and Close Project" }));
		await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Unable to upload signed report"));
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(api.invalidate).not.toHaveBeenCalled();
		expect((screen.getByRole("button", { name: "Upload and Close Project" }) as HTMLButtonElement).disabled).toBe(false);
	});
});
