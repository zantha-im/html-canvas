'use client'

import * as Icons from 'lucide-react'
import { useEffect, useState } from 'react'
import styles from './SnippetViewer.module.css'

interface SnippetViewerProps {
  contentType: 'announcements' | 'extended-product'
  view: 'main' | 'template' | 'product'
  template?: string
  title: string
  description: string
}

export default function SnippetViewer({
  contentType,
  view,
  template,
  title,
  description,
}: SnippetViewerProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'rendered' | 'html'>('rendered')

  useEffect(() => {
    const loadSnippet = async () => {
      try {
        setLoading(true)
        setError(null)

        let filePath: string
        if (view === 'main') {
          filePath = `/content-types/${contentType}/page.html`
        } else if (view === 'product') {
          filePath = `/content-types/${contentType}/${template}.html`
        } else {
          filePath = `/content-types/${contentType}/templates/${template}.html`
        }

        const response = await fetch(filePath)
        if (!response.ok) {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`
          const detailedError = `Failed to load snippet from "${filePath}". ${errorMsg}`
          console.error(detailedError)
          throw new Error(detailedError)
        }

        const html = await response.text()
        if (!html || html.trim().length === 0) {
          const emptyError = `File at "${filePath}" is empty or contains no content`
          console.error(emptyError)
          throw new Error(emptyError)
        }

        setCode(html)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while loading snippet'
        console.error('SnippetViewer error:', { error: err, contentType, view, template })
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadSnippet()
  }, [contentType, view, template])

  const handleCopy = async () => {
    try {
      // Extract inner content only (skip the details wrapper and summary)
      const parser = new DOMParser()
      const doc = parser.parseFromString(code, 'text/html')
      
      // Get the content div inside details (skip the summary/header)
      const detailsElement = doc.querySelector('details')
      let contentToCopy = code
      
      if (detailsElement) {
        // Find the content div (first div after summary)
        const contentDiv = detailsElement.querySelector('details > div')
        if (contentDiv) {
          contentToCopy = contentDiv.innerHTML
        }
      }
      
      await navigator.clipboard.writeText(contentToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy to clipboard'
      console.error('Copy to clipboard failed:', { error: err })
      setError(`Copy failed: ${errorMessage}`)
      setTimeout(() => setError(null), 3000)
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

      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`${styles.viewToggle} ${viewMode === 'rendered' ? styles.active : ''}`}
              onClick={() => setViewMode('rendered')}
              disabled={loading || !!error}
            >
              <Icons.Eye size={16} />
              Rendered
            </button>
            <button
              className={`${styles.viewToggle} ${viewMode === 'html' ? styles.active : ''}`}
              onClick={() => setViewMode('html')}
              disabled={loading || !!error}
            >
              <Icons.Code size={16} />
              HTML
            </button>
          </div>
          <button
            className={`${styles.copyBtn} ${copied ? styles.success : ''}`}
            onClick={handleCopy}
            disabled={loading || !!error}
          >
            {copied ? (
              <>
                <Icons.Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Icons.Copy size={16} />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>

        <div className={styles.container}>
          {loading && <div className={styles.loading}>Loading snippet...</div>}
          {error && (
            <div className={styles.error}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Icons.AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Error loading snippet</strong>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', lineHeight: '1.5' }}>{error}</p>
                </div>
              </div>
            </div>
          )}
          {!loading && !error && viewMode === 'rendered' && (
            <div
              className={styles.renderedView}
              dangerouslySetInnerHTML={{ __html: code }}
            />
          )}
          {!loading && !error && viewMode === 'html' && (
            <div className={styles.codeBlock}>
              <pre>
                <code>{code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
