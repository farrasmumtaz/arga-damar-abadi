import { BadRequestException } from '@nestjs/common';
import { MidtransWebhookPipe } from './midtrans-webhook.pipe';
describe('Midtrans notification validation', () => {
  it('accepts provider extra fields while stripping them', async () => {
    const result = await new MidtransWebhookPipe().transform({
      order_id: 'ADA-1',
      status_code: '200',
      gross_amount: '100',
      signature_key: 'a'.repeat(128),
      transaction_id: 'tx',
      transaction_status: 'pending',
      bank: 'bca',
      masked_card: 'redacted',
    });
    expect(result.order_id).toBe('ADA-1');
    expect(result).not.toHaveProperty('masked_card');
  });
  it('rejects missing signature', async () => {
    await expect(
      new MidtransWebhookPipe().transform({ order_id: 'ADA-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
