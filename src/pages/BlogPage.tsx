import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useDirection } from "@/hooks/use-direction";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Eye, Search, Newspaper, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function formatDate(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function readingTime(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").trim();
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogPage() {
  useDirection();
  const seoConfig = useQuery(api.seo.getSeoConfigOrDefault);
  usePageSEO({
    title: seoConfig?.blogTitle || "Blog batibuild — Construction & Rénovation en Tunisie",
    description:
      seoConfig?.blogDescription ||
      "Conseils, guides et actualités sur la construction et la rénovation en Tunisie.",
    ogTitle: seoConfig?.blogTitle || "Blog batibuild",
    ogDescription: seoConfig?.blogDescription || "",
    keywords: "blog construction tunisie, guide rénovation, prix matériaux tunisie",
  });

  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const categories = useQuery(api.blog.getBlogCategories);
  const posts = useQuery(api.blog.getPublishedPosts, {
    category: category === "all" ? undefined : category,
    search: search || undefined,
    limit: 60,
  });

  const featured = posts?.find((p) => p.featured) ?? posts?.[0];
  const rest = (featured ? posts?.filter((p) => p._id !== featured._id) : posts) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60rem 30rem at 20% -10%, color-mix(in srgb, var(--auth-primary) 14%, transparent), transparent 60%), radial-gradient(50rem 26rem at 85% 0%, color-mix(in srgb, #f59e0b 10%, transparent), transparent 55%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5 }} className="max-w-2xl">
            <Badge
              className="mb-4 gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
              style={{
                background: "color-mix(in srgb, var(--auth-primary) 10%, transparent)",
                color: "var(--auth-primary)",
                borderColor: "color-mix(in srgb, var(--auth-primary) 20%, transparent)",
              }}
            >
              <Newspaper className="h-3 w-3" />
              Blog & Guides
            </Badge>
            <h1 className="tracking-tight font-bold text-3xl sm:text-5xl leading-tight">
              Le blog de la{" "}
              <span style={{ color: "var(--auth-primary)" }}>construction</span> en Tunisie
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed opacity-70 max-w-xl">
              Prix des matériaux, étapes de chantier, financement, rénovation — nos experts
              partagent leurs conseils pour bâtir sereinement.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8 max-w-md"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un article, un sujet…"
                className="h-11 rounded-full pl-10 text-sm border-border/40 bg-card/60 backdrop-blur-sm focus-visible:ring-2"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-8">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategory("all")}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all border ${
              category === "all"
                ? "text-white border-transparent"
                : "border-border/40 bg-card/50 text-muted-foreground hover:text-foreground"
            }`}
            style={
              category === "all"
                ? { background: "var(--auth-primary)" }
                : undefined
            }
          >
            Tous
          </button>
          {(categories ?? []).map((c) => (
            <button
              key={c.name}
              onClick={() => setCategory(category === c.name ? "all" : c.name)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all border ${
                category === c.name
                  ? "text-white border-transparent"
                  : "border-border/40 bg-card/50 text-muted-foreground hover:text-foreground"
              }`}
              style={category === c.name ? { background: "var(--auth-primary)" } : undefined}
            >
              {c.name}
              <span className="ml-1.5 opacity-60">({c.count})</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Content ── */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        {!posts ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24">
            <Newspaper className="mx-auto h-10 w-10 opacity-30" />
            <p className="mt-4 text-sm opacity-60">
              Aucun article pour le moment. Revenez bientôt !
            </p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && !search && category === "all" && (
              <motion.article
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45 }}
                className="group mb-12 overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm"
              >
                <Link to={`/blog/${featured.slug}`} className="grid md:grid-cols-2">
                  <div className="relative min-h-[220px] md:min-h-[320px] overflow-hidden bg-muted/30">
                    {featured.coverImage ? (
                      <img
                        src={featured.coverImage}
                        alt={featured.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Newspaper className="h-12 w-12 opacity-20" />
                      </div>
                    )}
                    <Badge className="absolute left-4 top-4 gap-1 rounded-full px-3 py-1 text-[10px] font-semibold text-white border-transparent"
                      style={{ background: "var(--auth-primary)" }}>
                      <Sparkles className="h-3 w-3" /> À la une
                    </Badge>
                  </div>
                  <div className="flex flex-col justify-center p-6 sm:p-10">
                    <div className="flex items-center gap-3 text-[11px] opacity-60">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(featured.publishedAt ?? featured.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {readingTime(featured.contentHtml)} min de lecture
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {featured.views ?? 0}
                      </span>
                    </div>
                    <h2 className="mt-4 tracking-tight font-bold text-xl sm:text-3xl leading-snug transition-colors group-hover:opacity-80">
                      {featured.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed opacity-70 line-clamp-3">
                      {featured.excerpt}
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: "var(--auth-primary)" }}>
                        {(featured.authorName || "B").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{featured.authorName}</p>
                        <p className="text-[10px] opacity-50">{featured.category}</p>
                      </div>
                      <span className="ml-auto flex items-center gap-1 text-xs font-medium"
                        style={{ color: "var(--auth-primary)" }}>
                        Lire l'article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            )}

            {/* Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, i) => (
                <motion.article
                  key={post._id}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                  className="group overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-border"
                >
                  <Link to={`/blog/${post.slug}`} className="block">
                    <div className="relative h-44 overflow-hidden bg-muted/30">
                      {post.coverImage ? (
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Newspaper className="h-10 w-10 opacity-20" />
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className="absolute left-3 top-3 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-medium"
                      >
                        {post.category}
                      </Badge>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-3 text-[10px] opacity-50">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.publishedAt ?? post.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {readingTime(post.contentHtml)} min
                        </span>
                      </div>
                      <h3 className="mt-3 tracking-tight font-semibold text-base leading-snug line-clamp-2 transition-colors group-hover:opacity-80">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed opacity-60 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <span
                          className="text-[11px] font-medium flex items-center gap-1"
                          style={{ color: "var(--auth-primary)" }}
                        >
                          Lire la suite
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-20">
        <div
          className="rounded-2xl border p-8 sm:p-12 text-center relative overflow-hidden"
          style={{
            borderColor: "color-mix(in srgb, var(--auth-primary) 20%, transparent)",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--auth-primary) 10%, transparent), color-mix(in srgb, var(--auth-primary) 3%, transparent))",
          }}
        >
          <h2 className="tracking-tight font-bold text-xl sm:text-3xl">
            Envie d'estimer votre projet de construction ?
          </h2>
          <p className="mt-3 text-sm opacity-70 max-w-lg mx-auto">
            Obtenez une estimation détaillée en quelques minutes grâce à notre moteur
            d'estimation BIM alimenté par l'IA.
          </p>
          <Link to="/dashboard/new">
            <Button className="mt-6 gap-2 rounded-full px-6 text-sm h-11">
              Lancer une estimation <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
