'use client'

import { useMemo } from 'react'
import DOMPurify from 'dompurify'

// Renders stored rich-text HTML (comments, read views) safely.
export default function RichTextContent({ html, className }: { html: string; className?: string }) {
    const clean = useMemo(() => DOMPurify.sanitize(html ?? '', {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 's', 'u', 'code', 'pre',
            'h1', 'h2', 'h3', 'h4', 'blockquote', 'hr',
            'ul', 'ol', 'li', 'a', 'img', 'span',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'data-type', 'data-id', 'data-label', 'colspan', 'rowspan', 'checked'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    }), [html])

    return <div className={`rich-content ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: clean }} />
}
