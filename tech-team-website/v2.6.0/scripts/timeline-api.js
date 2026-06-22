'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const yaml = require('js-yaml');

const auth = require('./auth-api');
const audit = require('./audit-log');
const parseBody = require('./parse-body').parseBody;

function generateId() {
  const now = new Date();
  const date = String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 5);
  return date + '-' + rand;
}

const VALID_LEVELS = ['international', 'national', 'provincial', 'city', 'school'];
const LEVEL_LABELS = {
  international: '国际级', national: '国家级', provincial: '省级', city: '市级', school: '校级'
};

hexo.extend.filter.register('server_middleware', function (app) {
  const baseDir = this.base_dir;
  const dataPath = path.join(baseDir, 'source', '_data', 'timeline-manual.yml');

  function readEntries() {
    if (!fs.existsSync(dataPath)) return [];
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const data = yaml.load(raw);
    return Array.isArray(data) ? data : [];
  }

  function writeEntries(list) {
    const content = yaml.dump(list, { noCompatMode: true, lineWidth: -1, quotingType: '"', forceQuotes: true });
    fs.writeFileSync(dataPath, content, 'utf-8');
  }

  function reply(res, code, data) {
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end(JSON.stringify(data));
  }

  app.use('/api/timeline-manual', function (req, res) {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname.replace(/\/+$/, '');

    // 提取 ID：/api/timeline-manual/<id>
    let entryId = null;
    const idMatch = pathname.match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
    if (idMatch) entryId = idMatch[1];

    // 认证检查
    function checkAuth() {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!auth.isValidToken(token)) {
        reply(res, 401, { ok: false, error: '需要管理员权限' });
        return false;
      }
      return true;
    }

    // GET /api/timeline-manual 或 /api/timeline-manual/<id>
    if (req.method === 'GET') {
      if (entryId) {
        const entries = readEntries();
        const entry = entries.find(function (e) { return e.id === entryId; });
        if (!entry) { reply(res, 404, { ok: false, error: '条目不存在' }); return; }
        reply(res, 200, { ok: true, entry: entry });
      } else {
        reply(res, 200, { ok: true, entries: readEntries() });
      }
      return;
    }

    // POST /api/timeline-manual — 添加
    if (req.method === 'POST') {
      if (!checkAuth()) return;

      parseBody(req, 2048, function (err, data) {
        if (err) { reply(res, err.status, { ok: false, error: err.error }); return; }

        const year = parseInt(data.year);
        if (!year || year < 2000 || year > 2099) {
          reply(res, 400, { ok: false, error: '年份无效 (2000-2099)' });
          return;
        }

        const level = data.level;
        if (!level || VALID_LEVELS.indexOf(level) === -1) {
          reply(res, 400, { ok: false, error: '级别无效' });
          return;
        }

        const title = (data.title || '').trim();
        if (!title) {
          reply(res, 400, { ok: false, error: '比赛名称不能为空' });
          return;
        }

        const entries = readEntries();
        const entry = {
          id: generateId(),
          year: year,
          level: level,
          label: LEVEL_LABELS[level],
          title: title
        };
        entries.push(entry);
        writeEntries(entries);

        audit.log(baseDir, 'TIMELINE_ADD', auth.getUsername(auth.getToken(req)), '比赛: ' + title, req);
        reply(res, 201, { ok: true, entry: entry });
      });
      return;
    }

    // PUT /api/timeline-manual/<id> — 更新
    if (req.method === 'PUT') {
      if (!checkAuth()) return;
      if (!entryId) { reply(res, 400, { ok: false, error: '请指定条目 ID' }); return; }

      parseBody(req, 2048, function (err, data) {
        if (err) { reply(res, err.status, { ok: false, error: err.error }); return; }

        const entries = readEntries();
        const idx = entries.findIndex(function (e) { return e.id === entryId; });
        if (idx === -1) { reply(res, 404, { ok: false, error: '条目不存在' }); return; }

        if (data.year !== undefined) {
          const year = parseInt(data.year);
          if (!year || year < 2000 || year > 2099) {
            reply(res, 400, { ok: false, error: '年份无效 (2000-2099)' });
            return;
          }
          entries[idx].year = year;
        }

        if (data.level !== undefined) {
          if (VALID_LEVELS.indexOf(data.level) === -1) {
            reply(res, 400, { ok: false, error: '级别无效' });
            return;
          }
          entries[idx].level = data.level;
          entries[idx].label = LEVEL_LABELS[data.level];
        }

        if (data.title !== undefined) {
          const title = (data.title || '').trim();
          if (!title) {
            reply(res, 400, { ok: false, error: '比赛名称不能为空' });
            return;
          }
          entries[idx].title = title;
        }

        writeEntries(entries);
        audit.log(baseDir, 'TIMELINE_EDIT', auth.getUsername(auth.getToken(req)), '比赛: ' + entries[idx].title, req);
        reply(res, 200, { ok: true, entry: entries[idx] });
      });
      return;
    }

    // DELETE /api/timeline-manual/<id> — 删除
    if (req.method === 'DELETE') {
      if (!checkAuth()) return;
      if (!entryId) { reply(res, 400, { ok: false, error: '请指定条目 ID' }); return; }

      const entries = readEntries();
      const idx = entries.findIndex(function (e) { return e.id === entryId; });
      if (idx === -1) { reply(res, 404, { ok: false, error: '条目不存在' }); return; }

      const removed = entries.splice(idx, 1)[0];
      writeEntries(entries);
      audit.log(baseDir, 'TIMELINE_DELETE', auth.getUsername(auth.getToken(req)), '比赛: ' + removed.title, req);
      reply(res, 200, { ok: true });
      return;
    }

    reply(res, 405, { ok: false, error: '不支持的请求方法' });
  });
});
