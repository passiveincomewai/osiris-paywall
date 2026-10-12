"use client";
/**
 * WorldEye Companion — humanoid particle avatar (Phase 1).
 *
 * A Jarvis-style head rendered as ~18k GPU particles: cyan/blue shell with a
 * warm amber core, gentle idle drift, and audio-reactive pulse while speaking.
 * Purely additive — no existing files touched.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

const VERT = /* glsl */ `
  attribute float aScale;
  attribute vec3 aColor;
  attribute float aRand;
  uniform float uTime;
  uniform float uEnergy;   // 0..1 audio/reactive energy
  uniform float uState;    // 0 idle, 1 listening, 2 thinking, 3 speaking
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vec3 p = position;
    // idle drift: layered sines per-particle
    float t = uTime * (0.35 + uState * 0.25);
    p.x += sin(t * 1.7 + aRand * 6.2831) * 0.035;
    p.y += cos(t * 1.3 + aRand * 4.0) * 0.045;
    p.z += sin(t * 1.1 + aRand * 9.0) * 0.035;
    // breathing expansion, stronger while speaking/listening
    float breathe = 1.0 + sin(uTime * 1.4) * 0.012 + uEnergy * 0.06 + uState * 0.008;
    p *= breathe;
    // thinking: orbital swirl
    if (uState > 1.5 && uState < 2.5) {
      float a = uTime * 1.2 + aRand * 6.2831;
      p.x += cos(a) * 0.05; p.z += sin(a) * 0.05;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    gl_PointSize = aScale * (140.0 / dist) * (1.0 + uEnergy * 0.9);
    // fade far edge particles for the "dissolving" look
    vAlpha = smoothstep(0.0, 0.15, 1.0 - abs(aRand - 0.5) * 0.4);
  }
`;
const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uEnergy;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.05, d);
    glow = pow(glow, 1.6);
    vec3 col = vColor * (0.75 + uEnergy * 0.9);
    gl_FragColor = vec4(col, glow * vAlpha * 0.85);
  }
`;

/** Points distributed on a stylized head + shoulders shell. */
function buildHead(count: number): { pos: Float32Array; col: Float32Array; scale: Float32Array; rand: Float32Array } {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const scale = new Float32Array(count);
  const rand = new Float32Array(count);
  const cyan = new THREE.Color("#38d6f5");
  const deep = new THREE.Color("#0e6fd8");
  const amber = new THREE.Color("#ff9a3c");
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // rejection-sample a head-ish volume: cranium sphere + tapered jaw + shoulders
    let x = 0, y = 0, z = 0;
    const pick = Math.random();
    if (pick < 0.62) {
      // cranium: sphere r=1, slightly tall
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      const r = 0.96 + Math.random() * 0.08;
      x = r * Math.sin(ph) * Math.cos(th);
      y = r * Math.cos(ph) * 1.18 + 0.55;
      z = r * Math.sin(ph) * Math.sin(th);
      if (y < -0.25) y = -0.25 + Math.random() * 0.1; // flatten jaw base
    } else if (pick < 0.8) {
      // jaw taper
      const t = Math.random();
      x = (Math.random() - 0.5) * 1.1 * (1 - t * 0.55);
      y = -0.25 - t * 0.55;
      z = (Math.random() - 0.5) * 0.9 * (1 - t * 0.4);
    } else {
      // shoulders sweep
      const t = Math.random();
      const side = Math.random() < 0.5 ? -1 : 1;
      x = side * (0.5 + t * 1.6);
      y = -0.85 - t * 0.75 + Math.random() * 0.15;
      z = (Math.random() - 0.5) * 0.7;
    }
    // shell bias: push toward surface so it reads as a hologram, not a blob
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    // color: amber core near face center, cyan shell, deep blue edges
    const faceDist = Math.hypot(x * 0.9, (y - 0.55) * 0.8, z - 0.45);
    if (faceDist < 0.55 && Math.random() < 0.75) c.copy(amber).lerp(cyan, faceDist / 0.55);
    else c.copy(cyan).lerp(deep, Math.random() * 0.8);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    scale[i] = 0.5 + Math.random() * 1.1;
    rand[i] = Math.random();
  }
  return { pos, col, scale, rand };
}

export default function HumanoidAvatar({
  state,
  energyRef,
  className,
  density = 1,
}: {
  /** idle | listening | thinking | speaking */
  state: AvatarState;
  /** parent writes 0..1 audio level here; avatar pulses with it */
  energyRef: React.MutableRefObject<number>;
  className?: string;
  /** 0..1 particle multiplier for low-power devices (default 1 = 18k) */
  density?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 480, H = mount.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 50);
    camera.position.set(0, 0.35, 4.6);

    const group = new THREE.Group();
    scene.add(group);

    const COUNT = Math.max(4000, Math.round(18000 * Math.min(1, Math.max(0.2, density))));
    const { pos, col, scale, rand } = buildHead(COUNT);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uState: { value: 0 },
      },
    });
    group.add(new THREE.Points(geo, mat));

    // warm core glow sprite behind the face
    const glowTex = (() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 128;
      const g = cv.getContext("2d")!;
      const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,170,80,0.85)");
      grad.addColorStop(0.4, "rgba(255,140,60,0.28)");
      grad.addColorStop(1, "rgba(255,140,60,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cv);
    })();
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8,
    }));
    core.position.set(0, 0.55, 0.15);
    core.scale.set(1.5, 1.5, 1);
    group.add(core);

    const stateNum: Record<AvatarState, number> = { idle: 0, listening: 1, thinking: 2, speaking: 3 };
    let raf = 0;
    const clock = new THREE.Clock();
    let energy = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const target = Math.max(0, Math.min(1, energyRef.current));
      energy += (target - energy) * 0.25;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uEnergy.value = energy;
      mat.uniforms.uState.value = stateNum[stateRef.current];
      group.rotation.y = Math.sin(t * 0.22) * 0.28;
      group.rotation.x = Math.sin(t * 0.17) * 0.06;
      core.material.opacity = 0.55 + energy * 0.45 + Math.sin(t * 1.4) * 0.08;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth || 480, h = mount.clientHeight || 560;
      renderer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geo.dispose(); mat.dispose();
      glowTex.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
