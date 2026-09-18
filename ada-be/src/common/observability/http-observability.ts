import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { mergeMap, Observable } from 'rxjs';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface ObservedRequest extends Request {
  requestId?: string;
  user?: { id: string };
}

const logger = new Logger('HTTP');
export function observeRequest(
  req: ObservedRequest,
  res: Response,
  next: NextFunction,
): void {
  // Generate our own identifier so callers cannot inject arbitrary log content.
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  const started = Date.now();
  res.on('finish', () => {
    const entry = {
      event: 'http_request',
      requestId: req.requestId,
      method: req.method,
      route: (req.route as { path?: string } | undefined)?.path ?? 'unmatched',
      status: res.statusCode,
      durationMs: Date.now() - started,
    };
    if (res.statusCode >= 500) logger.error(entry);
    else logger.log(entry);
  });
  next();
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<ObservedRequest>();
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) || !req.user)
      return next.handle();
    const actorId = req.user.id;
    const route =
      (req.route as { path?: string } | undefined)?.path ?? 'unknown';
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              actorId,
              action: `${req.method} ${route}`.slice(0, 100),
              entityType: context.getClass().name.slice(0, 80),
              entityId:
                Object.values(req.params)[0]?.toString().slice(0, 100) ?? null,
              metadata: { requestId: req.requestId ?? '', outcome: 'success' },
            },
          });
        } catch {
          // Do not ask clients to replay a committed business mutation if audit persistence fails.
          this.logger.error({
            event: 'audit_write_failed',
            requestId: req.requestId,
            actorId,
            route,
          });
        }
        return result;
      }),
    );
  }
}
