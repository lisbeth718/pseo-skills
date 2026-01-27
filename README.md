# pSEO Skills for AI Coding Assistants

A complete set of skills for implementing programmatic SEO (pSEO) at scale. Works with Claude Code, Cursor, GitHub Copilot, Windsurf, and any LLM-powered coding assistant. Designed for 1000+ page sites with built-in quality safeguards, memory management, and compliance with Google's 2025 algorithm updates and LLM visibility optimization.

## Skills

| Skill | Purpose |
|-------|---------|
| **pseo-discovery** | Analyze codebase and business context to find pSEO opportunities |
| **pseo-audit** | Audit codebase readiness for pSEO at scale (read-only) |
| **pseo-data** | Design the structured data architecture powering all pages |
| **pseo-templates** | Build page templates with unique, intent-matched content |
| **pseo-metadata** | Implement dynamic title, description, canonical, OG, and Twitter tags |
| **pseo-schema** | Add JSON-LD structured data (Article, FAQ, Breadcrumb, Product, etc.) |
| **pseo-linking** | Build internal linking: hub-spoke, breadcrumbs, related pages, sitemap, redirects |
| **pseo-performance** | Optimize builds, Core Web Vitals, memory, and publication velocity |
| **pseo-llm-visibility** | Optimize for AI citation: llms.txt, AI crawlers, content chunking, entity optimization |
| **pseo-quality-guard** | Validate against thin content, duplicates, cannibalization, and scaled content abuse |
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
```

## Installation

Each skill is a self-contained markdown file in the `skills/` directory. Copy to your AI assistant's custom instructions location:

| Assistant | Copy to |
|-----------|---------|
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/rules/` (rename to `.mdc`) or `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` (concatenate) |
| Windsurf | `.windsurf/rules/` or `.windsurfrules` |
| Other | Feed as system prompts or custom instructions |

The skills are plain markdown and work with any assistant that accepts custom instructions.

## Usage

Ask your AI assistant to run individual skills or the full pipeline:

- **Full pipeline**: "Run the pseo-orchestrate skill with full pipeline"
- **Discovery only**: "Run pseo-discovery to find pSEO opportunities"
- **Single skill**: "Run pseo-data to design the data architecture" or "Run pseo-quality-guard to check for abuse patterns"

The orchestrate skill handles dependency ordering automatically. For manual execution, follow the pipeline order shown above.

## Key Features

- **Scales to 100K+ pages**: Database-backed data layer, data sufficiency gating, incremental validation, CDN/edge delivery, crawl budget management
- **Two-tier data architecture** for memory safety (PageIndex vs BaseSEOContent), cursor-based iteration at scale
- **Data sufficiency gating**: Prevents thin page generation before build time — only pages with enough data get created
- **Google 2025 compliance**: E-E-A-T signals, Needs Met enforcement, scaled content abuse detection, YMYL risk assessment
- **LLM visibility**: llms.txt, AI crawler configuration, answer capsule pattern (134-167 words), entity optimization
- **Scalable similarity detection**: MinHash/LSH and SimHash instead of O(n^2) pairwise comparison
- **Incremental validation**: Delta-only quality checks for fast iteration at scale, with periodic full scans
- **Publication velocity controls**: Gradual rollout strategies from 100 to 100K pages
- **Content enrichment pipeline**: Structured data enrichment with optional LLM-assisted generation and human review sampling
- **Framework-agnostic**: Next.js App Router by default, adaptable to Astro, Nuxt, Remix, SvelteKit

## Author

Created by [mariluukkainen](https://mariluukkainen.com)
