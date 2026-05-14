-- 为 polys 表增加 scatter_type 字段（如果不存在则添加）
-- 在 Supabase Dashboard → SQL Editor 中运行

ALTER TABLE IF EXISTS public.polys
  ADD COLUMN IF NOT EXISTS scatter_type TEXT DEFAULT NULL;

-- 同样为 lines 表检查是否需要补充字段（如有缺失）
-- ALTER TABLE IF EXISTS public.lines ADD COLUMN IF NOT EXISTS ... ;

-- 验证：查询 polys 表所有字段
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'polys';
