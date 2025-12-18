"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { storageService } from "@/lib/storage-service"
import type { KpiTemplate } from "@/lib/types"
import {
  FileText,
  Search,
  Plus,
  Target,
  TrendingUp,
  Award,
  Users,
  Package,
  Beaker,
  ShoppingCart,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Sparkles
} from "lucide-react"

interface KpiTemplateSelectorProps {
  onSelectTemplate: (template: KpiTemplate) => void
  onCreateFromScratch: () => void
}

export function KpiTemplateSelector({
  onSelectTemplate,
  onCreateFromScratch
}: KpiTemplateSelectorProps) {
  const [templates, setTemplates] = useState<KpiTemplate[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = () => {
    const allTemplates = storageService.getTemplates()
    setTemplates(allTemplates)
  }

  const getIconForDepartment = (department: string) => {
    const icons: Record<string, any> = {
      'Research & Development': Beaker,
      'Sales': ShoppingCart,
      'Marketing': BarChart3,
      'Production': Package,
      'Quality Assurance': Award,
      'Human Resources': Users,
      'Finance': TrendingUp,
      'IT': Target
    }
    return icons[department] || FileText
  }

  const getColorForDepartment = (department: string) => {
    const colors: Record<string, string> = {
      'Research & Development': 'from-purple-500 to-purple-600',
      'Sales': 'from-green-500 to-green-600',
      'Marketing': 'from-pink-500 to-pink-600',
      'Production': 'from-orange-500 to-orange-600',
      'Quality Assurance': 'from-red-500 to-red-600',
      'Human Resources': 'from-yellow-500 to-yellow-600',
      'Finance': 'from-indigo-500 to-indigo-600',
      'IT': 'from-gray-500 to-gray-600'
    }
    return colors[department] || 'from-gray-500 to-gray-600'
  }

  const getBadgeColorForDepartment = (department: string) => {
    const colors: Record<string, string> = {
      'Research & Development': 'bg-purple-100 text-purple-700 border-purple-300',
      'Sales': 'bg-green-100 text-green-700 border-green-300',
      'Marketing': 'bg-pink-100 text-pink-700 border-pink-300',
      'Production': 'bg-orange-100 text-orange-700 border-orange-300',
      'Quality Assurance': 'bg-red-100 text-red-700 border-red-300',
      'Human Resources': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'Finance': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      'IT': 'bg-gray-100 text-gray-700 border-gray-300'
    }
    return colors[department] || 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !selectedDepartment || template.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  const departments = [...new Set(templates.map(t => t.department))]

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-red-900 flex items-center gap-3">
            <Sparkles className="h-10 w-10 text-red-600" />
            Create KPIs
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Choose a template to get started quickly or create custom KPIs from scratch
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search templates by name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 border-2 border-red-200 focus:border-red-400 text-base"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={!selectedDepartment ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDepartment(null)}
              className={!selectedDepartment ? "bg-red-600 hover:bg-red-700 h-12" : "h-12 border-red-200"}
            >
              All Departments
            </Button>
            {departments.map(dept => (
              <Button
                key={dept}
                variant={selectedDepartment === dept ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDepartment(dept)}
                className={selectedDepartment === dept ? "bg-red-600 hover:bg-red-700 h-12" : "h-12 border-red-200"}
              >
                {dept}
              </Button>
            ))}
          </div>
        </div>

        {/* Create from Scratch Option */}
        <Card
          className="border-4 border-dashed border-red-400 hover:border-red-600 cursor-pointer transition-all hover:shadow-2xl bg-gradient-to-r from-red-50 to-orange-50"
          onClick={onCreateFromScratch}
        >
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center mb-6 shadow-lg">
                <Plus className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-red-900 mb-3">Create from Scratch</h3>
              <p className="text-base text-gray-600 max-w-xl mx-auto mb-4">
                Build custom KPIs tailored to your specific needs without using a template.
                Perfect for unique roles or special projects.
              </p>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white shadow-lg mt-2"
                onClick={onCreateFromScratch}
              >
                Start Creating
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => {
            const Icon = getIconForDepartment(template.department)
            const gradientColor = getColorForDepartment(template.department)
            const badgeColor = getBadgeColorForDepartment(template.department)

            return (
              <Card
                key={template.id}
                className="hover:shadow-2xl transition-all cursor-pointer border-2 border-red-200 hover:border-red-400 bg-white overflow-hidden group"
                onClick={() => onSelectTemplate(template)}
              >
                {/* Gradient Header */}
                <div className={`h-24 bg-gradient-to-r ${gradientColor} flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <Icon className="h-12 w-12 text-white relative z-10" />
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`${badgeColor} border px-3 py-1`}>
                      {template.department}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-gray-900 group-hover:text-red-600 transition-colors">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {template.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-600 font-medium">KPI Fields</span>
                      <span className="font-bold text-red-600 text-lg">{template.kpiFields?.length || 0}</span>
                    </div>

                    <div className="space-y-2">
                      {(template.kpiFields || []).slice(0, 3).map(field => (
                        <div key={field.id} className="flex items-center gap-2 text-sm bg-white border border-gray-200 p-2 rounded">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="truncate flex-1">{field.title}</span>
                          <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                            {field.weight}%
                          </Badge>
                        </div>
                      ))}
                      {(template.kpiFields?.length || 0) > 3 && (
                        <p className="text-xs text-gray-500 pl-6">
                          +{(template.kpiFields?.length || 0) - 3} more KPIs
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white shadow-md group-hover:shadow-lg transition-all"
                    onClick={() => onSelectTemplate(template)}
                  >
                    Use This Template
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <Card className="border-2 border-red-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-20 w-20 text-gray-300 mb-4" />
              <h3 className="text-2xl font-semibold text-gray-600 mb-2">No templates found</h3>
              <p className="text-base text-gray-500 text-center max-w-md mb-6">
                Try adjusting your search or filters, or create KPIs from scratch
              </p>
              <Button
                onClick={onCreateFromScratch}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create from Scratch
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}