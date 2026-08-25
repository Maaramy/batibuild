import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FloorPlan, RoomKind } from "@/lib/floorPlanEngine";

// Hauteur sous plafond et épaisseur des cloisons (m)
const WALL_H = 2.7;
const WALL_T = 0.12;

const ROOM_COLORS_3D: Record<RoomKind, number> = {
  sejour: 0xfbbf24,
  cuisine: 0xf87171,
  chambre: 0x60a5fa,
  sdb: 0x22d3ee,
  wc: 0x818cf8,
  couloir: 0xd4d4d8,
  escalier: 0xe879f9,
  bureau: 0x4ade80,
  garage: 0x9ca3af,
  reception: 0xfacc15,
  openspace: 0x34d399,
  reunion: 0xf472b6,
  sanitaire: 0x22d3ee,
  hall: 0xd4d4d8,
  stockage: 0xfb923c,
  logistique: 0xfdba74,
  vestiaire: 0xa78bfa,
  polyvalent: 0xcbd5e1,
};

export function FloorPlan3D({ plan }: { plan: FloorPlan }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Scène / caméra / renderer ──────────────────────────────────────────
    const scene = new THREE.Scene();
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    const L = Math.max(plan.length, 6);
    const W = Math.max(plan.width, 6);
    const dist = Math.max(L, W);
    camera.position.set(-dist * 0.75, dist * 0.95, dist * 1.05);
    camera.lookAt(L / 2, 0, W / 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // ── Lumières ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xfff7e0, 1.15);
    sun.position.set(-dist, dist * 1.6, dist * 0.8);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbfd8ff, 0.35);
    fill.position.set(dist, dist * 0.6, -dist);
    scene.add(fill);

    // ── Sol du terrain ─────────────────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(L + 10, W + 10);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xeef2e6, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(L / 2, -0.02, W / 2);
    scene.add(ground);

    // ── Groupe du niveau : dalles + murs ───────────────────────────────────
    const group = new THREE.Group();
    const disposables: (THREE.BufferGeometry | THREE.Material)[] = [];

    for (const room of plan.rooms) {
      const color = ROOM_COLORS_3D[room.kind] ?? 0xcbd5e1;

      // Dalle colorée de la pièce
      const slabGeo = new THREE.BoxGeometry(
        Math.max(room.w - WALL_T, 0.3),
        0.08,
        Math.max(room.h - WALL_T, 0.3),
      );
      const slabMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        transparent: true,
        opacity: 0.92,
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(room.x + room.w / 2, 0.04, room.y + room.h / 2);
      group.add(slab);
      disposables.push(slabGeo, slabMat);

      // 4 cloisons internes à l'emprise de la pièce
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xf4f4f5,
        roughness: 0.9,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      disposables.push(wallMat);
      const walls: [number, number, number, number][] = [
        // [cx, cz, sx, sz] — N, S, O, E
        [room.x + room.w / 2, room.y + WALL_T / 2, room.w, WALL_T],
        [room.x + room.w / 2, room.y + room.h - WALL_T / 2, room.w, WALL_T],
        [room.x + WALL_T / 2, room.y + room.h / 2, WALL_T, room.h],
        [room.x + room.w - WALL_T / 2, room.y + room.h / 2, WALL_T, room.h],
      ];
      for (const [cx, cz, sx, sz] of walls) {
        if (sx <= 0.01 || sz <= 0.01) continue;
        const geo = new THREE.BoxGeometry(sx, WALL_H, sz);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(cx, WALL_H / 2, cz);
        group.add(mesh);
        disposables.push(geo);
      }
    }

    // Arêtes des murs extérieurs pour la lisibilité
    const outlineGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(plan.length, WALL_H, plan.width),
    );
    const outlineMat = new THREE.LineBasicMaterial({ color: 0x27272a });
    const outline = new THREE.LineSegments(outlineGeo, outlineMat);
    outline.position.set(plan.length / 2, WALL_H / 2, plan.width / 2);
    group.add(outline);
    disposables.push(outlineGeo, outlineMat);

    scene.add(group);

    // ── Contrôles d'orbite ─────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(L / 2, 0.8, W / 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.minDistance = dist * 0.4;
    controls.maxDistance = dist * 4;
    controls.maxPolarAngle = Math.PI / 2.05;

    // ── Boucle de rendu + resize ───────────────────────────────────────────
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [plan]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[300px] sm:h-[360px] rounded-lg overflow-hidden bg-gradient-to-b from-sky-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800"
    />
  );
}
