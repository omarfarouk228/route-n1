import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Étalonnage en espace linéaire : saturation, teinte chaude, contraste autour du gris moyen, vignette.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 1.08 },
    uTint: { value: new THREE.Vector3(1.04, 1.0, 0.95) },
    uContrast: { value: 1.08 },
    uVig: { value: 0.28 },
    uLift: { value: new THREE.Vector3(0.006, 0.006, 0.012) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uSat; uniform vec3 uTint; uniform float uContrast; uniform float uVig; uniform vec3 uLift;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat) * uTint;
      col = max((col - 0.18) * uContrast + 0.18, 0.0) + uLift;
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.9, 0.3, length(d * vec2(1.0, 0.8)));
      col *= mix(1.0 - uVig, 1.0, v);
      gl_FragColor = vec4(col, c.a);
    }`,
};

export function makeComposer(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.32, 0.55, 0.92);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    composer, bloom, grade,
    setSize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); },
    // ambiance par météo / heure
    mood(st, weather) {
      const u = grade.uniforms;
      const warm = st.sun < 0.8 ? 0.06 * (1 - st.sun) : 0;
      u.uTint.value.set(1.03 + warm, 1.0, 0.95 - warm);
      u.uSat.value = weather === 'harmattan' ? 0.85 : weather === 'rain' ? 0.8 : 0.96;
      u.uContrast.value = weather === 'rain' ? 1.02 : 1.08;
      bloom.strength = st.night ? 0.6 : 0.3;
    },
  };
}
