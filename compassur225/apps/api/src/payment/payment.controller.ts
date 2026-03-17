import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { InitiatePaymentDto, CreateScheduleDto } from './dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── Initiate Payment ───────────────────────────────────────────────

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a payment for a subscription' })
  async initiate(@Body() dto: InitiatePaymentDto) {
    return this.paymentService.initiate(dto);
  }

  // ─── Provider Callback (no auth – called by payment provider) ──────

  @Post('callback/:provider')
  @ApiOperation({ summary: 'Payment provider callback webhook' })
  async callback(
    @Param('provider') provider: string,
    @Body() body: Record<string, any>,
  ) {
    return this.paymentService.handleCallback(provider, body);
  }

  // ─── Mock Simulate (dev only) ──────────────────────────────────────

  @Post(':id/simulate')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('super_admin', 'partner_manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEV] Simulate mock payment callback (PAID or FAILED)' })
  async simulate(
    @Param('id') id: string,
    @Body() body: { status: 'PAID' | 'FAILED' },
  ) {
    return this.paymentService.simulateMockCallback(id, body.status);
  }

  // ─── Query Status ──────────────────────────────────────────────────

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query current payment status (checks provider if pending)' })
  async queryStatus(@Param('id') id: string) {
    return this.paymentService.queryStatus(id);
  }

  // ─── Get Payment by ID ─────────────────────────────────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment details by ID' })
  async findById(@Param('id') id: string) {
    return this.paymentService.findById(id);
  }

  // ─── List Payments by Subscription ─────────────────────────────────

  @Get('subscription/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all payments for a subscription' })
  async findBySubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.paymentService.findBySubscription(subscriptionId);
  }

  // ─── Payment Schedules ─────────────────────────────────────────────

  @Post('schedules')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('super_admin', 'partner_manager', 'courtier_partenaire')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment schedule (installments) for a subscription' })
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.paymentService.createSchedule(dto);
  }

  @Get('schedules/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment schedule for a subscription' })
  async getSchedule(@Param('subscriptionId') subscriptionId: string) {
    return this.paymentService.getSchedule(subscriptionId);
  }

  @Put('schedules/:scheduleId/status')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('super_admin', 'partner_manager', 'courtier_partenaire')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update schedule installment status' })
  async updateScheduleStatus(
    @Param('scheduleId') scheduleId: string,
    @Body() body: { status: string },
  ) {
    return this.paymentService.updateScheduleStatus(scheduleId, body.status);
  }
}
