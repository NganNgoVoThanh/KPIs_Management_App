// components/kpi/kpi-library-selector.tsx
"use client"

import { useState } from "react"

interface KpiLibrarySelectorProps {
  userDepartment?: string
  userJobTitle?: string
  onSelect: (entry: any) => void
}

export function KpiLibrarySelector({ 
  userDepartment, 
  userJobTitle, 
  onSelect 
}: KpiLibrarySelectorProps) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
      >
        Select from KPI Library
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">KPI Library</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search KPIs..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <div className="border rounded p-3 hover:bg-gray-50 cursor-pointer">
            <div className="font-medium">Sample KPI</div>
            <div className="text-sm text-gray-500">Department: {userDepartment}</div>
            <button
              onClick={() => {
                onSelect({
                  kpiName: "Sample KPI",
                  kpiType: "I",
                  unit: "count",
                  dataSource: "System"
                })
                setOpen(false)
              }}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}