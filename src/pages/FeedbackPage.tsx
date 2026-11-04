import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "react-router";
import { Loader2, Star } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_PATH } from "@/lib/branding";

// ============================================================================
// Page publique d'évaluation — /avis?c=<campagne>&t=<jeton>
// ----------------------------------------------------------------------------
// Accessible depuis un e-mail de campagne. Aucune authentification : le jeton
// opaque identifie le destinataire. Un seul avis par campagne et par personne.
// ============================================================================

const RATING_LABELS: Record<number, string> = {
  1: "Très insuffisant",
  2: "Insuffisant",
  3: "Correct",
  4: "Très bien",
  5: "Excellent",
};

export default function FeedbackPage() {
  const [params] = useSearchParams();
  const campaignId = params.get("c") ?? "";
  const token = params.get("t") ?? "";
  const preset = Number(params.get("note") ?? 0);

  const context = useQuery(
    api.marketing.getFeedbackContext,
    campaignId && token ? ({ campaignId, token } as any) : "skip",
  );
  const submit = useMutation(api.marketing.submitFeedback);

  const [rating, setRating] = useState(preset >= 1 && preset <= 5 ? preset : 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteName = context?.siteName || "batibuild";
  const logo = useMemo(() => context?.logoUrl || BRAND_LOGO_PATH, [context?.logoUrl]);

  async function handleSubmit() {
    if (rating < 1) {
      setError("Sélectionnez une note de 1 à 5 étoiles.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await submit({
        campaignId: campaignId as any,
        token,
        rating,
        comment: comment.trim() || undefined,
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "L'envoi de votre avis a échoué. Réessayez.");
    } finally {
      setSending(false);
    }
  }

  const alreadyDone = sent || context?.alreadySubmitted;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-border/40 bg-background/80 backdrop-blur-md shadow-xl shadow-primary/5 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-teal-500 to-amber-400" />
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-6">
              {logo ? (
                <img src={logo} alt={siteName} className="h-8 w-auto" />
              ) : (
                <span className="text-lg font-black tracking-tight">{siteName}</span>
              )}
            </div>

            {context === undefined && (
              <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            )}

            {context === null && (
              <div className="py-10 text-center space-y-3">
                <p className="text-4xl">🔗</p>
                <h1 className="text-lg font-bold">Lien d'évaluation invalide</h1>
                <p className="text-sm text-muted-foreground">
                  Ce lien est incomplet ou ne correspond plus à une campagne active. Vous pouvez
                  donner votre avis depuis votre espace personnel.
                </p>
              </div>
            )}

            {context && alreadyDone && (
              <div className="py-10 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Star className="h-7 w-7 fill-emerald-500 text-emerald-500" />
                </div>
                <h1 className="text-lg font-bold">Merci pour votre avis !</h1>
                <p className="text-sm text-muted-foreground">
                  Votre retour a bien été enregistré. Il nous aide à améliorer {siteName} pour tous
                  les utilisateurs.
                </p>
              </div>
            )}

            {context && !alreadyDone && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Comment évaluez-vous votre expérience ?
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Campagne : {context.campaignName}
                    {context.demo ? " · aperçu de démonstration" : ""}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((note) => {
                      const active = note <= (hover || rating);
                      return (
                        <button
                          key={note}
                          type="button"
                          onMouseEnter={() => setHover(note)}
                          onMouseLeave={() => setHover(0)}
                          onClick={() => setRating(note)}
                          aria-label={`${note} étoile${note > 1 ? "s" : ""}`}
                          className="p-1 transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={cn(
                              "h-9 w-9 sm:h-10 sm:w-10 transition-colors",
                              active
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 h-4 text-xs font-medium text-muted-foreground">
                    {rating > 0 ? RATING_LABELS[rating] : "Cliquez sur une étoile"}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="feedback-comment" className="text-xs font-medium">
                    Votre commentaire <span className="text-muted-foreground">(facultatif)</span>
                  </label>
                  <Textarea
                    id="feedback-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ce qui vous a plu, ce que nous pouvons améliorer…"
                    rows={4}
                    maxLength={2000}
                    className="resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {context.demo && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Aperçu : cet avis ne sera pas enregistré. Le vrai lien, unique à chaque
                    destinataire, est généré automatiquement à l'envoi.
                  </p>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={sending || rating < 1 || context.demo}
                  className="w-full h-11"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…
                    </>
                  ) : (
                    "Envoyer mon avis"
                  )}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Votre avis est confidentiel et consulté uniquement par l'équipe {siteName}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
