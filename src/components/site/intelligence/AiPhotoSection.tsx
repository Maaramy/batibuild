// ============================================================================
// AI SITE INTELLIGENCE — analyse des photos du chantier
// ----------------------------------------------------------------------------
// Import (galerie ou appareil photo), datation, affectation à une phase,
// observations, comparaison de deux prises de vue et analyse multimodale.
// Les images restent dans le stockage Convex : la base ne contient que des
// métadonnées. Une analyse ne modifie JAMAIS l'avancement validé.
// ============================================================================

import { useMemo, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import {
  AlertTriangle,
  Camera,
  Check,
  ImagePlus,
  Info,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatSiteDate } from "@/lib/siteTracking";
import {
  AI_DISCLAIMER,
  DEMO_DISCLAIMER,
  confidenceLabel,
  type AiAnalysisPayload,
} from "@/lib/siteIntelligence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { canWriteAi, type AiWorkspace } from "./types";

const MAX_FILE_MB = 8;
const MAX_FILES = 12;

interface AnalyzeResult {
  mode: "ai" | "demo" | "unavailable" | "error";
  available: boolean;
  analysisId: string | null;
  payload: AiAnalysisPayload | null;
  disclaimer: string;
  message: string;
}

const todayInput = () => new Date().toISOString().slice(0, 10);

export function AiPhotoSection({
  data,
  siteId,
}: {
  data: AiWorkspace;
  siteId: Id<"siteProjects">;
}) {
  const canWrite = canWriteAi(data);
  const generateUploadUrl = useMutation(api.siteIntelligence.generateMonitoringUploadUrl);
  const createSession = useMutation(api.siteIntelligence.createMonitoringSession);
  const deleteSession = useMutation(api.siteIntelligence.deleteMonitoringSession);
  const analyze = useAction(api.siteIntelligenceActions.analyzeSitePhotos);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayInput());
  const [phaseKey, setPhaseKey] = useState(data.tasks[0]?.phaseKey ?? "");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [analysisPhase, setAnalysisPhase] = useState(data.tasks[0]?.phaseKey ?? "");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState<"auto" | "demo" | null>(null);

  const [referenceId, setReferenceId] = useState("");
  const [currentId, setCurrentId] = useState("");

  const fileInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);

  const allImages = useMemo(
    () => data.sessions.flatMap((session) => session.images),
    [data.sessions],
  );
  const reference = allImages.find((image) => image._id === referenceId) ?? null;
  const current = allImages.find((image) => image._id === currentId) ?? null;
  const comparisonAnalysis = current
    ? data.analyses.find((analysis) => analysis.phaseKey === (current.phaseKey ?? analysisPhase))
    : null;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const accepted = incoming.filter((file) => {
      if (!file.type.startsWith("image/")) return false;
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name} dépasse ${MAX_FILE_MB} Mo.`);
        return false;
      }
      return true;
    });
    setFiles((previous) => [...previous, ...accepted].slice(0, MAX_FILES));
  };

  const submitSession = async () => {
    if (!canWrite) return;
    if (!title.trim()) {
      toast.error("Donnez un titre à l'inspection.");
      return;
    }
    if (files.length === 0) {
      toast.error("Ajoutez au moins une photo.");
      return;
    }
    setBusy(true);
    try {
      const capturedAt = new Date(`${date}T12:00:00`).getTime();
      const uploaded: {
        storageId: Id<"_storage">;
        fileName: string;
        contentType: string;
        sizeBytes: number;
        capturedAt: number;
      }[] = [];
      let index = 0;
      for (const file of files) {
        index++;
        setProgressText(`Envoi de la photo ${index}/${files.length}…`);
        const postUrl = await generateUploadUrl({ siteId });
        const response = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });
        if (!response.ok) throw new Error("Échec de l'envoi d'une photo.");
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        uploaded.push({
          storageId,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          capturedAt,
        });
      }
      setProgressText("Enregistrement de la session…");
      await createSession({
        siteId,
        title: title.trim(),
        date: capturedAt,
        phaseKey: phaseKey || undefined,
        notes: notes.trim() || undefined,
        images: uploaded,
      });
      toast.success("Inspection photo enregistrée.");
      setFiles([]);
      setTitle("");
      setNotes("");
      setProgressText("");
      if (fileInput.current) fileInput.current.value = "";
      if (cameraInput.current) cameraInput.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
      setProgressText("");
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : previous.length >= data.provider.maxImagesPerAnalysis
          ? previous
          : [...previous, id],
    );
  };

  const runAnalysis = async (mode: "auto" | "demo") => {
    if (selected.length === 0) {
      toast.error("Sélectionnez au moins une photo.");
      return;
    }
    if (!analysisPhase) {
      toast.error("Choisissez la phase concernée.");
      return;
    }
    setAnalyzing(mode);
    setResult(null);
    try {
      const response = await analyze({
        siteId,
        imageIds: selected as Id<"siteMonitoringImages">[],
        phaseKey: analysisPhase,
        mode,
      });
      setResult(response as AnalyzeResult);
      if (response.mode === "ai" || response.mode === "demo") {
        setSelected([]);
        toast.success(response.message);
      } else {
        toast.warning(response.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse impossible.");
    } finally {
      setAnalyzing(null);
    }
  };

  const provider = data.provider;

  return (
    <div className="space-y-3">
      {!provider.available && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">Analyse d'images non disponible sur cette installation.</p>
            <p className="mt-0.5 leading-relaxed">
              Aucune clé de fournisseur IA n'est configurée côté serveur : aucune analyse n'est
              simulée. Vous pouvez tout de même archiver les photos, les comparer, suivre
              l'avancement et générer les rapports. Un mode démonstration explicite permet de
              visualiser l'interface sans prétendre analyser les images.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Camera className="h-3.5 w-3.5" /> Nouvelle inspection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!canWrite ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">
                Vous consultez ce chantier sans droit d'ajout de photos. Demandez la permission
                « Intelligence IA » au responsable si vous devez alimenter le suivi.
              </p>
            ) : (
              <>
                <div>
                  <Label className="text-[11px]">Titre de la session</Label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Inspection fondations — semaine 12"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Date de prise de vue</Label>
                    <Input
                      type="date"
                      value={date}
                      max={todayInput()}
                      onChange={(event) => setDate(event.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Phase associée</Label>
                    <Select value={phaseKey} onValueChange={setPhaseKey}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Phase" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.tasks.map((task) => (
                          <SelectItem key={task._id} value={task.phaseKey} className="text-xs">
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-[11px]">Observations</Label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={2}
                    placeholder="Coulage des semelles achevé côté nord, coffrage en attente…"
                    className="text-xs"
                  />
                </div>

                <div className="rounded-lg border border-dashed border-border/70 p-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-[11px]"
                      onClick={() => fileInput.current?.click()}
                    >
                      <ImagePlus className="h-3 w-3" /> Importer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-[11px]"
                      onClick={() => cameraInput.current?.click()}
                    >
                      <Camera className="h-3 w-3" /> Prendre une photo
                    </Button>
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => addFiles(event.target.files)}
                  />
                  <input
                    ref={cameraInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => addFiles(event.target.files)}
                  />
                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {files.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1 text-[10px]"
                        >
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setFiles((previous) => previous.filter((_, position) => position !== index))
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {files.length}/{MAX_FILES} photo(s) · {MAX_FILE_MB} Mo max · conservation{" "}
                    {provider.retentionDays} jours.
                  </p>
                </div>

                <Button
                  size="sm"
                  className="h-8 w-full gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                  disabled={busy}
                  onClick={submitSession}
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  {busy ? progressText || "Envoi…" : "Enregistrer l'inspection"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5" /> Analyse multimodale
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {selected.length}/{provider.maxImagesPerAnalysis} photo(s)
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label className="text-[11px]">Phase à analyser</Label>
                <Select value={analysisPhase} onValueChange={setAnalysisPhase}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Phase" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.tasks.map((task) => (
                      <SelectItem key={task._id} value={task.phaseKey} className="text-xs">
                        {task.name} · {task.progress} % validé
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="h-8 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                  disabled={!canWrite || analyzing !== null || selected.length === 0}
                  onClick={() => runAnalysis("auto")}
                >
                  {analyzing === "auto" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Analyser
                </Button>
                {provider.demoAllowed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={!canWrite || analyzing !== null || selected.length === 0}
                    onClick={() => runAnalysis("demo")}
                  >
                    {analyzing === "demo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Démo"}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Sélectionnez les photos dans la galerie ci-dessous (maximum{" "}
              {provider.maxImagesPerAnalysis}). L'analyse propose un taux estimé, en attente de
              validation humaine.
            </p>

            {result && <AnalysisResultCard result={result} />}

            {!result && data.analyses.length > 0 && (
              <div className="rounded-lg border border-border/60 p-2">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Dernière analyse
                </p>
                <p className="text-[11px] font-medium">{data.analyses[0].phaseKey}</p>
                <p className="mt-0.5 line-clamp-3 text-[11px] text-muted-foreground">
                  {data.analyses[0].summary}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[9px]">
                    {data.analyses[0].mode === "demo" ? "Démonstration" : confidenceLabel(data.analyses[0].confidence)}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">
                    {formatSiteDate(data.analyses[0].createdAt)}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Galeries d'inspections</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Cliquez sur une photo pour l'inclure dans l'analyse. Chaque image est datée et rattachée
            à une phase.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed px-3 py-8 text-center text-[11px] text-muted-foreground">
              Aucune photo pour ce chantier. Une session hebdomadaire suffit à mesurer les écarts :
              même angle, même phase, date visible.
            </div>
          ) : (
            data.sessions.map((session) => (
              <div key={session._id} className="rounded-lg border border-border/60 p-2">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{session.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSiteDate(session.date)} · {session.imageCount} photo(s)
                      {session.phaseKey ? ` · ${session.phaseKey}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      try {
                        await deleteSession({ sessionId: session._id });
                        toast.success("Session supprimée.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Suppression refusée.");
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </Button>
                </div>
                {session.notes && (
                  <p className="mb-1.5 text-[10px] text-muted-foreground">{session.notes}</p>
                )}
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
                  {session.images.map((image) => {
                    const active = selected.includes(image._id);
                    return (
                      <button
                        key={image._id}
                        type="button"
                        onClick={() => toggleSelected(image._id)}
                        className={`group relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                          active ? "border-emerald-500 ring-2 ring-emerald-200" : "border-transparent"
                        }`}
                      >
                        <img
                          src={image.url ?? ""}
                          alt={image.fileName ?? "Photo de chantier"}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-left text-[8px] text-white">
                          {formatSiteDate(image.capturedAt)}
                        </span>
                        {active && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Comparer deux prises de vue</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Même angle, dates différentes : les changements visibles sont repris dans l'analyse.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-[11px]">Photo de référence</Label>
              <Select value={referenceId} onValueChange={setReferenceId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choisir une photo" />
                </SelectTrigger>
                <SelectContent>
                  {allImages.map((image) => (
                    <SelectItem key={image._id} value={image._id} className="text-xs">
                      {formatSiteDate(image.capturedAt)} · {image.phaseKey ?? "phase non précisée"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Photo actuelle</Label>
              <Select value={currentId} onValueChange={setCurrentId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choisir une photo" />
                </SelectTrigger>
                <SelectContent>
                  {allImages.map((image) => (
                    <SelectItem key={image._id} value={image._id} className="text-xs">
                      {formatSiteDate(image.capturedAt)} · {image.phaseKey ?? "phase non précisée"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {reference && current ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[reference, current].map((image, index) => (
                <figure key={image._id} className="overflow-hidden rounded-lg border border-border/60">
                  <img src={image.url ?? ""} alt="" className="h-40 w-full object-cover" />
                  <figcaption className="flex items-center justify-between bg-muted/40 px-2 py-1 text-[10px]">
                    <span>{index === 0 ? "Référence" : "Actuelle"}</span>
                    <span>{formatSiteDate(image.capturedAt)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-5 text-center text-[11px] text-muted-foreground">
              Choisissez deux photos pour les afficher côte à côte.
            </p>
          )}
          {comparisonAnalysis && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-[11px]">
              <p className="font-medium">Changements constatés (dernière analyse de la phase)</p>
              {comparisonAnalysis.mode === "demo" ? (
                <p className="mt-0.5 text-muted-foreground">{DEMO_DISCLAIMER}</p>
              ) : comparisonAnalysis.changes.length > 0 ? (
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-muted-foreground">
                  {comparisonAnalysis.changes.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-muted-foreground">
                  Aucune évolution décrite par la dernière analyse.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisResultCard({ result }: { result: AnalyzeResult }) {
  if (!result.payload) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{result.message}</span>
      </div>
    );
  }

  const payload = result.payload;
  const demo = result.mode === "demo";

  return (
    <div className="space-y-2 rounded-lg border border-emerald-200/70 bg-emerald-50/40 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="border-emerald-500/40 text-[9px] text-emerald-700">
          {demo ? "Démonstration" : "Analyse IA"}
        </Badge>
        <Badge variant="outline" className="text-[9px]">
          Phase : {payload.phaseKey}
        </Badge>
        <Badge variant="outline" className="text-[9px]">
          {demo ? "Confiance : non applicable" : confidenceLabel(payload.confidence)}
        </Badge>
        <Badge variant="outline" className="text-[9px]">
          Estimation {payload.progressEstimate} %
        </Badge>
      </div>

      {demo && (
        <p className="flex items-start gap-1.5 rounded bg-amber-100/70 px-2 py-1 text-[10px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {DEMO_DISCLAIMER}
        </p>
      )}

      <p className="text-[11px] leading-relaxed">{payload.summary}</p>

      <div className="grid gap-1.5 sm:grid-cols-2">
        <Block title="Éléments visibles" items={payload.elements} />
        <Block title="Travaux apparemment réalisés" items={payload.worksObserved} />
        <Block title="Travaux restant à réaliser" items={payload.worksRemaining} />
        <Block title="Évolution constatée" items={payload.changes} />
      </div>

      {payload.anomalies.length > 0 && (
        <div className="rounded bg-rose-50 px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
            Points à vérifier
          </p>
          <ul className="mt-0.5 space-y-0.5 text-[10px] text-rose-900">
            {payload.anomalies.map((anomaly, index) => (
              <li key={index}>
                • {anomaly.label} ({anomaly.severity}){anomaly.evidence ? ` — ${anomaly.evidence}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[9.5px] leading-relaxed text-muted-foreground">{result.message}</p>
      {!demo && <p className="text-[9px] leading-relaxed text-muted-foreground">{AI_DISCLAIMER}</p>}
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded bg-white/70 px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Non renseigné par l'analyse.</p>
      ) : (
        <ul className="mt-0.5 list-disc space-y-0.5 pl-3 text-[10px]">
          {items.slice(0, 6).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
