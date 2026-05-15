/** 工程列表仪表盘视图 */
window.DashboardView = {
  template: `
  <div class="app-layout">
    <!-- 顶部导航 -->
    <header class="topbar">
      <div class="topbar-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
        </svg>
        <span>坐标计算</span>
        <span style="font-size:10px;background:var(--primary);color:#fff;padding:2px 6px;border-radius:10px;margin-left:6px;vertical-align:middle;">v1.0.4</span>
      </div>
      <div class="topbar-spacer"></div>
      <!-- 用户菜单 -->
      <div class="dropdown" v-click-outside="closeMenu">
        <div class="user-menu" @click="menuOpen = !menuOpen">
          <div class="user-avatar">{{ avatarChar }}</div>
          <span>{{ displayName }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <div v-if="menuOpen" class="dropdown-menu">
          <div class="dropdown-item" style="cursor:default;opacity:0.6;font-size:12px;">
            {{ store.state.user?.email }}
          </div>
          <template v-if="isAdmin">
            <div class="dropdown-divider"></div>
            <div style="padding:4px 12px;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">管理员功能</div>
            <button class="dropdown-item" @click="goUserMgmt">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              用户管理
            </button>
            <button class="dropdown-item" @click="toggleRegistration">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              {{ store.state.registrationEnabled ? '关闭注册' : '开启注册' }}
              <span :style="{marginLeft:'auto',fontSize:'11px',padding:'1px 6px',borderRadius:'10px',
                background:store.state.registrationEnabled?'var(--success-subtle)':'var(--danger-subtle)',
                color:store.state.registrationEnabled?'var(--success)':'var(--danger)'}">
                {{ store.state.registrationEnabled ? '开' : '关' }}
              </span>
            </button>
          </template>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" @click="doLogout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            退出登录
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="main-content">
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1 class="page-title">我的工程</h1>
            <p class="page-subtitle">共 {{ store.state.projects.length }} 个工程</p>
          </div>
          <button class="btn btn-primary" @click="showCreate = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            新建工程
          </button>
        </div>

        <!-- 工程列表 -->
        <div v-if="store.state.loading" class="empty-state">
          <div class="spinner" style="margin:0 auto 16px;"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="store.state.projects.length === 0" class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <h3>暂无工程</h3>
          <p>点击「新建工程」开始你的第一个项目</p>
        </div>

        <div v-else class="projects-grid">
          <!-- 新建卡（置顶） -->
          <div class="new-project-card" @click="showCreate = true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>新建工程</span>
          </div>

          <!-- 工程卡 -->
          <div v-for="p in store.state.projects" :key="p.id" class="project-card" @click="openProject(p)">
            <div class="project-card-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
            </div>
            <div class="project-card-name">{{ p.name }}</div>
            <div class="project-card-meta">{{ formatDate(p.created_at) }}</div>
            <div v-if="p.area" class="project-card-area">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {{ p.area }}
            </div>
            <div v-if="p.description" style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              {{ p.description }}
            </div>
            <div class="project-card-actions" @click.stop>
              <button class="btn btn-ghost btn-sm" style="flex:1" @click="openProject(p)">
                打开
              </button>
              <button class="btn btn-icon btn-sm" @click="startEdit(p)" title="编辑">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn btn-icon btn-sm" @click="confirmDelete(p)" title="删除" style="color:var(--danger)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 新建工程 Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate=false">
      <div class="modal">
        <h3 class="modal-title">新建工程</h3>
        <div class="form-group">
          <label class="form-label">工程名称 *</label>
          <input v-model="form.name" type="text" class="form-input" placeholder="如：XX路道路测量" ref="nameInput">
        </div>
        <div class="form-group">
          <label class="form-label">测区名称</label>
          <input v-model="form.area" type="text" class="form-input" placeholder="如：XX市XX区">
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <input v-model="form.description" type="text" class="form-input" placeholder="可选">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showCreate=false">取消</button>
          <button class="btn btn-primary" @click="doCreate" :disabled="!form.name.trim() || store.state.loading">
            {{ store.state.loading ? '创建中...' : '创建工程' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑工程 Modal -->
    <div v-if="editProject" class="modal-overlay" @click.self="editProject=null">
      <div class="modal">
        <h3 class="modal-title">编辑工程</h3>
        <div class="form-group">
          <label class="form-label">工程名称 *</label>
          <input v-model="editForm.name" type="text" class="form-input">
        </div>
        <div class="form-group">
          <label class="form-label">测区名称</label>
          <input v-model="editForm.area" type="text" class="form-input">
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <input v-model="editForm.description" type="text" class="form-input">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="editProject=null">取消</button>
          <button class="btn btn-primary" @click="doEdit" :disabled="!editForm.name.trim()">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认 Modal -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget=null">
      <div class="modal">
        <h3 class="modal-title">确认删除</h3>
        <p style="color:var(--text-secondary);font-size:14px;margin-bottom:8px;">
          将永久删除工程「<strong style="color:var(--text-primary)">{{ deleteTarget.name }}</strong>」及其所有数据，无法恢复。
        </p>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="deleteTarget=null">取消</button>
          <button class="btn btn-danger" @click="doDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- Toast 通知 -->
    <div class="toast-container">
      <div v-for="t in store.state.toasts" :key="t.id" class="toast" :class="'toast-'+t.type">
        <svg v-if="t.type==='success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else-if="t.type==='error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ t.message }}
      </div>
    </div>
  </div>
  `,
  data() {
    return {
      store: window.AppStore,
      menuOpen: false,
      showCreate: false,
      form: { name: '', area: '', description: '' },
      editProject: null,
      editForm: {},
      deleteTarget: null
    };
  },
  computed: {
    displayName() {
      return this.store.state.profile?.display_name
        || this.store.state.user?.email?.split('@')[0]
        || '用户';
    },
    avatarChar() {
      return (this.displayName[0] || '?').toUpperCase();
    },
    isAdmin() {
      return this.store.state.profile?.role === 'admin';
    }
  },
  async mounted() {
    await this.store.loadProjects();
  },
  methods: {
    closeMenu() { this.menuOpen = false; },
    async doLogout() {
      this.menuOpen = false;
      await this.store.logout();
    },
    async toggleRegistration() {
      this.menuOpen = false;
      try {
        await this.store.setRegistration(!this.store.state.registrationEnabled);
      } catch (e) {
        this.store.toast(e.message || '操作失败', 'error');
      }
    },
    goUserMgmt() {
      this.menuOpen = false;
      this.store.navigate('user-mgmt');
    },
    openProject(p) { this.store.openProject(p); },
    formatDate(d) {
      if (!d) return '';
      return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    },
    async doCreate() {
      if (!this.form.name.trim()) return;
      try {
        await this.store.createProject({ ...this.form });
        this.showCreate = false;
        this.form = { name: '', area: '', description: '' };
      } catch (e) {
        this.store.toast(e.message || '创建失败', 'error');
      }
    },
    startEdit(p) {
      this.editProject = p;
      this.editForm = { name: p.name, area: p.area || '', description: p.description || '' };
    },
    async doEdit() {
      try {
        const { error } = await sb.from('projects').update({
          name: this.editForm.name,
          area: this.editForm.area,
          description: this.editForm.description,
          updated_at: new Date().toISOString()
        }).eq('id', this.editProject.id);
        if (error) throw error;
        Object.assign(this.editProject, this.editForm);
        this.editProject = null;
        this.store.toast('工程已更新', 'success');
      } catch (e) {
        this.store.toast(e.message || '更新失败', 'error');
      }
    },
    confirmDelete(p) { this.deleteTarget = p; },
    async doDelete() {
      try {
        await this.store.deleteProject(this.deleteTarget.id);
        this.deleteTarget = null;
      } catch (e) {
        this.store.toast(e.message || '删除失败', 'error');
      }
    }
  }
};
