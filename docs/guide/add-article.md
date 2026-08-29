# 如何添加文章

后续维护时，主要就是把文章放进顶部的四个分组里。

## 1. 先选分类

- 首页：站点入口
- 讲解：棒球规则和基础说明
- 训练：训练方法、动作拆解、训练计划
- 其他：预留分类

## 2. 新建文章

常见位置示例：

```text
docs/index.md
docs/baseball-training.md
docs/notes/rules.md
docs/other/index.md
docs/guide/index.md
docs/guide/add-article.md
docs/guide/deploy.md
docs/writing/article-template.md
```

如果某个分组下面还有很多文章，可以继续做子目录。

## 3. 加到导航

```yaml
nav:
  - 首页: index.md
  - 讲解:
      - 棒球规则: notes/rules.md
  - 训练:
      - 第一篇：棒球入门训练: baseball-training.md
  - 其他: other/index.md
```

## 4. 搜索怎么用

顶部搜索已经启用，会自动搜索全站页面，结果会一条条列出来。只要页面被 MkDocs 构建出来，就会被搜索到。

## 5. 本地预览

```bash
mkdocs serve
```

浏览器打开：

```text
http://127.0.0.1:8000
```

## 6. 发布

提交并推送到 GitHub 后，GitHub Actions 会自动构建并发布到 GitHub Pages。