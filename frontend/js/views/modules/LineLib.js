/** 线设计模块 */
window.LineLibModule = {
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2 class="module-title">📏 线设计</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" @click="importLineCSV">⬆ 导入CSV成线</button>
        <button class="btn btn-ghost btn-sm" @click="exportAllCSV">⬇ 导出全部</button>
        <button class="btn btn-primary btn-sm" @click="openAdd">＋ 新建线形</button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" style="text-align:center;padding:40px;">
      <div class="spinner" style="margin:0 auto 12px;"></div>
      <p style="color:var(--text-secondary);font-size:14px;">加载线库...</p>
    </div>

    <!-- 列表 -->
    <div v-else class="projects-grid">
      <div v-for="l in lines" :key="l.id" class="project-card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="font-size:16px;font-weight:700;">{{ l.name }}</h3>
          <span class="badge badge-accent">{{ l.points ? l.points.length : 0 }} 个点</span>
        </div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;min-height:20px;">
          {{ l.description || '无备注' }}
        </p>
        <div style="display:flex;gap:8px;border-top:1px solid var(--border);padding-top:12px;">
          <button class="btn btn-ghost btn-sm" style="flex:1" @click="openEdit(l)">编辑</button>
          <button class="btn btn-ghost btn-sm" @click="exportCSV(l)">⬇ 导出该线</button>
          <button class="btn btn-icon btn-sm text-danger" @click="delLine(l)" title="删除">🗑</button>
        </div>
      </div>
      <div v-if="!lines.length" class="empty-state" style="grid-column:1/-1;">
        <p>暂无线设计，点击「新建线形」开始设计</p>
      </div>
    </div>

    <!-- 编辑/添加 侧滑面板或模态框 -->
    <div v-if="showForm" class="modal-overlay" style="align-items:flex-end;justify-content:flex-end;" @click.self="showForm=false">
      <div class="modal" style="height:100vh;width:80vw;max-width:1000px;border-radius:0;border-left:1px solid var(--border);display:flex;flex-direction:column;animation:slideInRight 0.3s var(--ease);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 class="modal-title" style="margin:0;">{{ editTarget ? '编辑线形' : '新建线形' }}</h3>
          <button class="btn btn-icon" @click="showForm=false">✖</button>
        </div>

        <div class="form-group">
          <label class="form-label">线形名称</label>
          <input v-model="form.name" class="form-input" placeholder="如：1号道路主线">
        </div>
        <div class="form-group">
          <label class="form-label">备注</label>
          <input v-model="form.description" class="form-input" placeholder="可选">
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" style="display:inline-block;margin-right:12px;">平曲线输入法</label>
          <select v-model="form.alignment_method" class="form-input" style="max-width:200px;display:inline-block;">
            <option value="POINTS">节点法 (包含曲线)</option>
            <option value="ELEMENTS">线元法 (Elements)</option>
          </select>
        </div>

        <div v-show="form.alignment_method === 'POINTS'" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px;">
          <label class="form-label" style="margin:0;">节点列表 ({{ form.points.length }}个)</label>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost btn-sm" @click="importPoints">📥 导入点</button>
            <button class="btn btn-ghost btn-sm" @click="addPointRow">＋ 手动加点</button>
          </div>
        </div>

        <!-- 点列表编辑器 -->
        <div style="flex:1;overflow-y:auto;overflow-x:auto;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);padding:8px;">
          <div style="min-width:1100px;">
            <div style="display:flex;gap:6px;margin-bottom:8px;font-size:12px;color:var(--text-muted);font-weight:600;padding:0 8px;">
              <div style="width:20px;text-align:center;">#</div>
              <div style="flex:1;">点号</div>
              <div style="flex:1;">X (北)</div>
              <div style="flex:1;">Y (东)</div>
              <div style="flex:1;">H (高程)</div>
              <div style="flex:1;">半径 R</div>
              <div style="flex:1;">缓长 Ls1</div>
              <div style="flex:1;">参数 A1</div>
              <div style="flex:1;">缓长 Ls2</div>
              <div style="flex:1;">参数 A2</div>
              <div style="width:30px;text-align:center;">操作</div>
            </div>
            <div v-for="(p, i) in form.points" :key="i" style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">
            <div style="font-size:12px;color:var(--text-muted);width:20px;text-align:center;">{{i+1}}</div>
            <input v-model="p.code" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" placeholder="点号">
            <input v-model="p.x" type="number" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" placeholder="X">
            <input v-model="p.y" type="number" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" placeholder="Y">
            <input v-model="p.h" type="number" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" placeholder="H">
            <input v-model="p.r" type="number" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" @input="calcAFromR(p)" placeholder="R">
            <input v-model="p.ls1" type="number" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" @input="calcA(p, 1)" placeholder="Ls1">
            <input v-model="p.a1" type="number" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" @input="calcLs(p, 1)" placeholder="自动">
            <input v-model="p.ls2" type="number" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" @input="calcA(p, 2)" placeholder="Ls2">
            <input v-model="p.a2" type="number" class="form-input font-mono" style="flex:1;padding:4px 8px;font-size:13px;" @input="calcLs(p, 2)" placeholder="自动">
            <button class="btn btn-icon btn-sm text-danger" @click="form.points.splice(i,1)" style="width:30px;padding:4px;">✖</button>
          </div>
            <div v-if="!form.points.length" style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">
              未添加节点
            </div>
          </div>
        </div>

        <!-- 按方位角/坡度推算加点 -->
        <div style="margin-top:12px;padding:12px;background:var(--bg-card);border:1px dashed var(--border);border-radius:var(--r-md);">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">根据方位角/坡度推算下一点</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;">
            <div>
              <label style="font-size:11px;color:var(--text-muted);">方位角(°)</label>
              <input v-model="polar.az" type="number" class="form-input font-mono" style="padding:6px;font-size:13px;" placeholder="如 123.45">
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-muted);">平距(m)</label>
              <input v-model="polar.dist" type="number" class="form-input font-mono" style="padding:6px;font-size:13px;" placeholder="距离">
            </div>
            <div>
              <label style="font-size:11px;color:var(--text-muted);">坡度(%)</label>
              <input v-model="polar.slope" type="number" class="form-input font-mono" style="padding:6px;font-size:13px;" placeholder="如 2.5">
            </div>
            <button class="btn btn-primary btn-sm" @click="calcNextPoint">计算并添加</button>
          </div>
        </div>

        <div v-show="form.alignment_method === 'ELEMENTS'" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
          <div style="background:var(--bg-surface);padding:12px;border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:12px;">
            <div style="font-size:12px;font-weight:600;margin-bottom:8px;">起点基准参数</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <div style="flex:1;min-width:120px;">
                <label style="font-size:11px;color:var(--text-muted);">起点桩号(K)</label>
                <input v-model="form.start_chainage" type="number" class="form-input font-mono" placeholder="如 0">
              </div>
              <div style="flex:1;min-width:120px;">
                <label style="font-size:11px;color:var(--text-muted);">起点 X</label>
                <input v-model="form.start_x" type="number" class="form-input font-mono">
              </div>
              <div style="flex:1;min-width:120px;">
                <label style="font-size:11px;color:var(--text-muted);">起点 Y</label>
                <input v-model="form.start_y" type="number" class="form-input font-mono">
              </div>
              <div style="flex:1;min-width:120px;">
                <label style="font-size:11px;color:var(--text-muted);">起点方位角(°)</label>
                <input v-model="form.start_az" type="number" class="form-input font-mono">
              </div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <label class="form-label" style="margin:0;">线元列表 (直线/圆曲线/缓和曲线)</label>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-ghost btn-sm" @click="importElements">📥 导入TXT/CSV</button>
              <button class="btn btn-ghost btn-sm" @click="addElement">＋ 添加线元</button>
            </div>
          </div>
          <div style="flex:1;overflow-y:auto;overflow-x:auto;">
            <table class="data-table" style="min-width:700px;">
              <thead>
                <tr>
                  <th style="min-width:120px">类型</th>
                  <th style="min-width:140px">长度(L)</th>
                  <th style="min-width:140px">起半径(R1)</th>
                  <th style="min-width:140px">终半径(R2)</th>
                  <th style="min-width:120px">转向</th>
                  <th style="width:60px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(el, i) in form.elements" :key="i">
                  <td>
                    <select v-model="el.type" class="form-input" style="padding:4px;font-size:12px;">
                      <option value="line">直线</option>
                      <option value="arc">圆曲线</option>
                      <option value="spiral">缓和曲线</option>
                    </select>
                  </td>
                  <td><input v-model="el.length" type="number" class="form-input font-mono" style="padding:4px;"></td>
                  <td><input v-model="el.r1" type="number" class="form-input font-mono" style="padding:4px;" :disabled="el.type==='line'" :placeholder="el.type==='line'?'∞':''"></td>
                  <td><input v-model="el.r2" type="number" class="form-input font-mono" style="padding:4px;" :disabled="el.type==='line'" :placeholder="el.type==='line'?'∞':''"></td>
                  <td>
                    <select v-model="el.turn" class="form-input" style="padding:4px;font-size:12px;" :disabled="el.type==='line'">
                      <option value="0">直行(0)</option>
                      <option value="-1">左偏(-1)</option>
                      <option value="1">右偏(1)</option>
                    </select>
                  </td>
                  <td><button class="btn btn-icon btn-sm text-danger" @click="form.elements.splice(i,1)">✖</button></td>
                </tr>
                <tr v-if="!form.elements.length">
                  <td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">暂路线元，点击右上角添加</td>
                </tr>
              </tbody>
            </table>
            <p style="font-size:11px;color:var(--text-muted);margin-top:6px;">注：直线的半径忽略不计；圆曲线R1与R2相等；无限大半径请输入空或0。</p>
          </div>
        </div>

        <div class="modal-actions" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
          <button class="btn btn-ghost" @click="showForm=false">取消</button>
          <button class="btn btn-primary" @click="saveLine" :disabled="saving || !form.name.trim()">
            {{ saving ? '保存中...' : '保存线形' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 导入CSV弹窗 -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport=false">
      <div class="modal" style="max-width:520px;">
        <h3 class="modal-title">导入 线形 (CSV / TXT)</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
          支持两种格式（自动识别）：<br>
          ① 单线格式：<code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px;font-size:12px;">点号, X, Y [, H, R, Ls1, Ls2]</code><br>
          ② 多线格式：<code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px;font-size:12px;">线名, 点号, X, Y [, H, R, Ls1, Ls2]</code> (支持批量导入多条线)
        </p>
        <div class="form-group">
          <label class="form-label">选择文件</label>
          <input type="file" accept=".csv,.txt" @change="onFileChange" class="form-input" style="padding:8px;">
        </div>
        <div v-if="Object.keys(importLinesMap).length" style="margin-bottom:12px;">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">预览解析结果：</div>
          <div style="font-size:13px;color:var(--accent);margin-bottom:6px;">
            共解析到 {{ Object.keys(importLinesMap).length }} 条线，总计 {{ importTotalPts }} 个点。
          </div>
          <div style="max-height:120px;overflow-y:auto;background:var(--bg-surface);padding:8px;border-radius:4px;">
            <div v-for="(pts, lname) in importLinesMap" :key="lname" style="font-size:12px;margin-bottom:4px;">
              <strong>{{ lname }}</strong> : {{ pts.length }} 个节点
            </div>
          </div>
        </div>
        <div v-if="importErr" class="form-error">{{ importErr }}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showImport=false">取消</button>
          <button class="btn btn-primary" @click="doImport" :disabled="!Object.keys(importLinesMap).length || saving">
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
      lines: [], loading: true, saving: false,
      showForm: false, showImport: false, editTarget: null,
      form: { 
        name: '', description: '', alignment_method: 'POINTS', points: [],
        start_chainage: '', start_x: '', start_y: '', start_az: '', elements: []
      },
      polar: { az: '', dist: '', slope: '' },
      importLinesMap: {}, importErr: '', importTotalPts: 0
    };
  },
  async mounted() { await this.load(); },
  methods: {
    async load() {
      this.loading = true;
      const { data } = await sb.from('lines').select('*').eq('project_id', this.project.id).order('created_at');
      this.lines = data || [];
      this.loading = false;
    },
    openAdd() {
      this.editTarget = null;
      this.form = { 
        name: '', description: '', alignment_method: 'POINTS', points: [],
        start_chainage: '', start_x: '', start_y: '', start_az: '', elements: []
      };
      this.showForm = true;
    },
    openEdit(l) {
      this.editTarget = l;
      this.form = { 
        name: l.name, description: l.description||'', 
        alignment_method: l.alignment_method||'POINTS', 
        points: JSON.parse(JSON.stringify(l.points||[])),
        start_chainage: l.start_chainage ?? '', start_x: l.start_x ?? '', 
        start_y: l.start_y ?? '', start_az: l.start_az ?? '',
        elements: JSON.parse(JSON.stringify(l.elements||[]))
      };
      this.showForm = true;
    },
    calcA(p, type) {
      const r = parseFloat(p.r);
      const ls = parseFloat(type === 1 ? p.ls1 : p.ls2);
      if (r > 0 && ls >= 0) {
        const a = Math.sqrt(r * ls);
        if (type === 1) p.a1 = a ? +a.toFixed(4) : '';
        else p.a2 = a ? +a.toFixed(4) : '';
      }
    },
    calcLs(p, type) {
      const r = parseFloat(p.r);
      const a = parseFloat(type === 1 ? p.a1 : p.a2);
      if (r > 0 && a >= 0) {
        const ls = (a * a) / r;
        if (type === 1) p.ls1 = ls ? +ls.toFixed(4) : '';
        else p.ls2 = ls ? +ls.toFixed(4) : '';
      }
    },
    calcAFromR(p) {
      this.calcA(p, 1);
      this.calcA(p, 2);
    },
    addElement() {
      this.form.elements.push({ type: 'line', length: '', r1: '', r2: '', turn: '0' });
    },
    addPointRow() {
      this.form.points.push({ code: '', x: '', y: '', h: '', r:'', ls1:'', a1:'', ls2:'', a2:'' });
    },
    importPoints() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.split(/\r?\n/);
          for (const line of lines) {
            const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (cols.length < 3) continue;
            const x = parseFloat(cols[1]), y = parseFloat(cols[2]);
            if (isNaN(x) || isNaN(y)) continue;
            const h = cols[3] ? parseFloat(cols[3]) : null;
            const r = cols[4] ? parseFloat(cols[4]) : null;
            const ls1 = cols[5] ? parseFloat(cols[5]) : null;
            const ls2 = cols[6] ? parseFloat(cols[6]) : null;
            const p = { code: cols[0], x, y, h: isNaN(h) ? '' : h, r: isNaN(r) ? '' : r, ls1: isNaN(ls1) ? '' : ls1, ls2: isNaN(ls2) ? '' : ls2 };
            this.calcAFromR(p);
            this.form.points.push(p);
          }
          window.AppStore.toast('节点导入完成');
        };
        reader.readAsText(file);
      };
      input.click();
    },
    importElements() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.split(/\r?\n/);
          let startParsed = false;
          let count = 0;
          for (const line of lines) {
            const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (cols.length < 5) continue;
            // 如果第一列不能转换为数字（比如表头），跳过
            if (isNaN(parseFloat(cols[0])) && cols[0] !== '') continue;

            if (!startParsed && cols[0] !== '' && cols[1] !== '') {
              this.form.start_chainage = parseFloat(cols[0]);
              this.form.start_x = parseFloat(cols[1]);
              this.form.start_y = parseFloat(cols[2]);
              this.form.start_az = parseFloat(cols[3]);
              startParsed = true;
            }
            
            const type = (cols[4] || '').toLowerCase();
            if (['line', 'arc', 'spiral'].includes(type)) {
              this.form.elements.push({
                type,
                length: isNaN(parseFloat(cols[5])) ? '' : parseFloat(cols[5]),
                r1: isNaN(parseFloat(cols[6])) ? '' : parseFloat(cols[6]),
                r2: isNaN(parseFloat(cols[7])) ? '' : parseFloat(cols[7]),
                turn: cols[8] || '0'
              });
              count++;
            }
          }
          if (count > 0) window.AppStore.toast(`成功导入 ${count} 条线元`);
          else window.AppStore.toast('未能解析到线元数据，请检查格式', 'error');
        };
        reader.readAsText(file);
      };
      input.click();
    },
    importLineCSV() {
      this.importLinesMap = {};
      this.importErr = '';
      this.importTotalPts = 0;
      this.showImport = true;
    },
    onFileChange(e) {
      this.importErr = ''; this.importLinesMap = {}; this.importTotalPts = 0;
      const file = e.target.files[0];
      if (!file) return;
      const defaultName = file.name.replace(/\.[^/.]+$/, "");
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = ev.target.result.split(/\r?\n/);
        const map = {};
        let total = 0;
        for (const line of lines) {
          const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
          if (cols.length < 3) continue;
          
          let lname = defaultName, code, x, y, h, r, ls1, ls2;
          if (!isNaN(parseFloat(cols[1])) && !isNaN(parseFloat(cols[2]))) {
            code = cols[0]; x = parseFloat(cols[1]); y = parseFloat(cols[2]);
            h = cols[3] ? parseFloat(cols[3]) : null;
            r = cols[4] ? parseFloat(cols[4]) : null;
            ls1 = cols[5] ? parseFloat(cols[5]) : null;
            ls2 = cols[6] ? parseFloat(cols[6]) : null;
          } else if (cols.length >= 4 && !isNaN(parseFloat(cols[2])) && !isNaN(parseFloat(cols[3]))) {
            lname = cols[0]; code = cols[1]; x = parseFloat(cols[2]); y = parseFloat(cols[3]);
            h = cols[4] ? parseFloat(cols[4]) : null;
            r = cols[5] ? parseFloat(cols[5]) : null;
            ls1 = cols[6] ? parseFloat(cols[6]) : null;
            ls2 = cols[7] ? parseFloat(cols[7]) : null;
          } else {
            continue;
          }
          if (!map[lname]) map[lname] = [];
          const p = { code, x, y, h: isNaN(h) ? null : h, r: isNaN(r) ? null : r, ls1: isNaN(ls1) ? null : ls1, ls2: isNaN(ls2) ? null : ls2 };
          if (p.r > 0 && p.ls1 >= 0) p.a1 = +(Math.sqrt(p.r * p.ls1)).toFixed(4);
          if (p.r > 0 && p.ls2 >= 0) p.a2 = +(Math.sqrt(p.r * p.ls2)).toFixed(4);
          map[lname].push(p);
          total++;
        }
        if (total === 0) {
          this.importErr = '未能解析到有效数据，请检查格式。';
          return;
        }
        this.importLinesMap = map;
        this.importTotalPts = total;
      };
      reader.readAsText(file, 'UTF-8');
    },
    async doImport() {
      this.saving = true;
      const payloads = Object.keys(this.importLinesMap).map(lname => ({
        project_id: this.project.id,
        name: lname,
        alignment_method: 'POINTS',
        points: this.importLinesMap[lname]
      }));
      
      const { data, error } = await sb.from('lines').insert(payloads).select();
      if (!error && data) {
        this.lines.push(...data);
        window.AppStore.toast(`成功导入 ${data.length} 条线形`, 'success');
        this.showImport = false;
      } else {
        this.importErr = error?.message || '导入失败';
      }
      this.saving = false;
    },
    exportCSV(l) {
      if (l.alignment_method === 'ELEMENTS') {
        if (!l.elements || !l.elements.length) return window.AppStore.toast('该线没有线元数据', 'error');
        const header = '起点桩号,起点X,起点Y,起点方位角,类型,长度,起半径R1,终半径R2,转向\n';
        const rows = l.elements.map((el, i) => {
          if (i === 0) return `${l.start_chainage ?? ''},${l.start_x ?? ''},${l.start_y ?? ''},${l.start_az ?? ''},${el.type},${el.length},${el.r1},${el.r2},${el.turn}`;
          return `,,,,${el.type},${el.length},${el.r1},${el.r2},${el.turn}`;
        }).join('\n');
        const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '线元法_' + l.name + '.csv';
        a.click();
      } else {
        if (!l.points || !l.points.length) return window.AppStore.toast('该线没有点', 'error');
        const header = '点号,X,Y,H,半径R,缓长Ls1,缓长Ls2\n';
        const rows = l.points.map(p => p.code + ',' + p.x + ',' + p.y + ',' + (p.h ?? '') + ',' + (p.r ?? '') + ',' + (p.ls1 ?? '') + ',' + (p.ls2 ?? '')).join('\n');
        const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '节点法_' + l.name + '.csv';
        a.click();
      }
    },
    exportAllCSV() {
      if (!this.lines.length) return window.AppStore.toast('暂无数据', 'error');
      
      const ptsRows = [];
      const elRows = [];
      
      this.lines.forEach(l => {
        if (l.alignment_method === 'ELEMENTS' && l.elements && l.elements.length) {
          l.elements.forEach((el, i) => {
            elRows.push(`${l.name},${i===0?(l.start_chainage??''):''},${i===0?(l.start_x??''):''},${i===0?(l.start_y??''):''},${i===0?(l.start_az??''):''},${el.type},${el.length},${el.r1},${el.r2},${el.turn}`);
          });
        } else if ((!l.alignment_method || l.alignment_method === 'POINTS') && l.points && l.points.length) {
          l.points.forEach(p => {
            ptsRows.push(`${l.name},${p.code},${p.x},${p.y},${p.h??''},${p.r??''},${p.ls1??''},${p.ls2??''}`);
          });
        }
      });

      let downloaded = 0;
      if (ptsRows.length) {
        const header = '线名,点号,X,Y,H,半径R,缓长Ls1,缓长Ls2\n';
        const blob = new Blob(['\uFEFF' + header + ptsRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '节点法_全部线形.csv';
        a.click();
        downloaded++;
      }
      if (elRows.length) {
        setTimeout(() => {
          const header = '线名,起点桩号,起点X,起点Y,起点方位角,类型,长度,起半径R1,终半径R2,转向\n';
          const blob = new Blob(['\uFEFF' + header + elRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = '线元法_全部线形.csv';
          a.click();
        }, downloaded ? 500 : 0);
        downloaded++;
      }
      if (!downloaded) window.AppStore.toast('所有线路均无数据', 'error');
    },
    calcNextPoint() {
      if (!this.form.points.length) {
        return window.AppStore.toast('请先手动添加一个起点', 'error');
      }
      const last = this.form.points[this.form.points.length - 1];
      if (last.x === '' || last.y === '') {
        return window.AppStore.toast('上一个点的X、Y不能为空', 'error');
      }
      const { az, dist, slope } = this.polar;
      if (az === '' || dist === '') {
        return window.AppStore.toast('请填写方位角和距离', 'error');
      }
      // 计算XY
      const r = window.Geo.polar2rect(+last.x, +last.y, +az, +dist);
      // 计算高程
      let h = '';
      if (slope !== '' && last.h !== '') {
        // 坡度 % = 高差 / 平距 * 100
        const deltaH = (+dist) * (+slope / 100);
        h = (+last.h + deltaH).toFixed(4);
      }
      
      this.form.points.push({
        code: 'P' + (this.form.points.length + 1),
        x: r.x.toFixed(4),
        y: r.y.toFixed(4),
        h: h
      });
      // 距和坡度保留，方位角可不清除方便连续输入
    },
    async saveLine() {
      this.saving = true;

      // 参数异常检测 (节点法中支持曲线)
      for (let i = 0; i < this.form.points.length; i++) {
        const p = this.form.points[i];
        const r = parseFloat(p.r) || 0;
        const ls1 = parseFloat(p.ls1) || 0;
        const ls2 = parseFloat(p.ls2) || 0;
        if (r < 0 || ls1 < 0 || ls2 < 0) {
          window.AppStore.toast(`第 ${i+1} 个节点 [${p.code||'未命名'}] 错误：半径或缓和曲线长度不能为负数！`, 'error');
          this.saving = false; return;
        }
        if (r === 0 && (ls1 > 0 || ls2 > 0)) {
          window.AppStore.toast(`第 ${i+1} 个节点 [${p.code||'未命名'}] 错误：半径为 0 (直线段) 时不能设置缓和曲线！`, 'error');
          this.saving = false; return;
        }
      }

      const pts = this.form.points.map(p => ({ 
        code: p.code, x: +p.x, y: +p.y, h: p.h !== '' ? +p.h : null,
        r: p.r !== '' && p.r !== null ? +p.r : null,
        ls1: p.ls1 !== '' && p.ls1 !== null ? +p.ls1 : null,
        a1: p.a1 !== '' && p.a1 !== null ? +p.a1 : null,
        ls2: p.ls2 !== '' && p.ls2 !== null ? +p.ls2 : null,
        a2: p.a2 !== '' && p.a2 !== null ? +p.a2 : null
      })).filter(p => !isNaN(p.x) && !isNaN(p.y));

      const payload = {
        project_id: this.project.id,
        name: this.form.name,
        description: this.form.description,
        alignment_method: this.form.alignment_method,
        points: pts,
        start_chainage: this.form.start_chainage !== '' ? +this.form.start_chainage : null,
        start_x: this.form.start_x !== '' ? +this.form.start_x : null,
        start_y: this.form.start_y !== '' ? +this.form.start_y : null,
        start_az: this.form.start_az !== '' ? +this.form.start_az : null,
        elements: this.form.elements
      };
      if (this.editTarget) {
        const { error } = await sb.from('lines').update(payload).eq('id', this.editTarget.id);
        if (!error) { Object.assign(this.editTarget, payload); window.AppStore.toast('更新成功', 'success'); }
      } else {
        const { data, error } = await sb.from('lines').insert(payload).select().single();
        if (!error) { this.lines.push(data); window.AppStore.toast('添加成功', 'success'); }
      }
      this.saving = false; this.showForm = false;
    },
    async delLine(l) {
      if (!confirm(`确认删除线形「${l.name}」？`)) return;
      const { error } = await sb.from('lines').delete().eq('id', l.id);
      if (!error) {
        this.lines.splice(this.lines.indexOf(l), 1);
        window.AppStore.toast('已删除', 'info');
      }
    }
  }
};
