from datetime import datetime
from io import BytesIO

from fpdf import FPDF

from .database import get_conn


def query_all(sql, params=()):
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(sql, params)
      return cur.fetchall()


def query_one(sql, params=()):
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(sql, params)
      return cur.fetchone()


class ReportePDF(FPDF):
  def header(self):
    self.set_font('Helvetica', 'B', 16)
    self.set_text_color(37, 99, 235)
    self.cell(0, 10, 'InveSys - Sistema de Gestion de Inventario', align='C', new_x='LMARGIN', new_y='NEXT')
    self.set_draw_color(37, 99, 235)
    self.line(10, self.get_y(), 200, self.get_y())
    self.ln(4)

  def footer(self):
    self.set_y(-15)
    self.set_font('Helvetica', 'I', 8)
    self.set_text_color(100, 116, 139)
    self.cell(0, 10, f'Pagina {self.page_no()}/{{nb}} | Generado: {datetime.now().strftime("%d/%m/%Y %H:%M")}', align='C')

  def section_title(self, title):
    self.set_font('Helvetica', 'B', 12)
    self.set_text_color(15, 23, 42)
    self.set_fill_color(240, 244, 248)
    self.cell(0, 8, f'  {title}', fill=True, new_x='LMARGIN', new_y='NEXT')
    self.ln(2)

  def table(self, headers, rows, col_widths=None):
    if not rows:
      self.set_font('Helvetica', 'I', 9)
      self.set_text_color(100, 116, 139)
      self.cell(0, 6, '  Sin datos', new_x='LMARGIN', new_y='NEXT')
      self.ln(2)
      return

    if col_widths is None:
      col_widths = [190 / len(headers)] * len(headers)

    self.set_font('Helvetica', 'B', 8)
    self.set_fill_color(37, 99, 235)
    self.set_text_color(255, 255, 255)
    for i, h in enumerate(headers):
      self.cell(col_widths[i], 6, h, border=1, fill=True, align='C')
    self.ln()

    self.set_font('Helvetica', '', 8)
    self.set_text_color(15, 23, 42)
    fill = False
    for row in rows:
      if self.get_y() > 265:
        self.add_page()
        self.set_font('Helvetica', 'B', 8)
        self.set_fill_color(37, 99, 235)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
          self.cell(col_widths[i], 6, h, border=1, fill=True, align='C')
        self.ln()
        self.set_font('Helvetica', '', 8)
        self.set_text_color(15, 23, 42)

      if fill:
        self.set_fill_color(248, 250, 252)
      else:
        self.set_fill_color(255, 255, 255)

      for i, val in enumerate(row):
        align = 'R' if i > 0 else 'L'
        self.cell(col_widths[i], 5, str(val), border=1, fill=True, align=align)
      self.ln()
      fill = not fill
    self.ln(3)


def generar_pdf(fecha_inicio: str, fecha_fin: str, usuario: str) -> bytes:
  params = (fecha_inicio, fecha_fin)

  inventario = query_all('''
    select p.sku, p.nombre, p.stock_actual, p.stock_minimo, c.nombre as categoria,
           case when p.stock_actual <= p.stock_minimo then '*** BAJO ***' else '' end as alerta
    from productos p
    join categorias c on c.id = p.categoria_id
    where p.activo
    order by p.nombre
  ''')

  resumen_ventas = query_one('''
    select count(*) as total_ventas, coalesce(sum(total), 0) as total_ingresos,
           coalesce(avg(total), 0) as ticket_promedio
    from ordenes_venta
    where estado != 'ANULADA'
      and fecha::date >= %s::date and fecha::date <= %s::date
  ''', params)

  ventas_por_dia = query_all('''
    select fecha::date as dia, count(*) as num_ventas, coalesce(sum(total), 0) as ingresos
    from ordenes_venta
    where estado != 'ANULADA'
      and fecha::date >= %s::date and fecha::date <= %s::date
    group by fecha::date
    order by dia
  ''', params)

  ranking_productos = query_all('''
    select p.sku, p.nombre, sum(oi.cantidad) as unidades_vendidas,
           count(distinct oi.orden_id) as veces_vendido,
           coalesce(sum(oi.subtotal), 0) as total_generado
    from orden_items oi
    join productos p on p.id = oi.producto_id
    join ordenes_venta ov on ov.id = oi.orden_id
    where ov.estado != 'ANULADA'
      and ov.fecha::date >= %s::date and ov.fecha::date <= %s::date
    group by p.id, p.sku, p.nombre
    order by unidades_vendidas desc
  ''', params)

  ventas_por_usuario = query_all('''
    select coalesce(u.nombre, 'Sistema') as usuario,
           count(distinct ov.id) as num_ventas,
           coalesce(sum(ov.total), 0) as total_ventas
    from ordenes_venta ov
    left join usuarios u on u.id = ov.usuario_id
    where ov.estado != 'ANULADA'
      and ov.fecha::date >= %s::date and ov.fecha::date <= %s::date
    group by u.nombre
    order by num_ventas desc
  ''', params)

  pdf = ReportePDF()
  pdf.alias_nb_pages()
  pdf.set_auto_page_break(auto=True, margin=20)
  pdf.add_page()

  # --- Subtítulo ---
  pdf.set_font('Helvetica', '', 9)
  pdf.set_text_color(100, 116, 139)
  pdf.cell(0, 5, f'Reporte del: {fecha_inicio}  al: {fecha_fin}', new_x='LMARGIN', new_y='NEXT')
  pdf.cell(0, 5, f'Generado por: {usuario}', new_x='LMARGIN', new_y='NEXT')
  pdf.ln(6)

  # --- 1. Inventario actual ---
  pdf.section_title('1. Inventario actual de productos')
  pdf.table(
    ['SKU', 'Producto', 'Categoria', 'Stock actual', 'Stock minimo', 'Alerta'],
    [(r['sku'], r['nombre'], r['categoria'], str(r['stock_actual']), str(r['stock_minimo']), r['alerta']) for r in inventario],
    [22, 50, 35, 28, 28, 27],
  )

  # --- 2. Resumen de ventas ---
  pdf.section_title('2. Resumen de ventas')
  rv = resumen_ventas
  pdf.table(
    ['Indicador', 'Valor'],
    [('Total de ventas', str(rv['total_ventas'])), ('Total ingresos', f'${rv["total_ingresos"]:,.0f}'), ('Ticket promedio', f'${rv["ticket_promedio"]:,.0f}')],
    [95, 95],
  )

  # --- 3. Ventas por día ---
  pdf.section_title('3. Ventas por dia')
  pdf.table(
    ['Fecha', 'Numero de ventas', 'Ingresos'],
    [(r['dia'].strftime('%d/%m/%Y'), str(r['num_ventas']), f'${r["ingresos"]:,.0f}') for r in ventas_por_dia],
    [60, 60, 70],
  )

  # --- 4. Ranking de productos ---
  pdf.section_title('4. Ranking de productos mas vendidos')
  pdf.table(
    ['SKU', 'Producto', 'Unidades vend.', 'Veces vendido', 'Total generado'],
    [(r['sku'], r['nombre'], str(r['unidades_vendidas']), str(r['veces_vendido']), f'${r["total_generado"]:,.0f}') for r in ranking_productos],
    [22, 56, 30, 30, 52],
  )

  # --- 5. Ventas por usuario ---
  pdf.section_title('5. Ventas por usuario')
  pdf.table(
    ['Usuario', 'Numero de ventas', 'Total ventas'],
    [(r['usuario'], str(r['num_ventas']), f'${r["total_ventas"]:,.0f}') for r in ventas_por_usuario],
    [70, 60, 60],
  )

  # --- 6. Resumen de movimientos ---
  movimientos = query_all('''
    select tipo, count(*) as cantidad, coalesce(sum(cantidad), 0) as total_unidades
    from movimientos_inventario
    where created_at::date >= %s::date and created_at::date <= %s::date
      and tipo in ('ENTRADA', 'SALIDA')
    group by tipo
    order by tipo
  ''', params)

  pdf.section_title('6. Movimientos de inventario')
  pdf.table(
    ['Tipo', 'Cantidad de movimientos', 'Total unidades'],
    [(r['tipo'], str(r['cantidad']), str(r['total_unidades'])) for r in movimientos],
    [65, 65, 60],
  )

  buffer = BytesIO()
  pdf.output(buffer)
  buffer.seek(0)
  return buffer.getvalue()
