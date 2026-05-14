/** 道路设计模块 (RoadLib) */
window.RoadLibModule = {
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2 class="module-title">🛣️ 道路设计</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" @click="importRoadData">📥 导入道路</button>
        <button class="btn btn-primary btn-sm" @click="openAdd">＋ 新建道路</button>
      </div>
    </div>

    <div v-if="loading" style="text-align:center;padding:40px;">
      <div class="spinner" style="margin:0 auto 12px;"></div>
      <p style="color:var(--text-secondary);font-size:14px;">加载道路库...</p>
    </div>

    <div v-else class="projects-grid">
      <div v-for="r in roads" :key="r.id" class="project-card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="font-size:16px;font-weight:700;">{{ r.name }}</h3>
          <span class="badge badge-accent">{{ r.alignment_method === 'JD' ? '交点法' : r.alignment_method === 'ELEMENTS' ? '线元法' : '坐标法' }}</span>
        </div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;min-height:20px;">
          {{ r.description || '无备注' }}
        </p>
        <div style="display:flex;gap:8px;border-top:1px solid var(--border);padding-top:12px;">
          <button class="btn btn-ghost btn-sm" style="flex:1" @click="openEdit(r)">编辑参数</button>
          <button class="btn btn-ghost btn-sm" title="生成逐桩坐标" @click="openCompute(r)">📊 计算</button>
          <button class="btn btn-ghost btn-sm" @click="exportRoadData(r)" title="导出数据">📤</button>
          <button class="btn btn-icon btn-sm text-danger" @click="delRoad(r)" title="删除">🗑</button>
        </div>
      </div>
      <div v-if="!roads.length" class="empty-state" style="grid-column:1/-1;">
        <p>暂无道路设计，点击「新建道路」开始</p>
      </div>
    </div>

    <!-- 道路编辑面板 (全屏或超大弹窗) -->
    <div v-if="showForm" class="modal-overlay" style="align-items:flex-end;justify-content:flex-end;" @click.self="showForm=false">
      <div class="modal" style="height:100vh;width:95vw;max-width:1400px;border-radius:0;border-left:1px solid var(--border);display:flex;flex-direction:column;animation:slideInRight 0.3s var(--ease);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 class="modal-title" style="margin:0;">{{ editTarget ? '编辑道路' : '新建道路' }}</h3>
          <button class="btn btn-icon" @click="showForm=false">✖</button>
        </div>

        <!-- 基本信息 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">道路名称</label>
            <input v-model="form.name" class="form-input" placeholder="如：主线A">
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <input v-model="form.description" class="form-input" placeholder="可选">
          </div>
        </div>

        <!-- 选项卡导航 -->
        <div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:16px;">
          <button class="btn btn-ghost btn-sm" :style="activeTab==='horizontal' ? 'border-bottom:2px solid var(--primary);border-radius:0;color:var(--primary);font-weight:600;' : 'color:var(--text-muted)'" @click="activeTab='horizontal'">平曲线设计</button>
          <button class="btn btn-ghost btn-sm" :style="activeTab==='vertical' ? 'border-bottom:2px solid var(--primary);border-radius:0;color:var(--primary);font-weight:600;' : 'color:var(--text-muted)'" @click="activeTab='vertical'">纵断面设计</button>
          <button class="btn btn-ghost btn-sm" :style="activeTab==='cross' ? 'border-bottom:2px solid var(--primary);border-radius:0;color:var(--primary);font-weight:600;' : 'color:var(--text-muted)'" @click="activeTab='cross'">横断面设计</button>
          <button class="btn btn-ghost btn-sm" :style="activeTab==='chain' ? 'border-bottom:2px solid var(--primary);border-radius:0;color:var(--primary);font-weight:600;' : 'color:var(--text-muted)'" @click="activeTab='chain'">断链设置</button>
          <button class="btn btn-ghost btn-sm" :style="activeTab==='compute' ? 'border-bottom:2px solid var(--primary);border-radius:0;color:var(--primary);font-weight:600;' : 'color:var(--text-muted)'" @click="activeTab='compute'">📊 逐桩计算</button>
          <button class="btn btn-ghost btn-sm" :style="activeTab==='preview' ? 'border-bottom:2px solid var(--primary);border-radius:0;color:var(--primary);font-weight:600;' : 'color:var(--text-muted)'" @click="activeTab='preview';$nextTick(drawAlignment)">🗺️ 平曲线预览</button>
        </div>

        <div style="flex:1;overflow-y:auto;padding-right:8px;">
          
          <!-- Tab 1: 平曲线设计 -->
          <div v-show="activeTab==='horizontal'">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" style="display:inline-block;margin-right:12px;">平曲线输入法</label>
              <select v-model="form.alignment_method" class="form-input" style="max-width:200px;display:inline-block;">
                <option value="JD">交点法 (JD)</option>
                <option value="ELEMENTS">线元法 (Elements)</option>
                <option value="COORDINATE">坐标法 (Coordinate)</option>
              </select>
            </div>
            
            <!-- 交点法 JD -->
            <div v-if="form.alignment_method==='JD'">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label class="form-label" style="margin:0;">交点列表 (JD)</label>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-ghost btn-sm" @click="importJD">📥 导入</button>
                  <button class="btn btn-ghost btn-sm" @click="exportJD">📤 导出</button>
                  <button class="btn btn-ghost btn-sm" @click="addJD">＋ 添加交点</button>
                </div>
              </div>
              <div style="overflow-x:auto;">
                <table class="data-table" style="min-width:600px;">
                  <thead>
                    <tr>
                      <th style="min-width:100px">交点号</th>
                      <th style="min-width:160px">X (北)</th>
                      <th style="min-width:160px">Y (东)</th>
                      <th style="min-width:120px">半径 R</th>
                      <th style="min-width:120px">缓长 Ls1</th>
                      <th style="min-width:120px">参数 A1</th>
                      <th style="min-width:120px">缓长 Ls2</th>
                      <th style="min-width:120px">参数 A2</th>
                      <th style="width:60px">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(jd, i) in form.jd_points" :key="i">
                      <td><input v-model="jd.code" class="form-input font-mono" style="padding:4px;" placeholder="JD1"></td>
                      <td><input v-model="jd.x" type="number" class="form-input font-mono" style="padding:4px;"></td>
                      <td><input v-model="jd.y" type="number" class="form-input font-mono" style="padding:4px;"></td>
                      <td><input v-model="jd.r" type="number" class="form-input font-mono" style="padding:4px;" @input="calcAFromR(jd)"></td>
                      <td><input v-model="jd.ls1" type="number" class="form-input font-mono" style="padding:4px;" @input="calcA(jd, 1)"></td>
                      <td><input v-model="jd.a1" type="number" class="form-input font-mono" style="padding:4px;" @input="calcLs(jd, 1)" placeholder="自动"></td>
                      <td><input v-model="jd.ls2" type="number" class="form-input font-mono" style="padding:4px;" @input="calcA(jd, 2)"></td>
                      <td><input v-model="jd.a2" type="number" class="form-input font-mono" style="padding:4px;" @input="calcLs(jd, 2)" placeholder="自动"></td>
                      <td><button class="btn btn-icon btn-sm text-danger" @click="form.jd_points.splice(i,1)">✖</button></td>
                    </tr>
                    <tr v-if="!form.jd_points.length">
                      <td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;">点击右上角添加交点，起点和终点的 R、Ls 需填 0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 线元法 ELEMENTS -->
            <div v-if="form.alignment_method==='ELEMENTS'">
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
                  <button class="btn btn-ghost btn-sm" @click="importElements">📥 导入</button>
                  <button class="btn btn-ghost btn-sm" @click="exportElements">📤 导出</button>
                  <button class="btn btn-ghost btn-sm" @click="addElement">＋ 添加线元</button>
                </div>
              </div>
              <div style="overflow-x:auto;">
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

            <!-- 坐标法 COORDINATE -->
            <div v-if="form.alignment_method==='COORDINATE'">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label class="form-label" style="margin:0;">中桩坐标表</label>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-ghost btn-sm" @click="importCoords">📥 导入</button>
                  <button class="btn btn-ghost btn-sm" @click="exportCoords">📤 导出</button>
                  <button class="btn btn-ghost btn-sm" @click="addCoord">＋ 添加桩号</button>
                </div>
              </div>
              <div style="overflow-x:auto;">
                <table class="data-table" style="min-width:400px;">
                  <thead>
                    <tr>
                      <th style="min-width:140px">桩号 (K)</th>
                      <th style="min-width:180px">X (北)</th>
                      <th style="min-width:180px">Y (东)</th>
                      <th style="width:60px">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(pt, i) in form.coord_points" :key="i">
                      <td><input v-model="pt.chainage" type="number" class="form-input font-mono" style="padding:4px;"></td>
                      <td><input v-model="pt.x" type="number" class="form-input font-mono" style="padding:4px;"></td>
                      <td><input v-model="pt.y" type="number" class="form-input font-mono" style="padding:4px;"></td>
                      <td><button class="btn btn-icon btn-sm text-danger" @click="form.coord_points.splice(i,1)">✖</button></td>
                    </tr>
                    <tr v-if="!form.coord_points.length">
                      <td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">无桩号数据</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- Tab 2: 纵断面设计 -->
          <div v-show="activeTab==='vertical'">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <label class="form-label" style="margin:0;">变坡点列表 (VPI)</label>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-ghost btn-sm" @click="importVPI">📥 导入</button>
                <button class="btn btn-ghost btn-sm" @click="exportVPI">📤 导出</button>
                <button class="btn btn-ghost btn-sm" @click="addVPI">＋ 添加变坡点</button>
              </div>
            </div>
            <div style="overflow-x:auto;">
              <table class="data-table" style="min-width:400px;">
                <thead>
                  <tr>
                    <th style="min-width:140px">桩号 (K)</th>
                    <th style="min-width:140px">高程 (H)</th>
                    <th style="min-width:140px">竖曲线半径 (R)</th>
                    <th style="min-width:140px">竖曲线长度 (L)</th>
                    <th style="width:60px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(vpi, i) in form.vertical_curves" :key="i">
                    <td><input v-model="vpi.chainage" type="number" class="form-input font-mono" style="padding:4px;" @input="calcVertParams(i)"></td>
                    <td><input v-model="vpi.h" type="number" class="form-input font-mono" style="padding:4px;" @input="calcVertParams(i)"></td>
                    <td><input v-model="vpi.r" type="number" class="form-input font-mono" style="padding:4px;" @input="calcVertL(i)" placeholder="直坡填0"></td>
                    <td><input v-model="vpi.l" type="number" class="form-input font-mono" style="padding:4px;" @input="calcVertR(i)" placeholder="长度"></td>
                    <td><button class="btn btn-icon btn-sm text-danger" @click="form.vertical_curves.splice(i,1)">✖</button></td>
                  </tr>
                  <tr v-if="!form.vertical_curves.length">
                    <td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">添加变坡点，计算高程。起点和终点R填0。</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab 3: 横断面设计 -->
          <div v-show="activeTab==='cross'">


            <!-- 断面分段列表 -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <label class="form-label" style="margin:0;">横断面分段设计</label>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-ghost btn-sm" @click="importCross">📥 导入</button>
                <button class="btn btn-ghost btn-sm" @click="exportCross">📤 导出</button>
                <button class="btn btn-ghost btn-sm" @click="addCross">＋ 添加分段</button>
              </div>
            </div>

            <div v-for="(cs, i) in form.cross_sections" :key="i" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <span style="font-weight:600;font-size:13px;color:var(--primary);">段 {{ i + 1 }}</span>
                  <select v-model="cs.type" class="form-input" style="max-width:140px;padding:3px 6px;font-size:12px;">
                    <option value="standard">标准段</option>
                    <option value="transition">渐变过渡段</option>
                  </select>
                </div>
                <button class="btn btn-icon btn-sm text-danger" @click="form.cross_sections.splice(i,1)">✖</button>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">起始桩号 (K)</label>
                  <input v-model="cs.start_k" type="number" class="form-input font-mono" placeholder="如 0">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">终止桩号 (K)</label>
                  <input v-model="cs.end_k" type="number" class="form-input font-mono" placeholder="如 200">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">左侧路面宽 (m)</label>
                  <input v-model="cs.road_width_left" type="number" class="form-input font-mono" placeholder="正常宽+加宽">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">右侧路面宽 (m)</label>
                  <input v-model="cs.road_width_right" type="number" class="form-input font-mono" placeholder="正常宽+加宽">
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">左横坡/超高 (%)</label>
                  <input v-model="cs.left_super" type="number" class="form-input font-mono" placeholder="负=外倾">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">右横坡/超高 (%)</label>
                  <input v-model="cs.right_super" type="number" class="form-input font-mono" placeholder="负=外倾">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">左路肩宽 (m)</label>
                  <input v-model="cs.shoulder_width_left" type="number" class="form-input font-mono" placeholder="如 0.75">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">右路肩宽 (m)</label>
                  <input v-model="cs.shoulder_width_right" type="number" class="form-input font-mono" placeholder="如 0.75">
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">路肩横坡 (%)</label>
                  <input v-model="cs.shoulder_slope" type="number" class="form-input font-mono" placeholder="如 4">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">中分带宽度 (m)</label>
                  <input v-model="cs.median_width" type="number" class="form-input font-mono" placeholder="无则0">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">左边坡率 (1:n)</label>
                  <input v-model="cs.left_side_slope" type="number" class="form-input font-mono" placeholder="如 1.5">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">右边坡率 (1:n)</label>
                  <input v-model="cs.right_side_slope" type="number" class="form-input font-mono" placeholder="如 1.5">
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">边沟宽度 (m)</label>
                  <input v-model="cs.ditch_width" type="number" class="form-input font-mono" placeholder="如 0.6">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">边沟深度 (m)</label>
                  <input v-model="cs.ditch_depth" type="number" class="form-input font-mono" placeholder="如 0.6">
                </div>
                <div style="flex:2;min-width:240px;"></div>
              </div>
              <div v-if="cs.type==='transition'" style="margin-top:8px;padding:8px;background:rgba(59,130,246,0.1);border-radius:4px;">
                <span style="font-size:11px;color:var(--primary);">🔄 渐变过渡段：系统将在此桩号范围内，对上一段参数到当前段参数进行平滑线性插值过渡。</span>
              </div>
            </div>

            <div v-if="!form.cross_sections.length" style="text-align:center;color:var(--text-muted);padding:30px;border:1px dashed var(--border);border-radius:var(--r-md);">
              点击右上角「＋ 添加分段」设置各段里程范围与横断面参数。<br>
              <span style="font-size:11px;">例：K0+000~K0+200 标准段 → K0+200~K0+210 渐变段 → K0+210~K0+400 标准段</span>
            </div>
          </div>



          <!-- Tab 4: 断链设置 -->
          <div v-show="activeTab==='chain'">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <label class="form-label" style="margin:0;">长短链列表</label>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-ghost btn-sm" @click="importChain">📥 导入</button>
                <button class="btn btn-ghost btn-sm" @click="exportChain">📤 导出</button>
                <button class="btn btn-ghost btn-sm" @click="addChain">＋ 添加断链</button>
              </div>
            </div>
            <div style="overflow-x:auto;">
              <table class="data-table" style="min-width:400px;">
                <thead>
                  <tr>
                    <th style="min-width:140px">断链前桩号</th>
                    <th style="min-width:140px">= 断链后桩号</th>
                    <th style="min-width:120px">类型提示</th>
                    <th style="width:60px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(ch, i) in form.broken_chains" :key="i">
                    <td><input v-model="ch.chain_before" type="number" class="form-input font-mono" style="padding:4px;"></td>
                    <td><input v-model="ch.chain_after" type="number" class="form-input font-mono" style="padding:4px;"></td>
                    <td>
                      <span v-if="ch.chain_before && ch.chain_after" class="badge" :class="getChainBadge(ch)">
                        {{ getChainType(ch) }}
                      </span>
                    </td>
                    <td><button class="btn btn-icon btn-sm text-danger" @click="form.broken_chains.splice(i,1)">✖</button></td>
                  </tr>
                  <tr v-if="!form.broken_chains.length">
                    <td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">如无断链则无需添加</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

          <!-- Tab 5: 逐桩计算 -->
          <div v-show="activeTab==='compute'">
            <div style="background:var(--bg-surface);padding:14px;border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:14px;">
              <div style="font-size:12px;font-weight:600;margin-bottom:12px;">📊 逐桩坐标表生成（中桩 + 左/右边桩）</div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">起始桩号 (K)</label>
                  <input v-model="compute.startK" type="number" class="form-input font-mono" placeholder="如 0">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">终止桩号 (K)</label>
                  <input v-model="compute.endK" type="number" class="form-input font-mono" placeholder="如 1000">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:11px;color:var(--text-muted);">计算间距 (m)</label>
                  <input v-model="compute.interval" type="number" class="form-input font-mono" placeholder="如 20">
                </div>
                <div style="flex:1;min-width:120px;display:flex;align-items:flex-end;gap:8px;">
                  <button class="btn btn-primary btn-sm" style="flex:1" @click="runCompute" :disabled="computing">
                    {{ computing ? '计算中...' : '开始计算' }}
                  </button>
                  <button v-if="computeResult.length" class="btn btn-ghost btn-sm" @click="exportComputeResult">📥 导出</button>
                </div>
              </div>
            </div>

            <!-- 计算结果表 -->
            <div v-if="computing" style="text-align:center;padding:40px;">
              <div class="spinner" style="margin:0 auto 12px;"></div>
              <p style="color:var(--text-secondary);font-size:13px;">正在推算逐桩坐标...</p>
            </div>
            <div v-else-if="computeResult.length" style="overflow-x:auto;">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">共计 {{ computeResult.length }} 个桩号</div>
              <table class="data-table" style="min-width:900px;font-size:12px;">
                <thead>
                  <tr>
                    <th style="min-width:90px;">桩号 (K)</th>
                    <th style="min-width:100px;">中桩 X</th>
                    <th style="min-width:100px;">中桩 Y</th>
                    <th style="min-width:80px;">设计高程 H</th>
                    <th style="min-width:80px;">方位角(°)</th>
                    <th style="min-width:100px;">左边桩 X</th>
                    <th style="min-width:100px;">左边桩 Y</th>
                    <th style="min-width:70px;">左边H</th>
                    <th style="min-width:100px;">右边桩 X</th>
                    <th style="min-width:100px;">右边桩 Y</th>
                    <th style="min-width:70px;">右边H</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in computeResult" :key="row.chainage">
                    <td class="font-mono" style="font-weight:600;">K{{ formatK(row.chainage) }}</td>
                    <td class="font-mono">{{ row.x ?? '-' }}</td>
                    <td class="font-mono">{{ row.y ?? '-' }}</td>
                    <td class="font-mono">{{ row.h ?? '-' }}</td>
                    <td class="font-mono">{{ row.azimuth ?? '-' }}</td>
                    <td class="font-mono">{{ row.left_x ?? '-' }}</td>
                    <td class="font-mono">{{ row.left_y ?? '-' }}</td>
                    <td class="font-mono">{{ row.left_h ?? '-' }}</td>
                    <td class="font-mono">{{ row.right_x ?? '-' }}</td>
                    <td class="font-mono">{{ row.right_y ?? '-' }}</td>
                    <td class="font-mono">{{ row.right_h ?? '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else style="text-align:center;color:var(--text-muted);padding:30px;border:1px dashed var(--border);border-radius:var(--r-md);">
              填写起止桩号和间距，点击「开始计算」生成逐桩坐标表
            </div>
          </div>

          <!-- Tab 6: 平曲线预览 -->
          <div v-show="activeTab==='preview'" style="padding-bottom:12px;">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
              <span style="font-size:13px;color:var(--text-muted);">从逐桩坐标表生成平面线形图</span>
              <button class="btn btn-ghost btn-sm" @click="drawAlignment">🔄 刷新</button>
              <button class="btn btn-ghost btn-sm" @click="exportAlignmentPng">📷 导出PNG</button>
            </div>
            <canvas ref="alignCvs" width="900" height="500"
              style="width:100%;background:var(--bg-base);border:1px solid var(--border);border-radius:var(--r-md);cursor:crosshair;"
              @wheel.prevent="onAlignWheel"
              @mousedown="onAlignMouseDown"
              @mousemove="onAlignMouseMove"
              @mouseup="alignDrag=false"
            ></canvas>
            <div v-if="!computeResult.length" style="text-align:center;color:var(--text-muted);font-size:13px;margin-top:8px;">
              ⚠️ 请先在「逐桩计算」中生成坐标表，再查看预览
            </div>
          </div>

        <div class="modal-actions" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">
          <button class="btn btn-ghost" @click="showForm=false">取消</button>
          <button class="btn btn-primary" @click="saveRoad" :disabled="saving || !form.name.trim()">
            {{ saving ? '保存中...' : '保存道路参数' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  `,
  props: ['project'],
  data() {
    return {
      roads: [], loading: true, saving: false,
      showForm: false, editTarget: null,
      activeTab: 'horizontal',
      computing: false,
      computeResult: [],
      compute: { startK: '', endK: '', interval: 20 },
      form: { 
        name: '', description: '', alignment_method: 'JD',
        start_chainage: '', start_x: '', start_y: '', start_az: '',
        elements: [], jd_points: [], coord_points: [], vertical_curves: [], broken_chains: [],
        cross_sections: []
      },
      // 平曲线预览
      alignTx: 0, alignTy: 0, alignScale: 1,
      alignDrag: false, alignLastX: 0, alignLastY: 0
    };
  },
  async mounted() { await this.load(); },
  methods: {
    getChainType(ch) {
      if (!ch.chain_before || !ch.chain_after) return '-';
      const diff = parseFloat(ch.chain_after) - parseFloat(ch.chain_before);
      if (Math.abs(diff) < 0.001) return '无断链';
      return diff > 0 ? '长链 (+' + diff.toFixed(3) + ')' : '短链 (' + diff.toFixed(3) + ')';
    },
    getChainBadge(ch) {
      const type = this.getChainType(ch);
      if (type.includes('长链')) return 'badge-success';
      if (type.includes('短链')) return 'badge-danger';
      return '';
    },
    calcA(jd, type) {
      const r = parseFloat(jd.r);
      const ls = parseFloat(type === 1 ? jd.ls1 : jd.ls2);
      if (r > 0 && ls >= 0) {
        const a = Math.sqrt(r * ls);
        if (type === 1) jd.a1 = a ? +a.toFixed(4) : '';
        else jd.a2 = a ? +a.toFixed(4) : '';
      }
    },
    calcLs(jd, type) {
      const r = parseFloat(jd.r);
      const a = parseFloat(type === 1 ? jd.a1 : jd.a2);
      if (r > 0 && a >= 0) {
        const ls = (a * a) / r;
        if (type === 1) jd.ls1 = ls ? +ls.toFixed(4) : '';
        else jd.ls2 = ls ? +ls.toFixed(4) : '';
      }
    },
    calcAFromR(jd) {
      this.calcA(jd, 1);
      this.calcA(jd, 2);
    },
    addJD() { this.form.jd_points.push({ code: 'JD'+(this.form.jd_points.length+1), x:'', y:'', r:'', ls1:'', a1:'', ls2:'', a2:'' }); },
    addElement() { this.form.elements.push({ type: 'line', length: '', r1: '', r2: '', turn: '0' }); },
    addCoord() { this.form.coord_points.push({ chainage: '', x: '', y: '' }); },
    addVPI() {
      this.form.vertical_curves.push({ chainage: '', h: '', r: '', l: '' });
      this.calcAllVertParams();
    },
    // 计算单个变坡点前后的坡度差 omega
    getVertOmega(i) {
      const vpis = this.form.vertical_curves;
      if (i <= 0 || i >= vpis.length - 1) return 0;
      const prev = vpis[i-1], cur = vpis[i], next = vpis[i+1];
      const dk1 = parseFloat(cur.chainage) - parseFloat(prev.chainage);
      const dk2 = parseFloat(next.chainage) - parseFloat(cur.chainage);
      if (dk1 <= 0 || dk2 <= 0 || isNaN(dk1) || isNaN(dk2)) return 0;
      const i1 = (parseFloat(cur.h) - parseFloat(prev.h)) / dk1;
      const i2 = (parseFloat(next.h) - parseFloat(cur.h)) / dk2;
      return Math.abs(i2 - i1);
    },
    calcVertL(i) {
      const omega = this.getVertOmega(i);
      const r = parseFloat(this.form.vertical_curves[i].r);
      if (omega > 0 && r > 0) {
        this.form.vertical_curves[i].l = +(r * omega).toFixed(4);
      } else {
        this.form.vertical_curves[i].l = '';
      }
    },
    calcVertR(i) {
      const omega = this.getVertOmega(i);
      const l = parseFloat(this.form.vertical_curves[i].l);
      if (omega > 0 && l > 0) {
        this.form.vertical_curves[i].r = +(l / omega).toFixed(4);
      } else {
        this.form.vertical_curves[i].r = '';
      }
    },
    calcVertParams(i) {
      // 当修改桩号或高程时，坡度改变，影响自己以及前后相邻的L和R计算
      if (i > 0) this.calcVertL(i - 1);
      this.calcVertL(i);
      if (i < this.form.vertical_curves.length - 1) this.calcVertL(i + 1);
    },
    calcAllVertParams() {
      for (let i = 1; i < this.form.vertical_curves.length - 1; i++) {
        this.calcVertL(i);
      }
    },
    addChain() { this.form.broken_chains.push({ chain_before: '', chain_after: '' }); },
    addCross() { this.form.cross_sections.push({ type: 'standard', start_k: '', end_k: '', road_width_left: '', road_width_right: '', left_super: '', right_super: '', shoulder_width_left: '', shoulder_width_right: '', shoulder_slope: '', median_width: '', left_side_slope: '', right_side_slope: '', ditch_width: '', ditch_depth: '' }); },

    // ====== 交点法 导入/导出 ======
    importJD() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.split(/\r?\n/);
          let count = 0;
          for (const line of lines) {
            const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (cols.length < 3) continue;
            const x = parseFloat(cols[1]), y = parseFloat(cols[2]);
            if (isNaN(x) || isNaN(y)) continue;
            const jd = {
              code: cols[0], x, y,
              r: cols[3] ? parseFloat(cols[3]) || '' : '',
              ls1: cols[4] ? parseFloat(cols[4]) || '' : '',
              a1: '', ls2: cols[5] ? parseFloat(cols[5]) || '' : '', a2: ''
            };
            this.calcAFromR(jd);
            this.form.jd_points.push(jd);
            count++;
          }
          window.AppStore.toast(`成功导入 ${count} 个交点`);
        };
        reader.readAsText(file);
      };
      input.click();
    },
    exportJD() {
      if (!this.form.jd_points.length) return window.AppStore.toast('无交点数据', 'error');
      const header = '交点号,X,Y,半径R,缓长Ls1,缓长Ls2\n';
      const rows = this.form.jd_points.map(p =>
        `${p.code??''},${p.x??''},${p.y??''},${p.r??''},${p.ls1??''},${p.ls2??''}`
      ).join('\n');
      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '交点法_' + (this.form.name || '道路') + '.csv';
      a.click();
    },

    // ====== 线元法 导入/导出 ======
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
          else window.AppStore.toast('未能解析到线元数据', 'error');
        };
        reader.readAsText(file);
      };
      input.click();
    },
    exportElements() {
      if (!this.form.elements.length) return window.AppStore.toast('无线元数据', 'error');
      const header = '起点桩号,起点X,起点Y,起点方位角,类型,长度,起半径R1,终半径R2,转向\n';
      const rows = this.form.elements.map((el, i) => {
        if (i === 0) return `${this.form.start_chainage??''},${this.form.start_x??''},${this.form.start_y??''},${this.form.start_az??''},${el.type},${el.length??''},${el.r1??''},${el.r2??''},${el.turn??0}`;
        return `,,,,${el.type},${el.length??''},${el.r1??''},${el.r2??''},${el.turn??0}`;
      }).join('\n');
      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '线元法_' + (this.form.name || '道路') + '.csv';
      a.click();
    },

    // ====== 纵断面 VPI 导入/导出 ======
    importVPI() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.split(/\r?\n/);
          let count = 0;
          for (const line of lines) {
            const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (cols.length < 2) continue;
            const chainage = parseFloat(cols[0]), h = parseFloat(cols[1]);
            if (isNaN(chainage) || isNaN(h)) continue;
            this.form.vertical_curves.push({
              chainage, h,
              r: cols[2] ? parseFloat(cols[2]) || '' : '',
              l: cols[3] ? parseFloat(cols[3]) || '' : ''
            });
            count++;
          }
          this.calcAllVertParams();
          window.AppStore.toast(`成功导入 ${count} 个变坡点`);
        };
        reader.readAsText(file);
      };
      input.click();
    },
    exportVPI() {
      if (!this.form.vertical_curves.length) return window.AppStore.toast('无变坡点数据', 'error');
      const header = '桩号,高程,竖曲线半径R,竖曲线长度L\n';
      const rows = this.form.vertical_curves.map(v =>
        `${v.chainage??''},${v.h??''},${v.r??''},${v.l??''}`
      ).join('\n');
      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '纵断面_' + (this.form.name || '道路') + '.csv';
      a.click();
    },

    // ====== 横断面 导入/导出 ======
    importCross() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.split(/\r?\n/);
          let count = 0;
          for (const line of lines) {
            const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (cols.length < 3) continue;
            const start_k = parseFloat(cols[0]);
            const end_k = parseFloat(cols[1]);
            if (isNaN(start_k)) continue;
            this.form.cross_sections.push({
              type: cols[2] === 'transition' ? 'transition' : 'standard',
              start_k,
              end_k: isNaN(end_k) ? '' : end_k,
              road_width_left: cols[3] ? parseFloat(cols[3]) || '' : '',
              road_width_right: cols[4] ? parseFloat(cols[4]) || '' : '',
              left_super: cols[5] ? parseFloat(cols[5]) || '' : '',
              right_super: cols[6] ? parseFloat(cols[6]) || '' : '',
              shoulder_width_left: cols[7] ? parseFloat(cols[7]) || '' : '',
              shoulder_width_right: cols[8] ? parseFloat(cols[8]) || '' : '',
              shoulder_slope: cols[9] ? parseFloat(cols[9]) || '' : '',
              median_width: cols[10] ? parseFloat(cols[10]) || '' : '',
              left_side_slope: cols[11] ? parseFloat(cols[11]) || '' : '',
              right_side_slope: cols[12] ? parseFloat(cols[12]) || '' : '',
              ditch_width: cols[13] ? parseFloat(cols[13]) || '' : '',
              ditch_depth: cols[14] ? parseFloat(cols[14]) || '' : ''
            });
            count++;
          }
          window.AppStore.toast(`成功导入 ${count} 个横断面分段`);
        };
        reader.readAsText(file);
      };
      input.click();
    },
    exportCross() {
      if (!this.form.cross_sections.length) return window.AppStore.toast('无横断面数据', 'error');
      const header = '起始桩号,终止桩号,类型,左路面宽,右路面宽,左横坡,右横坡,左路肩宽,右路肩宽,路肩横坡,中分带宽,左边坡率,右边坡率,边沟宽,边沟深\n';
      const rows = this.form.cross_sections.map(c =>
        `${c.start_k??''},${c.end_k??''},${c.type??'standard'},${c.road_width_left??''},${c.road_width_right??''},${c.left_super??''},${c.right_super??''},${c.shoulder_width_left??''},${c.shoulder_width_right??''},${c.shoulder_slope??''},${c.median_width??''},${c.left_side_slope??''},${c.right_side_slope??''},${c.ditch_width??''},${c.ditch_depth??''}`
      ).join('\n');
      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '横断面分段_' + (this.form.name || '道路') + '.csv';
      a.click();
    },

    importCoords() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.split(/\r?\n/);
          let count = 0;
          for (const line of lines) {
            const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (cols.length < 3) continue;
            const chainage = parseFloat(cols[0]), x = parseFloat(cols[1]), y = parseFloat(cols[2]);
            if (!isNaN(chainage) && !isNaN(x) && !isNaN(y)) {
              this.form.coord_points.push({ chainage, x, y });
              count++;
            }
          }
          window.AppStore.toast(`成功导入 ${count} 个桩号坐标`);
        };
        reader.readAsText(file);
      };
      input.click();
    },
    exportCoords() {
      if (!this.form.coord_points.length) return window.AppStore.toast('无中桩坐标数据', 'error');
      const header = '桩号,X,Y\n';
      const rows = this.form.coord_points.map(c =>
        `${c.chainage??''},${c.x??''},${c.y??''}`
      ).join('\n');
      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '坐标法_' + (this.form.name || '道路') + '.csv';
      a.click();
    },

    // ====== 断链设置 导入/导出 ======
    importChain() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,.txt';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.split(/\r?\n/);
          let count = 0;
          for (const line of lines) {
            const cols = line.split(/[,\t ]+/).map(s => s.trim()).filter(Boolean);
            if (cols.length < 2) continue;
            const chain_before = parseFloat(cols[0]);
            const chain_after = parseFloat(cols[1]);
            if (!isNaN(chain_before) && !isNaN(chain_after)) {
              this.form.broken_chains.push({ chain_before, chain_after });
              count++;
            }
          }
          window.AppStore.toast(`成功导入 ${count} 个断链设置`);
        };
        reader.readAsText(file);
      };
      input.click();
    },
    exportChain() {
      if (!this.form.broken_chains.length) return window.AppStore.toast('无断链数据', 'error');
      const header = '断链前桩号,断链后桩号\n';
      const rows = this.form.broken_chains.map(c =>
        `${c.chain_before??''},${c.chain_after??''}`
      ).join('\n');
      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '断链设置_' + (this.form.name || '道路') + '.csv';
      a.click();
    },

    // ====== 整条道路数据 导入/导出 ======
    exportRoadData(r) {
      const exportData = {
        name: r.name,
        description: r.description,
        alignment_method: r.alignment_method,
        start_chainage: r.start_chainage,
        start_x: r.start_x,
        start_y: r.start_y,
        start_az: r.start_az,
        elements: r.elements || [],
        jd_points: r.jd_points || [],
        coord_points: r.coord_points || [],
        vertical_curves: r.vertical_curves || [],
        broken_chains: r.broken_chains || [],
        cross_sections: r.cross_sections || []
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '道路数据_' + (r.name || '未命名') + '.json';
      a.click();
    },
    importRoadData() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = async e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
          try {
            const data = JSON.parse(ev.target.result);
            if (!data.alignment_method) throw new Error('无效的道路数据文件');
            
            this.saving = true;
            const payload = {
              project_id: this.project.id,
              name: data.name || '导入的道路',
              description: data.description || '',
              alignment_method: data.alignment_method || 'JD',
              start_chainage: data.start_chainage ?? null,
              start_x: data.start_x ?? null,
              start_y: data.start_y ?? null,
              start_az: data.start_az ?? null,
              elements: data.elements || [],
              jd_points: data.jd_points || [],
              coord_points: data.coord_points || [],
              vertical_curves: data.vertical_curves || [],
              broken_chains: data.broken_chains || [],
              cross_sections: data.cross_sections || []
            };

            const { data: inserted, error } = await sb.from('roads').insert(payload).select().single();
            if (error) throw error;
            
            this.roads.push(inserted);
            window.AppStore.toast('道路数据导入成功', 'success');
          } catch (err) {
            window.AppStore.toast('导入失败: ' + err.message, 'error');
          } finally {
            this.saving = false;
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    async load() {
      this.loading = true;
      const { data } = await sb.from('roads').select('*').eq('project_id', this.project.id).order('created_at');
      this.roads = data || [];
      this.loading = false;
    },
    openAdd() {
      this.editTarget = null;
      this.activeTab = 'horizontal';
      const defaultTpl = { road_width_left:'', road_width_right:'', crown_slope:'', lane_count:'', shoulder_width_left:'', shoulder_width_right:'', shoulder_slope:'', median_width:'', fill_slope:'', cut_slope:'', ditch_width:'', ditch_depth:'' };
      this.form = { 
        name: '', description: '', alignment_method: 'JD',
        start_chainage: '', start_x: '', start_y: '', start_az: '',
        elements: [], jd_points: [], coord_points: [], vertical_curves: [], broken_chains: [], 
        cross_sections: []
      };
      this.showForm = true;
    },
    openEdit(r) {
      this.editTarget = r;
      this.activeTab = 'horizontal';
      const defaultTpl = { road_width_left:'', road_width_right:'', crown_slope:'', lane_count:'', shoulder_width_left:'', shoulder_width_right:'', shoulder_slope:'', median_width:'', fill_slope:'', cut_slope:'', ditch_width:'', ditch_depth:'' };
      this.form = { 
        name: r.name, description: r.description||'', alignment_method: r.alignment_method||'JD',
        start_chainage: r.start_chainage ?? '', start_x: r.start_x ?? '', start_y: r.start_y ?? '', start_az: r.start_az ?? '',
        elements: JSON.parse(JSON.stringify(r.elements||[])), 
        jd_points: JSON.parse(JSON.stringify(r.jd_points||[])), 
        coord_points: JSON.parse(JSON.stringify(r.coord_points||[])), 
        vertical_curves: JSON.parse(JSON.stringify(r.vertical_curves||[])), 
        broken_chains: JSON.parse(JSON.stringify(r.broken_chains||[])),
        cross_sections: JSON.parse(JSON.stringify(r.cross_sections||[]))
      };
      this.showForm = true;
    },
    async saveRoad() {
      this.saving = true;

      // 参数异常检测 (JD法)
      if (this.form.alignment_method === 'JD') {
        for (let i = 0; i < this.form.jd_points.length; i++) {
          const jd = this.form.jd_points[i];
          const r = parseFloat(jd.r) || 0;
          const ls1 = parseFloat(jd.ls1) || 0;
          const ls2 = parseFloat(jd.ls2) || 0;
          if (r < 0 || ls1 < 0 || ls2 < 0) {
            window.AppStore.toast(`第 ${i+1} 个交点 [${jd.code||'未命名'}] 错误：半径或缓和曲线长度不能为负数！`, 'error');
            this.saving = false; return;
          }
          if (r === 0 && (ls1 > 0 || ls2 > 0)) {
            window.AppStore.toast(`第 ${i+1} 个交点 [${jd.code||'未命名'}] 错误：半径为 0 (直线段) 时不能设置缓和曲线长度！`, 'error');
            this.saving = false; return;
          }
        }
      }

      const cleanNum = v => (v === '' || v === null || v === undefined || isNaN(parseFloat(v)) ? null : parseFloat(v));

      const payload = {
        project_id: this.project.id,
        name: this.form.name,
        description: this.form.description,
        alignment_method: this.form.alignment_method,
        start_chainage: cleanNum(this.form.start_chainage),
        start_x: cleanNum(this.form.start_x),
        start_y: cleanNum(this.form.start_y),
        start_az: cleanNum(this.form.start_az),
        elements: this.form.elements.map(e => ({...e, length: cleanNum(e.length), r1: cleanNum(e.r1), r2: cleanNum(e.r2)})),
        jd_points: this.form.jd_points.map(p => ({...p, x: cleanNum(p.x), y: cleanNum(p.y), r: cleanNum(p.r), ls1: cleanNum(p.ls1), ls2: cleanNum(p.ls2)})),
        coord_points: this.form.coord_points.map(p => ({chainage: cleanNum(p.chainage), x: cleanNum(p.x), y: cleanNum(p.y)})),
        vertical_curves: this.form.vertical_curves.map(v => ({chainage: cleanNum(v.chainage), h: cleanNum(v.h), r: cleanNum(v.r), l: cleanNum(v.l)})),
        broken_chains: this.form.broken_chains.map(b => ({chain_before: cleanNum(b.chain_before), chain_after: cleanNum(b.chain_after)})),
        cross_sections: this.form.cross_sections.map(c => ({type: c.type || 'standard', start_k: cleanNum(c.start_k), end_k: cleanNum(c.end_k), road_width_left: cleanNum(c.road_width_left), road_width_right: cleanNum(c.road_width_right), left_super: cleanNum(c.left_super), right_super: cleanNum(c.right_super), shoulder_width_left: cleanNum(c.shoulder_width_left), shoulder_width_right: cleanNum(c.shoulder_width_right), shoulder_slope: cleanNum(c.shoulder_slope), median_width: cleanNum(c.median_width), left_side_slope: cleanNum(c.left_side_slope), right_side_slope: cleanNum(c.right_side_slope), ditch_width: cleanNum(c.ditch_width), ditch_depth: cleanNum(c.ditch_depth)}))
      };
      
      if (this.editTarget) {
        const { error } = await sb.from('roads').update(payload).eq('id', this.editTarget.id);
        if (!error) { Object.assign(this.editTarget, payload); window.AppStore.toast('更新成功', 'success'); }
        else window.AppStore.toast('更新失败: ' + error.message, 'error');
      } else {
        const { data, error } = await sb.from('roads').insert(payload).select().single();
        if (!error) { this.roads.push(data); window.AppStore.toast('添加成功', 'success'); }
        else window.AppStore.toast('添加失败: ' + (error.message.includes('relation "roads" does not exist') ? '数据库 roads 表未创建' : error.message), 'error');
      }
      this.saving = false; this.showForm = false;
    },
    async delRoad(r) {
      if (!confirm('确认删除道路「' + r.name + '」？')) return;
      const { error } = await sb.from('roads').delete().eq('id', r.id);
      if (!error) {
        this.roads.splice(this.roads.indexOf(r), 1);
        window.AppStore.toast('已删除', 'info');
      }
    },
    openCompute(r) {
      this.editTarget = r;
      this.activeTab = 'compute';
      this.computeResult = [];
      this.alignTx = 0; this.alignTy = 0; this.alignScale = 1;
      // 预填起止桩号
      const vpis = r.vertical_curves || [];
      const jds = r.jd_points || [];
      if (vpis.length >= 2) {
        const ks = vpis.map(v => parseFloat(v.chainage)).filter(k => !isNaN(k));
        this.compute.startK = Math.min(...ks);
        this.compute.endK = Math.max(...ks);
      }
      // 复用 openEdit 确保 form 有数据
      this.openEdit(r);
      this.activeTab = 'compute'; // openEdit 会重置 tab，再覆盖一次
    },
    formatK(k) {
      // 将数字桂号展示为 K0+000 格式
      const n = Math.round(k);
      const km = Math.floor(n / 1000);
      const m = n % 1000;
      return `${km}+${String(m).padStart(3, '0')}`;
    },
    async runCompute() {
      if (!this.editTarget) return;
      const opts = {
        startK: this.compute.startK,
        endK: this.compute.endK,
        interval: this.compute.interval || 20
      };
      if (opts.startK === '' || opts.endK === '') {
        return window.AppStore.toast('请输入起始和终止桩号', 'error');
      }
      this.computing = true;
      this.computeResult = [];
      // 稍微延迟以让 UI 更新
      await new Promise(r => setTimeout(r, 30));
      try {
        const result = window.RoadMath.computeStakeTable(this.editTarget, opts);
        if (result && result.error) {
          window.AppStore.toast(result.error, 'error');
        } else {
          this.computeResult = result || [];
          window.AppStore.toast(`已生成 ${this.computeResult.length} 个桩号的坐标表`, 'success');
        }
      } catch (e) {
        window.AppStore.toast('计算失败: ' + e.message, 'error');
      } finally {
        this.computing = false;
      }
    },
    exportComputeResult() {
      if (!this.computeResult.length) return;
      const header = '桩号,中桩X,中桩Y,设计高程H,方位角,左边桩X,左边桩Y,左边桩H,右边桩X,右边桩Y,右边桩H';
      const rows = this.computeResult.map(r =>
        [r.chainage, r.x??'', r.y??'', r.h??'', r.azimuth??'', r.left_x??'', r.left_y??'', r.left_h??'', r.right_x??'', r.right_y??'', r.right_h??''].join(',')
      );
      const csv = '\uFEFF' + header + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '逐桩坐标_' + (this.editTarget?.name || '道路') + '.csv';
      a.click();
    },
    // 导出单条道路完整设计数据（JSON）
    exportRoadData(road) {
      const data = {
        _type: 'road_design',
        _version: 1,
        _exported: new Date().toISOString(),
        ...road
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '道路_' + road.name + '.json';
      a.click();
      window.AppStore.toast('道路数据已导出', 'success');
    },
    // 导入道路JSON文件
    importRoadData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (data._type !== 'road_design') {
            return window.AppStore.toast('文件格式不正确，请导入道路设计JSON文件', 'error');
          }
          // 去除id、project_id等字段，新建一条道路
          const { id, _type, _version, _exported, project_id, created_at, updated_at, ...roadData } = data;
          roadData.project_id = this.project.id;
          roadData.name = roadData.name + '_导入';
          const { error } = await sb.from('roads').insert([roadData]);
          if (error) throw error;
          window.AppStore.toast('道路导入成功', 'success');
          await this.loadRoads();
        } catch (err) {
          window.AppStore.toast('导入失败：' + err.message, 'error');
        }
      };
      input.click();
    },
    // ---- 平曲线 Canvas 预览 ----
    drawAlignment() {
      const canvas = this.$refs.alignCvs;
      if (!canvas) return;
      const rows = this.computeResult;
      if (!rows.length) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
      // 网格
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
      for (let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for (let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      // 收集有效中桩坐标
      const pts = rows.filter(r=>r.x!=null&&r.y!=null).map(r=>({x:+r.x,y:+r.y,ch:r.chainage}));
      if (!pts.length) return;
      const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const pad=50;
      const sc = Math.min((W-pad*2)/(maxY-minY||1),(H-pad*2)/(maxX-minX||1));
      const tx = pad - minY*sc;
      const ty = H - pad + minX*sc;
      const tc = (x,y)=>[y*sc+tx, ty-x*sc];
      // 画中桩线
      ctx.beginPath();
      pts.forEach((p,i)=>{ const [cx,cy]=tc(p.x,p.y); i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy); });
      ctx.strokeStyle='#34d399'; ctx.lineWidth=2.5; ctx.stroke();
      // 画左右边桩
      const drawEdge=(kx,ky,color)=>{
        const ep=rows.filter(r=>r[kx]!=null&&r[ky]!=null).map(r=>({x:+r[kx],y:+r[ky]}));
        if(ep.length<2)return;
        ctx.beginPath();
        ep.forEach((p,i)=>{ const [cx,cy]=tc(p.x,p.y); i===0?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy); });
        ctx.strokeStyle=color; ctx.lineWidth=1; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
      };
      drawEdge('left_x','left_y','#60a5fa');
      drawEdge('right_x','right_y','#f97316');
      // 标注桩号（每10个点一次）
      ctx.font='10px monospace'; ctx.textAlign='center';
      pts.filter((_,i)=>i%Math.max(1,Math.floor(pts.length/15))===0).forEach(p=>{
        const [cx,cy]=tc(p.x,p.y);
        ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fillStyle='#34d399'; ctx.fill();
        ctx.fillStyle='#94a3b8';
        const ch=p.ch; ctx.fillText('K'+Math.floor(ch/1000)+'+'+(ch%1000).toString().padStart(3,'0'),cx,cy-8);
      });
      // 图例
      ctx.font='12px sans-serif'; ctx.textAlign='left';
      ctx.fillStyle='#34d399'; ctx.fillText('— 中桩',10,20);
      ctx.fillStyle='#60a5fa'; ctx.fillText('— 左边桩',10,36);
      ctx.fillStyle='#f97316'; ctx.fillText('— 右边桩',10,52);
      // 道路名称
      ctx.fillStyle='#e2e8f0'; ctx.font='bold 13px sans-serif'; ctx.textAlign='right';
      ctx.fillText(this.editTarget?.name||'',W-10,20);
    },
    onAlignWheel(e) {
      const canvas=this.$refs.alignCvs; if(!canvas) return;
      this.drawAlignment();
    },
    onAlignMouseDown(e) { this.alignDrag=true; this.alignLastX=e.clientX; this.alignLastY=e.clientY; },
    onAlignMouseMove(e) {
      if(!this.alignDrag) return;
      this.alignLastX=e.clientX; this.alignLastY=e.clientY;
    },
    exportAlignmentPng() {
      const canvas=this.$refs.alignCvs; if(!canvas) return;
      const a=document.createElement('a');
      a.href=canvas.toDataURL('image/png');
      a.download='平曲线_'+(this.editTarget?.name||'道路')+'.png';
      a.click();
    }
  }
};
