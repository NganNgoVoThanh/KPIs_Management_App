// app/api/kpi-library/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Simple mock data cho testing
    const mockData = [
      {
        id: '1',
        department: 'HR',
        jobTitle: 'Manager',
        kpiName: 'Employee Training Completion',
        kpiType: 'I',
        unit: 'Hours',
        dataSource: 'Dashboard'
      },
      {
        id: '2',
        department: 'HR',
        jobTitle: 'Executive',
        kpiName: 'Training Satisfaction Score',
        kpiType: 'III',
        unit: 'Score',
        dataSource: 'Survey'
      }
    ]

    return NextResponse.json({
      success: true,
      data: mockData,
      count: mockData.length
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch KPI library', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Chỉ log, không lưu database
    console.log('Upload KPI library:', body)

    return NextResponse.json({
      success: true,
      message: 'KPI library uploaded successfully',
      entriesProcessed: body.entries?.length || 0
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    )
  }
}