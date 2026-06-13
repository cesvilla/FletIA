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
  { pos: [8.5, 2.6, 11], look: [-0.6, 1.4, 0] },   // hero — 3/4 frontal, ve capó + lateral
  { pos: [-9.5, 2.2, 8], look: [-2.5, 1.4, 0] },   // capacidades — lateral del remolque
  { pos: [0, 6.8, 15.5], look: [-0.6, 1.2, -1] },  // cómo funciona — vista alta
  { pos: [10.5, 3.2, 12], look: [-0.6, 1.7, 0] },  // planes — plano amplio
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
  const bodyMat = new THREE.MeshStandardMaterial({ // cabina blanca
    color: 0xe8e2da, metalness: 0.55, roughness: 0.36, transparent: true, opacity: 0,
  });
  const trailerMat = new THREE.MeshStandardMaterial({ // remolque plata
    color: 0xcecac4, metalness: 0.66, roughness: 0.42, transparent: true, opacity: 0,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.9,
    metalness: 0.4, roughness: 0.4, transparent: true, opacity: 0,
  });
  const glassMat = new THREE.MeshStandardMaterial({ // parabrisas ahumado
    color: 0x222d36, metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c0d, metalness: 0.2, roughness: 0.85, transparent: true, opacity: 0,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ // escapes, tanques, paragolpes
    color: 0xdfe2e6, metalness: 1, roughness: 0.18, transparent: true, opacity: 0,
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, metalness: 0.95, roughness: 0.3, transparent: true, opacity: 0 });

  const solidMats = [bodyMat, trailerMat, accentMat, glassMat, tireMat, chromeMat, rimMat];
  const edgeMats: THREE.LineBasicMaterial[] = [edgeMat];

  // Caja con bordes alámbricos brillantes superpuestos.
  function panel(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat);
    m.add(e);
    return m;
  }

  // Cilindro con bordes (escapes, tanques). axis: eje del cilindro.
  function cyl(r: number, len: number, seg: number, mat: THREE.Material, axis: 'x' | 'y' | 'z') {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    const m = new THREE.Mesh(g, mat);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat));
    return m;
  }

  // Camión semirremolque americano (capó largo) mirando hacia +X.
  const truck = new THREE.Group();

  // Chasis (riel largo)
  const chassis = panel(11, 0.22, 1.0, chromeMat);
  chassis.position.set(-1.2, 0.66, 0);
  truck.add(chassis);

  // Remolque (caja larga plata) + franja naranja
  const trailer = panel(7.0, 1.95, 2.5, trailerMat);
  trailer.position.set(-2.6, 2.05, 0);
  truck.add(trailer);
  const stripe = panel(7.02, 0.22, 2.52, accentMat);
  stripe.position.set(-2.6, 1.52, 0);
  truck.add(stripe);

  // Cabina / sleeper (alta) y capó largo (más bajo, adelante)
  const cab = panel(1.95, 2.15, 2.4, bodyMat);
  cab.position.set(2.0, 1.82, 0);
  truck.add(cab);
  const hood = panel(1.55, 1.15, 2.3, bodyMat);
  hood.position.set(3.68, 1.32, 0);
  truck.add(hood);

  // Parabrisas inclinado
  const wind = panel(0.12, 0.95, 2.05, glassMat);
  wind.position.set(2.99, 2.12, 0);
  wind.rotation.z = -0.34;
  truck.add(wind);

  // Parrilla naranja + paragolpes cromado + faros
  const grille = panel(0.14, 0.9, 1.9, accentMat);
  grille.position.set(4.46, 1.32, 0);
  truck.add(grille);
  const bumper = panel(0.3, 0.42, 2.5, chromeMat);
  bumper.position.set(4.52, 0.78, 0);
  truck.add(bumper);
  [1, -1].forEach((s) => {
    const hl = panel(0.1, 0.26, 0.4, accentMat);
    hl.position.set(4.44, 1.02, s * 0.82);
    truck.add(hl);
  });

  // Escapes verticales cromados detrás de la cabina
  [1, -1].forEach((s) => {
    const stack = cyl(0.09, 2.7, 14, chromeMat, 'y');
    stack.position.set(1.02, 2.0, s * 1.3);
    truck.add(stack);
  });
  // Tanques de combustible cromados bajo la cabina
  [1, -1].forEach((s) => {
    const tank = cyl(0.33, 1.2, 18, chromeMat, 'x');
    tank.position.set(1.9, 0.78, s * 1.33);
    truck.add(tank);
  });

  // Ruedas
  function wheel(x: number, z: number) {
    const g = new THREE.Group();
    const tireG = new THREE.CylinderGeometry(0.56, 0.56, 0.36, 22);
    const tire = new THREE.Mesh(tireG, tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.add(new THREE.LineSegments(new THREE.EdgesGeometry(tireG), edgeMat));
    const hubG = new THREE.CylinderGeometry(0.22, 0.22, 0.38, 12);
    const hub = new THREE.Mesh(hubG, rimMat);
    hub.rotation.x = Math.PI / 2;
    g.add(tire); g.add(hub);
    g.position.set(x, 0.56, z);
    return g;
  }
  // delantera (steer) · traseras del tractor (2 ejes) · remolque (2 ejes)
  [3.78, 1.35, 0.55, -3.9, -4.8].forEach((x) => {
    [1.13, -1.13].forEach((z) => truck.add(wheel(x, z)));
  });

  truck.position.set(0, 0, 0);
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
    chromeMat.opacity = fill;
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
