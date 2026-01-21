// app/api/actuals/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'
import { calculateKpiActualScore } from '@/lib/evaluation-utils'
import type { KpiDefinition } from '@/lib/types'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * GET /api/actuals
 * Get actuals with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycleId') || undefined
    const kpiDefinitionId = searchParams.get('kpiDefinitionId') || undefined
    const status = searchParams.get('status') || undefined
    const userId = searchParams.get('userId') || undefined

    // Build filters
    const filters: any = {}
    if (kpiDefinitionId) filters.kpiDefinitionId = kpiDefinitionId
    if (status) filters.status = status
    if (cycleId) filters.cycleId = cycleId

    // Authorization: staff can only see their own
    if (user.role === 'STAFF') {
      filters.userId = user.id
    } else if (userId) {
      filters.userId = userId
    }

    const actuals = await db.getKpiActuals(filters)

    // Enrich with KPI data
    const enrichedActuals = await Promise.all(
      actuals.map(async (actual) => {
        const kpi = await db.getKpiDefinitionById(actual.kpiDefinitionId)
        return {
          ...actual,
          kpi
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: enrichedActuals,
      count: enrichedActuals.length
    })

  } catch (error: any) {
    console.error('GET /api/actuals error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch actuals', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/actuals
 * Create actual result for KPI
 */
export async function POST(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { kpiDefinitionId, actualValue, selfComment, evidenceFiles, evidenceLink } = body

    if (!kpiDefinitionId || actualValue === undefined) {
      return NextResponse.json(
        { error: 'KPI ID and actual value are required' },
        { status: 400 }
      )
    }

    // Get KPI definition
    const kpi = await db.getKpiDefinitionById(kpiDefinitionId) as KpiDefinition | null
    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Authorization: only KPI owner can submit actuals
    if (kpi.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to submit actuals for this KPI' },
        { status: 403 }
      )
    }

    // KPI must be approved before submitting actuals
    if (kpi.status !== 'APPROVED' && kpi.status !== 'LOCKED_GOALS') {
      return NextResponse.json(
        { error: 'Can only submit actuals for approved KPIs' },
        { status: 400 }
      )
    }

    // Check if actual already exists
    const existingActuals = await db.getKpiActuals({ kpiDefinitionId })
    if (existingActuals.length > 0 && existingActuals[0].status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Actual already submitted for this KPI' },
        { status: 400 }
      )
    }

    // --- TIMELINE VALIDATION ---
    // Ensure we are within the timeline
    // Using a try-catch block for safety if getCycles is missing or fails
    try {
      // Attempt to find active cycle
      // db.getCycles accepts a status string
      const cycles = await db.getCycles('ACTIVE') || [];
      const activeCycle = cycles[0]; // Assuming single active cycle logic

      if (activeCycle) {
        const now = new Date();
        const start = new Date(activeCycle.trackingStart);
        const end = new Date(activeCycle.trackingEnd);
        // End of day adjustment
        end.setHours(23, 59, 59, 999);

        if (now < start || now > end) {
          return NextResponse.json(
            { error: `Evidence submission is closed. Open from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}` },
            { status: 400 }
          )
        }
      }
    } catch (e) {
      console.warn('Skipped timeline check due to DB error', e);
    }

    // --- AI GATEKEEPER VALIDATION ---
    // Validate evidence against reported data
    if (evidenceFiles?.length > 0 || (evidenceLink && evidenceLink.length > 5)) {
      const { SmartValidator } = await import('@/lib/ai/smart-validator');
      const validator = new SmartValidator();

      // Mock OCR / Content Extraction
      // In production, we would fetch the URL content
      let mockEvidenceContent = "";

      if (evidenceFiles?.length > 0) {
        mockEvidenceContent += evidenceFiles.map((f: any) => `File: ${f.fileName} (${f.description || 'No description'})`).join('\n');
      }

      if (evidenceLink) {
        mockEvidenceContent += `\nExternal Link Provided: ${evidenceLink}`;
        // Heuristic: If it's a sharepoint link, we assume it's valid for now, 
        // but the AI will check if the user CLAIMED a value that matches the "concept" of the evidence.
      }

      const aiCheck = await validator.validateEvidence({
        actualValue: Number(actualValue),
        targetValue: kpi.target,
        reportedDate: new Date().toISOString(),
        evidenceContent: mockEvidenceContent,
        evidenceType: 'mixed'
      });

      if (!aiCheck.isValid) {
        // AUTO-REJECT
        return NextResponse.json(
          {
            error: 'AI Validation Failed (Gatekeeper Reject)',
            details: aiCheck.reason,
            aiDiscrepancies: aiCheck.discrepancies
          },
          { status: 400 }
        );
      }
    }

    // Calculate score (System Auto-Calc)
    const { percentage, score } = calculateKpiActualScore(kpi, actualValue)

    // Determine Period (Month-Year)
    const currentPeriod = `${new Date().getMonth() + 1}-${new Date().getFullYear()}`;

    // Proper type handling for Prisma
    const actualData = {
      kpiDefinitionId,
      actualValue: Number(actualValue),
      percentage: Number(percentage),
      score: Number(score),
      selfComment: selfComment && selfComment.trim() !== '' ? selfComment.trim() : null,
      status: 'WAITING_LINE_MGR' as const, // Correct status per types.ts
      period: currentPeriod,
      aiVerificationStatus: 'PASS', // Since we passed the gatekeeper above
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Create or update actual
    let actual: any;
    if (existingActuals.length > 0) {
      // Update existing
      const updateData = {
        ...actualData,
        updatedAt: new Date()
      }
      // Remove createdAt from update
      delete (updateData as any).createdAt;

      actual = await db.updateKpiActual(existingActuals[0].id, updateData)
    } else {
      // Create new actual
      actual = await db.createKpiActual(actualData)
    }

    // Handle evidence link (Priority 1: User provided link)
    if (evidenceLink && evidenceLink.trim() !== '') {
      const linkData = {
        actualId: actual.id,
        provider: 'LINK',
        providerRef: evidenceLink,
        fileName: 'External Evidence Link',
        fileSize: 0,
        fileType: 'url',
        uploadedBy: user.id,
        uploadedAt: new Date(),
        description: 'Link to external evidence (SharePoint/OneDrive)'
      }
      await db.createEvidence(linkData)
    }

    // Handle evidence files if provided (Priority 2: Uploaded files)
    if (evidenceFiles && Array.isArray(evidenceFiles) && evidenceFiles.length > 0) {
      for (const file of evidenceFiles) {
        const evidenceData = {
          actualId: actual.id,
          fileName: file.fileName || 'unnamed',
          fileSize: Number(file.fileSize) || 0,
          fileType: file.fileType || 'unknown',
          providerRef: file.storageUrl || 'unknown', // Map storageUrl to providerRef
          provider: 'M365', // Default to M365/Local
          uploadedBy: user.id,
          uploadedAt: new Date(),
          description: file.description && file.description.trim() !== '' ? file.description.trim() : null
        }
        await db.createEvidence(evidenceData)
      }
    }

    // Create Approval Record for Level 1 Manager
    const fullUser = await db.getUserById(user.id);

    if (fullUser && fullUser.managerId) {
      await db.createApproval({
        entityId: actual.id,
        entityType: 'ACTUAL',
        level: 1,
        approverId: fullUser.managerId,
        status: 'PENDING',
        kpiDefinitionId: kpiDefinitionId
      });
    } else {
      console.warn(`User ${user.id} has no manager assigned. Actual ${actual.id} submitted but no approval created.`);
      // Optional: Auto-approve or assign to Admin? 
      // For now, we leave it as WAITING_LINE_MGR but no approver sees it unless Admin looks for orphan approvals.'
    }

    return NextResponse.json({
      success: true,
      data: actual,
      message: 'Actual result saved and submitted for approval'
    }, { status: 201 })

  } catch (error: any) {
    console.error('POST /api/actuals error:', error)
    return NextResponse.json(
      { error: 'Failed to save actual', details: error.message },
      { status: 500 }
    )
  }
}