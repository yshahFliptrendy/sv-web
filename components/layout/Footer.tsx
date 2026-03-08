import Link from 'next/link'
import { Leaf } from 'lucide-react'

const FOOTER_LINKS = {
  Shop: [
    { href: '/products', label: 'All Products' },
    { href: '/brands', label: 'Brands' },
    { href: '/ingredients', label: 'Ingredients' },
    { href: '/categories/food', label: 'Food & Drink' },
    { href: '/categories/beauty', label: 'Beauty' },
    { href: '/categories/home', label: 'Home' },
  ],
  Discover: [
    { href: '/articles', label: 'Blog' },
    { href: '/forum', label: 'Community' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/affiliate-disclosure', label: 'Affiliate Disclosure' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted mt-auto">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-primary">
              <Leaf className="h-5 w-5" />
              ShoppingVegan
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Discover the best vegan products from ethical brands. US-focused,
              cruelty-free, and planet-friendly.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {section}
              </h3>
              <ul className="space-y-2">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ShoppingVegan. All rights reserved.</p>
          <p>
            ShoppingVegan may earn a commission from qualifying purchases via affiliate links.
          </p>
        </div>
      </div>
    </footer>
  )
}
