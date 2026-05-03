'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface AdPlacement {
  id: string
  name: string
  placement: string
  image_url: string | null
  link_url: string | null
  alt_text: string
  category_id: string | null
  article_id: string | null
  category: { id: string; name: string; slug: string } | null
  article: { id: string; title: string; slug: string } | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  sort_order: number
}

interface Category {
  id: string
  name: string
  slug: string
}

interface Article {
  id: string
  title: string
  slug: string
}

export default function AdPlacementsPage() {
  const [placements, setPlacements] = useState<AdPlacement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [editing, setEditing] = useState<AdPlacement | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '',
    placement: 'category_sidebar',
    link_type: 'banner' as 'banner' | 'article',
    image_url: '',
    link_url: '',
    alt_text: '',
    category_id: '',
    article_id: '',
    is_active: true,
    start_date: '',
    end_date: '',
    sort_order: 0,
  })

  useEffect(() => {
    fetchPlacements()
    fetchCategories()
    fetchArticles()
  }, [])

  async function fetchPlacements() {
    const res = await fetch('/api/admin/ad-placements')
    if (res.ok) setPlacements(await res.json())
  }

  async function fetchCategories() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name')
    setCategories(data ?? [])
  }

  async function fetchArticles() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('articles')
      .select('id, title, slug')
      .eq('status', 'published')
      .order('title')
    setArticles(data ?? [])
  }

  function openCreate() {
    setForm({
      name: '', placement: 'category_sidebar', link_type: 'banner', image_url: '', link_url: '',
      alt_text: '', category_id: '', article_id: '', is_active: true, start_date: '', end_date: '', sort_order: 0,
    })
    setEditing(null)
    setCreating(true)
  }

  function openEdit(p: AdPlacement) {
    setForm({
      name: p.name,
      placement: p.placement,
      link_type: p.article_id ? 'article' : 'banner',
      image_url: p.image_url ?? '',
      link_url: p.link_url ?? '',
      alt_text: p.alt_text,
      category_id: p.category_id ?? '',
      article_id: p.article_id ?? '',
      is_active: p.is_active,
      start_date: p.start_date ? new Date(p.start_date).toISOString().slice(0, 16) : '',
      end_date: p.end_date ? new Date(p.end_date).toISOString().slice(0, 16) : '',
      sort_order: p.sort_order,
    })
    setEditing(p)
    setCreating(true)
  }

  async function handleSave() {
    setSaving(true)
    const isArticle = form.link_type === 'article'
    const payload = {
      name: form.name,
      placement: form.placement,
      image_url: isArticle ? null : form.image_url,
      link_url: isArticle ? null : form.link_url,
      alt_text: isArticle ? '' : form.alt_text,
      category_id: form.category_id || null,
      article_id: isArticle ? (form.article_id || null) : null,
      is_active: form.is_active,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      sort_order: form.sort_order,
    }

    const url = editing ? `/api/admin/ad-placements/${editing.id}` : '/api/admin/ad-placements'
    const method = editing ? 'PATCH' : 'POST'

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    setCreating(false)
    setEditing(null)
    fetchPlacements()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this ad placement?')) return
    await fetch(`/api/admin/ad-placements/${id}`, { method: 'DELETE' })
    fetchPlacements()
  }

  const isBanner = form.link_type === 'banner'
  const canSave = form.name && (isBanner ? (form.image_url && form.link_url) : form.article_id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ad Placements</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Placement
        </button>
      </div>

      {/* Form modal */}
      {creating && (
        <div className="mb-8 rounded-xl border border-border p-6 bg-background">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'New'} Ad Placement</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Bali Body Sidebar Banner"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={form.link_type}
                onChange={(e) => setForm({ ...form, link_type: e.target.value as 'banner' | 'article' })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background"
              >
                <option value="banner">External Banner</option>
                <option value="article">Internal Article</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background"
              >
                <option value="">All pages (no specific category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {isBanner ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Image URL</label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Link URL</label>
                  <input
                    type="text"
                    value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    placeholder="/brands/bali-body or https://..."
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={form.alt_text}
                    onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
                    placeholder="Brand banner description"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Article</label>
                <select
                  value={form.article_id}
                  onChange={(e) => setForm({ ...form, article_id: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background"
                >
                  <option value="">Select an article…</option>
                  {articles.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date (optional)</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date (optional)</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-border"
              />
              <label className="text-sm font-medium">Active</label>
            </div>
          </div>

          {/* Preview */}
          {isBanner && form.image_url && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-1">Preview:</p>
              <div className="w-48 rounded-xl border border-border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt={form.alt_text} className="w-full" />
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
            <button
              onClick={() => { setCreating(false); setEditing(null) }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Placements table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Dates</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {placements.map((p) => (
              <tr key={p.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.image_url} alt="" className="h-10 w-8 rounded border object-cover" />
                    ) : (
                      <div className="flex h-10 w-8 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">Art</div>
                    )}
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.article_id ? (
                    <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">Article</span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">Banner</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.category?.name ?? 'All pages'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.start_date ? new Date(p.start_date).toLocaleDateString() : '—'}
                  {' → '}
                  {p.end_date ? new Date(p.end_date).toLocaleDateString() : '∞'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="rounded p-1.5 hover:bg-muted">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="rounded p-1.5 hover:bg-muted">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {placements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No ad placements yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
