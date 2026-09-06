import { Search, FilterX } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ANNOUNCEMENT_TYPE_META, ANNOUNCEMENT_STATUS_META } from "../../announcements/meta";

export interface AnnouncementFiltersState {
  search: string;
  type: string; // "all" | AnnouncementType
  status: string; // "all" | AnnouncementStatus
}

interface Props {
  value: AnnouncementFiltersState;
  onChange: (next: AnnouncementFiltersState) => void;
}

/**
 * Filter bar (search + type + status) for the admin announcement list.
 */
export function AnnouncementFilters({ value, onChange }: Props) {
  const set = (patch: Partial<AnnouncementFiltersState>) =>
    onChange({ ...value, ...patch });

  const hasActive =
    value.search.trim() !== "" || value.type !== "all" || value.status !== "all";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Rechercher par titre, contenu ou auteur…"
          className="h-9 pl-8 text-xs"
        />
      </div>

      <Select value={value.type} onValueChange={(v) => set({ type: v })}>
        <SelectTrigger className="h-9 w-full sm:w-44 text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          {(Object.keys(ANNOUNCEMENT_TYPE_META) as (keyof typeof ANNOUNCEMENT_TYPE_META)[]).map(
            (t) => (
              <SelectItem key={t} value={t}>
                {ANNOUNCEMENT_TYPE_META[t].emoji} {ANNOUNCEMENT_TYPE_META[t].label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      <Select value={value.status} onValueChange={(v) => set({ status: v })}>
        <SelectTrigger className="h-9 w-full sm:w-44 text-xs">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {(Object.keys(ANNOUNCEMENT_STATUS_META) as (keyof typeof ANNOUNCEMENT_STATUS_META)[]).map(
            (s) => (
              <SelectItem key={s} value={s}>
                {ANNOUNCEMENT_STATUS_META[s].label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-xs text-muted-foreground"
          onClick={() => onChange({ search: "", type: "all", status: "all" })}
        >
          <FilterX className="h-3.5 w-3.5" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}