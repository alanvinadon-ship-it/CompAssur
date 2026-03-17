import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  PaymentProvider,
  InitiatePaymentRequest,
} from './providers/payment-provider.interface';
import { MockPaymentProvider } from './providers/mock.provider';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { MtnMomoProvider } from './providers/mtn-momo.provider';
import { MoovMoneyProvider } from './providers/moov-money.provider';
import type {
  InitiatePaymentDto,
  PaymentCallbackDto,
  CreateScheduleDto,
} from './dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private providers: Map<string, PaymentProvider> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly mockProvider: MockPaymentProvider,
    private readonly orangeProvider: OrangeMoneyProvider,
    private readonly mtnProvider: MtnMomoProvider,
    private readonly moovProvider: MoovMoneyProvider,
  ) {
    // Register all providers
    this.providers.set('mock', this.mockProvider);
    this.providers.set('orange_money', this.orangeProvider);
    this.providers.set('mtn_momo', this.mtnProvider);
    this.providers.set('moov_money', this.moovProvider);
  }

  private getProvider(name: string): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(
        `Unknown payment provider: ${name}. Available: ${[...this.providers.keys()].join(', ')}`,
      );
    }
    return provider;
  }

  // ─── Initiate Payment ───────────────────────────────────────────────

  async initiate(dto: InitiatePaymentDto) {
    // Verify subscription exists
    const sub = await this.subscriptionService.findById(dto.subscription_id);

    const providerName = dto.provider || process.env.PAYMENT_PROVIDER || 'mock';
    const provider = this.getProvider(providerName);

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        subscription_id: dto.subscription_id,
        case_id: sub.case_id,
        amount: dto.amount,
        currency: dto.currency || 'XOF',
        method: dto.method || 'mobile_money',
        provider: providerName,
        status: 'INITIATED',
      },
    });

    // Build callback URL
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const callbackUrl = `${baseUrl}/payments/callback/${providerName}`;

    const req: InitiatePaymentRequest = {
      payment_id: payment.id,
      amount: dto.amount,
      currency: dto.currency || 'XOF',
      payer_phone: dto.payer_phone,
      description: dto.description || `CompAssur225 – ${sub.product_name} – ${payment.id.slice(0, 8)}`,
      callback_url: callbackUrl,
      metadata: { subscription_id: dto.subscription_id, case_id: sub.case_id },
    };

    try {
      const result = await provider.initiate(req);

      // Update payment with provider reference
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          provider_ref: result.provider_ref,
          status: result.status,
        },
      });

      // Update subscription status to PAYMENT_PENDING if not already subscribed
      if (sub.status === 'PENDING') {
        await this.subscriptionService.updateStatus(sub.id, 'PAYMENT_PENDING');
      }

      return {
        payment: updated,
        provider_ref: result.provider_ref,
        redirect_url: result.redirect_url,
        status: result.status,
      };
    } catch (error) {
      // Mark payment as failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failure_reason: (error as Error).message },
      });
      throw error;
    }
  }

  // ─── Handle Callback ────────────────────────────────────────────────

  async handleCallback(providerName: string, body: Record<string, any>) {
    const provider = this.getProvider(providerName);
    const callback = provider.parseCallback(body);

    this.logger.log(
      `Payment callback from ${providerName}: ref=${callback.provider_ref} status=${callback.status}`,
    );

    // Find payment by provider_ref
    const payment = await this.prisma.payment.findFirst({
      where: { provider_ref: callback.provider_ref, provider: providerName },
    });

    if (!payment) {
      this.logger.warn(`No payment found for provider_ref=${callback.provider_ref}`);
      throw new NotFoundException(`Payment not found for ref: ${callback.provider_ref}`);
    }

    // Update payment status
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: callback.status,
        paid_at: callback.status === 'PAID' ? new Date() : undefined,
        failure_reason: callback.status === 'FAILED' ? JSON.stringify(callback.raw) : undefined,
      },
    });

    // If PAID, update subscription status
    if (callback.status === 'PAID') {
      await this.subscriptionService.updateStatus(payment.subscription_id, 'SUBSCRIBED');

      // Update matching schedule installment
      const schedule = await this.prisma.paymentSchedule.findFirst({
        where: {
          subscription_id: payment.subscription_id,
          status: { in: ['DUE', 'UPCOMING'] },
        },
        orderBy: { installment_num: 'asc' },
      });
      if (schedule) {
        await this.prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: { status: 'PAID', payment_id: payment.id },
        });
      }
    }

    return updated;
  }

  // ─── Mock Simulate ──────────────────────────────────────────────────

  async simulateMockCallback(paymentId: string, status: 'PAID' | 'FAILED') {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.provider !== 'mock') {
      throw new BadRequestException('Simulation only available for mock provider');
    }

    // Simulate via mock provider
    const mockProv = this.mockProvider;
    if (status === 'PAID') {
      mockProv.simulateSuccess(payment.provider_ref!);
    } else {
      mockProv.simulateFailure(payment.provider_ref!);
    }

    // Process as callback
    return this.handleCallback('mock', {
      provider_ref: payment.provider_ref,
      status,
    });
  }

  // ─── Query Status ───────────────────────────────────────────────────

  async queryStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    // If terminal status, return from DB
    if (['PAID', 'FAILED', 'CANCELLED'].includes(payment.status)) {
      return payment;
    }

    // Otherwise query provider
    try {
      const provider = this.getProvider(payment.provider);
      const result = await provider.queryStatus(payment.provider_ref!);

      if (result.status !== payment.status) {
        return this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: result.status,
            paid_at: result.status === 'PAID' ? new Date() : undefined,
          },
        });
      }
    } catch (e) {
      this.logger.warn(`Could not query provider for payment ${paymentId}: ${(e as Error).message}`);
    }

    return payment;
  }

  // ─── Find by ID ─────────────────────────────────────────────────────

  async findById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { receipts: true, subscription: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  // ─── List by subscription ───────────────────────────────────────────

  async findBySubscription(subscriptionId: string) {
    return this.prisma.payment.findMany({
      where: { subscription_id: subscriptionId },
      include: { receipts: true },
      orderBy: { created_at: 'desc' },
    });
  }

  // ─── Payment Schedules ──────────────────────────────────────────────

  async createSchedule(dto: CreateScheduleDto) {
    // Verify subscription
    await this.subscriptionService.findById(dto.subscription_id);

    const startDate = new Date(dto.start_date);
    const schedules: any[] = [];

    for (let i = 1; i <= dto.total_installments; i++) {
      const dueDate = new Date(startDate);
      switch (dto.frequency) {
        case 'monthly':
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          break;
        case 'quarterly':
          dueDate.setMonth(dueDate.getMonth() + (i - 1) * 3);
          break;
        case 'annual':
          dueDate.setFullYear(dueDate.getFullYear() + (i - 1));
          break;
      }

      schedules.push({
        subscription_id: dto.subscription_id,
        frequency: dto.frequency,
        installment_num: i,
        total_installments: dto.total_installments,
        amount: dto.amount_per_installment,
        currency: dto.currency || 'XOF',
        due_date: dueDate,
        status: i === 1 ? 'DUE' : 'UPCOMING',
      });
    }

    // Bulk create
    await this.prisma.paymentSchedule.createMany({ data: schedules });

    return this.prisma.paymentSchedule.findMany({
      where: { subscription_id: dto.subscription_id },
      orderBy: { installment_num: 'asc' },
    });
  }

  async getSchedule(subscriptionId: string) {
    return this.prisma.paymentSchedule.findMany({
      where: { subscription_id: subscriptionId },
      orderBy: { installment_num: 'asc' },
    });
  }

  async updateScheduleStatus(scheduleId: string, status: string) {
    return this.prisma.paymentSchedule.update({
      where: { id: scheduleId },
      data: { status },
    });
  }
}
