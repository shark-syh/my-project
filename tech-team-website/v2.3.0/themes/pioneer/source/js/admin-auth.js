(function () {

  var STORAGE_KEY = 'admin_token';
  var USERNAME_KEY = 'admin_username';
  var loggedIn = false;
  var token = null;
  var username = '';
  var dialog = null;
  var btn = null;
  var toastEl = null;

  function notify() {
    var evt = new CustomEvent('admin-auth-change', { detail: { loggedIn: loggedIn, username: username } });
    window.dispatchEvent(evt);
  }

  function setState(newLoggedIn, newToken, newUsername) {
    loggedIn = newLoggedIn;
    token = newToken;
    username = newUsername || '';
    if (loggedIn && token) {
      sessionStorage.setItem(STORAGE_KEY, token);
      sessionStorage.setItem(USERNAME_KEY, username);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(USERNAME_KEY);
    }
    updateBtn();
    notify();
  }

  var labelEl = null;

  function updateBtn() {
    if (!btn) return;
    if (loggedIn) {
      btn.innerHTML = '&#128275;';
      btn.setAttribute('aria-label', '退出登录');
      btn.title = username + ' 已登录，点击退出';
      if (labelEl) {
        labelEl.textContent = '欢迎 ' + username;
        labelEl.style.display = '';
      }
    } else {
      btn.innerHTML = '&#128274;';
      btn.setAttribute('aria-label', '管理员登录');
      btn.title = '管理员登录';
      if (labelEl) labelEl.style.display = 'none';
    }
  }

  // ── 欢迎 Toast ──
  function createToast() {
    toastEl = document.createElement('div');
    toastEl.className = 'welcome-toast';
    document.body.appendChild(toastEl);
  }

  function showToast(name) {
    if (!toastEl) createToast();
    toastEl.innerHTML = '欢迎 <span class="toast-username">' + escapeHTML(name) + '</span>';
    toastEl.classList.add('show');
    setTimeout(function () { toastEl.classList.remove('show'); }, 2500);
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── 登录按钮 ──
  function createBtn() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;

    btn = document.createElement('button');
    btn.className = 'admin-login-btn';
    btn.innerHTML = '&#128274;';
    btn.setAttribute('aria-label', '管理员登录');
    btn.title = '管理员登录';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (loggedIn) {
        logout();
      } else {
        showDialog();
      }
    });
    labelEl = document.createElement('span');
    labelEl.className = 'admin-welcome-label';
    labelEl.style.display = 'none';

    nav.appendChild(btn);
    nav.appendChild(labelEl);
    updateBtn();
  }

  // ── 登录浮层 ──
  function createDialog() {
    dialog = document.createElement('div');
    dialog.className = 'admin-login-overlay';

    var panel = document.createElement('div');
    panel.className = 'admin-login-panel';

    var title = document.createElement('div');
    title.className = 'admin-login-title';
    title.textContent = '管理员登录';
    panel.appendChild(title);

    var input = document.createElement('input');
    input.type = 'password';
    input.className = 'admin-login-input';
    input.placeholder = '请输入管理密码';
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doLogin(input);
    });
    panel.appendChild(input);

    var msgEl = document.createElement('div');
    msgEl.className = 'admin-login-msg';
    panel.appendChild(msgEl);

    var btnRow = document.createElement('div');
    btnRow.className = 'admin-login-btns';

    var confirmBtn = document.createElement('button');
    confirmBtn.textContent = '登录';
    confirmBtn.className = 'gallery-overlay-save-btn';
    confirmBtn.addEventListener('click', function () { doLogin(input, msgEl); });
    btnRow.appendChild(confirmBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'gallery-overlay-cancel-btn';
    cancelBtn.style.background = 'rgba(255,255,255,0.18)';
    cancelBtn.style.color = 'rgba(255,255,255,0.85)';
    cancelBtn.addEventListener('click', hideDialog);
    btnRow.appendChild(cancelBtn);

    panel.appendChild(btnRow);
    dialog.appendChild(panel);

    dialog.addEventListener('mousedown', function (e) {
      if (e.target === dialog) hideDialog();
    });

    document.body.appendChild(dialog);
  }

  function showDialog() {
    if (!dialog) createDialog();
    dialog.classList.add('active');
    var input = dialog.querySelector('.admin-login-input');
    input.value = '';
    dialog.querySelector('.admin-login-msg').textContent = '';
    setTimeout(function () { input.focus(); }, 100);
  }

  function hideDialog() {
    if (dialog) dialog.classList.remove('active');
  }

  function doLogin(input, msgEl) {
    var pw = input.value;
    if (!pw) {
      if (!msgEl) msgEl = dialog.querySelector('.admin-login-msg');
      msgEl.textContent = '请输入密码';
      return;
    }

    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          var name = data.username || '';
          setState(true, data.token, name);
          hideDialog();
          if (name) showToast(name);
        } else {
          if (!msgEl) msgEl = dialog.querySelector('.admin-login-msg');
          msgEl.textContent = data.error || '密码错误';
        }
      })
      .catch(function (err) {
        if (!msgEl) msgEl = dialog.querySelector('.admin-login-msg');
        msgEl.textContent = '网络错误: ' + err.message;
      });
  }

  function logout() {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function () {
      setState(false, null, '');
    }).catch(function () {
      setState(false, null, '');
    });
  }

  // ── 对外 API ──
  window.__admin = {
    isLoggedIn: function () { return loggedIn; },
    getToken: function () { return token; }
  };

  // ── 初始化：恢复 sessionStorage 中的登录态 ──
  var savedToken = sessionStorage.getItem(STORAGE_KEY);
  if (savedToken) {
    var savedName = sessionStorage.getItem(USERNAME_KEY) || '';
    fetch('/api/auth', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + savedToken }
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          setState(true, savedToken, savedName);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(USERNAME_KEY);
        }
      })
      .catch(function () {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(USERNAME_KEY);
        setState(false, null, '');
      });
  }

  createBtn();
})();
