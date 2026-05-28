'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Viaje {
  id: string;
  origen?: string;
  destino?: string;
  kilometros: number;
  peso_carga: number;
  tipo_ruta?: string;
  terreno?: string;
  precio_combustible?: number;
  litros_totales: number;
  litros_reales?: number;
  consumo_real?: number;
  costo_total: number;
  costo_por_km: number;
  porcentaje_carga?: number;
  flete_cobrado?: number;
  factor_peso?: number;
  factor_ruta?: number;
  factor_terreno?: number;
  descripcion_ia?: string;
  created_at: string;
  camiones?: { patente: string; marca: string; modelo: string; capacidad_max_ton?: number };
}

interface EditForm {
  origen: string;
  destino: string;
  litros_reales: string;
}

const RUTA_LABEL: Record<string, string> = { autopista: 'Autopista', mixta: 'Mixta', urbana: 'Urbana' };
const TERRENO_LABEL: Record<string, string> = { plano: 'Plano', ondulado: 'Ondulado', montanoso: 'Montañoso' };
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatMes(ym: string) {
  const [y, m] = ym.split('-');
  return `${MESES_ES[parseInt(m) - 1]} ${y}`;
}

export default function HistorialClient({ viajes: initViajes, email, empresa }: { viajes: Viaje[]; email: string; empresa: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viajes, setViajes] = useState<Viaje[]>(initViajes);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({ origen: '', destino: '', litros_reales: '' });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; ok: boolean } | null>(null);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

  // Meses únicos disponibles
  const mesesDisponibles = useMemo(() => {
    const set = new Set(viajes.map(v => v.created_at.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [viajes]);

  // Viajes filtrados por mes
  const viajesFiltrados = useMemo(() => {
    if (!mesSeleccionado) return viajes;
    return viajes.filter(v => v.created_at.startsWith(mesSeleccionado));
  }, [viajes, mesSeleccionado]);

  // Totales del filtro actual
  const totales = useMemo(() => ({
    costo: viajesFiltrados.reduce((a, v) => a + v.costo_total, 0),
    flete: viajesFiltrados.reduce((a, v) => a + (v.flete_cobrado || 0), 0),
    km: viajesFiltrados.reduce((a, v) => a + v.kilometros, 0),
    litros: viajesFiltrados.reduce((a, v) => a + v.litros_totales, 0),
  }), [viajesFiltrados]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function toggleExpandido(id: string) {
    setExpandido(prev => prev === id ? null : id);
    if (editando) { setEditando(null); setMensaje(null); }
  }

  function abrirEdicion(e: React.MouseEvent, v: Viaje) {
    e.stopPropagation();
    setEditando(v.id);
    setExpandido(v.id);
    setForm({ origen: v.origen || '', destino: v.destino || '', litros_reales: v.litros_reales?.toString() || '' });
    setMensaje(null);
  }

  function cerrarEdicion(e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditando(null);
    setMensaje(null);
  }

  async function guardarEdicion(v: Viaje) {
    setGuardando(true);
    const litrosNum = parseFloat(form.litros_reales);
    const litrosValidos = !isNaN(litrosNum) && litrosNum > 0;
    const updates: Record<string, unknown> = {};
    if (form.origen.trim()) updates.origen = form.origen.trim();
    if (form.destino.trim()) updates.destino = form.destino.trim();
    if (litrosValidos) updates.litros_reales = litrosNum;
    if (Object.keys(updates).length > 0) {
      await supabase.from('viajes').update(updates).eq('id', v.id);
    }
    let mensajeIA = '';
    if (litrosValidos && litrosNum !== v.litros_reales) {
      const res = await fetch('/api/viajes/aprender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viaje_id: v.id, litros_reales: litrosNum }),
      });
      const json = await res.json();
      if (json.ok) {
        mensajeIA = json.aprendio
          ? ` · IA actualizada: ${json.consumoBaseAnterior} → ${json.consumoBaseNuevo} L/100km`
          : ' · IA: estimación ya era correcta';
      }
    }
    setViajes(prev => prev.map(x =>
      x.id === v.id
        ? { ...x, origen: form.origen.trim() || x.origen, destino: form.destino.trim() || x.destino, litros_reales: litrosValidos ? litrosNum : x.litros_reales }
        : x
    ));
    setMensaje({ id: v.id, texto: '✓ Guardado' + mensajeIA, ok: true });
    setGuardando(false);
    setTimeout(() => { setEditando(null); setMensaje(null); }, 2200);
  }

  // ─── EXPORTAR EXCEL ───────────────────────────────────────────────
  async function exportarExcel() {
    setExportando('excel');
    try {
      const XLSX = await import('xlsx');

      const periodoLabel = mesSeleccionado ? formatMes(mesSeleccionado) : 'Todos los meses';

      // Hoja 1: Viajes detallados
      const filas = viajesFiltrados.map(v => {
        const ganancia = v.flete_cobrado ? v.flete_cobrado - v.costo_total : null;
        const margen = v.flete_cobrado ? ((ganancia! / v.flete_cobrado) * 100).toFixed(1) : null;
        return {
          'Fecha': new Date(v.created_at).toLocaleDateString('es-AR'),
          'Origen': v.origen || '—',
          'Destino': v.destino || '—',
          'Patente': v.camiones?.patente || '—',
          'Marca': v.camiones?.marca || '—',
          'Modelo': v.camiones?.modelo || '—',
          'Kilómetros': v.kilometros,
          'Carga (ton)': v.peso_carga,
          'Tipo de ruta': RUTA_LABEL[v.tipo_ruta || ''] || v.tipo_ruta || '—',
          'Terreno': TERRENO_LABEL[v.terreno || ''] || v.terreno || '—',
          'Precio gasoil ($/L)': v.precio_combustible || '—',
          'Litros estimados': v.litros_totales,
          'Litros reales': v.litros_reales || '—',
          'Consumo (L/100km)': v.consumo_real || '—',
          'Costo combustible ($)': v.costo_total,
          'Costo por km ($/km)': v.costo_por_km,
          'Flete cobrado ($)': v.flete_cobrado || '—',
          'Ganancia neta ($)': ganancia !== null ? Math.round(ganancia) : '—',
          'Margen (%)': margen !== null ? `${margen}%` : '—',
          'Factor peso': v.factor_peso || '—',
          'Factor ruta': v.factor_ruta || '—',
          'Factor terreno': v.factor_terreno || '—',
          '% carga': v.porcentaje_carga !== undefined ? `${v.porcentaje_carga}%` : '—',
          'Análisis IA': v.descripcion_ia || '—',
        };
      });

      // Hoja 2: Resumen mensual
      const resumenMap: Record<string, { mes: string; viajes: number; costo: number; flete: number; km: number; litros: number }> = {};
      viajes.forEach(v => {
        const mes = v.created_at.substring(0, 7);
        if (!resumenMap[mes]) resumenMap[mes] = { mes: formatMes(mes), viajes: 0, costo: 0, flete: 0, km: 0, litros: 0 };
        resumenMap[mes].viajes++;
        resumenMap[mes].costo += v.costo_total;
        resumenMap[mes].flete += v.flete_cobrado || 0;
        resumenMap[mes].km += v.kilometros;
        resumenMap[mes].litros += v.litros_totales;
      });
      const resumenFilas = Object.values(resumenMap).sort((a, b) => b.mes.localeCompare(a.mes)).map(r => ({
        'Mes': r.mes,
        'Viajes': r.viajes,
        'Km totales': r.km,
        'Litros totales': Math.round(r.litros),
        'Gasto combustible ($)': Math.round(r.costo),
        'Flete cobrado ($)': Math.round(r.flete),
        'Ganancia neta ($)': Math.round(r.flete - r.costo),
        'Margen promedio (%)': r.flete > 0 ? `${(((r.flete - r.costo) / r.flete) * 100).toFixed(1)}%` : '—',
      }));

      const wb = XLSX.utils.book_new();

      // Hoja viajes
      const ws1 = XLSX.utils.json_to_sheet(filas);
      ws1['!cols'] = [
        { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
        { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 50 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, 'Viajes');

      // Hoja resumen
      const ws2 = XLSX.utils.json_to_sheet(resumenFilas);
      ws2['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumen mensual');

      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      XLSX.writeFile(wb, `FletIA_${empresa.replace(/\s+/g, '_')}_${periodoLabel.replace(/\s+/g, '_')}_${fecha}.xlsx`);
    } finally {
      setExportando(null);
    }
  }

  // ─── EXPORTAR PDF ─────────────────────────────────────────────────
  async function exportarPDF() {
    setExportando('pdf');
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const periodoLabel = mesSeleccionado ? formatMes(mesSeleccionado) : 'Todos los meses';
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Encabezado
      doc.setFillColor(26, 23, 20);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('FletIA', 14, 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      doc.text('// combustible inteligente', 38, 14);
      doc.setTextColor(212, 68, 12);
      doc.setFontSize(11);
      doc.text(`${empresa}`, 180, 10);
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(9);
      doc.text(`${periodoLabel}  ·  ${viajesFiltrados.length} viajes`, 180, 16);

      // Resumen rápido
      doc.setTextColor(26, 23, 20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const y0 = 28;
      doc.text(`Km totales: ${totales.km.toLocaleString('es-AR')}`, 14, y0);
      doc.text(`Litros: ${Math.round(totales.litros).toLocaleString('es-AR')}`, 70, y0);
      doc.text(`Gasto combustible: $${Math.round(totales.costo).toLocaleString('es-AR')}`, 120, y0);
      doc.text(`Flete cobrado: $${Math.round(totales.flete).toLocaleString('es-AR')}`, 200, y0);
      const ganTotal = totales.flete - totales.costo;
      doc.setTextColor(ganTotal >= 0 ? 26 : 212, ganTotal >= 0 ? 107 : 68, ganTotal >= 0 ? 58 : 12);
      doc.text(`Ganancia neta: $${Math.round(ganTotal).toLocaleString('es-AR')}`, 250, y0);

      // Tabla principal
      const cols = [
        'Fecha', 'Origen → Destino', 'Camión', 'KM', 'Carga\n(ton)',
        'Ruta', 'Lts\nEstim.', 'Lts\nReales', 'Costo\nComb. ($)', 'Costo\n$/km',
        'Flete\n($)', 'Ganancia\n($)', 'Margen\n(%)',
      ];

      const rows = viajesFiltrados.map(v => {
        const ganancia = v.flete_cobrado ? v.flete_cobrado - v.costo_total : null;
        const margen = v.flete_cobrado ? (((ganancia!) / v.flete_cobrado) * 100).toFixed(1) : '—';
        return [
          new Date(v.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
          `${v.origen || '—'} → ${v.destino || '—'}`,
          `${v.camiones?.patente || '—'}\n${v.camiones?.marca || ''} ${v.camiones?.modelo || ''}`,
          v.kilometros,
          v.peso_carga,
          RUTA_LABEL[v.tipo_ruta || ''] || v.tipo_ruta || '—',
          Math.round(v.litros_totales),
          v.litros_reales ? Math.round(v.litros_reales) : '—',
          `$${Math.round(v.costo_total).toLocaleString('es-AR')}`,
          `$${v.costo_por_km}`,
          v.flete_cobrado ? `$${Math.round(v.flete_cobrado).toLocaleString('es-AR')}` : '—',
          ganancia !== null ? `$${Math.round(ganancia).toLocaleString('es-AR')}` : '—',
          ganancia !== null ? `${margen}%` : '—',
        ];
      });

      autoTable(doc, {
        startY: y0 + 6,
        head: [cols],
        body: rows,
        styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: [26, 23, 20], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 247, 245] },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 40 },
          2: { cellWidth: 28 },
          3: { cellWidth: 12, halign: 'right' },
          4: { cellWidth: 12, halign: 'right' },
          5: { cellWidth: 16 },
          6: { cellWidth: 12, halign: 'right' },
          7: { cellWidth: 12, halign: 'right' },
          8: { cellWidth: 22, halign: 'right' },
          9: { cellWidth: 16, halign: 'right' },
          10: { cellWidth: 22, halign: 'right' },
          11: { cellWidth: 22, halign: 'right' },
          12: { cellWidth: 14, halign: 'right' },
        },
        didDrawCell: (data) => {
          // Color verde/rojo en columna Ganancia
          if (data.section === 'body' && data.column.index === 11) {
            const val = data.cell.text[0];
            if (val && val !== '—') {
              const isNeg = val.startsWith('-');
              doc.setTextColor(isNeg ? 180 : 26, isNeg ? 30 : 107, isNeg ? 30 : 58);
            }
          }
        },
        foot: [[
          'TOTAL', '', '', totales.km, '', '', Math.round(totales.litros), '',
          `$${Math.round(totales.costo).toLocaleString('es-AR')}`, '',
          `$${Math.round(totales.flete).toLocaleString('es-AR')}`,
          `$${Math.round(totales.flete - totales.costo).toLocaleString('es-AR')}`,
          totales.flete > 0 ? `${(((totales.flete - totales.costo) / totales.flete) * 100).toFixed(1)}%` : '—',
        ]],
        footStyles: { fillColor: [26, 23, 20], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      });

      // Pie de página
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`FletIA — ${empresa} — Generado el ${new Date().toLocaleDateString('es-AR')} — Pág. ${i} de ${pageCount}`, 14, 205);
      }

      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      doc.save(`FletIA_${empresa.replace(/\s+/g, '_')}_${periodoLabel.replace(/\s+/g, '_')}_${fecha}.pdf`);
    } finally {
      setExportando(null);
    }
  }

  const iniciales = empresa.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  return (
    <div className="flex min-h-screen bg-bg">
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />}

      <aside className={`fixed top-0 left-0 h-screen w-[220px] bg-ink flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div>
            <div className="font-display text-2xl font-black text-white">Flet<span className="text-accent">IA</span></div>
            <div className="font-mono text-[8px] tracking-[2px] text-white/30 mt-1 uppercase">// combustible inteligente</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Principal</div>
          <a href="/dashboard" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">⚡</span> Dashboard</a>
          <a href="/viajes" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">🧮</span> Calculadora</a>
          <a href="/historial" className="flex items-center gap-2.5 px-5 py-2.5 text-white text-sm font-medium bg-accent/15 border-l-2 border-accent cursor-pointer"><span className="w-4 text-center">📋</span> Historial</a>
          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Flota</div>
          <a href="/camiones" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">🚛</span> Mis camiones</a>
          <div className="font-mono text-[8px] tracking-[2px] text-white/25 px-5 my-4 uppercase">Análisis</div>
          <a href="/rentabilidad" className="flex items-center gap-2.5 px-5 py-2.5 text-white/40 hover:text-white/80 hover:bg-white/5 text-sm cursor-pointer transition-colors"><span className="w-4 text-center">💰</span> Rentabilidad</a>
        </nav>
        <div className="p-5 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0">{iniciales}</div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/80 truncate">{empresa}</div>
              <div className="font-mono text-[8px] text-white/30 truncate">{email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left font-mono text-[10px] text-white/40 hover:text-accent transition-colors">→ Cerrar sesión</button>
        </div>
      </aside>

      <main className="flex-1 md:ml-[220px]">
        <div className="bg-card border-b border-ink/10 px-4 md:px-7 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden flex flex-col gap-1 p-1.5">
              <span className="block w-5 h-0.5 bg-ink"></span>
              <span className="block w-5 h-0.5 bg-ink"></span>
              <span className="block w-5 h-0.5 bg-ink"></span>
            </button>
            <div className="text-sm font-bold">Historial de viajes</div>
          </div>
          <a href="/viajes" className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors">⚡ Nuevo viaje</a>
        </div>

        <div className="p-4 md:p-7 max-w-5xl">
          {viajes.length === 0 ? (
            <div className="bg-card border border-ink/10 p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <div className="font-bold mb-1">Sin viajes aún</div>
              <div className="text-ink-2 text-sm mb-4">Calculá tu primer viaje para verlo acá.</div>
              <a href="/viajes" className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors">⚡ Calcular viaje</a>
            </div>
          ) : (
            <>
              {/* Filtros y exportar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <label className="font-mono text-[9px] text-ink-3 uppercase tracking-widest">Mes:</label>
                  <select
                    value={mesSeleccionado}
                    onChange={e => { setMesSeleccionado(e.target.value); setExpandido(null); }}
                    className="text-sm px-3 py-1.5 border border-ink/20 bg-card text-ink outline-none focus:border-accent"
                  >
                    <option value="">Todos los meses ({viajes.length})</option>
                    {mesesDisponibles.map(m => (
                      <option key={m} value={m}>
                        {formatMes(m)} ({viajes.filter(v => v.created_at.startsWith(m)).length})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={exportarExcel}
                    disabled={exportando !== null || viajesFiltrados.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors disabled:opacity-40"
                    style={{ borderColor: 'rgba(26,107,58,0.4)', color: '#1a6b3a', backgroundColor: 'rgba(26,107,58,0.06)' }}
                  >
                    {exportando === 'excel' ? '⏳ Generando...' : '📊 Excel'}
                  </button>
                  <button
                    onClick={exportarPDF}
                    disabled={exportando !== null || viajesFiltrados.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors disabled:opacity-40"
                    style={{ borderColor: 'rgba(212,68,12,0.4)', color: '#d4440c', backgroundColor: 'rgba(212,68,12,0.06)' }}
                  >
                    {exportando === 'pdf' ? '⏳ Generando...' : '📄 PDF'}
                  </button>
                </div>
              </div>

              {/* Totales del período */}
              {viajesFiltrados.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Km recorridos', val: `${totales.km.toLocaleString('es-AR')} km` },
                    { label: 'Gasto combustible', val: `$${Math.round(totales.costo).toLocaleString('es-AR')}`, color: '#d4440c' },
                    { label: 'Flete cobrado', val: totales.flete > 0 ? `$${Math.round(totales.flete).toLocaleString('es-AR')}` : '—', color: '#1a6b3a' },
                    { label: 'Ganancia neta', val: totales.flete > 0 ? `$${Math.round(totales.flete - totales.costo).toLocaleString('es-AR')}` : '—', color: totales.flete - totales.costo >= 0 ? '#1a6b3a' : '#d4440c' },
                  ].map(k => (
                    <div key={k.label} className="bg-card border border-ink/10 p-3">
                      <div className="font-mono text-[8px] text-ink-3 uppercase tracking-wider mb-1">{k.label}</div>
                      <div className="font-bold text-base" style={{ color: k.color || 'inherit' }}>{k.val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabla de viajes */}
              {viajesFiltrados.length === 0 ? (
                <div className="bg-card border border-ink/10 p-8 text-center">
                  <div className="text-ink-2 text-sm">No hay viajes en {formatMes(mesSeleccionado)}.</div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">
                        📋 {mesSeleccionado ? formatMes(mesSeleccionado) : 'Todos los viajes'} ({viajesFiltrados.length})
                      </div>
                      <div className="font-mono text-[9px] text-gray-400 mt-0.5">Hacé clic en un viaje para ver el detalle</div>
                    </div>
                  </div>

                  {viajesFiltrados.map((v) => {
                    const abierto = expandido === v.id;
                    const margen = v.flete_cobrado
                      ? (((v.flete_cobrado - v.costo_total) / v.flete_cobrado) * 100).toFixed(1)
                      : null;
                    const ganancia = v.flete_cobrado ? v.flete_cobrado - v.costo_total : null;
                    const colorMargen = margen
                      ? parseFloat(margen) > 25 ? '#1a6b3a' : parseFloat(margen) > 10 ? '#c8860a' : '#d4440c'
                      : '#8a8278';

                    return (
                      <div key={v.id} className="border-b last:border-b-0 border-gray-100">
                        <div
                          onClick={() => toggleExpandido(v.id)}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer select-none"
                        >
                          <div style={{ color: '#9ca3af', fontSize: '10px', flexShrink: 0, transition: 'transform 0.2s', transform: abierto ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">
                              {v.origen && v.destino ? `${v.origen} → ${v.destino}` : `${v.kilometros} km`}
                            </div>
                            <div className="font-mono text-[9px] text-gray-400 mt-1">
                              {v.camiones?.patente} · {v.camiones?.marca} {v.camiones?.modelo} · {v.peso_carga} ton
                              {v.litros_reales && <span className="text-green-600"> · real: {v.litros_reales} lts ✓</span>}
                            </div>
                            <div className="font-mono text-[9px] text-gray-300 mt-0.5">
                              {new Date(v.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 flex items-center gap-3">
                            <div>
                              <div className="text-lg font-bold">${v.costo_total.toLocaleString('es-AR')}</div>
                              <div className="font-mono text-[9px] text-gray-400">${v.costo_por_km}/km</div>
                            </div>
                            <button
                              onClick={(e) => abrirEdicion(e, v)}
                              className={`p-2 rounded transition-colors text-sm ${editando === v.id ? 'bg-gray-100 text-gray-400' : 'hover:bg-orange-50 text-gray-400 hover:text-orange-500'}`}
                              title="Editar viaje"
                            >✏️</button>
                          </div>
                        </div>

                        {abierto && (
                          <div className="border-t border-gray-100" style={{ backgroundColor: '#fafafa' }}>
                            {editando !== v.id && (
                              <div className="px-6 py-5">
                                <div className="font-mono text-[9px] text-gray-400 uppercase tracking-widest mb-4">// Detalle del viaje</div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                  {[
                                    { val: `${v.kilometros} km`, lab: 'Distancia' },
                                    { val: `${v.peso_carga} ton`, lab: 'Carga' },
                                    { val: `${v.litros_totales} lts`, lab: 'Litros estimados' },
                                    { val: v.consumo_real ? `${v.consumo_real} lts/100km` : '—', lab: 'Consumo real' },
                                  ].map(item => (
                                    <div key={item.lab} className="bg-white border border-gray-200 p-3 text-center">
                                      <div className="font-bold text-sm">{item.val}</div>
                                      <div className="font-mono text-[8px] text-gray-400 uppercase mt-0.5">{item.lab}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                  <div className="bg-white border border-gray-200 p-3">
                                    <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">Tipo de ruta</div>
                                    <div className="text-sm font-medium">{v.tipo_ruta ? RUTA_LABEL[v.tipo_ruta] || v.tipo_ruta : '—'}</div>
                                  </div>
                                  <div className="bg-white border border-gray-200 p-3">
                                    <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">Terreno</div>
                                    <div className="text-sm font-medium">{v.terreno ? TERRENO_LABEL[v.terreno] || v.terreno : '—'}</div>
                                  </div>
                                  <div className="bg-white border border-gray-200 p-3">
                                    <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">Precio gasoil</div>
                                    <div className="text-sm font-medium">{v.precio_combustible ? `$${v.precio_combustible.toLocaleString('es-AR')}/lts` : '—'}</div>
                                  </div>
                                </div>
                                {(v.factor_peso || v.factor_ruta || v.factor_terreno) && (
                                  <div className="mb-4">
                                    <div className="font-mono text-[8px] text-gray-400 uppercase mb-2">Factores aplicados por la IA</div>
                                    <div className="flex gap-2 flex-wrap">
                                      {v.factor_peso && <span className="px-2 py-1 bg-white border border-gray-200 font-mono text-[9px]">Peso ×{v.factor_peso}</span>}
                                      {v.factor_ruta && <span className="px-2 py-1 bg-white border border-gray-200 font-mono text-[9px]">Ruta ×{v.factor_ruta}</span>}
                                      {v.factor_terreno && <span className="px-2 py-1 bg-white border border-gray-200 font-mono text-[9px]">Terreno ×{v.factor_terreno}</span>}
                                      {v.porcentaje_carga !== undefined && <span className="px-2 py-1 bg-white border border-gray-200 font-mono text-[9px]">Carga {v.porcentaje_carga}%</span>}
                                    </div>
                                  </div>
                                )}
                                {v.flete_cobrado && margen && (
                                  <div className="mb-4 p-4 border" style={{ backgroundColor: parseFloat(margen) > 0 ? 'rgba(26,107,58,0.06)' : 'rgba(212,68,12,0.06)', borderColor: parseFloat(margen) > 0 ? 'rgba(26,107,58,0.25)' : 'rgba(212,68,12,0.25)' }}>
                                    <div className="font-mono text-[8px] text-gray-400 uppercase mb-2">Rentabilidad del flete</div>
                                    <div className="flex items-end justify-between">
                                      <div className="text-sm" style={{ color: '#4a4540' }}>
                                        Flete: ${v.flete_cobrado.toLocaleString('es-AR')} · Combustible: ${v.costo_total.toLocaleString('es-AR')}
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono text-[8px] uppercase mb-0.5" style={{ color: colorMargen }}>{ganancia! >= 0 ? 'Ganancia' : 'Pérdida'}</div>
                                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 900, color: colorMargen, lineHeight: 1 }}>
                                          {ganancia! >= 0 ? '' : '-'}${Math.abs(Math.round(ganancia!)).toLocaleString('es-AR')}
                                        </div>
                                        <div className="font-mono text-[9px] mt-0.5" style={{ color: colorMargen, opacity: 0.75 }}>{parseFloat(margen) > 0 ? '+' : ''}{margen}% del flete</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {v.litros_reales && (
                                  <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 font-mono text-[10px] text-green-700">
                                    ✓ Consumo real registrado: {v.litros_reales} lts · Diferencia: {(v.litros_reales - v.litros_totales).toFixed(1)} lts vs estimado
                                  </div>
                                )}
                                {v.descripcion_ia && (
                                  <div className="mb-4 p-3 bg-white border border-gray-200">
                                    <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">🧠 Explicación IA</div>
                                    <div className="text-xs text-gray-600 leading-relaxed">{v.descripcion_ia}</div>
                                  </div>
                                )}
                                <button onClick={(e) => abrirEdicion(e, v)} className="text-xs font-bold px-3 py-2 border border-orange-200 text-orange-500 hover:bg-orange-50 transition-colors">
                                  ✏️ Editar este viaje
                                </button>
                              </div>
                            )}

                            {editando === v.id && (
                              <div className="px-6 pb-5 pt-4">
                                <div className="font-mono text-[9px] text-gray-400 uppercase tracking-widest mb-3">// Editar viaje</div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                  <div>
                                    <label className="font-mono text-[9px] text-gray-500 uppercase block mb-1">Origen</label>
                                    <input type="text" value={form.origen} onChange={e => setForm(f => ({ ...f, origen: e.target.value }))} placeholder={v.origen || 'Ej: Rosario'} className="w-full text-sm px-3 py-2 border border-gray-200 bg-white text-ink outline-none focus:border-orange-400 transition-colors" />
                                  </div>
                                  <div>
                                    <label className="font-mono text-[9px] text-gray-500 uppercase block mb-1">Destino</label>
                                    <input type="text" value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} placeholder={v.destino || 'Ej: Buenos Aires'} className="w-full text-sm px-3 py-2 border border-gray-200 bg-white text-ink outline-none focus:border-orange-400 transition-colors" />
                                  </div>
                                  <div>
                                    <label className="font-mono text-[9px] text-gray-500 uppercase block mb-1">Litros reales <span style={{ color: '#d4440c' }}>(actualiza IA)</span></label>
                                    <input type="number" value={form.litros_reales} onChange={e => setForm(f => ({ ...f, litros_reales: e.target.value }))} placeholder={v.litros_reales?.toString() || v.litros_totales.toString()} min="1" step="0.1" className="w-full text-sm px-3 py-2 border border-gray-200 bg-white text-ink outline-none focus:border-orange-400 transition-colors" />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => guardarEdicion(v)} disabled={guardando} className="bg-accent text-white px-4 py-2 text-xs font-bold hover:bg-accent/90 transition-colors disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
                                  <button onClick={(e) => cerrarEdicion(e)} className="px-4 py-2 text-xs border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                  {mensaje?.id === v.id && (
                                    <span className={`font-mono text-[10px] ml-1 ${mensaje.ok ? 'text-green-600' : 'text-red-500'}`}>{mensaje.texto}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
