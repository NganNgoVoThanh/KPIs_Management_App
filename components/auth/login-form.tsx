"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authService } from "@/lib/auth-service"
import type { User } from "@/lib/types"
import { Loader2, Shield, Users } from "lucide-react"

interface LoginFormProps {
  onLogin: (user: User) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const user = await authService.loginWithSSO(email)
      if (user) {
        onLogin(user)
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const quickLoginUsers = [
    { email: "hr@intersnack.com.vn", role: "HR", color: "bg-purple-100 text-purple-700" },
    { email: "admin@intersnack.com.vn", role: "Admin", color: "bg-red-100 text-red-700" },
    { email: "staff@intersnack.com.vn", role: "Staff", color: "bg-green-100 text-green-700" },
    { email: "linemanager@intersnack.com.vn", role: "Line Manager", color: "bg-yellow-100 text-yellow-700" },
    { email: "hod@intersnack.com.vn", role: "Head of Dept", color: "bg-orange-100 text-orange-700" },
    { email: "bod@intersnack.com.vn", role: "BOD", color: "bg-red-100 text-red-700" },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
      <Card className="w-full max-w-md shadow-xl border-red-100">
        <CardHeader className="text-center bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
          <div className="flex items-center justify-center mb-2">
            <Shield className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-bold">VICC KPI Management</CardTitle>
          <CardDescription className="text-red-100">
            Sign in with your Intersnack email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.name@intersnack.com.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-red-200 focus:border-red-400"
              />
              <p className="text-xs text-muted-foreground">
                Use your @intersnack.com.vn email to access the system
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign In with SSO
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-red-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Quick Access</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Users className="h-4 w-4" />
              <span>Select a test account:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickLoginUsers.map((user) => (
                <Button
                  key={user.email}
                  variant="outline"
                  size="sm"
                  onClick={() => setEmail(user.email)}
                  className={`text-xs justify-start hover:${user.color} border-red-200`}
                >
                  <div className="text-left">
                    <div className="font-medium">{user.role}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {user.email.split('@')[0]}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-red-100">
            <p>© Vietnam Intersnack Cashew Company</p>
            <p>KPI Management System v1.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}