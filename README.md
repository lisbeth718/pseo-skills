# pSEO Skills for AI Coding Assistants

A complete set of skills for implementing programmatic SEO (pSEO) at scale. Works with Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, OpenAI Codex CLI, Aider, Continue, Amazon Q, Zed AI, Cody, Junie, Devin, and any LLM-powered coding assistant. Designed for 1000+ page sites with built-in quality safeguards, memory management, and alignment with Google's current spam policies (scaled content abuse, doorway abuse, site reputation) and optional visibility for non-Google AI agents.

## Skills

| Skill | Purpose |
|-------|---------|
| **pseo-discovery** | Analyze codebase and business context to find pSEO opportunities |
| **pseo-audit** | Audit codebase readiness for pSEO at scale (read-only) |
| **pseo-data** | Design the structured data architecture powering all pages |
| **pseo-templates** | Build page templates with unique, intent-matched content |
| **pseo-metadata** | Implement dynamic title, description, canonical, OG, and Twitter tags |
| **pseo-schema** | Add JSON-LD structured data for features Google still supports (Article, Breadcrumb, Product, etc.) |
| **pseo-linking** | Build internal linking: hub-spoke, breadcrumbs, related pages, sitemap, redirects |
| **pseo-performance** | Optimize builds, Core Web Vitals, memory, and publication velocity |
| **pseo-llm-visibility** | Visibility for non-Google AI agents: llms.txt, AI crawler controls, entity clarity (Google Search ignores llms.txt) |
| **pseo-quality-guard** | Validate against thin content, duplicates, cannibalization, and scaled content abuse |
| **gsc** | Post-launch monitoring: pull Search Console data, inspect URLs, manage sitemaps (self-contained scripts) |
| **pseo-scale** | Architect for 10K-100K+ pages: database layer, data sufficiency gating, incremental validation, crawl budget, CDN |
| **pseo-orchestrate** | Coordinate all skills in the correct dependency order |

## Pipeline

```
pseo-discovery (0)
    |
    v
pseo-audit (1)
    |
    v
pseo-scale (1.5)       <-- conditional: only if 10K+ pages
    |
    v
pseo-data (2)
    |
    +---------------+
    v               v
pseo-templates (3)  pseo-linking (4)
    |               |
    +-------+-------+
            |
    +-------+-------+
    v               v
pseo-metadata (5)   pseo-schema (6)
    |               |
    +-------+-------+
            |
    +-------+-------+
    v               v
pseo-performance    pseo-llm-visibility
    (7)             (8)
    |               |
    +-------+-------+
            v
pseo-quality-guard (9)
    |
    v
(deploy, submit sitemap)
    |
    v
gsc (10)               <-- post-launch monitoring, recurring
```

## Installation

Each skill lives in its own folder in `skills/` (a `SKILL.md`, plus `references/` or `scripts/` where present). Copy to your AI assistant's custom instructions location:

| Assistant | Copy to |
|-----------|---------|
| Claude Code | Copy whole skill folders to `.claude/skills/<skill-name>/` (including `references/` and `scripts/`) |
| Cursor | `.cursor/rules/` (rename to `.mdc`) or `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` (concatenate) |
| Windsurf | `.windsurf/rules/` or `.windsurfrules` |
| Cline | `.clinerules` or `.cline/rules/` |
| OpenAI Codex CLI | `AGENTS.md` (concatenate) |
| Aider | Pass with `--read` flag (e.g. `--read skills/SKILL.md`) |
| Continue | `.continue/rules/` |
| Amazon Q Developer | `.amazonq/rules/` |
| Zed AI | `.zed/rules/` or Zed assistant settings |
| Sourcegraph Cody | `.cody/instructions.md` (concatenate) |
| JetBrains Junie | `.junie/guidelines.md` |
| Devin | `devin.md` or knowledge base |
| Other | Feed as system prompts or custom instructions |

The skills are plain markdown and work with any assistant that accepts custom instructions. The `gsc` skill also ships TypeScript scripts: run `npm install` once in `skills/gsc/scripts/` (copy that folder too if your assistant needs a flat file).

## Usage

Ask your AI assistant to run individual skills or the full pipeline:

- **Full pipeline**: "Run the pseo-orchestrate skill with full pipeline"
- **Discovery only**: "Run pseo-discovery to find pSEO opportunities"
- **Single skill**: "Run pseo-data to design the data architecture" or "Run pseo-quality-guard to check for abuse patterns"

The orchestrate skill handles dependency ordering automatically. For manual execution, follow the pipeline order shown above.

## Key Features

- **Scales to 100K+ pages**: Database-backed data layer, data sufficiency gating, incremental validation, CDN/edge delivery, crawl budget management
- **Two-tier data architecture** for memory safety (PageIndex vs BaseSEOContent), cursor-based iteration at scale
- **Data sufficiency gating**: Prevents thin page generation before build time - only pages with enough data get created
- **Google policy alignment**: scaled content abuse and doorway abuse checks, E-E-A-T and Needs Met signals, YMYL risk assessment, no reliance on retired rich results (FAQ, HowTo)
- **LLM visibility**: llms.txt and AI crawler configuration for non-Google agents (Google Search ignores llms.txt and gives no special treatment to chunked or rewritten content), entity clarity
- **Scalable similarity detection**: MinHash/LSH and SimHash instead of O(n^2) pairwise comparison
- **Incremental validation**: Delta-only quality checks for fast iteration at scale, with periodic full scans
- **Publication velocity controls**: Gradual rollout strategies from 100 to 100K pages
- **Content enrichment pipeline**: Structured data enrichment with optional LLM-assisted generation and human review sampling
- **Post-launch monitoring**: self-contained Search Console scripts (OAuth, search analytics, URL inspection, sitemaps), read-only scope by default
- **Framework-agnostic**: Next.js App Router by default, adaptable to Astro, Nuxt, Remix, SvelteKit

## Sources

Current facts (Google policies, ranking updates, crawler limits, Next.js 16.4, AI crawlers) are documented with links in [docs/research-2026-10.md](docs/research-2026-10.md). Items marked UNVERIFIED there rest on secondary sources.

Last updated: 2026-10-12

## Author

Created by [mariluukkainen](https://mariluukkainen.com)
