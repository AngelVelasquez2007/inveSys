import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, X } from 'lucide-react'

export default function BarcodeScanner({ onScan, onClose }) {
  const previewRef = useRef(null)
  const scannerRef = useRef(null)
  const [error, setError] = useState('')
  const [iniciado, setIniciado] = useState(false)
  const [escaneando, setEscaneando] = useState(false)

  useEffect(() => {
    let mounted = true

    async function iniciar() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted) return

        const scanner = new Html5Qrcode('scanner-preview')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 300, height: 150 },
            formatsToSupport: [
              0,  // AZTEC
              1,  // CODABAR
              2,  // CODE_39
              3,  // CODE_93
              4,  // CODE_128
              5,  // DATA_MATRIX
              6,  // EAN_8
              7,  // EAN_13
              8,  // ITF
              9,  // MAXICODE
              10, // PDF_417
              11, // QR_CODE
              12, // RSS_14
              13, // RSS_EXPANDED
              14, // UPC_A
              15, // UPC_E
              16, // UPC_EAN_EXTENSION
            ],
          },
          (decodedText) => {
            if (escaneando) return
            setEscaneando(true)
            scanner.pause()
            onScan?.(decodedText)
          },
          () => {},
        )

        setIniciado(true)
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'No se pudo acceder a la cámara. Verifica los permisos.')
        }
      }
    }

    iniciar()

    return () => {
      mounted = false
      if (scannerRef.current) {
        try { scannerRef.current.stop() } catch {}
        try { scannerRef.current.clear() } catch {}
      }
    }
  }, [])

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title">Escanear código de barras</h2>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          {!iniciado && !error && (
            <div style={{ padding: '3rem', color: 'var(--muted)' }}>
              <Camera size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p>Iniciando cámara...</p>
            </div>
          )}
          {error && (
            <div style={{ padding: '2rem', color: 'var(--muted)' }}>
              <CameraOff size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ color: '#dc2626' }}>{error}</p>
              <p style={{ fontSize: '.85rem', marginTop: 8 }}>
                Asegúrate de tener una cámara conectada y permisos concedidos.
              </p>
            </div>
          )}
          <div
            id="scanner-preview"
            ref={previewRef}
            style={{
              width: '100%',
              maxWidth: 400,
              margin: '0 auto',
              display: iniciado ? 'block' : 'none',
            }}
          />
          {escaneando && (
            <p style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 8 }}>
              Código escaneado. Puedes cerrar esta ventana.
            </p>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
