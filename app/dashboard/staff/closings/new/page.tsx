'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { POSData, HandwrittenData, EDCData } from '@/lib/types'

export const dynamic = 'force-dynamic'

type UploadedFile = {
  file: File
  preview: string
  type: 'POS_REPORT' | 'HANDWRITTEN_SUMMARY' | 'EDC_SLIP'
  url?: string // URL after upload to R2
}

type OCRData = {
  pos?: POSData
  handwritten?: HandwrittenData
  edc?: EDCData
}

export default function NewClosingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [closingDate, setClosingDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [uploads, setUploads] = useState<{
    pos?: UploadedFile
    handwritten?: UploadedFile
    edc?: UploadedFile
  }>({})

  const [ocrData, setOcrData] = useState<OCRData>({})
  const [editedData, setEditedData] = useState<any>({})

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'pos' | 'handwritten' | 'edc'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์มีขนาดใหญ่เกิน 10MB')
      return
    }

    // Create preview
    const preview = URL.createObjectURL(file)

    const uploadType =
      type === 'pos'
        ? 'POS_REPORT'
        : type === 'handwritten'
        ? 'HANDWRITTEN_SUMMARY'
        : 'EDC_SLIP'

    setUploads((prev) => ({
      ...prev,
      [type]: {
        file,
        preview,
        type: uploadType,
      },
    }))
  }

  const handleRemove = (type: 'pos' | 'handwritten' | 'edc') => {
    // Revoke object URL
    const upload = uploads[type]
    if (upload) {
      URL.revokeObjectURL(upload.preview)
    }

    setUploads((prev) => {
      const newUploads = { ...prev }
      delete newUploads[type]
      return newUploads
    })
  }

  const canProceed = uploads.pos && uploads.handwritten && uploads.edc

  const handleSkipUpload = () => {
    // Skip OCR and go directly to manual input
    setEditedData({
      pos: { totalSales: 0, cash: 0, credit: 0, transfer: 0, expenses: 0 },
      handwritten: { cashCount: 0, expenses: 0, netCash: 0 },
      edc: { totalAmount: 0 },
    })
    setStep(2)
  }

  const handleNext = async () => {
    if (step === 1) {
      if (!canProceed) {
        alert('กรุณาอัปโหลดรูปภาพครบทั้ง 3 ประเภท')
        return
      }

      setLoading(true)
      setError('')

      try {
        // Step 1: Upload files to R2
        const uploadPromises = Object.entries(uploads).map(async ([key, upload]) => {
          if (!upload) return

          const formData = new FormData()
          formData.append('file', upload.file)
          formData.append('type', upload.type)

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) throw new Error(`Failed to upload ${key}`)

          const result = await res.json()
          return { key, url: result.data.url }
        })

        const uploadResults = await Promise.all(uploadPromises)

        // Update URLs
        const updatedUploads = { ...uploads }
        uploadResults.forEach((result) => {
          if (result) {
            updatedUploads[result.key as keyof typeof uploads]!.url = result.url
          }
        })
        setUploads(updatedUploads)

        // Step 2: Process OCR
        const ocrPromises = Object.entries(updatedUploads).map(async ([key, upload]) => {
          if (!upload) return

          // Convert file to base64
          const reader = new FileReader()
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => {
              const result = reader.result as string
              // Remove data:image/...;base64, prefix
              const base64Data = result.split(',')[1]
              resolve(base64Data)
            }
            reader.readAsDataURL(upload.file)
          })

          const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              documentType: upload.type,
            }),
          })

          if (!res.ok) throw new Error(`Failed to process OCR for ${key}`)

          const result = await res.json()
          return { key, data: result.data.data }
        })

        const ocrResults = await Promise.all(ocrPromises)

        // Set OCR data
        const newOcrData: OCRData = {}
        ocrResults.forEach((result) => {
          if (result) {
            newOcrData[result.key as keyof OCRData] = result.data
          }
        })
        setOcrData(newOcrData)
        setEditedData(newOcrData)

        setStep(2)
      } catch (err) {
        console.error('Upload/OCR error:', err)
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการประมวลผล')
      } finally {
        setLoading(false)
      }
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const payload = {
        closingDate,
        branchId: '', // Will be set by API from user session

        // POS data
        posImageUrl: uploads.pos?.url,
        posTotalSales: editedData.pos?.totalSales || 0,
        posCash: editedData.pos?.cash || 0,
        posCredit: editedData.pos?.credit || 0,
        posTransfer: editedData.pos?.transfer || 0,
        posExpenses: editedData.pos?.expenses || 0,
        posStartTime: editedData.pos?.startTime,
        posEndTime: editedData.pos?.endTime,
        posBillCount: editedData.pos?.billCount || 0,
        posAvgPerBill: editedData.pos?.avgPerBill || 0,

        // Handwritten data
        handwrittenImageUrl: uploads.handwritten?.url,
        handwrittenCashCount: editedData.handwritten?.cashCount || 0,
        handwrittenExpenses: editedData.handwritten?.expenses || 0,
        handwrittenExpensesList: editedData.handwritten?.expensesList || [],
        handwrittenNetCash: editedData.handwritten?.netCash || 0,

        // EDC data
        edcImageUrl: uploads.edc?.url,
        edcTotalAmount: editedData.edc?.totalAmount || 0,
        edcSettlementDate: editedData.edc?.settlementDate,
        edcBatchNumber: editedData.edc?.batchNumber,
        edcBreakdown: editedData.edc?.breakdown || [],

        discrepancyRemark: editedData.discrepancyRemark || '',
      }

      const res = await fetch('/api/closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error?.message || 'Failed to create closing')
      }

      const result = await res.json()

      // Redirect to detail page
      router.push(`/dashboard/staff/closings/${result.data.id}`)
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            กลับ
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            สร้างรายการปิดยอดขาย
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  1
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    step >= 1 ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    อัปโหลดเอกสาร
                  </div>
                </div>
              </div>
            </div>
            <div className={`w-20 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className="flex-1">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  2
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    step >= 2 ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    ตรวจสอบข้อมูล
                  </div>
                </div>
              </div>
            </div>
            <div className={`w-20 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className="flex-1">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  3
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    step >= 3 ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    ยืนยันและส่ง
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-900 font-medium">กำลังประมวลผล...</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Step 1: Upload Images */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Date Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่ปิดยอด
                </label>
                <input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">วันนี้</p>
              </div>

            {/* POS Report Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1️⃣ รายงานจากระบบ POS (POS Report)
              </label>
              {!uploads.pos ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'pos')}
                    className="hidden"
                    id="pos-upload"
                  />
                  <label
                    htmlFor="pos-upload"
                    className="cursor-pointer block"
                  >
                    <svg
                      className="w-12 h-12 mx-auto text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-gray-600 font-medium">
                      คลิกเพื่ออัปโหลดรูปภาพ
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      รองรับ: JPG, PNG, HEIC (สูงสุด 10MB)
                    </p>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <img
                        src={uploads.pos.preview}
                        alt="POS Report"
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          ✓ อัปโหลดแล้ว
                        </p>
                        <p className="text-sm text-gray-600">
                          {uploads.pos.file.name} (
                          {(uploads.pos.file.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(uploads.pos!.preview)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        ดู
                      </button>
                      <button
                        onClick={() => handleRemove('pos')}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Handwritten Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2️⃣ ใบสรุปยอดลายมือ (Handwritten Summary)
              </label>
              {!uploads.handwritten ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'handwritten')}
                    className="hidden"
                    id="handwritten-upload"
                  />
                  <label
                    htmlFor="handwritten-upload"
                    className="cursor-pointer block"
                  >
                    <svg
                      className="w-12 h-12 mx-auto text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-gray-600 font-medium">
                      คลิกเพื่อเลือกไฟล์
                    </p>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <img
                        src={uploads.handwritten.preview}
                        alt="Handwritten Summary"
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          ✓ อัปโหลดแล้ว
                        </p>
                        <p className="text-sm text-gray-600">
                          {uploads.handwritten.file.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          window.open(uploads.handwritten!.preview)
                        }
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        ดู
                      </button>
                      <button
                        onClick={() => handleRemove('handwritten')}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* EDC Slip Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3️⃣ สลิปเครื่อง EDC (EDC Settlement Slip)
              </label>
              {!uploads.edc ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'edc')}
                    className="hidden"
                    id="edc-upload"
                  />
                  <label
                    htmlFor="edc-upload"
                    className="cursor-pointer block"
                  >
                    <svg
                      className="w-12 h-12 mx-auto text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <p className="text-gray-600 font-medium">
                      คลิกเพื่อเลือกไฟล์
                    </p>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <img
                        src={uploads.edc.preview}
                        alt="EDC Slip"
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          ✓ อัปโหลดแล้ว
                        </p>
                        <p className="text-sm text-gray-600">
                          {uploads.edc.file.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(uploads.edc!.preview)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        ดู
                      </button>
                      <button
                        onClick={() => handleRemove('edc')}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={handleSkipUpload}
                  disabled={loading}
                  className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  ข้ามขั้นตอนนี้ (กรอกเอง)
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceed || loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md font-medium"
                >
                  {loading ? 'กำลังประมวลผล...' : 'ถัดไป →'}
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Step 2: Review OCR Data */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  กรอกข้อมูลปิดยอดขาย
                </h3>
                <p className="text-sm text-gray-600">
                  กรุณาตรวจสอบและกรอกข้อมูลให้ครบถ้วน
                </p>
              </div>

              {/* Simplified Input Form */}
              <div className="space-y-4">
                {/* 1. ยอดขายรวม */}
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    1. ยอดขายรวม
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.totalSales || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        setEditedData({
                          ...editedData,
                          pos: { ...editedData.pos, totalSales: value }
                        })
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                      placeholder="0.00"
                    />
                    <span className="text-gray-700 font-medium">บาท</span>
                  </div>
                  {(() => {
                    const creditFee = (editedData.pos?.credit || 0) * 0.03
                    const totalAfterFee = (editedData.pos?.totalSales || 0) - creditFee
                    return creditFee > 0 ? (
                      <p className="text-sm text-gray-600 mt-2">
                        ( {totalAfterFee.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท หลังหักค่าธรรมเนียม EDC {creditFee.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท )
                      </p>
                    ) : null
                  })()}
                </div>

                {/* 2. เงินสด */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    2. เงินสด
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.cash || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, cash: parseFloat(e.target.value) || 0 }
                      })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder="0.00"
                    />
                    <span className="text-gray-700 font-medium">บาท</span>
                  </div>
                </div>

                {/* 3. เครดิต */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    3. บัตรเครดิต
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.credit || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, credit: parseFloat(e.target.value) || 0 }
                      })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder="0.00"
                    />
                    <span className="text-gray-700 font-medium">บาท</span>
                  </div>
                  {(() => {
                    const creditAmount = editedData.pos?.credit || 0
                    const fee = creditAmount * 0.03
                    const netCredit = creditAmount - fee
                    return creditAmount > 0 ? (
                      <p className="text-sm text-gray-600 mt-2">
                        ( {netCredit.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท หลังหักค่าธรรมเนียม 3% = {fee.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท )
                      </p>
                    ) : null
                  })()}
                </div>

                {/* 4. โอน */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    4. โอนเงิน
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.transfer || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, transfer: parseFloat(e.target.value) || 0 }
                      })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder="0.00"
                    />
                    <span className="text-gray-700 font-medium">บาท</span>
                  </div>
                </div>

                {/* 5. รายรับอื่นๆ */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    5. รายรับอื่นๆ (ถ้ามี)
                  </label>
                  <div className="flex items-center space-x-3 mb-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.otherIncome || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        otherIncome: parseFloat(e.target.value) || 0
                      })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder="0.00"
                    />
                    <span className="text-gray-700 font-medium">บาท</span>
                  </div>
                  <input
                    type="text"
                    value={editedData.otherIncomeRemark || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      otherIncomeRemark: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="หมายเหตุ (เช่น เงินค่าบริการจัดส่ง, เงินคืนจากซัพพลายเออร์)"
                  />
                </div>

                {/* 6. ค่าใช้จ่าย */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    6. ค่าใช้จ่าย
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.expenses || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, expenses: parseFloat(e.target.value) || 0 }
                      })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                      placeholder="0.00"
                    />
                    <span className="text-gray-700 font-medium">บาท</span>
                  </div>
                </div>

                {/* 7. เงินสดคงเหลือนำส่ง (คำนวณอัตโนมัติ) */}
                <div className="border-2 border-orange-500 rounded-lg p-4 bg-orange-50">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    7. เงินสดคงเหลือนำส่ง (คำนวณอัตโนมัติ)
                  </label>
                  {(() => {
                    const cash = editedData.pos?.cash || 0
                    const expenses = editedData.pos?.expenses || 0
                    const cashToDeposit = cash - expenses

                    return (
                      <>
                        <div className="text-3xl font-bold text-orange-700 mb-2">
                          {cashToDeposit.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>= เงินสด {cash.toLocaleString('th-TH', {minimumFractionDigits: 2})}</p>
                          <p>- ค่าใช้จ่าย {expenses.toLocaleString('th-TH', {minimumFractionDigits: 2})}</p>
                        </div>
                        <p className="text-xs text-orange-700 mt-2 font-medium">
                          💰 Auditor จะมารับเงินสดจำนวนนี้
                        </p>
                      </>
                    )
                  })()}
                </div>

                {/* 8. ยอดคงเหลือสุทธิทั้งหมด (สรุป) */}
                <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    8. ยอดคงเหลือสุทธิทั้งหมด (คำนวณอัตโนมัติ)
                  </label>
                  {(() => {
                    const cash = editedData.pos?.cash || 0
                    const transfer = editedData.pos?.transfer || 0
                    const credit = editedData.pos?.credit || 0
                    const creditFee = credit * 0.03
                    const netCredit = credit - creditFee
                    const otherIncome = editedData.otherIncome || 0
                    const expenses = editedData.pos?.expenses || 0
                    const netBalance = cash + transfer + netCredit + otherIncome - expenses
                    const cashToDeposit = cash - expenses

                    // Auto-update handwritten netCash (เงินสดที่จะนำส่ง)
                    if (editedData.handwritten) {
                      editedData.handwritten.netCash = netBalance
                      editedData.handwritten.cashCount = cashToDeposit
                    } else {
                      editedData.handwritten = {
                        netCash: netBalance,
                        cashCount: cashToDeposit,
                        expenses: expenses
                      }
                    }

                    return (
                      <>
                        <div className="text-3xl font-bold text-green-700 mb-2">
                          {netBalance.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>= เงินสด {cash.toLocaleString('th-TH', {minimumFractionDigits: 2})}</p>
                          <p>+ โอน {transfer.toLocaleString('th-TH', {minimumFractionDigits: 2})}</p>
                          <p>+ เครดิตสุทธิ {netCredit.toLocaleString('th-TH', {minimumFractionDigits: 2})} (หลังหักค่าธรรมเนียม {creditFee.toLocaleString('th-TH', {minimumFractionDigits: 2})})</p>
                          {otherIncome > 0 && <p>+ รายรับอื่นๆ {otherIncome.toLocaleString('th-TH', {minimumFractionDigits: 2})}</p>}
                          <p>- ค่าใช้จ่าย {expenses.toLocaleString('th-TH', {minimumFractionDigits: 2})}</p>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          (รวมเงินสด + โอน + เครดิต)
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Hidden EDC Data (auto-filled from credit card) */}
              <input type="hidden" value={editedData.edc?.totalAmount || ''} />

              {/* Actions */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                >
                  ถัดไป →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm & Submit */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ยืนยันข้อมูลปิดยอด
                </h3>
                <p className="text-sm text-gray-600">
                  กรุณาตรวจสอบข้อมูลอีกครั้งก่อนส่ง
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">วันที่</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {new Date(closingDate).toLocaleDateString('th-TH')}
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">ยอดขายรวม</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(editedData.pos?.totalSales || 0).toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} บาท
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">เงินสดสุทธิ</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(editedData.handwritten?.netCash || 0).toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} บาท
                  </div>
                </div>
              </div>

              {/* Discrepancy Check */}
              {(() => {
                const posCreditVsEdcDiff = Math.abs(
                  (editedData.pos?.credit || 0) - (editedData.edc?.totalAmount || 0)
                )
                const hasDiscrepancy = posCreditVsEdcDiff > 50

                return hasDiscrepancy ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">
                      ⚠️ พบความผิดปกติ
                    </h4>
                    <p className="text-sm text-orange-800 mb-3">
                      ยอดบัตรเครดิต POS กับ EDC ต่างกัน{' '}
                      {posCreditVsEdcDiff.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      บาท
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        หมายเหตุ (จำเป็น)
                      </label>
                      <textarea
                        value={editedData.discrepancyRemark || ''}
                        onChange={(e) => setEditedData({
                          ...editedData,
                          discrepancyRemark: e.target.value
                        })}
                        rows={3}
                        placeholder="กรุณาระบุสาเหตุของความผิดปกติ..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-green-800 font-medium">
                      ✓ ข้อมูลถูกต้อง ไม่พบความผิดปกติ
                    </p>
                  </div>
                )
              })()}

              {/* Detail Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        รายการ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        จำนวนเงิน
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        เงินสด (POS)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {(editedData.pos?.cash || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        บัตรเครดิต (POS)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {(editedData.pos?.credit || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        โอนเงิน (POS)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {(editedData.pos?.transfer || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ยอด EDC
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {(editedData.edc?.totalAmount || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        นับเงินสด (ลายมือ)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {(editedData.handwritten?.cashCount || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        เงินสดสุทธิ
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {(editedData.handwritten?.netCash || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                        })} บาท
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md font-medium"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกและส่งยอด'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
