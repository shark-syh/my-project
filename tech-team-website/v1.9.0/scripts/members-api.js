'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const yaml = require('js-yaml');

const auth = require('./auth-api');
const avatarGen = require('./avatar-generator');

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const REQUIRED_FIELDS = ['name', 'slug', 'role', 'grade', 'summary'];

hexo.extend.filter.register('server_middleware', function (app) {
  const baseDir = this.base_dir;
  const membersPath = path.join(baseDir, 'source', '_data', 'members.yml');

  function readMembers() {
    if (!fs.existsSync(membersPath)) return [];
    const raw = fs.readFileSync(membersPath, 'utf-8');
    const data = yaml.load(raw);
    return Array.isArray(data) ? data : [];
  }

  function writeMembers(list) {
    const content = yaml.dump(list, { noCompatMode: true, lineWidth: -1, quotingType: '"', forceQuotes: true });
    fs.writeFileSync(membersPath, content, 'utf-8');
  }

  function ensureAvatar(name, slug, avatarPath) {
    if (avatarPath && avatarPath.trim()) return avatarPath.trim();
    var svg = avatarGen.generateAvatarSVG(name, slug);
    var dest = path.join(baseDir, 'source', 'assets', 'images', 'avatars', slug + '.svg');
    var dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, svg, 'utf-8');
    return '/assets/images/avatars/' + slug + '.svg';
  }

  function corsHeaders() {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };
  }

  function reply(res, code, data) {
    var headers = Object.assign({ 'Content-Type': 'application/json' }, corsHeaders());
    res.writeHead(code, headers);
    res.end(JSON.stringify(data));
  }

  // ── /api/members ──
  app.use('/api/members', function (req, res, next) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    // GET — 返回全部成员（无需登录）
    if (req.method === 'GET') {
      var parsed = url.parse(req.url, true);
      // 如果 pathname 包含具体 slug，返回单个成员
      var pathname = parsed.pathname.replace(/\/+$/, '');
      // Connect 会剥离 app.use 的挂载路径，所以 req.url 可能是 /<slug>
      var slugMatch = pathname.match(/^\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/);
      if (slugMatch) {
        var slug = slugMatch[1];
        var members = readMembers();
        var member = members.find(function (m) { return m.slug === slug; });
        if (member) {
          reply(res, 200, member);
        } else {
          reply(res, 404, { error: '成员不存在' });
        }
        return;
      }

      reply(res, 200, readMembers());
      return;
    }

    // POST — 添加成员（需登录）
    if (req.method === 'POST') {
      if (!auth.isValidToken(auth.getToken(req))) {
        reply(res, 401, { error: '请先登录' });
        return;
      }

      var body = '';
      req.on('data', function (chunk) { body += chunk; });
      req.on('end', function () {
        var data;
        try { data = JSON.parse(body); } catch (e) {
          reply(res, 400, { error: 'JSON 解析失败' });
          return;
        }

        // 校验必填字段
        for (var i = 0; i < REQUIRED_FIELDS.length; i++) {
          var field = REQUIRED_FIELDS[i];
          if (!data[field] || !String(data[field]).trim()) {
            reply(res, 400, { error: '缺少必填字段: ' + field });
            return;
          }
        }

        var newSlug = String(data.slug).trim().toLowerCase();
        if (!SLUG_RE.test(newSlug)) {
          reply(res, 400, { error: 'slug 格式不合法，只允许小写字母、数字和连字符，且不能以连字符开头或结尾' });
          return;
        }

        var members = readMembers();

        // 检查 slug 唯一性
        var dup = members.some(function (m) { return m.slug === newSlug; });
        if (dup) {
          reply(res, 409, { error: '成员标识 "' + newSlug + '" 已存在' });
          return;
        }

        var newMember = {
          name: String(data.name).trim(),
          slug: newSlug,
          role: String(data.role).trim(),
          grade: String(data.grade).trim(),
          avatar: ensureAvatar(String(data.name).trim(), newSlug, data.avatar || ''),
          summary: String(data.summary).trim(),
          honors: Array.isArray(data.honors) ? data.honors.filter(Boolean) : [],
          projects: Array.isArray(data.projects) ? data.projects.filter(Boolean) : [],
          quote: String(data.quote || '').trim()
        };

        members.push(newMember);
        writeMembers(members);
        reply(res, 201, { ok: true, member: newMember });
      });
      return;
    }

    // PUT — 更新成员（需登录）
    if (req.method === 'PUT') {
      if (!auth.isValidToken(auth.getToken(req))) {
        reply(res, 401, { error: '请先登录' });
        return;
      }

      var parsedPut = url.parse(req.url, true);
      var pathPut = parsedPut.pathname.replace(/\/+$/, '');
      var slugPut = pathPut.match(/^\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/);
      if (!slugPut) {
        reply(res, 400, { error: '请指定要更新的成员 slug: /api/members/<slug>' });
        return;
      }

      var targetSlugPut = slugPut[1];
      var membersPut = readMembers();
      var idxPut = -1;
      for (var k = 0; k < membersPut.length; k++) {
        if (membersPut[k].slug === targetSlugPut) { idxPut = k; break; }
      }
      if (idxPut === -1) {
        reply(res, 404, { error: '成员不存在' });
        return;
      }

      var bodyPut = '';
      req.on('data', function (chunk) { bodyPut += chunk; });
      req.on('end', function () {
        var dataPut;
        try { dataPut = JSON.parse(bodyPut); } catch (e) {
          reply(res, 400, { error: 'JSON 解析失败' });
          return;
        }

        for (var f = 0; f < REQUIRED_FIELDS.length; f++) {
          var field = REQUIRED_FIELDS[f];
          if (!dataPut[field] || !String(dataPut[field]).trim()) {
            reply(res, 400, { error: '缺少必填字段: ' + field });
            return;
          }
        }

        var newSlug = String(dataPut.slug).trim().toLowerCase();
        if (!SLUG_RE.test(newSlug)) {
          reply(res, 400, { error: 'slug 格式不合法' });
          return;
        }

        // slug 唯一性检查（排除自身）
        var dupPut = membersPut.some(function (m, i) { return m.slug === newSlug && i !== idxPut; });
        if (dupPut) {
          reply(res, 409, { error: '成员标识 "' + newSlug + '" 已被其他成员使用' });
          return;
        }

        membersPut[idxPut] = {
          name: String(dataPut.name).trim(),
          slug: newSlug,
          role: String(dataPut.role).trim(),
          grade: String(dataPut.grade).trim(),
          avatar: ensureAvatar(String(dataPut.name).trim(), newSlug, dataPut.avatar || ''),
          summary: String(dataPut.summary).trim(),
          honors: Array.isArray(dataPut.honors) ? dataPut.honors.filter(Boolean) : [],
          projects: Array.isArray(dataPut.projects) ? dataPut.projects.filter(Boolean) : [],
          quote: String(dataPut.quote || '').trim()
        };

        writeMembers(membersPut);
        reply(res, 200, { ok: true, member: membersPut[idxPut] });
      });
      return;
    }

    // DELETE — 删除成员（需登录）
    if (req.method === 'DELETE') {
      if (!auth.isValidToken(auth.getToken(req))) {
        reply(res, 401, { error: '请先登录' });
        return;
      }

      var parsedDel = url.parse(req.url, true);
      var pathDel = parsedDel.pathname.replace(/\/+$/, '');
      // Connect 会剥离挂载路径，所以匹配 /<slug>
      var slugDel = pathDel.match(/^\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/);
      if (!slugDel) {
        reply(res, 400, { error: '请指定要删除的成员 slug: /api/members/<slug>' });
        return;
      }

      var targetSlug = slugDel[1];
      var membersDel = readMembers();
      var idx = -1;
      for (var j = 0; j < membersDel.length; j++) {
        if (membersDel[j].slug === targetSlug) { idx = j; break; }
      }
      if (idx === -1) {
        reply(res, 404, { error: '成员不存在' });
        return;
      }

      var removed = membersDel.splice(idx, 1)[0];
      writeMembers(membersDel);
      reply(res, 200, { ok: true, removed: removed.name });
      return;
    }

    next();
  });
});
