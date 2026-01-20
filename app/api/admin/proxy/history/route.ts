import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const entityId = searchParams.get('entityId') || undefined;
        const actionType = searchParams.get('actionType') || undefined;

        const db = getDatabase();
        const actions = await db.getProxyActions({
            entityId,
            actionType
        });

        return NextResponse.json({
            success: true,
            data: actions
        });

    } catch (error: any) {
        console.error('Admin proxy history fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch proxy history', details: error.message },
            { status: 500 }
        );
    }
}

