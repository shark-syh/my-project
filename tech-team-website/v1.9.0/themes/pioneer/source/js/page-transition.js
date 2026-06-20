(function () {
  if (!window.history || !window.fetch || !window.requestAnimationFrame) return;

  var TRANSITION_DURATION = 180; // 退出动画时长 ms
  var cache = {};               // 预加载缓存
  var currentPath = location.pathname;
  var transitioning = false;

  // 判断是否为站内链接
  function isInternal(href) {
    if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return false;
    return true;
  }

  // 从 HTML 字符串中提取 <main> 和 <title>
  function extractContent(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var main = doc.querySelector('main');
    var title = doc.querySelector('title');
    return {
      mainHTML: main ? main.innerHTML : '',
      title: title ? title.textContent : document.title,
      doc: doc
    };
  }

  // 重新触发 fadeInUp stagger 动画
  function rebindAnimations() {
    var els = document.querySelectorAll('.animate-in');
    els.forEach(function (el) {
      var cls = el.className;
      el.classList.remove('animate-in');
      void el.offsetWidth;
      el.className = cls;
    });
  }

  // 入场动画
  function pageEnter() {
    document.body.classList.add('page-enter');
    document.body.addEventListener('animationend', function handler() {
      document.body.removeEventListener('animationend', handler);
      document.body.classList.remove('page-enter');
      transitioning = false;
    });
  }

  // 更新导航栏 active 状态
  function updateNavActive(path) {
    var navLinks = document.querySelectorAll('.site-nav a');
    navLinks.forEach(function (link) {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });
    // 匹配逻辑与 layout.ejs 一致
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

  // 执行切换
  function navigateTo(url) {
    if (transitioning) return;
    transitioning = true;

    var targetPath = url;
    // 记录到 sessionStorage，让新页面知道是从站内导航来的
    try { sessionStorage.setItem('_from_internal', '1'); } catch (e) {}

    // 步骤1：退出动画
    document.body.classList.add('page-exit-active');

    document.body.addEventListener('animationend', function exitHandler() {
      document.body.removeEventListener('animationend', exitHandler);
      document.body.classList.remove('page-exit-active');

      // 步骤2：fetch + 替换
      var promise = cache[targetPath] ? Promise.resolve(cache[targetPath]) : fetch(targetPath).then(function (r) { return r.text(); });

      promise.then(function (html) {
        cache[targetPath] = html;
        var content = extractContent(html);

        // 替换 <main>
        var main = document.querySelector('main');
        if (main) main.innerHTML = content.mainHTML;

        // 更新 <title>
        document.title = content.title;

        // 更新导航 active
        updateNavActive(targetPath);

        // 步骤3：入场动画
        rebindAnimations();
        history.pushState({ path: targetPath }, '', targetPath);
        currentPath = targetPath;
        window.scrollTo({ top: 0, behavior: 'instant' });

        requestAnimationFrame(function () {
          pageEnter();
        });

        // 重新初始化 admin 功能
        if (window.__admin && window.__admin.isLoggedIn && window.__admin.isLoggedIn()) {
          setTimeout(function () {
            var ev = new CustomEvent('admin-auth-change');
            window.dispatchEvent(ev);
          }, 400);
        }
      }).catch(function () {
        // fetch 失败时回退到整页导航
        location.href = targetPath;
      });
    });
  }

  // 预加载（hover / touchstart）
  function preload(url) {
    if (cache[url]) return;
    fetch(url).then(function (r) { return r.text(); }).then(function (html) {
      cache[url] = html;
    }).catch(function () {});
  }

  // 初始化：绑定所有站内链接
  function init() {
    // 检查是否是从站内导航来的，如果是则播放入场动画
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

    // 确保导航 active 正确
    updateNavActive(location.pathname);

    // 首次打开页面，stagger 入场
    rebindAnimations();
    requestAnimationFrame(function () {
      pageEnter();
    });

    // 拦截所有站内链接
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!isInternal(href)) return;

      // 排除管理员编辑等特殊链接
      if (link.hasAttribute('data-no-transition')) return;
      if (link.getAttribute('target') === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      e.preventDefault();
      navigateTo(href);
    });

    // 预加载：hover 或 touchstart 时缓存目标页
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

    // 处理浏览器前进后退
    window.addEventListener('popstate', function (e) {
      if (e.state && e.state.path) {
        transitioning = true;
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
          requestAnimationFrame(function () {
            pageEnter();
          });
        }).catch(function () {
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
