import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { BRAND_NAME } from "@/lib/branding";

type PageSEOParams = {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  keywords?: string;
};

/**
 * Hook to override global SEO settings for specific pages.
 * Call this in any page component to set page-specific meta tags.
 * 
 * @example
 * ```tsx
 * usePageSEO({
 *   title: "Mes Projets - batibuild",
 *   description: "Gérez vos projets de construction sur batibuild"
 * });
 * ```
 */
export function usePageSEO(params: PageSEOParams | null) {
  const seoConfig = useQuery(api.seo.getSeoConfigOrDefault);

  useEffect(() => {
    if (!params) return;
    if (!seoConfig) return;

    const { document } = window;
    const head = document.querySelector("head")!;

    const setMeta = (name: string, content: string, property = false) => {
      if (!content) return;
      const attr = property ? "property" : "name";
      let el = head.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const title = params.title || seoConfig.siteName || BRAND_NAME;
    const description = params.description || seoConfig.siteDescription || "";
    const ogTitle = params.ogTitle || params.title || seoConfig.ogTitle || seoConfig.siteName || BRAND_NAME;
    const ogDescription = params.ogDescription || params.description || seoConfig.ogDescription || seoConfig.siteDescription || "";
    const keywords = params.keywords || seoConfig.keywords || "";

    // Set page-specific title with branding suffix
    document.title = title;

    // Override meta tags
    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setMeta("og:title", ogTitle, true);
    setMeta("og:description", ogDescription, true);
    setMeta("twitter:title", ogTitle);
    setMeta("twitter:description", ogDescription);

    // Cleanup on unmount - restore global SEO
    return () => {
      // The global SEO component will re-run and restore the correct tags
    };
  }, [params, seoConfig]);
}
