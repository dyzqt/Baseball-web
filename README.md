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
http://127.0.0.1:8000
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

## 添加第一篇文章

现在第一篇文章已经放在：

```text
docs/baseball-training.md
```

并且已经在 `mkdocs.yml` 的 `nav` 中添加：

```yaml
nav:
  - 首页: index.md
  - 第一篇：棒球入门训练: baseball-training.md
```

## 以后添加新文章

1. 在 `docs/` 下新建 Markdown 文件，例如：

   ```text
   docs/catch-and-throw.md
   ```

2. 写入文章标题和正文：

   ```markdown
   # 传接球基础训练

   这里写文章内容。
   ```

3. 打开 `mkdocs.yml`，在 `nav` 中添加入口：

   ```yaml
   nav:
     - 首页: index.md
     - 第一篇：棒球入门训练: baseball-training.md
     - 传接球基础训练: catch-and-throw.md
   ```

4. 本地预览确认无误后提交并推送。

## 构建

```bash
mkdocs build --strict
```
