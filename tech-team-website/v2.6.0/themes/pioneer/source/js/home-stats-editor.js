(function () {
  if (!window.__admin) return;

  function initStatsEditor() {
    var loggedIn = window.__admin.isLoggedIn();
    var statsEl = document.getElementById('heroStats');
    if (!statsEl) return;

    var numbers = statsEl.querySelectorAll('.hero-stat-number');
    numbers.forEach(function (numEl) {
      var statEl = numEl.parentElement;
      var key = statEl.getAttribute('data-key');
      var autoVal = statEl.getAttribute('data-auto');

      if (loggedIn) {
        statEl.classList.add('editable');
        numEl.title = '点击编辑 · 双击重置为自动值（' + autoVal + '）';
        numEl.style.cursor = 'pointer';
      } else {
        statEl.classList.remove('editable');
        numEl.title = '';
        numEl.style.cursor = '';
      }

      if (numEl._statsEditorBound) return;
      numEl._statsEditorBound = true;

      numEl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!window.__admin || !window.__admin.isLoggedIn()) return;
        if (numEl.querySelector('input')) return;
        var current = numEl.textContent.trim();
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'hero-stat-input';
        input.value = current;
        input.style.cssText = numEl.style.cssText;
        numEl.textContent = '';
        numEl.appendChild(input);
        input.focus();
        input.select();

        var t = window.__admin.getToken();
        function save() {
          var val = input.value.trim();
          if (!val) { cancel(); return; }
          fetch('/api/home-stats', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
            body: JSON.stringify({ key: key, value: val })
          }).then(function (r) {
            if (r.ok) {
              numEl.textContent = val;
            } else {
              cancel();
            }
          }).catch(function () { cancel(); });
        }

        function cancel() {
          numEl.textContent = current;
        }

        input.addEventListener('blur', save);
        input.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { input.blur(); }
          if (ev.key === 'Escape') { cancel(); }
        });
      });

      numEl.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        if (!window.__admin || !window.__admin.isLoggedIn()) return;
        if (numEl.querySelector('input')) return;
        if (!confirm('重置「' + key + '」为自动计算值（' + autoVal + '）？')) return;
        var t = window.__admin.getToken();
        fetch('/api/home-stats', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
          body: JSON.stringify({ key: key })
        }).then(function (r) {
          if (r.ok) {
            numEl.textContent = autoVal;
          }
        }).catch(function () {});
      });
    });
  }

  initStatsEditor();
  window.addEventListener('admin-auth-change', function () {
    initStatsEditor();
  });
})();
