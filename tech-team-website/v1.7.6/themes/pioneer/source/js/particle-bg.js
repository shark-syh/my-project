(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'particleCanvas';
  const head = document.body.firstChild;
  document.body.insertBefore(canvas, head);

  const ctx = canvas.getContext('2d');

  var COLORS = {
    particle: 'rgba(24, 77, 71, 0.22)',
    line: 'rgba(24, 77, 71, ',
    lineNear: 'rgba(240, 180, 60, '
  };

  var CONFIG = {
    particleCount: 240,
    maxVelocity: 0.45,
    lineDistance: 120,
    mouseRadius: 180
  };

  var particles = [];
  var mouse = { x: null, y: null, targetX: null, targetY: null, radius: CONFIG.mouseRadius };
  var cellSize = CONFIG.lineDistance;
  var grid = {};

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    if (window.innerWidth < 768) {
      CONFIG.particleCount = 90;
      CONFIG.lineDistance = 80;
      mouse.radius = 140;
    } else {
      CONFIG.particleCount = 240;
      CONFIG.lineDistance = 120;
      mouse.radius = CONFIG.mouseRadius;
    }
    cellSize = CONFIG.lineDistance;
  }

  function Particle(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * CONFIG.maxVelocity;
    this.vy = (Math.random() - 0.5) * CONFIG.maxVelocity;
    this.radius = Math.random() * 1.6 + 0.8;
    this.baseRadius = this.radius;
    this.nearMouse = false;
  }

  Particle.prototype.update = function (w, h) {
    if (this.x < 0 || this.x > w) this.vx *= -1;
    if (this.y < 0 || this.y > h) this.vy *= -1;

    this.x += this.vx;
    this.y += this.vy;
    this.nearMouse = false;

    if (mouse.x !== null) {
      var dx = this.x - mouse.x;
      var dy = this.y - mouse.y;
      var dist = Math.hypot(dx, dy);

      if (dist < mouse.radius) {
        this.nearMouse = true;
        var force = (mouse.radius - dist) / mouse.radius;
        this.x += (dx / dist) * force * 1.6;
        this.y += (dy / dist) * force * 1.6;
        this.radius = this.baseRadius + force * 1.2;
      } else if (this.radius > this.baseRadius) {
        this.radius -= 0.08;
      }
    }
  };

  Particle.prototype.draw = function () {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.particle;
    ctx.fill();
  };

  function key(x, y) {
    return Math.floor(x / cellSize) + ',' + Math.floor(y / cellSize);
  }

  function buildGrid() {
    grid = {};
    for (var i = 0; i < particles.length; i++) {
      var k = key(particles[i].x, particles[i].y);
      if (!grid[k]) grid[k] = [];
      grid[k].push(i);
    }
  }

  function init() {
    particles = [];
    var w = window.innerWidth;
    var h = window.innerHeight;
    for (var i = 0; i < CONFIG.particleCount; i++) {
      particles.push(new Particle(w, h));
    }
  }

  function drawConnections() {
    var keys = Object.keys(grid);
    var drawnPairs = new Set();

    for (var ki = 0; ki < keys.length; ki++) {
      var cell = grid[keys[ki]];
      if (!cell || cell.length < 2) continue;

      // 同个 cell 内的粒子配对
      for (var i = 0; i < cell.length; i++) {
        for (var j = i + 1; j < cell.length; j++) {
          drawLineIfClose(cell[i], cell[j]);
        }
      }

      // 与相邻 cell 配对（只检查右/下/右下/左下，避免重复）
      var parts = keys[ki].split(',');
      var cx = parseInt(parts[0]);
      var cy = parseInt(parts[1]);
      var neighbors = [
        cx + 1 + ',' + cy,
        cx + ',' + (cy + 1),
        cx + 1 + ',' + (cy + 1),
        cx - 1 + ',' + (cy + 1)
      ];

      for (var ni = 0; ni < neighbors.length; ni++) {
        var nCell = grid[neighbors[ni]];
        if (!nCell) continue;
        for (var a = 0; a < cell.length; a++) {
          for (var b = 0; b < nCell.length; b++) {
            drawLineIfClose(cell[a], nCell[b]);
          }
        }
      }
    }
  }

  function drawLineIfClose(i, j) {
    var p1 = particles[i];
    var p2 = particles[j];
    var dx = p1.x - p2.x;
    var dy = p1.y - p2.y;
    var dist = Math.hypot(dx, dy);

    if (dist < CONFIG.lineDistance) {
      var nearMouse = p1.nearMouse || p2.nearMouse;
      var baseAlpha = (1 - dist / CONFIG.lineDistance) * (nearMouse ? 0.14 : 0.08);
      var colorSet = nearMouse ? COLORS.lineNear : COLORS.line;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = colorSet + baseAlpha.toFixed(3) + ')';
      ctx.lineWidth = nearMouse ? 0.7 : 0.4;
      ctx.stroke();
    }
  }

  function animate() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (mouse.targetX !== null) {
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;
    }

    var w = window.innerWidth;
    var h = window.innerHeight;

    for (var i = 0; i < particles.length; i++) {
      particles[i].update(w, h);
      particles[i].draw();
    }

    buildGrid();
    drawConnections();

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', function () { resize(); init(); });

  document.addEventListener('mousemove', function (e) {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  });

  document.addEventListener('mouseleave', function () {
    mouse.x = mouse.y = mouse.targetX = mouse.targetY = null;
  });

  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 0) {
      mouse.targetX = e.touches[0].clientX;
      mouse.targetY = e.touches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener('touchend', function () {
    mouse.x = mouse.y = mouse.targetX = mouse.targetY = null;
  });

  resize();
  init();
  animate();
})();
