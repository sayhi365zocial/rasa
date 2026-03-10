# Test Suite Documentation

This directory contains comprehensive tests for the role and permission system in PSARS (Pharmacy Sales Audit & Reconciliation System).

## Test Structure

```
tests/
├── api/
│   └── permissions.test.ts         # API endpoint permission tests
├── e2e/
│   └── role-workflows.test.ts      # End-to-end role workflow tests
├── utils/
│   └── mocks.ts                    # Mock utilities and helpers
├── setup.ts                        # Test environment setup
└── README.md                       # This file

lib/auth/__tests__/
└── permissions.test.ts             # Unit tests for permission functions
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test suites
```bash
npm run test:permissions    # Permission system unit tests
npm run test:api           # API integration tests
npm run test:e2e           # E2E workflow tests
```

## Test Coverage

### 1. Permission System Unit Tests
**File:** `lib/auth/__tests__/permissions.test.ts`

Tests the core permission functions:

#### `hasPermission()` Tests
- ✅ SUBMIT_CLOSING permission (STAFF, CHECKER, MANAGER, OWNER ✓ | ADMIN, AUDIT ✗)
- ✅ VERIFY_CLOSING permission (STAFF, CHECKER, AUDIT, MANAGER, OWNER ✓ | ADMIN ✗)
- ✅ RECEIVE_CASH permission (AUDIT, MANAGER, OWNER ✓ | STAFF, CHECKER, ADMIN ✗)
- ✅ CREATE_DEPOSIT permission (AUDIT, MANAGER, OWNER ✓ | Others ✗)
- ✅ CONFIRM_BANK_DEPOSIT permission (STAFF, OWNER ✓ | Others ✗)
- ✅ VIEW_REPORTS permission (OWNER only ✓)
- ✅ MANAGE_USERS permission (OWNER, ADMIN ✓ | Others ✗)
- ✅ MANAGE_BRANCHES permission (OWNER, ADMIN ✓ | Others ✗)
- ✅ MANAGE_BANKS permission (OWNER, ADMIN ✓ | Others ✗)

#### `canVerifyClosing()` Tests
- ✅ Allows all roles with permission to verify closings
- ✅ **CRITICAL:** Prevents CHECKER from verifying their own submission
- ✅ Handles null submittedBy values
- ✅ Tests exact userId matching for self-verification prevention

#### `canAccessBranch()` Tests
- ✅ OWNER: Can access all branches
- ✅ MANAGER: Can only access explicitly authorized branches
- ✅ STAFF/CHECKER/AUDIT: Can only access their assigned branch
- ✅ ADMIN: Cannot access any branch
- ✅ Database query verification for manager access

**Total Tests:** 66 tests

### 2. API Integration Tests
**File:** `tests/api/permissions.test.ts`

Tests API endpoints with different role permissions:

#### Endpoints Tested
- ✅ POST `/api/closings/[id]/submit` - All roles
- ✅ POST `/api/closings/[id]/verify` - All roles + self-verification check
- ✅ POST `/api/closings/[id]/receive-cash` - AUDIT, MANAGER, OWNER only
- ✅ POST `/api/deposits` - AUDIT, MANAGER, OWNER only
- ✅ POST `/api/deposits/[id]/approval` - OWNER only
- ✅ GET `/api/reports/branch-revenue` - OWNER only
- ✅ GET `/api/admin/manager-access` - OWNER only
- ✅ POST `/api/admin/manager-access` - OWNER only

#### Additional Coverage
- ✅ Status validation (DRAFT → SUBMITTED → CASH_RECEIVED → DEPOSITED)
- ✅ Unauthenticated request handling
- ✅ Missing required fields validation
- ✅ Privilege escalation prevention
- ✅ Entity existence validation
- ✅ Duplicate access grant prevention

**Total Tests:** 44 tests

### 3. E2E Role Workflow Tests
**File:** `tests/e2e/role-workflows.test.ts`

Tests complete workflows for each role:

#### Staff Workflow
- ✅ Create closing → Submit → Confirm deposit
- ✅ Branch access restrictions
- ✅ Permission limitations (cannot receive cash, create deposits)

#### Checker Workflow
- ✅ Verify closings submitted by others
- ✅ **CRITICAL:** Self-verification prevention
- ✅ Can submit closings
- ✅ Permission limitations

#### Audit Workflow
- ✅ Receive cash → Create deposit
- ✅ Can verify closings
- ✅ Branch access restrictions
- ✅ Cannot submit closings or approve deposits

#### Manager Workflow
- ✅ Access multiple authorized branches
- ✅ Cannot access unauthorized branches
- ✅ Can submit, verify, receive cash, create deposits
- ✅ Cannot approve deposits or view reports
- ✅ Multi-branch authorization

#### Owner Workflow
- ✅ Approve deposits (APPROVED, FLAGGED, REJECTED)
- ✅ View branch revenue reports
- ✅ Access all branches
- ✅ Manage users and branches
- ✅ Grant manager access
- ✅ All closing operations

#### Cross-role Scenarios
- ✅ Separation of duties enforcement
- ✅ Multi-step workflows with different roles
- ✅ Unauthorized role access prevention

**Total Tests:** 48 tests

## Test Statistics

- **Total Test Suites:** 3
- **Total Tests:** 158 passing
- **Permission Coverage:** 85.71% of permissions.ts
- **Branch Coverage:** 85.71% of permissions.ts

## Key Test Scenarios

### Critical Security Tests

1. **Checker Self-Verification Prevention**
   ```typescript
   // Prevents conflict of interest
   canVerifyClosing('CHECKER', 'checker-123', 'checker-123') // → false
   ```

2. **Branch Access Control**
   ```typescript
   // Manager needs explicit access
   canAccessBranch('manager-123', 'MANAGER', 'branch-456', null)
   // → true only if ManagerBranchAccess exists
   ```

3. **Owner-Only Operations**
   ```typescript
   // Only OWNER can approve deposits
   POST /api/deposits/[id]/approval // → 403 for non-OWNER
   ```

4. **Status Flow Validation**
   ```typescript
   // Must follow: DRAFT → SUBMITTED → CASH_RECEIVED → DEPOSITED
   ```

### Edge Cases Tested

- ✅ Null/undefined branchId handling
- ✅ Non-existent entities (404 responses)
- ✅ Invalid status transitions
- ✅ Duplicate operations (e.g., already has access)
- ✅ Missing required fields
- ✅ Unauthenticated requests

## Mock Utilities

The `tests/utils/mocks.ts` file provides:

- `mockUserPayload()` - Create test user payloads
- `mockDailyClosing()` - Create test closing records
- `mockDeposit()` - Create test deposit records
- `mockManagerAccess()` - Create test manager access records
- `mockDb` - Mocked database client
- `resetAllMocks()` - Reset all mock functions

## Best Practices

1. **Always reset mocks** between tests using `beforeEach(() => jest.clearAllMocks())`
2. **Test both success and failure cases** for each permission
3. **Mock database calls** to avoid dependency on actual database
4. **Use descriptive test names** that explain what is being tested
5. **Test edge cases** like null values, invalid inputs, etc.

## Adding New Tests

When adding new permissions or roles:

1. Add permission tests to `lib/auth/__tests__/permissions.test.ts`
2. Add API integration tests to `tests/api/permissions.test.ts`
3. Add workflow tests to `tests/e2e/role-workflows.test.ts`
4. Update this README with the new test coverage

## Issues Found During Testing

✅ All tests passing - No issues found

## Future Improvements

- [ ] Add integration tests with real database (using test database)
- [ ] Add performance tests for permission checks
- [ ] Add tests for concurrent access scenarios
- [ ] Add tests for audit log generation
- [ ] Add tests for session management
- [ ] Add snapshot tests for API responses

## References

- Jest Documentation: https://jestjs.io/
- ts-jest: https://kulshekhar.github.io/ts-jest/
- Prisma Testing: https://www.prisma.io/docs/guides/testing
