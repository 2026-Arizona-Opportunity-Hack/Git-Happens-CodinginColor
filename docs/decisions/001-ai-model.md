---
title: The AI model, now and in a real deployment
status: accepted
date: 2026-11-14
covers:
  - src/lib/ai-draft.ts
---

# 001: The AI model, now and in a real deployment

We use `muse-spark` because the OHack gateway is the AI we have access to this weekend. It isn't what we'd ship for privacy and security reasons. The gateway is a third-party proxy that sees every prompt, and it forwards `muse-spark` requests to Meta's API as a "contributor" model. Our prompts include donor names, emails and gifts.

A real deployment should call [`@cf/zai-org/glm-5.3-flash`](https://developers.cloudflare.com/workers-ai/models/glm-5.3-flash/) on Cloudflare Workers AI through an `env.AI` binding instead. Donor data would then stay on the Cloudflare account that already runs the app and its database, and the `AI_API_KEY` secret would go away. On Nov 14 we gave both models, and four other Workers AI models, the same 7 questions with the real system prompt and seed data:

| | `muse-spark` (gateway) | `glm-5.3-flash` (Workers AI) |
|---|---|---|
| Correct answers and `::donor` / `::action` format | 7 of 7 | 7 of 7 |
| Average reply time | 10.6 s | 2.4 s |
| Cost per question | ~$0.0005 | ~$0.0003 |
| Repeated prompt served from cache | none | ~57% |

gpt-oss-120b, deepseek-v4.1-flash, gemma-4-26b and glm-4.7-flash each did worse on quality, cost or speed. glm-5.3-flash needs Workers Paid ($5/month). CIC's whole bill, including D1 and the Worker, would stay around $5 a month, and well under $20 even with heavy use. We'd add a per-user daily question limit at the same time, because Workers AI has no hard spend cap.
