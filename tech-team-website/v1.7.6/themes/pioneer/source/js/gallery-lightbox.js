(function () {
  var galleryWall = document.querySelector('.gallery-wall');
  if (!galleryWall) return;

  var overlay = null;
  var imgEl = null;
  var captionEl = null;
  var editBtn = null;
  var editArea = null;
  var saveBtn = null;
  var cancelBtn = null;
  var currentFilename = '';
  var currentStory = '';
  var editing = false;
  var scrollY = 0;
  var scrollbarW = 0;

  function measureScrollbar() {
    var outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    document.body.appendChild(outer);
    var inner = document.createElement('div');
    outer.appendChild(inner);
    scrollbarW = outer.offsetWidth - inner.offsetWidth;
    document.body.removeChild(outer);
  }

  function createDOM() {
    overlay = document.createElement('div');
    overlay.className = 'gallery-overlay';

    imgEl = document.createElement('img');
    overlay.appendChild(imgEl);

    captionEl = document.createElement('div');
    captionEl.className = 'gallery-overlay-caption';
    overlay.appendChild(captionEl);

    editBtn = document.createElement('button');
    editBtn.className = 'gallery-overlay-edit-btn';
    editBtn.setAttribute('aria-label', '编辑故事');
    editBtn.innerHTML = '&#9998;';
    editBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      startEdit();
    });
    overlay.appendChild(editBtn);

    editArea = document.createElement('div');
    editArea.className = 'gallery-overlay-edit-area';
    editArea.style.display = 'none';

    var textarea = document.createElement('textarea');
    textarea.className = 'gallery-overlay-textarea';
    editArea.appendChild(textarea);

    var btnRow = document.createElement('div');
    btnRow.className = 'gallery-overlay-edit-btns';

    saveBtn = document.createElement('button');
    saveBtn.className = 'gallery-overlay-save-btn';
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      saveStory();
    });
    btnRow.appendChild(saveBtn);

    cancelBtn = document.createElement('button');
    cancelBtn.className = 'gallery-overlay-cancel-btn';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      cancelEdit();
    });
    btnRow.appendChild(cancelBtn);

    editArea.appendChild(btnRow);
    overlay.appendChild(editArea);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'gallery-overlay-close';
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      close();
    });
    overlay.appendChild(closeBtn);

    overlay.addEventListener('mousedown', function (e) {
      if (editing) return; // 编辑中不响应遮罩点击
      if (e.target === overlay) close();
    });

    document.body.appendChild(overlay);
  }

  function lockScroll() {
    scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = scrollbarW + 'px';
  }

  function unlockScroll() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, scrollY);
  }

  function open(src, story) {
    if (!overlay) createDOM();

    lockScroll();
    imgEl.src = src;

    // 从 src 提取文件名（无扩展名）
    currentFilename = src.split('/').pop().replace(/\.[^.]+$/, '');
    currentStory = story || '';

    if (currentStory) {
      captionEl.textContent = currentStory;
      captionEl.style.display = '';
      editBtn.setAttribute('aria-label', '编辑故事');
    } else {
      captionEl.style.display = 'none';
      editBtn.setAttribute('aria-label', '添加故事');
    }

    editBtn.style.display = (window.__admin && window.__admin.isLoggedIn()) ? '' : 'none';

    // 确保编辑界面隐藏
    editArea.style.display = 'none';

    overlay.offsetHeight;
    overlay.classList.add('active');
  }

  function startEdit() {
    editing = true;
    captionEl.style.display = 'none';
    editBtn.style.display = 'none';
    editArea.style.display = '';
    editArea.querySelector('textarea').value = currentStory;
    editArea.querySelector('textarea').focus();
  }

  function cancelEdit() {
    editing = false;
    editArea.style.display = 'none';
    editBtn.style.display = '';
    if (currentStory) {
      captionEl.style.display = '';
    }
  }

  function saveStory() {
    var newStory = editArea.querySelector('textarea').value.trim();

    var headers = { 'Content-Type': 'application/json' };
    if (window.__admin && window.__admin.getToken()) {
      headers['Authorization'] = 'Bearer ' + window.__admin.getToken();
    }

    fetch('/api/story', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ filename: currentFilename, story: newStory })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          editing = false;
          currentStory = newStory;

          // 同步更新照片墙中对应图片的 data-story 和 badge
          var wallImg = galleryWall.querySelector('img[src*="' + currentFilename + '"]');
          if (wallImg) {
            wallImg.dataset.story = currentStory;
            var figure = wallImg.closest('.gallery-photo');
            var badge = figure && figure.querySelector('.gallery-photo-badge');
            if (currentStory && !badge) {
              var span = document.createElement('span');
              span.className = 'gallery-photo-badge';
              span.setAttribute('aria-hidden', 'true');
              span.textContent = '📖';
              figure.appendChild(span);
            } else if (!currentStory && badge) {
              badge.remove();
            }
          }

          if (currentStory) {
            captionEl.textContent = currentStory;
            captionEl.style.display = '';
            editBtn.setAttribute('aria-label', '编辑故事');
          } else {
            captionEl.style.display = 'none';
            editBtn.setAttribute('aria-label', '添加故事');
          }
          editArea.style.display = 'none';
          editBtn.style.display = '';
        } else {
          alert('保存失败: ' + (data.error || '未知错误'));
        }
      })
      .catch(function (err) {
        alert('网络错误，请确认开发服务器正在运行。\n' + err.message);
      });
  }

  function close() {
    overlay.classList.remove('active');

    // 等 CSS 过渡播完再恢复滚动条，避免动画中途视口宽度突变
    setTimeout(function () {
      unlockScroll();
    }, 320);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !overlay || !overlay.classList.contains('active')) return;
    if (editing) {
      cancelEdit();
    } else {
      close();
    }
  });

  galleryWall.addEventListener('click', function (e) {
    var target = e.target;
    if (target && target.tagName === 'IMG') {
      e.preventDefault();
      open(target.src, target.dataset.story || '');
    }
  });

  measureScrollbar();
})();
