'use client'

import * as Icons from 'lucide-react'
import { useState, type PropsWithChildren, type ReactElement } from 'react'
import styles from './AppLayout.module.css'

export interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  type: 'announcements' | 'extended-product'
  view: 'main' | 'template'
  template?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    title: 'Announcements',
    items: [
      {
        id: 'announcements-main',
        label: 'Preview Main Page',
        icon: <Icons.FileText size={16} />,
        type: 'announcements',
        view: 'main',
      },
    ],
  },
  {
    title: 'Extended Products',
    items: [
      {
        id: 'product-braaid',
        label: 'SKëLD - Braaid',
        icon: <Icons.Package size={16} />,
        type: 'extended-product',
        view: 'product-preview',
        template: 'braaid',
      },
      {
        id: 'product-tholtan',
        label: 'SKëLD - Tholtan',
        icon: <Icons.Package size={16} />,
        type: 'extended-product',
        view: 'product-preview',
        template: 'tholtan',
      },
      {
        id: 'product-cashtal',
        label: 'SKëLD - Cashtal',
        icon: <Icons.Package size={16} />,
        type: 'extended-product',
        view: 'product-preview',
        template: 'cashtal',
      },
    ],
  },
]

interface AppLayoutProps extends PropsWithChildren {
  activeItem?: string
  onNavClick?: (itemId: string) => void
}

export default function AppLayout({ children, activeItem = 'announcements-main', onNavClick }: AppLayoutProps): ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNavClick = (itemId: string) => {
    onNavClick?.(itemId)
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <button
          className={styles.toggleBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <Icons.X size={24} /> : <Icons.Menu size={24} />}
        </button>
        <div className={styles.headerInfo}>
          <img src="/site-icon.png" alt="HTML Canvas" className={styles.logo} width={32} height={32} />
          <h1>HTML Canvas</h1>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <nav className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarHeader}>
            <h2>Content Types</h2>
          </div>

          <div className={styles.navContent}>
            {navSections.map((section) => (
              <div key={section.title} className={styles.navSection}>
                <div className={styles.navSectionTitle}>{section.title}</div>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    className={`${styles.navItem} ${activeItem === item.id ? styles.active : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.navFooter} />

          <div className={styles.sidebarFooter}>
            v1.0 •{' '}
            <a href="https://github.com/zantha-im/html-canvas" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
        </nav>

        <main className={styles.main}>
          <div className={styles.mainContent}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
