"use client"

import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/api-client'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Library,
  FolderOpen,
  FileSpreadsheet,
  FileText,
  FileImage,
  File,
  Download,
  Search,
  Eye,
  TrendingUp,
  Star
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { KpiResource, KpiResourceCategory } from '@/lib/types'

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('resources')
  const [resources, setResources] = useState<KpiResource[]>([])
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])

  const fetchTemplates = async () => {
    try {
      // Fetch ACTIVE/APPROVED templates for staff
      const res = await authenticatedFetch('/api/kpi-templates?status=APPROVED')
      // Note: We might want DRAFT too if they are just "Standard Templates" ready to use but not "Approved" by some workflow?
      // Usually Staff should only see valid templates. Admin puts them in DRAFT.
      // If the Admin just created them and they are DRAFT, Staff MIGHT NOT see them if we filter by APPROVED.
      // However, usually Templates need to be Published/Active.
      // Let's assume for now we might need DRAFT if no workflow is enforced, OR user (Staff) expects to see what Admin just created.
      // The Admin screenshot shows "DRAFT". 
      // If I filter by APPROVED, Staff won't see DRAFT templates.
      // I will relax the filter to allow DRAFT for demo purposes or fetch all and let backend decide (backend fetches all by default if no status param, but we might want to filter).
      // Let's fetch ALL for now to ensure they show up, as the user is "Testing".
      const resAll = await authenticatedFetch('/api/kpi-templates')
      const data = await resAll.json()
      if (data.success) {
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates()
    }
  }, [activeTab])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  const { toast } = useToast()

  const fetchResources = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: 'ACTIVE',
        approvalStatus: 'APPROVED'
      })

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }
      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter)
      }
      if (searchQuery) {
        params.append('q', searchQuery)
      }

      const res = await authenticatedFetch(`/api/kpi-resources?${params}`)
      const data = await res.json()

      if (data.success) {
        setResources(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error)
      toast({
        title: 'Error',
        description: 'Failed to load resources',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (resource: KpiResource) => {
    try {
      const res = await authenticatedFetch(`/api/kpi-resources/${resource.id}/download`)
      const data = await res.json()

      if (data.success) {
        const link = document.createElement('a')
        link.href = data.data.storageUrl
        link.download = data.data.fileName
        link.click()

        toast({
          title: 'Download started',
          description: `Downloading ${resource.fileName}`,
        })

        // Refresh to update download count
        fetchResources()
      }
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const getFileIcon = (fileType: string) => {
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileType.toLowerCase())) {
      return <FileImage className="h-8 w-8 text-blue-600" />
    }
    if (['pdf'].includes(fileType.toLowerCase())) {
      return <FileText className="h-8 w-8 text-red-600" />
    }
    if (['xlsx', 'xls', 'csv'].includes(fileType.toLowerCase())) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />
    }
    return <File className="h-8 w-8 text-gray-600" />
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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'TEMPLATE': 'Template',
      'GUIDE': 'Guide/Tutorial',
      'REPORT': 'Report',
      'EXAMPLE': 'Example',
      'OTHER': 'Other'
    }
    return labels[category] || category
  }

  // Get unique departments
  const departments = Array.from(new Set(resources.map(r => r.department).filter(Boolean)))

  useEffect(() => {
    fetchResources()
  }, [categoryFilter, departmentFilter])

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Library className="h-8 w-8" />
            KPI Library
          </h1>
          <p className="text-gray-600 mt-1">
            Browse and download reference materials for KPI management
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Resources & Documents
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              KPI Templates
            </TabsTrigger>
          </TabsList>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Search & Filter</CardTitle>
                <CardDescription>Find the documents you need</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 md:col-span-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by title, description, tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            fetchResources()
                          }
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="TEMPLATE">Templates</SelectItem>
                        <SelectItem value="GUIDE">Guides/Tutorials</SelectItem>
                        <SelectItem value="REPORT">Reports</SelectItem>
                        <SelectItem value="EXAMPLE">Examples</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept || ''}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={fetchResources} className="flex-1">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setCategoryFilter('all')
                      setDepartmentFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resources List */}
            <Card>
              <CardHeader>
                <CardTitle>Available Documents</CardTitle>
                <CardDescription>
                  {resources.length} document{resources.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading resources...</p>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No resources found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try adjusting your filters or search query
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map((resource) => (
                      <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {getFileIcon(resource.fileType || '')}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {resource.title}
                              </h3>
                              <div className="flex gap-2 mt-2">
                                <Badge className={getCategoryBadgeColor(resource.category)}>
                                  {getCategoryLabel(resource.category)}
                                </Badge>
                                {resource.department && (
                                  <Badge variant="outline">{resource.department}</Badge>
                                )}
                              </div>

                              {resource.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {resource.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {resource.viewCount}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Download className="h-3 w-3" />
                                  {resource.downloadCount}
                                </div>
                              </div>

                              {resource.tags && resource.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap mt-2">
                                  {resource.tags.slice(0, 3).map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {resource.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{resource.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              <Button
                                onClick={() => handleDownload(resource)}
                                className="w-full mt-4"
                                size="sm"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No templates available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <Card key={template.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {template.kpiName || template.name}
                              </h3>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline">{template.category}</Badge>
                                {template.department && (
                                  <Badge variant="secondary">{template.department}</Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {template.description}
                                </p>
                              )}
                              <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-500">
                                <div>Unit: <span className="font-medium text-gray-700">{template.unit}</span></div>
                                <div>Target: <span className="font-medium text-gray-700">{template.targetValue || template.target}</span></div>
                                <div>Weight: <span className="font-medium text-gray-700">{template.weight}%</span></div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
