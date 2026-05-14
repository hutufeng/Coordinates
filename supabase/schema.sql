-- ============================================
-- 坐标计算软件 — Supabase 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中运行
-- ============================================

-- 0. 全局应用设置表（管理员可读写，普通用户只读）
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- 初始化默认设置
INSERT INTO public.app_settings (key, value)
VALUES ('registration_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- 1. 用户信息扩展表（关联 auth.users）
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username      TEXT UNIQUE,
  display_name  TEXT,
  role          TEXT DEFAULT 'user',  -- 'admin' | 'user'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 工程表
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  area            TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  coord_conversion JSONB DEFAULT '{}',  -- 坐标换算参数
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 点库
CREATE TABLE IF NOT EXISTS public.points (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  code        TEXT,
  name        TEXT,
  x           DOUBLE PRECISION,
  y           DOUBLE PRECISION,
  h           DOUBLE PRECISION,
  group_name  TEXT DEFAULT '默认组',
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 线设计
CREATE TABLE IF NOT EXISTS public.line_designs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  points      JSONB DEFAULT '[]',  -- [{code,x,y,h}, ...]
  color       TEXT DEFAULT '#4B90F2',
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 面设计
CREATE TABLE IF NOT EXISTS public.polygon_designs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  points      JSONB DEFAULT '[]',  -- 闭合点列
  color       TEXT DEFAULT '#22C55E',
  area        DOUBLE PRECISION,
  perimeter   DOUBLE PRECISION,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 道路设计
CREATE TABLE IF NOT EXISTS public.road_designs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  method          TEXT DEFAULT 'JD',  -- 'JD' | 'ELEMENT' | 'COORDINATE'
  start_chainage  DOUBLE PRECISION DEFAULT 0,
  horizontal_data JSONB DEFAULT '[]',  -- 平面线形
  vertical_data   JSONB DEFAULT '[]',  -- 纵断面
  broken_chains   JSONB DEFAULT '[]',  -- 断链表
  description     TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 行级安全策略（RLS）— 用户只能访问自己的数据
-- ============================================
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_designs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polygon_designs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_designs     ENABLE ROW LEVEL SECURITY;

-- profiles 安全策略
-- 用户只能读写自己的 profile
CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL USING (auth.uid() = id);
-- 管理员可读取所有用户的 profile
CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- 管理员可修改其他用户的 role
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- projects: 用户只能操作自己的工程
CREATE POLICY "projects_owner" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

-- 子表通过 project_id 关联到工程，间接确保归属
CREATE POLICY "points_owner" ON public.points
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );
CREATE POLICY "lines_owner" ON public.line_designs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );
CREATE POLICY "polygons_owner" ON public.polygon_designs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );
CREATE POLICY "roads_owner" ON public.road_designs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

-- 管理员获取所有用户（含邮筱）的安全函数
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, role TEXT, email TEXT, created_at TIMESTAMPTZ)
SECURITY DEFINER
AS $$
BEGIN
  -- 仅管理员可调用
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION '无权限，仅管理员可调用此函数';
  END IF;

  RETURN QUERY
  SELECT p.id, p.username, p.display_name, p.role, u.email, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 手动将第一个注册用户设为管理员（首次部署时运行一次）
-- UPDATE public.profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read" ON public.app_settings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "settings_admin_write" ON public.app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 自动创建用户 profile（触发器）
-- 第一个注册的用户自动成为超级管理员
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
  assigned_role TEXT;
BEGIN
  -- 统计当前已有用户数（不含本次新增）
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  -- 第一个用户设为 admin
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'user';
  END IF;

  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), split_part(NEW.email, '@', 1), assigned_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
