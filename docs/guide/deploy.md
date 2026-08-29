# 本地预览与发布

## 安装依赖

建议使用 Python 3.10 或更高版本。

```bash
pip install -r requirements.txt
```

如果没有使用 `requirements.txt`，也可以直接安装：

```bash
pip install mkdocs-material
```

## 本地预览

在项目根目录运行：

```bash
mkdocs serve
```

然后访问：

```text
http://127.0.0.1:8000
```

## 构建静态文件

```bash
mkdocs build
```

构建产物会生成在：

```text
site/
```

## 发布到 GitHub Pages

本项目已经包含 GitHub Actions 配置：

```text
.github/workflows/deploy.yml
```

你只需要：

1. 创建 GitHub 仓库。
2. 把当前项目推送到仓库。
3. 在 GitHub 仓库中进入 `Settings` → `Pages`。
4. `Source` 选择 `GitHub Actions`。
5. 推送到 `main` 分支后等待自动部署完成。

## 修改站点地址

发布到 GitHub Pages 时，把 `mkdocs.yml` 中这些字段填成你自己的真实地址：

```yaml
site_url: 你的 GitHub Pages 地址
repo_name: 你的用户名/你的仓库名
repo_url: 你的 GitHub 仓库地址
```

本地预览地址始终是 `http://127.0.0.1:8000/`，不会带仓库名。
