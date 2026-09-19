import { ConfigService } from '@nestjs/config';
import { MidtransClient } from './midtrans.client';

describe('Midtrans provider boundary', () => {
  const original = global.fetch;
  const client = new MidtransClient(
    new ConfigService({ MIDTRANS_SERVER_KEY: 'test-key' }),
  );
  afterEach(() => {
    global.fetch = original;
  });
  function respond(body: unknown, status = 200) {
    const fetcher = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(body), { status }));
    global.fetch = fetcher;
    return fetcher;
  }
  it('treats a status 404 as unknown, not proof of cancelled Snap', async () => {
    respond({ status_code: '404' }, 404);
    expect(await client.request('order', 'status')).toBeNull();
  });
  it('accepts provider-confirmed expiry status code 407', async () => {
    respond({
      order_id: 'order',
      transaction_id: 't',
      gross_amount: '100.00',
      transaction_status: 'expire',
      status_code: '407',
    });
    expect((await client.request('order', 'status'))?.transaction_status).toBe(
      'expire',
    );
  });
  it('rejects status belonging to another order', async () => {
    respond({
      order_id: 'other',
      transaction_id: 't',
      gross_amount: '100.00',
      transaction_status: 'settlement',
      status_code: '200',
    });
    await expect(client.request('order', 'status')).rejects.toThrow();
  });
  it('cancels only a known Snap token using the provider credential contract', async () => {
    const fetcher = respond({ canceled_at: new Date().toISOString() });
    await client.cancelSnap('known-token');
    const [url, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://app.sandbox.midtrans.com/snap/v1/transactions/known-token/cancel',
    );
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('Authorization')).toBe('test-key');
  });
  it('does not accept in-progress/not-found sessions as cancelled', async () => {
    respond({ error_messages: ['Transaction is on progress'] }, 400);
    await expect(client.cancelSnap('known-token')).rejects.toThrow();
  });
});
