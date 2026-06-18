import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useTransition } from "react";

import { LangToggle } from "#/components/lang-toggle";
import { ThemeToggle } from "#/components/theme-toggle";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { getMessages } from "#/lib/i18n/messages";
import { normalizeLocale } from "#/lib/i18n/routing";
import { $unsubscribe } from "#/lib/subscribers.functions";

export const Route = createFileRoute("/$locale/unsubscribe")({
  validateSearch: (search): { token?: string } => ({
    token: typeof search.token === "string" && search.token.length > 0 ? search.token : undefined,
  }),
  loader: ({ params }) => {
    const locale = normalizeLocale(params.locale);

    return {
      locale,
      messages: getMessages(locale),
    };
  },
  head: ({ params }) => {
    const locale = normalizeLocale(params.locale);
    const messages = getMessages(locale);

    return {
      meta: [{ title: messages.unsubscribe.title }],
    };
  },
  component: UnsubscribePage,
});

type UnsubscribeStatus = "idle" | "done" | "invalid";

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const { locale, messages } = Route.useLoaderData();
  const unsubscribe = useServerFn($unsubscribe);
  const [status, setStatus] = useState<UnsubscribeStatus>("idle");
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    if (!token) {
      return;
    }
    startTransition(() => {
      void unsubscribe({ data: { token } }).then((result) => {
        setStatus(result.ok ? "done" : "invalid");
      });
    });
  };

  const showConfirm = status === "idle" && Boolean(token);
  const body =
    status === "done"
      ? messages.unsubscribe.success
      : status === "invalid" || !token
        ? messages.unsubscribe.invalid
        : messages.unsubscribe.prompt;

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <LangToggle label={messages.nav.zh} locale={locale} route="unsubscribe" />
      </div>
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <CardTitle>{messages.unsubscribe.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-muted-foreground">{body}</p>
          {showConfirm ? (
            <Button disabled={pending} onClick={handleConfirm} variant="destructive">
              {pending ? messages.unsubscribe.pending : messages.unsubscribe.confirm}
            </Button>
          ) : (
            <Link className={buttonVariants()} params={{ locale }} to="/$locale">
              {messages.unsubscribe.home}
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
