import type { UsageSnapshot } from "#/lib/db/schema";
import type { Locale } from "#/lib/i18n/routing";
import { formatUnixTime } from "#/lib/time";

interface ResetEmailInput {
  appUrl: string;
  locale: Locale;
  snapshot: UsageSnapshot;
  unsubscribeUrl: string;
}

export function resetEmailSubject(locale: Locale) {
  return locale === "en" ? "Codex Quota Has Reset" : "Codex 额度已重置";
}

export function resetEmailMarkdown({ locale, snapshot, unsubscribeUrl, appUrl }: ResetEmailInput) {
  const resetAt = formatUnixTime(snapshot.secondaryResetAt, locale);
  const requestedAt = formatUnixTime(snapshot.requestedAt, locale);

  if (locale === "en") {
    return `---
preheader: "Codex quota reset detected"
theme: dark
---

::: header
# Codex Reset Monitor
:::

# Codex Quota Has Reset

A new quota reset window has been detected.

| Field | Value |
| --- | --- |
| Reset time | ${resetAt} |
| Checked at | ${requestedAt} |
| Plan | ${snapshot.planType ?? "Unknown"} |

[View reset history](${appUrl})

::: footer
Codex Reset Monitor | [Unsubscribe](${unsubscribeUrl})
:::
`;
  }

  return `---
preheader: "Codex 额度重置提醒"
theme: dark
---

::: header
# Codex 额度监控
:::

# Codex 额度已重置

监测到新的额度重置窗口已生效。

| 字段 | 值 |
| --- | --- |
| 重置时间 | ${resetAt} |
| 检查时间 | ${requestedAt} |
| 套餐 | ${snapshot.planType ?? "未知"} |

[查看历史记录](${appUrl})

::: footer
Codex 额度监控 | [退订](${unsubscribeUrl})
:::
`;
}
