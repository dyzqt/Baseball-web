# 棒球入门训练静态网站

这是一个基于 MkDocs Material 的静态网站，用来介绍棒球基础知识和入门训练方法。

## 本地运行

安装依赖：

```bash
pip install -r requirements.txt
```

启动预览：

```bash
mkdocs serve
```

访问：

```text
http://127.0.0.1:8000/
```

## 顶部导航

站点现在只保留和棒球内容相关的分组：

- 首页
- 讲解
- 训练
- 时刻
- 其他

其中“讲解”放棒球规则和基础说明，“时刻”专门放图片，“其他”是预留分类。

顶部搜索已经启用，可以直接搜索全站页面，结果会一条条列出来。

## 导航示例

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

## 路由规则

`mkdocs.yml` 已设置：

```yaml
use_directory_urls: true
```

构建后的文章地址会是目录式路径，例如：

```text
/baseball-training/
```

不会显示成：

```text
/baseball-training.html
```

## 如何新增文章

1. 在 `docs/` 下新建 Markdown 文件。
2. 写入标题和正文。
3. 把新文件加到 `mkdocs.yml` 的 `nav` 里。

例如：

- `docs/notes/rules.md`
- `docs/other/index.md`
- `docs/gallery/index.md`

## 时刻

如果要增加一组独立展示的图片，把文件放到 `docs/gallery/`。

- 页面本身只保留一个一级标题
- 文件名首字是 `大` 的图片会比其他图片稍大一点
- 其他图片会自动排成紧密的响应式多栏布局
- 这个模块和普通文章里的图片是分开的

## 页面与文件的关系

- `docs/` 是内容根目录
- `docs/*.md` 可以直接成为页面
- `docs/子文件夹/` 用来做内容分组或放资源
- `nav` 决定网站菜单怎么显示

## 文章模板

复制下面这段到你的文章里：

````markdown
# 文章标题

## 摘要

用 2-3 句话说明这篇文章解决什么问题，适合什么时候阅读。

## 背景

- 为什么要记录这个主题
- 遇到了什么问题
- 适用范围是什么

## 核心内容

### 小节一

正文内容。

### 小节二

正文内容。

## 示例

```bash
# 示例命令
example command
```

## 图片和视频

单张图片：

```markdown
![图片说明](../assets/images/example.jpg)
```

多张图片自适应排列：

```html
<div class="media-grid">
  <figure>
    <img src="../assets/images/example-1.jpg" alt="第一张图片说明">
    <figcaption>第一张图片说明</figcaption>
  </figure>
  <figure>
    <img src="../assets/images/example-2.jpg" alt="第二张图片说明">
    <figcaption>第二张图片说明</figcaption>
  </figure>
</div>
```

本地视频：

```html
<video class="media-video" controls>
  <source src="../assets/videos/example.mp4" type="video/mp4">
</video>
```
````

## 构建（上传）

```bash
mkdocs gh-deploy
```