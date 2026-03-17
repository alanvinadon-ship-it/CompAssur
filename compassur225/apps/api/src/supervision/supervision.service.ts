import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PiiMaskingService } from './pii-masking.service';

@Injectable()
export class SupervisionService {
  constructor(
    private prisma: PrismaService,
    private piiMasking: PiiMaskingService,
  ) {}

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  async getKpis(filters: {
    start_date?: string;
    end_date?: string;
    product?: string;
    insurer_id?: string;
    zone?: string;
  }) {
    const dateFilter: any = {};
    if (filters.start_date) dateFilter.gte = new Date(filters.start_date);
    if (filters.end_date) dateFilter.lte = new Date(filters.end_date);
    const createdAt = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

    const [
      totalQuotes,
      totalLeads,
      totalCases,
      wonCases,
      lostCases,
      totalSubscriptions,
      totalPayments,
      paidPayments,
      totalPremium,
    ] = await Promise.all([
      this.prisma.quoteRequest.count({
        where: {
          ...(createdAt && { created_at: createdAt }),
          ...(filters.product && { product: { slug: filters.product } }),
        },
      }),
      this.prisma.lead.count({
        where: {
          ...(createdAt && { created_at: createdAt }),
          ...(filters.product && { product_name: filters.product }),
        },
      }),
      this.prisma.caseFile.count({
        where: {
          ...(createdAt && { created_at: createdAt }),
          ...(filters.product && { product_name: filters.product }),
        },
      }),
      this.prisma.caseFile.count({
        where: {
          status: 'won',
          ...(createdAt && { created_at: createdAt }),
          ...(filters.product && { product_name: filters.product }),
        },
      }),
      this.prisma.caseFile.count({
        where: {
          status: 'lost',
          ...(createdAt && { created_at: createdAt }),
          ...(filters.product && { product_name: filters.product }),
        },
      }),
      this.prisma.subscription.count({
        where: {
          ...(createdAt && { created_at: createdAt }),
          ...(filters.product && { product_name: filters.product }),
        },
      }),
      this.prisma.payment.count({
        where: { ...(createdAt && { created_at: createdAt }) },
      }),
      this.prisma.payment.count({
        where: {
          status: 'PAID',
          ...(createdAt && { created_at: createdAt }),
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          ...(createdAt && { created_at: createdAt }),
        },
      }),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((wonCases / totalLeads) * 100) : 0;

    return {
      period: {
        start: filters.start_date || 'all',
        end: filters.end_date || 'all',
      },
      volumes: {
        quotes: totalQuotes,
        leads: totalLeads,
        cases: totalCases,
        won: wonCases,
        lost: lostCases,
        subscriptions: totalSubscriptions,
        payments: totalPayments,
        paid_payments: paidPayments,
      },
      financials: {
        total_premium_collected: totalPremium._sum.amount || 0,
        currency: 'XOF',
      },
      rates: {
        conversion_rate_pct: conversionRate,
        payment_success_rate_pct:
          totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0,
      },
    };
  }

  // ─── Funnel ─────────────────────────────────────────────────────────────────

  async getFunnel(filters: {
    start_date?: string;
    end_date?: string;
    product?: string;
    zone?: string;
    insurer_id?: string;
  }) {
    const dateFilter: any = {};
    if (filters.start_date) dateFilter.gte = new Date(filters.start_date);
    if (filters.end_date) dateFilter.lte = new Date(filters.end_date);
    const createdAt = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

    // Get funnel stages
    const quotes = await this.prisma.quoteRequest.count({
      where: { ...(createdAt && { created_at: createdAt }) },
    });
    const leads = await this.prisma.lead.count({
      where: { ...(createdAt && { created_at: createdAt }) },
    });

    const casesByStatus = await this.prisma.caseFile.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { ...(createdAt && { created_at: createdAt }) },
    });

    const statusMap: Record<string, number> = {};
    casesByStatus.forEach((g) => {
      statusMap[g.status] = g._count.id;
    });

    return {
      stages: [
        { stage: 'quote_request', count: quotes, drop_off_pct: 0 },
        {
          stage: 'lead_created',
          count: leads,
          drop_off_pct: quotes > 0 ? Math.round(((quotes - leads) / quotes) * 100) : 0,
        },
        {
          stage: 'case_contacted',
          count: statusMap['contacted'] || 0,
          drop_off_pct:
            leads > 0
              ? Math.round(((leads - (statusMap['contacted'] || 0)) / leads) * 100)
              : 0,
        },
        { stage: 'case_proposed', count: statusMap['proposed'] || 0 },
        { stage: 'case_won', count: statusMap['won'] || 0 },
        { stage: 'case_lost', count: statusMap['lost'] || 0 },
      ],
      filters_applied: filters,
    };
  }

  // ─── SLA ────────────────────────────────────────────────────────────────────

  async getSla(filters: {
    start_date?: string;
    end_date?: string;
    broker_id?: string;
  }) {
    const dateFilter: any = {};
    if (filters.start_date) dateFilter.gte = new Date(filters.start_date);
    if (filters.end_date) dateFilter.lte = new Date(filters.end_date);

    const breaches = await this.prisma.slaBreachLog.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { breached_at: dateFilter }),
        ...(filters.broker_id && { broker_id: filters.broker_id }),
      },
      include: { sla_config: true },
    });

    const configs = await this.prisma.slaConfig.findMany({ where: { active: true } });

    const byType: Record<string, { total: number; resolved: number }> = {};
    breaches.forEach((b) => {
      const type = b.breach_type;
      if (!byType[type]) byType[type] = { total: 0, resolved: 0 };
      byType[type].total++;
      if (b.resolved) byType[type].resolved++;
    });

    return {
      sla_configs: configs.map((c) => ({
        name: c.name,
        description: c.description,
        threshold_minutes: c.threshold_minutes,
        escalation_action: c.escalation_action,
      })),
      breaches_summary: Object.entries(byType).map(([type, data]) => ({
        breach_type: type,
        total_breaches: data.total,
        resolved: data.resolved,
        unresolved: data.total - data.resolved,
        resolution_rate_pct:
          data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
      })),
      total_breaches: breaches.length,
    };
  }

  // ─── Plans Health ───────────────────────────────────────────────────────────

  async getPlansHealth(insurer_id?: string) {
    const where: any = {};
    if (insurer_id) where.insurer_id = insurer_id;

    const plans = await this.prisma.versionedPlan.findMany({
      where,
      include: {
        versioned_coverages: true,
        versioned_pricing: true,
        dataset_version: { select: { status: true, version: true, insurer_id: true } },
      },
    });

    return plans.map((plan) => {
      const issues: string[] = [];
      let healthScore = 100;

      // Check for missing coverages
      if (plan.versioned_coverages.length === 0) {
        issues.push('Aucune couverture définie');
        healthScore -= 30;
      }

      // Check for missing pricing
      if (plan.versioned_pricing.length === 0) {
        issues.push('Aucune règle de tarification');
        healthScore -= 30;
      }

      // Check for expired plans
      if (plan.expiry_date && new Date(plan.expiry_date) < new Date()) {
        issues.push('Plan expiré');
        healthScore -= 20;
      }

      // Check for inactive plans
      if (!plan.is_active) {
        issues.push('Plan inactif');
        healthScore -= 10;
      }

      // Check dataset status
      if (plan.dataset_version?.status !== 'published') {
        issues.push(`Dataset non publié (${plan.dataset_version?.status || 'unknown'})`);
        healthScore -= 10;
      }

      // Check for missing deductible info
      const missingDeductibles = plan.versioned_coverages.filter(
        (c) => c.included && !c.deductible_amount && !c.deductible_notes,
      );
      if (missingDeductibles.length > 0) {
        issues.push(`${missingDeductibles.length} couverture(s) sans franchise définie`);
        healthScore -= 5 * Math.min(missingDeductibles.length, 4);
      }

      return {
        plan_id: plan.id,
        plan_code: plan.plan_code,
        plan_name: plan.plan_name,
        product: plan.product,
        insurer_id: plan.dataset_version?.insurer_id,
        dataset_version: plan.dataset_version?.version,
        is_active: plan.is_active,
        coverages_count: plan.versioned_coverages.length,
        pricing_rules_count: plan.versioned_pricing.length,
        health_score: Math.max(0, healthScore),
        issues,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical',
      };
    });
  }

  // ─── Anomalies ──────────────────────────────────────────────────────────────

  async getAnomalies(filters: {
    start_date?: string;
    end_date?: string;
  }) {
    const anomalies: Array<{
      type: string;
      severity: string;
      description: string;
      details: any;
      detected_at: string;
    }> = [];

    const dateFilter: any = {};
    if (filters.start_date) dateFilter.gte = new Date(filters.start_date);
    if (filters.end_date) dateFilter.lte = new Date(filters.end_date);
    const createdAt = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

    // 1. Detect duplicate cases (same client phone + product in short timeframe)
    const recentCases = await this.prisma.caseFile.findMany({
      where: { ...(createdAt && { created_at: createdAt }) },
      select: { id: true, client_phone: true, product_name: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 500,
    });

    const phoneProductMap = new Map<string, typeof recentCases>();
    recentCases.forEach((c) => {
      if (!c.client_phone) return;
      const key = `${this.piiMasking.maskPhone(c.client_phone)}_${c.product_name}`;
      if (!phoneProductMap.has(key)) phoneProductMap.set(key, []);
      phoneProductMap.get(key)!.push(c);
    });

    phoneProductMap.forEach((cases, key) => {
      if (cases.length >= 2) {
        anomalies.push({
          type: 'duplicate_case',
          severity: 'medium',
          description: `${cases.length} dossiers pour le même client/produit`,
          details: {
            masked_key: key,
            case_ids: cases.map((c) => c.id),
            count: cases.length,
          },
          detected_at: new Date().toISOString(),
        });
      }
    });

    // 2. Cancellation spikes (more than 5 cancellations in a day)
    const cancelledSubs = await this.prisma.subscription.findMany({
      where: {
        status: 'CANCELLED',
        ...(createdAt && { updated_at: createdAt }),
      },
      select: { id: true, updated_at: true, product_name: true },
    });

    const cancelByDay = new Map<string, number>();
    cancelledSubs.forEach((s) => {
      const day = s.updated_at.toISOString().split('T')[0];
      cancelByDay.set(day, (cancelByDay.get(day) || 0) + 1);
    });

    cancelByDay.forEach((count, day) => {
      if (count >= 5) {
        anomalies.push({
          type: 'cancellation_spike',
          severity: 'high',
          description: `${count} annulations le ${day}`,
          details: { date: day, count },
          detected_at: new Date().toISOString(),
        });
      }
    });

    // 3. Failed payments spike
    const failedPayments = await this.prisma.payment.count({
      where: {
        status: 'FAILED',
        ...(createdAt && { created_at: createdAt }),
      },
    });
    const totalPayments = await this.prisma.payment.count({
      where: { ...(createdAt && { created_at: createdAt }) },
    });

    if (totalPayments > 10 && failedPayments / totalPayments > 0.3) {
      anomalies.push({
        type: 'payment_failure_spike',
        severity: 'high',
        description: `Taux d'échec paiement élevé: ${Math.round((failedPayments / totalPayments) * 100)}%`,
        details: { failed: failedPayments, total: totalPayments },
        detected_at: new Date().toISOString(),
      });
    }

    // 4. Get existing flags
    const flags = await this.prisma.supervisionFlag.findMany({
      where: {
        status: 'open',
        ...(createdAt && { created_at: createdAt }),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    flags.forEach((f) => {
      anomalies.push({
        type: f.flag_type,
        severity: f.severity,
        description: f.reason,
        details: { flag_id: f.id, case_id: f.case_id, ...(f.details as any) },
        detected_at: f.created_at.toISOString(),
      });
    });

    return {
      total: anomalies.length,
      anomalies: anomalies.sort((a, b) => {
        const sev = { critical: 0, high: 1, medium: 2, low: 3 };
        return (sev[a.severity] ?? 4) - (sev[b.severity] ?? 4);
      }),
    };
  }

  // ─── Flag Case ──────────────────────────────────────────────────────────────

  async flagCase(
    caseId: string,
    data: {
      flag_type: string;
      severity?: string;
      reason: string;
      details?: any;
      insurer_id?: string;
      broker_id?: string;
    },
    actorId: string,
  ) {
    return this.prisma.supervisionFlag.create({
      data: {
        case_id: caseId,
        flag_type: data.flag_type as any,
        severity: data.severity || 'medium',
        reason: data.reason,
        details: data.details || {},
        insurer_id: data.insurer_id,
        broker_id: data.broker_id,
        created_by: actorId,
      },
    });
  }

  async resolveFlag(flagId: string, status: string, actorId: string) {
    return this.prisma.supervisionFlag.update({
      where: { id: flagId },
      data: {
        status,
        resolved_by: actorId,
        resolved_at: new Date(),
      },
    });
  }

  async getFlags(filters: { status?: string; flag_type?: string }) {
    return this.prisma.supervisionFlag.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.flag_type && { flag_type: filters.flag_type as any }),
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
