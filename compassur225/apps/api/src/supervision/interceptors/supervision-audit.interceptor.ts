import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Interceptor that automatically logs all supervision actions to SupervisionAuditLog.
 * Applied to all supervision controllers.
 */
@Injectable()
export class SupervisionAuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const reason = request.headers['x-supervision-reason'] || request.body?.reason;

    return next.handle().pipe(
      tap(async () => {
        try {
          const action = this.deriveAction(method, url);
          const resourceType = this.deriveResourceType(url);

          await this.prisma.supervisionAuditLog.create({
            data: {
              actor_id: user?.sub || 'anonymous',
              action,
              resource_type: resourceType,
              resource_id: this.extractResourceId(url),
              reason: reason || null,
              ip_address: request.ip || request.connection?.remoteAddress,
              user_agent: request.headers['user-agent'],
              details: {
                method,
                url,
                query: request.query,
                status: 'success',
              },
            },
          });
        } catch (e) {
          // Audit logging should never break the request
          console.error('Supervision audit log error:', e.message);
        }
      }),
    );
  }

  private deriveAction(method: string, url: string): string {
    if (url.includes('/exports')) return 'export';
    if (url.includes('/unmask') || url.includes('/pii')) return 'unmask_pii';
    if (url.includes('/attestations/verify')) return 'verify_attestation';
    if (url.includes('/flag')) return 'flag_case';
    if (url.includes('/complaints') && method === 'POST') return 'create_complaint';
    if (url.includes('/complaints')) return 'view_complaints';
    if (url.includes('/kpis')) return 'view_kpi';
    if (url.includes('/funnel')) return 'view_funnel';
    if (url.includes('/sla')) return 'view_sla';
    if (url.includes('/plans/health')) return 'view_plans_health';
    if (url.includes('/anomalies')) return 'view_anomalies';
    return `${method.toLowerCase()}_supervision`;
  }

  private deriveResourceType(url: string): string {
    if (url.includes('/complaints')) return 'complaint';
    if (url.includes('/attestations')) return 'attestation';
    if (url.includes('/exports')) return 'export';
    if (url.includes('/flag')) return 'case';
    if (url.includes('/plans')) return 'plan';
    if (url.includes('/anomalies')) return 'anomaly';
    return 'supervision';
  }

  private extractResourceId(url: string): string | null {
    const parts = url.split('/');
    // Look for UUID-like segments
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const part of parts) {
      if (uuidRegex.test(part)) return part;
    }
    return null;
  }
}
