import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ForumErrorBoundary } from "@/components/forum/ForumErrorBoundary";
import {
  AuthorRoleBadge,
  ForumBadge,
  StatusBadge,
  TypeBadge,
  AudienceBadge,
  authorDisplayName,
} from "@/components/forum/bits";
import {
  FORUM_STATUSES,
  FORUM_STATUS_STYLE,
  FORUM_MAX_FILES,
  formatFileSize,
  formatForumDateTime,
  isImageAttachment,
  initialsOf,
} from "@/lib/forumMeta";
import {
  ForumUploadError,
  uploadForumFiles,
  validateForumFiles,
  type ForumAttachmentInput,
} from "@/lib/forumUpload";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  ImageUp,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

// ============================================================================
// Forum d'Assistance — détail d'une demande (« /forum/:postId »)
// ============================================================================

interface AttachmentView {
  name: string;
  type: string;
  size?: number;
  url?: string;
}

/** Icône d'un document selon son type. */
function DocumentIcon({ type }: { type: string }) {
  if (type.includes("sheet") || type.includes("excel") || type === "application/vnd.ms-excel") {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  }
  return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
}

/** Galerie : aperçu des images + liste des documents. */
function AttachmentGallery({ attachments }: { attachments: AttachmentView[] }) {
  const { t } = useTranslation("forum");
  const images = attachments.filter((a) => isImageAttachment(a.type));
  const docs = attachments.filter((a) => !isImageAttachment(a.type));

  return (
    <div className="space-y-3">
      {images.length > 0 ? (
        <div className={cn("grid gap-2", images.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:max-w-xs")}>
          {images.map((a, i) => (
            <a
              key={`img-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl border border-border/40 bg-muted/20"
            >
              {a.url ? (
                <img
                  src={a.url}
                  alt={a.name}
                  loading="lazy"
                  className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] sm:h-36"
                />
              ) : (
                <div className="flex h-32 items-center justify-center sm:h-36">
                  <ImageUp className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[10px] font-medium text-white">
                {a.name}
              </span>
            </a>
          ))}
        </div>
      ) : null}

      {docs.length > 0 ? (
        <div className="space-y-1.5">
          {docs.map((a, i) => (
            <a
              key={`doc-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/15 px-3 py-2 transition-colors hover:border-primary/25 hover:bg-muted/30"
            >
              <DocumentIcon type={a.type} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{a.name}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {formatFileSize(a.size)}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-primary">
                <Download className="h-3 w-3" />
                {t("detail.download")}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ForumPostDetail() {
  useDirection();
  const { postId } = useParams<{ postId: string }>();
  const { t, i18n } = useTranslation("forum");
  usePageSEO({
    title: "Forum d'Assistance - batibuild App",
    description: "Détail d'une demande du forum d'assistance BatiBuild.",
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  const detail = useQuery(
    api.forum.getPostDetail,
    postId ? { postId: postId as Id<"forumPosts"> } : "skip",
  );

  const updateStatus = useMutation(api.forum.updatePostStatus);
  const createReply = useMutation(api.forum.createReply);
  const deletePost = useMutation(api.forum.deletePost);
  const deleteReply = useMutation(api.forum.deleteReply);
  const reportPostMutation = useMutation(api.forum.reportPost);
  const reportReplyMutation = useMutation(api.forum.reportReply);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [replyText, setReplyText] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [reportTarget, setReportTarget] = useState<
    { kind: "post" | "reply"; id: string; label: string } | null
  >(null);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const post = detail?.post ?? null;
  const isAuthor = !!post && !!user && post.authorId === user._id;
  const canManage = isAuthor || isStaff;

  // Cible « audience » lisible (spécialité ou catégorie de matériau).
  const targetLabel = useMemo(() => {
    if (!post) return null;
    if (post.audience === "suppliers") {
      return post.materialCategory
        ? t(`materials.${post.materialCategory}`, { defaultValue: post.materialCategory })
        : null;
    }
    return post.specialty
      ? t(`specialties.${post.specialty}`, { defaultValue: post.specialty })
      : null;
  }, [post, t]);

  const uploadErrorMessage = (err: unknown): string => {
    if (err instanceof ForumUploadError) {
      if (err.code === "type") return t("form.errorType");
      if (err.code === "size") return t("form.errorSize");
      if (err.code === "count") return t("form.errorCount");
      return t("form.errorUpload");
    }
    return (err as any)?.message || t("toast.error");
  };

  const handlePickReplyFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    try {
      validateForumFiles(picked, replyFiles.length);
      setReplyFiles((prev) => [...prev, ...picked].slice(0, FORUM_MAX_FILES));
    } catch (err) {
      toast.error(uploadErrorMessage(err));
    }
  };

  const handleSendReply = async () => {
    if (!post) return;
    if (!replyText.trim() && replyFiles.length === 0) return;
    setSending(true);
    try {
      let attachments: ForumAttachmentInput[] | undefined;
      if (replyFiles.length > 0) {
        attachments = await uploadForumFiles(replyFiles, () => generateUploadUrl());
      }
      await createReply({
        postId: post._id,
        content: replyText,
        attachments: attachments as any,
      });
      setReplyText("");
      setReplyFiles([]);
      toast.success(t("toast.replied"));
    } catch (err) {
      toast.error(uploadErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!post) return;
    setStatusSaving(true);
    try {
      await updateStatus({ postId: post._id, status: status as any });
      toast.success(t("toast.statusUpdated"));
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!window.confirm(t("detail.deleteConfirm"))) return;
    try {
      await deletePost({ postId: post._id });
      toast.success(t("toast.deleted"));
      navigate("/forum");
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      await deleteReply({ replyId: replyId as Id<"forumReplies"> });
      toast.success(t("toast.replyDeleted"));
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    }
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    if (reportReason.trim().length < 5) {
      toast.error(t("report.reasonPlaceholder"));
      return;
    }
    setReporting(true);
    try {
      if (reportTarget.kind === "post") {
        await reportPostMutation({
          postId: reportTarget.id as Id<"forumPosts">,
          reason: reportReason.trim(),
        });
      } else {
        await reportReplyMutation({
          replyId: reportTarget.id as Id<"forumReplies">,
          reason: reportReason.trim(),
        });
      }
      toast.success(t("toast.reported"));
      setReportTarget(null);
      setReportReason("");
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    } finally {
      setReporting(false);
    }
  };

  // ── Chargement ──
  if (detail === undefined) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl space-y-3 px-3 py-6 sm:px-5">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <Card className="rounded-2xl border-border/40">
            <CardContent className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ── Introuvable / non autorisé (appliqué côté serveur) ──
  if (detail === null || !post) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">{t("detail.notFound")}</p>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate("/forum")}>
            {t("detail.notFoundBack")}
          </Button>
        </div>
      </main>
    );
  }

  const replies = detail.replies ?? [];
  const resolved = post.status === "resolved";
  const authorName = authorDisplayName(post.author);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
        {/* ── En-tête ── */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate("/forum")}
            aria-label={t("detail.back")}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/60 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <TypeBadge type={post.requestType} />
              <AudienceBadge audience={post.audience} target={targetLabel} />
              <StatusBadge status={post.status} />
            </div>
            <h1 className="mt-1.5 text-base font-bold leading-snug sm:text-lg">
              {post.title}
            </h1>
          </div>
        </div>

        <ForumErrorBoundary
          title={t("states.errorTitle")}
          description={t("states.errorText")}
          retryLabel={t("states.retry")}
        >
          {/* ── Publication ── */}
          <Card className="rounded-2xl border-border/40 bg-card/60">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2.5">
                <Avatar className="h-9 w-9 shrink-0 border border-border/40">
                  <AvatarImage src={post.author?.image ?? undefined} alt={authorName} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                    {initialsOf(authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs font-semibold">{authorName}</span>
                    <AuthorRoleBadge author={post.author} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formatForumDateTime(post.createdAt, i18n.language)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {canManage ? (
                    <button
                      type="button"
                      aria-label={t("detail.delete")}
                      title={t("detail.delete")}
                      onClick={handleDeletePost}
                      className="rounded-lg p-1.5 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {!isAuthor ? (
                    <button
                      type="button"
                      aria-label={t("detail.report")}
                      title={t("detail.report")}
                      onClick={() =>
                        setReportTarget({ kind: "post", id: post._id, label: post.title })
                      }
                      className="rounded-lg p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {post.description}
              </p>

              {/* Méta : localisation / budget / spécialité */}
              <div className="flex flex-wrap items-center gap-1.5">
                {post.location?.region ? (
                  <ForumBadge className="border-border/50 bg-muted/30 text-muted-foreground">
                    {[post.location.region, post.location.city, post.location.zone]
                      .filter(Boolean)
                      .join(" · ")}
                  </ForumBadge>
                ) : null}
                {typeof post.budget === "number" ? (
                  <ForumBadge className="border-primary/25 bg-primary/10 text-primary">
                    {t("detail.budget")} · {post.budget.toLocaleString("fr-TN")} TND
                  </ForumBadge>
                ) : null}
                {post.materialName ? (
                  <ForumBadge className="border-border/50 bg-muted/30 text-muted-foreground">
                    {post.materialName}
                  </ForumBadge>
                ) : null}
              </div>

              {/* Pièces jointes */}
              {detail.attachments.length > 0 ? (
                <div className="space-y-2 border-t border-border/20 pt-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    {t("detail.attachments")}
                  </p>
                  <AttachmentGallery attachments={detail.attachments} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* ── Statut (auteur ou staff) ── */}
          {canManage ? (
            <Card className="mt-3 rounded-2xl border-border/40 bg-card/40">
              <CardContent className="space-y-2 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">{t("detail.statusLabel")}</p>
                    <p className="text-[10px] text-muted-foreground">{t("detail.statusHint")}</p>
                  </div>
                  {statusSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FORUM_STATUSES.map((s) => {
                    const active = post.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={statusSaving || active}
                        onClick={() => changeStatus(s)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-100",
                          active
                            ? FORUM_STATUS_STYLE[s].badge
                            : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t(`statuses.short.${s}`)}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* ── Réponses ── */}
          <div className="mt-4 space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              {t("detail.replies")}
              <span className="text-xs font-normal text-muted-foreground">
                ({replies.length})
              </span>
            </h2>

            {replies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-6 text-center text-xs text-muted-foreground">
                {t("detail.noReplies")}
              </p>
            ) : (
              replies.map((reply) => {
                const replyAuthorName = authorDisplayName(reply.author);
                const canDelete =
                  canManage || (!!user && reply.authorId === user._id);
                const isMine = !!user && reply.authorId === user._id;
                return (
                  <Card key={reply._id} className="rounded-2xl border-border/40 bg-card/50">
                    <CardContent className="space-y-2 p-3.5">
                      <div className="flex items-start gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                          <AvatarImage
                            src={reply.author?.image ?? undefined}
                            alt={replyAuthorName}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-muted text-[10px] font-semibold">
                            {initialsOf(replyAuthorName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-xs font-semibold">
                              {replyAuthorName}
                            </span>
                            <AuthorRoleBadge author={reply.author} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {formatForumDateTime(reply.createdAt, i18n.language)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {canDelete ? (
                            <button
                              type="button"
                              aria-label={t("detail.deleteReply")}
                              title={t("detail.deleteReply")}
                              onClick={() => handleDeleteReply(reply._id)}
                              className="rounded-lg p-1.5 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {!isMine ? (
                            <button
                              type="button"
                              aria-label={t("detail.report")}
                              title={t("detail.report")}
                              onClick={() =>
                                setReportTarget({
                                  kind: "reply",
                                  id: reply._id,
                                  label: reply.content.slice(0, 60),
                                })
                              }
                              className="rounded-lg p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                        {reply.content}
                      </p>

                      {reply.attachments && reply.attachments.length > 0 ? (
                        <AttachmentGallery attachments={reply.attachments as AttachmentView[]} />
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* ── Répondre ── */}
          <Card className="mt-3 rounded-2xl border-border/40 bg-card/60">
            <CardContent className="space-y-2.5 p-3.5">
              <p className="text-xs font-semibold">{t("detail.replyLabel")}</p>

              {resolved ? (
                <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                  {t("detail.resolvedNotice")}
                </p>
              ) : (
                <>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("detail.replyPlaceholder")}
                    className="min-h-24 text-xs"
                  />

                  {replyFiles.length > 0 ? (
                    <ul className="space-y-1.5">
                      {replyFiles.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/15 px-2.5 py-1.5"
                        >
                          <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-[11px]">{f.name}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatFileSize(f.size)}
                          </span>
                          <button
                            type="button"
                            aria-label={t("form.remove")}
                            onClick={() =>
                              setReplyFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        handlePickReplyFiles(e.target.files);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={replyFiles.length >= FORUM_MAX_FILES}
                    >
                      <ImageUp className="h-3.5 w-3.5" />
                      {t("form.addFiles")}
                    </Button>
                    <Button
                      size="sm"
                      className="ms-auto gap-1.5 text-xs"
                      onClick={handleSendReply}
                      disabled={sending || (!replyText.trim() && replyFiles.length === 0)}
                    >
                      {sending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 rtl:rotate-180" />
                      )}
                      {sending ? t("detail.sending") : t("detail.send")}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </ForumErrorBoundary>
      </div>

      {/* ── Signalement ── */}
      <Dialog open={reportTarget !== null} onOpenChange={(open) => !open && setReportTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{t("report.title")}</DialogTitle>
            <DialogDescription className="line-clamp-2 text-xs">
              {reportTarget?.label}
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1.5">
            <span className="text-xs font-medium">{t("report.reason")}</span>
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={t("report.reasonPlaceholder")}
              className="min-h-24 text-xs"
            />
          </label>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setReportTarget(null)}
            >
              {t("report.cancel")}
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={submitReport} disabled={reporting}>
              {reporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t("report.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
