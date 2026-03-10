import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'

/**
 * Permission Matrix based on business requirements
 */
export const PERMISSIONS = {
  // ส่งยอดเงิน
  SUBMIT_CLOSING: ['STAFF', 'CHECKER', 'MANAGER', 'OWNER'],

  // เช็คยอดเงิน (ต้องไม่เช็คยอดตัวเอง สำหรับ Checker)
  VERIFY_CLOSING: ['STAFF', 'CHECKER', 'AUDIT', 'MANAGER', 'OWNER'],

  // รับเงิน
  RECEIVE_CASH: ['AUDIT', 'MANAGER', 'OWNER'],

  // นำฝากเงิน
  CREATE_DEPOSIT: ['AUDIT', 'MANAGER', 'OWNER'],

  // ยืนยันยอดฝากธนาคาร
  CONFIRM_BANK_DEPOSIT: ['STAFF', 'OWNER'],

  // ดูรายงานสรุปการขาย
  VIEW_REPORTS: ['OWNER'],

  // จัดการพนักงาน
  MANAGE_USERS: ['OWNER', 'ADMIN'],

  // จัดการสาขา
  MANAGE_BRANCHES: ['OWNER', 'ADMIN'],

  // จัดการบัญชีธนาคาร
  MANAGE_BANKS: ['OWNER', 'ADMIN'],
} as const

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: keyof typeof PERMISSIONS
): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role)
}

/**
 * Check if a user can verify a closing
 * Rule: Checker cannot verify their own submission
 */
export function canVerifyClosing(
  userRole: UserRole,
  userId: string,
  submittedBy: string | null
): boolean {
  if (userRole === 'CHECKER' && submittedBy === userId) {
    return false
  }
  return true
}

/**
 * Check if a user can access a specific branch
 * - OWNER: can access all branches
 * - MANAGER: can only access authorized branches
 * - Others: can only access their assigned branch
 */
export async function canAccessBranch(
  userId: string,
  role: UserRole,
  branchId: string,
  userBranchId?: string | null
): Promise<boolean> {
  // Owner can access all branches
  if (role === 'OWNER') return true

  // Manager must have explicit access
  if (role === 'MANAGER') {
    const access = await db.managerBranchAccess.findUnique({
      where: {
        userId_branchId: { userId, branchId }
      }
    })
    return !!access
  }

  // Staff, Checker, Audit can only access their assigned branch
  if (['STAFF', 'CHECKER', 'AUDIT'].includes(role)) {
    return userBranchId === branchId
  }

  // Admin has no branch access
  return false
}

/**
 * Require permission middleware helper
 */
export function requirePermission(permission: keyof typeof PERMISSIONS) {
  return (role: UserRole) => {
    if (!hasPermission(role, permission)) {
      throw new Error('Forbidden: Insufficient permissions')
    }
  }
}
