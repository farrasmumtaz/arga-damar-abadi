import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API availability' })
  check(): HealthResponse {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
