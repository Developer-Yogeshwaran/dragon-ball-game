/* ================= CANVAS ================= */
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

/* ================= ELEMENTS ================= */
const menu = document.getElementById("menu");
const pauseScreen = document.getElementById("pauseScreen");
const endScreen = document.getElementById("endScreen");
const endText = document.getElementById("endText");
const pauseBtn = document.getElementById("pauseBtn");
const ui = document.getElementById("ui");

const moveStick = document.getElementById("moveStick");
const aimStick  = document.getElementById("aimStick");

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/* ================= IMAGES ================= */
const dragonImg = new Image();
dragonImg.src = "dragon.png";

const spaceBg = new Image();
spaceBg.src = "space_bg.png";

/* ================= PLAYER ================= */
const player = {
  x: 0,
  y: 0,
  size: 120,
  speed: 4,
  health: 100
};

/* ================= GAME STATE ================= */
let bullets = [];
let enemies = [];
let keys = {};

let kills = 0;
let targetKills = 0;
let timeLeft = 0;
let initialTime = 0;

let started = false;
let paused = false;
let gameOver = false;

let mouseDown = false;
let mouseX = 0;
let mouseY = 0;
let fireCooldown = 0;

/* ================= DESKTOP INPUT ================= */
addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
addEventListener("mousedown", () => mouseDown = true);
addEventListener("mouseup", () => mouseDown = false);
addEventListener("mousemove", e=>{
  mouseX = e.clientX;
  mouseY = e.clientY;
});

/* ================= MOBILE JOYSTICKS ================= */
let moveVec={x:0,y:0};
let aimVec={x:0,y:0};
let firing=false;
let moveTouch=null;
let aimTouch=null;

function setupJoystick(el,type){
  const stick = el.querySelector(".stick");
  const r = 90;

  el.addEventListener("touchstart", e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(type==="move" && moveTouch===null) moveTouch=t.identifier;
      if(type==="aim" && aimTouch===null){
        aimTouch=t.identifier;
        firing=true;
      }
    }
  });

  el.addEventListener("touchmove", e=>{
    e.preventDefault();
    for(const t of e.touches){
      if(type==="move" && t.identifier!==moveTouch) continue;
      if(type==="aim" && t.identifier!==aimTouch) continue;

      const rect = el.getBoundingClientRect();
      let x = t.clientX - rect.left - r;
      let y = t.clientY - rect.top - r;
      const d = Math.hypot(x,y);
      if(d>r){ x*=r/d; y*=r/d; }
      stick.style.transform = `translate(${x}px,${y}px)`;

      if(type==="move") moveVec={x:x/r,y:y/r};
      if(type==="aim") aimVec={x:x/r,y:y/r};
    }
  });

  el.addEventListener("touchend", e=>{
    for(const t of e.changedTouches){
      if(type==="move" && t.identifier===moveTouch){
        moveTouch=null;
        moveVec={x:0,y:0};
        stick.style.transform="translate(0,0)";
      }
      if(type==="aim" && t.identifier===aimTouch){
        aimTouch=null;
        firing=false;
        aimVec={x:0,y:0};
        stick.style.transform="translate(0,0)";
      }
    }
  });
}

if(isMobile){
  setupJoystick(moveStick,"move");
  setupJoystick(aimStick,"aim");
}

/* ================= GAME CONTROL ================= */
function resetGame(){
  bullets=[];
  enemies=[];
  kills=0;
  timeLeft=initialTime;
  player.health=100;
  player.x=canvas.width/2;
  player.y=canvas.height/2;
  paused=false;
  gameOver=false;
  fireCooldown=0;
  pauseBtn.classList.remove("hidden");
}

function startPreset(m){
  if(m==="easy"){targetKills=20;initialTime=60}
  if(m==="medium"){targetKills=40;initialTime=30}
  if(m==="hard"){targetKills=50;initialTime=25}
  startGame();
}

function startCustom(){
  const k=+customKills.value;
  const t=+customTime.value;
  if(k<=0||t<=0) return alert("Invalid values");
  targetKills=k;
  initialTime=t;
  startGame();
}

function startGame(){
  resetGame();
  started=true;
  menu.style.display="none";
}

function togglePause(){
  if(!started||gameOver) return;
  paused=!paused;
  pauseScreen.classList.toggle("hidden",!paused);
}

function restart(){
  pauseScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  resetGame();
}

function backToMenu(){
  started=false;
  bullets=[];
  enemies=[];
  pauseBtn.classList.add("hidden");
  menu.style.display="flex";
  pauseScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  ui.innerHTML="";
}

/* ================= TIMERS ================= */
setInterval(()=>{
  if(started&&!paused&&!gameOver){
    timeLeft--;
    if(timeLeft<=0) endGame(false);
  }
},1000);

setInterval(()=>{
  if(!started||paused||gameOver||enemies.length>30) return;
  let s=Math.floor(Math.random()*4);
  let x=s==0?0:s==1?canvas.width:Math.random()*canvas.width;
  let y=s==2?0:s==3?canvas.height:Math.random()*canvas.height;
  enemies.push({x,y,r:18,speed:1.5,health:40});
},500);


/* ================= END GAME ================= */
function endGame(win){
  gameOver=true;
  pauseBtn.classList.add("hidden");
  endText.textContent = win
    ? "MISSION COMPLETE"
    : "YOU ARE LOST – RETRY";
  endScreen.classList.remove("hidden");
}

/* ================= UPDATE ================= */
function update(){
  if(!started||paused||gameOver) return;

  // Movement
  if(isMobile){
    player.x+=moveVec.x*player.speed*1.6;
    player.y+=moveVec.y*player.speed*1.6;
  }else{
    if(keys.w) player.y-=player.speed;
    if(keys.s) player.y+=player.speed;
    if(keys.a) player.x-=player.speed;
    if(keys.d) player.x+=player.speed;
  }

  player.x=Math.max(player.size/2,Math.min(canvas.width-player.size/2,player.x));
  player.y=Math.max(player.size/2,Math.min(canvas.height-player.size/2,player.y));

  // Shooting fireballs
  if (((mouseDown && !isMobile) || (firing && isMobile)) && fireCooldown <= 0){
    let angle = isMobile
      ? Math.atan2(aimVec.y, aimVec.x)
      : Math.atan2(mouseY - player.y, mouseX - player.x);

    const mouthOffset = player.size / 2 * 0.7;
    bullets.push({
      x: player.x + Math.cos(angle) * mouthOffset,
      y: player.y + Math.sin(angle) * mouthOffset,
      dx: Math.cos(angle) * 10,
      dy: Math.sin(angle) * 10,
      size: 12,
      color: "orange"
    });

    fireCooldown=6;
  }
  fireCooldown=Math.max(0,fireCooldown-1);

  // Move bullets
  bullets.forEach(b=>{ b.x+=b.dx; b.y+=b.dy; });
  bullets = bullets.filter(b => b.x>-50 && b.y>-50 && b.x<canvas.width+50 && b.y<canvas.height+50);

  // Enemies movement & collision
  enemies.forEach(e=>{
    let a=Math.atan2(player.y-e.y,player.x-e.x);
    e.x+=Math.cos(a)*e.speed;
    e.y+=Math.sin(a)*e.speed;

    if(Math.hypot(player.x-e.x,player.y-e.y)<player.size/2 + e.r){
      player.health-=0.4;
      if(player.health<=0) endGame(false);
    }
  });

  // Bullet hits
  bullets.forEach(b=>{
    enemies.forEach(e=>{
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.r){
        e.health-=20;
        b.x=-999;
        if(e.health<=0){ kills++; e.dead=true; }
      }
    });
  });

  enemies = enemies.filter(e=>!e.dead);

  if(kills>=targetKills) endGame(true);
}

/* ================= DRAW ================= */
function draw(){
  // Background
  ctx.drawImage(spaceBg,0,0,canvas.width,canvas.height);
  ctx.fillStyle="rgba(0,0,0,0.25)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Dragon player
  if(dragonImg.complete){
    ctx.save();
    ctx.translate(player.x,player.y);
    let a = isMobile
      ? Math.atan2(aimVec.y, aimVec.x)
      : Math.atan2(mouseY-player.y, mouseX-player.x);
    ctx.rotate(a);
    ctx.drawImage(dragonImg,-player.size/2,-player.size/2,player.size,player.size);
    ctx.restore();
  }

  // Fireballs
  bullets.forEach(b=>{
    const grad = ctx.createRadialGradient(b.x,b.y,2,b.x,b.y,b.size);
    grad.addColorStop(0,"yellow");
    grad.addColorStop(0.3,"orange");
    grad.addColorStop(1,"red");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.size,0,Math.PI*2);
    ctx.fill();
  });

  // Enemies
  ctx.fillStyle="red";
  enemies.forEach(e=>{
    ctx.beginPath();
    ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
    ctx.fill();
  });

  // UI
  ui.innerHTML = `
    ❤️ Health: ${player.health|0}<br>
    ☠ Kills: ${kills}/${targetKills}<br>
    ⏱ Time: ${timeLeft}s
  `;
}

/* ================= LOOP ================= */
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
