"use client"

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { authenticatedFetch } from '@/lib/api-client'
import { AppLayout } from '@/components/layout/app-layout'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  TrendingUp,
  Library,
  FolderOpen,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Database,
  Trash2,
  FileImage,
  File,
  ClipboardCheck,
  BookOpen
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type {
  KpiLibraryEntry,
  KpiLibraryUpload,
  KpiLibraryChangeRequest,
  KpiResource,
  KpiResourceCategory
} from '@/lib/types'

export default function KpiLibraryPage() {
  const [activeTab, setActiveTab] = useState('manual-templates')

  // Manual Templates state
  const [templates, setTemplates] = useState<any[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([])
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null)
  const [templateForm, setTemplateForm] = useState({
    kpiName: '',
    description: '',
    category: 'OPERATIONAL',
    department: '',
    formula: '',
    unit: '',
    target: '',
    weight: 5
  })
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL')
  const [templateSortBy, setTemplateSortBy] = useState('name')

  // Bulk Upload state
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploads, setUploads] = useState<KpiLibraryUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Resources state
  const [resourceFile, setResourceFile] = useState<File | null>(null)
  const [resourceTitle, setResourceTitle] = useState('')
  const [resourceDescription, setResourceDescription] = useState('')
  const [resourceCategory, setResourceCategory] = useState<KpiResourceCategory>('TEMPLATE')
  const [resourceDepartment, setResourceDepartment] = useState('')
  const [resourceTags, setResourceTags] = useState('')
  const [resources, setResources] = useState<KpiResource[]>([])
  const [filteredResources, setFilteredResources] = useState<KpiResource[]>([])
  const [isUploadingResource, setIsUploadingResource] = useState(false)
  const resourceFileInputRef = useRef<HTMLInputElement>(null)
  const [resourceSearch, setResourceSearch] = useState('')
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState('ALL')
  const [showBIDashboardDialog, setShowBIDashboardDialog] = useState(false)
  const [biDashboardForm, setBiDashboardForm] = useState({
    title: '',
    description: '',
    dashboardType: 'POWER_BI',
    dashboardUrl: '',
    workspaceId: '',
    reportId: '',
    department: '',
    tags: ''
  })

  // Review dialogs
  const [selectedUpload, setSelectedUpload] = useState<KpiLibraryUpload | null>(null)
  const [selectedResource, setSelectedResource] = useState<KpiResource | null>(null)
  const [reviewDialog, setReviewDialog] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  // Statistics
  const [statistics, setStatistics] = useState<any>(null)
  const [resourceStatistics, setResourceStatistics] = useState<any>(null)

  const { toast } = useToast()

  // ==================== MANUAL TEMPLATES FUNCTIONS ====================

  const fetchTemplates = async () => {
    try {
      const res = await authenticatedFetch('/api/kpi-templates')
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data)
        setFilteredTemplates(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  // Filter and sort templates
  useEffect(() => {
    let result = [...templates]

    // Search filter
    if (templateSearch) {
      result = result.filter(t =>
        t.kpiName?.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.description?.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.department?.toLowerCase().includes(templateSearch.toLowerCase())
      )
    }

    // Category filter
    if (templateCategoryFilter !== 'ALL') {
      result = result.filter(t => t.category === templateCategoryFilter)
    }

    // Sort
    result.sort((a, b) => {
      switch (templateSortBy) {
        case 'name':
          return (a.kpiName || '').localeCompare(b.kpiName || '')
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0)
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    setFilteredTemplates(result)
  }, [templates, templateSearch, templateCategoryFilter, templateSortBy])

  const handleCreateTemplate = async () => {
    if (!templateForm.kpiName || !templateForm.category) {
      toast({
        title: 'Missing information',
        description: 'Please fill in required fields',
        variant: 'destructive'
      })
      return
    }

    try {
      const method = editingTemplate ? 'PUT' : 'POST'
      const url = editingTemplate
        ? `/api/kpi-templates/${editingTemplate.id}`
        : '/api/kpi-templates'

      const res = await authenticatedFetch(url, {
        method,
        body: JSON.stringify({
          name: templateForm.kpiName, // Map kpiName to name
          description: templateForm.description,
          category: templateForm.category,
          department: templateForm.department,
          kpiType: 'KPI', // Default to KPI as it is required by server
          formula: templateForm.formula,
          unit: templateForm.unit,
          targetValue: templateForm.target, // Map target to targetValue
          weight: templateForm.weight,
          source: 'MANUAL',
          status: editingTemplate ? editingTemplate.status : 'DRAFT',
          createdBy: 'admin-user-id' // Replace with actual user ID
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: editingTemplate ? 'Template updated' : 'Template created',
          description: editingTemplate
            ? 'KPI template has been updated successfully'
            : 'KPI template has been created successfully',
        })

        setShowTemplateDialog(false)
        setEditingTemplate(null)
        setTemplateForm({
          kpiName: '',
          description: '',
          category: 'OPERATIONAL',
          department: '',
          formula: '',
          unit: '',
          target: '',
          weight: 5
        })
        fetchTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: editingTemplate ? 'Failed to update' : 'Failed to create template',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleToggleTemplateStatus = async (id: string, currentStatus: string) => {
    try {
      // Toggle between DRAFT and ACTIVE
      // If DRAFT -> ACTIVE (Publish)
      // If ACTIVE -> DRAFT (Deactivate/Unpublish)
      const newStatus = currentStatus === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'

      const res = await authenticatedFetch(`/api/kpi-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: newStatus === 'ACTIVE' ? 'Template Published' : 'Template Deactivated',
          description: `Template has been ${newStatus === 'ACTIVE' ? 'published' : 'deactivated'} successfully`,
        })
        fetchTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/kpi-templates/${id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Template deleted',
          description: 'Template has been deleted successfully',
        })
        fetchTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Failed to delete',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleExportTemplates = () => {
    try {
      const exportData = filteredTemplates.map(t => ({
        'KPI Name': t.kpiName,
        'Description': t.description || '',
        'Category': t.category,
        'Department': t.department || '',
        'Unit': t.unit || '',
        'Weight (%)': t.weight || '',
        'Formula': t.formula || '',
        'Target': t.target || '',
        'Status': t.status,
        'Usage Count': t.usageCount || 0
      }))

      // Convert to CSV
      const headers = Object.keys(exportData[0] || {})
      const csv = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
        )
      ].join('\n')

      // Download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kpi-templates-${new Date().toISOString().split('T')[0]}.csv`
      a.click()

      toast({
        title: 'Export successful',
        description: `Exported ${filteredTemplates.length} templates`,
      })
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // ==================== BULK UPLOAD FUNCTIONS ====================

  const fetchUploads = async () => {
    try {
      const res = await authenticatedFetch('/api/kpi-library/uploads')
      const data = await res.json()
      if (data.success) {
        setUploads(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error)
    }
  }

  const fetchStatistics = async () => {
    try {
      const res = await authenticatedFetch('/api/kpi-library/statistics')
      const data = await res.json()
      if (data.success) {
        setStatistics(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

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
      const arrayBuffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, {
        cellStyles: true,
        cellDates: true
      })

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      }) as any[][]

      // Sanitize raw data
      const sanitizedData = rawData.map(row =>
        Array.isArray(row) ? row.map(cell =>
          cell instanceof Date ? cell.toISOString().split('T')[0] : cell
        ) : row
      )

      let finalData = sanitizedData
      let isLegacyForm = false

      // Check if this is a Legacy KPI Form (Target Setting)
      // Look for "Target or KPI" header
      let headerRowIndex = -1
      let department = ''
      let jobTitle = ''

      // Attempt to find metadata in first 100 rows
      for (let i = 0; i < Math.min(100, sanitizedData.length); i++) {
        const row = sanitizedData[i]
        if (!Array.isArray(row)) continue

        const rowStr = row.join(' ').toLowerCase()

        // Search for Department
        if (!department) {
          const deptIdx = row.findIndex(cell => cell?.toString().toLowerCase().includes('department'))
          if (deptIdx !== -1 && row[deptIdx + 1]) {
            department = row[deptIdx + 1].toString().trim()
          }
        }

        // Search for Job Title
        if (!jobTitle) {
          const jobTitleIdx = row.findIndex(cell => cell?.toString().toLowerCase().includes('job title'))
          if (jobTitleIdx !== -1 && row[jobTitleIdx + 1]) {
            jobTitle = row[jobTitleIdx + 1].toString().trim()
          }
        }

        // Search for Header
        // The header row typically contains: "Main KPI", "Weight", "Unit", "Target"
        const hasWeight = row.some(c => c?.toString().toLowerCase().includes('weight'))
        const hasUnit = row.some(c => c?.toString().toLowerCase().includes('unit'))
        const hasTarget = row.some(c => c?.toString().toLowerCase().includes('target'))
        const hasKPI = row.some(c => c?.toString().toLowerCase().includes('kpi'))

        // Robust check: needs at least 2 strong signals
        if ((hasWeight && hasUnit) || (hasTarget && hasKPI)) {
          headerRowIndex = i
          isLegacyForm = true
          break
        }
      }

      if (isLegacyForm && headerRowIndex !== -1) {
        console.log('Detected Legacy Token Format. Header at row:', headerRowIndex)
        // Transform Legacy Data to Standard Format
        // Standard Format expected by backend (indices):
        // 2: Department, 4: KPI Name, 5: KPI Type
        // We will construct: [STT, '', Dept, Job, Name, Type, Unit]

        const transformedData: any[] = []
        // Add 6 dummy rows for backend slice(6)
        for (let i = 0; i < 6; i++) transformedData.push([])

        const headerRow = sanitizedData[headerRowIndex] as any[]

        // Find indices dynamically with relaxed matching
        let nameIdx = headerRow.findIndex(c => {
          const s = c?.toString().toLowerCase().trim()
          return s === 'target or kpi' || s === 'main kpi' || (s?.includes('kpi') && !s?.includes('weight') && !s?.includes('type') && !s?.includes('sub'))
        })

        // Fallback for specific known format
        if (nameIdx === -1) nameIdx = 2; // Default for this template if not found

        const typeIdx = headerRow.findIndex(c => c?.toString().toLowerCase().includes('kpi type'))
        const unitIdx = headerRow.findIndex(c => c?.toString().toLowerCase() === 'unit')

        if (nameIdx !== -1) {
          // Iterate data rows
          for (let i = headerRowIndex + 1; i < sanitizedData.length; i++) {
            const row = sanitizedData[i]
            if (!Array.isArray(row)) continue

            // SKIP SECTION HEADERS
            const distinctContentCount = row.filter(c => c && c.toString().trim().length > 0).length
            if (distinctContentCount <= 2) continue

            const kpiName = row[nameIdx]?.toString().trim()
            if (!kpiName || kpiName.length < 3) continue

            // Filter out section headers (which usually don't have weight or type populated)
            // Or simple check: Section headers often start with a number but are long text

            const kpiType = typeIdx !== -1 ? row[typeIdx]?.toString().trim() : ''
            const unit = unitIdx !== -1 ? row[unitIdx]?.toString().trim() : ''

            // Validate KPI Type if present (should be I, II, III, IV)
            // If missing but row looks valid, we might default or skip. 
            // For now, include it.

            transformedData.push([
              transformedData.length - 5, // STT (1-based)
              '',
              department,
              jobTitle,
              kpiName,
              kpiType,
              unit
            ])
          }
          finalData = transformedData
        }
      } else {
        // Standard Format Support (Auto-detect)
        console.log('Detected Standard Format. Attempting normalization...')
        const normalizedData: any[] = []

        // Add 6 dummy rows for backend compatibility (backend skips first 6 rows)
        for (let i = 0; i < 6; i++) normalizedData.push([])

        // Find Header Row (Scan first 20 rows)
        let headerIdx = -1
        for (let i = 0; i < Math.min(20, sanitizedData.length); i++) {
          const row = sanitizedData[i] as any[]
          if (!Array.isArray(row)) continue

          const rowStr = row.map(c => c?.toString().toLowerCase() || '').join(' ')
          // Robust header detection
          if ((rowStr.includes('kpi') && rowStr.includes('name')) ||
            (rowStr.includes('tên') && rowStr.includes('kpi')) ||
            rowStr.includes('kpi name') ||
            (rowStr.includes('department') && rowStr.includes('role'))) {
            headerIdx = i
            break
          }
        }

        // If no header found, assume standard list starts at row 0 (Header) -> Data at 1
        if (headerIdx === -1 && sanitizedData.length > 0) {
          headerIdx = 0
        }

        if (headerIdx !== -1) {
          const headerRow = sanitizedData[headerIdx] as any[]

          // Map Columns with flexible matching
          const findCol = (keywords: string[]) => headerRow.findIndex(c => {
            const val = c?.toString().toLowerCase().trim() || ''
            return keywords.some(k => val.includes(k) || val === k)
          })

          const idxName = findCol(['kpi name', 'tên kpi', 'kpi', 'chỉ số', 'name'])
          const idxDept = findCol(['department', 'phòng ban', 'bộ phận', 'khối'])
          const idxJob = findCol(['job', 'position', 'chức danh', 'vị trí'])
          const idxType = findCol(['type', 'loại', 'phân loại'])
          const idxUnit = findCol(['unit', 'đơn vị', 'dvt'])
          const idxSource = findCol(['source', 'nguồn'])

          // Require at least a Name or Department column to proceed with mapping
          if (idxName !== -1 || idxDept !== -1) {
            let stt = 1
            for (let i = headerIdx + 1; i < sanitizedData.length; i++) {
              const row = sanitizedData[i] as any[]
              if (!Array.isArray(row)) continue

              // Skip empty rows
              if (row.every(c => !c || c.toString().trim() === '')) continue

              const name = idxName !== -1 ? row[idxName]?.toString().trim() : ''

              // If there is data but name is empty, we act carefully.
              // But let's assume valid rows have names.
              if (!name && idxName !== -1) continue

              normalizedData.push([
                stt++,                                  // 0: STT
                '',                                     // 1: OGSM
                idxDept !== -1 ? row[idxDept] : '',     // 2: Department
                idxJob !== -1 ? row[idxJob] : '',       // 3: Job Title
                name || 'Untitled KPI',                 // 4: KPI Name
                idxType !== -1 ? row[idxType] : 'I',    // 5: KPI Type
                idxUnit !== -1 ? row[idxUnit] : '',     // 6: Unit
                idxSource !== -1 ? row[idxSource] : ''  // 7: Source
              ])
            }
            finalData = normalizedData
            console.log(`Normalized ${finalData.length - 6} entries from standard format.`)

            toast({
              title: 'Format Detected',
              description: `Successfully mapped columns and loaded ${finalData.length - 6} entries.`,
            })
          }
        }
      }

      setParsedData(finalData)

      // Generate Preview
      // Skip the first 6 rows (dummy or header)
      const previewSource = finalData.slice(6)
      const preview = previewSource.slice(0, 10) // Show first 10

      setPreviewData(preview)

      toast({
        title: isLegacyForm ? 'Legacy Form Detected' : 'File loaded',
        description: `Parsed ${previewSource.length} valid KPI entries${isLegacyForm ? ' from form format' : ''}`,
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
      const res = await authenticatedFetch('/api/kpi-library/upload', {
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

        setFile(null)
        setParsedData([])
        setPreviewData([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

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

  const handleReviewUpload = async (action: string | null) => {
    if (!selectedUpload || !action) return

    try {
      const endpoint = action === 'approve'
        ? `/api/kpi-library/uploads/${selectedUpload.id}/approve`
        : `/api/kpi-library/uploads/${selectedUpload.id}/reject`

      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
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

  // ==================== RESOURCES FUNCTIONS ====================

  const fetchResources = async () => {
    try {
      const res = await authenticatedFetch('/api/kpi-resources')
      const data = await res.json()
      if (data.success) {
        setResources(data.data)
        setFilteredResources(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error)
    }
  }

  // Filter resources
  useEffect(() => {
    let result = [...resources]

    // Search filter
    if (resourceSearch) {
      result = result.filter(r =>
        r.title?.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.description?.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.fileName?.toLowerCase().includes(resourceSearch.toLowerCase())
      )
    }

    // Category filter
    if (resourceCategoryFilter !== 'ALL') {
      result = result.filter(r => r.category === resourceCategoryFilter)
    }

    setFilteredResources(result)
  }, [resources, resourceSearch, resourceCategoryFilter])

  const fetchResourceStatistics = async () => {
    try {
      const res = await authenticatedFetch('/api/kpi-resources/statistics')
      const data = await res.json()
      if (data.success) {
        setResourceStatistics(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch resource statistics:', error)
    }
  }

  const handleResourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 50MB',
        variant: 'destructive'
      })
      return
    }

    setResourceFile(selectedFile)
  }

  const handleResourceUpload = async () => {
    if (!resourceFile || !resourceTitle || !resourceCategory) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setIsUploadingResource(true)

    try {
      const formData = new FormData()
      formData.append('file', resourceFile)
      formData.append('title', resourceTitle)
      formData.append('description', resourceDescription)
      formData.append('category', resourceCategory)
      formData.append('department', resourceDepartment)
      formData.append('tags', JSON.stringify(resourceTags.split(',').map(t => t.trim()).filter(t => t)))
      formData.append('isPublic', 'true')
      formData.append('uploadedBy', 'admin-user-id') // Replace with actual user ID

      const res = await authenticatedFetch('/api/kpi-resources', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Resource uploaded',
          description: 'Resource has been uploaded successfully',
        })

        // Reset form
        setResourceFile(null)
        setResourceTitle('')
        setResourceDescription('')
        setResourceCategory('TEMPLATE')
        setResourceDepartment('')
        setResourceTags('')
        if (resourceFileInputRef.current) {
          resourceFileInputRef.current.value = ''
        }

        fetchResources()
        fetchResourceStatistics()
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
      setIsUploadingResource(false)
    }
  }

  const handleReviewResource = async (action: string | null) => {
    if (!selectedResource || !action) return

    try {
      const endpoint = action === 'approve'
        ? `/api/kpi-resources/${selectedResource.id}/approve`
        : `/api/kpi-resources/${selectedResource.id}/reject`

      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          approvedBy: 'admin-user-id', // Replace with actual user ID
          [action === 'approve' ? 'comment' : 'reason']: reviewComment
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: `Resource ${action}d`,
          description: data.message,
        })

        setReviewDialog(null)
        setSelectedResource(null)
        setReviewComment('')
        fetchResources()
        fetchResourceStatistics()
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

  const handleBIDashboardSubmit = async () => {
    if (!biDashboardForm.title || !biDashboardForm.dashboardUrl) {
      toast({
        title: 'Missing information',
        description: 'Please fill in title and dashboard URL',
        variant: 'destructive'
      })
      return
    }

    try {
      const res = await authenticatedFetch('/api/kpi-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: 'BI_DASHBOARD',
          title: biDashboardForm.title,
          description: biDashboardForm.description,
          category: 'REPORT',
          department: biDashboardForm.department,
          tags: biDashboardForm.tags.split(',').map(t => t.trim()).filter(t => t),
          dashboardType: biDashboardForm.dashboardType,
          dashboardUrl: biDashboardForm.dashboardUrl,
          workspaceId: biDashboardForm.workspaceId,
          reportId: biDashboardForm.reportId,
          uploadedBy: 'admin-user-id', // Replace with actual user ID
          isPublic: true,
          approvalStatus: 'PENDING'
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'BI Dashboard added',
          description: 'Dashboard has been submitted for approval',
        })

        setShowBIDashboardDialog(false)
        setBiDashboardForm({
          title: '',
          description: '',
          dashboardType: 'POWER_BI',
          dashboardUrl: '',
          workspaceId: '',
          reportId: '',
          department: '',
          tags: ''
        })
        fetchResources()
        fetchResourceStatistics()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Failed to add dashboard',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleDownloadResource = async (resource: KpiResource) => {
    try {
      const res = await authenticatedFetch(`/api/kpi-resources/${resource.id}/download`)
      const data = await res.json()

      if (data.success) {
        // Trigger download
        const link = document.createElement('a')
        link.href = data.data.storageUrl
        link.download = data.data.fileName
        link.click()

        toast({
          title: 'Download started',
          description: `Downloading ${resource.fileName}`,
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const getFileIcon = (resourceOrType: KpiResource | string) => {
    // Handle string input (just file type)
    if (typeof resourceOrType === 'string') {
      const fileType = resourceOrType.toLowerCase()
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileType)) {
        return <FileImage className="h-5 w-5 text-blue-600" />
      }
      if (['pdf'].includes(fileType)) {
        return <FileText className="h-5 w-5 text-red-600" />
      }
      if (['xlsx', 'xls', 'csv'].includes(fileType)) {
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />
      }
      return <File className="h-5 w-5 text-gray-600" />
    }

    // Handle KpiResource object
    const resource = resourceOrType

    // Check if it's a BI Dashboard
    if (resource.resourceType === 'BI_DASHBOARD') {
      return <TrendingUp className="h-5 w-5 text-purple-600" />
    }

    // For regular files, check file type
    const fileType = resource.fileType?.toLowerCase() || ''
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileType)) {
      return <FileImage className="h-5 w-5 text-blue-600" />
    }
    if (['pdf'].includes(fileType)) {
      return <FileText className="h-5 w-5 text-red-600" />
    }
    if (['xlsx', 'xls', 'csv'].includes(fileType)) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    }
    return <File className="h-5 w-5 text-gray-600" />
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      'TEMPLATE': 'bg-blue-100 text-blue-800',
      'GUIDE': 'bg-green-100 text-green-800',
      'REPORT': 'bg-purple-100 text-purple-800',
      'EXAMPLE': 'bg-orange-100 text-orange-800',
      'OTHER': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors['OTHER']
  }

  // Load data on mount
  useEffect(() => {
    fetchTemplates()
    fetchUploads()
    fetchStatistics()
    fetchResources()
    fetchResourceStatistics()
  }, [])

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KPI Library Management</h1>
            <p className="text-gray-600 mt-1">
              Manage KPI templates and reference documents
            </p>
          </div>
          <div className="flex gap-4">
            {statistics && (
              <Card className="w-64">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">KPI Templates</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active:</span>
                      <span className="font-semibold">{statistics.activeEntries}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-semibold text-orange-600">
                        {statistics.pendingUploads}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {resourceStatistics && (
              <Card className="w-64">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Resources</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active:</span>
                      <span className="font-semibold">{resourceStatistics.active}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-semibold text-orange-600">
                        {resourceStatistics.pending}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual-templates" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Standard Templates
            </TabsTrigger>
            <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk Upload
              {statistics?.pendingUploads > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {statistics.pendingUploads}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Reference Documents
              {resourceStatistics?.pending > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {resourceStatistics.pending}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ==================== MANUAL TEMPLATES TAB ==================== */}
          <TabsContent value="manual-templates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Standard KPI Templates</CardTitle>
                    <CardDescription>
                      Create and manage standardized KPI templates for employee use
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingTemplate(null)
                    setShowTemplateDialog(true)
                  }}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <Input
                        placeholder="Search templates..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                      />
                    </div>
                    <div>
                      <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Categories</SelectItem>
                          <SelectItem value="OPERATIONAL">Operational</SelectItem>
                          <SelectItem value="FINANCIAL">Financial</SelectItem>
                          <SelectItem value="CUSTOMER">Customer</SelectItem>
                          <SelectItem value="LEARNING">Learning & Growth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select value={templateSortBy} onValueChange={setTemplateSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name A-Z</SelectItem>
                          <SelectItem value="usage">Most Used</SelectItem>
                          <SelectItem value="date">Newest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTemplateSearch('')
                        setTemplateCategoryFilter('ALL')
                        setTemplateSortBy('name')
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportTemplates}
                      disabled={filteredTemplates.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Results count */}
                {templates.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Showing {filteredTemplates.length} of {templates.length} templates
                  </div>
                )}

                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No templates created yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowTemplateDialog(true)}
                    >
                      Create First Template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {template.kpiName}
                              </h4>
                              <Badge variant="outline">{template.category}</Badge>
                              <Badge
                                variant={
                                  template.status === 'APPROVED' ? 'default' :
                                    template.status === 'REJECTED' ? 'destructive' :
                                      'secondary'
                                }
                              >
                                {template.status}
                              </Badge>
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {template.description}
                              </p>
                            )}
                            <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                              {template.department && (
                                <div>
                                  <span className="font-medium">Department:</span> {template.department}
                                </div>
                              )}
                              {template.unit && (
                                <div>
                                  <span className="font-medium">Unit:</span> {template.unit}
                                </div>
                              )}
                              {template.weight && (
                                <div>
                                  <span className="font-medium">Weight:</span> {template.weight}%
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Usage:</span> {template.usageCount || 0} times
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTemplate(template)
                                setTemplateForm({
                                  kpiName: template.kpiName,
                                  description: template.description || '',
                                  category: template.category,
                                  department: template.department || '',
                                  formula: template.formula || '',
                                  unit: template.unit || '',
                                  target: template.target || '',
                                  weight: template.weight || 5
                                })
                                setShowTemplateDialog(true)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTemplateForm({
                                  kpiName: template.kpiName + ' (Copy)',
                                  description: template.description || '',
                                  category: template.category,
                                  department: template.department || '',
                                  formula: template.formula || '',
                                  unit: template.unit || '',
                                  target: template.target || '',
                                  weight: template.weight || 5
                                })
                                setEditingTemplate(null)
                                setShowTemplateDialog(true)
                              }}
                            >
                              Clone
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              variant={template.status === 'ACTIVE' ? "default" : "secondary"}
                              className={template.status === 'ACTIVE' ? "bg-green-600 hover:bg-green-700" : ""}
                              onClick={() => handleToggleTemplateStatus(template.id, template.status)}
                            >
                              {template.status === 'ACTIVE' ? 'Active' : 'Publish'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== BULK UPLOAD TAB ==================== */}
          <TabsContent value="bulk-upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import Legacy Data</CardTitle>
                <CardDescription>
                  Upload Excel files containing historical KPI data or bulk template definitions.
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
                        Upload Templates
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload History */}
            <Card>
              <CardHeader>
                <CardTitle>Upload History</CardTitle>
                <CardDescription>
                  Review and approve/reject uploaded template files
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
                                <span className="font-medium">Date:</span>{' '}
                                {new Date(upload.uploadedAt).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">Total Entries:</span> {upload.totalEntries}
                              </div>
                            </div>
                          </div>
                          {upload.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedUpload(upload)
                                  setReviewDialog('approve')
                                }}
                              >
                                <Database className="mr-2 h-4 w-4" />
                                Import to Library
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedUpload(upload)
                                  setReviewDialog('reject')
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Cancel Upload
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

          {/* ==================== RESOURCE DOCUMENTS TAB ==================== */}
          <TabsContent value="resources" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Reference Documents (AI Knowledge Base)</CardTitle>
                    <CardDescription>
                      Upload policy documents, guides, and reports. These will be indexed by AI for Smart Suggestions.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowBIDashboardDialog(true)} variant="outline">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Add BI Dashboard
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resource-title">Title *</Label>
                    <Input
                      id="resource-title"
                      value={resourceTitle}
                      onChange={(e) => setResourceTitle(e.target.value)}
                      placeholder="e.g., KPI Guidelines 2024"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resource-category">Category *</Label>
                    <Select value={resourceCategory} onValueChange={(v) => setResourceCategory(v as KpiResourceCategory)}>
                      <SelectTrigger id="resource-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEMPLATE">Template</SelectItem>
                        <SelectItem value="GUIDE">Guide/Tutorial</SelectItem>
                        <SelectItem value="REPORT">Report</SelectItem>
                        <SelectItem value="EXAMPLE">Example</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resource-department">Department</Label>
                    <Input
                      id="resource-department"
                      value={resourceDepartment}
                      onChange={(e) => setResourceDepartment(e.target.value)}
                      placeholder="e.g., HR, Finance"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resource-tags">Tags (comma separated)</Label>
                    <Input
                      id="resource-tags"
                      value={resourceTags}
                      onChange={(e) => setResourceTags(e.target.value)}
                      placeholder="e.g., guide, 2024, important"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resource-description">Description</Label>
                  <Textarea
                    id="resource-description"
                    value={resourceDescription}
                    onChange={(e) => setResourceDescription(e.target.value)}
                    placeholder="Describe the purpose and content of this resource..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resource-file">File * (PDF, Excel, Word, Images - Max 50MB)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="resource-file"
                      type="file"
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                      onChange={handleResourceFileChange}
                      ref={resourceFileInputRef}
                      className="flex-1"
                    />
                  </div>
                </div>

                {resourceFile && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(resourceFile.name.split('.').pop() || '')}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{resourceFile.name}</p>
                        <p className="text-sm text-gray-600">
                          {(resourceFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResourceFile(null)
                          if (resourceFileInputRef.current) {
                            resourceFileInputRef.current.value = ''
                          }
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleResourceUpload}
                  disabled={!resourceFile || !resourceTitle || !resourceCategory || isUploadingResource}
                  className="w-full"
                >
                  {isUploadingResource ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Resource
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Resources List */}
            <Card>
              <CardHeader>
                <CardTitle>Document Library</CardTitle>
                <CardDescription>
                  Manage and review uploaded reference documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Input
                        placeholder="Search resources..."
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                      />
                    </div>
                    <div>
                      <Select value={resourceCategoryFilter} onValueChange={setResourceCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Categories</SelectItem>
                          <SelectItem value="TEMPLATE">Template</SelectItem>
                          <SelectItem value="GUIDE">Guide/Tutorial</SelectItem>
                          <SelectItem value="REPORT">Report</SelectItem>
                          <SelectItem value="EXAMPLE">Example</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResourceSearch('')
                      setResourceCategoryFilter('ALL')
                    }}
                  >
                    Clear
                  </Button>
                </div>

                {/* Results count */}
                {resources.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Showing {filteredResources.length} of {resources.length} resources
                  </div>
                )}

                {filteredResources.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No resources uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {getFileIcon(resource)}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">{resource.title}</h4>
                                {resource.description && (
                                  <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Badge className={getCategoryBadgeColor(resource.category)}>
                                  {resource.category}
                                </Badge>
                                <Badge
                                  variant={
                                    resource.approvalStatus === 'APPROVED' ? 'default' :
                                      resource.approvalStatus === 'REJECTED' ? 'destructive' :
                                        'secondary'
                                  }
                                >
                                  {resource.approvalStatus}
                                </Badge>
                              </div>
                            </div>

                            {resource.resourceType === 'BI_DASHBOARD' ? (
                              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                                <div>
                                  <span className="font-medium">Type:</span> {resource.dashboardType}
                                </div>
                                <div>
                                  <span className="font-medium">Views:</span> {resource.viewCount || 0}
                                </div>
                                <div>
                                  <a
                                    href={resource.dashboardUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Open Dashboard →
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                <div>
                                  <span className="font-medium">File:</span> {resource.fileName}
                                </div>
                                <div>
                                  <span className="font-medium">Size:</span>{' '}
                                  {((resource.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                                </div>
                                <div>
                                  <span className="font-medium">Downloads:</span> {resource.downloadCount || 0}
                                </div>
                                <div>
                                  <span className="font-medium">Views:</span> {resource.viewCount || 0}
                                </div>
                              </div>
                            )}

                            {resource.tags && resource.tags.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {resource.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {resource.approvalStatus === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedResource(resource)
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
                                    setSelectedResource(resource)
                                    setReviewDialog('reject')
                                  }}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {resource.approvalStatus === 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadResource(resource)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Creation/Edit Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit KPI Template' : 'Create KPI Template'}</DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? 'Update the KPI template details below'
                  : 'Create a new KPI template that can be reused across the organization'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="template-kpiName">KPI Name *</Label>
                  <Input
                    id="template-kpiName"
                    value={templateForm.kpiName}
                    onChange={(e) => setTemplateForm({ ...templateForm, kpiName: e.target.value })}
                    placeholder="e.g., Customer Satisfaction Rate"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Describe what this KPI measures..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-category">Category *</Label>
                  <Select value={templateForm.category} onValueChange={(v) => setTemplateForm({ ...templateForm, category: v })}>
                    <SelectTrigger id="template-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATIONAL">Operational</SelectItem>
                      <SelectItem value="FINANCIAL">Financial</SelectItem>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="LEARNING">Learning & Growth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-department">Department</Label>
                  <Input
                    id="template-department"
                    value={templateForm.department}
                    onChange={(e) => setTemplateForm({ ...templateForm, department: e.target.value })}
                    placeholder="e.g., HR, Sales, IT"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-unit">Unit</Label>
                  <Input
                    id="template-unit"
                    value={templateForm.unit}
                    onChange={(e) => setTemplateForm({ ...templateForm, unit: e.target.value })}
                    placeholder="e.g., %, Count, VND"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-weight">Weight (%)</Label>
                  <Input
                    id="template-weight"
                    type="number"
                    min="1"
                    max="100"
                    value={templateForm.weight}
                    onChange={(e) => setTemplateForm({ ...templateForm, weight: parseInt(e.target.value) || 5 })}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="template-formula">Formula/Calculation</Label>
                  <Textarea
                    id="template-formula"
                    value={templateForm.formula}
                    onChange={(e) => setTemplateForm({ ...templateForm, formula: e.target.value })}
                    placeholder="e.g., (Satisfied Customers / Total Customers) * 100"
                    rows={2}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="template-target">Target Value</Label>
                  <Input
                    id="template-target"
                    value={templateForm.target}
                    onChange={(e) => setTemplateForm({ ...templateForm, target: e.target.value })}
                    placeholder="e.g., >= 90%"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTemplateDialog(false)
                  setTemplateForm({
                    kpiName: '',
                    description: '',
                    category: 'OPERATIONAL',
                    department: '',
                    formula: '',
                    unit: '',
                    target: '',
                    weight: 5
                  })
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* BI Dashboard Dialog */}
        <Dialog open={showBIDashboardDialog} onOpenChange={setShowBIDashboardDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add BI Dashboard</DialogTitle>
              <DialogDescription>
                Add a link to a Business Intelligence dashboard (Power BI, Fabric, Tableau, etc.)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="bi-title">Dashboard Title *</Label>
                  <Input
                    id="bi-title"
                    value={biDashboardForm.title}
                    onChange={(e) => setBiDashboardForm({ ...biDashboardForm, title: e.target.value })}
                    placeholder="e.g., Sales Performance Dashboard Q4 2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bi-type">Dashboard Type *</Label>
                  <Select value={biDashboardForm.dashboardType} onValueChange={(v) => setBiDashboardForm({ ...biDashboardForm, dashboardType: v })}>
                    <SelectTrigger id="bi-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POWER_BI">Power BI</SelectItem>
                      <SelectItem value="FABRIC">Microsoft Fabric</SelectItem>
                      <SelectItem value="TABLEAU">Tableau</SelectItem>
                      <SelectItem value="LOOKER">Looker</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bi-department">Department</Label>
                  <Input
                    id="bi-department"
                    value={biDashboardForm.department}
                    onChange={(e) => setBiDashboardForm({ ...biDashboardForm, department: e.target.value })}
                    placeholder="e.g., Sales, Finance"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="bi-url">Dashboard URL *</Label>
                  <Input
                    id="bi-url"
                    value={biDashboardForm.dashboardUrl}
                    onChange={(e) => setBiDashboardForm({ ...biDashboardForm, dashboardUrl: e.target.value })}
                    placeholder="https://app.powerbi.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bi-workspace">Workspace ID (Optional)</Label>
                  <Input
                    id="bi-workspace"
                    value={biDashboardForm.workspaceId}
                    onChange={(e) => setBiDashboardForm({ ...biDashboardForm, workspaceId: e.target.value })}
                    placeholder="For Power BI/Fabric"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bi-report">Report ID (Optional)</Label>
                  <Input
                    id="bi-report"
                    value={biDashboardForm.reportId}
                    onChange={(e) => setBiDashboardForm({ ...biDashboardForm, reportId: e.target.value })}
                    placeholder="For Power BI/Fabric"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="bi-description">Description</Label>
                  <Textarea
                    id="bi-description"
                    value={biDashboardForm.description}
                    onChange={(e) => setBiDashboardForm({ ...biDashboardForm, description: e.target.value })}
                    placeholder="Describe what this dashboard shows..."
                    rows={3}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="bi-tags">Tags (comma separated)</Label>
                  <Input
                    id="bi-tags"
                    value={biDashboardForm.tags}
                    onChange={(e) => setBiDashboardForm({ ...biDashboardForm, tags: e.target.value })}
                    placeholder="e.g., sales, q4, 2024"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBIDashboardDialog(false)
                  setBiDashboardForm({
                    title: '',
                    description: '',
                    dashboardType: 'POWER_BI',
                    dashboardUrl: '',
                    workspaceId: '',
                    reportId: '',
                    department: '',
                    tags: ''
                  })
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleBIDashboardSubmit}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Add Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog
          open={reviewDialog !== null}
          onOpenChange={(open) => {
            if (!open) {
              setReviewDialog(null)
              setSelectedUpload(null)
              setSelectedResource(null)
              setReviewComment('')
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewDialog === 'approve' ? 'Approve' : 'Reject'}{' '}
                {selectedUpload ? 'Template Upload' : 'Resource'}
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

              {selectedResource && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-700">Resource:</p>
                  <p className="text-sm text-gray-900">{selectedResource.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Category: {selectedResource.category}
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
                  setSelectedResource(null)
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
                  } else if (selectedResource) {
                    handleReviewResource(reviewDialog)
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
    </AppLayout>
  )
}
