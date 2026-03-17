import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MockPaymentProvider } from './providers/mock.provider';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { MtnMomoProvider } from './providers/mtn-momo.provider';
import { MoovMoneyProvider } from './providers/moov-money.provider';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    MockPaymentProvider,
    OrangeMoneyProvider,
    MtnMomoProvider,
    MoovMoneyProvider,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
