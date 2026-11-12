export interface CheckoutReview {
  addressId: string;
  productId: string;
  promotionCode: string;
  subtotal: string;
  discountAmount: string;
  amount: number;
  total: string;
  provider: string;
  token: string;
  expiresAt: string;
}
export interface CheckoutState { error?: string; orderId?: string; addressId?: string; addressSummary?: string; review?: CheckoutReview }

export function sameCheckoutReview(previous: CheckoutReview | undefined, next: CheckoutReview): boolean {
  return Boolean(previous && Date.parse(previous.expiresAt) > Date.now() &&
    previous.addressId === next.addressId && previous.productId === next.productId &&
    previous.promotionCode === next.promotionCode && previous.subtotal === next.subtotal &&
    previous.discountAmount === next.discountAmount && previous.amount === next.amount &&
    previous.provider === next.provider && previous.total === next.total);
}
