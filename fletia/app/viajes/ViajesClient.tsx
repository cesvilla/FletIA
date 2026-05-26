'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

const MapaRuta = dynamic(() => import('./MapaRuta'), { ssr: false, loading: () => (
  <div style={{ height: 300, backgroundColor: '#e8e3db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#8a8278' }}>Cargando mapa...</span>
  </div>
) });

interface Camion {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  consumo_base_litros: number;
  capacidad_max_ton: number;
  condicion: string;
}

interface Viaje {
  id: string;
  origen: string | null;
  destino: string | null;
  kilometros: number;
  peso_carga: number;
  costo_total: number;
  litros_totales: number;
  costo_por_km: number;
  porcentaje_carga: number;
  flete_cobrado: number | null;
  litros_reales: number | null;
  created_at: string;
  camiones: { patente: string; marca: string; modelo: string } | null;
}

interface ResultadoIA {
  factorPeso: number;
  factorRuta: number;
  factorTerreno: number;
  consumoReal: number;
  litrosTotales: number;
  costoTotal: number;
  costoPorKm: number;
  porcentajeCarga: number;
  descripcion: string;
}

interface Props {
  camiones: Camion[];
  viajesIniciales: Viaje[];
  empresa: string;
  email: string;
}

export default function ViajesClient({ camiones, viajesIniciales, empresa, email }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [viajes, setViajes] = useState<Viaje[]>(viajesIniciales);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingKm, setLoadingKm] = useState(false);
  const [errorKm, setErrorKm] = useState<string | null>(null);
  const [mapaData, setMapaData] = useState<{
    polyline: [number, number][];
    origen: { lat: number; lon: number; nombre: string };
    destino: { lat: number; lon: number; nombre: string };
    km: number;
  } | null>(null);
  const [resultado, setResultado] = useState<ResultadoIA | null>(null);
  const [camionInfo, setCamionInfo] = useState<{ patente: string; marca: string; modelo: string } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [animando, setAnimando] = useState(false);
  const resultadoRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    camion_id: '',
    origen: '',
    destino: '',
    kilometros: '',
    peso_carga: '',
    tipo_ruta: 'mixta',
    terreno: 'plano',
    precio_combustible: '1200',
    flete_cobrado: '',
  });

  const iniciales = empresa.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'TE';

  // Camión seleccionado actualmente
  const camionSeleccionado = camiones.find(c => c.id === form.camion_id);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function handleCalcularKm() {
    if (!form.origen.trim() || !form.destino.trim()) return;
    setErrorKm(null);
    setMapaData(null);
    setLoadingKm(true);
    try {
      const res = await fetch('/api/distancia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origen: form.origen, destino: form.destino }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al calcular distancia');
      setForm(p => ({ ...p, kilometros: String(data.km) }));
      setMapaData({ polyline: data.polyline, origen: data.origen, destino: data.destino, km: data.km });
    } catch (err: any) {
      setErrorKm(err.message);
    } finally {
      setLoadingKm(false);
    }
  }

  async function handleCalcular(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    setLoading(true);

    try {
      const res = await fetch('/api/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kilometros: parseFloat(form.kilometros),
          peso_carga: parseFloat(form.peso_carga),
          precio_combustible: parseFloat(form.precio_combustible),
          flete_cobrado: form.flete_cobrado ? parseFloat(form.flete_cobrado) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al calcular');

      setResultado(data.resultado);
      setCamionInfo(data.camion);
      setConfirmado(false);
      setTimeout(() => {
        resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmar() {
    if (!resultado) return;
    setConfirmando(true);
    try {
      const res = await fetch('/api/viajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, resultado, kilometros: parseFloat(form.kilometros), peso_carga: parseFloat(form.peso_carga), precio_combustible: parseFloat(form.precio_combustible), flete_cobrado: form.flete_cobrado ? parseFloat(form.flete_cobrado) : null }),
      });
      const data = await res.json();
      if (data.error) { alert('Error al guardar: ' + data.error); return; }
      if (data.viaje) {
        setViajes(prev => [data.viaje, ...prev]);
        setAnimando(true);
        setTimeout(() => {
          setAnimando(false);
          setConfirmado(true);
        }, 2200);
      }
    } finally {
      setConfirmando(false);
    }
  }

  function handleCancelar() {
    setResultado(null);
    setCamionInfo(null);
    setConfirmado(false);
  }

  // Calcular rentabilidad
  const margenNeto = resultado && form.flete_cobrado
    ? (((parseFloat(form.flete_cobrado) - resultado.costoTotal) / parseFloat(form.flete_cobrado)) * 100).toFixed(1)
    : null;

  const gananciaNeta = resultado && form.flete_cobrado
    ? parseFloat(form.flete_cobrado) - resultado.costoTotal
    : null;

  const colorMargen = margenNeto
    ? parseFloat(margenNeto) > 25 ? '#1a6b3a'
      : parseFloat(margenNeto) > 10 ? '#c8860a'
      : '#d4440c'
    : '#8a8278';

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

    {/* overlay eliminado — animación ahora es inline */}
    {false && (
      <div>
        <style>{`
          @keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }

          @keyframes truckDrive {
            0%   { transform:translateX(130vw) translateY(0px) rotate(0deg); animation-timing-function:linear; }
            50%  { transform:translateX(6vw)   translateY(0px) rotate(0deg); animation-timing-function:ease-in; }
            62%  { transform:translateX(-20vw) translateY(-8px) rotate(2deg); animation-timing-function:ease-out; }
            72%  { transform:translateX(-55vw) translateY(-3px) rotate(1deg); animation-timing-function:linear; }
            100% { transform:translateX(-135vw) translateY(0px) rotate(0deg); }
          }

          @keyframes cloudDrift {
            0%   { transform:translateX(0); }
            100% { transform:translateX(-50%); }
          }
          @keyframes mtnDrift {
            0%   { transform:translateX(0); }
            100% { transform:translateX(-50%); }
          }
          @keyframes treeDrift {
            0%   { transform:translateX(0); }
            100% { transform:translateX(-50%); }
          }
          @keyframes roadDash {
            0%   { transform:translateX(0); }
            100% { transform:translateX(50%); }
          }

          @keyframes smokeUp {
            0%   { opacity:0;    transform:translate(0,0) scale(0.2); }
            20%  { opacity:0.55; }
            100% { opacity:0;    transform:translate(16px,-40px) scale(2); }
          }
          @keyframes smokeUp2 {
            0%   { opacity:0;    transform:translate(0,0) scale(0.15); }
            25%  { opacity:0.45; }
            100% { opacity:0;    transform:translate(10px,-32px) scale(1.7); }
          }
          @keyframes smokeUp3 {
            0%   { opacity:0;    transform:translate(0,0) scale(0.25); }
            18%  { opacity:0.3; }
            100% { opacity:0;    transform:translate(20px,-48px) scale(2.4); }
          }
          @keyframes wheelR {
            from { transform:rotate(0deg); }
            to   { transform:rotate(-360deg); }
          }
          @keyframes sunRay {
            0%,100% { opacity:0.4; }
            50%     { opacity:0.7; }
          }
          @keyframes fadeInText {
            from { opacity:0; transform:translateY(10px); }
            to   { opacity:1; transform:translateY(0); }
          }
          @keyframes dotPulse {
            0%,100% { opacity:0.3; transform:scale(0.8); }
            50%     { opacity:1;   transform:scale(1.2); }
          }
        `}</style>

        {/* ── CIELO ── */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,#4fc3f7 0%,#81d4fa 35%,#e1f5fe 60%,#fff8e1 100%)'}}/>

        {/* ── SOL ── */}
        <div style={{position:'absolute',top:'12%',right:'12%',width:'70px',height:'70px'}}>
          <div style={{position:'absolute',inset:0,borderRadius:'50%',backgroundColor:'#FFD54F',boxShadow:'0 0 40px 20px rgba(255,213,79,0.45)'}}/>
          {[0,45,90,135].map(deg=>(
            <div key={deg} style={{
              position:'absolute',top:'50%',left:'50%',
              width:'90px',height:'3px',marginTop:'-1.5px',marginLeft:'-45px',
              background:'rgba(255,213,79,0.3)',borderRadius:'2px',
              transform:`rotate(${deg}deg)`,
              animation:`sunRay 2.5s ease-in-out ${deg/90*0.4}s infinite`,
            }}/>
          ))}
        </div>

        {/* ── NUBES ── */}
        <div style={{position:'absolute',top:'8%',left:0,width:'200%',animation:'cloudDrift 18s linear infinite'}}>
          {[0,1].map(r=>(
            <svg key={r} width="1400" height="80" viewBox="0 0 1400 80" fill="none" style={{display:'inline-block',flexShrink:0}}>
              {[[100,40,55],[320,30,40],[600,45,70],[850,35,50],[1050,42,60],[1250,28,38]].map(([x,y,s],i)=>(
                <g key={i}>
                  <ellipse cx={x}    cy={y}    rx={s}    ry={s*0.55} fill="white" opacity="0.9"/>
                  <ellipse cx={x+s*0.6} cy={y+4} rx={s*0.65} ry={s*0.42} fill="white" opacity="0.85"/>
                  <ellipse cx={x-s*0.5} cy={y+6} rx={s*0.5}  ry={s*0.38} fill="white" opacity="0.8"/>
                </g>
              ))}
            </svg>
          ))}
        </div>

        {/* ── TEXTO ── */}
        <div style={{position:'absolute',top:'14%',left:'50%',transform:'translateX(-50%)',zIndex:5,textAlign:'center',animation:'fadeInText 0.5s ease 0.2s both',opacity:0}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',letterSpacing:'4px',color:'#0277bd',textTransform:'uppercase',marginBottom:'8px'}}>
            // viaje confirmado
          </div>
          <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'2.5rem',fontWeight:900,color:'#01579b',lineHeight:1}}>
            ¡Buen viaje! 🚛
          </div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#0288d1',marginTop:'8px'}}>
            Guardado en el historial
          </div>
        </div>

        {/* ── ESCENA ── */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'260px',overflow:'hidden'}}>

          {/* Montañas lejanas */}
          <div style={{position:'absolute',bottom:'95px',left:0,width:'200%',animation:'mtnDrift 9s linear infinite'}}>
            {[0,1].map(r=>(
              <svg key={r} width="1400" height="120" viewBox="0 0 1400 120" fill="none" style={{flexShrink:0,display:'inline-block'}}>
                <polygon points="0,120 140,22 280,120"   fill="#a5d6a7" opacity="0.7"/>
                <polygon points="220,120 400,6 580,120"  fill="#81c784" opacity="0.75"/>
                <polygon points="500,120 660,30 820,120" fill="#a5d6a7" opacity="0.6"/>
                <polygon points="740,120 940,4 1140,120" fill="#66bb6a" opacity="0.75"/>
                <polygon points="1060,120 1220,20 1380,120" fill="#81c784" opacity="0.65"/>
                {/* nieve */}
                <polygon points="400,6 378,32 422,32"   fill="white" opacity="0.75"/>
                <polygon points="940,4 916,30 964,30"   fill="white" opacity="0.75"/>
              </svg>
            ))}
          </div>

          {/* Árboles */}
          <div style={{position:'absolute',bottom:'93px',left:0,width:'200%',animation:'treeDrift 2.6s linear infinite'}}>
            {[0,1].map(r=>(
              <svg key={r} width="1300" height="90" viewBox="0 0 1300 90" fill="none" style={{display:'inline-block',flexShrink:0}}>
                {[[60,44],[170,52],[300,40],[430,48],[560,44],[690,50],[820,42],[950,48],[1080,45],[1210,51]].map(([x,y],i)=>(
                  <g key={i}>
                    <rect x={x-4} y={y+12} width={i%3===0?9:6} height={90-y-12} fill="#5d4037"/>
                    <polygon points={`${x},${y-20} ${x-24},${y+14} ${x+24},${y+14}`} fill={i%2===0?"#2e7d32":"#388e3c"}/>
                    <polygon points={`${x},${y-6}  ${x-20},${y+18} ${x+20},${y+18}`} fill={i%2===0?"#388e3c":"#43a047"}/>
                  </g>
                ))}
              </svg>
            ))}
          </div>

          {/* Pasto */}
          <div style={{position:'absolute',bottom:'91px',left:0,right:0,height:'6px',backgroundColor:'#66bb6a'}}/>
          <div style={{position:'absolute',bottom:'78px',left:0,right:0,height:'15px',backgroundColor:'#81c784'}}/>

          {/* Arcén */}
          <div style={{position:'absolute',bottom:'72px',left:0,right:0,height:'8px',backgroundColor:'#bcaaa4'}}/>

          {/* ASFALTO — 2 carriles */}
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:'74px',backgroundColor:'#424242'}}/>

          {/* Línea blanca borde izquierdo */}
          <div style={{position:'absolute',bottom:'70px',left:0,right:0,height:'3px',backgroundColor:'#f5f5f5'}}/>

          {/* Línea punteada central — se mueve hacia la derecha (camión va ←) */}
          <div style={{
            position:'absolute',bottom:'36px',left:0,
            width:'200%',height:'4px',
            background:'repeating-linear-gradient(90deg,#f5f5f5 0px,#f5f5f5 50px,transparent 50px,transparent 100px)',
            animation:'roadDash 0.5s linear infinite',
          }}/>

          {/* Línea blanca borde derecho */}
          <div style={{position:'absolute',bottom:'3px',left:0,right:0,height:'3px',backgroundColor:'#f5f5f5'}}/>

          {/* Sombra del camión en asfalto */}
          <div style={{
            position:'absolute',bottom:'70px',left:0,
            width:'280px',height:'8px',
            background:'radial-gradient(ellipse,rgba(0,0,0,0.35) 0%,transparent 70%)',
            animation:'truckDrive 3.8s forwards',
            transformOrigin:'left center',
            filter:'blur(3px)',
          }}/>

          {/* ── CAMIÓN (frente a la izquierda) ── */}
          <div style={{
            position:'absolute',bottom:'70px',right:0,
            animation:'truckDrive 3.8s forwards',
            fontSize:'0',zIndex:4,
            transformOrigin:'right bottom',
          }}>
            <svg width="340" height="80" viewBox="0 0 340 80" fill="none">

              {/* === ESCAPES VERTICALES (lado cab, arriba) === */}
              <rect x="106" y="0" width="6" height="16" rx="3" fill="#90a4ae"/>
              <rect x="116" y="0" width="6" height="16" rx="3" fill="#90a4ae"/>
              {/* Tapas cromadas */}
              <rect x="104" y="0" width="10" height="3" rx="1" fill="#cfd8dc"/>
              <rect x="114" y="0" width="10" height="3" rx="1" fill="#cfd8dc"/>
              {/* Humo escapes — delay 1.8s */}
              <circle cx="109" cy="0" r="7"  fill="rgba(150,150,150,0.6)"  style={{animation:'smokeUp 0.65s ease-out 1.8s infinite',opacity:0}}/>
              <circle cx="119" cy="0" r="6"  fill="rgba(180,180,180,0.45)" style={{animation:'smokeUp2 0.7s ease-out 1.95s infinite',opacity:0}}/>
              <circle cx="113" cy="0" r="9"  fill="rgba(200,200,200,0.3)"  style={{animation:'smokeUp3 0.8s ease-out 2.1s infinite',opacity:0}}/>

              {/* === CAPÓ LARGO — frente izquierdo === */}
              {/* Parachoque cromado */}
              <rect x="4"  y="44" width="16" height="20" rx="2" fill="#cfd8dc"/>
              <rect x="4"  y="45" width="16" height="3"  fill="rgba(255,255,255,0.6)"/>
              <rect x="4"  y="56" width="16" height="3"  fill="rgba(255,255,255,0.4)"/>
              {/* Grille */}
              <rect x="4"  y="26" width="16" height="19" rx="1" fill="#78909c"/>
              {[0,1,2,3,4,5].map(i=>(
                <rect key={i} x="4" y={28+i*3} width="16" height="1.5" fill="#b0bec5" opacity="0.9"/>
              ))}
              {/* Faro izq (frente) */}
              <rect x="5"  y="46" width="12" height="8" rx="2" fill="#fff9c4"/>
              <rect x="3"  y="44" width="8"  height="12" rx="1" fill="rgba(255,249,196,0.4)"/>
              {/* Señalero */}
              <rect x="5"  y="44" width="12" height="3"  rx="1" fill="#ffcc02" opacity="0.9"/>
              {/* Capó */}
              <rect x="20" y="26" width="58" height="38" rx="3" fill="#c62828"/>
              {/* Brillo capó */}
              <rect x="22" y="27" width="54" height="6" rx="2" fill="#ef5350" opacity="0.5"/>
              {/* Línea capó */}
              <rect x="20" y="42" width="58" height="3" fill="rgba(0,0,0,0.18)"/>
              {/* Escape lateral motor */}
              <rect x="22" y="30" width="4" height="10" rx="1" fill="#546e7a"/>

              {/* === ESPEJO IZQUIERDO === */}
              <rect x="72" y="18" width="10" height="6" rx="1" fill="#b71c1c"/>
              <rect x="78" y="14" width="3"  height="9" fill="#8d1515"/>

              {/* === CABINA ALTA === */}
              <rect x="78" y="10" width="60" height="54" rx="5" fill="#c62828"/>
              {/* Techo/Fairing aerodinámico */}
              <path d="M78,10 Q100,2 138,6 L138,14 L78,14 Z" fill="#b71c1c"/>
              {/* Parabrisas (lado derecho de la cab, ya que mira izq) */}
              <rect x="80" y="15" width="28" height="26" rx="3" fill="rgba(144,202,249,0.7)"/>
              {/* Reflejo parabrisas */}
              <rect x="82" y="17" width="12" height="12" rx="2" fill="rgba(255,255,255,0.22)"/>
              {/* Marco parabrisas */}
              <rect x="80" y="15" width="28" height="2"  rx="1" fill="#b71c1c"/>
              {/* Puerta */}
              <rect x="110" y="18" width="24" height="36" rx="2" fill="rgba(0,0,0,0.07)"/>
              <circle cx="113" cy="36" r="2.5" fill="rgba(255,255,255,0.5)"/>
              {/* Línea cintura cab */}
              <rect x="78"  y="46" width="60" height="4"  fill="rgba(0,0,0,0.2)"/>
              {/* Franja cromada lateral */}
              <rect x="78"  y="50" width="60" height="3"  fill="#b0bec5" opacity="0.6"/>
              {/* Tanque combustible */}
              <rect x="114" y="52" width="20" height="12" rx="3" fill="#b71c1c"/>
              <rect x="116" y="54" width="16" height="2"  rx="1" fill="rgba(255,255,255,0.15)"/>

              {/* === SLEEPER === */}
              <rect x="138" y="14" width="34" height="50" rx="2" fill="#ad1414"/>
              {/* Ventana sleeper */}
              <rect x="148" y="20" width="16" height="14" rx="2" fill="rgba(144,202,249,0.55)"/>
              <rect x="150" y="22" width="7"  height="7"  rx="1" fill="rgba(255,255,255,0.2)"/>
              {/* División sleeper/cab */}
              <rect x="136" y="14" width="4"  height="50" fill="#8b0000" opacity="0.5"/>

              {/* === 5TH WHEEL === */}
              <rect x="162" y="58" width="24" height="6" rx="1" fill="#546e7a"/>
              <rect x="168" y="56" width="12" height="4" rx="1" fill="#607d8b"/>

              {/* === TRAILER (blanco/plata) === */}
              <rect x="184" y="18" width="150" height="42" rx="2" fill="#e0e0e0"/>
              <rect x="186" y="20" width="146" height="38" rx="1" fill="#eeeeee"/>
              {/* Franjas metálicas trailer */}
              <rect x="186" y="20" width="146" height="4"  fill="#bdbdbd"/>
              <rect x="186" y="54" width="146" height="4"  fill="#bdbdbd"/>
              {/* Refuerzos verticales */}
              {[210,240,270,300].map(xv=>(
                <rect key={xv} x={xv} y={20} width="2" height="38" fill="#bdbdbd" opacity="0.6"/>
              ))}
              {/* Franja roja decorativa */}
              <rect x="186" y="35" width="146" height="5"  fill="#ef5350" opacity="0.8"/>
              {/* Logo FletIA */}
              <text x="218" y="33" fontFamily="sans-serif" fontWeight="900" fontSize="14" fill="#c62828">FletIA</text>
              {/* Puerta trasera */}
              <rect x="326" y="18" width="8"  height="42" fill="#bdbdbd" rx="1"/>
              <rect x="328" y="28" width="4"  height="22" rx="1" fill="#9e9e9e"/>

              {/* Humo ruedas traseras (delay 1.85s) */}
              <circle cx="295" cy="58" r="9"  fill="rgba(190,190,190,0.55)" style={{animation:'smokeUp 0.55s ease-out 1.85s infinite',opacity:0}}/>
              <circle cx="308" cy="55" r="11" fill="rgba(170,170,170,0.4)"  style={{animation:'smokeUp2 0.6s ease-out 2.0s infinite',opacity:0}}/>
              <circle cx="286" cy="52" r="7"  fill="rgba(210,210,210,0.35)" style={{animation:'smokeUp3 0.7s ease-out 1.9s infinite',opacity:0}}/>

              {/* === RUEDAS === */}
              {/* Steer axle (frente) */}
              {[()=>(
                <g key="s">
                  <circle cx={50} cy={68} r={14} fill="#212121" style={{animation:'wheelR 0.28s linear infinite',transformOrigin:'50px 68px'}}/>
                  <circle cx={50} cy={68} r={9}  fill="#424242"/>
                  <line x1={50} y1={58} x2={50} y2={78} stroke="#666" strokeWidth="2"/>
                  <line x1={40} y1={68} x2={60} y2={68} stroke="#666" strokeWidth="2"/>
                  <line x1={43} y1={61} x2={57} y2={75} stroke="#555" strokeWidth="1.5"/>
                  <line x1={57} y1={61} x2={43} y2={75} stroke="#555" strokeWidth="1.5"/>
                  <circle cx={50} cy={68} r={3}  fill="#9e9e9e"/>
                </g>
              )].map(fn=>fn())}

              {/* Drive axles */}
              {[148,170].map(cx=>(
                <g key={cx}>
                  <circle cx={cx} cy={68} r={14} fill="#212121" style={{animation:'wheelR 0.28s linear infinite',transformOrigin:`${cx}px 68px`}}/>
                  <circle cx={cx} cy={68} r={9}  fill="#424242"/>
                  <line x1={cx} y1={58} x2={cx} y2={78} stroke="#666" strokeWidth="2"/>
                  <line x1={cx-10} y1={68} x2={cx+10} y2={68} stroke="#666" strokeWidth="2"/>
                  <line x1={cx-7} y1={61} x2={cx+7} y2={75} stroke="#555" strokeWidth="1.5"/>
                  <line x1={cx+7} y1={61} x2={cx-7} y2={75} stroke="#555" strokeWidth="1.5"/>
                  <circle cx={cx} cy={68} r={3}  fill="#9e9e9e"/>
                </g>
              ))}

              {/* Trailer rear dual */}
              {[285,310].map(cx=>(
                <g key={cx}>
                  <circle cx={cx} cy={68} r={14} fill="#212121" style={{animation:'wheelR 0.28s linear infinite',transformOrigin:`${cx}px 68px`}}/>
                  <circle cx={cx} cy={68} r={9}  fill="#424242"/>
                  <line x1={cx} y1={58} x2={cx} y2={78} stroke="#666" strokeWidth="2"/>
                  <line x1={cx-10} y1={68} x2={cx+10} y2={68} stroke="#666" strokeWidth="2"/>
                  <line x1={cx-7} y1={61} x2={cx+7} y2={75} stroke="#555" strokeWidth="1.5"/>
                  <line x1={cx+7} y1={61} x2={cx-7} y2={75} stroke="#555" strokeWidth="1.5"/>
                  <circle cx={cx} cy={68} r={3}  fill="#9e9e9e"/>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Dots */}
        <div style={{position:'absolute',bottom:'28px',left:'50%',transform:'translateX(-50%)',zIndex:5,display:'flex',gap:'10px'}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{
              width:'8px',height:'8px',borderRadius:'50%',
              backgroundColor:'#0288d1',
              animation:`dotPulse 0.9s ease-in-out ${i*0.2}s infinite`,
            }}/>
          ))}
        </div>
      </div>
    )}

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen w-56 flex flex-col z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ backgroundColor: '#1a1714' }}>
        <div className="p-6 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-2xl font-black text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Flet<span style={{ color: '#d4440c' }}>IA</span>
            </div>
            <div className="text-white/30 mt-1" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>
              // combustible inteligente
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/40 hover:text-white text-xl">×</button>
        </div>

        <nav className="flex-1 py-4">
          <div className="px-5 my-4 text-white/25 uppercase" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>Principal</div>
          <a href="/dashboard" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors">
            <span>⚡</span> Dashboard
          </a>
          <a className="flex items-center gap-2 px-5 py-2.5 text-sm text-white font-medium" style={{ backgroundColor: 'rgba(212,68,12,0.15)', borderLeft: '2px solid #d4440c' }}>
            <span>🧮</span> Calculadora
          </a>
          <a href="/historial" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors">
            <span>📋</span> Historial
          </a>
          <div className="px-5 my-4 text-white/25 uppercase" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>Flota</div>
          <a href="/camiones" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors">
            <span>🚛</span> Mis camiones
          </a>
          <div className="px-5 my-4 text-white/25 uppercase" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', letterSpacing: '2px' }}>Análisis</div>
          <a href="/rentabilidad" className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/40 hover:text-white/80 hover:bg-white/5 cursor-pointer transition-colors">
            <span>💰</span> Rentabilidad
          </a>
        </nav>

        <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{ backgroundColor: '#d4440c' }}>
              {iniciales}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/80 truncate">{empresa}</div>
              <div className="text-white/30 truncate" style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px' }}>{email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-left text-white/40 hover:text-red-400 transition-colors" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>
            → Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56">

        {/* Topbar */}
        <div className="px-4 md:px-7 h-14 flex items-center justify-between sticky top-0 z-30 bg-white" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden flex flex-col gap-1 p-1.5">
              <span className="block w-5 h-0.5 bg-gray-800"></span>
              <span className="block w-5 h-0.5 bg-gray-800"></span>
              <span className="block w-5 h-0.5 bg-gray-800"></span>
            </button>
            <div className="text-sm font-bold">Calculadora IA</div>
            <div className="hidden md:block px-2 py-0.5 rounded-full" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#1a6b3a', backgroundColor: 'rgba(26,107,58,0.1)' }}>
              ● IA activa
            </div>
          </div>
        </div>

        <div className="p-4 md:p-7">

          {/* Sin camiones */}
          {camiones.length === 0 && (
            <div className="bg-white border border-gray-200 border-dashed p-12 text-center">
              <div className="text-5xl mb-4">🚛</div>
              <h2 className="text-2xl font-bold mb-2">Primero registrá un camión</h2>
              <p className="text-sm mb-6" style={{ color: '#8a8278' }}>Para calcular el costo de un viaje necesitás tener al menos un camión registrado.</p>
              <a href="/camiones" className="inline-block text-white px-6 py-3 text-sm font-bold" style={{ backgroundColor: '#d4440c' }}>
                → Ir a mis camiones
              </a>
            </div>
          )}

          {camiones.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* FORMULARIO */}
              <div>
                <form onSubmit={handleCalcular} className="bg-white border border-gray-200">

                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: '#d4440c', textTransform: 'uppercase', marginBottom: '2px' }}>⚡ Motor IA</div>
                    <div className="text-base font-bold">Calculá tu próximo viaje</div>
                  </div>

                  <div className="p-6 space-y-4">

                    {/* Camión */}
                    <div>
                      <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: '#1a1714', textTransform: 'uppercase' }}>Camión *</label>
                      <select
                        value={form.camion_id}
                        onChange={e => setForm(p => ({ ...p, camion_id: e.target.value }))}
                        required
                        className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                        style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                      >
                        <option value="">— Seleccioná un camión —</option>
                        {camiones.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.patente} — {c.marca} {c.modelo} ({c.capacidad_max_ton} ton)
                          </option>
                        ))}
                      </select>
                      {camionSeleccionado && (
                        <div className="mt-1.5 text-xs" style={{ fontFamily: 'DM Mono, monospace', color: '#8a8278' }}>
                          Consumo base: {camionSeleccionado.consumo_base_litros} lts/100km · Cond.: {camionSeleccionado.condicion}
                        </div>
                      )}
                    </div>

                    {/* Origen / Destino */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Origen</label>
                        <input
                          type="text"
                          value={form.origen}
                          onChange={e => setForm(p => ({ ...p, origen: e.target.value }))}
                          placeholder="ej: Buenos Aires"
                          className="w-full px-3 py-2.5 text-sm outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Destino</label>
                        <input
                          type="text"
                          value={form.destino}
                          onChange={e => setForm(p => ({ ...p, destino: e.target.value }))}
                          placeholder="ej: Córdoba"
                          className="w-full px-3 py-2.5 text-sm outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                    </div>

                    {/* Botón calcular distancia */}
                    {form.origen.trim() && form.destino.trim() && (
                      <div>
                        <button
                          type="button"
                          onClick={handleCalcularKm}
                          disabled={loadingKm}
                          className="w-full py-2 text-xs font-bold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ backgroundColor: 'rgba(26,107,58,0.1)', border: '1px solid rgba(26,107,58,0.3)', color: '#1a6b3a' }}
                        >
                          {loadingKm ? '📍 Calculando ruta...' : '📍 Calcular kilómetros automáticamente'}
                        </button>
                        {errorKm && (
                          <div className="mt-1.5 px-3 py-2 text-xs" style={{ fontFamily: 'DM Mono, monospace', backgroundColor: 'rgba(212,68,12,0.08)', border: '1px solid rgba(212,68,12,0.25)', color: '#d4440c' }}>
                            ⚠ {errorKm}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mapa de ruta */}
                    {mapaData && (
                      <div style={{ border: '1px solid rgba(26,23,20,0.15)', overflow: 'hidden' }}>
                        <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: '#1a1714' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                            🗺️ Ruta vial — {mapaData.origen.nombre.split(',')[0]} → {mapaData.destino.nombre.split(',')[0]}
                          </span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#d4440c', fontWeight: 700 }}>
                            {mapaData.km} km
                          </span>
                        </div>
                        <MapaRuta
                          polyline={mapaData.polyline}
                          origen={mapaData.origen}
                          destino={mapaData.destino}
                          km={mapaData.km}
                        />
                        <div className="px-3 py-2.5" style={{ backgroundColor: '#fff8e7', borderTop: '2px solid #c8860a' }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#7a5000', fontWeight: 600 }}>
                            ⚠ Distancia estimada por ruta vial. Puede variar según el recorrido real del chofer.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Km y Peso */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Kilómetros *</label>
                        <input
                          type="number"
                          value={form.kilometros}
                          onChange={e => setForm(p => ({ ...p, kilometros: e.target.value }))}
                          placeholder="ej: 700"
                          required min={1}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>
                          Peso carga (ton) *
                          {camionSeleccionado && (
                            <span style={{ color: '#d4440c' }}> máx {camionSeleccionado.capacidad_max_ton}</span>
                          )}
                        </label>
                        <input
                          type="number"
                          value={form.peso_carga}
                          onChange={e => setForm(p => ({ ...p, peso_carga: e.target.value }))}
                          placeholder="ej: 18"
                          required min={0}
                          max={camionSeleccionado?.capacidad_max_ton}
                          step={0.5}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                    </div>

                    {/* Tipo ruta y terreno */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Tipo de ruta</label>
                        <select
                          value={form.tipo_ruta}
                          onChange={e => setForm(p => ({ ...p, tipo_ruta: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        >
                          <option value="autopista">🛣️ Autopista</option>
                          <option value="mixta">🔀 Mixta</option>
                          <option value="urbana">🏙️ Urbana</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Terreno</label>
                        <select
                          value={form.terreno}
                          onChange={e => setForm(p => ({ ...p, terreno: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        >
                          <option value="plano">➡️ Plano</option>
                          <option value="ondulado">〰️ Ondulado</option>
                          <option value="montanoso">⛰️ Montañoso</option>
                        </select>
                      </div>
                    </div>

                    {/* Precio combustible y flete */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Precio gasoil ($/litro) *</label>
                        <input
                          type="number"
                          value={form.precio_combustible}
                          onChange={e => setForm(p => ({ ...p, precio_combustible: e.target.value }))}
                          required min={1}
                          className="w-full px-3 py-2.5 text-sm font-medium outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5" style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#1a1714', textTransform: 'uppercase' }}>Flete cobrado ($) <span style={{ color: '#8a8278' }}>opcional</span></label>
                        <input
                          type="number"
                          value={form.flete_cobrado}
                          onChange={e => setForm(p => ({ ...p, flete_cobrado: e.target.value }))}
                          placeholder="Para ver rentabilidad"
                          min={0}
                          className="w-full px-3 py-2.5 text-sm outline-none"
                          style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="px-3 py-2.5 text-xs" style={{ fontFamily: 'DM Mono, monospace', backgroundColor: 'rgba(212,68,12,0.1)', border: '1px solid rgba(212,68,12,0.3)', color: '#d4440c' }}>
                        ⚠ {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#d4440c' }}
                    >
                      {loading ? '⚡ CALCULANDO...' : '⚡ CALCULAR CON IA'}
                    </button>

                  </div>
                </form>
              </div>

              {/* RESULTADO */}
              <div>
                {!resultado && (
                  <div className="bg-white border border-dashed border-gray-300 p-12 text-center h-full flex flex-col items-center justify-center">
                    <div className="text-5xl mb-4">🧮</div>
                    <div className="text-lg font-bold mb-2">Ingresá los datos del viaje</div>
                    <div className="text-sm" style={{ color: '#8a8278' }}>La IA va a calcular el costo exacto en segundos.</div>
                  </div>
                )}

                {resultado && (
                  <div className="space-y-4" ref={resultadoRef}>

                    {/* Card principal del resultado */}
                    <div className="text-white p-6" style={{ backgroundColor: '#1a1714' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '12px' }}>
                        ✓ Resultado IA — {camionInfo?.patente} {camionInfo?.marca} {camionInfo?.modelo}
                      </div>

                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '56px', fontWeight: 900, lineHeight: 1, color: 'white', marginBottom: '4px' }}>
                        ${resultado.costoTotal.toLocaleString('es-AR')}
                      </div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                        costo total en combustible
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        {[
                          { val: `${resultado.litrosTotales} lts`, lab: 'LITROS' },
                          { val: `$${resultado.costoPorKm}`, lab: '$ / KM' },
                          { val: `×${resultado.factorPeso}`, lab: 'FACTOR PESO' },
                        ].map(item => (
                          <div key={item.lab} style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px', fontWeight: 700 }}>{item.val}</div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginTop: '2px' }}>{item.lab}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Confirmar / Cancelar / Animación / Confirmado */}
                    {!confirmado && !animando && (
                      <div className="flex gap-3">
                        <button
                          onClick={handleConfirmar}
                          disabled={confirmando}
                          className="flex-1 py-3 text-white font-bold text-sm transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#1a6b3a' }}
                        >
                          {confirmando ? 'Guardando...' : '✅ Confirmar viaje'}
                        </button>
                        <button
                          onClick={handleCancelar}
                          className="flex-1 py-3 font-bold text-sm transition-colors"
                          style={{ backgroundColor: 'rgba(212,68,12,0.1)', border: '1px solid rgba(212,68,12,0.35)', color: '#d4440c' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(212,68,12,0.18)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(212,68,12,0.1)')}
                        >
                          ✕ Cancelar
                        </button>
                      </div>
                    )}

                    {(animando || confirmado) && (
                      <div style={{ position:'relative', width:'100%', height:'56px', overflow:'hidden', border:'1px solid rgba(26,107,58,0.3)', background: confirmado ? 'rgba(26,107,58,0.1)' : 'linear-gradient(to bottom,#4fc3f7 0%,#81d4fa 45%,#e8f5e9 75%)' }}>
                        {animando && <TruckAnimation />}
                        {confirmado && (
                          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'14px',color:'#1a6b3a'}}>
                            ✓ Viaje guardado en el historial
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rentabilidad */}
                    {margenNeto && (
                      <div className="p-4 border" style={{ backgroundColor: parseFloat(margenNeto) > 0 ? 'rgba(26,107,58,0.08)' : 'rgba(212,68,12,0.08)', borderColor: parseFloat(margenNeto) > 0 ? 'rgba(26,107,58,0.3)' : 'rgba(212,68,12,0.3)' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                          Rentabilidad del flete
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm" style={{ color: '#4a4540' }}>
                            Flete: ${parseFloat(form.flete_cobrado).toLocaleString('es-AR')} · Combustible: ${resultado.costoTotal.toLocaleString('es-AR')}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '1px', color: colorMargen, textTransform: 'uppercase', marginBottom: '2px' }}>
                              {gananciaNeta! >= 0 ? 'Ganancia' : 'Pérdida'}
                            </div>
                            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '36px', fontWeight: 900, color: colorMargen, lineHeight: 1 }}>
                              {gananciaNeta! >= 0 ? '' : '-'}${Math.abs(Math.round(gananciaNeta!)).toLocaleString('es-AR')}
                            </div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: colorMargen, opacity: 0.75, marginTop: '2px' }}>
                              {parseFloat(margenNeto) > 0 ? '+' : ''}{margenNeto}% del flete
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Explicación de la IA */}
                    <div className="p-4 bg-white border border-gray-200">
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                        🧠 Explicación de la IA
                      </div>
                      <p className="text-sm" style={{ color: '#4a4540', lineHeight: '1.6' }}>{resultado.descripcion}</p>
                    </div>

                    {/* Factores aplicados */}
                    <div className="p-4 bg-white border border-gray-200">
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                        Factores aplicados
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: 'Factor peso de carga', val: `×${resultado.factorPeso}`, pct: resultado.porcentajeCarga },
                          { label: 'Factor tipo de ruta', val: `×${resultado.factorRuta}`, pct: (resultado.factorRuta - 1) * 100 },
                          { label: 'Factor terreno', val: `×${resultado.factorTerreno}`, pct: (resultado.factorTerreno - 1) * 100 },
                        ].map(f => (
                          <div key={f.label}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs" style={{ color: '#4a4540' }}>{f.label}</span>
                              <span className="text-xs font-bold" style={{ fontFamily: 'DM Mono, monospace', color: '#d4440c' }}>{f.val}</span>
                            </div>
                            <div style={{ height: '4px', backgroundColor: '#e8e3db', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(f.pct, 100)}%`, backgroundColor: '#d4440c', borderRadius: '2px' }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

         {viajes.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(26,23,20,0.1)' }}>
                <div className="text-sm font-bold">📋 Últimos viajes calculados</div>
              </div>
              <div>
                {viajes.map((v, i) => (
                  <div key={v.id} className="border-b last:border-b-0" style={{ borderColor: 'rgba(26,23,20,0.08)' }}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">
                          {v.origen && v.destino ? `${v.origen} → ${v.destino}` : `${v.kilometros} km`}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278', marginTop: '2px' }}>
                          {v.camiones?.patente} · {v.peso_carga} ton · estimado: {v.litros_totales} lts
                          {v.litros_reales && <span style={{ color: '#1a6b3a' }}> · real: {v.litros_reales} lts ✓</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px', fontWeight: 700 }}>
                          ${v.costo_total.toLocaleString('es-AR')}
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>
                          ${v.costo_por_km}/km
                        </div>
                      </div>
                    </div>
                    {(v.litros_reales === null || v.litros_reales === undefined) && (
                      <LitrosRealesForm viajeId={v.id} onAprendido={(msg) => alert(msg)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TruckAnimation() {
  return (
    <div style={{position:'absolute',inset:0}}>
      <style>{`
        @keyframes ta_truck {
          0%   { transform:translateX(110%) translateY(0) rotate(0deg); animation-timing-function:linear; }
          48%  { transform:translateX(10%)  translateY(0) rotate(0deg); animation-timing-function:ease-in; }
          60%  { transform:translateX(-15%) translateY(-3px) rotate(1.5deg); animation-timing-function:ease-out; }
          75%  { transform:translateX(-55%) translateY(-1px) rotate(0.3deg); animation-timing-function:linear; }
          100% { transform:translateX(-115%) translateY(0) rotate(0deg); }
        }
        @keyframes ta_truck { 0%{transform:translateX(110%);animation-timing-function:linear} 45%{transform:translateX(8%);animation-timing-function:ease-in} 58%{transform:translateX(-18%) translateY(-3px) rotate(1.5deg);animation-timing-function:ease-out} 100%{transform:translateX(-115%)} }
        @keyframes ta_road  { 0%{transform:translateX(0)} 100%{transform:translateX(50%)} }
        @keyframes ta_tree  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes ta_cloud { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes ta_wR    { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes ta_smoke {
          0%   { opacity:0;   transform:translate(0,0) scale(0.2); }
          20%  { opacity:0.5; }
          100% { opacity:0;   transform:translate(6px,-14px) scale(1.4); }
        }
        @keyframes ta_smoke2 {
          0%   { opacity:0;   transform:translate(0,0) scale(0.15); }
          25%  { opacity:0.4; }
          100% { opacity:0;   transform:translate(4px,-10px) scale(1.2); }
        }
      `}</style>

      {/* Nubes */}
      <div style={{position:'absolute',top:'2px',left:0,width:'200%',animation:'ta_cloud 10s linear infinite'}}>
        {[0,1].map(r=>(
          <svg key={r} width="700" height="18" viewBox="0 0 700 18" fill="none" style={{display:'inline-block',flexShrink:0}}>
            {[[80,8,14],[260,6,10],[460,9,16],[620,5,9]].map(([x,y,s],i)=>(
              <g key={i}>
                <ellipse cx={x} cy={y} rx={s} ry={s*0.5} fill="white" opacity="0.85"/>
                <ellipse cx={x+s*0.6} cy={y+2} rx={s*0.55} ry={s*0.38} fill="white" opacity="0.8"/>
              </g>
            ))}
          </svg>
        ))}
      </div>

      {/* Árboles */}
      <div style={{position:'absolute',bottom:'18px',left:0,width:'200%',animation:'ta_tree 1.8s linear infinite'}}>
        {[0,1].map(r=>(
          <svg key={r} width="700" height="22" viewBox="0 0 700 22" fill="none" style={{display:'inline-block',flexShrink:0}}>
            {[[40,10],[130,12],[240,9],[360,11],[480,10],[600,12]].map(([x,y],i)=>(
              <g key={i}>
                <rect x={x-2} y={y+4} width={3} height={22-y-4} fill="#5d4037"/>
                <polygon points={`${x},${y-6} ${x-9},${y+6} ${x+9},${y+6}`} fill={i%2===0?"#2e7d32":"#388e3c"}/>
                <polygon points={`${x},${y}   ${x-7},${y+9} ${x+7},${y+9}`} fill={i%2===0?"#388e3c":"#43a047"}/>
              </g>
            ))}
          </svg>
        ))}
      </div>

      {/* Pasto */}
      <div style={{position:'absolute',bottom:'16px',left:0,right:0,height:'4px',backgroundColor:'#66bb6a'}}/>

      {/* Asfalto */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'18px',backgroundColor:'#424242'}}/>
      <div style={{position:'absolute',bottom:'17px',left:0,right:0,height:'2px',backgroundColor:'#f5f5f5'}}/>
      <div style={{position:'absolute',bottom:'1px',left:0,right:0,height:'2px',backgroundColor:'#f5f5f5'}}/>

      {/* Línea punteada */}
      <div style={{
        position:'absolute',bottom:'8px',left:0,
        width:'200%',height:'2px',
        background:'repeating-linear-gradient(90deg,#f5f5f5 0px,#f5f5f5 24px,transparent 24px,transparent 48px)',
        animation:'ta_road 0.35s linear infinite',
      }}/>

      {/* Camión escalado pequeño */}
      <div style={{position:'absolute',bottom:'16px',right:0,width:'100%',animation:'ta_truck 2.1s forwards',fontSize:'0',zIndex:3}}>
        <svg width="160" height="38" viewBox="0 0 260 62" fill="none" style={{height:'38px',width:'auto'}}>
          {/* Escapes */}
          <rect x="82" y="2" width="5" height="10" rx="2" fill="#90a4ae"/>
          <rect x="90" y="2" width="5" height="10" rx="2" fill="#90a4ae"/>
          <circle cx="86" cy="2" r="5" fill="rgba(150,150,150,0.6)" style={{animation:'ta_smoke 0.6s ease-out 1.8s infinite',opacity:0}}/>
          <circle cx="94" cy="2" r="4" fill="rgba(180,180,180,0.45)" style={{animation:'ta_smoke2 0.65s ease-out 1.95s infinite',opacity:0}}/>
          {/* Parachoque + grille */}
          <rect x="3" y="34" width="14" height="16" rx="2" fill="#cfd8dc"/>
          <rect x="3" y="20" width="14" height="15" rx="1" fill="#78909c"/>
          {[0,1,2,3,4].map(i=>(<rect key={i} x="3" y={22+i*2.8} width="14" height="1.2" fill="#b0bec5" opacity="0.9"/>))}
          <rect x="4" y="36" width="11" height="7" rx="1" fill="#fff9c4"/>
          <rect x="4" y="34" width="11" height="3" rx="1" fill="#ffcc02" opacity="0.85"/>
          {/* Capó */}
          <rect x="17" y="20" width="46" height="30" rx="3" fill="#c62828"/>
          <rect x="19" y="21" width="42" height="5" rx="1" fill="#ef5350" opacity="0.5"/>
          {/* Espejo */}
          <rect x="57" y="14" width="9" height="5" rx="1" fill="#b71c1c"/>
          <rect x="62" y="11" width="3" height="8" fill="#8d1515"/>
          {/* Cabina */}
          <rect x="63" y="8" width="50" height="42" rx="5" fill="#c62828"/>
          <path d="M63,8 Q82,1 113,5 L113,11 L63,11 Z" fill="#b71c1c"/>
          <rect x="65" y="12" width="23" height="20" rx="3" fill="rgba(144,202,249,0.7)"/>
          <rect x="67" y="14" width="10" height="9" rx="1" fill="rgba(255,255,255,0.22)"/>
          <rect x="88" y="15" width="20" height="27" rx="2" fill="rgba(0,0,0,0.07)"/>
          <circle cx="91" cy="29" r="2" fill="rgba(255,255,255,0.5)"/>
          <rect x="63" y="36" width="50" height="4" fill="rgba(0,0,0,0.2)"/>
          {/* Sleeper */}
          <rect x="113" y="11" width="26" height="39" rx="2" fill="#ad1414"/>
          <rect x="120" y="16" width="13" height="11" rx="2" fill="rgba(144,202,249,0.5)"/>
          <rect x="111" y="11" width="4" height="39" fill="#8b0000" opacity="0.4"/>
          {/* Trailer */}
          <rect x="144" y="14" width="112" height="32" rx="2" fill="#e0e0e0"/>
          <rect x="146" y="16" width="108" height="28" rx="1" fill="#eeeeee"/>
          <rect x="146" y="16" width="108" height="3" fill="#bdbdbd"/>
          <rect x="146" y="41" width="108" height="3" fill="#bdbdbd"/>
          <rect x="146" y="26" width="108" height="4" fill="#ef5350" opacity="0.8"/>
          <text x="166" y="26" fontFamily="sans-serif" fontWeight="900" fontSize="11" fill="#c62828">FletIA</text>
          <rect x="250" y="14" width="6" height="32" fill="#bdbdbd" rx="1"/>
          {/* Humo ruedas */}
          <circle cx="226" cy="44" r="6" fill="rgba(190,190,190,0.5)" style={{animation:'ta_smoke 0.5s ease-out 1.85s infinite',opacity:0}}/>
          <circle cx="236" cy="42" r="7" fill="rgba(170,170,170,0.38)" style={{animation:'ta_smoke2 0.55s ease-out 2.0s infinite',opacity:0}}/>
          {/* Ruedas */}
          <circle cx={38} cy={52} r={11} fill="#212121" style={{animation:'ta_wR 0.28s linear infinite',transformOrigin:'38px 52px'}}/>
          <circle cx={38} cy={52} r={7} fill="#424242"/>
          <line x1={38} y1={43} x2={38} y2={61} stroke="#666" strokeWidth="1.5"/>
          <line x1={30} y1={52} x2={46} y2={52} stroke="#666" strokeWidth="1.5"/>
          <circle cx={38} cy={52} r={2.5} fill="#9e9e9e"/>
          {[116,133].map(cx=>(
            <g key={cx}>
              <circle cx={cx} cy={52} r={11} fill="#212121" style={{animation:'ta_wR 0.28s linear infinite',transformOrigin:`${cx}px 52px`}}/>
              <circle cx={cx} cy={52} r={7} fill="#424242"/>
              <line x1={cx} y1={43} x2={cx} y2={61} stroke="#666" strokeWidth="1.5"/>
              <line x1={cx-8} y1={52} x2={cx+8} y2={52} stroke="#666" strokeWidth="1.5"/>
              <circle cx={cx} cy={52} r={2.5} fill="#9e9e9e"/>
            </g>
          ))}
          {[218,234].map(cx=>(
            <g key={cx}>
              <circle cx={cx} cy={52} r={11} fill="#212121" style={{animation:'ta_wR 0.28s linear infinite',transformOrigin:`${cx}px 52px`}}/>
              <circle cx={cx} cy={52} r={7} fill="#424242"/>
              <line x1={cx} y1={43} x2={cx} y2={61} stroke="#666" strokeWidth="1.5"/>
              <line x1={cx-8} y1={52} x2={cx+8} y2={52} stroke="#666" strokeWidth="1.5"/>
              <circle cx={cx} cy={52} r={2.5} fill="#9e9e9e"/>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function LitrosRealesForm({ viajeId, onAprendido }: { viajeId: string; onAprendido: (msg: string) => void }) {
  const [litros, setLitros] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!litros || parseFloat(litros) <= 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/viajes/aprender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viaje_id: viajeId, litros_reales: parseFloat(litros) }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        onAprendido(data.mensaje);
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-6 pb-4">
      <input
        type="number"
        value={litros}
        onChange={e => setLitros(e.target.value)}
        placeholder="Litros reales cargados"
        step="0.1" min="1"
        className="px-3 py-1.5 text-xs outline-none flex-1 max-w-[180px]"
        style={{ backgroundColor: '#f0ede8', border: '1px solid rgba(26,23,20,0.2)' }}
      />
      <button
        type="submit"
        disabled={loading || !litros}
        className="px-3 py-1.5 text-xs text-white font-bold disabled:opacity-50"
        style={{ backgroundColor: '#1a6b3a' }}
      >
        {loading ? '...' : '🧠 Enseñar IA'}
      </button>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#8a8278' }}>
        ¿Cuánto cargaste realmente?
      </span>
    </form>
  );
}
