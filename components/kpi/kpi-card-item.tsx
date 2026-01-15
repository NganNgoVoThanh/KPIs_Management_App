"use client"

import React, { memo } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Edit2, Target, Copy, Trash2, ChevronUp, ChevronDown, BookOpen, AlertCircle } from "lucide-react"
import { TypeIVScaleEditor } from "./type-iv-scale-editor"
import type { KpiFormData } from "./enhanced-kpi-form"

interface KpiCardItemProps {
    kpi: KpiFormData
    index: number
    isExpanded: boolean
    onToggleExpand: (index: number) => void
    onUpdate: (index: number, data: Partial<KpiFormData>) => void
    onDuplicate: (index: number) => void
    onRemove: (index: number) => void
    validationErrors?: string[]
    maxKpis: number
    totalKpis: number
}

export const KpiCardItem = memo(({
    kpi,
    index,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onDuplicate,
    onRemove,
    validationErrors,
    maxKpis,
    totalKpis
}: KpiCardItemProps) => {

    return (
        <Card
            className={`transition-all duration-300 border-l-4 shadow-sm hover:shadow-md ${isExpanded
                ? 'border-l-red-600 ring-1 ring-red-100'
                : 'border-l-gray-300 bg-white/50'
                }`}
        >
            {/* ACCORDION HEADER */}
            <div
                onClick={() => onToggleExpand(index)}
                className={`p-4 flex items-center justify-between cursor-pointer ${isExpanded ? 'bg-gradient-to-r from-red-50 to-white' : ''
                    }`}
            >
                <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full ${isExpanded ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                        {isExpanded ? <Edit2 className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold text-sm ${isExpanded ? 'text-red-700' : 'text-gray-500'}`}>
                                KPI #{index + 1}
                            </span>
                            {kpi.weight > 0 && (
                                <Badge className={kpi.weight >= 5 && kpi.weight <= 40 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    {kpi.weight}%
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-xs bg-white">
                                {kpi.type.replace('QUANT_', '').replace('_', ' ')}
                            </Badge>
                        </div>
                        <h3 className={`font-bold text-lg ${kpi.title ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                            {kpi.title || 'Untitled KPI'}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {totalKpis < maxKpis && (
                        <Button variant="ghost" size="sm" onClick={() => onDuplicate(index)} title="Duplicate">
                            <Copy className="h-4 w-4 text-gray-500 hover:text-red-600" />
                        </Button>
                    )}
                    {totalKpis > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => onRemove(index)} title="Remove">
                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onToggleExpand(index)}>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-red-600" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                    </Button>
                </div>
            </div>

            {/* ACCORDION BODY */}
            {isExpanded && (
                <CardContent className="p-6 border-t border-gray-100 bg-white animate-in slide-in-from-top-2 duration-200">

                    {/* SECTION 1: CORE INFO */}
                    <div className="mb-6">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-red-700 uppercase tracking-wide mb-4 pb-2 border-b border-red-50">
                            <BookOpen className="h-4 w-4" /> 1. Core Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <Label className="text-sm font-semibold text-gray-700 mb-2 block">KPI Title <span className="text-red-500">*</span></Label>
                                <Input
                                    value={kpi.title}
                                    onChange={(e) => onUpdate(index, { title: e.target.value })}
                                    placeholder="e.g. Achieve Quarterly Sales Target"
                                    className="font-medium h-11 border-gray-200 focus:border-red-500 focus:ring-red-100"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <Label className="text-sm font-semibold text-gray-700 mb-2 block">KPI Type <span className="text-red-500">*</span></Label>
                                <Select value={kpi.type} onValueChange={(v: any) => onUpdate(index, { type: v })}>
                                    <SelectTrigger className="h-11 border-gray-200 focus:border-red-500">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="QUANT_HIGHER_BETTER">Type I: Higher Better (Profit, Sales)</SelectItem>
                                        <SelectItem value="QUANT_LOWER_BETTER">Type II: Lower Better (Costs, Defects)</SelectItem>
                                        <SelectItem value="BOOLEAN">Type III: Pass/Fail (Compliance)</SelectItem>
                                        <SelectItem value="MILESTONE">Type IV: Custom Scale (Projects)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Category</Label>
                                    <Select value={kpi.category} onValueChange={(v: any) => onUpdate(index, { category: v })}>
                                        <SelectTrigger className="h-11 border-gray-200 focus:border-red-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Business Objective">Business Objective</SelectItem>
                                            <SelectItem value="Core Values">Core Values</SelectItem>
                                            <SelectItem value="Individual Development">Individual Development</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Priority</Label>
                                    <Select value={kpi.priority} onValueChange={(v: any) => onUpdate(index, { priority: v })}>
                                        <SelectTrigger className="h-11 border-gray-200 focus:border-red-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="High">🔴 High</SelectItem>
                                            <SelectItem value="Medium">🟡 Medium</SelectItem>
                                            <SelectItem value="Low">🟢 Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* INLINE VALIDATION ERRORS */}
                    {validationErrors && validationErrors.length > 0 && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <h5 className="text-red-700 font-bold text-sm flex items-center gap-1 mb-1">
                                <AlertCircle className="h-4 w-4" /> Please fix:
                            </h5>
                            <ul className="list-disc list-inside text-sm text-red-600">
                                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* SECTION 2: MEASUREMENT */}
                    <div className="mb-6">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-red-700 uppercase tracking-wide mb-4 pb-2 border-b border-red-50">
                            <Target className="h-4 w-4" /> 2. Measurement & Targets
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Target Value <span className="text-red-500">*</span></Label>

                                {/* Dynamic Input based on Type */}
                                {kpi.type === 'BOOLEAN' ? (
                                    <Select
                                        value={String(kpi.target)}
                                        onValueChange={(v) => onUpdate(index, { target: parseFloat(v) })}
                                    >
                                        <SelectTrigger className="h-11 border-gray-200 focus:border-red-500 font-bold">
                                            <SelectValue placeholder="Select Target" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Pass (100%)</SelectItem>
                                            <SelectItem value="0">Fail (0%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        type={kpi.type === 'MILESTONE' ? "text" : "number"}
                                        value={kpi.target || ''}
                                        onChange={(e) => onUpdate(index, { target: parseFloat(e.target.value) || 0 })}
                                        placeholder={kpi.type === 'MILESTONE' ? "Number of milestones..." : "0.00"}
                                        className="font-bold h-11 border-gray-200 focus:border-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                )}
                            </div>
                            <div>
                                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Unit <span className="text-red-500">*</span></Label>
                                <Input
                                    value={kpi.unit}
                                    onChange={(e) => onUpdate(index, { unit: e.target.value })}
                                    placeholder="%, VND, Cases..."
                                    className="h-11 border-gray-200 focus:border-red-500"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-semibold text-gray-700 mb-2 block">Weight (%) <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={kpi.weight || ''}
                                        onChange={(e) => onUpdate(index, { weight: parseFloat(e.target.value) || 0 })}
                                        className={`font-bold h-11 pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${kpi.weight >= 5 && kpi.weight <= 40 ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}`}
                                    />
                                    <span className="absolute right-3 top-3 text-sm text-gray-500 font-bold">%</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Recommended: 5-40%</p>
                            </div>
                        </div>

                        {kpi.type === 'MILESTONE' && (
                            <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Type IV Scoring Rules</Label>
                                <TypeIVScaleEditor
                                    value={kpi.scoringRules}
                                    onChange={(rules) => onUpdate(index, { scoringRules: rules })}
                                    actualValue={kpi.target}
                                />
                            </div>
                        )}
                    </div>

                    {/* SECTION 3: IMPLEMENTATION */}
                    <div>
                        {/* Additional implementation details logic would go here if extracted */}
                        {/* For now keeping limited to what was in the snippet plus placeholder for full extraction if needed */}
                    </div>

                </CardContent>
            )}
        </Card>
    )
}, (prev, next) => {
    // Custom comparison to ensure strict re-rendering control
    return (
        prev.isExpanded === next.isExpanded &&
        prev.index === next.index &&
        prev.totalKpis === next.totalKpis &&
        prev.maxKpis === next.maxKpis &&
        JSON.stringify(prev.kpi) === JSON.stringify(next.kpi) &&
        JSON.stringify(prev.validationErrors) === JSON.stringify(next.validationErrors)
    )
})

KpiCardItem.displayName = "KpiCardItem"
