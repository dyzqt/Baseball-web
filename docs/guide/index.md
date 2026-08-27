# 快速开始

这个目录用于说明如何维护知识库。

## 你以后主要会做什么？

日常使用时，通常只需要：

1. 在 `docs/notes/` 目录添加 Markdown 文章。
2. 修改 `mkdocs.yml` 里的 `nav` 导航。
3. 提交并推送到 GitHub。

如果已经配置好 GitHub Pages，推送后会自动发布。

## 目录说明

```text
.
├─ docs/
│  ├─ index.md                 # 首页
│  ├─ guide/                   # 使用说明
│  ├─ notes/                   # 知识库文章
│  ├─ templates/               # 文章模板
│  └─ assets/                  # 图片、样式等资源
├─ mkdocs.yml                  # MkDocs 配置文件
└─ .github/workflows/deploy.yml # GitHub Pages 自动部署
```

## 推荐分类方式

你可以按主题拆分目录，例如：

```text
docs/notes/
├─ frontend/
├─ backend/
├─ database/
├─ tools/
├─ reading/
└─ projects/
```

然后在 `mkdocs.yml` 中配置导航。
