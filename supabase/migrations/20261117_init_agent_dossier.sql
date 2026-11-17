-- Supabase Migration: 20261117_init_agent_dossier.sql
-- Архитектура таблиц для профилей агентов, матчей и статистики с защитой RLS

-- 1. Таблица профилей агентов (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_name TEXT UNIQUE NOT NULL,
    avatar_id TEXT NOT NULL DEFAULT 'agent_01',
    mmr INTEGER NOT NULL DEFAULT 1000,
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins_detective INTEGER NOT NULL DEFAULT 0,
    wins_maniac INTEGER NOT NULL DEFAULT 0,
    cash INTEGER NOT NULL DEFAULT 1500,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    rank TEXT NOT NULL DEFAULT 'Стажёр',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Индексы для таблицы profiles
CREATE INDEX IF NOT EXISTS idx_profiles_mmr ON public.profiles(mmr DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_agent_name ON public.profiles(agent_name);

-- 2. Таблица матчей (matches)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL,
    winner_role TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at DESC);

-- 3. Таблица участников матчей (match_participants)
CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    is_winner BOOLEAN NOT NULL DEFAULT false,
    mmr_delta INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_match_participant_profile UNIQUE (match_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_match_participants_profile ON public.match_participants(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_participants_match ON public.match_participants(match_id);

-- 4. Настройка Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

-- Политики для profiles:
-- Чтение разрешено всем пользователям (публичные досье)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Создание профиля разрешено только владельцу учетной записи
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Обновление профиля: разрешено только владельцу учетной записи
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ограничение на уровне колонок: запрещаем прямое обновление любых колонок, кроме agent_name и avatar_id
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (agent_name, avatar_id) ON public.profiles TO authenticated;

-- Политики для matches и match_participants:
CREATE POLICY "Matches viewable by everyone" 
ON public.matches FOR SELECT 
USING (true);

CREATE POLICY "Match participants viewable by everyone" 
ON public.match_participants FOR SELECT 
USING (true);

-- 5. Защита от накрутки: Триггер запрета прямого изменения характеристик профиля клиентом
-- Клиенту РАЗРЕШЕНО менять только agent_name и avatar_id. Все остальные поля защищены!
CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF current_user = 'authenticated' THEN
        IF (NEW.id <> OLD.id OR
            NEW.mmr <> OLD.mmr OR 
            NEW.matches_played <> OLD.matches_played OR 
            NEW.wins_detective <> OLD.wins_detective OR 
            NEW.wins_maniac <> OLD.wins_maniac OR
            NEW.cash <> OLD.cash OR
            NEW.xp <> OLD.xp OR
            NEW.level <> OLD.level OR
            NEW.rank <> OLD.rank OR
            NEW.created_at <> OLD.created_at) THEN
            RAISE EXCEPTION 'Прямое изменение характеристик профиля запрещено. Разрешено менять только agent_name и avatar_id. Для результатов матчей используйте RPC record_match_result.';
        END IF;
    END IF;
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_stats ON public.profiles;
CREATE TRIGGER trg_protect_profile_stats
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_stats();

-- 6. Хранимая функция (RPC): Безопасная запись результатов матча с античитом
CREATE OR REPLACE FUNCTION public.record_match_result(
    p_mode TEXT,
    p_winner_role TEXT,
    p_duration_seconds INTEGER,
    p_role TEXT,
    p_is_winner BOOLEAN,
    p_mmr_delta INTEGER DEFAULT 0,
    p_match_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_match_id UUID;
    v_new_mmr INTEGER;
    v_new_wins_det INTEGER := 0;
    v_new_wins_man INTEGER := 0;
    v_already_participated BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Пользователь не авторизован';
    END IF;

    -- Античит 1: Проверка длительности матча (> 10 секунд)
    IF p_duration_seconds <= 10 THEN
        RAISE EXCEPTION 'Античит: подозрительная длительность матча (% сек). Матч не может завершиться быстрее 11 секунд.', p_duration_seconds;
    END IF;

    -- Античит 2: Проверка уникальности записи: один игрок не может зафиксировать результат за один и тот же match_id дважды
    IF p_match_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = p_match_id AND profile_id = v_user_id
        ) INTO v_already_participated;

        IF v_already_participated THEN
            RAISE EXCEPTION 'Античит: результат матча % уже зафиксирован для данного игрока', p_match_id;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = p_match_id) THEN
            INSERT INTO public.matches (id, mode, winner_role, duration_seconds)
            VALUES (p_match_id, p_mode, p_winner_role, p_duration_seconds);
        END IF;
        v_match_id := p_match_id;
    ELSE
        -- Создаем новую запись матча с автогенерируемым ID
        INSERT INTO public.matches (mode, winner_role, duration_seconds)
        VALUES (p_mode, p_winner_role, p_duration_seconds)
        RETURNING id INTO v_match_id;
    END IF;

    -- Привязываем участника
    INSERT INTO public.match_participants (match_id, profile_id, role, is_winner, mmr_delta)
    VALUES (v_match_id, v_user_id, p_role, p_is_winner, p_mmr_delta);

    -- Рассчитываем инкременты побед
    IF p_is_winner THEN
        IF p_role = 'DETECTIVE' THEN
            v_new_wins_det := 1;
        ELSIF p_role = 'KILLER' THEN
            v_new_wins_man := 1;
        END IF;
    END IF;

    -- Обновляем профиль агента
    UPDATE public.profiles
    SET 
        matches_played = matches_played + 1,
        wins_detective = wins_detective + v_new_wins_det,
        wins_maniac = wins_maniac + v_new_wins_man,
        mmr = GREATEST(100, mmr + p_mmr_delta),
        xp = xp + (CASE WHEN p_is_winner THEN 50 ELSE 15 END),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id
    RETURNING mmr INTO v_new_mmr;

    RETURN jsonb_build_object(
        'ok', true,
        'match_id', v_match_id,
        'new_mmr', v_new_mmr
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
