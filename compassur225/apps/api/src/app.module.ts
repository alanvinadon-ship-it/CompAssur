import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { QuoteModule } from './quote/quote.module';
import { LeadModule } from './lead/lead.module';
import { CaseModule } from './case/case.module';
import { StorageModule } from './storage/storage.module';
import { AssignmentModule } from './assignment/assignment.module';
import { InteractionModule } from './interaction/interaction.module';
import { DocumentModule } from './document/document.module';
import { ConsentModule } from './consent/consent.module';
import { AuditModule } from './audit/audit.module';
import { CommissionModule } from './commission/commission.module';
import { AiModule } from './ai/ai.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ImportPipelineModule } from './import-pipeline/import-pipeline.module';
import { DatasetVersionModule } from './dataset-version/dataset-version.module';
import { CoverageHealthModule } from './coverage-health/coverage-health.module';
import { ReportingModule } from './reporting/reporting.module';
import { XlsxImportModule } from './xlsx-import/xlsx-import.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SlaModule } from './sla/sla.module';
import { FeatureFlagModule } from './feature-flag/feature-flag.module';
import { IaQualityModule } from './ia-quality/ia-quality.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PaymentModule } from './payment/payment.module';
import { ReceiptModule } from './receipt/receipt.module';
import { SupervisionModule } from './supervision/supervision.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretjwtkey',
      signOptions: { expiresIn: '24h' },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CatalogModule,
    QuoteModule,
    LeadModule,
    CaseModule,
    StorageModule,
    AssignmentModule,
    InteractionModule,
    DocumentModule,
    ConsentModule,
    AuditModule,
    CommissionModule,
    AiModule,
    MonitoringModule,
    // V1-06 modules
    ImportPipelineModule,
    DatasetVersionModule,
    CoverageHealthModule,
    ReportingModule,
    // V1-07 module
    XlsxImportModule,
    // V1-08 modules
    AnalyticsModule,
    SlaModule,
    FeatureFlagModule,
    IaQualityModule,
    // V1-09 modules
    SubscriptionModule,
    PaymentModule,
    ReceiptModule,
    // V1-10 module
    SupervisionModule,
  ],
})
export class AppModule {}
