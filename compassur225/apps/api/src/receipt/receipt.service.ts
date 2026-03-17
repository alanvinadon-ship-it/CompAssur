import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);
  private readonly storageDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.storageDir = process.env.STORAGE_DIR || './storage';
    // Ensure receipts directory exists
    const receiptsDir = path.join(this.storageDir, 'receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }
  }

  // ─── Generate Receipt Number ────────────────────────────────────────

  private generateReceiptNumber(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `REC-${y}${m}${d}-${rand}`;
  }

  // ─── Generate PDF Receipt ──────────────────────────────────────────

  async generateReceipt(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    // Check if receipt already exists
    const existing = await this.prisma.receipt.findFirst({
      where: { payment_id: paymentId, type: 'generated' },
    });
    if (existing) return existing;

    const receiptNumber = this.generateReceiptNumber();
    const fileName = `${receiptNumber}.txt`; // Plain text receipt (PDF would need fpdf2 via Python)
    const filePath = path.join(this.storageDir, 'receipts', fileName);

    // Generate receipt content
    const sub = payment.subscription;
    const content = this.buildReceiptContent({
      receiptNumber,
      paymentId: payment.id,
      subscriptionId: payment.subscription_id,
      productName: sub?.product_name || 'N/A',
      planName: sub?.plan_name || 'N/A',
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      provider: payment.provider,
      providerRef: payment.provider_ref || 'N/A',
      paidAt: payment.paid_at || payment.updated_at,
    });

    // Write file
    fs.writeFileSync(filePath, content, 'utf-8');
    this.logger.log(`Receipt generated: ${filePath}`);

    // Create receipt record
    return this.prisma.receipt.create({
      data: {
        payment_id: paymentId,
        subscription_id: payment.subscription_id,
        receipt_number: receiptNumber,
        type: 'generated',
        file_path: filePath,
        issued_at: new Date(),
      },
    });
  }

  // ─── Upload Offline Receipt ─────────────────────────────────────────

  async uploadReceipt(paymentId: string, fileBuffer: Buffer, originalName: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    const receiptNumber = this.generateReceiptNumber();
    const ext = path.extname(originalName) || '.pdf';
    const fileName = `${receiptNumber}${ext}`;
    const filePath = path.join(this.storageDir, 'receipts', fileName);

    // Save file
    fs.writeFileSync(filePath, fileBuffer);
    this.logger.log(`Receipt uploaded: ${filePath}`);

    return this.prisma.receipt.create({
      data: {
        payment_id: paymentId,
        subscription_id: payment.subscription_id,
        receipt_number: receiptNumber,
        type: 'uploaded',
        file_path: filePath,
        issued_at: new Date(),
      },
    });
  }

  // ─── Find Receipts ─────────────────────────────────────────────────

  async findByPayment(paymentId: string) {
    return this.prisma.receipt.findMany({
      where: { payment_id: paymentId },
      orderBy: { issued_at: 'desc' },
    });
  }

  async findBySubscription(subscriptionId: string) {
    return this.prisma.receipt.findMany({
      where: { subscription_id: subscriptionId },
      orderBy: { issued_at: 'desc' },
    });
  }

  async findById(id: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receipt;
  }

  // ─── Download Receipt ──────────────────────────────────────────────

  async getReceiptFile(id: string): Promise<{ filePath: string; fileName: string }> {
    const receipt = await this.findById(id);
    if (!receipt.file_path || !fs.existsSync(receipt.file_path)) {
      throw new NotFoundException('Receipt file not found on disk');
    }
    return {
      filePath: receipt.file_path,
      fileName: path.basename(receipt.file_path),
    };
  }

  // ─── Build Receipt Content ─────────────────────────────────────────

  private buildReceiptContent(data: {
    receiptNumber: string;
    paymentId: string;
    subscriptionId: string;
    productName: string;
    planName: string;
    amount: number;
    currency: string;
    method: string;
    provider: string;
    providerRef: string;
    paidAt: Date | null;
  }): string {
    const formatAmount = (amount: number, currency: string) => {
      return `${amount.toLocaleString('fr-FR')} ${currency}`;
    };
    const formatDate = (d: Date | null) => {
      if (!d) return 'N/A';
      return new Date(d).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return `
╔══════════════════════════════════════════════════════════════╗
║                    QUITTANCE DE PAIEMENT                    ║
║                       CompAssur225                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  N° Quittance  : ${data.receiptNumber.padEnd(40)}║
║  Date          : ${formatDate(data.paidAt).padEnd(40)}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  DÉTAILS DE LA SOUSCRIPTION                                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Produit       : ${data.productName.padEnd(40)}║
║  Formule       : ${data.planName.padEnd(40)}║
║  Réf. Paiement : ${data.paymentId.slice(0, 36).padEnd(40)}║
║  Réf. Provider : ${data.providerRef.padEnd(40)}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  MONTANT PAYÉ                                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Montant       : ${formatAmount(data.amount, data.currency).padEnd(40)}║
║  Méthode       : ${data.method.padEnd(40)}║
║  Opérateur     : ${data.provider.padEnd(40)}║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Ce document fait office de quittance de paiement.           ║
║  Conservez-le pour vos dossiers.                             ║
║                                                              ║
║  CompAssur225 – Plateforme de comparaison d'assurances       ║
║  Côte d'Ivoire                                               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`.trim();
  }
}
