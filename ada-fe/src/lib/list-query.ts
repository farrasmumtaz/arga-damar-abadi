export function listQuery(query: { page?: string; search?: string }) {
  const value = Number(query.page ?? 1);
  return { page: Number.isSafeInteger(value) && value >= 1 && value <= 100000 ? value : 1, search: (query.search ?? '').trim().slice(0, 120) };
}
