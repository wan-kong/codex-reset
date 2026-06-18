import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircleCheckIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "#/components/ui/button";
import { Confetti, type ConfettiRef } from "#/components/ui/confetti";
import { Input } from "#/components/ui/input";
import { homeDataQueryOptions } from "#/lib/app-data.queries";
import type { Messages } from "#/lib/i18n/messages";
import type { Locale } from "#/lib/i18n/routing";
import { $subscribe, type SubscribeState } from "#/lib/subscribers.functions";

interface SubscribeFormProps {
  locale: Locale;
  messages: Messages["subscribe"];
}

const initialState: SubscribeState = {};

export function SubscribeForm({ locale, messages }: SubscribeFormProps) {
  const queryClient = useQueryClient();
  const subscribe = useServerFn($subscribe);
  const [email, setEmail] = useState("");
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const confettiRef = useRef<ConfettiRef>(null);
  const message = state.status ? messages[state.status] : null;
  const isError =
    state.status === "duplicate" || state.status === "invalid" || state.status === "error";

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      confettiRef.current?.fire({});
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [state.status]);

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    startTransition(() => {
      void subscribe({ data: { email, locale } }).then((result) => {
        setState(result);
        if (result.status === "success") {
          void queryClient.invalidateQueries(homeDataQueryOptions(locale));
        }
      });
    });
  };

  if (state.status === "success") {
    return (
      <div className="relative mx-auto flex w-fit items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary/6 px-8 py-2 text-sm text-primary">
        <MessageCircleCheckIcon size={18} />
        <span className="ml-2 font-mono font-medium text-primary">{messages.success}</span>
        <span className="font-mono font-medium text-foreground">{email}</span>
        <Confetti className="absolute top-0 left-0 z-0 size-full" manualstart ref={confettiRef} />
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0"
      onSubmit={handleSubmit}
    >
      <div className="min-w-0 flex-1">
        <Input
          aria-label={messages.title}
          autoComplete="email"
          className="h-12 rounded-[3px] border-border bg-card/70 px-4 font-mono text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/20 sm:rounded-r-none"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder={messages.placeholder}
          required
          type="email"
          value={email}
        />
        {message ? (
          <p className={`mt-3 text-sm ${isError ? "text-destructive" : "text-primary"}`}>
            {message}
          </p>
        ) : null}
      </div>
      <Button
        className="h-12 rounded-[3px] bg-primary px-7 font-mono text-[11px] font-semibold tracking-[0.12em] text-primary-foreground uppercase hover:bg-primary/90 sm:rounded-l-none"
        disabled={pending}
        type="submit"
      >
        {messages.submit}
      </Button>
    </form>
  );
}
