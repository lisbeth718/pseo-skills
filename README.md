# pSEO + SEO Skills for AI Coding Assistants

A complete set of skills for implementing programmatic SEO (pSEO) at scale, plus general SEO skills for multilingual sites, migrations, log analysis, regression checks and content pruning. Works with Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, OpenAI Codex, Kiro, Aider, Zed, Devin, and any LLM-powered coding assistant that accepts Agent Skills or custom instructions. Designed for 1000+ page sites with built-in quality safeguards, memory management, and alignment with Google's current spam policies (scaled content abuse, doorway abuse, site reputation) and optional visibility for non-Google AI agents.

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
| **pseo-performance** | Optimize builds, Core Web Vitals, memory, and gradual rollout |
| **pseo-llm-visibility** | Visibility for non-Google AI agents: llms.txt, AI crawler controls, entity clarity (Google Search ignores llms.txt) |
| **pseo-quality-guard** | Validate against thin content, duplicates, cannibalization, and scaled content abuse |
| **gsc** | Post-launch monitoring: pull Search Console data, inspect URLs, manage sitemaps, BigQuery bulk export for big sites (self-contained scripts) |
| **pseo-scale** | Architect for 10K-100K+ pages: database layer, data sufficiency gating, incremental validation, crawl budget, CDN |
| **pseo-orchestrate** | Coordinate all skills in the correct dependency order |

### General SEO skills

Usable on any site, pSEO or not. Most also slot into the pipeline below.

| Skill | Purpose |
|-------|---------|
| **seo-i18n** | Multilingual and multi-regional SEO: URL structure, hreflang, localized metadata and slugs, `[lang]` routing |
| **seo-migration** | SEO-safe migrations: redirect maps, domain moves, replatforms, Change of Address, monitoring and rollback |
| **seo-log-analysis** | Server and CDN log analysis: crawl waste, orphaned pages, time to first crawl, Googlebot latency, AI bot traffic |
| **seo-regression-guard** | Pre-deploy and post-deploy SEO regression checks against a baseline, no CI needed (ships `scripts/`) |
| **seo-content-refresh** | Content decay and pruning: classify pages by trend, refresh, consolidate, noindex or remove |

Where they fit:
- **seo-i18n**: run alongside `pseo-metadata` and `pseo-linking` when the site is multilingual.
- **seo-regression-guard**: run before and after each deploy.
- **seo-log-analysis** and **seo-content-refresh**: run after launch, together with `gsc` (monthly or quarterly).
- **seo-migration**: standalone, whenever URLs, domains or the stack change.

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
seo-regression-guard   <-- before deploy (baseline + check)
    |
    v
(deploy, submit sitemap)
    |
    v
seo-regression-guard   <-- after deploy (live check)
    |
    v
gsc (10)               <-- post-launch monitoring, recurring
    |
    v
seo-log-analysis, seo-content-refresh   <-- recurring, after launch

seo-i18n: alongside pseo-metadata / pseo-linking (multilingual sites)
seo-migration: standalone
```

## Installation

Each skill lives in its own folder in `skills/` (a `SKILL.md`, plus `references/` or `scripts/` where present). Skills follow the open [Agent Skills](https://agentskills.io) format (a folder with `SKILL.md`), so tools that support it can use the folders as-is. Copy whole folders, not just `SKILL.md`: concatenating files loses `references/` and `scripts/`.

Paths below were checked against each tool's docs on 2026-10-28. Where a path is not listed, check your tool's docs.

| Tool | Skills (copy whole folders) | Rules / instructions fallback |
|------|-----------------------------|-------------------------------|
| Claude Code | `.claude/skills/<name>/` (project) or `~/.claude/skills/<name>/` (personal) | `CLAUDE.md` |
| OpenAI Codex | `.agents/skills/<name>/` (repo) or `~/.agents/skills/<name>/` (user) | `AGENTS.md`: default cap is 32 KiB (`project_doc_max_bytes`), so do not concatenate skills into it; add a pointer line to the skill folders instead |
| Cursor | `.cursor/skills/`, `.agents/skills/` (project), `~/.cursor/skills/`, `~/.agents/skills/` (user); also reads `.claude/skills/` and `.codex/skills/` | `.cursor/rules/*.mdc` with frontmatter `description`, `globs`, `alwaysApply` (a plain `.md` there is ignored); `AGENTS.md` is supported. Check Cursor's docs for the legacy `.cursorrules` |
| GitHub Copilot | `.github/skills/`, `.claude/skills/` or `.agents/skills/` (project); `~/.copilot/skills/` or `~/.agents/skills/` (personal) | `.github/instructions/*.instructions.md` with `applyTo` frontmatter, `.github/copilot-instructions.md`, `AGENTS.md` |
| Windsurf / Devin | Check your tool's docs for the skills path | `.devin/rules/*.md` (preferred), `.windsurf/rules/*.md` (fallback), 12,000 characters per file; `AGENTS.md`; legacy `.windsurfrules` still read; `AGENTS.md` in any directory (no limit stated). Devin AGENTS.md limits not verified, check the docs |
| Cline | Check your tool's docs | `.clinerules/` or `.cline/rules/` directory; also reads `AGENTS.md` |
| Kiro (Amazon Q Developer users: check the migration guide in Kiro's docs) | Kiro supports Agent Skills; check its docs for the path | `.kiro/steering/` (workspace) or `~/.kiro/steering/` (global); reads `AGENTS.md` |
| Aider | n/a | `aider --read skills/pseo-data/SKILL.md` (or `read:` in `.aider.conf.yml`) |
| Zed | n/a | `.rules` in the project root; Zed also reads `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` (first match wins) |
| Continue, JetBrains Junie, other | Check your tool's docs | Feed `SKILL.md` files as custom instructions or system prompts |

When a tool only takes rule files, add one skill per file (not one concatenated file) and keep `references/` next to it. The `gsc` skill also ships TypeScript scripts: run `npm --prefix skills/gsc/scripts install` once (or the same against the folder you copied it to). `seo-regression-guard` ships a `scripts/` folder as well; copy it with the skill.

## Usage

Ask your AI assistant to run individual skills or the full pipeline:

- **Full pipeline**: ask for `pseo-orchestrate`, or run `/pseo-orchestrate full` (Claude Code)
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
- **Gradual rollout**: Rollout strategies from 100 to 100K pages
- **Content enrichment pipeline**: Structured data enrichment with optional LLM-assisted generation and human review sampling
- **Post-launch monitoring**: self-contained Search Console scripts (OAuth, search analytics, URL inspection, sitemaps), read-only scope by default
- **Framework-agnostic**: Next.js App Router by default, adaptable to Astro, Nuxt, Remix, SvelteKit. For Next.js use 16.4.x (>= 16.4.1 for security fixes)

## Sources

Current facts (Google policies, ranking updates, crawler limits, Next.js 16.4.x, AI crawlers) are documented with links in [docs/research-2026-10.md](docs/research-2026-10.md). Items marked UNVERIFIED there rest on secondary sources.

Last updated: 2026-10-28

## Author

Created by [mariluukkainen](https://mariluukkainen.com)
