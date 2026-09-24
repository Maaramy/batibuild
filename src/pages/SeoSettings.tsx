import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Globe,
  Settings,
  FileText,
  BarChart3,
  Search,
  Save,
  Loader2,
  Newspaper,
} from "lucide-react";

type SeoForm = {
  siteName: string;
  siteDescription: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  canonicalUrl: string;
  googleAnalyticsId: string;
  robotsTxt: string;
  additionalMetaTags: string;
  googleSiteVerification: string;
  blogTitle: string;
  blogDescription: string;
  blogOgImage: string;
};

// ─── Field component (defined OUTSIDE SeoSettings to prevent unmount/remount)
function Field({
  label,
  fieldKey,
  form,
  setForm,
  opts,
}: {
  label: string;
  fieldKey: keyof SeoForm;
  form: SeoForm;
  setForm: React.Dispatch<React.SetStateAction<SeoForm>>;
  opts?: { type?: string; rows?: number; placeholder?: string; hint?: string };
}) {
  const value = form[fieldKey] ?? "";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {opts?.rows && opts.rows > 1 ? (
        <textarea
          value={value}
          onChange={(e) => setForm((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
          rows={opts.rows}
          placeholder={opts?.placeholder}
          className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y min-h-[60px]"
        />
      ) : (
        <Input
          type={opts?.type || "text"}
          value={value}
          onChange={(e) => setForm((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
          placeholder={opts?.placeholder}
          className="h-9 text-sm"
        />
      )}
      {opts?.hint && <p className="text-[10px] text-muted-foreground/70">{opts.hint}</p>}
    </div>
  );
}

export default function SeoSettings() {
  const seoConfig = useQuery(api.seo.getSeoConfigOrDefault);
  const saveSeo = useMutation(api.seo.saveSeoConfig);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SeoForm>({
    siteName: "",
    siteDescription: "",
    keywords: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    twitterCard: "summary_large_image",
    canonicalUrl: "",
    googleAnalyticsId: "",
    robotsTxt: "",
    additionalMetaTags: "",
    googleSiteVerification: "",
    blogTitle: "",
    blogDescription: "",
    blogOgImage: "",
  });

  useEffect(() => {
    if (seoConfig) {
      setForm({
        siteName: seoConfig.siteName || "batibuild - Estimation Construction Tunisie",
        siteDescription: seoConfig.siteDescription || "",
        keywords: seoConfig.keywords || "",
        ogTitle: seoConfig.ogTitle || "",
        ogDescription: seoConfig.ogDescription || "",
        ogImage: seoConfig.ogImage || "",
        twitterCard: seoConfig.twitterCard || "summary_large_image",
        canonicalUrl: seoConfig.canonicalUrl || "",
        googleAnalyticsId: seoConfig.googleAnalyticsId || "",
        robotsTxt: seoConfig.robotsTxt || "",
        additionalMetaTags: seoConfig.additionalMetaTags || "",
        googleSiteVerification: seoConfig.googleSiteVerification || "",
        blogTitle: seoConfig.blogTitle || "",
        blogDescription: seoConfig.blogDescription || "",
        blogOgImage: seoConfig.blogOgImage || "",
      });
    }
  }, [seoConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSeo(form);
      toast.success("Configuration SEO enregistrée");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setSaving(false);
  };

  return (
    <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm sm:text-base">Paramètres SEO</CardTitle>
            <CardDescription className="text-xs">
              Optimisez le référencement de batibuild sur les moteurs de recherche.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
        {/* Configuration générale */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Configuration générale
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nom du site (title)"
              fieldKey="siteName"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "batibuild - Estimation Construction Tunisie",
                hint: "Apparaît dans l'onglet et les résultats de recherche",
              }}
            />
            <Field
              label="URL canonique"
              fieldKey="canonicalUrl"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "https://batibuild.app",
                hint: "URL principale du site",
              }}
            />
          </div>
          <div className="mt-4">
            <Field
              label="Description (meta description)"
              fieldKey="siteDescription"
              form={form}
              setForm={setForm}
              opts={{
                rows: 2,
                placeholder: "Description en 160 caractères max...",
                hint: "Apparaît sous le titre dans les résultats de recherche",
              }}
            />
          </div>
          <div className="mt-4">
            <Field
              label="Mots-clés (keywords)"
              fieldKey="keywords"
              form={form}
              setForm={setForm}
              opts={{
                rows: 2,
                placeholder: "mot-clé1, mot-clé2, mot-clé3",
                hint: "Séparés par des virgules",
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Open Graph */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Open Graph (Réseaux sociaux)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Titre OG"
              fieldKey="ogTitle"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "batibuild - Estimation Construction",
                hint: "Pour Facebook, LinkedIn...",
              }}
            />
            <Field
              label="Image OG (URL)"
              fieldKey="ogImage"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "https://batibuild.app/og-image.jpg",
                hint: "1200x630px recommandé",
              }}
            />
          </div>
          <div className="mt-4">
            <Field
              label="Description OG"
              fieldKey="ogDescription"
              form={form}
              setForm={setForm}
              opts={{
                rows: 2,
                placeholder: "Description pour les réseaux sociaux...",
                hint: "Apparaît lors du partage",
              }}
            />
          </div>
          <div className="mt-4">
            <Field
              label="Twitter Card"
              fieldKey="twitterCard"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "summary_large_image",
                hint: "summary, summary_large_image, app, player",
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Blog SEO */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            SEO Blog
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Titre du blog (title)"
              fieldKey="blogTitle"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "Blog batibuild — Construction & Rénovation",
                hint: "Apparaît sur la page /blog et dans les résultats de recherche",
              }}
            />
            <Field
              label="Image OG du blog (URL)"
              fieldKey="blogOgImage"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "https://batibuild.app/blog-og.jpg",
                hint: "1200x630px recommandé — partage du blog sur les réseaux",
              }}
            />
          </div>
          <div className="mt-4">
            <Field
              label="Description du blog (meta description)"
              fieldKey="blogDescription"
              form={form}
              setForm={setForm}
              opts={{
                rows: 2,
                placeholder: "Conseils, guides et actualités sur la construction en Tunisie...",
                hint: "Sous-titre et meta description de la page /blog",
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Analytics */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Analytics & Indexation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Google Analytics ID"
              fieldKey="googleAnalyticsId"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "G-XXXXXXXXXX",
                hint: "Format : G-XXXXXXXXXX",
              }}
            />
            <Field
              label="Instructions robots.txt"
              fieldKey="robotsTxt"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "User-agent: *\nAllow: /",
                hint: "Directives personnalisées",
              }}
            />
          </div>
          <div className="mt-4">
            <Field
              label="Google Search Console (code de vérification)"
              fieldKey="googleSiteVerification"
              form={form}
              setForm={setForm}
              opts={{
                placeholder: "votre_code_de_verification_google",
                hint: "Collez le code fourni par Google Search Console (ex: abc123def456)",
              }}
            />
          </div>
          <div className="mt-4">
            <Field
              label="Balises meta supplémentaires"
              fieldKey="additionalMetaTags"
              form={form}
              setForm={setForm}
              opts={{
                rows: 3,
                placeholder: '<meta name="geo.region" content="TN" />',
                hint: "Insérez du HTML valide (facultatif)",
              }}
            />
          </div>
        </div>

        {/* Preview Google */}
        <div className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Aperçu Google
          </p>
          <div className="bg-white dark:bg-background rounded-lg p-3 border border-border/20">
            <p className="text-[#1a0dab] dark:text-[#8ab4f8] text-sm font-medium truncate">
              {form.siteName || "batibuild"}
            </p>
            <p className="text-[#006621] dark:text-[#bdc1c6] text-xs truncate">
              {form.canonicalUrl || "https://batibuild.app"}
            </p>
            <p className="text-[#545454] dark:text-[#bdc1c6] text-xs line-clamp-2 mt-0.5">
              {form.siteDescription || "Estimation de coûts de construction par IA pour la Tunisie."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Enregistrement..." : "Enregistrer la configuration SEO"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
