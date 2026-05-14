/**
 * DXF 导出工具库
 * 支持导出点（POINT+TEXT）、折线（LWPOLYLINE）、多边形（LWPOLYLINE 闭合）
 */
window.DxfExporter = (function () {

  function header() {
    return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n4\n0\nLAYER\n2\nPOINTS\n70\n0\n62\n5\n6\nCONTINUOUS\n0\nLAYER\n2\nLINES\n70\n0\n62\n3\n6\nCONTINUOUS\n0\nLAYER\n2\nPOLYS\n70\n0\n62\n4\n6\nCONTINUOUS\n0\nLAYER\n2\nSCATTER\n70\n0\n62\n6\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
  }

  function footer() { return '0\nENDSEC\n0\nEOF\n'; }

  function point(x, y, z = 0, layer = '0') {
    return `0\nPOINT\n8\n${layer}\n10\n${y}\n20\n${x}\n30\n${z}\n`;
  }

  function text(txt, x, y, z = 0, layer = '0', height = 1) {
    return `0\nTEXT\n8\n${layer}\n10\n${y}\n20\n${x}\n30\n${z}\n40\n${height}\n1\n${txt}\n`;
  }

  function polyline(pts, closed = false, layer = '0') {
    const flag = closed ? 1 : 0;
    let s = `0\nLWPOLYLINE\n8\n${layer}\n90\n${pts.length}\n70\n${flag}\n`;
    pts.forEach(p => { s += `10\n${p.y}\n20\n${p.x}\n`; });
    return s;
  }

  /**
   * 生成 DXF 字符串
   * @param {Object} data - { points, lines, polys }
   * @param {String} projectName
   */
  function build(data, projectName = 'export') {
    let body = header();

    // 点库 → POINT + TEXT
    if (data.points && data.points.length) {
      data.points.forEach(p => {
        if (p.x == null || p.y == null) return;
        body += point(+p.x, +p.y, +(p.h||0), 'POINTS');
        body += text(p.code || p.name || '', +p.x, +p.y, +(p.h||0), 'POINTS', 0.5);
      });
    }

    // 线库 → LWPOLYLINE
    if (data.lines && data.lines.length) {
      data.lines.forEach(line => {
        if (!Array.isArray(line.points) || line.points.length < 2) return;
        body += polyline(line.points.map(p => ({ x: +p.x, y: +p.y })), false, 'LINES');
      });
    }

    // 面库 → LWPOLYLINE 闭合
    if (data.polys && data.polys.length) {
      data.polys.forEach(poly => {
        if (!Array.isArray(poly.points) || poly.points.length < 3) return;
        const isScatter = poly.scatter_type === 'scatter';
        if (isScatter) {
          // 离散点导出为点集
          poly.points.forEach(p => {
            body += point(+p.x, +p.y, +(p.h||0), 'SCATTER');
          });
        } else {
          body += polyline(poly.points.map(p => ({ x: +p.x, y: +p.y })), true, 'POLYS');
        }
      });
    }

    body += footer();
    return body;
  }

  function download(dxfStr, filename) {
    const blob = new Blob([dxfStr], { type: 'application/dxf;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  return { build, download, point, text, polyline };
})();
