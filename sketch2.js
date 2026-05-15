// A4 portrait at 96dpi
const A4_W = 794;
const A4_H = 1123;

// Layout: each section is 16:9
const MARGIN_X = 70;
const SECTION_W = A4_W - MARGIN_X * 2;            // 654
const SECTION_H = Math.round(SECTION_W * 9 / 16); // 368
const SECTION_GAP = 60;
const TOTAL_H = SECTION_H * 2 + SECTION_GAP;
const TOP_Y = Math.round((A4_H - TOTAL_H) / 2);   // vertically centered pair
const TOP_AREA = { x: MARGIN_X, y: TOP_Y, w: SECTION_W, h: SECTION_H };
const GRID_AREA = { x: MARGIN_X, y: TOP_Y + SECTION_H + SECTION_GAP, w: SECTION_W, h: SECTION_H };

// Murmuration
let boids = [];
const NUM_BOIDS = 1100;
let attractors = [];

// Grid (spreadsheet-style)
const COLS = 28;
const ROWS = 16;
let cells = [];          // accumulation values 0..1
let cellLabels = [];     // 活性セル用の固定ラベル（Chaos）
let cellPalette = [];    // 活性セル用のアクセント色インデックス
let cellCharIdx = [];    // 非活性セル用の文字インデックス（0〜4の固定値）
let cellShape = [];      // Orderモード活性セルの形状（0=正方形, 1=丸, 2=三角）

// Order/Chaos モードそれぞれの非活性セル用ソース（共に5文字）
const IDLE_ORDER = 'Order';
const IDLE_CHAOS = 'Chaos';

const LABELS = [
  '+', '+', '+', '+', '$', '$', '=', '?',  // common (weighted)
  '#NULL!', '#DIV!', '#NAME?', '#NUM!', '#N/A', '#JAIL?',
  'SUM', 'LOGIC', 'B5', 'C8', '0', '/', '{3}', 'IF'
];
let ACCENTS = [];     // initialized in setup (needs color())
const BG_BLUE = [222, 232, 252];
const BG_WHITE = [255, 255, 255];

// Grid mode switching:
//   0 = Order (白黒：静かなブロック表示)
//   1 = Chaos (カラフルなスプレッドシート風)
// 一定間隔でランダムに切り替わる
let gridMode = 0;
let nextSwitchFrame = 0;

// Glitch transition: when modes flip, run a brief "broken display" overlay.
let glitchUntilFrame = 0;

// Sky/Sea ラベル用のオフスクリーン（波の歪み効果に使う）
let labelPG;
const WAVE_AMP = 14;
const WAVE_FREQ = 0.04;

// Tweakpane で調整できる Sky / Sea のパラメータ
// chars: 1文字ずつのオフセット / サイズ倍率 / 回転（最大8文字分）
function makeCharSlots(n) {
  return Array.from({ length: n }, () => ({
    offsetX: 0, offsetY: 0, sizeMul: 1, rot: 0
  }));
}
const skyParams = {
  text:    'Sky',
  size:    96,
  spacing: 0,
  color:   '#000000',
  chars: [
    { offsetX:  -70, offsetY: -30, sizeMul: 0.4,  rot:  31 },
    { offsetX:  -52, offsetY:  17, sizeMul: 1.1,  rot: -20 },
    { offsetX:   -4, offsetY:  57, sizeMul: 0.55, rot: -145 },
    { offsetX: -200, offsetY:   0, sizeMul: 1,    rot:   0 },
    { offsetX:    0, offsetY:   0, sizeMul: 1,    rot:   0 },
    { offsetX:    0, offsetY:   0, sizeMul: 1,    rot:   0 },
    { offsetX:    0, offsetY:   0, sizeMul: 1,    rot:   0 },
    { offsetX:    0, offsetY:   0, sizeMul: 1,    rot:   0 },
  ],
};
const seaParams = {
  text:    'Sea',
  size:    96,
  spacing: 0,
  color:   '#ffffff',
  chars: [
    { offsetX: -87, offsetY: 35, sizeMul: 1.45, rot: -55 },
    { offsetX:  -4, offsetY: 91, sizeMul: 1,    rot:  12 },
    { offsetX: -39, offsetY:  0, sizeMul: 0.8,  rot:  31 },
    { offsetX:   0, offsetY:  0, sizeMul: 1,    rot:   0 },
    { offsetX:   0, offsetY:  0, sizeMul: 1,    rot:   0 },
    { offsetX:   0, offsetY:  0, sizeMul: 1,    rot:   0 },
    { offsetX:   0, offsetY:  0, sizeMul: 1,    rot:   0 },
    { offsetX:   0, offsetY:  0, sizeMul: 1,    rot:   0 },
  ],
};

// 下部の2行（Tweakpaneで調整、1文字ずつ動かせる）
const BOTTOM_CHAR_SLOTS = 32;
function mergeCharSlots(overrides) {
  const arr = makeCharSlots(BOTTOM_CHAR_SLOTS);
  for (let i = 0; i < overrides.length && i < arr.length; i++) {
    Object.assign(arr[i], overrides[i]);
  }
  return arr;
}
const titleParams = {
  text:    'Between Chaos & Order',
  size:    17,
  spacing: 0,
  offsetX: 0,
  offsetY: 0,
  color:   '#282828',
  chars: mergeCharSlots([
    {}, {}, {}, {}, {}, {}, {}, {}, {}, { rot: 4 },
  ]),
};
const venueParams = {
  text:    '会場:多摩美術大学八王子キャンパスアートテークギャラリー',
  size:    13,
  spacing: 6,
  offsetX: 0,
  offsetY: 30,
  color:   '#282828',
  chars: mergeCharSlots([
    { rot: -4 },
    { offsetX:  -4, rot: -74 },
    { offsetX:   9, offsetY:  -9, rot:  12 },
    { rot: -39 },
    { rot: -27 },
    { offsetY: -13, rot:  12 },
    { rot: -16 },
    { offsetX:  -9, offsetY: -39, rot: -27 },
    { offsetY:  26, rot:  31 },
    { offsetX: -13, offsetY:  -9, rot: -27 },
    { offsetX:  -9, offsetY: -13, rot: -16 },
    { rot:   4 },
    { offsetY: -17, rot:  -8 },
    { offsetX:   4, rot:  -8 },
    { offsetY: -22, rot: -35 },
    { offsetX:  -9, rot: -27 },
    { offsetX: -22, offsetY:   9, rot: -43 },
    { rot: -43 },
    { rot: -23 },
    { offsetX:   4, offsetY: -17, rot:   8 },
    { offsetY: -26, rot:  12 },
    { offsetX:  -4, rot:  67 },
    { offsetX: -17, offsetY:  13 },
    { offsetX:  -9, rot: -23 },
    { offsetY:   4, rot: -27 },
    { offsetX:   4, offsetY:  -9, rot:  20 },
    {},
    { rot: -20 },
  ]),
};

let jpFont;

function preload() {
  jpFont = loadFont('assets/KazukiReiwa - Regular.ttf');
}

function setup() {
  const cnv = createCanvas(A4_W, A4_H);
  textFont(jpFont);

  const btn = createButton('save img');
  btn.style('position', 'fixed');
  btn.style('top', '50%');
  btn.style('right', '24px');
  btn.style('transform', 'translateY(-50%)');
  btn.style('padding', '10px 16px');
  btn.style('background', '#111');
  btn.style('color', '#fff');
  btn.style('border', 'none');
  btn.style('font-family', 'sans-serif');
  btn.style('font-size', '12px');
  btn.style('letter-spacing', '0.08em');
  btn.style('cursor', 'pointer');
  btn.mousePressed(() => saveCanvas(cnv, 'order-chaos', 'png'));

  // attractors inside the top area
  attractors.push({
    pos: createVector(TOP_AREA.x + TOP_AREA.w * 0.4, TOP_AREA.y + TOP_AREA.h * 0.5),
    weight: 1.0
  });
  attractors.push({
    pos: createVector(TOP_AREA.x + TOP_AREA.w * 0.6, TOP_AREA.y + TOP_AREA.h * 0.5),
    weight: 0.85
  });

  for (let i = 0; i < NUM_BOIDS; i++) {
    const a = random(attractors);
    const r = random(60);
    const ang = random(TWO_PI);
    boids.push(new Boid(a.pos.x + cos(ang) * r, a.pos.y + sin(ang) * r));
  }

  scheduleNextSwitch();
  initTweakpane();

  // ラベル用オフスクリーン（横方向に余裕を持たせて波がはみ出ても切れないように）
  labelPG = createGraphics(TOP_AREA.w + 80, TOP_AREA.h + 60);
  labelPG.pixelDensity(1);
  labelPG.textAlign(CENTER, CENTER);

  // init grid: density values + fixed label / accent per cell
  ACCENTS = [
    color(255, 110, 150),   // pink
    color(180, 130, 255),   // purple
    color(110, 220, 220),   // cyan
    color(150, 230, 140),   // green
    color(255, 180, 100),   // orange
    color(255, 220, 100),   // yellow
  ];
  for (let r = 0; r < ROWS; r++) {
    cells.push(new Array(COLS).fill(0));
    cellLabels.push([]);
    cellPalette.push([]);
    cellCharIdx.push([]);
    cellShape.push([]);
    for (let c = 0; c < COLS; c++) {
      cellLabels[r].push(random(LABELS));
      cellPalette[r].push(floor(random(ACCENTS.length)));
      cellCharIdx[r].push(floor(random(5)));
      cellShape[r].push(floor(random(3)));
    }
  }
}

function draw() {
  background(248);
  drawSkyBand();

  // drift attractors
  const t = frameCount * 0.003;
  attractors[0].pos.x = TOP_AREA.x + TOP_AREA.w * 0.4 + sin(t) * 60;
  attractors[0].pos.y = TOP_AREA.y + TOP_AREA.h * 0.5 + cos(t * 0.7) * 30;
  attractors[1].pos.x = TOP_AREA.x + TOP_AREA.w * 0.6 + sin(t * 0.8 + 1) * 50;
  attractors[1].pos.y = TOP_AREA.y + TOP_AREA.h * 0.5 + cos(t * 1.1) * 25;

  // murmuration
  for (const b of boids) {
    b.flock(boids);
    b.update();
    b.show();
  }

  // accumulate grid from boids
  drawTopAreaLabel();

  updateGrid();

  // switch grid mode at random intervals
  if (frameCount >= nextSwitchFrame) {
    gridMode = 1 - gridMode;
    glitchUntilFrame = frameCount + floor(random(36, 48)); // ~0.6–0.8s of glitch
    scheduleNextSwitch();
  }
  if (gridMode === 0) drawGridOrder();
  else                drawGridChaos();

  // dramatic display-corruption overlay during the transition window
  if (frameCount < glitchUntilFrame) {
    drawGlitchOverlay();
  }

  drawLabels();
}

function scheduleNextSwitch() {
  // 4–12 seconds at 60fps
  nextSwitchFrame = frameCount + floor(random(240, 720));
}

// ============================================================
// Glitch overlay (broken-display noise)
// レイヤー：
//  ・水平スライス（行ごと）をランダムにX方向にずらす
//  ・ランダムなRGB系のカラーバー
//  ・ランダムなドット/ブロックノイズ
//  ・走査線（scan lines）
// ============================================================
function drawGlitchOverlay() {
  noStroke();

  // 1) horizontal slice displacement: copy random row strips and offset
  const sliceCount = floor(random(6, 14));
  for (let i = 0; i < sliceCount; i++) {
    const sy = GRID_AREA.y + random(GRID_AREA.h);
    const sh = random(4, 30);
    const dx = (random() < 0.5 ? -1 : 1) * random(10, 60);
    // grab from canvas and redraw shifted
    const img = get(GRID_AREA.x, sy, GRID_AREA.w, sh);
    image(img, GRID_AREA.x + dx, sy);
  }

  // 2) random colored bars (RGB-shift feel)
  const barCount = floor(random(3, 8));
  for (let i = 0; i < barCount; i++) {
    const by = GRID_AREA.y + random(GRID_AREA.h);
    const bh = random(2, 10);
    const palette = [
      color(255, 50, 80, 160),
      color(50, 220, 255, 160),
      color(80, 255, 130, 150),
      color(255, 230, 60, 150),
      color(255, 255, 255, 200),
      color(0, 0, 0, 200),
    ];
    fill(random(palette));
    rect(GRID_AREA.x, by, GRID_AREA.w, bh);
  }

  // 3) random pixel-block noise scattered across the grid
  const blockCount = floor(random(60, 160));
  for (let i = 0; i < blockCount; i++) {
    const bx = GRID_AREA.x + random(GRID_AREA.w);
    const by = GRID_AREA.y + random(GRID_AREA.h);
    const bw = random(2, 14);
    const bh = random(2, 8);
    fill(random(255), random(255), random(255), random(140, 240));
    rect(bx, by, bw, bh);
  }

  // 4) scan lines (thin darker horizontal lines across the area)
  fill(0, 60);
  for (let y = GRID_AREA.y; y < GRID_AREA.y + GRID_AREA.h; y += 3) {
    rect(GRID_AREA.x, y, GRID_AREA.w, 1);
  }

  // 5) occasional full-width tear: a thick black or white bar
  if (random() < 0.4) {
    const ty = GRID_AREA.y + random(GRID_AREA.h);
    const th = random(6, 20);
    fill(random() < 0.5 ? 0 : 255);
    rect(GRID_AREA.x, ty, GRID_AREA.w, th);
  }
}

function drawSkyBand() {
  // Order モード = 夕暮れ（青→桃→橙）
  // Chaos モード = 薄暗い夜（紺→濃紫→深い藍）
  noStroke();
  const y0 = TOP_AREA.y;
  const y1 = TOP_AREA.y + TOP_AREA.h;
  let top, mid, bottom;
  if (gridMode === 0) {
    top    = color(95, 130, 180);
    mid    = color(205, 195, 195);
    bottom = color(250, 175, 130);
  } else {
    top    = color(5, 8, 18);      // ほぼ黒に近い深い紺
    mid    = color(14, 14, 32);    // 深い夜の紺紫
    bottom = color(22, 18, 38);    // 地平もくすんだ闇色
  }
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0);
    let c;
    if (t < 0.55) c = lerpColor(top, mid, t / 0.55);
    else          c = lerpColor(mid, bottom, (t - 0.55) / 0.45);
    stroke(c);
    line(TOP_AREA.x, y, TOP_AREA.x + TOP_AREA.w, y);
  }
}

function drawBorder() {
  // 4 filled rectangles → perfectly sharp corners
  noStroke();
  fill(255);
  const b = 50;
  rect(0, 0, width, b);
  rect(0, height - b, width, b);
  rect(0, 0, b, height);
  rect(width - b, 0, b, height);
}

function updateGrid() {
  // decay all cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells[r][c] *= 0.995;
    }
  }
  // each boid contributes to a grid cell based on its (x,y) inside top area
  for (const b of boids) {
    const u = (b.pos.x - TOP_AREA.x) / TOP_AREA.w;
    const v = (b.pos.y - TOP_AREA.y) / TOP_AREA.h;
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    const c = floor(u * COLS);
    const r = floor(v * ROWS);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      cells[r][c] = min(1, cells[r][c] + 0.04);
    }
  }
}

// Chaos モード：カラフルなスプレッドシート風
function drawGridChaos() {
  const cw = GRID_AREA.w / COLS;
  const ch = GRID_AREA.h / ROWS;

  textAlign(CENTER, CENTER);
  textStyle(NORMAL);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = cells[r][c];
      const x = GRID_AREA.x + c * cw;
      const y = GRID_AREA.y + r * ch;

      if (v > 0.55) {
        fill(ACCENTS[cellPalette[r][c]]);
      } else if (v > 0.2) {
        fill(BG_BLUE[0], BG_BLUE[1], BG_BLUE[2]);
      } else {
        fill(BG_WHITE[0], BG_WHITE[1], BG_WHITE[2]);
      }
      stroke(0);
      strokeWeight(0.4);
      rect(x, y, cw, ch);

      // 活性セル → ラベル / 非活性セル → Chaos&Order の一文字
      noStroke();
      if (v > 0.2) {
        fill(0);
        const label = cellLabels[r][c];
        textSize(min(cw, ch) * (label.length > 3 ? 0.32 : 0.5));
        text(label, x + cw / 2, y + ch / 2);
      } else {
        fill(60);
        textSize(min(cw, ch) * 0.6);
        text(IDLE_CHAOS.charAt(cellCharIdx[r][c]), x + cw / 2, y + ch / 2);
      }
    }
  }
}

// Order モード：白黒の静かなブロック表示（非活性セルに "Order" の一文字）
function drawGridOrder() {
  const cw = GRID_AREA.w / COLS;
  const ch = GRID_AREA.h / ROWS;

  // 全セル：白タイル + 細い黒枠
  stroke(0);
  strokeWeight(0.4);
  fill(255);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      rect(GRID_AREA.x + c * cw, GRID_AREA.y + r * ch, cw, ch);
    }
  }

  // 文字描画の準備
  noStroke();
  textAlign(CENTER, CENTER);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = cells[r][c];
      const x = GRID_AREA.x + c * cw;
      const y = GRID_AREA.y + r * ch;
      if (v > 0.5) {
        // 活性セル：正方形 / 丸 / 三角 のいずれか
        fill(15);
        const pad = 2;
        const sx = x + pad;
        const sy = y + pad;
        const sw = cw - pad * 2;
        const sh2 = ch - pad * 2;
        const shape = cellShape[r][c];
        if (shape === 0) {
          rect(sx, sy, sw, sh2);
        } else if (shape === 1) {
          ellipse(x + cw / 2, y + ch / 2, sw, sh2);
        } else {
          triangle(
            x + cw / 2, sy,
            sx,         sy + sh2,
            sx + sw,    sy + sh2
          );
        }
      } else if (v > 0.25) {
        fill(15);
        const bh = ch * 0.25;
        rect(x + 1, y + (ch - bh) / 2, cw - 2, bh);
      } else {
        // 非活性セル：Order の一文字
        fill(60);
        textSize(min(cw, ch) * 0.6);
        text(IDLE_ORDER.charAt(cellCharIdx[r][c]), x + cw / 2, y + ch / 2);
      }
    }
  }
}

// 上エリア中央に Sky / Sea を描画
// 1) オフスクリーンに1文字ずつ配置（Tweakpane調整反映）
// 2) sin波のスライス転写で水平方向にうねらせる
function drawTopAreaLabel() {
  const p = gridMode === 1 ? seaParams : skyParams;

  // --- (1) オフスクリーンに描画 ---
  labelPG.clear();
  labelPG.noStroke();
  labelPG.fill(p.color);

  const baseAdvance = p.size * 0.6 + p.spacing;
  const totalW = baseAdvance * (p.text.length - 1);
  const startX = labelPG.width / 2 - totalW / 2;
  const cy = labelPG.height / 2;

  for (let i = 0; i < p.text.length; i++) {
    const slot = p.chars[i] || { offsetX: 0, offsetY: 0, sizeMul: 1, rot: 0 };
    const x = startX + baseAdvance * i + slot.offsetX;
    const y = cy + slot.offsetY;
    labelPG.push();
    labelPG.translate(x, y);
    labelPG.rotate(radians(slot.rot));
    labelPG.textSize(p.size * slot.sizeMul);
    labelPG.text(p.text[i], 0, 0);
    labelPG.pop();
  }

  // --- (2) 行ごとに水平オフセットを掛けてキャンバスへ転写 ---
  const destX = TOP_AREA.x + (TOP_AREA.w - labelPG.width) / 2;
  const destY = TOP_AREA.y + (TOP_AREA.h - labelPG.height) / 2;
  for (let yy = 0; yy < labelPG.height; yy++) {
    const dx = sin(yy * WAVE_FREQ) * WAVE_AMP;
    image(labelPG, destX + dx, destY + yy, labelPG.width, 1, 0, yy, labelPG.width, 1);
  }
}

// Tweakpane v3 でラベルを調整するパネルを初期化
function initTweakpane() {
  if (typeof Tweakpane === 'undefined') return;
  const pane = new Tweakpane.Pane({ title: 'Labels' });

  // パネルを左上に配置
  const wrap = pane.element.parentElement || pane.element;
  wrap.style.left  = '8px';
  wrap.style.right = 'auto';
  wrap.style.top   = '8px';

  // 文字情報をJSONとしてクリップボードにコピーするボタン
  const copyBtn = pane.addButton({ title: '情報をコピー' });
  copyBtn.on('click', () => {
    const data = { title: titleParams, venue: venueParams };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(
      () => { copyBtn.title = 'コピーしました ✓'; setTimeout(() => copyBtn.title = '情報をコピー', 1500); },
      () => { copyBtn.title = 'コピー失敗';        setTimeout(() => copyBtn.title = '情報をコピー', 1500); }
    );
  });

  pane.addSeparator();

  buildBottomFolder(pane, titleParams, 'Title');
  buildBottomFolder(pane, venueParams, 'Venue');
}

// 下部1行分のフォルダ（全体設定 + 文字ごとのサブフォルダ）
function buildBottomFolder(pane, params, title) {
  const folder = pane.addFolder({ title });
  folder.addInput(params, 'text');
  folder.addInput(params, 'size',    { min: 8,    max: 64,  step: 1 });
  folder.addInput(params, 'spacing', { min: -10,  max: 40,  step: 1 });
  folder.addInput(params, 'offsetX', { min: -400, max: 400, step: 1 });
  folder.addInput(params, 'offsetY', { min: -200, max: 200, step: 1 });
  folder.addInput(params, 'color');

  // 文字ごとのサブフォルダ（最大32文字分用意。text.length までの範囲で使われる）
  for (let i = 0; i < params.chars.length; i++) {
    const sub = folder.addFolder({ title: `char ${i + 1}`, expanded: false });
    sub.addInput(params.chars[i], 'offsetX', { min: -200, max: 200, step: 1 });
    sub.addInput(params.chars[i], 'offsetY', { min: -200, max: 200, step: 1 });
    sub.addInput(params.chars[i], 'sizeMul', { min: 0.2, max: 3.0, step: 0.05 });
    sub.addInput(params.chars[i], 'rot',     { min: -180, max: 180, step: 1 });
  }
}

// 1ラベル分のフォルダを生成（全体設定 + 文字ごとのサブフォルダ）
function buildLabelFolder(pane, params, title) {
  const folder = pane.addFolder({ title });
  folder.addInput(params, 'text');
  folder.addInput(params, 'size', { min: 20, max: 240, step: 1 });
  folder.addInput(params, 'spacing', { min: -60, max: 120, step: 1 });
  folder.addInput(params, 'color');

  // 1文字ずつのサブフォルダ（最大8文字分用意し、収まる範囲で表示される）
  for (let i = 0; i < params.chars.length; i++) {
    const sub = folder.addFolder({ title: `char ${i + 1}`, expanded: false });
    sub.addInput(params.chars[i], 'offsetX', { min: -200, max: 200, step: 1 });
    sub.addInput(params.chars[i], 'offsetY', { min: -200, max: 200, step: 1 });
    sub.addInput(params.chars[i], 'sizeMul', { min: 0.2, max: 3.0, step: 0.05 });
    sub.addInput(params.chars[i], 'rot',     { min: -180, max: 180, step: 1 });
  }
}

function drawLabels() {
  noStroke();
  fill(40);

  // 上：コピー
  textAlign(CENTER, CENTER);
  textSize(15);
  text(
    '眺める空も、海もないので、文字という地平線を眺めている。',
    A4_W / 2,
    TOP_AREA.y / 2
  );

  // 下：タイトルと会場（1文字ずつ調整可）
  const baseLy = GRID_AREA.y + GRID_AREA.h + 18;
  drawBottomLine(titleParams, A4_W - MARGIN_X, baseLy);
  drawBottomLine(venueParams, A4_W - MARGIN_X, baseLy + 32);
}

// 右揃えで1文字ずつ描画（per-char offset / sizeMul / rot 対応）
function drawBottomLine(p, rightX, baseY) {
  noStroke();
  fill(p.color);
  textAlign(CENTER, TOP);
  textSize(p.size);

  // ベース幅（実測字幅 + spacing）で文字の中心X位置を右から左へ計算
  const widths = [];
  for (let i = 0; i < p.text.length; i++) {
    widths.push(textWidth(p.text[i]) + p.spacing);
  }
  const totalW = widths.reduce((s, w) => s + w, 0);
  let cursorX = rightX - totalW + (p.offsetX || 0);

  for (let i = 0; i < p.text.length; i++) {
    const slot = p.chars[i] || { offsetX: 0, offsetY: 0, sizeMul: 1, rot: 0 };
    const w = widths[i];
    const cx = cursorX + w / 2 + slot.offsetX;
    const cy = baseY + (p.offsetY || 0) + slot.offsetY;
    push();
    translate(cx, cy);
    rotate(radians(slot.rot));
    textSize(p.size * slot.sizeMul);
    text(p.text[i], 0, 0);
    pop();
    cursorX += w;
  }
}

class Boid {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));
    this.acc = createVector();
    this.maxSpeed = 1.0;
    this.maxForce = 0.04;
    this.size = random(1.0, 2.0);
    this.target = floor(random(attractors.length));
  }

  flock(others) {
    const perception = 18;
    const sepRange = 5;
    let align = createVector();
    let cohesion = createVector();
    let separation = createVector();
    let countA = 0, countC = 0, countS = 0;

    for (const o of others) {
      if (o === this) continue;
      const d = p5.Vector.dist(this.pos, o.pos);
      if (d < perception) {
        align.add(o.vel);
        cohesion.add(o.pos);
        countA++;
        countC++;
      }
      if (d < sepRange && d > 0) {
        const diff = p5.Vector.sub(this.pos, o.pos).div(d * d);
        separation.add(diff);
        countS++;
      }
    }

    if (countA > 0) align.div(countA).setMag(this.maxSpeed).sub(this.vel).limit(this.maxForce);
    if (countC > 0) cohesion.div(countC).sub(this.pos).setMag(this.maxSpeed).sub(this.vel).limit(this.maxForce);
    if (countS > 0) separation.div(countS).setMag(this.maxSpeed).sub(this.vel).limit(this.maxForce * 1.6);

    const a = attractors[this.target];
    const toAttr = p5.Vector.sub(a.pos, this.pos);
    const dist = toAttr.mag();
    toAttr.setMag(map(dist, 0, 250, 0.01, 0.12, true)).mult(a.weight);

    if (random() < 0.001) this.target = (this.target + 1) % attractors.length;

    const n = noise(this.pos.x * 0.005, this.pos.y * 0.005, frameCount * 0.003);
    const wind = p5.Vector.fromAngle(n * TWO_PI * 2).mult(0.04);

    this.acc.add(align);
    this.acc.add(cohesion.mult(1.1));
    this.acc.add(separation.mult(1.4));
    this.acc.add(toAttr);
    this.acc.add(wind);

    // soft containment within top area
    if (this.pos.x < TOP_AREA.x) this.acc.x += 0.1;
    if (this.pos.x > TOP_AREA.x + TOP_AREA.w) this.acc.x -= 0.1;
    if (this.pos.y < TOP_AREA.y) this.acc.y += 0.1;
    if (this.pos.y > TOP_AREA.y + TOP_AREA.h) this.acc.y -= 0.1;
  }

  update() {
    this.vel.add(this.acc).limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    noStroke();
    // 夜空（Chaos）では明るい点、夕暮れ（Order）では暗い点
    if (gridMode === 1) fill(230, 230, 245, 220);
    else                fill(15, 220);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }
}
