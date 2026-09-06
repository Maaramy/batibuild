import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { CalendarClock, Target, UserRound, Building2, Layers } from "lucide-react";
import {
  ANNOUNCEMENT_TYPE_META,
  ANNOUNCEMENT_TYPES,
  TYPE_PRIORITY,
  type AnnouncementType,
} from "../../announcements/meta";

export interface AnnouncementFormValues {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: number;
  imageUrl: string;
  publishMode: "draft" | "now" | "scheduled";
  startDate: string; // datetime-local (local time)
  endDate: string; // datetime-local (local time)
  targetType: "all" | "company" | "role" | "user";
  targetCompanyNames: string[];
  targetRoles: string[];
  targetUserIds: string[];
}

export const EMPTY_FORM: AnnouncementFormValues = {
  title: "",
  content: "",
  type: "information",
  priority: TYPE_PRIORITY.information,
  imageUrl: "",
  publishMode: "now",
  startDate: "",
  endDate: "",
  targetType: "all",
  targetCompanyNames: [],
  targetRoles: [],
  targetUserIds: [],
};

export function tsToLocalInput(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToTs(v: string): number | undefined {
  if (!v) return undefined;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? undefined : t;
}

export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Administrateurs" },
  { value: "moderator", label: "Modérateurs" },
  { value: "user", label: "Utilisateurs (clients)" },
  { value: "supplier", label: "Fournisseurs" },
  { value: "expert", label: "Experts" },
  { value: "client", label: "Clients Pro" },
];

interface Props {
  value: AnnouncementFormValues;
  onChange: (next: AnnouncementFormValues) => void;
  /** All users (used for company & user targeting). */
  users: { _id: string; name?: string; email?: string; company?: string }[];
  disabled?: boolean;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

/**
 * Announcement form — controlled. Fields: main info, publication schedule,
 * targeting. Used by AnnouncementEditor (create / edit / duplicate).
 */
export function AnnouncementForm({ value, onChange, users, disabled }: Props) {
  const set = (patch: Partial<AnnouncementFormValues>) => onChange({ ...value, ...patch });

  const companies = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of users) {
      const c = (u.company ?? "").trim();
      if (c && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        out.push(c);
      }
    }
    return out.sort((a, b) => a.localeCompare(b, "fr"));
  }, [users]);

  const toggle = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    <div className="space-y-5">
      {/* ── Informations principales ── */}
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3 w-3" /> Informations principales
        </p>

        <Field label="Titre de l'annonce" required>
          <Input
            value={value.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Ex. : Nouvelle fonctionnalité d'estimation disponible"
            maxLength={120}
            className="h-9 text-sm"
            disabled={disabled}
          />
        </Field>

        <Field label="Description / contenu" required>
          <Textarea
            value={value.content}
            onChange={(e) => set({ content: e.target.value })}
            placeholder="Décrivez le contenu de l'annonce…"
            rows={4}
            className="text-sm"
            disabled={disabled}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Type d'annonce" required>
            <Select
              value={value.type}
              onValueChange={(t) =>
                set({ type: t as AnnouncementType, priority: TYPE_PRIORITY[t as AnnouncementType] })
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ANNOUNCEMENT_TYPE_META[t].emoji} {ANNOUNCEMENT_TYPE_META[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Niveau de priorité" required>
            <Select
              value={String(value.priority)}
              onValueChange={(p) => set({ priority: Number(p) })}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    {p === 5 ? "🔴 Critique (5)" : p === 4 ? "🟠 Élevée (4)" : p === 3 ? "🟢 Normale (3)" : p === 2 ? "🟣 Faible (2)" : "🔵 Minimale (1)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Image ou icône optionnelle (URL)">
          <Input
            value={value.imageUrl}
            onChange={(e) => set({ imageUrl: e.target.value })}
            placeholder="https://…/image.png"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </Field>
      </div>

      {/* ── Publication ── */}
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="h-3 w-3" /> Publication
        </p>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "now", label: "Publier immédiatement" },
              { value: "scheduled", label: "Programmer" },
              { value: "draft", label: "Brouillon" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => set({ publishMode: opt.value })}
              className={cn(
                "rounded-xl border px-2 py-2 text-[11px] font-medium transition-all active:scale-95",
                value.publishMode === opt.value
                  ? "border-primary/50 bg-primary/10 text-primary shadow-sm"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {value.publishMode === "scheduled" && (
          <Field label="Date de début *">
            <Input
              type="datetime-local"
              value={value.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
              className="h-9 text-sm"
              disabled={disabled}
            />
          </Field>
        )}

        <Field label="Date d'expiration (optionnelle)">
          <Input
            type="datetime-local"
            value={value.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
            className="h-9 text-sm"
            disabled={disabled}
          />
        </Field>
        {value.publishMode !== "scheduled" && value.startDate && (
          <p className="text-[10px] text-muted-foreground/60">
            Date de début fixée : {new Date(value.startDate).toLocaleString("fr-FR")}
          </p>
        )}
      </div>

      {/* ── Ciblage ── */}
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Target className="h-3 w-3" /> Ciblage
        </p>

        <Field label="Destinataires">
          <Select
            value={value.targetType}
            onValueChange={(t) => set({ targetType: t as AnnouncementFormValues["targetType"] })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              <SelectItem value="role">Un rôle spécifique</SelectItem>
              <SelectItem value="company">Une / plusieurs sociétés</SelectItem>
              <SelectItem value="user">Un / plusieurs utilisateurs</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {value.targetType === "role" && (
          <div className="flex flex-wrap gap-1.5">
            {ROLE_OPTIONS.map((r) => (
              <Chip
                key={r.value}
                active={value.targetRoles.includes(r.value)}
                onClick={() => set({ targetRoles: toggle(value.targetRoles, r.value) })}
              >
                {r.label}
              </Chip>
            ))}
          </div>
        )}

        {value.targetType === "company" && (
          <div className="space-y-2">
            {companies.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60">
                Aucune société déclarée par les utilisateurs pour le moment.
              </p>
            ) : (
              <ScrollArea className="max-h-36 rounded-xl border border-border/50">
                <div className="space-y-1 p-2">
                  {companies.map((c) => (
                    <label
                      key={c}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={value.targetCompanyNames.includes(c)}
                        onCheckedChange={() =>
                          set({ targetCompanyNames: toggle(value.targetCompanyNames, c) })
                        }
                      />
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {c}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {value.targetType === "user" && (
          <div className="space-y-2">
            <ScrollArea className="max-h-40 rounded-xl border border-border/50">
              <div className="space-y-1 p-2">
                {users.length === 0 ? (
                  <p className="px-2 py-3 text-[11px] text-muted-foreground/60">
                    Aucun utilisateur enregistré.
                  </p>
                ) : (
                  users.map((u) => (
                    <label
                      key={u._id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={value.targetUserIds.includes(u._id)}
                        onCheckedChange={() =>
                          set({ targetUserIds: toggle(value.targetUserIds, u._id) })
                        }
                      />
                      <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{u.name || u.email || u._id}</span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
            <p className="text-[10px] text-muted-foreground/60">
              {value.targetUserIds.length} utilisateur(s) sélectionné(s).
            </p>
          </div>
        )}
      </div>

    </div>
  );
}