'use strict';

const LEVEL_RULES = [
  { level: 'international', label: '国际级', re: /国际|全球|世界/ },
  { level: 'provincial',    label: '省级',   re: /省/ },
  { level: 'city',          label: '市级',   re: /市/ },
  { level: 'school',        label: '校级',   re: /校/ },
  { level: 'national',      label: '国家级', re: /全国/ }
];

const LEVEL_ORDER = { international: 0, national: 1, provincial: 2, city: 3, school: 4 };

function parseHonor(honorText) {
  const yearMatch = honorText.match(/^(\d{4})\s*年/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  let level = 'school';
  let label = '校级';
  for (const rule of LEVEL_RULES) {
    if (rule.re.test(honorText)) {
      level = rule.level;
      label = rule.label;
      break;
    }
  }

  const title = honorText.replace(/^\d{4}\s*年\s*/, '');
  return { year, level, label, title };
}

hexo.extend.generator.register('timeline', function () {
  const data = this.locals.get('data') || {};
  const members = Array.isArray(data.members) ? data.members : [];

  const events = [];
  members.forEach((member) => {
    if (!Array.isArray(member.honors)) return;
    member.honors.forEach((honorText) => {
      const parsed = parseHonor(honorText);
      events.push({
        year: parsed.year,
        level: parsed.level,
        label: parsed.label,
        title: parsed.title,
        member: member.name,
        role: member.role
      });
    });
  });

  events.sort((a, b) => {
    if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
    return (LEVEL_ORDER[a.level] || 5) - (LEVEL_ORDER[b.level] || 5);
  });

  const groups = {};
  events.forEach((ev) => {
    const key = ev.year ? String(ev.year) : '更早';
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  });

  const years = Object.keys(groups).sort((a, b) => {
    if (a === '更早') return 1;
    if (b === '更早') return -1;
    return parseInt(b) - parseInt(a);
  });

  const timelineGroups = years.map((year) => ({
    year,
    items: groups[year]
  }));

  return {
    path: 'timeline/index.html',
    layout: ['timeline'],
    data: {
      title: '竞赛时间线',
      groups: timelineGroups
    }
  };
});
