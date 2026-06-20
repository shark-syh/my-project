'use strict';

hexo.extend.generator.register('members', function () {
  const data = this.locals.get('data') || {};
  const members = Array.isArray(data.members) ? data.members : [];

  return members
    .filter((member) => member.slug)
    .map((member) => ({
      path: `members/${member.slug}/index.html`,
      layout: ['member'],
      data: Object.assign({}, member, {
        layout: 'member',
        title: `${member.name} - 成员主页`
      })
    }));
});
