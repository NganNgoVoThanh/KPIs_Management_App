"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Sidebar } from "@/components/layout/sidebar"
import { authService } from "@/lib/auth-service"
import { storageService } from "@/lib/storage-service"
import { User, Bell, Shield, Database, Palette, Save } from "lucide-react"
import type { User as UserType } from "@/lib/types"

export default function SettingsPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)

  // Form states
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    department: "",
    locale: "vi-VN"
  })

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    kpiReminders: true,
    approvalAlerts: true
  })

  const [appearance, setAppearance] = useState({
    theme: "light",
    compactMode: false,
    showAnimations: true
  })

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      window.location.href = "/"
      return
    }

    setUser(currentUser)
    setProfile({
      name: currentUser.name,
      email: currentUser.email,
      department: currentUser.department || "",
      locale: currentUser.locale || "vi-VN"
    })
    setLoading(false)
  }, [])

  const handleLogout = async () => {
    await authService.logout()
    window.location.href = "/"
  }

  const handleSaveProfile = () => {
    if (!user) return

    const updatedUser = {
      ...user,
      ...profile
    }

    // Update in storage
    const users = storageService.getUsers()
    const userIndex = users.findIndex(u => u.id === user.id)
    if (userIndex !== -1) {
      users[userIndex] = updatedUser
      localStorage.setItem('kpi_users', JSON.stringify(users))
      localStorage.setItem('current_user', JSON.stringify(updatedUser))
      setUser(updatedUser)
    }

    alert("Profile updated successfully!")
  }

  const handleSaveNotifications = () => {
    // Save to localStorage or API
    localStorage.setItem("notificationSettings", JSON.stringify(notifications))
    alert("Notification settings saved!")
  }

  const handleSaveAppearance = () => {
    localStorage.setItem("appearanceSettings", JSON.stringify(appearance))
    alert("Appearance settings saved!")
  }

  const handleExportData = () => {
    const data = {
      users: storageService.getUsers(),
      kpis: storageService.getKpiDefinitions(),
      actuals: storageService.getKpiActuals(),
      cycles: storageService.getCycles(),
      timestamp: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kpi-data-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const handleClearCache = () => {
    if (confirm("Are you sure you want to clear all cached data? This action cannot be undone.")) {
      localStorage.clear()
      alert("Cache cleared! Please log in again.")
      window.location.href = "/"
    }
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="data">
                <Database className="h-4 w-4 mr-2" />
                Data
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={profile.department}
                      onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                      placeholder="Enter your department"
                    />
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleSaveProfile} className="bg-red-600 hover:bg-red-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Role Information</CardTitle>
                  <CardDescription>Your current role and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Role:</span>
                      <span className="text-sm text-muted-foreground">{user.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <span className="text-sm text-muted-foreground">{user.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Organization Unit:</span>
                      <span className="text-sm text-muted-foreground">{user.orgUnitId}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Manage how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked: boolean) =>
                        setNotifications({ ...notifications, emailNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in browser
                      </p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked: boolean) =>
                        setNotifications({ ...notifications, pushNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">KPI Reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Get reminders for KPI deadlines
                      </p>
                    </div>
                    <Switch
                      checked={notifications.kpiReminders}
                      onCheckedChange={(checked: boolean) =>
                        setNotifications({ ...notifications, kpiReminders: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Approval Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Alerts when approval is required
                      </p>
                    </div>
                    <Switch
                      checked={notifications.approvalAlerts}
                      onCheckedChange={(checked: boolean) =>
                        setNotifications({ ...notifications, approvalAlerts: checked })
                      }
                    />
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleSaveNotifications} className="bg-red-600 hover:bg-red-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize the look and feel of the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <select
                      id="theme"
                      value={appearance.theme}
                      onChange={(e) => setAppearance({ ...appearance, theme: e.target.value })}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compact Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Use a more condensed layout
                      </p>
                    </div>
                    <Switch
                      checked={appearance.compactMode}
                      onCheckedChange={(checked: boolean) =>
                        setAppearance({ ...appearance, compactMode: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Animations</p>
                      <p className="text-sm text-muted-foreground">
                        Enable smooth transitions and animations
                      </p>
                    </div>
                    <Switch
                      checked={appearance.showAnimations}
                      onCheckedChange={(checked: boolean) =>
                        setAppearance({ ...appearance, showAnimations: checked })
                      }
                    />
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleSaveAppearance} className="bg-red-600 hover:bg-red-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>
                    Export, import, or clear your data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Export Data</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Download all your KPI data in JSON format
                    </p>
                    <Button onClick={handleExportData} variant="outline">
                      <Database className="h-4 w-4 mr-2" />
                      Export All Data
                    </Button>
                  </div>

                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <h3 className="font-medium mb-2 text-red-900">Danger Zone</h3>
                    <p className="text-sm text-red-700 mb-4">
                      Clear all cached data. This will log you out.
                    </p>
                    <Button onClick={handleClearCache} variant="destructive">
                      <Shield className="h-4 w-4 mr-2" />
                      Clear All Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
