#!/bin/bash
# ============================================================================
# V1-09 E2E Test: Payment Flow
# Tests: subscription create → payment initiate → callback → PAID → receipt
#        + schedule creation
# ============================================================================

API="http://localhost:4000"
PASS=0
FAIL=0
TOTAL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" -eq "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $test_name (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_json() {
  local test_name="$1"
  local json="$2"
  local py_expr="$3"
  local expected="$4"
  TOTAL=$((TOTAL + 1))
  local actual
  actual=$(echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print($py_expr)" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name = $actual"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $test_name (expected '$expected', got '$actual')"
    FAIL=$((FAIL + 1))
  fi
}

# ─── Step 0: Authenticate ───────────────────────────────────────────────────

echo -e "\n${YELLOW}═══ V1-09 E2E: Payment Flow ═══${NC}\n"

echo "Step 0: Authenticate (OTP flow)"
# Request OTP – capture the dev OTP from response
OTP_RESP=$(curl -s -X POST "$API/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+22507000099","full_name":"Test Payment Admin","role":"super_admin"}')

DEV_OTP=$(echo "$OTP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('otp_dev',''))" 2>/dev/null)
echo "  Dev OTP: $DEV_OTP"

# Verify OTP with the dev code
AUTH_RESP=$(curl -s -X POST "$API/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"+22507000099\",\"otp_code\":\"$DEV_OTP\"}")

TOKEN=$(echo "$AUTH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
USER_ID=$(echo "$AUTH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null)
USER_ROLE=$(echo "$AUTH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('role',''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "" ] || [ "$TOKEN" = "None" ]; then
  echo -e "  ${RED}✗ Authentication failed${NC}"
  echo "  Response: $AUTH_RESP"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Authenticated as $USER_ROLE (${TOKEN:0:20}...)"
echo "  User ID: $USER_ID"

AUTH="Authorization: Bearer $TOKEN"

# Note: user is created as 'client' role by default. 
# For admin operations, we need to update the role.
# Let's check if the guards allow or we need to bypass.
# The subscription endpoints require super_admin/partner_manager/courtier_partenaire.
# Let's update the user role directly in DB.

echo -e "\n  Updating user role to super_admin for testing..."
sqlite3 /home/ubuntu/compassur225/apps/api/prisma/dev.db "UPDATE User SET role = 'super_admin' WHERE id = '$USER_ID';"
echo -e "  ${GREEN}✓${NC} Role updated in DB"

# Re-authenticate to get new token with updated role
OTP_RESP2=$(curl -s -X POST "$API/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+22507000099","full_name":"Test Payment Admin"}')
DEV_OTP2=$(echo "$OTP_RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('otp_dev',''))" 2>/dev/null)

AUTH_RESP2=$(curl -s -X POST "$API/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\":\"+22507000099\",\"otp_code\":\"$DEV_OTP2\"}")

TOKEN=$(echo "$AUTH_RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
USER_ROLE=$(echo "$AUTH_RESP2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('role',''))" 2>/dev/null)
echo -e "  Re-authenticated as: $USER_ROLE"
AUTH="Authorization: Bearer $TOKEN"

# ─── Step 1: Create Subscription ────────────────────────────────────────────

echo -e "\nStep 1: Create Subscription"
SUB_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/subscriptions" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"case_id\": \"test-case-e2e-001\",
    \"user_id\": \"$USER_ID\",
    \"product_name\": \"Auto\",
    \"plan_name\": \"Tous Risques\",
    \"premium_amount\": 150000,
    \"currency\": \"XOF\",
    \"frequency\": \"monthly\"
  }")

SUB_STATUS=$(echo "$SUB_RESP" | tail -1)
SUB_BODY=$(echo "$SUB_RESP" | sed '$d')
assert_status "POST /subscriptions" 201 "$SUB_STATUS"

SUB_ID=$(echo "$SUB_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_json "Subscription status = PENDING" "$SUB_BODY" "d.get('status')" "PENDING"
assert_json "Currency = XOF" "$SUB_BODY" "d.get('currency')" "XOF"
assert_json "Premium = 150000" "$SUB_BODY" "int(d.get('premium_amount',0))" "150000"
echo "  Subscription ID: $SUB_ID"

# ─── Step 2: Get Subscription ───────────────────────────────────────────────

echo -e "\nStep 2: Get Subscription"
GET_SUB_RESP=$(curl -s -w "\n%{http_code}" "$API/subscriptions/$SUB_ID" -H "$AUTH")
GET_SUB_STATUS=$(echo "$GET_SUB_RESP" | tail -1)
GET_SUB_BODY=$(echo "$GET_SUB_RESP" | sed '$d')
assert_status "GET /subscriptions/:id" 200 "$GET_SUB_STATUS"
assert_json "Product = Auto" "$GET_SUB_BODY" "d.get('product_name')" "Auto"

# ─── Step 3: Initiate Payment ───────────────────────────────────────────────

echo -e "\nStep 3: Initiate Payment (mock provider)"
PAY_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/payments/initiate" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"subscription_id\": \"$SUB_ID\",
    \"amount\": 150000,
    \"currency\": \"XOF\",
    \"payer_phone\": \"+22507000099\",
    \"provider\": \"mock\"
  }")

PAY_STATUS=$(echo "$PAY_RESP" | tail -1)
PAY_BODY=$(echo "$PAY_RESP" | sed '$d')
assert_status "POST /payments/initiate" 201 "$PAY_STATUS"

PAYMENT_ID=$(echo "$PAY_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('payment',{}).get('id',''))" 2>/dev/null)
PROVIDER_REF=$(echo "$PAY_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('provider_ref',''))" 2>/dev/null)
assert_json "Payment status = PENDING" "$PAY_BODY" "d.get('status',d.get('payment',{}).get('status',''))" "PENDING"
echo "  Payment ID: $PAYMENT_ID"
echo "  Provider Ref: $PROVIDER_REF"

# ─── Step 4: Subscription should be PAYMENT_PENDING ─────────────────────────

echo -e "\nStep 4: Verify Subscription → PAYMENT_PENDING"
CHECK_SUB=$(curl -s "$API/subscriptions/$SUB_ID" -H "$AUTH")
assert_json "Subscription status = PAYMENT_PENDING" "$CHECK_SUB" "d.get('status')" "PAYMENT_PENDING"

# ─── Step 5: Query Payment Status ───────────────────────────────────────────

echo -e "\nStep 5: Query Payment Status"
QUERY_RESP=$(curl -s -w "\n%{http_code}" "$API/payments/$PAYMENT_ID/status" -H "$AUTH")
QUERY_STATUS=$(echo "$QUERY_RESP" | tail -1)
assert_status "GET /payments/:id/status" 200 "$QUERY_STATUS"

# ─── Step 6: Simulate PAID ──────────────────────────────────────────────────

echo -e "\nStep 6: Simulate Mock Callback → PAID"
SIM_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/payments/$PAYMENT_ID/simulate" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"status":"PAID"}')

SIM_STATUS=$(echo "$SIM_RESP" | tail -1)
SIM_BODY=$(echo "$SIM_RESP" | sed '$d')
assert_status "POST /payments/:id/simulate" 201 "$SIM_STATUS"
assert_json "Payment status = PAID" "$SIM_BODY" "d.get('status')" "PAID"

# ─── Step 7: Subscription should be SUBSCRIBED ──────────────────────────────

echo -e "\nStep 7: Verify Subscription → SUBSCRIBED"
CHECK_SUB2=$(curl -s "$API/subscriptions/$SUB_ID" -H "$AUTH")
assert_json "Subscription status = SUBSCRIBED" "$CHECK_SUB2" "d.get('status')" "SUBSCRIBED"

# ─── Step 8: Generate Receipt ────────────────────────────────────────────────

echo -e "\nStep 8: Generate Receipt"
REC_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/receipts/generate/$PAYMENT_ID" -H "$AUTH")
REC_STATUS=$(echo "$REC_RESP" | tail -1)
REC_BODY=$(echo "$REC_RESP" | sed '$d')
assert_status "POST /receipts/generate/:paymentId" 201 "$REC_STATUS"

RECEIPT_ID=$(echo "$REC_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
RECEIPT_NUM=$(echo "$REC_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('receipt_number',''))" 2>/dev/null)
assert_json "Receipt type = generated" "$REC_BODY" "d.get('type')" "generated"
echo "  Receipt: $RECEIPT_NUM"

# ─── Step 9: Download Receipt ───────────────────────────────────────────────

echo -e "\nStep 9: Download Receipt"
DL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/receipts/$RECEIPT_ID/download" -H "$AUTH")
assert_status "GET /receipts/:id/download" 200 "$DL_STATUS"

# ─── Step 10: List Receipts ─────────────────────────────────────────────────

echo -e "\nStep 10: List Receipts by Payment"
LIST_REC=$(curl -s "$API/receipts/payment/$PAYMENT_ID" -H "$AUTH")
assert_json "At least 1 receipt" "$LIST_REC" "len(d)" "1"

# ─── Step 11: Create Schedule ───────────────────────────────────────────────

echo -e "\nStep 11: Create Payment Schedule (12 monthly installments)"
SCHED_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/payments/schedules" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"subscription_id\": \"$SUB_ID\",
    \"frequency\": \"monthly\",
    \"total_installments\": 12,
    \"amount_per_installment\": 12500,
    \"start_date\": \"2026-03-01\"
  }")

SCHED_STATUS=$(echo "$SCHED_RESP" | tail -1)
SCHED_BODY=$(echo "$SCHED_RESP" | sed '$d')
assert_status "POST /payments/schedules" 201 "$SCHED_STATUS"
assert_json "12 installments" "$SCHED_BODY" "len(d)" "12"

# ─── Step 12: Get Schedule ──────────────────────────────────────────────────

echo -e "\nStep 12: Get Schedule"
GET_SCHED=$(curl -s "$API/payments/schedules/$SUB_ID" -H "$AUTH")
assert_json "12 installments returned" "$GET_SCHED" "len(d)" "12"
assert_json "First installment DUE" "$GET_SCHED" "d[0].get('status')" "DUE"

# ─── Step 13: Upload Offline Receipt ────────────────────────────────────────

echo -e "\nStep 13: Upload Offline Receipt"
UPLOAD_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/receipts/upload/$PAYMENT_ID" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"file_base64":"JVBERi0xLjQK","file_name":"quittance_offline.pdf"}')

UPLOAD_STATUS=$(echo "$UPLOAD_RESP" | tail -1)
UPLOAD_BODY=$(echo "$UPLOAD_RESP" | sed '$d')
assert_status "POST /receipts/upload/:paymentId" 201 "$UPLOAD_STATUS"
assert_json "Receipt type = uploaded" "$UPLOAD_BODY" "d.get('type')" "uploaded"

# ─── Step 14: Direct Provider Callback ───────────────────────────────────────

echo -e "\nStep 14: Direct Provider Callback (webhook)"
# Create another payment
PAY2_RESP=$(curl -s -X POST "$API/payments/initiate" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"subscription_id\": \"$SUB_ID\",
    \"amount\": 12500,
    \"payer_phone\": \"+22507000099\",
    \"provider\": \"mock\"
  }")

PROVIDER_REF2=$(echo "$PAY2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('provider_ref',''))" 2>/dev/null)
echo "  Provider Ref 2: $PROVIDER_REF2"

CB_RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/payments/callback/mock" \
  -H "Content-Type: application/json" \
  -d "{\"provider_ref\":\"$PROVIDER_REF2\",\"status\":\"PAID\"}")

CB_STATUS=$(echo "$CB_RESP" | tail -1)
CB_BODY=$(echo "$CB_RESP" | sed '$d')
assert_status "POST /payments/callback/mock" 201 "$CB_STATUS"
assert_json "Callback → PAID" "$CB_BODY" "d.get('status')" "PAID"

# ─── Step 15: List Subscriptions ─────────────────────────────────────────────

echo -e "\nStep 15: List All Subscriptions"
LIST_RESP=$(curl -s -w "\n%{http_code}" "$API/subscriptions" -H "$AUTH")
LIST_STATUS=$(echo "$LIST_RESP" | tail -1)
assert_status "GET /subscriptions" 200 "$LIST_STATUS"

# ─── Summary ────────────────────────────────────────────────────────────────

echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  V1-09 E2E Results: $PASS/$TOTAL passed${NC}"
if [ $FAIL -gt 0 ]; then
  echo -e "${RED}  $FAIL test(s) FAILED${NC}"
else
  echo -e "${GREEN}  ALL TESTS PASSED ✓${NC}"
fi
echo -e "${YELLOW}═══════════════════════════════════════${NC}\n"

exit $FAIL
