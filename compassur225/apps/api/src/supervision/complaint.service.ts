import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PiiMaskingService } from './pii-masking.service';

const COMPLAINT_SLA_HOURS = 72; // 3 days to resolve

@Injectable()
export class ComplaintService {
  constructor(
    private prisma: PrismaService,
    private piiMasking: PiiMaskingService,
  ) {}

  async create(data: {
    user_id?: string;
    insurer_id?: string;
    case_id?: string;
    broker_id?: string;
    category: string;
    subject: string;
    description: string;
  }) {
    const slaDue = new Date();
    slaDue.setHours(slaDue.getHours() + COMPLAINT_SLA_HOURS);

    return this.prisma.complaint.create({
      data: {
        user_id: data.user_id,
        insurer_id: data.insurer_id,
        case_id: data.case_id,
        broker_id: data.broker_id,
        category: data.category as any,
        subject: data.subject,
        description: data.description,
        sla_due_at: slaDue,
      },
    });
  }

  async findAll(filters: {
    status?: string;
    category?: string;
    insurer_id?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.insurer_id) where.insurer_id = filters.insurer_id;

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.complaint.count({ where }),
    ]);

    // Mask PII by default
    const masked = complaints.map((c) => ({
      ...c,
      user_id: c.user_id ? this.piiMasking.maskGeneric(c.user_id) : null,
    }));

    return {
      data: masked,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');

    return {
      ...complaint,
      user_id: complaint.user_id ? this.piiMasking.maskGeneric(complaint.user_id) : null,
    };
  }

  async updateStatus(
    id: string,
    data: { status?: string; assigned_to?: string; resolution?: string },
  ) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Réclamation introuvable');

    const validTransitions: Record<string, string[]> = {
      received: ['in_review', 'rejected'],
      in_review: ['forwarded', 'resolved', 'rejected'],
      forwarded: ['in_review', 'resolved'],
      resolved: [],
      rejected: [],
    };

    if (data.status) {
      const allowed = validTransitions[complaint.status] || [];
      if (!allowed.includes(data.status)) {
        throw new BadRequestException(
          `Transition invalide: ${complaint.status} → ${data.status}. Transitions autorisées: ${allowed.join(', ')}`,
        );
      }
    }

    return this.prisma.complaint.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status as any }),
        ...(data.assigned_to && { assigned_to: data.assigned_to }),
        ...(data.resolution && { resolution: data.resolution }),
        ...(data.status === 'resolved' && { resolved_at: new Date() }),
      },
    });
  }

  async getStats() {
    const byStatus = await this.prisma.complaint.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const byCategory = await this.prisma.complaint.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    // SLA compliance
    const total = await this.prisma.complaint.count();
    const overdue = await this.prisma.complaint.count({
      where: {
        status: { in: ['received', 'in_review', 'forwarded'] },
        sla_due_at: { lt: new Date() },
      },
    });

    return {
      by_status: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      by_category: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      total,
      overdue,
      sla_compliance_pct: total > 0 ? Math.round(((total - overdue) / total) * 100) : 100,
    };
  }
}
