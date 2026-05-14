/**
 * 主应用入口 — Vue 3 App
 */
;(function () {
  const { createApp, defineComponent, computed } = Vue;

  // 自定义指令：点击外部关闭
  const vClickOutside = {
    mounted(el, binding) {
      el._clickOutside = (e) => {
        if (!el.contains(e.target)) binding.value(e);
      };
      document.addEventListener('click', el._clickOutside, true);
    },
    unmounted(el) {
      document.removeEventListener('click', el._clickOutside, true);
    }
  };

  const App = defineComponent({
    components: {
      AuthView: window.AuthView,
      DashboardView: window.DashboardView,
      UserManagementView: window.UserManagementView,
      ProjectDetailView: window.ProjectDetailView
    },
    setup() {
      const store = window.AppStore;
      const view = computed(() => store.state.view);
      const loading = computed(() => store.state.loading && store.state.view === 'auth');
      function goBack() { store.navigate('dashboard'); }
      return { view, loading, goBack };
    },
    template: `
      <div>
        <template v-if="loading">
          <div class="app-loading">
            <div class="spinner"></div>
            <span>正在初始化...</span>
          </div>
        </template>
        <AuthView v-else-if="view === 'auth'" />
        <template v-else>
          <DashboardView v-if="view === 'dashboard'" />
          <ProjectDetailView v-else-if="view === 'project'" />
          <div v-else-if="view === 'user-mgmt'" class="app-layout">
            <header class="topbar">
              <div class="topbar-logo" style="cursor:pointer" @click="goBack">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
                </svg>
                <span>坐标计算</span>
              </div>
              <div style="margin-left:8px;color:var(--text-muted);font-size:14px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin:-2px 4px 0 0;"><path d="M9 18l6-6-6-6"/></svg>
                用户管理
              </div>
              <div class="topbar-spacer"></div>
              <button class="btn btn-ghost btn-sm" @click="goBack">← 返回工程列表</button>
            </header>
            <main class="main-content">
              <UserManagementView />
            </main>
          </div>
          <DashboardView v-else />
        </template>
      </div>
    `
  });

  const app = createApp(App);
  app.directive('click-outside', vClickOutside);
  app.mount('#app');

  // 初始化 Store（检查已有会话）
  window.AppStore.init().then(() => {
    console.log('[App] 初始化完成，当前视图:', window.AppStore.state.view);
  });
})();
