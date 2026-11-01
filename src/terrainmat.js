import * as THREE from 'three';

// Matériau du sol : couleurs par sommet + grain procédural en coordonnées monde (herbe, terre, goudron).
export const TERRAIN_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
TERRAIN_MAT.customProgramCacheKey = () => 'n1-terrain';
TERRAIN_MAT.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vWPos;
float n1h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n1v(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(n1h(i), n1h(i + vec2(1, 0)), f.x), mix(n1h(i + vec2(0, 1)), n1h(i + vec2(1, 1)), f.x), f.y);
}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
  float n1g = n1v(vWPos.xz * 0.9) * 0.45 + n1v(vWPos.xz * 0.21) * 0.35 + n1v(vWPos.xz * 3.7) * 0.2;
  diffuseColor.rgb *= 0.8 + n1g * 0.4;`);
};

export const WATER_MAT = new THREE.MeshPhongMaterial({ color: '#59683f', specular: '#8a9aa0', shininess: 90, flatShading: false });
export const CONCRETE_MAT = new THREE.MeshLambertMaterial({ color: '#cfc9bc' });
