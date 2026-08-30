import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { RestaurantPlan } from "@/lib/restaurantPlanEngine";

export function RestaurantPlan3D({ plan, interior = false }: { plan: RestaurantPlan; interior?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf4f1eb);
    const camera = new THREE.PerspectiveCamera(45, (el.clientWidth || 640) / (el.clientHeight || 360), .1, 500);
    camera.position.set(plan.width * .8, interior ? 2 : plan.width * .85, plan.depth * 1.05);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(el.clientWidth || 640, el.clientHeight || 360); renderer.shadowMap.enabled = true; el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xfff4df, 0x667085, 1.8)); const sun = new THREE.DirectionalLight(0xffe0b2, 2.4); sun.position.set(-10, 16, 8); sun.castShadow = true; scene.add(sun);
    const group = new THREE.Group(); const material = (color: number, roughness = .65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const floorMat = material(0xb7a58b, .9); const wallMat = material(0xf1eee7, .72); const wood = material(0x8b5e3c, .5); const steel = material(0xb9c2cc, .25, .7); const warm = material(0xffb347, .35);
    const box = (x: number, y: number, z: number, px: number, py: number, pz: number, mat: THREE.Material) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; group.add(m); };
    box(plan.width, .12, plan.depth, plan.width / 2, -.06, plan.depth / 2, floorMat);
    for (const z of plan.zones) { const color = z.zone === "service" ? 0xe9d8a6 : z.zone === "client" ? 0xd8e8f7 : 0xd8f0ed; box(Math.max(.2, z.width - .12), .05, Math.max(.2, z.depth - .12), z.x + z.width / 2, .04, z.y + z.depth / 2, material(color, .8)); if (!interior) box(z.width, 2.8, .08, z.x + z.width / 2, 1.4, z.y, wallMat); }
    // Comptoir inox/bois et mobilier à l'échelle dans la zone client.
    const salle = plan.zones.find((z) => z.kind === "salle"); if (salle) { for (let i = 0; i < 6; i++) { const x = salle.x + 1.4 + (i % 3) * 2.1; const z = salle.y + 1.4 + Math.floor(i / 3) * 2.3; box(1.1, .08, .7, x, .82, z, wood); box(.06, .8, .06, x - .45, .4, z - .25, steel); box(.06, .8, .06, x + .45, .4, z - .25, steel); } }
    const bar = plan.zones.find((z) => z.kind === "comptoir"); if (bar) { box(Math.min(bar.width - .4, 4), 1.05, .75, bar.x + bar.width / 2, .55, bar.y + bar.depth / 2, steel); box(Math.min(bar.width - .4, 4), .05, .8, bar.x + bar.width / 2, 1.1, bar.y + bar.depth / 2, warm); }
    scene.add(group); const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(plan.width / 2, interior ? 1.1 : 0, plan.depth / 2); controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.05; let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); }; loop(); const resize = () => { const w = el.clientWidth || 640, h = el.clientHeight || 360; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }; const observer = new ResizeObserver(resize); observer.observe(el);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, [plan, interior]);
  return <div ref={ref} className="h-[340px] w-full overflow-hidden rounded-lg bg-stone-100" aria-label={interior ? "Perspective intérieure 3D" : "Vue axonométrique 3D"} />;
}
