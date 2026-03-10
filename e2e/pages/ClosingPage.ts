import { Page, Locator, expect } from '@playwright/test'

/**
 * Closing Page Object Model
 * Encapsulates all interactions with the closing creation/submission page
 */
export class ClosingPage {
  readonly page: Page

  // Step 1: Upload Documents
  readonly closingDateInput: Locator
  readonly posUploadInput: Locator
  readonly handwrittenUploadInput: Locator
  readonly edcUploadInput: Locator
  readonly skipUploadButton: Locator
  readonly nextButton: Locator
  readonly cancelButton: Locator

  // Step 2: Review Data
  readonly totalSalesInput: Locator
  readonly cashInput: Locator
  readonly creditInput: Locator
  readonly transferInput: Locator
  readonly expensesInput: Locator
  readonly otherIncomeInput: Locator
  readonly otherIncomeRemarkInput: Locator
  readonly netCashDisplay: Locator
  readonly netBalanceDisplay: Locator

  // Step 3: Confirm & Submit
  readonly discrepancyRemarkTextarea: Locator
  readonly submitButton: Locator
  readonly backButton: Locator

  // Common elements
  readonly pageTitle: Locator
  readonly stepIndicator: Locator
  readonly errorMessage: Locator
  readonly loadingSpinner: Locator

  constructor(page: Page) {
    this.page = page

    // Step 1 locators
    this.closingDateInput = page.locator('input[type="date"]')
    this.posUploadInput = page.locator('#pos-upload')
    this.handwrittenUploadInput = page.locator('#handwritten-upload')
    this.edcUploadInput = page.locator('#edc-upload')
    this.skipUploadButton = page.locator('button:has-text("ข้ามขั้นตอนนี้")')
    this.nextButton = page.locator('button:has-text("ถัดไป")')
    this.cancelButton = page.locator('button:has-text("ยกเลิก")')

    // Step 2 locators
    this.totalSalesInput = page.locator('input[type="number"]').first()
    this.cashInput = page.locator('input[type="number"]').nth(1)
    this.creditInput = page.locator('input[type="number"]').nth(2)
    this.transferInput = page.locator('input[type="number"]').nth(3)
    this.otherIncomeInput = page.locator('input[type="number"]').nth(4)
    this.expensesInput = page.locator('input[type="number"]').nth(5)
    this.otherIncomeRemarkInput = page.locator('input[placeholder*="หมายเหตุ"]')
    this.netCashDisplay = page.locator('.bg-orange-50 .text-3xl')
    this.netBalanceDisplay = page.locator('.bg-green-50 .text-3xl')

    // Step 3 locators
    this.discrepancyRemarkTextarea = page.locator('textarea[placeholder*="สาเหตุ"]')
    this.submitButton = page.locator('button:has-text("บันทึกและส่งยอด")')
    this.backButton = page.locator('button:has-text("ย้อนกลับ")')

    // Common locators
    this.pageTitle = page.locator('h1:has-text("สร้างรายการปิดยอดขาย")')
    this.stepIndicator = page.locator('.w-10.h-10.rounded-full')
    this.errorMessage = page.locator('.bg-red-50, .text-red-800')
    this.loadingSpinner = page.locator('.animate-spin')
  }

  /**
   * Navigate to new closing page
   */
  async goto() {
    await this.page.goto('/dashboard/staff/closings/new')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to manager's new closing page
   */
  async gotoManagerClosing() {
    await this.page.goto('/dashboard/manager/closings/new')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Verify page is loaded
   */
  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible()
    await expect(this.closingDateInput).toBeVisible()
  }

  /**
   * Set closing date
   * @param date - Date in YYYY-MM-DD format
   */
  async setClosingDate(date: string) {
    await this.closingDateInput.fill(date)
  }

  /**
   * Upload POS report image
   * @param filePath - Path to image file
   */
  async uploadPOSReport(filePath: string) {
    await this.posUploadInput.setInputFiles(filePath)
    await this.page.waitForTimeout(500) // Wait for preview to load
  }

  /**
   * Upload handwritten summary image
   * @param filePath - Path to image file
   */
  async uploadHandwrittenSummary(filePath: string) {
    await this.handwrittenUploadInput.setInputFiles(filePath)
    await this.page.waitForTimeout(500)
  }

  /**
   * Upload EDC slip image
   * @param filePath - Path to image file
   */
  async uploadEDCSlip(filePath: string) {
    await this.edcUploadInput.setInputFiles(filePath)
    await this.page.waitForTimeout(500)
  }

  /**
   * Click skip upload button
   */
  async skipUpload() {
    await this.skipUploadButton.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Click next button
   */
  async clickNext() {
    await this.nextButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Fill in closing data (Step 2)
   */
  async fillClosingData(data: {
    totalSales: number
    cash: number
    credit: number
    transfer: number
    expenses: number
    otherIncome?: number
    otherIncomeRemark?: string
  }) {
    // Fill total sales
    await this.totalSalesInput.fill(data.totalSales.toString())

    // Fill cash
    await this.cashInput.fill(data.cash.toString())

    // Fill credit
    await this.creditInput.fill(data.credit.toString())

    // Fill transfer
    await this.transferInput.fill(data.transfer.toString())

    // Fill other income if provided
    if (data.otherIncome !== undefined) {
      await this.otherIncomeInput.fill(data.otherIncome.toString())
    }

    // Fill expenses
    await this.expensesInput.fill(data.expenses.toString())

    // Fill other income remark if provided
    if (data.otherIncomeRemark) {
      await this.otherIncomeRemarkInput.fill(data.otherIncomeRemark)
    }

    // Wait for calculations to complete
    await this.page.waitForTimeout(500)
  }

  /**
   * Get calculated net cash to deposit
   */
  async getNetCashToDeposit(): Promise<number> {
    const text = await this.netCashDisplay.textContent()
    if (!text) return 0

    // Extract number from Thai formatted text (e.g., "15,000.00 บาท")
    const numberText = text.replace(/[^\d.]/g, '')
    return parseFloat(numberText) || 0
  }

  /**
   * Get calculated net balance
   */
  async getNetBalance(): Promise<number> {
    const text = await this.netBalanceDisplay.textContent()
    if (!text) return 0

    const numberText = text.replace(/[^\d.]/g, '')
    return parseFloat(numberText) || 0
  }

  /**
   * Proceed to confirmation step (Step 3)
   */
  async proceedToConfirmation() {
    await this.clickNext()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Fill discrepancy remark (Step 3)
   * @param remark - Discrepancy explanation
   */
  async fillDiscrepancyRemark(remark: string) {
    await this.discrepancyRemarkTextarea.fill(remark)
  }

  /**
   * Submit the closing
   */
  async submit() {
    await this.submitButton.click()

    // Wait for success alert or redirect
    await this.page.waitForTimeout(1000)
  }

  /**
   * Complete full closing workflow with skip upload
   */
  async createClosingWithManualEntry(data: {
    closingDate: string
    totalSales: number
    cash: number
    credit: number
    transfer: number
    expenses: number
    otherIncome?: number
    otherIncomeRemark?: string
    discrepancyRemark?: string
  }) {
    // Step 1: Set date and skip upload
    await this.setClosingDate(data.closingDate)
    await this.skipUpload()

    // Step 2: Fill data
    await this.fillClosingData({
      totalSales: data.totalSales,
      cash: data.cash,
      credit: data.credit,
      transfer: data.transfer,
      expenses: data.expenses,
      otherIncome: data.otherIncome,
      otherIncomeRemark: data.otherIncomeRemark,
    })
    await this.clickNext()

    // Step 3: Add discrepancy remark if needed
    if (data.discrepancyRemark) {
      await this.fillDiscrepancyRemark(data.discrepancyRemark)
    }

    // Submit
    await this.submit()

    // Handle success alert
    await this.handleSuccessAlert()
  }

  /**
   * Handle success alert popup
   */
  async handleSuccessAlert() {
    // Wait for alert and accept it
    this.page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('สำเร็จ')
      await dialog.accept()
    })

    // Wait for redirect to dashboard
    await this.page.waitForURL(/\/dashboard/, { timeout: 10000 })
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 2000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 })
    return await this.errorMessage.textContent() || ''
  }

  /**
   * Check if currently on specific step
   */
  async verifyStep(stepNumber: 1 | 2 | 3) {
    const stepCircle = this.stepIndicator.nth(stepNumber - 1)
    await expect(stepCircle).toHaveClass(/bg-blue-600/)
  }

  /**
   * Go back to previous step
   */
  async goBack() {
    await this.backButton.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Cancel closing creation
   */
  async cancel() {
    await this.cancelButton.click()
    await this.page.waitForURL(/\/dashboard/, { timeout: 5000 })
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible()
  }

  /**
   * Wait for OCR processing to complete
   */
  async waitForOCRProcessing() {
    // Wait for loading overlay with processing message
    const processingOverlay = this.page.locator('text=กำลังประมวลผล')
    
    try {
      await processingOverlay.waitFor({ state: 'visible', timeout: 2000 })
      await processingOverlay.waitFor({ state: 'hidden', timeout: 60000 })
    } catch {
      // Processing overlay might not appear, which is fine
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string = 'closing-page') {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
  }

  /**
   * Verify uploaded file preview
   * @param fileType - Type of file (pos, handwritten, edc)
   */
  async verifyFileUploaded(fileType: 'pos' | 'handwritten' | 'edc'): Promise<boolean> {
    const uploadedIndicator = this.page.locator(`text=✓ อัปโหลดแล้ว`).nth(
      fileType === 'pos' ? 0 : fileType === 'handwritten' ? 1 : 2
    )

    try {
      await uploadedIndicator.waitFor({ state: 'visible', timeout: 2000 })
      return true
    } catch {
      return false
    }
  }
}
