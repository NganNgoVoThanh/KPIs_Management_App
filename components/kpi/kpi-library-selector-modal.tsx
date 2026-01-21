"use client"

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, X, AlertCircle, CheckCircle } from 'lucide-react';

interface KpiLibrarySelectorModalProps {
    onClose: () => void;
    onSelect: (entry: any) => void;
    userDepartment: string;
    userJobTitle: string;
}

export function KpiLibrarySelectorModal({
    onClose,
    onSelect,
    userDepartment,
    userJobTitle
}: KpiLibrarySelectorModalProps) {
    const [entries, setEntries] = useState<any[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [kpiTypeFilter, setKpiTypeFilter] = useState('all');
    const [selectedEntries, setSelectedEntries] = useState<any[]>([]);

    useEffect(() => {
        fetchEntries();
    }, []);

    useEffect(() => {
        let filtered = [...entries];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(entry =>
                entry.kpiName.toLowerCase().includes(query) ||
                entry.department.toLowerCase().includes(query) ||
                entry.unit.toLowerCase().includes(query)
            );
        }

        if (departmentFilter !== 'all') {
            filtered = filtered.filter(entry => entry.department === departmentFilter);
        }

        if (kpiTypeFilter !== 'all') {
            filtered = filtered.filter(entry => entry.kpiType === kpiTypeFilter);
        }

        setFilteredEntries(filtered);
    }, [searchQuery, departmentFilter, kpiTypeFilter, entries]);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: 'ACTIVE',
                isTemplate: 'true',
                limit: '100'
            });

            const res = await authenticatedFetch(`/api/kpi-library/entries?${params}`);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();

            if (data.success) {
                setEntries(data.data);
                setFilteredEntries(data.data);
            } else {
                throw new Error(data.error || 'Failed to fetch KPI library');
            }
        } catch (error) {
            console.error('KPI Library fetch error:', error);
            setEntries([]);
            setFilteredEntries([]);
        } finally {
            setLoading(false);
        }
    };

    const departments = Array.from(new Set(entries.map(e => e.department))).sort();
    const kpiTypes = ['I', 'II', 'III', 'IV'];

    const toggleSelection = (entry: any) => {
        if (selectedEntries.find(e => e.id === entry.id)) {
            setSelectedEntries(selectedEntries.filter(e => e.id !== entry.id));
        } else {
            setSelectedEntries([...selectedEntries, entry]);
        }
    };

    const handleSelect = () => {
        if (selectedEntries.length > 0) {
            onSelect(selectedEntries);
        }
    };

    const getKpiTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'I': 'Type I: Higher Better',
            'II': 'Type II: Lower Better',
            'III': 'Type III: Pass/Fail',
            'IV': 'Type IV: Custom Scale'
        };
        return labels[type] || type;
    };

    const getKpiTypeBadgeColor = (type: string) => {
        const colors: Record<string, string> = {
            'I': 'bg-red-100 text-red-800 border-red-300',
            'II': 'bg-green-100 text-green-800 border-green-300',
            'III': 'bg-red-100 text-red-800 border-red-300',
            'IV': 'bg-orange-100 text-orange-800 border-orange-300'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-6xl max-h-[85vh] flex flex-col shadow-2xl border-2 border-gray-200">
                <CardHeader className="border-b-2 bg-gradient-to-r from-red-50 to-indigo-50 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2.5 rounded-xl shadow-md">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-gray-900">
                                    Select KPI from Library
                                </CardTitle>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    Browse and select approved KPI templates from the company library
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-9 w-9 p-0 hover:bg-red-50"
                        >
                            <X className="h-5 w-5 text-gray-600" />
                        </Button>
                    </div>
                </CardHeader>

                <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* Filters */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">Search</Label>
                            <div className="relative">
                                <Input
                                    placeholder="Search KPI name, department..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10 border-2 focus:border-red-500 font-medium"
                                />
                                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">Department</Label>
                            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                <SelectTrigger className="h-10 border-2 focus:border-red-500 font-medium bg-white">
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent className="z-[999999] bg-white border-2 shadow-lg" position="popper" sideOffset={5}>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map(dept => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-sm font-bold text-gray-700 mb-2 block">KPI Type</Label>
                            <Select value={kpiTypeFilter} onValueChange={setKpiTypeFilter}>
                                <SelectTrigger className="h-10 border-2 focus:border-red-500 font-medium bg-white">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent className="z-[999999] bg-white border-2 shadow-lg" position="popper" sideOffset={5}>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {kpiTypes.map(type => (
                                        <SelectItem key={type} value={type}>Type {type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Results count */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">
                            Showing {filteredEntries.length} of {entries.length} KPIs
                        </p>
                        {(searchQuery || departmentFilter !== 'all' || kpiTypeFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setDepartmentFilter('all');
                                    setKpiTypeFilter('all');
                                }}
                                className="text-red-600 hover:bg-red-50 font-semibold"
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    {/* Table Container */}
                    <div className="flex-1 overflow-auto border-2 rounded-lg">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
                                    <p className="text-gray-600 font-semibold">Loading KPI library...</p>
                                </div>
                            </div>
                        ) : filteredEntries.length === 0 ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-700 font-bold text-lg">No KPIs found</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Try adjusting your filters or search query
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredEntries.map((entry) => {
                                    const isSelected = selectedEntries.some(e => e.id === entry.id);
                                    return (
                                        <div
                                            key={entry.id}
                                            onClick={() => toggleSelection(entry)}
                                            className={`p-4 cursor-pointer transition-all ${isSelected
                                                ? 'bg-red-50 border-l-4 border-l-red-600'
                                                : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3 mr-4">
                                                    <div className={`h-5 w-5 rounded border flex items-center justify-center ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-300'
                                                        }`}>
                                                        {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-base text-gray-900">{entry.kpiName}</h3>
                                                        <Badge className={`${getKpiTypeBadgeColor(entry.kpiType)} font-bold border`}>
                                                            Type {entry.kpiType}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-4 text-sm mt-2">
                                                        <div>
                                                            <span className="text-gray-500 font-medium">Department:</span>
                                                            <div className="font-bold text-gray-900">{entry.department}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 font-medium">Job Title:</span>
                                                            <div className="font-bold text-gray-900">{entry.jobTitle}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 font-medium">Unit:</span>
                                                            <div className="font-bold text-gray-900">{entry.unit}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500 font-medium">Data Source:</span>
                                                            <div className="font-bold text-gray-900">{entry.dataSource}</div>
                                                        </div>
                                                    </div>

                                                    {entry.ogsmTarget && (
                                                        <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
                                                            <span className="font-semibold">OGSM Alignment:</span> {entry.ogsmTarget}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Selected KPI Summary */}
                    {selectedEntries.length > 0 && (
                        <div className="rounded-lg border-2 border-red-300 bg-gradient-to-r from-red-50 to-indigo-50 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                <span className="font-bold text-red-900">
                                    {selectedEntries.length} KPI(s) selected
                                </span>
                            </div>
                            <div className="text-sm text-red-700">
                                Click "Import" to add them to your goal sheet
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t-2 bg-gray-50 px-6 py-4 flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        size="lg"
                        className="h-11 px-6 font-semibold border-2"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSelect}
                        disabled={selectedEntries.length === 0}
                        size="lg"
                        className="h-11 px-8 font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Import {selectedEntries.length} KPI(s)
                    </Button>
                </div>
            </Card>
        </div>
    );
}
