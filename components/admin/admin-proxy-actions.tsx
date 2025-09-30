"use client"

import { useState } from "react"

interface AdminProxyActionsProps {
  entityType: 'KPI' | 'ACTUAL'
  entityId: string
  staffUserId: string
  staffName: string
  onActionComplete?: () => void
}

export function AdminProxyActions({
  entityType,
  entityId,
  staffUserId,
  staffName,
  onActionComplete
}: AdminProxyActionsProps) {
  const [activeTab, setActiveTab] = useState<'return' | 'approve' | 'reassign'>('return')
  const [reason, setReason] = useState("")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReturnToStaff = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason")
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/proxy/return-to-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          staffUserId,
          reason,
          comment
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || "Returned to staff successfully")
        setReason("")
        setComment("")
        onActionComplete?.()
      } else {
        alert(data.error || "Action failed")
      }
    } catch (error) {
      alert("Error: " + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 border-2 border-yellow-300 bg-yellow-50 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Admin Proxy Actions</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Perform administrative actions on behalf of users or managers
      </p>

      <div className="flex space-x-2 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('return')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'return'
              ? 'border-b-2 border-red-500 text-red-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Return to Staff
        </button>
        <button
          onClick={() => setActiveTab('approve')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'approve'
              ? 'border-b-2 border-red-500 text-red-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Approve/Reject
        </button>
        <button
          onClick={() => setActiveTab('reassign')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'reassign'
              ? 'border-b-2 border-red-500 text-red-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Reassign
        </button>
      </div>

      {activeTab === 'return' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            This will return the {entityType.toLowerCase()} to <strong>{staffName}</strong> for revision and cancel all pending approvals.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Return <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Manager on leave, urgent revision needed"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment to Staff (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Additional instructions or feedback..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <button
            onClick={handleReturnToStaff}
            disabled={loading}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {loading ? "Processing..." : "Return to Staff"}
          </button>
        </div>
      )}

      {activeTab === 'approve' && (
        <div className="text-center py-8 text-gray-500">
          <p>Approve/Reject as Manager functionality</p>
          <p className="text-sm mt-2">Available in full version</p>
        </div>
      )}

      {activeTab === 'reassign' && (
        <div className="text-center py-8 text-gray-500">
          <p>Reassign Approver functionality</p>
          <p className="text-sm mt-2">Available in full version</p>
        </div>
      )}
    </div>
  )
}