# 贵阳市第二中学科技先锋队官网

基于 Hexo 7.3 的静态站点，用于展示贵阳二中科技先锋队简介、成员荣誉墙、
竞赛时间线与照片墙，内置管理后台支持在线编辑成员、照片故事与统计数据。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:4002` 查看站点。

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

然后把头像图片放到 `source/assets/images/avatars/`，并让 `avatar` 路径和文件名一致。
`slug` 会成为个人页地址，例如上面的成员页面是 `/members/new-member/`。

## 添加照片

照片墙会自动扫描 `source/assets/gallery/` 里的 `.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.avif`
图片。把新照片放进去后运行 `npm run build` 或 `npm run dev` 即可看到更新。

每张照片可以附带一段故事文字，点击照片进入灯箱后，管理员可在线编辑保存。

## 管理后台

导航栏点击锁图标，使用管理员密码登录。登录后可：

- 在线编辑/添加/删除成员
- 编辑照片墙中每张照片的故事
- 点击首页统计数据直接修改数值，双击重置为自动计算
- 在竞赛时间线页面手动添加/编辑/删除比赛记录

管理员密码由项目管理员通过 `scripts/manage-passwords.js` 管理。
