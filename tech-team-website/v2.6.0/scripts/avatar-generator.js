'use strict';

// 基于 slug 哈希确定性生成抽象几何头像 SVG

var PALETTES = [
  // 0: 原墨绿色系
  { bg: '#EAF3EF', main: '#184D47', secondary: '#26766B', accent: '#F0B43C', red: '#B53B31', light: '#FBFCF8', dark: '#184D47' },
  // 1: 蓝靛色系
  { bg: '#E8EDF5', main: '#1B3A5C', secondary: '#3A6B8C', accent: '#E8A840', red: '#C0553A', light: '#FBFCF8', dark: '#1B3A5C' },
  // 2: 紫罗兰色系
  { bg: '#F2ECF5', main: '#2D1B3E', secondary: '#7B5EA7', accent: '#D4A030', red: '#C0392B', light: '#FBFCF8', dark: '#2D1B3E' },
  // 3: 暖橙褐色系
  { bg: '#FDF5EC', main: '#5C3A1E', secondary: '#8B5E3C', accent: '#D4882A', red: '#A04030', light: '#FBFCF8', dark: '#5C3A1E' },
  // 4: 松石绿系
  { bg: '#EAF6F2', main: '#0F5C4A', secondary: '#2DAA8C', accent: '#E8A840', red: '#C0504D', light: '#FBFCF8', dark: '#0F5C4A' },
  // 5: 岩板灰蓝系
  { bg: '#EDF0F4', main: '#2C3E50', secondary: '#5D7B93', accent: '#E09E3A', red: '#B5433B', light: '#FBFCF8', dark: '#2C3E50' },
  // 6: 酒红玫瑰系
  { bg: '#F9F0F0', main: '#6B2D3E', secondary: '#A0526B', accent: '#E0A840', red: '#B5302A', light: '#FBFCF8', dark: '#6B2D3E' },
  // 7: 深海青蓝系
  { bg: '#EEF3F6', main: '#1A4A5C', secondary: '#2E86A0', accent: '#E8983A', red: '#C5443A', light: '#FBFCF8', dark: '#1A4A5C' }
];

// 简单字符串哈希
function hashCode(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return hash;
}

// 线性同余伪随机数生成器
function createRNG(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 0) / 4294967296;
  };
}

function generateAvatarSVG(name, slug) {
  var hash = hashCode(slug || name || 'default');
  var rng = createRNG(hash);

  var pid = Math.abs(hash) % PALETTES.length;
  var pal = PALETTES[pid];
  var tid = Math.abs(hash >> 2) % 3;  // 模板 0/1/2

  var title = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '头像';

  if (tid === 0) {
    // 模板 A — 几何人脸风格
    var eyeY = 186 + Math.floor(rng() * 14);
    var eyeSize = 34 + Math.floor(rng() * 10);
    var mouthY = 246 + Math.floor(rng() * 14);
    var mouthW = 72 + Math.floor(rng() * 20);
    var headX = 216 + Math.floor(rng() * 16);
    var headW = 196 + Math.floor(rng() * 16);
    var headH = 146 + Math.floor(rng() * 12);
    var circleX = 444 + Math.floor(rng() * 20);
    var circleY = 120 + Math.floor(rng() * 12);
    var circleR = 34 + Math.floor(rng() * 10);
    var topCircleR = 12 + Math.floor(rng() * 6);

    return '<svg width="640" height="440" viewBox="0 0 640 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">\n' +
      '  <title id="title">' + title + '</title>\n' +
      '  <desc id="desc">自动生成的头像。</desc>\n' +
      '  <rect width="640" height="440" fill="' + pal.bg + '"/>\n' +
      '  <rect x="60" y="54" width="520" height="332" rx="26" fill="' + pal.main + '"/>\n' +
      '  <path d="M80 300L200 170L310 250L410 180L560 300V386H80V300Z" fill="' + pal.secondary + '"/>\n' +
      '  <circle cx="' + circleX + '" cy="' + circleY + '" r="' + circleR + '" fill="' + pal.accent + '"/>\n' +
      '  <rect x="' + headX + '" y="140" width="' + headW + '" height="' + headH + '" rx="24" fill="' + pal.light + '"/>\n' +
      '  <rect x="' + (headX + 38) + '" y="' + eyeY + '" width="' + eyeSize + '" height="' + eyeSize + '" rx="10" fill="' + pal.dark + '"/>\n' +
      '  <rect x="' + (headX + headW - 76) + '" y="' + eyeY + '" width="' + eyeSize + '" height="' + eyeSize + '" rx="10" fill="' + pal.dark + '"/>\n' +
      '  <path d="M' + (headX + 66) + ' ' + mouthY + 'H' + (headX + 66 + mouthW) + '" stroke="' + pal.red + '" stroke-width="10" stroke-linecap="round"/>\n' +
      '  <path d="M320 108V82" stroke="' + pal.light + '" stroke-width="10" stroke-linecap="round"/>\n' +
      '  <circle cx="320" cy="68" r="' + topCircleR + '" fill="' + pal.accent + '"/>\n' +
      '  <path d="M' + (headX - 26) + ' 200H' + (headX + 4) + 'M' + (headX + headW + 8) + ' 200H' + (headX + headW + 34) + '" stroke="' + pal.light + '" stroke-width="14" stroke-linecap="round"/>\n' +
      '</svg>\n';

  } else if (tid === 1) {
    // 模板 B — 电路板几何风格
    var path1X = 160 + Math.floor(rng() * 16);
    var circlesCX = 426 + Math.floor(rng() * 16);
    var rectW = 236 + Math.floor(rng() * 16);
    var rectX = 200 + Math.floor(rng() * 12);

    return '<svg width="640" height="440" viewBox="0 0 640 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">\n' +
      '  <title id="title">' + title + '</title>\n' +
      '  <desc id="desc">自动生成的头像。</desc>\n' +
      '  <rect width="640" height="440" fill="' + pal.bg + '"/>\n' +
      '  <rect x="68" y="60" width="504" height="320" rx="22" fill="' + pal.dark + '"/>\n' +
      '  <rect x="110" y="106" width="420" height="230" rx="16" fill="' + pal.light + '"/>\n' +
      '  <path d="M' + path1X + ' 165L' + (path1X + 60) + ' 222L' + path1X + ' 279" stroke="' + pal.secondary + '" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>\n' +
      '  <path d="M270 282H390" stroke="' + pal.red + '" stroke-width="20" stroke-linecap="round"/>\n' +
      '  <circle cx="' + circlesCX + '" cy="168" r="22" fill="' + pal.accent + '"/>\n' +
      '  <circle cx="' + (circlesCX + 46) + '" cy="220" r="16" fill="' + pal.secondary + '"/>\n' +
      '  <circle cx="' + (circlesCX - 2) + '" cy="272" r="18" fill="' + pal.red + '"/>\n' +
      '  <path d="M' + circlesCX + ' 168L' + (circlesCX + 46) + ' 220L' + (circlesCX - 2) + ' 272" stroke="' + pal.dark + '" stroke-width="7" stroke-linecap="round"/>\n' +
      '  <rect x="' + rectX + '" y="78" width="' + rectW + '" height="16" rx="8" fill="' + pal.accent + '"/>\n' +
      '</svg>\n';

  } else {
    // 模板 C — 飞行器/折线风格
    var polyPts = '180 168L480 ' + (102 + Math.floor(rng() * 8)) + 'L350 228L312 340L268 252L180 168Z';
    var circleCX = 138 + Math.floor(rng() * 12);
    var circleCY = 118 + Math.floor(rng() * 10);

    return '<svg width="640" height="440" viewBox="0 0 640 440" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">\n' +
      '  <title id="title">' + title + '</title>\n' +
      '  <desc id="desc">自动生成的头像。</desc>\n' +
      '  <rect width="640" height="440" fill="' + pal.bg + '"/>\n' +
      '  <rect x="50" y="60" width="540" height="320" rx="24" fill="' + pal.light + '"/>\n' +
      '  <path d="M70 290C160 230 260 210 390 255C460 278 500 280 560 250V374H70V290Z" fill="' + pal.secondary + '"/>\n' +
      '  <path d="M80 265C170 185 300 170 430 218C480 233 520 232 560 220" stroke="' + pal.dark + '" stroke-width="16" stroke-linecap="round"/>\n' +
      '  <path d="' + polyPts + '" fill="' + pal.dark + '"/>\n' +
      '  <path d="M480 ' + (102 + Math.floor(rng() * 8)) + 'L296 236" stroke="' + pal.accent + '" stroke-width="11" stroke-linecap="round"/>\n' +
      '  <path d="M268 252L350 228" stroke="' + pal.light + '" stroke-width="9" stroke-linecap="round"/>\n' +
      '  <circle cx="' + circleCX + '" cy="' + circleCY + '" r="28" fill="' + pal.accent + '"/>\n' +
      '  <path d="M120 344H520" stroke="' + pal.red + '" stroke-width="9" stroke-linecap="round"/>\n' +
      '</svg>\n';
  }
}

module.exports = { generateAvatarSVG: generateAvatarSVG };
