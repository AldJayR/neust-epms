import { z } from "@hono/zod-openapi";

/**
 * Keyset pagination query schema.
 * `cursor` is an ISO 8601 timestamp. If omitted, returns the first page.
 */
export const KeysetPaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
  cursor: z.string().optional().openapi({
    param: {
      name: "cursor",
      in: "query",
      description: "ISO 8601 timestamp cursor. Omit for first page.",
    },
  }),
});

export type KeysetPaginationParams = z.infer<typeof KeysetPaginationQuery>;

/**
 * Given a result set fetched with `limit + 1`, return { items, nextCursor }.
 * `createdAtKey` is the key in each item object that holds the timestamp.
 */
export function paginateResults<T extends Record<string, any>>(
  rows: T[],
  limit: number,
  createdAtKey: keyof T = "createdAt" as keyof T,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  if (!hasMore || !lastItem) {
    return { items, nextCursor: null };
  }
  const val: any = lastItem[createdAtKey];
  const nextCursor = typeof val?.toISOString === "function" ? val.toISOString() : String(val);
  return { items, nextCursor };
}
