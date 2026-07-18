# Agent Prompt — Niagraha Coming-Soon Page

Copy everything below the line into your AI coding agent (Claude Code, Cursor, etc.) along with the base HTML file and the issues doc.

---

## Context

I have a single-file HTML/CSS/JS "coming soon" landing page for **Niagraha**, a robotics education venture (acrylic robot kits + ROS/ROS2 courses, based in Indonesia). The page simulates an Ubuntu-style terminal boot sequence, themed with the **Catppuccin Frappé** palette, followed by a macOS-style dock with four clickable panels (About, Courses & Kits, Contact/Socials, System Info) and a fake email-subscribe prompt inside the terminal.

The base file is attached: `niagraha-coming-soon-base.html`.

A full list of known issues and edge cases is attached: `niagraha-landing-issues.md`. Work through it in priority order (🔴 blockers first, then 🟠, 🟡, ⚪).

## Target deployment: Vercel

This will be deployed on **Vercel**. Please structure the project accordingly:

- If the email-capture backend (issue #1) requires a serverless function, scaffold this as a minimal **Next.js (App Router) or Vite + Vercel Functions** project rather than keeping it as a single static HTML file — the current single-file version has no way to run server-side code.
- Serverless function should live at `/api/subscribe` (Next.js: `app/api/subscribe/route.ts`, or Vercel Functions: `api/subscribe.ts`).
- Any API keys (email service provider, database, etc.) must be read from **Vercel Environment Variables** — never hardcoded, never exposed to client-side JS.
- Preserve the existing visual design and animation exactly — do not rebuild it in a component framework unless necessary for the fix. If you do migrate it into React/Next components for maintainability, keep all class names, CSS custom properties, and animation timings identical so the visual output is unchanged. Show me a diff or screenshot comparison before/after if you restructure.
- Assume a custom domain (`niagraha.id`) will be attached to the Vercel project later — no code should hardcode `localhost` or assume a specific origin.

## What to do

1. Read `niagraha-landing-issues.md` in full before making changes.
2. Work through issues in priority order. For each one:
   - Implement the fix.
   - Note any product decisions you had to make (e.g. which email service to integrate) and flag them clearly rather than silently picking one — I'll confirm before you wire in real API keys/accounts.
3. For issue #1 (email capture), don't pick a specific email service provider without asking — propose 2-3 options (e.g. Resend, ConvertKit, a simple Supabase table) with a one-line tradeoff each, and wait for my choice before implementing.
4. Preserve all existing brand/design decisions unless an issue explicitly asks you to change them:
   - Catppuccin Frappé color variables (do not swap palettes).
   - The terminal boot sequence copy and pacing.
   - The dock's macOS-style magnification/bounce interaction.
   - No real Ubuntu/Apple/Canonical logos or icon assets — icons are custom SVG.
5. After implementing, list which issues from the tracker are now resolved vs. still open, and update `niagraha-landing-issues.md` accordingly (check off completed acceptance criteria).
6. Do not add analytics, tracking, or third-party scripts beyond what's listed in the issues doc without asking first.

## Constraints

- Keep the page fast and lightweight — this is a coming-soon page, not the full product. Avoid pulling in a heavy component library for what's currently ~800 lines of vanilla HTML/CSS/JS.
- Maintain accessibility fixes (issues #2, #3, #4) as first-class, not bolted on.
- Test at minimum: desktop Chrome, mobile Safari viewport size, and with JavaScript disabled.

## Deliverable

A Vercel-ready project (or confirmation that the existing static file already satisfies deploy requirements, if you determine a serverless function isn't strictly necessary and a third-party form service like Formspree covers issue #1 adequately — in which case explain that tradeoff to me before proceeding, since it's simpler but hands data to a third party).
