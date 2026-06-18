import { createFileRoute, Link } from "@tanstack/react-router";

import { LangToggle } from "#/components/lang-toggle";
import { ThemeToggle } from "#/components/theme-toggle";
import { buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { getMessages } from "#/lib/i18n/messages";
import { normalizeLocale } from "#/lib/i18n/routing";

export const Route = createFileRoute("/$locale/unsubscribe")({
  validateSearch: (search) => ({
    ok: search.ok === true || search.ok === "true" ? true : undefined,
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

function UnsubscribePage() {
  const { ok } = Route.useSearch();
  const { locale, messages } = Route.useLoaderData();

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
          <p className="text-muted-foreground">
            {ok ? messages.unsubscribe.success : messages.unsubscribe.invalid}
          </p>
          <Link className={buttonVariants()} params={{ locale }} to="/$locale">
            {messages.unsubscribe.home}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
