import * as THREE from 'three';

// [heure, haut du ciel, horizon, intensité du soleil]
const KEYS = [
  [0, '#060914', '#121629', 0.08],
  [5, '#141b36', '#4a3d58', 0.12],
  [6.3, '#7d9fd0', '#f1bf97', 0.6],
  [8.5, '#4f8fd8', '#cfe3f0', 1.05],
  [13, '#3d82d4', '#d9ebf6', 1.2],
  [16.5, '#5a88c8', '#ecd6b0', 1.0],
  [18.1, '#4a4f86', '#f0985a', 0.62],
  [19.1, '#1c2246', '#5a3d55', 0.24],
  [20.5, '#080c1c', '#1a1f36', 0.1],
  [24, '#060914', '#121629', 0.08],
];
const PAL = KEYS.map(([h, t, b, s]) => [h, new THREE.Color(t), new THREE.Color(b), s]);

const WEATHER_TINT = {
  rain: { col: new THREE.Color('#8a9098'), amt: 0.6, sun: 0.45, near: 25, far: 230 },
  harmattan: { col: new THREE.Color('#d6b483'), amt: 0.65, sun: 0.6, near: 15, far: 210 },
  clear: { col: null, amt: 0, sun: 1, near: 70, far: 470 },
};

export function skyState(hour, weather, out) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < PAL.length - 2 && h > PAL[i + 1][0]) i++;
  const [h0, t0, b0, s0] = PAL[i], [h1, t1, b1, s1] = PAL[i + 1];
  const t = (h - h0) / (h1 - h0);
  out.top.copy(t0).lerp(t1, t);
  out.bottom.copy(b0).lerp(b1, t);
  out.sun = s0 + (s1 - s0) * t;
  const W = WEATHER_TINT[weather] || WEATHER_TINT.clear;
  if (W.col) {
    const k = W.amt * Math.min(1, out.sun + 0.2);
    out.top.lerp(W.col, k * 0.8);
    out.bottom.lerp(W.col, k);
  }
  out.sun *= W.sun;
  out.night = out.sun < 0.3;
  const dark = 1 - Math.min(1, out.sun / 0.5);
  out.fogNear = W.near * (1 - dark * 0.6);
  out.fogFar = W.far * (1 - dark * 0.55);
  const a = ((h - 6) / 12) * Math.PI;
  out.sunDir.set(-Math.cos(a) * 0.75, Math.max(-0.2, Math.sin(a)), 0.45).normalize();
  return out;
}

export function makeSkyState() {
  return { top: new THREE.Color(), bottom: new THREE.Color(), sun: 1, night: false, fogNear: 60, fogFar: 450, sunDir: new THREE.Vector3(0, 1, 0) };
}

export class Sky {
  constructor() {
    this.uniforms = {
      top: { value: new THREE.Color() },
      bottom: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunCol: { value: new THREE.Color('#ffe2b0') },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y * 1.8 + 0.08, 0.0, 1.0);
          vec3 c = mix(bottom, top, pow(h, 0.75));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 600.0) * 2.0 + pow(s, 14.0) * 0.18) * step(0.0, sunDir.y);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(800, 24, 12), mat);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
  }

  apply(st) {
    this.uniforms.top.value.copy(st.top);
    this.uniforms.bottom.value.copy(st.bottom);
    this.uniforms.sunDir.value.copy(st.sunDir);
  }
}

// Pluie : deux nuages de traits qui suivent la caméra.
export class Rain {
  constructor() {
    const N = 900, pos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 60, y = Math.random() * 30, z = (Math.random() - 0.5) * 60;
      pos.set([x, y, z, x + 0.05, y - 0.9, z], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: '#c8d2dc', transparent: true, opacity: 0.38, fog: false });
    this.group = new THREE.Group();
    this.a = new THREE.LineSegments(geo, mat);
    this.b = new THREE.LineSegments(geo, mat);
    this.a.frustumCulled = this.b.frustumCulled = false;
    this.group.add(this.a, this.b);
    this.group.visible = false;
    this.t = 0;
  }

  update(dt, cam) {
    if (!this.group.visible) return;
    this.t = (this.t + dt * 28) % 30;
    this.group.position.set(cam.position.x, cam.position.y - 12, cam.position.z);
    this.a.position.y = -this.t;
    this.b.position.y = 30 - this.t;
  }
}
