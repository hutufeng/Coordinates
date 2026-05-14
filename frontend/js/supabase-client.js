/**
 * Supabase 客户端初始化
 * 全局暴露为 window.sb，所有模块均通过 sb 访问数据库和认证服务
 */
;(function () {
  const { url, anonKey } = window.SUPABASE_CONFIG;
  window.sb = supabase.createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,   // 自动刷新 Token
      persistSession: true,     // 持久化会话（刷新页面后保持登录）
      detectSessionInUrl: false // 不从 URL 读取会话
    }
  });
  console.log('[Supabase] 客户端已初始化');
})();
