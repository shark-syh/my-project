'use strict';

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

hexo.extend.generator.register('gallery', function () {
  const galleryDir = path.join(this.source_dir, 'assets', 'gallery');
  let files = [];

  if (fs.existsSync(galleryDir)) {
    files = fs.readdirSync(galleryDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }

  const photos = files.map((file) => ({
    src: `/assets/gallery/${file}`
  }));

  return {
    path: 'gallery/index.html',
    layout: ['gallery'],
    data: {
      title: '照片墙',
      photos
    }
  };
});
