import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Scan, X } from 'lucide-react'

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')
  const [iniciado, setIniciado] = useState(false)
  const [escaneando, setEscaneando] = useState(false)
  const [detectorDisponible, setDetectorDisponible] = useState(false)

  useEffect(() => {
    let mounted = true
    let animFrame

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setIniciado(true)

        const tieneDetector = 'BarcodeDetector' in window
        setDetectorDisponible(tieneDetector)

        if (tieneDetector) {
          const detector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39', 'itf', 'qr_code'],
          })
          const video = videoRef.current

          async function detectar() {
            if (!mounted || escaneando) return
            try {
              const barcodes = await detector.detect(video)
              for (const barcode of barcodes) {
                if (barcode.rawValue && barcode.rawValue.length >= 4) {
                  setEscaneando(true)
                  stream.getTracks().forEach(t => t.stop())
                  onScan?.(barcode.rawValue)
                  return
                }
              }
            } catch {}
            if (mounted) animFrame = requestAnimationFrame(detectar)
          }
          animFrame = requestAnimationFrame(detectar)
        }
      } catch (err) {
        if (!mounted) return
        if (err.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Ve a Configuración → Privacidad → Cámara.')
        } else if (err.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara en este dispositivo.')
        } else if (err.name === 'NotReadableError') {
          setError('La cámara está siendo usada por otra aplicación.')
        } else {
          setError(`Error: ${err.message || err}`)
        }
      }
    }

    iniciar()

    return () => {
      mounted = false
      if (animFrame) cancelAnimationFrame(animFrame)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  async function capturarManual() {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream || escaneando) return

    setEscaneando(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39', 'itf', 'qr_code'],
        })
        const barcodes = await detector.detect(canvas)
        for (const barcode of barcodes) {
          if (barcode.rawValue && barcode.rawValue.length >= 4) {
            stream.getTracks().forEach(t => t.stop())
            onScan?.(barcode.rawValue)
            return
          }
        }
      }

      // Si no detectó, preguntar si quiere escribir manual
      const codigo = prompt('Código no detectado. Escribe el código de barras manualmente:')
      if (codigo && codigo.length >= 4) {
        stream.getTracks().forEach(t => t.stop())
        onScan?.(codigo.trim())
        return
      }
      setEscaneando(false)
    } catch {
      setEscaneando(false)
      setError('Error al procesar la imagen.')
    }
  }

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
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              maxWidth: 400,
              margin: '0 auto',
              display: iniciado ? 'block' : 'none',
              borderRadius: 8,
            }}
          />
          {iniciado && !escaneando && (
            <>
              <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: 8 }}>
                {detectorDisponible
                  ? 'Enfoca un código de barras EAN-13'
                  : 'Escáner automático no disponible'}
              </p>
              {!detectorDisponible && (
                <p style={{ fontSize: '.85rem', marginTop: 4, color: '#ea580c' }}>
                  Usa un escáner USB o escribe el código manualmente.
                </p>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={capturarManual}
                style={{ marginTop: 12 }}
              >
                <Scan size={16} style={{ marginRight: 6 }} />
                Capturar y detectar
              </button>
            </>
          )}
          {escaneando && (
            <p style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 8 }}>
              Código escaneado
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
