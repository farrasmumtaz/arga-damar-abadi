import {
  BadGatewayException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MidtransStatus {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  gross_amount: string;
  status_code: string;
  fraud_status?: string;
  payment_type?: string;
}

@Injectable()
export class MidtransClient {
  constructor(private readonly config: ConfigService) {}

  async request(
    orderNumber: string,
    action: 'status' | 'expire' | 'refund',
    body?: { refund_key: string; amount: number; reason: string },
  ): Promise<MidtransStatus | null> {
    const key = this.config.get<string>('MIDTRANS_SERVER_KEY');
    if (!key) throw new ConflictException('Midtrans is not configured');
    const base = this.config.get<boolean>('MIDTRANS_IS_PRODUCTION')
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
    let response: Response;
    try {
      response = await fetch(
        `${base}/v2/${encodeURIComponent(orderNumber)}/${action}`,
        {
          method: action === 'status' ? 'GET' : 'POST',
          signal: AbortSignal.timeout(15_000),
          headers: {
            Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
    } catch {
      throw new BadGatewayException('Midtrans is temporarily unavailable');
    }
    const value: unknown = await response.json().catch(() => null);
    if (
      action === 'status' &&
      value &&
      typeof value === 'object' &&
      'status_code' in value &&
      value.status_code === '404'
    )
      return null;
    if (
      !response.ok ||
      !value ||
      typeof value !== 'object' ||
      !('order_id' in value) ||
      value.order_id !== orderNumber ||
      !('transaction_status' in value) ||
      typeof value.transaction_status !== 'string' ||
      !('gross_amount' in value) ||
      typeof value.gross_amount !== 'string' ||
      !/^\d+(\.\d{1,2})?$/.test(value.gross_amount) ||
      !('transaction_id' in value) ||
      typeof value.transaction_id !== 'string' ||
      !('status_code' in value) ||
      typeof value.status_code !== 'string' ||
      !value.status_code.startsWith('2')
    ) {
      throw new BadGatewayException('Midtrans response could not be confirmed');
    }
    return {
      order_id: value.order_id,
      transaction_id: value.transaction_id,
      transaction_status: value.transaction_status,
      gross_amount: value.gross_amount,
      status_code: value.status_code,
      payment_type:
        'payment_type' in value && typeof value.payment_type === 'string'
          ? value.payment_type
          : undefined,
      fraud_status:
        'fraud_status' in value && typeof value.fraud_status === 'string'
          ? value.fraud_status
          : undefined,
    };
  }
}
