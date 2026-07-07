'use client'

import { useEffect } from 'react'

// Sets the browser tab title while the component is mounted, e.g. "Yondra - Board A".
// On a fresh page load Next's metadata system applies the layout title AFTER hydration,
// which can clobber an imperative set — so we re-assert on the next frame to win.
export function useDocumentTitle(title: string) {
    useEffect(() => {
        if (!title) return
        document.title = title
        const raf = requestAnimationFrame(() => { document.title = title })
        const t = setTimeout(() => { document.title = title }, 60)
        return () => { cancelAnimationFrame(raf); clearTimeout(t) }
    }, [title])
}
