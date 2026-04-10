---
description: Manual SEO/GEO audit for existing pages or a live site. Runs Technical SEO (9 categories), GEO Readiness Score (0-100), E-E-A-T, AI crawler access, and SSR compliance checks. Pass an optional URL for live site comparison. Usage: /team:seo-audit [optional URL or file path]
agent: seo-auditor
subtask: true
---

Load the `project-stack` skill first to understand the frontend framework, template structure, and SSR setup.

A comprehensive SEO/GEO audit has been requested:

"$ARGUMENTS"

---

## Execution Steps

### Step 1 — Determine Scope

Parse the argument to identify scope:

- **URL provided** (starts with http/https) → run both source code analysis AND live URL analysis
- **File path provided** → analyze that specific file or directory only
- **No argument** → analyze Pages/ and Layouts/ files changed in the latest commit:

```bash
git diff origin/main...HEAD --name-only | grep -E "(Pages/|Layouts/|layouts/|pages/)"
```

If no files are found in the diff → scan the full Pages/ directory:

```bash
find resources/js/Pages -name "*.vue" | head -20
find resources/js/Layouts -name "*.vue" 2>/dev/null
```

### Step 2 — Understand the Project Structure

```bash
# SSR configuration
cat vite.config.ts 2>/dev/null | grep -A5 "ssr"
cat config/inertia.php 2>/dev/null | grep -A5 "ssr"

# robots.txt
cat public/robots.txt 2>/dev/null || echo "robots.txt not found"

# llms.txt
ls public/llms.txt 2>/dev/null && cat public/llms.txt || echo "llms.txt not found"

# Sample layout to understand meta structure
head -100 resources/js/Layouts/AppLayout.vue 2>/dev/null || \
head -100 resources/js/Layouts/AuthLayout.vue 2>/dev/null || \
find resources/js -name "*.vue" -path "*/Layouts/*" | head -1 | xargs head -80
```

### Step 3 — Run the Full Analysis

**Source Code Analysis (always):**

Apply the complete SEO/GEO checklist to every target file:

**Section 1 — Technical SEO:**
- Meta & Head (title, description, canonical, OG, Twitter Card, robots)
- Semantic HTML (single h1, hierarchy, semantic elements, alt tags, hrefs)
- Structured Data / JSON-LD (page-appropriate schema, NO deprecated schemas)
- SSR/JS Rendering (meta tags server-side, window/document inside onMounted)
- Core Web Vitals signals (LCP eager loading, INP event handlers, CLS image dimensions)
- AI Crawler access (robots.txt for 9 crawlers)
- Security headers (HTTPS, CSP, HSTS, X-Frame-Options)
- llms.txt presence

**Section 2 — GEO/AEO (score 0-100):**
- Citability (25pts): 134-167 word self-contained blocks, direct answer in first 40-60 words
- Readability (20pts): question-based headings, short paragraphs, tables, semantic lists
- Multi-modal (15pts): text+image pairing, video/infographic presence
- Authority/E-E-A-T (20pts): author credentials, publication date, source citations, first-hand experience
- Technical (20pts): AI crawler permissions, llms.txt, SSR correctness

**Live URL Analysis (only when URL is provided):**

Use `web_fetch` to retrieve the page and compare against source code findings:
- Does source have meta tags that are missing in the live page? → SSR issue
- Is the canonical URL correct in the live rendered HTML?
- Is JSON-LD rendered and visible in the page source?
- Does live robots.txt block AI crawlers?
- Is HTTPS enforced?

### Step 4 — Produce the Unified Report

```markdown
# SEO/GEO Audit Report
**Date:** [date]
**Scope:** [files analyzed or URL]
**Overall Status:** 🔴 Critical | 🟠 High Priority | 🟡 Needs Improvement | ✅ Clean

---

## SECTION 1 — TECHNICAL SEO

### 🔴 Critical (Fix Immediately)
[Findings that block merge]

### 🟠 High Priority (Fix Before Merge)
[Important gaps]

### 🟡 Medium Priority (Does Not Block Merge)
[Improvement opportunities]

### 🟢 Suggestions
[Best practice opportunities]

### ✅ Passed Checks
[Items with no issues]

---

## SECTION 2 — GEO/AEO READINESS

**GEO Readiness Score: [TOTAL]/100**

| Dimension | Score | Weight | Status |
|---|---|---|---|
| Citability | [X]/25 | 25% | ✅/⚠️/❌ |
| Structural Readability | [X]/20 | 20% | ✅/⚠️/❌ |
| Multi-modal Content | [X]/15 | 15% | ✅/⚠️/❌ |
| Authority & E-E-A-T | [X]/20 | 20% | ✅/⚠️/❌ |
| Technical Accessibility | [X]/20 | 20% | ✅/⚠️/❌ |

### AI Search Engine Compatibility
| Platform | Status | Note |
|---|---|---|
| Google AI Overviews | ✅/⚠️/❌ | [detail] |
| ChatGPT | ✅/⚠️/❌ | [detail] |
| Perplexity | ✅/⚠️/❌ | [detail] |
| Bing Copilot | ✅/⚠️/❌ | [detail] |

### High Priority GEO Findings
[GEO merge-blocking findings]

### Medium Priority GEO Findings
[GEO improvement opportunities]

---

## SECTION 3 — CODE vs LIVE COMPARISON
*(Only when URL is provided)*

### SSR Mismatches
[Items in code not appearing in live, or vice versa]

### robots.txt Status
[Live AI crawler status]

---

## Prioritized Fix List

1. [Most critical finding] — estimated effort: [S/M/L]
2. [Second most critical] — estimated effort: [S/M/L]
3. [Third most critical] — estimated effort: [S/M/L]
```

### Step 5 — Present Results to User

After delivering the report, offer next steps:

```
Would you like to fix any of these findings?
- Use /team:quick-fix for fast targeted corrections
- Use /team:task for a comprehensive SEO improvement sprint
- Need to create a llms.txt file? Use /team:task for that too
```

---

## Important Rules

- **Never recommend deprecated schemas:** FAQPage (gov/health only), HowTo, SpecialAnnouncement
- **Never use FID** — use INP (< 200ms target, replaced FID September 2024)
- **Every finding must reference file and line number**
- **For Inertia SSR stacks:** meta tags must be inside the `<Head>` component — flag any that are not
