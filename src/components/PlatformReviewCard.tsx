import { Component, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Lock,
  MessageSquareHeart,
  Pencil,
  Send,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_COMMENT = 1000;

const RATING_LABELS: Record<number, string> = {
  1: "Très insatisfait",
  2: "Insatisfait",
  3: "Moyen",
  4: "Satisfait",
  5: "Excellent",
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

/**
 * Filet de sécurité local : une erreur de cette carte (chargement de la query,
 * réseau, données inattendues) ne doit jamais faire tomber tout le dashboard.
 * La carte disparaît simplement, le reste de la page reste utilisable.
 */
class ReviewSectionBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("[batibuild] Section « Notez BatiBuild » :", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * « Notez BatiBuild » — carte de notation et de satisfaction.
 *
 * L'utilisateur ne voit que SON avis (servi par `getMyReview`) ; la mutation
 * `submitReview` met à jour l'avis existant au lieu d'en créer un second.
 */
export function PlatformReviewCard() {
  return (
    <ReviewSectionBoundary>
      <PlatformReviewCardContent />
    </ReviewSectionBoundary>
  );
}

function PlatformReviewCardContent() {
  const review = useQuery(api.platformReviews.getMyReview, {});
  const submitReview = useMutation(api.platformReviews.submitReview);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSent, setJustSent] = useState(false);

  // Pré-remplissage dès que l'avis existant est chargé (ou si la page est
  // actualisée) : l'évaluation reste cohérente après rafraîchissement.
  useEffect(() => {
    if (!review) return;
    setRating(review.rating);
    setComment(review.comment ?? "");
  }, [review?.updatedAt, review?.rating, review?.comment]);

  const hasReview = !!review;
  const showForm = !hasReview || editing;
  const activeRating = hover || rating;

  const handleSubmit = async () => {
    if (submitting) return;
    if (rating < 1) {
      toast.error("Choisissez une note de 1 à 5 étoiles");
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({ rating, comment: comment.trim() || undefined });
      setJustSent(true);
      setEditing(false);
      toast.success("Merci pour votre évaluation ! Votre avis a bien été envoyé.");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Impossible d'enregistrer votre avis pour le moment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden border-border/40 bg-background/50 shadow-none backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-2 p-3 pb-0 sm:flex-row sm:items-center sm:justify-between sm:p-4 lg:p-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm">
            <MessageSquareHeart className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base lg:text-lg">
              Notez BatiBuild
            </CardTitle>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              Votre avis compte ! Aidez-nous à améliorer BatiBuild en partageant
              votre expérience.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="w-fit shrink-0 gap-1 border-border/60 text-[9px] font-normal text-muted-foreground"
        >
          <Lock className="h-2.5 w-2.5" /> Avis privé
        </Badge>
      </CardHeader>

      <CardContent className="p-3 pt-3 sm:p-4 sm:pt-4 lg:p-5 lg:pt-4">
        {review === undefined ? (
          <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre avis…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Confirmation après envoi */}
            <AnimatePresence initial={false}>
              {justSent && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200"
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Merci pour votre évaluation ! Votre avis a bien été envoyé.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {showForm ? (
              <div className="space-y-4">
                {/* Étoiles interactives */}
                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <div
                    className="flex items-center gap-1.5"
                    onMouseLeave={() => setHover(0)}
                    role="radiogroup"
                    aria-label="Note de 1 à 5 étoiles"
                  >
                    {[1, 2, 3, 4, 5].map((value) => {
                      const filled = value <= activeRating;
                      return (
                        <motion.button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={rating === value}
                          aria-label={`${value} étoile${value > 1 ? "s" : ""} — ${RATING_LABELS[value]}`}
                          disabled={submitting}
                          onMouseEnter={() => setHover(value)}
                          onFocus={() => setHover(value)}
                          onBlur={() => setHover(0)}
                          onClick={() => setRating(value)}
                          whileHover={{ scale: 1.12, y: -2 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 420, damping: 18 }}
                          className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed"
                        >
                          <Star
                            className={cn(
                              "h-7 w-7 transition-colors sm:h-8 sm:w-8",
                              filled
                                ? "fill-amber-400 text-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.45)]"
                                : "fill-muted/30 text-muted-foreground/40",
                            )}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      activeRating > 0 ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {activeRating > 0
                      ? `${activeRating}/5 — ${RATING_LABELS[activeRating]}`
                      : "Sélectionnez une note de 1 à 5 étoiles"}
                  </p>
                </div>

                {/* Commentaire */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="platform-review-comment"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Votre commentaire <span className="font-normal">(facultatif)</span>
                  </label>
                  <Textarea
                    id="platform-review-comment"
                    value={comment}
                    maxLength={MAX_COMMENT}
                    onChange={(event) => setComment(event.target.value)}
                    disabled={submitting}
                    placeholder="Expliquez votre appréciation, signalez un problème ou proposez une amélioration…"
                    className="min-h-[90px] resize-y text-xs sm:text-sm"
                  />
                  <p className="text-right text-[10px] tabular-nums text-muted-foreground/70">
                    {comment.length}/{MAX_COMMENT}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    Vos notes et commentaires ne sont visibles que par les
                    administrateurs BatiBuild.
                  </p>
                  <div className="flex gap-2">
                    {hasReview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs"
                        disabled={submitting}
                        onClick={() => {
                          setEditing(false);
                          setRating(review?.rating ?? 0);
                          setComment(review?.comment ?? "");
                        }}
                      >
                        Annuler
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-xs text-white shadow-sm hover:from-amber-400 hover:to-amber-500"
                      disabled={submitting || rating < 1}
                      onClick={() => void handleSubmit()}
                    >
                      {submitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {hasReview ? "Mettre à jour mon avis" : "Envoyer mon avis"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Récapitulatif de l'avis existant */
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={cn(
                          "h-4 w-4",
                          value <= (review?.rating ?? 0)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted/30 text-muted-foreground/40",
                        )}
                      />
                    ))}
                    <span className="ml-1 text-xs font-medium">
                      {RATING_LABELS[review?.rating ?? 0] ?? ""}
                    </span>
                  </div>
                  {review?.comment ? (
                    <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground/70">
                      Vous n'avez pas ajouté de commentaire.
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70">
                    Avis envoyé le {fmtDate(review?.updatedAt ?? Date.now())}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 text-[11px]"
                  onClick={() => {
                    setJustSent(false);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-3 w-3" /> Modifier mon avis
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PlatformReviewCard;
