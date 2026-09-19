export type CatalogSearchParams = Record<string, string | string[] | undefined>;
export const catalogSortOptions = [
  { value: 'newest', label: 'Terbaru', sortBy: 'createdAt', sortDirection: 'desc' },
  { value: 'price-asc', label: 'Harga terendah', sortBy: 'price', sortDirection: 'asc' },
  { value: 'price-desc', label: 'Harga tertinggi', sortBy: 'price', sortDirection: 'desc' },
  { value: 'name', label: 'Nama A–Z', sortBy: 'name', sortDirection: 'asc' },
] as const;

export interface CatalogFilters {
  search: string; categoryId: string; brandId: string; minPrice: string; maxPrice: string;
  sort: (typeof catalogSortOptions)[number]['value']; page: number;
}

export function parseCatalogFilters(params: CatalogSearchParams): CatalogFilters {
  const value = (key: string) => typeof params[key] === 'string' ? params[key].trim() : '';
  const uuid = (key: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value(key)) ? value(key) : '';
  const price = (key: string) => /^\d{1,13}(\.\d{1,2})?$/.test(value(key)) ? value(key) : '';
  const page = Number(value('page'));
  return {
    search: value('search').slice(0, 200), categoryId: uuid('categoryId'), brandId: uuid('brandId'),
    minPrice: price('minPrice'), maxPrice: price('maxPrice'),
    sort: catalogSortOptions.find(option => option.value === value('sort'))?.value ?? 'newest',
    page: Number.isSafeInteger(page) && page >= 1 && page <= 100_000 ? page : 1,
  };
}

export function catalogPageHref(filters: CatalogFilters, page: number): string {
  const params = new URLSearchParams();
  for (const key of ['search','categoryId','brandId','minPrice','maxPrice','sort'] as const) if (filters[key]) params.set(key, filters[key]);
  params.set('page', String(page));
  return `/products?${params}`;
}

export function catalogApiQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams({ page: String(filters.page), limit: '12' });
  for (const key of ['search','categoryId','brandId','minPrice','maxPrice'] as const) if (filters[key]) params.set(key, filters[key]);
  const sort = catalogSortOptions.find(option => option.value === filters.sort) ?? catalogSortOptions[0];
  params.set('sortBy', sort.sortBy); params.set('sortDirection', sort.sortDirection);
  return params.toString();
}
