(function () {

  var addBtn = null;
  var editorOverlay = null;
  var loggedIn = false;
  var editingSlug = null;
  var memberCache = [];

  // ── 创建添加按钮 ──
  function createAddBtn() {
    if (addBtn) {
      // SPA 切换后重新挂载到当前 DOM 的 heading
      var heading = document.querySelector('#team .section-heading') || document.querySelector('.section-heading');
      if (heading && addBtn.parentNode !== heading) {
        heading.appendChild(addBtn);
      }
      updateAddBtn();
      return;
    }

    addBtn = document.createElement('button');
    addBtn.className = 'add-member-btn';
    addBtn.textContent = '＋ 添加成员';
    addBtn.addEventListener('click', openAddForm);

    var heading = document.querySelector('#team .section-heading') || document.querySelector('.section-heading');
    if (heading) {
      heading.appendChild(addBtn);
    }

    updateAddBtn();
  }

  function updateAddBtn() {
    if (!addBtn) return;
    addBtn.classList.toggle('visible', loggedIn);
  }

  // ── 创建编辑浮层 ──
  function createEditor() {
    if (editorOverlay) return;

    editorOverlay = document.createElement('div');
    editorOverlay.className = 'member-editor-overlay overlay';

    var panel = document.createElement('div');
    panel.className = 'member-editor-panel overlay-panel';

    var title = document.createElement('div');
    title.className = 'member-editor-title';
    title.textContent = '添加成员';
    panel.appendChild(title);

    var errEl = document.createElement('div');
    errEl.className = 'member-editor-error';
    panel.appendChild(errEl);

    function addField(label, id, type, placeholder, hint, required) {
      var group = document.createElement('div');
      group.className = 'member-editor-group';

      var lbl = document.createElement('label');
      if (required) {
        var star = document.createElement('span');
        star.className = 'member-editor-required';
        star.textContent = '* ';
        lbl.appendChild(star);
      }
      lbl.appendChild(document.createTextNode(label));
      group.appendChild(lbl);

      if (type === 'textarea') {
        var ta = document.createElement('textarea');
        ta.className = 'member-editor-textarea';
        ta.id = id;
        ta.placeholder = placeholder;
        group.appendChild(ta);
      } else {
        var inp = document.createElement('input');
        inp.type = type;
        inp.className = 'member-editor-input';
        inp.id = id;
        inp.placeholder = placeholder;
        group.appendChild(inp);
      }

      if (hint) {
        var hintEl = document.createElement('div');
        hintEl.className = 'member-editor-hint';
        hintEl.textContent = hint;
        group.appendChild(hintEl);
      }

      return group;
    }

    panel.appendChild(addField('姓名', 'meName', 'text', '例：张三', null, true));
    panel.appendChild(addField('URL 标识（slug）', 'meSlug', 'text', '例：zhang-san 或英文代号', '小写字母、数字、连字符，用作个人页 URL（如 /members/zhang-san/）', true));
    panel.appendChild(addField('所属社团', 'meRole', 'text', '例：机器人与自动控制社', null, true));
    panel.appendChild(addField('年级', 'meGrade', 'text', '例：2025 级', null, true));
    panel.appendChild(addField('头像路径', 'meAvatar', 'text', '例：/assets/images/avatars/xxx.svg', '留空自动生成', false));
    panel.appendChild(addField('一句话简介', 'meSummary', 'text', '例：专注于机器人结构设计', null, true));
    panel.appendChild(addField('荣誉列表', 'meHonors', 'textarea', '每行一项荣誉', null, false));
    panel.appendChild(addField('项目列表', 'meProjects', 'textarea', '每行一个项目', null, false));
    panel.appendChild(addField('格言', 'meQuote', 'text', '例：让机械结构先跑起来', null, false));

    // 按钮行
    var btnRow = document.createElement('div');
    btnRow.className = 'member-editor-btns';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'gallery-overlay-save-btn';
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', saveMember);
    btnRow.appendChild(saveBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'gallery-overlay-cancel-btn';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', hideEditor);
    btnRow.appendChild(cancelBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'member-editor-delete-btn';
    delBtn.textContent = '删除成员';
    delBtn.addEventListener('click', function () {
      var slug = editingSlug;
      var name = document.getElementById('meName').value.trim();
      if (!slug || !name) return;
      deleteMember(slug, name);
    });
    btnRow.appendChild(delBtn);

    panel.appendChild(btnRow);
    editorOverlay.appendChild(panel);

    editorOverlay.addEventListener('mousedown', function (e) {
      if (e.target === editorOverlay) hideEditor();
    });

    document.body.appendChild(editorOverlay);
  }

  function clearForm() {
    document.getElementById('meName').value = '';
    document.getElementById('meSlug').value = '';
    document.getElementById('meRole').value = '';
    document.getElementById('meGrade').value = '';
    document.getElementById('meAvatar').value = '';
    document.getElementById('meSummary').value = '';
    document.getElementById('meHonors').value = '';
    document.getElementById('meProjects').value = '';
    document.getElementById('meQuote').value = '';
  }

  function fillForm(member) {
    document.getElementById('meName').value = member.name || '';
    document.getElementById('meSlug').value = member.slug || '';
    document.getElementById('meRole').value = member.role || '';
    document.getElementById('meGrade').value = member.grade || '';
    document.getElementById('meAvatar').value = member.avatar || '';
    document.getElementById('meSummary').value = member.summary || '';
    document.getElementById('meHonors').value = (member.honors || []).join('\n');
    document.getElementById('meProjects').value = (member.projects || []).join('\n');
    document.getElementById('meQuote').value = member.quote || '';
  }

  function openAddForm() {
    if (!loggedIn) return;
    if (!editorOverlay) createEditor();
    editingSlug = null;
    editorOverlay.querySelector('.member-editor-title').textContent = '添加成员';
    editorOverlay.querySelector('.member-editor-error').textContent = '';
    var delBtn = editorOverlay.querySelector('.member-editor-delete-btn');
    if (delBtn) delBtn.style.display = 'none';
    clearForm();
    editorOverlay.classList.add('active');
    setTimeout(function () { document.getElementById('meName').focus(); }, 100);
  }

  function openEditForm(slug) {
    if (!loggedIn) return;
    var member = memberCache.find(function (m) { return m.slug === slug; });
    if (!member) return;
    if (!editorOverlay) createEditor();
    editingSlug = slug;
    editorOverlay.querySelector('.member-editor-title').textContent = '编辑成员';
    editorOverlay.querySelector('.member-editor-error').textContent = '';
    var delBtn = editorOverlay.querySelector('.member-editor-delete-btn');
    if (delBtn) delBtn.style.display = '';
    fillForm(member);
    editorOverlay.classList.add('active');
    setTimeout(function () { document.getElementById('meName').focus(); }, 100);
  }

  function deleteMember(slug, name) {
    if (!confirm('确定要删除成员「' + name + '」吗？\n此操作不可撤销。')) return;

    var headers = { 'Content-Type': 'application/json' };
    var token = window.__admin && window.__admin.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch('/api/members/' + slug, {
      method: 'DELETE',
      headers: headers
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          hideEditor();
          location.reload();
        } else {
          window.__admin.toast('删除失败: ' + window.__admin.escapeHTML(data.error || '未知错误'), 'error');
        }
      })
      .catch(function (err) {
        window.__admin.toast('网络错误: ' + err.message, 'error');
      });
  }

  function hideEditor() {
    if (editorOverlay) editorOverlay.classList.remove('active');
  }

  function saveMember() {
    var name = document.getElementById('meName').value.trim();
    var slug = document.getElementById('meSlug').value.trim();
    var role = document.getElementById('meRole').value.trim();
    var grade = document.getElementById('meGrade').value.trim();
    var avatar = document.getElementById('meAvatar').value.trim();
    var summary = document.getElementById('meSummary').value.trim();
    var honorsRaw = document.getElementById('meHonors').value.trim();
    var projectsRaw = document.getElementById('meProjects').value.trim();
    var quote = document.getElementById('meQuote').value.trim();
    var errEl = editorOverlay.querySelector('.member-editor-error');

    if (!name) { errEl.textContent = '请输入姓名'; return; }
    if (!slug) { errEl.textContent = '请输入 URL 标识'; return; }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      errEl.textContent = 'URL 标识格式不合法（小写字母、数字、连字符，不能以连字符开头或结尾）';
      return;
    }
    if (!role) { errEl.textContent = '请输入所属社团'; return; }
    if (!grade) { errEl.textContent = '请输入年级'; return; }
    if (!summary) { errEl.textContent = '请输入一句话简介'; return; }

    var honors = honorsRaw ? honorsRaw.split(/\r?\n/).filter(function (s) { return s.trim(); }) : [];
    var projects = projectsRaw ? projectsRaw.split(/\r?\n/).filter(function (s) { return s.trim(); }) : [];

    var body = {
      name: name,
      slug: slug,
      role: role,
      grade: grade,
      avatar: avatar,
      summary: summary,
      honors: honors,
      projects: projects,
      quote: quote
    };

    var headers = { 'Content-Type': 'application/json' };
    var token = window.__admin && window.__admin.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var isEdit = editingSlug !== null;
    var url = isEdit ? '/api/members/' + editingSlug : '/api/members';
    var method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify(body)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          hideEditor();
          location.reload();
        } else {
          errEl.textContent = data.error || '保存失败';
        }
      })
      .catch(function (err) {
        errEl.textContent = '网络错误: ' + err.message;
      });
  }

  // ── 键盘事件 ──
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && editorOverlay && editorOverlay.classList.contains('active')) {
      hideEditor();
    }
  });

  // ── 获取成员列表（缓存） ──
  function fetchMembers() {
    fetch('/api/members')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        memberCache = Array.isArray(data) ? data : [];
        updateCardState();
      })
      .catch(function () {
        memberCache = [];
      });
  }

  // ── 更新卡片视觉状态 ──
  function updateCardState() {
    var cards = document.querySelectorAll('.member-card');
    cards.forEach(function (card) {
      card.classList.toggle('admin-editable', loggedIn);
      card.title = loggedIn ? '点击编辑' : '';
    });
  }

  // ── 卡片点击：document 级事件委托（SPA 切换后仍有效） ──
  document.addEventListener('click', function (e) {
    if (!loggedIn) return;
    var card = e.target.closest('.member-card');
    if (!card) return;
    var href = card.getAttribute('href') || '';
    var slugMatch = href.match(/\/members\/([^/]+)\/?/);
    if (!slugMatch) return;
    var slug = slugMatch[1];
    var member = memberCache.find(function (m) { return m.slug === slug; });
    if (!member) return;
    e.preventDefault();
    openEditForm(slug);
  });

  // ── 初始化 ──
  if (!window.__admin) return;
  loggedIn = window.__admin.isLoggedIn();
  createAddBtn();
  if (loggedIn) fetchMembers();

  window.addEventListener('admin-auth-change', function (e) {
    loggedIn = e.detail.loggedIn;
    createAddBtn();
    updateCardState();
    if (loggedIn) fetchMembers();
  });
})();
