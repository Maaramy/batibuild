// ============================================================================
// VUE 3D GLOBALE DU BÂTIMENT — maquette multi-niveaux (Three.js)
// ----------------------------------------------------------------------------
// Rendu d'ENSEMBLE d'un bâtiment RDC+ : chaque niveau est construit depuis SON
// `FloorPlan` réel (mêmes murs, portes, fenêtres, pièces et surfaces que la 2D),
// puis empilé à sa cote d'étage. Aucune surface n'est dupliquée, divisée ni
// recalculée : l'emprise et les cloisons viennent du plan de chaque niveau.
//
//   · dalles d'étage + sols matière (parquet chêne, pierre, béton) ;
//   · murs extérieurs percés des fenêtres et issues (entrée, secours, service) ;
//   · cloisons intérieures avec portes et fenêtres de cour ;
//   · mobilier et équipements par nature de pièce (mêmes primitives que la 2D) ;
//   · escaliers reliant réellement les niveaux (gaine alignée par le moteur) ;
//   · habillage bois de l'entrée principale au RDC ;
//   · étiquettes de niveau (RDC, R+1…) et navigation orbitale + zoom.
//
// La vue par niveau reste disponible : ce module ne la remplace pas.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Box, Focus, Tag } from "lucide-react";
import type { FloorPlan, SitePlan } from "@/lib/floorPlanEngine";
import { roomFurniture, type MatTag } from "@/lib/furniture";
import {
  planFloorFinish,
  planLevelShort,
  planNature,
  planTypeMeta,
  type PlanFloorFinish,
} from "@/lib/planPresentation";
import { buildSiteScene } from "./site3D";
import { cn } from "@/lib/utils";

const WALL_H = 2.7;
const SLAB_T = 0.26;
/** Hauteur d'étage (mur + dalle) : cote réelle de chaque niveau. */
export const STOREY_HEIGHT = WALL_H + SLAB_T;
const EXT_T = 0.2;
const INT_T = 0.1;
const WIN_SILL = 0.95;
const WIN_TOP = 2.15;
const DOOR_H = 2.05;
const TOL = 0.02;

type WallSide = "N" | "S" | "W" | "E";
interface Interval {
  a: number;
  b: number;
}
interface Opening extends Interval {
  kind: "win" | "door";
}

export interface FloorPlan3DBuildingProps {
  /** Niveaux du bâtiment (au moins deux), dans l'ordre RDC → R+N. */
  plans: FloorPlan[];
  site?: SitePlan;
  category?: string | null;
  zoomAction?: { action: "in" | "out" | "fit"; seq: number } | null;
  className?: string;
  compact?: boolean;
  lite?: boolean;
}

/** Cote du sol fini d'un niveau (0 = RDC). */
export function storeyElevation(level: number): number {
  return Math.max(0, Math.floor(level || 0)) * STOREY_HEIGHT;
}

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

/** Morceaux pleins d'un segment après retrait des ouvertures. */
function solidPieces(segment: Interval, openings: Interval[]): Interval[] {
  const out: Interval[] = [];
  let cursor = segment.a;
  for (const op of mergeIntervals(openings)) {
    if (op.b <= cursor + TOL) continue;
    if (op.a > cursor + TOL) out.push({ a: cursor, b: Math.min(op.a, segment.b) });
    cursor = Math.max(cursor, op.b);
  }
  if (cursor < segment.b - TOL) out.push({ a: cursor, b: segment.b });
  return out;
}

function isBoundary(value: number, max: number): boolean {
  return value <= TOL || Math.abs(value - max) <= TOL;
}

/** Ouvertures réellement percées dans l'enveloppe du niveau. */
function envelopeOpenings(plan: FloorPlan): Record<WallSide, Opening[]> {
  const sides: Record<WallSide, Opening[]> = { N: [], S: [], W: [], E: [] };
  const L = plan.length;
  const W = plan.width;
  for (const room of plan.rooms) {
    if (room.exterior || room.kind === "bassin") continue;
    for (const win of room.windows) {
      const onEnvelope =
        (win.wall === "N" && room.y < TOL) ||
        (win.wall === "S" && Math.abs(room.y + room.h - W) < TOL) ||
        (win.wall === "W" && room.x < TOL) ||
        (win.wall === "E" && Math.abs(room.x + room.w - L) < TOL);
      if (!onEnvelope) continue;
      const start =
        win.wall === "N" || win.wall === "S"
          ? room.x + win.position
          : room.y + win.position;
      sides[win.wall].push({ a: start, b: start + win.width, kind: "win" });
    }
    for (const door of room.doors) {
      const onEnvelope =
        (door.wall === "N" && room.y < TOL) ||
        (door.wall === "S" && Math.abs(room.y + room.h - W) < TOL) ||
        (door.wall === "W" && room.x < TOL) ||
        (door.wall === "E" && Math.abs(room.x + room.w - L) < TOL);
      if (!onEnvelope) continue;
      const start =
        door.wall === "N" || door.wall === "S"
          ? room.x + door.position
          : room.y + door.position;
      sides[door.wall].push({ a: start, b: start + door.width, kind: "door" });
    }
  }
  return sides;
}

/** Texture parquet chêne (même famille de matières que le plan 2D). */
function makePlankTexture(): THREE.CanvasTexture {
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
    const joint = ((i * 173) % 512 + 512) % 512;
    ctx.beginPath();
    ctx.moveTo(joint, y);
    ctx.lineTo(joint, y + rowH);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Enseigne de signalétique (entrée principale / sortie de secours). */
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
  let fontSize = 84;
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  while (ctx.measureText(text).width > canvas.width - 60 && fontSize > 36) {
    fontSize -= 4;
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  return { texture, material };
}

/** Étiquette de niveau lisible (RDC, R+1…). */
function makeLevelTag(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(242,235,221,0.96)";
  ctx.beginPath();
  ctx.roundRect(8, 20, 368, 88, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(35,32,28,0.45)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#23201C";
  ctx.font = "700 54px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 192, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  return { texture, material };
}

/**
 * Vue 3D d'ensemble. Montée par la page des plans pour les projets RDC+ dont
 * la règle `allowsPlan3DBuilding` autorise la vue globale.
 */
export function FloorPlan3DBuilding({
  plans,
  site,
  category,
  zoomAction,
  className,
  compact = false,
  lite = false,
}: FloorPlan3DBuildingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const labelsRef = useRef<THREE.Group | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  // Valeur courante lue pendant la construction (sans relancer la scène à
  // chaque bascule d'étiquettes).
  const showLabelsRef = useRef(showLabels);
  showLabelsRef.current = showLabels;

  const levels = useMemo(
    () => [...plans].sort((a, b) => a.level - b.level),
    [plans],
  );
  const bounds = useMemo(() => {
    const maxL = Math.max(1, ...levels.map((p) => p.length));
    const maxW = Math.max(1, ...levels.map((p) => p.width));
    const topLevel = Math.max(0, ...levels.map((p) => p.level));
    const totalH = storeyElevation(topLevel) + WALL_H;
    const span = site
      ? Math.max(site.plot.length, site.plot.width)
      : Math.max(maxL, maxW);
    const cx = site ? site.plot.length / 2 - site.building.x : maxL / 2;
    const cz = site ? site.plot.width / 2 - site.building.y : maxW / 2;
    return { maxL, maxW, topLevel, totalH, span, cx, cz };
  }, [levels, site]);

  const fitToScene = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const { span, totalH, cx, cz } = bounds;
    const fov = (camera.fov * Math.PI) / 180;
    const extent = Math.max(span, totalH * 1.5) * 1.12;
    const half = extent / 2;
    const fitDist = Math.max(
      half / Math.tan(fov / 2),
      half / (Math.tan(fov / 2) * camera.aspect),
    );
    camera.position.set(cx - fitDist * 0.55, totalH * 0.5 + fitDist * 0.55, cz + fitDist * 0.92);
    controls.target.set(cx, totalH * 0.4, cz);
    controls.minDistance = span * 0.25;
    controls.maxDistance = span * 3;
    camera.near = Math.max(0.05, fitDist * 0.01);
    camera.far = fitDist * 14;
    camera.updateProjectionMatrix();
    controls.update();
  }, [bounds]);

  const zoomBy = useCallback((factor: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const offset = camera.position.clone().sub(controls.target);
    const distance = offset.length();
    if (distance < 0.001) return;
    const min = Math.max(0.5, controls.minDistance || 0.5);
    const max = Math.max(min + 0.1, controls.maxDistance || distance * 3);
    const next = Math.min(max, Math.max(min, distance / factor));
    camera.position.copy(controls.target).add(offset.setLength(next));
    camera.updateProjectionMatrix();
    controls.update();
  }, []);

  useEffect(() => {
    if (!zoomAction) return;
    if (zoomAction.action === "fit") fitToScene();
    else zoomBy(zoomAction.action === "in" ? 1.25 : 1 / 1.25);
  }, [zoomAction, fitToScene, zoomBy]);

  // ── Construction de la scène — chaque niveau garde sa géométrie réelle ────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || levels.length === 0) return;

    const { maxL, maxW, totalH, cx, cz } = bounds;
    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(d: T): T => {
      disposables.push(d);
      return d;
    };

    const scene = new THREE.Scene();
    scene.background = null;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 1200);
    cameraRef.current = camera;
    camera.position.set(cx - maxL, totalH * 0.9, cz + maxW * 1.9);
    scene.add(camera);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    }
    const shadowsOn = !lite;
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = `${width}px`;
    renderer.domElement.style.height = `${height}px`;
    renderer.domElement.style.display = "block";
    renderer.shadowMap.enabled = shadowsOn;
    if (shadowsOn) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── Éclairage 3 points léger (aucune zone noire) ───────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0xb8b09a, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
    sun.position.set(-maxL * 1.1, Math.max(totalH * 1.6, maxL * 1.2), maxW * 0.7);
    if (shadowsOn) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = Math.max(maxL, totalH) * 10;
      const ext = Math.max(maxL, maxW, totalH) * 0.95;
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
    fill.position.set(maxL * 0.9, totalH, -maxW * 1.1);
    scene.add(fill);

    // ── Terrain (parcelle réelle si disponible) ────────────────────────────
    if (site) {
      scene.add(buildSiteScene(site, { shadows: shadowsOn, track }));
    } else {
      const grassGeo = track(new THREE.PlaneGeometry(maxL + 16, maxW + 16));
      const grassMat = track(new THREE.MeshStandardMaterial({ color: 0x9db87a, roughness: 1 }));
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(maxL / 2, -0.13, maxW / 2);
      grass.receiveShadow = shadowsOn;
      scene.add(grass);
    }

    const building = new THREE.Group();
    scene.add(building);

    // ── Matériaux partagés ─────────────────────────────────────────────────
    const wallMat = track(new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.9 }));
    const capMat = track(new THREE.MeshStandardMaterial({ color: 0xefe9dd, roughness: 0.92 }));
    const slabMat = track(new THREE.MeshStandardMaterial({ color: 0xcbc4b4, roughness: 0.95 }));
    const doorMat = track(new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.55 }));
    const glassMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x9ec8e8,
        transparent: true,
        opacity: 0.34,
        roughness: 0.06,
        metalness: 0.02,
      }),
    );
    const stairMat = track(new THREE.MeshStandardMaterial({ color: 0xd8d1c2, roughness: 0.9 }));
    const woodMat = track(new THREE.MeshStandardMaterial({ color: 0xb07a45, roughness: 0.62 }));
    const woodDarkMat = track(new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 }));

    // Signalétique identique à la 2D : entrée principale (vert) et sortie de
    // secours (rouge), posées au-dessus des portes réelles du plan.
    const entrySign = makeSignTexture("ENTRÉE PRINCIPALE", "#15803D");
    const exitSign = makeSignTexture("SORTIE DE SECOURS", "#B3261E");
    track(entrySign.texture);
    track(entrySign.material);
    track(exitSign.texture);
    track(exitSign.material);
    const entrySignGeo = track(new THREE.PlaneGeometry(1.74, 0.36));
    const exitSignGeo = track(new THREE.PlaneGeometry(1.74, 0.36));

    const plank = track(makePlankTexture());
    const floorMats: Record<PlanFloorFinish, THREE.MeshStandardMaterial> = {
      oak: track(new THREE.MeshStandardMaterial({ map: plank, roughness: 0.72 })),
      stone: track(new THREE.MeshStandardMaterial({ color: 0xede8dd, roughness: 0.9 })),
      concrete: track(new THREE.MeshStandardMaterial({ color: 0xd7d3ca, roughness: 0.95 })),
      grass: track(new THREE.MeshStandardMaterial({ color: 0xa8bc8b, roughness: 1 })),
    };
    const furnMats: Record<MatTag, THREE.MeshStandardMaterial> = {
      wood: track(new THREE.MeshStandardMaterial({ color: 0xd9b183, roughness: 0.72 })),
      fabric: track(new THREE.MeshStandardMaterial({ color: 0xe9e0cd, roughness: 0.85 })),
      white: track(new THREE.MeshStandardMaterial({ color: 0xfaf8f3, roughness: 0.7 })),
      metal: track(new THREE.MeshStandardMaterial({ color: 0xc9d1d6, roughness: 0.45, metalness: 0.25 })),
    };

    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const push = (mat: THREE.Material, geo: THREE.BufferGeometry) => {
      let list = batches.get(mat);
      if (!list) {
        list = [];
        batches.set(mat, list);
      }
      list.push(geo);
    };
    const box = (
      mat: THREE.Material,
      sx: number,
      sy: number,
      sz: number,
      x: number,
      y: number,
      z: number,
    ) => {
      if (sx < 0.01 || sy < 0.01 || sz < 0.01) return;
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      geo.translate(x, y, z);
      push(mat, geo);
    };
    const flush = () => {
      for (const [mat, geos] of batches) {
        if (geos.length === 0) continue;
        const merged = mergeGeometries(geos, false);
        geos.forEach((g) => g.dispose());
        if (!merged) continue;
        merged.computeVertexNormals();
        const mesh = new THREE.Mesh(track(merged), mat);
        mesh.castShadow = shadowsOn;
        mesh.receiveShadow = shadowsOn;
        building.add(mesh);
      }
      batches.clear();
    };

    const labels = new THREE.Group();
    labels.visible = showLabelsRef.current;
    labelsRef.current = labels;
    building.add(labels);

    // ── Dalle de base ──────────────────────────────────────────────────────
    box(slabMat, maxL + 1.2, 0.16, maxW + 1.2, maxL / 2, -0.08, maxW / 2);

    // ── Un étage par niveau, à sa cote réelle ──────────────────────────────
    for (const plan of levels) {
      const L = plan.length;
      const W = plan.width;
      const base = storeyElevation(plan.level);
      const rooms = plan.rooms.filter((r) => r.kind !== "bassin");
      // Matières adaptées à l'usage du bâtiment de ce niveau.
      const nature = planNature(plan);

      // Dalle de l'étage (le RDC repose sur la dalle de base).
      if (plan.level > 0) {
        box(slabMat, L + 0.24, SLAB_T, W + 0.24, L / 2, base - SLAB_T / 2, W / 2);
      }

      // Sols finis par pièce : parquet, pierre, béton ou pelouse.
      for (const room of rooms) {
        const kind = planFloorFinish(room, nature);
        box(
          floorMats[kind],
          Math.max(room.w - INT_T, 0.2),
          0.04,
          Math.max(room.h - INT_T, 0.2),
          room.x + room.w / 2,
          base + 0.02,
          room.y + room.h / 2,
        );
      }

      // ── Enveloppe : murs extérieurs percés des ouvertures réelles ────────
      const sides = envelopeOpenings(plan);
      const sideRuns: Record<WallSide, number> = { N: L, S: L, W: W, E: W };
      for (const side of ["N", "S", "W", "E"] as WallSide[]) {
        const raw = sides[side];
        const openings = mergeIntervals(raw).map((iv) => ({
          ...iv,
          kind:
            raw.find((o) => o.a >= iv.a - TOL && o.b <= iv.b + TOL)?.kind ?? ("win" as const),
        }));
        const solids = solidPieces({ a: 0, b: sideRuns[side] }, openings);
        const place = (a: number, b: number, y0: number, y1: number, mat: THREE.Material) => {
          const len = b - a;
          const mid = (a + b) / 2;
          const cy = base + (y0 + y1) / 2;
          if (side === "N") box(mat, len, y1 - y0, EXT_T, mid, cy, EXT_T / 2);
          else if (side === "S") box(mat, len, y1 - y0, EXT_T, mid, cy, W - EXT_T / 2);
          else if (side === "W") box(mat, EXT_T, y1 - y0, len, EXT_T / 2, cy, mid);
          else box(mat, EXT_T, y1 - y0, len, L - EXT_T / 2, cy, mid);
        };
        for (const solid of solids) {
          place(solid.a, solid.b, 0, WALL_H, wallMat);
          if (side === "N" || side === "S") {
            box(capMat, solid.b - solid.a + 0.02, 0.05, EXT_T + 0.02, (solid.a + solid.b) / 2, base + WALL_H + 0.025, side === "N" ? EXT_T / 2 : W - EXT_T / 2);
          } else {
            box(capMat, EXT_T + 0.02, 0.05, solid.b - solid.a + 0.02, side === "W" ? EXT_T / 2 : L - EXT_T / 2, base + WALL_H + 0.025, (solid.a + solid.b) / 2);
          }
        }
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

      // ── Cloisons intérieures (mêmes arêtes que la 2D) ────────────────────
      const vLines = new Map<number, Interval[]>();
      const hLines = new Map<number, Interval[]>();
      const vOpen = new Map<number, Opening[]>();
      const hOpen = new Map<number, Opening[]>();
      const pushTo = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
        const list = map.get(key);
        if (list) list.push(value);
        else map.set(key, [value]);
      };
      for (const room of rooms) {
        if (room.exterior) continue;
        pushTo(vLines, room.x, { a: room.y, b: room.y + room.h });
        pushTo(vLines, room.x + room.w, { a: room.y, b: room.y + room.h });
        pushTo(hLines, room.y, { a: room.x, b: room.x + room.w });
        pushTo(hLines, room.y + room.h, { a: room.x, b: room.x + room.w });
        for (const door of room.doors) {
          if (door.wall === "W" || door.wall === "E") {
            const x = door.wall === "W" ? room.x : room.x + room.w;
            pushTo(vOpen, x, { a: room.y + door.position, b: room.y + door.position + door.width, kind: "door" });
          } else {
            const z = door.wall === "N" ? room.y : room.y + room.h;
            pushTo(hOpen, z, { a: room.x + door.position, b: room.x + door.position + door.width, kind: "door" });
          }
        }
        for (const win of room.windows) {
          if (win.wall === "W" || win.wall === "E") {
            const x = win.wall === "W" ? room.x : room.x + room.w;
            pushTo(vOpen, x, { a: room.y + win.position, b: room.y + win.position + win.width, kind: "win" });
          } else {
            const z = win.wall === "N" ? room.y : room.y + room.h;
            pushTo(hOpen, z, { a: room.x + win.position, b: room.x + win.position + win.width, kind: "win" });
          }
        }
      }

      const buildCut = (
        axis: "x" | "z",
        line: number,
        segment: Interval,
        cuts: Opening[],
      ) => {
        for (const solid of solidPieces(segment, cuts)) {
          const len = solid.b - solid.a;
          const mid = (solid.a + solid.b) / 2;
          if (axis === "x") box(wallMat, INT_T, WALL_H, len, line, base + WALL_H / 2, mid);
          else box(wallMat, len, WALL_H, INT_T, mid, base + WALL_H / 2, line);
        }
        for (const cut of mergeIntervals(cuts)) {
          const kind =
            cuts.find((c) => c.a >= cut.a - TOL && c.b <= cut.b + TOL)?.kind ?? "door";
          const len = cut.b - cut.a;
          const mid = (cut.a + cut.b) / 2;
          const place = (y0: number, y1: number, mat: THREE.Material, thin: number) => {
            if (axis === "x") box(mat, thin, y1 - y0, len, line, base + (y0 + y1) / 2, mid);
            else box(mat, len, y1 - y0, thin, mid, base + (y0 + y1) / 2, line);
          };
          if (kind === "win") {
            place(0, WIN_SILL, wallMat, INT_T);
            place(WIN_TOP, WALL_H, wallMat, INT_T);
            place(WIN_SILL, WIN_TOP, glassMat, INT_T * 0.35);
          } else {
            place(DOOR_H, WALL_H, wallMat, INT_T);
            place(0, DOOR_H, doorMat, INT_T * 0.4);
          }
        }
      };

      for (const [x, segments] of vLines) {
        if (isBoundary(x, L)) continue;
        const cuts = vOpen.get(x) ?? [];
        for (const segment of mergeIntervals(segments)) buildCut("x", x, segment, cuts);
      }
      for (const [z, segments] of hLines) {
        if (isBoundary(z, W)) continue;
        const cuts = hOpen.get(z) ?? [];
        for (const segment of mergeIntervals(segments)) buildCut("z", z, segment, cuts);
      }

      // ── Escaliers : liaison verticale réelle entre les niveaux ───────────
      if (plan.level < bounds.topLevel) {
        for (const room of plan.rooms.filter((r) => r.kind === "escalier")) {
          const alongX = room.w >= room.h;
          const run = alongX ? room.w : room.h;
          const treadWidth = Math.min(alongX ? room.h : room.w, 1.25);
          const steps = 12;
          const stepRun = run / steps;
          for (let i = 0; i < steps; i++) {
            const h = ((i + 1) / steps) * WALL_H;
            const offset = i * stepRun + stepRun / 2;
            if (alongX) {
              box(stairMat, stepRun, h, treadWidth, room.x + offset, base + h / 2, room.y + room.h / 2);
            } else {
              box(stairMat, treadWidth, h, stepRun, room.x + room.w / 2, base + h / 2, room.y + offset);
            }
          }
        }
      }

      // ── Mobilier et équipements par nature de pièce ──────────────────────
      for (const room of rooms) {
        if (room.exterior || room.kind === "escalier" || room.kind === "bassin") continue;
        for (const prim of roomFurniture(room, plan)) {
          if (prim.t === "l") continue;
          const mat = furnMats[prim.m ?? "wood"];
          if (prim.t === "c") {
            if (prim.flat || prim.r < 0.03) continue;
            const h = prim.ht ?? 0.45;
            const geo = new THREE.CylinderGeometry(prim.r, prim.r, h, 16);
            geo.translate(prim.x, base + 0.05 + h / 2, prim.y);
            push(mat, geo);
            continue;
          }
          const h = prim.ht ?? (prim.flat ? 0.02 : 0.45);
          box(mat, prim.w, h, prim.h, prim.x + prim.w / 2, base + 0.05 + h / 2, prim.y + prim.h / 2);
        }
      }

      // ── Habillage bois de l'entrée principale (RDC uniquement) ──────────
      if (plan.level === 0) {
        for (const room of plan.rooms) {
          for (const door of room.doors.filter((d) => d.isEntry)) {
            const onEnvelope =
              (door.wall === "N" && room.y < TOL) ||
              (door.wall === "S" && Math.abs(room.y + room.h - W) < TOL) ||
              (door.wall === "W" && room.x < TOL) ||
              (door.wall === "E" && Math.abs(room.x + room.w - L) < TOL);
            if (!onEnvelope) continue;
            const horizontal = door.wall === "N" || door.wall === "S";
            const outward = door.wall === "N" || door.wall === "W" ? -1 : 1;
            const start = (horizontal ? room.x : room.y) + door.position;
            const wallCoord = horizontal
              ? door.wall === "N"
                ? room.y
                : room.y + room.h
              : door.wall === "W"
                ? room.x
                : room.x + room.w;
            const mid = start + door.width / 2;
            const postH = DOOR_H + 0.34;
            if (horizontal) {
              for (const px of [start - 0.11, start + door.width + 0.11]) {
                box(woodMat, 0.12, postH, 0.12, px, postH / 2, wallCoord + outward * 0.26);
              }
              box(woodMat, door.width + 0.62, 0.09, 0.95, mid, postH + 0.045, wallCoord + outward * 0.5);
              for (let k = 0; k < 6; k++) {
                const t = (k + 0.5) / 6;
                box(woodDarkMat, 0.035, 0.02, 0.92, start - 0.25 + (door.width + 0.5) * t, postH + 0.1, wallCoord + outward * 0.5);
              }
              box(woodMat, door.width + 0.5, 0.05, 0.82, mid, 0.025, wallCoord + outward * 0.46);
            } else {
              for (const pz of [start - 0.11, start + door.width + 0.11]) {
                box(woodMat, 0.12, postH, 0.12, wallCoord + outward * 0.26, postH / 2, pz);
              }
              box(woodMat, 0.95, 0.09, door.width + 0.62, wallCoord + outward * 0.5, postH + 0.045, mid);
              for (let k = 0; k < 6; k++) {
                const t = (k + 0.5) / 6;
                box(woodDarkMat, 0.92, 0.02, 0.035, wallCoord + outward * 0.5, postH + 0.1, start - 0.25 + (door.width + 0.5) * t);
              }
              box(woodMat, 0.82, 0.05, door.width + 0.5, wallCoord + outward * 0.46, 0.025, mid);
            }
          }
        }
      }

      // ── Signalétique des issues du niveau ───────────────────────────────
      for (const room of plan.rooms) {
        for (const door of room.doors.filter((d) => d.isEntry || d.isEmergency)) {
          const horizontal = door.wall === "N" || door.wall === "S";
          const x = horizontal
            ? room.x + door.position + door.width / 2
            : door.wall === "W"
              ? room.x - 0.06
              : room.x + room.w + 0.06;
          const z = horizontal
            ? door.wall === "N"
              ? room.y - 0.06
              : room.y + room.h + 0.06
            : room.y + door.position + door.width / 2;
          const sign = new THREE.Mesh(
            door.isEntry ? entrySignGeo : exitSignGeo,
            door.isEntry ? entrySign.material : exitSign.material,
          );
          sign.position.set(x, base + DOOR_H + 0.36, z);
          sign.rotation.y =
            door.wall === "N"
              ? Math.PI
              : door.wall === "S"
                ? 0
                : door.wall === "W"
                  ? Math.PI / 2
                  : -Math.PI / 2;
          building.add(sign);
        }
      }

      // ── Étiquette du niveau, à côté de la maquette ──────────────────────
      const tag = makeLevelTag(planLevelShort(plan.level));
      track(tag.texture);
      track(tag.material);
      const sprite = new THREE.Sprite(tag.material);
      sprite.position.set(-1.15, base + WALL_H * 0.55, maxW + 1.15);
      sprite.scale.set(2.05, 0.68, 1);
      labels.add(sprite);
    }

    flush();

    // ── Contrôles orbitaux (souris, tactile, molette) ──────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx, totalH * 0.4, cz);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.minDistance = Math.max(2, Math.max(maxL, maxW) * 0.3);
    controls.maxDistance = Math.max(maxL, maxW) * 3.2;
    controls.maxPolarAngle = Math.PI / 2.06;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.85;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controlsRef.current = controls;
    // Arrêt de la rotation automatique dès la première interaction : la
    // maquette reste ensuite exactement où l'utilisateur l'a placée.
    const stopRotate = () => {
      controls.autoRotate = false;
    };
    renderer.domElement.addEventListener("pointerdown", stopRotate);
    controls.update();

    // ── Redimensionnement : renderer → pixelRatio → aspect ────────────────
    let raf = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const applySize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2));
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const onResize = () => {
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
    fitToScene();

    return () => {
      cancelAnimationFrame(raf);
      if (resizeTimer) clearTimeout(resizeTimer);
      ro.disconnect();
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", stopRotate);
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      labelsRef.current = null;
      for (const d of disposables) d.dispose();
      renderer.forceContextLoss?.();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels, site, lite]);

  useEffect(() => {
    if (labelsRef.current) labelsRef.current.visible = showLabels;
  }, [showLabels]);

  const meta = planTypeMeta(category);
  const levelRange =
    levels.length > 1 ? `RDC → ${planLevelShort(levels[levels.length - 1].level)}` : "RDC";

  return (
    <div className={cn("relative group", className)}>
      <div
        ref={containerRef}
        style={{ background: "#FBFAF7" }}
        className={cn(
          "w-full overflow-hidden rounded-lg touch-none",
          compact ? "h-[200px] sm:h-[240px]" : "h-[360px] sm:h-[480px]",
        )}
      />
      {!compact && (
        <>
          <div className="absolute top-2 left-2 right-2 flex flex-wrap items-start gap-1.5 pointer-events-none">
            <div className="pointer-events-auto rounded-md border border-[#E4D9C5] bg-[#F2EBDD]/95 px-2 py-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6E6559]">
                Vue 3D globale
              </p>
              <p className="text-[10px] font-semibold leading-tight text-[#23201C]">
                {meta.label} · {levelRange}
              </p>
            </div>
            <div className="ml-auto flex gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={fitToScene}
                title="Ajuster la maquette à la scène"
                className="inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md border border-border/60 bg-background/90 px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-violet-400 hover:text-foreground cursor-pointer"
              >
                <Focus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ajuster</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLabels((s) => !s)}
                title="Afficher / masquer les étiquettes de niveau"
                className={cn(
                  "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md border px-1.5 text-[10px] font-medium transition-colors cursor-pointer",
                  showLabels
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-border/60 bg-background/90 text-muted-foreground hover:border-violet-400 hover:text-foreground",
                )}
              >
                <Tag className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[9px] leading-tight text-muted-foreground pointer-events-none">
            <Box className="h-3 w-3 shrink-0" />
            Bâtiment complet · {levels.length} niveaux · faites glisser pour tourner, pincez pour zoomer
          </div>
        </>
      )}
    </div>
  );
}
