import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FloorPlan, RoomKind } from "@/lib/floorPlanEngine";
import { roomFurniture, type MatTag } from "@/lib/furniture";

// ============================================================================
// VUE 3D « MAISON DE POUPEE » — qualité architecturale
//  · Murs extérieurs épais (20 cm) percés des vraies ouvertures : baies
//    vitrées (vitrage translucide), allèges, linteaux ; porte d'entrée bois.
//  · Cloisons intérieures fusionnées (une seule boîte par mur partagé).
//  · Dalls colorés par nature de pièce + étiquettes posées au sol.
//  · Ombres portées douces (PCFSoft), tone mapping ACES, orbite + auto-rotation.
// ============================================================================

const WALL_H = 2.7; // hauteur sous plafond (m)
const EXT_T = 0.2; // épaisseur murs extérieurs (m)
const INT_T = 0.1; // épaisseur cloisons (m)
const WIN_SILL = 0.95; // allège fenêtre (m)
const WIN_TOP = 2.15; // tête de baie vitrée (m)
const DOOR_H = 2.05; // hauteur porte (m)
const TOL = 0.02;

/** Teintes du mobilier extrudé (bois, tissu, sanitaire blanc, électroménager). */
const FURN_COLORS_3D: Record<MatTag, number> = {
  wood: 0xc8a06a,
  fabric: 0x8ea3c8,
  white: 0xf2f2ee,
  metal: 0xb9c2cc,
};

const ROOM_COLORS_3D: Record<RoomKind, number> = {
  sejour: 0xf5d9a8,
  cuisine: 0xf3b8b8,
  chambre: 0xb9d4f5,
  sdb: 0xaee6f0,
  wc: 0xc7cbf5,
  couloir: 0xe4e4e0,
  escalier: 0xecd3f2,
  bureau: 0xbfe8c5,
  garage: 0xd6d3cd,
  reception: 0xf0e3ae,
  openspace: 0xbde6d4,
  reunion: 0xf2c9dd,
  sanitaire: 0xaee6f0,
  hall: 0xe4e4e0,
  stockage: 0xf6d6b8,
  logistique: 0xf6dcc2,
  vestiaire: 0xd8cdf5,
  polyvalent: 0xdfe3e8,
};

interface Interval {
  a: number;
  b: number;
}

/** Fusionne des intervalles qui se chevauchent ou se touchent. */
function mergeIntervals(list: Interval[]): Interval[] {
  if (list.length === 0) return [];
  const sorted = [...list].sort((p, q) => p.a - q.a);
  const out: Interval[] = [{ ...sorted[0] }];
  for (const iv of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (iv.a <= last.b + TOL) last.b = Math.max(last.b, iv.b);
    else out.push({ ...iv });
  }
  return out;
}

export function FloorPlan3D({ plan }: { plan: FloorPlan }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const L = plan.length;
    const W = plan.width;
    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(d: T): T => {
      disposables.push(d);
      return d;
    };

    // ── Scène / caméra / renderer ──────────────────────────────────────────
    const scene = new THREE.Scene();
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 380;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 600);
    const dist = Math.max(L, W);
    camera.position.set(-dist * 0.62, dist * 0.92, dist * 1.18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // ── Lumières ────────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0xb8b09a, 0.75));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.1);
    sun.position.set(-dist * 1.1, dist * 1.5, dist * 0.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = dist * 6;
    sun.shadow.camera.left = -dist * 1.2;
    sun.shadow.camera.right = dist * 1.2;
    sun.shadow.camera.top = dist * 1.2;
    sun.shadow.camera.bottom = -dist * 1.2;
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 4;
    scene.add(sun);
    const fillLight = new THREE.DirectionalLight(0xcfe0ff, 0.5);
    fillLight.position.set(dist * 0.8, dist * 0.5, -dist);
    scene.add(fillLight);

    // ── Terrain : pelouse + dalle débordante ───────────────────────────────
    const grassGeo = track(new THREE.PlaneGeometry(L + 14, W + 14));
    const grassMat = track(
      new THREE.MeshStandardMaterial({ color: 0x9db87a, roughness: 1 }),
    );
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(L / 2, -0.12, W / 2);
    grass.receiveShadow = true;
    scene.add(grass);

    const slabGeo = track(new THREE.BoxGeometry(L + 1.2, 0.12, W + 1.2));
    const slabMat = track(
      new THREE.MeshStandardMaterial({ color: 0xcbc4b4, roughness: 0.95 }),
    );
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(L / 2, -0.06, W / 2);
    slab.receiveShadow = true;
    scene.add(slab);

    // ── Matériaux partagés ─────────────────────────────────────────────────
    const wallMat = track(
      new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.85 }),
    );
    const glassMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x9ec8e8,
        transparent: true,
        opacity: 0.38,
        roughness: 0.08,
        metalness: 0.05,
      }),
    );
    const doorMat = track(
      new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.6 }),
    );

    const building = new THREE.Group();

    /** Boîte utilitaire : position = centre, ajout au groupe bâtiment. */
    const box = (
      sx: number,
      sy: number,
      sz: number,
      cx: number,
      cy: number,
      cz: number,
      mat: THREE.Material,
    ) => {
      if (sx < 0.01 || sy < 0.01 || sz < 0.01) return;
      const geo = track(new THREE.BoxGeometry(sx, sy, sz));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, cy, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      building.add(mesh);
    };

    // ── Murs extérieurs percés des ouvertures ──────────────────────────────
    // Côté N (z=0), S (z=W), O (x=0), E (x=L). Chaque côté : tronçons pleins
    // entre les ouvertures + allège/linteau/vitrage dans chaque baie.
    type Opening = { a: number; b: number; kind: "win" | "door" };
    const sides: {
      key: "N" | "S" | "W" | "E";
      openings: Opening[];
      run: number;
    }[] = [
      { key: "N", openings: [], run: L },
      { key: "S", openings: [], run: L },
      { key: "W", openings: [], run: W },
      { key: "E", openings: [], run: W },
    ];
    for (const r of plan.rooms) {
      for (const win of r.windows) {
        const side = win.wall as "N" | "S" | "W" | "E";
        const start =
          win.wall === "N" || win.wall === "S" ? r.x + win.position : r.y + win.position;
        sides
          .find((s) => s.key === side)!
          .openings.push({ a: start, b: start + win.width, kind: "win" });
      }
      // Seule la porte d'entrée perce un mur extérieur (les portes intérieures
      // sont déjà couvertes par les cloisons fusionnées).
      for (const d of r.doors) {
        if (!d.isEntry) continue;
        const side = d.wall as "N" | "S" | "W" | "E";
        const start =
          d.wall === "N" || d.wall === "S" ? r.x + d.position : r.y + d.position;
        const onExterior =
          (d.wall === "N" && r.y < TOL) ||
          (d.wall === "S" && Math.abs(r.y + r.h - W) < TOL) ||
          (d.wall === "W" && r.x < TOL) ||
          (d.wall === "E" && Math.abs(r.x + r.w - L) < TOL);
        if (!onExterior) continue;
        sides
          .find((s) => s.key === side)!
          .openings.push({ a: start, b: start + d.width, kind: "door" });
      }
    }

    const halfE = EXT_T / 2;
    for (const side of sides) {
      const openings = mergeIntervals(
        side.openings.map((o) => ({ a: o.a, b: o.b })),
      ).map((iv) => ({
        ...iv,
        kind:
          side.openings.find((o) => o.a >= iv.a - TOL && o.b <= iv.b + TOL)?.kind ??
          ("win" as const),
      }));

      const solidPieces: Interval[] = [];
      let cursor = 0;
      for (const op of openings) {
        if (op.a > cursor + TOL) solidPieces.push({ a: cursor, b: Math.min(op.a, side.run) });
        cursor = Math.max(cursor, op.b);
      }
      if (cursor < side.run - TOL) solidPieces.push({ a: cursor, b: side.run });

      const place = (
        alongA: number,
        alongB: number,
        y0: number,
        y1: number,
        mat: THREE.Material,
      ) => {
        const lenAlong = alongB - alongA;
        const mid = (alongA + alongB) / 2;
        if (side.key === "N")
          box(lenAlong, y1 - y0, EXT_T, mid, (y0 + y1) / 2, halfE, mat);
        else if (side.key === "S")
          box(lenAlong, y1 - y0, EXT_T, mid, (y0 + y1) / 2, W - halfE, mat);
        else if (side.key === "W")
          box(EXT_T, y1 - y0, lenAlong, halfE, (y0 + y1) / 2, mid, mat);
        else box(EXT_T, y1 - y0, lenAlong, L - halfE, (y0 + y1) / 2, mid, mat);
      };

      for (const piece of solidPieces) place(piece.a, piece.b, 0, WALL_H, wallMat);
      for (const op of openings) {
        if (op.kind === "win") {
          place(op.a, op.b, 0, WIN_SILL, wallMat); // allège
          place(op.a, op.b, WIN_TOP, WALL_H, wallMat); // linteau
          place(op.a, op.b, WIN_SILL, WIN_TOP, glassMat); // vitrage
        } else {
          place(op.a, op.b, DOOR_H, WALL_H, wallMat); // linteau
          place(op.a, op.b, 0, DOOR_H, doorMat); // porte bois (fermée)
        }
      }
    }

    // ── Cloisons intérieures fusionnées ────────────────────────────────────
    const vMap = new Map<number, Interval[]>(); // murs verticaux (const x)
    const hMap = new Map<number, Interval[]>(); // murs horizontaux (const z)
    for (const r of plan.rooms) {
      // Bords verticaux (O et E de la pièce)
      for (const x of [r.x, r.x + r.w]) {
        if (!vMap.has(x)) vMap.set(x, []);
        vMap.get(x)!.push({ a: r.y, b: r.y + r.h });
      }
      for (const z of [r.y, r.y + r.h]) {
        if (!hMap.has(z)) hMap.set(z, []);
        hMap.get(z)!.push({ a: r.x, b: r.x + r.w });
      }
    }
    const isInterior = (v: number, max: number) => v > TOL && Math.abs(v - max) > TOL;
    for (const [x, segs] of vMap) {
      if (!isInterior(x, L)) continue;
      for (const seg of mergeIntervals(segs))
        box(INT_T, WALL_H, seg.b - seg.a, x, WALL_H / 2, (seg.a + seg.b) / 2, wallMat);
    }
    for (const [z, segs] of hMap) {
      if (!isInterior(z, W)) continue;
      for (const seg of mergeIntervals(segs))
        box(seg.b - seg.a, WALL_H, INT_T, (seg.a + seg.b) / 2, WALL_H / 2, z, wallMat);
    }

    // ── Dalles de sol colorées par pièce + étiquettes au sol ──────────────
    for (const r of plan.rooms) {
      const geo = track(
        new THREE.BoxGeometry(
          Math.max(r.w - INT_T, 0.25),
          0.06,
          Math.max(r.h - INT_T, 0.25),
        ),
      );
      const mat = track(
        new THREE.MeshStandardMaterial({
          color: ROOM_COLORS_3D[r.kind] ?? ROOM_COLORS_3D.polyvalent,
          roughness: 0.8,
        }),
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(r.x + r.w / 2, 0.03, r.y + r.h / 2);
      mesh.receiveShadow = true;
      building.add(mesh);

      // Étiquette posée au sol (canvas → texture)
      if (r.w > 1.8 && r.h > 1.4) {
        const label = makeLabelTexture(r.label, r.area);
        track(label.texture);
        track(label.material);
        const plane = new THREE.PlaneGeometry(
          Math.min(r.w * 0.82, 4.4),
          Math.min(r.w * 0.82, 4.4) * (label.canvas.height / label.canvas.width),
        );
        track(plane);
        const tag = new THREE.Mesh(plane, label.material);
        tag.rotation.x = -Math.PI / 2;
        tag.position.set(r.x + r.w / 2, 0.075, r.y + r.h / 2);
        building.add(tag);
      }
    }

    // ── Mobilier extrudé (lits, canapés, cuisine équipée, sanitaires…) ─────
    const furnMats = Object.fromEntries(
      (Object.keys(FURN_COLORS_3D) as MatTag[]).map((k) => [
        k,
        track(
          new THREE.MeshStandardMaterial({
            color: FURN_COLORS_3D[k],
            roughness: 0.75,
          }),
        ),
      ]),
    ) as Record<MatTag, THREE.MeshStandardMaterial>;

    for (const r of plan.rooms) {
      for (const p of roomFurniture(r)) {
        if (p.t === "l") continue;
        const mat = furnMats[p.m ?? "wood"];
        if (p.t === "r") {
          const h = p.ht ?? 0.45;
          box(p.w, h, p.h, p.x + p.w / 2, h / 2 + 0.06, p.y + p.h / 2, mat);
        } else {
          const h = p.ht ?? 0.45;
          if (p.flat || p.r < 0.03) continue;
          const geo = track(new THREE.CylinderGeometry(p.r, p.r, h, 18));
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(p.x, h / 2 + 0.06, p.y);
          mesh.castShadow = true;
          building.add(mesh);
        }
      }
    }

    scene.add(building);

    // ── Contrôles d'orbite ─────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(L / 2, 0.9, W / 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.minDistance = dist * 0.35;
    controls.maxDistance = dist * 3.5;
    controls.maxPolarAngle = Math.PI / 2.08;

    // ── Boucle de rendu + resize ───────────────────────────────────────────
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const observer = new ResizeObserver(() => {
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
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
      className="w-full h-[320px] sm:h-[400px] rounded-lg overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800"
    />
  );
}

// ── Texture d'étiquette (nom + surface) dessinée sur canvas ─────────────────

function makeLabelTexture(label: string, area: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  const pad = 14;
  const wBox = canvas.width - pad * 2;
  const hBox = canvas.height - pad * 2;
  ctx.beginPath();
  ctx.roundRect(pad, pad, wBox, hBox, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(28,25,23,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#292524";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let fontSize = 58;
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  while (ctx.measureText(label.toUpperCase()).width > wBox - 36 && fontSize > 26) {
    fontSize -= 4;
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  }
  ctx.fillText(label.toUpperCase(), canvas.width / 2, canvas.height / 2 - 24);
  ctx.fillStyle = "#57534e";
  ctx.font = `500 44px Inter, system-ui, sans-serif`;
  ctx.fillText(`${area.toFixed(2)} m²`, canvas.width / 2, canvas.height / 2 + 42);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  return { canvas, texture, material };
}
