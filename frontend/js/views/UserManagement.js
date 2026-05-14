/** 用户管理页面（仅管理员可见） */
window.UserManagementView = {
  template: `
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">管理系统账号与权限</p>
      </div>
      <!-- 注册开关 -->
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:13px;color:var(--text-secondary);">注册功能</span>
        <div class="toggle-wrap" @click="toggleReg" :class="{on: store.state.registrationEnabled}">
          <div class="toggle-thumb"></div>
        </div>
        <span :style="{color:store.state.registrationEnabled?'var(--success)':'var(--danger)'}" style="font-size:13px;font-weight:600;margin-right:16px;">
          {{ store.state.registrationEnabled ? '已开启' : '已关闭' }}
        </span>
        <button class="btn btn-primary btn-sm" @click="openAddUser">＋ 新增用户</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" style="text-align:center;padding:40px;">
      <div class="spinner" style="margin:0 auto 12px;"></div>
      <p style="color:var(--text-secondary);font-size:14px;">加载用户列表...</p>
    </div>

    <!-- 用户表格 -->
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" :class="{self: u.id === store.state.user?.id}">
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="user-avatar" style="width:32px;height:32px;font-size:13px;">{{ (u.display_name||u.username||'?')[0].toUpperCase() }}</div>
                <div>
                  <div style="font-weight:600;">{{ u.display_name || u.username }}</div>
                  <div style="font-size:12px;color:var(--text-muted);">@{{ u.username }}</div>
                </div>
              </div>
            </td>
            <td style="font-family:var(--font-mono);font-size:13px;">{{ u.email }}</td>
            <td>
              <span class="badge" :class="u.role==='admin'?'badge-danger':'badge-accent'">
                {{ u.role === 'admin' ? '👑 管理员' : '👤 普通用户' }}
              </span>
            </td>
            <td style="font-size:13px;color:var(--text-secondary);">{{ fmt(u.created_at) }}</td>
            <td>
              <div style="display:flex;gap:8px;">
                <button
                  v-if="u.id !== store.state.user?.id"
                  class="btn btn-sm"
                  :class="u.role==='admin'?'btn-ghost':'btn-primary'"
                  @click="changeRole(u)"
                >
                  {{ u.role === 'admin' ? '降为普通' : '设为管理' }}
                </button>
                <button class="btn btn-sm btn-ghost" @click="openEdit(u)">编辑</button>
                <button v-if="u.id !== store.state.user?.id" class="btn btn-sm btn-icon text-danger" @click="delUser(u)" title="删除用户">🗑</button>
                <span v-if="u.id === store.state.user?.id" style="font-size:12px;color:var(--text-muted);margin-left:8px;align-self:center;">（当前账号）</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!users.length" class="empty-state" style="padding:40px;">
        <p>暂无用户数据</p>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="!loading && users.length" class="stats-row">
      <div class="stat-card">
        <div class="stat-num">{{ users.length }}</div>
        <div class="stat-label">总用户数</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ users.filter(u=>u.role==='admin').length }}</div>
        <div class="stat-label">管理员</div>
      </div>
      <div class="stat-card">
        <div class="stat-num text-accent">{{ store.state.registrationEnabled ? '开放' : '关闭' }}</div>
        <div class="stat-label">注册状态</div>
      </div>
    </div>

    <!-- 编辑用户弹窗 -->
    <div v-if="editTarget" class="modal-overlay" @click.self="editTarget=null">
      <div class="modal" style="max-width:400px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 class="modal-title" style="margin:0;">编辑用户: {{ editTarget.username }}</h3>
          <button class="btn btn-icon" @click="editTarget=null">✖</button>
        </div>
        <div class="form-group">
          <label class="form-label">显示名称</label>
          <input v-model="editForm.display_name" class="form-input" placeholder="输入新的昵称/姓名">
        </div>
        <div class="form-group">
          <label class="form-label">重置密码（留空则不修改）</label>
          <input v-model="editForm.password" type="text" class="form-input" placeholder="输入新密码 (至少6位)">
        </div>
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px;">
          <button class="btn btn-ghost" @click="editTarget=null">取消</button>
          <button class="btn btn-primary" @click="saveEdit" :disabled="saving">
            {{ saving ? '保存中...' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 新增用户弹窗 -->
    <div v-if="showAddUser" class="modal-overlay" @click.self="showAddUser=false">
      <div class="modal" style="max-width:400px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 class="modal-title" style="margin:0;">新增用户</h3>
          <button class="btn btn-icon" @click="showAddUser=false">✖</button>
        </div>
        <div class="form-group">
          <label class="form-label">登录邮箱 (必须格式正确)</label>
          <input v-model="addForm.email" type="email" class="form-input" placeholder="例如: user@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">初始密码 (最少6位)</label>
          <input v-model="addForm.password" type="text" class="form-input" placeholder="输入密码">
        </div>
        <div class="form-group">
          <label class="form-label">显示名称 (可选)</label>
          <input v-model="addForm.display_name" class="form-input" placeholder="输入姓名或昵称">
        </div>
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px;">
          <button class="btn btn-ghost" @click="showAddUser=false">取消</button>
          <button class="btn btn-primary" @click="saveNewUser" :disabled="saving">
            {{ saving ? '创建中...' : '确认新增' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  `,
  data() {
    return {
      store: window.AppStore,
      users: [],
      loading: true,
      saving: false,
      editTarget: null,
      editForm: { display_name: '', password: '' },
      showAddUser: false,
      addForm: { email: '', password: '', display_name: '' }
    };
  },
  async mounted() {
    await this.loadUsers();
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        const { data, error } = await sb.rpc('get_all_users');
        if (error) {
          // Fallback if RPC doesn't exist or no permission
          const { data: profData, error: profErr } = await sb.from('profiles').select('*');
          if (profErr) throw profErr;
          this.users = profData || [];
          if (this.users.length > 0) {
            this.store.toast('未检测到管理员RPC函数，请前往Supabase执行SQL语句。当前只显示基本信息。', 'warning');
          }
          return;
        }
        this.users = data || [];
      } catch (e) {
        this.store.toast(e.message || '加载失败', 'error');
      } finally {
        this.loading = false;
      }
    },
    async changeRole(u) {
      const newRole = u.role === 'admin' ? 'user' : 'admin';
      const label = newRole === 'admin' ? '升为管理员' : '降为普通用户';
      if (!confirm(`确定将「${u.display_name || u.username}」${label}？`)) return;
      try {
        const { error } = await sb.from('profiles')
          .update({ role: newRole })
          .eq('id', u.id);
        if (error) throw error;
        u.role = newRole;
        this.store.toast(`已将 ${u.display_name || u.username} ${label}`, 'success');
      } catch (e) {
        this.store.toast(e.message || '操作失败', 'error');
      }
    },
    async toggleReg() {
      try {
        await this.store.setRegistration(!this.store.state.registrationEnabled);
      } catch (e) {
        this.store.toast(e.message || '操作失败', 'error');
      }
    },
    fmt(d) {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    },
    openEdit(u) {
      this.editTarget = u;
      this.editForm = { display_name: u.display_name || '', password: '' };
    },
    async saveEdit() {
      if (this.editForm.password && this.editForm.password.length < 6) {
        return this.store.toast('密码长度不能少于6位', 'error');
      }
      this.saving = true;
      try {
        const { error } = await sb.rpc('admin_update_user', {
          target_uid: this.editTarget.id,
          new_name: this.editForm.display_name,
          new_pass: this.editForm.password || null
        });
        if (error) throw error;
        
        this.editTarget.display_name = this.editForm.display_name;
        this.store.toast('用户信息修改成功', 'success');
        this.editTarget = null;
      } catch (e) {
        this.store.toast(e.message || '修改失败', 'error');
      } finally {
        this.saving = false;
      }
    },
    async delUser(u) {
      if (!confirm(`警告：确定要删除用户「${u.username}」吗？\n该操作会同时删除该用户创建的所有工程及测量数据，且无法恢复！`)) return;
      try {
        const { error } = await sb.rpc('admin_delete_user', { target_uid: u.id });
        if (error) throw error;
        this.users = this.users.filter(x => x.id !== u.id);
        this.store.toast('用户已彻底删除', 'info');
      } catch (e) {
        this.store.toast(e.message || '删除失败', 'error');
      }
    },
    openAddUser() {
      this.addForm = { email: '', password: '', display_name: '' };
      this.showAddUser = true;
    },
    async saveNewUser() {
      if (!this.addForm.email || !this.addForm.password) {
        return this.store.toast('邮箱和密码不能为空', 'error');
      }
      if (this.addForm.password.length < 6) {
        return this.store.toast('密码最少6位', 'error');
      }
      this.saving = true;
      try {
        const { error } = await sb.rpc('admin_create_user', {
          new_email: this.addForm.email,
          new_password: this.addForm.password,
          new_name: this.addForm.display_name || this.addForm.email.split('@')[0]
        });
        if (error) throw error;
        
        this.store.toast('用户创建成功', 'success');
        this.showAddUser = false;
        await this.loadUsers(); // 刷新列表
      } catch (e) {
        this.store.toast(e.message || '创建失败', 'error');
      } finally {
        this.saving = false;
      }
    }
  }
};
