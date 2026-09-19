import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogApiQuery, catalogPageHref, parseCatalogFilters } from '../src/lib/catalog-query.ts';

test('empty parameters use a bounded first-page query', () => {
  const filters = parseCatalogFilters({});
  const query = new URLSearchParams(catalogApiQuery(filters));
  assert.equal(query.get('page'), '1');
  assert.equal(query.get('limit'), '12');
  assert.equal(query.get('sortBy'), 'createdAt');
  assert.equal(query.get('sortDirection'), 'desc');
});

test('accepts UUID category and brand filters and two-decimal prices', () => {
  const categoryId = '4b2f73a0-2f53-49fb-b3c9-766c3fc18276';
  const brandId = '23966f71-24ca-4c57-bdcb-06a918cf9c2f';
  const filters = parseCatalogFilters({ categoryId, brandId, minPrice: '120.50', maxPrice: '5000', page: '3', sort: 'price-asc' });
  const query = new URLSearchParams(catalogApiQuery(filters));
  assert.equal(query.get('categoryId'), categoryId);
  assert.equal(query.get('brandId'), brandId);
  assert.equal(query.get('minPrice'), '120.50');
  assert.equal(query.get('page'), '3');
  assert.equal(query.get('sortBy'), 'price');
  assert.equal(query.get('sortDirection'), 'asc');
});

test('rejects invalid pages, IDs, prices, and sorting', () => {
  for (const page of ['-1','0','1.5','Infinity','100001']) assert.equal(parseCatalogFilters({ page }).page, 1);
  const filters = parseCatalogFilters({ categoryId: 'x', minPrice: '-100', maxPrice: '1e9', sort: 'DROP TABLE' });
  assert.equal(filters.categoryId, '');
  assert.equal(filters.minPrice, '');
  assert.equal(filters.maxPrice, '');
  assert.equal(filters.sort, 'newest');
});

test('ignores duplicate query arrays and limits search length', () => {
  assert.equal(parseCatalogFilters({ search: ['a', 'b'], page: ['1','2'] }).search, '');
  assert.equal(parseCatalogFilters({ search: 'a'.repeat(300) }).search.length, 200);
});

test('pagination preserves filters and escapes user text', () => {
  const filters = parseCatalogFilters({ search: ' lampu & kabel ', sort: 'price-desc', minPrice: '100' });
  const url = new URL(catalogPageHref(filters, 2), 'https://store.example');
  assert.equal(url.pathname, '/products');
  assert.equal(url.searchParams.get('search'), 'lampu & kabel');
  assert.equal(url.searchParams.get('sort'), 'price-desc');
  assert.equal(url.searchParams.get('minPrice'), '100');
  assert.equal(url.searchParams.get('page'), '2');
});

test('public catalogue query never forwards client status or page size', () => {
  const query = new URLSearchParams(catalogApiQuery(parseCatalogFilters({ status: 'DRAFT', limit: '1000000', search: 'a&status=ARCHIVED' })));
  assert.equal(query.has('status'), false);
  assert.equal(query.get('limit'), '12');
  assert.equal(query.get('search'), 'a&status=ARCHIVED');
});
