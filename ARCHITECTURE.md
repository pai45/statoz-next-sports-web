# StatOz web architecture

This project uses the Next.js App Router with feature-first application code.
The route tree describes URLs and layouts; product logic lives in feature,
domain, server, and shared modules.

## Directory responsibilities

- `src/app`: Route groups, route segments, layouts, pages, and route handlers.
  Keep route files thin and compose them from feature modules.
- `src/features`: User-facing capabilities. A feature owns its components,
  state, data adapters, and feature-specific types.
- `src/design-system`: Visual tokens and reusable, product-agnostic interface
  components such as inputs, alerts, search bars, cards, and dialogs.
- `src/domain`: Business types and rules shared by multiple features.
- `src/server`: Server-only integrations, repositories, services, and storage.
  Client Components must not import from this directory.
- `src/shared`: Non-visual configuration, providers, hooks, styles, and
  utilities that do not contain feature-specific business rules.
- `public/assets`: Static media served by URL.
- `tests/e2e`: Cross-feature browser journeys.

## Route plan

```text
src/app/
|-- (onboarding)/
|   |-- login/
|   `-- onboarding/
|-- (platform)/
|   |-- matches/[matchId]/
|   |-- leagues/[leagueId]/
|   |-- picks/
|   |-- games/[sport]/
|   |-- cards/
|   |-- decks/[sport]/
|   |-- leaderboard/
|   |-- shop/
|   |-- friends/
|   `-- profile/{achievements,history}/
|-- (fullscreen)/play/[game]/
`-- api/{scores,matches,picks}/
```

Folders in parentheses are route groups and do not appear in the URL. A route
becomes public only after it receives a `page.tsx` or `route.ts` file.

## Feature shape

Create only the folders a feature needs:

```text
src/features/<feature>/
|-- components/
|-- state/
|-- data/
|-- types.ts
|-- constants.ts
|-- index.ts
`-- __tests__/
```

Interactive games may also include `engine/`. The feature-root `index.ts` is
the public API; avoid importing another feature's internal files.

## Flutter migration map

| Flutter source | Web destination |
| --- | --- |
| `screens/` | `src/app` route plus feature components |
| `widgets/` | Feature components or `src/design-system/components` |
| `blocs/` | Feature-local `state` |
| `games/` | `src/features/games/<game>/engine` |
| `models/` | `src/domain` or feature-local `types.ts` |
| `services/` | `src/server` or a feature data adapter |
| `data/` | The owning feature's `data` directory |
| `assets/` | `public/assets` |

## Dependency direction

```text
app -> features -> domain
 |        |          |
 |        |          `------> shared
 |        `------> design-system + shared
 `---------------> design-system + shared

server -> domain + shared
```

`design-system`, `domain`, and `shared` must not import from `app` or
`features`. Feature-specific browser state stays inside its feature instead of
becoming a single global app store.
