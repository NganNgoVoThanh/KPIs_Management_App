// app/api/admin/reimport-templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

/**
 * POST /api/admin/reimport-templates
 * Delete all templates from a specific upload and re-create them with updated logic
 */
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
    const { uploadId } = body

    if (!uploadId) {
      return NextResponse.json({
        success: false,
        error: 'Missing uploadId'
      }, { status: 400 })
    }

    const db = getDatabase()

    // 1. Find all templates from this upload
    const allTemplates = await db.getKpiTemplates({ isActive: false }) // Get ALL including archived
    const templatesFromUpload = allTemplates.filter((t: any) => t.uploadId === uploadId)

    console.log(`[REIMPORT] Found ${templatesFromUpload.length} templates from upload ${uploadId}`)

    // 2. Delete (archive) all templates from this upload
    for (const template of templatesFromUpload) {
      await db.archiveTemplate(template.id)
      console.log(`[REIMPORT] Archived template ${template.id}`)
    }

    // 3. Get the upload data
    const upload = await db.getKpiLibraryUploadById(uploadId)
    if (!upload) {
      return NextResponse.json({
        success: false,
        error: 'Upload not found'
      }, { status: 404 })
    }

    // 4. Re-process the upload with new logic
    const rawData = upload.rawData || []
    const dataRows = rawData.slice(6) // Skip header rows
    let processedCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 7 // Actual row number in Excel (starts at row 7)
      const kpiName = row[4]?.toString().trim()
      const department = row[2]?.toString().trim()
      const kpiType = row[5]?.toString().trim()
      const jobTitle = row[3]?.toString().trim()

      // Basic validation matching upload route
      if (kpiName && department) {
        // Create more descriptive name to differentiate templates
        const templateDescription = jobTitle
          ? `${kpiName} - ${jobTitle} (Row ${rowNumber} from ${upload.fileName})`
          : `${kpiName} - ${department} (Row ${rowNumber} from ${upload.fileName})`

        await db.createKpiTemplate({
          name: kpiName,
          description: templateDescription,
          department: department,
          jobTitle: jobTitle,
          category: mapKpiTypeToCategory(kpiType),
          kpiType: kpiType || 'Custom',
          unit: row[6]?.toString().trim(),
          formula: row[7]?.toString().trim(),
          dataSource: row[8]?.toString().trim(),
          targetValue: row[9] ? parseFloat(row[9].toString()) : undefined,
          weight: row[10] ? parseFloat(row[10].toString()) : undefined,
          source: 'EXCEL_IMPORT',
          uploadId: uploadId,
          status: 'APPROVED',
          isActive: true,
          createdBy: upload.uploadedBy,
          createdAt: new Date().toISOString(),
          version: 1,
          usageCount: 0
        })
        processedCount++
        console.log(`[REIMPORT] Created template: ${templateDescription}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Re-imported ${processedCount} templates. Archived ${templatesFromUpload.length} old templates.`,
      data: {
        archivedCount: templatesFromUpload.length,
        createdCount: processedCount
      }
    })
  } catch (error: any) {
    console.error('[REIMPORT] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to reimport templates'
    }, { status: 500 })
  }
}

function mapKpiTypeToCategory(type: string): string {
  const map: Record<string, string> = {
    'I': 'FINANCIAL',
    'II': 'CUSTOMER',
    'III': 'OPERATIONAL',
    'IV': 'LEARNING'
  }
  return map[type] || 'OPERATIONAL'
}
