"use client"

import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Search, BookOpen, Filter, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { KpiLibraryEntry } from '@/lib/types'

interface KpiLibrarySelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (entry: KpiLibraryEntry) => void
  userDepartment?: string
  userJobTitle?: string
}

export function KpiLibrarySelector({
  open,
  onOpenChange,
  onSelect,
  userDepartment,
  userJobTitle
}: KpiLibrarySelectorProps) {
  const [entries, setEntries] = useState<KpiLibraryEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<KpiLibraryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState(userDepartment || 'all')
  const [jobTitleFilter, setJobTitleFilter] = useState(userJobTitle || 'all')
  const [kpiTypeFilter, setKpiTypeFilter] = useState('all')
  const [selectedEntry, setSelectedEntry] = useState<KpiLibraryEntry | null>(null)
  const { toast } = useToast()

  // Fetch KPI library entries
  const fetchEntries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: 'ACTIVE',
        isTemplate: 'true'
      })

      const res = await authenticatedFetch(`/api/kpi-library/entries?${params}`)
      const data = await res.json()

      if (data.success) {
        setEntries(data.data)
        setFilteredEntries(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Failed to load KPI library',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...entries]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(entry =>
        entry.kpiName.toLowerCase().includes(query) ||
        entry.department.toLowerCase().includes(query) ||
        entry.jobTitle.toLowerCase().includes(query) ||
        entry.unit.toLowerCase().includes(query)
      )
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(entry => 
        entry.department.toLowerCase() === departmentFilter.toLowerCase()
      )
    }

    // Job Title filter
    if (jobTitleFilter !== 'all') {
      filtered = filtered.filter(entry =>
        entry.jobTitle.toLowerCase() === jobTitleFilter.toLowerCase()
      )
    }

    // KPI Type filter
    if (kpiTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.kpiType === kpiTypeFilter)
    }

    setFilteredEntries(filtered)
  }, [searchQuery, departmentFilter, jobTitleFilter, kpiTypeFilter, entries])

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      fetchEntries()
      setSearchQuery('')
      setSelectedEntry(null)
    }
  }, [open])

  // Get unique values for filters
  const departments = Array.from(new Set(entries.map(e => e.department))).sort()
  const jobTitles = Array.from(new Set(entries.map(e => e.jobTitle))).sort()
  const kpiTypes = ['I', 'II', 'III', 'IV']

  const handleSelect = () => {
    if (selectedEntry) {
      onSelect(selectedEntry)
      onOpenChange(false)
      setSelectedEntry(null)
    }
  }

  const getKpiTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'I': 'Type I - Quantitative',
      'II': 'Type II - Milestone',
      'III': 'Type III - Qualitative',
      'IV': 'Type IV - Behavioral'
    }
    return labels[type] || type
  }

  const getKpiTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'I': 'bg-blue-100 text-blue-800',
      'II': 'bg-green-100 text-green-800',
      'III': 'bg-purple-100 text-purple-800',
      'IV': 'bg-orange-100 text-orange-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Select KPI from Library
          </DialogTitle>
          <DialogDescription>
            Browse and select approved KPI templates from the company library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search KPI name, department, job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kpi-type">KPI Type</Label>
              <Select value={kpiTypeFilter} onValueChange={setKpiTypeFilter}>
                <SelectTrigger id="kpi-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {kpiTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      Type {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredEntries.length} of {entries.length} KPIs
            </p>
            {(searchQuery || departmentFilter !== 'all' || kpiTypeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setDepartmentFilter(userDepartment || 'all')
                  setJobTitleFilter(userJobTitle || 'all')
                  setKpiTypeFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading KPI library...</p>
                </div>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No KPIs found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try adjusting your filters or search query
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-16">No.</TableHead>
                    <TableHead className="min-w-[300px]">KPI Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Data Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={`cursor-pointer ${
                        selectedEntry?.id === entry.id
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <TableCell>
                        {selectedEntry?.id === entry.id && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{entry.stt}</TableCell>
                      <TableCell className="text-sm">{entry.kpiName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.department}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.jobTitle}</TableCell>
                      <TableCell>
                        <Badge className={getKpiTypeColor(entry.kpiType)}>
                          {entry.kpiType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.unit}</TableCell>
                      <TableCell className="text-sm">{entry.dataSource}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Selected KPI Preview */}
          {selectedEntry && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 mb-2">Selected KPI:</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Name:</span>{' '}
                      <span className="text-blue-900">{selectedEntry.kpiName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-blue-700 font-medium">Type:</span>{' '}
                        <span className="text-blue-900">{getKpiTypeLabel(selectedEntry.kpiType)}</span>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Unit:</span>{' '}
                        <span className="text-blue-900">{selectedEntry.unit}</span>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Data Source:</span>{' '}
                        <span className="text-blue-900">{selectedEntry.dataSource}</span>
                      </div>
                      {selectedEntry.yearlyTarget && (
                        <div>
                          <span className="text-blue-700 font-medium">Suggested Target:</span>{' '}
                          <span className="text-blue-900">{selectedEntry.yearlyTarget}</span>
                        </div>
                      )}
                    </div>
                    {selectedEntry.ogsmTarget && (
                      <div>
                        <span className="text-blue-700 font-medium">OGSM Alignment:</span>{' '}
                        <span className="text-blue-900 text-xs">{selectedEntry.ogsmTarget}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedEntry}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Use This KPI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}