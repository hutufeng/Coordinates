# 坐标计算 — 专业 RTK 测量工具 (PWA)

> 一站式 RTK 坐标计算、道路设计、放样导出的 Web 应用，支持离线使用、PWA 安装、手机访问。

**在线体验：** 部署到 Cloudflare Pages 后即可通过自定义域名访问

---

## ✨ 功能概览

| 模块 | 功能 |
|------|------|
| **点库** | 增删改查、分组管理、CSV 批量导入/导出 |
| **线设计** | 折线编辑、CSV 导入成线、导出 |
| **面设计** | 多边形/坡面/离散点、面积计算、面积分割 |
| **道路设计** | 交点法/线元法/坐标法 + 纵断面 + 横断面 + 断链 + 逐桩计算 + Canvas 预览 |
| **坐标计算** | 正算/反算/面积/偏距/导线平差/前方交会/后方交会/距离交会/高斯投影（9大功能）|
| **坐标换算** | 平移 / 四参数 / 七参数(Bursa-Wolf)，可应用到放样坐标系 |
| **放样** | 点库放样 / 线库放样 / 面放样(方格网+IDW) / 道路放样(中桩+边桩+偏移桩) |
| **图形预览** | 2D Canvas 平面预览、缩放平移、PNG/DXF 导出 |
| **工程管理** | 多工程切换、整体 JSON 备份/恢复、用户管理、注册开关 |

---

## 🚀 部署方式

### 方式一：Cloudflare Pages（推荐）

1. **Fork 或推送到 GitHub**
   ```bash
   git clone git@github.com:<your-username>/<your-repo>.git
   ```

2. **登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create**
   - 连接 GitHub 仓库：`<your-username>/<your-repo>`
   - 配置构建设置：
     - **构建命令（Build command）**：`bash build.sh`
     - **构建输出目录（Build output directory）**：`frontend`
     - **Root directory**：`/`（默认）
   - **此时先不要点击 Deploy，点击 "Save and Deploy" 后由于没有环境变量，暂不生效**

3. **配置 Supabase 环境变量**
   在部署过程页面或进入项目后的 **Settings（设置） → Environment variables（环境变量）** 中，添加以下两个变量（在你的 Supabase 项目 Settings -> API 中获取）：
   - 变量名：`SUPABASE_URL`，值：`https://xxxx.supabase.co`
   - 变量名：`SUPABASE_ANON_KEY`，值：`eyJhbG...`
   
   配置完成后，去 **Deployments（部署）** 页面点击 **Retry deployment（重新部署）**。构建脚本会自动将变量注入到前端配置中，避免了把密钥直接写在 GitHub 仓库里。

4. **绑定自定义域名（可选）**
   在 Cloudflare Pages 项目设置中添加自定义域名

### 方式二：本地开发

#### 第一步：配置 Supabase

1. 访问 [supabase.com](https://supabase.com) 注册并免费创建项目
2. 进入项目 **Settings → API**，复制：
   - `Project URL`（项目地址）
   - `anon public key`（匿名公钥）
3. 打开 `frontend/js/config.js`，将上述两项填入对应位置

#### 第二步：初始化数据库

1. 在 Supabase 控制台，进入 **SQL Editor（SQL 编辑器）**
2. 将 `supabase/schema.sql` 文件内容全部复制并执行

#### 第三步：启动本地服务器

```powershell
# 进入前端目录
cd frontend

# 启动本地服务器（无需任何安装）
python -m http.server 3000
```

**桌面访问：** `http://localhost:3000`

**手机访问（需同一 WiFi）：** `http://[电脑局域网IP]:3000`

> 提示：查看本机 IP 可运行 `ipconfig` 命令，找到"无线局域网"的 IPv4 地址

---

## 📁 项目目录结构

```
Coordinates/
├── .gitignore                   # Git 忽略规则
├── README.md                    # 项目说明
├── frontend/                    # 前端 PWA（CF Pages 输出目录）
│   ├── index.html               # 主入口页面
│   ├── manifest.json            # PWA 安装配置
│   ├── sw.js                    # Service Worker（离线缓存 v48）
│   ├── _headers                 # Cloudflare Pages 响应头配置
│   ├── _redirects               # Cloudflare Pages SPA 路由回退
│   ├── css/
│   │   └── main.css             # 全局设计系统与样式
│   ├── js/
│   │   ├── config.js            # ← 填写 Supabase 配置（必须）
│   │   ├── supabase-client.js   # Supabase 客户端初始化
│   │   ├── store.js             # 全局状态管理（含坐标系偏移）
│   │   ├── app.js               # Vue 应用入口
│   │   ├── core/
│   │   │   ├── geodesy.js       # 坐标计算核心算法库
│   │   │   ├── RoadMath.js      # 道路曲线计算引擎
│   │   │   └── DxfExporter.js   # DXF 格式导出工具
│   │   └── views/
│   │       ├── Auth.js          # 登录 / 注册
│   │       ├── Dashboard.js     # 工程列表
│   │       ├── UserManagement.js # 用户管理（管理员）
│   │       ├── ProjectDetail.js # 工程详情框架（含备份导出/导入）
│   │       └── modules/
│   │           ├── PointLib.js   # 点库管理
│   │           ├── LineLib.js    # 线设计
│   │           ├── PolyLib.js    # 面设计（含面积分）
│   │           ├── RoadLib.js    # 道路设计（含平曲线预览）
│   │           ├── CoordCalc.js  # 坐标计算（9功能 + 点库选点）
│   │           ├── CoordConv.js  # 坐标换算（3种参数）
│   │           ├── StakeoutLib.js # 放样中心
│   │           └── MapPreview.js # 2D平面预览 + DXF导出
│   └── assets/
│       └── icons/               # PWA 图标
└── supabase/
    ├── schema.sql               # 数据库初始化脚本
    └── add_scatter_type.sql     # 离散点字段迁移
```

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 (CDN，无构建步骤) |
| 后端/数据库 | Supabase (PostgreSQL + Auth + RLS) |
| 部署 | Cloudflare Pages（纯静态） |
| 离线支持 | Service Worker + Cache API |
| 样式 | 原生 CSS 设计系统（暗色主题） |
| 核心算法 | 原生 JS（高斯-勒让德积分、Bursa-Wolf 模型） |

---

## 📊 功能开发进度

| 阶段 | 功能模块 | 状态 |
|------|---------|------|
| P1 | 账号管理 + 工程列表 + 用户管理 | ✅ 已完成 |
| P2 | 坐标计算（正/反算、面积、偏距、导线、3种交会、高斯投影） | ✅ 已完成 |
| P3 | 点库 / 线设计 / 面设计（含面积分） | ✅ 已完成 |
| P4 | 道路设计（3种平曲线法 + 纵/横断面 + 断链 + Canvas预览） | ✅ 已完成 |
| P5 | 放样计算（点/线/面方格网/道路中边桩） | ✅ 已完成 |
| P6 | 坐标换算（平移 / 四参数 / 七参数Bursa-Wolf） | ✅ 已完成 |
| P7 | 2D平面预览 + 工程备份 + DXF/CSV导出 | ✅ 已完成 |

---

## 📄 License

MIT
