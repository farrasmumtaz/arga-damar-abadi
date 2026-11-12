import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectCatalogPages } from '../src/lib/catalog-pages.ts';

test('collects the entire catalogue in page order instead of truncating the first page', async () => {
  const pages = [
    { data: ['first', 'second'], meta: { totalPages: 3 } },
    { data: ['third', 'fourth'], meta: { totalPages: 3 } },
    { data: ['last'], meta: { totalPages: 3 } },
  ];
  const result = await collectCatalogPages(async page => pages[page - 1]);
  assert.deepEqual(result, ['first', 'second', 'third', 'fourth', 'last']);
});

test('an empty catalogue terminates without fetching nonexistent pages', async () => {
  const result = await collectCatalogPages(async page => {
    assert.equal(page, 1);
    return { data: [], meta: { totalPages: 0 } };
  });
  assert.deepEqual(result, []);
});

test('does not present a partial catalogue as complete when a later page fails', async () => {
  await assert.rejects(collectCatalogPages(async page => {
    if (page === 2) throw new Error('API unavailable');
    return { data: ['first'], meta: { totalPages: 2 } };
  }), /API unavailable/);
});
