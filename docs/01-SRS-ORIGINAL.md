# Software Requirements Specification (SRS)

**Project Name:** Pharmacy Sales Audit & Reconciliation System (PSARS)
**Type:** Web Application
**Version:** 1.2
**Date:** 12 February 2026

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์ (Purpose)
เอกสารนี้ระบุความต้องการของระบบ "ตรวจสอบและกระทบยอดการรับชำระเงินร้านยา" เพื่อใช้เป็นข้อตกลงในการพัฒนาระบบ ระหว่างเจ้าของกิจการและทีมพัฒนา โดยเน้นการใช้เทคโนโลยี OCR (AI Agent) เพื่อลดภาระงานป้อนข้อมูลและเพิ่มความแม่นยำในการตรวจสอบบัญชี และรองรับการบริหารจัดการสาขาและพนักงานจากส่วนกลาง

### 1.2 ขอบเขต (Scope)
ระบบนี้เป็น Web Application (รองรับ Responsive Design) สำหรับบริหารจัดการกระบวนการปิดยอดขายประจำวันของร้านยาหลายสาขา ครอบคลุมฟังก์ชัน:

- การส่งยอดปิดร้าน (Store Closing)
- การตรวจสอบและนำฝากเงิน (Audit & Deposit)
- การออกรายงานวิเคราะห์ (Reporting)
- การบริหารจัดการระบบ (System Administration - Branch & Staff)

โดยมีการเชื่อมต่อกับ Third-party Services คือ Cloudflare R2 (Storage) และ Anthropic Claude API (OCR)

## 2. คำอธิบายทั่วไป (General Description)

### 2.1 ผู้ใช้งานระบบ (User Characteristics)

| Role ID | Role Name | รายละเอียดหน้าที่ |
|---------|-----------|------------------|
| ACT-01 | Store Staff (พนักงานหน้าร้าน) | สรุปยอดขายประจำวัน, อัปโหลดเอกสารปิดยอด, แก้ไขยอดตามจริง |
| ACT-02 | Auditor (ผู้ตรวจสอบ) | ตรวจสอบยอดรอรับ, รับเงินสดจากสาขา, นำฝากธนาคาร, อัปโหลดสลิป |
| ACT-03 | Owner / Admin (ผู้ดูแลระบบ) | ดู Dashboard, จัดการข้อมูลสาขา, จัดการข้อมูลพนักงาน, ดูรายงาน |

### 2.2 สภาพแวดล้อมการทำงาน (Operating Environment)

- **Platform:** Web Application (ใช้งานผ่าน Browser: Chrome, Safari, Edge)
- **Storage:** Cloudflare R2 (สำหรับเก็บไฟล์รูปภาพ)
- **AI Engine:** Anthropic Claude 3.5 Sonnet (via API)

## 3. ความต้องการด้านฟังก์ชัน (Functional Requirements)

### 3.1 โมดูลสำหรับพนักงานหน้าร้าน (Store Staff Module)

**[REQ-STR-01] Daily Closing Submission**
- ระบบต้องมีฟอร์มสำหรับเลือก "วันที่" (Default เป็นปัจจุบัน)
- ระบบแสดง "สาขา" อัตโนมัติตามสิทธิ์ของพนักงานที่ Login
- อัปโหลดรูปภาพ 3 ประเภท (เก็บไฟล์ที่ Cloudflare R2):
  - POS Report: ยอดขายรวมจากระบบ
  - Handwritten Summary: ใบบันทึกสรุปยอดลายมือ
  - EDC Slip: ใบสรุปยอดรูดบัตร

**[REQ-STR-02] AI-Powered OCR Processing**
- ระบบส่งรูปภาพไปยัง Claude API เพื่อดึงค่าอัตโนมัติ:
  - POS: Total Sales, Cash, Credit, Transfer, Expenses
  - Handwritten: Actual Cash Count, Expenses List
  - EDC: Total Settlement Amount
- แสดงค่าที่ได้ใน Input Form (User สามารถแก้ไขได้)

**[REQ-STR-03] Pre-Validation (Cross-check)**
- ตรวจสอบยอดก่อน Submit:
  - POS Credit vs EDC Slip Total
  - POS Total Sales vs (Handwritten Cash + Credit + Transfer)
- หากยอดไม่ตรงกัน แสดง Alert แจ้งเตือน แต่ยังอนุญาตให้กดส่งได้โดยต้องระบุเหตุผล (Remark)

### 3.2 โมดูลสำหรับผู้ตรวจสอบ (Auditor Module)

**[REQ-AUD-01] Auditor Dashboard**
- แสดงรายการสาขาที่ส่งยอดมาแล้ว (Status: Submitted)
- แสดงยอดเงินสดสุทธิ (Net Cash) ที่ต้องเข้าไปรับจากแต่ละสาขา

**[REQ-AUD-02] Cash Collection**
- ผู้ตรวจสอบกดปุ่ม "Confirm Receive" ที่หน้างานเพื่อยืนยันการรับเงินสด

**[REQ-AUD-03] Bank Deposit Entry**
- อัปโหลด ใบนำฝาก (Pay-in Slip)
- ระบบใช้ AI OCR อ่านค่า "Deposit Amount" และ "Date/Time"
- Validation: ตรวจสอบ Deposit Amount == Collected Cash Amount
- หากถูกต้อง สถานะเปลี่ยนเป็น "Completed"

### 3.3 โมดูลสำหรับเจ้าของกิจการ (Owner Module)

**[REQ-OWN-01] Executive Dashboard**
- แสดงสถานะรายวันของทุกสาขา (Green=OK, Red=Discrepancy, Yellow=Pending)
- แสดงกราฟสรุปยอดขายรวมและสัดส่วนช่องทางการชำระเงิน

**[REQ-OWN-02] Discrepancy Notification**
- ส่งอีเมลแจ้งเตือน Owner ทันที หาก:
  - ยอดเงินนำฝาก < ยอดที่ควรจะเป็น
  - ยอด EDC ไม่ตรงกับ POS (เกิน Threshold)

### 3.4 โมดูลรายงาน (Reporting Module)

**[REQ-RPT-01] Sales & Reconciliation Report**
- Filter: Date Range, Branch, Status
- Display: ตารางเปรียบเทียบยอด (POS vs Handwritten vs Bank Deposit)
- Export: Excel (.xlsx) และ PDF

**[REQ-RPT-02] Deposit Verification Report**
- รายงานสรุปการนำฝากเงินเข้าธนาคาร
- Export PDF: ต้องแสดงตารางและแนบรูปภาพ Thumbnail ของสลิปธนาคารต่อท้ายรายงาน

**[REQ-RPT-03] Audit Trail**
- บันทึก Log การแก้ไขข้อมูลสำคัญ (Original Value vs New Value, User, Timestamp)

### 3.5 โมดูลจัดการระบบ (System Administration Module)

**[REQ-SYS-01] Branch Management (จัดการสาขา)**

Admin สามารถดำเนินการกับข้อมูลสาขาได้:
- Create: เพิ่มสาขาใหม่ (ชื่อสาขา, ที่อยู่, รหัสสาขา)
- Update: แก้ไขข้อมูลสาขา
- Delete (Soft Delete): ปิดใช้งานสาขา (Inactive) เพื่อเก็บประวัติเก่าไว้
- List: ดูรายชื่อสาขาทั้งหมดและสถานะ (Active/Inactive)

**[REQ-SYS-02] Employee Management (จัดการพนักงาน)**

Admin สามารถดำเนินการกับข้อมูลพนักงานได้:
- Create: เพิ่มพนักงานใหม่ (ชื่อ-นามสกุล, Username/Email, Password, เบอร์โทร)
- Role Assignment: กำหนดสิทธิ์การใช้งาน (Store Staff / Auditor / Owner)
- Branch Assignment: กรณีเป็น Store Staff ต้องระบุว่าสังกัด "สาขา" ใด
- Update/Delete: แก้ไขข้อมูลหรือระงับการใช้งาน (Suspend)

## 4. ความต้องการที่ไม่ใช่ฟังก์ชัน (Non-Functional Requirements)

- **[REQ-NFR-01] Performance:** OCR Process ไม่ควรเกิน 15 วินาที/ภาพ
- **[REQ-NFR-02] Security:** ไฟล์ภาพบน Cloudflare R2 ต้องเข้าถึงได้เฉพาะผ่าน Signed URL
- **[REQ-NFR-03] Reliability:** รองรับ Local Storage (Save Draft) ป้องกันข้อมูลหาย
- **[REQ-NFR-04] Usability:** UI ต้องรองรับการใช้งานผ่าน Mobile Browser ได้ดี (Responsive)

## 5. เทคนิคและเครื่องมือ (Technical Stack Specification)

- **Infrastructure (PaaS):** Railway (สำหรับ Deploy Web & Database)
- **Fullstack Framework:** Next.js (App Router) / TypeScript
- **Frontend:** React, Tailwind CSS, Lucide React (Icons), Shadcn UI (Component Library)
- **Backend:** Next.js Server Actions หรือ API Routes (Node.js environment)
- **Database:** PostgreSQL (Hosted on Railway)
- **ORM:** Prisma (สำหรับการจัดการ Database Schema และ Type Safety)
- **File Storage:** Cloudflare R2 (เชื่อมต่อผ่าน AWS SDK for JavaScript)
- **AI Integration:** Anthropic Claude API (Model: claude-3-5-sonnet)
- **Library:** @anthropic-ai/sdk
