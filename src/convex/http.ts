import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Dynamic Sitemap endpoint
http.route({
  path: "/sitemap.xml",
  method: "GET",
  handler: httpAction(async (ctx) => {
    // Get all pages from various sources
    const config = await ctx.runQuery(api.seo.getSeoConfigOrDefault);
    const siteUrl = config?.canonicalUrl || "https://batibuild.app";

    const staticPages = [
      { path: "", priority: "1.0", changefreq: "weekly" },
      { path: "auth", priority: "0.6", changefreq: "monthly" },
      { path: "dashboard", priority: "0.5", changefreq: "daily" },
      { path: "dashboard/pricing", priority: "0.7", changefreq: "monthly" },
      { path: "dashboard/materials", priority: "0.6", changefreq: "weekly" },
      { path: "blog", priority: "0.8", changefreq: "daily" },
      { path: "contact", priority: "0.5", changefreq: "monthly" },
    ];

    const urls = staticPages.map(
      (p) => `  <url>
    <loc>${siteUrl}/${p.path}</loc>
    <priority>${p.priority}</priority>
    <changefreq>${p.changefreq}</changefreq>
  </url>`,
    );

    // Add project detail pages if available
    try {
      const projects = await ctx.runQuery(api.projects.getAllProjects);
      if (projects) {
        for (const project of projects as any[]) {
          urls.push(`  <url>
    <loc>${siteUrl}/dashboard/project/${project._id}</loc>
    <priority>0.4</priority>
    <changefreq>monthly</changefreq>
    <lastmod>${new Date(project.updatedAt || project.createdAt).toISOString().split("T")[0]}</lastmod>
  </url>`);
        }
      }
    } catch {
      // Projects query might fail if not authenticated, skip
    }

    // Add published blog posts
    try {
      const blogPosts = await ctx.runQuery(api.blog.getPublishedPosts, { limit: 100 });
      if (blogPosts) {
        for (const post of blogPosts as any[]) {
          urls.push(`  <url>
    <loc>${siteUrl}/blog/${post.slug}</loc>
    <priority>0.7</priority>
    <changefreq>monthly</changefreq>
    <lastmod>${new Date(post.publishedAt || post.updatedAt || post.createdAt).toISOString().split("T")[0]}</lastmod>
  </url>`);
        }
      }
    } catch {
      // Blog query may be empty on first deploy — skip
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});

// Robots.txt - dynamic route pointing to the static file
http.route({
  path: "/robots.txt",
  method: "GET",
  handler: httpAction(async () => {
    const robots = `User-agent: *
Allow: /
Sitemap: https://batibuild.app/sitemap.xml`;
    return new Response(robots, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }),
});

// ============================================================================
// MODULE OFFRES — suivi des campagnes marketing
// ----------------------------------------------------------------------------
// Trois routes publiques, uniquement identifiées par un jeton opaque propre au
// destinataire. Elles ne renvoient aucune donnée personnelle et sont
// idempotentes (un second appel ne recompte pas).
// ============================================================================

const TRANSPARENT_GIF = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Pixel d'ouverture — indicateur ESTIMATIF (les messageries le bloquent). */
http.route({
  path: "/t/o",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token") || "";
    if (token) {
      try {
        await ctx.runMutation(internal.marketing.trackOpen, { token });
      } catch {
        // Le pixel ne doit jamais casser le rendu de l'e-mail.
      }
    }
    const bytes = Uint8Array.from(atob(TRANSPARENT_GIF), (c) => c.charCodeAt(0));
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }),
});

/** Redirection de clic — enregistre le clic puis renvoie vers la destination. */
http.route({
  path: "/t/c",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const params = new URL(request.url).searchParams;
    const token = params.get("token") || "";
    const target = params.get("u") || "https://batibuild.app";

    let destination = /^https?:\/\//i.test(target) ? target : "https://batibuild.app";
    if (token) {
      try {
        const res = await ctx.runMutation(internal.marketing.trackClick, { token, url: target });
        if (res?.url) destination = res.url;
      } catch {
        // Le clic reste fonctionnel même si le compteur échoue.
      }
    }
    return new Response(null, {
      status: 302,
      headers: { Location: destination, "Cache-Control": "no-store" },
    });
  }),
});

/** Désinscription en un clic — exclut définitivement l'utilisateur des offres. */
http.route({
  path: "/t/u",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token") || "";
    let result: { ok: boolean; siteName: string; email: string } = {
      ok: false,
      siteName: "batibuild",
      email: "",
    };
    try {
      if (token) {
        result = await ctx.runMutation(internal.marketing.unsubscribe, { token });
      }
    } catch {
      // Page neutre en cas d'erreur.
    }

    const title = result.ok
      ? "Désinscription confirmée"
      : "Lien de désinscription invalide";
    const message = result.ok
      ? `L'adresse ${escapeHtml(result.email || "")} ne recevra plus les offres et campagnes ${escapeHtml(result.siteName)}. Vous continuerez à recevoir les e-mails liés à votre compte (factures, sécurité, service).`
      : "Ce lien est incomplet ou a déjà été utilisé. Vous pouvez gérer vos préférences depuis votre espace personnel.";

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px;">
  <div style="max-width:520px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center;">
    <div style="width:56px;height:56px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;background:#ecfdf5;color:#0f766e;font-size:26px;">${result.ok ? "&#10003;" : "!"}</div>
    <h1 style="margin:0 0 10px;font-size:20px;color:#111827;">${escapeHtml(title)}</h1>
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.65;">${message}</p>
  </div>
</body></html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }),
});

/**
 * Push Android — pixel d'ouverture. Mesuré uniquement lorsque l'application
 * (ou un client) charge réellement l'URL de suivi ; jamais inventé.
 */
http.route({
  path: "/p/o",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token") || "";
    if (token) {
      try {
        await ctx.runMutation(internal.push.trackEvent, { token, kind: "open" });
      } catch {
        // Le pixel ne doit jamais casser le rendu.
      }
    }
    const bytes = Uint8Array.from(atob(TRANSPARENT_GIF), (c) => c.charCodeAt(0));
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }),
});

/**
 * Push Android — clic. Enregistre l'ouverture de la destination puis redirige
 * vers la route interne de la plateforme (jamais de redirection ouverte :
 * la destination est relue depuis la campagne en base).
 */
http.route({
  path: "/p/c",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token") || "";
    const siteUrl = (process.env.SITE_URL || "https://batibuild.app").replace(/\/$/, "");
    let destination = "/dashboard";
    if (token) {
      try {
        const res = await ctx.runMutation(internal.push.trackEvent, { token, kind: "click" });
        if (res?.destination) destination = res.destination;
      } catch {
        // Le clic reste fonctionnel même si le compteur échoue.
      }
    }
    const location = destination.startsWith("http")
      ? destination
      : `${siteUrl}${destination.startsWith("/") ? destination : `/${destination}`}`;
    return new Response(null, {
      status: 302,
      headers: { Location: location, "Cache-Control": "no-store" },
    });
  }),
});

/** Push Android — désabonnement en un clic. */
http.route({
  path: "/p/u",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = new URL(request.url).searchParams.get("token") || "";
    let result: { ok: boolean; name: string } = { ok: false, name: "" };
    try {
      if (token) result = await ctx.runMutation(internal.push.unsubscribeByToken, { token });
    } catch {
      // Page neutre en cas d'erreur.
    }

    const title = result.ok ? "Notifications désactivées" : "Lien invalide";
    const message = result.ok
      ? "Vous ne recevrez plus les notifications push de batibuild. Vous pouvez les réactiver à tout moment depuis Paramètres → Notifications de l'application."
      : "Ce lien est incomplet ou expiré. Vous pouvez gérer vos notifications depuis les réglages de l'application.";
    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:20px;">
  <div style="max-width:520px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center;">
    <div style="width:56px;height:56px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;background:#ecfdf5;color:#0f766e;font-size:26px;">${result.ok ? "&#10003;" : "!"}</div>
    <h1 style="margin:0 0 10px;font-size:20px;color:#111827;">${escapeHtml(title)}</h1>
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.65;">${escapeHtml(message)}</p>
  </div>
</body></html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }),
});

export default http;
