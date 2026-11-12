export function cartIntentProduct(returnTo: string, productId?: string): string | undefined {
  return returnTo === '/cart' && productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)
    ? productId : undefined;
}
