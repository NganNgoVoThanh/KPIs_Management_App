"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sidebar } from "@/components/layout/sidebar"
import { authService } from "@/lib/auth-service" // Still needed for client-side logout/initial check
import { authenticatedFetch } from "@/lib/api-client"
import { Users, UserPlus, Edit, Trash2, Shield, Search, Filter, Loader2 } from "lucide-react"
import type { User, UserRole, UserStatus } from "@/lib/types"

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  // Change default status filter to ACTIVE to hide deleted users by default
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Potential Managers List (for Dropdown)
  const [potentialManagers, setPotentialManagers] = useState<User[]>([])

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "STAFF" as UserRole,
    department: "",
    employeeId: "",
    managerId: "",
    hodId: "",
    orgUnitId: "default-org", // In real app, fetch OrgUnits
    status: "ACTIVE" as UserStatus
  })

  useEffect(() => {
    const user = authService.getCurrentUser()
    if (!user || user.role !== "ADMIN") {
      alert("Access denied. Admin only!")
      window.location.href = "/"
      return
    }

    setCurrentUser(user)
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()

    // Extract potential managers (Line Manager or Manager role)
    const mgrs = users.filter(u =>
      (u.role === 'LINE_MANAGER' || u.role === 'MANAGER') &&
      u.status === 'ACTIVE'
    )
    setPotentialManagers(mgrs)
  }, [users, searchQuery, roleFilter, statusFilter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await authenticatedFetch('/api/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.data)
        setFilteredUsers(data.data)
      } else {
        console.error("Failed to load users:", data.error)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        u =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.department?.toLowerCase().includes(query)
      )
    }

    // Role filter
    if (roleFilter !== "ALL") {
      filtered = filtered.filter(u => u.role === roleFilter)
    }

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(u => u.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleLogout = async () => {
    await authService.logout()
    window.location.href = "/"
  }

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email) {
      alert("Please fill in required fields")
      return
    }

    try {
      const res = await authenticatedFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (data.success) {
        alert("User created successfully!")
        loadUsers()
        setIsCreateDialogOpen(false)
        resetForm()
      } else {
        alert("Failed to create user: " + data.error)
      }
    } catch (error) {
      console.error("Create error:", error)
      alert("An error occurred")
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return

    try {
      const res = await authenticatedFetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (data.success) {
        alert("User updated successfully!")
        loadUsers()
        setEditingUser(null)
        resetForm()
      } else {
        alert("Failed to update user: " + data.error)
      }
    } catch (error) {
      console.error("Update error:", error)
      alert("An error occurred")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return

    try {
      const res = await authenticatedFetch(`/api/users/${userId}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        alert("User deactivated successfully!")
        loadUsers()
      } else {
        alert("Failed to delete user: " + data.error)
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      employeeId: user.employeeId || "",
      managerId: user.managerId || "",
      hodId: (user as any).hodId || "",
      orgUnitId: user.orgUnitId || "default",
      status: user.status
    })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "STAFF",
      department: "",
      employeeId: "",
      managerId: "",
      hodId: "",
      orgUnitId: "default",
      status: "ACTIVE"
    })
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "ADMIN": return "bg-red-100 text-red-800"
      case "MANAGER": return "bg-blue-100 text-blue-800"
      case "LINE_MANAGER": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusBadgeColor = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "INACTIVE": return "bg-gray-100 text-gray-800"
      case "SUSPENDED": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Users...</p>
        </div>
      </div>
    )
  }

  // Helper to render Manager Dropdown
  const renderManagerSelect = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="managerId">Line Manager (Level 1)</Label>
        <select
          id="managerId"
          value={formData.managerId}
          onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
          className="w-full border rounded-md px-3 py-2 bg-white text-sm"
        >
          <option value="">-- Auto (Dept Based) --</option>
          {potentialManagers.map(mgr => (
            <option key={mgr.id} value={mgr.id}>
              {mgr.name} ({mgr.department})
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground">
          Override Line Manager
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hodId">Department Head (Level 2)</Label>
        <select
          id="hodId"
          value={(formData as any).hodId || ""}
          onChange={(e) => setFormData({ ...formData, hodId: e.target.value } as any)}
          className="w-full border rounded-md px-3 py-2 bg-white text-sm"
        >
          <option value="">-- Auto (Dept Based) --</option>
          {potentialManagers.filter(m => m.role === 'MANAGER').map(mgr => (
            <option key={mgr.id} value={mgr.id}>
              {mgr.name} ({mgr.department})
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground">
          Override HOD
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={currentUser} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage system users, roles, and manager assignments
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user to the system</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full border p-2 rounded">
                        <option value="STAFF">Staff</option>
                        <option value="LINE_MANAGER">Line Manager</option>
                        <option value="MANAGER">Manager (HOD)</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. MARKETING" />
                    </div>
                  </div>

                  {renderManagerSelect()}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateUser} className="bg-red-600 text-white">Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select className="w-full p-2 border rounded" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="ALL">All Roles</option>
                    <option value="STAFF">Staff</option>
                    <option value="LINE_MANAGER">Line Manager</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select className="w-full p-2 border rounded" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3">Name / Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Manager</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                      const managerName = users.find(u => u.id === user.managerId)?.name || (user.managerId ? "Unknown ID" : "-")
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-gray-500 text-xs">{user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                          </td>
                          <td className="px-4 py-3">{user.department}</td>
                          <td className="px-4 py-3 text-gray-600">{managerName}</td>
                          <td className="px-4 py-3">
                            <Badge className={getStatusBadgeColor(user.status)}>{user.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" className="mr-2" onClick={() => openEditDialog(user)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && <div className="text-center py-10 text-gray-500">No users found.</div>}
              </div>
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          {editingUser && (
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit User: {editingUser.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full border p-2 rounded">
                        <option value="STAFF">Staff</option>
                        <option value="LINE_MANAGER">Line Manager</option>
                        <option value="MANAGER">Manager (HOD)</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })} className="w-full border p-2 rounded">
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                  </div>

                  {renderManagerSelect()}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                    <Button onClick={handleEditUser} className="bg-red-600 text-white">Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

        </div>
      </main>
    </div>
  )
}
