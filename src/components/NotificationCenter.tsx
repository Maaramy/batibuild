import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  CalendarClock,
  Zap,
  CreditCard,
  LifeBuoy,
  FileText,
  TrendingUp,
  CheckCircle2,
  Info,
} from "lucide-react";

// ============================================================================
// CENTRE DE NOTIFICATIONS
//
// Cloche du tableau de bord : elle regroupe, en un seul endroit, les
// notifications enregistrées par la plateforme (rendez-vous et urgences reçus
// par un professionnel, devis, services, support, abonnement…) et renvoie vers
// la messagerie quand une demande attend une réponse.
//
// `extraUnread` permet d'ajouter les demandes non consultées qui ne génèrent
// pas encore de notification (devis / services en attente côté professionnel).
// ============================================================================

interface NotificationCenterProps {
  /** Demandes non consultées, comptées en plus des notifications non lues. */
  extraUnread?: number;
  /** Destination de repli (et du pied de panneau) : la messagerie. */
  fallbackPath: string;
  className?: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  expert_appointment: CalendarClock,
  expert_urgent: Zap,
  quote_request: FileText,
  quote_update: FileText,
  subscription: CreditCard,
  price_update: TrendingUp,
  report_ready: FileText,
  project_completed: CheckCircle2,
  support_ticket_created: LifeBuoy,
  support_reply: MessageSquare,
  support_ticket_resolved: CheckCircle2,
  system: Info,
};

const TYPE_STYLES: Record<string, string> = {
  expert_appointment: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  expert_urgent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  quote_request: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  quote_update: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  subscription: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  support_ticket_created: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  support_reply: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

/** « il y a 5 min », « hier », « 12 sept. » — compact pour mobile. */
function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "à l'instant";
  if (diff < hour) return `il y a ${Math.floor(diff / minute)} min`;
  if (diff < day) return `il y a ${Math.floor(diff / hour)} h`;
  if (diff < 2 * day) return "hier";
  if (diff < 7 * day) return `il y a ${Math.floor(diff / day)} j`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function NotificationCenter({
  extraUnread = 0,
  fallbackPath,
  className,
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const notifications = useQuery(api.notifications.getMyNotifications, {});
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const rows = notifications ?? [];
  const unreadNotifications = rows.filter((n) => !n.read).length;
  const badge = unreadNotifications + extraUnread;

  const open = (notification: (typeof rows)[number]) => {
    if (!notification.read) {
      markAsRead({ notificationId: notification._id }).catch(() => {
        /* le marquage est best-effort : la navigation reste prioritaire */
      });
    }
    navigate(notification.link || fallbackPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            badge > 0 ? `${badge} notification(s) non lue(s)` : "Centre de notifications"
          }
          className={
            className ?? "h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 relative cursor-pointer"
          }
        >
          <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] sm:text-[9px] font-bold text-white animate-in zoom-in-50">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-1.5rem)] max-w-sm p-0 overflow-hidden"
      >
        {/* En-tête */}
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight">Centre de notifications</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {unreadNotifications > 0
                ? `${unreadNotifications} non lue${unreadNotifications > 1 ? "s" : ""}`
                : "Vous êtes à jour"}
            </p>
          </div>
          {unreadNotifications > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-[10px] text-muted-foreground"
              onClick={() => markAllAsRead({})}
            >
              <CheckCheck className="h-3 w-3" />
              Tout lire
            </Button>
          )}
        </div>

        {/* Liste */}
        <div className="max-h-[58vh] overflow-y-auto overscroll-contain">
          {notifications === undefined ? (
            <p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
              Chargement…
            </p>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-7 w-7 text-muted-foreground/25" />
              <p className="text-xs font-medium text-muted-foreground">
                Aucune notification
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Les demandes de rendez-vous, les urgences et les réponses reçues
                apparaîtront ici.
              </p>
            </div>
          ) : (
            rows.slice(0, 25).map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? Info;
              const iconCls =
                TYPE_STYLES[notification.type] ?? "bg-muted/50 text-muted-foreground";
              return (
                <button
                  key={notification._id}
                  onClick={() => open(notification)}
                  className={`flex w-full cursor-pointer items-start gap-2.5 border-b border-border/20 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/40 ${
                    notification.read ? "" : "bg-primary/[0.03]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconCls}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">
                      {notification.message}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-muted-foreground/70">
                      {relativeDate(notification.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Pied */}
        <div className="border-t border-border/40 p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-[11px]"
            onClick={() => navigate(fallbackPath)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ouvrir ma messagerie
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationCenter;
