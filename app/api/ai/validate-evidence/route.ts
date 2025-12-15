import { NextRequest, NextResponse } from 'next/server';
import { SmartValidator } from '@/lib/ai/smart-validator';

const validator = new SmartValidator();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { actualValue, targetValue, reportedDate, evidenceContent, evidenceType } = body;

        if (actualValue === undefined || targetValue === undefined || !evidenceContent) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await validator.validateEvidence({
            actualValue,
            targetValue,
            reportedDate: reportedDate || new Date().toISOString(),
            evidenceContent,
            evidenceType: evidenceType || 'text'
        });

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Evidence validation error:', error);
        return NextResponse.json(
            { error: 'Validation failed' },
            { status: 500 }
        );
    }
}
