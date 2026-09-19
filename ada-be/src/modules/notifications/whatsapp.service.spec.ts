import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
describe('WhatsApp adapter', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  const config = {
    WHATSAPP_ENABLED: true,
    WHATSAPP_ACCESS_TOKEN: 'test',
    WHATSAPP_PHONE_NUMBER_ID: '123',
    WHATSAPP_TEMPLATE_NAME: 'transaction_update',
    WHATSAPP_GRAPH_VERSION: 'v23.0',
  };
  it('never sends when configuration is incomplete', async () => {
    const fetcher = jest.fn();
    global.fetch = fetcher;
    await expect(
      new WhatsappService(new ConfigService()).send(
        '+628123456789',
        'order',
        'paid',
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses approved template structure and no URL supplied by customer', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), {
        status: 200,
      }),
    );
    global.fetch = fetcher;
    await new WhatsappService(new ConfigService(config)).send(
      '+628123456789',
      'Order ADA',
      'Paid',
    );
    const [url, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v23.0/123/messages');
    expect(typeof options.body).toBe('string');
    expect(options.body).toContain('628123456789');
    expect(options.body).toContain('transaction_update');
  });
});
