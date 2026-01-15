"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"
import { Cycle } from "@/lib/types"
import { format } from "date-fns"
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Calendar, Clock, Plus, AlertCircle, CheckCircle,
    ChevronDown, ChevronUp, RefreshCw
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export function CyclesManager() {
    const { toast } = useToast()
    const [cycles, setCycles] = useState<Cycle[]>([])
    const [loading, setLoading] = useState(false)
    const [showCreateDialog, setShowCreateDialog] = useState(false)

    // New Cycle Form State
    const [formData, setFormData] = useState({
        name: "",
        type: "YEARLY",
        periodStart: "",
        periodEnd: "",
        // Phases
        settingStart: "",
        settingEnd: "",
        trackingStart: "",
        trackingEnd: "",
        evaluationStart: "",
        evaluationEnd: ""
    })

    useEffect(() => {
        fetchCycles()
    }, [])

    const fetchCycles = async () => {
        setLoading(true)
        try {
            const res = await authenticatedFetch('/api/cycles')
            const data = await res.json()
            if (data.success) {
                setCycles(Array.isArray(data.data) ? data.data : [])
            }
        } catch (error) {
            console.error("Failed to fetch cycles", error)
            toast({
                title: "Error",
                description: "Failed to load cycles",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCycle = async () => {
        // Basic Validation
        if (!formData.name || !formData.periodStart || !formData.periodEnd) {
            toast({ title: "Validation Error", description: "Name and Period dates are required", variant: "destructive" })
            return
        }

        setLoading(true)
        try {
            const res = await authenticatedFetch('/api/cycles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData) // The API handles the fields (settingStart, trackingStart, etc.)
            })

            const data = await res.json()

            if (data.success) {
                toast({ title: "Success", description: "Performance Cycle created successfully" })
                setShowCreateDialog(false)
                fetchCycles()
                // Reset form
                setFormData({
                    name: "",
                    type: "YEARLY",
                    periodStart: "",
                    periodEnd: "",
                    settingStart: "",
                    settingEnd: "",
                    trackingStart: "",
                    trackingEnd: "",
                    evaluationStart: "",
                    evaluationEnd: ""
                })
            } else {
                toast({ title: "Error", description: data.error || "Failed to create cycle", variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to create cycle", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (id: string, status: string) => {
        setLoading(true)
        try {
            const res = await authenticatedFetch(`/api/cycles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
            if (res.ok) {
                toast({ title: "Success", description: `Cycle status updated to ${status}` })
                fetchCycles()
            } else {
                throw new Error("Failed to update status")
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to update cycle status", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'default'
            case 'DRAFT': return 'secondary'
            case 'CLOSED': return 'outline'
            default: return 'outline'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Performance Cycles</h2>
                    <p className="text-sm text-muted-foreground">Manage evaluation periods and timelines</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Cycle
                </Button>
            </div>

            <div className="grid gap-4">
                {cycles.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-10">
                            <Calendar className="h-10 w-10 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground font-medium">No cycles data found</p>
                            <p className="text-xs text-muted-foreground mt-1">Create your first performance cycle to get started</p>
                        </CardContent>
                    </Card>
                ) : (
                    cycles.map((cycle) => (
                        <Card key={cycle.id} className="overflow-hidden">
                            <div className={`h-2 w-full ${cycle.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-200'}`} />
                            <CardHeader className="dir-row flex flex-row items-center justify-between space-y-0 pb-2">
                                <div>
                                    <CardTitle className="text-lg font-bold">{cycle.name}</CardTitle>
                                    <CardDescription suppressHydrationWarning>
                                        {format(new Date(cycle.periodStart), 'PPP')} - {format(new Date(cycle.periodEnd), 'PPP')}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={getStatusColor(cycle.status) as any}>{cycle.status}</Badge>
                                    {cycle.status === 'DRAFT' && (
                                        <Button size="sm" variant="outline"
                                            onClick={() => handleStatusChange(cycle.id, 'ACTIVE')}
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                        >
                                            Activate
                                        </Button>
                                    )}
                                    {cycle.status === 'ACTIVE' && (
                                        <Button size="sm" variant="outline"
                                            onClick={() => handleStatusChange(cycle.id, 'CLOSED')}
                                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                        >
                                            Close
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="timeline" className="border-b-0">
                                        <AccordionTrigger className="hover:no-underline py-2">
                                            <span className="text-sm font-medium">View Timeline Details</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-sm bg-slate-50 p-4 rounded-md">
                                                <div>
                                                    <h4 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                                                        <Clock className="h-3 w-3" /> Goal Setting
                                                    </h4>
                                                    {cycle.settingStart && cycle.settingEnd ? (
                                                        <p>{format(new Date(cycle.settingStart), 'dd/MM/yy')} - {format(new Date(cycle.settingEnd), 'dd/MM/yy')}</p>
                                                    ) : <span className="text-gray-400 italic">Not set</span>}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                                                        <Clock className="h-3 w-3" /> Evidence Tracking
                                                    </h4>
                                                    {cycle.trackingStart && cycle.trackingEnd ? (
                                                        <p>{format(new Date(cycle.trackingStart), 'dd/MM/yy')} - {format(new Date(cycle.trackingEnd), 'dd/MM/yy')}</p>
                                                    ) : <span className="text-gray-400 italic">Not set</span>}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                                                        <Clock className="h-3 w-3" /> Evaluation
                                                    </h4>
                                                    {cycle.evaluationStart && cycle.evaluationEnd ? (
                                                        <p>{format(new Date(cycle.evaluationStart), 'dd/MM/yy')} - {format(new Date(cycle.evaluationEnd), 'dd/MM/yy')}</p>
                                                    ) : <span className="text-gray-400 italic">Not set</span>}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* CREATE DIALOG */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Performance Cycle</DialogTitle>
                        <DialogDescription>Define the timeline for the new evaluation period.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cycle Name <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="e.g. 2024 Performance Review"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="YEARLY">Yearly</SelectItem>
                                        <SelectItem value="SEMI_ANNUAL">Semi-Annual</SelectItem>
                                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Main Period */}
                        <div className="space-y-2 border-b pb-4">
                            <Label className="font-bold">Cycle Duration <span className="text-red-500">*</span></Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                                    <Input type="date"
                                        value={formData.periodStart}
                                        onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">End Date</Label>
                                    <Input type="date"
                                        value={formData.periodEnd}
                                        onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Phases */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Phase Timelines</h3>

                            {/* Goal Setting */}
                            <div className="bg-blue-50 p-3 rounded-md space-y-2">
                                <Label className="font-semibold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">1</span>
                                    Goal Setting Phase
                                </Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input type="date"
                                        value={formData.settingStart}
                                        onChange={(e) => setFormData({ ...formData, settingStart: e.target.value })}
                                        className="bg-white"
                                    />
                                    <Input type="date"
                                        value={formData.settingEnd}
                                        onChange={(e) => setFormData({ ...formData, settingEnd: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>

                            {/* Tracking / Evidence */}
                            <div className="bg-purple-50 p-3 rounded-md space-y-2">
                                <Label className="font-semibold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-xs">2</span>
                                    Evidence Collection Phase
                                </Label>
                                <p className="text-xs text-muted-foreground">When users can upload evidence (Tracking Start/End)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input type="date"
                                        value={formData.trackingStart}
                                        onChange={(e) => setFormData({ ...formData, trackingStart: e.target.value })}
                                        className="bg-white"
                                    />
                                    <Input type="date"
                                        value={formData.trackingEnd}
                                        onChange={(e) => setFormData({ ...formData, trackingEnd: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>

                            {/* Evaluation */}
                            <div className="bg-green-50 p-3 rounded-md space-y-2">
                                <Label className="font-semibold flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs">3</span>
                                    Evaluation & Review Phase
                                </Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input type="date"
                                        value={formData.evaluationStart}
                                        onChange={(e) => setFormData({ ...formData, evaluationStart: e.target.value })}
                                        className="bg-white"
                                    />
                                    <Input type="date"
                                        value={formData.evaluationEnd}
                                        onChange={(e) => setFormData({ ...formData, evaluationEnd: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateCycle} disabled={loading}>
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                            Create Cycle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
