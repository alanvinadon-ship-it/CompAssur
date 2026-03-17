#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# V1-10 E2E Tests — Supervision & Contrôle (ASACI / Régulateur)
# ═══════════════════════════════════════════════════════════════════
set -e
API="http://localhost:4000"
PASS=0
FAIL=0
TOTAL=0

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; }

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL+1))
  if [ "$actual" = "$expected" ]; then
    green "$desc (HTTP $actual)"
    PASS=$((PASS+1))
  else
    red "$desc — expected $expected, got $actual"
    FAIL=$((FAIL+1))
  fi
}

assert_contains() {
  local desc="$1" body="$2" expected="$3"
  TOTAL=$((TOTAL+1))
  if echo "$body" | grep -q "$expected"; then
    green "$desc"
    PASS=$((PASS+1))
  else
    red "$desc — expected to contain '$expected'"
    FAIL=$((FAIL+1))
  fi
}

echo "═══════════════════════════════════════════════════════"
echo " V1-10 E2E Tests — Supervision & Contrôle"
echo "═══════════════════════════════════════════════════════"

# ─── Step 1: Auth — get token for super_admin ────────────────────
echo ""
echo "▸ Step 1: Authentication"
PHONE="+22500000001"

# Request OTP
OTP_RES=$(curl -s -X POST "$API/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\"}")
OTP_CODE=$(echo "$OTP_RES" | python3 -c "import json,sys; print(json.load(sys.stdin).get('otp_dev',''))" 2>/dev/null)

# Verify OTP
TOKEN_RES=$(curl -s -X POST "$API/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\",\"otp_code\":\"$OTP_CODE\"}")
TOKEN=$(echo "$TOKEN_RES" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "" ]; then
  red "Failed to get auth token"
  exit 1
fi

# Get user ID and update role to super_admin
USER_ID=$(echo "$TOKEN_RES" | python3 -c "import json,sys; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null)
cd /home/ubuntu/compassur225/apps/api
sqlite3 prisma/dev.db "UPDATE User SET role='super_admin' WHERE id='$USER_ID';"

# Re-auth to get token with updated role
OTP_RES=$(curl -s -X POST "$API/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\"}")
OTP_CODE=$(echo "$OTP_RES" | python3 -c "import json,sys; print(json.load(sys.stdin).get('otp_dev',''))" 2>/dev/null)
TOKEN_RES=$(curl -s -X POST "$API/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE\",\"otp_code\":\"$OTP_CODE\"}")
TOKEN=$(echo "$TOKEN_RES" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

green "Authenticated as super_admin (user: ${USER_ID:0:8}...)"
AUTH="Authorization: Bearer $TOKEN"

# ─── Step 2: RBAC — client role should be denied ────────────────
echo ""
echo "▸ Step 2: RBAC enforcement"

# Create a client user
PHONE2="+22500000099"
OTP2=$(curl -s -X POST "$API/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE2\"}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('otp_dev',''))" 2>/dev/null)
CLIENT_TOKEN=$(curl -s -X POST "$API/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"$PHONE2\",\"otp_code\":\"$OTP2\"}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

# Client should be denied access to supervision
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/kpis" \
  -H "Authorization: Bearer $CLIENT_TOKEN")
assert_status "Client role denied access to /supervision/kpis" "403" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/complaints" \
  -H "Authorization: Bearer $CLIENT_TOKEN")
assert_status "Client role denied access to /supervision/complaints" "403" "$STATUS"

# ─── Step 3: KPIs ────────────────────────────────────────────────
echo ""
echo "▸ Step 3: KPIs"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/kpis" -H "$AUTH")
assert_status "GET /supervision/kpis returns 200" "200" "$STATUS"

BODY=$(curl -s "$API/supervision/kpis" -H "$AUTH")
assert_contains "KPIs contain volumes" "$BODY" "volumes"
assert_contains "KPIs contain financials" "$BODY" "financials"
assert_contains "KPIs contain rates" "$BODY" "rates"

# ─── Step 4: Funnel ──────────────────────────────────────────────
echo ""
echo "▸ Step 4: Funnel"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/funnel" -H "$AUTH")
assert_status "GET /supervision/funnel returns 200" "200" "$STATUS"

BODY=$(curl -s "$API/supervision/funnel" -H "$AUTH")
assert_contains "Funnel contains stages" "$BODY" "stages"

# ─── Step 5: SLA ─────────────────────────────────────────────────
echo ""
echo "▸ Step 5: SLA"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/sla" -H "$AUTH")
assert_status "GET /supervision/sla returns 200" "200" "$STATUS"

BODY=$(curl -s "$API/supervision/sla" -H "$AUTH")
assert_contains "SLA contains sla_configs" "$BODY" "sla_configs"

# ─── Step 6: Plans Health ────────────────────────────────────────
echo ""
echo "▸ Step 6: Plans Health"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/plans/health" -H "$AUTH")
assert_status "GET /supervision/plans/health returns 200" "200" "$STATUS"

# ─── Step 7: Anomalies ──────────────────────────────────────────
echo ""
echo "▸ Step 7: Anomalies"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/anomalies" -H "$AUTH")
assert_status "GET /supervision/anomalies returns 200" "200" "$STATUS"

BODY=$(curl -s "$API/supervision/anomalies" -H "$AUTH")
assert_contains "Anomalies response has total" "$BODY" "total"

# ─── Step 8: Complaints CRUD + Workflow ──────────────────────────
echo ""
echo "▸ Step 8: Complaints CRUD + Workflow"

# Create complaint
COMPLAINT_RES=$(curl -s -w "\n%{http_code}" -X POST "$API/supervision/complaints" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"category":"pricing_dispute","subject":"Prime trop élevée","description":"Le client conteste le montant de la prime auto."}')
STATUS=$(echo "$COMPLAINT_RES" | tail -1)
BODY=$(echo "$COMPLAINT_RES" | head -n -1)
assert_status "POST /supervision/complaints creates complaint" "201" "$STATUS"

COMPLAINT_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_contains "Complaint has SLA due date" "$BODY" "sla_due_at"

# Get complaint
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/complaints/$COMPLAINT_ID" -H "$AUTH")
assert_status "GET /supervision/complaints/:id returns 200" "200" "$STATUS"

# PII should be masked
BODY=$(curl -s "$API/supervision/complaints/$COMPLAINT_ID" -H "$AUTH")
assert_contains "Complaint user_id is masked" "$BODY" "***"

# Update status: received → in_review
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/supervision/complaints/$COMPLAINT_ID" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status":"in_review"}')
assert_status "PATCH complaint to in_review" "200" "$STATUS"

# Update status: in_review → resolved
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/supervision/complaints/$COMPLAINT_ID" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status":"resolved","resolution":"Prime recalculée et ajustée."}')
assert_status "PATCH complaint to resolved" "200" "$STATUS"

# Invalid transition: resolved → in_review (should fail)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/supervision/complaints/$COMPLAINT_ID" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status":"in_review"}')
assert_status "Invalid transition resolved→in_review rejected" "400" "$STATUS"

# Stats
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/complaints/stats" -H "$AUTH")
assert_status "GET /supervision/complaints/stats returns 200" "200" "$STATUS"

# ─── Step 9: Attestation Verify ──────────────────────────────────
echo ""
echo "▸ Step 9: Attestation Verify"

# Valid attestation
ATT_RES=$(curl -s -w "\n%{http_code}" -X POST "$API/supervision/attestations/verify" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"input_ref":"VALID-123456","input_type":"number"}')
STATUS=$(echo "$ATT_RES" | tail -1)
BODY=$(echo "$ATT_RES" | head -n -1)
assert_status "POST verify valid attestation returns 201" "201" "$STATUS"
assert_contains "Valid attestation result" "$BODY" "valid"
assert_contains "Attestation PII masked (policy_holder)" "$BODY" "***"

# Invalid attestation
ATT_RES2=$(curl -s -X POST "$API/supervision/attestations/verify" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"input_ref":"INV-999","input_type":"number"}')
assert_contains "Invalid attestation detected" "$ATT_RES2" "invalid"

# Not found
ATT_RES3=$(curl -s -X POST "$API/supervision/attestations/verify" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"input_ref":"UNKNOWN-000","input_type":"number"}')
assert_contains "Not found attestation" "$ATT_RES3" "not_found"

# History
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/attestations/history" -H "$AUTH")
assert_status "GET attestation history returns 200" "200" "$STATUS"

# ─── Step 10: Case Flagging ─────────────────────────────────────
echo ""
echo "▸ Step 10: Case Flagging"

# Create a flag (use a dummy case_id)
FLAG_RES=$(curl -s -w "\n%{http_code}" -X POST "$API/supervision/cases/dummy-case-id/flag" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"flag_type":"manual_flag","severity":"high","reason":"Dossier suspect - vérification requise"}')
STATUS=$(echo "$FLAG_RES" | tail -1)
BODY=$(echo "$FLAG_RES" | head -n -1)
assert_status "POST flag case returns 201" "201" "$STATUS"

FLAG_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

# List flags
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/flags" -H "$AUTH")
assert_status "GET /supervision/flags returns 200" "200" "$STATUS"

# Resolve flag
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/supervision/flags/$FLAG_ID/resolve" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status":"resolved"}')
assert_status "POST resolve flag returns 201" "201" "$STATUS"

# ─── Step 11: Exports ────────────────────────────────────────────
echo ""
echo "▸ Step 11: Exports"

# Generate KPI export
EXPORT_RES=$(curl -s -w "\n%{http_code}" -X POST "$API/supervision/exports" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"export_type":"kpi","format":"csv"}')
STATUS=$(echo "$EXPORT_RES" | tail -1)
BODY=$(echo "$EXPORT_RES" | head -n -1)
assert_status "POST generate KPI export returns 201" "201" "$STATUS"
assert_contains "Export has file_hash" "$BODY" "file_hash"
assert_contains "Export has row_count" "$BODY" "row_count"

EXPORT_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

# Generate complaints export
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/supervision/exports" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"export_type":"complaints","format":"csv"}')
assert_status "POST generate complaints export returns 201" "201" "$STATUS"

# List exports
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/exports" -H "$AUTH")
assert_status "GET /supervision/exports returns 200" "200" "$STATUS"

# Download export
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/exports/$EXPORT_ID/download" -H "$AUTH")
assert_status "GET download export returns 200" "200" "$STATUS"

# ─── Step 12: PII Unmask ─────────────────────────────────────────
echo ""
echo "▸ Step 12: PII Unmask"

# Unmask without reason (should fail)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/supervision/pii/unmask" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"resource_type\":\"complaint\",\"resource_id\":\"$COMPLAINT_ID\",\"reason\":\"short\"}")
assert_status "PII unmask without sufficient reason rejected" "404" "$STATUS"

# Unmask with proper reason
UNMASK_RES=$(curl -s -w "\n%{http_code}" -X POST "$API/supervision/pii/unmask" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"resource_type\":\"complaint\",\"resource_id\":\"$COMPLAINT_ID\",\"reason\":\"Investigation officielle suite à réclamation client - dossier #2026-0142\"}")
STATUS=$(echo "$UNMASK_RES" | tail -1)
assert_status "PII unmask with proper reason returns 201" "201" "$STATUS"

# ─── Step 13: Audit Log ─────────────────────────────────────────
echo ""
echo "▸ Step 13: Audit Log"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/supervision/audit-log" -H "$AUTH")
assert_status "GET /supervision/audit-log returns 200" "200" "$STATUS"

BODY=$(curl -s "$API/supervision/audit-log" -H "$AUTH")
assert_contains "Audit log has entries" "$BODY" "data"
assert_contains "Audit log tracks unmask_pii" "$BODY" "unmask_pii"

# ═══════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════"
echo " Results: $PASS/$TOTAL passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
echo "All V1-10 e2e tests passed!"
