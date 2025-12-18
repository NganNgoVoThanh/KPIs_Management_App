// app/api/admin/index-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { KnowledgeBaseService } from '@/lib/ai/knowledge-base-service';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';

// In-memory lock to prevent concurrent indexing
const indexingLocks = new Map<string, { promise: Promise<void>; startedAt: Date }>();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Check if indexing is already in progress
    const lockKey = 'indexing-all-documents';
    const existingLock = indexingLocks.get(lockKey);

    if (existingLock) {
      const elapsed = Date.now() - existingLock.startedAt.getTime();
      if (elapsed < 300000) { // 5 minutes timeout
        return NextResponse.json(
          { success: false, error: 'Indexing already in progress. Please wait.' },
          { status: 409 } // Conflict
        );
      } else {
        // Lock expired, remove it
        indexingLocks.delete(lockKey);
      }
    }

    // Acquire lock
    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => { resolveLock = resolve; });
    indexingLocks.set(lockKey, { promise: lockPromise, startedAt: new Date() });

    try {
      const kbService = new KnowledgeBaseService();
      const db = getDatabase();

    // Get all unindexed documents
    const [kpiResources, companyDocuments, kpiLibraryUploads] = await Promise.all([
      db.getKpiResources({ aiIndexed: false }),
      db.getCompanyDocuments({ aiIndexed: false }),
      db.getKpiLibraryUploads({ aiIndexed: false }),
    ]);

    let indexed = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Index KPI Resources
    for (const resource of kpiResources) {
      if (resource.resourceType === 'FILE' && resource.storageUrl) {
        try {
          // Read file content
          const fs = await import('fs/promises');
          const path = await import('path');

          let filePath = resource.storageUrl;
          if (!path.isAbsolute(filePath)) {
            filePath = path.join(process.cwd(), filePath);
          }

          const fileBuffer = await fs.readFile(filePath);
          const base64Content = `data:${resource.mimeType};base64,${fileBuffer.toString('base64')}`;

          await kbService.indexDocument(resource.id, base64Content, {
            mimeType: resource.mimeType || 'application/octet-stream',
            fileName: resource.fileName || 'unknown',
            department: resource.department || undefined,
            type: 'KPI_RESOURCE',
          });

          indexed++;
        } catch (error: any) {
          console.error(`Failed to index resource ${resource.id}:`, error);
          errors.push({ id: resource.id, error: error.message });
          failed++;
        }
      }
    }

    // Index Company Documents
    for (const doc of companyDocuments) {
      if (doc.storageUrl) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');

          let filePath = doc.storageUrl;
          if (!path.isAbsolute(filePath)) {
            filePath = path.join(process.cwd(), filePath);
          }

          const fileBuffer = await fs.readFile(filePath);
          const base64Content = `data:${doc.fileType};base64,${fileBuffer.toString('base64')}`;

          await kbService.indexDocument(doc.id, base64Content, {
            mimeType: doc.fileType,
            fileName: doc.fileName,
            department: doc.department || undefined,
            type: 'COMPANY_DOCUMENT',
          });

          // Update document
          await db.updateCompanyDocument(doc.id, {
            aiIndexed: true,
            aiIndexedAt: new Date(),
          });

          indexed++;
        } catch (error: any) {
          console.error(`Failed to index document ${doc.id}:`, error);
          errors.push({ id: doc.id, error: error.message });
          failed++;
        }
      }
    }

    // Index KPI Library Uploads (JSON data) - ACTUALLY INDEX TO VECTOR STORE
    for (const upload of kpiLibraryUploads) {
      try {
        // Convert rawData to text for indexing
        const textContent = JSON.stringify(upload.rawData);

        // Create embedding-friendly format
        const formattedContent = `KPI Library File: ${upload.fileName}\nTotal Entries: ${upload.totalEntries}\nValid Entries: ${upload.validEntries}\nData: ${textContent.substring(0, 5000)}`;

        // ACTUALLY call knowledge base service to index
        const vectorId = await kbService.indexDocument(upload.id,
          `data:application/json;base64,${Buffer.from(formattedContent).toString('base64')}`,
          {
            mimeType: 'application/json',
            fileName: upload.fileName,
            department: undefined,
            type: 'KPI_LIBRARY'
          }
        );

        // Update with actual vectorId
        await db.updateKpiLibraryUpload(upload.id, {
          aiIndexed: true,
          vectorId: vectorId,
        });

        indexed++;
      } catch (error: any) {
        console.error(`Failed to index upload ${upload.id}:`, error);
        errors.push({ id: upload.id, error: error.message });
        failed++;
      }
    }

      return NextResponse.json({
        success: true,
        data: {
          indexed,
          failed,
          errors,
          summary: {
            kpiResources: kpiResources.length,
            companyDocuments: companyDocuments.length,
            kpiLibraryUploads: kpiLibraryUploads.length,
          },
        },
        message: `Indexing complete. ${indexed} documents indexed, ${failed} failed.`,
      });
    } finally {
      // Release lock
      indexingLocks.delete(lockKey);
      resolveLock!();
    }
  } catch (error: any) {
    console.error('Document indexing error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Get indexing status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const db = getDatabase();

    const [
      totalResources,
      indexedResources,
      totalDocuments,
      indexedDocuments,
      totalUploads,
      indexedUploads,
    ] = await Promise.all([
      db.getKpiResources({}),
      db.getKpiResources({ aiIndexed: true }),
      db.getCompanyDocuments({}),
      db.getCompanyDocuments({ aiIndexed: true }),
      db.getKpiLibraryUploads({}),
      db.getKpiLibraryUploads({ aiIndexed: true }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        kpiResources: {
          total: totalResources.length,
          indexed: indexedResources.length,
          pending: totalResources.length - indexedResources.length,
        },
        companyDocuments: {
          total: totalDocuments.length,
          indexed: indexedDocuments.length,
          pending: totalDocuments.length - indexedDocuments.length,
        },
        kpiLibraryUploads: {
          total: totalUploads.length,
          indexed: indexedUploads.length,
          pending: totalUploads.length - indexedUploads.length,
        },
        totalIndexed:
          indexedResources.length + indexedDocuments.length + indexedUploads.length,
        totalPending:
          totalResources.length -
          indexedResources.length +
          (totalDocuments.length - indexedDocuments.length) +
          (totalUploads.length - indexedUploads.length),
      },
    });
  } catch (error: any) {
    console.error('Get indexing status error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
