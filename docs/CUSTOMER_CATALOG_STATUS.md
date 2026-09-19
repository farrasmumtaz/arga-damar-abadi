# Customer catalogue — update 18 September 2026

Implemented:

- Public `/products` catalogue with server-rendered GET form (no login required).
- Search by product name/SKU; category, brand and price range filters.
- Sorting newest, lowest/highest price, name; pagination 12 products per page.
- Query normalization and URL-encoded filters preserved between pages; changing filters resets page.
- Distinct empty, invalid price range, loading and API-error states.
- Header/footer links to catalogue, actual cart quantity, mutation revalidation.
- Cart API images mapped to product photos for cart and checkout.
- Homepage category/brand navigation uses backend data instead of demo values.
- Product cards show actual stock; unavailable product cannot be purchased through detail-page buttons (backend remains authoritative).

Verification: 6 frontend unit tests passed; frontend typecheck and production build passed. Authenticated browser smoke tests were not performed. No credentials, roles, or production database data were changed.

Remaining: automatic frontend token refresh, voucher/payment amount reconciliation, live storage/email/courier configuration, and database/provider E2E. Category/brand dropdowns currently load at most 100 active options each; larger catalogues need paginated option search.

Admin access: `/login` uses email/password, then `/admin` requires STAFF/ADMIN/SUPER_ADMIN. The repository does not seed a default admin username/password. Existing database users were not inspected; stored password hashes are not recoverable plaintext passwords.
