import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useAuth } from "@/hooks/use-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import {
  Banknote, Briefcase, CalendarClock, Globe, Layers, Loader2, Mail, MapPin,
  Phone, Star, UserRound, Zap,
} from "lucide-react";
import { SPECIALTY_LABELS } from "@/components/expert/expertProfileOptions";
import {
  RequestAppointmentDialog,
  RequestUrgentDialog,
} from "@/components/expert/ExpertRequestDialogs";
import {
  approvedExpertIdSet,
  availabilityMeta,
  indicativePriceLabel,
  isBookable,
  isContactHidden,
  showsAvailabilityBadge,
} from "@/lib/expertAvailability";
import {
  ContactRow,
  EmptyHint,
  InfoChip,
  InfoTile,
  ProfileActionBar,
  ProfileHeader,
  ProfileHero,
  ProfileSection,
  ProviderAvatar,
} from "@/components/profile/ProviderProfileUI";
import { regionLabel } from "@/lib/providerRegions";
import { stripCjk, sanitizeStringList } from "@/lib/sanitizeText";
import { currentEventSource } from "@/lib/analyticsSource";
import { toast } from "sonner";

// ============================================================================
// FICHE PUBLIQUE EXPERT (ProMarket)
//
// Mise en page mobile-first partagée avec la fiche fournisseur
// (`ProviderProfileUI`) : identité → informations clés en 2 colonnes → sections
// détaillées → actions accessibles au pouce. Aucune logique métier modifiée :
// prix indicatifs, disponibilité, urgences, rendez-vous (masquage du contact
// après approbation) et notation restent inchangés.
// ============================================================================

const PROFESSION_LABELS: Record<string, string> = {
  architecte: "Architecte",
  bureau_etudes: "Bureau d'études",
  ingenieur: "Ingénieur",
  promoteur_immobilier: "Promoteur immobilier",
  plombier: "Plombier",
  electricien: "Électricien",
};

/** Libellé de spécialité expert, avec repli sur la clé brute nettoyée (CJK retirés). */
function specialtyLabel(value: string): string {
  const clean = stripCjk(value);
  return SPECIALTY_LABELS[clean] ?? clean;
}

export default function ExpertProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const expert = useQuery(
    api.expertProfiles.getExpertById,
    id ? { expertId: id as any } : "skip",
  );
  const ratings = useQuery(
    api.ratings.getExpertRatings,
    id ? { expertId: id as any } : "skip",
  );
  const avg = useQuery(
    api.ratings.getExpertAverage,
    id ? { expertId: id as any } : "skip",
  );
  // Rendez-vous confirmés : l'action directe « Contacter » est alors masquée.
  const myAppointments = useQuery(api.expertAvailability.getMyAppointments);
  const approvedExpertIds = approvedExpertIdSet(myAppointments);

  const [ratingOpen, setRatingOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [sending, setSending] = useState(false);
  const rateExpert = useMutation(api.ratings.rateExpert);
  const recordEvent = useMutation(api.expertStats.recordExpertEvent);
  const viewRecorded = useRef(false);
  // Source de la visite (annuaire interne, moteur de recherche, réseau social…),
  // évaluée une seule fois : alimente le graphique « Sources de trafic ».
  const sourceRef = useRef(currentEventSource());

  // Track profile view (once per page load)
  useEffect(() => {
    if (expert && id && !viewRecorded.current) {
      viewRecorded.current = true;
      recordEvent({
        expertId: id as any,
        eventType: "view",
        source: sourceRef.current,
      }).catch(() => {});
    }
  }, [expert, id, recordEvent]);

  // Contact engagé depuis la fiche (appel, e-mail) : compté une fois par clic.
  const trackContact = useCallback(() => {
    if (!id) return;
    recordEvent({
      expertId: id as any,
      eventType: "contact",
      source: sourceRef.current,
    }).catch(() => {});
  }, [id, recordEvent]);

  usePageSEO({
    title: expert ? `${expert.displayName} — Expert` : "Profil Expert",
    description: expert?.description ?? "Détails du professionnel du bâtiment.",
  });

  if (!id) return <main className="p-6 text-center text-muted-foreground">Identifiant manquant.</main>;
  if (expert === undefined) {
    return (
      <main className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (!expert) return <main className="p-6 text-center text-muted-foreground">Expert introuvable.</main>;

  // ── ProMarket : prix indicatifs, disponibilité et urgences ──
  const profile = expert as any;
  const price = indicativePriceLabel(profile.indicativePrice);
  // « Sur rendez-vous » n'est pas affiché (le bouton de demande porte l'info).
  const availability = showsAvailabilityBadge(profile.availability)
    ? availabilityMeta(profile.availability)
    : undefined;
  const bookable = isBookable(profile.availability);
  const acceptsUrgent = profile.acceptsUrgent === true;
  const showContactButton = !isContactHidden(id, approvedExpertIds);
  const availabilityText = bookable
    ? "Sur rendez-vous"
    : availability?.short ?? "Non précisée";
  // Spécificités et zones nettoyées à la lecture : les profils enregistrés avec
  // des caractères chinois ne s'affichent jamais (CJK retirés, vides exclus).
  const specialties = sanitizeStringList(profile.specialties);
  const zones = sanitizeStringList(profile.regions);

  const requireAuth = (action: () => void) => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    action();
  };

  const hasActions = bookable || acceptsUrgent || (showContactButton && !!profile.phone);

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.04] via-background to-background">
      <ProfileHeader
        title="Profil expert"
        subtitle={PROFESSION_LABELS[profile.profession] ?? profile.profession}
        onBack={() => navigate(-1)}
        right={
          <ProviderAvatar
            name={profile.displayName}
            logo={profile.logo}
            kind="expert"
            size="xs"
          />
        }
      />

      <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-3 sm:px-6 sm:pb-10">
        <div className="space-y-3 sm:space-y-4">
          {/* ── Identité : logo à gauche, nom / métier / note à droite ── */}
          <ProfileHero
            kind="expert"
            name={profile.displayName}
            logo={profile.logo}
            typeLabel={PROFESSION_LABELS[profile.profession] ?? profile.profession}
            subtitle={profile.companyName}
            rating={<StarRating value={avg?.avg ?? 0} count={avg?.count} size="xs" />}
            chips={
              <>
                {(zones.length > 0 || profile.address) && (
                  <InfoChip icon={MapPin}>
                    {zones.length > 0 ? regionLabel(zones[0]) : profile.address}
                  </InfoChip>
                )}
                {specialties.length > 0 && (
                  <InfoChip icon={Layers}>
                    {specialties.length} spécialité
                    {specialties.length > 1 ? "s" : ""}
                  </InfoChip>
                )}
                {acceptsUrgent && (
                  <InfoChip icon={Zap}>Urgences acceptées</InfoChip>
                )}
              </>
            }
          />

          {/* ── Informations clés : 2 colonnes sur mobile ── */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <InfoTile
              icon={Banknote}
              label="Prix indicatifs"
              value={price ?? "Sur devis"}
              tone="emerald"
            />
            <InfoTile
              icon={CalendarClock}
              label="Disponibilité"
              value={availabilityText}
              tone="blue"
            />
            <InfoTile
              icon={MapPin}
              label="Localisation"
              value={profile.address ?? (zones[0] ? regionLabel(zones[0]) : "Tunisie")}
            />
            <InfoTile
              icon={Star}
              label="Note clients"
              value={avg && avg.count > 0 ? `${avg.avg}/5` : "Aucun avis"}
              tone="amber"
            />
          </div>

          {/* ── Actions principales (accessibles au pouce sur mobile) ── */}
          {hasActions && (
            <ProfileActionBar>
              {bookable && (
                <Button
                  className="h-10 gap-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => requireAuth(() => setAppointmentOpen(true))}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Rendez-vous
                </Button>
              )}
              {acceptsUrgent && (
                <Button
                  className="h-10 gap-1.5 text-xs bg-amber-600 text-white hover:bg-amber-700"
                  onClick={() => requireAuth(() => setUrgentOpen(true))}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Urgence
                </Button>
              )}
              {showContactButton && profile.phone && (
                <Button
                  variant="outline"
                  className="h-10 gap-1.5 text-xs"
                  onClick={() => {
                    trackContact();
                    window.location.href = `tel:${profile.phone}`;
                  }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Contacter
                </Button>
              )}
            </ProfileActionBar>
          )}

          {profile.description && (
            <ProfileSection icon={UserRound} title="Présentation">
              <p className="whitespace-pre-line text-[12px] leading-relaxed text-muted-foreground">
                {profile.description}
              </p>
            </ProfileSection>
          )}

          {bookable && profile.availabilityDetails && (
            <ProfileSection icon={CalendarClock} title="Disponibilités indiquées">
              <p className="whitespace-pre-line text-[12px] leading-relaxed text-muted-foreground">
                {profile.availabilityDetails}
              </p>
            </ProfileSection>
          )}

          <ProfileSection
            icon={Layers}
            title="Spécialités & services"
            hint={`${specialties.length}`}
          >
            {specialties.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {specialties.map((sp: string) => (
                  <InfoChip key={sp}>{specialtyLabel(sp)}</InfoChip>
                ))}
              </div>
            ) : (
              <EmptyHint>Aucune spécialité renseignée.</EmptyHint>
            )}
          </ProfileSection>

          {zones.length > 0 && (
            <ProfileSection icon={MapPin} title="Zones d'intervention" hint={`${zones.length}`}>
              <div className="flex flex-wrap gap-1.5">
                {zones.map((r: string) => (
                  <InfoChip key={r} icon={MapPin}>
                    {regionLabel(r)}
                  </InfoChip>
                ))}
              </div>
            </ProfileSection>
          )}

          <ProfileSection icon={Phone} title="Contact">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {profile.phone && (
                <ContactRow icon={Phone} href={`tel:${profile.phone}`} onActivate={trackContact}>
                  {profile.phone}
                </ContactRow>
              )}
              {profile.email && (
                <ContactRow icon={Mail} href={`mailto:${profile.email}`} onActivate={trackContact}>
                  {profile.email}
                </ContactRow>
              )}
              {profile.website && (
                <ContactRow
                  icon={Globe}
                  href={
                    profile.website.startsWith("http")
                      ? profile.website
                      : `https://${profile.website}`
                  }
                  external
                >
                  {profile.website}
                </ContactRow>
              )}
              {profile.companyName && (
                <ContactRow icon={Briefcase}>{profile.companyName}</ContactRow>
              )}
              {profile.address && (
                <ContactRow icon={MapPin}>{profile.address}</ContactRow>
              )}
              {!profile.phone && !profile.email && !profile.website && !profile.address && (
                <EmptyHint>Aucune information de contact publiée.</EmptyHint>
              )}
            </div>
          </ProfileSection>

          <ProfileSection
            icon={Star}
            title="Avis clients"
            hint={ratings && ratings.length > 0 ? `${ratings.length}` : undefined}
            action={
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1 px-2 text-[10px]"
                onClick={() => requireAuth(() => { setRatingOpen(true); setMyRating(0); })}
              >
                <Star className="h-3 w-3" />
                Noter
              </Button>
            }
          >
            {ratings && ratings.length > 0 ? (
              <div className="space-y-2">
                {ratings.map((r) => (
                  <div key={r._id} className="rounded-xl border border-border/40 bg-background/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[11px] font-medium">{r.userName}</span>
                      <StarRating value={r.rating} size="xs" />
                    </div>
                    {r.comment && (
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint>
                Aucun avis pour le moment — soyez le premier à partager votre expérience.
              </EmptyHint>
            )}
          </ProfileSection>

          <p className="px-1 pt-1 text-center text-[10px] leading-snug text-muted-foreground/70">
            Les informations publiées par le professionnel sont indicatives et ne
            constituent pas un engagement contractuel.
          </p>
        </div>
      </div>

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onOpenChange={(o) => { if (!o) setRatingOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Noter {profile.displayName}</DialogTitle>
            <DialogDescription className="text-[11px]">Votre note aide les autres clients.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <StarRating value={myRating} size="md" interactive onChange={setMyRating} />
            <Button
              className="w-full gap-1.5 text-xs"
              disabled={sending || myRating === 0}
              onClick={async () => {
                setSending(true);
                try {
                  await rateExpert({ expertId: id as any, rating: myRating });
                  toast.success(`Note ${myRating}/5 enregistrée !`);
                  setRatingOpen(false);
                } catch (err: any) {
                  toast.error(err?.message ?? "Erreur");
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ProMarket : demandes de rendez-vous et d'intervention urgente */}
      <RequestAppointmentDialog
        expert={expert}
        open={appointmentOpen}
        onOpenChange={setAppointmentOpen}
      />
      <RequestUrgentDialog
        expert={expert}
        open={urgentOpen}
        onOpenChange={setUrgentOpen}
      />
    </main>
  );
}
