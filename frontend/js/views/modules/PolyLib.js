/** 面设计模块 */
window.PolyLibModule = {
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2 class="module-title">📐 面设计 (多边形/坡面/不规则面)</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" @click="importPolyCSV">⬆ 导入多边形(CSV)</button>
        <button class="btn btn-ghost btn-sm" @click="importScatterCSV">⬆ 导入离散点面</button>
        <button class="btn btn-ghost btn-sm" @click="exportAllCSV">⬇ 导出全部</button>
        <button class="btn btn-primary btn-sm" @click="openAdd('polygon')">＋ 新建多边形/不规则面</button>
        <button class="btn btn-primary btn-sm" style="background:var(--success);border-color:var(--success);" @click="openAdd('plane')">＋ 新建两点+坡面</button>
      </div>
    </div>

    <div v-if="loading" style="text-align:center;padding:40px;">
      <div class="spinner" style="margin:0 auto 12px;"></div>
      <p style="color:var(--text-secondary);font-size:14px;">加载面库...</p>
    </div>

    <div v-else class="projects-grid">
      <div v-for="p in polys" :key="p.id" class="project-card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="font-size:16px;font-weight:700;">{{ p.name }}</h3>
          <span class="badge" :class="getBadgeClass(p)">{{ getBadgeText(p) }}</span>
        </div>
        
        <div v-if="getType(p) === 'polygon'" style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
          <div>面积: <strong style="color:var(--text-primary)">{{ p.area ? p.area + ' m²' : '-' }}</strong></div>
          <div>周长: <strong style="color:var(--text-primary)">{{ p.perimeter ? p.perimeter + ' m' : '-' }}</strong></div>
        </div>
        <div v-else-if="getType(p) === 'scatter'" style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
          <div>离散点数: <strong style="color:var(--text-primary)">{{ p.points ? p.points.length : 0 }} 个</strong></div>
          <div>高程范围: <strong style="color:var(--text-primary)">{{ scatterRange(p) }}</strong></div>
        </div>
        <div v-else style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
          <div>横向坡度: <strong style="color:var(--text-primary)">{{ p.points.slope }}%</strong></div>
        </div>

        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;min-height:20px;">
          {{ p.description || '无备注' }}
        </p>
        <div style="display:flex;gap:8px;border-top:1px solid var(--border);padding-top:12px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" style="flex:1" @click="openEdit(p)">编辑</button>
          <button v-if="getType(p) === 'polygon'" class="btn btn-ghost btn-sm" @click="openSplit(p)">✂️ 面积分</button>
          <button v-if="getType(p) === 'polygon' || getType(p) === 'scatter'" class="btn btn-ghost btn-sm" @click="exportCSV(p)">⬇ 导出该面</button>
          <button class="btn btn-icon btn-sm text-danger" @click="delPoly(p)" title="删除">🗑</button>
        </div>
      </div>
      <div v-if="!polys.length" class="empty-state" style="grid-column:1/-1;">
        <p>暂无面设计，点击右上角开始设计</p>
      </div>
    </div>

    <!-- 面积分弹窗 -->
    <div v-if="showSplit" class="modal-overlay" @click.self="showSplit=false">
      <div class="modal" style="max-width:520px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 class="modal-title" style="margin:0;">✂️ 面积分 — {{ splitTarget?.name }}</h3>
          <button class="btn btn-icon" @click="showSplit=false">✖</button>
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
          总面积: <strong style="color:var(--primary);">{{ splitArea }} m²</strong>（{{ (splitArea/666.67).toFixed(4) }} 亩）
        </div>
        <div class="form-group">
          <label class="form-label">分割方式</label>
          <select v-model="split.mode" class="form-input">
            <option value="ratio">按比例分割（如 3:2:1）</option>
            <option value="area">按面积分割（m²，剩余归最后一块）</option>
            <option value="count">按等份数分割</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" v-if="split.mode==='ratio'">比例（用冒号隔开，如 3:2:1）</label>
          <label class="form-label" v-else-if="split.mode==='area'">各小块面积（m²，逗号分隔）</label>
          <label class="form-label" v-else>分割份数</label>
          <input v-model="split.value" class="form-input" :placeholder="split.mode==='ratio'?'3:2:1':split.mode==='area'?'500,800,1200':'3'">
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
          ℹ️ 切割方向：自左至右水平切割多边形（X轴平行线）
        </div>
        <div v-if="splitError" class="form-error" style="margin-bottom:8px;">{{ splitError }}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn btn-ghost" @click="showSplit=false">取消</button>
          <button class="btn btn-primary" @click="doSplit">计算面积分</button>
        </div>
        <div v-if="splitResult.length" style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">
          <div style="font-weight:600;font-size:13px;margin-bottom:8px;">分割结果</div>
          <div v-for="(s,i) in splitResult" :key="i" class="result-row" style="font-size:13px;">
            <span>第 {{ i+1 }} 块</span>
            <span class="font-mono result-val">{{ s.area.toFixed(4) }} m²（{{ (s.area/666.67).toFixed(4) }} 亩）{{ s.cutX!=null?' — 切割线 X='+s.cutX.toFixed(4):'' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑/添加面板 -->
    <div v-if="showForm" class="modal-overlay" style="align-items:flex-end;justify-content:flex-end;" @click.self="showForm=false">
      <div class="modal" style="height:100vh;width:80vw;max-width:1000px;border-radius:0;border-left:1px solid var(--border);display:flex;flex-direction:column;animation:slideInRight 0.3s var(--ease);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 class="modal-title" style="margin:0;">
            {{ editTarget ? '编辑' : '新建' }}{{ form.type === 'plane' ? '两点+坡面' : '多边形/不规则面' }}
          </h3>
          <button class="btn btn-icon" @click="showForm=false">✖</button>
        </div>

        <div class="form-group">
          <label class="form-label">面名称</label>
          <input v-model="form.name" class="form-input" placeholder="输入名称">
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <input v-model="form.description" class="form-input" placeholder="可选">
        </div>

        <!-- ================= 多边形/不规则面 ================= -->
        <template v-if="form.type === 'polygon'">
          <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px;">
            <label class="form-label" style="margin:0;">节点列表 ({{ form.points.length }}个)</label>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-ghost btn-sm" @click="importPoints">📥 导入TXT/CSV</button>
              <button class="btn btn-ghost btn-sm" @click="addPointRow">＋ 手动加点</button>
            </div>
          </div>

          <div style="flex:1;overflow-y:auto;overflow-x:auto;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);padding:8px;">
            <div style="min-width:500px;">
              <div v-for="(p, i) in form.points" :key="i" style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">
              <div style="font-size:12px;color:var(--text-muted);width:24px;text-align:right;">{{i+1}}</div>
              <input v-model="p.code" class="form-input font-mono" style="padding:4px 8px;font-size:13px;" placeholder="点号">
              <input v-model="p.x" type="number" class="form-input font-mono" style="padding:4px 8px;font-size:13px;" placeholder="X">
              <input v-model="p.y" type="number" class="form-input font-mono" style="padding:4px 8px;font-size:13px;" placeholder="Y">
              <input v-model="p.h" type="number" class="form-input font-mono" style="padding:4px 8px;font-size:13px;min-width:80px;max-width:120px;" placeholder="H">
              <button class="btn btn-icon btn-sm text-danger" @click="form.points.splice(i,1)" style="padding:4px;">✖</button>
            </div>
              <div v-if="!form.points.length" style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">
                添加点构成面。3个点以上构成闭合多边形，大量点构成不规则三角网。
              </div>
            </div>
          </div>

          <!-- 根据两点和坡度推算高程 -->
          <div style="margin-top:12px;padding:12px;background:var(--bg-card);border:1px dashed var(--border);border-radius:var(--r-md);">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">根据「两点平距+坡度」推算高程</div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;">
              <div>
                <label style="font-size:11px;color:var(--text-muted);">与上一点的坡度(%)</label>
                <input v-model="polySlope" type="number" class="form-input font-mono" style="padding:6px;font-size:13px;" placeholder="如 2.5">
              </div>
              <button class="btn btn-primary btn-sm" @click="calcElevation">推算最后一点高程</button>
            </div>
          </div>

          <!-- 面积/周长 -->
          <div style="margin-top:12px;padding:12px;background:var(--bg-card);border-radius:var(--r-md);border:1px solid var(--border);">
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">实时计算 (需至少3点)：</div>
            <div style="display:flex;gap:16px;font-size:14px;">
              <span>面积: <strong class="text-accent">{{ previewArea }}</strong> m²</span>
              <span>周长: <strong class="text-accent">{{ previewPerimeter }}</strong> m</span>
            </div>
          </div>
        </template>

        <!-- ================= 两点+坡面 ================= -->
        <template v-else>
          <div style="font-size:13px;font-weight:600;margin:16px 0 8px;color:var(--text-secondary);">坡面定义参数</div>
          <div style="flex:1;overflow-y:auto;">
            
            <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:12px;">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">基准点1 (起点)</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <input v-model="form.p1.x" type="number" class="form-input font-mono" style="font-size:13px;" placeholder="X (北)">
                <input v-model="form.p1.y" type="number" class="form-input font-mono" style="font-size:13px;" placeholder="Y (东)">
                <input v-model="form.p1.h" type="number" class="form-input font-mono" style="font-size:13px;" placeholder="H (高)">
              </div>
            </div>

            <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:12px;">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">基准点2 (方向点)</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <input v-model="form.p2.x" type="number" class="form-input font-mono" style="font-size:13px;" placeholder="X (北)">
                <input v-model="form.p2.y" type="number" class="form-input font-mono" style="font-size:13px;" placeholder="Y (东)">
                <input v-model="form.p2.h" type="number" class="form-input font-mono" style="font-size:13px;" placeholder="H (高)">
              </div>
            </div>

            <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">设计横坡度 (%)</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <input v-model="form.slope" type="number" class="form-input font-mono" style="font-size:13px;" placeholder="输入坡度(%)">
              </div>
            </div>
          </div>
        </template>

        <div class="modal-actions" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">
          <button class="btn btn-ghost" @click="showForm=false">取消</button>
          <button class="btn btn-primary" @click="savePoly" :disabled="saving || !isValid">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 导入CSV弹窗 -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport=false">
      <div class="modal" style="max-width:520px;">
        <h3 class="modal-title">导入 面设计 (CSV / TXT)</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
          支持两种格式（自动识别）：<br>
          ① 单面格式：<code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px;font-size:12px;">点号, X, Y [, H]</code><br>
          ② 多面格式：<code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px;font-size:12px;">面名, [类型,] 点号, X, Y [, H]</code>
        </p>
        <div class="form-group">
          <label class="form-label">选择文件</label>
          <input type="file" accept=".csv,.txt" @change="onFileChange" class="form-input" style="padding:8px;">
        </div>
        <div v-if="Object.keys(importPolysMap).length" style="margin-bottom:12px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">预览解析结果：</div>
          <div style="font-size:13px;color:var(--accent);margin-bottom:6px;">
            共解析到 {{ Object.keys(importPolysMap).length }} 个面。
          </div>
          <div style="max-height:120px;overflow-y:auto;background:var(--bg-surface);padding:8px;border-radius:4px;">
            <div v-for="(pData, pname) in importPolysMap" :key="pname" style="font-size:12px;margin-bottom:4px;">
              <strong>{{ pname }}</strong> : {{ pData.type === 'plane' ? '3D坡面' : '多边形 (' + pData.points.length + '点)' }}
            </div>
          </div>
        </div>
        <div v-if="importErr" class="form-error">{{ importErr }}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showImport=false">取消</button>
          <button class="btn btn-primary" @click="doImport" :disabled="!Object.keys(importPolysMap).length || saving">
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
      polys: [], loading: true, saving: false,
      showForm: false, showImport: false, editTarget: null,
      polySlope: '',
      form: { 
        type: 'polygon',
        name: '', description: '', 
        points: [],
        p1: {x:'', y:'', h:''}, 
        p2: {x:'', y:'', h:''}, 
        slope: '' 
      },
      importPolysMap: {}, importErr: '',
      // 面积分
      showSplit: false, splitTarget: null, splitArea: 0,
      split: { mode: 'ratio', value: '' },
      splitResult: [], splitError: ''
    };
  },
  computed: {
    validPoints() {
      if (this.form.type !== 'polygon') return [];
      return this.form.points.map(p => ({ x: +p.x, y: +p.y })).filter(p => !isNaN(p.x) && !isNaN(p.y));
    },
    previewArea() {
      const pts = this.validPoints;
      return pts.length >= 3 ? window.Geo.fmtNum(window.Geo.calcArea(pts), 2) : '-';
    },
    previewPerimeter() {
      const pts = this.validPoints;
      return pts.length >= 3 ? window.Geo.fmtNum(window.Geo.calcPerimeter(pts, true), 2) : '-';
    },
    isValid() {
      if (!this.form.name.trim()) return false;
      if (this.form.type === 'polygon') return this.form.points.length > 0;
      const f = this.form;
      return f.p1.x !== '' && f.p1.y !== '' && f.p1.h !== '' &&
             f.p2.x !== '' && f.p2.y !== '' && f.p2.h !== '' && f.slope !== '';
    }
  },
  async mounted() { await this.load(); },
  methods: {
    getType(p) {
      if (p.scatter_type === 'scatter') return 'scatter';
      return Array.isArray(p.points) ? 'polygon' : 'plane';
    },
    getBadgeClass(p) {
      const t = this.getType(p);
      if (t === 'scatter') return 'badge-danger';
      return t === 'polygon' ? (p.points.length > 10 ? 'badge-danger' : 'badge-success') : 'badge-accent';
    },
    getBadgeText(p) {
      const t = this.getType(p);
      if (t === 'scatter') return `离散点面 (${p.points.length}个)`;
      if (t === 'plane') return '3D 坡面';
      return p.points.length > 10 ? '不规则网格面' : (p.points.length + ' 边形');
    },
    scatterRange(p) {
      if (!p.points || !p.points.length) return '-';
      const hs = p.points.map(pt => pt.h).filter(h => h != null);
      if (!hs.length) return '无高程';
      return `${Math.min(...hs).toFixed(3)} ~ ${Math.max(...hs).toFixed(3)} m`;
    },
    async load() {
      this.loading = true;
      const { data } = await sb.from('polys').select('*').eq('project_id', this.project.id).order('created_at');
      this.polys = data || [];
      this.loading = false;
    },
    openAdd(type) {
      this.editTarget = null;
      this.form = { type, name: '', description: '', points: [], p1: {x:'',y:'',h:''}, p2: {x:'',y:'',h:''}, slope: '' };
      this.showForm = true;
    },
    openEdit(p) {
      this.editTarget = p;
      const t = this.getType(p);
      this.form = { 
        type: t, name: p.name, description: p.description||'', 
        points: t === 'polygon' ? JSON.parse(JSON.stringify(p.points)) : [],
        p1: t === 'plane' ? { ...p.points.p1 } : {x:'',y:'',h:''},
        p2: t === 'plane' ? { ...p.points.p2 } : {x:'',y:'',h:''},
        slope: t === 'plane' ? p.points.slope : ''
      };
      this.showForm = true;
    },
    addPointRow() {
      this.form.points.push({ code: 'P'+(this.form.points.length+1), x: '', y: '', h: '' });
    },
    importPoints() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.split(/\r?\n/);
          for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            let parts = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (parts.length >= 3) {
              const code = parts[0];
              const x = parseFloat(parts[1]);
              const y = parseFloat(parts[2]);
              const h = parts.length > 3 ? parseFloat(parts[3]) : '';
              if (!isNaN(x) && !isNaN(y)) {
                this.form.points.push({ code, x, y, h: isNaN(h) ? '' : h });
              }
            }
          }
          window.AppStore.toast('导入完成');
        };
        reader.readAsText(file);
      };
      input.click();
    },
    importPolyCSV() {
      this.importPolysMap = {};
      this.importErr = '';
      this.showImport = true;
    },
    onFileChange(e) {
      this.importErr = ''; this.importPolysMap = {};
      const file = e.target.files[0];
      if (!file) return;
      const defaultName = file.name.replace(/\.[^/.]+$/, "");
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = ev.target.result.split(/\r?\n/);
        const map = {};
        for (const line of lines) {
          const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
          if (cols.length < 3) continue;
          
          let pname = defaultName, code, x, y, h, isPlane = false;
          
          // 全局导出格式判定
          if (cols[1] === '3D坡面') {
            pname = cols[0]; code = cols[2]; x = parseFloat(cols[3]); y = parseFloat(cols[4]);
            h = cols[5] ? parseFloat(cols[5]) : null;
            isPlane = true;
            if (!map[pname]) map[pname] = { type: 'plane', points: { p1: {}, p2: {}, slope: 0 } };
            if (code === '起点') {
              map[pname].points.p1 = {x, y, h};
              if (cols[6]) map[pname].points.slope = parseFloat(cols[6].replace('横坡:', ''));
            } else if (code === '方向点') {
              map[pname].points.p2 = {x, y, h};
            }
            continue;
          }
          
          if (cols[1] === '多边形/网格' || cols[1] === '多边形') {
            pname = cols[0]; code = cols[2]; x = parseFloat(cols[3]); y = parseFloat(cols[4]);
            h = cols[5] ? parseFloat(cols[5]) : null;
          } else if (!isNaN(parseFloat(cols[1])) && !isNaN(parseFloat(cols[2]))) {
            code = cols[0]; x = parseFloat(cols[1]); y = parseFloat(cols[2]);
            h = cols[3] ? parseFloat(cols[3]) : null;
          } else if (cols.length >= 4 && !isNaN(parseFloat(cols[2])) && !isNaN(parseFloat(cols[3]))) {
            pname = cols[0]; code = cols[1]; x = parseFloat(cols[2]); y = parseFloat(cols[3]);
            h = cols[4] ? parseFloat(cols[4]) : null;
          } else {
            continue;
          }
          
          if (!map[pname]) map[pname] = { type: 'polygon', points: [] };
          if (map[pname].type === 'polygon') {
            map[pname].points.push({ code, x, y, h: isNaN(h) ? null : h });
          }
        }
        
        if (Object.keys(map).length === 0) {
          this.importErr = '未能解析到有效数据。'; return;
        }
        this.importPolysMap = map;
      };
      reader.readAsText(file, 'UTF-8');
    },
    async doImport() {
      this.saving = true;
      const payloads = Object.keys(this.importPolysMap).map(pname => {
        const pd = this.importPolysMap[pname];
        let area = 0, perimeter = 0;
        if (pd.type === 'polygon' && pd.points.length >= 3) {
          area = window.Geo.calcArea(pd.points);
          perimeter = window.Geo.calcPerimeter(pd.points, true);
        }
        return {
          project_id: this.project.id,
          name: pname,
          points: pd.points,
          area: +(area||0).toFixed(4),
          perimeter: +(perimeter||0).toFixed(4)
        };
      });
      
      const { data, error } = await sb.from('polys').insert(payloads).select();
      if (!error && data) {
        this.polys.push(...data);
        window.AppStore.toast(`成功导入 ${data.length} 个面`, 'success');
        this.showImport = false;
      } else {
        this.importErr = error?.message || '导入失败';
      }
      this.saving = false;
    },
    exportCSV(p) {
      if (!p.points || !p.points.length) return window.AppStore.toast('该面没有点', 'error');
      const header = '点号,X,Y,H\n';
      const rows = p.points.map(pt => pt.code + ',' + pt.x + ',' + pt.y + ',' + (pt.h ?? '')).join('\n');
      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '面设计_' + p.name + '.csv';
      a.click();
    },
    exportAllCSV() {
      if (!this.polys.length) return window.AppStore.toast('暂无数据', 'error');
      const header = '面名称,类型,点号/属性,X,Y,H,附加信息\n';
      const rows = [];
      this.polys.forEach(p => {
        const t = this.getType(p);
        if (t === 'polygon' && p.points && p.points.length) {
          p.points.forEach(pt => {
            rows.push(p.name + ',多边形/网格,' + pt.code + ',' + pt.x + ',' + pt.y + ',' + (pt.h ?? '') + ',');
          });
        } else if (t === 'plane') {
          rows.push(p.name + ',3D坡面,起点,' + p.points.p1.x + ',' + p.points.p1.y + ',' + p.points.p1.h + ',横坡:' + p.points.slope + '%');
          rows.push(p.name + ',3D坡面,方向点,' + p.points.p2.x + ',' + p.points.p2.y + ',' + p.points.p2.h + ',');
        }
      });
      const blob = new Blob(['\uFEFF' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '全部面设计_' + this.project.name + '.csv';
      a.click();
    },
    calcElevation() {
      if (this.form.points.length < 2) return window.AppStore.toast('至少需要有两个点', 'error');
      const p1 = this.form.points[this.form.points.length - 2];
      const p2 = this.form.points[this.form.points.length - 1];
      if (p1.x === '' || p1.y === '' || p1.h === '') return window.AppStore.toast('前一点的X/Y/H不完整', 'error');
      if (p2.x === '' || p2.y === '') return window.AppStore.toast('当前点缺X/Y', 'error');
      if (this.polySlope === '') return window.AppStore.toast('请输入坡度', 'error');
      const dist = Math.sqrt(Math.pow((+p2.x)-(+p1.x), 2) + Math.pow((+p2.y)-(+p1.y), 2));
      p2.h = ((+p1.h) + dist * (+this.polySlope / 100)).toFixed(4);
      window.AppStore.toast('高程已推算', 'success');
    },
    async savePoly() {
      this.saving = true;
      let pdata, area=0, perimeter=0;
      if (this.form.type === 'polygon') {
        pdata = this.form.points.map(p => ({ code: p.code, x: +p.x, y: +p.y, h: p.h !== '' ? +p.h : null })).filter(p => !isNaN(p.x) && !isNaN(p.y));
        if (pdata.length >= 3) {
          area = window.Geo.calcArea(pdata);
          perimeter = window.Geo.calcPerimeter(pdata, true);
        }
      } else {
        pdata = {
          p1: { x: +this.form.p1.x, y: +this.form.p1.y, h: +this.form.p1.h },
          p2: { x: +this.form.p2.x, y: +this.form.p2.y, h: +this.form.p2.h },
          slope: +this.form.slope
        };
      }
      const payload = {
        project_id: this.project.id,
        name: this.form.name,
        description: this.form.description,
        points: pdata,
        area: +(area||0).toFixed(4),
        perimeter: +(perimeter||0).toFixed(4)
      };
      
      if (this.editTarget) {
        const { error } = await sb.from('polys').update(payload).eq('id', this.editTarget.id);
        if (!error) { Object.assign(this.editTarget, payload); window.AppStore.toast('更新成功', 'success'); }
      } else {
        const { data, error } = await sb.from('polys').insert(payload).select().single();
        if (!error) { this.polys.push(data); window.AppStore.toast('添加成功', 'success'); }
      }
      this.saving = false; this.showForm = false;
    },
    async delPoly(p) {
      if (!confirm('确认删除面：' + p.name + '？')) return;
      const { error } = await sb.from('polys').delete().eq('id', p.id);
      if (!error) {
        this.polys.splice(this.polys.indexOf(p), 1);
        window.AppStore.toast('已删除', 'info');
      }
    },
    importScatterCSV() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const name = file.name.replace(/\.[^/.]+$/, '');
        const reader = new FileReader();
        reader.onload = async ev => {
          const lines = ev.target.result.split(/\r?\n/);
          const pts = [];
          for (const line of lines) {
            const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (cols.length < 3) continue;
            const code = cols[0];
            const x = parseFloat(cols[1]), y = parseFloat(cols[2]);
            const h = cols[3] ? parseFloat(cols[3]) : null;
            if (isNaN(x) || isNaN(y)) continue;
            pts.push({ code, x, y, h: isNaN(h) ? null : h });
          }
          if (!pts.length) return window.AppStore.toast('未解析到有效离散点', 'error');
          const payload = {
            project_id: this.project.id,
            name: name,
            description: `导入的离散点集，共 ${pts.length} 个点`,
            points: pts,
            scatter_type: 'scatter',
            area: 0, perimeter: 0
          };
          const { data, error } = await sb.from('polys').insert(payload).select().single();
          if (!error && data) {
            this.polys.push(data);
            window.AppStore.toast(`已导入离散点面「${name}」，共 ${pts.length} 个点`, 'success');
          } else {
            window.AppStore.toast('导入失败: ' + (error?.message||''), 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },
    openSplit(p) {
      this.splitTarget = p;
      this.split = { mode: 'ratio', value: '' };
      this.splitResult = []; this.splitError = '';
      this.splitArea = p.area ? +p.area : (window.Geo ? window.Geo.calcArea(p.points||[]) : 0);
      this.showSplit = true;
    },
    doSplit() {
      this.splitError = ''; this.splitResult = [];
      const poly = this.splitTarget;
      if (!poly || !Array.isArray(poly.points) || poly.points.length < 3) {
        this.splitError = '多边形点数不足'; return;
      }
      const totalArea = this.splitArea;
      let targets = [];
      if (this.split.mode === 'ratio') {
        const parts = this.split.value.split(':').map(Number);
        if (parts.some(isNaN) || !parts.length) { this.splitError = '比例格式错误'; return; }
        const sum = parts.reduce((a, b) => a + b, 0);
        targets = parts.map(p => p / sum * totalArea);
      } else if (this.split.mode === 'area') {
        targets = this.split.value.split(',').map(Number);
        if (targets.some(isNaN) || !targets.length) { this.splitError = '面积格式错误'; return; }
        const used = targets.reduce((a, b) => a + b, 0);
        if (used >= totalArea) { this.splitError = '指定面积之和超过总面积'; return; }
        targets.push(totalArea - used);
      } else {
        const n = parseInt(this.split.value);
        if (!n || n < 2) { this.splitError = '份数必须≥2'; return; }
        targets = Array(n).fill(totalArea / n);
      }
      const pts = poly.points;
      const xs = pts.map(p => p.x);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      // 二分法：计算切割线左侧面积
      const areaLeft = (cutX) => {
        const clipped = [];
        for (let i = 0; i < pts.length; i++) {
          const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
          if (p1.x <= cutX) clipped.push({ x: p1.x, y: p1.y });
          if ((p1.x < cutX && p2.x > cutX) || (p1.x > cutX && p2.x < cutX)) {
            const t = (cutX - p1.x) / (p2.x - p1.x);
            clipped.push({ x: cutX, y: p1.y + t * (p2.y - p1.y) });
          }
        }
        return clipped.length >= 3 && window.Geo ? window.Geo.calcArea(clipped) : 0;
      };
      const result = [];
      let cumTarget = 0;
      for (let i = 0; i < targets.length - 1; i++) {
        cumTarget += targets[i];
        let lo = minX, hi = maxX;
        for (let iter = 0; iter < 60; iter++) {
          const mid = (lo + hi) / 2;
          if (areaLeft(mid) < cumTarget) lo = mid; else hi = mid;
        }
        result.push({ area: targets[i], cutX: (lo + hi) / 2 });
      }
      result.push({ area: targets[targets.length - 1], cutX: null });
      this.splitResult = result;
    }
  }
};
