import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'ShoppingVegan — Discover Vegan Products',
    template: '%s | ShoppingVegan',
  },
  description: 'Discover the best vegan products, brands, and ingredients. Your one-stop shop for ethical, plant-based living.',
  keywords: ['vegan', 'vegan products', 'plant-based', 'cruelty-free', 'vegan shopping'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://shoppingvegan.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ShoppingVegan',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Skimlinks — auto-monetizes outbound links */}
        {process.env.NEXT_PUBLIC_SKIMLINKS_PUBLISHER_ID && (
          <Script
            src={`https://s.skimresources.com/js/${process.env.NEXT_PUBLIC_SKIMLINKS_PUBLISHER_ID}X.skimlinks.js`}
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className={`${geist.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
