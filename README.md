# 分享到微信 (Share to WeChat)

将 Obsidian 笔记一键分享到微信，保留 Markdown 格式与内部链接。

## 功能

- **分享到微信** — 手机端调用系统分享面板，选择微信发送
- **复制笔记** — 桌面端自动复制到剪贴板，在微信中粘贴即可
- **保留格式** — 粗体、斜体、列表、代码块、标题等 Markdown 标记原样保留
- **解析链接** — `[[页面名]]` 转为可读文字，`![[图片.png]]` 转为 `[图片: xxx]`
- **自动清理** — 去除 YAML Frontmatter，压缩多余空行

## 安装

### 方法一：通过 BRAT 安装（推荐）

1. 安装 [BRAT](obsidian://show-plugin?id=BRAT) 插件
2. 添加仓库地址：`你的 GitHub 用户名/obsidian-share-wechat`
3. 启用本插件

### 方法二：手动安装

1. 从 Releases 下载 `main.js`、`manifest.json`、`styles.css`
2. 复制到 `.obsidian/plugins/obsidian-share-wechat/`
3. 启用插件

## 使用

| 平台 | 操作 |
|------|------|
| Android 手机 | 打开笔记 → 点击左侧工具栏分享图标 → 系统分享菜单选择微信 |
| 桌面端 | 打开笔记 → 点击分享图标 → 自动复制到剪贴板 → 在微信粘贴 |
| 任意平台 | 命令面板执行"分享到微信"或"复制笔记（微信分享格式）" |

## 设置

| 选项 | 说明 | 默认 |
|------|------|------|
| 添加标题 | 在分享内容顶部添加笔记标题 | 开启 |
| 去除 Frontmatter | 移除 YAML 元数据区 | 开启 |
| 解析内部链接 | `[[链接]]` 转为可读文字 | 开启 |
| 添加来源标记 | 末尾添加 "📝 来自 Obsidian" | 关闭 |

## 示例

分享前：
```markdown
---
date: 2024-01-01
tags: [日常, 日记]
---

# 我的日记

今天学习了 **Obsidian 插件开发**。

- 配置 esbuild
- 编写 TypeScript
- 测试构建

参考了 [[Obsidian Plugin API|官方文档]] 和 ![[架构图.png]]
```

分享到微信后：
```
我的日记

今天学习了 **Obsidian 插件开发**。

- 配置 esbuild
- 编写 TypeScript
- 测试构建

参考了 官方文档 和 [图片: 架构图.png]
```

## 技术说明

- 纯前端实现，**无需网络连接**
- 手机端使用 Web Share API (`navigator.share()`) 调用系统分享
- 桌面端使用 Clipboard API 自动复制
- 不收集任何用户数据

## 开发

```bash
git clone https://github.com/你的用户名/obsidian-share-wechat.git
cd obsidian-share-wechat
npm install
npm run build    # 生产构建
npm run dev      # 开发模式（watch）
```

## 发布

1. 更新 `manifest.json` 版本号
2. 执行 `npm run build`
3. 提交 GitHub 并打 tag（如 `1.0.0`）
4. 创建 GitHub Release 并上传 `main.js`、`manifest.json`、`styles.css`
