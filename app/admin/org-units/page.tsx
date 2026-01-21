"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sidebar } from "@/components/layout/sidebar"
import { authService } from "@/lib/auth-service"
import { authenticatedFetch } from "@/lib/api-client"
import { Plus, Building, Loader2, Network } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function AdminOrgUnitsPage() {
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [orgUnits, setOrgUnits] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const { toast } = useToast()

    // Form
    const [formData, setFormData] = useState({
        name: "",
        type: "DEPARTMENT",
        parentId: ""
    })

    useEffect(() => {
        const user = authService.getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            window.location.href = "/"
            return
        }
        setCurrentUser(user)
        loadOrgUnits()
    }, [])

    const loadOrgUnits = async () => {
        try {
            const res = await authenticatedFetch('/api/org-units')
            const data = await res.json()
            if (data.success) {
                setOrgUnits(data.data)
            }
        } catch (error) {
            console.error("Failed to load org units", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!formData.name) {
            toast({ title: "Validation Error", description: "Name is required", variant: "destructive" })
            return
        }

        try {
            const res = await authenticatedFetch('/api/org-units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()

            if (data.success) {
                toast({ title: "Success", description: "Organization Unit created" })
                setIsCreateDialogOpen(false)
                setFormData({ name: "", type: "DEPARTMENT", parentId: "" })
                loadOrgUnits()
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create org unit", variant: "destructive" })
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="flex h-screen bg-background">
            <Sidebar user={currentUser} onLogout={() => authService.logout().then(() => window.location.href = '/')} />
            <main className="flex-1 overflow-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Organization Structure</h1>
                        <p className="text-muted-foreground">Manage organization units, departments, and hierarchy</p>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-red-600 hover:bg-red-700">
                                <Plus className="mr-2 h-4 w-4" /> Add Org Unit
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Organization Unit</DialogTitle>
                                <DialogDescription>Add a new unit to the organization structure.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Marketing Department" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <select
                                        className="w-full border rounded p-2 text-sm"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="ORGANIZATION">Organization</option>
                                        <option value="DIVISION">Division</option>
                                        <option value="DEPARTMENT">Department</option>
                                        <option value="TEAM">Team</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Parent Unit (Optional)</Label>
                                    <select
                                        className="w-full border rounded p-2 text-sm"
                                        value={formData.parentId}
                                        onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                                    >
                                        <option value="">-- None (Top Level) --</option>
                                        {orgUnits.map((u: any) => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.type})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate}>Create</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Organization Units
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-3 text-left">Name</th>
                                        <th className="p-3 text-left">Type</th>
                                        <th className="p-3 text-left">Parent Unit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {orgUnits.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-muted-foreground">No organization units defined.</td>
                                        </tr>
                                    ) : (
                                        orgUnits.map((unit: any) => (
                                            <tr key={unit.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium flex items-center gap-2">
                                                    {unit.type === 'ORGANIZATION' ? <Network className="h-4 w-4 text-blue-500" /> : <Building className="h-4 w-4 text-gray-400" />}
                                                    {unit.name}
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {unit.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-500">
                                                    {orgUnits.find(u => u.id === unit.parentId)?.name || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
