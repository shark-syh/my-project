(function() {
  var btn = document.getElementById('backTop');
  window.addEventListener('scroll', function() {
    btn.classList.toggle('visible', window.scrollY > 400);
    var header = document.querySelector('.site-header');
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      var open = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open);
    });
    nav.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', function(e) {
      if (!nav.classList.contains('nav-open')) return;
      if (!nav.contains(e.target) && e.target !== toggle) {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
