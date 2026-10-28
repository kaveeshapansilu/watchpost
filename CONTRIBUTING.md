# Contributing

1. Fork the repository and create a focused branch.
2. Use Node.js 22.18+ and run `npm ci`.
3. Run `npm run setup` against your own test website and Supabase project. Never use someone else's production database.
4. Make the change and run `npm run check`.
5. For UI changes, check desktop/mobile layouts and keyboard access. For database changes, test a fresh schema and an upgrade, public reads, admin writes, and denied viewer writes.
6. Submit a pull request explaining the problem, change, and validation.

Keep `.env` files and generated monitor secrets out of commits. Use example domains and synthetic data in tests. Review `site.config.json` before submitting: personal deployment settings should not replace the generic defaults in a contribution.

For schema changes, add an idempotent migration and update `supabase/schema.sql` so fresh installations remain complete. Preserve existing data and completion state where applicable. Keep third-party notices up to date when runtime dependencies change.

Use descriptive commit subjects such as `fix: preserve maintenance completion when editing`. Keep changes focused, explain the user-visible behavior, and note migrations in the pull request. Check both public and admin routes when changing authentication.
