import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownIcon } from "lucide-react";

import { CodexLogo } from "#/components/codex-logo";
import { LangToggle } from "#/components/lang-toggle";
import { SubscribeForm } from "#/components/subscribe-form";
import { ThemeToggle } from "#/components/theme-toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { homeDataQueryOptions } from "#/lib/app-data.queries";
import { getMessages } from "#/lib/i18n/messages";
import { normalizeLocale } from "#/lib/i18n/routing";
import { formatNumber, formatUnixTime } from "#/lib/time";

export const Route = createFileRoute("/$locale/")({
  loader: async ({ context, params }) => {
    const locale = normalizeLocale(params.locale);
    await context.queryClient.ensureQueryData(homeDataQueryOptions(locale));

    return {
      locale,
      messages: getMessages(locale),
    };
  },
  head: ({ params }) => {
    const locale = normalizeLocale(params.locale);
    const messages = getMessages(locale);

    return {
      meta: [
        { title: messages.meta.title },
        { name: "description", content: messages.meta.description },
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  const { locale, messages } = Route.useLoaderData();
  const homeQuery = useSuspenseQuery(homeDataQueryOptions(locale));
  const data = homeQuery.data;
  const latestResetLabel = data.latestReset
    ? formatUnixTime(data.latestReset.grantedAt, locale)
    : messages.hero.noReset;

  return (
    <main className="min-h-screen overflow-hidden bg-background pb-40 text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="border-b border-border/80 bg-background/95">
        <div className="container mx-auto flex h-16 w-full items-center justify-between gap-4 px-5">
          <Link className="flex min-w-0 items-center gap-3" params={{ locale }} to="/$locale">
            <div className="flex items-center gap-2 text-xl leading-none text-primary">
              <CodexLogo className="size-5 text-xl" />
              <span>Reset Monitor</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LangToggle label={messages.nav.zh} locale={locale} route="home" />
          </div>
        </div>
      </header>

      <section className="relative container mx-auto border-b border-border/80 bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_50%_42%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_38%)]" />
        <div className="relative mx-auto flex min-h-[calc(100svh-17rem)] w-full max-w-360 flex-col items-center justify-center px-5 py-20 text-center">
          <p className="mb-10 inline-flex items-center gap-3 rounded-[3px] border border-border bg-card/30 px-4 py-2 font-mono text-[10px] leading-none tracking-[0.16em] text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="truncate">{messages.hero.eyebrow}</span>
          </p>
          <h1 className="max-w-6xl font-sans text-4xl font-semibold tracking-normal text-balance sm:text-6xl">
            <span>{messages.hero.titlePrefix} </span>
            <span className="font-mono text-primary">{messages.hero.titleAccent}</span>
            <span> {messages.hero.titleSuffix}</span>
          </h1>
          <p className="mt-8 max-w-2xl font-mono text-sm leading-7 text-balance text-muted-foreground">
            {messages.hero.description}
          </p>

          <div className="mt-11 w-full max-w-3xl" id="subscribe">
            <SubscribeForm locale={locale} messages={messages.subscribe} />
          </div>
          <p className="mt-6 max-w-full font-mono text-[11px] leading-6 text-muted-foreground">
            {formatNumber(data.subscriberCount, locale)} {messages.hero.subscribed}
            <span className="mx-2 text-border">•</span>
            {messages.hero.latestReset}: {latestResetLabel}
          </p>
        </div>
      </section>

      <section className="border-b border-border/80 bg-card/15" id="history">
        <div className="overflow-x-auto">
          <div className="container mx-auto flex">
            <div className="flex flex-col justify-center border-r border-border/80 px-5 py-8 sm:px-8 lg:px-10">
              <p className="font-mono text-sm tracking-[0.18em] text-muted-foreground uppercase">
                {messages.history.subTitle}
              </p>
            </div>
            <div className="flex flex-1">
              {data.detections.length > 0 ? (
                data.detections.map((credit, index) => (
                  <article
                    className="relative flex-1 border-r border-border/80 bg-background/40 px-5 py-7 transition hover:bg-background/80 sm:px-7"
                    key={credit.id}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                        0{index + 1}
                      </span>
                      <span className="border border-primary bg-primary/6 px-2 py-1 font-mono text-xs text-primary">
                        {messages.history.reset}
                      </span>
                    </div>
                    <time className="mt-6 block font-mono text-xl leading-none font-semibold">
                      {formatUnixTime(credit.grantedAt, locale)}
                    </time>
                  </article>
                ))
              ) : (
                <div className="flex items-center border-r border-border/80 px-5 py-8 text-muted-foreground sm:px-8">
                  {messages.history.empty}
                </div>
              )}
            </div>
            <a
              className="flex items-center justify-center px-5 py-8 font-mono text-sm text-muted-foreground transition hover:bg-background/70 hover:text-primary sm:px-8"
              href="#history-list"
            >
              <span>{messages.history.viewFull}</span>
              <ArrowDownIcon className="ml-2" size={14} />
            </a>
          </div>
        </div>
      </section>

      <section className="container mx-auto mt-20 px-5" id="history-list">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="mt-3 font-sans text-2xl leading-none">{messages.history.title}</h2>
          </div>
        </div>

        {data.history.length === 0 ? (
          <div className="border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
            {messages.history.empty}
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{messages.history.grantedAt}</TableHead>
                  <TableHead>{messages.history.expiresAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.history.map((credit, index) => (
                  <TableRow key={credit.id}>
                    <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-mono">
                      {formatUnixTime(credit.grantedAt, locale)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatUnixTime(credit.expiresAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-2 w-full text-center text-sm text-foreground/70">
              {messages.history.limit}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
