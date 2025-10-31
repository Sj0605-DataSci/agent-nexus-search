# Tara – AI Copilot for TallyPrime

## 1. Product Narrative

### 1.1 Vision
Tara is the always-on finance copilot that sits on top of TallyPrime. Just as the star "Tara" guides travellers, Tara guides businesses through accounting operations with a conversational AI assistant that understands Tally primitives, business workflows, and compliance rules.

### 1.2 Core Value Propositions
- **WhatsApp-first experience:** 24/7 conversational access for inventory, pricing, ordering, and support.
- **Touchless document automation:** Photo/PDF/voice invoices become validated Tally entries in minutes.
- **Live Tally connectivity:** Desktop agent keeps Tally data in sync with Tara without manual exports.
- **Compliance & finance intelligence:** GST helper, reconciliation engine, proactive alerts, and business insights.
- **Enterprise readiness:** RBAC, audit logs, secure tunnels, multi-company tenancy, and integration marketplace.

### 1.3 Differentiators vs. LucaGPT
1. Human-in-the-loop validation dashboards for 95%+ accuracy.
2. Workflow engine for approvals, reminders, and multichannel notifications.
3. Compliance cockpit (GST/TDS automation, statutory calendar, filing prep).
4. Integration marketplace (banking APIs, ERPs, CRM, data warehouse export).
5. Predictive insights (cashflow forecasts, anomaly detection, credit control).
6. Enterprise controls (SSO, SOC2 roadmap, regional data residency options).

### 1.4 Target Personas
- Accountants and finance teams serving multiple clients.
- SME owners needing real-time visibility and automation.
- Distributors, retailers, and D2C brands operating on Tally.
- Enterprises with multi-location Tally installations and audit requirements.

### 1.5 Reference Product Breakdown (LucaGPT)
- **Core value:** AI copilot for TallyPrime—natural language entry, document-to-ledger automation, analytics.
- **Key shipped modules:**
  - Conversational assistant (text + voice)
  - Document ingestion (invoices, PDFs, Excel) with entity extraction
  - Real-time dashboards (cashflow, P&L, receivables/payables)
  - Error detection & reconciliation (bank, ledger mismatches)
  - Omni-channel inputs (WhatsApp, web)
- **Upcoming promises:** GST/TDS automation, ERP integrations, bank sync, proactive notifications.
- These become the baseline for Tara’s feature parity.

### 1.6 Tara @ discoverminds.ai/tara — Product Requirements & Differentiators
#### 1.6.1 Target Personas
- Accountants & finance teams needing reliable automation in TallyPrime.
- SME owners seeking quick insights and hands-free data capture.
- Enterprise finance ops requiring compliance, integrations, and audit trails.

#### 1.6.2 Experience Pillars
- Frictionless data capture: chat, voice, WhatsApp, and document pipelines.
- Assured compliance: GST/TDS, audit logs, approval flows.
- Actionable intelligence: proactive alerts, anomaly detection, forecast insights.
- Scalable operations: multi-company, role-based access, integrations.

#### 1.6.3 UX Flow (Web experience)
- Landing hero: value prop, demo video, CTA for free trial.
- Feature sections mirroring LucaGPT but rebranded to Tara, highlighting improvements (e.g., faster ingestion SLA, enterprise-grade security).
- Pricing comparison with self-serve vs. enterprise.
- Trust & security (certifications, SOC roadmap).
- Conversion modals: book demo, start trial, WhatsApp channel.

#### 1.6.4 Differentiators vs LucaGPT
- Faster, higher-accuracy OCR via hybrid human-in-the-loop verification option.
- Workflow automation: approval chains, reminders, Slack/Teams hooks.
- Compliance cockpit: GST/TDS auto-filing, reconciliation dashboards, statutory deadline calendar.
- Open API & integration marketplace: Zapier-like connectors, ERP/CRM sync, data warehouse export.
- Insight engine: anomaly detection, margin analysis, credit control predictions.
- Enterprise-ready: SSO, RBAC, audit logs, on-prem connector for air-gapped Tally installations.
- Scalability posture: built for multi-tenant, role-secured environment with SLA-backed uptime.

## 2. Product Capabilities by Phase

| Phase | Feature Set | Customer Outcomes | Timeline (Committed) |
|-------|-------------|-------------------|----------------------|
| **P0 Foundations** | Branding, marketing site (`discoverminds.ai/tara`), onboarding funnel, analytics telemetry, support workflows | Conversion-ready funnel, instrumentation for feature usage & SLAs | Weeks 0–2 |
| **Phase 1** | WhatsApp price queries driven by Excel stock upload | 24/7 price answers, upload validation, conversation transcripts | Mid-Nov 2025 |
| **Phase 2** | Desktop connector (Electron agent) with secure tunnel to Tally | Real-time data access, no manual exports, multi-company support | 30 Oct 2025 |
| **Phase 3** | Smart invoice entry (photo/PDF/voice) with OCR & review UI | 80%+ time saved on data entry, 90% auto-filled fields, human override | 15 Nov 2025 |
| **Phase 4** | Automated inventory & ledger updates (purchase/sales) + GST calculations | Accurate stock/ledger sync, audit logs, rollback, automated invoicing | 30 Nov 2025 |
| **Phase 5A** | Payment reminders (WhatsApp) | Faster receivables, automated nudges | 7 Dec 2025 |
| **Phase 5B** | Daily business summary (sales, dues, stock alerts) | Morning intelligence digest | 7 Dec 2025 |
| **Phase 5C** | Expense tracking from receipts | Zero-loss expense capture, instant categorisation | 7 Dec 2025 |
| **Phase 5D** | GST return helper | Filing readiness, anomaly detection | 21 Dec 2025 |
| **Phase 5E** | Multi-location stock transfer | Cross-branch inventory coordination | 30 Dec 2025 |
| **Phase 5F** | Customer order taking via WhatsApp | 24/7 order intake, Tally order creation | 30 Dec 2025 |
| **Phase 5G** | Sales performance reports | Product/customer profitability insights | 30 Dec 2025 |
| **Phase 5H** | Automatic bank reconciliation | Reduced reconciliation effort, highlight mismatches | Mid-Jan 2026 |
| **Phase 5I** | Vendor payment tracking | Due-date alerts, payment confirmations | End-Jan 2026 |
| **Phase 5J** | Voice commands for Tally | Hands-free queries & actions in natural language | Early Feb 2026 |


## 3. Architecture Overview (Scalable, SOLID, ACID)

### 3.1 Logical Components
- **Conversation Service (FastAPI + LangGraph):** Natural language understanding, intent routing, function calling. Implements Strategy pattern for channel adapters (WhatsApp, web, voice) and Facade for LLM orchestration.
- **Ingestion Service:** Handles document uploads, OCR (Azure Form Recognizer/Google DocAI), voice-to-text, validation queues, and human-in-loop review UI (Open/Closed principle via parser plug-ins).
- **Tally Connector:** Electron desktop agent installed alongside Tally. Establishes mutual-TLS secure tunnel, real-time polling/event streaming, master data sync. Uses Dependency Inversion by abstracting Tally XML RPC calls behind repository interfaces.
- **Workflow & Notification Service:** Manages approvals, reminders, schedules. Uses Observer pattern for event-driven actions and supports Slack/Email/WhatsApp channels.
- **Analytics & Compliance Service:** Builds read models (ClickHouse/BigQuery) for dashboards, anomaly detection, GST/TDS computations, and audit reports.
- **Frontend Layer:** Next.js site for marketing & admin console, React operator dashboard, WhatsApp chat UX, voice UI components.

### 3.2 Data & Integration Layer
- **Transactional Database:** PostgreSQL with schema-per-tenant or row-level security. ACID transactions wrap all financial writes (inventory, ledgers, GST postings).
- **Object Storage:** S3/GCS for documents and audio artifacts with lifecycle policies.
- **Event Streaming:** Kafka/PubSub for asynchronous pipelines (invoice processing, reminders) with idempotent consumers and dead-letter queues.
- **Caching:** Redis/KeyDB for session state and frequently accessed read models.
- **Search & Vector Stores:** Pinecone/Weaviate for semantic retrieval across invoices, knowledge base.

### 3.3 Security & Compliance
- OAuth2 + SSO for auth, MFA for privileged accounts.
- RBAC with principle of least privilege; audit logs in append-only store.
- Secrets management (AWS Secrets Manager/HashiCorp Vault) and per-tenant encryption keys.
- Network hardening via mTLS, IP allow lists, intrusion detection.
- Compliance roadmap covering SOC2 Type II, ISO 27001, and GST regulations.

### 3.4 Scalability Considerations
- Kubernetes (EKS/GKE) auto-scaling for stateless services.
- Temporal.io / BullMQ for long-running tasks with retry policies.
  - Canary deployments + feature flags for safe rollout.
  - Observability stack (OpenTelemetry, Prometheus, Grafana, PagerDuty) with service-level objectives.
  - Disaster recovery: multi-region replication for PostgreSQL, backup/restore playbooks, RPO/RTO targets.

### 3.5 High-Level System
- **Client interfaces:**
  - Web app (Next.js/React) served from `discoverminds.ai/tara`.
  - Desktop assistant (Electron) for on-prem Tally connectivity.
  - WhatsApp bot (e.g., Twilio/360dialog/Meta Cloud).
- **Backend services** (modular microservices or well-structured monolith with domain modules):
  - Ingestion Service: handles file uploads, OCR (Azure Form Recognizer/Google DocAI), validation pipeline.
  - Conversation Service: LLM orchestrator (Groq/Claude/OpenAI) with function calling to Tally connectors.
  - Automation Service: schedulers, notifications, workflow engine.
  - Analytics Service: aggregates, caches metrics; warehouse (BigQuery/Snowflake) or OLAP (ClickHouse).
  - Compliance Service: GST/TDS logic, filings, third-party APIs.
  - Integration Hub: connectors to TallyPrime XML API, banking APIs, ERP/CRM.
- **Data layer:**
  - OLTP database (Postgres with row-level security or schema-per-tenant).
  - Object storage (S3/GCS) for documents.
  - Event bus (Kafka/PubSub) for pipeline decoupling.
  - Data warehouse for analytics.
- **TallyPrime connectivity:**
  - On-prem agent (Electron app or lightweight Windows service) bridging to cloud via secure WebSockets/HTTPS.
  - Optional VPN or reverse tunnel for air-gapped clients.
- **Security & compliance:**
  - OAuth2/SSO, RBAC, audit logs (immutable store).
  - Secrets in vault (Hashicorp/AWS Secrets Manager).
  - Encryption at rest & in transit, compliance roadmap (SOC2, ISO).
- **Scalability:**
  - Stateless services containerized (Kubernetes).
  - Auto-scaling via HPA; queue-based backpressure for OCR/LLM tasks.
  - Multi-tenant architecture with tenant isolation.
  - Observability stack (OpenTelemetry, Grafana, alerting).

### 3.6 Tech Stack Suggestions
- **Frontend:** Next.js 14 App Router, Tailwind, shadcn UI, SSR caching via Vercel/CloudFront.
- **Desktop bridge:** Electron + Node services; reuse existing Tara rebranding base.
- **Backend:** Python (FastAPI) or Node (NestJS). For rapid ML orchestration, Python with LangChain/LangGraph.
- **LLM:** Groq/Claude/OpenAI with retrieval augmented by Pinecone/Weaviate for docs.
- **OCR/Extraction:** Azure Form Recognizer, Tesseract fallback, custom ML pipeline for Tally-friendly outputs.
- **Workflow:** Temporal.io or BullMQ for long-running tasks.
- **DevOps:** Terraform + AWS (EKS, RDS, S3, MSK), Cloudflare for routing, GitHub Actions CI/CD.

### 3.7 Performance / Reliability
- Define request budgets & SLAs for ingestion (e.g., <2 min per invoice where feasible).
- Circuit breakers and bulkheads for Tally connectors.
- Aggressive caching for analytics (Redis/KeyDB) while keeping ACID for financial writes.
- Canary deployments and feature flags for progressive rollout.

### 3.8 Frontend Architecture (Simple + Developer)
- **For everyone (Grade 8):** The website at `discoverminds.ai/tara` is like the shop counter. You can chat, upload bills, and see simple reports. It talks to the Tara brain (backend), then shows you answers. It uses safe login so only you see your data.
- **For developers & LLM:** Next.js App Router with server-rendered marketing pages and authenticated app pages. Client components for chat, uploads, and dashboards. API calls use an axios instance with `withCredentials` so cookies/tokens flow correctly (CORS is configured in FastAPI). Streaming responses (SSE/WebSocket) recommended for chat. Apply route-level caching for static content; avoid caching personalized data. Sanitize uploads client-side (size/type). Track Web Vitals and guard PII in logs.

### 3.9 Backend Architecture (Simple + Developer)
- **For everyone (Grade 8):** The backend is the brain. It reads your messages, understands them, checks rules, looks into Tally, and sends back the right answer. It also keeps your bills safe and reminds you of important things.
- **For developers & LLM:** Services grouped by domain: Conversation (LLM + tools), Ingestion (OCR + validation), Workflow (approvals/notifications), Analytics/Compliance (reports, GST/TDS), and Integration Hub (Tally/banks/ERPs). FastAPI-based HTTP APIs with OpenAPI contracts. ACID for financial writes (journal/inventory), Transactional Outbox for events to Kafka/PubSub, Sagas for long-running flows. Object storage for documents; Redis for hot caches. Auth via OAuth2/SSO; RBAC. Observability via OpenTelemetry. Webhooks for WhatsApp provider; rate-limited, idempotent handlers.
- **Typical flows:**
  - Price query: WhatsApp → webhook → Conversation → Stock lookup → reply in WhatsApp.
  - Invoice: Upload/voice → Ingestion (OCR) → human review UI → Accounting post → Tally sync → confirmation.

### 3.10 Tally Connector (Desktop) Architecture (Simple + Developer)
- **For everyone (Grade 8):** A small helper app sits on the same computer as Tally. It opens a private, secure road to Tara. With your permission, Tara can read or write entries. Turn it off anytime.
- **For developers & LLM:** Electron-based agent talks to TallyPrime’s XML API (default localhost:9000). Secure mTLS tunnel to backend with certificate pinning. Health checks, reconnection with exponential backoff, and an offline queue for requests if the internet drops. Code-signed installers and auto-updates with signature verification. Data mapping layer converts Tally XML to normalized domain models; idempotent write operations prevent duplicates. Telemetry is privacy-safe and excludes business-sensitive fields.

## 4. Development Execution Playbook

### 4.1 Team Pods & Responsibilities
| Pod | Responsibilities |
|-----|------------------|
| **Automation Pod** | WhatsApp bot, reminders, order flows, workflow engine |
| **Connector Pod** | Desktop agent, secure tunnel, Tally integration, health monitoring |
| **Intelligence Pod** | OCR, LLM orchestration, analytics, compliance logic |
| **Experience Pod** | Marketing site, admin console, UX research, customer success tooling |

Cross-functional chapters cover security, DevOps, data, and QA.

### 4.2 Delivery Cadence
- 2-week sprints with end-to-end increments per phase.
- Feature flags for all net-new capabilities; dark launch before GA.
- Bi-weekly stakeholder steering with KPI reviews.
- Beta cohorts (5–10 customers) per major milestone; structured feedback loops.

### 4.3 Engineering Standards
- SOLID applied to service modules, domain aggregates, and interface segregation.
- ACID guarantees for ledger/inventory operations; eventual consistency only in read models.
- Comprehensive test pyramid: unit, contract, integration, smoke tests on staging.
- Observability requirements before production release (logs, metrics, traces).
- Secure coding practices, threat modelling, regular pen tests.

### 4.4 Success Metrics
- **Operational:** WhatsApp response <30s, invoice processing SLA <5 min, uptime ≥99.5%.
- **Quality:** Auto-post accuracy ≥95%, reconciliation mismatch <2%.
- **Business:** Adoption rate, NPS ≥45, churn <3% monthly, expansion revenue targets.

### 4.5 Risk Register & Mitigation
- **LLM hallucination:** Strict function calling, rule-based validation, human approval gates.
- **OCR edge cases:** Human review queue, continuous template learning, fallback manual entry.
- **Tally API drift:** Maintain sandbox, monitor release notes, regression test suite.
- **Compliance changes:** Dedicated compliance squad, automated regulation monitoring.


## 5. Detailed Roadmap & Milestones

### 5.1 Near-Term Milestones
1. **30 Oct 2025:** Desktop agent GA with secure tunnel and health monitoring.
2. **15 Nov 2025:** Invoice ingestion (photo, PDF, voice) with review console.
3. **30 Nov 2025:** Automated inventory/ledger updates with GST calculations.
4. **07 Dec 2025:** Reminders, daily summary, expense receipt capture.
5. **21 Dec 2025:** GST helper production-ready ahead of filing season.
6. **30 Dec 2025:** Stock transfer, order-taking, sales reports live.
7. **Jan–Feb 2026:** Bank reconciliation, vendor tracking, voice commands.

### 5.2 Ongoing Enhancements
- Predictive insights, anomaly detection, and recommendation engine.
- Integration marketplace expansion (Zoho, Odoo, SAP B1, QuickBooks, data warehouse connectors).
- Mobile admin application for notifications and approvals.


## 6. Operational Excellence

### 6.1 Customer Feedback Loop
- WhatsApp quick polls post-interaction.
- In-app NPS surveys and quarterly customer councils.
- Customer success dashboard tracking adoption and support tickets.

### 6.2 Support & Incident Response
- 24/7 monitoring with on-call rotations.
- Runbooks for Tally downtime, OCR backlog, WhatsApp delivery failures.
- RCA template for incidents with corrective action plans.

### 6.3 Documentation & Enablement
- `/docs/domain` for business rules and accounting mappings.
- `/docs/runbooks` for operations.
- `/docs/api` auto-generated from OpenAPI/GraphQL schemas.
- Partner enablement packs for accounting firms.


## 7. Developer Workflow

1. **Environment Setup:** Use `make bootstrap` (TBD) to configure services, install desktop agent, provision WhatsApp sandbox credentials.
2. **Branch Strategy:** `main` (production), `develop`, feature branches with conventional commits.
3. **CI/CD:** GitHub Actions for lint/test/build; ArgoCD/Terraform for deployments.
4. **Testing:** Mandatory unit + integration tests; contract tests for service APIs; load tests before scaling phases.
5. **Code Review:** Enforce SOLID patterns, ensure ACID-critical code paths are explicitly tested, confirm observability instrumentation.
6. **Documentation:** Update `/docs` and README when introducing new capabilities or domain rules.


## 8. LLM Development Prompt
```
You are the Tara Development Assistant.
Rules:
1. Ship work according to the Tara roadmap phases (P0, Phase 1–5). Work only on the active phase unless told otherwise.
2. Apply SOLID design principles and guarantee ACID properties for all ledger, inventory, and financial transactions.
3. Codebase modules:
   - conversation-service (FastAPI + LangGraph)
   - ingestion-service (OCR & validation)
   - tally-connector (Electron agent + secure tunnel)
   - workflow-service (notifications & approvals)
   - analytics-service (reports & compliance)
   - frontend (Next.js marketing site + operator console)
4. Infrastructure:
   - PostgreSQL for OLTP with migrations
   - Redis for caching
   - Kafka for event streaming
   - S3 for document storage
   - Temporal/BullMQ for background jobs
5. Every feature must include tests, observability hooks, and documentation updates. Use feature flags for incremental rollout.
6. Reference files precisely (e.g., `conversation-service/app/api/...`) and double-check SOLID/ACID compliance.
Respond with implementation details, potential risks, and testing plans for each change.
```


## 9. Next Steps
1. Lock WhatsApp Business API onboarding and Excel schema validation specs (Phase 1).
2. Finalize desktop agent security review and installation UX (Phase 2 critical path).
3. Collect invoice samples for OCR tuning and define human review workflow (Phase 3).
4. Establish compliance/legal review cadence for GST helper claims.
5. Stand up observability stack and incident response playbooks before GA.

## 10. Industrial-Grade Planning & Scalability Practices

### 10.1 Non-Functional Requirements (NFRs) & SLOs
- **Availability:** 99.5% (2025), target 99.9% (2026) for customer-facing APIs.
- **Latency:**
  - WhatsApp responder p95 < 2s (Phase 1), p99 < 5s.
  - Invoice ingestion end-to-posting median < 5m, p95 < 10m.
- **Durability:** Financial journal entries: 11×9s object storage durability, DB PITR enabled.
- **Data Protection:** PII encrypted at rest and in transit; tenant isolation validated by tests.
- **RPO/RTO:** RPO ≤ 5 minutes, RTO ≤ 30 minutes for OLTP; warehouse RPO ≤ 1 hour.

### 10.2 Domain-Driven Design (DDD) & Bounded Contexts
- **Contexts:**
  - Conversations (channels, intents, chat state)
  - Ingestion (documents, OCR, validation)
  - Accounting (journal, inventory, taxation)
  - Compliance (GST/TDS rules, filings)
  - Workflow (approvals, reminders, schedules)
  - Connector (on-prem agent, secure tunnel)
- **Aggregates:** `JournalEntry`, `InventoryAdjustment`, `Party` (Vendor/Customer), `StockItem`, `Company`, `InvoiceDraft`.
- **Rules:** Immutable journals with reversal entries; master data versioning; side effects emitted as domain events.

### 10.3 Consistency & Transaction Patterns (ACID, Sagas, Outbox)
- **ACID boundaries:** All financial postings (journal + inventory) occur in a single DB transaction per company.
- **Transactional Outbox:** Emit events from the same transaction that writes ACID data; consume downstream idempotently.
- **Saga orchestration:** Multi-step flows (e.g., OCR → validation → posting → notify) coordinated via Workflow Service or event choreography.
- **Idempotency:** Idempotency keys on APIs; dedup windows per tenant; exactly-once delivery simulated via outbox + consumer dedup.
- **Concurrency control:** Row versioning/optimistic locks on aggregates; retry with jitter.

### 10.4 Messaging Standards
- **Brokers:** Kafka/PubSub. Topic naming: `<domain>.<entity>.<event>.v<number>`.
- **Schemas:** Protobuf/Avro with Schema Registry; backward-compatible changes only (additive fields).
- **Tracing:** Propagate `traceparent`/correlation IDs across services, connector, and WhatsApp callbacks.
- **DLQ & Retries:** Exponential backoff with jitter, bounded retries, DLQ triage runbooks.

### 10.5 Security Hardening & Compliance
- **Identity & Access:** OAuth2/SSO, MFA, RBAC with least privilege; admin actions audited.
- **Secrets & Keys:** KMS-backed envelope encryption; per-tenant data keys; automated rotation.
- **Desktop Agent Security:** mTLS with certificate pinning; code signing (Windows/MSI, macOS notarization); auto-update with signature verification; OS sandboxed permissions.
- **Supply Chain:** SBOM (Syft), SLSA-aligned CI, dependency scanning (Dependabot/OSV), container image signing (Cosign).
- **Data Governance:** PII minimization, DLP scanning, data residency controls, retention policies.
- **Assurance:** Annual pen-tests, quarterly vuln SLAs, SOC2/ISO readiness plan.

### 10.6 SRE Practices & Observability
- **Golden Signals:** Latency, traffic, errors, saturation; queue depth metrics for backpressure.
- **SLIs/SLOs:** Error budgets gate releases; burn rate alerts (multi-window, multi-burn).
- **Telemetry:** Structured logs (PII-safe), distributed tracing via OpenTelemetry, RED/USE dashboards.
- **Runbooks & Chaos:** Runbooks per service; periodic game-days/chaos tests (e.g., broker outage, connector disconnects).

### 10.7 Scalability & Capacity Planning
- **Kubernetes:** HPA (CPU 60–70%, custom metrics e.g., queue depth), VPA for memory tuning; multi-AZ nodes.
- **Data Scaling:** Read replicas for Postgres; partitioning by `tenant_id`; warehouse rollups; ClickHouse for OLAP.
- **Throughput Controls:** Rate limits per tenant, token buckets; bulkheads and circuit breakers (resilience4j/envoy).
- **Performance Testing:** k6/Locust scenarios for WA latency, OCR pipeline throughput, ledger posting TPS.

### 10.8 Release Engineering & SDLC
- **Branching & Trains:** Trunk-based with release trains; DORA metrics tracked (lead time, deploy freq, MTTR, change fail rate).
- **Safe Deploys:** Blue/green & canary; progressive delivery via feature flags.
- **DB Migrations:** Zero-downtime (expand → backfill → switch → contract); online index builds.
- **ADRs:** Architecture Decision Records required for changes across domains/infrastructure.

### 10.9 Testing Strategy (Industrial)
- **Contracts:** Consumer-driven contracts (Pact) between services.
- **Accounting Invariants:** Property-based tests to ensure double-entry invariants and inventory balance.
- **E2E:** WhatsApp webhook → ledger post happy-path; failure-paths with retries/DLQ assertions.
- **Security & Compliance:** Secrets scanning pre-commit; authZ tests; data export redaction tests.
- **Performance/Soak:** Long-running OCR/backlog soak with memory leak detection.

### 10.10 Repository Structure Proposal
```
/frontend/nextjs
/services/
  conversation-service/
  ingestion-service/
  workflow-service/
  analytics-service/
/agent/tally-connector
/deploy/k8s
/infra/terraform
/docs/
  domain/
  runbooks/
  adr/
/.github/workflows
```

### 10.11 Implementation Playbooks
- **WhatsApp Price Queries:** Configure BSP, validate Excel schema, load stock items, run latency SLO dashboard, pilot with 5 tenants.
- **Desktop Agent Rollout:** Code signing, installer UX, health/auto-update, cert pinning validation, reconnect/backoff tests.
- **Invoice OCR:** Collect samples, label data, tune provider, human review UI, confidence thresholds, exception SLAs.
- **GST Helper:** Rule catalog, reconciliation checks, preview-before-file UX, legal disclaimers, audit trail exports.

### 10.12 Sample SLOs & Alerts
- `conversation-service`: p95 request latency < 500ms, error rate < 1%; alert if burn rate > 2 for 1h.
- `ingestion-service`: queue wait time p95 < 2m; alert if DLQ rate > 0.5% for 15m.
- `tally-connector`: online agents ≥ 98%; alert on >5% disconnections in 10m.

### 10.13 ADR Template
```
# ADR-XXX: <Title>
Date: <YYYY-MM-DD>
Status: Proposed | Accepted | Deprecated
Context: <Problem and constraints>
Decision: <Chosen option and rationale>
Alternatives: <Considered options>
Consequences: <Positive/Negative trade-offs>
Links: <PRs, issues>
```

### 10.14 Open Decisions & Trade-offs
- **WhatsApp Provider:** Meta Cloud API vs 360dialog vs Twilio. Trade-offs across onboarding speed, rate limits, templating UX, pricing, and support SLAs.
- **OCR Engine:** Azure Form Recognizer vs Google DocAI vs self-hosted PaddleOCR. Consider Indian invoice accuracy, latency, cost/page, PII handling and model adaptability.
- **Multi-tenancy:** Schema-per-tenant vs RLS on shared schema. Schema-per-tenant improves isolation/blast radius; RLS simplifies migrations and pooling.
- **Eventing:** Kafka vs GCP Pub/Sub vs AWS SNS+SQS. Kafka offers portability and fine control; managed services reduce ops and offer regional HA.
- **Vector Store:** Pinecone/Weaviate vs pgvector in Postgres. pgvector reduces moving parts; dedicated vector DB may scale and search better at large index sizes.
- **Job Orchestration:** Temporal vs BullMQ. Temporal adds durability and replayable workflows with strong observability; BullMQ is lighter but with less visibility.
- **Desktop Packaging:** MSI vs MSIX; code signing certs, auto-update channels (stable/beta) with signature verification.
- **Observability:** Datadog vs OSS stack (Prometheus/Grafana/Loki/Tempo). Balance speed-to-value, cost, and vendor lock-in.

### 10.15 SLO Matrix
| Area | SLI | SLO | Alert Policy |
|------|-----|-----|--------------|
| WhatsApp Replies | p95 latency | < 2s (p95), < 5s (p99) | Multi-burn alert if error budget burn rate > 2 over 1h |
| Invoice Ingestion | End-to-posting time | median < 5m, p95 < 10m | Page on backlog growth > 2× forecast for 30m |
| Tally Connector | Online agents | ≥ 98% online | Alert on >5% disconnections in 10m |
| Posting API | Error rate | < 1% 5xx | Page if > 1% for 10m or > 5% for 5m |
| DB Availability | Write success | 99.5% monthly | Page on failover; raise if RPO > 5m |

## 11. Capacity & Cost Model (Initial)
- Assumptions: 100 tenants, 10k WA msgs/day, 2k invoices/day (avg 1.2 pages).
- Conversation-service: 2–3 small pods (0.5–1 vCPU) autoscaled to ~6 on spikes.
- Ingestion-service: 2 workers baseline; scale to ~10 for 2k/day OCR within p95 < 10m.
- Event broker: 3-broker small Kafka cluster or managed equivalent.
- PostgreSQL: primary 2 vCPU with 1 read-replica; PITR enabled; storage auto-growth; partition by tenant.
- Storage: 2–3 TB/year documents; S3 IA lifecycle after 30 days.
- Estimated cloud budget (non-committed): $2–5k/month at stated scale; optimize via commitments and autoscaling.

## 12. File & Folder Structure (Expanded)

### 12.0 For Everyone (Grade 8)
- Think of folders like rooms in a house:
  - `frontend` is the shop counter you see.
  - `services` are the back rooms where work happens.
  - `agent` is the helper app near Tally.
  - `deploy` and `infra` are tools to set everything up safely on the internet.
  - `docs` is the instruction book.

### 12.1 Top-Level Layout (expanded from 10.10)
```
/frontend/nextjs                 # Web app (marketing + console)
/services/                      # Backend business services
  conversation-service/         # Chat + LLM tools
  ingestion-service/            # OCR + validation pipelines
  workflow-service/             # Reminders, approvals, schedules
  analytics-service/            # Reports, dashboards, read models
  compliance-service/           # GST/TDS logic & checks (optional now)
/agent/tally-connector          # Desktop agent for Tally XML API
/deploy/k8s                     # Kubernetes manifests (kustomize)
  base/
  overlays/{dev,staging,prod}/
/infra/terraform                # Cloud infra as code
  modules/                      # vpc, eks, rds, s3, msk, iam
  envs/{dev,staging,prod}/
/docs                           # Knowledge & operations
  domain/                       # Accounting rules, mappings
  runbooks/                     # Incident & operations guides
  api/                          # OpenAPI/GraphQL contracts
  adr/                          # Architecture decision records
/.github/workflows              # CI pipelines
```

### 12.2 Frontend (Next.js)
```
/frontend/nextjs
  app/
    (marketing)/                # Landing & feature pages (SSR)
    dashboard/                  # Authenticated app console
    chat/                       # Chat UI (SSE/WebSocket)
    api/                        # Route handlers (if needed)
  components/                   # UI components (shadcn)
  lib/                          # api client, auth utils
  styles/                       # Tailwind/CSS
  public/                       # Static assets
  next.config.js
  tailwind.config.js
```
Developer notes: SSR for public pages, client components for dynamic UI, axios with `withCredentials`, sanitize uploads, no PII in logs.

### 12.3 Conversation Service (FastAPI)
```
/services/conversation-service
  app/
    api/v1/                     # HTTP endpoints
    core/config.py              # settings, DI
    services/llm_orchestrator/  # tool calling & routing
    tools/                      # callable tools (price lookup, posting)
    schemas/                    # pydantic request/response
    models/                     # ORM entities (readonly)
    db/                         # session, migrations
  tests/
  pyproject.toml
  Dockerfile
```
Developer notes: Keep endpoints thin; domain logic in services; propagate trace IDs; emit outbox events for downstream.

### 12.4 Ingestion Service (OCR + Validation)
```
/services/ingestion-service
  app/
    api/v1/uploads.py           # upload, status
    pipelines/                  # OCR pipelines, parsing
    providers/                  # azure_form_recognizer, tesseract
    validators/                 # field checks, confidence rules
    review/                     # human-in-loop tasks
    queues/                     # job enqueue/dequeue
  workers/                      # background workers
  tests/
  Dockerfile
```
Developer notes: Long-running via workers; idempotent jobs; DLQ; store artifacts in S3; only references to sensitive content (no raw PII in logs).

### 12.5 Workflow Service
```
/services/workflow-service
  app/
    jobs/                       # reminders, periodic tasks
    schedules/                  # cron/temporal workflows
    adapters/                   # whatsapp/slack/email senders
    api/v1/                     # admin & status endpoints
  tests/
```

### 12.6 Analytics/Compliance Service
```
/services/analytics-service
  app/
    queries/                    # OLAP queries
    reports/                    # cached dashboards
    api/v1/                     # reporting endpoints

/services/compliance-service
  app/
    gst/                        # rule evaluations
    tds/                        # withholding logic
    validators/
    api/v1/
```

### 12.7 Tally Connector (Electron)
```
/agent/tally-connector
  src/
    main/                       # electron main process, tunnel
    renderer/                   # local UI (status/settings)
    services/tally/             # XML API adapters
    secure-tunnel/              # mTLS, reconnection, backoff
    updates/                    # auto-update handlers
  package.json
  electron-builder.yml
  scripts/
  installers/
```
Developer notes: Code-signed; auto-update with signature verification; idempotent write operations; privacy-safe telemetry.

### 12.8 Deploy (Kubernetes)
```
/deploy/k8s
  base/                         # common manifests
  overlays/dev/                 # dev values, image tags
  overlays/staging/
  overlays/prod/
  kustomization.yaml
```
Developer notes: Use feature flags; blue/green or canary; sealed secrets or external secrets to pull from Vault/KMS.

### 12.9 Infra (Terraform)
```
/infra/terraform
  modules/
    vpc/ eks/ rds/ s3/ msk/ iam/
  envs/
    dev/
    staging/
    prod/
```
Developer notes: Per-environment state; least privilege IAM; networking with multi-AZ; DB with PITR & read replicas.

### 12.10 Docs
```
/docs
  domain/                       # double-entry invariants, Tally→domain mapping
  runbooks/                     # outages, reconnection, DLQ triage
  api/                          # OpenAPI specs
  adr/                          # decisions with context & trade-offs
```

### 12.11 Config & Secrets
- 12-factor configuration via env vars; no secrets in repo.
- Secrets from Vault/KMS; rotate regularly.
- Per-tenant encryption keys where applicable.

---
**Ownership:** DiscoverMinds · Tara Program. Updated Oct 28, 2025.
