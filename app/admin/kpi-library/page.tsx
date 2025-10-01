"use client"

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Eye,
  AlertCircle,
  FileText,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { KpiLibraryEntry, KpiLibraryUpload, KpiLibraryChangeRequest } from '@/lib/types'

export default function KpiLibraryPage() {
  const [activeTab, setActiveTab] = useState('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploads, setUploads] = useState<KpiLibraryUpload[]>([])
  const [changeRequests, setChangeRequests] = useState<KpiLibraryChangeRequest[]>([])
  const [selectedUpload, setSelectedUpload] = useState<KpiLibraryUpload | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<KpiLibraryChangeRequest | null>(null)
  const [reviewDialog, setReviewDialog] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [statistics, setStatistics] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Fetch data
  const fetchUploads = async () => {
    try {
      const res = await fetch('/api/kpi-library/uploads')
      const data = await res.json()
      if (data.success) {
        setUploads(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error)
    }
  }

  const fetchChangeRequests = async () => {
    try {
      const res = await fetch('/api/kpi-library/change-requests')
      const data = await res.json()
      if (data.success) {
        setChangeRequests(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch change requests:', error)
    }
  }

  const fetchStatistics = async () => {
    try {
      const res = await fetch('/api/kpi-library/statistics')
      const data = await res.json()
      if (data.success) {
        setStatistics(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel file (.xlsx or .xls)',
        variant: 'destructive'
      })
      return
    }

    setFile(selectedFile)

    try {
      // Read and parse Excel file
      const arrayBuffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, {
        cellStyles: true,
        cellDates: true
      })

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // Parse as 2D array
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '',
        blankrows: false
      })

      setParsedData(data as any[])

      // Generate preview (rows 7 onwards with data)
      const preview = (data as any[]).slice(6, 16).filter(row => 
        row[4] && row[4].toString().trim()
      )
      setPreviewData(preview)

      toast({
        title: 'File loaded',
        description: `Parsed ${preview.length} valid KPI entries`,
      })

    } catch (error: any) {
      console.error('Failed to parse Excel:', error)
      toast({
        title: 'Parse error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (!file || parsedData.length === 0) {
      toast({
        title: 'No file selected',
        description: 'Please select a valid Excel file',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)

    try {
      const res = await fetch('/api/kpi-library/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          excelData: parsedData
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Upload successful',
          description: data.message,
        })
        
        // Reset form
        setFile(null)
        setParsedData([])
        setPreviewData([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // Refresh uploads list
        fetchUploads()
        fetchStatistics()
      } else {
        throw new Error(data.error)
      }

    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle approve/reject upload
  const handleReviewUpload = async (action: string | null) => {
    if (!selectedUpload || !action) return

    try {
      const endpoint = action === 'approve' 
        ? `/api/kpi-library/uploads/${selectedUpload.id}/approve`
        : `/api/kpi-library/uploads/${selectedUpload.id}/reject`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [action === 'approve' ? 'comment' : 'reason']: reviewComment
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: `Upload ${action}d`,
          description: data.message,
        })

        setReviewDialog(null)
        setSelectedUpload(null)
        setReviewComment('')
        fetchUploads()
        fetchStatistics()
      } else {
        throw new Error(data.error)
      }

    } catch (error: any) {
      toast({
        title: `Failed to ${action}`,
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Handle approve/reject change request
  const handleReviewChangeRequest = async (action: string | null) => {
    if (!selectedRequest || !action) return

    try {
      const endpoint = action === 'approve'
        ? `/api/kpi-library/change-requests/${selectedRequest.id}/approve`
        : `/api/kpi-library/change-requests/${selectedRequest.id}/reject`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [action === 'approve' ? 'comment' : 'reason']: reviewComment
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: `Change request ${action}d`,
          description: data.message,
        })

        setReviewDialog(null)
        setSelectedRequest(null)
        setReviewComment('')
        fetchChangeRequests()
        fetchStatistics()
      } else {
        throw new Error(data.error)
      }

    } catch (error: any) {
      toast({
        title: `Failed to ${action}`,
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchUploads()
    fetchChangeRequests()
    fetchStatistics()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KPI Library Management</h1>
          <p className="text-gray-600 mt-1">
            Manage KPI templates, review uploads, and handle change requests
          </p>
        </div>
        {statistics && (
          <Card className="w-64">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Entries:</span>
                  <span className="font-semibold">{statistics.activeEntries}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending Uploads:</span>
                  <span className="font-semibold text-orange-600">
                    {statistics.pendingUploads}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending Requests:</span>
                  <span className="font-semibold text-orange-600">
                    {statistics.pendingChangeRequests}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Library
          </TabsTrigger>
          <TabsTrigger value="uploads" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Upload History
            {statistics?.pendingUploads > 0 && (
              <Badge variant="destructive" className="ml-2">
                {statistics.pendingUploads}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Change Requests
            {statistics?.pendingChangeRequests > 0 && (
              <Badge variant="destructive" className="ml-2">
                {statistics.pendingChangeRequests}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload KPI Library</CardTitle>
              <CardDescription>
                Upload an Excel file containing KPI templates. The file must follow the standard format
                with columns: STT, OGSM Target, Department, Job Title, KPI Name, KPI Type, Unit, 
                Data Source, Yearly Target, Quarterly Target.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Excel File</Label>
                <div className="flex gap-2">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Browse
                  </Button>
                </div>
              </div>

              {file && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null)
                        setParsedData([])
                        setPreviewData([])
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {previewData.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview (First 10 entries)</Label>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">STT</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Job Title</TableHead>
                            <TableHead className="min-w-[300px]">KPI Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Unit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{row[0]}</TableCell>
                              <TableCell>{row[2]}</TableCell>
                              <TableCell>{row[3]}</TableCell>
                              <TableCell className="text-sm">{row[4]}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{row[5]}</Badge>
                              </TableCell>
                              <TableCell>{row[6]}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Total valid entries found: {previewData.length}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!file || previewData.length === 0 || isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload for Approval
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Download template
                    window.open('/templates/KPI_Library_Template.xlsx', '_blank')
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Upload Instructions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Select Excel file with KPI library data</li>
                      <li>Review preview before uploading</li>
                      <li>BOD will review and approve before activation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload History Tab */}
        <TabsContent value="uploads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>
                Review and approve/reject uploaded KPI library files
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploads.length === 0 ? (
                <div className="text-center py-12">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No uploads yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileSpreadsheet className="h-5 w-5 text-gray-600" />
                            <h4 className="font-medium text-gray-900">
                              {upload.fileName}
                            </h4>
                            <Badge
                              variant={
                                upload.status === 'APPROVED' ? 'default' :
                                upload.status === 'REJECTED' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {upload.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Uploaded by:</span> {upload.uploadedBy}
                            </div>
                            <div>
                              <span className="font-medium">Date:</span>{' '}
                              {new Date(upload.uploadedAt).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Total Entries:</span> {upload.totalEntries}
                            </div>
                            {upload.approvedBy && (
                              <div>
                                <span className="font-medium">Reviewed by:</span> {upload.approvedBy}
                              </div>
                            )}
                          </div>
                          {upload.rejectionReason && (
                            <div className="mt-2 text-sm text-red-600">
                              <span className="font-medium">Rejection reason:</span> {upload.rejectionReason}
                            </div>
                          )}
                        </div>
                        {upload.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedUpload(upload)
                                setReviewDialog('approve')
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedUpload(upload)
                                setReviewDialog('reject')
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Requests</CardTitle>
              <CardDescription>
                Review and approve/reject KPI library change requests from departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changeRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No change requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge
                              variant={
                                request.requestType === 'ADD' ? 'default' :
                                request.requestType === 'EDIT' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {request.requestType}
                            </Badge>
                            <h4 className="font-medium text-gray-900">
                              {request.proposedEntry.kpiName || 'KPI Change Request'}
                            </h4>
                            <Badge
                              variant={
                                request.status === 'APPROVED' ? 'default' :
                                request.status === 'REJECTED' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {request.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <span className="font-medium">Department:</span> {request.department}
                            </div>
                            <div>
                              <span className="font-medium">Requested by:</span> {request.requestedBy}
                            </div>
                            <div>
                              <span className="font-medium">Date:</span>{' '}
                              {new Date(request.requestedAt).toLocaleDateString()}
                            </div>
                            {request.reviewedBy && (
                              <div>
                                <span className="font-medium">Reviewed by:</span> {request.reviewedBy}
                              </div>
                            )}
                          </div>

                          <div className="rounded-lg bg-gray-50 p-3 mb-2">
                            <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                            <p className="text-sm text-gray-600">{request.reason}</p>
                          </div>

                          {request.requestType === 'EDIT' && request.currentEntry && (
                            <div className="rounded-lg bg-blue-50 p-3 mb-2">
                              <p className="text-sm font-medium text-blue-900 mb-2">Changes:</p>
                              <div className="space-y-1 text-sm">
                                {request.proposedEntry.kpiName !== request.currentEntry.kpiName && (
                                  <div>
                                    <span className="text-gray-600">KPI Name: </span>
                                    <span className="line-through text-red-600">
                                      {request.currentEntry.kpiName}
                                    </span>
                                    {' → '}
                                    <span className="text-green-600">
                                      {request.proposedEntry.kpiName}
                                    </span>
                                  </div>
                                )}
                                {request.proposedEntry.unit !== request.currentEntry.unit && (
                                  <div>
                                    <span className="text-gray-600">Unit: </span>
                                    <span className="line-through text-red-600">
                                      {request.currentEntry.unit}
                                    </span>
                                    {' → '}
                                    <span className="text-green-600">
                                      {request.proposedEntry.unit}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {request.reviewComment && (
                            <div className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Review comment:</span> {request.reviewComment}
                            </div>
                          )}
                        </div>

                        {request.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedRequest(request)
                                setReviewDialog('approve')
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request)
                                setReviewDialog('reject')
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog 
        open={reviewDialog !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setReviewDialog(null)
            setSelectedUpload(null)
            setSelectedRequest(null)
            setReviewComment('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog === 'approve' ? 'Approve' : 'Reject'}{' '}
              {selectedUpload ? 'Upload' : 'Change Request'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog === 'approve'
                ? 'Provide an optional comment for approval'
                : 'Please provide a reason for rejection'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedUpload && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-700">File:</p>
                <p className="text-sm text-gray-900">{selectedUpload.fileName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedUpload.totalEntries} entries
                </p>
              </div>
            )}

            {selectedRequest && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-700">Request:</p>
                <p className="text-sm text-gray-900">
                  {selectedRequest.requestType} - {selectedRequest.proposedEntry.kpiName}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Department: {selectedRequest.department}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="review-comment">
                {reviewDialog === 'approve' ? 'Comment (Optional)' : 'Reason (Required)'}
              </Label>
              <Textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={
                  reviewDialog === 'approve'
                    ? 'Add any notes or comments...'
                    : 'Explain why this is being rejected...'
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialog(null)
                setSelectedUpload(null)
                setSelectedRequest(null)
                setReviewComment('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant={reviewDialog === 'approve' ? 'default' : 'destructive'}
              onClick={() => {
                if (reviewDialog === 'reject' && !reviewComment.trim()) {
                  toast({
                    title: 'Reason required',
                    description: 'Please provide a reason for rejection',
                    variant: 'destructive'
                  })
                  return
                }

                if (selectedUpload) {
                  handleReviewUpload(reviewDialog)
                } else if (selectedRequest) {
                  handleReviewChangeRequest(reviewDialog)
                }
              }}
            >
              {reviewDialog === 'approve' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}