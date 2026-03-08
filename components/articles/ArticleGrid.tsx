import { ArticleCard } from './ArticleCard'
import type { Article } from '@/types'

interface Props {
  articles: Article[] | any[]
}

export function ArticleGrid({ articles }: Props) {
  if (!articles.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
        No articles yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}
