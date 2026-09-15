import {
  ProfessionalCard,
  ProfessionalCardSkeleton,
} from "@/components/promarket/bits";
import { ProMarketEmpty, ProMarketShell } from "@/components/promarket/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useMutation, useQuery } from "convex/react";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — professionnels enregistrés (« /promarket/saved »)
// ============================================================================

export default function ProMarketSaved() {
  useDirection();
  const { t } = useTranslation("promarket");
  usePageSEO({ title: t("saved.title"), description: t("saved.subtitle") });
  const navigate = useNavigate();

  const saved = useQuery(api.promarket.listSavedProfessionals, {});
  const toggleSaved = useMutation(api.promarket.toggleSavedProfessional);

  return (
    <ProMarketShell
      title={t("saved.title")}
      subtitle={t("saved.subtitle")}
      backTo="/promarket"
    >
      {saved === undefined ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <ProfessionalCardSkeleton />
          <ProfessionalCardSkeleton />
        </div>
      ) : saved.length === 0 ? (
        <ProMarketEmpty
          icon={<Heart className="h-5 w-5" />}
          title={t("saved.empty")}
          text={t("saved.emptyHint")}
          action={
            <Button
              size="sm"
              className="mt-1 text-xs"
              onClick={() => navigate("/promarket/search")}
            >
              {t("nav.search")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((profile: any) => (
            <ProfessionalCard
              key={profile._id}
              profile={profile}
              saved
              onToggleSaved={async (id) => {
                try {
                  await toggleSaved({ professionalId: id as any });
                  toast.success(t("card.save"));
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : t("common.error"),
                  );
                }
              }}
            />
          ))}
        </div>
      )}
    </ProMarketShell>
  );
}
