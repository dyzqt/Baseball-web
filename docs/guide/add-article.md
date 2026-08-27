# 如何添加文章

后续维护知识库时，你主要只需要添加 Markdown 文件。

## 1. 新建文章

在 `docs/notes/` 下新建文件，例如：

```text
docs/notes/git-basic.md
```

内容示例：

````markdown
# Git 基础

## 摘要

这篇文章记录 Git 常用命令。

## 常用命令

```bash
git status
git add .
git commit -m "update notes"
git push
```
````

## 2. 添加到导航

打开 `mkdocs.yml`，找到 `nav` 部分：

```yaml
nav:
  - 首页: index.md
  - 笔记:
      - notes/index.md
      - 示例文章: notes/example.md
```

添加你的文章：

```yaml
nav:
  - 首页: index.md
  - 笔记:
      - notes/index.md
      - 示例文章: notes/example.md
      - Git 基础: notes/git-basic.md
```

## 3. 本地预览

```bash
mkdocs serve
```

浏览器打开：

```text
http://127.0.0.1:8000
```

## 4. 发布

提交并推送到 GitHub 后，GitHub Actions 会自动构建并发布到 GitHub Pages。
