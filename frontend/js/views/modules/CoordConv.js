/** 坐标换算模块：平移旋转（四参数）、简单平移 */
window.CoordConvModule = {
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2 class="module-title">🔄 坐标换算</h2>
      <div v-if="store.state.coordOffset" style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:12px;padding:4px 10px;background:var(--primary-subtle,rgba(99,102,241,.12));color:var(--primary);border-radius:20px;">
          ✅ 已应用到放样：{{ store.state.coordOffset.type==='simple'?'平移':'\u56db参数' }}
        </span>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger);" @click="resetOffset">🔄 还原坐标系</button>
      </div>
    </div>

    <div class="calc-tabs">
      <button v-for="t in types" :key="t.id"
        class="calc-tab" :class="{active: active===t.id}"
        @click="active=t.id; result=null; error=''; sevenResult=[]">{{ t.label }}</button>
    </div>

    <!-- 简单换算（平移）：至少2点 -->
    <div v-if="active==='simple'" class="calc-card">
      <h3 class="calc-card-title">简单换算（平移）</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">输入已知点的旧坐标和新坐标（至少2点），计算平移量后换算其他点。</p>

      <!-- 已知点对 -->
      <div v-for="(p,i) in simplePairs" :key="i" class="coord-pair">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;">控制点 {{ i+1 }}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label class="form-label">旧 X</label><input v-model="p.x1" type="number" class="form-input font-mono" step="0.0001"></div>
          <div><label class="form-label">旧 Y</label><input v-model="p.y1" type="number" class="form-input font-mono" step="0.0001"></div>
          <div><label class="form-label">新 X</label><input v-model="p.x2" type="number" class="form-input font-mono" step="0.0001"></div>
          <div><label class="form-label">新 Y</label><input v-model="p.y2" type="number" class="form-input font-mono" step="0.0001"></div>
        </div>
        <button v-if="simplePairs.length>2" class="btn btn-ghost btn-sm" style="margin-top:4px;color:var(--danger);" @click="simplePairs.splice(i,1)">移除</button>
      </div>
      <button class="btn btn-ghost btn-sm" @click="simplePairs.push({x1:'',y1:'',x2:'',y2:''})">＋ 添加控制点</button>

      <div class="form-group" style="margin-top:16px;">
        <label class="form-label">待换算坐标（每行：编号, X, Y）</label>
        <textarea v-model="simpleInput" class="form-input font-mono" rows="5" placeholder="P001, 1000.0000, 2000.0000"></textarea>
      </div>
      <button class="btn btn-primary" style="margin-top:8px;" @click="doSimple">换算</button>

      <div v-if="result" class="result-box">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">平移量：ΔX={{ result.dx }}, ΔY={{ result.dy }}</div>
        <div v-for="r in result.rows" :key="r.code" class="result-row">
          <span class="font-mono">{{ r.code }}</span>
          <span class="font-mono result-val">{{ r.x }}, {{ r.y }}</span>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px;" @click="applySimple">📌 应用到放样坐标系</button>
      </div>
    </div>

    <!-- 四参数换算：至少3点 -->
    <div v-if="active==='four'" class="calc-card">
      <h3 class="calc-card-title">四参数换算（旋转+缩放+平移）</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">输入已知点的旧、新坐标（至少3点），计算四参数后换算其他点。</p>

      <div v-for="(p,i) in fourPairs" :key="i" class="coord-pair">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;">控制点 {{ i+1 }}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label class="form-label">旧 X</label><input v-model="p.x1" type="number" class="form-input font-mono" step="0.0001"></div>
          <div><label class="form-label">旧 Y</label><input v-model="p.y1" type="number" class="form-input font-mono" step="0.0001"></div>
          <div><label class="form-label">新 X</label><input v-model="p.x2" type="number" class="form-input font-mono" step="0.0001"></div>
          <div><label class="form-label">新 Y</label><input v-model="p.y2" type="number" class="form-input font-mono" step="0.0001"></div>
        </div>
        <button v-if="fourPairs.length>3" class="btn btn-ghost btn-sm" style="margin-top:4px;color:var(--danger);" @click="fourPairs.splice(i,1)">移除</button>
      </div>
      <button class="btn btn-ghost btn-sm" @click="fourPairs.push({x1:'',y1:'',x2:'',y2:''})">＋ 添加控制点</button>

      <div class="form-group" style="margin-top:16px;">
        <label class="form-label">待换算坐标（每行：编号, X, Y）</label>
        <textarea v-model="fourInput" class="form-input font-mono" rows="5" placeholder="P001, 1000.0000, 2000.0000"></textarea>
      </div>
      <button class="btn btn-primary" style="margin-top:8px;" @click="doFour">换算</button>

      <div v-if="result" class="result-box">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
          缩放比: {{ result.scale }} | 旋转角: {{ result.rotation }}°
        </div>
        <div v-for="r in result.rows" :key="r.code" class="result-row">
          <span class="font-mono">{{ r.code }}</span>
          <span class="font-mono result-val">{{ r.x }}, {{ r.y }}</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-primary btn-sm" @click="applyFour">📌 应用到放样坐标系</button>
          <button class="btn btn-ghost btn-sm" @click="copyResult">📋 复制结果</button>
        </div>
      </div>
    </div>

    <div v-if="error" class="form-error" style="margin-top:12px;">{{ error }}</div>

    <!-- 七参数换算 -->
    <div v-if="active==='seven'" class="calc-card">
      <h3 class="calc-card-title">七参数换算（Bursa-Wolf 模型）</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">三维平移(ΔX,ΔY,ΔZ) + 三维旋转(ωX,ωY,ωZ) + 尺度比(m)，用于WGS84↔地方坐标系转换。</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
        <div class="form-group"><label class="form-label">ΔX (m)</label><input v-model="sp.dx" type="number" class="form-input font-mono" step="0.001"></div>
        <div class="form-group"><label class="form-label">ΔY (m)</label><input v-model="sp.dy" type="number" class="form-input font-mono" step="0.001"></div>
        <div class="form-group"><label class="form-label">ΔZ (m)</label><input v-model="sp.dz" type="number" class="form-input font-mono" step="0.001"></div>
        <div class="form-group"><label class="form-label">ωX ("秒，角秒)</label><input v-model="sp.rx" type="number" class="form-input font-mono" step="0.00001"></div>
        <div class="form-group"><label class="form-label">ωY ("秒)</label><input v-model="sp.ry" type="number" class="form-input font-mono" step="0.00001"></div>
        <div class="form-group"><label class="form-label">ωZ ("秒)</label><input v-model="sp.rz" type="number" class="form-input font-mono" step="0.00001"></div>
        <div class="form-group"><label class="form-label">m (ppm，尺度改正)</label><input v-model="sp.m" type="number" class="form-input font-mono" step="0.001"></div>
      </div>
      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">输入格式</label>
        <select v-model="sp.inputType" class="form-input">
          <option value="xyz">空间直角坐标 (X,Y,Z) 单位：m</option>
          <option value="blh">大地坐标 (B°, L°, H m)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">待换算点（每行：编号, X, Y, Z 或 B, L, H）</label>
        <textarea v-model="sp.input" class="form-input font-mono" rows="5" placeholder="P001, 3000000, 500000, 5000000"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">输出格式</label>
        <select v-model="sp.outputType" class="form-input">
          <option value="xyz">空间直角坐标 (X,Y,Z)</option>
          <option value="blh">大地坐标 (B°, L°, H)</option>
        </select>
      </div>
      <button class="btn btn-primary" @click="doSeven">换算</button>
      <div v-if="sevenResult.length" class="result-box" style="margin-top:12px;">
        <div v-for="r in sevenResult" :key="r.code" class="result-row">
          <span class="font-mono">{{ r.code }}</span>
          <span class="font-mono result-val">{{ r.vals }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;" @click="copySevenResult">📋 复制</button>
      </div>
    </div>

  </div>
  `,
  props: ['project'],
  data() {
    return {
      store: window.AppStore,
      active: 'simple',
      types: [
        { id: 'simple', label: '简单换算（平移）' },
        { id: 'four',   label: '四参数换算' },
        { id: 'seven',  label: '七参数换算' }
      ],
      simplePairs: [{ x1:'', y1:'', x2:'', y2:'' }, { x1:'', y1:'', x2:'', y2:'' }],
      fourPairs:   [{ x1:'', y1:'', x2:'', y2:'' }, { x1:'', y1:'', x2:'', y2:'' }, { x1:'', y1:'', x2:'', y2:'' }],
      simpleInput: '', fourInput: '',
      result: null, error: '',
      // 七参数
      sp: { dx:'', dy:'', dz:'', rx:'', ry:'', rz:'', m:'0', inputType:'xyz', outputType:'blh', input:'' },
      sevenResult: []
    };
  },
  methods: {
    parseInputPoints(text) {
      return text.trim().split(/\r?\n/).filter(l => l.trim()).map(l => {
        const cols = l.split(/[,\s]+/).map(s => s.trim());
        return { code: cols[0], x: parseFloat(cols[1]), y: parseFloat(cols[2]) };
      }).filter(p => !isNaN(p.x) && !isNaN(p.y));
    },
    doSimple() {
      this.error = ''; this.result = null;
      const pairs = this.simplePairs.map(p => ({ x1:+p.x1, y1:+p.y1, x2:+p.x2, y2:+p.y2 }));
      if (pairs.some(p => [p.x1,p.y1,p.x2,p.y2].some(isNaN))) { this.error = '控制点坐标有误'; return; }
      // 平均平移量
      const dx = pairs.reduce((s,p) => s + (p.x2 - p.x1), 0) / pairs.length;
      const dy = pairs.reduce((s,p) => s + (p.y2 - p.y1), 0) / pairs.length;
      const pts = this.parseInputPoints(this.simpleInput);
      if (!pts.length) { this.error = '请输入待换算坐标'; return; }
      this.result = {
        dx: Geo.fmtNum(dx), dy: Geo.fmtNum(dy),
        rows: pts.map(p => ({ code: p.code, x: Geo.fmtNum(p.x + dx), y: Geo.fmtNum(p.y + dy) }))
      };
    },
    doFour() {
      this.error = ''; this.result = null;
      const pairs = this.fourPairs.map(p => ({ x1:+p.x1, y1:+p.y1, x2:+p.x2, y2:+p.y2 }));
      if (pairs.some(p => [p.x1,p.y1,p.x2,p.y2].some(isNaN))) { this.error = '控制点坐标有误'; return; }
      const params = Geo.calcFourParams(pairs);
      if (!params) { this.error = '四参数计算失败，请检查控制点'; return; }
      const pts = this.parseInputPoints(this.fourInput);
      if (!pts.length) { this.error = '请输入待换算坐标'; return; }
      this.result = {
        scale: params.scale.toFixed(8),
        rotation: Geo.fmtNum(params.rotation, 6),
        rows: pts.map(p => {
          const r = Geo.applyFourParams(p.x, p.y, params);
          return { code: p.code, x: Geo.fmtNum(r.x), y: Geo.fmtNum(r.y) };
        }),
        _raw: pts.map(p => { const r = Geo.applyFourParams(p.x, p.y, params); return `${p.code},${Geo.fmtNum(r.x)},${Geo.fmtNum(r.y)}`; }).join('\n')
      };
    },
    copyResult() {
      if (!this.result?._raw) return;
      navigator.clipboard.writeText(this.result._raw).then(() => window.AppStore.toast('已复制', 'success'));
    },
    applySimple() {
      if (!this.result) return;
      const pairs = this.simplePairs.map(p => ({x1:+p.x1,y1:+p.y1,x2:+p.x2,y2:+p.y2}));
      const dx = pairs.reduce((s,p)=>s+(p.x2-p.x1),0)/pairs.length;
      const dy = pairs.reduce((s,p)=>s+(p.y2-p.y1),0)/pairs.length;
      window.AppStore.state.coordOffset = { type:'simple', dx, dy };
      window.AppStore.toast('平移参数已应用到放样坐标系', 'success');
    },
    applyFour() {
      if (!this.result) return;
      const pairs = this.fourPairs.map(p => ({x1:+p.x1,y1:+p.y1,x2:+p.x2,y2:+p.y2}));
      const params = Geo.calcFourParams(pairs);
      if (!params) return window.AppStore.toast('四参数计算失败','error');
      window.AppStore.state.coordOffset = { type:'four', params };
      window.AppStore.toast('四参数已应用到放样坐标系', 'success');
    },
    resetOffset() {
      window.AppStore.state.coordOffset = null;
      window.AppStore.toast('已还原到原始坐标系', 'info');
    },
    // 七参数换算
    doSeven() {
      this.error = ''; this.sevenResult = [];
      const { dx,dy,dz,rx,ry,rz,m,inputType,outputType,input } = this.sp;
      // 参数解析
      const p = [dx,dy,dz,rx,ry,rz,m].map(Number);
      if (p.some(isNaN)) { this.error = '请填写所有七参数'; return; }
      const [DX,DY,DZ] = p;
      const s = p[6] * 1e-6; // ppm -> 比例因子
      // 角度秒 -> 弧度
      const arcsec2rad = v => v / 3600 * Math.PI / 180;
      const RX = arcsec2rad(p[3]), RY = arcsec2rad(p[4]), RZ = arcsec2rad(p[5]);
      // Bursa-Wolf 旋转矩阵（小角近似）
      const transform = (x,y,z) => ({
        X: (1+s)*(x + RZ*y - RY*z) + DX,
        Y: (1+s)*(-RZ*x + y + RX*z) + DY,
        Z: (1+s)*(RY*x - RX*y + z) + DZ
      });
      // 大地坐标 -> 空间直角（GRS80橙球）
      const BLH2XYZ = (B_deg, L_deg, H) => {
        const a=6378137, e2=0.00669437999014;
        const B=B_deg*Math.PI/180, L=L_deg*Math.PI/180;
        const N = a/Math.sqrt(1-e2*Math.sin(B)**2);
        return { x:(N+H)*Math.cos(B)*Math.cos(L), y:(N+H)*Math.cos(B)*Math.sin(L), z:(N*(1-e2)+H)*Math.sin(B) };
      };
      // 空间直角 -> 大地坐标
      const XYZ2BLH = (X,Y,Z) => {
        const a=6378137, e2=0.00669437999014;
        const L = Math.atan2(Y,X)*180/Math.PI;
        let B = Math.atan2(Z, Math.sqrt(X*X+Y*Y));
        for (let i=0;i<20;i++) {
          const N = a/Math.sqrt(1-e2*Math.sin(B)**2);
          B = Math.atan2(Z+e2*N*Math.sin(B), Math.sqrt(X*X+Y*Y));
        }
        const N = a/Math.sqrt(1-e2*Math.sin(B)**2);
        const H = Math.sqrt(X*X+Y*Y)/Math.cos(B)-N;
        return { B:B*180/Math.PI, L, H };
      };
      const lines = input.trim().split(/\r?\n/).filter(l=>l.trim());
      const results = [];
      for (const line of lines) {
        const cols = line.split(/[,\s]+/).map(s=>s.trim());
        const code = cols[0];
        const [v1,v2,v3] = [parseFloat(cols[1]),parseFloat(cols[2]),parseFloat(cols[3])];
        if ([v1,v2,v3].some(isNaN)) continue;
        let ix, iy, iz;
        if (inputType === 'blh') {
          const r = BLH2XYZ(v1,v2,v3); ix=r.x; iy=r.y; iz=r.z;
        } else { ix=v1; iy=v2; iz=v3; }
        const t = transform(ix,iy,iz);
        let vals;
        if (outputType === 'blh') {
          const r = XYZ2BLH(t.X,t.Y,t.Z);
          vals = `B=${r.B.toFixed(8)}°  L=${r.L.toFixed(8)}°  H=${r.H.toFixed(4)}m`;
        } else {
          vals = `X=${t.X.toFixed(4)}  Y=${t.Y.toFixed(4)}  Z=${t.Z.toFixed(4)}`;
        }
        results.push({ code, vals });
      }
      if (!results.length) { this.error = '解析失败，请检查输入格式'; return; }
      this.sevenResult = results;
    },
    copySevenResult() {
      const txt = this.sevenResult.map(r=>`${r.code}  ${r.vals}`).join('\n');
      navigator.clipboard.writeText(txt).then(()=>window.AppStore.toast('已复制','success'));
    }
  }
};
