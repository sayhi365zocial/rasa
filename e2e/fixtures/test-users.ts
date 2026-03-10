/**
 * Test user credentials for E2E tests
 * These match the seed data from prisma/seed.ts
 */

export const testUsers = {
  staff: {
    rama9: {
      email: 'staff.br001@mermed.com',
      password: 'Staff@2026',
      branchCode: 'BR001',
      branchName: 'MerMed Rama9',
      role: 'STAFF',
    },
    phuket: {
      email: 'staff.br002@mermed.com',
      password: 'Staff@2026',
      branchCode: 'BR002',
      branchName: 'MerMed Phuket',
      role: 'STAFF',
    },
    pattaya: {
      email: 'staff.br003@mermed.com',
      password: 'Staff@2026',
      branchCode: 'BR003',
      branchName: 'MerMed Pattaya',
      role: 'STAFF',
    },
    central: {
      email: 'staff.br004@mermed.com',
      password: 'Staff@2026',
      branchCode: 'BR004',
      branchName: 'MerMed Central',
      role: 'STAFF',
    },
    chiangmai: {
      email: 'staff.br005@mermed.com',
      password: 'Staff@2026',
      branchCode: 'BR005',
      branchName: 'MerMed Chiang Mai',
      role: 'STAFF',
    },
  },
  checker: {
    email: 'checker@mermaid.clinic',
    password: 'password123',
    branchCode: 'BR001',
    branchName: 'MerMed Rama9',
    role: 'CHECKER',
  },
  auditor: {
    email: 'auditor@mermed.com',
    password: 'Auditor@2026',
    role: 'AUDIT',
  },
  manager: {
    email: 'manager@mermed.com',
    password: 'Manager@2026',
    role: 'MANAGER',
    authorizedBranches: ['BR001', 'BR002', 'BR003'],
    unauthorizedBranches: ['BR004', 'BR005'],
  },
  owner: {
    email: 'owner@mermed.com',
    password: 'Owner@2026',
    role: 'OWNER',
  },
  admin: {
    email: 'admin@mermed.com',
    password: 'Admin@2026',
    role: 'ADMIN',
  },
} as const

export type TestUser =
  | typeof testUsers.staff.rama9
  | typeof testUsers.checker
  | typeof testUsers.auditor
  | typeof testUsers.manager
  | typeof testUsers.owner
  | typeof testUsers.admin
