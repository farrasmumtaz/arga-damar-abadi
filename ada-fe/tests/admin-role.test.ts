import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinationAfterLogin, isStoreStaff } from '../src/lib/admin-role.ts';

test('staff and admins enter the store dashboard, customers keep their destination', () => {
  for (const role of ['STAFF', 'ADMIN', 'SUPER_ADMIN'] as const) {
    assert.equal(isStoreStaff(role), true);
    assert.equal(destinationAfterLogin(role, '/'), '/admin');
    assert.equal(destinationAfterLogin(role, '/account/profile'), '/admin');
    assert.equal(destinationAfterLogin(role, '/checkout'), '/admin');
    assert.equal(destinationAfterLogin(role, '/admin/products'), '/admin/products');
  }
  assert.equal(isStoreStaff('CUSTOMER'), false);
  assert.equal(destinationAfterLogin('CUSTOMER', '/account/orders'), '/account/orders');
});
