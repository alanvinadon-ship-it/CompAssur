import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupervisionService } from './supervision.service';
import { ComplaintService } from './complaint.service';
import { AttestationService } from './attestation.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const EXPORT_DIR = path.join(process.cwd(), 'storage', 'exports');

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private supervisionService: SupervisionService,
    private complaintService: ComplaintService,
    private attestationService: AttestationService,
  ) {
    // Ensure export directory exists
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
  }

  /**
   * Generate an export file (CSV) and register it.
   */
  async generateExport(
    exportType: string,
    format: string = 'csv',
    filters: Record<string, any> = {},
    generatedBy: string,
  ) {
    let csvContent: string;
    let rowCount: number;

    switch (exportType) {
      case 'kpi':
        ({ content: csvContent, rowCount } = await this.exportKpis(filters));
        break;
      case 'sla':
        ({ content: csvContent, rowCount } = await this.exportSla(filters));
        break;
      case 'complaints':
        ({ content: csvContent, rowCount } = await this.exportComplaints(filters));
        break;
      case 'anomalies':
        ({ content: csvContent, rowCount } = await this.exportAnomalies(filters));
        break;
      case 'attestations':
        ({ content: csvContent, rowCount } = await this.exportAttestations(filters));
        break;
      case 'plans_health':
        ({ content: csvContent, rowCount } = await this.exportPlansHealth(filters));
        break;
      default:
        throw new Error(`Type d'export inconnu: ${exportType}`);
    }

    // Write file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${exportType}_${timestamp}.csv`;
    const filePath = path.join(EXPORT_DIR, fileName);
    fs.writeFileSync(filePath, csvContent, 'utf-8');

    // Compute hash
    const fileHash = crypto
      .createHash('sha256')
      .update(csvContent)
      .digest('hex');

    // Register in DB
    const registry = await this.prisma.exportRegistry.create({
      data: {
        export_type: exportType,
        format,
        filters: filters || {},
        row_count: rowCount,
        file_path: filePath,
        file_hash: fileHash,
        generated_by: generatedBy,
      },
    });

    return {
      id: registry.id,
      export_type: exportType,
      format,
      row_count: rowCount,
      file_hash: fileHash,
      file_name: fileName,
      created_at: registry.created_at,
    };
  }

  /**
   * Get export file content for download.
   */
  async getExportFile(exportId: string) {
    const registry = await this.prisma.exportRegistry.findUnique({
      where: { id: exportId },
    });
    if (!registry || !registry.file_path) {
      throw new Error('Export introuvable');
    }
    if (!fs.existsSync(registry.file_path)) {
      throw new Error('Fichier export introuvable sur le serveur');
    }
    return {
      filePath: registry.file_path,
      fileName: path.basename(registry.file_path),
      hash: registry.file_hash,
    };
  }

  /**
   * List all exports (registry).
   */
  async listExports(filters: { export_type?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const where: any = {};
    if (filters.export_type) where.export_type = filters.export_type;

    const [exports, total] = await Promise.all([
      this.prisma.exportRegistry.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exportRegistry.count({ where }),
    ]);

    return { data: exports, total, page, limit };
  }

  // ─── Private: CSV Generators ──────────────────────────────────────────────

  private async exportKpis(filters: any): Promise<{ content: string; rowCount: number }> {
    const kpis = await this.supervisionService.getKpis(filters);
    const rows = [
      ['Métrique', 'Valeur'],
      ['Devis', String(kpis.volumes.quotes)],
      ['Leads', String(kpis.volumes.leads)],
      ['Dossiers', String(kpis.volumes.cases)],
      ['Gagnés', String(kpis.volumes.won)],
      ['Perdus', String(kpis.volumes.lost)],
      ['Souscriptions', String(kpis.volumes.subscriptions)],
      ['Paiements', String(kpis.volumes.payments)],
      ['Paiements réussis', String(kpis.volumes.paid_payments)],
      ['Prime totale (XOF)', String(kpis.financials.total_premium_collected)],
      ['Taux conversion (%)', String(kpis.rates.conversion_rate_pct)],
      ['Taux succès paiement (%)', String(kpis.rates.payment_success_rate_pct)],
    ];
    return { content: this.toCsv(rows), rowCount: rows.length - 1 };
  }

  private async exportSla(filters: any): Promise<{ content: string; rowCount: number }> {
    const sla = await this.supervisionService.getSla(filters);
    const rows = [
      ['Type', 'Total violations', 'Résolues', 'Non résolues', 'Taux résolution (%)'],
      ...sla.breaches_summary.map((b: any) => [
        b.breach_type,
        String(b.total_breaches),
        String(b.resolved),
        String(b.unresolved),
        String(b.resolution_rate_pct),
      ]),
    ];
    return { content: this.toCsv(rows), rowCount: rows.length - 1 };
  }

  private async exportComplaints(filters: any): Promise<{ content: string; rowCount: number }> {
    const result = await this.complaintService.findAll({ ...filters, limit: 1000 });
    const rows = [
      ['ID', 'Catégorie', 'Sujet', 'Statut', 'Assureur', 'Créé le', 'SLA échéance'],
      ...result.data.map((c: any) => [
        c.id,
        c.category,
        c.subject,
        c.status,
        c.insurer_id || 'N/A',
        c.created_at?.toISOString?.() || String(c.created_at),
        c.sla_due_at?.toISOString?.() || 'N/A',
      ]),
    ];
    return { content: this.toCsv(rows), rowCount: result.total };
  }

  private async exportAnomalies(filters: any): Promise<{ content: string; rowCount: number }> {
    const result = await this.supervisionService.getAnomalies(filters);
    const rows = [
      ['Type', 'Sévérité', 'Description', 'Détecté le'],
      ...result.anomalies.map((a: any) => [
        a.type,
        a.severity,
        a.description,
        a.detected_at,
      ]),
    ];
    return { content: this.toCsv(rows), rowCount: result.total };
  }

  private async exportAttestations(filters: any): Promise<{ content: string; rowCount: number }> {
    const result = await this.attestationService.getHistory({ ...filters, limit: 1000 });
    const rows = [
      ['ID', 'Référence', 'Type', 'Résultat', 'Assureur', 'Vérifié le'],
      ...result.data.map((a: any) => [
        a.id,
        a.input_ref,
        a.input_type,
        a.result,
        a.insurer_name || 'N/A',
        a.created_at?.toISOString?.() || String(a.created_at),
      ]),
    ];
    return { content: this.toCsv(rows), rowCount: result.total };
  }

  private async exportPlansHealth(filters: any): Promise<{ content: string; rowCount: number }> {
    const plans = await this.supervisionService.getPlansHealth(filters.insurer_id);
    const rows = [
      ['Plan', 'Produit', 'Score santé', 'Statut', 'Couvertures', 'Tarifs', 'Problèmes'],
      ...plans.map((p: any) => [
        p.plan_name,
        p.product,
        String(p.health_score),
        p.status,
        String(p.coverages_count),
        String(p.pricing_rules_count),
        p.issues.join('; '),
      ]),
    ];
    return { content: this.toCsv(rows), rowCount: plans.length };
  }

  private toCsv(rows: string[][]): string {
    return rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
  }
}
