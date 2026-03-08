'use client'

import { useState } from 'react'
import { Leaf } from 'lucide-react'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message ?? 'Subscribed!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="rounded-2xl bg-primary/5 border border-primary/20 px-8 py-12 text-center">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
        <Leaf className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-2xl font-bold">Stay in the loop</h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        Get the latest vegan product discoveries, brand spotlights, and exclusive deals
        delivered to your inbox.
      </p>

      {status === 'success' ? (
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-6 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p className="mt-3 text-sm text-destructive">{message}</p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  )
}
