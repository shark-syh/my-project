'use strict';

function parseBody(req, limit, callback) {
  var body = '';
  req.on('data', function (chunk) {
    body += chunk;
    if (limit && body.length > limit) {
      callback({ status: 413, error: '请求体过大' });
      req.destroy();
    }
  });
  req.on('end', function () {
    if (limit && body.length > limit) return;
    try {
      callback(null, JSON.parse(body));
    } catch (e) {
      callback({ status: 400, error: 'JSON 解析失败' });
    }
  });
}

module.exports = { parseBody: parseBody };
