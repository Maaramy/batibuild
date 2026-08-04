import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useDirection } from "@/hooks/use-direction";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Eye,
  Newspaper,
  Tag,
  User,
} from "lucide-react";
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

export default function BlogPostPage() {
  useDirection();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = useQuery(api.blog.getPostBySlug, { slug: slug ?? "" });
  const related = useQuery(api.blog.getPublishedPosts, {
    category: post?.category,
    limit: 3,
  });
  const incrementViews = useMutation(api.blog.incrementViews);

  // SEO per post + view counting (once per visit)
  usePageSEO(
    post
      ? {
          title: post.seoTitle || `${post.title} — Blog BudgetBati`,
          description: post.seoDescription || post.excerpt,
          ogTitle: post.seoTitle || post.title,
          ogDescription: post.seoDescription || post.excerpt,
          keywords: post.seoKeywords || (post.tags ?? []).join(", "),
        }
      : null,
  );

  useEffect(() => {
    if (!post) return;
    const key = `bb-viewed-${post._id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      incrementViews({ id: post._id });
    }
  }, [post, incrementViews]);

  const relatedOthers = (related ?? []).filter((p) => p._id !== post?._id).slice(0, 3);

  if (!post && slug) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <Newspaper className="h-10 w-10 opacity-30" />
        <p className="text-sm opacity-70">Article introuvable ou pas encore publié.</p>
        <Button variant="outline" onClick={() => navigate("/blog")} className="gap-2 rounded-full">
          <ArrowLeft className="h-4 w-4" /> Retour au blog
        </Button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Cover ── */}
      <header className="relative overflow-hidden border-b border-border/40">
        {post.coverImage && (
          <div className="absolute inset-0">
            <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, color-mix(in srgb, var(--background) 40%, transparent), var(--background) 96%)",
              }}
            />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50rem 24rem at 50% -10%, color-mix(in srgb, var(--auth-primary) 12%, transparent), transparent 60%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5 }}>
            <button
              onClick={() => navigate("/blog")}
              className="mb-6 flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour au blog
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="rounded-full px-3 py-1 text-[10px] font-semibold text-white border-transparent"
                style={{ background: "var(--auth-primary)" }}
              >
                {post.category}
              </Badge>
              {(post.tags ?? []).slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" className="rounded-full text-[10px] font-medium">
                  <Tag className="h-2.5 w-2.5" /> {t}
                </Badge>
              ))}
            </div>
            <h1 className="mt-5 tracking-tight font-bold text-2xl sm:text-4xl leading-tight">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] opacity-60">
              <span className="flex items-center gap-1.5">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: "var(--auth-primary)" }}
                >
                  {(post.authorName || "B").charAt(0).toUpperCase()}
                </span>
                {post.authorName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDate(post.publishedAt ?? post.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {readingTime(post.contentHtml)} min de lecture
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {post.views ?? 0} vues
              </span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">
        <motion.article
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.4, delay: 0.1 }}
          className="prose-blog"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* Author card */}
        <div
          className="mt-12 flex items-center gap-4 rounded-2xl border p-5"
          style={{
            borderColor: "color-mix(in srgb, var(--auth-primary) 15%, transparent)",
            background: "color-mix(in srgb, var(--auth-primary) 4%, transparent)",
          }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ background: "var(--auth-primary)" }}
          >
            {(post.authorName || "B").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 opacity-50" /> {post.authorName}
            </p>
            <p className="mt-1 text-xs opacity-60">
              Rédigé par l'équipe BudgetBati — spécialistes de l'estimation de construction en Tunisie.
            </p>
          </div>
        </div>
      </main>

      {/* ── Related ── */}
      {relatedOthers.length > 0 && (
        <section className="border-t border-border/40 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-12">
            <h2 className="tracking-tight font-bold text-lg sm:text-xl">À lire aussi</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedOthers.map((p) => (
                <Link
                  key={p._id}
                  to={`/blog/${p.slug}`}
                  className="group overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:-translate-y-1"
                >
                  <div className="h-36 overflow-hidden bg-muted/30">
                    {p.coverImage ? (
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Newspaper className="h-9 w-9 opacity-20" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] opacity-50">{formatDate(p.publishedAt ?? p.createdAt)}</p>
                    <h3 className="mt-1.5 text-sm font-semibold leading-snug line-clamp-2 group-hover:opacity-80">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button variant="outline" onClick={() => navigate("/blog")} className="gap-2 rounded-full">
                Voir tous les articles <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
