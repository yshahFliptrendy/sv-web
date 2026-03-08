'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { slugify } from '@/lib/utils'
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Link2, Image as ImageIcon, ExternalLink,
  X, ChevronUp, ChevronDown, Trash2, Eye,
} from 'lucide-react'

type Status = 'draft' | 'published' | 'scheduled'

interface Tag { id: string; slug: string; name: string }
interface Product { id: string; name: string; brand: { name: string } | null }
interface EmbeddedProduct extends Product { sort_order: number }

interface ArticleData {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_image: string | null
  status: Status
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  article_tags: { tag: Tag }[]
  article_products: { product_id: string; sort_order: number; product: Product }[]
}

interface Props {
  mode: 'create' | 'edit'
  article?: ArticleData
  availableTags: Tag[]
  availableProducts: Product[]
}

export function ArticleEditor({ mode, article, availableTags, availableProducts }: Props) {
  const router = useRouter()
  const slugEditedManually = useRef(false)

  // ─── Form state ───────────────────────────────────────────────────────────
  const [title, setTitle] = useState(article?.title ?? '')
  const [slug, setSlug] = useState(article?.slug ?? '')
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '')
  const [coverImage, setCoverImage] = useState(article?.cover_image ?? '')
  const [status, setStatus] = useState<Status>(article?.status ?? 'draft')
  const [publishedAt, setPublishedAt] = useState(
    article?.published_at
      ? new Date(article.published_at).toISOString().slice(0, 16) // datetime-local format
      : ''
  )
  const [seoTitle, setSeoTitle] = useState(article?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(article?.seo_description ?? '')
  const [tags, setTags] = useState<string[]>(
    article?.article_tags?.map((at) => at.tag.name) ?? []
  )
  const [tagInput, setTagInput] = useState('')
  const [embeddedProducts, setEmbeddedProducts] = useState<EmbeddedProduct[]>(
    article?.article_products
      ?.sort((a, b) => a.sort_order - b.sort_order)
      .map((ap) => ({ ...ap.product, sort_order: ap.sort_order })) ?? []
  )
  const [productSearch, setProductSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // ─── Tiptap editor ────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: article?.body ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none min-h-[400px] focus:outline-none px-4 py-3',
      },
    },
  })

  // ─── Auto-slug from title ─────────────────────────────────────────────────
  useEffect(() => {
    if (!slugEditedManually.current && title) {
      setSlug(slugify(title))
    }
  }, [title])

  // ─── Auto-fill SEO fields ─────────────────────────────────────────────────
  useEffect(() => {
    if (!seoTitle && title) setSeoTitle(title.slice(0, 60))
  }, [title])

  useEffect(() => {
    if (!seoDescription && excerpt) setSeoDescription(excerpt.slice(0, 160))
  }, [excerpt])

  // ─── Tags ─────────────────────────────────────────────────────────────────
  const suggestedTags = tagInput
    ? availableTags.filter(
        (t) =>
          t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(t.name)
      )
    : []

  function addTag(name: string) {
    const trimmed = name.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  function removeTag(name: string) {
    setTags(tags.filter((t) => t !== name))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  // ─── Embedded products ────────────────────────────────────────────────────
  const filteredProducts = productSearch
    ? availableProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.brand as any)?.name?.toLowerCase().includes(productSearch.toLowerCase())
      )
    : []

  function addProduct(product: Product) {
    if (!embeddedProducts.find((p) => p.id === product.id)) {
      setEmbeddedProducts([...embeddedProducts, { ...product, sort_order: embeddedProducts.length }])
    }
    setProductSearch('')
  }

  function removeProduct(id: string) {
    setEmbeddedProducts(embeddedProducts.filter((p) => p.id !== id))
  }

  function moveProduct(index: number, direction: 'up' | 'down') {
    const newList = [...embeddedProducts]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= newList.length) return
    ;[newList[index], newList[swap]] = [newList[swap], newList[index]]
    setEmbeddedProducts(newList.map((p, i) => ({ ...p, sort_order: i })))
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    const payload = {
      title,
      slug,
      excerpt,
      html_body: editor?.getHTML() ?? '',
      cover_image: coverImage,
      status,
      published_at: status === 'scheduled' ? new Date(publishedAt).toISOString() : undefined,
      seo_title: seoTitle,
      seo_description: seoDescription,
      tag_names: tags,
      embedded_product_ids: embeddedProducts.map((p) => p.id),
    }

    const url = mode === 'edit' ? `/api/admin/articles/${article!.id}` : '/api/admin/articles'
    const method = mode === 'edit' ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    setSaving(false)
    if (!res.ok) {
      setSaveError(data.error ?? 'Failed to save')
      return
    }

    if (mode === 'create') {
      router.push(`/admin/articles/${data.id}/edit`)
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    const res = await fetch(`/api/admin/articles/${article!.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/articles')
  }

  // ─── Link helper ──────────────────────────────────────────────────────────
  function setLink() {
    const url = window.prompt('URL')
    if (!url) return
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    editor?.chain().focus().setLink({ href }).run()
  }

  // ─── Image helper ─────────────────────────────────────────────────────────
  function insertImage() {
    const url = window.prompt('Image URL')
    if (url) editor?.chain().focus().setImage({ src: url }).run()
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shoppingvegan.com'
  // In edit mode: show preview immediately. In create mode: only after saving (article exists in DB).
  const previewUrl = mode === 'edit' && slug ? `/articles/${slug}?preview=1` : null

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title…"
          className="w-full text-3xl font-bold border-0 border-b border-border bg-transparent pb-3 focus:outline-none focus:border-primary placeholder:text-muted-foreground"
        />

        {/* Rich text editor */}
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted p-2">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive('bold')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive('italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive('bulletList')}
              title="Bullet list"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive('orderedList')}
              title="Ordered list"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive('blockquote')}
              title="Blockquote"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="Divider"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>
            <div className="w-px h-5 bg-border mx-1" />
            <ToolbarButton onClick={setLink} active={editor?.isActive('link')} title="Link">
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertImage} title="Image">
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Editor area */}
          <EditorContent editor={editor} className="bg-background" />
        </div>

        {/* Excerpt */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Excerpt</label>
            <span className={`text-xs ${excerpt.length > 300 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {excerpt.length}/300
            </span>
          </div>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short summary shown on article cards and in meta description…"
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
      </div>

      {/* ── Right: Sidebar ────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 space-y-4">

        {/* Publish panel */}
        <SidebarPanel title="Publish">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {status === 'scheduled' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
            )}

            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : status === 'scheduled' ? 'Schedule' : status === 'published' ? 'Publish' : 'Save Draft'}
            </button>

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Eye className="h-4 w-4" />
                Preview
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}

            {mode === 'edit' && (
              <>
                {deleteConfirm ? (
                  <div className="space-y-2">
                    <p className="text-xs text-destructive font-medium">Are you sure?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        className="flex-1 rounded-lg bg-destructive py-1.5 text-xs font-semibold text-white hover:bg-destructive/90"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-destructive/30 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Article
                  </button>
                )}
              </>
            )}
          </div>
        </SidebarPanel>

        {/* SEO panel */}
        <SidebarPanel title="SEO">
          <div className="space-y-3">
            {/* Slug */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  slugEditedManually.current = true
                  setSlug(e.target.value)
                }}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {appUrl}/articles/{slug || '…'}
              </p>
            </div>

            {/* SEO Title */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SEO Title</label>
                <span className={`text-xs ${seoTitle.length > 60 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {seoTitle.length}/60
                </span>
              </div>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta Description</label>
                <span className={`text-xs ${seoDescription.length > 160 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {seoDescription.length}/160
                </span>
              </div>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Google SERP Preview */}
            <div className="rounded-lg border border-border bg-white p-3 text-xs">
              <p className="text-[#1558D6] font-medium leading-snug line-clamp-1">
                {seoTitle || title || 'Article Title'}
              </p>
              <p className="text-[#006621] text-[11px] mt-0.5 truncate">
                {appUrl}/articles/{slug || 'article-slug'}
              </p>
              <p className="text-[#4D5156] mt-1 leading-snug line-clamp-2">
                {seoDescription || excerpt || 'Meta description will appear here…'}
              </p>
            </div>
          </div>
        </SidebarPanel>

        {/* Cover Image panel */}
        <SidebarPanel title="Cover Image">
          <div className="space-y-2">
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {coverImage && (
              <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>
        </SidebarPanel>

        {/* Tags panel */}
        <SidebarPanel title="Tags">
          <div className="space-y-2">
            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-primary/60">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input */}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag, press Enter…"
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {suggestedTags.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-border bg-background shadow-lg">
                  {suggestedTags.slice(0, 5).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag.name)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SidebarPanel>

        {/* Embedded Products panel */}
        <SidebarPanel title="Embedded Products">
          <div className="space-y-2">
            {/* Selected products */}
            {embeddedProducts.length > 0 && (
              <div className="space-y-1">
                {embeddedProducts.map((product, i) => (
                  <div key={product.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                    <div className="flex flex-col gap-0">
                      <button
                        onClick={() => moveProduct(i, 'up')}
                        disabled={i === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveProduct(i, 'down')}
                        disabled={i === embeddedProducts.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{(product.brand as any)?.name}</p>
                    </div>
                    <button onClick={() => removeProduct(product.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Product search */}
            <div className="relative">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                  {filteredProducts.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <p className="text-xs font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{(p.brand as any)?.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SidebarPanel>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-muted px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/80"
      >
        {title}
        <ChevronUp className={`h-3.5 w-3.5 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors
        ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
    >
      {children}
    </button>
  )
}
