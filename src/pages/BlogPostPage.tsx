import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useDirection } from "@/hooks/use-direction";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Eye,
  Loader2,
  LogIn,
  MessageSquare,
  Newspaper,
  Send,
  Tag,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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
  const { user, isAuthenticated } = useAuth();
  const comments = useQuery(api.blog.getCommentsByPostId, { postId: post?._id as any });
  const addComment = useMutation(api.blog.addComment);

  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;
    setSubmitting(true);
    try {
      await addComment({ postId: post._id, content: commentText.trim() });
      setCommentText("");
      setSubmitted(true);
      toast.success("Commentaire envoyé — il sera visible après modération");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi du commentaire");
    }
    setSubmitting(false);
  };

  const approvedComments = (comments ?? []).filter((c) => c.status === "approved");
  const ownPending = (comments ?? []).filter(
    (c) => c.status === "pending" && c.authorId === user?._id,
  );

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

        {/* ── Comments ── */}
        <section className="mt-14">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5" style={{ color: "var(--auth-primary)" }} />
            <h2 className="tracking-tight font-bold text-lg">
              Commentaires{" "}
              <span className="text-sm font-medium opacity-50">({approvedComments.length})</span>
            </h2>
          </div>

          {/* Own pending comments */}
          {ownPending.length > 0 && (
            <div
              className="mt-4 rounded-xl border p-4 text-xs"
              style={{
                borderColor: "color-mix(in srgb, var(--auth-primary) 20%, transparent)",
                background: "color-mix(in srgb, var(--auth-primary) 5%, transparent)",
              }}
            >
              <p className="font-semibold flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                {ownPending.length} commentaire(s) en attente de modération
              </p>
              <p className="mt-1 opacity-60">
                Votre commentaire sera publié dès qu'il aura été approuvé par un modérateur.
              </p>
            </div>
          )}

          {/* List */}
          {comments === undefined ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : approvedComments.length === 0 && ownPending.length === 0 ? (
            <p className="mt-6 text-sm opacity-50">
              Aucun commentaire pour le moment. Soyez le premier à réagir !
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {(comments ?? []).map((c) => (
                <div
                  key={c._id}
                  className="flex gap-3.5 rounded-2xl border border-border/40 bg-card/40 p-4"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--auth-primary)" }}
                  >
                    {(c.authorName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{c.authorName}</p>
                      <span className="text-[10px] opacity-40">
                        {formatDate(c.createdAt)}
                      </span>
                      {c.status !== "approved" && c.authorId === user?._id && (
                        <Badge
                          className={`text-[9px] ${
                            c.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}
                        >
                          {c.status === "pending" ? "En attente" : "Non retenu"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed opacity-90">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form / login CTA */}
          <div
            className="mt-8 rounded-2xl border p-5"
            style={{
              borderColor: "color-mix(in srgb, var(--auth-primary) 15%, transparent)",
              background: "color-mix(in srgb, var(--auth-primary) 3%, transparent)",
            }}
          >
            {!isAuthenticated ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                    style={{ background: "var(--auth-primary)" }}
                  >
                    <LogIn className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Rejoignez la discussion</p>
                    <p className="text-xs opacity-60">
                      Connectez-vous pour commenter cet article.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    navigate(`/auth?returnTo=${encodeURIComponent(`/blog/${post.slug}`)}`)
                  }
                  className="gap-2 rounded-full"
                >
                  Se connecter <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : submitted ? (
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5" style={{ color: "var(--auth-primary)" }} />
                <p className="text-sm">
                  <span className="font-semibold">Merci !</span> Votre commentaire est en attente de
                  modération et apparaîtra ici une fois approuvé.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs"
                  onClick={() => setSubmitted(false)}
                >
                  Poster un autre commentaire
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: "var(--auth-primary)" }}
                  >
                    {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium">
                    Commenter en tant que <span className="opacity-70">{user?.name || user?.email}</span>
                  </p>
                </div>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Partagez votre avis ou posez une question… (il sera modéré avant publication)"
                  className="mt-3 w-full resize-y rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] opacity-40">
                    {commentText.length}/2000 caractères — respectez les autres membres
                  </p>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={submitting || commentText.trim().length < 3}
                    className="gap-2 rounded-full"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Envoyer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
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
