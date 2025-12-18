// lib/kpi-library-upload-service.ts - Excel Upload & Approval Workflow Service

import { db } from './db'
import { getPrisma } from './repositories/MySQLRepository'
const prisma = getPrisma()
import type { KpiLibraryUpload } from './types'

export interface CreateUploadInput {
  fileName: string
  fileSize: number
  mimeType: string
  storageUrl?: string
  rawData: any[]
  uploadedBy: string
}

export interface ProcessedEntry {
  row: number
  data: any
  isValid: boolean
  errors?: string[]
}

class KpiLibraryUploadService {

  /**
   * Create new upload record
   */
  async createUpload(input: CreateUploadInput): Promise<KpiLibraryUpload> {
    // Validate and process Excel data
    const processed = this.validateExcelData(input.rawData)

    const upload = await prisma.kpiLibraryUpload.create({
      data: {
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        storageUrl: input.storageUrl,
        rawData: input.rawData,
        totalEntries: processed.total,
        validEntries: processed.valid,
        invalidEntries: processed.invalid,
        parseErrors: processed.errors,
        uploadedBy: input.uploadedBy,
        status: 'PENDING',
        processedCount: 0
      }
    })

    return this.formatUpload(upload)
  }

  /**
   * Get upload by ID
   */
  async getUploadById(id: string): Promise<KpiLibraryUpload | null> {
    const upload = await prisma.kpiLibraryUpload.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!upload) return null
    return this.formatUpload(upload)
  }

  /**
   * Get all uploads
   */
  async getUploads(status?: string): Promise<KpiLibraryUpload[]> {
    const where = status ? { status } : {}

    const uploads = await prisma.kpiLibraryUpload.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    })

    return uploads.map(u => this.formatUpload(u))
  }

  /**
   * Approve upload and process entries
   */
  async approveUpload(
    id: string,
    reviewedBy: string,
    reviewComment?: string
  ): Promise<KpiLibraryUpload> {
    // Get upload
    const upload = await this.getUploadById(id)
    if (!upload) {
      throw new Error('Upload not found')
    }

    if (upload.status !== 'PENDING') {
      throw new Error('Upload is not pending approval')
    }

    // Process valid entries and create KPI Library Entries
    const processedCount = await this.processValidEntries(
      upload.rawData,
      upload.uploadedBy,
      id
    )

    // Update upload status
    const updated = await prisma.kpiLibraryUpload.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewComment,
        processedAt: new Date(),
        processedCount
      }
    })

    return this.formatUpload(updated)
  }

  /**
   * Reject upload
   */
  async rejectUpload(
    id: string,
    reviewedBy: string,
    rejectionReason: string
  ): Promise<KpiLibraryUpload> {
    const upload = await prisma.kpiLibraryUpload.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason
      }
    })

    return this.formatUpload(upload)
  }

  /**
   * Validate Excel data
   */
  private validateExcelData(rawData: any[]): {
    total: number
    valid: number
    invalid: number
    errors: Array<{ row: number; error: string }>
  } {
    const errors: Array<{ row: number; error: string }> = []
    let validCount = 0

    // Skip header rows (rows 0-5)
    const dataRows = rawData.slice(6)

    dataRows.forEach((row, index) => {
      const rowNumber = index + 7 // Excel row number (1-based + 6 header rows)

      // Check required fields
      // Row structure: [STT, OGSM Target, Department, Job Title, KPI Name, Type, Unit, Data Source, ...]
      const stt = row[0]
      const department = row[2]
      const jobTitle = row[3]
      const kpiName = row[4]
      const kpiType = row[5]
      const unit = row[6]

      if (!kpiName || !kpiName.toString().trim()) {
        errors.push({ row: rowNumber, error: 'KPI Name is required' })
        return
      }

      if (!department || !department.toString().trim()) {
        errors.push({ row: rowNumber, error: 'Department is required' })
        return
      }

      if (!kpiType || !['I', 'II', 'III', 'IV'].includes(kpiType.toString().trim())) {
        errors.push({ row: rowNumber, error: 'Invalid KPI Type (must be I, II, III, or IV)' })
        return
      }

      validCount++
    })

    return {
      total: dataRows.length,
      valid: validCount,
      invalid: errors.length,
      errors
    }
  }

  /**
   * Process valid entries and create KPI Library Entries
   */
  private async processValidEntries(
    rawData: any[],
    uploadedBy: string,
    uploadId: string
  ): Promise<number> {
    const dataRows = rawData.slice(6)
    let processedCount = 0

    for (const [index, row] of dataRows.entries()) {
      const rowNumber = index + 7

      // Extract data
      const stt = row[0]
      const ogsmTarget = row[1] || ''
      const department = row[2]
      const jobTitle = row[3] || ''
      const kpiName = row[4]
      const kpiType = row[5]
      const unit = row[6] || ''
      const dataSource = row[7] || ''
      const yearlyTarget = row[8]
      const quarterlyTarget = row[9]

      // Skip invalid rows
      if (!kpiName || !department || !kpiType) {
        continue
      }

      try {
        // Create KPI Library Entry
        await prisma.kpiLibraryEntry.create({
          data: {
            stt: typeof stt === 'number' ? stt : rowNumber,
            ogsmTarget: ogsmTarget.toString(),
            department: department.toString(),
            jobTitle: jobTitle.toString(),
            kpiName: kpiName.toString(),
            kpiType: kpiType.toString(),
            unit: unit.toString(),
            dataSource: dataSource.toString(),
            yearlyTarget: yearlyTarget?.toString(),
            quarterlyTarget: quarterlyTarget?.toString(),
            uploadedBy,
            uploadId,
            status: 'ACTIVE',
            version: 1,
            isTemplate: true
          }
        })

        processedCount++
      } catch (error) {
        console.error(`Failed to process row ${rowNumber}:`, error)
      }
    }

    return processedCount
  }

  /**
   * Get upload statistics
   */
  async getStatistics() {
    const [pending, approved, rejected, totalEntries] = await Promise.all([
      prisma.kpiLibraryUpload.count({ where: { status: 'PENDING' } }),
      prisma.kpiLibraryUpload.count({ where: { status: 'APPROVED' } }),
      prisma.kpiLibraryUpload.count({ where: { status: 'REJECTED' } }),
      prisma.kpiLibraryEntry.count({ where: { status: 'ACTIVE' } })
    ])

    return {
      pendingUploads: pending,
      approvedUploads: approved,
      rejectedUploads: rejected,
      activeEntries: totalEntries
    }
  }

  /**
   * Format upload for API response
   */
  private formatUpload(upload: any): KpiLibraryUpload {
    return {
      ...upload,
      uploadedAt: upload.uploadedAt.toISOString(),
      reviewedAt: upload.reviewedAt?.toISOString(),
      processedAt: upload.processedAt?.toISOString()
    }
  }
}

export const kpiLibraryUploadService = new KpiLibraryUploadService()
