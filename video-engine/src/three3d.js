// Three.js 3D 장면: 별도 WebGL 캔버스에 그린 뒤 p5 화면에 합성한다.
// 모든 움직임은 시간 t 로만 계산해서 미리보기·MP4 렌더·자동 제작이 같은 그림을 만든다.
// THREE 는 studio.html 의 모듈 스크립트가 window.THREE 로 넣어 준다(없으면 2D 대체 화면).

const T3 = { renderer: null, canvas: null, cache: new Map(), failed: false };

function t3Ready() { return !!window.THREE && !T3.failed; }

function t3Renderer() {
  if (T3.renderer || T3.failed) return T3.renderer;
  try {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    T3.renderer = r; T3.canvas = c;
  } catch (e) {
    console.warn('WebGL을 쓸 수 없어 3D 대신 2D로 그립니다:', e);
    T3.failed = true;
  }
  return T3.renderer;
}

// 대본을 다시 불러오면 이전 3D 장면을 정리한다
function t3Reset() {
  T3.cache.forEach((S) => S.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  }));
  T3.cache.clear();
}

const col = (hex) => new THREE.Color(hex);

// key 로 장면을 한 번만 만들고, 매 프레임 update(S, t) 후 현재 p5 변환·투명도 그대로 합성한다
function t3Draw(key, build, update, t) {
  const r = t3Renderer();
  if (!r) return null;
  let S = T3.cache.get(key);
  if (!S) { S = build(); T3.cache.set(key, S); }
  update(S, t);
  r.setClearColor(0x000000, 0);
  r.clear();
  r.render(S.scene, S.camera);
  drawingContext.drawImage(T3.canvas, 0, 0, W, H);
  return S;
}

// 3D 좌표 → 화면 좌표 (라벨을 p5 글자로 얹을 때)
function t3Project(S, v) {
  const p = v.clone().project(S.camera);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, behind: p.z > 1 };
}

function t3Base(fov = 40) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404060, 1.4));
  const dir = new THREE.DirectionalLight(0xffffff, 2.2);
  dir.position.set(4, 6, 5);
  scene.add(dir);
  return { scene, camera, root: new THREE.Group() };
}

// ── 모델들 ──
const MODELS3D = {
  // 점으로 된 지구본 + 거점 + 이어지는 호
  globe(s) {
    const B = t3Base(35);
    B.camera.position.set(0, 0.4, 6.2); B.camera.lookAt(0, 0, 0);
    const R = 1.7;
    B.root.position.x = s.text ? 1.25 : 0;
    B.scene.add(B.root);
    B.root.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), new THREE.MeshStandardMaterial({ color: col(PAL.card), roughness: 0.9, transparent: true, opacity: 0.55 })));
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.399963;
      pos.set([Math.cos(th) * rr * R, y * R, Math.sin(th) * rr * R], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    B.root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: col(LINE()), size: 0.035 })));
    const k = Math.max(2, Math.min(8, s.points || 5));
    const marks = [], arcs = [];
    const onSphere = (la, lo, h = 1) => new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)).multiplyScalar(R * h);
    for (let i = 0; i < k; i++) {
      const la = (rnd(i * 3 + 1) - 0.5) * 2.2, lo = rnd(i * 7 + 2) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: col([PAL.red, PAL.yellow, PAL.green, PAL.blue][i % 4]) }));
      m.position.copy(onSphere(la, lo, 1.01));
      B.root.add(m); marks.push({ m, la, lo });
    }
    for (let i = 1; i < k; i++) {
      const a = onSphere(marks[i - 1].la, marks[i - 1].lo, 1.01), b = onSphere(marks[i].la, marks[i].lo, 1.01);
      const mid = a.clone().add(b).normalize().multiplyScalar(R * 1.45);
      const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(60);
      const lg = new THREE.BufferGeometry().setFromPoints(pts);
      lg.setDrawRange(0, 0);
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: col(PAL.yellow) }));
      B.root.add(line); arcs.push(line);
    }
    return { ...B, marks, arcs };
  },
  // 3D 막대그래프 (값이 자라 오르고 카메라가 천천히 돈다)
  bars(s) {
    const B = t3Base(38);
    B.scene.add(B.root);
    const vals = (s.values || [{ label: 'A', value: 3 }, { label: 'B', value: 5 }, { label: 'C', value: 8 }]).slice(0, 8);
    const max = Math.max(...vals.map((v) => Number(v.value) || 0), 1);
    const gap = 1.25, x0 = -((vals.length - 1) * gap) / 2;
    const grid = new THREE.GridHelper(vals.length * gap + 3, 12, col(LINE()), col(LINE()));
    grid.material.transparent = true; grid.material.opacity = 0.25;
    B.root.add(grid);
    const bars = vals.map((v, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.8), new THREE.MeshStandardMaterial({ color: col([PAL.blue, PAL.red, PAL.green, PAL.yellow][i % 4]), roughness: 0.45 }));
      m.position.set(x0 + i * gap, 0, 0);
      B.root.add(m);
      return { m, h: (Number(v.value) || 0) / max * 2.7, v };
    });
    return { ...B, bars, vals };
  },
  // 떠다니며 구르는 큐브 묶음
  cubes(s) {
    const B = t3Base(40);
    B.camera.position.set(0, 0.6, 9); B.camera.lookAt(0, 0, 0);
    B.scene.add(B.root);
    const cs = [PAL.blue, PAL.red, PAL.green, PAL.yellow, PAL.card];
    const cubes = Array.from({ length: 14 }, (_, i) => {
      const size = 0.4 + rnd(i * 5) * 0.9;
      const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color: col(cs[i % cs.length]), roughness: 0.35, metalness: 0.1 }));
      const home = new THREE.Vector3((rnd(i) - 0.5) * 9, (rnd(i + 30) - 0.5) * 4.5, (rnd(i + 60) - 0.5) * 4);
      m.position.copy(home); B.root.add(m);
      return { m, home, sp: 0.4 + rnd(i + 90) };
    });
    return { ...B, cubes };
  },
  // AI 코어: 다면체 + 궤도 링 + 위성
  core(s) {
    const B = t3Base(38);
    B.camera.position.set(0, 0.8, 7.5); B.camera.lookAt(0, 0, 0);
    B.root.position.x = s.text ? 1.4 : 0;
    B.scene.add(B.root);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshStandardMaterial({ color: col(PAL.blue), roughness: 0.3, metalness: 0.3, flatShading: true }));
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 1), new THREE.MeshBasicMaterial({ color: col(PAL.yellow), wireframe: true, transparent: true, opacity: 0.6 }));
    B.root.add(core, wire);
    const rings = [0, 1, 2].map((i) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.TorusGeometry(2 + i * 0.45, 0.025, 8, 120), new THREE.MeshBasicMaterial({ color: col(LINE()) })));
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: col([PAL.red, PAL.green, PAL.yellow][i]) }));
      sat.position.x = 2 + i * 0.45; g.add(sat);
      g.rotation.set(1.2 + i * 0.5, i * 0.7, 0);
      B.root.add(g);
      return g;
    });
    return { ...B, core, wire, rings };
  },
  // 링 터널을 날아 들어가는 오프닝
  tunnel(s) {
    const B = t3Base(65);
    B.scene.add(B.root);
    B.scene.fog = new THREE.Fog(0x000000, 6, 34);
    const cs = [PAL.blue, PAL.red, PAL.yellow, PAL.green];
    const rings = Array.from({ length: 22 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.06 + (i % 3) * 0.02, 8, 80), new THREE.MeshBasicMaterial({ color: col(cs[i % cs.length]) }));
      m.position.z = -i * 2; B.root.add(m);
      return m;
    });
    return { ...B, rings };
  },
  // 3D 디노 (기본 도형으로 만든 오리지널 마스코트)
  mascot(s) {
    const B = t3Base(35);
    B.camera.position.set(0, 1.2, 8); B.camera.lookAt(0, 1, 0);
    B.root.position.x = s.text ? 1.6 : 0;
    B.scene.add(B.root);
    const M = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: col(c), roughness: r });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.15, 40, 30), M(PAL.dino)); body.scale.set(1, 1.08, 0.95); body.position.y = 1.3;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 24), M(PAL.belly)); belly.scale.set(1, 0.95, 0.5); belly.position.set(0, 1.0, 0.72);
    const eyes = [-0.38, 0.38].map((x) => {
      const g = new THREE.Group();
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18), M('#FFFFFF', 0.3));
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), M(PAL.eye || '#2B2522', 0.2)); p.position.z = 0.2;
      g.add(w, p); g.position.set(x, 1.75, 0.92); return g;
    });
    const spikes = [-0.5, 0, 0.5].map((z, i) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 12), M(PAL.dinoDark)); c.position.set(0, 2.45 - Math.abs(z) * 0.25, z - 0.15); c.rotation.x = -z * 0.6; return c;
    });
    const feet = [-0.45, 0.45].map((x) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), M(PAL.dino)); f.scale.set(1.2, 0.6, 1.4); f.position.set(x, 0.18, 0.2); return f; });
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.3, 16), M(PAL.dino)); tail.rotation.set(-1.9, 0, 0.5); tail.position.set(-0.55, 0.65, -0.95);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 6, 12), M(PAL.dino)); arm.position.set(1.05, 1.35, 0.3);
    const dino = new THREE.Group(); dino.add(body, belly, ...eyes, ...spikes, ...feet, tail, arm);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01;
    B.root.add(dino, shadow);
    return { ...B, dino, arm, shadow };
  },
};

const UPDATE3D = {
  globe(S, t, d, s) {
    S.root.rotation.y = -0.6 + t * 0.22;
    S.root.rotation.x = 0.25;
    S.marks.forEach((k, i) => k.m.scale.setScalar(popK(t, 0.5 + i * 0.25) * (1 + 0.25 * Math.sin(t * 4 + i))));
    S.arcs.forEach((a, i) => a.geometry.setDrawRange(0, Math.floor(61 * clamp01((t - 1 - i * 0.35) / 0.8))));
  },
  bars(S, t, d) {
    const ang = -0.45 + 0.15 * Math.sin(t * 0.35);
    const dist = 7.2 + S.bars.length * 0.9;
    S.camera.position.set(Math.sin(ang) * dist, 3.6, Math.cos(ang) * dist); S.camera.lookAt(0.6, 0.9, 0);
    const ts = revealTimes(S.bars.length, d, 0.5, 1.6);
    S.bars.forEach((b, i) => {
      const g = easeOutBack(clamp01((t - ts[i]) / 0.7));
      const h = Math.max(0.001, b.h * g);
      b.m.visible = g > 0.02; // 아직 안 자란 막대는 바닥에 납작하게 남지 않도록 숨긴다
      b.m.scale.y = h; b.m.position.y = h / 2;
    });
  },
  cubes(S, t) {
    S.cubes.forEach((c, i) => {
      c.m.rotation.set(t * c.sp, t * c.sp * 0.7 + i, 0);
      c.m.position.set(c.home.x, c.home.y + Math.sin(t * c.sp * 1.6 + i) * 0.35, c.home.z);
      c.m.scale.setScalar(popK(t, 0.15 + i * 0.05));
    });
    S.root.rotation.y = Math.sin(t * 0.2) * 0.25;
  },
  core(S, t) {
    S.core.rotation.set(t * 0.4, t * 0.6, 0);
    S.wire.rotation.set(-t * 0.25, -t * 0.35, 0);
    S.core.scale.setScalar(popK(t, 0.2) * (1 + 0.04 * Math.sin(t * 3)));
    S.rings.forEach((g, i) => { g.children[1].position.set(Math.cos(t * (0.9 + i * 0.3)) * (2 + i * 0.45), Math.sin(t * (0.9 + i * 0.3)) * (2 + i * 0.45), 0); g.scale.setScalar(popK(t, 0.4 + i * 0.2)); });
  },
  tunnel(S, t) {
    const z = -t * 6;
    S.camera.position.set(Math.sin(t * 0.7) * 0.4, Math.cos(t * 0.5) * 0.3, z + 4);
    S.camera.lookAt(0, 0, z - 10);
    S.camera.rotation.z = t * 0.15;
    S.rings.forEach((r, i) => { let rz = -i * 2; while (rz > z + 6) rz -= 44; r.position.z = rz; r.rotation.z = t * 0.3 + i; });
  },
  mascot(S, t, d, s) {
    const hop = Math.abs(Math.sin(t * 2.2)) * 0.25;
    S.dino.position.y = hop;
    S.dino.rotation.y = -0.5 + Math.sin(t * 0.6) * 0.6;
    S.dino.scale.setScalar(popK(t, 0.2) * (1 + 0.03 * Math.cos(t * 4.4)));
    S.arm.rotation.z = -1.2 + Math.sin(t * 6) * 0.5;
    S.shadow.scale.setScalar(1 - hop * 0.6);
  },
};

// ── 장면 타입: three ──
SCENES.three = {
  mascot: false,
  draw(s, t, d) {
    const model = MODELS3D[s.model] ? s.model : 'core';
    if (t3Ready()) {
      const key = `${SCENE_I}:${model}:${TONE.id}:${JSON.stringify(s.values || s.points || '')}`;
      const S = t3Draw(key, () => MODELS3D[model](s), (S) => UPDATE3D[model](S, t, d, s), t);
      if (S && model === 'bars') {
        const ts = revealTimes(S.bars.length, d, 0.5, 1.6);
        S.bars.forEach((b, i) => {
          const top = t3Project(S, new THREE.Vector3(b.m.position.x, b.m.scale.y + 0.35, 0));
          const base = t3Project(S, new THREE.Vector3(b.m.position.x, 0, 0.75));
          if (!b.m.visible) return;
          withAlpha(inK(t, ts[i] + 0.4), () => {
            txt(String(b.v.value) + (s.suffix || ''), top.x, top.y - 20, 54, titleInk(), { outline: titleOutline(), ow: 10 });
            txt(b.v.label || '', base.x, base.y + 30, 38, titleInk(), { outline: titleOutline(), ow: 8 });
          });
        });
      }
    } else {
      // WebGL이 없을 때: 2D 대체 (아이콘 + 안내)
      popAt(W / 2, 440, popK(t, 0.2), () => drawIcon({ globe: 'target', bars: 'chart', mascot: 'star' }[model] || 'gear', 0, 0, 260, t));
    }
    if (s.text) {
      const left = model !== 'bars' && model !== 'tunnel' && model !== 'cubes';
      const x = model === 'bars' ? 470 : left ? 560 : W / 2, y = model === 'bars' ? 190 : 470;
      popAt(x, y, popK(t, model === 'tunnel' ? 1.2 : 0.5), () => {
        useFont(FONT_HEAD); textSize(80);
        const tw = Math.min(left || model === 'bars' ? 820 : 1300, textWidth(stripMarks(s.text)) + 120);
        card(0, 0, tw, 150);
        markedLine(s.text, 0, 4, 80, cardInk());
      });
      if (s.sub) withAlpha(inK(t, 0.9), () => txt(s.sub, x, y + 130, 44, subInk(), { font: FONT_BODY, outline: titleOutline(), ow: 6, maxW: left ? 800 : 1300, boxH: 120 }));
    }
  },
  cues(s, d) {
    if (s.model === 'tunnel') return [{ at: 0.05, name: 'riser' }, { at: 1.2, name: 'boom', vol: 0.6 }];
    if (s.model === 'bars') return revealTimes((s.values || [1, 2, 3]).length, d, 0.5, 1.6).map((at) => ({ at, name: 'pop' }));
    return [{ at: 0.2, name: 'whoosh', vol: 0.5 }, { at: 0.6, name: 'chime', vol: 0.6 }];
  },
};

// ── 시네마틱 3D 톤 배경: 진짜 3D 별 공간을 카메라가 천천히 나아간다 ──
function bgStars3D() {
  return t3Draw(`bg-stars:${TONE.id}`, () => {
    const B = t3Base(60);
    const n = 1800, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(rnd(i) - 0.5) * 60, (rnd(i + 7) - 0.5) * 34, -rnd(i + 13) * 80], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.85 }));
    const grid = new THREE.GridHelper(120, 60, col(PAL.blue), col(PAL.blue));
    grid.material.transparent = true; grid.material.opacity = 0.35; grid.position.y = -5;
    B.scene.add(stars, grid);
    B.scene.fog = new THREE.Fog(0x05070c, 10, 70);
    return { ...B, stars, grid };
  }, (S) => {
    const z = (NOW * 2.2) % 40;
    S.stars.position.z = z; S.grid.position.z = z % 2;
    S.camera.position.set(Math.sin(NOW * 0.15) * 1.2, Math.cos(NOW * 0.11) * 0.5, 8);
    S.camera.lookAt(0, -0.5, -20);
  }, NOW);
}
