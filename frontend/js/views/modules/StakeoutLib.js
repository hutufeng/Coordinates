/** 放样坐标生成与导出工具 (StakeoutLib) */
window.StakeoutLibModule = {
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2 class="module-title">🎯 放样坐标</h2>
      <div style="display:flex;gap:8px;align-items:center;">
        <span v-if="coordOffset" style="font-size:12px;padding:3px 10px;background:var(--success-subtle,rgba(16,185,129,.12));color:var(--success);border-radius:20px;">
          ✅ 已应用{{ coordOffset.type==='simple'?'平移':'\u56db参数' }}坐标系
        </span>
        <button class="btn btn-ghost btn-sm" @click="openPreview">👁️ 预览当前</button>
        <button v-for="t in tabs" :key="t.id" class="btn btn-sm"
          :class="activeTab===t.id?'btn-primary':'btn-ghost'"
          @click="switchTab(t.id)">{{ t.label }}</button>
      </div>
    </div>

    <!-- ===== 点库放样 ===== -->
    <div v-if="activeTab==='points'">
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <input v-model="ptSearch" class="form-input" style="flex:1;" placeholder="搜索编号/名称...">
        <button class="btn btn-ghost btn-sm" @click="loadData">🔄 刷新</button>
        <button v-if="ptSelected.length" class="btn btn-primary btn-sm" @click="exportSelected">📤 导出已选 ({{ ptSelected.length }})</button>
      </div>
      <div v-if="loading" style="text-align:center;padding:30px;"><div class="spinner" style="margin:0 auto;"></div></div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th style="width:40px;"><input type="checkbox" @change="toggleAll" :checked="allChecked"></th>
            <th>编号</th><th>名称</th><th>X（北）</th><th>Y（东）</th><th>H（高）</th><th>分组</th>
          </tr></thead>
          <tbody>
            <tr v-for="p in filteredPts" :key="p.id">
              <td><input type="checkbox" :value="p.id" v-model="ptSelected"></td>
              <td class="font-mono">{{ p.code }}</td>
              <td>{{ p.name }}</td>
              <td class="font-mono">{{ fmt(p.x) }}</td>
              <td class="font-mono">{{ fmt(p.y) }}</td>
              <td class="font-mono">{{ p.h!=null?fmt(p.h):'-' }}</td>
              <td><span class="badge badge-accent">{{ p.group_name }}</span></td>
            </tr>
            <tr v-if="!filteredPts.length"><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;">暂无点位数据</td></tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <span style="font-size:13px;color:var(--text-muted);">导出格式：</span>
        <select v-model="ptFmt" class="form-input" style="width:160px;">
          <option value="code_x_y_h">编号,X,Y,H</option>
          <option value="code_y_x_h">编号,Y,X,H（东北高）</option>
          <option value="name_x_y_h">名称,X,Y,H</option>
        </select>
        <button class="btn btn-primary btn-sm" @click="exportAllPts">📤 导出全部点位</button>
      </div>
    </div>

    <!-- ===== 线库放样 ===== -->
    <div v-if="activeTab==='lines'">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <div style="flex:1;min-width:160px;">
          <label style="font-size:11px;color:var(--text-muted);">选择线形</label>
          <select v-model="selLine" class="form-input" @change="onLineChange">
            <option value="">-- 请选择 --</option>
            <option v-for="l in lines" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>
        <div style="flex:1;min-width:120px;">
          <label style="font-size:11px;color:var(--text-muted);">计算间距 (m)</label>
          <input v-model="lineInterval" type="number" class="form-input font-mono" placeholder="如 10">
        </div>
        <div style="flex:1;min-width:120px;">
          <label style="font-size:11px;color:var(--text-muted);">左偏距 (m，负=右)</label>
          <input v-model="lineOffset" type="number" class="form-input font-mono" placeholder="0=中线">
        </div>
        <div style="flex:1;min-width:100px;display:flex;align-items:flex-end;">
          <button class="btn btn-primary" style="width:100%;" @click="calcLine">计算</button>
        </div>
      </div>
      <div v-if="lineResult.length">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;color:var(--text-muted);">共 {{ lineResult.length }} 个点</span>
          <button class="btn btn-ghost btn-sm" @click="exportLineResult">📤 导出 CSV</button>
        </div>
        <div class="table-wrap" style="max-height:400px;overflow-y:auto;">
          <table class="data-table" style="font-size:12px;">
            <thead><tr><th>点号</th><th>X（北）</th><th>Y（东）</th><th>偏距</th></tr></thead>
            <tbody>
              <tr v-for="r in lineResult" :key="r.code">
                <td class="font-mono">{{ r.code }}</td>
                <td class="font-mono">{{ r.x }}</td>
                <td class="font-mono">{{ r.y }}</td>
                <td class="font-mono">{{ r.offset }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="selLine" style="text-align:center;color:var(--text-muted);padding:30px;border:1px dashed var(--border);border-radius:var(--r-md);">
        设置间距后点击「计算」生成沿线坐标
      </div>
    </div>

    <!-- ===== 面放样 ===== -->
    <div v-if="activeTab==='polys'">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <div style="flex:2;min-width:200px;">
          <label style="font-size:11px;color:var(--text-muted);">选择面要素</label>
          <select v-model="selPoly" class="form-input" @change="onPolyChange">
            <option value="">-- 请选择 --</option>
            <option v-for="p in polys" :key="p.id" :value="p.id">
              {{ p.name }} {{ p.scatter_type==='scatter'?'[离散点]':'[多边形]' }}
            </option>
          </select>
        </div>
      </div>

      <!-- 多边形方式 -->
      <div v-if="selPoly && !isScatter">
        <!-- 子模式切换 -->
        <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;">
          <span style="font-size:13px;color:var(--text-muted);">{{ polyInfo }}</span>
          <div style="margin-left:auto;display:flex;gap:6px;">
            <button class="btn btn-sm" :class="polyMode==='pts'?'btn-primary':'btn-ghost'" @click="polyMode='pts'">📍 角点坐标</button>
            <button class="btn btn-sm" :class="polyMode==='grid'?'btn-primary':'btn-ghost'" @click="polyMode='grid';initPolyGrid()">🔳 方格网</button>
          </div>
        </div>

        <!-- 角点模式 -->
        <div v-if="polyMode==='pts'">
          <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
            <button class="btn btn-ghost btn-sm" @click="exportPolyResult">📤 导出角点 CSV</button>
          </div>
          <div class="table-wrap">
            <table class="data-table" style="font-size:12px;">
              <thead><tr><th>点号</th><th>X（北）</th><th>Y（东）</th><th>H（高）</th></tr></thead>
              <tbody>
                <tr v-for="r in polyResult" :key="r.code">
                  <td class="font-mono">{{ r.code }}</td>
                  <td class="font-mono">{{ r.x }}</td>
                  <td class="font-mono">{{ r.y }}</td>
                  <td class="font-mono">{{ r.h??'-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 方格网模式（多边形） -->
        <div v-if="polyMode==='grid'">
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:14px;">
            <div style="font-size:12px;font-weight:600;margin-bottom:10px;">🔳 方格网放样设置</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
              <div style="flex:1;min-width:110px;">
                <label style="font-size:11px;color:var(--text-muted);">X方向起始</label>
                <input v-model="pgrid.minX" type="number" class="form-input font-mono" placeholder="自动">
              </div>
              <div style="flex:1;min-width:110px;">
                <label style="font-size:11px;color:var(--text-muted);">X方向终止</label>
                <input v-model="pgrid.maxX" type="number" class="form-input font-mono" placeholder="自动">
              </div>
              <div style="flex:1;min-width:110px;">
                <label style="font-size:11px;color:var(--text-muted);">Y方向起始</label>
                <input v-model="pgrid.minY" type="number" class="form-input font-mono" placeholder="自动">
              </div>
              <div style="flex:1;min-width:110px;">
                <label style="font-size:11px;color:var(--text-muted);">Y方向终止</label>
                <input v-model="pgrid.maxY" type="number" class="form-input font-mono" placeholder="自动">
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
              <div style="flex:1;min-width:100px;">
                <label style="font-size:11px;color:var(--text-muted);">X间距 (m)</label>
                <input v-model="pgrid.dx" type="number" class="form-input font-mono" placeholder="如 10">
              </div>
              <div style="flex:1;min-width:100px;">
                <label style="font-size:11px;color:var(--text-muted);">Y间距 (m)</label>
                <input v-model="pgrid.dy" type="number" class="form-input font-mono" placeholder="如 10">
              </div>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap;">
                <input type="checkbox" v-model="pgrid.clip"> 裁剪至多边形内
              </label>
              <button class="btn btn-primary" @click="calcPolyGrid" :disabled="computing">{{ computing?'计算中...':'生成方格网' }}</button>
              <button v-if="pgridResult.length" class="btn btn-ghost btn-sm" @click="exportPolyGrid">📤 导出</button>
            </div>
          </div>
          <div v-if="computing" style="text-align:center;padding:20px;"><div class="spinner" style="margin:0 auto;"></div></div>
          <div v-else-if="pgridResult.length">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">共 {{ pgridResult.length }} 个方格网点</div>
            <div class="table-wrap" style="max-height:400px;overflow-y:auto;">
              <table class="data-table" style="font-size:12px;">
                <thead><tr><th>点号</th><th>X（北）</th><th>Y（东）</th></tr></thead>
                <tbody>
                  <tr v-for="r in pgridResult" :key="r.code">
                    <td class="font-mono">{{ r.code }}</td>
                    <td class="font-mono">{{ r.x }}</td>
                    <td class="font-mono">{{ r.y }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>


      <!-- 离散点方式：方格网放样 IDW 插值 -->
      <div v-if="selPoly && isScatter">
        <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:600;margin-bottom:10px;">🔳 方格网放样设置（高程由最近N个离散点IDW插值）</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <div style="flex:1;min-width:110px;">
              <label style="font-size:11px;color:var(--text-muted);">X方向起始</label>
              <input v-model="grid.minX" type="number" class="form-input font-mono" placeholder="自动填充">
            </div>
            <div style="flex:1;min-width:110px;">
              <label style="font-size:11px;color:var(--text-muted);">X方向终止</label>
              <input v-model="grid.maxX" type="number" class="form-input font-mono" placeholder="自动填充">
            </div>
            <div style="flex:1;min-width:110px;">
              <label style="font-size:11px;color:var(--text-muted);">Y方向起始</label>
              <input v-model="grid.minY" type="number" class="form-input font-mono" placeholder="自动填充">
            </div>
            <div style="flex:1;min-width:110px;">
              <label style="font-size:11px;color:var(--text-muted);">Y方向终止</label>
              <input v-model="grid.maxY" type="number" class="form-input font-mono" placeholder="自动填充">
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <div style="flex:1;min-width:110px;">
              <label style="font-size:11px;color:var(--text-muted);">X间距 (m)</label>
              <input v-model="grid.dx" type="number" class="form-input font-mono" placeholder="如 5">
            </div>
            <div style="flex:1;min-width:110px;">
              <label style="font-size:11px;color:var(--text-muted);">Y间距 (m)</label>
              <input v-model="grid.dy" type="number" class="form-input font-mono" placeholder="如 5">
            </div>
            <div style="flex:1;min-width:110px;">
              <label style="font-size:11px;color:var(--text-muted);">IDW近邻点数N</label>
              <input v-model="grid.knn" type="number" class="form-input font-mono" min="1" max="20" placeholder="3">
            </div>
            <div style="flex:1;min-width:110px;display:flex;align-items:flex-end;gap:6px;">
              <button class="btn btn-primary" style="flex:1;" @click="calcGrid" :disabled="computing">{{ computing?'计算中...':'生成方格网' }}</button>
              <button v-if="gridResult.length" class="btn btn-ghost btn-sm" @click="exportGrid">📤</button>
            </div>
          </div>
        </div>
        <div v-if="computing" style="text-align:center;padding:30px;"><div class="spinner" style="margin:0 auto 10px;"></div></div>
        <div v-else-if="gridResult.length">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">共 {{ gridResult.length }} 个方格网点</div>
          <div class="table-wrap" style="max-height:400px;overflow-y:auto;">
            <table class="data-table" style="font-size:12px;">
              <thead><tr><th>点号</th><th>X（北）</th><th>Y（东）</th><th>IDW高程H</th><th>近邻点数</th></tr></thead>
              <tbody>
                <tr v-for="r in gridResult" :key="r.code">
                  <td class="font-mono">{{ r.code }}</td>
                  <td class="font-mono">{{ r.x }}</td>
                  <td class="font-mono">{{ r.y }}</td>
                  <td class="font-mono" style="color:var(--success);font-weight:600;">{{ r.h }}</td>
                  <td class="font-mono" style="color:var(--text-muted);">{{ r.n }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 未选择时的提示 -->
      <div v-if="!selPoly" style="text-align:center;color:var(--text-muted);padding:30px;border:1px dashed var(--border);border-radius:var(--r-md);">
        请从上方下拉框选择一个面要素。<br>
        <span style="font-size:12px;">多边形面→直接显示角点坐标；离散点面→方格网IDW插值</span>
      </div>
    </div>

    <!-- ===== 道路放样 ===== -->
    <div v-if="activeTab==='roads'">
      <!-- 选择道路 -->
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:10px;">① 选择道路及生成范围</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <div style="flex:2;min-width:180px;">
            <label style="font-size:11px;color:var(--text-muted);">道路</label>
            <select v-model="selRoad" class="form-input" @change="onRoadChange">
              <option value="">-- 请选择 --</option>
              <option v-for="r in roads" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
          <div style="flex:1;min-width:110px;">
            <label style="font-size:11px;color:var(--text-muted);">起始桩号 (K)</label>
            <input v-model="rOpt.startK" type="number" class="form-input font-mono" placeholder="0">
          </div>
          <div style="flex:1;min-width:110px;">
            <label style="font-size:11px;color:var(--text-muted);">终止桩号 (K)</label>
            <input v-model="rOpt.endK" type="number" class="form-input font-mono" placeholder="1000">
          </div>
          <div style="flex:1;min-width:110px;">
            <label style="font-size:11px;color:var(--text-muted);">桩距 (m)</label>
            <input v-model="rOpt.interval" type="number" class="form-input font-mono" placeholder="20">
          </div>
        </div>
      </div>
      <!-- 偏移设置 -->
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:10px;">② 生成内容（可多选）</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" v-model="rOpt.center"> 中桩
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" v-model="rOpt.leftEdge"> 左边桩（横断面参数）
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" v-model="rOpt.rightEdge"> 右边桩（横断面参数）
          </label>
        </div>
        <div style="font-size:12px;font-weight:600;margin-bottom:8px;margin-top:4px;">③ 自定义偏移桩（可多个，逗号分隔，左负右正）</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input v-model="rOpt.offsets" class="form-input font-mono" style="flex:1;min-width:200px;" placeholder="如 -5,-3,0,3,5">
          <span style="font-size:12px;color:var(--text-muted);">（m，正=右，负=左）</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button class="btn btn-primary" @click="calcRoad" :disabled="computing">{{ computing?'计算中...':'🧮 计算放样坐标' }}</button>
        <button v-if="roadResult.length" class="btn btn-ghost" @click="exportRoadResult">📤 导出 CSV</button>
      </div>
      <!-- 结果 -->
      <div v-if="computing" style="text-align:center;padding:30px;"><div class="spinner" style="margin:0 auto 10px;"></div><p style="color:var(--text-secondary);font-size:13px;">正在计算...</p></div>
      <div v-else-if="roadResult.length">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">共 {{ roadResult.length }} 行 × {{ roadResult[0].cols.length }} 列</div>
        <div class="table-wrap" style="max-height:500px;overflow:auto;">
          <table class="data-table" style="font-size:12px;">
            <thead><tr>
              <th style="min-width:90px;">桩号</th>
              <th v-for="c in roadResult[0].cols" :key="c.label" style="min-width:80px;">{{ c.label }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="row in roadResult" :key="row.chainage">
                <td class="font-mono" style="font-weight:600;">K{{ fmtK(row.chainage) }}</td>
                <td v-for="c in row.cols" :key="c.label" class="font-mono">{{ c.val??'-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <div v-if="showPreview" class="modal-overlay" @click.self="closePreview" style="z-index:999;">
      <div class="modal" style="width:95vw;max-width:1200px;height:85vh;display:flex;flex-direction:column;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:16px;">👁️ 放样预览 <span style="font-size:12px;color:var(--text-muted);font-weight:normal;">(滚轮缩放，拖拽平移，蓝绿紫为基准线，红点为放样点)</span></h3>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost btn-sm" @click="resetPreview">⊙ 适应视图</button>
            <button class="btn btn-icon" @click="closePreview">✖</button>
          </div>
        </div>
        <div style="flex:1;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);position:relative;overflow:hidden;">
          <canvas ref="previewCanvas" 
            style="width:100%;height:100%;display:block;cursor:crosshair;touch-action:none;"
            @mousedown="pDown" @mousemove="pMove" @mouseup="pUp" @wheel.prevent="pWheel"
            @touchstart.prevent="pTouchStart" @touchmove.prevent="pTouchMove" @touchend="pTouchEnd">
          </canvas>
        </div>
      </div>
    </div>
  </div>
  `,
  props: ['project'],
  data() {
    return {
      activeTab: 'points',
      tabs: [
        { id: 'points', label: '📍 点库' },
        { id: 'lines',  label: '📏 线库' },
        { id: 'polys',  label: '📐 面' },
        { id: 'roads',  label: '🛣️ 道路' }
      ],
      loading: false, computing: false,
      showPreview: false, cvsW: 800, cvsH: 600,
      pv: { tx: 0, ty: 0, scale: 1, isDrag: false, lastX: 0, lastY: 0, lastDist: 0 },
      // 点库
      points: [], ptSearch: '', ptSelected: [], ptFmt: 'code_x_y_h',
      // 线库
      lines: [], selLine: '', lineInterval: 20, lineOffset: 0, lineResult: [],
      // 面
      polys: [], selPoly: '', polyResult: [], polyInfo: '',
      isScatter: false,
      polyMode: 'pts',
      pgrid: { minX:'', maxX:'', minY:'', maxY:'', dx:10, dy:10, clip:true },
      pgridResult: [],
      grid: { minX:'', maxX:'', minY:'', maxY:'', dx: 5, dy: 5, knn: 3 },
      gridResult: [],
      // 道路
      roads: [], selRoad: '',
      rOpt: { startK: '', endK: '', interval: 20, center: true, leftEdge: true, rightEdge: true, offsets: '' },
      roadResult: []
    };
  },
  computed: {
    coordOffset() { return window.AppStore.state.coordOffset; },
    filteredPts() {
      const q = this.ptSearch.toLowerCase();
      return this.points.filter(p => !q ||
        (p.code||'').toLowerCase().includes(q) || (p.name||'').toLowerCase().includes(q));
    },
    allChecked() {
      return this.filteredPts.length > 0 && this.filteredPts.every(p => this.ptSelected.includes(p.id));
    }
  },
  async mounted() { await this.loadData(); },
  methods: {
    fmt(v, d=4) { return v != null ? (+v).toFixed(d) : '-'; },
    fmtK(k) {
      const n = Math.round(k);
      return `${Math.floor(n/1000)}+${String(n%1000).padStart(3,'0')}`;
    },
    // 应用 store 中的坐标偏移变换
    applyOffset(x, y) {
      const off = window.AppStore.state.coordOffset;
      if (!off) return { x, y };
      if (off.type === 'simple') return { x: x + off.dx, y: y + off.dy };
      if (off.type === 'four' && off.params) {
        const r = Geo.applyFourParams(x, y, off.params);
        return { x: r.x, y: r.y };
      }
      return { x, y };
    },
    async switchTab(id) {
      this.activeTab = id;
      await this.loadData();
    },
    async loadData() {
      this.loading = true;
      try {
        const pid = this.project.id;
        if (this.activeTab === 'points') {
          const { data, error } = await sb.from('points').select('*').eq('project_id', pid).order('code');
          if (error) throw error;
          this.points = data || [];
        } else if (this.activeTab === 'lines') {
          const { data, error } = await sb.from('lines').select('*').eq('project_id', pid);
          if (error) throw error;
          this.lines = data || [];
        } else if (this.activeTab === 'polys') {
          const { data, error } = await sb.from('polys').select('*').eq('project_id', pid);
          if (error) throw error;
          this.polys = data || [];
        } else if (this.activeTab === 'roads') {
          const { data, error } = await sb.from('roads').select('*').eq('project_id', pid);
          if (error) throw error;
          this.roads = data || [];
        }
      } catch (err) {
        window.AppStore.toast('数据加载失败: ' + err.message, 'error');
      } finally { this.loading = false; }
    },

    // ---- 点库 ----
    toggleAll(e) {
      if (e.target.checked) this.ptSelected = this.filteredPts.map(p => p.id);
      else this.ptSelected = [];
    },
    _ptRow(p, fmt) {
      const o = this.applyOffset(+p.x, +p.y);
      const x = o.x.toFixed(4), y = o.y.toFixed(4), h = p.h!=null?this.fmt(p.h):'';
      if (fmt === 'code_y_x_h') return `${p.code||''},${y},${x},${h}`;
      if (fmt === 'name_x_y_h') return `${p.name||p.code||''},${x},${y},${h}`;
      return `${p.code||''},${x},${y},${h}`;
    },
    exportSelected() {
      const pts = this.points.filter(p => this.ptSelected.includes(p.id));
      this._exportPts(pts, '已选点位');
    },
    exportAllPts() { this._exportPts(this.filteredPts, '点库'); },
    _exportPts(pts, label) {
      if (!pts.length) return window.AppStore.toast('无数据', 'error');
      const hdr = this.ptFmt === 'code_y_x_h' ? '编号,Y(东),X(北),H' : '编号,X(北),Y(东),H';
      const rows = pts.map(p => this._ptRow(p, this.ptFmt)).join('\n');
      this._dl('\uFEFF' + hdr + '\n' + rows, label + '_' + this.project.name + '.csv');
    },

    // ---- 线库 ----
    onLineChange() { this.lineResult = []; },
    calcLine() {
      const line = this.lines.find(l => l.id === this.selLine);
      if (!line) return window.AppStore.toast('请先选择线形', 'error');
      const pts = (line.points || []).filter(p => p.x != null && p.y != null);
      if (pts.length < 2) return window.AppStore.toast('线形点位不足', 'error');
      const interval = parseFloat(this.lineInterval) || 20;
      const offset = parseFloat(this.lineOffset) || 0;
      const result = [];
      let idx = 1;
      // 沿折线按间距插点
      let cumLen = 0, segStart = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i], p2 = pts[i+1];
        const dx = p2.x-p1.x, dy = p2.y-p1.y;
        const segLen = Math.sqrt(dx*dx+dy*dy);
        const az = Math.atan2(dy, dx); // 数学角
        const measAz = Math.PI/2 - az; // 测量方位角
        if (segLen < 1e-6) continue;
        // 起点
        if (i === 0) {
          result.push(this._offsetPt('L'+idx++, p1.x, p1.y, az, offset));
        }
        // 间距插点
        let d = interval - (cumLen % interval);
        while (d <= segLen) {
          const t = d / segLen;
          const px = p1.x + t*dx, py = p1.y + t*dy;
          result.push(this._offsetPt('L'+idx++, px, py, az, offset));
          d += interval;
        }
        cumLen += segLen;
      }
      // 终点
      const last = pts[pts.length-1];
      const prev = pts[pts.length-2];
      const azLast = Math.atan2(last.y-prev.y, last.x-prev.x);
      result.push(this._offsetPt('L'+idx, last.x, last.y, azLast, offset));
      this.lineResult = result;
      window.AppStore.toast(`已生成 ${result.length} 个点`, 'success');
    },
    _offsetPt(code, x, y, mathAz, offset) {
      // 垂直方向偏移（左偏为正：逆时针转90°）
      const perpAz = mathAz + Math.PI/2;
      const rx = x + offset * Math.cos(perpAz);
      const ry = y + offset * Math.sin(perpAz);
      const o = this.applyOffset(rx, ry);
      return {
        code,
        x: +o.x.toFixed(4),
        y: +o.y.toFixed(4),
        offset: offset
      };
    },
    exportLineResult() {
      const hdr = '点号,X(北),Y(东),偏距(m)';
      const rows = this.lineResult.map(r => `${r.code},${r.x},${r.y},${r.offset}`).join('\n');
      this._dl('\uFEFF'+hdr+'\n'+rows, '线放样_'+this.project.name+'.csv');
    },

    // ---- 面 ----
    onPolyChange() {
      const poly = this.polys.find(p => p.id === this.selPoly);
      this.polyResult = []; this.gridResult = [];
      // 判断是否为离散点面：优先看 scatter_type字段，其次看 points 点数多且无面积/周长信息
      this.isScatter = !!(poly && (
        poly.scatter_type === 'scatter' ||
        (Array.isArray(poly.points) && poly.points.length > 10 && !poly.area)
      ));
      if (!poly) return;
      if (!this.isScatter) {
        // 多边形：展示角点
        const pts = poly.points || [];
        this.polyResult = pts.map((p, i) => ({
          code: `${poly.name}_P${i+1}`,
          x: this.fmt(p.x), y: this.fmt(p.y), h: p.h!=null?this.fmt(p.h):null
        }));
        const area = poly.area ? ` | 面积：${this.fmt(poly.area,2)}m²` : '';
        this.polyInfo = `${poly.name}：共 ${pts.length} 个角点${area}`;
      } else {
        // 离散点：预填范围
        const pts = poly.points || [];
        const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
        this.grid.minX = xs.length?+Math.min(...xs).toFixed(4):'';
        this.grid.maxX = xs.length?+Math.max(...xs).toFixed(4):'';
        this.grid.minY = ys.length?+Math.min(...ys).toFixed(4):'';
        this.grid.maxY = ys.length?+Math.max(...ys).toFixed(4):'';
        this.polyInfo = `${poly.name}：共 ${pts.length} 个离散点`;
      }
    },
    exportPolyResult() {
      const hdr = '点号,X(北),Y(东),H';
      const rows = this.polyResult.map(r => `${r.code},${r.x},${r.y},${r.h??''}`).join('\n');
      this._dl('\uFEFF'+hdr+'\n'+rows, '面放样_'+this.project.name+'.csv');
    },
    initPolyGrid() {
      // 自动填充多边形范围
      const poly = this.polys.find(p => p.id === this.selPoly);
      if (!poly || !Array.isArray(poly.points) || !poly.points.length) return;
      const pts = poly.points;
      const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
      if (!this.pgrid.minX) this.pgrid.minX = +Math.min(...xs).toFixed(4);
      if (!this.pgrid.maxX) this.pgrid.maxX = +Math.max(...xs).toFixed(4);
      if (!this.pgrid.minY) this.pgrid.minY = +Math.min(...ys).toFixed(4);
      if (!this.pgrid.maxY) this.pgrid.maxY = +Math.max(...ys).toFixed(4);
    },
    // 射线法判断点是否在多边形内
    pointInPolygon(px, py, polygon) {
      let inside = false;
      for (let i=0, j=polygon.length-1; i<polygon.length; j=i++) {
        const xi=polygon[i].x, yi=polygon[i].y;
        const xj=polygon[j].x, yj=polygon[j].y;
        if (((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
      }
      return inside;
    },
    async calcPolyGrid() {
      const poly = this.polys.find(p => p.id === this.selPoly);
      if (!poly || !Array.isArray(poly.points)) return;
      const dx = parseFloat(this.pgrid.dx)||10, dy = parseFloat(this.pgrid.dy)||10;
      const minX = parseFloat(this.pgrid.minX), maxX = parseFloat(this.pgrid.maxX);
      const minY = parseFloat(this.pgrid.minY), maxY = parseFloat(this.pgrid.maxY);
      if ([minX,maxX,minY,maxY].some(isNaN)) return window.AppStore.toast('请填写方格网范围','error');
      this.computing = true; this.pgridResult = [];
      await new Promise(r=>setTimeout(r,20));
      const result = [];
      let xi = 0;
      for (let gx=minX; gx<=maxX+1e-6; gx+=dx, xi++) {
        let yi = 0;
        for (let gy=minY; gy<=maxY+1e-6; gy+=dy, yi++) {
          const px = +gx.toFixed(4), py = +gy.toFixed(4);
          if (this.pgrid.clip && !this.pointInPolygon(px, py, poly.points)) continue;
          const o = this.applyOffset(px, py);
          result.push({ code:`G${xi+1}-${yi+1}`, x:o.x.toFixed(4), y:o.y.toFixed(4) });
        }
      }
      this.pgridResult = result;
      this.computing = false;
      window.AppStore.toast(`已生成 ${result.length} 个方格网点`,'success');
    },
    exportPolyGrid() {
      const hdr = '点号,X(北),Y(东)';
      const rows = this.pgridResult.map(r=>`${r.code},${r.x},${r.y}`).join('\n');
      this._dl('\uFEFF'+hdr+'\n'+rows, '方格网放样_'+this.project.name+'.csv');
    },
    async calcGrid() {
      const poly = this.polys.find(p => p.id === this.selPoly);
      if (!poly || !this.isScatter) return;
      const pts = (poly.points||[]).filter(p => p.x!=null && p.y!=null && p.h!=null);
      if (!pts.length) return window.AppStore.toast('离散点无高程数据', 'error');
      const dx = parseFloat(this.grid.dx)||5, dy = parseFloat(this.grid.dy)||5;
      const knn = Math.max(1, parseInt(this.grid.knn)||3);
      const minX = parseFloat(this.grid.minX), maxX = parseFloat(this.grid.maxX);
      const minY = parseFloat(this.grid.minY), maxY = parseFloat(this.grid.maxY);
      if ([minX,maxX,minY,maxY].some(isNaN)) return window.AppStore.toast('请输入方格网范围', 'error');
      this.computing = true; this.gridResult = [];
      await new Promise(r=>setTimeout(r,30));
      const result = [];
      let xi = 0;
      for (let gx = minX; gx <= maxX+1e-6; gx += dx, xi++) {
        let yi = 0;
        for (let gy = minY; gy <= maxY+1e-6; gy += dy, yi++) {
          const px = +gx.toFixed(4), py = +gy.toFixed(4);
          // 计算到所有离散点的距离
          const dists = pts.map(p => ({
            h: p.h,
            d2: (p.x-px)*(p.x-px) + (p.y-py)*(p.y-py)
          }));
          // 按距离排序取最近K个
          dists.sort((a,b)=>a.d2-b.d2);
          const near = dists.slice(0, knn);
          let h;
          // 如果有一个点直接命中，直接取该点高程
          if (near[0].d2 < 1e-8) {
            h = near[0].h;
          } else {
            // IDW: 高程 = 加权平均 (w_i = 1/d_i^2)
            const wSum = near.reduce((s,p)=>s+1/p.d2, 0);
            h = near.reduce((s,p)=>s+(p.h/p.d2), 0) / wSum;
          }
          result.push({
            code: `G${xi+1}-${yi+1}`,
            x: px, y: py,
            h: +h.toFixed(4),
            n: near.length
          });
        }
      }
      this.gridResult = result;
      this.computing = false;
      window.AppStore.toast(`已生成 ${result.length} 个方格网点`, 'success');
    },
    exportGrid() {
      const hdr = '点号,X(北),Y(东),IDW插値H,参与离散点数';
      const rows = this.gridResult.map(r=>`${r.code},${r.x},${r.y},${r.h},${r.n}`).join('\n');
      this._dl('\uFEFF'+hdr+'\n'+rows, '方格网放样_'+this.project.name+'.csv');
    },

    // ---- 道路 ----
    onRoadChange() {
      const road = this.roads.find(r => r.id === this.selRoad);
      if (!road) {
        this.rOpt.startK = ''; this.rOpt.endK = '';
        return;
      }
      // 1. 尝试从纵断面变坡点提取起止
      const vpis = road.vertical_curves || [];
      if (vpis.length >= 2) {
        const ks = vpis.map(v => parseFloat(v.chainage)).filter(k => !isNaN(k));
        this.rOpt.startK = Math.min(...ks);
        this.rOpt.endK = Math.max(...ks);
        return;
      }
      // 2. 尝试从线元法推断
      if (road.alignment_method === 'ELEMENTS' && road.elements && road.elements.length) {
        const sk = parseFloat(road.start_chainage) || 0;
        const len = road.elements.reduce((sum, e) => sum + (parseFloat(e.length) || 0), 0);
        this.rOpt.startK = sk;
        this.rOpt.endK = sk + len;
        return;
      }
      // 3. 尝试从交点法推断（交点法很难不借助计算器算总长，但可用 RoadMath 获取）
      if (road.alignment_method === 'JD' && road.jd_points && road.jd_points.length) {
         try {
           if (window.RoadMath) {
             const align = window.RoadMath.buildAlignmentFromJD(road.start_chainage || 0, road.jd_points);
             if (align && align.length) {
                this.rOpt.startK = parseFloat(road.start_chainage) || 0;
                this.rOpt.endK = align[align.length-1].endK;
                return;
             }
           }
         } catch(e) { /* ignore */ }
      }
      // 4. 从坐标法推断
      if (road.coord_points && road.coord_points.length >= 2) {
        const ks = road.coord_points.map(c => parseFloat(c.chainage)).filter(k => !isNaN(k));
        this.rOpt.startK = Math.min(...ks);
        this.rOpt.endK = Math.max(...ks);
        return;
      }
      // 回退
      this.rOpt.startK = parseFloat(road.start_chainage) || 0;
      this.rOpt.endK = this.rOpt.startK + 1000; // 给个默认 1000
    },
    async calcRoad() {
      if (!this.selRoad) return window.AppStore.toast('请选择道路', 'error');
      const road = this.roads.find(r => r.id === this.selRoad);
      if (!road) return;
      const { startK, endK, interval, center, leftEdge, rightEdge, offsets } = this.rOpt;
      if (startK == null || startK === '' || endK == null || endK === '') return window.AppStore.toast('请输入起止桩号','error');
      const intv = parseFloat(interval);
      if (isNaN(intv) || intv <= 0) return window.AppStore.toast('桩距必须大于0', 'error');

      this.computing = true; this.roadResult = [];
      await new Promise(r=>setTimeout(r,30));
      try {
        // 调用 RoadMath 计算逐桩
        const stakeRows = window.RoadMath.computeStakeTable(road, { startK, endK, interval: intv });
        if (stakeRows && stakeRows.error) throw new Error(stakeRows.error);

        // 解析自定义偏移值
        const customOffsets = (offsets || '').toString().split(',').map(s=>parseFloat(s.trim())).filter(v=>!isNaN(v));

        const result = [];
        for (const row of (stakeRows||[])) {
          // 构建列
          const cols = [];
          if (center) {
            cols.push({label:'中桩X', val:row.x??null});
            cols.push({label:'中桩Y', val:row.y??null});
            cols.push({label:'中桩H', val:row.h??null});
          }
          if (leftEdge) {
            cols.push({label:'左边桩X', val:row.left_x??null});
            cols.push({label:'左边桩Y', val:row.left_y??null});
            cols.push({label:'左边H',  val:row.left_h??null});
          }
          if (rightEdge) {
            cols.push({label:'右边桩X', val:row.right_x??null});
            cols.push({label:'右边桩Y', val:row.right_y??null});
            cols.push({label:'右边H',  val:row.right_h??null});
          }
          // 自定义偏移桩
          for (const off of customOffsets) {
            if (row.x!=null && row.y!=null && row.azimuth!=null) {
              const az = row.azimuth;
              const mathAz = (90-az)*Math.PI/180;
              const perpAz = mathAz + Math.PI/2;
              const px = +(row.x + off*Math.cos(perpAz)).toFixed(4);
              const py = +(row.y + off*Math.sin(perpAz)).toFixed(4);
              const o = this.applyOffset(px, py);
              const label = off>0?`右${off}m`:(off<0?`左${Math.abs(off)}m`:'中桩');
              cols.push({label:`${label}X`, val:o.x.toFixed(4)});
              cols.push({label:`${label}Y`, val:o.y.toFixed(4)});
            }
          }
          if (cols.length) result.push({ chainage: row.chainage, cols });
        }
        this.roadResult = result;
        window.AppStore.toast(`已生成 ${result.length} 个桩号的坐标`, 'success');
      } catch(e) {
        window.AppStore.toast('计算失败: '+e.message, 'error');
      } finally { this.computing = false; }
    },
    exportRoadResult() {
      if (!this.roadResult.length) return;
      const colLabels = this.roadResult[0].cols.map(c=>c.label);
      const hdr = '桩号,' + colLabels.join(',');
      const rows = this.roadResult.map(row =>
        `K${this.fmtK(row.chainage)},` + row.cols.map(c=>c.val??'').join(',')
      );
      this._dl('\uFEFF'+hdr+'\n'+rows.join('\n'), '道路放样_'+this.project.name+'.csv');
    },

    // ---- 工具 ----
    _dl(content, filename) {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    },

    // ---- 预览逻辑 ----
    openPreview() {
      this.showPreview = true;
      this.$nextTick(() => {
        this.resizeCanvas();
        this.resetPreview();
      });
      window.addEventListener('resize', this.resizeCanvas);
    },
    closePreview() {
      this.showPreview = false;
      window.removeEventListener('resize', this.resizeCanvas);
    },
    resizeCanvas() {
      const cvs = this.$refs.previewCanvas;
      if (cvs && cvs.parentElement) {
        this.cvsW = cvs.parentElement.clientWidth;
        this.cvsH = cvs.parentElement.clientHeight;
        cvs.width = this.cvsW;
        cvs.height = this.cvsH;
        this.drawPreview();
      }
    },
    resetPreview() {
      const pts = [];
      const addPts = (arr) => arr.forEach(p => { if(p.x!=null&&p.y!=null) pts.push({ x: parseFloat(p.x), y: parseFloat(p.y) }); });
      
      if (this.activeTab === 'points') {
        const pArr = this.filteredPts;
        const step = Math.max(1, Math.ceil(pArr.length / 5000));
        for(let i=0; i<pArr.length; i+=step) {
           const o = this.applyOffset(parseFloat(pArr[i].x), parseFloat(pArr[i].y));
           pts.push(o);
        }
      } else if (this.activeTab === 'lines' && this.selLine) {
        const line = this.lines.find(l => l.id === this.selLine);
        if (line && line.points) line.points.forEach(p => pts.push(this.applyOffset(parseFloat(p.x), parseFloat(p.y))));
        addPts(this.lineResult);
      } else if (this.activeTab === 'polys' && this.selPoly) {
        const poly = this.polys.find(p => p.id === this.selPoly);
        if (poly && poly.points) poly.points.forEach(p => pts.push(this.applyOffset(parseFloat(p.x), parseFloat(p.y))));
        const resPts = this.polyMode === 'pts' ? this.polyResult : (this.isScatter ? this.gridResult : this.pgridResult);
        addPts(resPts);
      } else if (this.activeTab === 'roads' && this.selRoad) {
        const road = this.roads.find(r => r.id === this.selRoad);
        if (road && road.jds) road.jds.forEach(p => pts.push(this.applyOffset(parseFloat(p.x), parseFloat(p.y))));
        this.roadResult.forEach(row => {
          row.cols.forEach(c => {
            if (c.label.endsWith('X')) {
              const yCol = row.cols.find(cy => cy.label === c.label.replace('X','Y'));
              if (yCol && c.val != null && yCol.val != null) pts.push({x: parseFloat(c.val), y: parseFloat(yCol.val)});
            }
          });
        });
      }

      if (!pts.length) {
        this.pv.tx = this.cvsW / 2; this.pv.ty = this.cvsH / 2; this.pv.scale = 1;
        this.drawPreview();
        return;
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(p => {
        if(p.x < minX) minX = p.x; if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y; if(p.y > maxY) maxY = p.y;
      });

      const dx = maxX - minX, dy = maxY - minY;
      const pad = 40;
      const scaleX = (this.cvsH - pad * 2) / (dx || 10);
      const scaleY = (this.cvsW - pad * 2) / (dy || 10);
      this.pv.scale = Math.min(scaleX, scaleY);
      this.pv.tx = this.cvsW / 2 - ((minY + maxY) / 2) * this.pv.scale;
      this.pv.ty = this.cvsH / 2 + ((minX + maxX) / 2) * this.pv.scale;
      this.drawPreview();
    },
    toCanvas(px, py) {
      return { cx: this.pv.tx + py * this.pv.scale, cy: this.pv.ty - px * this.pv.scale };
    },
    drawPreview() {
      const cvs = this.$refs.previewCanvas;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      ctx.clearRect(0, 0, this.cvsW, this.cvsH);

      const drawPts = (arr, color, radius, isStroke = false) => {
        if (!arr || !arr.length) return;
        ctx.fillStyle = color; ctx.strokeStyle = color;
        ctx.beginPath();
        arr.forEach(p => {
          if (p.x == null || p.y == null || isNaN(p.x)) return;
          const { cx, cy } = this.toCanvas(p.x, p.y);
          ctx.moveTo(cx + radius, cy);
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        });
        if (isStroke) ctx.stroke(); else ctx.fill();
      };
      const drawLine = (arr, color, width, isPoly = false) => {
        if (!arr || arr.length < 2) return;
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
        let moved = false;
        arr.forEach(p => {
          if (p.x == null || p.y == null || isNaN(p.x)) return;
          const { cx, cy } = this.toCanvas(p.x, p.y);
          if (!moved) { ctx.moveTo(cx, cy); moved = true; }
          else { ctx.lineTo(cx, cy); }
        });
        if (isPoly && moved) ctx.closePath();
        ctx.stroke();
      };

      if (this.activeTab === 'points') {
        const pArr = this.filteredPts;
        const step = Math.max(1, Math.ceil(pArr.length / 5000));
        const pts = [];
        for(let i=0; i<pArr.length; i+=step) pts.push(this.applyOffset(parseFloat(pArr[i].x), parseFloat(pArr[i].y)));
        drawPts(pts, 'rgba(96, 165, 250, 0.6)', 3);
        const selPts = this.points.filter(p => this.ptSelected.includes(p.id)).map(p=>this.applyOffset(parseFloat(p.x),parseFloat(p.y)));
        drawPts(selPts, '#ef4444', 4);
      } 
      else if (this.activeTab === 'lines' && this.selLine) {
        const line = this.lines.find(l => l.id === this.selLine);
        if (line && line.points) {
          const offPts = line.points.map(p=>this.applyOffset(parseFloat(p.x),parseFloat(p.y)));
          drawLine(offPts, '#34d399', 2);
          drawPts(offPts, '#10b981', 3);
        }
        drawPts(this.lineResult, '#ef4444', 4);
      }
      else if (this.activeTab === 'polys' && this.selPoly) {
        const poly = this.polys.find(p => p.id === this.selPoly);
        if (poly && poly.points) {
          const offPts = poly.points.map(p=>this.applyOffset(parseFloat(p.x),parseFloat(p.y)));
          if (poly.scatter_type === 'scatter') drawPts(offPts, '#a78bfa', 2);
          else { drawLine(offPts, '#8b5cf6', 2, true); drawPts(offPts, '#a78bfa', 3); }
        }
        const resPts = this.polyMode === 'pts' ? this.polyResult : (this.isScatter ? this.gridResult : this.pgridResult);
        const stPts = [];
        resPts.forEach(p => { if(p.x!=null&&p.y!=null) stPts.push({x:parseFloat(p.x), y:parseFloat(p.y)}); });
        drawPts(stPts, '#ef4444', 4);
      }
      else if (this.activeTab === 'roads' && this.selRoad) {
        const road = this.roads.find(r => r.id === this.selRoad);
        if (road && road.jds && road.jds.length) {
           drawLine(road.jds.map(p=>this.applyOffset(parseFloat(p.x),parseFloat(p.y))), 'rgba(251, 146, 60, 0.4)', 1);
        }
        if (road && road.alignment && window.RoadMath) {
           const centerPts = [];
           const L = road.alignment[road.alignment.length-1].endK;
           for(let k=0; k<=L; k+=20) {
             const pt = window.RoadMath.getPointByChainage(road.alignment, k);
             if(pt) centerPts.push(this.applyOffset(pt.x, pt.y));
           }
           drawLine(centerPts, '#f97316', 2);
        }
        const stakePts = [];
        this.roadResult.forEach(row => {
          row.cols.forEach(c => {
            if (c.label.endsWith('X')) {
              const yCol = row.cols.find(cy => cy.label === c.label.replace('X','Y'));
              if (yCol && c.val != null && yCol.val != null) stakePts.push({x: parseFloat(c.val), y: parseFloat(yCol.val)});
            }
          });
        });
        drawPts(stakePts, '#ef4444', 4);
      }
    },
    pDown(e) { this.pv.isDrag = true; this.pv.lastX = e.clientX; this.pv.lastY = e.clientY; },
    pMove(e) {
      if (!this.pv.isDrag) return;
      this.pv.tx += e.clientX - this.pv.lastX;
      this.pv.ty += e.clientY - this.pv.lastY;
      this.pv.lastX = e.clientX; this.pv.lastY = e.clientY;
      requestAnimationFrame(this.drawPreview);
    },
    pUp() { this.pv.isDrag = false; },
    pWheel(e) {
      const zoom = e.deltaY > 0 ? 0.9 : 1.1;
      const cvs = this.$refs.previewCanvas;
      const rect = cvs.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.pv.tx = mx - (mx - this.pv.tx) * zoom;
      this.pv.ty = my - (my - this.pv.ty) * zoom;
      this.pv.scale *= zoom;
      requestAnimationFrame(this.drawPreview);
    },
    pTouchStart(e) {
      if (e.touches.length === 1) {
        this.pv.isDrag = true;
        this.pv.lastX = e.touches[0].clientX;
        this.pv.lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.pv.isDrag = false;
        this.pv.lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    },
    pTouchMove(e) {
      if (e.touches.length === 1 && this.pv.isDrag) {
        this.pv.tx += e.touches[0].clientX - this.pv.lastX;
        this.pv.ty += e.touches[0].clientY - this.pv.lastY;
        this.pv.lastX = e.touches[0].clientX;
        this.pv.lastY = e.touches[0].clientY;
        requestAnimationFrame(this.drawPreview);
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const zoom = dist / this.pv.lastDist;
        this.pv.lastDist = dist;
        const cvs = this.$refs.previewCanvas;
        const rect = cvs.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        this.pv.tx = mx - (mx - this.pv.tx) * zoom;
        this.pv.ty = my - (my - this.pv.ty) * zoom;
        this.pv.scale *= zoom;
        requestAnimationFrame(this.drawPreview);
      }
    },
    pTouchEnd(e) { this.pv.isDrag = false; }
  }
};
