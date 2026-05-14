/** 点库模块 */
window.PointLibModule = {
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2 class="module-title">📍 点库</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" @click="showImport=true">⬆ 导入CSV</button>
        <button class="btn btn-ghost btn-sm" @click="exportCSV">⬇ 导出</button>
        <button class="btn btn-primary btn-sm" @click="openAdd">＋ 添加点</button>
      </div>
    </div>

    <!-- 搜索与分组 -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <input v-model="search" class="form-input" style="flex:1;min-width:160px;" placeholder="搜索编号/名称...">
      <select v-model="filterGroup" class="form-input" style="width:140px;">
        <option value="">全部分组</option>
        <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
      </select>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" style="text-align:center;padding:40px;">
      <div class="spinner" style="margin:0 auto 12px;"></div>
      <p style="color:var(--text-secondary);font-size:14px;">加载点库...</p>
    </div>

    <!-- 点表格 -->
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>编号</th><th>名称</th>
            <th>X（北）</th><th>Y（东）</th><th>H（高）</th>
            <th>分组</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.id">
            <td class="font-mono">{{ p.code }}</td>
            <td>{{ p.name }}</td>
            <td class="font-mono">{{ fmt(p.x) }}</td>
            <td class="font-mono">{{ fmt(p.y) }}</td>
            <td class="font-mono">{{ p.h != null ? fmt(p.h) : '-' }}</td>
            <td><span class="badge badge-accent">{{ p.group_name }}</span></td>
            <td>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-icon btn-sm" @click="openEdit(p)" title="编辑">✏️</button>
                <button class="btn btn-icon btn-sm" @click="delPoint(p)" title="删除" style="color:var(--danger)">🗑</button>
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">共 {{ filtered.length }} / {{ points.length }} 个点</div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm=false">
      <div class="modal">
        <h3 class="modal-title">{{ editTarget ? '编辑点' : '添加点' }}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">编号</label>
            <input v-model="form.code" class="form-input" placeholder="P001">
          </div>
          <div class="form-group">
            <label class="form-label">名称</label>
            <input v-model="form.name" class="form-input" placeholder="可选">
          </div>
          <div class="form-group">
            <label class="form-label">X（北坐标）</label>
            <input v-model="form.x" class="form-input font-mono" type="number" step="0.0001">
          </div>
          <div class="form-group">
            <label class="form-label">Y（东坐标）</label>
            <input v-model="form.y" class="form-input font-mono" type="number" step="0.0001">
          </div>
          <div class="form-group">
            <label class="form-label">H（高程）</label>
            <input v-model="form.h" class="form-input font-mono" type="number" step="0.0001" placeholder="可选">
          </div>
          <div class="form-group">
            <label class="form-label">分组</label>
            <input v-model="form.group_name" class="form-input" placeholder="默认组">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showForm=false">取消</button>
          <button class="btn btn-primary" @click="savePoint" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 导入CSV弹窗 -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport=false">
      <div class="modal" style="max-width:520px;">
        <h3 class="modal-title">导入 CSV / TXT</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
          文件格式（每行一条，逗号或空格分隔）：<br>
          <code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px;font-size:12px;">编号, X, Y [, H [, 名称 [, 分组]]]</code>
        </p>
        <div class="form-group">
          <label class="form-label">选择文件</label>
          <input type="file" accept=".csv,.txt" @change="onFileChange" class="form-input" style="padding:8px;">
        </div>
        <div v-if="importPreview.length" style="margin-bottom:12px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">预览（前5条）：</div>
          <div v-for="(r,i) in importPreview.slice(0,5)" :key="i"
               style="font-family:var(--font-mono);font-size:12px;color:var(--text-primary);padding:2px 0;">
            {{ r.code }} | X:{{ r.x }} Y:{{ r.y }} H:{{ r.h ?? '-' }}
          </div>
          <div style="font-size:13px;color:var(--accent);margin-top:6px;">共解析到 {{ importPreview.length }} 个点</div>
        </div>
        <div v-if="importErr" class="form-error">{{ importErr }}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showImport=false">取消</button>
          <button class="btn btn-primary" @click="doImport" :disabled="!importPreview.length || saving">
            {{ saving ? '导入中...' : '确认导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  `,
  props: ['project'],
  data() {
    return {
      points: [], loading: true, saving: false,
      search: '', filterGroup: '',
      showForm: false, showImport: false,
      editTarget: null,
      form: { code: '', name: '', x: '', y: '', h: '', group_name: '默认组' },
      importPreview: [], importErr: ''
    };
  },
  computed: {
    groups() { return [...new Set(this.points.map(p => p.group_name).filter(Boolean))]; },
    filtered() {
      let list = this.points;
      if (this.filterGroup) list = list.filter(p => p.group_name === this.filterGroup);
      if (this.search) {
        const q = this.search.toLowerCase();
        list = list.filter(p => (p.code||'').toLowerCase().includes(q) || (p.name||'').toLowerCase().includes(q));
      }
      return list;
    }
  },
  async mounted() { await this.load(); },
  methods: {
    fmt(v) { return v != null ? parseFloat(v).toFixed(4) : '-'; },
    async load() {
      this.loading = true;
      const { data } = await sb.from('points').select('*').eq('project_id', this.project.id).order('code');
      this.points = data || [];
      this.loading = false;
    },
    openAdd() {
      this.editTarget = null;
      this.form = { code: '', name: '', x: '', y: '', h: '', group_name: '默认组' };
      this.showForm = true;
    },
    openEdit(p) {
      this.editTarget = p;
      this.form = { code: p.code||'', name: p.name||'', x: p.x, y: p.y, h: p.h??'', group_name: p.group_name||'默认组' };
      this.showForm = true;
    },
    async savePoint() {
      if (!this.form.code || this.form.x === '' || this.form.y === '') {
        return window.AppStore.toast('编号、X、Y 为必填项', 'error');
      }
      this.saving = true;
      const payload = {
        project_id: this.project.id,
        code: this.form.code, name: this.form.name,
        x: +this.form.x, y: +this.form.y,
        h: this.form.h !== '' ? +this.form.h : null,
        group_name: this.form.group_name || '默认组'
      };
      if (this.editTarget) {
        const { error } = await sb.from('points').update(payload).eq('id', this.editTarget.id);
        if (!error) { Object.assign(this.editTarget, payload); window.AppStore.toast('已更新', 'success'); }
      } else {
        const { data, error } = await sb.from('points').insert(payload).select().single();
        if (!error) { this.points.unshift(data); window.AppStore.toast('添加成功', 'success'); }
      }
      this.saving = false; this.showForm = false;
    },
    async delPoint(p) {
      if (!confirm(`确认删除点「${p.code}」？`)) return;
      const { error } = await sb.from('points').delete().eq('id', p.id);
      if (!error) {
        this.points.splice(this.points.indexOf(p), 1);
        window.AppStore.toast('已删除', 'info');
      }
    },
    onFileChange(e) {
      this.importErr = ''; this.importPreview = [];
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
        const pts = [];
        for (const line of lines) {
          const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
          if (cols.length < 3) continue;
          const x = parseFloat(cols[1]);
          const y = parseFloat(cols[2]);
          if (isNaN(x) || isNaN(y)) continue; // 跳过表头或无效数据
          const h = cols[3] ? parseFloat(cols[3]) : null;
          pts.push({ code: cols[0], x, y, h: isNaN(h) ? null : h,
            name: cols[4] || '', group_name: cols[5] || '导入组' });
        }
        if (!pts.length) { this.importErr = '未能解析到有效数据，请检查格式'; return; }
        this.importPreview = pts;
      };
      reader.readAsText(file, 'UTF-8');
    },
    async doImport() {
      this.saving = true;
      const rows = this.importPreview.map(p => ({ ...p, project_id: this.project.id }));
      const { error } = await sb.from('points').insert(rows);
      if (!error) {
        await this.load();
        this.showImport = false;
        window.AppStore.toast(`成功导入 ${rows.length} 个点`, 'success');
      } else {
        this.importErr = error.message;
      }
      this.saving = false;
    },
    exportCSV() {
      const header = '编号,X,Y,H,名称,分组\n';
      const rows = this.filtered.map(p => `${p.code},${p.x},${p.y},${p.h??''},${p.name||''},${p.group_name||''}`).join('\n');
      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `点库_${this.project.name}_${new Date().toLocaleDateString('zh-CN').replace(/\//g,'-')}.csv`;
      a.click();
    }
  }
};
