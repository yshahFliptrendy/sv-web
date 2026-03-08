import type { Metadata } from 'next'
import { ArticleSearch } from '@/components/articles/ArticleSearch'

export const metadata: Metadata = {
  title: 'Vegan Articles & Blog',
  description: 'Read the latest vegan news, product guides, recipes, and lifestyle tips.',
}

export default function ArticlesPage() {
  return <ArticleSearch />
}
