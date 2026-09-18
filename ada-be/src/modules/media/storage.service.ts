import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}
  base(): string {
    const url = this.config.get<string>('SUPABASE_URL');
    if (!url || !this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY'))
      throw new ServiceUnavailableException('Storage is not configured');
    return `${url.replace(/\/$/, '')}/storage/v1`;
  }
  private headers(): Record<string, string> {
    const key = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    return { Authorization: `Bearer ${key}`, apikey: key };
  }
  path(bucket: string, key: string): string {
    return `${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  publicUrl(bucket: string, key: string): string {
    return `${this.base()}/object/public/${this.path(bucket, key)}`;
  }
  async upload(
    bucket: string,
    key: string,
    bytes: Buffer,
    contentType: string,
  ): Promise<void> {
    const response = await fetch(
      `${this.base()}/object/${this.path(bucket, key)}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
        headers: {
          ...this.headers(),
          'Content-Type': contentType,
          'x-upsert': 'false',
          'cache-control': '3600',
        },
        body: new Uint8Array(bytes),
      },
    );
    if (!response.ok) throw new BadGatewayException('Storage upload failed');
  }
  async remove(bucket: string, key: string): Promise<void> {
    const response = await fetch(
      `${this.base()}/object/${encodeURIComponent(bucket)}`,
      {
        method: 'DELETE',
        signal: AbortSignal.timeout(15_000),
        headers: { ...this.headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [key] }),
      },
    );
    if (!response.ok) throw new BadGatewayException('Storage deletion failed');
  }
  async signedUrl(bucket: string, key: string): Promise<string> {
    const response = await fetch(
      `${this.base()}/object/sign/${this.path(bucket, key)}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: { ...this.headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 300 }),
      },
    );
    const value: unknown = await response.json();
    if (
      !response.ok ||
      !value ||
      typeof value !== 'object' ||
      !('signedURL' in value) ||
      typeof value.signedURL !== 'string' ||
      !value.signedURL.startsWith('/object/sign/')
    )
      throw new BadGatewayException('Signed URL unavailable');
    return `${this.base()}${value.signedURL}`;
  }
}
