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

发布前建议修改 `mkdocs.yml` 中这些字段：

```yaml
site_url: https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY_NAME/
repo_name: YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME
repo_url: https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME
```

把 `YOUR_GITHUB_USERNAME` 和 `YOUR_REPOSITORY_NAME` 替换成你的 GitHub 用户名和仓库名。
