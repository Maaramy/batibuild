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
  Box, Contrast, Focus,
  MousePointerClick, RotateCcw, Tag,
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
import { planNature } from "@/lib/planPresentation";
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

// Palette maquette : chêne clair, lin, appareils blancs, inox brossé. Même
// famille de matières que le plan 2D et la vignette de présentation.
const FURN_COLORS_3D: Record<MatTag, number> = {
  wood: 0xd9b183,
  fabric: 0xe9e0cd,
  white: 0xfaf8f3,
  metal: 0xc9d1d6,
};

/** Nature du sol 3D : parquet chêne, pierre claire, béton ou pelouse. */
type Floor3DKind = "oak" | "stone" | "concrete" | "grass";

const STONE_KINDS_3D = new Set<RoomKind>([
  "sdb", "wc", "sanitaire", "plonge", "buanderie", "chambre_froide",
]);
const CONCRETE_KINDS_3D = new Set<RoomKind>([
  "garage", "local_technique", "terrasse", "logistique",
]);

function floorKind3D(room: { kind: RoomKind; exterior?: boolean }): Floor3DKind {
  if (room.exterior || room.kind === "patio") return "grass";
  if (STONE_KINDS_3D.has(room.kind)) return "stone";
  if (CONCRETE_KINDS_3D.has(room.kind)) return "concrete";
  return "oak";
}

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
  /** Plan de masse : jardin, piscine, terrasse, cuisine d'été à leur place réelle. */
  site?: SitePlan;
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string | null) => void;
  /** Repli de compatibilité : `lite` équivaut à la qualité "low". */
  lite?: boolean;
  className?: string;
  /**
   * Rendu COMPACT (vignette) : hauteur réduite et barre d'outils/aide masquées.
   * Utilisé par les aperçus de la page d'accueil — la géométrie et les données
   * restent strictement identiques.
   */
  compact?: boolean;
  /** Niveau de qualité forcé (sinon détection automatique). */
  quality?: QualityLevel;
  /** Commandes de zoom envoyées par la barre d'outils du plan. */
  zoomAction?: { action: "in" | "out" | "fit"; seq: number } | null;
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
  site,
  selectedRoomId,
  onSelectRoom,
  lite,
  className,
  compact = false,
  quality: qualityProp,
  zoomAction,
}: FloorPlan3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Hooks toujours appelés (jamais conditionnels) : la détection auto tourne à
  // chaque rendu, `qualityProp`/`lite` ne font que surcharger le résultat.
  const autoQuality = useMemo(detectQualityLevel, []);
  const quality = qualityProp ?? (lite ? "low" : autoQuality);
  const qs = useMemo(() => qualitySettings(quality), [quality]);

  const [showLabels, setShowLabels] = useState(true);
  const [preset, setPreset] = useState<ViewPreset>("orbit");
  const [style, setStyle] = useState<RenderStyle>("architectural");
  const [performanceMode, setPerformanceMode] = useState(false);

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelGroupRef = useRef<THREE.Group | null>(null);
  const highlightRef = useRef<THREE.LineSegments | null>(null);
  const roomMeshesRef = useRef<Map<string, { cx: number; cz: number; w: number; h: number }>>(new Map());
  const buildingRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const edgeGroupsRef = useRef<{ archi: THREE.Group; realistic: THREE.Group }>({ archi: new THREE.Group(), realistic: new THREE.Group() });
  const styleRef = useRef<RenderStyle>(style);
  styleRef.current = style;

  // ── Cadrage automatique « Ajuster à la scène » ────────────────────────────
  const fitToScene = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const L = plan.length, W = plan.width;
    const dist = site ? Math.max(site.plot.length, site.plot.width) : Math.max(L, W);
    const cx = site ? site.plot.length / 2 - site.building.x : L / 2;
    const cz = site ? site.plot.width / 2 - site.building.y : W / 2;
    const fov = (camera.fov * Math.PI) / 180;
    // Encadrement réel de la scène : elle doit tenir en largeur COMME en
    // hauteur (téléphone en portrait, tablette), avec une marge de 12 % pour
    // ne jamais couper les façades, les portes ni les fenêtres.
    const half = (dist * 1.12) / 2;
    const fitDist = Math.max(
      half / Math.tan(fov / 2),
      half / (Math.tan(fov / 2) * camera.aspect),
    );
    camera.position.set(cx - fitDist * 0.52, fitDist * 0.62, cz + fitDist * 0.86);
    controls.target.set(cx, WALL_H * 0.33, cz);
    controls.minDistance = dist * 0.22;
    controls.maxDistance = dist * 2.6;
    camera.near = Math.max(0.05, fitDist * 0.01);
    camera.far = fitDist * 12;
    controls.autoRotate = false;
    camera.updateProjectionMatrix();
    controls.update();
  }, [plan, site]);

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

  // Zoom caméra progressif (+ / −) : la distance à la cible évolue par pas
  // de 25 %, bornée par les limites des contrôles orbitaux (jamais de plan
  // minuscule ni de traversée des murs). Le cadrage et l'orientation restent
  // inchangés : seul le rapprochement change.
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

  // Boutons de la barre d'outils du plan (identiques à la vue 2D) : même
  // zoom progressif, même recadrage « Ajuster ». `seq` permet de répéter la
  // commande sans changer d'état React.
  useEffect(() => {
    if (!zoomAction) return;
    if (zoomAction.action === "fit") fitToScene();
    else zoomBy(zoomAction.action === "in" ? 1.25 : 1 / 1.25);
  }, [zoomAction, fitToScene, zoomBy]);

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
    const dist0 = site ? Math.max(site.plot.length, site.plot.width) : Math.max(L, W);
    const cx0 = site ? site.plot.length / 2 - site.building.x : L / 2;
    const cz0 = site ? site.plot.width / 2 - site.building.y : W / 2;
    const halfTan0 = Math.tan(((42 * Math.PI) / 180) / 2);
    const half0 = (dist0 * 1.12) / 2;
    // Même cadrage « rien de coupé » qu'au bouton « Ajuster », en tenant
    // compte du ratio réel du conteneur (portrait mobile inclus).
    const fitDist0 = Math.max(
      half0 / halfTan0,
      half0 / (halfTan0 * (width / height)),
    );
    camera.near = Math.max(0.05, fitDist0 * 0.01);
    camera.far = fitDist0 * 12;
    camera.position.set(cx0 - fitDist0 * 0.52, fitDist0 * 0.62, cz0 + fitDist0 * 0.86);

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
    // Exposition légèrement relevée : blancs nets, aucune zone grise.
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    if (pm) setPerformanceMode(true);

    // ── Éclairage 3 points léger (pas de noir, pas de cramé) ───────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0xb8b09a, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
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
    // Avec un plan de masse, le sol réel (parcelle, jardin, bassin, terrasse)
    // remplace la pelouse générique : les extérieurs sont à leur place exacte.
    if (site) {
      scene.add(buildSiteScene(site, { shadows: shadowsOn, track }));
    } else {
      const grassGeo = track(new THREE.PlaneGeometry(L + 14, W + 14));
      const grassMat = track(new THREE.MeshStandardMaterial({ color: 0x9db87a, roughness: 1 }));
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(L / 2, -0.12, W / 2);
      grass.receiveShadow = shadowsOn;
      scene.add(grass);
    }

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

    // Un plan de piscine n'a pas d'enveloppe de bâtiment : le bassin et ses
    // plages sont rendus à ciel ouvert (aucun mur de maison autour du bassin).
    const isPoolPlan = plan.rooms.some((r) => r.kind === "bassin");

    // ── Murs extérieurs percés des ouvertures ──────────────────────────────
    type Opening = { a: number; b: number; kind: "win" | "door" };
    const sides: { key: "N" | "S" | "W" | "E"; openings: Opening[]; run: number }[] = [
      { key: "N", openings: [], run: L },
      { key: "S", openings: [], run: L },
      { key: "W", openings: [], run: W },
      { key: "E", openings: [], run: W },
    ];
    for (const r of isPoolPlan ? [] : plan.rooms) {
      for (const win of r.windows) {
        // Seules les fenêtres de FAÇADE percent l'enveloppe : une fenêtre de
        // cour/patio est percée dans la cloison correspondante (plus bas).
        const onEnvelope =
          (win.wall === "N" && r.y < TOL) ||
          (win.wall === "S" && Math.abs(r.y + r.h - W) < TOL) ||
          (win.wall === "W" && r.x < TOL) ||
          (win.wall === "E" && Math.abs(r.x + r.w - L) < TOL);
        if (!onEnvelope) continue;
        const side = win.wall as "N" | "S" | "W" | "E";
        const start = win.wall === "N" || win.wall === "S" ? r.x + win.position : r.y + win.position;
        sides.find((s) => s.key === side)!.openings.push({ a: start, b: start + win.width, kind: "win" });
      }
      for (const d of r.doors) {
        // Entrée principale, sortie de secours et porte de service : toutes les
        // issues extérieures du plan 2D sont réellement percées dans les murs 3D.
        if (!d.isEntry && !d.isEmergency && !d.isService) continue;
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
    // Chant de coupe des murs (maquette « dollhouse ») : fine bande plus
    // claire sur le dessus de chaque mur, sans modifier la hauteur utile.
    const capMat = track(
      new THREE.MeshStandardMaterial({ color: 0xefe9dd, roughness: 0.92 }),
    );
    for (const side of isPoolPlan ? [] : sides) {
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
        if (Math.abs(y1 - WALL_H) < 1e-6) {
          const capH = 0.05;
          if (side.key === "N") pushBox(len + 0.02, capH, EXT_T + 0.02, mid, WALL_H + capH / 2, halfE, capMat);
          else if (side.key === "S") pushBox(len + 0.02, capH, EXT_T + 0.02, mid, WALL_H + capH / 2, W - halfE, capMat);
          else if (side.key === "W") pushBox(EXT_T + 0.02, capH, len + 0.02, halfE, WALL_H + capH / 2, mid, capMat);
          else pushBox(EXT_T + 0.02, capH, len + 0.02, L - halfE, WALL_H + capH / 2, mid, capMat);
        }
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
    for (const r of isPoolPlan ? [] : plan.rooms) {
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
        wallSegs.push({ pos: [x, WALL_H / 2, (seg.a + seg.b) / 2], size: [INT_T, WALL_H, seg.b - seg.a] });
      }
    }
    for (const [z, segs] of hMap) {
      if (!isInterior(z, W)) continue;
      const openings = interior.horizontal.get(z) ?? [];
      for (const seg of mergeIntervals(segs)) {
        buildInteriorCut("z", z, seg, openings);
        wallSegs.push({ pos: [(seg.a + seg.b) / 2, WALL_H / 2, z], size: [seg.b - seg.a, WALL_H, INT_T] });
      }
    }

    // Chant de coupe des cloisons : lecture immédiate des murs blancs, comme
    // sur la maquette de référence.
    for (const seg of wallSegs) {
      pushBox(
        seg.size[0] + 0.02,
        0.05,
        seg.size[2] + 0.02,
        seg.pos[0],
        WALL_H + 0.025,
        seg.pos[2],
        capMat,
      );
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

    // ── Battants de portes intérieures (32° d'ouverture) ──────────────────
    for (const door of isPoolPlan ? [] : interior.doors) {
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
      leaf.castShadow = shadowsOn;
      leaf.receiveShadow = shadowsOn;
      building.add(leaf);
    }

    // ── Arêtes architecturales (contours discrets, style maquette) ─────────
    const archiEdges = new THREE.Group();
    const realisticEdges = new THREE.Group();
    edgeGroupsRef.current = { archi: archiEdges, realistic: realisticEdges };
    if (qs.edgeLines) {
      const edgeMatArchi = track(new THREE.LineBasicMaterial({ color: 0x8a8578, transparent: true, opacity: 0.35 }));
      const edgeMatReal = track(new THREE.LineBasicMaterial({ color: 0x6b665c, transparent: true, opacity: 0.25 }));
      // Aucun contour filaire autour du volume : seules les arêtes des
      // cloisons réelles sont tracées (pas de cadre parasite autour du bâti).
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
    // Matières identiques à la feuille de présentation : parquet chêne dans
    // les espaces de vie, pierre claire dans les pièces d'eau, béton pour les
    // annexes et terrasses, pelouse pour les extérieurs non couverts.
    const floorTextures: Record<Floor3DKind, THREE.Texture> = {
      oak: track(makePlankTexture()),
      stone: track(makeStoneTexture()),
      concrete: track(makeConcreteTexture()),
      grass: track(makeGrassTexture()),
    };
    const floorMatCache = new Map<string, THREE.MeshStandardMaterial>();
    const floorMaterialFor = (r: { kind: RoomKind; w: number; h: number; exterior?: boolean }) => {
      const kind = floorKind3D(r);
      const tile = kind === "oak" ? 2.4 : 1.6;
      const rx = Math.max(1, Math.round(r.w / tile));
      const rz = Math.max(1, Math.round(r.h / tile));
      const key = `${kind}:${rx}x${rz}`;
      let mat = floorMatCache.get(key);
      if (!mat) {
        const tex = track(floorTextures[kind].clone());
        tex.needsUpdate = true;
        tex.repeat.set(rx, rz);
        mat = track(
          new THREE.MeshStandardMaterial({
            map: tex,
            roughness: kind === "oak" ? 0.72 : 0.9,
            metalness: 0,
          }),
        );
        floorMatCache.set(key, mat);
      }
      return mat;
    };
    const roomMeshes = new Map<string, { cx: number; cz: number; w: number; h: number }>();
    for (const r of plan.rooms) {
      if (r.kind === "bassin") continue; // géométrie de bassin dédiée plus bas
      const mat = floorMaterialFor(r);
      const geo = track(new THREE.BoxGeometry(Math.max(r.w - INT_T, 0.25), 0.06, Math.max(r.h - INT_T, 0.25)));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(r.x + r.w / 2, 0.03, r.y + r.h / 2);
      mesh.receiveShadow = shadowsOn;
      mesh.userData.roomId = r.id;
      pickables.push(mesh);
      roomMeshes.set(r.id, { cx: r.x + r.w / 2, cz: r.y + r.h / 2, w: r.w, h: r.h });
      building.add(mesh);
    }

    // ── Bassin de piscine : volume enterré, eau et margelle ────────────────
    // Le bassin est un ouvrage, pas une pièce : il est creusé sous le niveau
    // du sol, rempli d'eau et entouré d'une margelle. Les cotes, la surface et
    // la position proviennent du même plan que la 2D.
    if (isPoolPlan) {
      const depth = 1.5;
      const basinWallMat = track(new THREE.MeshStandardMaterial({ color: 0xeef7fb, roughness: 0.85 }));
      const waterMat = track(new THREE.MeshStandardMaterial({
        color: 0x3fb8e8,
        roughness: 0.08,
        metalness: 0.06,
        transparent: true,
        opacity: 0.82,
      }));
      const copingMat = track(new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.75 }));
      for (const r of plan.rooms.filter((x) => x.kind === "bassin")) {
        const t = 0.22;
        const parts: { sx: number; sy: number; sz: number; x: number; y: number; z: number; mat: THREE.Material }[] = [
          // Fond et parois du bassin
          { sx: r.w, sy: 0.12, sz: r.h, x: r.x + r.w / 2, y: -depth, z: r.y + r.h / 2, mat: basinWallMat },
          { sx: r.w, sy: depth, sz: t, x: r.x + r.w / 2, y: -depth / 2, z: r.y + t / 2, mat: basinWallMat },
          { sx: r.w, sy: depth, sz: t, x: r.x + r.w / 2, y: -depth / 2, z: r.y + r.h - t / 2, mat: basinWallMat },
          { sx: t, sy: depth, sz: r.h, x: r.x + t / 2, y: -depth / 2, z: r.y + r.h / 2, mat: basinWallMat },
          { sx: t, sy: depth, sz: r.h, x: r.x + r.w - t / 2, y: -depth / 2, z: r.y + r.h / 2, mat: basinWallMat },
          // Plan d'eau sous la ligne de nage
          { sx: r.w - 2 * t, sy: 0.06, sz: r.h - 2 * t, x: r.x + r.w / 2, y: -0.28, z: r.y + r.h / 2, mat: waterMat },
          // Margelle périphérique
          { sx: r.w + 0.7, sy: 0.1, sz: 0.35, x: r.x + r.w / 2, y: 0.05, z: r.y - 0.175, mat: copingMat },
          { sx: r.w + 0.7, sy: 0.1, sz: 0.35, x: r.x + r.w / 2, y: 0.05, z: r.y + r.h + 0.175, mat: copingMat },
          { sx: 0.35, sy: 0.1, sz: r.h, x: r.x - 0.175, y: 0.05, z: r.y + r.h / 2, mat: copingMat },
          { sx: 0.35, sy: 0.1, sz: r.h, x: r.x + r.w + 0.175, y: 0.05, z: r.y + r.h / 2, mat: copingMat },
        ];
        for (const p of parts) {
          const geo = track(new THREE.BoxGeometry(p.sx, p.sy, p.sz));
          const mesh = new THREE.Mesh(geo, p.mat);
          mesh.position.set(p.x, p.y, p.z);
          mesh.receiveShadow = shadowsOn;
          mesh.castShadow = false;
          building.add(mesh);
        }
        // Zone cliquable pour la synchro 2D ↔ 3D (plan d'eau).
        const pickGeo = track(new THREE.BoxGeometry(r.w, 0.05, r.h));
        const pick = new THREE.Mesh(pickGeo, waterMat);
        pick.position.set(r.x + r.w / 2, -0.2, r.y + r.h / 2);
        pick.userData.roomId = r.id;
        pickables.push(pick);
        building.add(pick);
        roomMeshes.set(r.id, { cx: r.x + r.w / 2, cz: r.y + r.h / 2, w: r.w, h: r.h });
      }
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

    // ── Signalétique : « ENTRÉE PRINCIPALE » et « SORTIE DE SECOURS » (vertes) ──
    const signs = plan.rooms.flatMap((r) =>
      r.doors
        .filter((d) => d.isEntry || d.isEmergency)
        .map((d) => ({ r, d, entry: !!d.isEntry })),
    );
    if (signs.length > 0) {
      const entrySign = makeEntrySignTexture();
      const exitSign = makeExitSignTexture();
      track(entrySign.texture);
      track(entrySign.material);
      track(exitSign.texture);
      track(exitSign.material);
      const entryGeo = track(new THREE.PlaneGeometry(1.74, 0.36));
      const exitGeo = track(new THREE.PlaneGeometry(1.74, 0.36));
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
        const mesh = new THREE.Mesh(entry ? entryGeo : exitGeo, entry ? entrySign.material : exitSign.material);
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

    // ── Habillage bois de l'entrée principale (façade uniquement) ─────────
    // Deux poteaux, un auvent à lames et un seuil bois encadrent l'entrée.
    // Aucun bois sur les circulations techniques ni sur la porte de secours.
    const woodMat = track(new THREE.MeshStandardMaterial({ color: 0xb07a45, roughness: 0.62 }));
    const woodDarkMat = track(new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 }));
    const addWoodBox = (sx: number, sy: number, sz: number, cx: number, cy: number, cz: number, dark = false) => {
      const mesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(sx, sy, sz)),
        dark ? woodDarkMat : woodMat,
      );
      mesh.position.set(cx, cy, cz);
      mesh.castShadow = shadowsOn;
      mesh.receiveShadow = shadowsOn;
      building.add(mesh);
    };
    const postH = DOOR_H + 0.32;
    // Pas de pergola sur un entrepôt : le type de projet ne s'y prête pas.
    const pergolaRooms = planNature(plan) === "entrepot" ? [] : plan.rooms;
    for (const r of pergolaRooms) {
      for (const d of r.doors.filter((x) => x.isEntry)) {
        const onExterior =
          (d.wall === "N" && r.y < TOL) ||
          (d.wall === "S" && Math.abs(r.y + r.h - W) < TOL) ||
          (d.wall === "W" && r.x < TOL) ||
          (d.wall === "E" && Math.abs(r.x + r.w - L) < TOL);
        if (!onExterior) continue;
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
        const offset = 0.24;
        const mid = start + d.width / 2;
        if (horizontal) {
          for (const px of [start - 0.11, start + d.width + 0.11]) {
            addWoodBox(0.12, postH, 0.12, px, postH / 2, wallCoord + outward * offset);
          }
          addWoodBox(d.width + 0.62, 0.09, 0.95, mid, postH + 0.045, wallCoord + outward * 0.5);
          for (let k = 0; k < 6; k++) {
            const t = (k + 0.5) / 6;
            addWoodBox(0.035, 0.02, 0.92, start - 0.25 + (d.width + 0.5) * t, postH + 0.1, wallCoord + outward * 0.5, true);
          }
          addWoodBox(d.width + 0.5, 0.05, 0.82, mid, 0.025, wallCoord + outward * 0.46);
        } else {
          for (const pz of [start - 0.11, start + d.width + 0.11]) {
            addWoodBox(0.12, postH, 0.12, wallCoord + outward * offset, postH / 2, pz);
          }
          addWoodBox(0.95, 0.09, d.width + 0.62, wallCoord + outward * 0.5, postH + 0.045, mid);
          for (let k = 0; k < 6; k++) {
            const t = (k + 0.5) / 6;
            addWoodBox(0.92, 0.02, 0.035, wallCoord + outward * 0.5, postH + 0.1, start - 0.25 + (d.width + 0.5) * t, true);
          }
          addWoodBox(0.82, 0.05, d.width + 0.5, wallCoord + outward * 0.46, 0.025, mid);
        }
      }
    }

    // Aucun tracé de cote ni de cadrage autour de la maquette : le 3D reste
    // propre, les dimensions sont portées par le plan 2D.

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
      for (const p of roomFurniture(r, plan)) {
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

    // ── Végétation intérieure (maquette) ───────────────────────────
    // Une plante dans les grandes pièces de vie : même ponctuation végétale
    // que la maquette de référence, sans surcharge visuelle.
    const foliageMat = track(new THREE.MeshStandardMaterial({ color: 0x6f8b57, roughness: 0.88 }));
    const foliageLightMat = track(new THREE.MeshStandardMaterial({ color: 0x86a06a, roughness: 0.9 }));
    const potMat = track(new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.75 }));
    const leafRooms = new Set<RoomKind>([
      "sejour", "salle_cafe", "salle_client", "reception", "openspace", "attente", "hall",
    ]);
    for (const r of plan.rooms) {
      if (r.exterior || !leafRooms.has(r.kind) || r.area < 12) continue;
      const px = r.x + r.w - 0.6;
      const pz = r.y + r.h - 0.6;
      const pot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 14)), potMat);
      pot.position.set(px, 0.22, pz);
      pot.castShadow = shadowsOn;
      building.add(pot);
      const bush = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.34, 1)), foliageMat);
      bush.position.set(px, 0.72, pz);
      bush.castShadow = shadowsOn;
      building.add(bush);
      const bush2 = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.22, 1)), foliageLightMat);
      bush2.position.set(px - 0.18, 0.92, pz + 0.12);
      bush2.castShadow = shadowsOn;
      building.add(bush2);
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
    controls.target.set(cx0, WALL_H * 0.33, cz0);
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
  }, [plan, quality, site]);

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

  // Visibilité des noms de pièces
  useEffect(() => {
    if (labelGroupRef.current) labelGroupRef.current.visible = showLabels;
  }, [showLabels]);

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
        style={{ background: "#FBFAF7" }}
        className={cn(
          // Fond d'atelier clair dans tous les thèmes : aucune bande sombre
          // ne doit encadrer la maquette 3D.
          "w-full rounded-lg overflow-hidden touch-none",
          compact ? "h-[165px] sm:h-[195px]" : "h-[320px] sm:h-[400px]",
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
          <ToolBtn active={showLabels} onClick={() => setShowLabels((s) => !s)} title="Afficher/Masquer les noms des pièces">
            <Tag className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>
      </div>
      <div className="absolute bottom-2 left-2 right-28 flex items-center gap-1.5 text-[9px] leading-tight text-muted-foreground bg-background/80 rounded-md px-2 py-1 border pointer-events-none">
        <MousePointerClick className="h-3 w-3 shrink-0" />
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

/** Enseigne normalisée : fond plein, liseré blanc, mention en capitales. */
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
  while (
    ctx.measureText(text).width > canvas.width - 60 &&
    fontSize > 40
  ) {
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

// ── Textures de sol (parquet, pierre, béton, pelouse) ──────────────────────

function finishTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Parquet chêne clair : lames de 18 cm, veinage doux. */
function makePlankTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#E6C9A2";
  ctx.fillRect(0, 0, 512, 512);
  const rows = 8;
  const rowH = 512 / rows;
  for (let i = 0; i < rows; i++) {
    const y = i * rowH;
    ctx.fillStyle = i % 2 === 0 ? "#EAD0AB" : "#E3C49B";
    ctx.fillRect(0, y, 512, rowH);
    ctx.strokeStyle = "rgba(160,120,74,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
    // Joint de bout décalé d'une rangée à l'autre.
    const joint = ((i * 173) % 512 + 512) % 512;
    ctx.beginPath();
    ctx.moveTo(joint, y);
    ctx.lineTo(joint, y + rowH);
    ctx.stroke();
    // Veinage : quelques fibres très légères.
    ctx.strokeStyle = "rgba(176,132,84,0.18)";
    ctx.lineWidth = 1;
    for (let g = 1; g < 4; g++) {
      const gy = y + (rowH * g) / 4 + ((i * 7 + g * 3) % 5);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(140, gy - 3, 330, gy + 3, 512, gy);
      ctx.stroke();
    }
  }
  return finishTexture(canvas);
}

/** Pierre claire : carrelage 60 cm, joints fins. */
function makeStoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#EDE8DD";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#D6CDBC";
  ctx.lineWidth = 3;
  for (let i = 0; i <= 2; i++) {
    const p = (i * 512) / 2;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 60; i++) {
    const x = (i * 97) % 512;
    const y = (i * 151) % 512;
    ctx.fillRect(x, y, 2, 2);
  }
  return finishTexture(canvas);
}

/** Béton : dalle mate, grain fin. */
function makeConcreteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#D7D3CA";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = (i * 137) % 512;
    const y = (i * 271) % 512;
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.35)" : "rgba(120,114,104,0.18)";
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  return finishTexture(canvas);
}

/** Pelouse : extérieurs non couverts. */
function makeGrassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#A8BC8B";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "rgba(122,146,92,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 700; i++) {
    const x = (i * 89) % 512;
    const y = (i * 197) % 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ((i % 3) - 1), y - 5 - (i % 4));
    ctx.stroke();
  }
  return finishTexture(canvas);
}

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
