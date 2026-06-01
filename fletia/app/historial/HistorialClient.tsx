'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/app/components/Sidebar';

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
  peajes_total?: number;
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
  peso_carga: string;
}

// Costo real del viaje = combustible + operativos (en costo_total) + peajes
const costoRealViaje = (v: { costo_total: number; peajes_total?: number }) =>
  v.costo_total + (v.peajes_total ?? 0);

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
  const [form, setForm] = useState<EditForm>({ origen: '', destino: '', peso_carga: '' });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ id: string; texto: string; ok: boolean } | null>(null);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  const [camionSeleccionado, setCamionSeleccionado] = useState('');
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
  // Entrenamiento rápido inline
  const [entrenando, setEntrenando] = useState<string | null>(null);
  const [litrosQuick, setLitrosQuick] = useState('');
  const [guardandoQuick, setGuardandoQuick] = useState(false);
  const [precisionMap, setPrecisionMap] = useState<Record<string, { precisionPct: number; consumoBaseNuevo: number; viajesEntrenados: number }>>({});

  // Meses únicos disponibles
  const mesesDisponibles = useMemo(() => {
    const set = new Set(viajes.map(v => v.created_at.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [viajes]);

  // Camiones únicos disponibles
  const camionesDisponibles = useMemo(() => {
    const map = new Map<string, { patente: string; marca: string; modelo: string }>();
    viajes.forEach(v => {
      if (v.camiones?.patente) map.set(v.camiones.patente, v.camiones);
    });
    return Array.from(map.values()).sort((a, b) => a.patente.localeCompare(b.patente));
  }, [viajes]);

  // Viajes filtrados por mes y/o camión
  const viajesFiltrados = useMemo(() => {
    return viajes.filter(v => {
      if (mesSeleccionado && !v.created_at.startsWith(mesSeleccionado)) return false;
      if (camionSeleccionado && v.camiones?.patente !== camionSeleccionado) return false;
      return true;
    });
  }, [viajes, mesSeleccionado, camionSeleccionado]);

  // Totales del filtro actual
  const totales = useMemo(() => ({
    costo: viajesFiltrados.reduce((a, v) => a + costoRealViaje(v), 0),
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
    setForm({ origen: v.origen || '', destino: v.destino || '', peso_carga: v.peso_carga?.toString() || '' });
    setMensaje(null);
  }

  function cerrarEdicion(e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditando(null);
    setMensaje(null);
  }

  async function guardarEdicion(v: Viaje) {
    setGuardando(true);
    const pesoNum = parseFloat(form.peso_carga);
    const pesoValido = !isNaN(pesoNum) && pesoNum >= 0;
    const maxTon = v.camiones?.capacidad_max_ton;

    if (pesoValido && maxTon && pesoNum > maxTon) {
      setMensaje({ id: v.id, texto: `El peso supera la capacidad del camión (${maxTon} ton)`, ok: false });
      setGuardando(false);
      return;
    }

    const updates: Record<string, unknown> = {};
    if (form.origen.trim()) updates.origen = form.origen.trim();
    if (form.destino.trim()) updates.destino = form.destino.trim();
    let nuevoPorcentaje: number | undefined;
    if (pesoValido) {
      updates.peso_carga = pesoNum;
      if (maxTon) {
        nuevoPorcentaje = Math.min(Math.round((pesoNum / maxTon) * 100), 100);
        updates.porcentaje_carga = nuevoPorcentaje;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('viajes').update(updates).eq('id', v.id);
    }

    setViajes(prev => prev.map(x =>
      x.id === v.id
        ? {
            ...x,
            origen: form.origen.trim() || x.origen,
            destino: form.destino.trim() || x.destino,
            peso_carga: pesoValido ? pesoNum : x.peso_carga,
            porcentaje_carga: nuevoPorcentaje ?? x.porcentaje_carga,
          }
        : x
    ));
    setMensaje({ id: v.id, texto: '✓ Guardado', ok: true });
    setGuardando(false);
    setTimeout(() => { setEditando(null); setMensaje(null); }, 2200);
  }

  // ─── ENTRENAMIENTO RÁPIDO INLINE ──────────────────────────────────
  async function guardarLitrosRapido(v: Viaje) {
    const litrosNum = parseFloat(litrosQuick);
    if (isNaN(litrosNum) || litrosNum <= 0) return;
    setGuardandoQuick(true);
    try {
      const res = await fetch('/api/viajes/aprender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viaje_id: v.id, litros_reales: litrosNum }),
      });
      const json = await res.json();
      if (json.ok) {
        setViajes(prev => prev.map(x => x.id === v.id ? { ...x, litros_reales: litrosNum } : x));
        if (json.precisionPct !== undefined) {
          setPrecisionMap(prev => ({ ...prev, [v.id]: { precisionPct: json.precisionPct, consumoBaseNuevo: json.consumoBaseNuevo, viajesEntrenados: json.viajesEntrenados } }));
        }
      }
      setEntrenando(null);
      setLitrosQuick('');
    } finally {
      setGuardandoQuick(false);
    }
  }

  // ─── EXPORTAR EXCEL ───────────────────────────────────────────────
  async function exportarExcel() {
    setExportando('excel');
    try {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'FletIA';
      wb.created = new Date();

      const periodoLabel = [
        mesSeleccionado ? formatMes(mesSeleccionado) : 'Todos los meses',
        camionSeleccionado ? `Camión ${camionSeleccionado}` : '',
      ].filter(Boolean).join(' · ');
      const borderStyle: any = { style: 'thin', color: { argb: 'FFE0DDD8' } };
      const border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

      // ── HOJA 1: VIAJES ──────────────────────────────────────────
      const ws1 = wb.addWorksheet('Viajes');
      ws1.columns = [
        { header: 'Fecha',               key: 'fecha',       width: 13 },
        { header: 'Origen',              key: 'origen',      width: 22 },
        { header: 'Destino',             key: 'destino',     width: 22 },
        { header: 'Patente',             key: 'patente',     width: 11 },
        { header: 'Marca',               key: 'marca',       width: 13 },
        { header: 'Modelo',              key: 'modelo',      width: 14 },
        { header: 'Kilómetros',          key: 'km',          width: 12 },
        { header: 'Carga (ton)',         key: 'carga',       width: 12 },
        { header: 'Tipo de ruta',        key: 'ruta',        width: 14 },
        { header: 'Terreno',             key: 'terreno',     width: 13 },
        { header: 'Precio gasoil ($/L)', key: 'preciogas',   width: 18 },
        { header: 'Litros estimados',    key: 'litrosEst',   width: 16 },
        { header: 'Litros reales',       key: 'litrosReal',  width: 14 },
        { header: 'Consumo (L/100km)',   key: 'consumo',     width: 17 },
        { header: 'Costo combustible ($)',key: 'costo',      width: 20 },
        { header: 'Costo por km ($/km)', key: 'costokm',     width: 18 },
        { header: 'Flete cobrado ($)',   key: 'flete',       width: 17 },
        { header: 'Ganancia neta ($)',   key: 'ganancia',    width: 17 },
        { header: 'Margen (%)',          key: 'margen',      width: 12 },
        { header: 'Factor peso',         key: 'fpeso',       width: 12 },
        { header: 'Factor ruta',         key: 'fruta',       width: 12 },
        { header: 'Factor terreno',      key: 'fterreno',    width: 14 },
        { header: '% Carga',             key: 'pctcarga',    width: 10 },
        { header: 'Análisis IA',         key: 'ia',          width: 60 },
      ];

      // Estilo encabezado hoja 1
      const h1 = ws1.getRow(1);
      h1.height = 18;
      h1.eachCell(cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1714' } };
        cell.font   = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = border;
      });

      // Filas de datos
      viajesFiltrados.forEach((v, i) => {
        const ganancia = v.flete_cobrado ? v.flete_cobrado - costoRealViaje(v) : null;
        const margen   = v.flete_cobrado && ganancia !== null ? ((ganancia / v.flete_cobrado) * 100) : null;
        const row = ws1.addRow({
          fecha:     new Date(v.created_at).toLocaleDateString('es-AR'),
          origen:    v.origen || '—',
          destino:   v.destino || '—',
          patente:   v.camiones?.patente || '—',
          marca:     v.camiones?.marca || '—',
          modelo:    v.camiones?.modelo || '—',
          km:        v.kilometros,
          carga:     v.peso_carga,
          ruta:      RUTA_LABEL[v.tipo_ruta || ''] || v.tipo_ruta || '—',
          terreno:   TERRENO_LABEL[v.terreno || ''] || v.terreno || '—',
          preciogas: v.precio_combustible ? `$${v.precio_combustible.toLocaleString('es-AR')}` : '—',
          litrosEst: Math.round(v.litros_totales),
          litrosReal:v.litros_reales ? Math.round(v.litros_reales) : '—',
          consumo:   v.consumo_real || '—',
          costo:     `$${Math.round(costoRealViaje(v)).toLocaleString('es-AR')}`,
          costokm:   `$${v.costo_por_km}`,
          flete:     v.flete_cobrado ? `$${Math.round(v.flete_cobrado).toLocaleString('es-AR')}` : '—',
          ganancia:  ganancia !== null ? `$${Math.round(ganancia).toLocaleString('es-AR')}` : '—',
          margen:    margen !== null ? `${margen.toFixed(1)}%` : '—',
          fpeso:     v.factor_peso || '—',
          fruta:     v.factor_ruta || '—',
          fterreno:  v.factor_terreno || '—',
          pctcarga:  v.porcentaje_carga !== undefined ? `${v.porcentaje_carga}%` : '—',
          ia:        v.descripcion_ia || '—',
        });

        const bgColor = i % 2 === 0 ? 'FFFFFFFF' : 'FFFAF9F7';
        row.height = 13;
        row.eachCell((cell, colNumber) => {
          cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.font   = { size: 9, name: 'Calibri' };
          cell.border = border;
          cell.alignment = { vertical: 'top', wrapText: colNumber === 24 };

          // Color ganancia
          if (colNumber === 18 && ganancia !== null) {
            cell.font = { size: 9, name: 'Calibri', color: { argb: ganancia >= 0 ? 'FF1A6B3A' : 'FFD4440C' }, bold: true };
          }
          // Color margen
          if (colNumber === 19 && margen !== null) {
            cell.font = { size: 9, name: 'Calibri', color: { argb: margen >= 25 ? 'FF1A6B3A' : margen >= 10 ? 'FFC8860A' : 'FFD4440C' } };
          }
        });
        // IA con texto completo y altura auto
        const iaCell = row.getCell(24);
        iaCell.alignment = { wrapText: true, vertical: 'top' };
        if (v.descripcion_ia && v.descripcion_ia.length > 80) row.height = 26;
      });

      // Fila TOTALES hoja 1
      const gananciaTotal = totales.flete - totales.costo;
      const margenTotal   = totales.flete > 0 ? ((gananciaTotal / totales.flete) * 100).toFixed(1) : '—';
      const totRow = ws1.addRow({
        fecha: 'TOTAL', origen: '', destino: '', patente: '', marca: '', modelo: '',
        km: totales.km, carga: '', ruta: '', terreno: '', preciogas: '',
        litrosEst: Math.round(totales.litros), litrosReal: '', consumo: '',
        costo: `$${Math.round(totales.costo).toLocaleString('es-AR')}`, costokm: '',
        flete: `$${Math.round(totales.flete).toLocaleString('es-AR')}`,
        ganancia: `$${Math.round(gananciaTotal).toLocaleString('es-AR')}`,
        margen: totales.flete > 0 ? `${margenTotal}%` : '—',
        fpeso: '', fruta: '', fterreno: '', pctcarga: '', ia: `${viajesFiltrados.length} viajes`,
      });
      totRow.height = 15;
      totRow.eachCell(cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1714' } };
        cell.font   = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10, name: 'Calibri' };
        cell.border = border;
        cell.alignment = { vertical: 'middle' };
      });
      // Color ganancia en totales
      totRow.getCell(18).font = { color: { argb: gananciaTotal >= 0 ? 'FF4ADE80' : 'FFFF6B6B' }, bold: true, size: 10 };

      // ── HOJA 2: RESUMEN MENSUAL ─────────────────────────────────
      const ws2 = wb.addWorksheet('Resumen mensual');
      ws2.columns = [
        { header: 'Mes',                  key: 'mes',      width: 18 },
        { header: 'Viajes',               key: 'viajes',   width: 10 },
        { header: 'Km totales',           key: 'km',       width: 14 },
        { header: 'Litros totales',       key: 'litros',   width: 15 },
        { header: 'Gasto combustible ($)',key: 'costo',    width: 22 },
        { header: 'Flete cobrado ($)',    key: 'flete',    width: 18 },
        { header: 'Ganancia neta ($)',    key: 'ganancia', width: 18 },
        { header: 'Margen promedio (%)',  key: 'margen',   width: 20 },
      ];
      const h2 = ws2.getRow(1);
      h2.height = 18;
      h2.eachCell(cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4440C' } };
        cell.font   = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = border;
      });

      const resumenMap: Record<string, any> = {};
      viajes.forEach(v => {
        const mes = v.created_at.substring(0, 7);
        if (!resumenMap[mes]) resumenMap[mes] = { mes: formatMes(mes), viajes: 0, costo: 0, flete: 0, km: 0, litros: 0 };
        resumenMap[mes].viajes++;
        resumenMap[mes].costo  += costoRealViaje(v);
        resumenMap[mes].flete  += v.flete_cobrado || 0;
        resumenMap[mes].km     += v.kilometros;
        resumenMap[mes].litros += v.litros_totales;
      });

      Object.values(resumenMap).sort((a: any, b: any) => b.mes.localeCompare(a.mes)).forEach((r: any, i) => {
        const gan = r.flete - r.costo;
        const row = ws2.addRow({
          mes:      r.mes,
          viajes:   r.viajes,
          km:       r.km,
          litros:   Math.round(r.litros),
          costo:    `$${Math.round(r.costo).toLocaleString('es-AR')}`,
          flete:    `$${Math.round(r.flete).toLocaleString('es-AR')}`,
          ganancia: `$${Math.round(gan).toLocaleString('es-AR')}`,
          margen:   r.flete > 0 ? `${(((gan) / r.flete) * 100).toFixed(1)}%` : '—',
        });
        row.height = 13;
        row.eachCell((cell, col) => {
          cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFFAF9F7' } };
          cell.font   = { size: 10, name: 'Calibri' };
          cell.border = border;
          cell.alignment = { vertical: 'middle' };
          if (col === 7) cell.font = { size: 10, name: 'Calibri', color: { argb: gan >= 0 ? 'FF1A6B3A' : 'FFD4440C' }, bold: true };
        });
      });

      // Generar y descargar
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      a.download = `FletIA_${empresa.replace(/\s+/g, '_')}_${periodoLabel.replace(/\s+/g, '_')}_${fecha}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
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

      const periodoLabel = [
        mesSeleccionado ? formatMes(mesSeleccionado) : 'Todos los meses',
        camionSeleccionado ? `Camión ${camionSeleccionado}` : '',
      ].filter(Boolean).join(' · ');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const ACCENT  = [212, 68, 12]  as [number,number,number];
      const DARK    = [26, 23, 20]   as [number,number,number];
      const GREEN   = [26, 107, 58]  as [number,number,number];
      const RED     = [180, 30, 30]  as [number,number,number];
      const W       = 297;

      // ── ENCABEZADO ─────────────────────────────────────────────
      doc.setFillColor(...DARK);
      doc.rect(0, 0, W, 26, 'F');
      // Franja accent
      doc.setFillColor(...ACCENT);
      doc.rect(0, 26, W, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Flet', 14, 17);
      doc.setTextColor(...ACCENT);
      doc.text('IA', 33, 17);
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('// inteligencia para cada viaje', 14, 23);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(empresa, W - 14, 13, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      doc.text(`${periodoLabel}  ·  ${viajesFiltrados.length} viajes  ·  Generado ${new Date().toLocaleDateString('es-AR')}`, W - 14, 21, { align: 'right' });

      // ── TARJETAS DE RESUMEN ─────────────────────────────────────
      const ganTotal = totales.flete - totales.costo;
      const tarjetas = [
        { label: 'KM RECORRIDOS',        val: `${totales.km.toLocaleString('es-AR')} km`,         color: DARK },
        { label: 'LITROS CONSUMIDOS',    val: `${Math.round(totales.litros).toLocaleString('es-AR')} lts`, color: DARK },
        { label: 'GASTO COMBUSTIBLE',    val: `$${Math.round(totales.costo).toLocaleString('es-AR')}`,   color: RED },
        { label: 'FLETE COBRADO',        val: `$${Math.round(totales.flete).toLocaleString('es-AR')}`,   color: GREEN },
        { label: 'GANANCIA NETA',        val: `$${Math.round(ganTotal).toLocaleString('es-AR')}`,        color: ganTotal >= 0 ? GREEN : RED },
        { label: 'MARGEN',               val: totales.flete > 0 ? `${(((ganTotal) / totales.flete) * 100).toFixed(1)}%` : '—', color: ganTotal >= 0 ? GREEN : RED },
      ];
      const cardW = (W - 28) / tarjetas.length;
      tarjetas.forEach((t, i) => {
        const cx = 14 + i * cardW;
        const cy = 31;
        doc.setFillColor(248, 247, 245);
        doc.roundedRect(cx, cy, cardW - 3, 18, 1, 1, 'F');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(t.label, cx + (cardW - 3) / 2, cy + 5.5, { align: 'center' });
        doc.setTextColor(...t.color);
        doc.setFontSize(10);
        doc.text(t.val, cx + (cardW - 3) / 2, cy + 13, { align: 'center' });
      });

      // ── TABLA ───────────────────────────────────────────────────
      const cols = ['Fecha', 'Origen', 'Destino', 'Camión', 'KM', 'Ton', 'Ruta',
                    'Lts Est.', 'Lts Real', 'Costo ($)', '$/km', 'Flete ($)', 'Ganancia ($)', 'Margen'];

      const rows = viajesFiltrados.map(v => {
        const ganancia = v.flete_cobrado ? v.flete_cobrado - costoRealViaje(v) : null;
        const margen   = v.flete_cobrado && ganancia !== null ? `${((ganancia / v.flete_cobrado) * 100).toFixed(1)}%` : '—';
        return [
          new Date(v.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
          v.origen || '—',
          v.destino || '—',
          `${v.camiones?.patente || '—'}\n${(v.camiones?.marca || '')} ${(v.camiones?.modelo || '')}`.trim(),
          v.kilometros,
          v.peso_carga,
          RUTA_LABEL[v.tipo_ruta || ''] || v.tipo_ruta || '—',
          Math.round(v.litros_totales),
          v.litros_reales ? Math.round(v.litros_reales) : '—',
          `$${Math.round(costoRealViaje(v)).toLocaleString('es-AR')}`,
          `$${v.costo_por_km}`,
          v.flete_cobrado ? `$${Math.round(v.flete_cobrado).toLocaleString('es-AR')}` : '—',
          ganancia !== null ? `$${Math.round(ganancia).toLocaleString('es-AR')}` : '—',
          margen,
        ];
      });

      autoTable(doc, {
        startY: 52,
        head: [cols],
        body: rows,
        styles: { fontSize: 7, cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 }, font: 'helvetica', overflow: 'linebreak' },
        headStyles: { fillColor: DARK, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 3, right: 2, bottom: 3, left: 2 } },
        alternateRowStyles: { fillColor: [250, 249, 247] },
        columnStyles: {
          0:  { cellWidth: 14 },
          1:  { cellWidth: 26 },
          2:  { cellWidth: 26 },
          3:  { cellWidth: 24 },
          4:  { cellWidth: 10, halign: 'right' },
          5:  { cellWidth: 9,  halign: 'right' },
          6:  { cellWidth: 14 },
          7:  { cellWidth: 11, halign: 'right' },
          8:  { cellWidth: 11, halign: 'right' },
          9:  { cellWidth: 20, halign: 'right' },
          10: { cellWidth: 13, halign: 'right' },
          11: { cellWidth: 20, halign: 'right' },
          12: { cellWidth: 20, halign: 'right' },
          13: { cellWidth: 13, halign: 'right' },
        },
        willDrawCell: (data) => {
          if (data.section === 'body') {
            const ganIdx = 12;
            const marIdx = 13;
            if (data.column.index === ganIdx) {
              const val = String(data.cell.text[0] || '');
              if (val !== '—') doc.setTextColor(...(val.startsWith('-') ? RED : GREEN));
            }
            if (data.column.index === marIdx) {
              const num = parseFloat(String(data.cell.text[0] || '0'));
              if (!isNaN(num)) doc.setTextColor(...(num >= 25 ? GREEN : num >= 10 ? [200, 134, 10] as [number,number,number] : RED));
            }
          }
        },
        foot: [[
          'TOTAL', '', '', `${viajesFiltrados.length} viajes`, totales.km, '', '',
          Math.round(totales.litros), '',
          `$${Math.round(totales.costo).toLocaleString('es-AR')}`, '',
          `$${Math.round(totales.flete).toLocaleString('es-AR')}`,
          `$${Math.round(ganTotal).toLocaleString('es-AR')}`,
          totales.flete > 0 ? `${(((ganTotal) / totales.flete) * 100).toFixed(1)}%` : '—',
        ]],
        footStyles: { fillColor: DARK, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7.5 },
      });

      // ── PIE DE PÁGINA ───────────────────────────────────────────
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...ACCENT);
        doc.rect(0, 203, W, 1, 'F');
        doc.setFontSize(6.5);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text(`FletIA — ${empresa} — ${periodoLabel}`, 14, 207);
        doc.text(`Pág. ${i} / ${pageCount}`, W - 14, 207, { align: 'right' });
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
      <Sidebar active="historial" empresa={empresa} email={email} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-56">
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

                {camionesDisponibles.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="font-mono text-[9px] text-ink-3 uppercase tracking-widest">Camión:</label>
                    <select
                      value={camionSeleccionado}
                      onChange={e => { setCamionSeleccionado(e.target.value); setExpandido(null); }}
                      className="text-sm px-3 py-1.5 border border-ink/20 bg-card text-ink outline-none focus:border-accent"
                    >
                      <option value="">Todos los camiones</option>
                      {camionesDisponibles.map(c => (
                        <option key={c.patente} value={c.patente}>
                          {c.patente} — {c.marca} {c.modelo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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

              {/* Totales del período (flete y ganancia están en Rentabilidad) */}
              {viajesFiltrados.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Km recorridos', val: `${totales.km.toLocaleString('es-AR')} km` },
                    { label: 'Litros estimados', val: `${Math.round(totales.litros).toLocaleString('es-AR')} lts` },
                    { label: 'Costo total', val: `$${Math.round(totales.costo).toLocaleString('es-AR')}`, color: '#d4440c' },
                  ].map(k => (
                    <div key={k.label} className="bg-card border border-ink/10 p-3">
                      <div className="font-mono text-[10px] text-ink-2 uppercase tracking-wider mb-1">{k.label}</div>
                      <div className="font-bold text-lg" style={{ color: k.color || 'inherit' }}>{k.val}</div>
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
                  <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">
                        📋 {mesSeleccionado ? formatMes(mesSeleccionado) : 'Todos los viajes'} ({viajesFiltrados.length})
                      </div>
                      <div className="font-mono text-[9px] text-gray-400 mt-0.5">Hacé clic en un viaje para ver el detalle</div>
                    </div>
                  </div>

                  {viajesFiltrados.map((v) => {
                    const abierto = expandido === v.id;
                    const costoReal = costoRealViaje(v);
                    const margen = v.flete_cobrado
                      ? (((v.flete_cobrado - costoReal) / v.flete_cobrado) * 100).toFixed(1)
                      : null;
                    const ganancia = v.flete_cobrado ? v.flete_cobrado - costoReal : null;
                    const colorMargen = margen
                      ? parseFloat(margen) > 25 ? '#1a6b3a' : parseFloat(margen) > 10 ? '#c8860a' : '#d4440c'
                      : '#8a8278';

                    return (
                      <div key={v.id} className="border-b last:border-b-0 border-gray-100">
                        <div
                          onClick={() => toggleExpandido(v.id)}
                          className="flex items-center gap-2 md:gap-4 px-4 py-3 md:px-6 md:py-4 hover:bg-gray-50 transition-colors cursor-pointer select-none"
                        >
                          <div style={{ color: '#9ca3af', fontSize: '10px', flexShrink: 0, transition: 'transform 0.2s', transform: abierto ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">
                              {v.origen && v.destino ? `${v.origen} → ${v.destino}` : `${v.kilometros} km`}
                            </div>
                            <div className="font-mono text-[11px] text-gray-500 mt-1">
                              {v.camiones?.patente} · {v.camiones?.marca} {v.camiones?.modelo} · {v.peso_carga} ton
                              {v.litros_reales && <span className="text-green-600"> · real: {v.litros_reales} lts ✓</span>}
                            </div>
                            <div className="font-mono text-[10px] text-gray-400 mt-0.5">
                              {new Date(v.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 flex items-center gap-2 md:gap-3">
                            <div>
                              {v.flete_cobrado ? (
                                <>
                                  <div className="text-base md:text-lg font-bold" style={{ color: '#1a6b3a' }}>${v.flete_cobrado.toLocaleString('es-AR')}</div>
                                  <div className="font-mono text-[10px] text-gray-500">cobrado</div>
                                  <div className="font-mono text-[11px] mt-0.5" style={{ color: '#4a4540' }}>costo ${costoReal.toLocaleString('es-AR')}</div>
                                  <div className="font-mono text-[11px] font-bold" style={{ color: (ganancia ?? 0) >= 0 ? '#1a6b3a' : '#d4440c' }}>
                                    {(ganancia ?? 0) >= 0 ? 'gana +' : 'pierde -'}${Math.abs(Math.round(ganancia ?? 0)).toLocaleString('es-AR')}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-base md:text-lg font-bold">${costoReal.toLocaleString('es-AR')}</div>
                                  <div className="font-mono text-[11px] text-gray-500">{(v.peajes_total ?? 0) > 0 ? 'costo total' : `$${v.costo_por_km}/km`}</div>
                                </>
                              )}
                            </div>
                            {/* Badge precisión o botón entrenar */}
                            {v.litros_reales ? (
                              <div className="hidden sm:block text-right flex-shrink-0">
                                {(() => {
                                  const prec = precisionMap[v.id]?.precisionPct ??
                                    Math.round(Math.max(0, 100 - Math.abs((v.litros_reales - v.litros_totales) / v.litros_totales * 100)) * 10) / 10;
                                  const color = prec >= 90 ? '#1a6b3a' : prec >= 75 ? '#c8860a' : '#d4440c';
                                  return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color }}>✓ {prec}%</span>;
                                })()}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEntrenando(v.id); setLitrosQuick(''); }}
                                className="hidden sm:flex items-center gap-1 px-2 py-1 flex-shrink-0 transition-colors"
                                style={{ border: '1px solid rgba(212,68,12,0.35)', color: '#d4440c', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}
                                title="Cargar litros reales para que la IA aprenda"
                              >
                                ⚡ Entrenar
                              </button>
                            )}
                            <button
                              onClick={(e) => abrirEdicion(e, v)}
                              className={`p-2 rounded transition-colors text-sm ${editando === v.id ? 'bg-gray-100 text-gray-400' : 'hover:bg-orange-50 text-gray-400 hover:text-orange-500'}`}
                              title="Editar viaje"
                            >✏️</button>
                          </div>
                        </div>

                        {/* ── Entrenamiento rápido inline ── */}
                        {entrenando === v.id && !v.litros_reales && (
                          <div
                            className="px-4 py-3 md:px-6 border-t flex flex-wrap items-center gap-3"
                            style={{ backgroundColor: 'rgba(212,68,12,0.04)', borderColor: 'rgba(212,68,12,0.15)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#d4440c', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>
                              ⚡ Litros reales del viaje
                            </div>
                            <input
                              type="number"
                              value={litrosQuick}
                              onChange={e => setLitrosQuick(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') guardarLitrosRapido(v); if (e.key === 'Escape') setEntrenando(null); }}
                              placeholder={`estimado: ${v.litros_totales} lts`}
                              min="1"
                              step="0.1"
                              autoFocus
                              className="text-sm px-3 py-1.5 outline-none"
                              style={{ border: '1px solid rgba(212,68,12,0.4)', backgroundColor: '#fff', width: '160px' }}
                            />
                            <button
                              onClick={() => guardarLitrosRapido(v)}
                              disabled={guardandoQuick || !litrosQuick}
                              className="px-3 py-1.5 text-white text-xs font-bold disabled:opacity-50 transition-opacity"
                              style={{ backgroundColor: '#d4440c' }}
                            >
                              {guardandoQuick ? 'Guardando...' : 'Guardar y entrenar IA'}
                            </button>
                            <button
                              onClick={() => setEntrenando(null)}
                              className="text-xs px-2 py-1.5"
                              style={{ color: '#8a8278' }}
                            >
                              Cancelar
                            </button>
                          </div>
                        )}

                        {abierto && (
                          <div className="border-t border-gray-100" style={{ backgroundColor: '#fafafa' }}>
                            {editando !== v.id && (
                              <div className="px-4 py-4 md:px-6 md:py-5">
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
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <div className="bg-white border border-gray-200 p-3">
                                    <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">Precio gasoil</div>
                                    <div className="text-sm font-medium">{v.precio_combustible ? `$${v.precio_combustible.toLocaleString('es-AR')}/lts` : '—'}</div>
                                  </div>
                                  {v.porcentaje_carga !== undefined && (
                                    <div className="bg-white border border-gray-200 p-3">
                                      <div className="font-mono text-[8px] text-gray-400 uppercase mb-1">% de carga</div>
                                      <div className="text-sm font-medium">{v.porcentaje_carga}% de capacidad</div>
                                    </div>
                                  )}
                                </div>
                                {v.flete_cobrado && margen && (
                                  <div className="mb-4 p-4 border" style={{ backgroundColor: parseFloat(margen) > 0 ? 'rgba(26,107,58,0.06)' : 'rgba(212,68,12,0.06)', borderColor: parseFloat(margen) > 0 ? 'rgba(26,107,58,0.25)' : 'rgba(212,68,12,0.25)' }}>
                                    <div className="font-mono text-[8px] text-gray-400 uppercase mb-2">Rentabilidad del flete</div>
                                    <div className="flex items-end justify-between">
                                      <div className="text-sm" style={{ color: '#4a4540' }}>
                                        Flete: ${v.flete_cobrado.toLocaleString('es-AR')} · Costo real: ${costoReal.toLocaleString('es-AR')}{(v.peajes_total ?? 0) > 0 ? ` (comb. $${v.costo_total.toLocaleString('es-AR')} + peajes $${(v.peajes_total ?? 0).toLocaleString('es-AR')})` : ''}
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
                                {v.litros_reales ? (
                                  <div className="mb-4 p-3 border" style={{ backgroundColor: 'rgba(26,107,58,0.06)', borderColor: 'rgba(26,107,58,0.25)' }}>
                                    {(() => {
                                      const prec = precisionMap[v.id]?.precisionPct ??
                                        Math.round(Math.max(0, 100 - Math.abs((v.litros_reales - v.litros_totales) / v.litros_totales * 100)) * 10) / 10;
                                      const ve = precisionMap[v.id]?.viajesEntrenados;
                                      const cb = precisionMap[v.id]?.consumoBaseNuevo;
                                      const color = prec >= 90 ? '#1a6b3a' : prec >= 75 ? '#c8860a' : '#d4440c';
                                      const diff = v.litros_reales - v.litros_totales;
                                      return (
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                          <div>
                                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#8a8278', textTransform: 'uppercase', marginBottom: '4px' }}>
                                              ⚡ Consumo real registrado
                                            </div>
                                            <div className="text-sm font-semibold" style={{ color: '#1a1714' }}>
                                              {v.litros_reales} lts reales · {v.litros_totales} lts estimados
                                            </div>
                                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', marginTop: '2px' }}>
                                              Diferencia: {diff > 0 ? '+' : ''}{diff.toFixed(1)} lts
                                              {cb ? ` · Consumo base camión: ${cb} L/100km` : ''}
                                              {ve ? ` · ${ve} viajes entrenados` : ''}
                                            </div>
                                          </div>
                                          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '36px', fontWeight: 900, color, lineHeight: 1 }}>
                                            {prec}%
                                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color, opacity: 0.8 }}>PRECISIÓN</div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="mb-4 px-3 py-2.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(212,68,12,0.05)', border: '1px solid rgba(212,68,12,0.2)' }}>
                                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>
                                      Sin datos reales — la IA aún no aprendió de este viaje
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEntrenando(v.id); setLitrosQuick(''); setExpandido(null); }}
                                      className="text-xs font-bold px-3 py-1.5 text-white transition-opacity"
                                      style={{ backgroundColor: '#d4440c' }}
                                    >
                                      ⚡ Cargar litros reales
                                    </button>
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
                                    <label className="font-mono text-[9px] text-gray-500 uppercase block mb-1">
                                      Toneladas (carga)
                                      {v.camiones?.capacidad_max_ton ? <span style={{ color: '#d4440c' }}> máx {v.camiones.capacidad_max_ton}</span> : null}
                                    </label>
                                    <input type="number" value={form.peso_carga} onChange={e => setForm(f => ({ ...f, peso_carga: e.target.value }))} placeholder={v.peso_carga?.toString()} min="0" step="0.5" max={v.camiones?.capacidad_max_ton} className="w-full text-sm px-3 py-2 border border-gray-200 bg-white text-ink outline-none focus:border-orange-400 transition-colors" />
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
