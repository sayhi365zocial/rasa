'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ImageModalProps {
  imageUrl: string
  alt: string
}

export function ImageModal({ imageUrl, alt }: ImageModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Thumbnail and Button */}
      <div className="relative w-full max-w-2xl mx-auto">
        <div className="bg-gray-100 rounded-lg overflow-hidden cursor-pointer" onClick={() => setIsOpen(true)}>
          <Image
            src={imageUrl}
            alt={alt}
            width={800}
            height={600}
            className="w-full h-auto"
            unoptimized
          />
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsOpen(true)}
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
          >
            เปิดดูภาพขนาดเต็ม
          </button>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
            >
              ✕
            </button>

            {/* Image */}
            <div className="bg-white rounded-lg overflow-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <Image
                src={imageUrl}
                alt={alt}
                width={1600}
                height={1200}
                className="w-full h-auto"
                unoptimized
              />
            </div>

            {/* Download/Open link */}
            <div className="mt-4 text-center">
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
                onClick={(e) => e.stopPropagation()}
              >
                เปิดในแท็บใหม่
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
