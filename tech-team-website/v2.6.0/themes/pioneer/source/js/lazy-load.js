(function () {
  var observer = null;
  var loadedSet = new Set();

  function observeAll() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target;
        var src = img.getAttribute('data-src');
        if (!src || loadedSet.has(src)) return;

        observer.unobserve(img);

        var preload = new Image();
        preload.onload = function () {
          img.src = src;
          img.classList.add('loaded');
          loadedSet.add(src);
        };
        preload.onerror = function () {
          img.classList.add('loaded');
          loadedSet.add(src);
        };
        preload.src = src;
      });
    }, { rootMargin: '200px', threshold: 0 });

    // 观察所有未加载的懒图片
    var imgs = document.querySelectorAll('.lazy-img:not(.loaded)');
    imgs.forEach(function (img) {
      observer.observe(img);
    });
  }

  // 初始扫描
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(observeAll, 150); // 等瀑布流布局完成
    });
  } else {
    setTimeout(observeAll, 150);
  }

  // SPA 导航 + 瀑布流 DOM 重排后重新观察
  var mainEl = document.getElementById('main-content');
  if (mainEl) {
    var debounceTimer;
    var mo = new MutationObserver(function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(observeAll, 200);
    });
    mo.observe(mainEl, { childList: true, subtree: true });
  }
})();
