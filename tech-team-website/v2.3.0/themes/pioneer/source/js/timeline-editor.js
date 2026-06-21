(function () {
  var overlay = null;
  var addBtn = null;
  var editingId = null;

  function isAdmin() {
    return window.__admin && window.__admin.isLoggedIn();
  }

  function getToken() {
    return window.__admin ? window.__admin.getToken() : null;
  }

  function showAdminUI() {
    if (addBtn) addBtn.classList.add('show');
    var actions = document.querySelectorAll('.timeline-card-actions.for-edit');
    actions.forEach(function (el) { el.classList.add('show'); });
    bindCardActions();
  }

  function hideAdminUI() {
    if (addBtn) addBtn.classList.remove('show');
    var actions = document.querySelectorAll('.timeline-card-actions.show');
    actions.forEach(function (el) { el.classList.remove('show'); });
  }

  function bindCardActions() {
    var btns = document.querySelectorAll('[data-action^="edit-"], [data-action^="delete-"]');
    btns.forEach(function (btn) {
      // 避免重复绑定
      if (btn._bound) return;
      btn._bound = true;

      var action = btn.getAttribute('data-action');
      if (action && action.startsWith('edit-')) {
        var id = action.slice(5);
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          editEntry(id);
        });
      } else if (action && action.startsWith('delete-')) {
        var id = action.slice(7);
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          deleteEntry(id);
        });
      }
    });
  }

  // ── 编辑浮层 ──
  function showEditor(id) {
    if (!overlay) return;
    var titleEl = document.getElementById('timelineEditorTitle');
    var saveBtn = document.getElementById('timelineSaveBtn');
    var yearInput = document.getElementById('timelineEditYear');
    var levelInput = document.getElementById('timelineEditLevel');
    var titleInput = document.getElementById('timelineEditTitle');

    if (id) {
      // 编辑模式：从卡片读取数据
      var item = document.querySelector('[data-manual-id="' + id + '"]');
      if (!item) return;
      var titleText = item.querySelector('h3') ? item.querySelector('h3').textContent : '';
      var levelEl = item.querySelector('.card-level');
      var levelClass = levelEl ? levelEl.className.replace('card-level ', '').trim() : 'school';
      var dateText = item.querySelector('.card-date') ? item.querySelector('.card-date').textContent : '';
      var year = parseInt(dateText) || new Date().getFullYear();

      editingId = id;
      if (titleEl) titleEl.textContent = '编辑比赛';
      if (saveBtn) saveBtn.textContent = '保存修改';
      if (yearInput) yearInput.value = year;
      if (levelInput) levelInput.value = levelClass;
      if (titleInput) titleInput.value = titleText;
    } else {
      editingId = null;
      if (titleEl) titleEl.textContent = '添加比赛';
      if (saveBtn) saveBtn.textContent = '添加';
      if (yearInput) yearInput.value = new Date().getFullYear();
      if (levelInput) levelInput.value = 'city';
      if (titleInput) titleInput.value = '';
    }

    overlay.classList.add('active');
    setTimeout(function () {
      if (titleInput) titleInput.focus();
    }, 100);
  }

  function hideEditor() {
    if (overlay) overlay.classList.remove('active');
  }

  var LEVEL_ORDER = { international: 0, national: 1, provincial: 2, city: 3, school: 4 };
  var LEVEL_LABELS = { international: '国际级', national: '国家级', provincial: '省级', city: '市级', school: '校级' };

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── 直接 DOM 操作：添加/编辑/删除后局部更新页面 ──
  function buildCardHTML(entry, year) {
    var html = '';
    html += '<div class="timeline-item dot-' + entry.level + '" data-manual-id="' + entry.id + '">';
    html += '<div class="timeline-dot"></div>';
    html += '<div class="timeline-card">';
    html += '<div class="timeline-card-actions for-edit show">';
    html += '<button class="timeline-card-action-btn" title="编辑" data-action="edit-' + entry.id + '" aria-label="编辑比赛">&#9998;</button>';
    html += '<button class="timeline-card-action-btn delete" title="删除" data-action="delete-' + entry.id + '" aria-label="删除比赛">&#10005;</button>';
    html += '</div>';
    html += '<div class="card-date">' + year + '</div>';
    html += '<h3>' + escapeHTML(entry.title) + '</h3>';
    html += '<div class="card-meta">';
    if (entry.member) {
      html += '<span class="card-member">' + escapeHTML(entry.member) + '</span>';
      html += '<span>' + escapeHTML(entry.role) + '</span>';
    } else {
      html += '<span class="timeline-manual-badge">手动添加</span>';
    }
    html += '<span class="card-level ' + entry.level + '">' + entry.label + '</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function findYearGroup(year) {
    var years = document.querySelectorAll('.timeline-year span');
    for (var i = 0; i < years.length; i++) {
      if (years[i].textContent === String(year)) {
        return years[i].closest('.timeline-group');
      }
    }
    return null;
  }

  function applyAdd(entry) {
    var year = String(entry.year);
    var group = findYearGroup(year);
    var cardHTML = buildCardHTML(entry, year);

    if (group) {
      // 在年份组内按级别顺序插入
      var items = group.querySelectorAll('.timeline-item');
      var insertBefore = null;
      for (var i = 0; i < items.length; i++) {
        var existingLevel = null;
        var dotClass = items[i].className.match(/dot-(\w+)/);
        if (dotClass) existingLevel = dotClass[1];
        var existingOrder = LEVEL_ORDER[existingLevel] !== undefined ? LEVEL_ORDER[existingLevel] : 5;
        var newOrder = LEVEL_ORDER[entry.level] !== undefined ? LEVEL_ORDER[entry.level] : 5;
        if (newOrder < existingOrder || (newOrder === existingOrder && entry.year < parseInt(year))) {
          insertBefore = items[i];
          break;
        }
      }
      var temp = document.createElement('div');
      temp.innerHTML = cardHTML;
      var newItem = temp.firstChild;
      if (insertBefore) {
        group.insertBefore(newItem, insertBefore);
      } else {
        group.appendChild(newItem);
      }
    } else {
      // 新建年份组
      var timeline = document.querySelector('.timeline');
      if (!timeline) return;
      var groupHTML = '<div class="timeline-group">';
      groupHTML += '<div class="timeline-year"><span>' + year + '</span></div>';
      groupHTML += cardHTML;
      groupHTML += '</div>';
      var temp = document.createElement('div');
      temp.innerHTML = groupHTML;
      var newGroup = temp.firstChild;

      // 按年份降序插入
      var groups = timeline.querySelectorAll('.timeline-group');
      var inserted = false;
      for (var g = 0; g < groups.length; g++) {
        var groupYear = groups[g].querySelector('.timeline-year span');
        var gy = groupYear ? parseInt(groupYear.textContent) : null;
        if (gy !== null && entry.year > gy) {
          timeline.insertBefore(newGroup, groups[g]);
          inserted = true;
          break;
        }
      }
      if (!inserted) timeline.appendChild(newGroup);
    }

    bindCardActions();
  }

  function applyEdit(entry) {
    var item = document.querySelector('[data-manual-id="' + entry.id + '"]');
    if (!item) return;
    var year = String(entry.year);
    var newHTML = buildCardHTML(entry, year);
    var temp = document.createElement('div');
    temp.innerHTML = newHTML;
    var newItem = temp.firstChild;
    item.parentNode.replaceChild(newItem, item);

    // 如果年份变了，可能需要移到另一组
    var oldDate = item.querySelector('.card-date');
    if (oldDate && oldDate.textContent !== year) {
      var currentGroup = newItem.closest('.timeline-group');
      var targetGroup = findYearGroup(year);
      if (targetGroup && targetGroup !== currentGroup) {
        currentGroup.removeChild(newItem);
        targetGroup.appendChild(newItem);
        if (currentGroup.querySelectorAll('.timeline-item').length === 0) {
          currentGroup.remove();
        }
      }
    }

    bindCardActions();
  }

  function applyDelete(id) {
    var item = document.querySelector('[data-manual-id="' + id + '"]');
    if (!item) return;
    var group = item.closest('.timeline-group');
    item.remove();
    if (group && group.querySelectorAll('.timeline-item').length === 0) {
      group.remove();
    }
  }

  function saveEntry() {
    var year = parseInt(document.getElementById('timelineEditYear').value);
    var level = document.getElementById('timelineEditLevel').value;
    var title = document.getElementById('timelineEditTitle').value.trim();

    if (!year || year < 2000 || year > 2099) { alert('请输入有效的年份 (2000-2099)'); return; }
    if (!title) { alert('请输入比赛名称'); return; }

    var headers = { 'Content-Type': 'application/json' };
    if (getToken()) {
      headers['Authorization'] = 'Bearer ' + getToken();
    }

    var method, url, body;
    if (editingId) {
      method = 'PUT';
      url = '/api/timeline-manual/' + editingId;
      body = JSON.stringify({ year: year, level: level, title: title });
    } else {
      method = 'POST';
      url = '/api/timeline-manual';
      body = JSON.stringify({ year: year, level: level, title: title });
    }

    fetch(url, { method: method, headers: headers, body: body })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          hideEditor();
          if (editingId) {
            applyEdit(data.entry);
          } else {
            applyAdd(data.entry);
          }
          editingId = null;
        } else {
          alert('保存失败: ' + (data.error || '未知错误'));
        }
      })
      .catch(function (err) {
        alert('网络错误，请确认开发服务器正在运行。\n' + err.message);
      });
  }

  function editEntry(id) {
    showEditor(id);
  }

  function deleteEntry(id) {
    if (!confirm('确定删除这条手动添加的比赛记录？')) return;

    var headers = { 'Content-Type': 'application/json' };
    if (getToken()) {
      headers['Authorization'] = 'Bearer ' + getToken();
    }

    fetch('/api/timeline-manual/' + id, { method: 'DELETE', headers: headers })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          applyDelete(id);
        } else {
          alert('删除失败: ' + (data.error || '未知错误'));
        }
      })
      .catch(function (err) {
        alert('网络错误，请确认开发服务器正在运行。\n' + err.message);
      });
  }

  // ── 监听浮层背景点击关闭 ──
  function setupOverlay() {
    overlay = document.getElementById('timelineEditorOverlay');
    if (!overlay) return;
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) hideEditor();
    });

    var saveBtn = document.getElementById('timelineSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        saveEntry();
      });
    }

    // 键盘 Esc 关闭
    document.addEventListener('keydown', function (e) {
      if (!overlay || !overlay.classList.contains('active')) return;
      if (e.key === 'Escape') hideEditor();
    });
  }

  // ── 初始化 ──
  function init() {
    // 仅在时间线页面激活
    var timelineSection = document.querySelector('.timeline-section');
    if (!timelineSection) return;

    addBtn = document.getElementById('timelineAddBtn');
    setupOverlay();

    if (isAdmin()) {
      showAdminUI();
    } else {
      hideAdminUI();
    }
  }

  // 监听 admin-auth-change 事件（SPA 导航后也会触发）
  window.addEventListener('admin-auth-change', function (e) {
    // SPA 导航可能把我们带到时间线页面，需要重新检测
    if (!addBtn || !document.querySelector('.timeline-section')) {
      var ts = document.querySelector('.timeline-section');
      if (ts) init();
    }
    if (addBtn) {
      if (e.detail && e.detail.loggedIn) {
        showAdminUI();
      } else {
        hideAdminUI();
      }
    }
  });

  // 对外 API
  window.__timelineEditor = {
    showEditor: function () { showEditor(null); },
    hideEditor: hideEditor
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
