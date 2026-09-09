/* Dependency-free concept illustration; it does not represent a real experiment. */
(() => {
  "use strict";
  const scene = document.querySelector(".robot-scene");
  const canvas = document.getElementById("robot-canvas");
  if (!scene || !canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const viewport = scene.querySelector(".scene-viewport");
  const motionButton = document.getElementById("motion-toggle");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const TAU = Math.PI * 2;
  let width = 0,
    height = 0,
    scale = 1,
    cx = 0,
    cy = 0;
  let time = 0,
    frame = 0,
    lastFrame = 0;
  let paused = motionPreference.matches,
    inView = true;
  let mode = "data",
    yaw = 0.64,
    targetYaw = 0.64;
  const pitch = 0.38;

  // Orthographic projection preserves the schematic character at every size.
  function project(p) {
    const x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw);
    const z = -p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw);
    return [cx + x * scale, cy - (p[1] * Math.cos(pitch) - z * Math.sin(pitch)) * scale, z * Math.cos(pitch) + p[1] * Math.sin(pitch)];
  }
  function line(points, color, thickness = 1, dash = []) {
    ctx.beginPath();
    points.forEach((point, i) => {
      const p = project(point);
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function polygon(points, fill, stroke = null, thickness = 1) {
    ctx.beginPath();
    points.forEach((point, i) => {
      const p = project(point);
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = thickness;
      ctx.stroke();
    }
  }
  function dot(point, radius, color, glow = 0) {
    const p = project(point);
    ctx.beginPath();
    ctx.arc(p[0], p[1], radius, 0, TAU);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  function ring(center, radius, color, thickness = 1, start = 0, end = TAU) {
    const points = [];
    const segments = 72;
    for (let i = 0; i <= segments; i++) {
      const a = start + ((end - start) * i) / segments;
      points.push([center[0] + Math.cos(a) * radius, center[1], center[2] + Math.sin(a) * radius]);
    }
    line(points, color, thickness);
  }
  function box(center, size, colors = ["#18303c", "#234652", "#365d65"], edge = "#608a94") {
    const points = [];
    for (let y = -1; y <= 1; y += 2)
      for (let z = -1; z <= 1; z += 2)
        for (let x = -1; x <= 1; x += 2) {
          points.push([center[0] + (x * size[0]) / 2, center[1] + (y * size[1]) / 2, center[2] + (z * size[2]) / 2]);
        }
    const faces = [
      [0, 1, 3, 2],
      [0, 4, 5, 1],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 5, 7, 3],
      [4, 6, 7, 5],
    ];
    faces
      .map((ids, i) => ({
        points: ids.map((j) => points[j]),
        color: colors[i === 5 ? 2 : i % 2],
        depth: ids.reduce((sum, j) => sum + project(points[j])[2], 0) / 4,
      }))
      .sort((a, b) => a.depth - b.depth)
      .forEach((face) => polygon(face.points, face.color, edge, 0.85));
  }
  function link(a, b, thickness = 12, color = "#355763") {
    line([a, b], "#091820", thickness + 5);
    line([a, b], color, thickness);
    line([a, b], "#79a6b0", 1);
  }
  function joint(p, radius = 5) {
    dot(p, radius + 2, "#122631");
    dot(p, radius, "#6f949f");
    dot(p, radius * 0.45, "#14313e");
  }
  function leg(x, z, phase, bob, factor, offset) {
    const swing = Math.sin(time * 1.65 + phase) * 0.14;
    const lift = Math.max(0, Math.cos(time * 1.65 + phase)) * 0.1;
    const p = (v) => [v[0] * factor + offset[0], v[1] * factor + offset[1], v[2] * factor + offset[2]];
    const hip = p([x, 1.51 + bob, z]);
    const knee = p([x + 0.22 + swing, 0.8, z * 1.12]);
    const foot = p([x - 0.12 - swing, 0.08 + lift, z * 1.18]);
    link(hip, knee, Math.max(5, scale * factor * 0.17));
    link(knee, foot, Math.max(4, scale * factor * 0.105), "#263f4d");
    joint(hip, scale * factor * 0.078);
    joint(knee, scale * factor * 0.061);
    box(
      [foot[0] + 0.035 * factor, foot[1] - 0.015 * factor, foot[2]],
      [0.32 * factor, 0.1 * factor, 0.2 * factor],
      ["#12232d", "#213642", "#54737b"]
    );
  }
  function quadruped(factor = 1, offset = [0, 0, 0]) {
    const bob = Math.sin(time * 3.3) * 0.015;
    const p = (v) => [v[0] * factor + offset[0], v[1] * factor + offset[1], v[2] * factor + offset[2]];
    const s = (v) => v.map((x) => x * factor);
    leg(-0.91, -0.57, 0, bob, factor, offset);
    leg(0.91, -0.57, Math.PI, bob, factor, offset);
    box(p([0, 1.52 + bob, 0]), s([2.6, 0.48, 1.02]));
    box(p([-0.1, 1.8 + bob, 0]), s([2.1, 0.1, 0.92]), ["#527379", "#799d9f", "#b8d1cf"], "#b6d9d5");
    // Separate shells, vents and a sensor head give the silhouette mechanical detail.
    for (let i = 0; i < 6; i++) line([p([-0.8 + i * 0.18, 1.65 + bob, 0.515]), p([-0.8 + i * 0.18, 1.4 + bob, 0.515])], "#0b1d27", 2);
    line([p([-0.99, 1.72 + bob, 0.53]), p([0.64, 1.72 + bob, 0.53])], "#71c7bb", 2);
    box(p([1.37, 1.66 + bob, 0]), s([0.34, 0.24, 0.8]), ["#0c202c", "#132c39", "#42626a"]);
    dot(p([1.55, 1.67 + bob, 0.23]), Math.max(2, scale * factor * 0.036), "#ffb076", 8);
    dot(p([1.55, 1.67 + bob, -0.23]), Math.max(2, scale * factor * 0.036), "#ffb076", 8);
    ring(p([0.3, 1.88 + bob, 0]), 0.18 * factor, "#4b707a", 7 * factor);
    ring(p([0.3, 1.95 + bob, 0]), 0.15 * factor, "#9de9df", 3 * factor);
    dot(p([0.3, 1.96 + bob, 0]), 2 * factor, "#d3fff5", 7);
    leg(-0.91, 0.57, Math.PI, bob, factor, offset);
    leg(0.91, 0.57, 0, bob, factor, offset);
    return p([0.3, 1.96 + bob, 0]);
  }
  function ground() {
    for (let x = -5; x <= 5; x += 0.5) {
      const alpha = Math.max(0.035, 0.17 - Math.abs(x) * 0.026);
      line(
        [
          [x, -0.06, -4],
          [x, -0.06, 4],
        ],
        `rgba(87,151,166,${alpha})`
      );
      line(
        [
          [-5, -0.06, x],
          [5, -0.06, x],
        ],
        `rgba(87,151,166,${alpha})`
      );
    }
    ring([0, -0.045, 0], 2.17, "#396b7770");
    ring([0, -0.035, 0], 2.21, "#6da9b13a", 1, -0.8, 1.6);
    // A grounded shadow keeps the robot from reading as a floating icon.
    const shadow = [];
    for (let i = 0; i < 64; i++) shadow.push([Math.cos((i / 64) * TAU) * 1.55, -0.02, Math.sin((i / 64) * TAU) * 0.78]);
    polygon(shadow, "#00000060");
  }
  const samplePoints = [];
  for (let i = 0; i < 230; i++) {
    const u = ((i * 73) % 229) / 229,
      v = ((i * 101) % 227) / 227;
    if (i % 3 === 0) samplePoints.push([(u - 0.5) * 2.6, 1.85, (v - 0.5) * 1.06]);
    else if (i % 3 === 1) samplePoints.push([(u - 0.5) * 2.6, 1.3 + v * 0.49, 0.54]);
    else samplePoints.push([(u - 0.5) * 5, 0.01, (v - 0.5) * 3.6]);
  }
  function dataField(sensor) {
    const sweep = Math.sin(time * 0.55) * 2.3;
    polygon(
      [
        [sweep, 0.02, -1.7],
        [sweep, 2.6, -1.7],
        [sweep, 2.6, 1.7],
        [sweep, 0.02, 1.7],
      ],
      "#6affdf09",
      "#7fe6da40"
    );
    line(
      [
        [sweep, 0.02, -1.7],
        [sweep, 0.02, 1.7],
      ],
      "#9afbe2",
      1.6
    );
    samplePoints.forEach((point, i) => {
      const proximity = Math.max(0, 1 - Math.abs(point[0] - sweep) / 1.3);
      dot(point, proximity > 0.75 ? 1.7 : 1.05, `rgba(143,250,221,${0.16 + proximity * 0.72})`);
      if (i % 57 === 0 && proximity > 0.6) line([sensor, point], "#90f6da24");
    });
    const angle = time * 0.25;
    ring([0, 0.01, 0], 2.17, "#86efdbbb", 1.5, angle, angle + 0.65);
  }
  function securityField() {
    ring([0, 0.015, 0], 2.08, "#ffbc8860", 1.3);
    ring([0, 1.1, 0], 2.08, "#e9a97a35", 1, 0.3, 2.8);
    for (let i = 0; i < 4; i++) {
      const angle = (i * TAU) / 4 + 0.35;
      const c = Math.cos(angle),
        s = Math.sin(angle);
      const p = (radius, y) => [c * radius, y, s * radius];
      line([p(2.08, 0.02), p(2.08, 1.15)], "#e9a97a50", 1, [3, 5]);
      line([p(3, 0.3), p(2.12, 0.3)], "#ffa46b55", 1);
      const progress = (time * 0.35 + i * 0.25) % 1;
      dot(p(3 - progress * 0.87, 0.3), 2, "#ffad7b", 6);
      dot(p(2.08, 0.3), 2 + Math.sin(progress * Math.PI) * 2, "#ffc7a0");
    }
    [
      [1.55, 1.67, 0.23],
      [0.3, 1.96, 0],
      [-0.7, 1.55, 0.54],
    ].forEach((p) => {
      const s = project(p);
      ctx.strokeStyle = "#ffbc88a0";
      ctx.lineWidth = 1;
      ctx.strokeRect(s[0] - 8, s[1] - 8, 16, 16);
    });
  }
  function rover() {
    const o = [-2.3, 0, -0.35];
    const p = (v) => v.map((n, i) => n + o[i]);
    [-0.37, 0.37].forEach((z) => {
      [-0.35, 0.35].forEach((x) => {
        const pos = p([x, 0.19, z]);
        dot(pos, scale * 0.16, "#090e15");
        dot(pos, scale * 0.1, "#607084");
      });
    });
    box(p([0, 0.39, 0]), [1.03, 0.35, 0.72], ["#203040", "#344e62", "#788ba2"], "#94a8bf");
    line([p([0, 0.55, 0]), p([0, 1.02, 0])], "#b2b9dd", 3);
    dot(p([0, 1.02, 0]), 3, "#c8cbff", 8);
    return p([0, 1.02, 0]);
  }
  function arm() {
    const base = [2.2, 0, 0.2];
    box([base[0], 0.15, base[2]], [0.7, 0.26, 0.7], ["#273444", "#35475c", "#6c8297"], "#929eb6");
    const points = [
      [2.2, 0.27, 0.2],
      [2.2, 0.9, 0.2],
      [1.7, 1.35 + Math.sin(time * 0.6) * 0.06, 0.25],
      [1.4, 1.19, 0.3],
    ];
    for (let i = 1; i < points.length; i++) link(points[i - 1], points[i], 7, "#788ba3");
    points.slice(0, -1).forEach((p) => joint(p, 4));
    line(
      [
        [1.28, 1.07, 0.23],
        [1.4, 1.19, 0.3],
        [1.36, 1.05, 0.41],
      ],
      "#ccd2f0",
      2
    );
    return points[2];
  }
  function connection(a, b, phase) {
    const path = [];
    const point = (progress) => [
      a[0] + (b[0] - a[0]) * progress,
      a[1] + (b[1] - a[1]) * progress + Math.sin(progress * Math.PI) * 0.56,
      a[2] + (b[2] - a[2]) * progress,
    ];
    for (let i = 0; i <= 36; i++) path.push(point(i / 36));
    line(path, "#b4bfff70", 1, [3, 4]);
    dot(point((time * 0.25 + phase) % 1), 2.8, "#d7dbff", 9);
  }
  function draw() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const halo = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.5, width * 0.52);
    halo.addColorStop(0, mode === "interop" ? "#333b622c" : "#20565c30");
    halo.addColorStop(1, "#080f1500");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    scale = Math.min(width / (mode === "interop" ? 6.6 : 5.8), height / 4.2);
    cx = width * 0.5;
    cy = height * 0.76;
    ground();
    if (mode === "interop") {
      const left = rover();
      const sensor = quadruped(0.7, [0, 0, 0.22]);
      const right = arm();
      connection(left, sensor, 0);
      connection(sensor, right, 0.4);
    } else {
      const sensor = quadruped();
      if (mode === "data") dataField(sensor);
      else securityField();
    }
    // Fade the diagram into the page instead of boxing it in a dashboard card.
    const fade = ctx.createLinearGradient(0, height * 0.8, 0, height);
    fade.addColorStop(0, "#080f1500");
    fade.addColorStop(1, "#080f15");
    ctx.fillStyle = fade;
    ctx.fillRect(0, height * 0.8, width, height * 0.2);
  }
  function active() {
    return !paused && inView && !document.hidden;
  }
  function tick(now) {
    if (!active()) {
      frame = 0;
      return;
    }
    if (!lastFrame || now - lastFrame >= 1000 / 30) {
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0;
      time += dt;
      lastFrame = now;
      yaw += (targetYaw - yaw) * 0.065;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    motionButton.dataset.paused = String(paused);
    motionButton.querySelector(".motion-pause").hidden = paused;
    motionButton.querySelector(".motion-play").hidden = !paused;
    draw();
    if (active()) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const bounds = viewport.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  scene.querySelectorAll(".scene-modes button").forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode;
      scene.dataset.mode = mode;
      scene.querySelectorAll(".scene-modes button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      scene.querySelectorAll(".scene-description").forEach((item) => {
        item.hidden = item.dataset.description !== mode;
      });
      draw();
    });
  });
  motionButton.addEventListener("click", () => {
    paused = !paused;
    syncMotion();
  });
  viewport.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const bounds = viewport.getBoundingClientRect();
    targetYaw = 0.64 + ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.35;
  });
  viewport.addEventListener("pointerleave", () => {
    targetYaw = 0.64;
  });
  document.addEventListener("visibilitychange", syncMotion);
  if (motionPreference.addEventListener)
    motionPreference.addEventListener("change", (event) => {
      paused = event.matches;
      syncMotion();
    });
  if ("IntersectionObserver" in window)
    new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        syncMotion();
      },
      { threshold: 0 }
    ).observe(scene);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(viewport);
  else window.addEventListener("resize", resize);
  canvas.hidden = false;
  scene.querySelector(".scene-fallback").setAttribute("hidden", "");
  scene.querySelector(".scene-controls").hidden = false;
  resize();
  syncMotion();
})();
