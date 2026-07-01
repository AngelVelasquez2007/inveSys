export function formatearCOP(valor) {
  return Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
}

export function imprimirRecibo({ empresa, sucursal, ordenId, fecha, cajero, cliente, items, subtotal, descuento, total, efectivo, cambio }) {
  const now = new Date(fecha)
  const fechaStr = now.toLocaleDateString('es-CO')
  const horaStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  const itemsHtml = items.map(i => `
    <tr>
      <td style="text-align:center">${i.cantidad}</td>
      <td>${i.nombre}</td>
      <td style="text-align:right">${formatearCOP(i.precio)}</td>
    </tr>
  `).join('')

  const descuentoRow = descuento > 0
    ? `<tr><td colspan="2" style="text-align:right;padding-top:6px">Descuento</td><td style="text-align:right;padding-top:6px;color:#c00">-${formatearCOP(descuento)}</td></tr>`
    : ''

  const win = window.open('', '_blank', 'width=380,height=600,menubar=no,toolbar=no,location=no')
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Recibo #${ordenId}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; width: 80mm; }
  body { padding: 8px 12px; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 2px; }
  .suc { text-align: center; font-size: 10px; margin-bottom: 8px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .info { font-size: 11px; line-height: 1.5; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { border-bottom: 1px solid #000; padding: 4px 0; text-align: left; font-size: 10px; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 2px 0; }
  .total-row td { font-weight: bold; }
  .thanks { text-align: center; margin-top: 12px; font-size: 11px; }
  .footer { text-align: center; margin-top: 4px; font-size: 9px; color: #666; }
  .efectivo-row td { padding-top: 4px; }
  @media print {
    body { padding: 6px 10px; }
  }
</style>
</head>
<body>
  <h1>${empresa}</h1>
  ${sucursal ? `<div class="suc">${sucursal}</div>` : ''}
  <hr>
  <div class="info">
    <b>Recibo:</b> #${String(ordenId).padStart(6, '0')}<br>
    <b>Fecha:</b> ${fechaStr} ${horaStr}<br>
    <b>Cajero:</b> ${cajero}<br>
    <b>Cliente:</b> ${cliente}
  </div>
  <hr>
  <table>
    <thead>
      <tr><th style="width:30px">Cant</th><th>Producto</th><th style="width:80px">Precio</th></tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <hr>
  <table>
    <tr><td style="text-align:right">Subtotal</td><td style="text-align:right">${formatearCOP(subtotal)}</td></tr>
    ${descuentoRow}
    <tr class="total-row"><td style="text-align:right;padding-top:6px;font-size:13px">TOTAL</td><td style="text-align:right;padding-top:6px;font-size:13px">${formatearCOP(total)}</td></tr>
    ${efectivo ? `<tr class="efectivo-row"><td style="text-align:right">Efectivo</td><td style="text-align:right">${formatearCOP(efectivo)}</td></tr>` : ''}
    ${cambio > 0 ? `<tr><td style="text-align:right">Cambio</td><td style="text-align:right">${formatearCOP(cambio)}</td></tr>` : ''}
  </table>
  <hr>
  <div class="thanks">¡Gracias por su compra!</div>
  <div class="footer">InveSys - Punto de Venta</div>
  <script>
    window.onload = function() { window.print(); window.close(); }
  <\\/script>
</body>
</html>`)

  win.document.close()
}
