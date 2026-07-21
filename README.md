# 人生手记 (My Life Journal)

记录人生，理解自己。

## 这是什么？

一个帮助你记录人生经历、追踪情绪变化、获得AI深度分析的私人日记应用。

所有数据存储在浏览器本地(IndexedDB)，不会上传到任何服务器。AI分析通过API调用完成，日记内容仅在分析时临时传输。

## 核心功能 (MVP v0.1)

- **自由书写日记**：极简编辑器，专注写作体验
- **课题标签系统**：人际(友情/亲情/爱情)、人生(工作/学习)、自我(情绪/认知/健身) 三大类八大课题
- **按标签筛选**：点击标签即可筛选该课题下的所有日记
- **AI情绪分析**：基于VAD三维情绪模型 + Plutchik八情绪轮的多维度分析
- **PWA支持**：手机和电脑浏览器均可使用，可添加到主屏幕，支持离线

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量文件，填入你的 DeepSeek API Key
cp .env.example .env.local
# 编辑 .env.local，将 sk-your-api-key-here 替换为真实API Key
# API Key 获取地址：https://platform.deepseek.com

# 3. 启动开发服务器
npm run dev

# 4. 浏览器打开
# http://localhost:3000
```

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 框架 | Next.js 15 + React 19 | App Router, Server Components |
| 本地存储 | Dexie.js + IndexedDB | 浏览器原生数据库 |
| 样式 | Tailwind CSS | 原子化CSS，快速开发 |
| AI分析 | DeepSeek API | 中文能力强，成本低 |
| 图表 | ECharts | 情绪趋势、进度可视化 |
| PWA | 手动配置 | Service Worker离线缓存 |
| 加密 | Web Crypto API | AES-256-GCM（v0.2启用） |

## 项目文档

详细设计文档在 `docs/` 目录下：
- [项目总览](docs/00-项目总览.md)
- [产品设计](docs/01-产品设计.md)
- [技术架构](docs/02-技术架构.md)
- [数据模型](docs/03-数据模型.md)
- [AI分析系统](docs/04-AI分析系统.md)
- [UI原型设计](docs/05-UI原型设计.md)
- [开发计划](docs/06-开发计划.md)
- [测试策略](docs/07-测试策略.md)
- [记忆模型设计](docs/记忆模型设计.md)（远景）
- [产品想法池](docs/产品想法池.md)
- [参考资料索引](docs/参考资料索引.md)

## 版本规划

| 版本 | 内容 | 状态 |
|------|------|------|
| v0.1 MVP | 日记CRUD + 标签系统 + AI分析 + PWA | 开发中 |
| v0.2 | 对话式记录 + 记忆模型三层结构 + 周度复盘Agent | 规划中 |
| v0.3+ | 多智能体系统 + 知识图谱 + 云同步 + 加密 | 规划中 |

## 许可证

MIT
