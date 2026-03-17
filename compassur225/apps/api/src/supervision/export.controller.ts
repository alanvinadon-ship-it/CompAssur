import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';
import { PiiMaskingService } from './pii-masking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupervisionAuditInterceptor } from './interceptors/supervision-audit.interceptor';
import type { RequestExportDto, UnmaskPiiDto } from './dto';
import type { Response } from 'express';
import * as fs from 'fs';

const EXPORT_ROLES = ['super_admin', 'regulator_auditor', 'asaci_audit'];

@ApiTags('Supervision - Exports & PII')
@ApiBearerAuth()
@Controller('supervision')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(SupervisionAuditInterceptor)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly prisma: PrismaService,
    private readonly piiMasking: PiiMaskingService,
  ) {}

  // ─── Exports ──────────────────────────────────────────────────────────────

  @Post('exports')
  @Roles(...EXPORT_ROLES)
  @ApiOperation({ summary: 'Generate an export (CSV) with hash and audit' })
  async generateExport(@Body() dto: RequestExportDto, @Request() req: any) {
    return this.exportService.generateExport(
      dto.export_type,
      dto.format || 'csv',
      dto.filters || {},
      req.user.sub,
    );
  }

  @Get('exports')
  @Roles(...EXPORT_ROLES)
  @ApiOperation({ summary: 'List export registry' })
  async listExports(
    @Query('export_type') exportType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.exportService.listExports({
      export_type: exportType,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('exports/:id/download')
  @Roles(...EXPORT_ROLES)
  @ApiOperation({ summary: 'Download an export file' })
  async downloadExport(@Param('id') id: string, @Res() res: Response) {
    try {
      const { filePath, fileName, hash } = await this.exportService.getExportFile(id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-File-Hash', hash || '');
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (e) {
      throw new NotFoundException(e.message);
    }
  }

  // ─── PII Unmask ───────────────────────────────────────────────────────────

  @Post('pii/unmask')
  @Roles('super_admin', 'regulator_case_inspector')
  @ApiOperation({
    summary: 'Unmask PII for a specific resource (reason required, audit logged)',
  })
  async unmaskPii(@Body() dto: UnmaskPiiDto, @Request() req: any) {
    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new NotFoundException(
        'Une justification détaillée (min. 10 caractères) est requise pour accéder aux données personnelles.',
      );
    }

    // Log the PII access in supervision audit
    await this.prisma.supervisionAuditLog.create({
      data: {
        actor_id: req.user.sub,
        action: 'unmask_pii',
        resource_type: dto.resource_type,
        resource_id: dto.resource_id,
        reason: dto.reason,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        details: { unmasked_fields: 'all' },
      },
    });

    // Fetch unmasked data based on resource type
    switch (dto.resource_type) {
      case 'complaint': {
        const complaint = await this.prisma.complaint.findUnique({
          where: { id: dto.resource_id },
        });
        if (!complaint) throw new NotFoundException('Réclamation introuvable');
        return complaint; // Return unmasked
      }
      case 'case': {
        const caseFile = await this.prisma.caseFile.findUnique({
          where: { id: dto.resource_id },
        });
        if (!caseFile) throw new NotFoundException('Dossier introuvable');
        return caseFile; // Return unmasked
      }
      case 'attestation': {
        const check = await this.prisma.attestationCheck.findUnique({
          where: { id: dto.resource_id },
        });
        if (!check) throw new NotFoundException('Vérification introuvable');
        return check; // Return unmasked
      }
      default:
        throw new NotFoundException(`Type de ressource inconnu: ${dto.resource_type}`);
    }
  }

  // ─── Audit Log ────────────────────────────────────────────────────────────

  @Get('audit-log')
  @Roles(...EXPORT_ROLES)
  @ApiOperation({ summary: 'View supervision audit log' })
  async getAuditLog(
    @Query('action') action?: string,
    @Query('actor_id') actorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 50;

    const where: any = {};
    if (action) where.action = action;
    if (actorId) where.actor_id = actorId;

    const [logs, total] = await Promise.all([
      this.prisma.supervisionAuditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.supervisionAuditLog.count({ where }),
    ]);

    return { data: logs, total, page: p, limit: l };
  }
}
