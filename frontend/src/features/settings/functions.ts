import { createServerFn } from "@tanstack/react-start";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getAppSession, getValidAccessToken } from "@/lib/session.server";
import type { AuthUser } from "@/types/user";

export const uploadAvatarFn = createServerFn({ method: "POST" })
	.validator((data: FormData) => {
		const file = data.get("file");
		if (!(file instanceof File)) throw new Error("An avatar image is required");
		if (![
			"image/jpeg",
			"image/png",
			"image/webp",
		].includes(file.type)) {
			throw new Error("Use a JPEG, PNG, or WebP image");
		}
		if (file.size > 5 * 1024 * 1024) {
			throw new Error("Avatar must be 5MB or smaller");
		}
		return data;
	})
	.handler(async ({ data }) => {
		await authorizeSessionUser("Faculty", "RET Chair", "Director", "Super Admin");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/storage/avatar`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
			body: data,
		});
		if (!response.ok) {
			throw new Error(await getErrorMessage(response, "Unable to upload avatar"));
		}

		const result = (await response.json()) as { avatarUrl: string };
		const session = await getAppSession();
		const currentUser = session.data.user as AuthUser | undefined;
		if (currentUser) {
			await session.update({
				...session.data,
				user: { ...currentUser, avatarUrl: result.avatarUrl },
				createdAt: Date.now(),
			});
		}
		return result;
	});
