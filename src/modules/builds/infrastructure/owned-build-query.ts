import { UnexpectedStoreError } from "../domain/errors";

export function quoteFilterValue(value: string): string {
  return `"${value.replaceAll('"', '\\"')}"`;
}

export function keysetTimestamp(updatedAt: string): string {
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new UnexpectedStoreError();
  }
  return parsed.toISOString();
}

export function applyAfterUpdatedAtBoundary<T extends { or: (filters: string) => T }>(
  query: T,
  boundary: { updatedAt: string; id: string },
): T {
  const updatedAt = quoteFilterValue(keysetTimestamp(boundary.updatedAt));
  const id = quoteFilterValue(boundary.id);
  return query.or(`updated_at.lt.${updatedAt},and(updated_at.eq.${updatedAt},id.lt.${id})`);
}

export function applyBeforeUpdatedAtBoundary<T extends { or: (filters: string) => T }>(
  query: T,
  boundary: { updatedAt: string; id: string },
): T {
  const updatedAt = quoteFilterValue(keysetTimestamp(boundary.updatedAt));
  const id = quoteFilterValue(boundary.id);
  return query.or(`updated_at.gt.${updatedAt},and(updated_at.eq.${updatedAt},id.gt.${id})`);
}
