# Planet OCR — Business Plan

**Document version:** 1.0  
**Date:** June 2026  
**Status:** Strategic planning (pre-implementation)  
**Platform:** Planet OCR — AI-powered OCR advisory and multi-engine document intelligence API

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem & Market Opportunity](#2-problem--market-opportunity)
3. [Product Vision & Value Proposition](#3-product-vision--value-proposition)
4. [OCR Engine Catalog](#4-ocr-engine-catalog)
5. [Hardware & Compute Classification](#5-hardware--compute-classification)
6. [Capability & Usage Classification](#6-capability--usage-classification)
7. [Tier Architecture — Engine-to-Tier Mapping](#7-tier-architecture--engine-to-tier-mapping)
8. [Pricing Strategy](#8-pricing-strategy)
9. [Revenue Model & Unit Economics](#9-revenue-model--unit-economics)
10. [Competitive Positioning (Eden.AI & Others)](#10-competitive-positioning-edenai--others)
11. [Go-to-Market Strategy](#11-go-to-market-strategy)
12. [Operations & Infrastructure](#12-operations--infrastructure)
13. [Financial Projections (Assumptions)](#13-financial-projections-assumptions)
14. [Risk Analysis & Mitigations](#14-risk-analysis--mitigations)
15. [KPIs & Success Metrics](#15-kpis--success-metrics)
16. [Roadmap — Business & Product Phases](#16-roadmap--business--product-phases)
17. [Open Decisions & Next Steps](#17-open-decisions--next-steps)

---

## 1. Executive Summary

Planet OCR is a **document intelligence platform** that combines:

- **Multiple specialized OCR engines** (5 core models, 8 registered engine variants)
- **An AI advisor** that recommends the right engine and tier based on document type
- **Unified API and billing** across engines — similar in spirit to Eden.AI's gateway model, but **OCR-specialized** with guided tier matching

### Business thesis

Customers do not want to evaluate 5 OCR models themselves. They want **accurate extraction at predictable cost**. Planet OCR wins by:

1. **Routing** documents to the cheapest engine that meets quality requirements
2. **Tiering** access so lightweight workloads subsidize premium intelligence workloads
3. **Transparent usage** — every API response reports credits consumed and effective cost

### Recommended commercial model

**Hybrid subscription + credit multiplier** (Eden.AI-inspired transparency, SaaS predictability):

| Tier | Monthly price | Included pages | Primary engines |
|------|---------------|----------------|-----------------|
| Starter | Free | 50 | PaddleOCR Lite |
| Essential | $29 | 500 | PaddleOCR-VL |
| Professional | $99 | 5,000 | GOT-OCR 2.0, Infinity-Parser2-Flash, Qianfan OCR (credit-weighted) |
| Enterprise | Custom | Unlimited / contracted | All engines + premium variants, SLA, on-prem |

Premium engines consume **page credits at a multiplier** (see [Section 8](#8-pricing-strategy)).

---

## 2. Problem & Market Opportunity

### The problem

| Pain point | Who feels it |
|------------|--------------|
| OCR model fragmentation — 10+ viable models, no clear winner | Developers, product teams |
| Opaque pricing across cloud OCR APIs | Finance & engineering leads |
| Over-provisioning — running 4B models on simple invoices | Startups, SMBs |
| Under-provisioning — using basic OCR on scientific PDFs with equations | Research, legal, healthcare |
| Integration cost — different APIs, schemas, auth per provider | Platform engineers |

### Market size (directional)

- **Document AI / Intelligent Document Processing (IDP)** market: multi-billion USD, growing ~15–20% CAGR
- **OCR-as-a-service** segment driven by: RAG pipelines, invoice automation, compliance digitization, healthcare claims
- **Addressable niches for Planet OCR:**
  - SMB document automation (invoices, forms)
  - Developer teams building RAG over PDFs
  - Verticals needing KIE (key information extraction): finance, healthcare, legal

### Target customers

| Segment | Profile | Primary tier | Key need |
|---------|---------|--------------|----------|
| Evaluators | Individual, hobby, student | Starter | Try before buy |
| SMB ops | 100–5K pages/month | Essential | Invoices, forms, tables |
| Product teams | 1K–50K pages/month | Professional | API, multi-format, equations |
| Enterprise | 50K+ pages/month | Enterprise | SLA, custom fields, on-prem |

---

## 3. Product Vision & Value Proposition

### Vision

> *"The Stripe of OCR — one API, the right engine, transparent cost."*

### Differentiators vs. generic AI gateways (e.g. Eden.AI)

| Dimension | Eden.AI | Planet OCR |
|-----------|---------|------------|
| Scope | 500+ models, all modalities | OCR & document intelligence only |
| Selection | User picks provider/model | **AI advisor auto-routes** by document fingerprint |
| Depth | Broad, shallow per modality | Deep knowledge base per engine |
| Onboarding | Developer self-serve catalog | Guided tier match + live demo on user file |
| Billing | Pure PAYG credits | **Subscription + credit multipliers** |

### Core product surfaces

1. **Web app** — upload, demo, advisor chat
2. **REST API v1/v2** — programmatic OCR
3. **AI Advisor** — recommends tier + engine from document signals
4. **Admin console** — user management, usage, engine health
5. **Docs & API reference** — developer onboarding

---

## 4. OCR Engine Catalog

Planet OCR currently operates **5 core model families** (8 registered engine slugs including Enterprise variants).

### 4.1 Engine summary matrix

| Engine | Model ID | Parameters | Architecture | Languages | Primary output |
|--------|----------|------------|--------------|-----------|----------------|
| **PaddleOCR Lite** | PaddleOCR (classic) | Lightweight | Detection + recognition pipeline | Multi | Plain text |
| **PaddleOCR-VL 1.6** | PaddlePaddle/PaddleOCR-VL | 0.9B | Two-stage: layout + recognition | 109 | Text, tables, Markdown, JSON |
| **GOT-OCR 2.0** | ucaslcl/GOT-OCR2_0 | 580M | End-to-end encoder-decoder | Multi | Markdown, LaTeX, TikZ, formatted |
| **Infinity-Parser2-Flash** | infly/Infinity-Parser2-Flash | 2B | VLM image-text-to-text | EN/ZH primary | doc2md, doc2json (layout bbox) |
| **Qianfan OCR** | baidu/Qianfan-OCR | 4B | End-to-end + Layout-as-Thought | 192 | Markdown, KIE, layout JSON, VQA |

### 4.2 Benchmark snapshot (from knowledge base)

| Engine | Standout metric | Relative strength |
|--------|-----------------|-------------------|
| PaddleOCR-VL | OmniDocBench 96.33%, table TEDS 94.76% | Tables, real-world robustness |
| GOT-OCR 2.0 | Fox PDF F1 0.972 (EN), 0.980 (ZH) | Formatted output, interactive OCR |
| Infinity-Parser2-Flash | OlmOCR-Bench 86.0, PubTabNet 92.41% | Speed, layout JSON pipelines |
| Qianfan OCR | KIE mean 87.9%, OlmOCR-Bench 79.8 (#1 E2E) | KIE, layout reasoning, multilingual |

### 4.3 Registered platform engines (seed registry)

| Slug | Display name | Default tier | `cost_profile` |
|------|--------------|--------------|------------------|
| `paddle-ocr-free` | PaddleOCR Lite | Starter | low |
| `paddle-ocr-vl` | PaddleOCR Vision-Language | Essential | low |
| `got-ocr2` | GOT-OCR 2.0 | Professional | medium |
| `infinity-parser2-flash` | Infinity-Parser2-Flash | Professional | low |
| `qianfan-ocr` | Qianfan OCR | Professional | medium |
| `got-ocr2-enterprise` | GOT-OCR 2.0 Enterprise | Enterprise | high |
| `qianfan-ocr-enterprise` | Qianfan OCR Enterprise | Enterprise | high |
| `infinity-parser2-flash-enterprise` | Infinity-Parser2-Flash Enterprise | Enterprise | medium |

---

## 5. Hardware & Compute Classification

Hardware tiering drives **infra cost**, **queue priority**, and **credit multipliers**. Classification uses four compute classes.

### 5.1 Compute class definitions

| Class | Name | Typical hardware | VRAM (est.) | Cold start | Concurrent PDF pages |
|-------|------|------------------|-------------|------------|----------------------|
| **A** | Edge / Lite | CPU or shared small GPU | 0–4 GB | < 5 s | 1 |
| **B** | Standard | Single GPU (T4 / L4 / RTX 4060) | 8–12 GB | 5–20 s | 1–4 |
| **C** | Performance | GPU (A10 / RTX 4090 / L40) | 16–24 GB | 15–45 s | 4–10 (parallel per doc) |
| **D** | Premium | GPU (A100 40GB / H100) | 24–48 GB | 30–90 s | 10+ with horizontal scale |

> **Note:** Latency figures for Infinity and Qianfan on your infrastructure are marked TBD in the knowledge base. Replace placeholders with measured benchmarks before final pricing lock-in.

### 5.2 Engine → compute class mapping

| Engine | Params | Compute class | VRAM estimate (BF16/FP16) | Inference profile | Platform `cost_profile` |
|--------|--------|---------------|---------------------------|-------------------|-------------------------|
| PaddleOCR Lite | — | **A** | 0–2 GB (CPU viable) | Fast per page, low accuracy ceiling | low |
| PaddleOCR-VL | 0.9B | **B** | ~4–6 GB | Two-stage; efficient for tables | low |
| GOT-OCR 2.0 | 580M | **B** | ~3–5 GB | Smallest VLM-class; GPU recommended | medium |
| Infinity-Parser2-Flash | 2B | **C** | ~8–12 GB | Flash-optimized; parallel page decode | low–medium |
| Qianfan OCR | 4B | **D** | ~16–24 GB | Heaviest; thinking mode adds latency | medium–high |

### 5.3 Hardware limitations per engine

| Engine | Hard limitations | Operational constraints |
|--------|------------------|-------------------------|
| PaddleOCR Lite | No tables (complex), no equations, no handwriting | Max upload 10 MB; 50 PDF pages/upload |
| PaddleOCR-VL | Two-stage latency; no advanced KIE | Layout step required before recognition |
| GOT-OCR 2.0 | Handwriting moderate (89% Pro / 91% Enterprise) | GPU required for production speed |
| Infinity-Parser2-Flash | EN/ZH primary; no KIE; no bold/italic capture | 2B VLM; model lock serializes concurrent requests per instance |
| Qianfan OCR | Highest compute; overkill for simple docs | Requires transformers ≥ 5.8.0; 4B memory footprint |

### 5.4 Relative cost ranking (internal $/page, theoretical)

Ordered from **lowest to highest** platform cost per page at 144 DPI:

```
PaddleOCR Lite  <  PaddleOCR-VL  ≈  GOT-OCR 2.0  <  Infinity-Parser2-Flash  <  Qianfan OCR
     (A)              (B)                (B)                  (C)                    (D)
```

**Important nuance:** Infinity (2B) costs more GPU memory than GOT (580M) but is **throughput-optimized** — on batch PDF jobs it may achieve lower $/page than Qianfan despite larger param count. GOT is cheap per inference but lacks KIE and layout reasoning.

### 5.5 Infrastructure scaling model

| Pattern | When | Approach |
|---------|------|----------|
| Single-instance | MVP / < 100 RPS | One engine loaded at a time; model swap on routing |
| Multi-replica | Production | Horizontal API replicas; dedicated GPU pools per compute class |
| Engine pinning | Enterprise | Dedicated GPU for Qianfan/GOT to avoid cold-swap |
| Eager load | SLA customers | `*_EAGER_LOAD=true` eliminates first-request penalty |

**Platform constraint (current):** max 10 MB upload, 50 PDF pages per request, 144 DPI default.

---

## 6. Capability & Usage Classification

Hardware alone does not determine customer tier. Capabilities and use cases form a **second axis**.

### 6.1 Capability tiers

| Capability tier | Features | Minimum engine |
|-----------------|----------|----------------|
| **L1 — Text extract** | Plain text, simple PDFs | PaddleOCR Lite |
| **L2 — Business structure** | Tables, forms, invoices, seals | PaddleOCR-VL |
| **L3 — Rich document** | Equations, handwriting, charts, multi-column | GOT-OCR 2.0, Infinity-Parser2-Flash |
| **L4 — Document intelligence** | KIE, layout reasoning, VQA, 192 languages | Qianfan OCR |
| **L5 — Enterprise custom** | Fine-tuning, custom templates, chemical/musical notation | Enterprise variants |

### 6.2 Usage personas → engine routing

| Persona | Document types | Recommended engine | Why |
|---------|----------------|-------------------|-----|
| Personal / eval | Simple PDFs, screenshots | PaddleOCR Lite | Zero cost, web-only |
| Accounts payable | Invoices, receipts, POs | PaddleOCR-VL | SOTA tables, 109 languages |
| RAG ingestion | Reports, manuals, EN/ZH PDFs | Infinity-Parser2-Flash | Fast doc2md, layout JSON |
| Academic / legal | Papers, contracts with formulas | GOT-OCR 2.0 | LaTeX, formatted Markdown |
| Healthcare / finance KIE | Claims, statements, IDs | Qianfan OCR | KIE benchmarks, layout-as-thought |
| High-volume batch | 10K+ pages/month mixed | Advisor-routed mix | Cost optimize per doc class |

### 6.3 Document signal → engine matrix (advisor routing)

| Signal | Essential | Professional | Enterprise |
|--------|-----------|--------------|------------|
| Printed text only | PaddleOCR-VL | — | — |
| Tables (simple) | PaddleOCR-VL | — | — |
| Tables (complex / merged cells) | — | PaddleOCR-VL, Qianfan | Qianfan Enterprise |
| Equations / LaTeX | — | GOT-OCR 2.0 | GOT Enterprise |
| Handwriting (primary) | — | GOT-OCR 2.0, Qianfan | GOT Enterprise |
| Charts / diagrams | — | PaddleOCR-VL, GOT, Infinity | GOT Enterprise |
| KIE (invoice fields, IDs) | — | Qianfan OCR | Qianfan Enterprise |
| RAG / Markdown pipeline | — | Infinity-Parser2-Flash | Infinity Enterprise |
| Multi-column 10+ pages | — | Infinity, Qianfan | Qianfan Enterprise |
| Document Q&A | — | — | Qianfan Enterprise |

---

## 7. Tier Architecture — Engine-to-Tier Mapping

### 7.1 Design principles

1. **Free tier** = lowest compute (Class A), web-only, no API — acquisition funnel
2. **Each paid tier** unlocks engines whose **marginal cost** the subscription covers
3. **Professional** = multi-engine access with credit multipliers for heavy engines
4. **Enterprise** = premium variants, unlimited volume, dedicated infra option
5. **Advisor** may recommend a higher tier but **demo runs** stay within user's subscribed engines

### 7.2 Recommended tier assignment (final)

#### Starter (Free) — `$0 / month`

| Attribute | Value |
|-----------|-------|
| Quota | 50 pages/month |
| API access | No |
| Compute pool | Class A |
| **Engines included** | **PaddleOCR Lite only** |
| Upgrade trigger | Tables, API, > 50 pages |

#### Essential — `$29 / month`

| Attribute | Value |
|-----------|-------|
| Quota | 500 pages/month |
| API access | Yes (rate-limited) |
| Compute pool | Class B |
| **Engines included** | **PaddleOCR-VL** (primary), PaddleOCR Lite (fallback) |
| Credit multiplier | 1× (all included pages on VL) |
| Upgrade trigger | Equations, handwriting, KIE, > 500 pages |

**Rationale:** PaddleOCR-VL delivers SOTA table accuracy at low compute (0.9B). Best margin tier for SMB invoice/form workloads.

#### Professional — `$99 / month`

| Attribute | Value |
|-----------|-------|
| Quota | 5,000 page-credits/month |
| API access | Yes (priority queue) |
| Compute pool | Class B + C + D (shared) |
| **Engines included** | |

| Engine | Credit multiplier | Effective pages if used exclusively |
|--------|-------------------|--------------------------------------|
| GOT-OCR 2.0 | 1× | 5,000 |
| Infinity-Parser2-Flash | 1× | 5,000 |
| PaddleOCR-VL | 0.5× | 10,000 |
| Qianfan OCR | 3× | ~1,667 |

- Advisor auto-selects engine; user may override via API `engine` parameter
- Overage: $0.025 / credit (see Section 8)

**Rationale:** Pro unlocks the three "intelligence" engines. Qianfan's 3× multiplier reflects Class D GPU cost without blocking access.

#### Enterprise — Custom pricing

| Attribute | Value |
|-----------|-------|
| Quota | Contracted (e.g. 50K–unlimited) |
| API access | Yes (dedicated rate limits) |
| Compute pool | Dedicated Class C/D option |
| **Engines included** | **All engines + Enterprise variants** |

| Engine variant | Capability uplift |
|----------------|-------------------|
| GOT-OCR 2.0 Enterprise | 91%+ handwriting, 94%+ equations, diagrams, musical notation |
| Qianfan OCR Enterprise | 95%+ invoice accuracy, custom templates, multi-language KIE |
| Infinity-Parser2-Flash Enterprise | Charts, chemical formulas, document VQA |

- On-premise deployment option
- Custom SLA (99.9% uptime target)
- Postpaid invoicing (Eden.AI Advanced model)
- Volume discounts at 50K+ pages/month

### 7.3 Tier ↔ engine visual map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLANET OCR TIER PYRAMID                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ENTERPRISE (Custom)                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ GOT Enterprise │ Qianfan Enterprise │ Infinity Enterprise      │    │
│  │ + fine-tuning, on-prem, SLA, unlimited                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│  PROFESSIONAL ($99 / 5K credits)                                         │
│  ┌──────────────┐ ┌────────────────────┐ ┌──────────────────────┐    │
│  │ GOT-OCR 2.0  │ │ Infinity-Parser2   │ │ Qianfan OCR (3× cred)│    │
│  │ 1× · Class B │ │ 1× · Class C       │ │ Class D              │    │
│  └──────────────┘ └────────────────────┘ └──────────────────────┘    │
│  + PaddleOCR-VL at 0.5× credit                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ESSENTIAL ($29 / 500 pages)                                             │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ PaddleOCR-VL 0.9B · Class B · tables, forms, invoices           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│  STARTER (Free / 50 pages)                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ PaddleOCR Lite · Class A · web only · plain text                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Why this differs from pure hardware tiering

| If tiered by hardware only | Problem | Our resolution |
|----------------------------|---------|----------------|
| Qianfan → only Enterprise | Blocks KIE for Pro SMB users | Pro access with 3× credit multiplier |
| GOT → Essential (smallest model) | Unlocks equations/handwriting below cost coverage | Pro tier — capabilities justify price |
| Infinity → Enterprise (2B) | Blocks RAG developers on Pro | Pro at 1× — throughput-optimized, strategic for developer GTM |

---

## 8. Pricing Strategy

### 8.1 Model philosophy (Eden.AI-informed)

| Eden.AI pattern | Planet OCR adaptation |
|-----------------|----------------------|
| Pay-as-you-go credits | Overage credits beyond monthly quota |
| Per-response `cost` field | API returns `credits_used`, `engine`, `effective_cost_usd` |
| No markup on provider cost | We own infra — price = infra cost + margin + platform fee |
| 5.5% platform fee on credit purchase | Embedded in subscription margin (no separate line item for SMB) |
| Self-serve vs Advanced | Starter/Essential/Pro self-serve; Enterprise = Advanced |
| Volume bulk discounts | Enterprise tier + 50K+ page contracts |

### 8.2 Published pricing table

| Tier | Monthly | Annual (15% off) | Pages/credits | Overage | API | Support |
|------|---------|------------------|---------------|---------|-----|---------|
| Starter | Free | — | 50 | — | No | Community |
| Essential | $29 | $296/yr | 500 | $0.06/page | Yes | Email 72h |
| Professional | $99 | $1,009/yr | 5,000 credits | $0.025/credit | Yes (priority) | Email 48h |
| Enterprise | Custom | Custom | Contracted | Volume tiers | Dedicated | SLA + Slack |

### 8.3 Credit multiplier reference (Professional)

| Engine | Multiplier | Example: 100-page PDF |
|--------|------------|------------------------|
| PaddleOCR-VL | 0.5× | 50 credits |
| GOT-OCR 2.0 | 1× | 100 credits |
| Infinity-Parser2-Flash | 1× | 100 credits |
| Qianfan OCR | 3× | 300 credits |

### 8.4 Enterprise volume pricing (indicative)

| Monthly volume | Blended $/page | Notes |
|----------------|----------------|-------|
| 50,000 | $0.018 | ~10% below Pro overage |
| 100,000 | $0.014 | Dedicated queue |
| 500,000+ | $0.008–0.012 | Custom; on-prem option |

### 8.5 Add-on revenue streams

| Add-on | Price | Tier |
|--------|-------|------|
| Extra API keys | $10/key/month | Essential+ |
| Webhook delivery | Included | Essential+ |
| Custom model fine-tuning | $5,000+ setup + usage | Enterprise |
| On-premise license | $2,000+/month | Enterprise |
| Priority GPU pool | +20% on usage | Professional+ |
| White-label advisor widget | Custom | Enterprise |

### 8.6 Free tier economics

- **Purpose:** Acquisition — advisor demo, fingerprint analysis, 1 demo run/session
- **Cost cap:** 50 pages × ~$0.001 infra ≈ $0.05/user/month at scale
- **Conversion target:** 8–12% Starter → Essential within 60 days

---

## 9. Revenue Model & Unit Economics

### 9.1 Revenue streams

```
Total revenue = Subscriptions + Overage + Enterprise contracts + Add-ons
```

| Stream | % of revenue (Y1 target) |
|--------|--------------------------|
| Subscriptions (Essential + Pro) | 60% |
| Overage & PAYG credits | 15% |
| Enterprise contracts | 20% |
| Add-ons & services | 5% |

### 9.2 Unit economics per tier (assumptions)

Assumed blended infra cost at 144 DPI, single GPU pool:

| Tier | ARPU | Est. COGS/user | Gross margin |
|------|------|----------------|--------------|
| Starter | $0 | $0.05 | N/A (marketing) |
| Essential | $29 | $3–5 | 83–90% |
| Professional | $99 | $15–25 | 75–85% |
| Enterprise | $500+ | 40–55% of contract | 45–60% |

> **Assumption basis:** Essential user averages 300/500 pages on PaddleOCR-VL (~$0.01/page GPU). Pro user averages 3,500 credits blended 1.5× multiplier (~$0.004–0.007/credit). **Validate with production benchmarks.**

### 9.3 Break-even sketch

| Fixed costs (monthly) | Estimate |
|-----------------------|----------|
| GPU infrastructure (2× L40, 1× A100) | $3,000–6,000 |
| Engineering (2 FTE) | $20,000+ |
| Ops, support, misc | $2,000 |
| **Total fixed** | **~$25,000–28,000** |

**Break-even (subscription only):** ~400 Essential users OR ~280 Pro users OR ~50 Enterprise accounts at $500/mo (simplified).

---

## 10. Competitive Positioning (Eden.AI & Others)

### 10.1 Competitive landscape

| Competitor | Model | Strength | Weakness vs. Planet OCR |
|------------|-------|----------|-------------------------|
| **Eden.AI** | AI gateway, PAYG | 500+ models, unified billing | No OCR specialization, no advisor |
| **Google Document AI** | Cloud API | Scale, enterprise trust | Expensive, complex pricing |
| **AWS Textract** | Cloud API | AWS integration | Limited equations/handwriting |
| **Azure Document Intelligence** | Cloud API | Microsoft ecosystem | Per-feature pricing confusion |
| **Mindee / Rossum** | Vertical IDP | Invoice-focused | Narrow, not multi-engine |
| **Self-hosted (Paddle, etc.)** | Open source | Free | No routing, ops burden |

### 10.2 Positioning statement

**Planet OCR** is the **OCR-native document intelligence platform** for teams who want **one integration, automatic engine selection, and predictable tier-based pricing** — without navigating a 500-model catalog.

### 10.3 Pricing vs. Eden.AI (OCR-specific)

| Dimension | Eden.AI | Planet OCR |
|-----------|---------|------------|
| Entry price | PAYG from ~$0 (credits) | Free Starter + $29 Essential |
| Cost transparency | Per-request USD in response | Credits + USD in response |
| Model choice | User selects provider | Advisor recommends; user can override |
| OCR depth | Aggregates third-party APIs | Owned inference + deep KB per engine |
| Enterprise | Advanced platform, custom | SLA, on-prem, fine-tuning |

---

## 11. Go-to-Market Strategy

### 11.1 Phase 1 — Developer & SMB (Months 1–6)

| Channel | Tactic |
|---------|--------|
| Product-led growth | Free Starter + advisor demo on upload |
| Content SEO | "Best OCR for invoices", "PDF to Markdown API", comparison pages |
| Developer docs | Quickstart, code samples, Postman collection |
| Community | GitHub examples, HuggingFace cross-links |
| Partnerships | RAG framework integrations (LangChain, LlamaIndex) |

### 11.2 Phase 2 — Vertical expansion (Months 6–12)

| Vertical | Engine emphasis | GTM |
|----------|-----------------|-----|
| Finance / AP | PaddleOCR-VL, Qianfan KIE | Invoice automation agencies |
| Healthcare | Qianfan Enterprise | Claims processing integrators |
| Legal / research | GOT-OCR 2.0 | Academic and law-tech communities |
| RAG / AI apps | Infinity-Parser2-Flash | AI engineer newsletters, dev tools |

### 11.3 Phase 3 — Enterprise sales (Months 12+)

- Outbound to mid-market with > 10K pages/month
- SOC 2 / HIPAA pathway for healthcare vertical
- On-premise pilots for regulated industries
- AWS Marketplace listing (Eden.AI pattern)

### 11.4 Messaging by tier

| Tier | Headline | CTA |
|------|----------|-----|
| Starter | "See what OCR fits your documents — free" | Register |
| Essential | "Invoice & form OCR with API — $29/mo" | Subscribe |
| Professional | "Equations, handwriting, KIE — one API" | Subscribe |
| Enterprise | "Unlimited scale, highest accuracy, your infra" | Contact sales |

---

## 12. Operations & Infrastructure

### 12.1 GPU pool architecture (recommended)

| Pool | Engines | Min hardware |
|------|---------|--------------|
| Pool A (CPU/light) | PaddleOCR Lite | CPU nodes |
| Pool B (standard) | PaddleOCR-VL, GOT-OCR 2.0 | 1× L4/T4 per replica |
| Pool C (performance) | Infinity-Parser2-Flash | 1× L40 / RTX 4090 per replica |
| Pool D (premium) | Qianfan OCR | 1× A100 40GB per replica |

### 12.2 Queue & fairness

| Tier | Queue priority | Max concurrent jobs |
|------|----------------|---------------------|
| Starter | Low (web only) | 1 |
| Essential | Standard | 2 |
| Professional | Priority | 5 |
| Enterprise | Dedicated | Contracted |

### 12.3 Model lifecycle

1. **Benchmark** new engine on standard corpus (invoice, scientific, RAG report)
2. **Classify** compute class + capability tier
3. **Assign** tier + credit multiplier
4. **Update** knowledge base + advisor routing rules
5. **Publish** in API catalog and docs

### 12.4 SLA targets (Enterprise)

| Metric | Target |
|--------|--------|
| API availability | 99.9% |
| P95 latency (warm, single page) | < 8 s (engine-dependent) |
| Support response | 4 h business hours |
| Data retention | Configurable; default 24 h for uploads |

---

## 13. Financial Projections (Assumptions)

### 13.1 Year 1 user growth (conservative)

| Quarter | Starter | Essential | Pro | Enterprise |
|---------|---------|-----------|-----|------------|
| Q1 | 500 | 20 | 5 | 0 |
| Q2 | 1,500 | 60 | 20 | 1 |
| Q3 | 3,000 | 120 | 45 | 3 |
| Q4 | 5,000 | 200 | 80 | 6 |

### 13.2 Year 1 revenue estimate

| Source | Q4 run-rate (monthly) |
|--------|----------------------|
| Essential (200 × $29) | $5,800 |
| Pro (80 × $99) | $7,920 |
| Enterprise (6 × $800 avg) | $4,800 |
| Overage (~10% of sub) | $1,850 |
| **MRR end Y1** | **~$20,370** |
| **ARR exit** | **~$244K** |

### 13.3 Key investments

| Investment | Priority | Est. cost |
|------------|----------|-----------|
| GPU benchmark suite | P0 | Engineering time |
| Billing / Stripe metered overage | P0 | $0 + dev |
| SOC 2 Type I | P1 | $15–30K |
| Sales hire (Enterprise) | P2 | $80K+ OTE |

---

## 14. Risk Analysis & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GPU costs exceed pricing | High | Medium | Credit multipliers; benchmark before lock-in |
| Qianfan/GOT model updates break API | High | Low | Versioned engine slugs; adapter abstraction |
| Eden.AI or cloud giants undercut OCR pricing | Medium | Medium | Differentiate on advisor + specialization |
| Free tier abuse | Medium | High | Rate limits, fingerprinting, no API on Starter |
| Cold-start latency hurts UX | Medium | High | Eager load for Pro+; warm pools |
| Enterprise sales cycle long | Medium | High | PLG feeds enterprise pipeline via usage data |
| Regulatory (PII in documents) | High | Medium | Encryption, retention limits, on-prem option |

---

## 15. KPIs & Success Metrics

### 15.1 Product metrics

| KPI | Target (Y1) |
|-----|-------------|
| Starter → paid conversion | 10% |
| Advisor recommendation acceptance | 70% |
| API error rate | < 0.5% |
| P95 OCR latency (warm) | < 10 s/page |

### 15.2 Business metrics

| KPI | Target (Y1) |
|-----|-------------|
| MRR | $20K exit |
| Net revenue retention | > 110% |
| Gross margin | > 75% blended |
| CAC payback (Essential) | < 6 months |
| Enterprise pipeline | 20 qualified leads |

### 15.3 Technical metrics

| KPI | Target |
|-----|--------|
| Engine routing accuracy (vs. human label) | > 85% |
| Infra cost per page (blended) | < $0.008 |
| GPU utilization | > 60% |

---

## 16. Roadmap — Business & Product Phases

### Phase 0 — Foundation (Complete)

- [x] Multi-engine platform (5 models)
- [x] Tier registry and seed data
- [x] AI advisor with document fingerprinting
- [x] Pricing page (Starter / Essential / Pro / Enterprise)
- [x] Knowledge base per engine

### Phase 1 — Monetization readiness (0–3 months)

- [ ] GPU benchmark suite — replace TBD latency placeholders
- [ ] Credit multiplier billing in Stripe
- [ ] API `credits_used` and `cost_usd` in every response
- [ ] Overage automation
- [ ] Usage dashboard for users

### Phase 2 — Growth (3–6 months)

- [ ] Annual billing with 15% discount
- [ ] PAYG credit packs (Eden-style top-up without subscription)
- [ ] Engine override in API docs and SDK
- [ ] Comparison landing pages (vs Textract, Eden.AI OCR)
- [ ] Webhook billing events

### Phase 3 — Enterprise (6–12 months)

- [ ] Enterprise sales playbook
- [ ] Postpaid invoicing
- [ ] On-premise deployment package
- [ ] Custom fine-tuning offering
- [ ] SOC 2 Type I

### Phase 4 — Scale (12+ months)

- [ ] Multi-region GPU pools
- [ ] Auto-scaling per compute class
- [ ] Marketplace integrations (AWS, Vercel)
- [ ] Additional engines (evaluate new SOTA quarterly)

---

## 17. Open Decisions & Next Steps

### Decisions required before implementation

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Billing model | Subscription-only vs hybrid PAYG | **Hybrid** (subscription + overage credits) |
| 2 | Qianfan on Pro | Block vs 3× multiplier | **3× multiplier** on Pro |
| 3 | Infinity placement | Pro vs Enterprise | **Pro at 1×** (developer/RAG GTM) |
| 4 | Enterprise variants | Separate models vs config flags | **Config flags** (DPI, thinking, SLA) until true fine-tunes exist |
| 5 | GPU benchmark | Run now vs ship with estimates | **Run benchmark** before locking multipliers |
| 6 | PAYG without subscription | Yes vs No | **Yes** in Phase 2 (Eden parity) |

### Immediate next steps

1. **Benchmark** all 5 engines on a 50-document corpus — record seconds/page, VRAM, $/page
2. **Validate** credit multipliers against actual COGS
3. **Implement** metered billing and API cost transparency
4. **Update** pricing page with credit multiplier table
5. **Train** advisor on new tier–engine rules in knowledge base

---

## Appendix A — Engine quick-reference card

| Engine | Compute | Best for | Tier | Credits |
|--------|---------|----------|------|---------|
| PaddleOCR Lite | A | Plain text, eval | Starter | — |
| PaddleOCR-VL | B | Invoices, tables, forms | Essential | 1× (Pro: 0.5×) |
| GOT-OCR 2.0 | B | Equations, formatted MD | Pro | 1× |
| Infinity-Parser2-Flash | C | RAG, doc2md, layout JSON | Pro | 1× |
| Qianfan OCR | D | KIE, VQA, 192 langs | Pro | 3× |
| *Enterprise variants* | B–D | Highest accuracy + custom | Enterprise | Contracted |

## Appendix B — Glossary

| Term | Definition |
|------|------------|
| **KIE** | Key Information Extraction — structured fields from documents |
| **doc2md** | PDF/image → Markdown conversion |
| **doc2json** | PDF/image → layout JSON with bounding boxes |
| **Credit** | Billable unit; 1 credit ≈ 1 page at 1× multiplier |
| **Compute class** | Hardware bucket (A–D) driving infra cost |
| **Advisor** | AI agent that fingerprints documents and recommends tier/engine |

---

*This document is a living strategic plan. Update after GPU benchmarks and first 90 days of usage data.*
