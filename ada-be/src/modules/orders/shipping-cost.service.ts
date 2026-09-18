import {
  BadGatewayException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface RateClaims {
  userId: string;
  addressId: string;
  postalCode: string;
  weight: number;
  value: string;
  amount: number;
  provider: string;
  expires: number;
}
export interface ShippingRate {
  amount: number;
  provider: string;
}

@Injectable()
export class ShippingCostService {
  constructor(private readonly config: ConfigService) {}

  calculate(totalWeightGram: number): number {
    const baseCost = this.config.get<number>('SHIPPING_BASE_COST', 20_000);
    const perKgCost = this.config.get<number>('SHIPPING_PER_KG_COST', 5_000);
    const billableKg = Math.max(1, Math.ceil(totalWeightGram / 1_000));
    return baseCost + Math.max(0, billableKg - 1) * perKgCost;
  }

  async quote(
    weight: number,
    value: string,
    userId: string,
    addressId: string,
    postalCode: string,
  ) {
    let rate: ShippingRate = {
      amount: this.calculate(weight),
      provider: 'INTERNAL',
    };
    if (
      this.config.get<string>('SHIPPING_PROVIDER', 'INTERNAL') === 'BITESHIP'
    ) {
      const key = this.config.get<string>('BITESHIP_API_KEY');
      const origin = this.config.get<string>('SHIPPING_ORIGIN_POSTAL_CODE');
      if (!key || !origin)
        throw new ServiceUnavailableException(
          'Layanan pengiriman belum dikonfigurasi',
        );
      if (!/^\d{5}$/.test(postalCode))
        throw new ConflictException('Kode pos harus terdiri dari 5 angka');
      let payload: unknown;
      try {
        const response = await fetch(
          'https://api.biteship.com/v1/rates/couriers',
          {
            method: 'POST',
            signal: AbortSignal.timeout(10_000),
            headers: { Authorization: key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin_postal_code: Number(origin),
              destination_postal_code: Number(postalCode),
              couriers: this.config.get<string>('BITESHIP_COURIERS', 'jne'),
              items: [
                {
                  name: 'Material dan peralatan',
                  value: Number(value),
                  quantity: 1,
                  weight: Math.max(1, weight),
                },
              ],
            }),
          },
        );
        if (!response.ok) throw new Error('provider');
        payload = await response.json();
      } catch {
        throw new BadGatewayException(
          'Tarif kurir belum dapat diambil. Coba kembali.',
        );
      }
      const pricing: unknown =
        payload && typeof payload === 'object' && 'pricing' in payload
          ? payload.pricing
          : null;
      const rates: ShippingRate[] = [];
      if (Array.isArray(pricing))
        for (const row of pricing as unknown[]) {
          if (
            !row ||
            typeof row !== 'object' ||
            !('currency' in row) ||
            row.currency !== 'IDR' ||
            !('price' in row) ||
            typeof row.price !== 'number' ||
            !Number.isSafeInteger(row.price) ||
            row.price < 0 ||
            !('courier_code' in row) ||
            typeof row.courier_code !== 'string' ||
            !('courier_service_code' in row) ||
            typeof row.courier_service_code !== 'string'
          )
            continue;
          const provider = `${row.courier_code}:${row.courier_service_code}`;
          if (
            /^[a-z0-9_-]+:[a-z0-9_-]+$/.test(provider) &&
            provider.length <= 80
          )
            rates.push({ amount: row.price, provider });
        }
      rates.sort(
        (a, b) => a.amount - b.amount || a.provider.localeCompare(b.provider),
      );
      if (!rates[0])
        throw new ConflictException('Tidak ada layanan kurir untuk alamat ini');
      rate = rates[0];
    }
    const claims: RateClaims = {
      userId,
      addressId,
      postalCode,
      weight,
      value,
      ...rate,
      expires: Date.now() + 600_000,
    };
    const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return {
      ...rate,
      token: `${body}.${this.sign(body).toString('base64url')}`,
      expiresAt: new Date(claims.expires).toISOString(),
    };
  }

  resolve(
    weight: number,
    value: string,
    userId: string,
    addressId: string,
    postalCode: string,
    token?: string,
  ): ShippingRate {
    if (this.config.get<string>('SHIPPING_PROVIDER', 'INTERNAL') === 'INTERNAL')
      return { amount: this.calculate(weight), provider: 'INTERNAL' };
    const invalid = () =>
      new ConflictException(
        'Periksa ulang ongkir sebelum melanjutkan; estimasi tidak ada, berubah, atau kedaluwarsa',
      );
    if (!token || token.length > 2048) throw invalid();
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra) throw invalid();
    const expected = this.sign(body);
    const received = Buffer.from(signature, 'base64url');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    )
      throw invalid();
    let claims: RateClaims;
    try {
      claims = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as RateClaims;
    } catch {
      throw invalid();
    }
    if (
      claims.userId !== userId ||
      claims.addressId !== addressId ||
      claims.postalCode !== postalCode ||
      claims.weight !== weight ||
      claims.value !== value ||
      claims.expires <= Date.now() ||
      !Number.isSafeInteger(claims.amount) ||
      claims.amount < 0
    )
      throw invalid();
    return { amount: claims.amount, provider: claims.provider };
  }

  private sign(body: string): Buffer {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    )
      .update(`shipping-rate:v1:${body}`)
      .digest();
  }
}
