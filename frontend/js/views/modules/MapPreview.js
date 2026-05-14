/** 2D 平面图形预览模块（Canvas）*/
window.MapPreviewModule = {
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2 class="module-title">🗺️ 平面预览</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;">
          <input type="checkbox" v-model="show.points"> 点库
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;">
          <input type="checkbox" v-model="show.lines"> 线
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;">
          <input type="checkbox" v-model="show.polys"> 面
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;">
          <input type="checkbox" v-model="show.roads"> 道路
        </label>
        <button class="btn btn-ghost btn-sm" @click="loadAll">🔄 刷新</button>
        <button class="btn btn-ghost btn-sm" @click="resetView">⊙ 重置视图</button>
        <button class="btn btn-ghost btn-sm" @click="exportPng">📷 导出PNG</button>
        <button class="btn btn-ghost btn-sm" @click="exportDxf">📄 导出DXF</button>
      </div>
    </div>

    <div v-if="loading" style="text-align:center;padding:60px;">
      <div class="spinner" style="margin:0 auto 12px;"></div>
      <p style="color:var(--text-secondary);">加载数据...</p>
    </div>

    <div v-else style="position:relative;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;">
      <!-- 画布 -->
      <canvas ref="cvs"
        :width="canvasW" :height="canvasH"
        style="display:block;cursor:crosshair;touch-action:none;"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @wheel.prevent="onWheel"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      ></canvas>

      <!-- 坐标提示 -->
      <div style="position:absolute;bottom:8px;left:10px;font-size:11px;color:var(--text-muted);font-family:monospace;pointer-events:none;">
        {{ hoverCoord }}
      </div>

      <!-- 图例 -->
      <div style="position:absolute;top:8px;right:10px;font-size:11px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:6px 10px;line-height:1.8;">
        <div v-if="show.points"><span style="color:#60a5fa;">●</span> 点库 ({{ data.points.length }})</div>
        <div v-if="show.lines"><span style="color:#34d399;">—</span> 线 ({{ data.lines.length }})</div>
        <div v-if="show.polys"><span style="color:#a78bfa;">▪</span> 面 ({{ data.polys.length }})</div>
        <div v-if="show.roads"><span style="color:#f97316;">≡</span> 道路 ({{ data.roads.length }})</div>
      </div>

      <!-- 无数据提示 -->
      <div v-if="isEmpty" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--text-muted);">
        <div style="font-size:40px;margin-bottom:8px;">📍</div>
        <div>暂无可显示的数据</div>
        <div style="font-size:12px;margin-top:4px;">请先在点库/线设计/面设计/道路中添加数据</div>
      </div>
    </div>

    <!-- 点击信息框 -->
    <div v-if="selected" style="margin-top:12px;padding:12px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px;">{{ selected.label }}</div>
      <div style="font-size:12px;color:var(--text-muted);">{{ selected.info }}</div>
    </div>
  </div>
  `,
  props: ['project'],
  data() {
    return {
      loading: false,
      canvasW: 800, canvasH: 560,
      data: { points: [], lines: [], polys: [], roads: [] },
      show: { points: true, lines: true, polys: true, roads: true },
      // 视图变换
      tx: 0, ty: 0, scale: 1,
      dragging: false, lastMx: 0, lastMy: 0,
      hoverCoord: '',
      selected: null,
      // 触摸
      lastTouchDist: 0
    };
  },
  computed: {
    isEmpty() {
      const d = this.data;
      return !d.points.length && !d.lines.length && !d.polys.length && !d.roads.length;
    }
  },
  async mounted() {
    this.updateCanvasSize();
    window.addEventListener('resize', this.updateCanvasSize);
    await this.loadAll();
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateCanvasSize);
  },
  watch: {
    show: { deep: true, handler() { this.draw(); } }
  },
  methods: {
    updateCanvasSize() {
      const el = this.$el;
      if (el) {
        this.canvasW = el.clientWidth || 800;
        this.canvasH = Math.max(400, window.innerHeight - 220);
        this.$nextTick(() => this.draw());
      }
    },
    async loadAll() {
      this.loading = true;
      try {
        const pid = this.project.id;
        const [pts, lns, pls, rds] = await Promise.all([
          sb.from('points').select('code,name,x,y,h,group_name').eq('project_id', pid),
          sb.from('lines').select('name,points,color').eq('project_id', pid),
          sb.from('polys').select('name,points,color,scatter_type,area').eq('project_id', pid),
          sb.from('roads').select('id,name').eq('project_id', pid)
        ]);
        this.data.points = (pts.data || []).filter(p => p.x != null && p.y != null);
        this.data.lines  = (lns.data || []).filter(l => Array.isArray(l.points) && l.points.length);
        this.data.polys  = (pls.data || []).filter(p => Array.isArray(p.points) && p.points.length);
        this.data.roads  = rds.data || [];
        this.resetView();
      } finally {
        this.loading = false;
      }
    },
    // 收集所有坐标点，用于自适应范围
    allPoints() {
      const pts = [];
      if (this.show.points) this.data.points.forEach(p => pts.push({ x: +p.x, y: +p.y }));
      if (this.show.lines)  this.data.lines.forEach(l => l.points.forEach(p => pts.push({ x: +p.x, y: +p.y })));
      if (this.show.polys)  this.data.polys.forEach(pl => pl.points.forEach(p => pts.push({ x: +p.x, y: +p.y })));
      return pts;
    },
    resetView() {
      const pts = this.allPoints();
      if (!pts.length) { this.tx = 0; this.ty = 0; this.scale = 1; this.draw(); return; }
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const W = this.canvasW, H = this.canvasH;
      const pad = 40;
      const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
      // 测量 Y(东) -> canvas 横轴(W), 测量 X(北) -> canvas 纵轴(H, 翻转)
      this.scale = Math.min((W - pad*2) / rangeY, (H - pad*2) / rangeX);
      this.tx = pad - minY * this.scale;
      this.ty = pad + maxX * this.scale;
      this.$nextTick(() => this.draw());
    },
    // 坐标转换：测量(x北,y东) -> canvas像素
    // canvas_x = y*scale + tx,  canvas_y = ty - x*scale
    tc(x, y) {
      return [
        y * this.scale + this.tx,
        this.ty - x * this.scale
      ];
    },
    draw() {
      const canvas = this.$refs.cvs;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = this.canvasW, H = this.canvasH;
      // 背景
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-base') || '#0f172a';
      ctx.fillRect(0, 0, W, H);
      // 网格
      this._drawGrid(ctx, W, H);

      // 面
      if (this.show.polys) {
        this.data.polys.forEach(poly => {
          if (!Array.isArray(poly.points) || !poly.points.length) return;
          const isScatter = poly.scatter_type === 'scatter' || (poly.points.length > 10 && !poly.area);
          if (isScatter) {
            ctx.fillStyle = 'rgba(167,139,250,0.6)';
            poly.points.forEach(p => {
              const [cx, cy] = this.tc(+p.x, +p.y);
              ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2); ctx.fill();
            });
          } else {
            const color = poly.color || '#a78bfa';
            ctx.beginPath();
            poly.points.forEach((p, i) => {
              const [cx, cy] = this.tc(+p.x, +p.y);
              i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
            });
            ctx.closePath();
            ctx.fillStyle = color + '26'; // 15% opacity via hex alpha
            ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
            // 名称
            const cx0 = poly.points.reduce((s,p)=>s+(+p.y),0)/poly.points.length;
            const cy0 = poly.points.reduce((s,p)=>s+(+p.x),0)/poly.points.length;
            const [lx, ly] = this.tc(cy0, cx0);
            ctx.fillStyle = color; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(poly.name, lx, ly);
          }
        });
      }

      // 线
      if (this.show.lines) {
        this.data.lines.forEach(line => {
          if (!Array.isArray(line.points) || line.points.length < 2) return;
          const color = line.color || '#34d399';
          ctx.beginPath();
          line.points.forEach((p, i) => {
            const [cx, cy] = this.tc(+p.x, +p.y);
            i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
          });
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
          // 端点
          const p0 = line.points[0];
          const [cx0, cy0] = this.tc(+p0.x, +p0.y);
          ctx.fillStyle = color; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
          ctx.fillText(line.name, cx0 + 4, cy0 - 4);
        });
      }

      // 点
      if (this.show.points) {
        this.data.points.forEach(p => {
          const [cx, cy] = this.tc(+p.x, +p.y);
          ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
          ctx.fillStyle = '#60a5fa'; ctx.fill();
          if (this.scale > 0.01) {
            ctx.fillStyle = '#93c5fd'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
            ctx.fillText(p.code || '', cx + 5, cy - 3);
          }
        });
      }
    },
    _drawGrid(ctx, W, H) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      const step = 60;
      for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    },
    // 鼠标/触摸事件
    onMouseDown(e) { this.dragging = true; this.lastMx = e.clientX; this.lastMy = e.clientY; },
    onMouseUp()    { this.dragging = false; },
    onMouseMove(e) {
      const rect = this.$refs.cvs.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      // 反算测量坐标
      const measY = (cx - this.tx) / this.scale;
      const measX = (this.ty - cy) / this.scale;
      this.hoverCoord = `X=${measX.toFixed(3)}  Y=${measY.toFixed(3)}`;
      if (this.dragging) {
        this.tx += e.clientX - this.lastMx;
        this.ty += e.clientY - this.lastMy;
        this.lastMx = e.clientX; this.lastMy = e.clientY;
        this.draw();
      }
    },
    onWheel(e) {
      const rect = this.$refs.cvs.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1/1.15;
      // 以鼠标位置为锚点缩放
      this.tx = mx - (mx - this.tx) * factor;
      this.ty = my - (my - this.ty) * factor;
      this.scale *= factor;
      this.draw();
    },
    onTouchStart(e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.lastTouchDist = Math.sqrt(dx*dx+dy*dy);
      } else {
        this.dragging = true;
        this.lastMx = e.touches[0].clientX;
        this.lastMy = e.touches[0].clientY;
      }
    },
    onTouchMove(e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        const factor = dist / (this.lastTouchDist || dist);
        this.scale *= factor; this.lastTouchDist = dist;
        this.draw();
      } else if (this.dragging) {
        this.tx += e.touches[0].clientX - this.lastMx;
        this.ty += e.touches[0].clientY - this.lastMy;
        this.lastMx = e.touches[0].clientX;
        this.lastMy = e.touches[0].clientY;
        this.draw();
      }
    },
    onTouchEnd() { this.dragging = false; },
    exportPng() {
      const canvas = this.$refs.cvs;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = '平面预览_' + this.project.name + '.png';
      a.click();
    },
    exportDxf() {
      if (this.isEmpty) return window.AppStore.toast('没有可导出的数据', 'error');
      const dxf = window.DxfExporter.build(this.data, this.project.name);
      window.DxfExporter.download(dxf, '导出_' + this.project.name + '.dxf');
      window.AppStore.toast('DXF 已导出，可用 AutoCAD 打开', 'success');
    }
  }
};
