'use strict';

// 管理员密码管理工具
// 用法：
//   node scripts/manage-passwords.js add <用户名> <密码>
//   node scripts/manage-passwords.js import <明文文件.txt> [--reset]
//   node scripts/manage-passwords.js list

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SALT = 'gy2pioneer';
const PW_FILE = path.join(__dirname, '..', 'admin', 'passwords.txt');

function hash(password) {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

function loadExisting() {
  var existing = {};
  if (!fs.existsSync(PW_FILE)) return existing;
  var lines = fs.readFileSync(PW_FILE, 'utf-8').split(/\r?\n/);
  lines.forEach(function (line) {
    line = line.trim();
    if (!line) return;
    var idx = line.indexOf(':');
    if (idx === -1) return;
    existing[line.substring(0, idx).trim()] = true;
  });
  return existing;
}

function cmdAdd(username, password) {
  if (!username || !password) {
    console.error('用法: node scripts/manage-passwords.js add <用户名> <密码>');
    process.exit(1);
  }

  var existing = loadExisting();
  if (existing[username]) {
    console.error('错误: 用户名 "' + username + '" 已存在');
    process.exit(1);
  }

  var hashed = hash(password);
  appendEntry(username + ':' + hashed);
  console.log('已添加: ' + username);
}

function cmdImport(filePath) {
  if (!filePath) {
    console.error('用法: node scripts/manage-passwords.js import <明文文件.txt>');
    console.error('');
    console.error('明文文件格式（每行一条）：');
    console.error('  用户名-密码');
    console.error('  张三-mypassword');
    console.error('  李四-another123');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error('错误: 文件 "' + filePath + '" 不存在');
    process.exit(1);
  }

  var existing = loadExisting();
  var raw = fs.readFileSync(filePath, 'utf-8');
  var lines = raw.split(/\r?\n/);
  var entries = [];
  var skipped = [];

  lines.forEach(function (line, num) {
    line = line.trim();
    if (!line) return;

    var idx = line.indexOf('-');
    if (idx === -1) {
      skipped.push('第 ' + (num + 1) + ' 行格式错误（缺少 - 分隔符）: ' + line);
      return;
    }

    var username = line.substring(0, idx).trim();
    var password = line.substring(idx + 1).trim();
    if (!username || !password) {
      skipped.push('第 ' + (num + 1) + ' 行用户名或密码为空');
      return;
    }

    if (existing[username]) {
      skipped.push(username + ' 已存在，跳过');
      return;
    }

    var hashed = hash(password);
    entries.push(username + ':' + hashed);
    existing[username] = true;
  });

  // 输出结果
  if (skipped.length > 0) {
    console.log('【跳过】');
    skipped.forEach(function (s) { console.log('  ' + s); });
    console.log('');
  }

  if (entries.length === 0) {
    console.log('没有新账号需要添加');
    return;
  }

  // 追加写入
  var data = entries.join('\n') + '\n';
  var adminDir = path.dirname(PW_FILE);
  if (!fs.existsSync(adminDir)) {
    fs.mkdirSync(adminDir, { recursive: true });
  }
  fs.appendFileSync(PW_FILE, data, 'utf-8');

  console.log('【已添加 ' + entries.length + ' 个账号】');
  entries.forEach(function (entry) {
    var name = entry.split(':')[0];
    console.log('  ' + name);
  });

  // --reset：导入后还原文件为模板
  var resetIdx = process.argv.indexOf('--reset');
  if (resetIdx !== -1) {
    var tpl = [
      '（在此输入待添加的管理员账号，格式：用户名-密码，每行一条）',
      '（完成后双击 admin/添加管理员.bat 即可自动导入）',
      '（例如：）',
      'zhangsan-mypassword',
      'lisi-abc123',
      ''
    ].join('\n');
    fs.writeFileSync(filePath, tpl, 'utf-8');
    console.log('');
    console.log('已还原模板: ' + filePath);
  }
}

function cmdList() {
  var existing = loadExisting();
  var names = Object.keys(existing);
  if (names.length === 0) {
    console.log('（无账号）');
    return;
  }
  console.log('当前管理员账号:');
  console.log('─────────────────');
  names.forEach(function (name) { console.log('  ' + name); });
  console.log('─────────────────');
  console.log('共 ' + names.length + ' 个账号');
}

function appendEntry(entry) {
  var adminDir = path.dirname(PW_FILE);
  if (!fs.existsSync(adminDir)) {
    fs.mkdirSync(adminDir, { recursive: true });
  }
  fs.appendFileSync(PW_FILE, entry + '\n', 'utf-8');
}

var args = process.argv.slice(2);
var cmd = args[0];

if (cmd === 'add') {
  cmdAdd(args[1], args[2]);
} else if (cmd === 'import') {
  cmdImport(args[1]);
} else if (cmd === 'list') {
  cmdList();
} else {
  console.log('用法:');
  console.log('  node scripts/manage-passwords.js add <用户名> <密码>');
  console.log('  node scripts/manage-passwords.js import <明文文件.txt>');
  console.log('  node scripts/manage-passwords.js list');
}
