import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Star, Loader2, CheckCheck, Send, Heart } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ============================================================================
// « Notez BatiBuild » — module de satisfaction placé en bas des résultats
// ============================================================================
//
// Confidentialité : la note et le commentaire ne sont visibles QUE par les
// administrateurs (contrôlé côté serveur). Ce composant ne fait qu'afficher
// L'AVIS PROPRE de l'utilisateur connecté (`getMyReview`).

/** Libellés de satisfaction associés au nombre d'étoiles. */
const RATING_LABELS: Record<number, string> = {
  1: "Très insatisfait",
  2: "Insatisfait",
  3: "Moyen",
  4: "Satisfait",
  5: "Très satisfait",
};

const MAX_COMMENT_LENGTH = 1000;

export function PlatformReviewCard() {
  const myReview = useQuery(api.platformReviews.getMyReview, {});
  const submitReview = useMutation(api.platformReviews.submitReview);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Avis déjà déposé → pré-remplissage pour modification.
  useEffect(() => {
    if (!myReview) return;
    setRating(myReview.rating);
    setComment(myReview.comment ?? "");
    setSaved(true);
  }, [myReview]);

  const hasExistingReview = !!myReview;
  const isDirty =
    hasExistingReview && (rating !== myReview.rating || comment.trim() !== (myReview.comment ?? "").trim());
  const canSubmit = rating >= 1 && rating <= 5 && !submitting && (!hasExistingReview || isDirty);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error("Veuillez sélectionner une note de 1 à 5 étoiles.");
      return;
    }
    if (comment.length > MAX_COMMENT_LENGTH) {
      toast.error(`Le commentaire ne doit pas dépasser ${MAX_COMMENT_LENGTH} caractères.`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitReview({ rating, comment: comment.trim() || undefined });
      setSaved(true);
      if (result.alreadyRecorded) {
        toast.info("Votre avis est déjà enregistré.");
      } else if (result.updated) {
        toast.success("Votre avis a bien été mis à jour. Merci !");
      } else {
        toast.success("Merci ! Votre avis a bien été enregistré.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayed = hovered > 0 ? hovered : rating;

  return (
    <section
      aria-labelledby="notez-batibuild-title"
      className="mt-6 rounded-2xl border border-border/40 bg-gradient-to-br from-primary/[0.04] via-background to-background p-4 sm:p-6 shadow-sm"
    >
      {/* En-tête */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Heart className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="notez-batibuild-title" className="text-base sm:text-lg font-semibold">
            Notez BatiBuild
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Votre avis compte&nbsp;! Aidez-nous à améliorer BatiBuild en évaluant votre expérience sur notre
            plateforme.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* Étoiles interactives */}
        <div>
          <div
            className="flex items-center gap-1"
            role="radiogroup"
            aria-label="Note de 1 à 5 étoiles"
            onMouseLeave={() => setHovered(0)}
          >
            {[1, 2, 3, 4, 5].map((value) => {
              const filled = value <= displayed;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} étoile${value > 1 ? "s" : ""} — ${RATING_LABELS[value]}`}
                  onClick={() => {
                    setRating(value);
                    setSaved(false);
                  }}
                  onMouseEnter={() => setHovered(value)}
                  onFocus={() => setHovered(value)}
                  onBlur={() => setHovered(0)}
                  className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring active:scale-95"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 sm:h-8 sm:w-8 transition-colors",
                      filled
                        ? "fill-amber-400 text-amber-400"
                        : "fill-muted/30 text-muted-foreground/40",
                    )}
                  />
                </button>
              );
            })}
            {displayed > 0 && (
              <span className="ml-2 text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-500">
                {RATING_LABELS[displayed]}
              </span>
            )}
          </div>
        </div>

        {/* Commentaire facultatif */}
        <div>
          <Textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setSaved(false);
            }}
            placeholder="Votre commentaire (facultatif) — qu'avez-vous apprécié ? que pourrions-nous améliorer ?"
            className="min-h-[88px] resize-y text-sm"
            maxLength={MAX_COMMENT_LENGTH}
            aria-label="Commentaire facultatif"
          />
          <p className="mt-1 text-[10px] text-muted-foreground/70 text-right tabular-nums">
            {comment.length} / {MAX_COMMENT_LENGTH}
          </p>
        </div>

        {/* Action + confirmation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {saved && !isDirty && hasExistingReview ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
              <CheckCheck className="h-4 w-4" />
              Votre avis est enregistré. Merci de votre contribution&nbsp;!
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/70">
              Votre avis est strictement confidentiel et consultable uniquement par nos équipes.
            </p>
          )}

          <Button
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {hasExistingReview ? "Mettre à jour mon avis" : "Envoyer mon avis"}
          </Button>
        </div>
      </div>
    </section>
  );
}
