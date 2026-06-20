# 贵阳市第二中学科技先锋队官网 demo

这是一个基于 Hexo 的静态官网 demo，用于展示贵阳二中科技先锋队简介、成员卡片、个人荣誉墙与照片墙。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:4000` 查看站点。

## 生成静态文件

```bash
npm run build
```

生成结果会输出到 `public/`。

## 新增成员

成员数据集中在 `source/_data/members.yml`。新增成员时，在文件末尾追加一段成员资料：

```yaml
- name: 新成员姓名
  slug: new-member
  role: 所属社团或方向
  grade: 2026 级
  avatar: /assets/images/avatars/new-member.webp
  summary: 一句话简介，说明 TA 擅长什么、做过什么。
  honors:
    - 2026 年某某比赛一等奖
    - 2025 年某某活动优秀成员
  projects:
    - 项目名称 A
    - 项目名称 B
  quote: 成员的一句话格言或展示语。
```

然后把头像图片放到 `source/assets/images/avatars/`，并让 `avatar` 路径和文件名一致。`slug` 会成为个人页地址，例如上面的成员页面是 `/members/new-member/`。

## 添加照片

照片墙会自动扫描 `source/assets/gallery/` 里的 `.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.avif` 图片。把新照片放进去后运行 `npm run build` 或 `npm run dev` 即可看到更新。
