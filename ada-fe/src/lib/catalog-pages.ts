export interface CatalogPage<T> {
  data: T[];
  meta: { totalPages: number };
}

export async function collectCatalogPages<T>(fetchPage: (page: number) => Promise<CatalogPage<T>>): Promise<T[]> {
  const first = await fetchPage(1);
  const items = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page++) {
    items.push(...(await fetchPage(page)).data);
  }
  return items;
}
