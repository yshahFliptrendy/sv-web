'use client'

import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  is_active: boolean
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    const res = await fetch('/api/admin/categories')
    if (res.ok) setCategories(await res.json())
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditValue(cat.description ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveDescription(id: string) {
    setSaving(true)
    await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editValue }),
    })
    setSaving(false)
    setEditingId(null)
    fetchCategories()
  }

  async function toggleActive(cat: Category) {
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, is_active: !cat.is_active } : c))
    )
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cat.is_active }),
    })
    fetchCategories()
  }

  // Group categories: top-level first, then children indented
  const topLevel = categories.filter((c) => !c.parent_id)
  const childrenOf = (parentId: string) => categories.filter((c) => c.parent_id === parentId)

  function renderCategory(cat: Category, depth: number) {
    const children = childrenOf(cat.id)
    const isEditing = editingId === cat.id

    return (
      <div key={cat.id}>
        <div className={`flex items-start gap-3 py-3 px-4 hover:bg-muted/50 ${depth > 0 ? 'border-l-2 border-border' : ''}`} style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{cat.name}</p>
              <button
                onClick={() => toggleActive(cat)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  cat.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
                title={cat.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
              >
                {cat.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
            {isEditing ? (
              <div className="mt-1">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                  placeholder="Enter a 2-3 line description for this category…"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="mt-1 flex gap-1">
                  <button
                    onClick={() => saveDescription(cat.id)}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => startEdit(cat)}
                className="mt-0.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground"
              >
                {cat.description || 'Click to add description…'}
              </p>
            )}
          </div>
        </div>
        {children.map((child) => renderCategory(child, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage category descriptions. These appear as blurbs on category pages for SEO.
          Subcategories without a description will inherit from their parent.
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-background divide-y divide-border">
        {topLevel.map((cat) => renderCategory(cat, 0))}
        {categories.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">
            No categories found.
          </div>
        )}
      </div>
    </div>
  )
}
