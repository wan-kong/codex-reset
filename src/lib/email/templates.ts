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
  return locale === "en" ? "Codex quota has reset" : "Codex 额度已被重置";
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
# Codex Reset Records
:::

# Codex quota has reset

The monitor detected a new secondary reset window.

| Field | Value |
| --- | --- |
| Secondary reset_at | ${resetAt} |
| Requested at | ${requestedAt} |

[View reset history](${appUrl})

::: footer
Codex Reset Records | [Unsubscribe](${unsubscribeUrl})
:::
`;
  }

  return `---
preheader: "Codex 额度重置"
theme: dark
---

::: header
# Codex Reset Records
:::

# Codex 额度已被重置

监测服务检测到 secondary reset 窗口已经推进。

| 字段 | 值 |
| --- | --- |
| secondary reset_at | ${resetAt} |
| 请求时间 | ${requestedAt} |
| 计划 | ${snapshot.planType ?? "未知"} |

[查看历史记录](${appUrl})

::: footer
Codex Reset Records | [退订](${unsubscribeUrl})
:::
`;
}
