(function () {
  if (!window.history || !window.fetch || !window.requestAnimationFrame) return;

  var TRANSITION_DURATION = 280;
  var cache = {};
  var currentPath = location.pathname;
  var transitioning = false;
  var safetyTimer;
  var progressBar = null;
  var loadingTimer = null;

  function isInternal(href) {
    if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return false;
    return true;
  }

  function extractContent(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var main = doc.querySelector('main');
    var title = doc.querySelector('title');
    return {
      mainHTML: main ? main.innerHTML : '',
      title: title ? title.textContent : document.title
    };
  }

  function rebindAnimations() {
    var els = document.querySelectorAll('.animate-in');
    els.forEach(function (el) {
      var cls = el.className;
      el.classList.remove('animate-in');
      void el.offsetWidth;
      el.className = cls;
    });
  }

  function pageEnter() {
    document.body.classList.add('page-enter');
    document.body.addEventListener('animationend', function handler() {
      document.body.removeEventListener('animationend', handler);
      document.body.classList.remove('page-enter');
      clearTimeout(safetyTimer);
      transitioning = false;
    });
  }

  function updateNavActive(path) {
    var navLinks = document.querySelectorAll('.site-nav a');
    navLinks.forEach(function (link) {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      if (path === '/' || path === '/index.html' || path === '') {
        if (href === '/') { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
      } else if (href !== '/' && path.startsWith(href.replace(/\/$/, ''))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ── 顶部加载进度条 ──

  function createProgressBar() {
    if (progressBar) return;
    progressBar = document.createElement('div');
    progressBar.className = 'page-loading-bar';
    document.body.appendChild(progressBar);
  }

  function loadingStart() {
    createProgressBar();
    progressBar.classList.remove('done');
    progressBar.classList.add('active');
    // 安全超时：2s 后强制完成
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(function () {
      if (progressBar && progressBar.classList.contains('active')) {
        progressBar.classList.add('done');
      }
    }, 2000);
  }

  function loadingDone() {
    clearTimeout(loadingTimer);
    if (!progressBar) return;
    progressBar.classList.add('done');
    progressBar.addEventListener('animationend', function handler() {
      progressBar.removeEventListener('animationend', handler);
      progressBar.classList.remove('active', 'done');
    });
  }

  // ── 页面切换 ──

  function navigateTo(url) {
    if (transitioning) return;
    transitioning = true;
    safetyTimer = setTimeout(function () {
      if (transitioning) transitioning = false;
    }, 2000);

    loadingStart();

    var targetPath = url;
    try { sessionStorage.setItem('_from_internal', '1'); } catch (e) {}

    document.body.classList.add('page-exit-active');

    document.body.addEventListener('animationend', function exitHandler() {
      document.body.removeEventListener('animationend', exitHandler);
      document.body.classList.remove('page-exit-active');

      var promise = cache[targetPath] ? Promise.resolve(cache[targetPath]) : fetch(targetPath).then(function (r) { return r.text(); });

      promise.then(function (html) {
        cache[targetPath] = html;
        var content = extractContent(html);

        var main = document.querySelector('main');
        if (main) main.innerHTML = content.mainHTML;

        document.title = content.title;

        updateNavActive(targetPath);

        rebindAnimations();
        history.pushState({ path: targetPath }, '', targetPath);
        currentPath = targetPath;
        window.scrollTo({ top: 0, behavior: 'instant' });

        loadingDone();

        requestAnimationFrame(function () {
          pageEnter();
        });

        if (window.__admin && window.__admin.isLoggedIn && window.__admin.isLoggedIn()) {
          setTimeout(function () {
            var ev = new CustomEvent('admin-auth-change', { detail: { loggedIn: true } });
            window.dispatchEvent(ev);
          }, 400);
        }
      }).catch(function () {
        loadingDone();
        location.href = targetPath;
      });
    });
  }

  function preload(url) {
    if (cache[url]) return;
    fetch(url).then(function (r) { return r.text(); }).then(function (html) {
      cache[url] = html;
    }).catch(function () {});
  }

  function init() {
    try {
      var fromInternal = sessionStorage.getItem('_from_internal');
      sessionStorage.removeItem('_from_internal');
      if (fromInternal === '1') {
        rebindAnimations();
        requestAnimationFrame(function () {
          pageEnter();
        });
        return;
      }
    } catch (e) {}

    updateNavActive(location.pathname);

    rebindAnimations();
    requestAnimationFrame(function () {
      pageEnter();
    });

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!isInternal(href)) return;

      if (link.hasAttribute('data-no-transition')) return;
      if (link.getAttribute('target') === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      e.preventDefault();
      navigateTo(href);
    });

    document.addEventListener('mouseover', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (isInternal(href)) preload(href);
    }, { passive: true });

    document.addEventListener('touchstart', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (isInternal(href)) preload(href);
    }, { passive: true });

    window.addEventListener('popstate', function (e) {
      if (e.state && e.state.path) {
        transitioning = true;
        loadingStart();
        safetyTimer = setTimeout(function () {
          if (transitioning) transitioning = false;
        }, 2000);
        var targetPath = e.state.path;

        fetch(targetPath).then(function (r) { return r.text(); }).then(function (html) {
          var content = extractContent(html);
          var main = document.querySelector('main');
          if (main) main.innerHTML = content.mainHTML;
          document.title = content.title;
          currentPath = targetPath;
          updateNavActive(targetPath);
          rebindAnimations();
          window.scrollTo({ top: 0, behavior: 'instant' });

          loadingDone();

          if (window.__admin && window.__admin.isLoggedIn && window.__admin.isLoggedIn()) {
            setTimeout(function () {
              var ev = new CustomEvent('admin-auth-change', { detail: { loggedIn: true } });
              window.dispatchEvent(ev);
            }, 400);
          }
          requestAnimationFrame(function () {
            pageEnter();
          });
        }).catch(function () {
          loadingDone();
          location.href = targetPath;
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
