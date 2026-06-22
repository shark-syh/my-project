'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');

const auth = require('./auth-api');
const audit = require('./audit-log');
const parseBody = require('./parse-body').parseBody;

const SAFE_FILENAME_RE = /^[0-9a-f]{32}$/;

hexo.extend.filter.register('server_middleware', function (app) {
  const baseDir = this.base_dir;
  const galleryDir = path.join(this.source_dir, 'assets', 'gallery');

  function corsHeaders() {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
  }

  function reply(res, code, data) {
    var headers = Object.assign({ 'Content-Type': 'application/json' }, corsHeaders());
    res.writeHead(code, headers);
    res.end(JSON.stringify(data));
  }


  // ── /api/auth/logout（必须放在 /api/auth 之前，否则会被拦截）──
  app.use('/api/auth/logout', function (req, res, next) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }
    if (req.method !== 'POST') return next();

    var token = auth.getToken(req);
    if (!token || !auth.isValidToken(token)) {
      reply(res, 401, { ok: false, error: '请先登录' });
      return;
    }
    var username = auth.getUsername(token);
    audit.log(baseDir, 'LOGOUT', username, '', req);
    reply(res, 200, { ok: true });
  });

  // ── /api/auth ──
  auth.loadPasswords(baseDir);

  app.use('/api/auth', function (req, res, next) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    if (req.method === 'GET') {
      reply(res, 200, { ok: auth.isValidToken(auth.getToken(req)) });
      return;
    }

    if (req.method !== 'POST') return next();

    parseBody(req, 512, function (err, data) {
      if (err) { reply(res, err.status, { ok: false, error: err.error }); return; }

      auth.loadPasswords(baseDir);

      var token = auth.makeToken(data.password || '');

      if (auth.isValidToken(token)) {
        var username = auth.getUsername(token);
        audit.log(baseDir, 'LOGIN', username, '', req);
        reply(res, 200, { ok: true, token: token, username: username });
      } else {
        audit.log(baseDir, 'LOGIN_FAIL', '?', '密码错误', req);
        reply(res, 200, { ok: false, error: '密码错误' });
      }
    });
  });
  // ── /api/story ──
  app.use('/api/story', function (req, res, next) {
    // OPTIONS 预检
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    // GET → 读取故事（无需登录）
    if (req.method === 'GET') {
      var parsed = url.parse(req.url, true);
      var filename = parsed.query.filename || '';

      if (!SAFE_FILENAME_RE.test(filename)) {
        reply(res, 400, { error: '非法文件名' });
        return;
      }

      var txtPath = path.join(galleryDir, filename + '.txt');
      if (fs.existsSync(txtPath)) {
        reply(res, 200, { story: fs.readFileSync(txtPath, 'utf-8') });
      } else {
        reply(res, 200, { story: '' });
      }
      return;
    }

    // POST → 保存故事（需登录）
    if (req.method === 'POST') {
      if (!auth.isValidToken(auth.getToken(req))) {
        reply(res, 401, { error: '请先登录' });
        return;
      }

      parseBody(req, 16384, function (err, data) {
        if (err) { reply(res, err.status, { error: err.error }); return; }

        var filename = data.filename || '';
        var story = data.story || '';

        if (!SAFE_FILENAME_RE.test(filename)) {
          reply(res, 400, { error: '非法文件名' });
          return;
        }

        var txtPath = path.join(galleryDir, filename + '.txt');
        try {
          fs.writeFileSync(txtPath, story, 'utf-8');
          audit.log(baseDir, 'STORY_EDIT', auth.getUsername(auth.getToken(req)), '编辑故事 ' + filename, req);
          reply(res, 200, { ok: true });
        } catch (e) {
          reply(res, 500, { error: e.message });
        }
      });
      return;
    }

    next();
  });
});
