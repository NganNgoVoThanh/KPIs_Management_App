// app/api/kpi-library/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required'
      }, { status: 403 })
    }

    const body = await request.json()
    const { fileName, excelData } = body

    if (!fileName || !excelData) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: fileName, excelData'
      }, { status: 400 })
    }

    const validationResult = validateExcelData(excelData)

    const db = getDatabase()
    const upload = await db.createKpiLibraryUpload({
      fileName,
      fileSize: JSON.stringify(excelData).length,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      rawData: excelData,
      totalEntries: validationResult.total,
      validEntries: validationResult.valid,
      invalidEntries: validationResult.invalid,
      parseErrors: validationResult.errors,
      uploadedBy: user.id,
      status: 'PENDING',
      processedCount: 0
    })

    return NextResponse.json({
      success: true,
      data: upload,
      message: `File uploaded. ${validationResult.valid} valid entries out of ${validationResult.total}.`
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

function validateExcelData(rawData: any[]) {
  const errors: Array<{ row: number; error: string }> = []
  let validCount = 0
  const dataRows = rawData.slice(6)

  dataRows.forEach((row, index) => {
    const rowNumber = index + 7
    const kpiName = row[4]
    const department = row[2]
    const kpiType = row[5]

    if (!kpiName?.toString().trim()) {
      errors.push({ row: rowNumber, error: 'KPI Name required' })
      return
    }
    if (!department?.toString().trim()) {
      errors.push({ row: rowNumber, error: 'Department required' })
      return
    }
    if (!['I', 'II', 'III', 'IV', '1', '2', '3', '4'].includes(kpiType?.toString().trim().toUpperCase())) {
      errors.push({ row: rowNumber, error: 'Invalid KPI Type' })
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
