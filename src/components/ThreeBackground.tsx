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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x7dd3fc, 1.5);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Diagonal Ribbons (\) — top-left → bottom-right
    // Extends far beyond screen so ends are never visible
    const ribbons: { mesh: THREE.Mesh; offset: number }[] = [];
    const colors = [0x7dd3fc, 0x00f0ff, 0x8b5cf6, 0x3b82f6, 0x7dd3fc];

    // Each ribbon goes from top-left (negative x, positive y)
    // to bottom-right (positive x, negative y) — backslash "\" direction
    for (let i = 0; i < 5; i++) {
      const ySpread = (i - 2) * 4; // vertical offset between ribbons
      const zOffset = (i - 2) * 1.5;
      const waveAmp = 2 + Math.random() * 3;
      const waveFreq = 0.3 + Math.random() * 0.4;

      // 7 control points for a smooth S-curve diagonal
      const pts = [];
      for (let j = 0; j < 7; j++) {
        const t = j / 6;
        const x = -50 + t * 100; // -50 to +50 (way off-screen)
        const baseY = 35 - t * 70; // +35 (top) to -35 (bottom) — diagonal \
        const wave = Math.sin(t * Math.PI * 2 * waveFreq + i) * waveAmp;
        const z = zOffset + Math.sin(t * Math.PI) * 2;
        pts.push(new THREE.Vector3(x, baseY + wave, z));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const geometry = new THREE.TubeGeometry(curve, 120, 0.12 + i * 0.02, 8, false);
      const material = new THREE.MeshPhysicalMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.35 + (i === 0 || i === 4 ? 0.1 : 0),
        metalness: 0.5,
        roughness: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      ribbons.push({ mesh, offset: Math.random() * Math.PI * 2 });
    }

    camera.position.z = 15;

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * -2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      ribbons.forEach((ribbon) => {
        // Gentle rotation along diagonal axis
        ribbon.mesh.rotation.x = Math.sin(time * 0.3 + ribbon.offset) * 0.08;
        ribbon.mesh.rotation.z = Math.cos(time * 0.2 + ribbon.offset) * 0.05;
        // Mouse parallax
        ribbon.mesh.position.x += (mouseX * 1.5 - ribbon.mesh.position.x) * 0.008;
        ribbon.mesh.position.y += (mouseY * 1.5 - ribbon.mesh.position.y) * 0.008;
      });

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
