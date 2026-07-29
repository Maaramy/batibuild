import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "icon" | "full" | "compact";
  className?: string;
}

export function LanguageSwitcher({ variant = "icon", className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();

  const switchLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language);

  if (variant === "full") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={cn(
              "px-2 py-1 text-xs rounded-md transition-colors",
              i18n.language === lang.code
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <span className="mr-1">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-xs font-medium",
            variant === "compact" ? "px-2" : "px-3",
            className
          )}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          {variant === "compact" ? (
            <span>{currentLang?.flag}</span>
          ) : (
            <span className="hidden sm:inline">{currentLang?.label}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[130px]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={cn(
              "cursor-pointer gap-2 text-xs",
              i18n.language === lang.code && "bg-primary/5 font-semibold text-primary"
            )}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
            {i18n.language === lang.code && (
              <span className="ml-auto text-[10px] opacity-60">
                {lang.dir === "rtl" ? "←" : "✓"}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
