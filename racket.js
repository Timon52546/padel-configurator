// PadelForge 3D racket engine (three.js)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const SHAPES = {
  round:    { name: 'Rond',    note: 'Controle', roundness: 2.3,  topBias: 0.0,  width: 0.88 },
  teardrop: { name: 'Traan',   note: 'Allround', roundness: 2.15, topBias: 0.35, width: 0.86 },
  diamond:  { name: 'Diamant', note: 'Power',    roundness: 1.7,  topBias: 0.65, width: 0.84 }
};

export const DESIGNS = {
  solid:    { name: 'Effen',        price: 0 },
  stripes:  { name: 'Strepen',      price: 10 },
  fade:     { name: 'Verloop',      price: 10 },
  split:    { name: 'Split',        price: 10 },
  waves:    { name: 'Golven',       price: 12 },
  geo:      { name: 'Geometrisch',  price: 15 },
  halftone: { name: 'Halftone',     price: 15 },
  bolt:     { name: 'Bliksem',      price: 12 }
};

export const STICKERS = ['circle', 'ring', 'star', 'triangle', 'heart', 'bolt', 'hexagon', 'stripe', 'crown', 'flame'];

const HEAD_H = 3.0;

// ---------- Geometry helpers ----------
export function headOutline(p, segments = 180) {
  const a = (HEAD_H * p.width) / 2;
  const b = HEAD_H / 2;
  const e = 2 / p.roundness;
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    let x = a * Math.sign(c) * Math.pow(Math.abs(c), e);
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), e);
    const ny = y / b;
    x *= 1 + p.topBias * 0.32 * ny;
    if (ny < 0) x *= 1 - p.topBias * 0.18 * ny * ny;
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
}

export function outlineBounds(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of pts) {
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

const scalePts = (pts, k) => pts.map(v => new THREE.Vector2(v.x * k, v.y * k));

function inside(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

// Canvas size that matches the head proportions (so text is not stretched)
export function textureSize(shapeParams) {
  const bb = outlineBounds(headOutline(shapeParams));
  return { w: Math.round(1024 * bb.w / bb.h), h: 1024 };
}

// Head outline in canvas pixel coordinates
export function outlineInCanvas(shapeParams, w, h) {
  const pts = headOutline(shapeParams, 120);
  const bb = outlineBounds(pts);
  return pts.map(v => [((v.x - bb.minX) / bb.w) * w, ((bb.maxY - v.y) / bb.h) * h]);
}

// ---------- Design drawing (2D, becomes the 3D texture) ----------
function stickerPath(ctx, type, s) {
  const r = s / 2;
  ctx.beginPath();
  switch (type) {
    case 'circle': ctx.arc(0, 0, r, 0, Math.PI * 2); break;
    case 'ring': ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2, true); break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const t = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
      }
      ctx.closePath(); break;
    case 'triangle': ctx.moveTo(0, -r); ctx.lineTo(r * 0.93, r * 0.7); ctx.lineTo(-r * 0.93, r * 0.7); ctx.closePath(); break;
    case 'heart':
      ctx.moveTo(0, r * 0.85);
      ctx.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.55, -r * 1.05, 0, -r * 0.4);
      ctx.bezierCurveTo(r * 0.55, -r * 1.05, r * 1.3, -r * 0.1, 0, r * 0.85);
      ctx.closePath(); break;
    case 'bolt':
      ctx.moveTo(r * 0.2, -r); ctx.lineTo(-r * 0.55, r * 0.1); ctx.lineTo(-r * 0.05, r * 0.1);
      ctx.lineTo(-r * 0.25, r); ctx.lineTo(r * 0.55, -r * 0.15); ctx.lineTo(r * 0.05, -r * 0.15); ctx.closePath(); break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
      ctx.closePath(); break;
    case 'stripe': ctx.rect(-r * 2.2, -r * 0.18, r * 4.4, r * 0.36); break;
    case 'crown':
      ctx.moveTo(-r, r * 0.6); ctx.lineTo(-r, -r * 0.5); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(0, -r * 0.8);
      ctx.lineTo(r * 0.5, 0); ctx.lineTo(r, -r * 0.5); ctx.lineTo(r, r * 0.6); ctx.closePath(); break;
    case 'flame':
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.9, -r * 0.2, r * 0.9, r * 0.9, 0, r);
      ctx.bezierCurveTo(-r * 0.9, r * 0.9, -r * 0.8, 0, -r * 0.25, -r * 0.35);
      ctx.bezierCurveTo(-r * 0.2, 0, 0, 0.1 * r, 0, -r);
      ctx.closePath(); break;
  }
}

export function drawSticker(ctx, st, w, h, images) {
  const s = st.size * h;
  ctx.save();
  ctx.translate(st.x * w, st.y * h);
  ctx.rotate((st.rot || 0) * Math.PI / 180);
  if (st.type === 'image') {
    const img = images && images[st.imgId];
    if (img) {
      const ar = img.width / img.height;
      const dw = ar >= 1 ? s : s * ar, dh = ar >= 1 ? s / ar : s;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    }
  } else {
    ctx.fillStyle = st.color;
    stickerPath(ctx, st.type, s);
    ctx.fill('evenodd');
  }
  ctx.restore();
}

let carbonPatternCache = null;
function carbonPattern(ctx) {
  if (!carbonPatternCache) {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8);
    g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(8, 0, 8, 8); g.fillRect(0, 8, 8, 8);
    carbonPatternCache = c;
  }
  return ctx.createPattern(carbonPatternCache, 'repeat');
}

export function drawDesign(ctx, w, h, cfg, images) {
  const A = cfg.accent, B = cfg.accent2 || cfg.accent;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = cfg.face; ctx.fillRect(0, 0, w, h);
  ctx.save();
  switch (cfg.design) {
    case 'stripes':
      ctx.translate(w / 2, h / 2); ctx.rotate(-0.5);
      ctx.fillStyle = A;
      for (let x = -h * 1.2; x < h * 1.2; x += h * 0.11) ctx.fillRect(x, -h, h * 0.035, h * 2);
      ctx.fillStyle = B; ctx.fillRect(-h * 0.03, -h, h * 0.06, h * 2);
      break;
    case 'fade': {
      const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
      g.addColorStop(0, cfg.face); g.addColorStop(0.55, A); g.addColorStop(1, B);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'split':
      ctx.fillStyle = A;
      ctx.beginPath(); ctx.moveTo(w * 0.62, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w * 0.18, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = B;
      ctx.beginPath(); ctx.moveTo(w * 0.55, 0); ctx.lineTo(w * 0.6, 0); ctx.lineTo(w * 0.16, h); ctx.lineTo(w * 0.11, h); ctx.closePath(); ctx.fill();
      break;
    case 'waves':
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? A : B;
        ctx.globalAlpha = 0.35 + i * 0.09;
        ctx.beginPath();
        const base = h * (0.35 + i * 0.1);
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) ctx.lineTo(x, base + Math.sin(x / w * Math.PI * 2 + i) * h * 0.04);
        ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    case 'geo': {
      const cell = h / 9;
      let seed = 7;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let y = 0; y < h + cell; y += cell) for (let x = 0; x < w + cell; x += cell) {
        const v = rnd();
        if (v < 0.45) continue;
        ctx.fillStyle = v > 0.8 ? B : A;
        ctx.globalAlpha = 0.25 + v * 0.75;
        ctx.beginPath();
        if (v > 0.72) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y); ctx.lineTo(x, y + cell); }
        else { ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); ctx.lineTo(x, y + cell); }
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'halftone': {
      const step = h / 34;
      ctx.fillStyle = A;
      for (let y = 0; y < h; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < w; x += step) {
        const r = (y / h) * step * 0.55;
        if (r < 0.6) continue;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'bolt':
      ctx.fillStyle = A;
      ctx.beginPath();
      ctx.moveTo(w * 0.62, 0); ctx.lineTo(w * 0.22, h * 0.55); ctx.lineTo(w * 0.48, h * 0.55);
      ctx.lineTo(w * 0.32, h); ctx.lineTo(w * 0.82, h * 0.4); ctx.lineTo(w * 0.55, h * 0.4); ctx.lineTo(w * 0.78, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = B; ctx.lineWidth = h * 0.008; ctx.stroke();
      break;
  }
  ctx.restore();

  if (cfg.material && cfg.material !== 'glass') {
    ctx.fillStyle = carbonPattern(ctx); ctx.fillRect(0, 0, w, h);
  }

  (cfg.stickers || []).forEach(st => drawSticker(ctx, st, w, h, images));

  if (cfg.text && cfg.text.trim()) {
    ctx.save();
    ctx.translate(w / 2, (cfg.textY ?? 0.5) * h);
    if (cfg.textVertical) ctx.rotate(-Math.PI / 2);
    const fonts = {
      grotesk: '700 {s}px "Space Grotesk", sans-serif',
      heavy: '900 {s}px Inter, system-ui, sans-serif',
      serif: 'italic 700 {s}px Georgia, serif',
      mono: '700 {s}px "JetBrains Mono", ui-monospace, monospace'
    };
    const size = (cfg.textSize ?? 0.12) * h;
    ctx.font = (fonts[cfg.font] || fonts.grotesk).replace('{s}', size.toFixed(0));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (size * 0.04).toFixed(1) + 'px';
    ctx.fillStyle = cfg.textColor;
    ctx.fillText(cfg.text.toUpperCase(), 0, 0);
    ctx.restore();
  }
}

// ---------- 3D model ----------
function gripTexture(color) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 128, 512);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 6;
  for (let y = -128; y < 640; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + 60); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2;
  for (let y = -128; y < 640; y += 26) { g.beginPath(); g.moveTo(0, y + 5); g.lineTo(128, y + 65); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

function setFaceUVs(geo, bb) {
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - bb.minX) / bb.w, (pos.getY(i) - bb.minY) / bb.h);
  }
  uv.needsUpdate = true;
}

function buildGeometries(shapeParams, holeStyle) {
  const pts = headOutline(shapeParams);
  const bb = outlineBounds(pts);
  const innerPts = scalePts(pts, 0.94);

  // Face with real holes
  const face = new THREE.Shape(innerPts);
  const area = scalePts(pts, 0.8);
  const r = holeStyle === 'big' ? 0.075 : 0.055;
  const step = holeStyle === 'big' ? 0.26 : 0.205;
  let row = 0;
  for (let y = bb.minY + 0.35; y < bb.maxY - 0.25; y += step * 0.88, row++) {
    for (let x = -1.6 + (row % 2 ? step / 2 : 0); x < 1.6; x += step) {
      if (inside(x, y, area)) face.holes.push(new THREE.Path().absarc(x, y, r, 0, Math.PI * 2, true));
    }
  }
  const faceGeo = new THREE.ExtrudeGeometry(face, { depth: 0.34, bevelEnabled: false, curveSegments: 10 });
  faceGeo.translate(0, 0, -0.17);
  setFaceUVs(faceGeo, bb);

  // Frame (rim)
  const frame = new THREE.Shape(pts);
  frame.holes.push(new THREE.Path(innerPts));
  const frameGeo = new THREE.ExtrudeGeometry(frame, {
    depth: 0.36, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 4, curveSegments: 4
  });
  frameGeo.translate(0, 0, -0.18);

  // Throat (open heart)
  const by = bb.minY;
  const throat = new THREE.Shape([
    new THREE.Vector2(-0.66, by + 0.35), new THREE.Vector2(0.66, by + 0.35),
    new THREE.Vector2(0.19, by - 0.98), new THREE.Vector2(-0.19, by - 0.98)
  ]);
  throat.holes.push(new THREE.Path([
    new THREE.Vector2(-0.38, by + 0.12), new THREE.Vector2(0.38, by + 0.12),
    new THREE.Vector2(0.07, by - 0.62), new THREE.Vector2(-0.07, by - 0.62)
  ]));
  const throatGeo = new THREE.ExtrudeGeometry(throat, {
    depth: 0.3, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3
  });
  throatGeo.translate(0, 0, -0.15);

  return { faceGeo, frameGeo, throatGeo, bb, by };
}

export function createRacket() {
  const group = new THREE.Group();
  const mats = {
    face: new THREE.MeshPhysicalMaterial({ roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12 }),
    holeWall: new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.8 }),
    frame: new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
    grip: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    cap: new THREE.MeshPhysicalMaterial({ roughness: 0.25, metalness: 0.6, clearcoat: 1 })
  };
  const meshes = {
    face: new THREE.Mesh(undefined, [mats.face, mats.holeWall]),
    frame: new THREE.Mesh(undefined, mats.frame),
    throat: new THREE.Mesh(undefined, mats.frame),
    handle: new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.145, 1.3, 40), mats.grip),
    cap: new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.13, 40), mats.cap),
    protector: new THREE.Mesh(undefined, new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.5, clearcoat: 0.6 }))
  };
  meshes.handle.scale.set(1.12, 1, 0.82);
  meshes.cap.scale.set(1.12, 1, 0.82);
  Object.values(meshes).forEach(m => group.add(m));

  let geoKey = '';
  let faceTexture = null;
  let gripColor = '';

  function update(cfg, canvas) {
    const sp = cfg.shapeParams;
    const key = [sp.roundness, sp.topBias, sp.width, cfg.holes].join('|');
    if (key !== geoKey) {
      geoKey = key;
      const g = buildGeometries(sp, cfg.holes);
      ['face', 'frame', 'throat'].forEach(k => { if (meshes[k].geometry) meshes[k].geometry.dispose(); });
      meshes.face.geometry = g.faceGeo;
      meshes.frame.geometry = g.frameGeo;
      meshes.throat.geometry = g.throatGeo;
      meshes.handle.position.y = g.by - 0.98 - 0.65;
      meshes.cap.position.y = g.by - 0.98 - 1.3 - 0.05;
      // Protector: curved strip on the top of the frame
      const pts = headOutline(sp).filter(v => v.y > g.bb.maxY * 0.55);
      pts.sort((a, b) => Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x));
      const curve = new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(v.x * 1.012, v.y * 1.012, 0)));
      if (meshes.protector.geometry) meshes.protector.geometry.dispose();
      meshes.protector.geometry = new THREE.TubeGeometry(curve, 80, 0.21, 12, false);
      meshes.protector.scale.set(1, 1, 1);
      group.userData.centerY = (g.bb.maxY + meshes.cap.position.y) / 2;
    }
    meshes.protector.visible = !!cfg.protector;

    if (canvas) {
      if (!faceTexture || faceTexture.image !== canvas) {
        if (faceTexture) faceTexture.dispose();
        faceTexture = new THREE.CanvasTexture(canvas);
        faceTexture.colorSpace = THREE.SRGBColorSpace;
        faceTexture.anisotropy = 8;
        mats.face.map = faceTexture;
        mats.face.needsUpdate = true;
      }
      faceTexture.needsUpdate = true;
    }

    const finish = cfg.finish || 'gloss';
    mats.face.roughness = finish === 'matte' ? 0.75 : 0.35;
    mats.face.clearcoat = finish === 'matte' ? 0.05 : 1;
    mats.frame.color.set(cfg.frame);
    mats.frame.metalness = finish === 'metal' ? 0.85 : 0.25;
    mats.frame.roughness = finish === 'matte' ? 0.7 : finish === 'metal' ? 0.22 : 0.3;
    mats.frame.clearcoat = finish === 'matte' ? 0 : 1;
    mats.cap.color.set(cfg.frame);
    if (gripColor !== cfg.grip) {
      gripColor = cfg.grip;
      if (mats.grip.map) mats.grip.map.dispose();
      mats.grip.map = gripTexture(cfg.grip);
      mats.grip.needsUpdate = true;
    }
  }

  return { group, update, meshes };
}

// ---------- Viewer ----------
export class RacketViewer {
  constructor(container, opts = {}) {
    this.opts = opts;
    this.container = container;
    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0, opts.distance || 12.5);

    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(5, 7, 9); scene.add(key);
    const rim = new THREE.DirectionalLight(opts.rimColor || 0xc6ff3d, 2.2); rim.position.set(-7, 3, -6); scene.add(rim);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.6); fill.position.set(6, -4, -3); scene.add(fill);

    this.pivot = new THREE.Group(); scene.add(this.pivot);
    this.racket = createRacket();
    this.pivot.add(this.racket.group);
    if (opts.tilt) this.pivot.rotation.z = opts.tilt;

    // soft floor shadow
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const sg = sc.getContext('2d');
    const grad = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = grad; sg.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -3.6;
    if (opts.shadow !== false) scene.add(this.shadow);

    if (opts.controls !== false) {
      const c = this.controls = new OrbitControls(this.camera, renderer.domElement);
      c.enableDamping = true; c.dampingFactor = 0.07;
      c.enablePan = false;
      c.enableZoom = opts.zoom !== false;
      c.minDistance = 6; c.maxDistance = 18;
      c.autoRotate = !!opts.autoRotate; c.autoRotateSpeed = opts.autoRotateSpeed || 1.4;
      c.target.set(0, 0, 0);
      c.addEventListener('start', () => { if (opts.stopRotateOnTouch) c.autoRotate = false; });
    }

    this.mouse = { x: 0, y: 0 };
    if (opts.parallax) {
      window.addEventListener('pointermove', e => {
        this.mouse.x = (e.clientX / window.innerWidth - 0.5);
        this.mouse.y = (e.clientY / window.innerHeight - 0.5);
      });
    }

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(container);
    this.resize();

    this.clock = new THREE.Clock();
    const loop = () => {
      requestAnimationFrame(loop);
      const t = this.clock.getElapsedTime();
      if (this.controls) this.controls.update();
      if (opts.float) this.pivot.position.y = Math.sin(t * 1.2) * 0.12;
      if (opts.parallax) {
        this.pivot.rotation.x += (this.mouse.y * 0.35 - this.pivot.rotation.x) * 0.05;
        this.pivot.rotation.y += (this.mouse.x * 0.9 + (opts.spin ? t * 0.35 : 0) - this.pivot.rotation.y) * 0.05;
      }
      renderer.render(scene, this.camera);
    };
    loop();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(cfg, canvas) {
    this.racket.update(cfg, canvas);
    this.racket.group.position.y = -(this.racket.group.userData.centerY || 0);
  }

  view(name) {
    const d = this.camera.position.length();
    const dirs = { front: [0, 0, 1], side: [1, 0, 0.02], back: [0, 0, -1], angle: [0.7, 0.25, 0.8] };
    const v = new THREE.Vector3(...(dirs[name] || dirs.front)).normalize().multiplyScalar(d);
    const start = this.camera.position.clone();
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 650);
      const e = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(start, v, e).setLength(d);
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
}

// Build a full design canvas for a config (used by landing page presets)
export function makeDesignCanvas(cfg, images) {
  const { w, h } = textureSize(cfg.shapeParams);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  drawDesign(c.getContext('2d'), w, h, cfg, images);
  return c;
}

export const PRESETS = {
  neon: {
    label: 'Neon Strike', shape: 'diamond', shapeParams: { ...SHAPES.diamond }, design: 'bolt', holes: 'small',
    face: '#0d0f14', accent: '#c6ff3d', accent2: '#ffffff', frame: '#0d0f14', grip: '#c6ff3d',
    text: 'FORGE', textColor: '#ffffff', font: 'grotesk', textSize: 0.09, textY: 0.78, textVertical: false,
    material: 'c12k', core: 'hard', finish: 'gloss', stickers: []
  },
  ocean: {
    label: 'Deep Ocean', shape: 'teardrop', shapeParams: { ...SHAPES.teardrop }, design: 'waves', holes: 'small',
    face: '#0a2a5c', accent: '#2e7bff', accent2: '#5ee7ff', frame: '#e9eef5', grip: '#ffffff',
    text: '', textColor: '#ffffff', font: 'grotesk', textSize: 0.1, textY: 0.3, textVertical: false,
    material: 'c3k', core: 'medium', finish: 'gloss', stickers: [{ type: 'ring', x: 0.5, y: 0.32, size: 0.2, rot: 0, color: '#ffffff' }]
  },
  sunset: {
    label: 'Sunset Pro', shape: 'round', shapeParams: { ...SHAPES.round }, design: 'fade', holes: 'big',
    face: '#ff3d9a', accent: '#ff7a2e', accent2: '#ffcc00', frame: '#1a1020', grip: '#1a1020',
    text: 'SUNSET', textColor: '#1a1020', font: 'heavy', textSize: 0.1, textY: 0.5, textVertical: false,
    material: 'glass', core: 'soft', finish: 'matte', stickers: [{ type: 'star', x: 0.5, y: 0.25, size: 0.14, rot: 0, color: '#ffffff' }]
  },
  stealth: {
    label: 'Stealth Carbon', shape: 'diamond', shapeParams: { ...SHAPES.diamond }, design: 'geo', holes: 'small',
    face: '#16181d', accent: '#2a2e37', accent2: '#ff4d2e', frame: '#ff4d2e', grip: '#16181d',
    text: '', textColor: '#ff4d2e', font: 'mono', textSize: 0.08, textY: 0.5, textVertical: false,
    material: 'c18k', core: 'hard', finish: 'metal', stickers: [{ type: 'stripe', x: 0.5, y: 0.72, size: 0.16, rot: -20, color: '#ff4d2e' }]
  }
};
