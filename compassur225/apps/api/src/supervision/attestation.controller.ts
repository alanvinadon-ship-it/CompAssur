import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttestationService } from './attestation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupervisionAuditInterceptor } from './interceptors/supervision-audit.interceptor';
import type { VerifyAttestationDto } from './dto';

const SUPERVISION_ROLES = [
  'super_admin',
  'regulator_viewer',
  'regulator_auditor',
  'regulator_case_inspector',
  'asaci_observer',
  'asaci_audit',
];

@ApiTags('Supervision - Attestations')
@ApiBearerAuth()
@Controller('supervision/attestations')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(SupervisionAuditInterceptor)
export class AttestationController {
  constructor(private readonly service: AttestationService) {}

  @Post('verify')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Verify an attestation (stub/connector)' })
  async verify(@Body() dto: VerifyAttestationDto, @Request() req: any) {
    return this.service.verify(dto, req.user.sub);
  }

  @Get('history')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Get attestation verification history' })
  async getHistory(
    @Query('result') result?: string,
    @Query('insurer_id') insurerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getHistory({
      result,
      insurer_id: insurerId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('anomalies')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Get attestation anomalies (invalid/not_found)' })
  async getAnomalies() {
    return this.service.getAnomalies();
  }
}
