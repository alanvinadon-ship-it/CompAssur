import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupervisionService } from './supervision.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupervisionAuditInterceptor } from './interceptors/supervision-audit.interceptor';
import type { SupervisionFiltersDto, FlagCaseDto, ResolveFlagDto } from './dto';

const SUPERVISION_ROLES = [
  'super_admin',
  'regulator_viewer',
  'regulator_auditor',
  'regulator_case_inspector',
  'asaci_observer',
  'asaci_audit',
];

@ApiTags('Supervision')
@ApiBearerAuth()
@Controller('supervision')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(SupervisionAuditInterceptor)
export class SupervisionController {
  constructor(private readonly service: SupervisionService) {}

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  @Get('kpis')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Get market KPIs (aggregated)' })
  async getKpis(@Query() filters: SupervisionFiltersDto) {
    return this.service.getKpis(filters);
  }

  // ─── Funnel ───────────────────────────────────────────────────────────────

  @Get('funnel')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Get conversion funnel by product/zone/insurer' })
  async getFunnel(@Query() filters: SupervisionFiltersDto) {
    return this.service.getFunnel(filters);
  }

  // ─── SLA ──────────────────────────────────────────────────────────────────

  @Get('sla')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Get SLA metrics and breach summary' })
  async getSla(@Query() filters: SupervisionFiltersDto) {
    return this.service.getSla(filters);
  }

  // ─── Plans Health ─────────────────────────────────────────────────────────

  @Get('plans/health')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Get plans health scores and issues' })
  async getPlansHealth(@Query('insurerId') insurerId?: string) {
    return this.service.getPlansHealth(insurerId);
  }

  // ─── Anomalies ────────────────────────────────────────────────────────────

  @Get('anomalies')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Detect and list anomalies/signals' })
  async getAnomalies(@Query() filters: SupervisionFiltersDto) {
    return this.service.getAnomalies(filters);
  }

  // ─── Case Flagging ────────────────────────────────────────────────────────

  @Post('cases/:id/flag')
  @Roles('super_admin', 'regulator_auditor', 'regulator_case_inspector', 'asaci_audit')
  @ApiOperation({ summary: 'Flag a case for investigation (reason required)' })
  async flagCase(
    @Param('id') caseId: string,
    @Body() dto: FlagCaseDto,
    @Request() req: any,
  ) {
    return this.service.flagCase(caseId, dto, req.user.sub);
  }

  @Post('flags/:id/resolve')
  @Roles('super_admin', 'regulator_auditor', 'asaci_audit')
  @ApiOperation({ summary: 'Resolve or dismiss a flag' })
  async resolveFlag(
    @Param('id') flagId: string,
    @Body() dto: ResolveFlagDto,
    @Request() req: any,
  ) {
    return this.service.resolveFlag(flagId, dto.status, req.user.sub);
  }

  @Get('flags')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'List supervision flags' })
  async getFlags(
    @Query('status') status?: string,
    @Query('flag_type') flagType?: string,
  ) {
    return this.service.getFlags({ status, flag_type: flagType });
  }
}
