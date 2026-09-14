import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CONSULTATION_SPECIALTIES,
  FORUM_AUDIENCES,
  FORUM_MAX_FILES,
  FORUM_MATERIAL_CATEGORIES,
  FORUM_REQUEST_TYPES,
  INTERVENTION_SPECIALTIES,
  formatFileSize,
  isImageAttachment,
  type ForumAudience,
  type ForumRequestType,
} from "@/lib/forumMeta";
import {
  ForumUploadError,
  uploadForumFiles,
  validateForumFiles,
} from "@/lib/forumUpload";
import { cn } from "@/lib/utils";
import { REGION_LABELS } from "@/convex/investmentTypes";
import { useMutation } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Globe,
  ImageUp,
  Loader2,
  Package,
  Store,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// ============================================================================
// Forum d'Assistance — nouvelle demande (« /forum/new »)
// ============================================================================

const TYPE_ICONS: Record<ForumRequestType, any> = {
  intervention: Wrench,
  consultation: Briefcase,
  material_price: Package,
};

const AUDIENCE_ICONS: Record<ForumAudience, any> = {
  public: Globe,
  experts: Users,
  suppliers: Store,
};

export default function NewForumPost() {
  useDirection();
  usePageSEO({
    title: "Nouvelle demande - Forum d'Assistance - batibuild App",
    description:
      "Publiez une demande d'intervention, une consultation d'expert ou une demande de prix de matériaux sur le forum BatiBuild.",
  });
  const { t } = useTranslation("forum");
  const navigate = useNavigate();

  const createPost = useMutation(api.forum.createPost);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [requestType, setRequestType] = useState<ForumRequestType | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [zone, setZone] = useState("");
  const [budget, setBudget] = useState("");
  const [audience, setAudience] = useState<ForumAudience>("public");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const specialtyOptions =
    requestType === "consultation" ? CONSULTATION_SPECIALTIES : INTERVENTION_SPECIALTIES;

  // Aperçus d'images : URL locales révoquées dès qu'on change de sélection.
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: isImageAttachment(file.type) ? URL.createObjectURL(file) : null,
      })),
    [files],
  );
  useEffect(
    () => () => {
      previews.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    },
    [previews],
  );

  const uploadErrorMessage = (err: unknown): string => {
    if (err instanceof ForumUploadError) {
      if (err.code === "type") return t("form.errorType");
      if (err.code === "size") return t("form.errorSize");
      if (err.code === "count") return t("form.errorCount");
      return t("form.errorUpload");
    }
    return (err as any)?.message || t("toast.error");
  };

  const handlePickFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    try {
      validateForumFiles(picked, files.length);
      setFiles((prev) => [...prev, ...picked].slice(0, FORUM_MAX_FILES));
    } catch (err) {
      toast.error(uploadErrorMessage(err));
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!requestType) next.requestType = t("form.required");
    if (title.trim().length < 3) next.title = t("form.required");
    if (description.trim().length < 5) next.description = t("form.required");
    if (requestType === "consultation" || requestType === "intervention") {
      if (!specialty) next.specialty = t("form.required");
    }
    if (requestType === "material_price" && !materialCategory) {
      next.materialCategory = t("form.required");
    }
    // Ciblage de l'audience : le backend l'exige, on le valide ici pour un
    // message immédiat (la règle reste appliquée côté serveur).
    if (audience === "experts" && !specialty) next.specialty = t("form.required");
    if (audience === "suppliers" && !materialCategory) {
      next.materialCategory = t("form.required");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !requestType) return;
    setSubmitting(true);
    try {
      const attachments =
        files.length > 0
          ? await uploadForumFiles(files, () => generateUploadUrl())
          : undefined;

      const budgetValue = budget.trim() ? Number(budget.replace(",", ".")) : undefined;
      const postId = await createPost({
        title: title.trim(),
        description: description.trim(),
        requestType,
        specialty: specialty || undefined,
        materialCategory: materialCategory || undefined,
        materialName: materialName.trim() || undefined,
        audience,
        location:
          region || city.trim() || zone.trim()
            ? {
                region: region || undefined,
                city: city.trim() || undefined,
                zone: zone.trim() || undefined,
              }
            : undefined,
        budget:
          budgetValue !== undefined && Number.isFinite(budgetValue) && budgetValue >= 0
            ? budgetValue
            : undefined,
        attachments: attachments as any,
      });
      toast.success(t("toast.created"));
      navigate(`/forum/${postId}`);
    } catch (err) {
      toast.error(uploadErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const labelClass = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
  const selectClass =
    "h-10 w-full rounded-lg border border-border/50 bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
        {/* ── En-tête ── */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate("/forum")}
            aria-label={t("form.cancel")}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/60 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold sm:text-xl">{t("form.title")}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("form.subtitle")}</p>
          </div>
        </div>

        {/* ── Étape 1 : type ── */}
        <Card className="rounded-2xl border-border/40 bg-card/60">
          <CardContent className="space-y-2.5 p-3.5">
            <p className="text-xs font-semibold">{t("form.stepType")}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {FORUM_REQUEST_TYPES.map((type) => {
                const Icon = TYPE_ICONS[type];
                const active = requestType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setRequestType(type);
                      setErrors((e) => ({ ...e, requestType: "" }));
                      if (type === "material_price") setSpecialty("");
                      else setMaterialCategory("");
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition-all active:scale-[0.98]",
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/50 bg-muted/15 hover:border-primary/25 hover:bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        active ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold">{t(`types.${type}`)}</span>
                    <span className="text-[10px] leading-snug text-muted-foreground">
                      {t(`typeHints.${type}`)}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.requestType ? (
              <p className="text-[10px] font-medium text-destructive">{errors.requestType}</p>
            ) : null}
          </CardContent>
        </Card>

        {/* ── Étape 2 : détails ── */}
        <Card className="rounded-2xl border-border/40 bg-card/60">
          <CardContent className="space-y-3 p-3.5">
            <p className="text-xs font-semibold">{t("form.stepDetails")}</p>

            {requestType === "consultation" || requestType === "intervention" ? (
              <label className="block space-y-1">
                <span className={labelClass}>{t("form.specialtyLabel")}</span>
                <select
                  className={selectClass}
                  value={specialty}
                  onChange={(e) => {
                    setSpecialty(e.target.value);
                    setErrors((prev) => ({ ...prev, specialty: "" }));
                  }}
                >
                  <option value="">{t("form.specialtyPlaceholder")}</option>
                  {specialtyOptions.map((s) => (
                    <option key={s} value={s}>
                      {t(`specialties.${s}`, { defaultValue: s })}
                    </option>
                  ))}
                </select>
                {errors.specialty ? (
                  <span className="text-[10px] font-medium text-destructive">
                    {errors.specialty}
                  </span>
                ) : null}
              </label>
            ) : null}

            {requestType === "material_price" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>{t("form.materialCategory")}</span>
                  <select
                    className={selectClass}
                    value={materialCategory}
                    onChange={(e) => {
                      setMaterialCategory(e.target.value);
                      setErrors((prev) => ({ ...prev, materialCategory: "" }));
                    }}
                  >
                    <option value="">{t("form.materialPlaceholder")}</option>
                    {FORUM_MATERIAL_CATEGORIES.map((m) => (
                      <option key={m} value={m}>
                        {t(`materials.${m}`, { defaultValue: m })}
                      </option>
                    ))}
                  </select>
                  {errors.materialCategory ? (
                    <span className="text-[10px] font-medium text-destructive">
                      {errors.materialCategory}
                    </span>
                  ) : null}
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>{t("form.materialName")}</span>
                  <Input
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    placeholder={t("form.materialNamePlaceholder")}
                    className="h-10 text-sm"
                  />
                </label>
              </div>
            ) : null}

            <label className="block space-y-1">
              <span className={labelClass}>
                {t("form.titleLabel")} <span className="text-destructive">*</span>
              </span>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder={t("form.titlePlaceholder")}
                maxLength={140}
                className="h-10 text-sm"
              />
              {errors.title ? (
                <span className="text-[10px] font-medium text-destructive">{errors.title}</span>
              ) : null}
            </label>

            <label className="block space-y-1">
              <span className={labelClass}>
                {t("form.descriptionLabel")} <span className="text-destructive">*</span>
              </span>
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder={t("form.descriptionPlaceholder")}
                className="min-h-28 text-sm"
              />
              {errors.description ? (
                <span className="text-[10px] font-medium text-destructive">
                  {errors.description}
                </span>
              ) : null}
            </label>

            {/* Localisation (jamais obligatoire) */}
            <div className="space-y-1">
              <span className={labelClass}>{t("form.locationLabel")}</span>
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  className={selectClass}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="">{t("form.regionPlaceholder")}</option>
                  {Object.entries(REGION_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("form.cityPlaceholder")}
                  className="h-10 text-sm"
                />
                <Input
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder={t("form.zonePlaceholder")}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <label className="block space-y-1">
              <span className={labelClass}>{t("form.budgetLabel")}</span>
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder={t("form.budgetPlaceholder")}
                inputMode="decimal"
                className="h-10 text-sm sm:max-w-48"
              />
            </label>
          </CardContent>
        </Card>

        {/* ── Étape 3 : audience ── */}
        <Card className="rounded-2xl border-border/40 bg-card/60">
          <CardContent className="space-y-2.5 p-3.5">
            <p className="text-xs font-semibold">{t("form.stepAudience")}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {FORUM_AUDIENCES.map((a) => {
                const Icon = AUDIENCE_ICONS[a];
                const active = audience === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAudience(a)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition-all active:scale-[0.98]",
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/50 bg-muted/15 hover:border-primary/25 hover:bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        active ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold">{t(`audiences.${a}`)}</span>
                    <span className="text-[10px] leading-snug text-muted-foreground">
                      {t(`audienceHints.${a}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ciblage des experts (si la spécialité n'est pas déjà définie) */}
            {audience === "experts" && !specialty ? (
              <label className="block space-y-1">
                <span className={labelClass}>{t("form.specialtyLabel")}</span>
                <select
                  className={selectClass}
                  value={specialty}
                  onChange={(e) => {
                    setSpecialty(e.target.value);
                    setErrors((prev) => ({ ...prev, specialty: "" }));
                  }}
                >
                  <option value="">{t("form.specialtyPlaceholder")}</option>
                  {[...INTERVENTION_SPECIALTIES, ...CONSULTATION_SPECIALTIES].map((s) => (
                    <option key={s} value={s}>
                      {t(`specialties.${s}`, { defaultValue: s })}
                    </option>
                  ))}
                </select>
                {errors.specialty ? (
                  <span className="text-[10px] font-medium text-destructive">
                    {errors.specialty}
                  </span>
                ) : null}
              </label>
            ) : null}

            {/* Ciblage des fournisseurs (si la catégorie n'est pas déjà définie) */}
            {audience === "suppliers" && !materialCategory ? (
              <label className="block space-y-1">
                <span className={labelClass}>{t("form.materialCategory")}</span>
                <select
                  className={selectClass}
                  value={materialCategory}
                  onChange={(e) => {
                    setMaterialCategory(e.target.value);
                    setErrors((prev) => ({ ...prev, materialCategory: "" }));
                  }}
                >
                  <option value="">{t("form.materialPlaceholder")}</option>
                  {FORUM_MATERIAL_CATEGORIES.map((m) => (
                    <option key={m} value={m}>
                      {t(`materials.${m}`, { defaultValue: m })}
                    </option>
                  ))}
                </select>
                {errors.materialCategory ? (
                  <span className="text-[10px] font-medium text-destructive">
                    {errors.materialCategory}
                  </span>
                ) : null}
              </label>
            ) : null}
          </CardContent>
        </Card>

        {/* ── Étape 4 : pièces jointes ── */}
        <Card className="rounded-2xl border-border/40 bg-card/60">
          <CardContent className="space-y-2.5 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">{t("form.stepAttachments")}</p>
              <span className="text-[10px] text-muted-foreground">
                {files.length}/{FORUM_MAX_FILES}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{t("form.attachmentsHint")}</p>

            {previews.length > 0 ? (
              <ul className="space-y-1.5">
                {previews.map(({ file, url }, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/15 p-2"
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={file.name}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium">{file.name}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={t("form.remove")}
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => {
                handlePickFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 w-full gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= FORUM_MAX_FILES}
            >
              <ImageUp className="h-4 w-4" />
              {t("form.addFiles")}
            </Button>
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        {Object.values(errors).some(Boolean) ? (
          <p className="flex items-center gap-1.5 text-[11px] text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t("form.required")}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pb-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => navigate("/forum")}
            disabled={submitting}
          >
            {t("form.cancel")}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {submitting ? t("form.publishing") : t("form.submit")}
          </Button>
        </div>
      </div>
    </main>
  );
}
