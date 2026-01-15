"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authService } from "@/lib/auth-service"
import type { User } from "@/lib/types"
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react"

interface LoginFormProps {
  onLogin: (user: User) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // ✅ IMPORTANT: Clear all storage BEFORE login to prevent stale data
      sessionStorage.clear()
      localStorage.clear()

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed')
      }

      const user = data.data
      console.log('[LOGIN] User from API:', user.email, 'Role:', user.role)

      // Save fresh user data to sessionStorage
      authService.setCurrentUser(user)
      onLogin(user)
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-hidden">
      {/* Left Side - Branding & Purpose */}
      <div className="lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#8B0000] via-[#A80000] to-[#600000]">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-red-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-900 rounded-full mix-blend-multiply filter blur-[96px] opacity-40"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/noise.png')] opacity-[0.03]"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full p-12 lg:p-20 text-white">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <div className="bg-white/90 p-2.5 rounded-2xl shadow-xl backdrop-blur-md transition-transform hover:scale-105 duration-300">
              <Image
                src="/logo1.jpg"
                alt="Intersnack Cashew Logo"
                width={56}
                height={56}
                className="h-14 w-auto object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">Intersnack Cashew</h2>
              <p className="text-red-100 text-sm font-medium tracking-wide opacity-90">Vietnam</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8 max-w-2xl mt-12">
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] drop-shadow-lg">
              KPIs Management <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-100 to-red-300">
                System
              </span>
            </h1>

            <p className="text-xl text-red-50 leading-relaxed font-light border-l-4 border-red-400/50 pl-6">
              The advanced platform for performance tracking, goal setting, and organizational growth at Vietnam Intersnack Cashew Company.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {[
                "Real-time Analytics",
                "Strategic Goal Setting",
                "Transparent Evaluation",
                "Growth Focused"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-red-900/20 p-4 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors duration-300">
                  <div className="bg-red-500/20 p-2 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-red-200" />
                  </div>
                  <span className="font-medium text-red-50">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-red-200/60 font-medium">
            © {new Date().getFullYear()} Intersnack Cashew Company • Internal Use Only
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="lg:w-[45%] flex items-center justify-center p-8 lg:p-16 bg-gray-50/50 relative">
        <div className="w-full max-w-[420px] bg-white p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 relative z-10 transition-all duration-300 hover:shadow-[0_25px_70px_-12px_rgba(0,0,0,0.15)]">

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-6 text-red-600 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
            <p className="mt-3 text-gray-500 font-medium">Please sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-gray-700 font-semibold ml-1">Email Address</Label>
              <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@intersnack.com.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  required
                  className="h-14 px-5 bg-gray-50 border-gray-200 focus:bg-white focus:border-red-500 focus:ring-red-500/20 rounded-xl text-base transition-all duration-300 placeholder:text-gray-400"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 animate-in fade-in slide-in-from-top-2">
                <AlertDescription className="font-medium flex items-center gap-2">
                  <span className="text-xl">!</span> {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In with SSO</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-8 mt-8 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium px-8 leading-relaxed">
              By accessing the system, you agree to comply with the
              <br />
              <span className="text-gray-600">IT Security Policies</span> of Intersnack Group.
            </p>
            <p className="text-[10px] text-red-500 mt-4 font-mono">Version 01.03</p>
          </div>
        </div>
      </div>
    </div>
  )
}