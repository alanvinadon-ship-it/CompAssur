// ─── KPI / Funnel / SLA Filters ─────────────────────────────────────────────

export class SupervisionFiltersDto {
  start_date?: string;
  end_date?: string;
  product?: string;
  insurer_id?: string;
  zone?: string;
  broker_id?: string;
}

// ─── Complaint DTOs ─────────────────────────────────────────────────────────

export class CreateComplaintDto {
  insurer_id?: string;
  case_id?: string;
  broker_id?: string;
  category: string;
  subject: string;
  description: string;
}

export class UpdateComplaintDto {
  status?: string;
  assigned_to?: string;
  resolution?: string;
}

// ─── Attestation DTOs ───────────────────────────────────────────────────────

export class VerifyAttestationDto {
  input_ref: string;
  input_type?: string; // 'number' | 'qr_code'
  insurer_id?: string;
}

// ─── Flag DTOs ──────────────────────────────────────────────────────────────

export class FlagCaseDto {
  flag_type: string;
  severity?: string;
  reason: string; // required
  details?: Record<string, any>;
  insurer_id?: string;
  broker_id?: string;
}

export class ResolveFlagDto {
  status: string; // 'resolved' | 'dismissed'
  resolution_note?: string;
}

// ─── Export DTOs ────────────────────────────────────────────────────────────

export class RequestExportDto {
  export_type: string; // kpi, sla, complaints, anomalies, attestations, plans_health
  format?: string; // csv, pdf
  filters?: Record<string, any>;
}

// ─── PII Unmask ─────────────────────────────────────────────────────────────

export class UnmaskPiiDto {
  resource_type: string; // complaint, case, attestation
  resource_id: string;
  reason: string; // required justification
}
