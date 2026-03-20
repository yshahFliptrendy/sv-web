import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WishlistProvider } from '@/components/common/WishlistProvider'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WishlistProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </WishlistProvider>
  )
}
