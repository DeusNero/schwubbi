-- Run this ONCE in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- It creates the storage buckets, tables, and access policies.

-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbs', 'thumbs', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('full', 'full', true);

-- 2. Storage policies: anyone can read, anyone can upload
CREATE POLICY "Public read thumbs" ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbs');

CREATE POLICY "Anyone can upload thumbs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbs');

CREATE POLICY "Public read full" ON storage.objects FOR SELECT
  USING (bucket_id = 'full');

CREATE POLICY "Anyone can upload full" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'full');

-- 3. Create images table
CREATE TABLE public.images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read images" ON public.images FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert images" ON public.images FOR INSERT
  WITH CHECK (true);

-- 4. Create backups table
CREATE TABLE public.backups (
  code text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read backups" ON public.backups FOR SELECT
  USING (true);

CREATE POLICY "Anyone can upsert backups" ON public.backups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update backups" ON public.backups FOR UPDATE
  USING (true);
