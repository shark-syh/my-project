'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SALT = 'gy2pioneer';
var tokenMap = {};  // hash → username

function loadPasswords(baseDir) {
  const pwFile = path.join(baseDir, 'admin/passwords.txt');
  tokenMap = {};
  if (!fs.existsSync(pwFile)) return;
  const lines = fs.readFileSync(pwFile, 'utf-8').split(/\r?\n/);
  lines.forEach(function (line) {
    line = line.trim();
    if (!line) return;

    // 格式：用户名:哈希值
    var idx = line.indexOf(':');
    if (idx === -1) return;

    var username = line.substring(0, idx).trim();
    var hash = line.substring(idx + 1).trim();
    if (!username || !hash) return;

    tokenMap[hash] = username;
  });
}

function makeToken(password) {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

function getToken(req) {
  var auth = req.headers['authorization'] || '';
  var m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function isValidToken(token) {
  return token && tokenMap.hasOwnProperty(token);
}

function getUsername(token) {
  return tokenMap[token] || '';
}

module.exports = {
  loadPasswords: loadPasswords,
  makeToken: makeToken,
  getToken: getToken,
  isValidToken: isValidToken,
  getUsername: getUsername
};
