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

    // Diagonal Ribbons — extend far beyond screen so ends are invisible
    const ribbons: {
      mesh: THREE.Mesh;
      offset: number;
    }[] = [];
    const colors = [0x7dd3fc, 0x00f0ff, 0x8b5cf6, 0x3b82f6, 0x7dd3fc];

    // Diagonal directions: bottom-left → top-right, with variation
    const diagonals = [
      { sx: -50, sy: -30, ex: 50, ey: 30 },  // bottom-left to top-right
      { sx: -45, sy: -25, ex: 45, ey: 25 },   // steeper diagonal
      { sx: -40, sy: -28, ex: 40, ey: 28 },   // medium diagonal
      { sx: -48, sy: -22, ex: 48, ey: 22 },   // shallower diagonal
      { sx: -42, sy: -32, ex: 42, ey: 32 },   // steep diagonal
    ];

    for (let i = 0; i < 5; i++) {
      const d = diagonals[i];
      const spread = 3; // perpendicular spread variation

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(d.sx, d.sy + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 4),
        new THREE.Vector3(d.sx * 0.5, (d.sy + d.ey) * 0.3 + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 3),
        new THREE.Vector3(0, (d.sy + d.ey) * 0.5 + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 3),
        new THREE.Vector3(d.ex * 0.5, (d.sy + d.ey) * 0.7 + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 3),
        new THREE.Vector3(d.ex, d.ey + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 4),
      ]);

      const geometry = new THREE.TubeGeometry(curve, 100, 0.1, 8, false);
      const material = new THREE.MeshPhysicalMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.4,
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
        ribbon.mesh.rotation.x = Math.sin(time * 0.5 + ribbon.offset) * 0.15;
        ribbon.mesh.rotation.y = Math.cos(time * 0.3 + ribbon.offset) * 0.15;
        ribbon.mesh.position.x += (mouseX * 2 - ribbon.mesh.position.x) * 0.01;
        ribbon.mesh.position.y += (mouseY * 2 - ribbon.mesh.position.y) * 0.01;
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
