import Link from 'next/link'
import Image from 'next/image'
import { formatDate, truncate } from '@/lib/utils'
import type { Article } from '@/types'

interface Props {
  article: Article | any
}

export function ArticleCard({ article }: Props) {
  return (
    <Link href={`/articles/${article.slug}`} className="group block">
      {/* Cover image */}
      {article.cover_image && (
        <div className="relative mb-4 overflow-hidden rounded-xl aspect-[16/9] bg-muted">
          <Image
            src={article.cover_image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      {/* Tags */}
      {article.article_tags?.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {article.article_tags.slice(0, 2).map((at: any) => (
            <span
              key={at.tag?.id ?? at.id}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {at.tag?.name ?? at.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
        {article.title}
      </h3>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
          {article.excerpt}
        </p>
      )}

      {/* Meta */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{(article.author as any)?.display_name ?? 'ShoppingVegan'}</span>
        {article.published_at && (
          <>
            <span>·</span>
            <span>{formatDate(article.published_at)}</span>
          </>
        )}
      </div>
    </Link>
  )
}
