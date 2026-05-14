/**
 * 全局状态管理（Vue reactive store）
 */
;(function () {
  const { reactive, readonly } = Vue;

  const state = reactive({
    // 当前用户与会话
    user: null,
    profile: null,
    session: null,

    // 路由视图: 'auth' | 'dashboard' | 'project'
    view: 'auth',
    currentProject: null,

    // 工程列表
    projects: [],

    // 全局应用设置
    registrationEnabled: true,  // 注册开关

    // UI 状态
    loading: false,
    toasts: [],

    // 坐标系偏移（由坐标换算模块写入，放样模块读取）
    // null = 使用原始坐标; 否则 {type, dx, dy, scale, rotation, params}
    coordOffset: null
  });

  /* ---- Toast 通知 ---- */
  let _toastId = 0;
  function toast(message, type = 'info', duration = 3000) {
    const id = ++_toastId;
    state.toasts.push({ id, message, type });
    setTimeout(() => {
      const idx = state.toasts.findIndex(t => t.id === id);
      if (idx !== -1) state.toasts.splice(idx, 1);
    }, duration);
  }

  /* ---- 认证 ---- */
  async function init() {
    state.loading = true;
    try {
      // 读取注册开关（失败不影响主流程）
      await loadSettings();
    } catch (e) {
      console.warn('[Store] 设置加载失败，使用默认值:', e.message);
    }

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        state.session = session;
        state.user = session.user;
        await _loadProfile();
        state.view = 'dashboard';
      }
    } catch (e) {
      console.error('[Store] 会话检查失败:', e);
    } finally {
      state.loading = false;
    }

    // 监听认证状态变化
    sb.auth.onAuthStateChange(async (_event, session) => {
      state.session = session;
      state.user = session?.user || null;
      if (session) {
        try { await _loadProfile(); } catch (e) { console.warn('[Store] profile加载失败:', e.message); }
        // 无论 profile 是否加载成功，都切换到 dashboard
        if (state.view === 'auth') state.view = 'dashboard';
      } else {
        state.profile = null;
        state.projects = [];
        state.view = 'auth';
      }
    });
  }

  async function _loadProfile() {
    if (!state.user) return;
    // 用 maybeSingle() 替代 single()，无数据时返回 null 而不报错
    const { data, error } = await sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
    if (error) console.warn('[Store] 加载 profile 失败:', error.message);
    state.profile = data || null;
  }

  async function login(email, password) {
    state.loading = true;
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast('登录成功', 'success');
    } finally {
      state.loading = false;
    }
  }

  async function register(email, password, username) {
    // 先检查注册开关
    if (!state.registrationEnabled) {
      throw new Error('注册功能已被管理员关闭');
    }
    state.loading = true;
    try {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;

      // data.session 为 null 表示 Supabase 需要邮件确认
      if (!data.session) {
        throw new Error('注册成功！请去邮箱点击确认链接后再登录。或由管理员在 Supabase 后台关闭邮件确认。');
      }

      // 更新用户名（触发器已自动创建 profile，这里覆盖 display_name）
      if (data.user && username) {
        await sb.from('profiles').update({ display_name: username, username })
          .eq('id', data.user.id);
      }
      toast('注册并登录成功', 'success');
    } finally {
      state.loading = false;
    }
  }

  async function logout() {
    await sb.auth.signOut();
    toast('已退出登录', 'info');
  }

  /* ---- 应用设置 ---- */
  async function loadSettings() {
    // 使用 maybeSingle()，表不存在时返回 null 而不报错
    const { data, error } = await sb.from('app_settings')
      .select('key, value')
      .eq('key', 'registration_enabled')
      .maybeSingle();
    if (error) throw error;
    if (data) {
      state.registrationEnabled = data.value === true || data.value === 'true';
    }
  }

  async function setRegistration(enabled) {
    if (state.profile?.role !== 'admin') {
      throw new Error('无权限，仅管理员可操作');
    }
    const { error } = await sb.from('app_settings')
      .upsert({ key: 'registration_enabled', value: enabled, updated_at: new Date().toISOString() });
    if (error) throw error;
    state.registrationEnabled = enabled;
    toast(`注册功能已${enabled ? '开启' : '关闭'}`, 'success');
  }

  /* ---- 工程管理 ---- */
  async function loadProjects() {
    if (!state.user) return;
    const { data, error } = await sb.from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error) state.projects = data || [];
  }

  async function createProject(form) {
    if (!state.user) return;
    const { data, error } = await sb.from('projects').insert({
      user_id: state.user.id,
      name: form.name,
      area: form.area || '',
      description: form.description || ''
    }).select().single();
    if (error) throw error;
    state.projects.unshift(data);
    toast('工程创建成功', 'success');
    return data;
  }

  async function deleteProject(id) {
    const { error } = await sb.from('projects').delete().eq('id', id);
    if (error) throw error;
    const idx = state.projects.findIndex(p => p.id === id);
    if (idx !== -1) state.projects.splice(idx, 1);
    toast('工程已删除', 'info');
  }

  async function openProject(project) {
    state.currentProject = project;
    state.view = 'project';
  }

  function navigate(view) {
    state.view = view;
  }

  // 挂载到全局
  window.AppStore = {
    state,
    toast,
    init,
    login,
    register,
    logout,
    loadSettings,
    setRegistration,
    loadProjects,
    createProject,
    deleteProject,
    openProject,
    navigate
  };

  console.log('[Store] 已初始化');
})();
