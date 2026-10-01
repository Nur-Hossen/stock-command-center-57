Your Supabase migration scripts are already in the repo at `docs/migrations/` — files `00001_profiles_and_user_roles.sql` through `00011_updated_at_triggers.sql`. They create all tables (profiles, user_roles, categories, suppliers, locations, items, stock_movements, purchase_orders, inventory_requests, custom_field_definitions, notifications), the `app_role` enum, the `has_role` security-definer function, and all RLS policies.

To apply them to your own Supabase project locally:

1. Create a Supabase project at https://supabase.com (or run `supabase start` locally with the Supabase CLI).

2. Run the migrations in order using either method:

   Option A — Supabase Dashboard: Open SQL Editor → paste each file's contents in order (00001 → 00011) → Run.

   Option B — Supabase CLI:
   ```bash
   # Copy the SQL files into the CLI's expected folder
   mkdir -p supabase/migrations
   cp docs/migrations/*.sql supabase/migrations/
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. Add env vars to a local `.env` file so the app can connect:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. Grant yourself the admin role after your first signup:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('<your-auth-user-id>', 'admin');
   ```

5. `bun install && bun dev` — the app will now use your Supabase instead of demo mode.

Want me to also generate a consolidated single-file `schema.sql` (all 11 migrations merged) for easier one-shot execution?