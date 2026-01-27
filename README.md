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
| **pseo-orchestrate** | Coordinate all skills in the correct dependency order |

## Pipeline

```
pseo-discovery (0)
    |
    v
pseo-audit (1)
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

Each skill is a self-contained markdown file with optional `references/` subfolder. Install based on your AI assistant:

### Claude Code

Copy to `.claude/skills/`:

```
.claude/
  skills/
    pseo-discovery/
    pseo-audit/
    pseo-data/
    pseo-templates/
    pseo-metadata/
    pseo-schema/
    pseo-linking/
    pseo-performance/
    pseo-llm-visibility/
    pseo-quality-guard/
    pseo-orchestrate/
```

### Cursor

Copy to `.cursor/rules/` as `.mdc` files:

```
.cursor/
  rules/
    pseo-discovery.mdc
    pseo-audit.mdc
    pseo-data.mdc
    pseo-templates.mdc
    pseo-metadata.mdc
    pseo-schema.mdc
    pseo-linking.mdc
    pseo-performance.mdc
    pseo-llm-visibility.mdc
    pseo-quality-guard.mdc
    pseo-orchestrate.mdc
```

Or add to a single `.cursorrules` file in your project root.

### GitHub Copilot

Concatenate relevant skills into `.github/copilot-instructions.md`:

```
.github/
  copilot-instructions.md
```

### Windsurf

Copy to `.windsurfrules` or `.windsurf/rules/`:

```
.windsurf/
  rules/
    pseo-discovery.md
    pseo-audit.md
    ...
```

### Other assistants

The skills are plain markdown. Feed them as system prompts, context, or custom instructions in whatever format your assistant supports.

## Usage

Ask your AI assistant to run individual skills or the full pipeline:

- **Full pipeline**: "Run the pseo-orchestrate skill with full pipeline"
- **Discovery only**: "Run pseo-discovery to find pSEO opportunities"
- **Single skill**: "Run pseo-data to design the data architecture" or "Run pseo-quality-guard to check for abuse patterns"

The orchestrate skill handles dependency ordering automatically. For manual execution, follow the pipeline order shown above.

## Key Features

- **Two-tier data architecture** for memory safety at scale (PageIndex vs BaseSEOContent)
- **Google 2025 compliance**: E-E-A-T signals, Needs Met enforcement, scaled content abuse detection, YMYL risk assessment
- **LLM visibility**: llms.txt, AI crawler configuration, answer capsule pattern (134-167 words), entity optimization
- **Scalable similarity detection**: MinHash/LSH and SimHash instead of O(n^2) pairwise comparison
- **Publication velocity controls**: Gradual rollout strategies to avoid spam signals
- **Framework-agnostic**: Next.js App Router by default, adaptable to Astro, Nuxt, Remix, SvelteKit

## Author

Created by [mariluukkainen](https://mariluukkainen.com)
