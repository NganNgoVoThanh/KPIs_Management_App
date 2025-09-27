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
  BarChart3
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
      'Research & Development': 'bg-purple-100 text-purple-700',
      'Sales': 'bg-green-100 text-green-700',
      'Marketing': 'bg-pink-100 text-pink-700',
      'Production': 'bg-orange-100 text-orange-700',
      'Quality Assurance': 'bg-red-100 text-red-700',
      'Human Resources': 'bg-yellow-100 text-yellow-700',
      'Finance': 'bg-indigo-100 text-indigo-700',
      'IT': 'bg-gray-100 text-gray-700'
    }
    return colors[department] || 'bg-gray-100 text-gray-700'
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !selectedDepartment || template.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  const departments = [...new Set(templates.map(t => t.department))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Create KPIs</h1>
        <p className="text-muted-foreground mt-2">
          Choose a template to get started or create custom KPIs from scratch
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={!selectedDepartment ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDepartment(null)}
            className={!selectedDepartment ? "bg-red-600 hover:bg-red-700" : ""}
          >
            All
          </Button>
          {departments.map(dept => (
            <Button
              key={dept}
              variant={selectedDepartment === dept ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDepartment(dept)}
              className={selectedDepartment === dept ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {dept}
            </Button>
          ))}
        </div>
      </div>

      {/* Create from Scratch Option */}
      <Card className="border-2 border-dashed border-red-300 hover:border-red-500 cursor-pointer transition-colors"
            onClick={onCreateFromScratch}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Create from Scratch</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Build custom KPIs tailored to your specific needs without using a template
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map(template => {
          const Icon = getIconForDepartment(template.department)
          const colorClass = getColorForDepartment(template.department)
          
          return (
            <Card key={template.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer border-red-100"
                  onClick={() => onSelectTemplate(template)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-').replace('700', '100')}`}>
                    <Icon className={`h-5 w-5 ${colorClass.replace('bg-', 'text-').replace('100', '600')}`} />
                  </div>
                  <Badge className={colorClass}>
                    {template.department}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">KPI Fields</span>
                    <span className="font-medium">{template.kpiFields.length}</span>
                  </div>
                  
                  <div className="space-y-1">
                    {template.kpiFields.slice(0, 3).map(field => (
                      <div key={field.id} className="flex items-center gap-2 text-xs">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{field.title}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {field.weight}%
                        </Badge>
                      </div>
                    ))}
                    {template.kpiFields.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-5">
                        +{template.kpiFields.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
                
                <Button className="w-full mt-4 bg-red-600 hover:bg-red-700">
                  Use This Template
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Try adjusting your search or filters, or create KPIs from scratch
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}