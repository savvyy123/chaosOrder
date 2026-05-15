// A4 portrait at 96dpi
const A4_W = 794;
const A4_H = 1123;

let boids = [];
const NUM_BOIDS = 700;
let skyPG;

// Moving attractors that shape the flock as cloud-like blobs
let attractors = [];

let jpFont;
const TITLE = '秩序と混沌';

function preload() {
  jpFont = loadFont('assets/KazukiReiwa - Regular.ttf');
}

function setup() {
  createCanvas(A4_W, A4_H);
  pixelDensity(1);
  textFont(jpFont);
  skyPG = createGraphics(A4_W, A4_H);
  bakeSky();
  // Two main attractors create the twin-blob shape
  attractors.push({
    pos: createVector(width * 0.4, height * 0.45),
    phase: 0,
    radius: 90,
    weight: 1.0
  });
  attractors.push({
    pos: createVector(width * 0.55, height * 0.55),
    phase: PI,
    radius: 70,
    weight: 0.85
  });

  for (let i = 0; i < NUM_BOIDS; i++) {
    const a = random(attractors);
    const r = random(a.radius);
    const ang = random(TWO_PI);
    boids.push(new Boid(
      a.pos.x + cos(ang) * r,
      a.pos.y + sin(ang) * r
    ));
  }
}

function bakeSky() {
  skyPG.noStroke();
  for (let y = 0; y < A4_H; y++) {
    const t = y / A4_H;
    let r, g, b;
    if (t < 0.55) {
      const k = t / 0.55;
      r = lerp(150, 200, k);
      g = lerp(175, 200, k);
      b = lerp(205, 215, k);
    } else {
      const k = (t - 0.55) / 0.45;
      r = lerp(200, 245, k);
      g = lerp(200, 200, k);
      b = lerp(215, 175, k);
    }
    skyPG.stroke(r, g, b);
    skyPG.line(0, y, A4_W, y);
  }
}

function draw() {
  image(skyPG, 0, 0);

  // Slowly drift attractors so the cloud morphs
  const t = frameCount * 0.003;
  attractors[0].pos.x = width * 0.4 + sin(t) * 60;
  attractors[0].pos.y = height * 0.45 + cos(t * 0.7) * 30;
  attractors[1].pos.x = width * 0.58 + sin(t * 0.8 + 1) * 50;
  attractors[1].pos.y = height * 0.55 + cos(t * 1.1) * 25;

  for (const b of boids) {
    b.flock(boids);
    b.update();
    b.show();
  }

  drawTitle();
  drawBorder();
}

function drawBorder() {
  noFill();
  stroke(255);
  strokeWeight(50);
  rect(0, 0, width, height);
}

function drawTitle() {
  const fs = 18;
  const x = width / 2;
  const lineGap = fs * 1.15;
  const totalH = lineGap * (TITLE.length - 1);
  const startY = height / 2 - totalH / 2;
  noStroke();
  fill(255);
  textSize(fs);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < TITLE.length; i++) {
    text(TITLE[i], x, startY + i * lineGap);
  }
}


class Boid {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));
    this.acc = createVector();
    this.maxSpeed = 2.2;
    this.maxForce = 0.07;
    this.size = random(1.0, 2.2);
    this.target = floor(random(attractors.length));
  }

  flock(others) {
    const perception = 22;
    const sepRange = 6;
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

    if (countA > 0) {
      align.div(countA).setMag(this.maxSpeed).sub(this.vel).limit(this.maxForce);
    }
    if (countC > 0) {
      cohesion.div(countC).sub(this.pos).setMag(this.maxSpeed).sub(this.vel).limit(this.maxForce);
    }
    if (countS > 0) {
      separation.div(countS).setMag(this.maxSpeed).sub(this.vel).limit(this.maxForce * 1.6);
    }

    // Strong pull toward the chosen attractor → cloud-like clustering
    const a = attractors[this.target];
    const toAttr = p5.Vector.sub(a.pos, this.pos);
    const dist = toAttr.mag();
    toAttr.setMag(map(dist, 0, 250, 0.01, 0.12, true)).mult(a.weight);

    // Occasionally swap target so blobs exchange particles (the trailing wisp)
    if (random() < 0.001) {
      this.target = (this.target + 1) % attractors.length;
    }

    // Curl noise wind
    const n = noise(this.pos.x * 0.004, this.pos.y * 0.004, frameCount * 0.003);
    const wind = p5.Vector.fromAngle(n * TWO_PI * 2).mult(0.04);

    this.acc.add(align.mult(1.0));
    this.acc.add(cohesion.mult(1.1));
    this.acc.add(separation.mult(1.4));
    this.acc.add(toAttr);
    this.acc.add(wind);
  }

  update() {
    this.vel.add(this.acc).limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    noStroke();
    fill(25, 28, 38, 230);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }
}
