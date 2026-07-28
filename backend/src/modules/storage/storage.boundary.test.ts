import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { supabase } from "@/lib/supabase.js";
import { MOCK_USERS, mockMutationChain, mockSelectChain } from "../../../test/helpers.js";
import {
	getDocumentSignedUrl,
	uploadProposalDocument,
	uploadUserAvatar,
} from "./storage.service.js";

const proposalId = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
const documentId = "dddddddd-8888-4888-8888-dddddddddddd";
const storageBucket = {
	upload: vi.fn(),
	remove: vi.fn(),
	download: vi.fn(),
	createSignedUrl: vi.fn(),
	getPublicUrl: vi.fn(),
};

const proposal = {
	proposalId,
	title: "Boundary Proposal",
	departmentId: 1,
	campusId: 1,
};

beforeEach(() => {
	vi.mocked(supabase.storage.from).mockReturnValue(storageBucket as never);
	storageBucket.upload.mockReset();
	storageBucket.remove.mockReset();
	storageBucket.download.mockReset();
	storageBucket.createSignedUrl.mockReset();
	storageBucket.getPublicUrl.mockReset();
	storageBucket.upload.mockResolvedValue({ error: null });
	storageBucket.remove.mockResolvedValue({ error: null });
	storageBucket.createSignedUrl.mockResolvedValue({
		data: { signedUrl: "https://test.supabase.co/signed-document" },
		error: null,
	});
	storageBucket.getPublicUrl.mockReturnValue({
		data: {
			publicUrl: "https://test.supabase.co/storage/v1/object/public/avatars/users/avatar.png",
		},
	});
	vi.mocked(insertAuditLog).mockClear();
});

describe("Supabase Storage boundary", () => {
	it("uploads an avatar before replacing the managed previous object", async () => {
		const previousUrl =
			"https://test.supabase.co/storage/v1/object/public/avatars/users/user-1/old.png";
		const publicUrl =
			"https://test.supabase.co/storage/v1/object/public/avatars/users/user-1/new.png";
		storageBucket.getPublicUrl.mockReturnValue({
			data: { publicUrl },
		});
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ avatarUrl: previousUrl }]) as never,
		);
		vi.mocked(db.update).mockReturnValue(
			mockMutationChain([{ avatarUrl: publicUrl }]) as never,
		);

		const file = new File(
			[Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
			"avatar.png",
			{ type: "image/png" },
		);

		const result = await uploadUserAvatar(MOCK_USERS.faculty, file, "127.0.0.1");

		expect(result).toEqual({ avatarUrl: publicUrl });
		expect(storageBucket.upload).toHaveBeenCalledWith(
			expect.stringMatching(/^users\/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa\/[0-9a-f-]+\.png$/),
			file,
			{ contentType: "image/png", upsert: false },
		);
		expect(storageBucket.remove).toHaveBeenCalledWith([
			"users/user-1/old.png",
		]);
		expect(insertAuditLog).toHaveBeenCalledOnce();
	});

	it("does not update the profile when the avatar upload fails", async () => {
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ avatarUrl: null }]) as never,
		);
		storageBucket.upload.mockResolvedValueOnce({
			error: { message: "storage unavailable" },
		});

		const file = new File(
			[Uint8Array.of(0xff, 0xd8, 0xff, 0xdb)],
			"avatar.jpg",
			{ type: "image/jpeg" },
		);

		await expect(
			uploadUserAvatar(MOCK_USERS.faculty, file, "127.0.0.1"),
		).rejects.toMatchObject<ApiError>({ code: "UPLOAD_FAILED", status: 400 });
		expect(db.update).not.toHaveBeenCalled();
		expect(insertAuditLog).not.toHaveBeenCalled();
	});

	it("removes an uploaded proposal document when its database record fails", async () => {
		const versionTransaction = {
			execute: vi.fn().mockResolvedValue([{ max_ver: 2 }]),
		};
		const insertFailure = new Error("database unavailable");
		vi.mocked(db.transaction)
			.mockImplementationOnce(
				async (callback) => callback(versionTransaction as never) as never,
			)
			.mockImplementationOnce(async () => {
				throw insertFailure;
			});

		const file = new File(["%PDF-1.4\n"], "Proposal File.pdf", {
			type: "application/pdf",
		});

		await expect(
			uploadProposalDocument(MOCK_USERS.faculty, proposalId, file, "127.0.0.1"),
		).rejects.toBe(insertFailure);
		expect(storageBucket.upload).toHaveBeenCalledOnce();
		expect(storageBucket.remove).toHaveBeenCalledWith([
			expect.stringMatching(
				new RegExp(`^proposals/${proposalId}/v2_\\d+_[0-9a-f-]{36}_`),
			),
		]);
	});

	it("surfaces a signed URL provider failure without writing an audit record", async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([proposal]) as never)
			.mockReturnValueOnce(
				mockSelectChain([
					{ documentId, storagePath: "proposals/test/v1.pdf" },
				]) as never,
			);
		storageBucket.createSignedUrl.mockResolvedValueOnce({
			data: null,
			error: { message: "signed URL provider unavailable" },
		});

		await expect(
			getDocumentSignedUrl(
				MOCK_USERS.faculty,
				proposalId,
				documentId,
				"127.0.0.1",
			),
		).rejects.toMatchObject<ApiError>({ code: "URL_FAILED", status: 500 });
		expect(insertAuditLog).not.toHaveBeenCalled();
	});
});
