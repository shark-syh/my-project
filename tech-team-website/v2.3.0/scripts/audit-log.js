'use strict';

const fs = require('fs');
const path = require('path');

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function timestamp() {
  var d = new Date();
  return d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' +
    pad(d.getMinutes()) + ':' +
    pad(d.getSeconds());
}

function getIP(req) {
  var fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress || req.connection && req.connection.remoteAddress || 'unknown';
}

function sanitize(str) {
  return str.replace(/[\r\n]/g, ' ');
}

function log(baseDir, action, user, detail, req) {
  action = sanitize(action);
  user = sanitize(user || '?');
  if (detail) detail = sanitize(detail);
  var ip = sanitize(req ? getIP(req) : 'unknown');
  var line = '[' + timestamp() + '] ' + action;
  // 补齐到 14 字符对齐
  while (line.length < 38) line += ' ';
  line += '| 用户: ' + (user || '?');
  line += ' | IP: ' + ip;
  if (detail) line += ' | ' + detail;
  line += '\n';

  var logPath = path.join(baseDir, 'admin', 'audit.log');
  try {
    fs.appendFileSync(logPath, line, 'utf-8');
  } catch (e) {
    // 日志写入失败不应影响主流程
    console.error('[audit-log] 写入失败:', e.message);
  }
}

module.exports = { log: log };
