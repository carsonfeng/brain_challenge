# Dobble Cards Generator

互动式Dobble卡牌生成器，可以创建自定义的Dobble/Spot It风格卡片。

![Dobble卡片示例](public/images/preview.jpg)

## 功能特点

- 支持多种卡片配置（3-8个符号/卡片）
- 上传自定义图片或使用默认图像
- 美观的卡片布局与随机分布
- 预览卡片效果
- 导出为PNG图像或ZIP文件
- 优化的图像分布算法，避免重叠
- 支持中文和多种卡片样式

## 如何使用

1. 选择您想要的配置（每张卡片上的符号数量）
2. 上传您自己的图片或使用默认图像
3. 点击"预览"查看效果
4. 点击"生成卡片"创建可下载的卡片

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建项目
npm run build

# 部署到GitHub Pages
npm run deploy
```

## 部署

此项目已配置为使用GitHub Pages自动部署。推送到主分支后，更改将自动部署到: 
https://[你的GitHub用户名].github.io/brain_challenge/

## 技术栈

- React
- TypeScript 
- HTML Canvas
- Ant Design

## 致谢

感谢所有原始Dobble游戏的灵感。
