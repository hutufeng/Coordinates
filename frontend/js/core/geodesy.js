/**
 * 坐标计算核心库
 * 中国测量坐标系：X=北方向（纵坐标），Y=东方向（横坐标）
 * 方位角：从北方向顺时针计量（0~360°）
 */
window.Geo = (function () {

  const PI = Math.PI;

  /* ---- 角度格式转换 ---- */
  function deg2rad(d) { return d * PI / 180; }
  function rad2deg(r) { return r * 180 / PI; }

  /** 度分秒字符串 → 十进制度  例："123°45'30\"" 或 "123.4530" 或 123.4530 */
  function parseDMS(val) {
    if (typeof val === 'number') return val;
    const s = String(val).trim();
    // 支持格式: 123°45'30" / 123d45m30s / 123-45-30 / 123.4530（度分秒连写）
    const m1 = s.match(/^(-?)(\d+)[°d](\d+)[\'m](\d+\.?\d*)[\"s]?$/);
    if (m1) {
      const [, neg, d, mn, sc] = m1;
      const v = +d + +mn / 60 + +sc / 3600;
      return neg ? -v : v;
    }
    // 纯数字（含小数点直接当十进制度）
    return parseFloat(s) || 0;
  }

  /** 十进制度 → "DDD°MM'SS.ss\"" */
  function formatDMS(deg) {
    const neg = deg < 0;
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const mf = (abs - d) * 60;
    const m = Math.floor(mf);
    const s = (mf - m) * 60;
    return `${neg ? '-' : ''}${d}°${String(m).padStart(2, '0')}'${s.toFixed(2).padStart(5, '0')}"`;
  }

  /** 方位角标准化到 [0, 360) */
  function normalizeAzimuth(deg) {
    deg = deg % 360;
    if (deg < 0) deg += 360;
    return deg;
  }

  /* ---- 正算：已知起点 + 方位角 + 距离 → 终点坐标 ---- */
  function polar2rect(x0, y0, azimuthDeg, distance) {
    const rad = deg2rad(azimuthDeg);
    return {
      x: x0 + distance * Math.cos(rad),
      y: y0 + distance * Math.sin(rad)
    };
  }

  /* ---- 反算：已知两点坐标 → 方位角和水平距离 ---- */
  function rect2polar(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let azimuth = rad2deg(Math.atan2(dy, dx));
    azimuth = normalizeAzimuth(azimuth);
    return { azimuth, distance };
  }

  /* ---- 面积计算（Shoelace，输入多边形顶点数组 [{x,y},...] ---- */
  function calcArea(points) {
    const n = points.length;
    if (n < 3) return 0;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  /* ---- 周长计算 ---- */
  function calcPerimeter(points, closed = true) {
    let len = 0;
    const n = points.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  /* ---- 点到直线的垂距与切距 ---- */
  function pointToLine(px, py, x1, y1, x2, y2) {
    const { azimuth, distance: lineLen } = rect2polar(x1, y1, x2, y2);
    const { azimuth: az2 } = rect2polar(x1, y1, px, py);
    const { distance: d } = rect2polar(x1, y1, px, py);
    const diff = deg2rad(az2 - azimuth);
    const tangent = d * Math.cos(diff);   // 切距（沿线方向）
    const normal = d * Math.sin(diff);    // 垂距（正左负右）
    return { tangent, normal, lineLen };
  }

  /* ---- 前方交会（已知A、B点及PA、PB方位角） ---- */
  function intersectBearing(xA, yA, azPA, xB, yB, azPB) {
    const a1 = deg2rad(azPA), a2 = deg2rad(azPB);
    const denom = Math.sin(a2 - a1);
    if (Math.abs(denom) < 1e-10) return null; // 平行，无解
    const dx = xB - xA, dy = yB - yA;
    const t = (dy * Math.cos(a2) - dx * Math.sin(a2)) / denom;
    return {
      x: xA + t * Math.cos(a1),
      y: yA + t * Math.sin(a1)
    };
  }

  /* ---- 导线计算（附合/闭合导线） ---- */
  /**
   * points: [{x,y}] 已知点（起点）
   * bearings: [方位角°] 各测段方位角（n-1个）
   * distances: [距离] 各测段距离
   * endPoint: {x,y} 附合终点（null则为闭合导线）
   */
  function traverseCalc(startX, startY, startAzimuth, angles, distances, endX, endY) {
    const n = angles.length;
    const pts = [{ x: startX, y: startY }];
    let az = startAzimuth;
    for (let i = 0; i < n; i++) {
      az = normalizeAzimuth(az + 180 + angles[i]);
      const { x, y } = polar2rect(pts[pts.length - 1].x, pts[pts.length - 1].y, az, distances[i]);
      pts.push({ x, y });
    }
    // 坐标闭合差
    if (endX !== undefined && endY !== undefined) {
      const fx = pts[pts.length - 1].x - endX;
      const fy = pts[pts.length - 1].y - endY;
      const fD = Math.sqrt(fx * fx + fy * fy);
      const totalDist = distances.reduce((a, b) => a + b, 0);
      const K = totalDist / fD;
      // 按距离比例分配改正
      let cumDist = 0;
      for (let i = 1; i < pts.length; i++) {
        cumDist += distances[i - 1];
        pts[i].x -= fx * cumDist / totalDist;
        pts[i].y -= fy * cumDist / totalDist;
      }
      return { points: pts, fx, fy, fD, K };
    }
    return { points: pts };
  }

  /* ---- 坐标换算（四参数） ---- */
  /**
   * 从已知点对计算四参数: a, b, tx, ty
   * 使用最小二乘法（至少2点对）
   */
  function calcFourParams(pairs) {
    // pairs: [{x1,y1,x2,y2},...] x1,y1=源, x2,y2=目标
    const n = pairs.length;
    if (n < 2) return null;
    // 建立方程组 AX = B
    // [x1 -y1 1 0] [a]   [x2]
    // [y1  x1 0 1] [b] = [y2]
    //              [tx]
    //              [ty]
    const A = [], B = [];
    for (const p of pairs) {
      A.push([p.x1, -p.y1, 1, 0]);
      A.push([p.y1,  p.x1, 0, 1]);
      B.push(p.x2);
      B.push(p.y2);
    }
    // 最小二乘: X = (A'A)^-1 * A'B
    const params = leastSquares(A, B);
    if (!params) return null;
    const [a, b, tx, ty] = params;
    const scale = Math.sqrt(a * a + b * b);
    const rotation = rad2deg(Math.atan2(b, a));
    return { a, b, tx, ty, scale, rotation };
  }

  /** 应用四参数变换 */
  function applyFourParams(x, y, params) {
    const { a, b, tx, ty } = params;
    return {
      x: a * x - b * y + tx,
      y: b * x + a * y + ty
    };
  }

  /** 简单最小二乘解 (Ax=B, A为m×n, m>=n) */
  function leastSquares(A, B) {
    const m = A.length, n = A[0].length;
    // AtA
    const AtA = Array.from({length: n}, () => new Array(n).fill(0));
    const AtB = new Array(n).fill(0);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        AtB[j] += A[i][j] * B[i];
        for (let k = 0; k < n; k++) {
          AtA[j][k] += A[i][j] * A[i][k];
        }
      }
    }
    return gaussianElimination(AtA, AtB);
  }

  /** 高斯消元法解线性方程组 */
  function gaussianElimination(A, b) {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
      }
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
      if (Math.abs(M[col][col]) < 1e-12) return null;
      for (let row = col + 1; row < n; row++) {
        const f = M[row][col] / M[col][col];
        for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n] / M[i][i];
      for (let k = i - 1; k >= 0; k--) M[k][n] -= M[k][i] * x[i];
    }
    return x;
  }

  /* ---- 工具函数 ---- */
  function fmtNum(v, dec = 4) {
    return (typeof v === 'number' ? v : parseFloat(v)).toFixed(dec);
  }

  function parseCoord(v) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }


  /* ---- 后方交会（Resection，三已知点+两夹角，Collins法） ---- */
  /**
   * A(xA,yA), B(xB,yB), C(xC,yC) 三已知点
   * alpha: 角度PAB（P→A→B 夹角，度）
   * beta:  角度PBC（P→B→C 夹角，度）
   * 返回: {x, y} 测站点P的坐标
   */
  function resection(xA, yA, xB, yB, xC, yC, alpha, beta) {
    const a = deg2rad(alpha), b = deg2rad(beta);
    const cotA = 1 / Math.tan(a), cotB = 1 / Math.tan(b);
    // Collins辅助点法
    const xAB = xB - xA, yAB = yB - yA;
    const xBC = xC - xB, yBC = yC - yB;
    // P'(辅助点)
    const xP1 = xA + cotA * yAB - yAB;
    const yP1 = yA - cotA * xAB + xAB; // 简化近似, 改用标准公式
    // 标准余切公式
    const D = (xA - xC) * cotB - (xB - xC) * cotA - (xA - xB);
    const E = (yA - yC) * cotB - (yB - yC) * cotA - (yA - yB);
    const F = (xA - xC) * (yB - yC) - (xB - xC) * (yA - yC);
    if (Math.abs(D) < 1e-10 && Math.abs(E) < 1e-10) return null;
    const denom = cotA * cotB - 1;
    if (Math.abs(denom) < 1e-10) return null;
    const x = (xA * cotB - xC * cotA + yC - yA) / denom +
              (xB - xA) * cotB / denom;
    // 用余切公式直接求解
    const cA = cotA, cB = cotB;
    const px = ((xA * cA + xC * cB + yC - yA) +
                (xB - xC) * cA + (xA - xB) * cB) /
               (cA + cB - (xC - xA) / (yC - yA + 1e-15));
    // 改用矩阵方法更稳定
    // 方程: (cotA+cotB)*x - y*(cotA*cotB-1) = cotA*xC + cotB*xA + yC - yA ...
    // 采用两组方程求解
    const K1 = (xA - xB) * cA + (xC - xB) * cB;
    const K2 = (yA - yB) * cA + (yC - yB) * cB;
    const A11 = cA + cB, A12 = -(cA * cB - 1);
    const A21 = cA * cB - 1, A22 = cA + cB;
    const det = A11 * A22 - A12 * A21;
    if (Math.abs(det) < 1e-10) return null;
    const px2 = (K1 * A22 - K2 * A12) / det + xB;
    const py2 = (K2 * A11 - K1 * A21) / det + yB;
    return { x: px2, y: py2 };
  }

  /* ---- 距离交会（两已知点+两距离） ---- */
  /**
   * A(xA,yA), B(xB,yB): 已知点
   * dA, dB: 待定点P到A、B的距离
   * 返回两个解 [{x,y},{x,y}]，取靠近实测区域的一个
   */
  function intersectDistance(xA, yA, dA, xB, yB, dB) {
    const dx = xB - xA, dy = yB - yA;
    const D = Math.sqrt(dx * dx + dy * dy);
    if (D > dA + dB || D < Math.abs(dA - dB)) return null; // 无解
    const a = (dA * dA - dB * dB + D * D) / (2 * D);
    const h2 = dA * dA - a * a;
    if (h2 < 0) return null;
    const h = Math.sqrt(h2);
    const mx = xA + a * dx / D, my = yA + a * dy / D;
    return [
      { x: mx + h * dy / D, y: my - h * dx / D },
      { x: mx - h * dy / D, y: my + h * dx / D }
    ];
  }

  /* ---- 高斯-克吕格投影 ---- */
  /**
   * 大地坐标(B,L) → 高斯平面坐标(x,y)
   * 椭球: 'CGCS2000'(GRS80) | 'WGS84' | 'BJ54'(Krassowsky)
   * L0: 中央子午线经度（度）
   * 返回: {x(北), y(东)} 单位：米
   */
  const ELLIPSOIDS = {
    CGCS2000: { a: 6378137.0,   f: 1/298.257222101 },
    WGS84:    { a: 6378137.0,   f: 1/298.257223563 },
    BJ54:     { a: 6378245.0,   f: 1/298.3 },
    Xian80:   { a: 6378140.0,   f: 1/298.257 }
  };

  function gaussForward(B_deg, L_deg, L0_deg, ellipsoid='CGCS2000') {
    const ell = ELLIPSOIDS[ellipsoid] || ELLIPSOIDS.CGCS2000;
    const { a, f } = ell;
    const b2 = a * a * (1 - f) * (1 - f);
    const e2 = (a * a - b2) / (a * a);
    const ep2 = (a * a - b2) / b2;
    const B = deg2rad(B_deg), l = deg2rad(L_deg - L0_deg);
    const sinB = Math.sin(B), cosB = Math.cos(B), tanB = Math.tan(B);
    const N = a / Math.sqrt(1 - e2 * sinB * sinB); // 卯酉圈曲率半径
    const t = tanB, t2 = t * t, t4 = t2 * t2;
    const eta2 = ep2 * cosB * cosB;
    // 子午线弧长
    const A0 = 1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256;
    const A2 = 3/8*(e2 + e2*e2/4 + 15*e2*e2*e2/128);
    const A4 = 15/256*(e2*e2 + 3*e2*e2*e2/4);
    const A6 = 35*e2*e2*e2/3072;
    const m = a*(A0*B - A2*Math.sin(2*B) + A4*Math.sin(4*B) - A6*Math.sin(6*B));
    const l2=l*l, l4=l2*l2, l6=l2*l4;
    const x = m + N*sinB*cosB*l2/2
              + N*sinB*cosB*cosB*cosB*(5-t2+9*eta2+4*eta2*eta2)*l4/24
              + N*sinB*Math.pow(cosB,5)*(61-58*t2+t4)*l6/720;
    const y = N*cosB*l
              + N*cosB*cosB*cosB*(1-t2+eta2)*l*l2/6
              + N*Math.pow(cosB,5)*(5-18*t2+t4+14*eta2-58*t2*eta2)*l*l4/120;
    return { x: +x.toFixed(4), y: +(y + 500000).toFixed(4) }; // y加500000
  }

  /**
   * 高斯平面坐标(x,y) → 大地坐标(B,L)
   * y0: 是否含500000加常数（默认true）
   */
  function gaussInverse(x, y, L0_deg, ellipsoid='CGCS2000', y0=true) {
    const ell = ELLIPSOIDS[ellipsoid] || ELLIPSOIDS.CGCS2000;
    const { a, f } = ell;
    const b2 = a * a * (1 - f) * (1 - f);
    const e2 = (a * a - b2) / (a * a);
    const ep2 = (a * a - b2) / b2;
    const yy = y0 ? y - 500000 : y;
    // 底点纬度迭代
    const A0 = 1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256;
    const A2 = 3/8*(e2 + e2*e2/4 + 15*e2*e2*e2/128);
    const A4 = 15/256*(e2*e2 + 3*e2*e2*e2/4);
    const A6 = 35*e2*e2*e2/3072;
    let Bf = x / (a * A0);
    for (let i=0; i<10; i++) {
      const m = a*(A0*Bf - A2*Math.sin(2*Bf) + A4*Math.sin(4*Bf) - A6*Math.sin(6*Bf));
      Bf += (x - m) / (a * A0);
    }
    const sinBf=Math.sin(Bf), cosBf=Math.cos(Bf), tanBf=Math.tan(Bf);
    const Nf = a / Math.sqrt(1 - e2 * sinBf * sinBf);
    const Mf = a*(1-e2) / Math.pow(1-e2*sinBf*sinBf, 1.5);
    const t = tanBf, t2=t*t, t4=t2*t2;
    const eta2 = ep2 * cosBf * cosBf;
    const y2 = yy*yy, y4=y2*y2;
    const B = Bf - t*y2/(2*Mf*Nf)
              + t*(5+3*t2+eta2-9*t2*eta2)*y4/(24*Mf*Math.pow(Nf,3))
              - t*(61+90*t2+45*t4)*y2*y4/(720*Mf*Math.pow(Nf,5));
    const L = yy/(Nf*cosBf)
              - (1+2*t2+eta2)*yy*y2/(6*Math.pow(Nf,3)*cosBf)
              + (5+28*t2+24*t4+6*eta2+8*t2*eta2)*yy*y4/(120*Math.pow(Nf,5)*cosBf);
    return {
      B: +rad2deg(B).toFixed(8),
      L: +(rad2deg(L) + L0_deg).toFixed(8)
    };
  }

  return {
    deg2rad, rad2deg, parseDMS, formatDMS, normalizeAzimuth,
    polar2rect, rect2polar,
    calcArea, calcPerimeter,
    pointToLine, intersectBearing, intersectDistance, resection,
    traverseCalc,
    calcFourParams, applyFourParams,
    gaussForward, gaussInverse, ELLIPSOIDS,
    fmtNum, parseCoord
  };
})();

console.log('[Geo] 坐标计算核心库已加载');
