import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

/**
 * SEO component that dynamically updates <head> meta tags from Convex config.
 * Place this once in your app layout (e.g., main.tsx or a root component).
 */
export function SEO() {
  const seoConfig = useQuery(api.seo.getSeoConfigOrDefault);

  useEffect(() => {
    if (!seoConfig) return;

    const { document } = window;
    const head = document.querySelector("head")!;
    const config = seoConfig as any;

    // Helper to create/update meta tags
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

    // Title
    if (config.siteName) document.title = config.siteName;

    // Basic meta
    setMeta("description", config.siteDescription);
    setMeta("keywords", config.keywords);

    // Open Graph
    setMeta("og:title", config.ogTitle || config.siteName, true);
    setMeta("og:description", config.ogDescription || config.siteDescription, true);
    setMeta("og:type", "website", true);
    if (config.ogImage) setMeta("og:image", config.ogImage, true);

    // Canonical URL
    if (config.canonicalUrl) {
      let link = head.querySelector(`link[rel="canonical"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        head.appendChild(link);
      }
      link.setAttribute("href", config.canonicalUrl);
    }

    // Twitter Card
    if (config.twitterCard) setMeta("twitter:card", config.twitterCard);
    if (config.ogTitle || config.siteName) setMeta("twitter:title", config.ogTitle || config.siteName);
    if (config.ogDescription || config.siteDescription) setMeta("twitter:description", config.ogDescription || config.siteDescription);
    if (config.ogImage) setMeta("twitter:image", config.ogImage);

    // Google Search Console verification
    if (config.googleSiteVerification) {
      setMeta("google-site-verification", config.googleSiteVerification);
    }

    // Google Analytics
    if (config.googleAnalyticsId) {
      if (!document.querySelector(`script[data-ga="${config.googleAnalyticsId}"]`)) {
        const s1 = document.createElement("script");
        s1.setAttribute("data-ga", config.googleAnalyticsId);
        s1.async = true;
        s1.src = `https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}`;
        head.appendChild(s1);

        const s2 = document.createElement("script");
        s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.googleAnalyticsId}');`;
        head.appendChild(s2);
      }
    }

    // Additional custom meta tags
    if (config.additionalMetaTags) {
      if (!head.querySelector("#seo-additional")) {
        const div = document.createElement("div");
        div.id = "seo-additional";
        div.style.display = "none";
        div.innerHTML = config.additionalMetaTags;
        head.appendChild(div);
      }
    }

  }, [seoConfig]);

  return null;
}
