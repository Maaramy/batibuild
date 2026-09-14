import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge, TypeBadge, authorDisplayName } from "@/components/forum/bits";
import {
  FORUM_STATUSES,
  formatForumDateTime,
  type ForumStatusKey,
} from "@/lib/forumMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  Eye,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// ============================================================================
// Forum d'Assistance — modération (onglet Admin)
// ============================================================================

type AdminTab = "posts" | "reports";

export function ForumAdmin() {
  const { t, i18n } = useTranslation("forum");
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("posts");

  // ── Publications ──
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ForumStatusKey | "all">("all");

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const postsResult = useQuery(api.forum.adminListPosts, {
    limit: 20,
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });
  const reports = useQuery(api.forum.adminListReports, {});

  const deletePost = useMutation(api.forum.deletePost);
  const deleteReply = useMutation(api.forum.deleteReply);
  const updateStatus = useMutation(api.forum.updatePostStatus);
  const resolveReport = useMutation(api.forum.adminResolveReport);

  const [busy, setBusy] = useState<string | null>(null);

  const pendingReports = (reports ?? []).filter((r) => r.status === "pending").length;

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm(t("admin.deletePost") + " ?")) return;
    setBusy(postId);
    try {
      await deletePost({ postId: postId as Id<"forumPosts"> });
      toast.success(t("toast.deleted"));
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm(t("admin.deleteReply") + " ?")) return;
    setBusy(replyId);
    try {
      await deleteReply({ replyId: replyId as Id<"forumReplies"> });
      toast.success(t("toast.replyDeleted"));
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    } finally {
      setBusy(null);
    }
  };

  const handleStatus = async (postId: string, next: ForumStatusKey) => {
    setBusy(postId);
    try {
      await updateStatus({ postId: postId as Id<"forumPosts">, status: next });
      toast.success(t("toast.statusUpdated"));
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    } finally {
      setBusy(null);
    }
  };

  const handleResolve = async (reportId: string, next: "reviewed" | "dismissed") => {
    setBusy(reportId);
    try {
      await resolveReport({ reportId: reportId as Id<"forumReports">, status: next });
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête + onglets */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">{t("admin.title")}</h2>
            <p className="text-xs text-muted-foreground">{t("admin.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(["posts", "reports"] as AdminTab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                tab === value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {t(`admin.${value}`)}
              {value === "reports" && pendingReports > 0 ? (
                <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                  {pendingReports}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {tab === "posts" ? (
        <>
          {/* Recherche + filtre statut */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("admin.searchPlaceholder")}
                className="h-9 ps-8 text-xs"
              />
            </div>
            <select
              className="h-9 rounded-lg border border-border/50 bg-background px-2.5 text-xs outline-none transition-colors focus:border-primary/40"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="all">{t("filters.allStatuses")}</option>
              {FORUM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.short.${s}`)}
                </option>
              ))}
            </select>
          </div>

          {postsResult === undefined ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : postsResult.posts.length === 0 ? (
            <EmptyRow icon={<MessageSquare className="h-5 w-5" />} text={t("admin.empty")} />
          ) : (
            <div className="space-y-2">
              {postsResult.posts.map((post: any) => (
                <Card key={post._id} className="rounded-xl border-border/40 bg-card/50">
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <TypeBadge type={post.requestType} />
                          <StatusBadge status={post.status} />
                          <span className="text-[10px] text-muted-foreground">
                            {formatForumDateTime(post.createdAt, i18n.language)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold">{post.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {authorDisplayName(post.author)} ·{" "}
                          {t("card.replies", { count: post.replyCount })}
                          {post.attachmentCount > 0
                            ? ` · ${t("card.attachments", { count: post.attachmentCount })}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {busy === post._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : null}
                        <button
                          type="button"
                          title={t("admin.view")}
                          onClick={() => navigate(`/forum/${post._id}`)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={t("admin.deletePost")}
                          onClick={() => handleDeletePost(post._id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Statut rapide (staff) */}
                    <div className="flex flex-wrap gap-1.5">
                      {FORUM_STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={post.status === s || busy === post._id}
                          onClick={() => handleStatus(post._id, s)}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all",
                            post.status === s
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border/50 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {t(`statuses.short.${s}`)}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {reports === undefined ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <EmptyRow icon={<RefreshCcw className="h-5 w-5" />} text={t("admin.noReports")} />
          ) : (
            <div className="space-y-2">
              {reports.map((report: any) => (
                <Card key={report._id} className="rounded-xl border-border/40 bg-card/50">
                  <CardContent className="space-y-2 p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          report.status === "pending"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-border/50 bg-muted/40 text-muted-foreground",
                        )}
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {report.replyId ? t("admin.reportedReply") : t("admin.reportedPost")}
                      </span>
                      <span className="text-[10px] font-medium">
                        {t(`admin.status.${report.status}`)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatForumDateTime(report.createdAt, i18n.language)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold">
                      {report.postTitle ?? report.replySnippet ?? "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium">{t("admin.reason")} :</span>{" "}
                      {report.reason}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("admin.reporter")} · {report.reporterName}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {report.postId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-[11px]"
                          onClick={() => navigate(`/forum/${report.postId}`)}
                        >
                          <Eye className="h-3 w-3" />
                          {t("admin.view")}
                        </Button>
                      ) : null}
                      {report.status === "pending" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[11px] text-emerald-700 dark:text-emerald-400"
                            disabled={busy === report._id}
                            onClick={() => handleResolve(report._id, "reviewed")}
                          >
                            <Check className="h-3 w-3" />
                            {t("admin.resolve")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-[11px] text-muted-foreground"
                            disabled={busy === report._id}
                            onClick={() => handleResolve(report._id, "dismissed")}
                          >
                            <X className="h-3 w-3" />
                            {t("admin.dismiss")}
                          </Button>
                        </>
                      ) : null}
                      {report.replyId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-[11px] text-destructive"
                          disabled={busy === report._id}
                          onClick={() => handleDeleteReply(report.replyId)}
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("admin.deleteReply")}
                        </Button>
                      ) : null}
                      {report.postId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-[11px] text-destructive"
                          disabled={busy === report._id}
                          onClick={() => handleDeletePost(report.postId)}
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("admin.deletePost")}
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
        {icon}
      </span>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

export default ForumAdmin;
