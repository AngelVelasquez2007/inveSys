import { useEffect, useRef, useCallback } from 'react'

const SCANNER_INTERVAL_MS = 100
const SCANNER_TIMEOUT_MS = 300

export function useBarcodeScanner({ onScan, enabled = true } = {}) {
  const bufferRef = useRef([])
  const lastKeyTimeRef = useRef(0)
  const timeoutRef = useRef(null)

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return
    if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt') return

    const now = Date.now()
    const elapsed = now - lastKeyTimeRef.current

    if (elapsed > SCANNER_TIMEOUT_MS) {
      bufferRef.current = []
    }

    lastKeyTimeRef.current = now

    if (event.key === 'Enter') {
      const code = bufferRef.current.join('')
      if (code.length >= 4 && elapsed <= SCANNER_TIMEOUT_MS) {
        event.preventDefault()
        onScan?.(code)
      }
      bufferRef.current = []
      return
    }

    if (event.key.length === 1) {
      if (elapsed <= SCANNER_INTERVAL_MS || bufferRef.current.length === 0) {
        bufferRef.current.push(event.key)
      } else {
        bufferRef.current = [event.key]
      }
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      bufferRef.current = []
    }, SCANNER_TIMEOUT_MS)
  }, [onScan, enabled])

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [handleKeyDown, enabled])

  return null
}
