import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';

@Injectable()
export class ClamavService {
  constructor(private readonly config: ConfigService) {}
  async scan(bytes: Buffer): Promise<void> {
    const host = this.config.get<string>('CLAMAV_HOST');
    if (!host)
      throw new ServiceUnavailableException('File scanner is not configured');
    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({
        host,
        port: this.config.get<number>('CLAMAV_PORT', 3310),
      });
      let response = '';
      let finished = false;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        socket.destroy();
        if (error) reject(error);
        else resolve();
      };
      socket.setTimeout(20_000, () =>
        finish(new ServiceUnavailableException('File scanner timed out')),
      );
      socket.on('error', () =>
        finish(new ServiceUnavailableException('File scanner unavailable')),
      );
      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        for (let offset = 0; offset < bytes.length; offset += 65536) {
          const chunk = bytes.subarray(offset, offset + 65536);
          const length = Buffer.alloc(4);
          length.writeUInt32BE(chunk.length);
          socket.write(length);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
      });
      socket.on('data', (chunk: Buffer) => {
        response += chunk.toString('utf8');
        if (response.length > 2048)
          return finish(
            new ServiceUnavailableException('Invalid scanner response'),
          );
        if (!response.includes('\0')) return;
        if (response.trim().replace(/\0/g, '') === 'stream: OK') finish();
        else if (response.includes(' FOUND'))
          finish(
            new BadRequestException('File ditolak oleh pemeriksaan keamanan'),
          );
        else
          finish(
            new ServiceUnavailableException('File scan could not be completed'),
          );
      });
      socket.on('close', () => {
        if (!finished)
          finish(new ServiceUnavailableException('Incomplete file scan'));
      });
    });
  }
}
