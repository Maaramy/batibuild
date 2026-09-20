import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import {
  Globe, Layers, Loader2, Mail, MapPin, Phone, Star, Store,
} from "lucide-react";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/lib/supplierSpecialties";
import { useState, useEffect, useRef } from "react";
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
import { toast } from "sonner";

// ============================================================================
// FICHE PUBLIQUE FOURNISSEUR
//
// Même mise en page que la fiche expert (voir `ProviderProfileUI`) : identité,
// informations clés en 2 colonnes, sections détaillées, actions accessibles au
// pouce. Le logo de l'entreprise est affiché en priorité, avec repli initiales
// puis icône boutique si aucun logo n'est publié.
// ============================================================================

/** Libellé de spécialité fournisseur, avec repli sur la clé brute. */
function specialtyLabel(value: string): string {
  return (
    SUPPLIER_SPECIALTIES_LABELS[value as keyof typeof SUPPLIER_SPECIALTIES_LABELS] ?? value
  );
}

export default function SupplierProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const supplier = useQuery(
    api.supplierProfiles.getSupplierById,
    id ? { supplierId: id as any } : "skip",
  );
  const ratings = useQuery(
    api.ratings.getSupplierRatings,
    id ? { supplierId: id as any } : "skip",
  );
  const avg = useQuery(
    api.ratings.getSupplierAverage,
    id ? { supplierId: id as any } : "skip",
  );

  const [ratingOpen, setRatingOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [sending, setSending] = useState(false);
  const rateSupplier = useMutation(api.ratings.rateSupplier);
  const recordEvent = useMutation(api.supplierStats.recordEvent);
  const viewRecorded = useRef(false);

  // Track profile view (once per page load)
  useEffect(() => {
    if (supplier && id && !viewRecorded.current) {
      viewRecorded.current = true;
      recordEvent({ supplierId: id as any, eventType: "view" }).catch(() => {});
    }
  }, [supplier, id, recordEvent]);

  usePageSEO({
    title: supplier ? `${supplier.companyName} — Fournisseur` : "Profil Fournisseur",
    description: supplier?.description ?? "Détails du fournisseur de matériaux de construction.",
  });

  if (!id) return <main className="p-6 text-center text-muted-foreground">Identifiant manquant.</main>;
  if (supplier === undefined) {
    return (
      <main className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }
  if (!supplier) return <main className="p-6 text-center text-muted-foreground">Fournisseur introuvable.</main>;

  const profile = supplier as any;
  const specialties = (profile.specialties ?? []) as string[];
  const zones = (profile.regions ?? []) as string[];
  const ratingLabel = avg && avg.count > 0 ? `${avg.avg}/5` : "Aucun avis";

  const requireAuth = (action: () => void) => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    action();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.04] via-background to-background">
      <ProfileHeader
        title="Profil fournisseur"
        subtitle="Matériaux & équipements"
        onBack={() => navigate(-1)}
        right={
          <ProviderAvatar
            name={profile.companyName}
            logo={profile.logo}
            kind="supplier"
            size="xs"
          />
        }
      />

      <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-3 sm:px-6 sm:pb-10">
        <div className="space-y-3 sm:space-y-4">
          {/* ── Identité : logo en priorité, nom / catégorie / note à droite ── */}
          <ProfileHero
            kind="supplier"
            name={profile.companyName}
            logo={profile.logo}
            typeLabel="Fournisseur"
            subtitle={
              specialties.length > 0
                ? specialties.slice(0, 3).map(specialtyLabel).join(" · ")
                : profile.description
            }
            rating={<StarRating value={avg?.avg ?? 0} count={avg?.count} size="xs" />}
            chips={
              <>
                {(zones.length > 0 || profile.address) && (
                  <InfoChip icon={MapPin}>
                    {zones.length > 0
                      ? zones.length === 1
                        ? regionLabel(zones[0])
                        : `${zones.length} zones desservies`
                      : profile.address}
                  </InfoChip>
                )}
              </>
            }
          />

          {/* ── Informations clés : 2 colonnes sur mobile ── */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <InfoTile
              icon={Layers}
              label="Catégories"
              value={
                specialties.length > 0
                  ? specialties.length === 1
                    ? specialtyLabel(specialties[0])
                    : `${specialtyLabel(specialties[0])} +${specialties.length - 1}`
                  : "Non précisé"
              }
            />
            <InfoTile
              icon={MapPin}
              label="Zones desservies"
              value={
                zones.length > 0
                  ? zones.length === 1
                    ? regionLabel(zones[0])
                    : `${regionLabel(zones[0])} +${zones.length - 1}`
                  : "Non précisé"
              }
            />
            <InfoTile
              icon={Store}
              label="Adresse"
              value={profile.address || "Non précisée"}
            />
            <InfoTile icon={Star} label="Note clients" value={ratingLabel} tone="amber" />
          </div>

          {/* ── Actions principales (accessibles au pouce sur mobile) ── */}
          {(profile.phone || profile.email) && (
            <ProfileActionBar>
              {profile.phone && (
                <Button
                  className="h-10 gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    window.location.href = `tel:${profile.phone.replace(/[^\d+]/g, "")}`;
                  }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Contacter
                </Button>
              )}
              {profile.email && (
                <Button
                  variant="outline"
                  className="h-10 gap-1.5 text-xs"
                  onClick={() => {
                    window.location.href = `mailto:${profile.email}`;
                  }}
                >
                  <Mail className="h-3.5 w-3.5" />
                  E-mail
                </Button>
              )}
            </ProfileActionBar>
          )}

          {profile.description && (
            <ProfileSection icon={Store} title="Présentation">
              <p className="whitespace-pre-line text-[12px] leading-relaxed text-muted-foreground">
                {profile.description}
              </p>
            </ProfileSection>
          )}

          <ProfileSection
            icon={Layers}
            title="Spécialités & matériaux"
            hint={specialties.length > 0 ? `${specialties.length}` : undefined}
          >
            {specialties.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {specialties.map((sp) => (
                  <InfoChip key={sp}>{specialtyLabel(sp)}</InfoChip>
                ))}
              </div>
            ) : (
              <EmptyHint>Aucune spécialité renseignée.</EmptyHint>
            )}
          </ProfileSection>

          {zones.length > 0 && (
            <ProfileSection icon={MapPin} title="Zones de livraison" hint={`${zones.length}`}>
              <div className="flex flex-wrap gap-1.5">
                {zones.map((r) => (
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
                <ContactRow icon={Phone} href={`tel:${profile.phone}`}>
                  {profile.phone}
                </ContactRow>
              )}
              {profile.email && (
                <ContactRow icon={Mail} href={`mailto:${profile.email}`}>
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
              {profile.address && <ContactRow icon={MapPin}>{profile.address}</ContactRow>}
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
                Aucun avis pour le moment — partagez votre expérience avec ce fournisseur.
              </EmptyHint>
            )}
          </ProfileSection>

          <p className="px-1 pt-1 text-center text-[10px] leading-snug text-muted-foreground/70">
            Les informations publiées par le fournisseur sont indicatives et ne
            constituent pas un engagement contractuel.
          </p>
        </div>
      </div>

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onOpenChange={(o) => { if (!o) setRatingOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Noter {profile.companyName}</DialogTitle>
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
                  await rateSupplier({ supplierId: id as any, rating: myRating });
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
    </main>
  );
}
