import type { ResetCredit } from "#/lib/db/schema";
import type { Locale } from "#/lib/i18n/routing";
import { formatUnixTime } from "#/lib/time";

interface ResetEmailInput {
  appUrl: string;
  locale: Locale;
  credit: ResetCredit;
  unsubscribeUrl: string;
}

export function resetEmailSubject(locale: Locale) {
  return locale === "en" ? "New Codex Reset Credit" : "Codex 新增重置卡";
}

export function resetEmailMarkdown({ locale, credit, unsubscribeUrl, appUrl }: ResetEmailInput) {
  const grantedAt = formatUnixTime(credit.grantedAt, locale);
  const expiresAt = formatUnixTime(credit.expiresAt, locale);

  if (locale === "en") {
    return `---
preheader: "New Codex reset credit detected"
theme: dark
---

::: header
# Codex Reset Monitor
:::

# New Codex Reset Credit

A new reset credit is available. You can redeem it yourself when needed.

| Field | Value |
| --- | --- |
| Credit | ${credit.title} |
| Granted at | ${grantedAt} |
| Expires at | ${expiresAt} |
| Status | ${credit.status} |

[View reset history](${appUrl})

::: footer
Codex Reset Monitor | [Unsubscribe](${unsubscribeUrl})
:::
`;
  }

  return `---
preheader: "Codex 新增重置卡提醒"
theme: dark
---

::: header
# Codex 额度监控
:::

# Codex 新增重置卡

监测到一张新的重置卡，你可以在需要时自行使用。

| 字段 | 值 |
| --- | --- |
| 重置卡 | ${credit.title} |
| 发放时间 | ${grantedAt} |
| 过期时间 | ${expiresAt} |
| 状态 | ${credit.status} |

[查看历史记录](${appUrl})

::: footer
Codex 额度监控 | [退订](${unsubscribeUrl})
:::
`;
}
