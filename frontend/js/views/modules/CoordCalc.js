/** 坐标计算模块：正算 / 反算 / 面积 / 偏距 */
window.CoordCalcModule = {
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2 class="module-title">🔢 坐标计算</h2>
      <span v-if="pointLib.length" style="font-size:12px;color:var(--text-muted);">📍 点库已加载 {{ pointLib.length }} 个点</span>
    </div>

    <!-- 计算类型切换 -->
    <div class="calc-tabs">
      <button v-for="t in calcTypes" :key="t.id"
        class="calc-tab" :class="{active: activeCalc===t.id}"
        @click="activeCalc=t.id; clearResult()">{{ t.label }}</button>
    </div>

    <!-- 正算 -->
    <div v-if="activeCalc==='polar2rect'" class="calc-card">
      <h3 class="calc-card-title">正算（极坐标 → 直角坐标）</h3>
      <div class="calc-grid">
        <div class="form-group"><label class="form-label">起点 X（北） <a href="#" @click.prevent="pickPoint('p2r','x0','y0')" style="font-size:11px;">📍选点</a></label>
          <input v-model="p2r.x0" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">起点 Y（东）</label>
          <input v-model="p2r.y0" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">方位角（°）</label>
          <input v-model="p2r.az" type="number" class="form-input font-mono" step="0.00001" placeholder="123.456789"></div>
        <div class="form-group"><label class="form-label">水平距离（m）</label>
          <input v-model="p2r.dist" type="number" class="form-input font-mono" step="0.0001"></div>
      </div>
      <button class="btn btn-primary" @click="doPolar2Rect">计算</button>
      <div v-if="result" class="result-box">
        <div class="result-row"><span>终点 X</span><span class="font-mono result-val">{{ result.x }}</span></div>
        <div class="result-row"><span>终点 Y</span><span class="font-mono result-val">{{ result.y }}</span></div>
      </div>
    </div>

    <!-- 反算 -->
    <div v-if="activeCalc==='rect2polar'" class="calc-card">
      <h3 class="calc-card-title">反算（两点 → 方位角 + 距离）</h3>
      <div class="calc-grid">
        <div class="form-group"><label class="form-label">起点 X <a href="#" @click.prevent="pickPoint('r2p','x1','y1')" style="font-size:11px;">📍选点</a></label>
          <input v-model="r2p.x1" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">起点 Y</label>
          <input v-model="r2p.y1" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">终点 X <a href="#" @click.prevent="pickPoint('r2p','x2','y2')" style="font-size:11px;">📍选点</a></label>
          <input v-model="r2p.x2" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">终点 Y</label>
          <input v-model="r2p.y2" type="number" class="form-input font-mono" step="0.0001"></div>
      </div>
      <button class="btn btn-primary" @click="doRect2Polar">计算</button>
      <div v-if="result" class="result-box">
        <div class="result-row"><span>方位角（十进制°）</span><span class="font-mono result-val">{{ result.azDec }}</span></div>
        <div class="result-row"><span>方位角（度分秒）</span><span class="font-mono result-val">{{ result.azDMS }}</span></div>
        <div class="result-row"><span>水平距离（m）</span><span class="font-mono result-val">{{ result.dist }}</span></div>
      </div>
    </div>

    <!-- 面积计算 -->
    <div v-if="activeCalc==='area'" class="calc-card">
      <h3 class="calc-card-title">面积计算（多边形）</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">每行输入一个顶点：X, Y（逗号分隔）</p>
      <textarea v-model="areaInput" class="form-input font-mono" rows="8"
        style="resize:vertical;" placeholder="例：&#10;1000.0000, 2000.0000&#10;1050.0000, 2000.0000&#10;1050.0000, 2050.0000"></textarea>
      <button class="btn btn-primary" style="margin-top:12px;" @click="doArea">计算</button>
      <div v-if="result" class="result-box">
        <div class="result-row"><span>面积</span><span class="font-mono result-val">{{ result.area }} m²</span></div>
        <div class="result-row"><span>面积（亩）</span><span class="font-mono result-val">{{ result.mu }} 亩</span></div>
        <div class="result-row"><span>周长</span><span class="font-mono result-val">{{ result.perimeter }} m</span></div>
        <div class="result-row"><span>顶点数</span><span class="font-mono result-val">{{ result.n }}</span></div>
      </div>
    </div>

    <!-- 偏距 -->
    <div v-if="activeCalc==='offset'" class="calc-card">
      <h3 class="calc-card-title">点到直线偏距</h3>
      <div class="calc-grid">
        <div class="form-group"><label class="form-label">直线起点 X <a href="#" @click.prevent="pickPoint('off','x1','y1')" style="font-size:11px;">📍选点</a></label>
          <input v-model="off.x1" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">直线起点 Y</label>
          <input v-model="off.y1" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">直线终点 X <a href="#" @click.prevent="pickPoint('off','x2','y2')" style="font-size:11px;">📍选点</a></label>
          <input v-model="off.x2" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">直线终点 Y</label>
          <input v-model="off.y2" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">待测点 X <a href="#" @click.prevent="pickPoint('off','px','py')" style="font-size:11px;">📍选点</a></label>
          <input v-model="off.px" type="number" class="form-input font-mono" step="0.0001"></div>
        <div class="form-group"><label class="form-label">待测点 Y</label>
          <input v-model="off.py" type="number" class="form-input font-mono" step="0.0001"></div>
      </div>
      <button class="btn btn-primary" @click="doOffset">计算</button>
      <div v-if="result" class="result-box">
        <div class="result-row"><span>切距（沿线桩号）</span><span class="font-mono result-val">{{ result.tangent }} m</span></div>
        <div class="result-row"><span>垂距（偏距）</span><span class="font-mono result-val">{{ result.normal }} m</span></div>
        <div class="result-row"><span>偏向</span><span class="font-mono result-val">{{ result.side }}</span></div>
      </div>
    </div>

    <!-- 导线计算 -->
    <div v-if="activeCalc==='traverse'" class="calc-card">
      <h3 class="calc-card-title">导线计算（附合/闭合导线）</h3>
      <div class="calc-grid" style="margin-bottom:10px;">
        <div class="form-group"><label class="form-label">起点 X</label><input v-model="tv.startX" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">起点 Y</label><input v-model="tv.startY" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">起始方位角（°）</label><input v-model="tv.startAz" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:6px;"><input type="checkbox" v-model="tv.isClosed"> 闭合导线</label></div>
      </div>
      <div v-if="!tv.isClosed" class="calc-grid" style="margin-bottom:10px;">
        <div class="form-group"><label class="form-label">终点 X（附合）</label><input v-model="tv.endX" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">终点 Y（附合）</label><input v-model="tv.endY" type="number" class="form-input font-mono"></div>
      </div>
      <div style="font-size:12px;font-weight:600;margin:10px 0 6px;">各测站：转角（右角°）+ 边长</div>
      <div v-for="(row,i) in tv.rows" :key="i" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <span style="font-size:12px;color:var(--text-muted);min-width:24px;">{{ i+1 }}</span>
        <input v-model="row.angle" type="number" class="form-input font-mono" style="flex:1;" placeholder="右角(°)">
        <input v-model="row.dist"  type="number" class="form-input font-mono" style="flex:1;" placeholder="边长(m)">
        <button class="btn btn-ghost btn-sm" style="color:var(--danger);" @click="delTvRow(i)">✕</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn btn-ghost btn-sm" @click="addTvRow">＋ 添加测站</button>
        <button class="btn btn-primary" @click="doTraverse">计算</button>
      </div>
      <div v-if="tvResult" class="result-box" style="margin-top:12px;">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
          坐标闭合差：fx={{ tvResult.fx }} fy={{ tvResult.fy }} fD={{ tvResult.fD }} | 精度：1/{{ tvResult.K }}
        </div>
        <div style="max-height:280px;overflow-y:auto;">
          <div v-for="p in tvResult.points" :key="p.name" class="result-row">
            <span class="font-mono">{{ p.name }}</span>
            <span class="font-mono result-val">{{ p.x }}, {{ p.y }}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;" @click="copyTvResult">📋 复制坐标</button>
        <button class="btn btn-primary btn-sm" style="margin-top:8px;" @click="saveTvToPoints">💾 保存到点库</button>
      </div>
    </div>

    <!-- 前方交会 -->
    <div v-if="activeCalc==='fwd'" class="calc-card">
      <h3 class="calc-card-title">前方交会（两已知点 + 两方位角）</h3>
      <div class="calc-grid">
        <div class="form-group"><label class="form-label">已知点A — X <a href="#" @click.prevent="pickPoint('fwd','xA','yA')" style="font-size:11px;">📍选点</a></label><input v-model="fwd.xA" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点A — Y</label><input v-model="fwd.yA" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">A→P 方位角（°）</label><input v-model="fwd.azA" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点B — X <a href="#" @click.prevent="pickPoint('fwd','xB','yB')" style="font-size:11px;">📍选点</a></label><input v-model="fwd.xB" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点B — Y</label><input v-model="fwd.yB" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">B→P 方位角（°）</label><input v-model="fwd.azB" type="number" class="form-input font-mono"></div>
      </div>
      <button class="btn btn-primary" @click="doFwd">计算</button>
      <div v-if="result" class="result-box">
        <div class="result-row"><span>待定点 X</span><span class="font-mono result-val">{{ result.x }}</span></div>
        <div class="result-row"><span>待定点 Y</span><span class="font-mono result-val">{{ result.y }}</span></div>
      </div>
    </div>

    <!-- 后方交会 -->
    <div v-if="activeCalc==='back'" class="calc-card">
      <h3 class="calc-card-title">后方交会（三已知点 + 两夹角）</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">测站P观测A、B、C三已知点，输入∠APB和∠BPC</p>
      <div class="calc-grid">
        <div class="form-group"><label class="form-label">已知点A — X <a href="#" @click.prevent="pickPoint('bk','xA','yA')" style="font-size:11px;">📍选点</a></label><input v-model="bk.xA" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点A — Y</label><input v-model="bk.yA" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点B — X <a href="#" @click.prevent="pickPoint('bk','xB','yB')" style="font-size:11px;">📍选点</a></label><input v-model="bk.xB" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点B — Y</label><input v-model="bk.yB" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点C — X <a href="#" @click.prevent="pickPoint('bk','xC','yC')" style="font-size:11px;">📍选点</a></label><input v-model="bk.xC" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点C — Y</label><input v-model="bk.yC" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">∠APB（°）</label><input v-model="bk.alpha" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">∠BPC（°）</label><input v-model="bk.beta"  type="number" class="form-input font-mono"></div>
      </div>
      <button class="btn btn-primary" @click="doBack">计算</button>
      <div v-if="result" class="result-box">
        <div class="result-row"><span>测站点 X</span><span class="font-mono result-val">{{ result.x }}</span></div>
        <div class="result-row"><span>测站点 Y</span><span class="font-mono result-val">{{ result.y }}</span></div>
      </div>
    </div>

    <!-- 距离交会 -->
    <div v-if="activeCalc==='dist'" class="calc-card">
      <h3 class="calc-card-title">距离交会（两已知点 + 两距离）</h3>
      <div class="calc-grid">
        <div class="form-group"><label class="form-label">已知点A — X <a href="#" @click.prevent="pickPoint('di','xA','yA')" style="font-size:11px;">📍选点</a></label><input v-model="di.xA" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点A — Y</label><input v-model="di.yA" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">PA 距离（m）</label><input v-model="di.dA" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点B — X <a href="#" @click.prevent="pickPoint('di','xB','yB')" style="font-size:11px;">📍选点</a></label><input v-model="di.xB" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">已知点B — Y</label><input v-model="di.yB" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">PB 距离（m）</label><input v-model="di.dB" type="number" class="form-input font-mono"></div>
      </div>
      <button class="btn btn-primary" @click="doDist">计算</button>
      <div v-if="diSols" class="result-box">
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">距离交会有两个解，请根据实际位置选择：</p>
        <div v-for="s in diSols" :key="s.label" style="margin-bottom:10px;padding:8px;background:var(--bg-base);border-radius:var(--r-sm);">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px;">{{ s.label }}</div>
          <div class="result-row"><span>X</span><span class="font-mono result-val">{{ s.x }}</span></div>
          <div class="result-row"><span>Y</span><span class="font-mono result-val">{{ s.y }}</span></div>
        </div>
      </div>
    </div>

    <!-- 高斯投影 -->
    <div v-if="activeCalc==='gauss'" class="calc-card">
      <h3 class="calc-card-title">高斯-克吕格投影（正算 / 反算）</h3>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button class="btn btn-sm" :class="gs.mode==='fwd'?'btn-primary':'btn-ghost'" @click="gs.mode='fwd';result=null">大地→平面（正算）</button>
        <button class="btn btn-sm" :class="gs.mode==='inv'?'btn-primary':'btn-ghost'" @click="gs.mode='inv';result=null">平面→大地（反算）</button>
      </div>
      <div class="calc-grid" style="margin-bottom:10px;">
        <div class="form-group">
          <label class="form-label">椭球</label>
          <select v-model="gs.ellipsoid" class="form-input">
            <option value="CGCS2000">CGCS2000（2000国家大地）</option>
            <option value="WGS84">WGS84（GPS）</option>
            <option value="Xian80">西安80</option>
            <option value="BJ54">北京54</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">中央子午线经度 L₀（°）</label><input v-model="gs.L0" type="number" class="form-input font-mono" placeholder="如 114 或 117"></div>
      </div>
      <div v-if="gs.mode==='fwd'" class="calc-grid">
        <div class="form-group"><label class="form-label">大地纬度 B（十进制°）</label><input v-model="gs.B" type="number" class="form-input font-mono" step="0.00000001"></div>
        <div class="form-group"><label class="form-label">大地经度 L（十进制°）</label><input v-model="gs.L" type="number" class="form-input font-mono" step="0.00000001"></div>
      </div>
      <div v-else class="calc-grid">
        <div class="form-group"><label class="form-label">平面 X（北，m）</label><input v-model="gs.x" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label">平面 Y（东，含500000，m）</label><input v-model="gs.y" type="number" class="form-input font-mono"></div>
        <div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:6px;"><input type="checkbox" v-model="gs.y0"> Y含500000加常数</label></div>
      </div>
      <button class="btn btn-primary" style="margin-top:8px;" @click="doGauss">计算</button>
      <div v-if="result" class="result-box">
        <div v-if="result.label==='高斯平面坐标'">
          <div class="result-row"><span>X（北）</span><span class="font-mono result-val">{{ result.x }} m</span></div>
          <div class="result-row"><span>Y（东，含500000）</span><span class="font-mono result-val">{{ result.y }} m</span></div>
        </div>
        <div v-else>
          <div class="result-row"><span>大地纬度 B</span><span class="font-mono result-val">{{ result.B }}°</span></div>
          <div class="result-row"><span>大地经度 L</span><span class="font-mono result-val">{{ result.L }}°</span></div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="form-error" style="margin-top:12px;">{{ error }}</div>

    <!-- 点库选点弹窗 -->
    <div v-if="showPicker" class="modal-overlay" @click.self="showPicker=false">
      <div class="modal" style="max-width:460px;max-height:80vh;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 class="modal-title" style="margin:0;">📍 从点库选点</h3>
          <button class="btn btn-icon" @click="showPicker=false">✖</button>
        </div>
        <input v-model="pickerSearch" class="form-input" placeholder="搜索点号或名称..." style="margin-bottom:10px;">
        <div style="flex:1;overflow-y:auto;">
          <div v-for="p in filteredPoints" :key="p.id||p.code"
            style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer;font-size:13px;"
            @click="applyPick(p)"
            :style="{background: p._hover?'var(--primary-subtle)':'transparent'}"
            @mouseenter="p._hover=true" @mouseleave="p._hover=false">
            <span style="font-weight:600;">{{ p.code }}</span>
            <span class="font-mono" style="color:var(--text-muted);">{{ p.x }}, {{ p.y }}</span>
          </div>
          <div v-if="!filteredPoints.length" style="text-align:center;color:var(--text-muted);padding:20px;">无匹配点</div>
        </div>
      </div>
    </div>
  </div>
  `,
  props: ['project'],
  data() {
    return {
      activeCalc: 'polar2rect',
      result: null, error: '',
      calcTypes: [
        { id: 'polar2rect', label: '正算' },
        { id: 'rect2polar', label: '反算' },
        { id: 'area',       label: '面积' },
        { id: 'offset',     label: '偏距' },
        { id: 'traverse',   label: '导线' },
        { id: 'fwd',        label: '前方交会' },
        { id: 'back',       label: '后方交会' },
        { id: 'dist',       label: '距离交会' },
        { id: 'gauss',      label: '高斯投影' }
      ],
      p2r: { x0: '', y0: '', az: '', dist: '' },
      r2p: { x1: '', y1: '', x2: '', y2: '' },
      areaInput: '',
      off: { x1: '', y1: '', x2: '', y2: '', px: '', py: '' },
      // 导线计算
      tv: {
        startX:'', startY:'', startAz:'', endX:'', endY:'',
        isClosed: false,
        rows: [{ angle:'', dist:'' }]
      },
      tvResult: null,
      // 前方交会
      fwd: { xA:'',yA:'',azA:'',xB:'',yB:'',azB:'' },
      // 后方交会
      bk: { xA:'',yA:'',xB:'',yB:'',xC:'',yC:'',alpha:'',beta:'' },
      // 距离交会
      di: { xA:'',yA:'',dA:'',xB:'',yB:'',dB:'', pick:0 },
      diSols: null,
      // 高斯投影
      gs: { mode:'fwd', B:'',L:'',L0:'',ellipsoid:'CGCS2000', x:'',y:'',y0:true },
      // 点库选点
      pointLib: [],
      showPicker: false, pickerSearch: '',
      picker: { obj:'', xKey:'', yKey:'' }
    };
  },
  computed: {
    filteredPoints() {
      const q = this.pickerSearch.toLowerCase();
      if (!q) return this.pointLib;
      return this.pointLib.filter(p => (p.code||'').toLowerCase().includes(q) || (p.name||'').toLowerCase().includes(q));
    }
  },
  async mounted() {
    try {
      const { data } = await sb.from('points').select('code,name,x,y,h').eq('project_id', this.project.id);
      this.pointLib = (data||[]).filter(p => p.x!=null && p.y!=null);
    } catch(e) { /* silent */ }
  },
  methods: {
    clearResult() { this.result = null; this.error = ''; },
    doPolar2Rect() {
      this.error = '';
      const { x0, y0, az, dist } = this.p2r;
      if ([x0,y0,az,dist].some(v => v === '')) { this.error = '请填写所有字段'; return; }
      const r = Geo.polar2rect(+x0, +y0, +az, +dist);
      this.result = { x: Geo.fmtNum(r.x), y: Geo.fmtNum(r.y) };
    },
    doRect2Polar() {
      this.error = '';
      const { x1, y1, x2, y2 } = this.r2p;
      if ([x1,y1,x2,y2].some(v => v === '')) { this.error = '请填写所有字段'; return; }
      const r = Geo.rect2polar(+x1, +y1, +x2, +y2);
      this.result = {
        azDec: Geo.fmtNum(r.azimuth, 6),
        azDMS: Geo.formatDMS(r.azimuth),
        dist:  Geo.fmtNum(r.distance)
      };
    },
    doArea() {
      this.error = '';
      const lines = this.areaInput.trim().split(/\r?\n/).filter(l => l.trim());
      const pts = lines.map(l => {
        const [x, y] = l.split(/[,\s]+/).map(Number);
        return { x, y };
      }).filter(p => !isNaN(p.x) && !isNaN(p.y));
      if (pts.length < 3) { this.error = '至少需要3个有效顶点'; return; }
      const area = Geo.calcArea(pts);
      const perimeter = Geo.calcPerimeter(pts);
      this.result = {
        area: Geo.fmtNum(area, 4),
        mu: Geo.fmtNum(area / 666.67, 4),
        perimeter: Geo.fmtNum(perimeter, 4),
        n: pts.length
      };
    },
    doOffset() {
      this.error = '';
      const { x1, y1, x2, y2, px, py } = this.off;
      if ([x1,y1,x2,y2,px,py].some(v => v === '')) { this.error = '请填写所有字段'; return; }
      const r = Geo.pointToLine(+px, +py, +x1, +y1, +x2, +y2);
      this.result = {
        tangent: Geo.fmtNum(r.tangent),
        normal:  Geo.fmtNum(Math.abs(r.normal)),
        side:    r.normal > 0 ? '左偏（正）' : r.normal < 0 ? '右偏（负）' : '在线上'
      };
    },
    // 导线计算
    addTvRow() { this.tv.rows.push({ angle:'', dist:'' }); },
    delTvRow(i) { if(this.tv.rows.length>1) this.tv.rows.splice(i,1); },
    doTraverse() {
      this.error=''; this.tvResult=null;
      const { startX,startY,startAz,endX,endY,isClosed,rows } = this.tv;
      if([startX,startY,startAz].some(v=>v==='')){ this.error='请填起始坐标和起始方位角'; return; }
      const angles = rows.map(r=>+r.angle);
      const dists  = rows.map(r=>+r.dist);
      if(rows.some(r=>r.angle===''||r.dist==='')){ this.error='请填写所有转角和边长'; return; }
      const ex = isClosed ? +startX : (endX!==''?+endX:undefined);
      const ey = isClosed ? +startY : (endY!==''?+endY:undefined);
      const res = Geo.traverseCalc(+startX,+startY,+startAz,angles,dists,ex,ey);
      // 角度闭合差
      const sumAng = angles.reduce((a,b)=>a+b,0);
      const n = angles.length;
      const theoreticalSum = isClosed
        ? (n-2)*180
        : (+startAz + sumAng - (ex!==undefined ? Geo.rect2polar(res.points[res.points.length-2].x,res.points[res.points.length-2].y,ex,ey).azimuth : 0));
      this.tvResult = {
        points: res.points.map((p,i)=>({ name:'P'+(i), x:Geo.fmtNum(p.x), y:Geo.fmtNum(p.y) })),
        fx: res.fx!=null?Geo.fmtNum(res.fx,4):'--',
        fy: res.fy!=null?Geo.fmtNum(res.fy,4):'--',
        fD: res.fD!=null?Geo.fmtNum(res.fD,4):'--',
        K:  res.K!=null?Math.round(res.K):'--'
      };
    },
    copyTvResult() {
      if(!this.tvResult) return;
      const txt = this.tvResult.points.map(p=>`${p.name},${p.x},${p.y}`).join('\n');
      navigator.clipboard.writeText(txt).then(()=>window.AppStore.toast('已复制','success'));
    },
    // 前方交会
    doFwd() {
      this.error=''; this.result=null;
      const { xA,yA,azA,xB,yB,azB } = this.fwd;
      if([xA,yA,azA,xB,yB,azB].some(v=>v==='')){ this.error='请填写所有字段'; return; }
      const r = Geo.intersectBearing(+xA,+yA,+azA,+xB,+yB,+azB);
      if(!r){ this.error='两方向平行，无交点'; return; }
      this.result = { x:Geo.fmtNum(r.x), y:Geo.fmtNum(r.y) };
    },
    // 后方交会
    doBack() {
      this.error=''; this.result=null;
      const { xA,yA,xB,yB,xC,yC,alpha,beta } = this.bk;
      if([xA,yA,xB,yB,xC,yC,alpha,beta].some(v=>v==='')){ this.error='请填写所有字段'; return; }
      const r = Geo.resection(+xA,+yA,+xB,+yB,+xC,+yC,+alpha,+beta);
      if(!r){ this.error='计算失败，请检查输入数据'; return; }
      this.result = { x:Geo.fmtNum(r.x), y:Geo.fmtNum(r.y) };
    },
    // 距离交会
    doDist() {
      this.error=''; this.result=null; this.diSols=null;
      const { xA,yA,dA,xB,yB,dB } = this.di;
      if([xA,yA,dA,xB,yB,dB].some(v=>v==='')){ this.error='请填写所有字段'; return; }
      const sols = Geo.intersectDistance(+xA,+yA,+dA,+xB,+yB,+dB);
      if(!sols){ this.error='无解，请检查距离输入'; return; }
      this.diSols = sols.map((s,i)=>({ label:'解'+(i+1), x:Geo.fmtNum(s.x), y:Geo.fmtNum(s.y) }));
    },
    // 高斯投影
    doGauss() {
      this.error=''; this.result=null;
      const { mode,B,L,L0,ellipsoid,x,y,y0 } = this.gs;
      if(!L0){ this.error='请输入中央子午线经度'; return; }
      if(mode==='fwd') {
        if([B,L].some(v=>v==='')){ this.error='请输入B、L'; return; }
        const r = Geo.gaussForward(+B,+L,+L0,ellipsoid);
        this.result = { x:r.x, y:r.y, label:'高斯平面坐标' };
      } else {
        if([x,y].some(v=>v==='')){ this.error='请输入X、Y'; return; }
        const r = Geo.gaussInverse(+x,+y,+L0,ellipsoid,y0);
        this.result = { B:r.B, L:r.L, label:'大地坐标' };
      }
    },
    // 点库选点
    pickPoint(obj, xKey, yKey) {
      if (!this.pointLib.length) { window.AppStore.toast('点库为空，请先添加点', 'error'); return; }
      this.picker = { obj, xKey, yKey };
      this.pickerSearch = '';
      this.showPicker = true;
    },
    applyPick(p) {
      const { obj, xKey, yKey } = this.picker;
      this[obj][xKey] = p.x;
      this[obj][yKey] = p.y;
      this.showPicker = false;
      window.AppStore.toast(`已选取 ${p.code}`, 'success');
    },
    // 导线成果保存到点库
    async saveTvToPoints() {
      if (!this.tvResult || !this.tvResult.points.length) return;
      const pts = this.tvResult.points.map(p => ({
        project_id: this.project.id,
        code: p.name,
        name: '导线点_' + p.name,
        x: parseFloat(p.x),
        y: parseFloat(p.y),
        h: 0,
        group_name: '导线计算'
      }));
      try {
        const { error } = await sb.from('points').insert(pts);
        if (error) throw error;
        window.AppStore.toast(`已保存 ${pts.length} 个导线点到点库`, 'success');
        // 刷新本地点库缓存
        const { data } = await sb.from('points').select('code,name,x,y,h').eq('project_id', this.project.id);
        this.pointLib = (data||[]).filter(p => p.x!=null && p.y!=null);
      } catch(e) {
        window.AppStore.toast('保存失败: ' + e.message, 'error');
      }
    }
  }
};
