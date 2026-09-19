import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
@SkipThrottle()
export class ReadinessController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('ready')
  async ready(): Promise<{ status: 'ready' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }
}
