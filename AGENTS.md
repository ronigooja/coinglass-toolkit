# Rules

1. When writing repository documentation, use English, keep it concise, and define each fact in one file only.
2. When adding or changing behavior, update the owning document in the same commit.
3. When removing a module or venue, delete its documentation in the same commit.
4. When adding a feature, create one folder under `extension/modules/` and do not import from other modules.
5. When code needs shared logic, put it under `extension/shared/`.
6. When handling cookies, tokens, or captured CoinGlass responses, never write them into the repository.
7. When fetching orderbooks, use public exchange endpoints that need no API key.
8. When a page fact has not been verified on a live logged-in page, mark it `Unverified` in [docs/coinglass-page.md](docs/coinglass-page.md).
9. When running Apple builds, use a GitHub-hosted macOS runner.
