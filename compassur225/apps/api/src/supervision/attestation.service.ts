import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PiiMaskingService } from './pii-masking.service';

/**
 * Attestation Verification Service
 * 
 * In production, this would connect to:
 * - ASACI's central attestation registry API
 * - Insurer-specific verification endpoints
 * - Batch import from CSV/Excel files
 * 
 * Currently operates as a STUB with simulated responses.
 * See /docs/V1-10/04_attestation_connector.md for integration options.
 */
@Injectable()
export class AttestationService {
  constructor(
    private prisma: PrismaService,
    private piiMasking: PiiMaskingService,
  ) {}

  /**
   * Verify an attestation by number or QR code.
   * STUB implementation: simulates verification based on input patterns.
   */
  async verify(
    data: { input_ref: string; input_type?: string; insurer_id?: string },
    checkedBy: string,
  ) {
    const inputType = data.input_type || 'number';

    // Simulate verification result based on input pattern
    const result = this.simulateVerification(data.input_ref);

    const check = await this.prisma.attestationCheck.create({
      data: {
        input_ref: data.input_ref,
        input_type: inputType,
        result: result.status,
        insurer_id: data.insurer_id || result.insurer_id,
        insurer_name: result.insurer_name,
        policy_holder: result.policy_holder,
        policy_number: result.policy_number,
        valid_from: result.valid_from,
        valid_to: result.valid_to,
        vehicle_info: result.vehicle_info,
        details: result.raw_details,
        checked_by: checkedBy,
        source: 'stub',
      },
    });

    // Return masked version by default
    return {
      ...check,
      policy_holder: check.policy_holder
        ? this.piiMasking.maskName(check.policy_holder)
        : null,
      vehicle_info: check.vehicle_info
        ? this.piiMasking.maskGeneric(check.vehicle_info)
        : null,
    };
  }

  /**
   * Get verification history with optional filters.
   */
  async getHistory(filters: {
    result?: string;
    insurer_id?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const where: any = {};
    if (filters.result) where.result = filters.result;
    if (filters.insurer_id) where.insurer_id = filters.insurer_id;

    const [checks, total] = await Promise.all([
      this.prisma.attestationCheck.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attestationCheck.count({ where }),
    ]);

    // Mask PII
    const masked = checks.map((c) => ({
      ...c,
      policy_holder: c.policy_holder
        ? this.piiMasking.maskName(c.policy_holder)
        : null,
      vehicle_info: c.vehicle_info
        ? this.piiMasking.maskGeneric(c.vehicle_info)
        : null,
    }));

    return { data: masked, total, page, limit };
  }

  /**
   * Get anomalies from attestation checks.
   */
  async getAnomalies() {
    const checks = await this.prisma.attestationCheck.findMany({
      where: { result: { in: ['invalid', 'not_found'] } },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return checks.map((c) => ({
      ...c,
      policy_holder: c.policy_holder
        ? this.piiMasking.maskName(c.policy_holder)
        : null,
      vehicle_info: c.vehicle_info
        ? this.piiMasking.maskGeneric(c.vehicle_info)
        : null,
    }));
  }

  // ─── Private: Stub Simulation ─────────────────────────────────────────────

  private simulateVerification(inputRef: string): {
    status: string;
    insurer_id: string | null;
    insurer_name: string | null;
    policy_holder: string | null;
    policy_number: string | null;
    valid_from: Date | null;
    valid_to: Date | null;
    vehicle_info: string | null;
    raw_details: any;
  } {
    // Pattern-based simulation:
    // - Starts with "VALID" → valid attestation
    // - Starts with "INV" → invalid attestation
    // - Starts with "EXP" → expired attestation
    // - Otherwise → not_found

    const ref = inputRef.toUpperCase();

    if (ref.startsWith('VALID') || ref.startsWith('ATT-OK')) {
      const now = new Date();
      const validFrom = new Date(now.getFullYear(), 0, 1);
      const validTo = new Date(now.getFullYear(), 11, 31);
      return {
        status: 'valid',
        insurer_id: null,
        insurer_name: 'Allianz CI',
        policy_holder: 'Kouamé Jean-Baptiste',
        policy_number: `POL-${ref.slice(-6)}`,
        valid_from: validFrom,
        valid_to: validTo,
        vehicle_info: 'Toyota Corolla 2020 - AB-1234-CI',
        raw_details: {
          source: 'stub',
          note: 'Simulated valid attestation for development',
          verification_timestamp: now.toISOString(),
        },
      };
    }

    if (ref.startsWith('INV')) {
      return {
        status: 'invalid',
        insurer_id: null,
        insurer_name: 'Inconnu',
        policy_holder: null,
        policy_number: null,
        valid_from: null,
        valid_to: null,
        vehicle_info: null,
        raw_details: {
          source: 'stub',
          note: 'Simulated invalid attestation',
          reason: 'Numéro non reconnu dans le registre',
        },
      };
    }

    if (ref.startsWith('EXP')) {
      const now = new Date();
      const validFrom = new Date(now.getFullYear() - 2, 0, 1);
      const validTo = new Date(now.getFullYear() - 1, 11, 31);
      return {
        status: 'invalid',
        insurer_id: null,
        insurer_name: 'NSIA Assurances',
        policy_holder: 'Bamba Fatou',
        policy_number: `POL-EXP-${ref.slice(-4)}`,
        valid_from: validFrom,
        valid_to: validTo,
        vehicle_info: 'Peugeot 308 2018 - CD-5678-CI',
        raw_details: {
          source: 'stub',
          note: 'Simulated expired attestation',
          reason: 'Attestation expirée',
        },
      };
    }

    return {
      status: 'not_found',
      insurer_id: null,
      insurer_name: null,
      policy_holder: null,
      policy_number: null,
      valid_from: null,
      valid_to: null,
      vehicle_info: null,
      raw_details: {
        source: 'stub',
        note: 'No matching attestation found in registry',
      },
    };
  }
}
