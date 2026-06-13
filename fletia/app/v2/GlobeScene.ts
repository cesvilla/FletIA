import * as THREE from 'three';

/**
 * Globo terráqueo con red logística — el momento "wow" estilo Terminal/web.with.ai,
 * pero en naranja FletIA en vez de verde. Esfera de puntos (tipo tierra punteada)
 * con arcos de gran círculo que conectan hubs, pulsos viajando por los arcos y un
 * campo de estrellas. Todo procedural (sin assets). Render en un canvas propio
 * dentro de la sección "Red inteligente".
 */

const ACCENT = 0xeb4b15;
const CREAM = 0xf0ede8;
const R = 2.4;

export interface GlobeAPI {
  resize(): void;
  dispose(): void;
}

export function createGlobeScene(canvas: HTMLCanvasElement): GlobeAPI {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const w = () => canvas.clientWidth || 1;
  const h = () => canvas.clientHeight || 1;
  renderer.setSize(w(), h(), false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, w() / h(), 0.1, 100);
  camera.position.set(0, 1.2, 8.2);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.PointLight(ACCENT, 40, 30, 2);
  key.position.set(5, 4, 6);
  scene.add(key);

  const globe = new THREE.Group();
  globe.rotation.z = -0.32; // inclinación tipo eje terrestre
  scene.add(globe);

  // Esfera sólida oscura: oculta los arcos de la cara trasera (lee como globo real).
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0x0e0b09, metalness: 0.3, roughness: 0.9 }),
  );
  globe.add(core);

  // Tierra punteada (fibonacci sphere) en crema tenue + hubs naranjas.
  const dots = 2200;
  const dPos = new Float32Array(dots * 3);
  const dCol = new Float32Array(dots * 3);
  const cA = new THREE.Color(ACCENT);
  const cC = new THREE.Color(CREAM);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < dots; i++) {
    const y = 1 - (i / (dots - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(R * 1.002);
    dPos[i * 3] = v.x; dPos[i * 3 + 1] = v.y; dPos[i * 3 + 2] = v.z;
    const hub = Math.random() < 0.08;
    const c = hub ? cA : cC;
    const k = hub ? 1 : 0.35;
    dCol[i * 3] = c.r * k; dCol[i * 3 + 1] = c.g * k; dCol[i * 3 + 2] = c.b * k;
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dMat = new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  globe.add(new THREE.Points(dGeo, dMat));

  // Halo atmosférico.
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.08, 48, 48),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.06, side: THREE.BackSide }),
  );
  globe.add(halo);

  // Arcos de red entre hubs (grandes círculos elevados).
  // Hubs distribuidos por TODO el globo (fibonacci) → red global y dispareja.
  const HUBN = 52;
  const hubs: THREE.Vector3[] = [];
  const gAng = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < HUBN; i++) {
    const y = 1 - (i / (HUBN - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = gAng * i;
    hubs.push(new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).multiplyScalar(R));
  }
  // Puntos brillantes en cada hub.
  const hubMat = new THREE.PointsMaterial({ color: ACCENT, size: 0.11, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const hubGeo = new THREE.BufferGeometry().setFromPoints(hubs.map((h) => h.clone().multiplyScalar(1.01)));
  globe.add(new THREE.Points(hubGeo, hubMat));

  const arcMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending });
  const curves: THREE.QuadraticBezierCurve3[] = [];
  const ARC_N = 135;
  let guard = 0;
  while (curves.length < ARC_N && guard++ < ARC_N * 5) {
    const a = hubs[Math.floor(Math.random() * hubs.length)];
    const b = hubs[Math.floor(Math.random() * hubs.length)];
    if (a.distanceTo(b) < 0.7) continue;
    // Comba baja: las líneas quedan pegadas a la superficie y cruzan el globo.
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.04 + a.distanceTo(b) * 0.05));
    const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(38)), arcMat));
    curves.push(curve);
  }

  // Pulsos que viajan por los arcos.
  const pulseGeo = new THREE.BufferGeometry();
  const pulsePos = new Float32Array(curves.length * 3);
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulseMat = new THREE.PointsMaterial({ color: 0xffd9c2, size: 0.14, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const pulses = new THREE.Points(pulseGeo, pulseMat);
  globe.add(pulses);
  const pulseT = curves.map(() => Math.random());
  const pulseSpd = curves.map(() => 0.0016 + Math.random() * 0.0026);

  // Estrellas de fondo.
  const starCount = 600;
  const sPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize().multiplyScalar(14 + Math.random() * 16);
    sPos[i * 3] = v.x; sPos[i * 3 + 1] = v.y; sPos[i * 3 + 2] = v.z;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sMat = new THREE.PointsMaterial({ color: CREAM, size: 0.05, transparent: true, opacity: 0.4, depthWrite: false });
  const stars = new THREE.Points(sGeo, sMat);
  scene.add(stars);

  let raf = 0, alive = true;
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();

  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const t = clock.elapsedTime;
    globe.rotation.y = t * 0.17;
    stars.rotation.y = t * 0.01;
    for (let i = 0; i < curves.length; i++) {
      pulseT[i] += pulseSpd[i];
      if (pulseT[i] > 1) pulseT[i] = 0;
      curves[i].getPoint(pulseT[i], tmp);
      pulsePos[i * 3] = tmp.x; pulsePos[i * 3 + 1] = tmp.y; pulsePos[i * 3 + 2] = tmp.z;
    }
    pulseGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = w() / h();
    camera.updateProjectionMatrix();
    renderer.setSize(w(), h(), false);
  }
  function dispose() {
    alive = false;
    cancelAnimationFrame(raf);
    scene.traverse((o) => {
      const any = o as unknown as { geometry?: THREE.BufferGeometry };
      if (any.geometry) any.geometry.dispose();
    });
    [dMat, hubMat, arcMat, pulseMat, sMat].forEach((m) => m.dispose());
    renderer.dispose();
  }

  frame();
  return { resize, dispose };
}
