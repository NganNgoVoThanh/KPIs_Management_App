"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Building2, Settings, FileText, Calendar, Shield } from "lucide-react"
import { mockUsers, mockOrgUnits, mockCycles } from "@/lib/mockdata"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("users")

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-balance">System Administration</h1>
        <p className="text-muted-foreground mt-1">Manage users, organization structure, and system settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="org-units" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Org Units
          </TabsTrigger>
          <TabsTrigger value="cycles" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cycles
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Management</h2>
            <Button>Add New User</Button>
          </div>

          <div className="grid gap-4">
            {mockUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.role}</Badge>
                    <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>{user.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="org-units" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Organization Structure</h2>
            <Button>Add Org Unit</Button>
          </div>

          <div className="grid gap-4">
            {mockOrgUnits.map((unit) => (
              <Card key={unit.id}>
                <CardContent className="p-4">
                  <h3 className="font-medium">{unit.name}</h3>
                  <p className="text-sm text-muted-foreground">Type: {unit.type}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cycles" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Performance Cycles</h2>
            <Button>Create New Cycle</Button>
          </div>

          <div className="grid gap-4">
            {mockCycles.map((cycle) => (
              <Card key={cycle.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{cycle.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {cycle.periodStart.toLocaleDateString()} - {cycle.periodEnd.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={cycle.status === "ACTIVE" ? "default" : "secondary"}>{cycle.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">KPI Templates</h2>
            <Button>Create Template</Button>
          </div>

          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Template management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Role Permissions</h2>
            <Button>Manage Permissions</Button>
          </div>

          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Permission management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <h2 className="text-xl font-semibold">System Settings</h2>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure system-wide settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" defaultValue="Intersnack Vietnam" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-locale">Default Language</Label>
                  <Input id="default-locale" defaultValue="English" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Configure notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-server">SMTP Server</Label>
                  <Input id="smtp-server" placeholder="smtp.company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input id="from-email" placeholder="noreply@intersnack.com.vn" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
