/* TailSight Device Preview — Rokid / Even G2 装着視界HUDシミュレータ (スタンドアロン)
 * 追跡システムに依存しない単体ツール。右パネルの状態 → Devices[device].packet() → 視界HUD描画。
 */
(function () {
  'use strict';

  const Devices = window.Devices;

  /* ---------------- Geo/表記 utils ---------------- */
  const rad = (d) => (d * Math.PI) / 180;
  const norm180 = (d) => ((d + 540) % 360) - 180;
  const COMPASS_JA = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
  const compassJa = (b) => COMPASS_JA[Math.round(((b % 360) + 360) % 360 / 45) % 8];
  const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m');
  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60);
    return m > 0 ? m + '分' + String(sec % 60).padStart(2, '0') + '秒' : sec + '秒';
  }

  /* ---------------- State ---------------- */
  const S = {
    device: 'rokid',
    dist: 120,
    bearing: 45,   // 対象の絶対方位
    headYaw: 45,   // 装着者の頭の向き
    stopped: false,
    pred: '歌舞伎町一番街 78%',
  };

  /* ---------------- DOM ---------------- */
  const $ = (id) => document.getElementById(id);
  const els = {
    canvas: $('eyeCanvas'), hudG2: $('eyeHudG2'), hudRokid: $('eyeHudRokid'),
    devLabel: $('eyeDevLabel'), packetPre: $('packetPre'),
    selDevice: $('selDevice'), ctlDist: $('ctlDist'), ctlBrg: $('ctlBrg'),
    ctlState: $('ctlState'), ctlPred: $('ctlPred'),
    vDist: $('vDist'), vBrg: $('vBrg'),
  };

  /* ---------------- パノラマ (夜の街) ---------------- */
  const FOV = 90;
  let pano = null, drag = null;

  function buildPanorama(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#04060c'); sky.addColorStop(1, '#0d1420');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    let seed = 42;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 140; i++) g.fillRect(rnd() * w, rnd() * h * 0.28, 1, 1);
    const drawBuildings = (base, maxH, col, lights) => {
      let x = 0;
      while (x < w) {
        const bw = 60 + rnd() * 150, bh = maxH * (0.35 + rnd() * 0.65);
        g.fillStyle = col; g.fillRect(x, base - bh, bw, bh);
        if (lights) {
          g.fillStyle = 'rgba(255,220,130,.6)';
          for (let wy = base - bh + 10; wy < base - 12; wy += 15)
            for (let wx = x + 7; wx < x + bw - 9; wx += 13)
              if (rnd() > 0.55) g.fillRect(wx, wy, 4, 6);
        }
        if (rnd() > 0.45) {
          g.fillStyle = ['#ff4d6d', '#4dd2ff', '#ffd166', '#9d6bff'][Math.floor(rnd() * 4)];
          g.fillRect(x + bw * 0.25, base - bh + 16, 10, 24 + rnd() * 34);
        }
        x += bw + 10 + rnd() * 34;
      }
    };
    drawBuildings(h * 0.78, h * 0.55, '#0a0e16', false);
    drawBuildings(h * 0.88, h * 0.44, '#11151f', true);
    const road = g.createLinearGradient(0, h * 0.8, 0, h);
    road.addColorStop(0, '#14171d'); road.addColorStop(1, '#0a0c10');
    g.fillStyle = road; g.fillRect(0, h * 0.8, w, h * 0.2);
    g.fillStyle = 'rgba(255,255,255,.22)';
    for (let lx = 0; lx < w; lx += 95) g.fillRect(lx, h * 0.9, 46, 3);
    return c;
  }

  /* ---------------- 描画 ---------------- */
  function packetNow(rel) {
    const dev = Devices[S.device];
    return dev.packet({
      mode: 'track',
      rel: Math.round(rel),
      dist: fmtDist(S.dist),
      eta: fmtDur(S.dist / 1.3),
      target: S.stopped ? '停止' : '移動中',
      age: 3, battery: 87, lte: '▮▮▮▮',
      risk: S.dist > 400 ? 'critical' : S.dist > 250 ? 'warn' : 'ok',
      pred: S.pred || null,
    });
  }

  function draw() {
    const cv = els.canvas, g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    if (!pano) pano = buildPanorama(W * 4, H);
    const yaw = ((S.headYaw % 360) + 360) % 360;
    const sx = ((yaw / 360) * pano.width) % pano.width;
    const w1 = Math.min(W, pano.width - sx);
    g.clearRect(0, 0, W, H);
    g.drawImage(pano, sx, 0, w1, H, 0, 0, w1, H);
    if (w1 < W) g.drawImage(pano, 0, 0, W - w1, H, w1, 0, W - w1, H);

    const rel = norm180(S.bearing - yaw);
    const half = FOV / 2;
    if (Math.abs(rel) <= half) {
      const mx = W / 2 + (rel / half) * (W / 2) * 0.92;
      const my = H * 0.52;
      g.strokeStyle = 'rgba(255,95,109,.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(mx, my - 16); g.lineTo(mx, my - H * 0.3); g.stroke();
      g.strokeStyle = 'rgba(255,95,109,.95)'; g.lineWidth = 2;
      g.beginPath(); g.arc(mx, my, 14, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(255,95,109,.9)';
      g.beginPath(); g.arc(mx, my, 4, 0, Math.PI * 2); g.fill();
      g.font = '12px monospace'; g.textAlign = 'center';
      g.fillText('TARGET ' + fmtDist(S.dist), mx, my - H * 0.3 - 8);
      g.textAlign = 'left';
    } else {
      const left = rel < 0;
      g.fillStyle = 'rgba(255,95,109,.9)';
      g.font = '22px monospace'; g.textAlign = 'center';
      g.fillText(left ? '◀' : '▶', left ? 26 : W - 26, H / 2);
      g.font = '12px monospace';
      g.fillText('対象 ' + fmtDist(S.dist) + ' · ' + compassJa(S.bearing), left ? 70 : W - 70, H / 2 + 4);
      g.textAlign = 'left';
    }
    updateHud(rel);
  }

  function updateHud(rel) {
    const pkt = packetNow(rel);
    const dev = Devices[S.device];
    els.devLabel.textContent = dev.label;
    els.hudG2.classList.toggle('hidden', S.device !== 'evenG2');
    els.hudRokid.classList.toggle('hidden', S.device !== 'rokid');
    if (S.device === 'evenG2') {
      els.hudG2.innerHTML =
        `<div style="font-size:11px;opacity:.75">TRACKING · TRK-4417</div>` +
        `<div style="font-size:26px"><span style="display:inline-block;transform:rotate(${Math.round(rel)}deg)">▲</span> ${pkt.lines[0]}</div>` +
        pkt.lines.slice(1).map((l) => `<div>${l}</div>`).join('') +
        (pkt.prediction ? `<div style="opacity:.8">予測 ${pkt.prediction}</div>` : '');
    } else {
      els.hudRokid.innerHTML =
        `<div style="display:flex;gap:16px;align-items:center">` +
        `<span style="font-size:34px;display:inline-block;transform:rotate(${Math.round(rel)}deg)">▲</span>` +
        `<div><div style="font-size:24px;font-weight:700">${pkt.card.distance}</div>` +
        `<div style="font-size:12px;opacity:.85">${compassJa(S.bearing)} / ${Math.round(S.bearing)}° · 徒歩 ${pkt.card.eta}</div></div></div>` +
        `<div style="font-size:12px;margin-top:6px;opacity:.9">対象: ${pkt.card.targetState}${pkt.card.prediction ? ' · 予測: ' + pkt.card.prediction : ''}</div>` +
        `<div style="font-size:11px;opacity:.7">TRK-4417 · 3秒前 · BAT 87%</div>`;
    }
    els.packetPre.textContent = '// ' + dev.label + ' へのBLE送信パケット (シミュレーション)\n' + JSON.stringify(pkt);
  }

  /* ---------------- Controls ---------------- */
  function bind() {
    els.selDevice.addEventListener('change', () => { S.device = els.selDevice.value; });
    els.devLabel.addEventListener('click', () => {
      S.device = S.device === 'rokid' ? 'evenG2' : 'rokid';
      els.selDevice.value = S.device;
    });
    els.ctlDist.addEventListener('input', () => {
      S.dist = +els.ctlDist.value;
      els.vDist.textContent = fmtDist(S.dist);
    });
    els.ctlBrg.addEventListener('input', () => {
      S.bearing = +els.ctlBrg.value;
      els.vBrg.textContent = compassJa(S.bearing) + ' ' + Math.round(S.bearing) + '°';
    });
    els.ctlState.addEventListener('change', () => { S.stopped = els.ctlState.value === '停止'; });
    els.ctlPred.addEventListener('input', () => { S.pred = els.ctlPred.value; });

    els.canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw: S.headYaw }; });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      S.headYaw = drag.yaw - ((e.clientX - drag.x) / (els.canvas.clientWidth || 1)) * FOV;
    });
    window.addEventListener('pointerup', () => { drag = null; });
    els.canvas.addEventListener('dblclick', () => { S.headYaw = S.bearing; });
  }

  function resize() {
    els.canvas.width = els.canvas.clientWidth || innerWidth;
    els.canvas.height = els.canvas.clientHeight || innerHeight;
    pano = null;
  }

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    resize();
    window.addEventListener('resize', resize);
    setInterval(draw, 33);
    draw();
  });
})();
