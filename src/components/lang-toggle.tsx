import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LanguagesIcon } from "lucide-react";
import { useTransition } from "react";

import { Button } from "#/components/ui/button";
import { $setPreferredLocale } from "#/lib/i18n/locale.functions";
import type { Locale } from "#/lib/i18n/routing";

interface LangToggleProps {
  locale: Locale;
  route: "home" | "unsubscribe";
  label: string;
}

export function LangToggle({ locale, route, label }: LangToggleProps) {
  const navigate = useNavigate();
  const setPreferredLocale = useServerFn($setPreferredLocale);
  const [isPending, startTransition] = useTransition();
  const nextLocale: Locale = locale === "zh" ? "en" : "zh";

  const switchLocale = () => {
    startTransition(() => {
      void setPreferredLocale({ data: { locale: nextLocale } }).then(() => {
        void navigate({
          to: route === "home" ? "/$locale" : "/$locale/unsubscribe",
          params: { locale: nextLocale },
        });
      });
    });
  };

  return (
    <Button
      aria-label={label}
      disabled={isPending}
      onClick={switchLocale}
      title={label}
      variant="ghost"
    >
      <LanguagesIcon aria-hidden data-icon="inline-start" size={16} />
    </Button>
  );
}
