'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const auth = require('./auth-api');
const audit = require('./audit-log');
const parseBody = require('./parse-body').parseBody;

const VALID_KEYS = new Set(['members', 'honors', 'projects']);

function readStats(statsPath) {
  if (!fs.existsSync(statsPath)) return { members: null, honors: null, projects: null, yearSpan: null };
  const raw = fs.readFileSync(statsPath, 'utf-8');
  return yaml.load(raw) || {};
}

function writeStats(statsPath, data) {
  const content = yaml.dump(data, { noCompatMode: true, lineWidth: -1, quotingType: '"', forceQuotes: true });
  fs.writeFileSync(statsPath, content, 'utf-8');
}

function reply(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

hexo.extend.filter.register('server_middleware', function (app) {
  const baseDir = this.base_dir;
  const statsPath = path.join(baseDir, 'source', '_data', 'home-stats.yml');

  app.use('/api/home-stats', function (req, res, next) {
    // OPTIONS 预检
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS' });
      res.end();
      return;
    }

    // GET — 返回覆盖值
    if (req.method === 'GET') {
      reply(res, 200, readStats(statsPath));
      return;
    }

    // PUT — 手动覆盖某个值（需登录）
    if (req.method === 'PUT') {
      if (!auth.isValidToken(auth.getToken(req))) { reply(res, 401, { error: '请先登录' }); return; }
      parseBody(req, 512, function (err, data) {
        if (err) { reply(res, err.status, { error: err.error }); return; }
        const key = data.key;
        const value = data.value;
        if (!VALID_KEYS.has(key)) { reply(res, 400, { error: '无效的 key' }); return; }
        if (value !== null && (typeof value !== 'string' || value.trim() === '')) { reply(res, 400, { error: 'value 必须是非空字符串或 null' }); return; }
        const stats = readStats(statsPath);
        stats[key] = value;
        writeStats(statsPath, stats);
        audit.log(baseDir, 'STATS_SET', auth.getUsername(auth.getToken(req)), key + ' = ' + value, req);
        reply(res, 200, { ok: true, key, value });
      });
      return;
    }

    // DELETE — 重置为自动（需登录）
    if (req.method === 'DELETE') {
      if (!auth.isValidToken(auth.getToken(req))) { reply(res, 401, { error: '请先登录' }); return; }
      parseBody(req, 512, function (err, data) {
        if (err) { reply(res, err.status, { error: err.error }); return; }
        const key = data.key;
        if (!VALID_KEYS.has(key)) { reply(res, 400, { error: '无效的 key' }); return; }
        const stats = readStats(statsPath);
        stats[key] = null;
        audit.log(baseDir, 'STATS_RESET', auth.getUsername(auth.getToken(req)), '重置 ' + key, req);
        writeStats(statsPath, stats);
        reply(res, 200, { ok: true, key, value: null });
      });
      return;
    }

    next();
  });
});
