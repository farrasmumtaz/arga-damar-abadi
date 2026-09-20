-- Application traffic goes through NestJS. Block direct Supabase Data API access
-- unless explicit least-privilege policies are introduced later.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users','refresh_tokens','account_tokens','addresses','carts','cart_items',
    'categories','brands','products','product_images','inventories','stock_movements',
    'orders','order_items','order_status_histories','order_allocations','payments',
    'refund_requests','quotations','quotation_items','audit_logs','media_assets',
    'notifications','promotions','promotion_redemptions','suppliers','purchase_orders',
    'purchase_order_items','warehouses','warehouse_stocks','warehouse_transfers'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
      END IF;
    END IF;
  END LOOP;
END $$;
