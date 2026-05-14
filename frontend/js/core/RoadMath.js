/**
 * 道路推算数学引擎 (RoadMath)
 * 采用高斯-勒让德 (Gauss-Legendre) 7点积分法进行平曲线推算。
 * 能够高精度解析直线、圆曲线、缓和曲线的任意组合。
 */
window.RoadMath = (function () {
  const PI = Math.PI;
  function deg2rad(d) { return d * PI / 180; }
  function rad2deg(r) { return r * 180 / PI; }

  // 高斯-勒让德7点积分参数
  const GL_X = [0, 0.405845151377397, -0.405845151377397, 0.741531185599394, -0.741531185599394, 0.949107912342758, -0.949107912342758];
  const GL_W = [0.417959183673469, 0.381830050505119, 0.381830050505119, 0.279705391489277, 0.279705391489277, 0.129484966168870, 0.129484966168870];

  /**
   * 数值积分函数
   * @param {Function} f 被积函数
   * @param {number} start 积分下限
   * @param {number} end 积分上限
   * @returns {number} 积分结果
   */
  function integrate(f, start, end) {
    const len = Math.abs(end - start);
    if (len < 1e-6) return 0;
    // 道路曲线一般比较平缓，每30米一个积分区间足够保证极高精度（亚毫米级）
    const chunks = Math.ceil(len / 30);
    const step = (end - start) / chunks;
    let sum = 0;
    for (let i = 0; i < chunks; i++) {
      const a = start + i * step;
      const b = a + step;
      const mid = (a + b) / 2;
      const half = (b - a) / 2;
      for (let j = 0; j < 7; j++) {
        sum += GL_W[j] * f(mid + half * GL_X[j]) * half;
      }
    }
    return sum;
  }

  /**
   * 线元法预编译：将输入的线元表转换为带有绝对坐标和绝对起止桩号的推算模型
   * @param {number} startK 起点桩号
   * @param {number} startX 起点X
   * @param {number} startY 起点Y
   * @param {number} startAz 起点方位角(度)
   * @param {Array} elements 线元数组 [{type, length, r1, r2, turn}]
   * @returns {Array} 编译后的路线模型数组
   */
  function buildAlignmentFromElements(startK, startX, startY, startAz, elements) {
    let curK = parseFloat(startK) || 0;
    let curX = parseFloat(startX) || 0;
    let curY = parseFloat(startY) || 0;
    let curAz = deg2rad(parseFloat(startAz) || 0);
    
    const align = [];
    for (const el of elements) {
      const L = parseFloat(el.length) || 0;
      if (L <= 0) continue;
      
      const r1 = parseFloat(el.r1);
      const r2 = parseFloat(el.r2);
      const k1 = isNaN(r1) || r1 === 0 ? 0 : 1 / r1;
      const k2 = isNaN(r2) || r2 === 0 ? 0 : 1 / r2;
      const turn = parseFloat(el.turn) || 0; // 0=直, 1=右偏, -1=左偏

      // 局部距离 t (0 -> L) 时的切线方位角 (弧度)
      // dAz = ∫ k(t) dt * turn
      const getAz = (t) => {
        const dAz = (k1 * t + ((k2 - k1) / (2 * L)) * t * t) * turn;
        return curAz + dAz;
      };

      // 推算线元终点坐标
      const dx = integrate(t => Math.cos(getAz(t)), 0, L);
      const dy = integrate(t => Math.sin(getAz(t)), 0, L);
      
      const endK = curK + L;
      const endX = curX + dx;
      const endY = curY + dy;
      const endAz = getAz(L);

      align.push({
        type: el.type,
        startK: curK, endK: endK, length: L,
        startX: curX, startY: curY, startAz: curAz,
        k1, k2, turn, getAz
      });

      curK = endK;
      curX = endX;
      curY = endY;
      curAz = endAz;
    }
    return align;
  }

  /**
   * 交点法转换线元法：将JD交点数组自动打散为直线与曲线线元序列，再调用 buildAlignmentFromElements
   * @param {number} startK 起点桩号
   * @param {Array} jds 交点数组 [{x, y, r, ls1, ls2}]
   * @returns {Array} 编译后的路线模型数组
   */
  function buildAlignmentFromJD(startK, jds) {
    if (!jds || jds.length < 2) return [];
    
    // 提取有效坐标交点
    const pts = jds.map(p => ({
      x: parseFloat(p.x), y: parseFloat(p.y),
      r: parseFloat(p.r) || 0,
      ls1: parseFloat(p.ls1) || 0,
      ls2: parseFloat(p.ls2) || 0
    })).filter(p => !isNaN(p.x) && !isNaN(p.y));

    if (pts.length < 2) return [];

    const elements = [];
    let curK = parseFloat(startK) || 0;
    
    // 我们必须依次计算各交点的曲线参数：T1, T2, L
    const jdData = [];
    for (let i = 0; i < pts.length; i++) {
      jdData.push({ ...pts[i], T1: 0, T2: 0, L: 0, dx: 0, dy: 0, dist: 0, az: 0 });
    }

    // 1. 计算边长和方位角
    for (let i = 0; i < jdData.length - 1; i++) {
      const p1 = jdData[i], p2 = jdData[i+1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      p1.dist = Math.sqrt(dx * dx + dy * dy);
      p1.az = rad2deg(Math.atan2(dy, dx));
      if (p1.az < 0) p1.az += 360;
    }

    // 2. 计算各JD的切线长 (T1, T2) 和曲线长 (L)
    for (let i = 1; i < jdData.length - 1; i++) {
      const p = jdData[i];
      if (p.r === 0) continue; // 直线交点

      const az1 = jdData[i-1].az;
      const az2 = jdData[i].az;
      let alpha = az2 - az1;
      if (alpha > 180) alpha -= 360;
      if (alpha < -180) alpha += 360;
      
      const turn = alpha > 0 ? -1 : 1; // 在计算中, 左偏 alpha > 0, 我们的turn定义: 1=右偏, -1=左偏
      const alphaRad = Math.abs(deg2rad(alpha));

      const R = p.r;
      const ls1 = p.ls1;
      const ls2 = p.ls2;

      // 缓和曲线参数 m, p
      const m1 = ls1 > 0 ? ls1 / 2 - Math.pow(ls1, 3) / (240 * R * R) : 0;
      const p1 = ls1 > 0 ? ls1 * ls1 / (24 * R) - Math.pow(ls1, 4) / (2688 * Math.pow(R, 3)) : 0;
      const m2 = ls2 > 0 ? ls2 / 2 - Math.pow(ls2, 3) / (240 * R * R) : 0;
      const p2 = ls2 > 0 ? ls2 * ls2 / (24 * R) - Math.pow(ls2, 4) / (2688 * Math.pow(R, 3)) : 0;

      const tanAlpha2 = Math.tan(alphaRad / 2);
      const sinAlpha = Math.sin(alphaRad);

      const T1 = (R + p2) * tanAlpha2 + m1 - (p1 - p2) / sinAlpha;
      const T2 = (R + p1) * tanAlpha2 + m2 + (p1 - p2) / sinAlpha;
      
      const Ly = R * alphaRad - (ls1 + ls2) / 2;
      const L = ls1 + Ly + ls2;

      p.T1 = T1; p.T2 = T2; p.L = L; p.turn = turn; p.Ly = Ly;
      p.ls1 = ls1; p.ls2 = ls2; p.R = R;
    }

    // 3. 构建 elements 数组
    const startX = jdData[0].x;
    const startY = jdData[0].y;
    const startAz = jdData[0].az;
    
    let lastCurveEndDist = 0; // 上一个曲线终点在当段直线上的位置
    
    for (let i = 0; i < jdData.length - 1; i++) {
      const jd = jdData[i];
      const nextJd = jdData[i+1];
      
      // 当前直线段长度 = 总平距 - (起点如果处于曲线内? JD0通常没有曲线) - (下个交点的前切线长)
      let lineDist = jd.dist;
      if (i > 0) lineDist -= jd.T2; // 减去当前交点的后切线
      lineDist -= nextJd.T1;        // 减去下一交点的前切线
      
      if (lineDist > 0) {
        elements.push({ type: 'line', length: lineDist, r1: '', r2: '', turn: 0 });
      }

      // 接下来推入 nextJd 的曲线线元
      if (nextJd.r > 0 && i + 1 < jdData.length - 1) {
        if (nextJd.ls1 > 0) {
          elements.push({ type: 'spiral', length: nextJd.ls1, r1: '', r2: nextJd.R, turn: nextJd.turn });
        }
        if (nextJd.Ly > 0) {
          elements.push({ type: 'arc', length: nextJd.Ly, r1: nextJd.R, r2: nextJd.R, turn: nextJd.turn });
        }
        if (nextJd.ls2 > 0) {
          elements.push({ type: 'spiral', length: nextJd.ls2, r1: nextJd.R, r2: '', turn: nextJd.turn });
        }
      }
    }

    return buildAlignmentFromElements(startK, startX, startY, startAz, elements);
  }

  /**
   * 给定桩号，获取路线坐标与方位角
   * @param {Array} align 编译好的路线模型
   * @param {number} targetK 目标桩号
   * @returns {Object|null} {chainage, x, y, azimuth}
   */
  function getPointByChainage(align, targetK) {
    if (!align || !align.length) return null;
    
    let el = align[0];
    for (const item of align) {
      if (targetK >= item.startK && targetK <= item.endK) {
        el = item; break;
      }
      if (targetK < item.startK && item === align[0]) {
        el = item; break; // 外推
      }
      if (targetK > item.endK) {
        el = item; // 外推
      }
    }

    const t = targetK - el.startK;
    const dx = integrate(u => Math.cos(el.getAz(u)), 0, t);
    const dy = integrate(u => Math.sin(el.getAz(u)), 0, t);
    
    let az = rad2deg(el.getAz(t)) % 360;
    if (az < 0) az += 360;

    return {
      chainage: targetK,
      x: el.startX + dx,
      y: el.startY + dy,
      azimuth: az
    };
  }

  /**
   * 编译纵断面模型
   * @param {Array} vpis 变坡点数组 [{chainage, h, r}]
   * @returns {Array} 编译后的纵断面模型
   */
  function buildVerticalAlignment(vpis) {
    if (!vpis || vpis.length < 2) return [];
    
    // 确保按桩号排序，并提取数值
    const pts = vpis.map(p => ({
      K: parseFloat(p.chainage) || 0,
      H: parseFloat(p.h) || 0,
      R: parseFloat(p.r) || 0
    })).sort((a, b) => a.K - b.K);

    // 计算各段坡度
    for (let i = 0; i < pts.length; i++) {
      pts[i].i1 = 0; // 前坡度
      pts[i].i2 = 0; // 后坡度
      if (i > 0) {
        const dK = pts[i].K - pts[i-1].K;
        if (dK !== 0) pts[i].i1 = (pts[i].H - pts[i-1].H) / dK;
      }
      if (i < pts.length - 1) {
        const dK = pts[i+1].K - pts[i].K;
        if (dK !== 0) pts[i].i2 = (pts[i+1].H - pts[i].H) / dK;
      }
    }

    // 计算竖曲线要素
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.omega = p.i2 - p.i1; // 坡度差
      
      if (p.R > 0 && i > 0 && i < pts.length - 1 && Math.abs(p.omega) > 1e-6) {
        p.L = p.R * Math.abs(p.omega); // 竖曲线长度
        p.T = p.L / 2;                 // 切线长
        p.E = (p.T * p.T) / (2 * p.R); // 外距
        p.startK = p.K - p.T;          // 竖曲线起点 (ZY)
        p.endK = p.K + p.T;            // 竖曲线终点 (YZ)
        p.startH = p.H - p.i1 * p.T;   // 起点高程
      } else {
        p.L = 0; p.T = 0; p.E = 0;
        p.startK = p.K; p.endK = p.K;
        p.startH = p.H;
      }
    }
    return pts;
  }

  /**
   * 推算任意桩号的高程
   * @param {Array} vProfile 编译好的纵断面模型
   * @param {number} targetK 目标桩号
   * @returns {number|null} 高程值
   */
  function getElevationByChainage(vProfile, targetK) {
    if (!vProfile || !vProfile.length) return null;

    // 如果只有一个点，返回该点高程
    if (vProfile.length === 1) return vProfile[0].H;

    // 外推：起点之前
    if (targetK <= vProfile[0].K) {
      const p = vProfile[0];
      return p.H + p.i2 * (targetK - p.K);
    }
    // 外推：终点之后
    if (targetK >= vProfile[vProfile.length - 1].K) {
      const p = vProfile[vProfile.length - 1];
      return p.H + p.i1 * (targetK - p.K);
    }

    // 查找所在的区间 (前一个VPI)
    let prevVpi = vProfile[0];
    let nextVpi = vProfile[1];
    for (let i = 0; i < vProfile.length - 1; i++) {
      if (targetK >= vProfile[i].K && targetK < vProfile[i+1].K) {
        prevVpi = vProfile[i];
        nextVpi = vProfile[i+1];
        break;
      }
    }

    // 判断是否落在前一个VPI的竖曲线后半段
    if (prevVpi.L > 0 && targetK <= prevVpi.endK) {
      const x = targetK - prevVpi.startK;
      const y = (x * x) / (2 * prevVpi.R);
      const sign = prevVpi.omega > 0 ? 1 : -1; // 凹曲线加，凸曲线减
      const tangentH = prevVpi.startH + prevVpi.i1 * x;
      return tangentH + sign * y;
    }

    // 判断是否落在后一个VPI的竖曲线前半段
    if (nextVpi.L > 0 && targetK >= nextVpi.startK) {
      const x = targetK - nextVpi.startK;
      const y = (x * x) / (2 * nextVpi.R);
      const sign = nextVpi.omega > 0 ? 1 : -1;
      const tangentH = nextVpi.startH + nextVpi.i1 * x;
      return tangentH + sign * y;
    }

    // 位于直线段
    return prevVpi.H + prevVpi.i2 * (targetK - prevVpi.K);
  }

  /**
   * 编译断链模型
   * @param {Array} brokenChains 断链数组 [{chain_before, chain_after}]
   * @returns {Array} 排序并处理好的断链规则
   */
  function buildChainageEquations(brokenChains) {
    if (!brokenChains || !brokenChains.length) return [];
    
    // 清洗和转换数据
    const chains = brokenChains.map(c => ({
      before: parseFloat(c.chain_before),
      after: parseFloat(c.chain_after)
    })).filter(c => !isNaN(c.before) && !isNaN(c.after));
    
    // 按前桩号排序
    chains.sort((a, b) => a.before - b.before);
    
    // 计算累积真实现长偏差
    // 真实距离(RealK) = 名义桩号(NominalK) + gap
    let currentGap = 0;
    for (let i = 0; i < chains.length; i++) {
      const diff = chains[i].before - chains[i].after;
      currentGap += diff;
      chains[i].gapAfter = currentGap;
      chains[i].gapBefore = currentGap - diff;
    }
    
    return chains;
  }

  /**
   * 将名义桩号(用户输入的桩号)转换为真实的连续长度(RealK)
   * @param {number} nominalK 
   * @param {Array} chains 编译好的断链模型
   * @returns {number} RealK
   */
  function nominalToReal(nominalK, chains) {
    if (!chains || !chains.length) return nominalK;
    
    // 首先检查是否落在短链的“缺失区间”内，如果落在里面，强行把它挤出到断链点
    for (let i = 0; i < chains.length; i++) {
      const c = chains[i];
      if (c.before < c.after && nominalK > c.before && nominalK < c.after) {
        return c.before + c.gapBefore;
      }
    }

    // 从后往前查找，判断桩号属于哪一段
    for (let i = chains.length - 1; i >= 0; i--) {
      if (nominalK >= chains[i].after) {
        return nominalK + chains[i].gapAfter;
      }
    }
    return nominalK;
  }

  /**
   * 将真实的连续长度(RealK)转换为带断链的名义桩号(NominalK)
   * @param {number} realK 
   * @param {Array} chains 编译好的断链模型
   * @returns {number} nominalK
   */
  function realToNominal(realK, chains) {
    if (!chains || !chains.length) return realK;
    
    for (let i = chains.length - 1; i >= 0; i--) {
      const realAfter = chains[i].after + chains[i].gapAfter;
      if (realK >= realAfter) {
        return realK - chains[i].gapAfter;
      }
    }
    return realK;
  }

  /**
   * 根据横断面分段设计，对任意桩号进行线性插值，获取该桩号的横断面参数
   * @param {number} targetK 目标桩号（真实K）
   * @param {Array} crossSections 横断面分段列表
   * @returns {Object} 插值后的横断面参数
   */
  function getCrossSectionParams(targetK, crossSections) {
    if (!crossSections || !crossSections.length) return null;

    // 找到包含 targetK 的分段
    const sorted = [...crossSections]
      .filter(c => c.start_k != null && c.end_k != null)
      .sort((a, b) => parseFloat(a.start_k) - parseFloat(b.start_k));

    // 查找所在分段
    let seg = null;
    let prevSeg = null;
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const sk = parseFloat(s.start_k), ek = parseFloat(s.end_k);
      if (targetK >= sk && targetK <= ek) { seg = s; prevSeg = sorted[i - 1] || null; break; }
      if (targetK < sk && i === 0) { seg = s; break; }
      prevSeg = s;
    }
    if (!seg) seg = sorted[sorted.length - 1]; // 超出末端，取最后一段

    // 如果是渐变过渡段，在 prevSeg 和 seg 之间插值
    if (seg.type === 'transition' && prevSeg) {
      const sk = parseFloat(seg.start_k), ek = parseFloat(seg.end_k);
      const t = ek > sk ? (targetK - sk) / (ek - sk) : 0;
      const lerp = (a, b) => {
        const fa = parseFloat(a) || 0, fb = parseFloat(b) || 0;
        return fa + (fb - fa) * t;
      };
      return {
        road_width_left: lerp(prevSeg.road_width_left, seg.road_width_left),
        road_width_right: lerp(prevSeg.road_width_right, seg.road_width_right),
        left_super: lerp(prevSeg.left_super, seg.left_super),
        right_super: lerp(prevSeg.right_super, seg.right_super),
        shoulder_width_left: lerp(prevSeg.shoulder_width_left, seg.shoulder_width_left),
        shoulder_width_right: lerp(prevSeg.shoulder_width_right, seg.shoulder_width_right),
        shoulder_slope: lerp(prevSeg.shoulder_slope, seg.shoulder_slope),
        median_width: lerp(prevSeg.median_width, seg.median_width),
        left_side_slope: lerp(prevSeg.left_side_slope, seg.left_side_slope),
        right_side_slope: lerp(prevSeg.right_side_slope, seg.right_side_slope),
        ditch_width: lerp(prevSeg.ditch_width, seg.ditch_width),
        ditch_depth: lerp(prevSeg.ditch_depth, seg.ditch_depth),
        type: 'transition'
      };
    }
    return seg; // 标准段直接返回
  }

  /**
   * 计算某一桩号的边桩3D坐标
   * @param {Object} center 中桩 {x, y, azimuth}
   * @param {number} centerH 中桩高程
   * @param {Object} cs 横断面参数（插值后）
   * @param {string} side 'left' 或 'right'
   * @returns {Object} 边桩坐标 {x, y, h, offset}
   */
  function computeEdgePoint(center, centerH, cs, side) {
    if (!center || !cs) return null;

    const isLeft = side === 'left';
    const az = deg2rad(center.azimuth);
    // 垂直方向：左转90° = 方位角 - 90°
    const perpAz = az + (isLeft ? -PI / 2 : PI / 2);

    const roadWidth = isLeft
      ? (parseFloat(cs.road_width_left) || 0)
      : (parseFloat(cs.road_width_right) || 0);
    const superElev = isLeft
      ? (parseFloat(cs.left_super) || 0)
      : (parseFloat(cs.right_super) || 0);
    const shoulderW = isLeft
      ? (parseFloat(cs.shoulder_width_left) || 0)
      : (parseFloat(cs.shoulder_width_right) || 0);
    const shoulderSlope = parseFloat(cs.shoulder_slope) || 0;

    // 路面边缘水平偏移量（路面宽 + 路肩宽）
    const totalOffset = roadWidth + shoulderW;

    // 边桩坐标（平面）
    const ex = center.x + totalOffset * Math.cos(perpAz);
    const ey = center.y + totalOffset * Math.sin(perpAz);

    // 边桩高程（中桩高程 + 路面超高产生的高差 + 路肩坡的高差）
    // 路面高差 = 路面宽 × 超高坡度（%/100）
    // 路肩高差 = 路肩宽 × 路肩横坡（%/100）
    const roadElev = centerH + roadWidth * (superElev / 100) * (isLeft ? 1 : -1) * (isLeft ? -1 : -1);
    // 简化：边桩高程 = 中桩H + 路宽×超高 + 路肩宽×路肩坡（路肩坡通常比路面坡更大，方向与路面坡相反）
    const edgeH = centerH
      - Math.abs(roadWidth) * Math.abs(superElev / 100)
      - Math.abs(shoulderW) * Math.abs(shoulderSlope / 100);

    return {
      x: ex,
      y: ey,
      h: +edgeH.toFixed(4),
      offset: +(isLeft ? -totalOffset : totalOffset).toFixed(4)
    };
  }

  /**
   * 主计算入口：批量生成逐桩坐标表
   * @param {Object} roadData 完整道路对象（来自数据库）
   * @param {Object} options {startK, endK, interval}
   * @returns {Array} [{chainage, x, y, h, leftX, leftY, leftH, rightX, rightY, rightH, azimuth}]
   */
  function computeStakeTable(roadData, options) {
    const startK = parseFloat(options.startK) || 0;
    const endK = parseFloat(options.endK);
    const interval = parseFloat(options.interval) || 20;

    if (isNaN(endK) || endK <= startK) return { error: '终止桩号必须大于起始桩号' };

    // 1. 编译平曲线
    let align;
    const method = roadData.alignment_method;
    if (method === 'JD') {
      align = buildAlignmentFromJD(roadData.start_chainage ?? startK, roadData.jd_points || []);
    } else if (method === 'ELEMENTS') {
      align = buildAlignmentFromElements(
        roadData.start_chainage ?? startK,
        roadData.start_x, roadData.start_y, roadData.start_az,
        roadData.elements || []
      );
    } else {
      // 坐标法：如没有 align，xy直接从 coord_points 线性插值
      align = null;
    }

    // 2. 编译纵断面
    const vProfile = buildVerticalAlignment(roadData.vertical_curves || []);

    // 3. 编译断链
    const chains = buildChainageEquations(roadData.broken_chains || []);

    // 4. 逐桩推算
    const rows = [];
    let k = startK;
    while (k <= endK + 1e-6) {
      const nomK = +k.toFixed(4);
      const realK = nominalToReal(nomK, chains);

      let center = null;
      if (align) {
        center = getPointByChainage(align, realK);
      } else if (roadData.coord_points && roadData.coord_points.length >= 2) {
        // 坐标法线性插值
        const pts = [...roadData.coord_points].sort((a, b) => a.chainage - b.chainage);
        let p1 = pts[0], p2 = pts[1];
        for (let i = 0; i < pts.length - 1; i++) {
          if (realK >= pts[i].chainage && realK <= pts[i + 1].chainage) {
            p1 = pts[i]; p2 = pts[i + 1]; break;
          }
          p2 = pts[i + 1];
        }
        const dk = p2.chainage - p1.chainage;
        const t2 = dk > 0 ? (realK - p1.chainage) / dk : 0;
        const ix = p1.x + (p2.x - p1.x) * t2;
        const iy = p1.y + (p2.y - p1.y) * t2;
        const az = rad2deg(Math.atan2(p2.y - p1.y, p2.x - p1.x));
        center = { x: ix, y: iy, azimuth: (az + 360) % 360 };
      }

      const centerH = getElevationByChainage(vProfile, realK);
      const cs = getCrossSectionParams(realK, roadData.cross_sections || []);

      const row = {
        chainage: nomK,
        x: center ? +center.x.toFixed(4) : null,
        y: center ? +center.y.toFixed(4) : null,
        h: centerH != null ? +centerH.toFixed(4) : null,
        azimuth: center ? +center.azimuth.toFixed(4) : null
      };

      if (center && cs) {
        const lp = computeEdgePoint(center, centerH ?? 0, cs, 'left');
        const rp = computeEdgePoint(center, centerH ?? 0, cs, 'right');
        row.left_x = lp?.x ?? null;
        row.left_y = lp?.y ?? null;
        row.left_h = lp?.h ?? null;
        row.left_offset = lp?.offset ?? null;
        row.right_x = rp?.x ?? null;
        row.right_y = rp?.y ?? null;
        row.right_h = rp?.h ?? null;
        row.right_offset = rp?.offset ?? null;
      }

      rows.push(row);
      k += interval;
      // 确保最后一个点精确包含终点
      if (k > endK + 1e-6) break;
    }
    // 如果最后一个点不是终点，补一个终点
    const lastK = rows[rows.length - 1]?.chainage;
    if (lastK !== undefined && Math.abs(lastK - endK) > 1e-4) {
      k = endK;
      const nomK = +k.toFixed(4);
      const realK = nominalToReal(nomK, chains);
      let center = align ? getPointByChainage(align, realK) : null;
      const centerH = getElevationByChainage(vProfile, realK);
      const cs = getCrossSectionParams(realK, roadData.cross_sections || []);
      const row = {
        chainage: nomK,
        x: center ? +center.x.toFixed(4) : null,
        y: center ? +center.y.toFixed(4) : null,
        h: centerH != null ? +centerH.toFixed(4) : null,
        azimuth: center ? +center.azimuth.toFixed(4) : null
      };
      if (center && cs) {
        const lp = computeEdgePoint(center, centerH ?? 0, cs, 'left');
        const rp = computeEdgePoint(center, centerH ?? 0, cs, 'right');
        row.left_x = lp?.x; row.left_y = lp?.y; row.left_h = lp?.h; row.left_offset = lp?.offset;
        row.right_x = rp?.x; row.right_y = rp?.y; row.right_h = rp?.h; row.right_offset = rp?.offset;
      }
      rows.push(row);
    }

    return rows;
  }

  return {
    buildAlignmentFromElements,
    buildAlignmentFromJD,
    getPointByChainage,
    buildVerticalAlignment,
    getElevationByChainage,
    buildChainageEquations,
    nominalToReal,
    realToNominal,
    getCrossSectionParams,
    computeEdgePoint,
    computeStakeTable
  };
})();

