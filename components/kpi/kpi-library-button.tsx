"use client"

import { useState } from "react"

interface KpiLibraryButtonProps {
  onSelect: (kpi: any) => void
  userDepartment?: string
}

export function KpiLibraryButton({ onSelect, userDepartment }: KpiLibraryButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Mock data - thay bằng API call thực
  const mockKpis = [
    {
      id: '1',
      department: 'HR',
      jobTitle: 'Manager',
      kpiName: 'Employee Training Completion Rate',
      kpiType: 'I',
      unit: '%',
      dataSource: 'LMS Dashboard'
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

  const filteredKpis = mockKpis.filter(kpi => {
    const matchSearch = !searchQuery || kpi.kpiName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchDept = !userDepartment || kpi.department === userDepartment
    return matchSearch && matchDept
  })

  const handleSelect = (kpi: any) => {
    onSelect(kpi)
    setIsOpen(false)
    setSearchQuery("")
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <div className="flex items-center justify-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Select from KPI Library
        </div>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">KPI Library</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search KPI templates..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {filteredKpis.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No KPI templates found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredKpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{kpi.kpiName}</h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>Department: {kpi.department}</span>
                        <span>•</span>
                        <span>Type: {kpi.kpiType}</span>
                        <span>•</span>
                        <span>Unit: {kpi.unit}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Data Source: {kpi.dataSource}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelect(kpi)}
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}