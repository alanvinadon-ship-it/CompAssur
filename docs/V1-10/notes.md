# V1-10 Implementation Notes

## Existing schema analysis
- UserRole enum: client, conseiller_interne, courtier_partenaire, partner_manager, super_admin
- Need to add: regulator_viewer, regulator_auditor, regulator_case_inspector, asaci_observer, asaci_audit
- AuditLog exists but needs enhancement (add details/reason fields)
- AnalyticsEvent exists for KPI queries
- SlaConfig + SlaBreachLog exist for SLA data
- CaseFile + Lead + QuoteRequest + QuoteResult for funnel data
- VersionedPlan + VersionedPlanCoverage for plan health checks
- Payment + Subscription for market volume data

## New tables needed
1. Complaint
2. SupervisionFlag
3. AttestationCheck
4. ExportRegistry

## New modules needed
- SupervisionModule (main module with all controllers/services)
  - supervision.controller.ts (KPIs, funnel, SLA, plans health, anomalies)
  - complaint.controller.ts (CRUD + workflow)
  - attestation.controller.ts (verify stub)
  - export.controller.ts (CSV/PDF generation + registry)
  - pii-masking.service.ts (utility)
  - supervision-audit.interceptor.ts (auto-audit all supervision actions)
