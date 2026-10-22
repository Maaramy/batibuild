import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Box, MousePointerClick, RotateCcw, Tag,
} from "lucide-react";
import type { FloorPlan, RoomKind, SitePlan } from "@/lib/floorPlanEngine";
import { buildSiteScene } from "./site3D";
import {
  doorLeafRotation,
  interiorOpenings3D,
  mergeOpenings3D,
  solidSpans3D,
} from "@/lib/plan3DOpenings";
import { roomFurniture, type MatTag } from "@/lib/furniture";
import {
  planFloorFinish,
  planNature,
  type PlanFloorFinish,
} from "@/lib/planPresentation";
import { cn } from "@/lib/utils";

// ============================================================================
// VUE 3D THREE.JS « MAISON DE POUPEE » — qualité architecturale, mobile-first
//  · Murs extérieurs percés des vraies ouvertures (baies vitrées, allèges,
//    linteaux, porte d'entrée) ; cloisons intérieures fusionnées.
//  · Sols colorés par pièce + labels (noms) togglables + cotes d'emprise.
//  · Performance : géométries fusionnées par matériau (1 draw call / matériau),
//    mode léger automatique (sans ombres, pixelRatio 1) sur appareils modestes.
//  · Caméra orbitale : rotation 360°, zoom (+ / − et pincement), pan, presets
//    (dessus, face, côtés, perspective, intérieure), recadrage. Le plan reste
//    toujours dans son conteneur (aucun plein écran).
//  · Sélection : clic sur un sol de pièce → onSelectRoom (synchro avec le 2D) ;
//    selectedRoomId → surbrillance (synchro 2D → 3D).
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
  wood: 0xd9b183,
  fabric: 0xe9e0cd,
  white: 0xfaf8f3,
  metal: 0xc9d1d6,
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
  // — Restauration —
  salle_client: 0xf6e6a0,
  salle_cafe: 0xf6e6a0,
  comptoir: 0xf5c890,
  cuisine_pro: 0xf3b8b8,
  plonge: 0xaee6f0,
  chambre_froide: 0xbde6f0,
  terrasse: 0xc8e8b8,
  attente: 0xe0d0f0,
  polyvalent: 0xdfe3e8,
  patio: 0xc8e8b8,
  buanderie: 0xdde3ea,
  vente: 0xf7e0a0,
  bassin: 0x5fc8f0,
  local_technique: 0xd7dde5,
};

/** Détection simple d'un appareil modeste (tactile / peu de cœurs / mémoire). */
function detectLiteMode(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 4;
  const touch =
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches === true;
  return cores <= 4 || mem <= 4 || touch;
}

export type ViewPreset = "orbit" | "top" | "front" | "left" | "right" | "interior";

export interface FloorPlan3DProps {
  plan: FloorPlan;
  /** Plan de masse : jardin, piscine, terrasse, cuisine d'été à leur place réelle. */
  site?: SitePlan;
  /** Pièce sélectionnée côté 2D (synchronisation 2D → 3D). */
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string | null) => void;
  /** Force le mode léger (rendu sans ombres, pixelRatio réduit). */
  lite?: boolean;
  className?: string;
  /**
   * Rendu COMPACT (vignette) : hauteur réduite et barre d'outils/aide masquées.
   * Utilisé par les aperçus de la page d'accueil — la géométrie et les données
   * restent strictement identiques.
   */
  compact?: boolean;
  /** Commandes de zoom envoyées par la barre d'outils du plan. */
  zoomAction?: { action: "in" | "out" | "fit"; seq: number } | null;
}

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

export function FloorPlan3DLegacy({
  plan,
  site,
  selectedRoomId,
  onSelectRoom,
  lite: liteProp,
  className,
  compact = false,
  zoomAction,
}: FloorPlan3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lite = liteProp ?? useMemo(detectLiteMode, []);

  const [showLabels, setShowLabels] = useState(true);
  const [preset, setPreset] = useState<ViewPreset>("orbit");

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const distRef = useRef(10);
  const labelGroupRef = useRef<THREE.Group | null>(null);
  const highlightRef = useRef<THREE.LineSegments | null>(null);
  const roomMeshesRef = useRef<Map<string, { cx: number; cz: number; w: number; h: number }>>(
    new Map(),
  );

  // ── Presets caméra ────────────────────────────────────────────────────────
  const applyPreset = useCallback(
    (p: ViewPreset) => {
      setPreset(p);
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const L = plan.length;
      const W = plan.width;
      const dist = distRef.current;
      controls.autoRotate = false;
      switch (p) {
        case "top":
          camera.position.set(L / 2, dist * 1.45, W / 2 + 0.01);
          controls.target.set(L / 2, 0, W / 2);
          break;
        case "front":
          camera.position.set(L / 2, dist * 0.32, W + dist * 0.9);
          controls.target.set(L / 2, WALL_H / 2, W / 2);
          break;
        case "left":
          camera.position.set(-dist * 0.95, dist * 0.3, W / 2);
          controls.target.set(L / 2, WALL_H / 2, W / 2);
          break;
        case "right":
          camera.position.set(L + dist * 0.95, dist * 0.3, W / 2);
          controls.target.set(L / 2, WALL_H / 2, W / 2);
          break;
        case "interior": {
          // Caméra embarquée dans la plus grande pièce (vue intérieure immersive)
          const big = plan.rooms.reduce(
            (a, b) => (a && a.area >= b.area ? a : b),
            plan.rooms[0],
          );
          if (big) {
            camera.position.set(big.x + big.w * 0.2, 1.6, big.y + big.h * 0.2);
            controls.target.set(big.x + big.w * 0.85, 1.2, big.y + big.h * 0.85);
          }
          break;
        }
        default: {
          const cx = site ? site.plot.length / 2 - site.building.x : L / 2;
          const cz = site ? site.plot.width / 2 - site.building.y : W / 2;
          camera.position.set(cx - dist * 0.62, dist * 0.92, cz + dist * 1.18);
          controls.target.set(cx, 0.9, cz);
        }
      }
      controls.update();
    },
    [plan, site],
  );

  // Zoom caméra progressif (+ / −) : même comportement que la vue HD, borné
  // par les limites des contrôles orbitaux (pas de plan inaccessible).
  const zoomBy = useCallback((factor: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const offset = camera.position.clone().sub(controls.target);
    const distance = offset.length();
    if (distance < 0.001) return;
    const min = Math.max(0.5, controls.minDistance || 0.5);
    const max = Math.max(min + 0.1, controls.maxDistance || distance * 2.6);
    const next = Math.min(max, Math.max(min, distance / factor));
    camera.position.copy(controls.target).add(offset.setLength(next));
    camera.updateProjectionMatrix();
    controls.update();
  }, []);

  // Boutons de la barre d'outils du plan (identiques à la vue 2D et à la HD).
  // Le recadrage replace la caméra sans toucher à l'état React du preset.
  useEffect(() => {
    if (!zoomAction) return;
    if (zoomAction.action === "fit") {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (camera && controls) {
        const dist = distRef.current;
        const cx = site ? site.plot.length / 2 - site.building.x : plan.length / 2;
        const cz = site ? site.plot.width / 2 - site.building.y : plan.width / 2;
        camera.position.set(cx - dist * 0.62, dist * 0.92, cz + dist * 1.18);
        controls.target.set(cx, 0.9, cz);
        controls.autoRotate = false;
        controls.update();
      }
    } else {
      zoomBy(zoomAction.action === "in" ? 1.25 : 1 / 1.25);
    }
  }, [zoomAction, plan, site, zoomBy]);

  // ── Construction de la scène ──────────────────────────────────────────────
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

    const scene = new THREE.Scene();
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 380;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 800);
    const dist = site ? Math.max(site.plot.length, site.plot.width) : Math.max(L, W);
    const cx0 = site ? site.plot.length / 2 - site.building.x : L / 2;
    const cz0 = site ? site.plot.width / 2 - site.building.y : W / 2;
    distRef.current = dist;
    camera.position.set(cx0 - dist * 0.62, dist * 0.92, cz0 + dist * 1.18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !lite,
      alpha: true,
      powerPreference: lite ? "low-power" : "high-performance",
    });
    renderer.setPixelRatio(lite ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !lite;
    if (!lite) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
    }
    container.appendChild(renderer.domElement);

    // ── Lumières (hémisphérique + soleil + appoint ; ombres en mode complet)
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0xb8b09a, lite ? 1.0 : 0.75));
    const sun = new THREE.DirectionalLight(0xfff2dc, lite ? 1.4 : 2.1);
    sun.position.set(-dist * 1.1, dist * 1.5, dist * 0.7);
    if (!lite) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = dist * 6;
      sun.shadow.camera.left = -dist * 1.2;
      sun.shadow.camera.right = dist * 1.2;
      sun.shadow.camera.top = dist * 1.2;
      sun.shadow.camera.bottom = -dist * 1.2;
      sun.shadow.bias = -0.0004;
      sun.shadow.radius = 4;
    }
    scene.add(sun);
    const fillLight = new THREE.DirectionalLight(0xcfe0ff, 0.55);
    fillLight.position.set(dist * 0.8, dist * 0.5, -dist);
    scene.add(fillLight);

    // ── Terrain : pelouse générique ou plan de masse réel ─────────────────
    if (site) {
      scene.add(buildSiteScene(site, { shadows: !lite, track }));
    } else {
      const grassGeo = track(new THREE.PlaneGeometry(L + 14, W + 14));
      const grassMat = track(new THREE.MeshStandardMaterial({ color: 0x9db87a, roughness: 1 }));
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(L / 2, -0.12, W / 2);
      grass.receiveShadow = !lite;
      scene.add(grass);
    }

    const slabGeo = track(new THREE.BoxGeometry(L + 1.2, 0.12, W + 1.2));
    const slabMat = track(new THREE.MeshStandardMaterial({ color: 0xcbc4b4, roughness: 0.95 }));
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(L / 2, -0.06, W / 2);
    slab.receiveShadow = !lite;
    scene.add(slab);

    // ── Matériaux partagés ──────────────────────────────────────────────────
    const wallMat = track(new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.85 }));
    const glassMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x9ec8e8,
        transparent: true,
        opacity: 0.38,
        roughness: 0.08,
        metalness: 0.05,
      }),
    );
    const doorMat = track(new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.6 }));

    const building = new THREE.Group();
    const pickables: THREE.Mesh[] = [];

    // ── Collecteur de boîtes par matériau (merge → 1 mesh / matériau) ──────
    const batches = new Map<THREE.Material, THREE.BoxGeometry[]>();
    const pushBox = (
      sx: number, sy: number, sz: number,
      cx: number, cy: number, cz: number,
      mat: THREE.Material,
    ) => {
      if (sx < 0.01 || sy < 0.01 || sz < 0.01) return;
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      geo.translate(cx, cy, cz);
      let arr = batches.get(mat);
      if (!arr) {
        arr = [];
        batches.set(mat, arr);
      }
      arr.push(geo);
    };

    // ── Murs extérieurs percés des ouvertures ──────────────────────────────
    type Opening = { a: number; b: number; kind: "win" | "door" };
    const sides: { key: "N" | "S" | "W" | "E"; openings: Opening[]; run: number }[] = [
      { key: "N", openings: [], run: L },
      { key: "S", openings: [], run: L },
      { key: "W", openings: [], run: W },
      { key: "E", openings: [], run: W },
    ];
    for (const r of plan.rooms) {
      for (const win of r.windows) {
        // Fenêtres de façade uniquement : celles des patios sont percées dans
        // les cloisons intérieures, jamais reportées sur une façade au hasard.
        const onEnvelope =
          (win.wall === "N" && r.y < TOL) ||
          (win.wall === "S" && Math.abs(r.y + r.h - W) < TOL) ||
          (win.wall === "W" && r.x < TOL) ||
          (win.wall === "E" && Math.abs(r.x + r.w - L) < TOL);
        if (!onEnvelope) continue;
        const side = win.wall as "N" | "S" | "W" | "E";
        const start =
          win.wall === "N" || win.wall === "S" ? r.x + win.position : r.y + win.position;
        sides.find((s) => s.key === side)!.openings.push({ a: start, b: start + win.width, kind: "win" });
      }      for (const d of r.doors) {
        // Toute ouverture extérieure réelle est percée : l'entrée principale,
        // la sortie de secours et la porte de service (mêmes données qu'en 2D).
        if (!d.isEntry && !d.isEmergency && !d.isService) continue;
        const side = d.wall as "N" | "S" | "W" | "E";
        const start =
          d.wall === "N" || d.wall === "S" ? r.x + d.position : r.y + d.position;
        const onExterior =
          (d.wall === "N" && r.y < TOL) ||
          (d.wall === "S" && Math.abs(r.y + r.h - W) < TOL) ||
          (d.wall === "W" && r.x < TOL) ||
          (d.wall === "E" && Math.abs(r.x + r.w - L) < TOL);
        if (!onExterior) continue;
        sides.find((s) => s.key === side)!.openings.push({ a: start, b: start + d.width, kind: "door" });
      }
    }

    const halfE = EXT_T / 2;
    for (const side of sides) {
      const openings = mergeIntervals(side.openings.map((o) => ({ a: o.a, b: o.b }))).map((iv) => ({
        ...iv,
        kind:
          side.openings.find((o) => o.a >= iv.a - TOL && o.b <= iv.b + TOL)?.kind ?? ("win" as const),
      }));
      const solidPieces: Interval[] = [];
      let cursor = 0;
      for (const op of openings) {
        if (op.a > cursor + TOL) solidPieces.push({ a: cursor, b: Math.min(op.a, side.run) });
        cursor = Math.max(cursor, op.b);
      }
      if (cursor < side.run - TOL) solidPieces.push({ a: cursor, b: side.run });

      const place = (a: number, b: number, y0: number, y1: number, mat: THREE.Material) => {
        const len = b - a;
        const mid = (a + b) / 2;
        if (side.key === "N") pushBox(len, y1 - y0, EXT_T, mid, (y0 + y1) / 2, halfE, mat);
        else if (side.key === "S") pushBox(len, y1 - y0, EXT_T, mid, (y0 + y1) / 2, W - halfE, mat);
        else if (side.key === "W") pushBox(EXT_T, y1 - y0, len, halfE, (y0 + y1) / 2, mid, mat);
        else pushBox(EXT_T, y1 - y0, len, L - halfE, (y0 + y1) / 2, mid, mat);
      };

      for (const piece of solidPieces) place(piece.a, piece.b, 0, WALL_H, wallMat);
      for (const op of openings) {
        if (op.kind === "win") {
          place(op.a, op.b, 0, WIN_SILL, wallMat); // allège
          place(op.a, op.b, WIN_TOP, WALL_H, wallMat); // linteau
          place(op.a, op.b, WIN_SILL, WIN_TOP, glassMat); // vitrage
        } else {
          place(op.a, op.b, DOOR_H, WALL_H, wallMat); // linteau
          place(op.a, op.b, 0, DOOR_H, doorMat); // porte bois
        }
      }
    }

    // ── Cloisons intérieures fusionnées (par alignement) ───────────────────
    const vMap = new Map<number, Interval[]>();
    const hMap = new Map<number, Interval[]>();
    for (const r of plan.rooms) {
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
    // Portes et fenêtres des cloisons : mêmes ouvertures que le plan 2D.
    const interior = interiorOpenings3D(plan);
    const buildInteriorCut = (
      axis: "x" | "z",
      line: number,
      segment: { a: number; b: number },
      openings: { a: number; b: number; kind: "door" | "window" }[],
    ) => {
      const onLine = mergeOpenings3D(openings).filter(
        (op) => op.b > segment.a + TOL && op.a < segment.b - TOL,
      );
      for (const solid of solidSpans3D(segment.a, segment.b, onLine)) {
        if (axis === "x") {
          pushBox(INT_T, WALL_H, solid.b - solid.a, line, WALL_H / 2, (solid.a + solid.b) / 2, wallMat);
        } else {
          pushBox(solid.b - solid.a, WALL_H, INT_T, (solid.a + solid.b) / 2, WALL_H / 2, line, wallMat);
        }
      }
      for (const cut of onLine) {
        const mid = (cut.a + cut.b) / 2;
        const len = cut.b - cut.a;
        if (cut.kind === "window") {
          if (axis === "x") {
            pushBox(INT_T, WIN_SILL, len, line, WIN_SILL / 2, mid, wallMat);
            pushBox(INT_T, WALL_H - WIN_TOP, len, line, (WIN_TOP + WALL_H) / 2, mid, wallMat);
            pushBox(INT_T * 0.35, WIN_TOP - WIN_SILL, len, line, (WIN_SILL + WIN_TOP) / 2, mid, glassMat);
          } else {
            pushBox(len, WIN_SILL, INT_T, mid, WIN_SILL / 2, line, wallMat);
            pushBox(len, WALL_H - WIN_TOP, INT_T, mid, (WIN_TOP + WALL_H) / 2, line, wallMat);
            pushBox(len, WIN_TOP - WIN_SILL, INT_T * 0.35, mid, (WIN_SILL + WIN_TOP) / 2, line, glassMat);
          }
        } else if (axis === "x") {
          // Linteau : l'ouverture de porte reste entièrement praticable.
          pushBox(INT_T, WALL_H - DOOR_H, len, line, (DOOR_H + WALL_H) / 2, mid, wallMat);
        } else {
          pushBox(len, WALL_H - DOOR_H, INT_T, mid, (DOOR_H + WALL_H) / 2, line, wallMat);
        }
      }
    };
    for (const [x, segs] of vMap) {
      if (!isInterior(x, L)) continue;
      const openings = interior.vertical.get(x) ?? [];
      for (const seg of mergeIntervals(segs)) {
        buildInteriorCut("x", x, seg, openings);
      }
    }
    for (const [z, segs] of hMap) {
      if (!isInterior(z, W)) continue;
      const openings = interior.horizontal.get(z) ?? [];
      for (const seg of mergeIntervals(segs)) {
        buildInteriorCut("z", z, seg, openings);
      }
    }

    // Flush des batches (murs / vitrages / portes)
    for (const [mat, geos] of batches) {
      if (geos.length === 0) continue;
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(track(merged), mat);
      mesh.castShadow = !lite;
      mesh.receiveShadow = !lite;
      building.add(mesh);
    }
    batches.clear();

    // ── Battants de portes intérieures (32° d'ouverture) ──────────────────
    for (const door of interior.doors) {
      const leafW = Math.max(0.4, door.width - 0.04);
      const leafH = DOOR_H - 0.06;
      const vertical = door.wall === "W" || door.wall === "E";
      const geo = track(new THREE.BoxGeometry(
        vertical ? 0.045 : leafW,
        leafH,
        vertical ? leafW : 0.045,
      ));
      geo.translate(vertical ? 0 : leafW / 2, leafH / 2, vertical ? leafW / 2 : 0);
      const leaf = new THREE.Mesh(geo, doorMat);
      if (vertical) leaf.position.set(door.line, 0.02, door.a);
      else leaf.position.set(door.a, 0.02, door.line);
      leaf.rotation.y = doorLeafRotation(door);
      leaf.castShadow = !lite;
      leaf.receiveShadow = !lite;
      building.add(leaf);
    }

    // ── Sols de pièces : 1 mesh cliquable par pièce (sélection 2D ↔ 3D) ────
    // Matières adaptées à l'usage réel du bâtiment : parquet chêne en habitat,
    // pierre en commerce, béton en entrepôt / réserve, pelouse à l'extérieur.
    const FINISH_COLORS_3D: Record<PlanFloorFinish, number> = {
      oak: 0xe6c9a2,
      stone: 0xe9e4d9,
      concrete: 0xd7d3ca,
      grass: 0xa8bc8b,
    };
    const nature = planNature(plan);
    const floorMatCache = new Map<number, THREE.MeshStandardMaterial>();
    const roomMeshes = new Map<string, { cx: number; cz: number; w: number; h: number }>();
    for (const r of plan.rooms) {
      const color =
        nature === "residentiel" || nature === "piscine"
          ? ROOM_COLORS_3D[r.kind] ?? ROOM_COLORS_3D.polyvalent
          : FINISH_COLORS_3D[planFloorFinish(r, nature)];
      let mat = floorMatCache.get(color);
      if (!mat) {
        mat = track(new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
        floorMatCache.set(color, mat);
      }
      const geo = track(
        new THREE.BoxGeometry(Math.max(r.w - INT_T, 0.25), 0.06, Math.max(r.h - INT_T, 0.25)),
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(r.x + r.w / 2, 0.03, r.y + r.h / 2);
      mesh.receiveShadow = !lite;
      mesh.userData.roomId = r.id;
      pickables.push(mesh);
      roomMeshes.set(r.id, { cx: r.x + r.w / 2, cz: r.y + r.h / 2, w: r.w, h: r.h });
      building.add(mesh);
    }
    roomMeshesRef.current = roomMeshes;

    // ── Labels (noms de pièces) — visibilité pilotée par showLabels ────────
    const labelGroup = new THREE.Group();
    labelGroup.visible = showLabels;
    labelGroupRef.current = labelGroup;
    for (const r of plan.rooms) {
      if (r.w > 1.8 && r.h > 1.4) {
        const label = makeLabelTexture(r.label, r.area);
        track(label.texture);
        track(label.material);
        const planeGeo = track(
          new THREE.PlaneGeometry(
            Math.min(r.w * 0.82, 4.4),
            Math.min(r.w * 0.82, 4.4) * (label.canvas.height / label.canvas.width),
          ),
        );
        const tag = new THREE.Mesh(planeGeo, label.material);
        tag.rotation.x = -Math.PI / 2;
        tag.position.set(r.x + r.w / 2, 0.075, r.y + r.h / 2);
        labelGroup.add(tag);
      }
    }
    building.add(labelGroup);

    // ── Signalétique : entrée principale et sortie de secours (vertes) ─────
    const signs = plan.rooms.flatMap((r) =>
      r.doors
        .filter((d) => d.isEntry || d.isEmergency)
        .map((d) => ({ r, d, entry: !!d.isEntry })),
    );
    if (signs.length > 0) {
      const exitSign = makeExitSignTexture();
      const entrySign = makeEntrySignTexture();
      track(exitSign.texture);
      track(exitSign.material);
      track(entrySign.texture);
      track(entrySign.material);
      const exitGeo = track(new THREE.PlaneGeometry(1.74, 0.4));
      const entryGeo = track(new THREE.PlaneGeometry(1.74, 0.36));
      for (const { r, d, entry } of signs) {
        const horizontal = d.wall === "N" || d.wall === "S";
        const x = horizontal
          ? r.x + d.position + d.width / 2
          : d.wall === "W"
            ? r.x - 0.06
            : r.x + r.w + 0.06;
        const z = horizontal
          ? d.wall === "N"
            ? r.y - 0.06
            : r.y + r.h + 0.06
          : r.y + d.position + d.width / 2;
        const mesh = new THREE.Mesh(
          entry ? entryGeo : exitGeo,
          entry ? entrySign.material : exitSign.material,
        );
        mesh.position.set(x, DOOR_H + 0.36, z);
        mesh.rotation.y =
          d.wall === "N"
            ? Math.PI
            : d.wall === "S"
              ? 0
              : d.wall === "W"
                ? Math.PI / 2
                : -Math.PI / 2;
        building.add(mesh);
      }
    }

    // ── Habillage bois / pergola de l'entrée principale (façade) ───────────
    // Poteaux, poutre et lames de couverture, sans jamais bloquer la porte,
    // les fenêtres ou les circulations.
    const woodMat = track(new THREE.MeshStandardMaterial({ color: 0xb07a45, roughness: 0.62 }));
    const woodDarkMat = track(new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 }));
    const postH = DOOR_H + 0.34;
    // Pas de pergola sur un entrepôt : le type de projet ne s'y prête pas.
    for (const r of nature === "entrepot" ? [] : plan.rooms) {
      for (const d of r.doors.filter((x) => x.isEntry)) {
        const onEnvelope =
          (d.wall === "N" && r.y < TOL) ||
          (d.wall === "S" && Math.abs(r.y + r.h - W) < TOL) ||
          (d.wall === "W" && r.x < TOL) ||
          (d.wall === "E" && Math.abs(r.x + r.w - L) < TOL);
        if (!onEnvelope) continue;
        const horizontal = d.wall === "N" || d.wall === "S";
        const outward = d.wall === "N" || d.wall === "W" ? -1 : 1;
        const start = (horizontal ? r.x : r.y) + d.position;
        const wallCoord = horizontal
          ? d.wall === "N"
            ? r.y
            : r.y + r.h
          : d.wall === "W"
            ? r.x
            : r.x + r.w;
        const mid = start + d.width / 2;
        const addWood = (
          sx: number,
          sy: number,
          sz: number,
          cx: number,
          cy: number,
          cz: number,
          dark = false,
        ) => {
          const mesh = new THREE.Mesh(
            track(new THREE.BoxGeometry(sx, sy, sz)),
            dark ? woodDarkMat : woodMat,
          );
          mesh.position.set(cx, cy, cz);
          mesh.castShadow = !lite;
          mesh.receiveShadow = !lite;
          building.add(mesh);
        };
        if (horizontal) {
          for (const px of [start - 0.11, start + d.width + 0.11]) {
            addWood(0.12, postH, 0.12, px, postH / 2, wallCoord + outward * 0.3);
          }
          addWood(d.width + 0.62, 0.09, 1.05, mid, postH + 0.045, wallCoord + outward * 0.56);
          for (let k = 0; k < 6; k++) {
            const t = (k + 0.5) / 6;
            addWood(
              0.035,
              0.02,
              1.0,
              start - 0.25 + (d.width + 0.5) * t,
              postH + 0.1,
              wallCoord + outward * 0.56,
              true,
            );
          }
          addWood(d.width + 0.5, 0.05, 0.92, mid, 0.025, wallCoord + outward * 0.5);
        } else {
          for (const pz of [start - 0.11, start + d.width + 0.11]) {
            addWood(0.12, postH, 0.12, wallCoord + outward * 0.3, postH / 2, pz);
          }
          addWood(1.05, 0.09, d.width + 0.62, wallCoord + outward * 0.56, postH + 0.045, mid);
          for (let k = 0; k < 6; k++) {
            const t = (k + 0.5) / 6;
            addWood(
              1.0,
              0.02,
              0.035,
              wallCoord + outward * 0.56,
              postH + 0.1,
              start - 0.25 + (d.width + 0.5) * t,
              true,
            );
          }
          addWood(0.92, 0.05, d.width + 0.5, wallCoord + outward * 0.5, 0.025, mid);
        }
      }
    }

    // Aucun tracé de cote ni de cadrage sombre autour de la maquette : les
    // dimensions restent sur le plan 2D, la vue 3D reste propre.

    // ── Mobilier extrudé (batches fusionnés par matériau) ──────────────────
    const furnMats = Object.fromEntries(
      (Object.keys(FURN_COLORS_3D) as MatTag[]).map((k) => [
        k,
        track(new THREE.MeshStandardMaterial({ color: FURN_COLORS_3D[k], roughness: 0.75 })),
      ]),
    ) as Record<MatTag, THREE.MeshStandardMaterial>;
    const furnBatches = new Map<MatTag, (THREE.BoxGeometry | THREE.CylinderGeometry)[]>();
    const pushFurn = (tag: MatTag, geo: THREE.BoxGeometry | THREE.CylinderGeometry) => {
      let arr = furnBatches.get(tag);
      if (!arr) {
        arr = [];
        furnBatches.set(tag, arr);
      }
      arr.push(geo);
    };
    for (const r of plan.rooms) {
      for (const p of roomFurniture(r, plan)) {
        if (p.t === "l") continue;
        if (p.t === "c") {
          if (p.flat || p.r < 0.03) continue;
          const h = p.ht ?? 0.45;
          const cyl = new THREE.CylinderGeometry(p.r, p.r, h, lite ? 10 : 18);
          cyl.translate(p.x, h / 2 + 0.06, p.y);
          pushFurn(p.m ?? "wood", cyl);
          continue;
        }
        const h = p.ht ?? 0.45;
        const g = new THREE.BoxGeometry(p.w, h, p.h);
        g.translate(p.x + p.w / 2, h / 2 + 0.06, p.y + p.h / 2);
        pushFurn(p.m ?? "wood", g);
      }
    }
    for (const [tag, geos] of furnBatches) {
      if (geos.length === 0) continue;
      const merged = mergeGeometries(geos as THREE.BoxGeometry[], false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(track(merged), furnMats[tag]);
      mesh.castShadow = !lite;
      mesh.receiveShadow = !lite;
      building.add(mesh);
    }

    // ── Surbrillance de sélection (cadre EdgesGeometry repositionnable) ────
    const hlGeo = track(new THREE.BoxGeometry(1, 0.16, 1));
    const hlEdges = track(new THREE.EdgesGeometry(hlGeo));
    const hlMat = track(new THREE.LineBasicMaterial({ color: 0x7c3aed }));
    const highlight = new THREE.LineSegments(hlEdges, hlMat);
    highlight.visible = false;
    highlightRef.current = highlight;
    building.add(highlight);

    scene.add(building);

    // ── Contrôles d'orbite (tactiles : 1 doigt = rotation, 2 = zoom/pan) ───
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx0, 0.9, cz0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controls.minDistance = dist * 0.28;
    controls.maxDistance = dist * 3.5;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controlsRef.current = controls;
    controls.update();

    // ── Sélection de pièces (clic / tap, sans conflit avec l'orbite) ───────
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      downAt = null;
      if (moved > 6) return; // c'était une rotation/pan, pas un clic
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      const roomId = hits.length > 0 ? (hits[0].object.userData.roomId as string) : null;
      onSelectRoom?.(roomId);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // ── Boucle de rendu + resize ────────────────────────────────────────────
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
      controlsRef.current = null;
      cameraRef.current = null;
      labelGroupRef.current = null;
      highlightRef.current = null;
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      for (const d of disposables) d.dispose();
      // Libération immédiate du contexte GPU : indispensable quand la vue 3D est
      // montée/démontée plusieurs fois (aperçus animés) — évite l'épuisement des
      // contextes WebGL du navigateur.
      renderer.forceContextLoss?.();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, lite]);

  // Visibilité des noms de pièces sans reconstruire la scène
  useEffect(() => {
    if (labelGroupRef.current) labelGroupRef.current.visible = showLabels;
  }, [showLabels]);

  // Surbrillance de la pièce sélectionnée (2D → 3D)
  useEffect(() => {
    const hl = highlightRef.current;
    if (!hl) return;
    const info = selectedRoomId ? roomMeshesRef.current.get(selectedRoomId) : undefined;
    if (!info) {
      hl.visible = false;
      return;
    }
    hl.scale.set(info.w + 0.14, 1, info.h + 0.14);
    hl.position.set(info.cx, 0.1, info.cz);
    hl.visible = true;
  }, [selectedRoomId, plan]);

  const PRESETS: { key: ViewPreset; label: string }[] = [
    { key: "top", label: "Dessus" },
    { key: "front", label: "Face" },
    { key: "left", label: "Gauche" },
    { key: "right", label: "Droite" },
    { key: "interior", label: "Intérieure" },
  ];

  return (
    <div className={cn("relative group", className)}>
      <div
        ref={containerRef}
        className={cn(
          // Fond clair constant : aucune bande sombre autour de la maquette.
          "w-full rounded-lg overflow-hidden bg-gradient-to-b from-sky-50 via-white to-emerald-50",
          compact ? "h-[165px] sm:h-[195px]" : "h-[320px] sm:h-[400px]",
        )}
      />
      {/* Barre d'outils + aide (masquées en rendu compact) */}
      {!compact && (
      <>
      <div className="absolute top-2 left-2 right-2 flex flex-wrap items-start gap-1.5 pointer-events-none">
        <div className="flex flex-wrap gap-1.5 pointer-events-auto">
          <ToolBtn active={preset === "orbit"} onClick={() => applyPreset("orbit")} title="Vue perspective (orbite libre)">
            <Box className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Perspective</span>
          </ToolBtn>
          {PRESETS.map((p) => (
            <ToolBtn
              key={p.key}
              active={preset === p.key}
              onClick={() => applyPreset(p.key)}
              title={`Vue ${p.label.toLowerCase()}`}
            >
              <span className="text-[10px] font-semibold">{p.label}</span>
            </ToolBtn>
          ))}
          <ToolBtn onClick={() => applyPreset("orbit")} title="Réinitialiser la caméra">
            <RotateCcw className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>
        <div className="ml-auto flex gap-1.5 pointer-events-auto">
          <ToolBtn
            active={showLabels}
            onClick={() => setShowLabels((s) => !s)}
            title="Afficher/Masquer les noms des pièces"
          >
            <Tag className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>
      </div>
      <div className="absolute bottom-2 left-2 right-28 flex items-center gap-1.5 text-[9px] leading-tight text-muted-foreground bg-background/80 rounded-md px-2 py-1 border pointer-events-none">
        <MousePointerClick className="h-3 w-3 shrink-0" />
        Touchez une pièce pour la sélectionner · Pincez pour zoomer
      </div>
      </>
      )}
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md border px-1.5 text-[10px] font-medium transition-colors cursor-pointer",
        active
          ? "bg-violet-600 text-white border-violet-600"
          : "bg-background/90 text-muted-foreground border-border/60 hover:border-violet-400 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ── Texture d'étiquette (nom + surface) dessinée sur canvas ─────────────────

/** Enseigne normalisée (fond plein, liseré blanc, mention en capitales). */
function makeSignTexture(text: string, background: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let fontSize = 88;
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  while (ctx.measureText(text).width > canvas.width - 60 && fontSize > 40) {
    fontSize -= 4;
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
  return { canvas, texture, material };
}

/** Panneau « SORTIE DE SECOURS » posé au-dessus des portes de secours. */
function makeExitSignTexture() {
  return makeSignTexture("SORTIE DE SECOURS", "#15803D");
}

/** Enseigne verte « ENTRÉE PRINCIPALE » au-dessus de la porte d'entrée. */
function makeEntrySignTexture() {
  return makeSignTexture("ENTRÉE PRINCIPALE", "#15803D");
}

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
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  return { canvas, texture, material };
}

