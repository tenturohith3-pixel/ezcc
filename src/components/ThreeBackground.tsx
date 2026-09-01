"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x7dd3fc, 2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);
    const pointLight2 = new THREE.PointLight(0x00f0ff, 1.5);
    pointLight2.position.set(-10, -10, 5);
    scene.add(pointLight2);

    // ── Diagonal Ribbons (\) — top-left → bottom-right ──
    // Wider spread, more curves, stronger glow
    const ribbons: {
      mesh: THREE.Mesh;
      offset: number;
      wobbleSpeed: number;
      wobbleAmp: number;
      baseRotX: number;
      baseRotZ: number;
      glowPulse: number;
    }[] = [];

    const colors = [0x7dd3fc, 0x00f0ff, 0x8b5cf6, 0x3b82f6, 0x7dd3fc];

    for (let i = 0; i < 5; i++) {
      const ySpread = (i - 2) * 5;
      const zOffset = (i - 2) * 2;
      const waveAmp = 3 + Math.random() * 4;
      const waveFreq = 0.2 + Math.random() * 0.5;

      // 9 control points for richer curves
      const pts = [];
      for (let j = 0; j < 9; j++) {
        const t = j / 8;
        const x = -60 + t * 120; // Way off screen
        const baseY = 40 - t * 80; // Diagonal \
        const wave = Math.sin(t * Math.PI * 3 * waveFreq + i * 1.5) * waveAmp;
        const wave2 = Math.cos(t * Math.PI * 2 * waveFreq + i) * waveAmp * 0.5;
        const z = zOffset + Math.sin(t * Math.PI) * 3;
        pts.push(new THREE.Vector3(x, baseY + wave + wave2, z));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const geometry = new THREE.TubeGeometry(curve, 150, 0.15 + i * 0.03, 8, false);
      const material = new THREE.MeshPhysicalMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.3 + (i === 0 || i === 4 ? 0.15 : 0),
        metalness: 0.6,
        roughness: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      ribbons.push({
        mesh,
        offset: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.3 + Math.random() * 0.4,
        wobbleAmp: 0.05 + Math.random() * 0.08,
        baseRotX: Math.random() * 0.1,
        baseRotZ: Math.random() * 0.05,
        glowPulse: 0.5 + Math.random() * 1.5,
      });
    }

    camera.position.z = 18;

    // ── Mouse tracking — aggressive follow ──
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * -2;
    };

    // Touch support
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
        targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * -2;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // Fast mouse follow (lerp 0.08 = responsive but smooth)
      mouseX += (targetX - mouseX) * 0.08;
      mouseY += (targetY - mouseY) * 0.08;

      ribbons.forEach((ribbon) => {
        const { mesh, offset, wobbleSpeed, wobbleAmp, baseRotX, baseRotZ, glowPulse } = ribbon;

        // Wobble animation
        mesh.rotation.x = baseRotX + Math.sin(time * wobbleSpeed + offset) * wobbleAmp * 3;
        mesh.rotation.z = baseRotZ + Math.cos(time * wobbleSpeed * 0.7 + offset) * wobbleAmp * 2;

        // Strong mouse parallax — ribbons follow cursor aggressively
        mesh.position.x += (mouseX * 4 - mesh.position.x) * 0.04;
        mesh.position.y += (mouseY * 3 - mesh.position.y) * 0.04;
        mesh.position.z = Math.sin(time * 0.5 + offset) * 1.5;

        // Glow pulse
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        mat.emissiveIntensity = 0.8 + Math.sin(time * glowPulse + offset) * 0.4;
      });

      // Camera follows mouse slightly
      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 1.0 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
