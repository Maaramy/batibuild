// ============================================================================
// VUE 3D HAUTE NETTETÉ — moteur de rendu architectural (Three.js)
// ----------------------------------------------------------------------------
// Corrige le flou et monte la qualité visuelle, sans changer aucune donnée :
//   · Canvas à la résolution physique réelle (devicePixelRatio géré
//     correctement via setSize(w, h, false) + style CSS explicite) ;
//   · ResizeObserver synchronisant renderer → pixelRatio → camera.aspect ;
//   · Cadrage automatique « Ajuster à la scène » (fit-to-bounds, distance
//     calculée depuis le FOV) et clipping planes adaptés ;
//   · Niveaux de qualité automatiques (high / medium / low) pilotant shadows,
//     pixelRatio cap et antialias ; bascule « Mode performance » automatique
//     si le navigateur ne fournit pas de contexte WebGL antialiasé ;
//   · Ombres PCF douces adaptées à la résolution, éclairage 3 points léger
//     (aucune zone noire, aucune surexposition) ;
//   · Arêtes architecturales discrètes (EdgesGeometry sur murs/cloisons) ;
//   · Deux modes rendus depuis LES MÊMES données géométriques :
//     « Architectural » (sobre, maquette) et « Réaliste » (plus détaillé).
//
// Repli instantané : l'ancien rendu est conservé dans FloorPlan3DLegacy.tsx,
// sélectionné quand le flag `plans_3d_enhanced` vaut OFF.
// ============================================================================

import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Box, Contrast, Eye, EyeOff, Focus, Maximize, Minimize,
  MousePointerClick, RotateCcw, Tag,
} from "lucide-react";
import type { FloorPlan, RoomKind } from "@/lib/floorPlanEngine";
import { roomFurniture, type MatTag } from "@/lib/furniture";
import { cn } from "@/lib/utils";

// ── Constantes architecturales (identiques au legacy : même géométrie) ──────
const WALL_H = 2.7;
const EXT_T = 0.2;
const INT_T = 0.1;
const WIN_SILL = 0.95;
const WIN_TOP = 2.15;
const DOOR_H = 2.05;
const TOL = 0.02;

export type ViewPreset =
  | "orbit" | "top" | "front" | "left" | "right" | "interior";

/** Niveau de qualité de rendu, détecté automatiquement. */
export type QualityLevel = "high" | "medium" | "low";

/** Mode visuel : sobre architectural ou détaillé réaliste. */
export type RenderStyle = "architectural" | "realistic";

const FURN_COLORS_3D: Record<MatTag, number> = {
  wood: 0xc8a06a,
  fabric: 0x8ea3c8,
  white: 0xf2f2ee,
  metal: 0xb9c2cc,
};

const ROOM_COLORS_3D: Record<RoomKind, number> = {
  sejour: 0xf5d9a8, cuisine: 0xf3b8b8, chambre: 0xb9d4f5,
  sdb: 0xaee6f0, wc: 0xc7cbf5, couloir: 0xe4e4e0,
  escalier: 0xecd3f2, bureau: 0xbfe8c5, garage: 0xd6d3cd,
  reception: 0xf0e3ae, openspace: 0xbde6d4, reunion: 0xf2c9dd,
  sanitaire: 0xaee6f0, hall: 0xe4e4e0, stockage: 0xf6d6b8,
  logistique: 0xf6dcc2, vestiaire: 0xd8cdf5,
  salle_client: 0xf6e6a0, comptoir: 0xf5c890, cuisine_pro: 0xf3b8b8,
  plonge: 0xaee6f0, chambre_froide: 0xbde6f0, terrasse: 0xc8e8b8,
  attente: 0xe0d0f0, polyvalent: 0xdfe3e8,
};

// ── Détection de capacités (netteté vs performance) ─────────────────────────

/**
 * Détecte le niveau de qualité : DPR élevé + écran grand → high ; tactile
 * récent → medium ; appareil modeste → low. Jamais bloquant : en cas de doute,
 * un niveau supérieur est choisi puis dégradé à l'exécution si besoin.
 */
export function detectQualityLevel(): QualityLevel {
  if (typeof navigator === "undefined" || typeof window === "undefined") return "medium";
  const dpr = window.devicePixelRatio || 1;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches === true;
  if (!coarse && cores >= 6 && (mem >= 6 || dpr > 1.5)) return "high";
  if (cores >= 4 && mem >= 3) return "medium";
  return "low";
}

/** Réglages concrets par niveau de qualité. */
function qualitySettings(q: QualityLevel) {
  switch (q) {
    case "high":
      return { maxPixelRatio: 2.5, shadows: true, shadowMapSize: 2048, antialias: true, edgeLines: true };
    case "medium":
      return { maxPixelRatio: 2, shadows: true, shadowMapSize: 1024, antialias: true, edgeLines: true };
    default:
      return { maxPixelRatio: 1.5, shadows: false, shadowMapSize: 0, antialias: false, edgeLines: false };
  }
}

interface FloorPlan3DProps {
  plan: FloorPlan;
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string | null) => void;
  /** Repli de compatibilité : `lite` équivaut à la qualité "low". */
  lite?: boolean;
  fullscreen?: boolean;
  className?: string;
  /**
   * Rendu COMPACT (vignette) : hauteur réduite et barre d'outils/aide masquées.
   * Utilisé par les aperçus de la page d'accueil — la géométrie et les données
   * restent strictement identiques.
   */
  compact?: boolean;
  /** Niveau de qualité forcé (sinon détection automatique). */
  quality?: QualityLevel;
}

interface Interval { a: number; b: number; }

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

/**
 * Vue 3D HD. Montée via le dispatcher `FloorPlan3D` (feature flag) — ne pas
 * importer directement dans les pages.
 */
export function FloorPlan3DHD({
  plan,
  selectedRoomId,
  onSelectRoom,
  lite,
  fullscreen = false,
  className,
  compact = false,
  quality: qualityProp,
}: FloorPlan3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Hooks toujours appelés (jamais conditionnels) : la détection auto tourne à
  // chaque rendu, `qualityProp`/`lite` ne font que surcharger le résultat.
  const autoQuality = useMemo(detectQualityLevel, []);
  const quality = qualityProp ?? (lite ? "low" : autoQuality);
  const qs = useMemo(() => qualitySettings(quality), [quality]);

  const [showLabels, setShowLabels] = useState(true);
  const [showDims, setShowDims] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);
  const [preset, setPreset] = useState<ViewPreset>("orbit");
  const [style, setStyle] = useState<RenderStyle>("architectural");
  const [performanceMode, setPerformanceMode] = useState(false);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelGroupRef = useRef<THREE.Group | null>(null);
  const dimGroupRef = useRef<THREE.Group | null>(null);
  const highlightRef = useRef<THREE.LineSegments | null>(null);
  const roomMeshesRef = useRef<Map<string, { cx: number; cz: number; w: number; h: number }>>(new Map());
  const buildingRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const edgeGroupsRef = useRef<{ archi: THREE.Group; realistic: THREE.Group }>({ archi: new THREE.Group(), realistic: new THREE.Group() });
  const styleRef = useRef<RenderStyle>(style);
  styleRef.current = style;

  useEffect(() => setIsFullscreen(fullscreen), [fullscreen]);

  useEffect(() => {
    const onFsChange = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Cadrage automatique « Ajuster à la scène » ────────────────────────────
  const fitToScene = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const L = plan.length, W = plan.width;
    const dist = Math.max(L, W);
    const fov = (camera.fov * Math.PI) / 180;
    // Distance pour encadrer la diagonale avec une marge de 12 %
    const fitDist = ((dist * 1.15) / 2) / Math.tan(fov / 2);
    camera.position.set(L * 0.05 - fitDist * 0.52, fitDist * 0.62, fitDist * 0.86);
    controls.target.set(L / 2, WALL_H * 0.33, W / 2);
    controls.minDistance = dist * 0.22;
    controls.maxDistance = dist * 2.6;
    camera.near = Math.max(0.05, fitDist * 0.01);
    camera.far = fitDist * 12;
    controls.autoRotate = false;
    camera.updateProjectionMatrix();
    controls.update();
  }, [plan]);

  const applyPreset = useCallback(
    (p: ViewPreset) => {
      setPreset(p);
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const L = plan.length, W = plan.width;
      const dist = Math.max(L, W);
      controls.autoRotate = false;
      switch (p) {
        case "top":
          camera.position.set(L / 2, dist * 1.35, W / 2 + 0.01);
          controls.target.set(L / 2, 0, W / 2);
          break;
        case "front":
          camera.position.set(L / 2, WALL_H * 0.45, W + dist * 0.72);
          controls.target.set(L / 2, WALL_H / 2, W / 2);
          break;
        case "left":
          camera.position.set(-dist * 0.8, WALL_H * 0.42, W / 2);
          controls.target.set(L / 2, WALL_H / 2, W / 2);
          break;
        case "right":
          camera.position.set(L + dist * 0.8, WALL_H * 0.42, W / 2);
          controls.target.set(L / 2, WALL_H / 2, W / 2);
          break;
        case "interior": {
          const big = plan.rooms.reduce((a, b) => (a && a.area >= b.area ? a : b), plan.rooms[0]);
          if (big) {
            camera.position.set(big.x + big.w * 0.2, 1.6, big.y + big.h * 0.2);
            controls.target.set(big.x + big.w * 0.85, 1.2, big.y + big.h * 0.85);
          }
          break;
        }
        default:
          fitToScene();
          return;
      }
      controls.update();
    },
    [plan, fitToScene],
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // ── Construction de la scène (données géométriques = source unique 2D/3D) ─
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
    sceneRef.current = scene;
    scene.background = null;

    // ── Caméra : cadrage intelligent + clipping adaptés ────────────────────
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 380;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 1000);
    cameraRef.current = camera;
    const dist0 = Math.max(L, W);
    const fitDist0 = ((dist0 * 1.15) / 2) / Math.tan(((42 * Math.PI) / 180) / 2);
    camera.near = Math.max(0.05, fitDist0 * 0.01);
    camera.far = fitDist0 * 12;
    camera.position.set(L * 0.05 - fitDist0 * 0.52, fitDist0 * 0.62, fitDist0 * 0.86);

    // ── Renderer : résolution physique réelle (anti-flou) ──────────────────
    // `pm` est lu localement pendant toute la construction de la scène (l'état
    // React ne sert qu'au bandeau « Mode performance activé »).
    let pm = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: qs.antialias,
        alpha: true,
        powerPreference: quality === "low" ? "low-power" : "high-performance",
      });
      // GPU logiciel / driver sans MSAA → dégradation propre : on baisse les
      // coûts (ombres, pixelRatio) mais JAMAIS la netteté (pas de resize CSS).
      const ctx = renderer.getContext();
      const debugInfo = ctx.getExtension("WEBGL_debug_renderer_info");
      const gpu = debugInfo ? ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
      if (typeof gpu === "string" && /swiftshader|software|basic render/i.test(gpu)) {
        pm = true;
      }
    } catch {
      pm = true;
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    }
    rendererRef.current = renderer;
    const dprCap = pm ? Math.min(qs.maxPixelRatio, 1.5) : qs.maxPixelRatio;
    const shadowsOn = qs.shadows && !pm;
    // setSize(w, h, false) : on pilote NOUS-MÊMES la taille CSS du canvas —
    // le buffer est à w*dpr × h*dpr, l'affichage à w×h : zéro interpolation.
    const applySize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      renderer.domElement.style.display = "block";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    applySize();
    renderer.shadowMap.enabled = shadowsOn;
    if (shadowsOn) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    if (pm) setPerformanceMode(true);

    // ── Éclairage 3 points léger (pas de noir, pas de cramé) ───────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0xb8b09a, 0.5));
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.55);
    sun.position.set(-L * 1.1, Math.max(L, W) * 1.4, W * 0.7);
    if (shadowsOn) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(qs.shadowMapSize, qs.shadowMapSize);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = Math.max(L, W) * 8;
      const ext = Math.max(L, W) * 0.95;
      sun.shadow.camera.left = -ext;
      sun.shadow.camera.right = ext;
      sun.shadow.camera.top = ext;
      sun.shadow.camera.bottom = -ext;
      sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.bias = -0.00035;
      sun.shadow.normalBias = 0.02;
      sun.shadow.radius = 3;
    }
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.4);
    fill.position.set(L * 0.9, Math.max(L, W) * 0.5, -W * 1.1);
    scene.add(fill);

    // ── Terrain + dalle ────────────────────────────────────────────────────
    const grassGeo = track(new THREE.PlaneGeometry(L + 14, W + 14));
    const grassMat = track(new THREE.MeshStandardMaterial({ color: 0x9db87a, roughness: 1 }));
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(L / 2, -0.12, W / 2);
    grass.receiveShadow = shadowsOn;
    scene.add(grass);

    const slabGeo = track(new THREE.BoxGeometry(L + 1.2, 0.12, W + 1.2));
    const slabMat = track(new THREE.MeshStandardMaterial({ color: 0xcbc4b4, roughness: 0.95 }));
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(L / 2, -0.06, W / 2);
    slab.receiveShadow = shadowsOn;
    scene.add(slab);

    // ── Matériaux (textures canvas haute résolution, filtres propres) ──────
    const wallMat = track(new THREE.MeshStandardMaterial({
      color: styleRef.current === "architectural" ? 0xf7f5f0 : 0xf2efe8,
      roughness: 0.9,
    }));
    const glassMat = track(new THREE.MeshPhysicalMaterial({
      color: 0x9ec8e8, transparent: true, opacity: 0.34,
      roughness: 0.06, metalness: 0.02,
    }));
    const doorMat = track(new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.55 }));

    const building = new THREE.Group();
    buildingRef.current = building;
    const pickables: THREE.Mesh[] = [];

    const batches = new Map<THREE.Material, THREE.BoxGeometry[]>();
    const pushBox = (sx: number, sy: number, sz: number, cx: number, cy: number, cz: number, mat: THREE.Material) => {
      if (sx < 0.01 || sy < 0.01 || sz < 0.01) return;
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      geo.translate(cx, cy, cz);
      let arr = batches.get(mat);
      if (!arr) { arr = []; batches.set(mat, arr); }
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
        const side = win.wall as "N" | "S" | "W" | "E";
        const start = win.wall === "N" || win.wall === "S" ? r.x + win.position : r.y + win.position;
        sides.find((s) => s.key === side)!.openings.push({ a: start, b: start + win.width, kind: "win" });
      }
      for (const d of r.doors) {
        if (!d.isEntry) continue;
        const side = d.wall as "N" | "S" | "W" | "E";
        const start = d.wall === "N" || d.wall === "S" ? r.x + d.position : r.y + d.position;
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
        kind: side.openings.find((o) => o.a >= iv.a - TOL && o.b <= iv.b + TOL)?.kind ?? ("win" as const),
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
          place(op.a, op.b, 0, WIN_SILL, wallMat);
          place(op.a, op.b, WIN_TOP, WALL_H, wallMat);
          place(op.a, op.b, WIN_SILL, WIN_TOP, glassMat);
        } else {
          place(op.a, op.b, DOOR_H, WALL_H, wallMat);
          place(op.a, op.b, 0, DOOR_H, doorMat);
        }
      }
    }

    // ── Cloisons intérieures fusionnées ────────────────────────────────────
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
    const wallSegs: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (const [x, segs] of vMap) {
      if (!isInterior(x, L)) continue;
      for (const seg of mergeIntervals(segs)) {
        pushBox(INT_T, WALL_H, seg.b - seg.a, x, WALL_H / 2, (seg.a + seg.b) / 2, wallMat);
        wallSegs.push({ pos: [x, WALL_H / 2, (seg.a + seg.b) / 2], size: [INT_T, WALL_H, seg.b - seg.a] });
      }
    }
    for (const [z, segs] of hMap) {
      if (!isInterior(z, W)) continue;
      for (const seg of mergeIntervals(segs)) {
        pushBox(seg.b - seg.a, WALL_H, INT_T, (seg.a + seg.b) / 2, WALL_H / 2, z, wallMat);
        wallSegs.push({ pos: [(seg.a + seg.b) / 2, WALL_H / 2, z], size: [seg.b - seg.a, WALL_H, INT_T] });
      }
    }

    const flushBatches = () => {
      for (const [mat, geos] of batches) {
        if (geos.length === 0) continue;
        const merged = mergeGeometries(geos, false);
        geos.forEach((g) => g.dispose());
        if (!merged) continue;
        merged.computeVertexNormals(); // normales propres après fusion
        const mesh = new THREE.Mesh(track(merged), mat);
        mesh.castShadow = shadowsOn;
        mesh.receiveShadow = shadowsOn;
        building.add(mesh);
      }
      batches.clear();
    };
    flushBatches();

    // ── Arêtes architecturales (contours discrets, style maquette) ─────────
    const archiEdges = new THREE.Group();
    const realisticEdges = new THREE.Group();
    edgeGroupsRef.current = { archi: archiEdges, realistic: realisticEdges };
    if (qs.edgeLines) {
      const edgeMatArchi = track(new THREE.LineBasicMaterial({ color: 0x8a8578, transparent: true, opacity: 0.35 }));
      const edgeMatReal = track(new THREE.LineBasicMaterial({ color: 0x6b665c, transparent: true, opacity: 0.25 }));
      // Contour du volume extérieur (4 côtés × arêtes verticales + couronne)
      const shell = new THREE.BoxGeometry(L, WALL_H, W);
      const shellEdges = track(new THREE.EdgesGeometry(shell, 20));
      shell.dispose();
      archiEdges.add(new THREE.LineSegments(shellEdges, edgeMatArchi));
      realisticEdges.add(new THREE.LineSegments(shellEdges, edgeMatReal));
      // Arêtes des cloisons principales
      for (const seg of wallSegs) {
        const g = new THREE.BoxGeometry(seg.size[0], seg.size[1], seg.size[2]);
        const e = new THREE.EdgesGeometry(g, 20);
        g.dispose();
        e.translate(seg.pos[0], seg.pos[1], seg.pos[2]);
        archiEdges.add(new THREE.LineSegments(e, edgeMatArchi));
        realisticEdges.add(new THREE.LineSegments(e, edgeMatReal));
      }
      archiEdges.visible = styleRef.current === "architectural";
      realisticEdges.visible = styleRef.current === "realistic";
      building.add(archiEdges);
      building.add(realisticEdges);
    }

    // ── Sols de pièces (1 mesh cliquable / pièce) ──────────────────────────
    const floorMatCache = new Map<number, THREE.MeshStandardMaterial>();
    const roomMeshes = new Map<string, { cx: number; cz: number; w: number; h: number }>();
    for (const r of plan.rooms) {
      const color = ROOM_COLORS_3D[r.kind] ?? ROOM_COLORS_3D.polyvalent;
      let mat = floorMatCache.get(color);
      if (!mat) {
        mat = track(new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
        floorMatCache.set(color, mat);
      }
      const geo = track(new THREE.BoxGeometry(Math.max(r.w - INT_T, 0.25), 0.06, Math.max(r.h - INT_T, 0.25)));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(r.x + r.w / 2, 0.03, r.y + r.h / 2);
      mesh.receiveShadow = shadowsOn;
      mesh.userData.roomId = r.id;
      pickables.push(mesh);
      roomMeshes.set(r.id, { cx: r.x + r.w / 2, cz: r.y + r.h / 2, w: r.w, h: r.h });
      building.add(mesh);
    }
    roomMeshesRef.current = roomMeshes;

    // ── Labels noms de pièces ──────────────────────────────────────────────
    const labelGroup = new THREE.Group();
    labelGroup.visible = showLabels;
    labelGroupRef.current = labelGroup;
    for (const r of plan.rooms) {
      if (r.w > 1.8 && r.h > 1.4) {
        const label = makeLabelTexture(r.label, r.area);
        track(label.texture);
        track(label.material);
        const planeGeo = track(new THREE.PlaneGeometry(
          Math.min(r.w * 0.82, 4.4),
          Math.min(r.w * 0.82, 4.4) * (label.canvas.height / label.canvas.width),
        ));
        const tag = new THREE.Mesh(planeGeo, label.material);
        tag.rotation.x = -Math.PI / 2;
        tag.position.set(r.x + r.w / 2, 0.075, r.y + r.h / 2);
        labelGroup.add(tag);
      }
    }
    building.add(labelGroup);

    // ── Cotes d'emprise ────────────────────────────────────────────────────
    const dimGroup = new THREE.Group();
    dimGroup.visible = showDims;
    dimGroupRef.current = dimGroup;
    const addDimLine = (from: THREE.Vector3, to: THREE.Vector3, text: string) => {
      const geo = track(new THREE.BufferGeometry().setFromPoints([from, to]));
      const line = new THREE.Line(geo, track(new THREE.LineBasicMaterial({ color: 0x44403c })));
      dimGroup.add(line);
      const spr = makeTextSprite(text);
      track(spr.texture);
      track(spr.material);
      spr.sprite.position.copy(from.clone().add(to).multiplyScalar(0.5)).add(new THREE.Vector3(0, 0.05, 0));
      dimGroup.add(spr.sprite);
    };
    addDimLine(new THREE.Vector3(0, 0.02, -1.2), new THREE.Vector3(L, 0.02, -1.2), `${L.toFixed(2)} m`);
    addDimLine(new THREE.Vector3(-1.2, 0.02, 0), new THREE.Vector3(-1.2, 0.02, W), `${W.toFixed(2)} m`);
    building.add(dimGroup);

    // ── Mobilier (batches fusionnés) ───────────────────────────────────────
    const furnMats = Object.fromEntries(
      (Object.keys(FURN_COLORS_3D) as MatTag[]).map((k) => [
        k,
        track(new THREE.MeshStandardMaterial({ color: FURN_COLORS_3D[k], roughness: 0.72 })),
      ]),
    ) as Record<MatTag, THREE.MeshStandardMaterial>;
    const furnBatches = new Map<MatTag, (THREE.BoxGeometry | THREE.CylinderGeometry)[]>();
    const pushFurn = (tag: MatTag, geo: THREE.BoxGeometry | THREE.CylinderGeometry) => {
      let arr = furnBatches.get(tag);
      if (!arr) { arr = []; furnBatches.set(tag, arr); }
      arr.push(geo);
    };
    for (const r of plan.rooms) {
      for (const p of roomFurniture(r)) {
        if (p.t === "l") continue;
        if (p.t === "c") {
          if (p.flat || p.r < 0.03) continue;
          const h = p.ht ?? 0.45;
          const cyl = new THREE.CylinderGeometry(p.r, p.r, h, 16);
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
      merged.computeVertexNormals();
      const mesh = new THREE.Mesh(track(merged), furnMats[tag]);
      mesh.castShadow = shadowsOn;
      mesh.receiveShadow = shadowsOn;
      building.add(mesh);
    }

    // ── Surbrillance de sélection ──────────────────────────────────────────
    const hlGeo = track(new THREE.BoxGeometry(1, 0.16, 1));
    const hlEdges = track(new THREE.EdgesGeometry(hlGeo));
    const hlMat = track(new THREE.LineBasicMaterial({ color: 0x7c3aed }));
    const highlight = new THREE.LineSegments(hlEdges, hlMat);
    highlight.visible = false;
    highlightRef.current = highlight;
    building.add(highlight);

    scene.add(building);

    // ── Contrôles orbitaux (tactile + souris + molette) ────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(L / 2, WALL_H * 0.33, W / 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controls.minDistance = dist0 * 0.22;
    controls.maxDistance = dist0 * 2.6;
    controls.maxPolarAngle = Math.PI / 2.06;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.9;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controlsRef.current = controls;
    controls.update();

    // ── Sélection par raycasting (clic ≠ rotation) ─────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
    const onPointerUp = (e: PointerEvent) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      downAt = null;
      if (moved > 6) return;
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

    // ── Resize : renderer → pixelRatio → aspect (ordre imposé) ────────────
    let raf = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      // Debounce léger pour les rafales (rotation d'écran, menu coulissant)
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applySize, 60);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("resize", onResize);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      if (resizeTimer) clearTimeout(resizeTimer);
      ro.disconnect();
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      labelGroupRef.current = null;
      dimGroupRef.current = null;
      highlightRef.current = null;
      buildingRef.current = null;
      sceneRef.current = null;
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      for (const d of disposables) d.dispose();
      // Libération immédiate du contexte GPU (aperçus montés/démontés) : évite
      // d'épuiser les contextes WebGL du navigateur sur la page d'accueil.
      renderer.forceContextLoss?.();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, quality]);

  // ── Bascule Architectural ↔ Réaliste (mêmes données, matériaux/contours) ─
  useEffect(() => {
    const building = buildingRef.current;
    if (!building) return;
    const { archi, realistic } = edgeGroupsRef.current;
    archi.visible = style === "architectural" && archi.children.length > 0;
    realistic.visible = style === "realistic" && realistic.children.length > 0;
    building.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mat && mat.isMeshStandardMaterial) {
        // Teinte légèrement plus chaude et saturation douce en réaliste
        if (style === "realistic" && mat.color.getHex() === 0xf7f5f0) {
          mat.color.setHex(0xf2efe8);
        } else if (style === "architectural" && mat.color.getHex() === 0xf2efe8) {
          mat.color.setHex(0xf7f5f0);
        }
      }
    });
  }, [style]);

  // Visibilité labels / cotes
  useEffect(() => {
    if (labelGroupRef.current) labelGroupRef.current.visible = showLabels;
    if (dimGroupRef.current) dimGroupRef.current.visible = showDims;
  }, [showLabels, showDims]);

  // Surbrillance 2D → 3D
  useEffect(() => {
    const hl = highlightRef.current;
    if (!hl) return;
    const info = selectedRoomId ? roomMeshesRef.current.get(selectedRoomId) : undefined;
    if (!info) { hl.visible = false; return; }
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
          "w-full rounded-lg overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800 touch-none",
          isFullscreen
            ? "h-[calc(100vh-0px)] sm:h-[calc(100vh-0px)]"
            : compact
              ? "h-[165px] sm:h-[195px]"
              : "h-[320px] sm:h-[400px]",
        )}
      />
      {/* Bandeau « Mode performance activé » (dégradation automatique, non bloquant) */}
      {performanceMode && !compact && (
        <div className="absolute top-11 left-2 rounded-md border border-amber-500/30 bg-amber-50/90 px-2 py-1 text-[9px] font-medium text-amber-700 pointer-events-none">
          Mode performance activé
        </div>
      )}
      {/* Barre d'outils + aide (masquées en rendu compact) */}
      {!compact && (
      <>
      <div className="absolute top-2 left-2 right-2 flex flex-wrap items-start gap-1.5 pointer-events-none">
        <div className="flex flex-wrap gap-1.5 pointer-events-auto">
          <ToolBtn active={preset === "orbit"} onClick={() => applyPreset("orbit")} title="Vue perspective (orbite libre)">
            <Box className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Perspective</span>
          </ToolBtn>
          <ToolBtn onClick={fitToScene} title="Ajuster à la scène (cadrage automatique)">
            <Focus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ajuster</span>
          </ToolBtn>
          {PRESETS.map((p) => (
            <ToolBtn key={p.key} active={preset === p.key} onClick={() => applyPreset(p.key)} title={`Vue ${p.label.toLowerCase()}`}>
              <span className="text-[10px] font-semibold">{p.label}</span>
            </ToolBtn>
          ))}
          <ToolBtn onClick={() => applyPreset("orbit")} title="Réinitialiser la caméra">
            <RotateCcw className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>
        <div className="ml-auto flex gap-1.5 pointer-events-auto">
          <ToolBtn
            active={style === "realistic"}
            onClick={() => setStyle((s) => (s === "architectural" ? "realistic" : "architectural"))}
            title={style === "architectural" ? "Passer en vue réaliste" : "Revenir en vue architecturale"}
          >
            <Contrast className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{style === "architectural" ? "Réaliste" : "Archit."}</span>
          </ToolBtn>
          <ToolBtn active={showDims} onClick={() => setShowDims((s) => !s)} title="Afficher/Masquer les dimensions">
            {showDims ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </ToolBtn>
          <ToolBtn active={showLabels} onClick={() => setShowLabels((s) => !s)} title="Afficher/Masquer les noms des pièces">
            <Tag className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={toggleFullscreen} title="Plein écran">
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </ToolBtn>
        </div>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[9px] text-muted-foreground bg-background/80 rounded-md px-2 py-1 border pointer-events-none">
        <MousePointerClick className="h-3 w-3" />
        Touchez une pièce · Pincez pour zoomer · Qualité {quality === "high" ? "élevée" : quality === "medium" ? "moyenne" : "allégée"}
      </div>
      </>
      )}
    </div>
  );
}

function ToolBtn({
  children, onClick, active, title,
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

// ── Textures canvas haute résolution (nettes, filtres propres) ──────────────

function makeLabelTexture(label: string, area: number) {
  // ×2 la résolution du legacy pour un texte net même en zoom
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  const pad = 24;
  const wBox = canvas.width - pad * 2;
  const hBox = canvas.height - pad * 2;
  ctx.beginPath();
  ctx.roundRect(pad, pad, wBox, hBox, 40);
  ctx.fill();
  ctx.strokeStyle = "rgba(28,25,23,0.5)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#292524";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let fontSize = 116;
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  while (ctx.measureText(label.toUpperCase()).width > wBox - 64 && fontSize > 52) {
    fontSize -= 6;
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  }
  ctx.fillText(label.toUpperCase(), canvas.width / 2, canvas.height / 2 - 46);
  ctx.fillStyle = "#57534e";
  ctx.font = `500 88px Inter, system-ui, sans-serif`;
  ctx.fillText(`${area.toFixed(2)} m²`, canvas.width / 2, canvas.height / 2 + 84);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  return { canvas, texture, material };
}

function makeTextSprite(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.roundRect(8, 16, canvas.width - 16, canvas.height - 32, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(28,25,23,0.4)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#44403c";
  ctx.font = "600 60px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.7, 0.425, 1);
  return { texture, material, sprite };
}
