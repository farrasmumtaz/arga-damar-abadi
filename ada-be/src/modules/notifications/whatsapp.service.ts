import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  constructor(private readonly config: ConfigService) {}
  async send(phone: string, subject: string, body: string): Promise<void> {
    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const sender = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const template = this.config.get<string>('WHATSAPP_TEMPLATE_NAME');
    const version = this.config.get<string>('WHATSAPP_GRAPH_VERSION');
    if (
      !this.config.get<boolean>('WHATSAPP_ENABLED', false) ||
      !token ||
      !sender ||
      !template ||
      !version
    )
      throw new ServiceUnavailableException('WhatsApp is not configured');
    const recipient = phone.replace(/^\+/, '');
    if (!/^62\d{8,13}$/.test(recipient))
      throw new BadGatewayException(
        'WhatsApp requires an Indonesian E.164 phone number',
      );
    const response = await fetch(
      `https://graph.facebook.com/${version}/${sender}/messages`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'template',
          template: {
            name: template,
            language: {
              code: this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE', 'id'),
            },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: subject },
                  { type: 'text', text: body },
                ],
              },
            ],
          },
        }),
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    if (
      !response.ok ||
      !payload ||
      typeof payload !== 'object' ||
      !('messages' in payload) ||
      !Array.isArray(payload.messages) ||
      !payload.messages.length
    )
      throw new BadGatewayException('WhatsApp provider rejected delivery');
  }
}
