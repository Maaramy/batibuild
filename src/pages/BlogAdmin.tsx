import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Save,
  Search,
  ArrowLeft,
  Bold,
  Italic,
  List,
  Heading2,
  Quote,
  Link2,
  Upload,
  X,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  MessagesSquare,
} from "lucide-react";

const CATEGORIES = [
  "Conseils construction",
  "Prix & Marché",
  "Rénovation",
  "Architecture",
  "Financement",
  "Actualités",
];

type PostForm = {
  title: string;
  excerpt: string;
  contentHtml: string;
  category: string;
  tags: string;
  status: "draft" | "published";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoOgImage: string;
};

const emptyForm: PostForm = {
  title: "",
  excerpt: "",
  contentHtml:
    "<h2>Introduction</h2>\n<p>Écrivez ici votre introduction...</p>\n\n<h2>Développement</h2>\n<p>Détaillez les points clés de votre article.</p>\n\n<ul>\n  <li>Premier point</li>\n  <li>Deuxième point</li>\n</ul>\n\n<blockquote>Une citation pertinente pour appuyer votre propos.</blockquote>\n\n<h2>Conclusion</h2>\n<p>Terminez par une conclusion et un appel à l'action.</p>",
  category: "Conseils construction",
  tags: "",
  status: "draft",
  featured: false,
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  seoOgImage: "",
};

function formatDate(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BlogAdmin() {
  const allPosts = useQuery(api.blog.getAllPosts);
  const createPost = useMutation(api.blog.createPost);
  const updatePost = useMutation(api.blog.updatePost);
  const deletePost = useMutation(api.blog.deletePost);
  const togglePublish = useMutation(api.blog.togglePublish);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const allComments = useQuery(api.blog.getAllComments);
  const moderateComment = useMutation(api.blog.moderateComment);
  const deleteComment = useMutation(api.blog.deleteComment);

  const [section, setSection] = useState<"articles" | "commentaires">("articles");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const [commentFilter, setCommentFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [coverStorageId, setCoverStorageId] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Load editing post
  useEffect(() => {
    if (!dialogOpen || !editingId) return;
    const post = allPosts?.find((p) => p._id === editingId);
    if (!post) return;
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      contentHtml: post.contentHtml,
      category: post.category,
      tags: (post.tags ?? []).join(", "),
      status: post.status,
      featured: post.featured ?? false,
      seoTitle: post.seoTitle ?? "",
      seoDescription: post.seoDescription ?? "",
      seoKeywords: post.seoKeywords ?? "",
      seoOgImage: post.seoOgImage ?? "",
    });
    setCoverUrl(post.coverImage);
    setCoverStorageId(undefined);
  }, [dialogOpen, editingId, allPosts]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCoverUrl(undefined);
    setCoverStorageId(undefined);
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez choisir une image");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload échoué");
      const { storageId } = await result.json();
      setCoverStorageId(storageId);
      // Optimistic preview via object URL
      setCoverUrl(URL.createObjectURL(file));
      toast.success("Image prête à être enregistrée");
    } catch (err: any) {
      toast.error(err.message || "Erreur d'upload");
    }
    setUploading(false);
  };

  // Insert a snippet of HTML at the cursor of the content editor
  const insertSnippet = (before: string, after = "") => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? form.contentHtml.length;
    const end = ta.selectionEnd ?? form.contentHtml.length;
    const selected = form.contentHtml.slice(start, end) || "texte";
    const next =
      form.contentHtml.slice(0, start) + before + selected + after + form.contentHtml.slice(end);
    setForm((f) => ({ ...f, contentHtml: next }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const toolbar = [
    { icon: Bold, label: "Gras", action: () => insertSnippet("<strong>", "</strong>") },
    { icon: Italic, label: "Italique", action: () => insertSnippet("<em>", "</em>") },
    { icon: Heading2, label: "Sous-titre", action: () => insertSnippet("\n<h2>", "</h2>\n") },
    { icon: List, label: "Liste", action: () => insertSnippet("\n<ul>\n  <li>", "</li>\n</ul>\n") },
    { icon: Quote, label: "Citation", action: () => insertSnippet("\n<blockquote>", "</blockquote>\n") },
    {
      icon: Link2,
      label: "Lien",
      action: () => insertSnippet('<a href="https://" target="_blank" rel="noopener">', "</a>"),
    },
  ];

  const handleSave = async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.contentHtml.trim()) {
      toast.error("Titre, résumé et contenu sont obligatoires");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        contentHtml: form.contentHtml,
        category: form.category,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: form.status,
        featured: form.featured,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        seoKeywords: form.seoKeywords,
        seoOgImage: form.seoOgImage,
        ...(coverStorageId ? { coverStorageId: coverStorageId as any } : {}),
      };
      if (editingId) {
        await updatePost({ id: editingId as any, ...payload });
        toast.success("Article mis à jour");
      } else {
        await createPost(payload as any);
        toast.success("Article créé");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Supprimer définitivement « ${title} » ?`)) return;
    try {
      await deletePost({ id: id as any });
      toast.success("Article supprimé");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleModerate = async (id: string, action: "approve" | "reject") => {
    try {
      await moderateComment({ id: id as any, action });
      toast.success(action === "approve" ? "Commentaire approuvé" : "Commentaire rejeté");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ce commentaire ?")) return;
    try {
      await deleteComment({ id: id as any });
      toast.success("Commentaire supprimé");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const pendingComments = (allComments ?? []).filter((c) => c.status === "pending");

  const filtered = (allPosts ?? []).filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const publishedCount = (allPosts ?? []).filter((p) => p.status === "published").length;
  const draftCount = (allPosts ?? []).length - publishedCount;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Blog</h2>
            <p className="text-xs text-muted-foreground">
              Créez, modifiez et publiez les articles du blog public.
            </p>
          </div>
        </div>
        {section === "articles" && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nouvel article
          </Button>
        )}
      </div>

      {/* ── Sub-tabs: Articles / Commentaires ── */}
      <div className="flex rounded-xl border border-border/40 bg-background/50 p-1">
        <button
          onClick={() => setSection("articles")}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
            section === "articles"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Newspaper className="h-3.5 w-3.5" /> Articles
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
              section === "articles"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {(allPosts ?? []).length}
          </span>
        </button>
        <button
          onClick={() => setSection("commentaires")}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
            section === "commentaires"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessagesSquare className="h-3.5 w-3.5" /> Commentaires
          {pendingComments.length > 0 && (
            <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
              {pendingComments.length}
            </span>
          )}
        </button>
      </div>

      {section === "articles" ? (
        <>
      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/40 bg-background/50 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{(allPosts ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">Publiés</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">{publishedCount}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600">Brouillons</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-amber-600">{draftCount}</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article…"
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="flex rounded-lg border border-border/40 bg-background/50 p-0.5">
          {(["all", "draft", "published"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Tous" : f === "draft" ? "Brouillons" : "Publiés"}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
        <CardContent className="p-0">
          {!allPosts ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Newspaper className="mx-auto h-8 w-8 opacity-20" />
              <p className="mt-3 text-sm text-muted-foreground">
                {search || filter !== "all"
                  ? "Aucun article ne correspond à votre recherche."
                  : "Aucun article pour le moment. Cliquez sur « Nouvel article » pour commencer."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((post) => (
                <div key={post._id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border/30 bg-muted/30">
                    {post.coverImage ? (
                      <img src={post.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Newspaper className="h-5 w-5 opacity-20" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={post.status === "published" ? "default" : "secondary"}
                        className={
                          post.status === "published"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]"
                        }
                      >
                        {post.status === "published" ? (
                          <Eye className="h-2.5 w-2.5" />
                        ) : (
                          <EyeOff className="h-2.5 w-2.5" />
                        )}
                        {post.status === "published" ? "Publié" : "Brouillon"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{post.category}</span>
                      {post.featured && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">À la une</Badge>
                      )}
                    </div>
                    <h3 className="mt-1 truncate text-sm font-medium">{post.title}</h3>
                    <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(post.publishedAt ?? post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {post.views ?? 0}
                      </span>
                      <span className="truncate">/blog/{post.slug}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => togglePublish({ id: post._id as any })}
                      title={post.status === "published" ? "Dépublier" : "Publier"}
                    >
                      {post.status === "published" ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(post._id)}
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(post._id, post.title)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      ) : (
        <>
          {/* ── Comments moderation ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border/40 bg-background/50 p-0.5">
              {(["pending", "all", "approved", "rejected"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setCommentFilter(f)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    commentFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "pending"
                    ? "En attente"
                    : f === "all"
                      ? "Tous"
                      : f === "approved"
                        ? "Approuvés"
                        : "Rejetés"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {pendingComments.length} commentaire(s) en attente de modération
            </p>
          </div>

          <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
            <CardContent className="p-0">
              {!allComments ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (allComments ?? []).filter(
                  (c) => commentFilter === "all" || c.status === commentFilter,
                ).length === 0 ? (
                <div className="py-16 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 opacity-20" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {commentFilter === "pending"
                      ? "Aucun commentaire en attente. 🎉"
                      : "Aucun commentaire dans cette catégorie."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {(allComments ?? [])
                    .filter((c) => commentFilter === "all" || c.status === commentFilter)
                    .map((c) => (
                      <div key={c._id} className="flex gap-4 p-4 hover:bg-muted/20 transition-colors">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                            c.status === "pending"
                              ? "bg-amber-500"
                              : c.status === "approved"
                                ? "bg-emerald-500"
                                : "bg-muted-foreground"
                          }`}
                        >
                          {(c.authorName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{c.authorName}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(c.createdAt)}
                            </span>
                            <Badge
                              className={`text-[9px] ${
                                c.status === "pending"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : c.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-red-500/10 text-red-500 border-red-500/20"
                              }`}
                            >
                              {c.status === "pending"
                                ? "En attente"
                                : c.status === "approved"
                                  ? "Approuvé"
                                  : "Rejeté"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed">{c.content}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                            <span>Sur :</span>
                            {c.postSlug ? (
                              <Link
                                to={`/blog/${c.postSlug}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                              >
                                {c.postTitle} <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="opacity-60">{c.postTitle}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {c.status !== "approved" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => handleModerate(c._id, "approve")}
                              title="Approuver"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                          )}
                          {c.status !== "rejected" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleModerate(c._id, "reject")}
                              title="Rejeter"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteComment(c._id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Editor dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              {editingId ? "Modifier l'article" : "Nouvel article"}
            </DialogTitle>
            <DialogDescription>
              Rédigez votre article, personnalisez son SEO puis publiez-le.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title + category */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Titre de l'article *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex : Combien coûte la construction d'une villa en Tunisie en 2026 ?"
                  className="mt-1.5 h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Catégorie</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <Label className="text-xs">Résumé (extrait) *</Label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                placeholder="Un court résumé affiché dans la liste des articles (2-3 phrases)."
                className="mt-1.5 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y min-h-[60px]"
              />
            </div>

            {/* Cover image */}
            <div>
              <Label className="text-xs">Image de couverture</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-border/30 bg-muted/30">
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 opacity-20" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-8"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {coverUrl ? "Changer l'image" : "Téléverser une image"}
                  </Button>
                  {coverUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-8 text-destructive"
                      onClick={() => {
                        setCoverUrl(undefined);
                        setCoverStorageId(undefined);
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Retirer
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content editor */}
            <div>
              <Label className="text-xs">Contenu de l'article *</Label>
              <div className="mt-1.5 overflow-hidden rounded-lg border border-border/50">
                <div className="flex flex-wrap items-center gap-1 border-b border-border/40 bg-muted/30 px-2 py-1.5">
                  {toolbar.map((t) => (
                    <button
                      key={t.label}
                      onClick={t.action}
                      title={t.label}
                      className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <t.icon className="h-4 w-4" />
                    </button>
                  ))}
                  <span className="ml-auto hidden text-[10px] text-muted-foreground/60 sm:block">
                    HTML simple accepté (h2, p, ul, blockquote, img…)
                  </span>
                </div>
                <textarea
                  ref={contentRef}
                  value={form.contentHtml}
                  onChange={(e) => setForm({ ...form, contentHtml: e.target.value })}
                  rows={12}
                  className="w-full resize-y bg-background px-3 py-2.5 font-mono text-xs leading-relaxed focus:outline-none"
                />
              </div>
              <div className="mt-3 rounded-lg border border-border/30 bg-muted/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Aperçu
                </p>
                <div
                  className="prose-blog max-h-40 overflow-y-auto pr-2 text-xs"
                  dangerouslySetInnerHTML={{ __html: form.contentHtml || "<p>Aperçu…</p>" }}
                />
              </div>
            </div>

            {/* Tags + options */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Tags (séparés par des virgules)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="prix, villa, 2026"
                  className="mt-1.5 h-9 text-sm"
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex cursor-pointer items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-xs">Article à la une</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={form.status === "published"}
                    onChange={(e) => setForm({ ...form, status: e.target.checked ? "published" : "draft" })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-xs">Publier immédiatement</span>
                </label>
              </div>
            </div>

            {/* SEO */}
            <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
              <p className="text-xs font-semibold flex items-center gap-1.5 mb-3">
                <ArrowLeft className="h-3.5 w-3.5 rotate-180" /> SEO de l'article (optionnel)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px]">Titre SEO</Label>
                  <Input
                    value={form.seoTitle}
                    onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                    placeholder={form.title || "Titre SEO (défaut : titre)"}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Image OG (URL)</Label>
                  <Input
                    value={form.seoOgImage}
                    onChange={(e) => setForm({ ...form, seoOgImage: e.target.value })}
                    placeholder="https://…/og-image.jpg"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px]">Meta description</Label>
                  <Input
                    value={form.seoDescription}
                    onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                    placeholder="Description de l'article pour Google (défaut : résumé)"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px]">Mots-clés SEO</Label>
                  <Input
                    value={form.seoKeywords}
                    onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })}
                    placeholder="mot-clé1, mot-clé2"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/20 pt-4">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingId ? "Enregistrer les modifications" : "Créer l'article"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
