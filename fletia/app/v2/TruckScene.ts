import * as THREE from 'three';

/**
 * Escena 3D procedural para la landing v2 de FletIA.
 * Camión semirremolque construido por código (sin glTF): arranca como
 * estructura alámbrica (wireframe naranja) y se "materializa" a sólido a
 * medida que avanza el scroll. Grilla industrial con niebla + partículas.
 *
 * No usa postprocesado (bloom) para mantener el peso/CPU bajo y correr fluido
 * en gama media. Todo se anima en un loop RAF, manejado por setProgress() que
 * dispara el ScrollTrigger desde el componente React.
 */

const ACCENT = 0xeb4b15;
const DARK = 0x0d0b09;
const CREAM = 0xf0ede8;

export interface SceneAPI {
  setProgress(p: number): void;
  setPointer(x: number, y: number): void;
  resize(): void;
  dispose(): void;
}

// Interpola entre keyframes de cámara según el progreso 0..1.
interface Key { pos: [number, number, number]; look: [number, number, number]; }
const KEYS: Key[] = [
  { pos: [6.5, 2.4, 9.5], look: [0, 1, 0] },     // hero — 3/4 frontal
  { pos: [-7.5, 1.8, 7.5], look: [-0.5, 1, 0] }, // capacidades — lateral
  { pos: [0.5, 5.5, 13], look: [0, 1.2, -2] },   // cómo funciona — vista alta
  { pos: [9, 3, 11], look: [0, 1.6, 0] },        // planes — plano amplio
];

export function createTruckScene(canvas: HTMLCanvasElement): SceneAPI {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(DARK, 9, 36);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(KEYS[0].pos[0], KEYS[0].pos[1], KEYS[0].pos[2]);

  // ---- Luces (industrial, cálida) ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff0e6, 1.5);
  key.position.set(6, 10, 6);
  scene.add(key);
  const rim = new THREE.PointLight(ACCENT, 60, 40, 2); // borde naranja sci-fi
  rim.position.set(-6, 3, -6);
  scene.add(rim);
  const fill = new THREE.PointLight(0x3a6ea5, 25, 40, 2); // relleno frío sutil
  fill.position.set(8, 1, 8);
  scene.add(fill);

  // ---- Materiales ----
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1613, metalness: 0.85, roughness: 0.34,
    transparent: true, opacity: 0,
  });
  const trailerMat = new THREE.MeshStandardMaterial({
    color: 0x24201c, metalness: 0.7, roughness: 0.45,
    transparent: true, opacity: 0,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.9,
    metalness: 0.4, roughness: 0.4, transparent: true, opacity: 0,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x86b8e0, metalness: 0.9, roughness: 0.1,
    transparent: true, opacity: 0,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a, metalness: 0.2, roughness: 0.8,
    transparent: true, opacity: 0,
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: CREAM, metalness: 0.9, roughness: 0.3, transparent: true, opacity: 0 });

  const solidMats = [bodyMat, trailerMat, accentMat, glassMat, tireMat, rimMat];
  const edgeMats: THREE.LineBasicMaterial[] = [edgeMat];

  // Caja con bordes alámbricos brillantes superpuestos.
  function panel(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat);
    m.add(e);
    return m;
  }

  const truck = new THREE.Group();

  // Remolque
  const trailer = panel(7, 2.7, 2.5, trailerMat);
  trailer.position.set(-1.6, 1.55, 0);
  truck.add(trailer);

  // Chasis del remolque
  const chassis = panel(7, 0.25, 2.2, bodyMat);
  chassis.position.set(-1.6, 0.35, 0);
  truck.add(chassis);

  // Cabina (cuerpo)
  const cab = panel(2.1, 1.9, 2.4, bodyMat);
  cab.position.set(3.1, 1.15, 0);
  truck.add(cab);
  // Techo/cucheta de la cabina
  const cabTop = panel(1.5, 0.8, 2.3, bodyMat);
  cabTop.position.set(2.9, 2.35, 0);
  truck.add(cabTop);
  // Parabrisas
  const windshield = panel(0.12, 1.0, 2.0, glassMat);
  windshield.position.set(4.16, 1.5, 0);
  truck.add(windshield);
  // Franja de acento naranja en el remolque
  const stripe = panel(7.02, 0.28, 2.52, accentMat);
  stripe.position.set(-1.6, 1.95, 0);
  truck.add(stripe);
  // Parrilla/frente
  const grille = panel(0.15, 1.2, 2.2, accentMat);
  grille.position.set(4.2, 0.85, 0);
  truck.add(grille);

  // Ruedas (cilindros) con llanta crema
  function wheel(x: number, z: number) {
    const g = new THREE.Group();
    const tireG = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 22);
    const tire = new THREE.Mesh(tireG, tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.add(new THREE.LineSegments(new THREE.EdgesGeometry(tireG), edgeMat));
    const hubG = new THREE.CylinderGeometry(0.2, 0.2, 0.42, 12);
    const hub = new THREE.Mesh(hubG, rimMat);
    hub.rotation.x = Math.PI / 2;
    g.add(tire); g.add(hub);
    g.position.set(x, 0.55, z);
    return g;
  }
  [[3.4, 1.05], [3.4, -1.05], [-1.2, 1.05], [-1.2, -1.05], [-3.0, 1.05], [-3.0, -1.05]]
    .forEach(([x, z]) => truck.add(wheel(x, z)));

  truck.position.y = 0;
  scene.add(truck);

  // ---- Grilla industrial ----
  const grid = new THREE.GridHelper(80, 80, ACCENT, 0x2a2420);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.25;
  grid.position.y = -0.02;
  scene.add(grid);

  // ---- Partículas (campo de datos) ----
  const pCount = 1300;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 60;
    pPos[i * 3 + 1] = Math.random() * 22;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: ACCENT, size: 0.07, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ---- Estado / animación ----
  let target = 0;       // progreso objetivo (scroll)
  let current = 0;      // progreso suavizado
  let px = 0, py = 0;   // parallax puntero
  let cpx = 0, cpy = 0;
  let raf = 0;
  let alive = true;
  const clock = new THREE.Clock();

  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const look = new THREE.Vector3();

  function camAt(p: number) {
    const seg = p * (KEYS.length - 1);
    const i = Math.min(KEYS.length - 2, Math.floor(seg));
    const t = THREE.MathUtils.smoothstep(seg - i, 0, 1);
    const a = KEYS[i], b = KEYS[i + 1];
    v1.set(a.pos[0], a.pos[1], a.pos[2]);
    v2.set(b.pos[0], b.pos[1], b.pos[2]);
    v1.lerp(v2, t);
    look.set(
      THREE.MathUtils.lerp(a.look[0], b.look[0], t),
      THREE.MathUtils.lerp(a.look[1], b.look[1], t),
      THREE.MathUtils.lerp(a.look[2], b.look[2], t),
    );
    return v1;
  }

  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // suavizado del progreso y del parallax
    current += (target - current) * Math.min(1, dt * 3);
    cpx += (px - cpx) * Math.min(1, dt * 2.5);
    cpy += (py - cpy) * Math.min(1, dt * 2.5);

    // cámara por keyframes + parallax
    const pos = camAt(current);
    camera.position.set(pos.x + cpx * 1.2, pos.y + cpy * 0.8, pos.z);
    camera.lookAt(look.x, look.y, look.z);

    // materialización wireframe -> sólido (primer ~25% del scroll)
    const fill = THREE.MathUtils.smoothstep(current, 0.02, 0.26);
    bodyMat.opacity = fill;
    trailerMat.opacity = fill * 0.96;
    accentMat.opacity = fill;
    glassMat.opacity = fill * 0.85;
    tireMat.opacity = fill;
    rimMat.opacity = fill;
    edgeMat.opacity = 0.95 - fill * 0.45; // las líneas se atenúan al rellenarse
    accentMat.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.25; // pulso del acento

    // idle del camión + partículas vivas
    truck.rotation.y = Math.sin(t * 0.18) * 0.12 + current * 0.5;
    truck.position.y = Math.sin(t * 0.9) * 0.04;
    particles.rotation.y = t * 0.02;
    pMat.opacity = 0.35 + current * 0.35; // más densas hacia la sección de datos

    renderer.render(scene, camera);
  }

  function setProgress(p: number) { target = Math.max(0, Math.min(1, p)); }
  function setPointer(x: number, y: number) { px = x; py = y; }
  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  function dispose() {
    alive = false;
    cancelAnimationFrame(raf);
    scene.traverse((o) => {
      const any = o as unknown as { geometry?: THREE.BufferGeometry };
      if (any.geometry) any.geometry.dispose();
    });
    [...solidMats, ...edgeMats, pMat].forEach((m) => m.dispose());
    pGeo.dispose();
    renderer.dispose();
  }

  frame();
  return { setProgress, setPointer, resize, dispose };
}
