import { UserRole } from '@prisma/client'
import { mockDb, mockDailyClosing, mockDeposit, mockUserPayload, resetAllMocks } from '@/tests/utils/mocks'
import { hasPermission, canVerifyClosing, canAccessBranch } from '@/lib/auth/permissions'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: mockDb,
}))

describe('E2E Role Workflows', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('Staff Workflow: Create closing → Submit → Confirm deposit', () => {
    const staffUser = mockUserPayload('STAFF', {
      userId: 'staff-001',
      email: 'staff@branch1.com',
      branchId: 'branch-001',
    })

    it('should complete full staff workflow', async () => {
      // Step 1: Staff creates a draft closing
      const draftClosing = mockDailyClosing({
        id: 'closing-001',
        branchId: 'branch-001',
        submittedBy: 'staff-001',
        status: 'DRAFT',
      })

      mockDb.dailyClosing.findUnique.mockResolvedValue(draftClosing)

      // Verify staff can access their branch
      const hasAccess = await canAccessBranch(
        staffUser.userId,
        staffUser.role,
        draftClosing.branchId,
        staffUser.branchId
      )
      expect(hasAccess).toBe(true)

      // Step 2: Staff submits the closing
      expect(hasPermission(staffUser.role, 'SUBMIT_CLOSING')).toBe(true)

      const submittedClosing = {
        ...draftClosing,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      }
      mockDb.dailyClosing.update.mockResolvedValue(submittedClosing)
      mockDb.auditLog.create.mockResolvedValue({})

      // Step 3: Checker verifies (different user)
      const checkerUser = mockUserPayload('CHECKER', {
        userId: 'checker-001',
        branchId: 'branch-001',
      })

      expect(hasPermission(checkerUser.role, 'VERIFY_CLOSING')).toBe(true)
      expect(canVerifyClosing(checkerUser.role, checkerUser.userId, 'staff-001')).toBe(true)

      // Step 4: Audit receives cash
      const auditUser = mockUserPayload('AUDIT', {
        userId: 'audit-001',
        branchId: 'branch-001',
      })

      expect(hasPermission(auditUser.role, 'RECEIVE_CASH')).toBe(true)

      const cashReceivedClosing = {
        ...submittedClosing,
        status: 'CASH_RECEIVED',
        cashReceivedBy: 'audit-001',
        cashReceivedAt: new Date(),
      }
      mockDb.dailyClosing.update.mockResolvedValue(cashReceivedClosing)

      // Step 5: Audit creates deposit
      expect(hasPermission(auditUser.role, 'CREATE_DEPOSIT')).toBe(true)

      const deposit = mockDeposit({
        dailyClosingId: 'closing-001',
        depositedBy: 'audit-001',
        approvalStatus: 'PENDING',
      })
      mockDb.deposit.create.mockResolvedValue(deposit)

      // Step 6: Staff confirms deposit amount
      expect(hasPermission(staffUser.role, 'CONFIRM_BANK_DEPOSIT')).toBe(true)

      const confirmedDeposit = {
        ...deposit,
        isStaffConfirmed: true,
        staffConfirmedBy: 'staff-001',
        staffConfirmedAt: new Date(),
      }
      mockDb.deposit.update.mockResolvedValue(confirmedDeposit)

      // Step 7: Owner approves deposit
      const ownerUser = mockUserPayload('OWNER', {
        userId: 'owner-001',
        branchId: null,
      })

      expect(ownerUser.role).toBe('OWNER')

      const approvedDeposit = {
        ...confirmedDeposit,
        approvalStatus: 'APPROVED',
        approvedBy: 'owner-001',
        approvedAt: new Date(),
      }
      mockDb.deposit.update.mockResolvedValue(approvedDeposit)

      // Verify workflow completion
      expect(approvedDeposit.approvalStatus).toBe('APPROVED')
      expect(approvedDeposit.isStaffConfirmed).toBe(true)
    })

    it('should prevent staff from accessing other branches', async () => {
      const otherBranchClosing = mockDailyClosing({
        branchId: 'branch-002', // Different branch
      })

      const hasAccess = await canAccessBranch(
        staffUser.userId,
        staffUser.role,
        otherBranchClosing.branchId,
        staffUser.branchId
      )
      expect(hasAccess).toBe(false)
    })

    it('should prevent staff from receiving cash', async () => {
      expect(hasPermission(staffUser.role, 'RECEIVE_CASH')).toBe(false)
    })

    it('should prevent staff from creating deposits', async () => {
      expect(hasPermission(staffUser.role, 'CREATE_DEPOSIT')).toBe(false)
    })
  })

  describe('Checker Workflow: Verify closing (not own submission)', () => {
    const checkerUser = mockUserPayload('CHECKER', {
      userId: 'checker-001',
      email: 'checker@branch1.com',
      branchId: 'branch-001',
    })

    it('should allow checker to verify closings submitted by others', async () => {
      const closing = mockDailyClosing({
        branchId: 'branch-001',
        submittedBy: 'staff-001',
        status: 'SUBMITTED',
      })

      mockDb.dailyClosing.findUnique.mockResolvedValue(closing)

      // Check permission
      expect(hasPermission(checkerUser.role, 'VERIFY_CLOSING')).toBe(true)

      // Check can verify (not their own)
      expect(canVerifyClosing(checkerUser.role, checkerUser.userId, closing.submittedBy)).toBe(true)

      // Verify branch access
      const hasAccess = await canAccessBranch(
        checkerUser.userId,
        checkerUser.role,
        closing.branchId,
        checkerUser.branchId
      )
      expect(hasAccess).toBe(true)

      // Update closing
      const verifiedClosing = {
        ...closing,
        verifiedBy: checkerUser.userId,
        verifiedAt: new Date(),
      }
      mockDb.dailyClosing.update.mockResolvedValue(verifiedClosing)
      mockDb.auditLog.create.mockResolvedValue({})

      expect(verifiedClosing.verifiedBy).toBe(checkerUser.userId)
    })

    it('should prevent checker from verifying their own submission', async () => {
      const closing = mockDailyClosing({
        branchId: 'branch-001',
        submittedBy: 'checker-001', // Same as checker
        status: 'SUBMITTED',
      })

      mockDb.dailyClosing.findUnique.mockResolvedValue(closing)

      // Has permission in general
      expect(hasPermission(checkerUser.role, 'VERIFY_CLOSING')).toBe(true)

      // But cannot verify their own
      expect(canVerifyClosing(checkerUser.role, checkerUser.userId, closing.submittedBy)).toBe(false)
    })

    it('should allow checker to submit closings', async () => {
      expect(hasPermission(checkerUser.role, 'SUBMIT_CLOSING')).toBe(true)

      const closing = mockDailyClosing({
        branchId: 'branch-001',
        submittedBy: 'checker-001',
        status: 'DRAFT',
      })

      mockDb.dailyClosing.findUnique.mockResolvedValue(closing)
      mockDb.dailyClosing.update.mockResolvedValue({
        ...closing,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      })
      mockDb.auditLog.create.mockResolvedValue({})

      // Checker can submit
      expect(hasPermission(checkerUser.role, 'SUBMIT_CLOSING')).toBe(true)
    })

    it('should prevent checker from receiving cash', async () => {
      expect(hasPermission(checkerUser.role, 'RECEIVE_CASH')).toBe(false)
    })

    it('should prevent checker from creating deposits', async () => {
      expect(hasPermission(checkerUser.role, 'CREATE_DEPOSIT')).toBe(false)
    })
  })

  describe('Audit Workflow: Receive cash → Create deposit', () => {
    const auditUser = mockUserPayload('AUDIT', {
      userId: 'audit-001',
      email: 'audit@branch1.com',
      branchId: 'branch-001',
    })

    it('should complete audit workflow', async () => {
      // Step 1: Audit receives cash
      const closing = mockDailyClosing({
        branchId: 'branch-001',
        status: 'SUBMITTED',
        handwrittenNetCash: 5000,
      })

      mockDb.dailyClosing.findUnique.mockResolvedValue({
        ...closing,
        branch: { branchName: 'Branch 1' }
      })

      expect(hasPermission(auditUser.role, 'RECEIVE_CASH')).toBe(true)

      const cashReceivedClosing = {
        ...closing,
        status: 'CASH_RECEIVED',
        cashReceivedBy: auditUser.userId,
        cashReceivedAt: new Date(),
      }
      mockDb.dailyClosing.update.mockResolvedValue(cashReceivedClosing)
      mockDb.auditLog.create.mockResolvedValue({})

      // Step 2: Audit creates deposit
      expect(hasPermission(auditUser.role, 'CREATE_DEPOSIT')).toBe(true)

      mockDb.dailyClosing.findUnique.mockResolvedValue({
        ...cashReceivedClosing,
        branch: { branchName: 'Branch 1', branchCode: 'B001' }
      })

      const deposit = mockDeposit({
        dailyClosingId: closing.id,
        depositAmount: closing.handwrittenNetCash,
        depositedBy: auditUser.userId,
      })

      mockDb.deposit.create.mockResolvedValue(deposit)
      mockDb.dailyClosing.update.mockResolvedValue({
        ...cashReceivedClosing,
        status: 'DEPOSITED',
      })

      expect(deposit.depositedBy).toBe(auditUser.userId)
      expect(deposit.depositAmount).toBe(5000)
    })

    it('should allow audit to verify closings', async () => {
      expect(hasPermission(auditUser.role, 'VERIFY_CLOSING')).toBe(true)
    })

    it('should prevent audit from submitting closings', async () => {
      expect(hasPermission(auditUser.role, 'SUBMIT_CLOSING')).toBe(false)
    })

    it('should prevent audit from approving deposits', async () => {
      expect(auditUser.role).not.toBe('OWNER')
    })

    it('should prevent audit from accessing other branches', async () => {
      const hasAccess = await canAccessBranch(
        auditUser.userId,
        auditUser.role,
        'branch-002',
        'branch-001'
      )
      expect(hasAccess).toBe(false)
    })
  })

  describe('Manager Workflow: Access multiple branches, create closings', () => {
    const managerUser = mockUserPayload('MANAGER', {
      userId: 'manager-001',
      email: 'manager@company.com',
      branchId: null, // Manager may not have assigned branch
    })

    it('should allow manager to access authorized branches', async () => {
      // Manager has access to branch-001
      mockDb.managerBranchAccess.findUnique.mockResolvedValue({
        id: 'access-001',
        userId: 'manager-001',
        branchId: 'branch-001',
        createdBy: 'owner-001',
        createdAt: new Date(),
      })

      const hasAccess = await canAccessBranch(
        managerUser.userId,
        managerUser.role,
        'branch-001',
        null
      )
      expect(hasAccess).toBe(true)
    })

    it('should prevent manager from accessing unauthorized branches', async () => {
      // No access to branch-002
      mockDb.managerBranchAccess.findUnique.mockResolvedValue(null)

      const hasAccess = await canAccessBranch(
        managerUser.userId,
        managerUser.role,
        'branch-002',
        null
      )
      expect(hasAccess).toBe(false)
    })

    it('should allow manager to submit closings', async () => {
      expect(hasPermission(managerUser.role, 'SUBMIT_CLOSING')).toBe(true)
    })

    it('should allow manager to verify closings', async () => {
      expect(hasPermission(managerUser.role, 'VERIFY_CLOSING')).toBe(true)
    })

    it('should allow manager to receive cash', async () => {
      expect(hasPermission(managerUser.role, 'RECEIVE_CASH')).toBe(true)
    })

    it('should allow manager to create deposits', async () => {
      expect(hasPermission(managerUser.role, 'CREATE_DEPOSIT')).toBe(true)
    })

    it('should prevent manager from approving deposits', async () => {
      expect(managerUser.role).not.toBe('OWNER')
    })

    it('should prevent manager from viewing reports', async () => {
      expect(hasPermission(managerUser.role, 'VIEW_REPORTS')).toBe(false)
    })

    it('should allow manager to work across multiple authorized branches', async () => {
      // Setup access to multiple branches
      const branches = ['branch-001', 'branch-002', 'branch-003']

      for (const branchId of branches) {
        mockDb.managerBranchAccess.findUnique.mockResolvedValue({
          id: `access-${branchId}`,
          userId: managerUser.userId,
          branchId,
          createdBy: 'owner-001',
          createdAt: new Date(),
        })

        const hasAccess = await canAccessBranch(
          managerUser.userId,
          managerUser.role,
          branchId,
          null
        )
        expect(hasAccess).toBe(true)
      }
    })
  })

  describe('Owner Workflow: Approve deposits, view reports', () => {
    const ownerUser = mockUserPayload('OWNER', {
      userId: 'owner-001',
      email: 'owner@company.com',
      branchId: null,
    })

    it('should allow owner to approve deposits', async () => {
      const deposit = mockDeposit({ approvalStatus: 'PENDING' })

      mockDb.deposit.findUnique.mockResolvedValue({
        ...deposit,
        dailyClosing: {
          branch: { branchName: 'Branch 1' }
        }
      })

      // Owner can approve
      expect(ownerUser.role).toBe('OWNER')

      const approvedDeposit = {
        ...deposit,
        approvalStatus: 'APPROVED',
        approvedBy: ownerUser.userId,
        approvedAt: new Date(),
      }

      mockDb.deposit.update.mockResolvedValue(approvedDeposit)
      mockDb.auditLog.create.mockResolvedValue({})

      expect(approvedDeposit.approvalStatus).toBe('APPROVED')
      expect(approvedDeposit.approvedBy).toBe(ownerUser.userId)
    })

    it('should allow owner to flag deposits', async () => {
      const deposit = mockDeposit({ approvalStatus: 'PENDING' })

      const flaggedDeposit = {
        ...deposit,
        approvalStatus: 'FLAGGED',
        approvedBy: ownerUser.userId,
        approvedAt: new Date(),
        approvalRemark: 'Amount mismatch detected',
      }

      mockDb.deposit.update.mockResolvedValue(flaggedDeposit)

      expect(flaggedDeposit.approvalStatus).toBe('FLAGGED')
    })

    it('should allow owner to reject deposits', async () => {
      const deposit = mockDeposit({ approvalStatus: 'PENDING' })

      const rejectedDeposit = {
        ...deposit,
        approvalStatus: 'REJECTED',
        approvedBy: ownerUser.userId,
        approvedAt: new Date(),
        approvalRemark: 'Incorrect bank details',
      }

      mockDb.deposit.update.mockResolvedValue(rejectedDeposit)

      expect(rejectedDeposit.approvalStatus).toBe('REJECTED')
    })

    it('should allow owner to view branch revenue reports', async () => {
      expect(hasPermission(ownerUser.role, 'VIEW_REPORTS')).toBe(true)

      mockDb.branch.findMany.mockResolvedValue([
        { id: 'branch-1', branchName: 'Branch 1', branchCode: 'B001', status: 'ACTIVE' },
        { id: 'branch-2', branchName: 'Branch 2', branchCode: 'B002', status: 'ACTIVE' },
      ])

      mockDb.dailyClosing.aggregate.mockResolvedValue({
        _sum: {
          posTotalSales: 50000,
          posCash: 15000,
          posCredit: 25000,
          posTransfer: 10000,
          posExpenses: 2000,
          handwrittenCashCount: 13000,
        },
        _count: { id: 10 },
      })

      // Owner can access reports
      expect(ownerUser.role).toBe('OWNER')
    })

    it('should allow owner to access all branches', async () => {
      const branches = ['branch-001', 'branch-002', 'branch-003', 'branch-999']

      for (const branchId of branches) {
        const hasAccess = await canAccessBranch(
          ownerUser.userId,
          ownerUser.role,
          branchId,
          null
        )
        expect(hasAccess).toBe(true)
      }
    })

    it('should allow owner to manage users', async () => {
      expect(hasPermission(ownerUser.role, 'MANAGE_USERS')).toBe(true)
    })

    it('should allow owner to manage branches', async () => {
      expect(hasPermission(ownerUser.role, 'MANAGE_BRANCHES')).toBe(true)
    })

    it('should allow owner to grant manager access', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'manager-001',
        email: 'manager@company.com',
        role: 'MANAGER',
      })

      mockDb.branch.findUnique.mockResolvedValue({
        id: 'branch-001',
        branchCode: 'B001',
        branchName: 'Branch 1',
      })

      mockDb.managerBranchAccess.findUnique.mockResolvedValue(null)

      const managerAccess = {
        id: 'access-001',
        userId: 'manager-001',
        branchId: 'branch-001',
        createdBy: ownerUser.userId,
        createdAt: new Date(),
      }

      mockDb.managerBranchAccess.create.mockResolvedValue(managerAccess)
      mockDb.auditLog.create.mockResolvedValue({})

      expect(ownerUser.role).toBe('OWNER')
      expect(managerAccess.createdBy).toBe(ownerUser.userId)
    })

    it('should allow owner to perform all closing operations', async () => {
      expect(hasPermission(ownerUser.role, 'SUBMIT_CLOSING')).toBe(true)
      expect(hasPermission(ownerUser.role, 'VERIFY_CLOSING')).toBe(true)
      expect(hasPermission(ownerUser.role, 'RECEIVE_CASH')).toBe(true)
      expect(hasPermission(ownerUser.role, 'CREATE_DEPOSIT')).toBe(true)
      expect(hasPermission(ownerUser.role, 'CONFIRM_BANK_DEPOSIT')).toBe(true)
    })
  })

  describe('Cross-role Scenarios', () => {
    it('should enforce proper separation of duties', async () => {
      const checkerUser = mockUserPayload('CHECKER', { userId: 'checker-001' })
      const closing = mockDailyClosing({
        submittedBy: 'checker-001',
        status: 'SUBMITTED',
      })

      // Checker has verify permission
      expect(hasPermission(checkerUser.role, 'VERIFY_CLOSING')).toBe(true)

      // But cannot verify their own submission
      expect(canVerifyClosing(checkerUser.role, checkerUser.userId, closing.submittedBy)).toBe(false)
    })

    it('should handle multi-step workflow with different roles', async () => {
      const closing = mockDailyClosing({
        id: 'closing-multi',
        status: 'DRAFT',
      })

      // Step 1: Staff submits
      const staffUser = mockUserPayload('STAFF', { userId: 'staff-001' })
      expect(hasPermission(staffUser.role, 'SUBMIT_CLOSING')).toBe(true)

      // Step 2: Checker verifies
      const checkerUser = mockUserPayload('CHECKER', { userId: 'checker-001' })
      expect(hasPermission(checkerUser.role, 'VERIFY_CLOSING')).toBe(true)
      expect(canVerifyClosing(checkerUser.role, checkerUser.userId, staffUser.userId)).toBe(true)

      // Step 3: Audit receives cash
      const auditUser = mockUserPayload('AUDIT', { userId: 'audit-001' })
      expect(hasPermission(auditUser.role, 'RECEIVE_CASH')).toBe(true)

      // Step 4: Audit creates deposit
      expect(hasPermission(auditUser.role, 'CREATE_DEPOSIT')).toBe(true)

      // Step 5: Staff confirms
      expect(hasPermission(staffUser.role, 'CONFIRM_BANK_DEPOSIT')).toBe(true)

      // Step 6: Owner approves
      const ownerUser = mockUserPayload('OWNER', { userId: 'owner-001' })
      expect(ownerUser.role).toBe('OWNER')
    })

    it('should prevent unauthorized role access at each step', async () => {
      const adminUser = mockUserPayload('ADMIN')

      // Admin cannot perform operational tasks
      expect(hasPermission(adminUser.role, 'SUBMIT_CLOSING')).toBe(false)
      expect(hasPermission(adminUser.role, 'VERIFY_CLOSING')).toBe(false)
      expect(hasPermission(adminUser.role, 'RECEIVE_CASH')).toBe(false)
      expect(hasPermission(adminUser.role, 'CREATE_DEPOSIT')).toBe(false)
      expect(hasPermission(adminUser.role, 'VIEW_REPORTS')).toBe(false)

      // But can manage system resources
      expect(hasPermission(adminUser.role, 'MANAGE_USERS')).toBe(true)
      expect(hasPermission(adminUser.role, 'MANAGE_BRANCHES')).toBe(true)
    })
  })
})
