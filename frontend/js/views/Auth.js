/** 登录 / 注册 视图组件 */
window.AuthView = {
  template: `
  <div class="auth-page">
    <!-- 左侧品牌区（桌面显示） -->
    <div class="auth-brand">
      <div class="brand-logo">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
        </svg>
        <span class="brand-logo-text">坐标计算</span>
      </div>
      <h1 class="brand-headline">专业 RTK<br><span>坐标计算工具</span></h1>
      <p class="brand-desc">集成道路设计、放样计算、坐标转换、点线面库管理，让外业作业更高效。</p>
      <div class="brand-features">
        <div class="brand-feature"><div class="brand-feature-dot"></div>道路设计：交点法 / 线元法 / 坐标法</div>
        <div class="brand-feature"><div class="brand-feature-dot"></div>放样：点/线/面/道路 + 逐点导航</div>
        <div class="brand-feature"><div class="brand-feature-dot"></div>平面坐标换算（四参数解算）</div>
        <div class="brand-feature"><div class="brand-feature-dot"></div>离线 PWA，工地无网络可用</div>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="auth-form-wrap">
      <!-- 移动端 Logo -->
      <div class="auth-mobile-logo">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
        </svg>
        <span class="auth-mobile-logo-text">坐标计算</span>
      </div>

      <div class="auth-card">
        <!-- Tabs -->
        <div class="auth-tabs">
          <button class="auth-tab" :class="{active: tab==='login'}" @click="tab='login'; error=''">登录</button>
          <button
            class="auth-tab"
            :class="{active: tab==='register'}"
            @click="canRegister && (tab='register', error='')"
            :style="!canRegister ? 'opacity:0.4;cursor:not-allowed' : ''"
            :title="!canRegister ? '注册已关闭' : ''"
          >
            注册{{ !canRegister ? ' 🔒' : '' }}
          </button>
        </div>

        <!-- 登录 -->
        <template v-if="tab==='login'">
          <h2 class="auth-title">欢迎回来</h2>
          <p class="auth-subtitle">请输入邮箱和密码登录</p>
          <div v-if="error" class="form-error">{{ error }}</div>
          <form @submit.prevent="doLogin">
            <div class="form-group">
              <label class="form-label">邮箱</label>
              <input v-model="email" type="email" class="form-input" placeholder="your@email.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label">密码</label>
              <input v-model="password" type="password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary btn-full btn-lg" :disabled="store.state.loading">
              <span v-if="store.state.loading">登录中...</span>
              <span v-else>登录</span>
            </button>
          </form>
        </template>

        <!-- 注册 -->
        <template v-else>
          <h2 class="auth-title">创建账号</h2>
          <template v-if="canRegister">
            <p class="auth-subtitle">填写信息完成注册</p>
            <div v-if="error" class="form-error">{{ error }}</div>
            <form @submit.prevent="doRegister">
              <div class="form-group">
                <label class="form-label">用户名</label>
                <input v-model="username" type="text" class="form-input" placeholder="显示名称" required>
              </div>
              <div class="form-group">
                <label class="form-label">邮筱</label>
                <input v-model="email" type="email" class="form-input" placeholder="your@email.com" required autocomplete="email">
              </div>
              <div class="form-group">
                <label class="form-label">密码（至少6位）</label>
                <input v-model="password" type="password" class="form-input" placeholder="••••••••" required autocomplete="new-password" minlength="6">
              </div>
              <button type="submit" class="btn btn-primary btn-full btn-lg" :disabled="store.state.loading">
                <span v-if="store.state.loading">注册中...</span>
                <span v-else>注册</span>
              </button>
            </form>
          </template>
          <template v-else>
            <div style="text-align:center;padding:32px 0;">
              <div style="font-size:48px;margin-bottom:16px;">🔒</div>
              <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;">
                注册功能当前已关闭<br>请联系管理员开通账号
              </p>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
  `,
  data() {
    return {
      tab: 'login',
      email: '',
      password: '',
      username: '',
      error: '',
      store: window.AppStore
    };
  },
  computed: {
    canRegister() {
      return this.store.state.registrationEnabled;
    }
  },
  methods: {
    async doLogin() {
      this.error = '';
      try {
        await this.store.login(this.email, this.password);
      } catch (e) {
        this.error = e.message || '登录失败，请检查邮箱和密码';
      }
    },
    async doRegister() {
      this.error = '';
      try {
        await this.store.register(this.email, this.password, this.username);
        this.tab = 'login';
        this.password = '';
      } catch (e) {
        this.error = e.message || '注册失败，请重试';
      }
    }
  }
};
