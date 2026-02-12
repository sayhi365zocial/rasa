'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { POSData, HandwrittenData, EDCData } from '@/lib/types'

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
              <button
                onClick={handleNext}
                disabled={!canProceed || loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md font-medium"
              >
                {loading ? 'กำลังประมวลผล...' : 'ถัดไป →'}
              </button>
            </div>
          </div>
          )}

          {/* Step 2: Review OCR Data */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ตรวจสอบข้อมูลที่สกัดจากเอกสาร
                </h3>
                <p className="text-sm text-gray-600">
                  กรุณาตรวจสอบและแก้ไขข้อมูลที่ระบบสกัดจากรูปภาพให้ถูกต้อง
                </p>
              </div>

              {/* POS Data */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">📊 ข้อมูล POS</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ยอดขายรวม
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.totalSales || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, totalSales: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เงินสด
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.cash || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, cash: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      บัตรเครดิต
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.credit || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, credit: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      โอนเงิน
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.transfer || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, transfer: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ค่าใช้จ่าย
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.pos?.expenses || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, expenses: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      จำนวนบิล
                    </label>
                    <input
                      type="number"
                      value={editedData.pos?.billCount || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        pos: { ...editedData.pos, billCount: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Handwritten Data */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">✍️ ใบสรุปลายมือ</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      นับเงินสด
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.handwritten?.cashCount || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        handwritten: { ...editedData.handwritten, cashCount: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ค่าใช้จ่าย
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.handwritten?.expenses || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        handwritten: { ...editedData.handwritten, expenses: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เงินสดสุทธิ
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.handwritten?.netCash || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        handwritten: { ...editedData.handwritten, netCash: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* EDC Data */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">💳 ข้อมูล EDC</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ยอดรวม EDC
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.edc?.totalAmount || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        edc: { ...editedData.edc, totalAmount: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={editedData.edc?.batchNumber || ''}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        edc: { ...editedData.edc, batchNumber: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

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
