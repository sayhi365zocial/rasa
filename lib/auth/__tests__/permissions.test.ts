import { UserRole } from '@prisma/client'
import { hasPermission, canVerifyClosing, canAccessBranch, PERMISSIONS } from '../permissions'

// Mock the database before importing mocks
jest.mock('@/lib/db', () => ({
  db: {
    managerBranchAccess: {
      findUnique: jest.fn(),
    },
  },
}))

import { mockDb } from '@/tests/utils/mocks'
const { db } = require('@/lib/db')

describe('Permission System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hasPermission', () => {
    describe('SUBMIT_CLOSING permission', () => {
      it('should allow STAFF to submit closings', () => {
        expect(hasPermission('STAFF', 'SUBMIT_CLOSING')).toBe(true)
      })

      it('should allow CHECKER to submit closings', () => {
        expect(hasPermission('CHECKER', 'SUBMIT_CLOSING')).toBe(true)
      })

      it('should allow MANAGER to submit closings', () => {
        expect(hasPermission('MANAGER', 'SUBMIT_CLOSING')).toBe(true)
      })

      it('should allow OWNER to submit closings', () => {
        expect(hasPermission('OWNER', 'SUBMIT_CLOSING')).toBe(true)
      })

      it('should NOT allow ADMIN to submit closings', () => {
        expect(hasPermission('ADMIN', 'SUBMIT_CLOSING')).toBe(false)
      })

      it('should NOT allow AUDIT to submit closings', () => {
        expect(hasPermission('AUDIT', 'SUBMIT_CLOSING')).toBe(false)
      })
    })

    describe('VERIFY_CLOSING permission', () => {
      it('should allow STAFF to verify closings', () => {
        expect(hasPermission('STAFF', 'VERIFY_CLOSING')).toBe(true)
      })

      it('should allow CHECKER to verify closings', () => {
        expect(hasPermission('CHECKER', 'VERIFY_CLOSING')).toBe(true)
      })

      it('should allow AUDIT to verify closings', () => {
        expect(hasPermission('AUDIT', 'VERIFY_CLOSING')).toBe(true)
      })

      it('should allow MANAGER to verify closings', () => {
        expect(hasPermission('MANAGER', 'VERIFY_CLOSING')).toBe(true)
      })

      it('should allow OWNER to verify closings', () => {
        expect(hasPermission('OWNER', 'VERIFY_CLOSING')).toBe(true)
      })

      it('should NOT allow ADMIN to verify closings', () => {
        expect(hasPermission('ADMIN', 'VERIFY_CLOSING')).toBe(false)
      })
    })

    describe('RECEIVE_CASH permission', () => {
      it('should allow AUDIT to receive cash', () => {
        expect(hasPermission('AUDIT', 'RECEIVE_CASH')).toBe(true)
      })

      it('should allow MANAGER to receive cash', () => {
        expect(hasPermission('MANAGER', 'RECEIVE_CASH')).toBe(true)
      })

      it('should allow OWNER to receive cash', () => {
        expect(hasPermission('OWNER', 'RECEIVE_CASH')).toBe(true)
      })

      it('should NOT allow STAFF to receive cash', () => {
        expect(hasPermission('STAFF', 'RECEIVE_CASH')).toBe(false)
      })

      it('should NOT allow CHECKER to receive cash', () => {
        expect(hasPermission('CHECKER', 'RECEIVE_CASH')).toBe(false)
      })

      it('should NOT allow ADMIN to receive cash', () => {
        expect(hasPermission('ADMIN', 'RECEIVE_CASH')).toBe(false)
      })
    })

    describe('CREATE_DEPOSIT permission', () => {
      it('should allow AUDIT to create deposits', () => {
        expect(hasPermission('AUDIT', 'CREATE_DEPOSIT')).toBe(true)
      })

      it('should allow MANAGER to create deposits', () => {
        expect(hasPermission('MANAGER', 'CREATE_DEPOSIT')).toBe(true)
      })

      it('should allow OWNER to create deposits', () => {
        expect(hasPermission('OWNER', 'CREATE_DEPOSIT')).toBe(true)
      })

      it('should NOT allow STAFF to create deposits', () => {
        expect(hasPermission('STAFF', 'CREATE_DEPOSIT')).toBe(false)
      })

      it('should NOT allow CHECKER to create deposits', () => {
        expect(hasPermission('CHECKER', 'CREATE_DEPOSIT')).toBe(false)
      })
    })

    describe('CONFIRM_BANK_DEPOSIT permission', () => {
      it('should allow STAFF to confirm bank deposits', () => {
        expect(hasPermission('STAFF', 'CONFIRM_BANK_DEPOSIT')).toBe(true)
      })

      it('should allow OWNER to confirm bank deposits', () => {
        expect(hasPermission('OWNER', 'CONFIRM_BANK_DEPOSIT')).toBe(true)
      })

      it('should NOT allow CHECKER to confirm bank deposits', () => {
        expect(hasPermission('CHECKER', 'CONFIRM_BANK_DEPOSIT')).toBe(false)
      })

      it('should NOT allow AUDIT to confirm bank deposits', () => {
        expect(hasPermission('AUDIT', 'CONFIRM_BANK_DEPOSIT')).toBe(false)
      })

      it('should NOT allow MANAGER to confirm bank deposits', () => {
        expect(hasPermission('MANAGER', 'CONFIRM_BANK_DEPOSIT')).toBe(false)
      })
    })

    describe('VIEW_REPORTS permission', () => {
      it('should allow OWNER to view reports', () => {
        expect(hasPermission('OWNER', 'VIEW_REPORTS')).toBe(true)
      })

      it('should NOT allow STAFF to view reports', () => {
        expect(hasPermission('STAFF', 'VIEW_REPORTS')).toBe(false)
      })

      it('should NOT allow MANAGER to view reports', () => {
        expect(hasPermission('MANAGER', 'VIEW_REPORTS')).toBe(false)
      })

      it('should NOT allow ADMIN to view reports', () => {
        expect(hasPermission('ADMIN', 'VIEW_REPORTS')).toBe(false)
      })
    })

    describe('MANAGE_USERS permission', () => {
      it('should allow OWNER to manage users', () => {
        expect(hasPermission('OWNER', 'MANAGE_USERS')).toBe(true)
      })

      it('should allow ADMIN to manage users', () => {
        expect(hasPermission('ADMIN', 'MANAGE_USERS')).toBe(true)
      })

      it('should NOT allow STAFF to manage users', () => {
        expect(hasPermission('STAFF', 'MANAGE_USERS')).toBe(false)
      })

      it('should NOT allow MANAGER to manage users', () => {
        expect(hasPermission('MANAGER', 'MANAGE_USERS')).toBe(false)
      })
    })

    describe('MANAGE_BRANCHES permission', () => {
      it('should allow OWNER to manage branches', () => {
        expect(hasPermission('OWNER', 'MANAGE_BRANCHES')).toBe(true)
      })

      it('should allow ADMIN to manage branches', () => {
        expect(hasPermission('ADMIN', 'MANAGE_BRANCHES')).toBe(true)
      })

      it('should NOT allow STAFF to manage branches', () => {
        expect(hasPermission('STAFF', 'MANAGE_BRANCHES')).toBe(false)
      })
    })

    describe('MANAGE_BANKS permission', () => {
      it('should allow OWNER to manage banks', () => {
        expect(hasPermission('OWNER', 'MANAGE_BANKS')).toBe(true)
      })

      it('should allow ADMIN to manage banks', () => {
        expect(hasPermission('ADMIN', 'MANAGE_BANKS')).toBe(true)
      })

      it('should NOT allow STAFF to manage banks', () => {
        expect(hasPermission('STAFF', 'MANAGE_BANKS')).toBe(false)
      })
    })
  })

  describe('canVerifyClosing', () => {
    it('should allow STAFF to verify any closing', () => {
      expect(canVerifyClosing('STAFF', 'user-123', 'user-456')).toBe(true)
    })

    it('should allow OWNER to verify any closing', () => {
      expect(canVerifyClosing('OWNER', 'user-123', 'user-456')).toBe(true)
    })

    it('should allow CHECKER to verify closing submitted by someone else', () => {
      expect(canVerifyClosing('CHECKER', 'checker-123', 'staff-456')).toBe(true)
    })

    it('should NOT allow CHECKER to verify their own submission', () => {
      expect(canVerifyClosing('CHECKER', 'checker-123', 'checker-123')).toBe(false)
    })

    it('should allow CHECKER to verify when submittedBy is null', () => {
      expect(canVerifyClosing('CHECKER', 'checker-123', null)).toBe(true)
    })

    it('should allow AUDIT to verify any closing', () => {
      expect(canVerifyClosing('AUDIT', 'user-123', 'user-456')).toBe(true)
    })

    it('should allow MANAGER to verify any closing', () => {
      expect(canVerifyClosing('MANAGER', 'user-123', 'user-456')).toBe(true)
    })

    it('should handle edge case where CHECKER verifies their exact same userId', () => {
      const userId = 'checker-exact-123'
      expect(canVerifyClosing('CHECKER', userId, userId)).toBe(false)
    })
  })

  describe('canAccessBranch', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe('OWNER role', () => {
      it('should allow OWNER to access any branch', async () => {
        const result = await canAccessBranch('owner-123', 'OWNER', 'branch-456', 'branch-123')
        expect(result).toBe(true)
      })

      it('should allow OWNER without branchId to access any branch', async () => {
        const result = await canAccessBranch('owner-123', 'OWNER', 'branch-456', null)
        expect(result).toBe(true)
      })
    })

    describe('MANAGER role', () => {
      it('should allow MANAGER with explicit access to the branch', async () => {
        db.managerBranchAccess.findUnique.mockResolvedValue({
          id: 'access-123',
          userId: 'manager-123',
          branchId: 'branch-456',
        })

        const result = await canAccessBranch('manager-123', 'MANAGER', 'branch-456', 'branch-123')
        expect(result).toBe(true)
        expect(db.managerBranchAccess.findUnique).toHaveBeenCalledWith({
          where: {
            userId_branchId: { userId: 'manager-123', branchId: 'branch-456' }
          }
        })
      })

      it('should NOT allow MANAGER without explicit access to the branch', async () => {
        db.managerBranchAccess.findUnique.mockResolvedValue(null)

        const result = await canAccessBranch('manager-123', 'MANAGER', 'branch-456', 'branch-123')
        expect(result).toBe(false)
      })

      it('should NOT allow MANAGER to access their assigned branch without explicit access', async () => {
        db.managerBranchAccess.findUnique.mockResolvedValue(null)

        const result = await canAccessBranch('manager-123', 'MANAGER', 'branch-123', 'branch-123')
        expect(result).toBe(false)
      })
    })

    describe('STAFF role', () => {
      it('should allow STAFF to access their assigned branch', async () => {
        const result = await canAccessBranch('staff-123', 'STAFF', 'branch-123', 'branch-123')
        expect(result).toBe(true)
      })

      it('should NOT allow STAFF to access other branches', async () => {
        const result = await canAccessBranch('staff-123', 'STAFF', 'branch-456', 'branch-123')
        expect(result).toBe(false)
      })

      it('should NOT allow STAFF without branchId to access any branch', async () => {
        const result = await canAccessBranch('staff-123', 'STAFF', 'branch-456', null)
        expect(result).toBe(false)
      })
    })

    describe('CHECKER role', () => {
      it('should allow CHECKER to access their assigned branch', async () => {
        const result = await canAccessBranch('checker-123', 'CHECKER', 'branch-123', 'branch-123')
        expect(result).toBe(true)
      })

      it('should NOT allow CHECKER to access other branches', async () => {
        const result = await canAccessBranch('checker-123', 'CHECKER', 'branch-456', 'branch-123')
        expect(result).toBe(false)
      })
    })

    describe('AUDIT role', () => {
      it('should allow AUDIT to access their assigned branch', async () => {
        const result = await canAccessBranch('audit-123', 'AUDIT', 'branch-123', 'branch-123')
        expect(result).toBe(true)
      })

      it('should NOT allow AUDIT to access other branches', async () => {
        const result = await canAccessBranch('audit-123', 'AUDIT', 'branch-456', 'branch-123')
        expect(result).toBe(false)
      })
    })

    describe('ADMIN role', () => {
      it('should NOT allow ADMIN to access any branch', async () => {
        const result = await canAccessBranch('admin-123', 'ADMIN', 'branch-123', null)
        expect(result).toBe(false)
      })

      it('should NOT allow ADMIN even with branchId to access branches', async () => {
        const result = await canAccessBranch('admin-123', 'ADMIN', 'branch-123', 'branch-123')
        expect(result).toBe(false)
      })
    })
  })

  describe('PERMISSIONS constant', () => {
    it('should have all required permission keys', () => {
      expect(PERMISSIONS).toHaveProperty('SUBMIT_CLOSING')
      expect(PERMISSIONS).toHaveProperty('VERIFY_CLOSING')
      expect(PERMISSIONS).toHaveProperty('RECEIVE_CASH')
      expect(PERMISSIONS).toHaveProperty('CREATE_DEPOSIT')
      expect(PERMISSIONS).toHaveProperty('CONFIRM_BANK_DEPOSIT')
      expect(PERMISSIONS).toHaveProperty('VIEW_REPORTS')
      expect(PERMISSIONS).toHaveProperty('MANAGE_USERS')
      expect(PERMISSIONS).toHaveProperty('MANAGE_BRANCHES')
      expect(PERMISSIONS).toHaveProperty('MANAGE_BANKS')
    })

    it('should have arrays of roles for each permission', () => {
      Object.values(PERMISSIONS).forEach(roles => {
        expect(Array.isArray(roles)).toBe(true)
        expect(roles.length).toBeGreaterThan(0)
      })
    })
  })
})
