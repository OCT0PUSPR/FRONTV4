"use client"

import type React from "react"

import { useState } from "react"
import { Mail, Lock, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>
  isLoading: boolean
}

export default function SignInForm({ onSubmit, isLoading }: SignInFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    try {
      await onSubmit(email, password)
    } catch (err) {
      setError("Sign in failed. Please try again.")
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo and Title */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">WMS</h1>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
        <p className="text-slate-600">Warehouse Management System</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-900">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-900">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 border-slate-200 focus:border-purple-500 focus:ring-purple-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {/* Sign In Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>

        {/* Forgot Password Link */}
        <div className="text-center">
          <a href="#" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Forgot password?
          </a>
        </div>
      </form>

      {/* Sign Up Link */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <p className="text-slate-600 text-sm">
          Don't have an account?{" "}
          <a href="/signup" className="font-semibold text-slate-900 hover:text-purple-600 transition-colors">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}
