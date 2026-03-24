-- Supabase PostgreSQL Schema Deployment for Skillhub
-- Converts NoSQL structures to rigid relational tables natively.

-- 1. Users Table (Public Profile attached to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  "avatarUrl" TEXT,
  role TEXT DEFAULT 'Developer',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Active',
  "coverUrl" TEXT,
  "createdBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
  members UUID[] DEFAULT '{}', -- Array of User IDs
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read projects" ON public.projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert projects" ON public.projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update projects" ON public.projects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete projects" ON public.projects FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "projectId" UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'To Do',
  urgency TEXT DEFAULT 'Medium',
  assignee TEXT DEFAULT 'Unassigned',
  "startDate" TEXT,
  "dueDate" TEXT,
  "timeEstimated" TEXT,
  tags TEXT[] DEFAULT '{}',
  "screenshotUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read tasks" ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update tasks" ON public.tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete tasks" ON public.tasks FOR DELETE USING (auth.role() = 'authenticated');

-- Create Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('skillhub-bucket', 'skillhub-bucket', true) ON CONFLICT DO NOTHING;

-- Enable RLS for Storage Bucket
CREATE POLICY "Allow authenticated uploads to skillhub-bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'skillhub-bucket' AND auth.role() = 'authenticated');
CREATE POLICY "Allow public read access to skillhub-bucket" ON storage.objects FOR SELECT USING (bucket_id = 'skillhub-bucket');
CREATE POLICY "Allow authenticated updates to skillhub-bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'skillhub-bucket' AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes to skillhub-bucket" ON storage.objects FOR DELETE USING (bucket_id = 'skillhub-bucket' AND auth.role() = 'authenticated');
