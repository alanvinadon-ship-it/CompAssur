import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComplaintService } from './complaint.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupervisionAuditInterceptor } from './interceptors/supervision-audit.interceptor';
import type { CreateComplaintDto, UpdateComplaintDto } from './dto';

const SUPERVISION_ROLES = [
  'super_admin',
  'regulator_viewer',
  'regulator_auditor',
  'regulator_case_inspector',
  'asaci_observer',
  'asaci_audit',
];

@ApiTags('Supervision - Complaints')
@ApiBearerAuth()
@Controller('supervision/complaints')
@UseGuards(JwtAuthGuard, RbacGuard)
@UseInterceptors(SupervisionAuditInterceptor)
export class ComplaintController {
  constructor(private readonly service: ComplaintService) {}

  @Post()
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Create a new complaint' })
  async create(@Body() dto: CreateComplaintDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'List complaints with filters' })
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('insurer_id') insurerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      category,
      insurer_id: insurerId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Get complaint statistics' })
  async getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @Roles(...SUPERVISION_ROLES)
  @ApiOperation({ summary: 'Get complaint details (PII masked)' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('super_admin', 'regulator_auditor', 'asaci_audit')
  @ApiOperation({ summary: 'Update complaint status/assignment' })
  async update(@Param('id') id: string, @Body() dto: UpdateComplaintDto) {
    return this.service.updateStatus(id, dto);
  }
}
