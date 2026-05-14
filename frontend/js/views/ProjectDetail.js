/** 工程详情页 - 主框架（侧边栏 + 模块内容区） */
window.ProjectDetailView = {
  template: `
  <div class="project-layout">
    <!-- 顶部导航 -->
    <header class="topbar">
      <div class="topbar-logo" style="cursor:pointer" @click="back">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        </svg>
        <span>坐标计算</span>
      </div>
      <div style="margin-left:8px;color:var(--text-muted);font-size:14px;display:flex;align-items:center;gap:4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <span style="color:var(--text-secondary);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ project.name }}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <span>{{ activeModule.label }}</span>
      </div>
      <div class="topbar-spacer"></div>
      <button class="btn btn-ghost btn-sm" @click="importProject" title="从JSON文件恢复工程数据">📥 导入备份</button>
      <button class="btn btn-ghost btn-sm" @click="exportProject" title="导出全部数据为JSON备份">📤 导出备份</button>
      <button class="btn btn-ghost btn-sm" @click="back">← 返回</button>
    </header>

    <!-- 侧边栏 + 内容区 -->
    <div class="project-body">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div
          v-for="m in modules" :key="m.id"
          class="sidebar-item"
          :class="{active: activeId === m.id}"
          @click="activeId = m.id"
        >
          <span class="sidebar-icon">{{ m.icon }}</span>
          <span>{{ m.label }}</span>
        </div>
      </aside>

      <!-- 模块内容 -->
      <main class="module-area">
        <PointLibModule   v-if="activeId==='points'"   :project="project" />
        <CoordCalcModule  v-if="activeId==='calc'"     :project="project" />
        <CoordConvModule  v-if="activeId==='conv'"     :project="project" />
        <LineLibModule    v-if="activeId==='lines'"    :project="project" />
        <PolyLibModule    v-if="activeId==='polys'"    :project="project" />
        <RoadLibModule    v-if="activeId==='roads'"    :project="project" />

        <StakeoutLibModule v-if="activeId==='stakeout'" :project="project" />
      </main>
    </div>
  </div>
  `,
  components: {
    PointLibModule:  window.PointLibModule,
    CoordCalcModule: window.CoordCalcModule,
    CoordConvModule: window.CoordConvModule,
    LineLibModule:   window.LineLibModule,
    PolyLibModule:   window.PolyLibModule,
    RoadLibModule:    window.RoadLibModule,
    StakeoutLibModule: window.StakeoutLibModule
  },
  data() {
    return {
      project: window.AppStore.state.currentProject || {},
      activeId: 'points',
      modules: [
        { id: 'points',   icon: '📍', label: '点库' },
        { id: 'lines',    icon: '📏', label: '线设计' },
        { id: 'polys',    icon: '📐', label: '面设计' },
        { id: 'roads',    icon: '🛣️',  label: '道路设计' },
        { id: 'calc',     icon: '🔢', label: '坐标计算' },
        { id: 'conv',     icon: '🔄', label: '坐标换算' },
        { id: 'stakeout', icon: '🎯', label: '放样' }
      ]
    };
  },
  computed: {
    activeModule() {
      return this.modules.find(m => m.id === this.activeId) || this.modules[0];
    }
  },
  methods: {
    back() { window.AppStore.navigate('dashboard'); },
    async exportProject() {
      try {
        const pid = this.project.id;
        const [pts, lines, polys, roads] = await Promise.all([
          sb.from('points').select('*').eq('project_id', pid),
          sb.from('lines').select('*').eq('project_id', pid),
          sb.from('polys').select('*').eq('project_id', pid),
          sb.from('roads').select('*').eq('project_id', pid)
        ]);
        const backup = {
          _type: 'project_backup',
          _version: 2,
          _exported: new Date().toISOString(),
          project: this.project,
          points: pts.data || [],
          lines: lines.data || [],
          polys: polys.data || [],
          roads: roads.data || []
        };
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '备份_' + this.project.name + '_' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        window.AppStore.toast('工程备份已导出', 'success');
      } catch(e) {
        window.AppStore.toast('导出失败:' + e.message, 'error');
      }
    },
    importProject() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const bk = JSON.parse(text);
          if (bk._type !== 'project_backup') {
            return window.AppStore.toast('格式不正确，请选择工程备份文件', 'error');
          }
          const pid = this.project.id;
          const strip = arr => (arr||[]).map(({ id, project_id, created_at, updated_at, ...r }) => ({ ...r, project_id: pid }));
          const tables = [
            { name: 'points', data: strip(bk.points) },
            { name: 'lines',  data: strip(bk.lines) },
            { name: 'polys',  data: strip(bk.polys) },
            { name: 'roads',  data: strip(bk.roads) }
          ];
          for (const t of tables) {
            if (t.data.length) {
              const { error } = await sb.from(t.name).insert(t.data);
              if (error) throw new Error(t.name + ': ' + error.message);
            }
          }
          window.AppStore.toast(`导入完成！点${(bk.points||[]).length}、线${(bk.lines||[]).length}、面${(bk.polys||[]).length}、道路${(bk.roads||[]).length}`, 'success');
        } catch(err) {
          window.AppStore.toast('导入失败:' + err.message, 'error');
        }
      };
      input.click();
    }
  }
};
