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

const ROOM_HEX: Record<string, string> = {
  sejour: "#dbeafe",
  cuisine: "#fef3c7",
  chambre: "#ede9fe",
  sdb: "#cffafe",
  wc: "#f3e8ff",
  hall: "#f1f5f9",
  couloir: "#f8fafc",
};

export function FloorPlan3D({
  variant,
  width = 480,
  height = 400,
  wallHeight = 2.8,
}: FloorPlan3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<number>(0);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotY = useRef(0.6);
  const rotX = useRef(0.45);

  const buildScene = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cleanup
    if (rendererRef.current) {
      rendererRef.current.dispose();
      container.removeChild(rendererRef.current.domElement);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafaf9);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(15, 20, 10);
    scene.add(dir);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(
      variant.length + 8,
      variant.width + 8,
    );
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(variant.length / 2, -0.01, variant.width / 2);
    scene.add(ground);

    // Room floors
    variant.rooms.forEach((room) => {
      const color = ROOM_HEX[room.kind] ?? "#e5e5e5";
      const geo = new THREE.PlaneGeometry(room.w, room.h);
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(room.x + room.w / 2, 0.01, room.y + room.h / 2);
      scene.add(mesh);
    });

    // Walls – all room outlines
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xd4d4d8 });
    const wallThickness = 0.15;

    variant.rooms.forEach((room) => {
      // North wall
      createWall(scene, wallMat, room.x, 0, room.y, room.w, wallHeight, wallThickness, true);
      // South wall
      createWall(scene, wallMat, room.x, 0, room.y + room.h - wallThickness, room.w, wallHeight, wallThickness, true);
      // West wall
      createWall(scene, wallMat, room.x, 0, room.y, wallThickness, wallHeight, room.h, false);
      // East wall
      createWall(scene, wallMat, room.x + room.w - wallThickness, 0, room.y, wallThickness, wallHeight, room.h, false);
    });

    // Room labels (2D text sprites)
    variant.rooms.forEach((room) => {
      if (room.w < 1.5 || room.h < 1.2) return;
      const sprite = makeTextSprite(`${room.label}\n${room.area.toFixed(1)} m²`);
      sprite.position.set(room.x + room.w / 2, wallHeight + 0.3, room.y + room.h / 2);
      scene.add(sprite);
    });

    // Position camera
    updateCamera(camera);

    // Render loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
  }, [variant, width, height, wallHeight]);

  function updateCamera(camera: THREE.PerspectiveCamera) {
    const cx = variant.length / 2;
    const cz = variant.width / 2;
    const dist = Math.max(variant.length, variant.width) * 1.6;
    camera.position.set(
      cx + Math.cos(rotY.current) * Math.cos(rotX.current) * dist,
      dist * Math.sin(rotX.current),
      cz + Math.sin(rotY.current) * Math.cos(rotX.current) * dist,
    );
    camera.lookAt(cx, 0, cz);
  }

  useEffect(() => {
    buildScene();
    return () => {
      cancelAnimationFrame(frameRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, [buildScene]);

  // Mouse / touch orbit
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    prevMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      prevMouse.current = { x: e.clientX, y: e.clientY };

      rotY.current += dx * 0.005;
      rotX.current = Math.max(0.1, Math.min(1.4, rotX.current + dy * 0.005));

      if (cameraRef.current) updateCamera(cameraRef.current);
    },
    [variant],
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width, height, cursor: "grab", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createWall(
  scene: THREE.Scene,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  horizontal: boolean,
) {
  const geo = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + sizeX / 2, y + sizeY / 2, z + sizeZ / 2);
  scene.add(mesh);
}

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#78716c";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 126);

  ctx.fillStyle = "#292524";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    ctx.fillText(line, 128, 45 + i * 30);
  });

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3, 1.5, 1);
  return sprite;
}
