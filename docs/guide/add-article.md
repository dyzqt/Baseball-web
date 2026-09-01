# 如何添加文章

后续维护时，主要就是把文章放进顶部的四个分组里。

## 1. 先选分类

- 首页：站点入口
- 讲解：棒球规则和基础说明
- 训练：训练方法、动作拆解、训练计划
- 时刻：图片展示
- 其他：预留分类

## 2. 新建文章

常见位置示例：

```text
docs/index.md
docs/baseball-training.md
docs/notes/rules.md
docs/gallery/index.md
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
  - 时刻: gallery/index.md
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

## 6. 时刻

如果需要一组独立的图片展示页，直接把图片放到 `docs/gallery/`，再维护 `docs/gallery/index.md`。

- 页面只保留一个一级标题
- 文件名首字是 `大` 的图片会稍大一点
- 其他图片会自动紧密排成多栏布局
- 这个模块和普通文章里的插图是分开的

## 7. 发布

提交并推送到 GitHub 后，GitHub Actions 会自动构建并发布到 GitHub Pages。
