# coinglass-toolkit

Unofficial Safari WebExtension that adds features to CoinGlass pages. Not affiliated with CoinGlass.

## Document map

Read only what the task needs.

| File | Type | Contents | Read when |
|---|---|---|---|
| [AGENTS.md](AGENTS.md) | Rules | Rules for agents working in this repo | Always first |
| [docs/development.md](docs/development.md) | Process | Test, package, add a module, add a venue | Changing code |
| [docs/architecture.md](docs/architecture.md) | Design | Layers, data flow, module contract | Changing structure or adding a module |
| [docs/coinglass-page.md](docs/coinglass-page.md) | Facts | Observed CoinGlass page facts with verification status | Writing page hooks |
| [extension/modules/impact-cost/README.md](extension/modules/impact-cost/README.md) | Spec | Order book cumulative depth curve | Working on that module |
| [extension/shared/venues/README.md](extension/shared/venues/README.md) | Contract | Orderbook adapter interface | Adding or changing a venue |

Modules are the folders under `extension/modules/`.
