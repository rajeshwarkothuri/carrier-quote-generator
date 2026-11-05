# Carrier Quote Integration POC

A Next.js and TypeScript proof of concept for translating a versioned customer profile into a carrier-specific renters quote request. Harbor Assurance is the sample carrier. The project demonstrates field mapping, explicit handling of missing or ambiguous answers, eligibility gates, schema-driven forms, server-side validation, and an adapter contract that can be reused as carriers are added.

> This is an integration prototype, not a production insurance quoting service. Harbor's transport is mocked; authentication and a persistent database are not implemented.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The sample selector provides one eligible and one ineligible profile. You can also paste a canonical profile as JSON. To run the project's automated checks:

```bash
npm test
npm run build
```

## Request flow

```text
Sample or pasted JSON
  → server action parses and validates canonical profile v1
  → profile saved in a short-lived server-side session
  → carrier adapter maps profile into Harbor fields
  → mapping contract checks output against carrier schema
  → schema gates determine eligibility (or pending answers)
  → schema-driven form asks for missing answers / confirms derived values
  → server reloads profile, rechecks eligibility and validates submitted fields
  → resilience wrapper calls registered carrier transport
  → result, carrier reference and trace id are shown
```

The canonical profile is held on the server and referenced by an `httpOnly`, `sameSite=strict` cookie. Profile data is not put into the URL. The browser sends completed quote fields to a server action; the server retrieves the profile from the session and does the authoritative eligibility and payload checks again.

## Mapping policy

The mapping layer makes its decisions explicit for every carrier field: `mapped`, `converted`, or `unmapped`. Unmapped decisions distinguish `missing` information from information the carrier cannot support. Converted values include a human-readable explanation; values derived from partial facts can be flagged for customer confirmation. The form displays these statuses and asks the customer to complete unknown required fields.

| Canonical profile input | Harbor field | Decision |
|---|---|---|
| `first_name` + `last_name` | `applicant_full_name` | Join names; mark as converted. If either is absent, ask for the full name. |
| `date_of_birth` | `date_of_birth` | Format ISO `YYYY-MM-DD` as Harbor's `MM/DD/YYYY`. |
| `email` | `contact_email` | Direct mapping. |
| (not present in canonical model) | `phone` | Leave unmapped and ask the customer. |
| `state` | `residence_state` | Convert the state code to its full name only if it is an available Harbor option; otherwise the state is unsupported and fails an eligibility gate. |
| `zip` | `postal_code` | Direct mapping. |
| `personal_property_value` | `contents_coverage` | Select the smallest available tier that covers the value, and request confirmation. Values above the top tier are unsupported and fail eligibility. |
| `has_dog` | `pets` | Map true to Dog or false to None, but request confirmation because the profile does not say whether cats or other pets are present. Unknown stays blank. |
| `dog_breed` | `dog_breed` | Direct map a supported breed; map an unlisted breed to Other; if absent while a dog is selected, ask. |
| `claims_last_3_years` | `claims_last_5_years` | Never map: the look-back periods differ. Ask the customer instead. |
| `extensions.building_has_sprinklers` | `building_has_sprinklers` | Direct map only when the extension is a boolean; otherwise ask if needed. |

The guiding rule is not to infer an answer when the source fact does not carry the same meaning as the carrier question. In particular, absence is not treated as `false`, and three years of claims are not represented as five years.

## Project structure

| Area | Files | Responsibility |
|---|---|---|
| UI and routing | `app/page.tsx`, `components/` | Profile entry, sample selection, and a form rendered from the active carrier schema. |
| Server actions | `app/actions.ts` | Parse profile input, start/clear sessions, revalidate quote submissions, and invoke transport. |
| Canonical customer model | `lib/canonical.ts` | Versioned profile shape, strict validation, unknown-field reporting, and product-specific `extensions`. |
| Shared quote core | `lib/core/` | Mapping builder, reusable conversions, shared validator, eligibility evaluator, orchestration pipeline, schema fingerprinting, and adapter contract test helper. |
| Carrier integrations | `lib/carriers/<carrier>/` | Carrier-specific schema/version/gates (`definition`), field decisions (`mapping`), and network boundary (`transport`). |
| Carrier registry | `lib/carriers/registry.ts` | Associate each carrier ID with an adapter and transport. |
| Session | `lib/session/` | Cookie handling and session-store interface. Current store is process memory with a 30-minute TTL. |
| Resilience and operations | `lib/integration/resilience.ts`, `lib/ops/metrics.ts`, `app/api/health/route.ts` | Timeouts, retry policy, local rate limiting, trace IDs, server-side secret lookup helper, and basic counters/health metadata. |
| Carrier schema and examples | `data/harbor.schema.json`, `data/profiles.json` | Harbor renters fields/options/conditional visibility and demo profiles. |
| Tests | `__tests__/` | Canonical parsing, mapping/eligibility contract, validation, sessions, resilience, and UI behavior. |

## Core design and adding a carrier

The shared `assess` pipeline runs the adapter mapping, checks that its output conforms structurally to the carrier schema, then evaluates eligibility using schema fields designated as gates. The schema's validation rules are reused by the form, mapping checks, eligibility, and server submission. This reduces the chance that separate layers disagree about a field's format or constraints.

To add a carrier/product:

1. Add a carrier schema describing field types, requiredness, choices, conditional visibility, and validation.
2. Add a carrier definition with carrier/product/schema/mapping versions and the fields that gate eligibility.
3. Implement explicit mapping decisions in the carrier's mapping module, reusing shared converters where their semantics match.
4. Implement a transport for the carrier API and register the adapter/transport pair.
5. Add fixtures covering normal, missing, ambiguous, unsupported, boundary, and ineligible cases; run the adapter contract helper and pin the schema fingerprint.

The contract checks schema fingerprint, gate definitions, structurally valid output, one mapping decision per visible field, determinism, eligibility, and expected mapped/unmapped cases. This makes adding an adapter mostly additive and catches schema drift early. It does not make 50 carriers a configuration-only task: each carrier still needs researched mappings, product-specific rules, API credentials, transport behavior, fixtures, and ongoing updates. Reuse should come from the shared profile/core and converters, while carrier-specific semantics remain isolated.

## Scaling assessment

The architecture is a credible foundation for a larger carrier catalog, but the current deployment model is not ready to serve production traffic across 50 carriers. The design scales organizationally (clear adapter boundaries and contracts); the prototype does not yet scale operationally (persistent sessions, distributed limits, real APIs, production identity/observability).

Before production, prioritize:

1. **Identity and access control:** add authentication and user/session authorization if profiles need to be tied to a person or account. The current cookie identifies an anonymous session; it does not authenticate anyone.
2. **Durable session/profile storage:** replace the in-memory `Map` with an encrypted persistent store such as a database or Redis, keyed to the authenticated principal and with retention/deletion policy. Current data disappears on process restart and is not shared across instances.
3. **Real carrier transports:** implement each carrier's auth, request/response mapping, error semantics, timeouts, and idempotency contract. Harbor currently returns a mock receipt and does not make an HTTP request.
4. **Distributed controls:** move local in-process rate limits and counters to shared infrastructure; add dashboards, alerts, and per-carrier health metrics.
5. **Security review:** review session hardening, CSRF boundaries, PII handling, secret rotation, encryption, and health endpoint access for the intended deployment.
6. **Operational versioning:** manage schema/mapping releases and carrier credentials/configuration, monitor failures by carrier/product/version, and make carrier enablement/rollback configurable.

## Authentication and database: what is present vs optional

This POC intentionally has **no login/authentication provider and no database setup**. It uses a short-lived opaque session ID in an `httpOnly` cookie and a process-local in-memory store. That keeps local demonstration simple and avoids putting profile JSON into the URL, but it is ephemeral, anonymous, and single-process. The cookie is session management, not user authentication.

Whether authentication and a database are required depends on the product requirements. For a local/demo flow with disposable profiles, neither is needed. For real customer data, multi-instance deployment, durable quote history, cross-device access, auditability, or account ownership, implement authentication/authorization and a persistent encrypted database/session store before launch. The `SessionStore` interface in `lib/session/store.ts` is a seam for replacing the current implementation; no DB schema, ORM, migrations, or DB connection is included here.

## AI-assisted workflow (fill in with your actual history)

The source code does not record which AI tool was used during implementation. For an interview, describe only the tool and setup you actually used. A clear explanation should cover:

- Tool/model and where you used it (for example, IDE assistant or chat); whether it could inspect the repository or only the prompt.
- The task prompt you gave it, including constraints such as preserving explicit unknowns, not equating different claims periods, and keeping carrier-specific rules in adapters.
- What you reviewed or changed yourself: field semantics, eligibility rules, privacy handling, and architecture decisions.
- How you checked output: inspect the mapping code, compare payloads to the carrier schema, run focused contract/boundary tests, and run the app/build. Mention only checks you actually ran.
- An example of a suggestion you rejected or corrected, if one occurred; explain the evidence behind that decision.

Do not present the suggested workflow as a factual account unless it matches your actual process. A fill-in answer template is in [`docs/INTERVIEW_GUIDE.md`](docs/INTERVIEW_GUIDE.md).

## Health endpoint

`GET /api/health` reports registered carrier/product versions, schema fingerprints, and process-local counters. It contains no customer profile values. It is a prototype endpoint; production deployments should apply the appropriate access policy and export metrics to shared monitoring.
