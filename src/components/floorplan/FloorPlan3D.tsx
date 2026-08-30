import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import type { PlanVariant } from "@/lib/floorPlanEngine";
import { ROOM_COLORS } from "@/lib/floorPlanEngine";

interface FloorPlan3DProps {
  variant: PlanVariant;
  width?: number;
  height?: number;
  wallHeight?: number;
}

const ROOM_HEX: Record<string, number> = {
  sejour: 0xdbeafe, cuisine: 0xfef3c7, chambre: 0xede9fe,
  sdb: 0xcffafe, wc: 0xf3e8ff, hall: 0xf1f5f9,
};

export function FloorPlan3D({ variant, width = 480, height = 400, wallHeight = 2.8 }: FloorPlan3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef(0);
  const dragging = useRef(false);
  const prev = useRef({ x: 0, y: 0 });
  const rotY = useRef(0.6);
  const rotX = useRef(0.45);

  const cx = variant.length / 2;
  const cz = variant.width / 2;

  const updateCam = useCallback((cam: THREE.PerspectiveCamera) => {
    const dist = Math.max(variant.length, variant.width) * 1.6;
    cam.position.set(
      cx + Math.cos(rotY.current) * Math.cos(rotX.current) * dist,
      dist * Math.sin(rotX.current),
      cz + Math.sin(rotY.current) * Math.cos(rotX.current) * dist,
    );
    cam.lookAt(cx, 0, cz);
  }, [cx, cz, variant.length, variant.width]);

  const build = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (rendererRef.current) { rendererRef.current.dispose(); el.innerHTML = ""; }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafaf9);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(variant.length * 0.8, 18, variant.width * 0.6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -20;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-10, 8, -10);
    scene.add(fill);

    // Ground (receives shadows)
    const gnd = new THREE.Mesh(
      new THREE.PlaneGeometry(variant.length + 8, variant.width + 8),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }),
    );
    gnd.rotation.x = -Math.PI / 2;
    gnd.position.set(cx, -0.01, cz);
    gnd.receiveShadow = true;
    scene.add(gnd);

    // Room floors (per level, stacked)
    variant.levels.forEach((level, lvlIdx) => {
      const yBase = lvlIdx * wallHeight;
      level.rooms.forEach((r) => {
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(r.w, r.h),
          new THREE.MeshLambertMaterial({ color: ROOM_HEX[r.kind] ?? 0xe5e5e5 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(r.x + r.w / 2, yBase + 0.01, r.y + r.h / 2);
        floor.receiveShadow = true;
        scene.add(floor);

        // Walls (cast shadows)
        const wallMat = new THREE.MeshLambertMaterial({ color: 0xd4d4d8 });
        const wt = 0.12;
        const mk = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat);
          m.position.set(x + sx / 2, y + sy / 2, z + sz / 2);
          m.castShadow = true;
          m.receiveShadow = true;
          scene.add(m);
        };
        mk(r.x, yBase, r.y, r.w, wallHeight, wt);
        mk(r.x, yBase, r.y + r.h - wt, r.w, wallHeight, wt);
        mk(r.x, yBase, r.y, wt, wallHeight, r.h);
        mk(r.x + r.w - wt, yBase, r.y, wt, wallHeight, r.h);
      });
    });

    // Labels on top level
    const top = variant.levels[variant.levels.length - 1];
    top?.rooms.forEach((r) => {
      if (r.w < 1.5 || r.h < 1.2) return;
      const spr = textSprite(`${r.label}\n${r.area.toFixed(1)} m²`);
      spr.position.set(r.x + r.w / 2, variant.levels.length * wallHeight + 0.3, r.y + r.h / 2);
      scene.add(spr);
    });

    updateCam(camera);
    const loop = () => { frameRef.current = requestAnimationFrame(loop); renderer.render(scene, camera); };
    loop();
  }, [variant, width, height, wallHeight, cx, cz, updateCam]);

  useEffect(() => {
    build();
    return () => { cancelAnimationFrame(frameRef.current); rendererRef.current?.dispose(); };
  }, [build]);

  const onDown = useCallback((e: React.PointerEvent) => { dragging.current = true; prev.current = { x: e.clientX, y: e.clientY }; }, []);
  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    rotY.current += (e.clientX - prev.current.x) * 0.005;
    rotX.current = Math.max(0.1, Math.min(1.4, rotX.current + (e.clientY - prev.current.y) * 0.005));
    prev.current = { x: e.clientX, y: e.clientY };
    if (cameraRef.current) updateCam(cameraRef.current);
  }, [updateCam]);
  const onUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <div ref={containerRef} style={{ width, height, cursor: "grab", touchAction: "none" }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} />
  );
}

function textSprite(text: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#78716c"; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 126);
  ctx.fillStyle = "#292524"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
  text.split("\n").forEach((l, i) => ctx.fillText(l, 128, 45 + i * 30));
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  s.scale.set(3, 1.5, 1);
  return s;
}
