-- ============================================================
-- v8: Finance Feature
-- Adds invoices + expenses tables, with CEO-only RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "projectId" UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  "invoiceNumber" TEXT,
  client TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  "issuedDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "dueDate" DATE,
  "paidDate" DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  description TEXT,
  "createdBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_project ON public.invoices("projectId");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON public.invoices("dueDate");

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "projectId" UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'general',
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  "createdBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.expenses("projectId");
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CEO only on invoices" ON public.invoices;
DROP POLICY IF EXISTS "CEO only on expenses" ON public.expenses;

CREATE POLICY "CEO only on invoices" ON public.invoices
  FOR ALL USING (public.is_ceo()) WITH CHECK (public.is_ceo());

CREATE POLICY "CEO only on expenses" ON public.expenses
  FOR ALL USING (public.is_ceo()) WITH CHECK (public.is_ceo());

-- Seed a few invoices for the existing projects so the page isn't empty on first visit.
INSERT INTO public.invoices ("projectId", "invoiceNumber", client, amount, currency, "issuedDate", "dueDate", status, description)
SELECT
  id,
  'INV-' || LPAD((ROW_NUMBER() OVER (ORDER BY "createdAt"))::text, 4, '0'),
  COALESCE(client, 'Sample Client'),
  (RANDOM() * 4500 + 500)::NUMERIC(12,2),
  'USD',
  CURRENT_DATE - (RANDOM() * 30)::INT,
  CURRENT_DATE + (RANDOM() * 30)::INT - 5,
  (ARRAY['pending', 'paid', 'overdue'])[FLOOR(RANDOM() * 3 + 1)::INT],
  'Initial seed invoice for ' || title
FROM public.projects
LIMIT 12
ON CONFLICT DO NOTHING;

-- Done. v8 applied.
