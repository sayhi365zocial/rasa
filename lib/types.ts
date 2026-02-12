import { UserRole, ClosingStatus, BranchStatus, UserStatus } from '@prisma/client'

export type { UserRole, ClosingStatus, BranchStatus, UserStatus }

// Daily Closing Types
export interface DailyClosingFormData {
  closingDate: Date
  branchId: string

  // POS Data
  posImageUrl?: string
  posTotalSales: number
  posCash: number
  posCredit: number
  posTransfer: number
  posExpenses: number
  posStartTime?: string
  posEndTime?: string
  posBillCount?: number

  // Handwritten Data
  handwrittenImageUrl?: string
  handwrittenCashCount: number
  handwrittenExpenses: number
  handwrittenExpensesList?: ExpenseItem[]
  handwrittenNetCash: number

  // EDC Data
  edcImageUrl?: string
  edcTotalAmount: number
  edcSettlementDate?: Date
  edcBatchNumber?: string
  edcBreakdown?: EDCBreakdownItem[]

  // Validation
  discrepancyRemark?: string
}

export interface ExpenseItem {
  category: string
  amount: number
  remark?: string
}

export interface EDCBreakdownItem {
  type: string // VISA, MASTERCARD, etc.
  amount: number
}

// OCR Response Types
export interface OCRResult {
  success: boolean
  documentType: 'POS_REPORT' | 'HANDWRITTEN_SUMMARY' | 'EDC_SLIP' | 'PAY_IN_SLIP'
  extractedData: any
  confidence?: number
  processingTime?: number
  error?: string
}

export interface POSOCRData {
  totalSales: number
  cash: number
  credit: number
  transfer: number
  expenses: number
  startTime?: string
  endTime?: string
  billCount?: number
  avgPerBill?: number
}

export interface HandwrittenOCRData {
  cashCount: number
  expenses: number
  expensesList: ExpenseItem[]
  netCash: number
}

export interface EDCOCRData {
  totalAmount: number
  settlementDate?: string
  batchNumber?: string
  breakdown: EDCBreakdownItem[]
}

// Aliases for component usage
export type POSData = POSOCRData
export type HandwrittenData = HandwrittenOCRData
export type EDCData = EDCOCRData

export interface DepositSlipOCRData {
  depositAmount: number
  depositDate: string
  depositTime?: string
  bankName?: string
  bankBranch?: string
  accountNumber?: string
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

// Validation Types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface DiscrepancyCheck {
  hasDiscrepancy: boolean
  posCreditVsEdcDiff?: number
  posTotalVsHandwrittenDiff?: number
  messages: string[]
}

// Status Colors
export const STATUS_COLORS: Record<ClosingStatus, string> = {
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  CASH_RECEIVED: 'purple',
  DEPOSITED: 'orange',
  COMPLETED: 'green',
  REJECTED: 'red',
}

export const STATUS_LABELS: Record<ClosingStatus, string> = {
  DRAFT: 'ร่าง',
  SUBMITTED: 'ส่งยอดแล้ว',
  CASH_RECEIVED: 'รับเงินแล้ว',
  DEPOSITED: 'นำฝากแล้ว',
  COMPLETED: 'เสร็จสมบูรณ์',
  REJECTED: 'ปฏิเสธ',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  STORE_STAFF: 'พนักงานหน้าร้าน',
  AUDITOR: 'ผู้ตรวจสอบ',
  OWNER: 'เจ้าของ',
  ADMIN: 'ผู้ดูแลระบบ',
}
