-- Supabase Migration: 20261120_feedback.sql
-- Таблица сбора обратной связи (баг-репорты, идеи, предложения) с защитой RLS

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('bug', 'idea', 'other')),
    message TEXT NOT NULL CHECK (char_length(trim(message)) >= 3 AND char_length(message) <= 2000),
    app_version TEXT NOT NULL DEFAULT '0.9.0',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Индексы для анализа и фильтрации
CREATE INDEX IF NOT EXISTS idx_feedback_category ON public.feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Включение Row Level Security (RLS)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 1. INSERT: Разрешён как анонимным (anon), так и авторизованным (authenticated) игрокам
CREATE POLICY "Anyone can submit feedback" 
ON public.feedback FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 2. SELECT: Чтение чужих отзывов клиентами запрещено. Доступ открыт только через service_role (администраторы)
