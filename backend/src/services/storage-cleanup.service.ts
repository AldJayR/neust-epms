import { supabase } from "@/lib/supabase.js";

/** Cleanup must never hide the original failure or undo a committed response. */
export async function removeStorageObject(
	bucket: string,
	path: string,
): Promise<void> {
	try {
		const { error } = await supabase.storage.from(bucket).remove([path]);
		if (error)
			console.error("[storage] Object cleanup failed", { bucket, path, error });
	} catch (error) {
		console.error("[storage] Object cleanup failed", { bucket, path, error });
	}
}
