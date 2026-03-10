/**
 * Test Account Credentials for E2E Testing
 * These accounts should match the seeded data in your database
 */

export type UserRole = 'STAFF' | 'AUDIT' | 'MANAGER' | 'OWNER' | 'ADMIN'

export interface TestAccount {
  email: string
  password: string
  role: UserRole
  displayName: string
}

/**
 * Predefined test accounts for different roles
 * Ensure these accounts exist in your test database (run seed script)
 */
export const TEST_ACCOUNTS: Record<string, TestAccount> = {
  staff: {
    email: 'staff.br001@mermed.com',
    password: 'Staff@2026',
    role: 'STAFF',
    displayName: 'Store Staff (Rama9)',
  },
  checker: {
    email: 'checker@mermaid.clinic',
    password: 'password123',
    role: 'STAFF',
    displayName: 'Checker Staff',
  },
  audit: {
    email: 'auditor@mermed.com',
    password: 'Auditor@2026',
    role: 'AUDIT',
    displayName: 'Auditor',
  },
  manager: {
    email: 'manager@mermed.com',
    password: 'Manager@2026',
    role: 'MANAGER',
    displayName: 'Manager',
  },
  owner: {
    email: 'owner@mermed.com',
    password: 'Owner@2026',
    role: 'OWNER',
    displayName: 'Owner',
  },
  admin: {
    email: 'admin@mermed.com',
    password: 'Admin@2026',
    role: 'ADMIN',
    displayName: 'Admin',
  },
}

/**
 * Get test account by role
 * @param role - User role
 * @returns TestAccount object
 */
export function getTestAccountByRole(role: UserRole): TestAccount {
  switch (role) {
    case 'STAFF':
      return TEST_ACCOUNTS.staff
    case 'AUDIT':
      return TEST_ACCOUNTS.audit
    case 'MANAGER':
      return TEST_ACCOUNTS.manager
    case 'OWNER':
      return TEST_ACCOUNTS.owner
    case 'ADMIN':
      return TEST_ACCOUNTS.admin
    default:
      throw new Error(`No test account found for role: ${role}`)
  }
}

/**
 * Get all test accounts as an array
 * Useful for testing multiple roles
 */
export function getAllTestAccounts(): TestAccount[] {
  return Object.values(TEST_ACCOUNTS)
}

/**
 * Validate if an account has the expected role
 * @param accountKey - Key from TEST_ACCOUNTS
 * @param expectedRole - Expected role
 */
export function validateAccountRole(
  accountKey: keyof typeof TEST_ACCOUNTS,
  expectedRole: UserRole
): boolean {
  return TEST_ACCOUNTS[accountKey].role === expectedRole
}

/**
 * Sample test data for closings
 */
export const TEST_CLOSING_DATA = {
  basic: {
    closingDate: new Date().toISOString().split('T')[0],
    posTotalSales: 50000,
    posCash: 20000,
    posCredit: 15000,
    posTransfer: 10000,
    posExpenses: 5000,
    handwrittenCashCount: 15000,
    handwrittenExpenses: 5000,
    handwrittenNetCash: 10000,
    edcTotalAmount: 15000,
  },
  withDiscrepancy: {
    closingDate: new Date().toISOString().split('T')[0],
    posTotalSales: 50000,
    posCash: 20000,
    posCredit: 15000,
    posTransfer: 10000,
    posExpenses: 5000,
    handwrittenCashCount: 15000,
    handwrittenExpenses: 5000,
    handwrittenNetCash: 10000,
    edcTotalAmount: 14000, // Discrepancy: 1000 baht difference
    discrepancyRemark: 'Test discrepancy - EDC settlement pending',
  },
}

/**
 * Sample test data for deposits
 */
export const TEST_DEPOSIT_DATA = {
  basic: {
    depositDate: new Date().toISOString().split('T')[0],
    cashAmount: 15000,
    slipNumber: 'SLIP-' + Date.now(),
    bankName: 'Bangkok Bank',
    accountNumber: '1234567890',
  },
}
