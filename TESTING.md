# Manual Testing Checklist - Role & Permission System

## Table of Contents
1. [Pre-Testing Setup](#1-pre-testing-setup)
2. [Permission Matrix Verification](#2-permission-matrix-verification)
3. [Critical Test Cases](#3-critical-test-cases)
4. [API Endpoint Tests](#4-api-endpoint-tests)
5. [Edge Cases](#5-edge-cases)
6. [Regression Tests](#6-regression-tests)

---

## 1. Pre-Testing Setup

### 1.1 Test Accounts

All test accounts use secure passwords. Use the credentials below to test each role:

| Role | Email | Password | Branch Assignment | Notes |
|------|-------|----------|-------------------|-------|
| **Staff** | staff.br001@mermed.com | Staff@2026 | MerMed Rama9 (BR001) | Can only access assigned branch |
| **Staff** | staff.br002@mermed.com | Staff@2026 | MerMed Phuket (BR002) | Can only access assigned branch |
| **Staff** | staff.br003@mermed.com | Staff@2026 | MerMed Pattaya (BR003) | Can only access assigned branch |
| **Staff** | staff.br004@mermed.com | Staff@2026 | MerMed Central (BR004) | Can only access assigned branch |
| **Staff** | staff.br005@mermed.com | Staff@2026 | MerMed Chiang Mai (BR005) | Can only access assigned branch |
| **Checker** | checker@mermaid.clinic | password123 | MerMed Rama9 (BR001) | Can verify others' submissions |
| **Audit** | auditor@mermed.com | Auditor@2026 | None (Multi-branch) | Can receive cash and create deposits |
| **Manager** | manager@mermed.com | Manager@2026 | None (Has access to BR001, BR002, BR003) | Can only access authorized branches |
| **Owner** | owner@mermed.com | Owner@2026 | None (All branches) | Full system access |
| **Admin** | admin@mermed.com | Admin@2026 | None | System management only, no operations |

### 1.2 Initial Data Setup Requirements

Before testing, ensure the following data exists:

#### Run Database Seed
```bash
npm run db:seed
# or
npx prisma db seed
```

This will create:
- 5 active branches (Rama9, Phuket, Pattaya, Central, Chiang Mai)
- 10 test users (5 staff, 1 checker, 1 auditor, 1 manager, 1 owner, 1 admin)
- 3 company bank accounts
- Sample daily closings in various states:
  - 3 SUBMITTED closings (waiting for cash receipt)
  - 2 CASH_RECEIVED closings (waiting for deposit)
  - 2 DEPOSITED closings (completed)
- Manager branch access records

#### Verify Database State
```bash
# Check user count
psql $DATABASE_URL -c "SELECT role, COUNT(*) FROM \"User\" GROUP BY role;"

# Check branches
psql $DATABASE_URL -c "SELECT \"branchCode\", \"branchName\", status FROM \"Branch\";"

# Check manager access
psql $DATABASE_URL -c "SELECT u.email, b.\"branchName\" FROM \"ManagerBranchAccess\" m JOIN \"User\" u ON m.\"userId\" = u.id JOIN \"Branch\" b ON m.\"branchId\" = b.id;"
```

### 1.3 Branch Assignments for Testing

| Branch Code | Branch Name | Staff Assigned | Manager Access | Notes |
|-------------|-------------|----------------|----------------|-------|
| BR001 | MerMed Rama9 | staff.br001, checker | Yes | Has test data |
| BR002 | MerMed Phuket | staff.br002 | Yes | Has test data |
| BR003 | MerMed Pattaya | staff.br003 | Yes | Has test data |
| BR004 | MerMed Central | staff.br004 | No | Manager has NO access |
| BR005 | MerMed Chiang Mai | staff.br005 | No | Manager has NO access |

---

## 2. Permission Matrix Verification

Use this table to manually verify each role's permissions. Mark with X when verified.

| Permission | Staff | Checker | Audit | Manager | Owner | Admin | Notes |
|------------|:-----:|:-------:|:-----:|:-------:|:-----:|:-----:|-------|
| **ส่งยอดเงิน (Submit closing)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Staff/Checker: Own branch only |
| **เช็คยอดเงิน (Verify closing)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Checker cannot verify own submission |
| **รับเงิน (Receive cash)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Only Audit/Manager/Owner |
| **นำฝากเงิน (Create deposit)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Only Audit/Manager/Owner |
| **ยืนยันยอดฝากธนาคาร (Confirm bank deposit)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Only Staff/Owner |
| **ดูรายงาน (View reports)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Only Owner |
| **จัดการพนักงาน (Manage users)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Only Owner/Admin |
| **จัดการสาขา (Manage branches)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Only Owner/Admin |
| **จัดการบัญชีธนาคาร (Manage banks)** | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Only Owner/Admin |

### Expected Permission Matrix

#### Staff
- Can: Submit closing (own branch), Verify closing (own branch), Confirm bank deposit
- Cannot: Receive cash, Create deposit, View reports, Manage system

#### Checker
- Can: Submit closing (own branch), Verify closing (own branch, but NOT own submission), Confirm bank deposit
- Cannot: Receive cash, Create deposit, View reports, Manage system

#### Audit
- Can: Verify closing (any branch), Receive cash, Create deposit
- Cannot: Submit closing, Confirm bank deposit, View reports, Manage system

#### Manager
- Can: Submit closing (authorized branches), Verify closing (authorized branches), Receive cash (authorized branches), Create deposit (authorized branches)
- Cannot: Access unauthorized branches, Confirm bank deposit, View reports, Manage system

#### Owner
- Can: Everything except system management
- Full access to all operational features and all branches

#### Admin
- Can: Manage users, Manage branches, Manage banks
- Cannot: Access operational features (closings, deposits, reports)

---

## 3. Critical Test Cases

### 3.1 Checker Self-Verification Restriction

**Test Case ID:** TC-001

**Objective:** Verify that Checker cannot verify their own submission

**Prerequisites:**
- Logged in as Checker (checker@mermaid.clinic)
- Checker has submitted a closing

**Steps:**
1. [ ] Login as Checker
2. [ ] Create a new daily closing as Checker
3. [ ] Submit the closing (status changes to SUBMITTED)
4. [ ] Attempt to verify the same closing
5. [ ] Expected: Receive error "Checker ไม่สามารถเช็คยอดที่ตัวเองส่งได้"

**API Test:**
```bash
# Get Checker's token first
CHECKER_TOKEN="your_checker_jwt_token"
CLOSING_ID="closing_id_submitted_by_checker"

# Try to verify own submission (should fail)
curl -X POST http://localhost:3000/api/closings/$CLOSING_ID/verify \
  -H "Authorization: Bearer $CHECKER_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 403 Forbidden with error message
```

**Pass Criteria:** [ ] Request returns 403 Forbidden

---

### 3.2 Manager Branch Access Control

**Test Case ID:** TC-002

**Objective:** Verify Manager can only access authorized branches

**Prerequisites:**
- Logged in as Manager (manager@mermed.com)
- Manager has access to BR001, BR002, BR003
- Manager does NOT have access to BR004, BR005

**Test 2A: Access Authorized Branch**
1. [ ] Login as Manager
2. [ ] Navigate to closings list
3. [ ] Filter by BR001 (Rama9)
4. [ ] Expected: See closings for BR001

**Test 2B: Access Unauthorized Branch**
1. [ ] Login as Manager
2. [ ] Attempt to view closings for BR004 (Central)
3. [ ] Expected: Receive 403 Forbidden or empty results

**API Test:**
```bash
MANAGER_TOKEN="your_manager_jwt_token"

# Should succeed - authorized branch
curl http://localhost:3000/api/closings?branchId=BR001_ID \
  -H "Authorization: Bearer $MANAGER_TOKEN"

# Should fail - unauthorized branch
curl http://localhost:3000/api/closings?branchId=BR004_ID \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

**Pass Criteria:**
- [ ] Can access BR001, BR002, BR003
- [ ] Cannot access BR004, BR005

---

### 3.3 Staff Branch Isolation

**Test Case ID:** TC-003

**Objective:** Verify Staff can only see/edit their own branch data

**Prerequisites:**
- Logged in as Staff (staff.br001@mermed.com) - assigned to BR001
- Data exists in multiple branches

**Steps:**
1. [ ] Login as Staff for BR001
2. [ ] View closings list
3. [ ] Expected: Only see closings for BR001
4. [ ] Attempt to create closing for BR002
5. [ ] Expected: Receive 403 Forbidden or validation error

**API Test:**
```bash
STAFF_TOKEN="your_staff_jwt_token"

# List closings - should only show own branch
curl http://localhost:3000/api/closings \
  -H "Authorization: Bearer $STAFF_TOKEN"

# Try to create closing for another branch (should fail)
curl -X POST http://localhost:3000/api/closings \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "closingDate": "2026-03-10",
    "branchId": "BR002_ID",
    "posTotalSales": 10000
  }'
```

**Pass Criteria:** [ ] Staff can only access own branch data

---

### 3.4 Admin Operational Access Restriction

**Test Case ID:** TC-004

**Objective:** Verify Admin cannot access operational features

**Prerequisites:**
- Logged in as Admin (admin@mermed.com)

**Steps:**
1. [ ] Login as Admin
2. [ ] Attempt to view closings list
3. [ ] Expected: See empty list or limited view
4. [ ] Attempt to create deposit
5. [ ] Expected: Receive 403 Forbidden
6. [ ] Attempt to view reports
7. [ ] Expected: Receive 403 Forbidden
8. [ ] Verify can access user management
9. [ ] Verify can access branch management

**API Tests:**
```bash
ADMIN_TOKEN="your_admin_jwt_token"

# Should FAIL - no operational access
curl http://localhost:3000/api/closings \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X POST http://localhost:3000/api/deposits \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"closingId": "some_id"}'

curl http://localhost:3000/api/reports/branch-revenue \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Should SUCCEED - system management
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl http://localhost:3000/api/admin/branches \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Pass Criteria:**
- [ ] Admin blocked from operational features
- [ ] Admin can access system management

---

### 3.5 Owner Full Access

**Test Case ID:** TC-005

**Objective:** Verify Owner can access everything

**Prerequisites:**
- Logged in as Owner (owner@mermed.com)

**Steps:**
1. [ ] Login as Owner
2. [ ] View closings for all branches
3. [ ] Create closing for any branch
4. [ ] Verify closing
5. [ ] Receive cash
6. [ ] Create deposit
7. [ ] Confirm bank deposit
8. [ ] View reports
9. [ ] Access user management (should work)
10. [ ] Access branch management (should work)

**Pass Criteria:** [ ] Owner can perform all operations

---

## 4. API Endpoint Tests

Test each endpoint with different roles. Use the following template for each endpoint.

### 4.1 Authentication Endpoints

#### POST /api/auth/login
```bash
# Login as Staff
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff.br001@mermed.com",
    "password": "Staff@2026"
  }'

# Expected: 200 OK with JWT token
```

**Test Checklist:**
- [ ] Staff login successful
- [ ] Checker login successful
- [ ] Audit login successful
- [ ] Manager login successful
- [ ] Owner login successful
- [ ] Admin login successful
- [ ] Invalid credentials rejected

---

### 4.2 Closing Endpoints

#### GET /api/closings
**Expected Access:** Staff (own branch), Checker (own branch), Audit (all), Manager (authorized branches), Owner (all)

```bash
# Test with each role
curl http://localhost:3000/api/closings \
  -H "Authorization: Bearer $TOKEN"
```

**Test Matrix:**

| Role | Expected Result | Status |
|------|----------------|--------|
| Staff | Own branch only | [ ] |
| Checker | Own branch only | [ ] |
| Audit | All branches | [ ] |
| Manager | Authorized branches only | [ ] |
| Owner | All branches | [ ] |
| Admin | Empty or 403 | [ ] |

---

#### POST /api/closings
**Expected Access:** Staff, Checker, Manager, Owner

```bash
curl -X POST http://localhost:3000/api/closings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "closingDate": "2026-03-10",
    "posTotalSales": 45000,
    "posCash": 15000,
    "posCredit": 20000,
    "posTransfer": 10000,
    "posExpenses": 2000,
    "posBillCount": 45,
    "posAvgPerBill": 1000,
    "handwrittenCashCount": 15000,
    "handwrittenExpenses": 2000,
    "handwrittenNetCash": 13000,
    "edcTotalAmount": 20000
  }'
```

**Test Checklist:**
- [ ] Staff can create for own branch
- [ ] Checker can create for own branch
- [ ] Manager can create for authorized branches
- [ ] Manager blocked for unauthorized branches
- [ ] Owner can create for any branch
- [ ] Audit blocked from creating
- [ ] Admin blocked from creating

---

#### POST /api/closings/:id/submit
**Expected Access:** Staff, Checker, Manager, Owner (with branch access)

```bash
curl -X POST http://localhost:3000/api/closings/$CLOSING_ID/submit \
  -H "Authorization: Bearer $TOKEN"
```

**Test Checklist:**
- [ ] Staff can submit own branch
- [ ] Staff blocked from other branches
- [ ] Manager can submit authorized branches
- [ ] Can only submit DRAFT status

---

#### POST /api/closings/:id/verify
**Expected Access:** Staff, Checker, Audit, Manager, Owner

**Special Rule:** Checker cannot verify own submission

```bash
curl -X POST http://localhost:3000/api/closings/$CLOSING_ID/verify \
  -H "Authorization: Bearer $TOKEN"
```

**Test Checklist:**
- [ ] Staff can verify (own branch)
- [ ] Checker can verify others' submissions
- [ ] Checker blocked from verifying own submission
- [ ] Audit can verify any branch
- [ ] Manager can verify authorized branches
- [ ] Can only verify SUBMITTED status

---

#### POST /api/closings/:id/receive-cash
**Expected Access:** Audit, Manager, Owner

```bash
curl -X POST http://localhost:3000/api/closings/$CLOSING_ID/receive-cash \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discrepancyNote": "เงินครบถ้วน"
  }'
```

**Test Checklist:**
- [ ] Audit can receive cash
- [ ] Manager can receive cash (authorized branches)
- [ ] Owner can receive cash (all branches)
- [ ] Staff blocked
- [ ] Checker blocked
- [ ] Admin blocked
- [ ] Can only receive SUBMITTED status
- [ ] Requires note if discrepancy exists

---

### 4.3 Deposit Endpoints

#### POST /api/deposits
**Expected Access:** Audit, Manager, Owner

```bash
curl -X POST http://localhost:3000/api/deposits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "closingId": "$CLOSING_ID",
    "depositSlipUrl": "https://example.com/slip.jpg",
    "depositDate": "2026-03-10",
    "bankName": "ธนาคารกสิกรไทย",
    "accountNumber": "123-4-56789-0"
  }'
```

**Test Checklist:**
- [ ] Audit can create deposit
- [ ] Manager can create deposit (authorized branches)
- [ ] Owner can create deposit
- [ ] Staff blocked
- [ ] Checker blocked
- [ ] Admin blocked
- [ ] Can only create for CASH_RECEIVED status

---

#### POST /api/deposits/:id/bank-confirm
**Expected Access:** Owner only

```bash
curl -X POST http://localhost:3000/api/deposits/$DEPOSIT_ID/bank-confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actualDepositAmount": 13800,
    "remark": "ยอดเงินตรง"
  }'
```

**Test Checklist:**
- [ ] Owner can confirm bank deposit
- [ ] All other roles blocked (403 Forbidden)
- [ ] Can only confirm APPROVED deposits
- [ ] Tracks variance if amounts differ

---

#### POST /api/deposits/:id/staff-confirm
**Expected Access:** Staff, Owner

```bash
curl -X POST http://localhost:3000/api/deposits/$DEPOSIT_ID/staff-confirm \
  -H "Authorization: Bearer $TOKEN"
```

**Test Checklist:**
- [ ] Staff can confirm deposit
- [ ] Owner can confirm deposit
- [ ] Other roles blocked

---

### 4.4 Report Endpoints

#### GET /api/reports/branch-revenue
**Expected Access:** Owner only

```bash
curl "http://localhost:3000/api/reports/branch-revenue?startDate=2026-03-01&endDate=2026-03-10" \
  -H "Authorization: Bearer $TOKEN"
```

**Test Checklist:**
- [ ] Owner can access reports
- [ ] All other roles receive 403 Forbidden
- [ ] Returns revenue summary for all branches
- [ ] Date range filter works

---

### 4.5 Admin Endpoints

#### GET /api/admin/users
**Expected Access:** Owner, Admin

```bash
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

**Test Checklist:**
- [ ] Owner can list users
- [ ] Admin can list users
- [ ] All other roles receive 403 Forbidden

---

#### POST /api/admin/users
**Expected Access:** Owner, Admin

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@2026",
    "firstName": "Test",
    "lastName": "User",
    "role": "STAFF",
    "branchId": "BR001_ID"
  }'
```

**Test Checklist:**
- [ ] Owner can create users
- [ ] Admin can create users
- [ ] Staff role requires branchId
- [ ] Other roles receive 403 Forbidden
- [ ] Duplicate email rejected
- [ ] Duplicate username rejected

---

#### GET /api/admin/branches
**Expected Access:** Owner, Admin

```bash
curl http://localhost:3000/api/admin/branches \
  -H "Authorization: Bearer $TOKEN"
```

**Test Checklist:**
- [ ] Owner can list branches
- [ ] Admin can list branches
- [ ] Other roles receive 403 Forbidden

---

#### POST /api/admin/branches
**Expected Access:** Owner, Admin

```bash
curl -X POST http://localhost:3000/api/admin/branches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchCode": "BR006",
    "branchName": "Test Branch",
    "address": "123 Test St",
    "phoneNumber": "02-000-0000"
  }'
```

**Test Checklist:**
- [ ] Owner can create branches
- [ ] Admin can create branches
- [ ] Duplicate branch code rejected
- [ ] Other roles receive 403 Forbidden

---

#### GET /api/admin/manager-access
**Expected Access:** Owner, Admin

```bash
curl http://localhost:3000/api/admin/manager-access \
  -H "Authorization: Bearer $TOKEN"
```

**Test Checklist:**
- [ ] Owner can list manager access
- [ ] Admin can list manager access
- [ ] Other roles receive 403 Forbidden

---

#### POST /api/admin/manager-access
**Expected Access:** Owner, Admin

```bash
curl -X POST http://localhost:3000/api/admin/manager-access \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "MANAGER_USER_ID",
    "branchId": "BRANCH_ID"
  }'
```

**Test Checklist:**
- [ ] Owner can grant manager access
- [ ] Admin can grant manager access
- [ ] Only MANAGER role users can be granted access
- [ ] Other roles receive 403 Forbidden

---

## 5. Edge Cases

### 5.1 User with No Branch Assignment

**Test Case ID:** EC-001

**Setup:**
1. [ ] Create user with STAFF role but no branchId
2. [ ] Login as that user
3. [ ] Attempt to create closing

**Expected Behavior:**
- [ ] User can login successfully
- [ ] Attempting to create closing returns error "User has no branch assigned"
- [ ] Cannot view any closings

**API Test:**
```bash
# Create user without branch
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "orphan@mermed.com",
    "username": "orphan",
    "password": "Test@2026",
    "firstName": "Orphan",
    "lastName": "User",
    "role": "STAFF"
  }'

# Try to create closing
curl -X POST http://localhost:3000/api/closings \
  -H "Authorization: Bearer $ORPHAN_TOKEN" \
  -d '{...}'
```

---

### 5.2 Manager with No Branch Access

**Test Case ID:** EC-002

**Setup:**
1. [ ] Create new MANAGER role user
2. [ ] Do not assign any branch access
3. [ ] Login as that manager
4. [ ] Attempt to view closings

**Expected Behavior:**
- [ ] Manager can login
- [ ] Closings list returns empty
- [ ] Cannot create closing (no branch access)
- [ ] Cannot access any branch data

**API Test:**
```bash
# Create manager without access
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmanager@mermed.com",
    "username": "newmanager",
    "password": "Test@2026",
    "firstName": "New",
    "lastName": "Manager",
    "role": "MANAGER"
  }'

# Try to list closings
curl http://localhost:3000/api/closings \
  -H "Authorization: Bearer $NEW_MANAGER_TOKEN"
```

---

### 5.3 Expired JWT Tokens

**Test Case ID:** EC-003

**Setup:**
1. [ ] Obtain valid JWT token
2. [ ] Wait for token to expire (or manipulate expiry)
3. [ ] Attempt to access protected endpoint

**Expected Behavior:**
- [ ] Returns 401 Unauthorized
- [ ] Error message indicates expired token
- [ ] User redirected to login

**API Test:**
```bash
# Use expired token
curl http://localhost:3000/api/closings \
  -H "Authorization: Bearer $EXPIRED_TOKEN"

# Expected: 401 Unauthorized
```

---

### 5.4 Invalid Role Transitions

**Test Case ID:** EC-004

**Setup:**
1. [ ] User starts with STAFF role
2. [ ] Attempt to manually change role in database
3. [ ] Test permission enforcement

**Expected Behavior:**
- [ ] Cannot escalate privileges through API
- [ ] Direct database changes reflected in permissions
- [ ] Only Owner/Admin can change user roles

**Test Steps:**
1. [ ] Login as Staff
2. [ ] Verify Staff permissions
3. [ ] Admin changes user to Manager role
4. [ ] User logs out and logs back in
5. [ ] Verify Manager permissions now apply

---

### 5.5 Concurrent Verification Attempts

**Test Case ID:** EC-005

**Objective:** Test race condition in verification

**Setup:**
1. [ ] Have one SUBMITTED closing
2. [ ] Two checkers attempt to verify simultaneously

**Expected Behavior:**
- [ ] First verification succeeds
- [ ] Second verification fails or updates correctly
- [ ] No data corruption

---

### 5.6 Branch Access Removal During Session

**Test Case ID:** EC-006

**Setup:**
1. [ ] Manager logged in with access to BR001
2. [ ] Admin removes Manager's access to BR001
3. [ ] Manager still has valid JWT token

**Expected Behavior:**
- [ ] Existing token continues to work until expiry
- [ ] After token refresh, access is blocked
- [ ] Real-time permission check in sensitive operations

**Test Steps:**
1. [ ] Login as Manager
2. [ ] Access BR001 closings
3. [ ] Admin removes manager access
4. [ ] Manager attempts to access BR001 again
5. [ ] Expected: Access denied if permission checked in real-time

---

### 5.7 Duplicate Closing Submission

**Test Case ID:** EC-007

**Setup:**
1. [ ] Create closing for BR001 on 2026-03-10
2. [ ] Attempt to create another closing for same branch and date

**Expected Behavior:**
- [ ] Second creation fails
- [ ] Returns 409 Conflict
- [ ] Error message: "มีการส่งยอดวันนี้ในสาขานี้แล้ว"

---

### 5.8 Status Transition Validation

**Test Case ID:** EC-008

**Test each invalid status transition:**

1. [ ] Submit non-DRAFT closing
2. [ ] Verify non-SUBMITTED closing
3. [ ] Receive cash from non-SUBMITTED closing
4. [ ] Create deposit for non-CASH_RECEIVED closing
5. [ ] Confirm bank for non-APPROVED deposit

**Expected:** All return 400 Bad Request with appropriate error messages

---

## 6. Regression Tests

### 6.1 Existing Functionality

#### Daily Closing Flow
- [ ] Create draft closing
- [ ] Submit closing
- [ ] Verify closing
- [ ] Receive cash
- [ ] Create deposit
- [ ] Confirm bank receipt
- [ ] Check audit logs created

#### Deposit Flow
- [ ] Upload deposit slip
- [ ] Create deposit record
- [ ] Staff confirmation works
- [ ] Owner bank confirmation works
- [ ] Variance detection works

#### Report Generation
- [ ] Branch revenue report generates
- [ ] Dashboard data loads
- [ ] Export functionality works

---

### 6.2 Old Role Names Migration

**Test Case ID:** RT-001

**Objective:** Ensure old role references are removed

**Steps:**
1. [ ] Search codebase for old role names (if any existed)
2. [ ] Verify database schema uses new role enum
3. [ ] Check all UI text uses new role names
4. [ ] Verify no hardcoded old role strings

**Database Check:**
```bash
# Check for any old role values
psql $DATABASE_URL -c "SELECT DISTINCT role FROM \"User\";"

# Should only show: STAFF, CHECKER, AUDIT, MANAGER, OWNER, ADMIN
```

---

### 6.3 No Broken Links or 403 Errors

**Test Case ID:** RT-002

**For each role, navigate through all UI pages:**

#### Staff Navigation
- [ ] Dashboard loads
- [ ] Closings list loads
- [ ] Can create new closing
- [ ] Profile page works
- [ ] Settings accessible
- [ ] No 403 errors on valid pages

#### Checker Navigation
- [ ] All Staff pages work
- [ ] Verification UI accessible

#### Audit Navigation
- [ ] Cash receipt UI works
- [ ] Deposit creation works
- [ ] Can view all branches

#### Manager Navigation
- [ ] Can switch between authorized branches
- [ ] Unauthorized branches return graceful error
- [ ] All operational features work for authorized branches

#### Owner Navigation
- [ ] All operational pages work
- [ ] Reports page loads
- [ ] System management pages load

#### Admin Navigation
- [ ] User management loads
- [ ] Branch management loads
- [ ] Operational pages gracefully restricted or hidden

---

### 6.4 Audit Log Verification

**Test Case ID:** RT-003

**Verify audit logs are created for:**

- [ ] User login
- [ ] Closing status changes
- [ ] Deposit creation
- [ ] Bank confirmation
- [ ] User creation/modification
- [ ] Branch creation/modification
- [ ] Manager access changes

**Query Audit Logs:**
```bash
psql $DATABASE_URL -c "SELECT action, \"entityType\", \"createdAt\" FROM \"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 20;"
```

---

### 6.5 Performance Testing

**Test Case ID:** RT-004

- [ ] Login response time < 2 seconds
- [ ] Closings list loads < 3 seconds
- [ ] Report generation < 5 seconds
- [ ] No N+1 query issues
- [ ] Database indexes working

---

### 6.6 Security Headers

**Test Case ID:** RT-005

```bash
# Check security headers
curl -I http://localhost:3000/api/closings

# Verify headers present:
# - Content-Type: application/json
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
```

---

## Test Execution Tracking

### Summary Checklist

#### Phase 1: Setup
- [ ] Database seeded successfully
- [ ] All test accounts verified
- [ ] Test data created

#### Phase 2: Permission Matrix
- [ ] All role permissions verified
- [ ] Permission matrix table completed

#### Phase 3: Critical Tests
- [ ] TC-001: Checker self-verification blocked
- [ ] TC-002: Manager branch access enforced
- [ ] TC-003: Staff branch isolation verified
- [ ] TC-004: Admin operational access blocked
- [ ] TC-005: Owner full access confirmed

#### Phase 4: API Endpoints
- [ ] Authentication endpoints tested
- [ ] Closing endpoints tested
- [ ] Deposit endpoints tested
- [ ] Report endpoints tested
- [ ] Admin endpoints tested

#### Phase 5: Edge Cases
- [ ] All 8 edge cases tested
- [ ] Edge case results documented

#### Phase 6: Regression
- [ ] Existing functionality verified
- [ ] No broken links found
- [ ] Audit logs working
- [ ] Performance acceptable

---

## Issues Found

Use this section to document any issues found during testing:

### Issue Template

```markdown
**Issue ID:** ISS-XXX
**Severity:** Critical | High | Medium | Low
**Test Case:** TC-XXX or RT-XXX
**Description:**
**Steps to Reproduce:**
1.
2.
3.
**Expected Behavior:**
**Actual Behavior:**
**Screenshots/Logs:**
**Status:** Open | In Progress | Resolved
```

---

## Sign-off

### Tester Information
- **Tester Name:** _______________
- **Test Date:** _______________
- **Environment:** Development | Staging | Production
- **Database State:** Fresh Seed | Existing Data

### Results Summary
- **Total Test Cases:**
- **Passed:**
- **Failed:**
- **Blocked:**
- **Pass Rate:**

### Approval
- [ ] All critical tests passed
- [ ] All high-priority issues resolved
- [ ] Regression tests passed
- [ ] Ready for deployment

**Signature:** _______________ **Date:** _______________

---

## Appendix

### Useful Commands

#### Reset Database
```bash
npx prisma migrate reset
npx prisma db seed
```

#### Generate New Test Token
```bash
# Login via API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "staff.br001@mermed.com", "password": "Staff@2026"}' \
  | jq -r '.token'
```

#### Check User Permissions
```bash
# Get user details
psql $DATABASE_URL -c "SELECT email, role, \"branchId\" FROM \"User\" WHERE email = 'staff.br001@mermed.com';"
```

#### View Manager Access
```bash
psql $DATABASE_URL -c "
SELECT
  u.email,
  u.role,
  b.\"branchCode\",
  b.\"branchName\"
FROM \"ManagerBranchAccess\" mba
JOIN \"User\" u ON mba.\"userId\" = u.id
JOIN \"Branch\" b ON mba.\"branchId\" = b.id
ORDER BY u.email, b.\"branchCode\";
"
```

### Quick Reference: HTTP Status Codes

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid input or validation error
- **401 Unauthorized** - Not authenticated (missing/invalid token)
- **403 Forbidden** - Authenticated but insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate resource (e.g., duplicate closing)
- **500 Internal Server Error** - Server-side error

### Contact Information

For questions about this testing document:
- **Technical Lead:** [Contact Info]
- **QA Lead:** [Contact Info]
- **Product Owner:** [Contact Info]
