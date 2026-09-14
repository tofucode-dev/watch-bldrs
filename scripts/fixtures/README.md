# Catalog demo fixtures

The seed script loads per-build mock photos from `scripts/fixtures/mocks/` (`mock_1.png` … `mock_10.png`).

Each mock is seeded three times with the same image and varied dial colour / story text. Movements and styles not in the app enums (for example Miyota 9039, Racing, Minimal) map to the closest allowed value or `other`.

Run:

```bash
npm run db:seed-catalog-demo
```

Overrides:

```bash
# Use a different mocks directory
npm run db:seed-catalog-demo -- --mocks-dir path/to/mocks

# Fallback single image for every build if mocks are missing
npm run db:seed-catalog-demo -- --image path/to/your-watch.jpg
```

Supported image extensions: `.png`, `.jpg`, `.jpeg`, `.webp`.

## Production deploy (CI)

After each push to `main`, the deploy job runs this script against hosted Supabase with `--allow-remote`. It deletes **all** builds and their main images, then re-seeds the demo catalog for `catalog-demo@example.com`.

Required GitHub Actions secret (deploy job only):

- `SUPABASE_SERVICE_ROLE_KEY` — hosted project service role key

`SUPABASE_URL` is already required for the build step.
