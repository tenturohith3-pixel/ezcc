"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ── 3D Shape Component ─────────────────────────────────── */

interface FeatureShapeProps {
  shape: "cube" | "sphere" | "torus";
}

function FeatureShape({ shape }: FeatureShapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    let geometry: THREE.BufferGeometry;
    if (shape === "cube") {
      geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    } else if (shape === "sphere") {
      geometry = new THREE.IcosahedronGeometry(1.2, 1);
    } else {
      geometry = new THREE.TorusGeometry(1.0, 0.4, 16, 50);
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      emissive: 0x0a4c6e,
      emissiveIntensity: 0.2,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      transparent: true,
      opacity: 0.9,
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const pointLight = new THREE.PointLight(0x7dd3fc, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xc0d8e8, 1);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      mesh.rotation.x += 0.003;
      mesh.rotation.y += 0.005;
      mesh.position.y = Math.sin(Date.now() * 0.001) * 0.1;
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      if (container.clientWidth && container.clientHeight) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [shape]);

  return <div ref={containerRef} className="w-full h-[220px] bg-transparent mb-8" />;
}

/* ── Features Section — exact from reference ─────────── */

const features = [
  {
    shape: "cube" as const,
    icon: "tune",
    title: "Standard LUTs",
    description: "Access a vast library of cinematic looks or import your own .cube files for instant styling.",
  },
  {
    shape: "sphere" as const,
    icon: "wb_auto",
    title: "Auto White Balance",
    description: "Intelligent temperature and tint adjustments to correct your footage with a single click.",
  },
  {
    shape: "torus" as const,
    icon: "contrast",
    title: "Contrast & Saturation",
    description: "Fine-tune tonal ranges and color intensity with precision curves and color wheels.",
  },
];

export default function Features() {
  return (
    <section className="py-32 px-5 md:px-16 max-w-screen-2xl mx-auto relative z-10">
      {/* Section Header — exact from reference */}
      <div className="text-center mb-20">
        <h2 className="text-[48px] leading-[56px] tracking-[-0.02em] font-bold text-gradient mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          Everything You Need to Grade Like a Pro
        </h2>
        <p className="text-[18px] leading-[32px] text-[#a0b4c4] max-w-2xl mx-auto font-light" style={{ fontFamily: "'Inter', sans-serif" }}>
          Advanced color grading tools, reimagined for a fluid, creative workflow.
        </p>
      </div>

      {/* Feature Cards — exact from reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <div key={feature.title} className="glacier-card rounded-3xl p-8 flex flex-col items-center text-center">
            <FeatureShape shape={feature.shape} />
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#7dd3fc] text-3xl font-light" style={{ fontVariationSettings: "'FILL' 0" }}>
                {feature.icon}
              </span>
              <h3 className="text-[24px] text-[#7dd3fc] font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                {feature.title}
              </h3>
            </div>
            <p className="text-[16px] leading-[28px] text-[#a0b4c4] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
