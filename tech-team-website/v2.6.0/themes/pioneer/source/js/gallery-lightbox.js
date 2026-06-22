(function () {
  var overlay = null;
  var imgEl = null;
  var captionEl = null;
  var editBtn = null;
  var editArea = null;
  var saveBtn = null;
  var cancelBtn = null;
  var prevBtn = null;
  var nextBtn = null;
  var indexEl = null;
  var currentFilename = '';
  var currentStory = '';
  var editing = false;
  var scrollY = 0;
  var scrollbarW = 0;
  var photos = [];
  var currentIndex = -1;

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
    overlay.className = 'gallery-overlay overlay overlay--deep';

    imgEl = document.createElement('img');
    overlay.appendChild(imgEl);

    // 前后导航按钮
    prevBtn = document.createElement('button');
    prevBtn.className = 'gallery-overlay-prev';
    prevBtn.setAttribute('aria-label', '上一张');
    prevBtn.innerHTML = '&#10094;';
    prevBtn.addEventListener('click', function (e) { e.stopPropagation(); navigate(-1); });
    overlay.appendChild(prevBtn);

    nextBtn = document.createElement('button');
    nextBtn.className = 'gallery-overlay-next';
    nextBtn.setAttribute('aria-label', '下一张');
    nextBtn.innerHTML = '&#10095;';
    nextBtn.addEventListener('click', function (e) { e.stopPropagation(); navigate(1); });
    overlay.appendChild(nextBtn);

    // 索引指示器
    indexEl = document.createElement('div');
    indexEl.className = 'gallery-overlay-index';
    overlay.appendChild(indexEl);

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
      if (editing) return;
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

  function collectPhotos() {
    photos = [];
    var imgs = document.querySelectorAll('.gallery-wall img');
    imgs.forEach(function (img) {
      photos.push({ src: img.dataset.src || img.src, story: img.dataset.story || '' });
    });
  }

  function updateNavButtons() {
    if (!prevBtn || !nextBtn) return;
    if (photos.length < 2) {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      return;
    }
    prevBtn.style.display = currentIndex <= 0 ? 'none' : '';
    nextBtn.style.display = currentIndex >= photos.length - 1 ? 'none' : '';
  }

  function updateIndex() {
    if (!indexEl) return;
    if (photos.length < 2) {
      indexEl.style.display = 'none';
      return;
    }
    indexEl.textContent = (currentIndex + 1) + ' / ' + photos.length;
    indexEl.style.display = '';
  }

  function navigate(direction) {
    if (photos.length < 2) return;
    if (editing) return;
    var newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= photos.length) return;

    currentIndex = newIndex;
    var photo = photos[currentIndex];
    imgEl.src = photo.src;
    currentFilename = photo.src.split('/').pop().replace(/\.[^.]+$/, '');
    currentStory = photo.story || '';

    if (currentStory) {
      captionEl.textContent = currentStory;
      captionEl.style.display = '';
      editBtn.setAttribute('aria-label', '编辑故事');
    } else {
      captionEl.style.display = 'none';
      editBtn.setAttribute('aria-label', '添加故事');
    }

    editArea.style.display = 'none';
    editing = false;

    updateNavButtons();
    updateIndex();
  }

  function open(src, story) {
    if (!overlay) createDOM();

    collectPhotos();

    currentIndex = -1;
    for (var i = 0; i < photos.length; i++) {
      if (photos[i].src === src) { currentIndex = i; break; }
    }

    lockScroll();
    imgEl.src = src;

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

    editArea.style.display = 'none';
    editing = false;

    updateNavButtons();
    updateIndex();

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

          // 同步更新 photos 数组
          if (currentIndex >= 0 && currentIndex < photos.length) {
            photos[currentIndex].story = currentStory;
          }

          // 同步更新照片墙中对应图片的 data-story 和 badge
          var wall = document.querySelector('.gallery-wall');
          if (wall) {
            var safeName = currentFilename.replace(/["\\]/g, '');
            var wallImg = wall.querySelector('img[data-src*="' + safeName + '"]') || wall.querySelector('img[src*="' + safeName + '"]');
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
          window.__admin.toast('保存失败: ' + window.__admin.escapeHTML(data.error || '未知错误'), 'error');
        }
      })
      .catch(function (err) {
        window.__admin.toast('网络错误，请确认开发服务器正在运行。', 'error');
      });
  }

  function close() {
    overlay.classList.remove('active');

    function onTransitionEnd(e) {
      if (e.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', onTransitionEnd);
      unlockScroll();
    }
    overlay.addEventListener('transitionend', onTransitionEnd);
    setTimeout(function () {
      overlay.removeEventListener('transitionend', onTransitionEnd);
      unlockScroll();
    }, 350);
  }

  // 键盘：Esc 关闭/取消编辑，左右方向键切换
  document.addEventListener('keydown', function (e) {
    if (!overlay || !overlay.classList.contains('active')) return;
    if (editing) {
      if (e.key === 'Escape') { cancelEdit(); }
      return;
    }
    if (e.key === 'Escape') { close(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
  });

  // 触摸滑动切换
  var touchStartX = 0;
  var touchStartY = 0;

  document.addEventListener('touchstart', function (e) {
    if (!overlay || !overlay.classList.contains('active')) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!overlay || !overlay.classList.contains('active')) return;
    if (editing) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      navigate(dx > 0 ? -1 : 1);
    }
  });

  // 点击照片墙图片 → 打开灯箱
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target && target.tagName === 'IMG' && target.closest('.gallery-wall')) {
      e.preventDefault();
      open(target.dataset.src || target.src, target.dataset.story || '');
    }
  });

  // ═══════════════════════════════════════
  //  瀑布流布局
  // ═══════════════════════════════════════

  function layoutMasonry() {
    var wall = document.querySelector('.gallery-wall');
    if (!wall) return;

    var width = wall.clientWidth;
    var cols;
    if (width >= 920) cols = 4;
    else if (width >= 640) cols = 3;
    else if (width >= 480) cols = 2;
    else cols = 1;

    // 先还原：把列中的 figure 移回 wall
    var columns = wall.querySelectorAll('.gallery-column');
    columns.forEach(function (col) {
      while (col.firstChild) {
        wall.appendChild(col.firstChild);
      }
      col.remove();
    });
    wall.classList.remove('gallery-wall-masonry');

    if (cols === 1) return; // 单列无需瀑布流

    var figures = Array.from(wall.querySelectorAll('.gallery-photo'));
    if (figures.length === 0) return;

    // 创建列
    var columnDivs = [];
    var columnHeights = [];
    for (var c = 0; c < cols; c++) {
      var col = document.createElement('div');
      col.className = 'gallery-column';
      columnDivs.push(col);
      columnHeights.push(0);
    }

    // 最短列优先分配
    figures.forEach(function (fig) {
      var minIdx = 0;
      for (var j = 1; j < cols; j++) {
        if (columnHeights[j] < columnHeights[minIdx]) minIdx = j;
      }
      columnDivs[minIdx].appendChild(fig);
      var img = fig.querySelector('img');
      if (img && img.naturalHeight && img.naturalWidth) {
        columnHeights[minIdx] += img.naturalHeight / img.naturalWidth;
      } else {
        columnHeights[minIdx] += 1;
      }
    });

    wall.classList.add('gallery-wall-masonry');
    columnDivs.forEach(function (col) { wall.appendChild(col); });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutMasonry, 200);
  });

  // 初始化瀑布流
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(layoutMasonry, 100); });
  } else {
    setTimeout(layoutMasonry, 100);
  }

  // SPA 导航后重新布局
  window.addEventListener('admin-auth-change', function () {
    setTimeout(layoutMasonry, 300);
  });

  measureScrollbar();
})();
