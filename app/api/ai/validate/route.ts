// app/api/ai/validate/route.ts - UPDATED
import { NextRequest, NextResponse } from 'next/server';
import { SmartValidator } from '@/lib/ai/smart-validator';

const validator = new SmartValidator();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, target, unit, measurementMethod, dataSource } = body;

    // Validate required fields
    if (!title || target === undefined || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields: title, target, unit' },
        { status: 400 }
      );
    }

    // Perform SMART validation
    const result = await validator.validateKPI({
      title,
      description: description || '',
      target,
      unit,
      measurementMethod: measurementMethod || '',
      dataSource: dataSource || ''
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('SMART validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Validation failed', details: errorMessage },
      { status: 500 }
    );
  }
}