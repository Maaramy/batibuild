import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, CalendarClock, Zap } from "lucide-react";
import {
  AVAILABILITY_OPTIONS,
  INDICATIVE_PRICE_MAX_LENGTH,
  INDICATIVE_PRICE_PLACEHOLDER,
  type ExpertAvailability,
} from "@/lib/expertAvailability";

// ============================================================================
// PRIX INDICATIFS & DISPONIBILITÉ — profil expert (batibuild ↔ ProMarket)
//
// Bloc partagé par le formulaire de modification et celui de création. Les
// valeurs saisies ici sont exactement celles affichées dans ProMarket : une
// seule source, aucune duplication de profil professionnel.
// ============================================================================

export function AvailabilityFields({
  editing,
  indicativePrice,
  setIndicativePrice,
  availability,
  setAvailability,
  availabilityDetails,
  setAvailabilityDetails,
  acceptsUrgent,
  setAcceptsUrgent,
}: {
  editing: boolean;
  indicativePrice: string;
  setIndicativePrice: (v: string) => void;
  availability: ExpertAvailability | "";
  setAvailability: (v: ExpertAvailability | "") => void;
  availabilityDetails: string;
  setAvailabilityDetails: (v: string) => void;
  acceptsUrgent: boolean;
  setAcceptsUrgent: (v: boolean) => void;
}) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-blue-600" />
          Prix indicatifs & disponibilité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prix indicatifs */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Banknote className="h-3 w-3" /> Prix indicatifs
          </Label>
          <Input
            value={indicativePrice}
            onChange={(e) => setIndicativePrice(e.target.value)}
            disabled={!editing}
            maxLength={INDICATIVE_PRICE_MAX_LENGTH}
            placeholder={INDICATIVE_PRICE_PLACEHOLDER}
            className="h-9 text-sm"
          />
          <p className="text-[9px] text-muted-foreground">
            Exemples : « À partir de 80 TND », « Sur devis », « À partir de 50 TND / intervention ».
            Affiché sur votre fiche ProMarket.
          </p>
        </div>

        {/* Disponibilité */}
        <div className="space-y-1.5">
          <Label className="text-xs">Disponibilité</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {AVAILABILITY_OPTIONS.map((option) => {
              const selected = availability === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!editing}
                  onClick={() => setAvailability(selected ? "" : option.value)}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                    selected
                      ? "border-blue-400 bg-blue-500/10 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400"
                  } ${!editing ? "cursor-default" : ""}`}
                >
                  <span className="text-xs font-semibold">{option.label}</span>
                  <span className="text-[9px] text-muted-foreground">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Créneaux — uniquement pour l'option « Rendez-vous » */}
        {availability === "appointment" && (
          <div className="space-y-1.5 rounded-xl border border-blue-500/25 bg-blue-500/5 p-3">
            <Label className="text-xs">Mes disponibilités (rendez-vous)</Label>
            <Textarea
              value={availabilityDetails}
              onChange={(e) => setAvailabilityDetails(e.target.value)}
              disabled={!editing}
              rows={2}
              placeholder="Ex : Lundi – Vendredi, 9h – 17h · Samedi matin"
              className="text-sm min-h-[60px]"
            />
            <p className="text-[9px] text-muted-foreground">
              Ces créneaux sont affichés au client avant qu'il ne propose une date.
            </p>
          </div>
        )}

        {/* Demandes urgentes */}
        <label
          className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all ${
            acceptsUrgent
              ? "border-amber-500/40 bg-amber-500/[0.07]"
              : "border-border/40 bg-background"
          } ${!editing ? "cursor-default opacity-80" : ""}`}
        >
          <input
            type="checkbox"
            checked={acceptsUrgent}
            disabled={!editing}
            onChange={(e) => setAcceptsUrgent(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-amber-600"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-xs font-semibold">
              <Zap className="h-3 w-3 text-amber-600" /> Accepter les demandes en urgence
            </span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              Vous recevrez une notification prioritaire lorsqu'un client demande une
              intervention rapide, et pourrez accepter ou refuser immédiatement.
            </span>
          </span>
        </label>
      </CardContent>
    </Card>
  );
}
