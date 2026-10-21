import * as THREE from "three";
import type { SitePlan } from "@/lib/floorPlanEngine";

// ============================================================================
// CONTEXTE EXTÉRIEUR 3D — parcelle, jardin, piscine, terrasse, cuisine d'été
// ----------------------------------------------------------------------------
// Le bâti 3D est construit dans son repère local (0..L, 0..W). Les éléments du
// plan de masse sont translatés de l'emprise du bâtiment pour rester à leur
// emplacement RÉEL sur la parcelle. Aucun aménagement extérieur n'est ajouté
// dans le volume bâti.
// ============================================================================

type Track = <T extends { dispose(): void }>(d: T) => T;

export function buildSiteScene(
  site: SitePlan,
  options: { shadows: boolean; track: Track },
): THREE.Group {
  const { track, shadows } = options;
  const group = new THREE.Group();
  const b = site.building;
  const local = (x: number, y: number) => ({ x: x - b.x, z: y - b.y });

  // ── Sol de la parcelle (jardin) ──────────────────────────────────────────
  const plotGeo = track(new THREE.PlaneGeometry(site.plot.length, site.plot.width));
  const plotMat = track(new THREE.MeshStandardMaterial({ color: 0x9fbc80, roughness: 1 }));
  const plot = new THREE.Mesh(plotGeo, plotMat);
  plot.rotation.x = -Math.PI / 2;
  plot.position.set(site.plot.length / 2 - b.x, -0.11, site.plot.width / 2 - b.y);
  plot.receiveShadow = shadows;
  group.add(plot);

  // Aucune limite de parcelle filaire : le jardin s'arrête naturellement sur
  // le sol, sans trait sombre autour de la maquette.

  // ── Patios : espaces extérieurs intégrés au volume ───────────────────────
  for (const patio of site.patios ?? []) {
    const c = local(patio.x + patio.w / 2, patio.y + patio.h / 2);
    const geo = track(new THREE.BoxGeometry(patio.w, 0.06, patio.h));
    const mat = track(new THREE.MeshStandardMaterial({ color: 0xcbbfa6, roughness: 0.95 }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(c.x, 0.005, c.z);
    mesh.receiveShadow = shadows;
    group.add(mesh);
    // Bande de plantation centrale : le patio reste un espace extérieur.
    const greenGeo = track(new THREE.BoxGeometry(patio.w * 0.55, 0.08, patio.h * 0.45));
    const greenMat = track(new THREE.MeshStandardMaterial({ color: 0x6f8f55, roughness: 1 }));
    const green = new THREE.Mesh(greenGeo, greenMat);
    green.position.set(c.x, 0.015, c.z);
    green.receiveShadow = shadows;
    group.add(green);
  }

  for (const el of site.elements) {
    const c = local(el.x + el.w / 2, el.y + el.h / 2);
    if (el.kind === "piscine") {
      // Margelle + bassin, strictement hors du bâti.
      const copingGeo = track(new THREE.BoxGeometry(el.w + 0.5, 0.1, el.h + 0.5));
      const copingMat = track(new THREE.MeshStandardMaterial({ color: 0xe8e2d3, roughness: 0.9 }));
      const coping = new THREE.Mesh(copingGeo, copingMat);
      coping.position.set(c.x, 0.03, c.z);
      coping.receiveShadow = shadows;
      group.add(coping);

      const waterGeo = track(new THREE.BoxGeometry(el.w, 0.08, el.h));
      const waterMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0x2f9fc4,
          roughness: 0.12,
          metalness: 0.05,
          transparent: true,
          opacity: 0.88,
        }),
      );
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.set(c.x, 0.07, c.z);
      group.add(water);
    } else if (el.kind === "terrasse") {
      const geo = track(new THREE.BoxGeometry(el.w, 0.09, el.h));
      const mat = track(new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 }));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(c.x, 0.025, c.z);
      mesh.receiveShadow = shadows;
      mesh.castShadow = shadows;
      group.add(mesh);

      // Pergola : couverture extérieure légère (poteaux + lames), ouverte sur
      // les côtés. Elle matérialise la « terrasse couverte » annoncée sans
      // jamais fermer l'espace ni le compter comme surface habitable.
      if (el.covered) {
        const woodMat = track(new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.85 }));
        const postH = 2.45;
        const px = Math.max(0.3, el.w / 2 - 0.18);
        const pz = Math.max(0.3, el.h / 2 - 0.18);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const postGeo = track(new THREE.BoxGeometry(0.14, postH, 0.14));
            const post = new THREE.Mesh(postGeo, woodMat);
            post.position.set(c.x + sx * px, postH / 2, c.z + sz * pz);
            post.castShadow = shadows;
            group.add(post);
          }
        }
        for (const sz of [-1, 1]) {
          const beamGeo = track(new THREE.BoxGeometry(el.w, 0.12, 0.1));
          const beam = new THREE.Mesh(beamGeo, woodMat);
          beam.position.set(c.x, postH, c.z + sz * pz);
          beam.castShadow = shadows;
          group.add(beam);
        }
        const slats = Math.min(22, Math.max(4, Math.round(el.w / 0.45)));
        for (let i = 0; i < slats; i++) {
          const t = slats === 1 ? 0.5 : i / (slats - 1);
          const slatGeo = track(new THREE.BoxGeometry(0.06, 0.07, el.h));
          const slat = new THREE.Mesh(slatGeo, woodMat);
          slat.position.set(c.x - el.w / 2 + 0.12 + t * (el.w - 0.24), postH + 0.09, c.z);
          slat.castShadow = shadows;
          group.add(slat);
        }
      }
    } else if (el.kind === "cuisine_exterieure") {
      const baseGeo = track(new THREE.BoxGeometry(el.w, 0.9, el.h * 0.55));
      const baseMat = track(new THREE.MeshStandardMaterial({ color: 0xcfc6b5, roughness: 0.9 }));
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(c.x, 0.45, c.z - el.h * 0.18);
      base.castShadow = shadows;
      base.receiveShadow = shadows;
      group.add(base);
      const topGeo = track(new THREE.BoxGeometry(el.w, 0.07, el.h * 0.6));
      const topMat = track(new THREE.MeshStandardMaterial({ color: 0x6b6357, roughness: 0.8 }));
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(c.x, 0.93, c.z - el.h * 0.18);
      top.castShadow = shadows;
      group.add(top);
    } else if (el.kind === "stationnement" || el.kind === "allee" || el.kind === "acces") {
      const geo = track(new THREE.PlaneGeometry(el.w, el.h));
      const mat = track(new THREE.MeshStandardMaterial({ color: 0xc9c5bc, roughness: 1 }));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(c.x, 0.002, c.z);
      mesh.receiveShadow = shadows;
      group.add(mesh);
    }
  }

  return group;
}
