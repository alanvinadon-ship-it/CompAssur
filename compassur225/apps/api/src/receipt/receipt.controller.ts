import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ReceiptService } from './receipt.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Response } from 'express';
import * as path from 'path';

@ApiTags('Receipts')
@Controller('receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  // ─── Generate Receipt for a Payment ─────────────────────────────────

  @Post('generate/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a receipt for a paid payment' })
  async generate(@Param('paymentId') paymentId: string) {
    return this.receiptService.generateReceipt(paymentId);
  }

  // ─── Upload Offline Receipt ─────────────────────────────────────────

  @Post('upload/:paymentId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('super_admin', 'partner_manager', 'courtier_partenaire')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an offline receipt (PDF/image) for a payment' })
  async upload(
    @Param('paymentId') paymentId: string,
    @Body() body: { file_base64: string; file_name: string },
  ) {
    const buffer = Buffer.from(body.file_base64, 'base64');
    return this.receiptService.uploadReceipt(paymentId, buffer, body.file_name);
  }

  // ─── Get Receipts by Payment ────────────────────────────────────────

  @Get('payment/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List receipts for a payment' })
  async findByPayment(@Param('paymentId') paymentId: string) {
    return this.receiptService.findByPayment(paymentId);
  }

  // ─── Get Receipts by Subscription ──────────────────────────────────

  @Get('subscription/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List receipts for a subscription' })
  async findBySubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.receiptService.findBySubscription(subscriptionId);
  }

  // ─── Download Receipt File ─────────────────────────────────────────

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download receipt file' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const { filePath, fileName } = await this.receiptService.getReceiptFile(id);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  }

  // ─── Get Receipt by ID ─────────────────────────────────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get receipt details by ID' })
  async findById(@Param('id') id: string) {
    return this.receiptService.findById(id);
  }
}
