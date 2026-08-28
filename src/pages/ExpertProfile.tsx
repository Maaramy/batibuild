import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import {
  ArrowLeft, Building2, MapPin, Phone, Mail, Globe, Briefcase, Loader2,
} from "lucide-react";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/convex/schema";
import { useState } from "react";
import { toast } from "sonner";

const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", bizerte: "Bizerte", sousse: "Sousse", monastir: "Monastir",
  mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès", medenine: "Médenine",
  tozeur: "Tozeur", kebili: "Kébili", gafsa: "Gafsa", sidi_bouzid: "Sidi Bouzid",
  kasserine: "Kasserine", le_kef: "Le Kef", jendouba: "Jendouba", beja: "Béja",
  siliana: "Siliana", zaghouan: "Zaghouan", tataouine: "Tataouine",
};

const PROFESSION_LABELS: Record<string, string> = {
  architecte: "Architecte",
  bureau_etudes: "Bureau d'études",
  ingenieur: "Ingénieur",
  promoteur_immobilier: "Promoteur immobilier",
};

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

  const [ratingOpen, setRatingOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [sending, setSending] = useState(false);
  const rateExpert = useMutation(api.ratings.rateExpert);

  usePageSEO({
    title: expert ? `${expert.displayName} — Expert` : "Profil Expert",
    description: expert?.description ?? "Détails du professionnel du bâtiment.",
  });

  if (!id) return <main className="p-6 text-center text-muted-foreground">Identifiant manquant.</main>;
  if (expert === undefined) return <main className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
  if (!expert) return <main className="p-6 text-center text-muted-foreground">Expert introuvable.</main>;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">{expert.displayName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px]">{PROFESSION_LABELS[expert.profession] ?? expert.profession}</Badge>
              {avg && avg.count > 0 && <StarRating value={avg.avg} count={avg.count} size="xs" />}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        {/* Company */}
        {expert.companyName && (
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground"><Briefcase className="inline h-3 w-3 mr-1" />{expert.companyName}</p>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {expert.description && (
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{expert.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Specialties */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 px-4 py-3">
            <CardTitle className="text-sm">Spécialités</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {expert.specialties.map((sp: string) => (
                <Badge key={sp} variant="secondary" className="text-[10px]">
                  {SUPPLIER_SPECIALTIES_LABELS[sp as keyof typeof SUPPLIER_SPECIALTIES_LABELS] ?? sp}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Regions */}
        {expert.regions && expert.regions.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 px-4 py-3">
              <CardTitle className="text-sm">Zones de couverture</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {expert.regions.map((r: string) => (
                  <Badge key={r} variant="outline" className="text-[10px] gap-1">
                    <MapPin className="h-2.5 w-2.5" />{REGION_LABELS[r] ?? r}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact */}
        <Card className="border-border/40">
          <CardHeader className="pb-2 px-4 py-3">
            <CardTitle className="text-sm">Contact</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {expert.phone && (
              <a href={`tel:${expert.phone}`} className="flex items-center gap-2 text-xs hover:text-amber-600 transition-colors">
                <Phone className="h-3.5 w-3.5 shrink-0" />{expert.phone}
              </a>
            )}
            {expert.email && (
              <a href={`mailto:${expert.email}`} className="flex items-center gap-2 text-xs hover:text-amber-600 transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0" />{expert.email}
              </a>
            )}
            {expert.website && (
              <a href={expert.website.startsWith("http") ? expert.website : `https://${expert.website}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs hover:text-amber-600 transition-colors">
                <Globe className="h-3.5 w-3.5 shrink-0" />{expert.website}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => {
            if (!user) { navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`); return; }
            setRatingOpen(true);
            setMyRating(0);
          }}>
            ⭐ Noter cet expert
          </Button>
          <Button className="flex-1 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700"
            onClick={() => navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`)}>
            <Phone className="h-3.5 w-3.5" /> Contacter
          </Button>
        </div>

        {/* Ratings list */}
        {ratings && ratings.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 px-4 py-3">
              <CardTitle className="text-sm">Avis clients ({ratings.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {ratings.map((r) => (
                <div key={r._id} className="rounded-lg border border-border/30 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">{r.userName}</span>
                    <StarRating value={r.rating} size="xs" />
                  </div>
                  {r.comment && <p className="text-[10px] text-muted-foreground mt-1">{r.comment}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Rating Dialog */}
        <Dialog open={ratingOpen} onOpenChange={(o) => { if (!o) setRatingOpen(false); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Noter {expert.displayName}</DialogTitle>
              <DialogDescription className="text-[11px]">Votre note aide les autres clients.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 pt-2">
              <StarRating value={myRating} size="md" interactive onChange={setMyRating} />
              <Button className="w-full gap-1.5 text-xs" disabled={sending || myRating === 0}
                onClick={async () => {
                  setSending(true);
                  try {
                    await rateExpert({ expertId: id as any, rating: myRating });
                    toast.success(`Note ${myRating}/5 enregistrée !`);
                    setRatingOpen(false);
                  } catch (err: any) { toast.error(err?.message ?? "Erreur"); }
                  finally { setSending(false); }
                }}>
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
