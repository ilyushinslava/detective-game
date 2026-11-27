-- Supabase Migration: 20261127_record_match_anticheat.sql
-- P0-4: Серверный античит для RPC record_match_result + идемпотентность награды/MMR.
--
-- Что меняется:
--   1. Клиентские p_is_winner / p_mmr_delta больше НЕ являются источником истины:
--      победитель и дельта MMR пересчитываются на стороне БД по серверным правилам.
--   2. p_match_id обязателен (NOT NULL) и является ключом идемпотентности:
--      повторный вызов с тем же match_id НЕ начисляет MMR/cash повторно,
--      а возвращает текущее состояние профиля (idempotent = true).
--   3. Длительность матча валидируется (минимум 11 сек) и клампится по верхней
--      границе режима — завышенная клиентом длительность не принимается.
--   4. Награда cash и дельта MMR ограничены серверными рамками (anti-cheat clamps).
--   5. Сигнатура функции сохранена (обратная совместимость с существующими вызовами),
--      поэтому старые клиенты не ломаются — они просто получают серверные значения.
--
-- Миграция не изменяет старые файлы и сохраняет историю.

CREATE OR REPLACE FUNCTION public.record_match_result(
    p_mode TEXT,
    p_winner_role TEXT,
    p_duration_seconds INTEGER,
    p_role TEXT,
    p_is_winner BOOLEAN DEFAULT NULL,
    p_mmr_delta INTEGER DEFAULT 0,
    p_match_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    -- Серверные рамки (anti-cheat clamps)
    c_min_duration CONSTANT INTEGER := 11;
    c_mmr_win CONSTANT INTEGER := 25;
    c_mmr_loss CONSTANT INTEGER := -20;
    c_mmr_abs_max CONSTANT INTEGER := 30;
    c_cash_win CONSTANT INTEGER := 100;
    c_cash_loss CONSTANT INTEGER := 25;
    c_cash_max CONSTANT INTEGER := 300;

    v_user_id UUID;
    v_match_id UUID;
    v_mode TEXT;
    v_role TEXT;
    v_winner_role TEXT;
    v_is_winner BOOLEAN;
    v_duration INTEGER;
    v_max_duration INTEGER;
    v_mmr_delta INTEGER;
    v_cash_award INTEGER;
    v_new_mmr INTEGER;
    v_new_cash INTEGER;
    v_inserted INTEGER;
    v_existing_is_winner BOOLEAN;
    v_existing_duration INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Пользователь не авторизован' USING ERRCODE = '28000';
    END IF;

    -- Античит 0: match_id обязателен и служит ключом идемпотентности
    IF p_match_id IS NULL THEN
        RAISE EXCEPTION 'Античит: match_id обязателен для фиксации результата матча'
            USING ERRCODE = '22023';
    END IF;

    v_mode := upper(coalesce(p_mode, ''));
    v_role := upper(coalesce(p_role, ''));
    v_winner_role := upper(coalesce(p_winner_role, ''));

    -- Валидация режима и роли
    IF v_mode NOT IN ('MANIAC_VS_OPERATIVE', 'THIEF_HUNT', 'SECRET_SERVICE', 'LINE_UP') THEN
        RAISE EXCEPTION 'Античит: неизвестный режим матча (%)', p_mode
            USING ERRCODE = '22023';
    END IF;

    IF v_role NOT IN ('DETECTIVE', 'KILLER', 'SPY') THEN
        RAISE EXCEPTION 'Античит: неизвестная роль игрока (%)', p_role
            USING ERRCODE = '22023';
    END IF;

    -- Верхняя граница длительности зависит от режима
    v_max_duration := CASE v_mode
        WHEN 'SECRET_SERVICE' THEN 7200
        WHEN 'LINE_UP' THEN 1800
        ELSE 3600
    END;

    -- Античит 1: минимальная реалистичная длительность матча
    IF p_duration_seconds IS NULL OR p_duration_seconds <= (c_min_duration - 1) THEN
        RAISE EXCEPTION 'Античит: подозрительная длительность матча (% сек). Матч не может завершиться быстрее % секунд.',
            p_duration_seconds, c_min_duration
            USING ERRCODE = 'P0001';
    END IF;

    -- Завышенную клиентом длительность клампим к верхней границе режима
    v_duration := LEAST(p_duration_seconds, v_max_duration);

    -- Античит 2: идемпотентность — повторный match_id не начисляет награду
    SELECT mp.is_winner, m.duration_seconds
      INTO v_existing_is_winner, v_existing_duration
      FROM public.match_participants mp
      JOIN public.matches m ON m.id = mp.match_id
     WHERE mp.match_id = p_match_id AND mp.profile_id = v_user_id
     LIMIT 1;

    IF FOUND THEN
        SELECT mmr, cash INTO v_new_mmr, v_new_cash
          FROM public.profiles WHERE id = v_user_id;

        RETURN jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'match_id', p_match_id,
            'is_winner', v_existing_is_winner,
            'mmr_delta', 0,
            'cash_awarded', 0,
            'new_mmr', coalesce(v_new_mmr, 0),
            'new_cash', coalesce(v_new_cash, 0),
            'duration_seconds', v_existing_duration
        );
    END IF;

    -- Серверное определение победителя (клиентский p_is_winner — только подсказка)
    v_is_winner := (v_role = v_winner_role);

    -- В SECRET_SERVICE роль обоих игроков — DETECTIVE, поэтому по role/winner_role
    -- победителя не различить; используем подсказку клиента.
    IF v_mode = 'SECRET_SERVICE' THEN
        v_is_winner := coalesce(p_is_winner, v_is_winner);
    END IF;

    -- Серверный пересчёт дельты MMR и награды cash (клиентские значения игнорируются)
    v_mmr_delta := CASE WHEN v_is_winner THEN c_mmr_win ELSE c_mmr_loss END;
    v_mmr_delta := GREATEST(-c_mmr_abs_max, LEAST(c_mmr_abs_max, v_mmr_delta));

    v_cash_award := CASE WHEN v_is_winner THEN c_cash_win ELSE c_cash_loss END;
    v_cash_award := GREATEST(0, LEAST(c_cash_max, v_cash_award));

    -- Создаём запись матча (id = match_id, повторный вызов не дублирует)
    INSERT INTO public.matches (id, mode, winner_role, duration_seconds)
    VALUES (p_match_id, v_mode, v_winner_role, v_duration)
    ON CONFLICT (id) DO NOTHING;

    v_match_id := p_match_id;

    -- Привязываем участника с серверными значениями.
    -- Уникальный ключ (match_id, profile_id) защищает от гонок/дублей.
    INSERT INTO public.match_participants (match_id, profile_id, role, is_winner, mmr_delta)
    VALUES (v_match_id, v_user_id, v_role, v_is_winner, v_mmr_delta)
    ON CONFLICT (match_id, profile_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    -- Гонка: параллельный вызов уже записал участника — награду не начисляем
    IF v_inserted = 0 THEN
        SELECT mmr, cash INTO v_new_mmr, v_new_cash
          FROM public.profiles WHERE id = v_user_id;

        RETURN jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'match_id', p_match_id,
            'is_winner', v_is_winner,
            'mmr_delta', 0,
            'cash_awarded', 0,
            'new_mmr', coalesce(v_new_mmr, 0),
            'new_cash', coalesce(v_new_cash, 0),
            'duration_seconds', v_duration
        );
    END IF;

    -- Обновляем профиль агента серверными значениями
    UPDATE public.profiles
       SET matches_played = matches_played + 1,
           wins_detective = wins_detective + CASE WHEN v_is_winner AND v_role = 'DETECTIVE' THEN 1 ELSE 0 END,
           wins_maniac    = wins_maniac    + CASE WHEN v_is_winner AND v_role = 'KILLER'    THEN 1 ELSE 0 END,
           mmr  = GREATEST(100, mmr + v_mmr_delta),
           cash = GREATEST(0, cash + v_cash_award),
           xp   = xp + CASE WHEN v_is_winner THEN 50 ELSE 15 END,
           updated_at = timezone('utc'::text, now())
     WHERE id = v_user_id
     RETURNING mmr, cash INTO v_new_mmr, v_new_cash;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Профиль агента не найден для текущего пользователя'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'idempotent', false,
        'match_id', v_match_id,
        'is_winner', v_is_winner,
        'mmr_delta', v_mmr_delta,
        'cash_awarded', v_cash_award,
        'new_mmr', v_new_mmr,
        'new_cash', v_new_cash,
        'duration_seconds', v_duration
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Сохраняем принятую модель доступа: вызов разрешён авторизованным игрокам
REVOKE ALL ON FUNCTION public.record_match_result(TEXT, TEXT, INTEGER, TEXT, BOOLEAN, INTEGER, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_match_result(TEXT, TEXT, INTEGER, TEXT, BOOLEAN, INTEGER, UUID) TO authenticated;

COMMENT ON FUNCTION public.record_match_result(TEXT, TEXT, INTEGER, TEXT, BOOLEAN, INTEGER, UUID)
    IS 'P0-4: серверный античит записи результата матча. MMR/cash пересчитываются на сервере, p_match_id обязателен и идемпотентен.';
