'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UploadedFile = {
  file: File
  preview: string
  type: 'POS_REPORT' | 'HANDWRITTEN_SUMMARY' | 'EDC_SLIP'
}

export default function NewClosingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [closingDate, setClosingDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [uploads, setUploads] = useState<{
    pos?: UploadedFile
    handwritten?: UploadedFile
    edc?: UploadedFile
  }>({})

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

  const handleNext = () => {
    if (!canProceed) {
      alert('กรุณาอัปโหลดรูปภาพครบทั้ง 3 ประเภท')
      return
    }

    // TODO: Navigate to step 2 with uploaded files
    alert('ขั้นตอนต่อไปจะเป็นการประมวลผล OCR')
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
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    อัปโหลดเอกสาร
                  </div>
                </div>
              </div>
            </div>
            <div className="w-20 h-0.5 bg-gray-300"></div>
            <div className="flex-1">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-500">
                    ตรวจสอบข้อมูล
                  </div>
                </div>
              </div>
            </div>
            <div className="w-20 h-0.5 bg-gray-300"></div>
            <div className="flex-1">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-500">
                    ยืนยันและส่ง
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
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
              disabled={!canProceed}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md font-medium"
            >
              ถัดไป →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
