'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackMessage?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallbackMessage?: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-ct-bg text-ct-text font-sans p-6">
          <div className="max-w-md w-full bg-ct-card border border-ct-border rounded-2xl p-8 text-center space-y-5 shadow-xl">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-ct-text">Something went wrong</h2>
              <p className="text-ct-muted text-sm leading-relaxed">
                {this.props.fallbackMessage || 'An unexpected error occurred. Please refresh the page to try again.'}
              </p>
            </div>
            {this.state.error && (
              <div className="bg-ct-input border border-ct-border rounded-xl p-3 text-left">
                <p className="text-[10px] text-ct-muted font-mono break-all leading-relaxed">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all cursor-pointer shadow-md shadow-violet-500/10"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
