'use client'

import * as Icons from 'lucide-react'
import { useState } from 'react'
import styles from './ProductPreviewInline.module.css'

interface ProductPreviewInlineProps {
  product: string
  title: string
  description: string
}

interface Component {
  id: string
  label: string
  path: string
}

const productComponents: Record<string, Component[]> = {
  braaid: [
    { id: 'specifications', label: 'Specifications', path: '/content-types/extended-product/skeld/braaid/specifications.html' },
    { id: 'tasting-notes', label: 'Tasting Notes', path: '/content-types/extended-product/skeld/braaid/tasting-notes.html' },
    { id: 'maker-comments', label: 'Maker Comments', path: '/content-types/extended-product/skeld/braaid/maker-comments.html' },
    { id: 'origin-story', label: 'Origin Story', path: '/content-types/extended-product/skeld/braaid/origin-story.html' },
  ],
  tholtan: [
    { id: 'specifications', label: 'Specifications', path: '/content-types/extended-product/skeld/tholtan/specifications.html' },
    { id: 'tasting-notes', label: 'Tasting Notes', path: '/content-types/extended-product/skeld/tholtan/tasting-notes.html' },
    { id: 'maker-comments', label: 'Maker Comments', path: '/content-types/extended-product/skeld/tholtan/maker-comments.html' },
    { id: 'origin-story', label: 'Origin Story', path: '/content-types/extended-product/skeld/tholtan/origin-story.html' },
  ],
  cashtal: [
    { id: 'specifications', label: 'Specifications', path: '/content-types/extended-product/skeld/cashtal/specifications.html' },
    { id: 'tasting-notes', label: 'Tasting Notes', path: '/content-types/extended-product/skeld/cashtal/tasting-notes.html' },
    { id: 'maker-comments', label: 'Maker Comments', path: '/content-types/extended-product/skeld/cashtal/maker-comments.html' },
    { id: 'origin-story', label: 'Origin Story', path: '/content-types/extended-product/skeld/cashtal/origin-story.html' },
  ],
}

export default function ProductPreviewInline({ product, title, description }: ProductPreviewInlineProps) {
  const [componentContent, setComponentContent] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const [expandedComponents, setExpandedComponents] = useState<Record<string, boolean>>({
    specifications: true,
    'tasting-notes': true,
    'maker-comments': true,
    'origin-story': true,
  })

  const components = productComponents[product] || []

  const loadComponent = async (componentId: string, path: string) => {
    if (componentContent[componentId]) return

    setLoading((prev) => ({ ...prev, [componentId]: true }))
    try {
      const response = await fetch(path)
      if (!response.ok) throw new Error(`Failed to load ${componentId}`)
      const html = await response.text()
      setComponentContent((prev) => ({ ...prev, [componentId]: html }))
    } catch (err) {
      console.error(`Error loading ${componentId}:`, err)
    } finally {
      setLoading((prev) => ({ ...prev, [componentId]: false }))
    }
  }

  const handleCopy = async (componentId: string) => {
    const html = componentContent[componentId]
    if (!html) return

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const contentDiv = doc.querySelector('div')
      let contentToCopy = html

      if (contentDiv) {
        contentToCopy = contentDiv.innerHTML
      }

      await navigator.clipboard.writeText(contentToCopy)
      setCopied((prev) => ({ ...prev, [componentId]: true }))
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [componentId]: false }))
      }, 2000)
    } catch (err) {
      console.error(`Error copying ${componentId}:`, err)
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700 }}>{title}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{description}</p>
        </div>
      </div>

      <div className={styles.preview}>
        {components.map((component) => (
          <div
            key={component.id}
            className={`${styles.componentWrapper} ${expandedComponents[component.id] ? styles.expanded : styles.collapsed}`}
            onMouseEnter={() => loadComponent(component.id, component.path)}
          >
            <div className={styles.componentHeader}>
              <button
                className={styles.headerButton}
                onClick={() =>
                  setExpandedComponents((prev) => ({
                    ...prev,
                    [component.id]: !prev[component.id],
                  }))
                }
              >
                <div className={styles.headerContent}>
                  <Icons.ChevronDown
                    size={20}
                    className={styles.chevron}
                    style={{
                      transform: expandedComponents[component.id] ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}
                  />
                  <span className={styles.componentLabel}>{component.label}</span>
                </div>
              </button>
              <button
                className={`${styles.copyIconBtn} ${copied[component.id] ? styles.copiedSuccess : ''}`}
                onClick={() => handleCopy(component.id)}
                disabled={loading[component.id] || !componentContent[component.id]}
                title="Copy component HTML"
              >
                {copied[component.id] ? (
                  <Icons.Check size={18} />
                ) : (
                  <Icons.Copy size={18} />
                )}
              </button>
            </div>
            {expandedComponents[component.id] && (
              <>
                {loading[component.id] ? (
                  <div className={styles.loading}>Loading {component.label}...</div>
                ) : componentContent[component.id] ? (
                  <div
                    className={styles.componentContent}
                    dangerouslySetInnerHTML={{ __html: componentContent[component.id] }}
                  />
                ) : (
                  <div className={styles.placeholder} onClick={() => loadComponent(component.id, component.path)}>
                    <div className={styles.placeholderText}>{component.label}</div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
