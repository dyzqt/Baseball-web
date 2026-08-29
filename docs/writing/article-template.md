# 文章模板

复制下面内容，新建到 `docs/notes/你的文章名.md` 即可。

````markdown
# 文章标题

## 摘要

用 2-3 句话说明这篇文章解决什么问题，适合什么时候阅读。

## 分类位置

说明这篇文章属于哪个目录，例如：

- `notes/basics/`：基础内容
- `notes/training/`：训练计划
- `notes/gear/`：装备介绍

## 背景

说明背景信息：

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

横向轮播式展示：

```html
<div class="media-carousel">
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

在线视频：

```html
<iframe
  class="media-frame"
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="视频标题"
  allowfullscreen>
</iframe>
```

## 标签

如果需要，可以在文章里自己加一行标签说明：

```markdown
**标签：** 新手 / 传球 / 基础
```

## 常见问题

### 问题一

回答内容。

## 总结

- 关键点一
- 关键点二
- 关键点三

## 参考资料

- [参考链接标题](https://example.com)
````