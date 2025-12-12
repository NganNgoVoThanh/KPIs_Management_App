"use client"

import { useState } from "react"
import type { ReportFilter } from "@/lib/reporting-utils"
import { mockOrgUnits, mockCycles } from "@/lib/mockdata"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Filter, RotateCcw } from "lucide-react"
import { format } from "date-fns"

interface ReportFiltersProps {
  filters: ReportFilter
  onFiltersChange: (filters: ReportFilter) => void
  onApplyFilters: () => void
  onResetFilters: () => void
}

export function ReportFilters({ filters, onFiltersChange, onApplyFilters, onResetFilters }: ReportFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(filters.dateRange?.start)
  const [endDate, setEndDate] = useState<Date | undefined>(filters.dateRange?.end)

  const departments = mockOrgUnits.filter((ou) => ou.type === "DEPARTMENT")
  const cycles = mockCycles

  const handleFilterChange = (key: keyof ReportFilter, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const handleDateRangeChange = () => {
    if (startDate && endDate) {
      handleFilterChange("dateRange", { start: startDate, end: endDate })
    } else {
      handleFilterChange("dateRange", undefined)
    }
  }

  const handleScoreRangeChange = (min: string, max: string) => {
    const minScore = Number.parseFloat(min) || 0
    const maxScore = Number.parseFloat(max) || 5
    handleFilterChange("scoreRange", { min: minScore, max: maxScore })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Report Filters
        </CardTitle>
        <CardDescription>Customize your report by applying filters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Cycle Selection */}
          <div className="space-y-2">
            <Label>KPI Cycle</Label>
            <Select
              value={filters.cycleId || "all"}
              onValueChange={(value) => handleFilterChange("cycleId", value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={filters.orgUnitId || "all"}
              onValueChange={(value) => handleFilterChange("orgUnitId", value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Score Range */}
          <div className="space-y-2">
            <Label>Score Range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                min="0"
                max="5"
                step="0.1"
                value={filters.scoreRange?.min || ""}
                onChange={(e) => handleScoreRangeChange(e.target.value, filters.scoreRange?.max?.toString() || "5")}
              />
              <Input
                type="number"
                placeholder="Max"
                min="0"
                max="5"
                step="0.1"
                value={filters.scoreRange?.max || ""}
                onChange={(e) => handleScoreRangeChange(filters.scoreRange?.min?.toString() || "0", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          {(startDate || endDate) && (
            <Button variant="outline" size="sm" onClick={handleDateRangeChange}>
              Apply Date Range
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={onApplyFilters} className="flex-1">
            Apply Filters
          </Button>
          <Button variant="outline" onClick={onResetFilters}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
