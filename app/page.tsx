'use client'

import AppLayout, { navSections } from '@/components/AppLayout'
import ProductPreviewInline from '@/components/ProductPreviewInline'
import SnippetViewer from '@/components/SnippetViewer'
import { useState } from 'react'

interface Product {
  id: string
  name: string
  brand: string
}

const products: Product[] = [
  { id: 'braaid', name: 'Braaid', brand: 'SKëLD' },
  { id: 'tholtan', name: 'Tholtan', brand: 'SKëLD' },
]

const contentDescriptions: Record<string, { title: string; description: string }> = {
  'announcements-main': {
    title: 'Announcements Main Page',
    description: 'Dynamic announcement pages with color-coded banners, responsive design, and anchor navigation.',
  },
  'product-braaid': {
    title: 'SKëLD - Braaid',
    description: 'View and manage all components for this product',
  },
  'product-tholtan': {
    title: 'SKëLD - Tholtan',
    description: 'View and manage all components for this product',
  },
  'product-cashtal': {
    title: 'SKëLD - Cashtal',
    description: 'View and manage all components for this product',
  },
}

export default function Home() {
  const [activeItem, setActiveItem] = useState<string>('announcements-main')

  // Find the nav item from navSections
  let navItem = null
  for (const section of navSections) {
    const found = section.items.find((item) => item.id === activeItem)
    if (found) {
      navItem = {
        type: found.type,
        view: found.view,
        template: found.template,
      }
      break
    }
  }

  const desc = contentDescriptions[activeItem]

  if (!navItem || !desc) {
    return null
  }

  // Show product preview for product items
  if (navItem.view === 'product-preview') {
    return (
      <AppLayout activeItem={activeItem} onNavClick={setActiveItem}>
        <ProductPreviewInline product={navItem.template} title={desc.title} description={desc.description} />
      </AppLayout>
    )
  }

  // Show snippet viewer for announcements
  return (
    <AppLayout activeItem={activeItem} onNavClick={setActiveItem}>
      <SnippetViewer
        contentType={navItem.type}
        view={navItem.view}
        template={navItem.template}
        title={desc.title}
        description={desc.description}
      />
    </AppLayout>
  )
}
