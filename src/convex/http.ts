import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Dynamic Sitemap endpoint
http.route({
  path: "/sitemap.xml",
  method: "GET",
  handler: httpAction(async (ctx) => {
    // Get all pages from various sources
    const config = await ctx.runQuery(api.seo.getSeoConfigOrDefault);
    const siteUrl = config?.canonicalUrl || "https://budgetbati.com";

    const staticPages = [
      { path: "", priority: "1.0", changefreq: "weekly" },
      { path: "auth", priority: "0.6", changefreq: "monthly" },
      { path: "dashboard", priority: "0.5", changefreq: "daily" },
      { path: "dashboard/pricing", priority: "0.7", changefreq: "monthly" },
      { path: "dashboard/materials", priority: "0.6", changefreq: "weekly" },
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
Sitemap: https://budgetbati.com/sitemap.xml`;
    return new Response(robots, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }),
});

export default http;
