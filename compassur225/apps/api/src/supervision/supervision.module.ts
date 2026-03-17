import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { SupervisionService } from './supervision.service';
import { ComplaintService } from './complaint.service';
import { AttestationService } from './attestation.service';
import { ExportService } from './export.service';
import { PiiMaskingService } from './pii-masking.service';

// Controllers
import { SupervisionController } from './supervision.controller';
import { ComplaintController } from './complaint.controller';
import { AttestationController } from './attestation.controller';
import { ExportController } from './export.controller';

// Interceptors
import { SupervisionAuditInterceptor } from './interceptors/supervision-audit.interceptor';

@Module({
  imports: [
    PrismaModule,
    // Rate limiting for sensitive supervision endpoints
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute window
      limit: 30,  // 30 requests per minute for supervision endpoints
    }]),
  ],
  controllers: [
    SupervisionController,
    ComplaintController,
    AttestationController,
    ExportController,
  ],
  providers: [
    SupervisionService,
    ComplaintService,
    AttestationService,
    ExportService,
    PiiMaskingService,
    SupervisionAuditInterceptor,
  ],
  exports: [
    SupervisionService,
    PiiMaskingService,
  ],
})
export class SupervisionModule {}
