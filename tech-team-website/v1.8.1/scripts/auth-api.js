'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SALT = 'gy2pioneer';
var tokenMap = {};  // token → username

function loadPasswords(baseDir) {
  const pwFile = path.join(baseDir, 'admin/passwords.txt');
  tokenMap = {};
  if (!fs.existsSync(pwFile)) return;
  const lines = fs.readFileSync(pwFile, 'utf-8').split(/\r?\n/);
  lines.forEach(function (line) {
    line = line.trim();
    if (!line) return;

    // 格式：用户名-密码（只取第一个 - 分割）
    var idx = line.indexOf('-');
    if (idx === -1) return; // 格式不对，跳过

    var username = line.substring(0, idx).trim();
    var password = line.substring(idx + 1).trim();
    if (!username || !password) return;

    tokenMap[crypto.createHash('sha256').update(password + SALT).digest('hex')] = username;
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
