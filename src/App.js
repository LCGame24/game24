import { useState, useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";



// ── constants ──────────────────────────────────────────────────────────────
const SUITS = ["♠","♥","♦","♣"];
const VALUES = [1,2,3,4,5,6,7,8,9,10,11,12,13];
const LABELS = {1:"1",2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"11",12:"12",13:"13"};
// Card face shows traditional letter + numeric value for face cards
const CARD_FACE_LABEL = {1:"A",2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"J",12:"Q",13:"K"};
const FACE  = {1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:11,12:12,13:13};

const DIFFICULTY = {
  Easy:   { timeLimit: 120, pointsPerSolve: 8,  hintPenalty: 2, label:"Easy",   color:"#34d399", maxCard:10, cardNote:"1–10", ops:["+","−","×","÷"] },
  Medium: { timeLimit: 90,  pointsPerSolve: 12, hintPenalty: 4, label:"Medium", color:"#f59e0b", maxCard:10, cardNote:"1–10", ops:["+","−","×","÷","^","√"] },
  Hard:   { timeLimit: 60,  pointsPerSolve: 20, hintPenalty: 8, label:"Hard",   color:"#ef4444", maxCard:13, cardNote:"1–13 (J,Q,K)", ops:["+","−","×","÷","^","√","ʸ√","!"] },
};
const LEVEL_UP_SCORE = { Easy: 80, Medium: 150 }; // score needed to unlock Hard

// ── Junior Mode constants ──────────────────────────────────────────────────
const JUNIOR_LEVELS = {
  "⭐": { label:"⭐ Junior 1", color:"#34d399", maxCard:6, target:12, ops:["+","−","×"], cardNote:"1–6", pointsPerSolve:5, en:"Junior 1", zh:"初级1" },
  "⭐⭐": { label:"⭐⭐ Junior 2", color:"#f59e0b", maxCard:8, target:24, ops:["+","−","×","÷"], cardNote:"1–8", pointsPerSolve:8, en:"Junior 2", zh:"初级2" },
};

const JUNIOR_BADGES = [
  { id:"jr_first",   icon:"🐣", en:"First Steps!",    zh:"第一步！",      desc:"Solve your first Junior puzzle" },
  { id:"jr_warm",    icon:"🌤️", en:"Getting Warm!",   zh:"越来越棒！",    desc:"Solve 3 puzzles" },
  { id:"jr_roll",    icon:"🌟", en:"On a Roll!",       zh:"势如破竹！",    desc:"5 solves in a row" },
  { id:"jr_brain",   icon:"🦸", en:"Super Brain!",     zh:"超级大脑！",    desc:"10 total solves" },
  { id:"jr_speed",   icon:"⚡", en:"Speed Star!",      zh:"闪电小星！",    desc:"Solve in under 20s" },
  { id:"jr_grad",    icon:"🎓", en:"Junior Grad!",     zh:"初级毕业！",    desc:"Complete 10 Junior puzzles" },
  { id:"jr_hero",    icon:"🦸‍♂️", en:"Math Hero!",      zh:"数学英雄！",    desc:"Score 50pts in Junior" },
];

function loadJuniorBadges() {
  try { return JSON.parse(localStorage.getItem("game24_jr_badges")||"[]"); } catch { return []; }
}
function saveJuniorBadges(b) {
  try { localStorage.setItem("game24_jr_badges",JSON.stringify(b)); } catch {}
}
function loadJuniorLeaderboard() {
  try { return JSON.parse(localStorage.getItem("game24_jr_leaderboard")||"[]"); } catch { return []; }
}
function saveJuniorLeaderboard(entries) {
  try { localStorage.setItem("game24_jr_leaderboard",JSON.stringify(entries.slice(0,20))); } catch {}
}
function loadJuniorSolves() {
  try { return parseInt(localStorage.getItem("game24_jr_solves")||"0"); } catch { return 0; }
}
function saveJuniorSolves(n) {
  try { localStorage.setItem("game24_jr_solves",String(n)); } catch {}
}

// Junior solver — 3 cards, target can be 12 or 24
function solveJunior(nums, target, ops) {
  if (nums.length===1) return Math.abs(nums[0]-target)<1e-9;
  for (let i=0;i<nums.length;i++) for (let j=0;j<nums.length;j++) {
    if (i===j) continue;
    const rest=nums.filter((_,k)=>k!==i&&k!==j);
    const [a,b]=[nums[i],nums[j]];
    const tries=[];
    if (ops.includes("+")) tries.push(a+b);
    if (ops.includes("−")) tries.push(a-b);
    if (ops.includes("×")) tries.push(a*b);
    if (ops.includes("÷") && Math.abs(b)>1e-9 && Math.abs((a/b)-Math.round(a/b))<1e-9) tries.push(a/b);
    for (const r of tries) if (solveJunior([...rest,r],target,ops)) return true;
  }
  return false;
}

function checkJuniorBadges(existing, {totalSolves, streak, timeElapsed, score}) {
  const newBadges=[];
  const has=id=>existing.includes(id);
  if (!has("jr_first") && totalSolves>=1) newBadges.push("jr_first");
  if (!has("jr_warm") && totalSolves>=3) newBadges.push("jr_warm");
  if (!has("jr_roll") && streak>=5) newBadges.push("jr_roll");
  if (!has("jr_brain") && totalSolves>=10) newBadges.push("jr_brain");
  if (!has("jr_speed") && timeElapsed<=20) newBadges.push("jr_speed");
  if (!has("jr_grad") && totalSolves>=10) newBadges.push("jr_grad");
  if (!has("jr_hero") && score>=50) newBadges.push("jr_hero");
  return newBadges;
}

// ── local storage helpers ─────────────────────────────────────────────────
function loadUnlocked() {
  try { return JSON.parse(localStorage.getItem("game24_unlocked")||"{}"); } catch { return {}; }
}
function saveUnlocked(u) {
  try { localStorage.setItem("game24_unlocked",JSON.stringify(u)); } catch {}
}
function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem("game24_leaderboard")||"[]"); } catch { return []; }
}
function saveLeaderboard(entries) {
  try { localStorage.setItem("game24_leaderboard",JSON.stringify(entries.slice(0,20))); } catch {}
}
function loadBadges() {
  try { return JSON.parse(localStorage.getItem("game24_badges")||"[]"); } catch { return []; }
}
function saveBadges(b) {
  try { localStorage.setItem("game24_badges",JSON.stringify(b)); } catch {}
}
function loadPersonalBest() {
  try { return JSON.parse(localStorage.getItem("game24_pb")||"{}"); } catch { return {}; }
}
function savePersonalBest(pb) {
  try { localStorage.setItem("game24_pb",JSON.stringify(pb)); } catch {}
}
function loadTutorialDone() {
  try { return localStorage.getItem("game24_tutorial_done")==="1"; } catch { return false; }
}
function saveTutorialDone() {
  try { localStorage.setItem("game24_tutorial_done","1"); } catch {}
}

// ── Daily Challenge helpers ────────────────────────────────────────────────
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}
function loadDailyResult() {
  try { return JSON.parse(localStorage.getItem("game24_daily")||"null"); } catch { return null; }
}
function saveDailyResult(data) {
  try { localStorage.setItem("game24_daily",JSON.stringify(data)); } catch {}
}
function loadDailyStreak() {
  try { return JSON.parse(localStorage.getItem("game24_daily_streak")||'{"count":0,"lastKey":""}'); } catch { return {count:0,lastKey:""}; }
}
function saveDailyStreak(s) {
  try { localStorage.setItem("game24_daily_streak",JSON.stringify(s)); } catch {}
}

// Deterministic seeded RNG (mulberry32)
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate today's daily puzzle cards — same for everyone worldwide
// Medium difficulty: cards 1–10, must have whole-number solution
function getDailyCards() {
  const dateKey = getTodayKey();
  const seed = parseInt(dateKey, 10) * 31337;
  const rng = seededRng(seed);
  const allCards = [];
  for (const s of SUITS) for (const v of VALUES.filter(v=>v<=10)) allCards.push({suit:s,val:v,id:s+v});

  // Shuffle deterministically
  const shuffled = [...allCards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Pick first 4 that have a solution
  let drawn = [];
  for (let start = 0; start < shuffled.length - 3; start++) {
    const candidate = shuffled.slice(start, start + 4);
    if (hasSolution(candidate)) { drawn = candidate; break; }
  }
  if (drawn.length === 0) drawn = shuffled.slice(0, 4); // fallback
  return drawn;
}

// Badge definitions
const BADGES = [
  { id:"first_solve",   icon:"🌟", en:"First Solve!",        zh:"第一次成功！",      desc:"Solve your first puzzle" },
  { id:"streak3",       icon:"🔥", en:"On Fire!",             zh:"势不可挡！",        desc:"3 solves in a row" },
  { id:"streak5",       icon:"💥", en:"Unstoppable!",         zh:"无人能挡！",        desc:"5 solves in a row" },
  { id:"streak10",      icon:"👑", en:"Grandmaster!",         zh:"大师级！",          desc:"10 solves in a row" },
  { id:"speed_demon",   icon:"⚡", en:"Speed Demon!",         zh:"闪电侠！",          desc:"Solve in under 15 seconds" },
  { id:"no_hint",       icon:"🧠", en:"Big Brain!",           zh:"超强大脑！",        desc:"Complete a full game without hints" },
  { id:"hard_first",    icon:"💪", en:"Hard Core!",           zh:"硬核玩家！",        desc:"First solve on Hard mode" },
  { id:"score_50",      icon:"🥉", en:"Bronze Player",        zh:"铜牌玩家",          desc:"Score 50 points" },
  { id:"score_100",     icon:"🥈", en:"Silver Player",        zh:"银牌玩家",          desc:"Score 100 points" },
  { id:"score_200",     icon:"🥇", en:"Gold Player",          zh:"金牌玩家",          desc:"Score 200 points" },
  { id:"perfect_game",  icon:"💎", en:"Perfect Game!",        zh:"完美游戏！",        desc:"Solve all rounds without hints or skips" },
  { id:"easy_grad",     icon:"🎓", en:"Easy Graduate",        zh:"简单模式毕业！",    desc:"Complete 10 Easy puzzles" },
];

function checkBadges(existing, {totalSolves, streak, timeLeft, difficulty, hintUsed, skipUsed, score, totalRounds, solvedRounds}) {
  const newBadges = [];
  const has = id => existing.includes(id);
  if (!has("first_solve") && totalSolves>=1) newBadges.push("first_solve");
  if (!has("streak3") && streak>=3) newBadges.push("streak3");
  if (!has("streak5") && streak>=5) newBadges.push("streak5");
  if (!has("streak10") && streak>=10) newBadges.push("streak10");
  if (!has("speed_demon") && timeLeft>=75) newBadges.push("speed_demon");
  if (!has("no_hint") && !hintUsed && totalRounds>0 && solvedRounds===totalRounds) newBadges.push("no_hint");
  if (!has("hard_first") && difficulty==="Hard" && totalSolves>=1) newBadges.push("hard_first");
  if (!has("score_50") && score>=50) newBadges.push("score_50");
  if (!has("score_100") && score>=100) newBadges.push("score_100");
  if (!has("score_200") && score>=200) newBadges.push("score_200");
  if (!has("perfect_game") && !hintUsed && !skipUsed && totalRounds>0 && solvedRounds===totalRounds) newBadges.push("perfect_game");
  if (!has("easy_grad") && difficulty==="Easy" && totalSolves>=10) newBadges.push("easy_grad");
  return newBadges;
}

// ── Battle Mode constants & helpers ───────────────────────────────────────
const BATTLE_BADGES = [
  { id:"battle_first",    icon:"⚔️",  en:"First Blood!",      zh:"初战告捷！",    fr:"Premier sang !",      desc:"Win your first battle" },
  { id:"battle_flawless", icon:"🛡️",  en:"Flawless Victory!", zh:"完美胜利！",    fr:"Victoire parfaite !", desc:"Win without losing a single life" },
  { id:"battle_slayer",   icon:"🤖",  en:"Robot Slayer!",     zh:"机器人终结者！", fr:"Chasseur de robot !", desc:"Beat the Hard robot" },
  { id:"battle_comeback", icon:"👊",  en:"Comeback King!",    zh:"绝地反击！",    fr:"Retour gagnant !",    desc:"Win from just 1 life remaining" },
  { id:"battle_hardened", icon:"🔥",  en:"Battle Hardened!",  zh:"久经沙场！",    fr:"Endurci au combat !", desc:"Win 10 battles total" },
];

const ROBOT_SPEED = {
  Easy:   { minThinkTime: 35, solveChance: 0.08, label:"Easy",   labelZh:"简单", labelFr:"Facile",    color:"#34d399", desc:"Slow thinker (~47s avg)", descFr:"Penseur lent (~47s)",   descZh:"反应迟缓（约47秒）" },
  Medium: { minThinkTime: 25, solveChance: 0.10, label:"Medium", labelZh:"中等", labelFr:"Moyen",     color:"#f59e0b", desc:"Quick mind (~35s avg)", descFr:"Esprit vif (~35s)",      descZh:"反应一般（约35秒）" },
  Hard:   { minThinkTime: 15, solveChance: 0.15, label:"Hard",   labelZh:"困难", labelFr:"Difficile", color:"#ef4444", desc:"Sharp focus (~21s avg)", descFr:"Tres concentre (~21s)",    descZh:"反应敏锐（约21秒）" },
};

function loadBattleBadges() {
  try { return JSON.parse(localStorage.getItem("game24_battle_badges")||"[]"); } catch { return []; }
}
function saveBattleBadges(b) {
  try { localStorage.setItem("game24_battle_badges",JSON.stringify(b)); } catch {}
}
function loadBattleWins() {
  try { return parseInt(localStorage.getItem("game24_battle_wins")||"0"); } catch { return 0; }
}
function saveBattleWins(n) {
  try { localStorage.setItem("game24_battle_wins",String(n)); } catch {}
}

function checkBattleBadges(existing, {won, playerLivesLost, robotDifficulty, totalWins}) {
  const nb = [];
  const has = id => existing.includes(id);
  if (!has("battle_first") && won && totalWins>=1) nb.push("battle_first");
  if (!has("battle_flawless") && won && playerLivesLost===0) nb.push("battle_flawless");
  if (!has("battle_slayer") && won && robotDifficulty==="Hard") nb.push("battle_slayer");
  if (!has("battle_comeback") && won) nb.push("battle_comeback"); // caller checks 1-life condition
  if (!has("battle_hardened") && totalWins>=10) nb.push("battle_hardened");
  return nb;
}

const PLAYER_COLORS = ["#f6d365","#f472b6","#34d399","#60a5fa"];
const PLAYER_BG     = ["rgba(246,211,101,0.15)","rgba(244,114,182,0.15)","rgba(52,211,153,0.15)","rgba(96,165,250,0.15)"];

// Tutorial: guided first puzzle using 1×2×3×4=24
// Correct 9-step sequence including tapping intermediate results
const TUTORIAL_CARDS = [
  {suit:"♠",val:1,id:"tut_1"},
  {suit:"♥",val:2,id:"tut_2"},
  {suit:"♦",val:3,id:"tut_3"},
  {suit:"♣",val:4,id:"tut_4"},
];
// Each step: type="number"|"op", target=label to match, isSecond=true means this tap triggers applyOp
const TUTORIAL_STEPS = [
  { type:"number", target:"1",  isSecond:false, bubble:"👆 Tap  1  to start!",              bubbleZh:"👆 点击数字  1  开始！",  bubbleFr:"👆 Appuie sur  1  pour commencer !" },
  { type:"op",     target:"×",                  bubble:"Now tap  ×  to multiply!",           bubbleZh:"点击  ×  进行乘法！",     bubbleFr:"Appuie sur  ×  pour multiplier !" },
  { type:"number", target:"2",  isSecond:true,  bubble:"Tap  2  — to make 1×2!",            bubbleZh:"点击  2  — 算出 1×2！",   bubbleFr:"Appuie sur  2  — pour faire 1×2 !" },
  // after this applyOp fires → result "2" appears in pool
  { type:"number", target:"2",  isSecond:false, bubble:"✓ 1×2=2!  Now tap  2  again!",      bubbleZh:"✓ 1×2=2！再点击结果  2  ！", bubbleFr:"✓ 1×2=2 !  Appuie encore sur  2 !" },
  { type:"op",     target:"×",                  bubble:"Tap  ×  again!",                    bubbleZh:"再次点击  ×  ！",          bubbleFr:"Appuie encore sur  × !" },
  { type:"number", target:"3",  isSecond:true,  bubble:"Tap  3  — to make 2×3!",            bubbleZh:"点击  3  — 算出 2×3！",   bubbleFr:"Appuie sur  3  — pour faire 2×3 !" },
  // after this applyOp fires → result "6" appears in pool
  { type:"number", target:"6",  isSecond:false, bubble:"✓ 2×3=6!  Now tap  6 !",           bubbleZh:"✓ 2×3=6！点击结果  6  ！", bubbleFr:"✓ 2×3=6 !  Appuie sur  6 !" },
  { type:"op",     target:"×",                  bubble:"Last  ×  — nearly there! 🎯",       bubbleZh:"最后一个  ×  — 快成功了！🎯", bubbleFr:"Dernier  ×  — presque fini ! 🎯" },
  { type:"number", target:"4",  isSecond:true,  bubble:"Tap  4  to make 6×4=24! 🎉",        bubbleZh:"点击  4  凑成 6×4=24！🎉", bubbleFr:"Appuie sur  4  pour faire 6×4=24 ! 🎉" },
];

// Junior tutorial — separate per level
// Junior 1: 2 + 4 + 6 = 12 (pure addition, 3 steps)
const JR1_TUTORIAL_CARDS = [
  {suit:"♠",val:2,id:"jt1_2"},
  {suit:"♥",val:4,id:"jt1_4"},
  {suit:"♦",val:6,id:"jt1_6"},
];
const JR1_TUTORIAL_STEPS = [
  { type:"number", target:"2",  isSecond:false, bubble:"👆 Tap  2  to start!",           bubbleZh:"👆 点击数字  2  开始！",  bubbleFr:"👆 Appuie sur  2  pour commencer !" },
  { type:"op",     target:"+",                  bubble:"Now tap  +  to add!",             bubbleZh:"点击  +  进行加法！",     bubbleFr:"Appuie sur  +  pour additionner !" },
  { type:"number", target:"4",  isSecond:true,  bubble:"Tap  4  — to make 2+4!",          bubbleZh:"点击  4  — 算出 2+4！",   bubbleFr:"Appuie sur  4  — pour faire 2+4 !" },
  { type:"number", target:"6",  isSecond:false, bubble:"✓ 2+4=6!  Now tap  6  again!",    bubbleZh:"✓ 2+4=6！再点击结果  6  ！", bubbleFr:"✓ 2+4=6 !  Appuie encore sur  6 !" },
  { type:"op",     target:"+",                  bubble:"Tap  +  again!",                  bubbleZh:"再次点击  +  ！",          bubbleFr:"Appuie encore sur  + !" },
  { type:"number", target:"6",  isSecond:true,  bubble:"Tap  6  to make 6+6=12! 🎉",      bubbleZh:"点击  6  凑成 6+6=12！🎉", bubbleFr:"Appuie sur  6  pour faire 6+6=12 ! 🎉" },
];

// Junior 2: 2 × 4 × 3 = 24 (multiplication, 3 steps)
const JR2_TUTORIAL_CARDS = [
  {suit:"♠",val:2,id:"jt2_2"},
  {suit:"♥",val:4,id:"jt2_4"},
  {suit:"♦",val:3,id:"jt2_3"},
];
const JR2_TUTORIAL_STEPS = [
  { type:"number", target:"2",  isSecond:false, bubble:"👆 Tap  2  to start!",            bubbleZh:"👆 点击数字  2  开始！",  bubbleFr:"👆 Appuie sur  2  pour commencer !" },
  { type:"op",     target:"×",                  bubble:"Now tap  ×  to multiply!",        bubbleZh:"点击  ×  进行乘法！",     bubbleFr:"Appuie sur  ×  pour multiplier !" },
  { type:"number", target:"4",  isSecond:true,  bubble:"Tap  4  — to make 2×4!",          bubbleZh:"点击  4  — 算出 2×4！",   bubbleFr:"Appuie sur  4  — pour faire 2×4 !" },
  { type:"number", target:"8",  isSecond:false, bubble:"✓ 2×4=8!  Now tap  8 !",         bubbleZh:"✓ 2×4=8！点击结果  8  ！", bubbleFr:"✓ 2×4=8 !  Appuie sur  8 !" },
  { type:"op",     target:"×",                  bubble:"Tap  ×  again!",                  bubbleZh:"再次点击  ×  ！",          bubbleFr:"Appuie encore sur  × !" },
  { type:"number", target:"3",  isSecond:true,  bubble:"Tap  3  to make 8×3=24! 🎉",      bubbleZh:"点击  3  凑成 8×3=24！🎉", bubbleFr:"Appuie sur  3  pour faire 8×3=24 ! 🎉" },
];

function loadJrTutorialDone(level) {
  try { return localStorage.getItem(`game24_jr_tut_${level}`)==="1"; } catch { return false; }
}
function saveJrTutorialDone(level) {
  try { localStorage.setItem(`game24_jr_tut_${level}`,"1"); } catch {}
}
const T = {
  en: {
    title: "24",
    subtitle: "THE MATH CARD GAME",
    difficulty: "DIFFICULTY",
    easy: "Easy", medium: "Medium", hard: "Hard",
    timerSolo: "TIMER (SOLO)",
    timerOn: "⏱ On — earn speed bonus",
    timerOff: "∞ Off — no speed bonus",
    timerOnNote: "Speed bonus earned for fast solves",
    timerOffNote: "No time pressure — solve at your own pace",
    players: "PLAYERS",
    roundsPerPlayer: "ROUNDS PER PLAYER",
    roundsNote: (r,n) => n>1?`${r*n} total puzzles across all players`:`${r} puzzles to solve`,
    startGame: "Start Game ▶",
    round: "ROUND", time: "TIME", diff: "DIFF",
    speedBonus: "speed bonus", noBonus: "no bonus",
    yourTurn: (name) => `${name}'s Turn`,
    availableNumbers: "AVAILABLE NUMBERS",
    steps: "STEPS", step: "Step",
    tapInstruction: "Tap a number → tap an operator → tap another number",
    pickOperator: "Now pick an operator ↑",
    pickSecond: "Now tap the second number ↑",
    reset: "↺ Reset", hint: "💡 Hint", skip: "⏭ Skip",
    nextPuzzle: "Next Puzzle ▶",
    nextPlayer: (name) => `Next: ${name}'s Turn ▶`,
    seeResults: "🏆 See Final Results",
    cantDivideZero: "Can't divide by zero!",
    notTwentyFour: (n) => `Result is ${n}, not 24. Try resetting!`,
    timeUp: "⏰ Time's up!",
    roundsPerPlayerNote: (r) => `${r} rounds per player`,
    winMsg: (pts, bonus) => bonus>0?`🎉 24! +${pts} pts (⚡${bonus} speed bonus)`:`🎉 24! +${pts} pts`,
    gameOver: "Game Over!",
    wins: (name) => `${name} Wins!`,
    finalScore: "Final Score",
    bestStreak: "Best Streak",
    hintsUsed: (n) => `💡 ${n} hints used`,
    streak: (n) => `🔥 Best streak ${n}`,
    levelUp: (next) => `🎉 Score unlocked next difficulty! Try ${next} mode.`,
    playAgain: "Play Again",
    score: "Score", streak2: "Streak",
    perRound: (s) => `${s}s per round · `,
    ptsPerSolve: (p) => `+${p} pts per solve`,
    language: "中文",
    howToPlayTitle: "How to Play",
    howToPlayLines: [
      "🃏 Four cards are dealt — use ALL four numbers to make 24",
      "➕ You can use + − × ÷ and even power (^), square root (√), y-th root (ʸ√) or factorial ! (Hard mode only)",
      "👆 Tap a number → tap an operator → tap another number",
      "🔁 The result becomes a new number to use in the next step",
      "🎯 Keep going until only one number is left — it must be 24!",
      "💡 Stuck? Use the Hint button",
      "⏭ Can't solve it? Press Skip to get new cards",
    ],
    gotIt: "Got it! Let's Play 🎮",
  },
  zh: {
    title: "24",
    subtitle: "数学扑克牌游戏",
    difficulty: "难度",
    easy: "简单", medium: "中等", hard: "困难",
    timerSolo: "计时器（单人）",
    timerOn: "⏱ 开启 — 获得速度奖励",
    timerOff: "∞ 关闭 — 无速度奖励",
    timerOnNote: "快速完成可获得速度奖励",
    timerOffNote: "无时间压力 — 慢慢来",
    players: "玩家人数",
    roundsPerPlayer: "每位玩家的轮数",
    roundsNote: (r,n) => n>1?`所有玩家共 ${r*n} 题`:`共 ${r} 题`,
    startGame: "开始游戏 ▶",
    round: "轮次", time: "时间", diff: "难度",
    speedBonus: "速度奖励", noBonus: "无奖励",
    yourTurn: (name) => `${name} 的回合`,
    availableNumbers: "可用数字",
    steps: "步骤", step: "第",
    tapInstruction: "点击数字 → 选择运算符 → 点击另一个数字",
    pickOperator: "请选择运算符 ↑",
    pickSecond: "请点击第二个数字 ↑",
    reset: "↺ 重置", hint: "💡 提示", skip: "⏭ 跳过",
    nextPuzzle: "下一题 ▶",
    nextPlayer: (name) => `下一位：${name} ▶`,
    seeResults: "🏆 查看最终结果",
    cantDivideZero: "不能除以零！",
    notTwentyFour: (n) => `结果是 ${n}，不是24。请重置！`,
    timeUp: "⏰ 时间到！",
    roundsPerPlayerNote: (r) => `每位玩家 ${r} 轮`,
    winMsg: (pts, bonus) => bonus>0?`🎉 答对了！+${pts}分（⚡${bonus}速度奖励）`:`🎉 答对了！+${pts}分`,
    gameOver: "游戏结束！",
    wins: (name) => `${name} 获胜！`,
    finalScore: "最终得分",
    bestStreak: "最长连胜",
    hintsUsed: (n) => `💡 使用了 ${n} 次提示`,
    streak: (n) => `🔥 最长连胜 ${n}`,
    levelUp: (next) => `🎉 解锁下一难度！试试${next}模式。`,
    playAgain: "再玩一次",
    score: "得分", streak2: "连胜",
    perRound: (s) => `每轮${s}秒`,
    ptsPerSolve: (p) => `每题+${p}分`,
    language: "English",
    howToPlayTitle: "游戏说明",
    howToPlayLines: [
      "🃏 发四张牌 — 用全部四个数字凑成24",
      "➕ 可以使用 + − × ÷ 以及乘方 (^)、开方 (√)、任意次方根 (ʸ√) 和阶乘 ! (仅限困难模式)",
      "👆 点击数字 → 点击运算符 → 点击另一个数字",
      "🔁 计算结果会变成新的数字继续使用",
      "🎯 继续计算直到只剩一个数字 — 必须是24！",
      "💡 不会做？点击提示按钮",
      "⏭ 做不出来？点击跳过换一组牌",
    ],
    gotIt: "明白了！开始游戏 🎮",
  },
  fr: {
    title: "24",
    subtitle: "LE JEU DE CARTES MATHEMATIQUES",
    difficulty: "DIFFICULTE",
    easy: "Facile", medium: "Moyen", hard: "Difficile",
    timerSolo: "MINUTERIE (SOLO)",
    timerOn: "On — bonus de vitesse",
    timerOff: "Off — sans bonus",
    timerOnNote: "Bonus de vitesse pour resolutions rapides",
    timerOffNote: "Pas de pression — resolvez a votre rythme",
    players: "JOUEURS",
    roundsPerPlayer: "MANCHES PAR JOUEUR",
    roundsNote: (r,n) => n>1?`${r*n} puzzles au total`:`${r} puzzles a resoudre`,
    startGame: "Commencer !",
    round: "MANCHE", time: "TEMPS", diff: "DIFF",
    speedBonus: "bonus vitesse", noBonus: "sans bonus",
    yourTurn: (name) => `Tour de ${name}`,
    availableNumbers: "NOMBRES DISPONIBLES",
    steps: "ETAPES", step: "Etape",
    tapInstruction: "Appuyez un nombre, un operateur, un autre nombre",
    pickOperator: "Choisissez un operateur",
    pickSecond: "Appuyez le deuxieme nombre",
    reset: "Reinitialiser", hint: "Indice", skip: "Passer",
    nextPuzzle: "Puzzle suivant",
    nextPlayer: (name) => `Suivant: ${name}`,
    seeResults: "Voir les resultats",
    cantDivideZero: "Division par zero impossible !",
    notTwentyFour: (n) => `Resultat: ${n}, pas 24. Reessayez !`,
    timeUp: "Temps ecoule !",
    roundsPerPlayerNote: (r) => `${r} manches par joueur`,
    winMsg: (pts, bonus) => bonus>0?`24 ! +${pts} pts (bonus ${bonus})`:`24 ! +${pts} pts`,
    gameOver: "Partie terminee !",
    wins: (name) => `${name} gagne !`,
    finalScore: "Score final",
    bestStreak: "Meilleure serie",
    hintsUsed: (n) => `${n} indices utilises`,
    streak: (n) => `Meilleure serie: ${n}`,
    levelUp: (next) => `Niveau suivant debloque ! Essayez le mode ${next}.`,
    playAgain: "Rejouer",
    score: "Score", streak2: "Serie",
    perRound: (s) => `${s}s par manche`,
    ptsPerSolve: (p) => `+${p} pts par resolution`,
    language: "EN",
    howToPlayTitle: "Comment jouer",
    howToPlayLines: [
      "Quatre cartes — utilisez les QUATRE nombres pour faire 24",
      "Vous pouvez utiliser + moins x divise et aussi puissance racine carree",
      "Appuyez un nombre puis un operateur puis un autre nombre",
      "Le resultat devient un nouveau nombre",
      "Continuez jusqu a ce qu il reste 24",
      "Bloque ? Utilisez le bouton Indice",
      "Pas de solution ? Appuyez Passer",
    ],
    gotIt: "Compris ! Jouons !",
  }
};

// Language switcher component
const LANGS = [
  { code:"en", flag:"EN", label:"English" },
  { code:"zh", flag:"CN", label:"Chinese" },
  { code:"fr", flag:"FR", label:"Francais" },
];

function LangSwitcher({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const current = LANGS.find(l=>l.code===lang)||LANGS[0];
  return (
    <div style={{position:"relative",zIndex:200}}>
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:16,padding:"3px 10px",color:"#94a3b8",fontSize:12,cursor:"pointer",
          display:"flex",alignItems:"center",gap:4}}>
        <span style={{fontSize:13}}>{"\uD83C\uDF10"}</span>
        <span style={{fontSize:11}}>{current.flag}</span>
        <span style={{fontSize:9}}>{open?"v":">"}</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,
          background:"#1e293b",border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:12,overflow:"hidden",minWidth:130,
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)",zIndex:201}}>
          {LANGS.map(l=>(
            <button key={l.code} onClick={()=>{setLang(l.code);setOpen(false);}}
              style={{width:"100%",padding:"9px 14px",background:lang===l.code?"rgba(255,255,255,0.1)":"transparent",
                border:"none",color:lang===l.code?"#f6d365":"#94a3b8",
                fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:10,
                fontWeight:lang===l.code?700:400}}>
              <span style={{fontSize:11,fontWeight:700,color:"#64748b"}}>{l.flag}</span>
              <span>{l.label}</span>
              {lang===l.code&&<span style={{marginLeft:"auto",color:"#f6d365"}}>ok</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// helpers ────────────────────────────────────────────────────────────────
function generateDeck() {
  const d = [];
  for (const s of SUITS) for (const v of VALUES) d.push({suit:s,val:v,id:s+v});
  return d.sort(()=>Math.random()-0.5);
}

function solve24(nums) {
  if (nums.length===1) return Math.abs(nums[0]-24)<1e-9;
  for (let i=0;i<nums.length;i++) for (let j=0;j<nums.length;j++) {
    if (i===j) continue;
    const rest = nums.filter((_,k)=>k!==i&&k!==j);
    const [a,b]=[nums[i],nums[j]];
    const opts=[a+b,a-b,a*b];
    if (Math.abs(b)>1e-9) opts.push(a/b);
    for (const r of opts) if (solve24([...rest,r])) return true;
  }
  return false;
}

function hasSolution(cards) { return solve24(cards.map(c=>FACE[c.val])); }

// Whole-number-only solution checker for Easy mode
function solveWholeOnly(nums) {
  if (nums.length===1) return Math.abs(nums[0]-24)<1e-9;
  for (let i=0;i<nums.length;i++) for (let j=0;j<nums.length;j++) {
    if (i===j) continue;
    const rest=nums.filter((_,k)=>k!==i&&k!==j);
    const [a,b]=[nums[i],nums[j]];
    const opts=[a+b,a-b,a*b];
    if (Math.abs(b)>1e-9 && Math.abs((a/b)-Math.round(a/b))<1e-9) opts.push(a/b);
    for (const r of opts) {
      if (Math.abs(r-Math.round(r))<1e-9 && solveWholeOnly([...rest,r])) return true;
    }
  }
  return false;
}

// Get first step hint for Easy auto-hint
function getFirstStep(cards) {
  const nums=cards.map(c=>FACE[c.val]);
  const labels=cards.map(c=>String(FACE[c.val]));
  for (let i=0;i<nums.length;i++) for (let j=0;j<nums.length;j++) {
    if (i===j) continue;
    const rest=nums.filter((_,k)=>k!==i&&k!==j);
    const [a,b,la,lb]=[nums[i],nums[j],labels[i],labels[j]];
    const tries=[[a+b,`${la} + ${lb}`],[a-b,`${la} − ${lb}`],[a*b,`${la} × ${lb}`]];
    if (Math.abs(b)>1e-9 && Math.abs((a/b)-Math.round(a/b))<1e-9) tries.push([a/b,`${la} ÷ ${lb}`]);
    for (const [r,expr] of tries) {
      if (Math.abs(r-Math.round(r))<1e-9 && solveWholeOnly([...rest,r])) {
        return expr;
      }
    }
  }
  return null;
}

// Returns full solution as array of step strings, e.g. ["3 × 8 = 24"] or ["2 + 6 = 8", "8 × 3 = 24", ...]
// Works on the *current* working numbers (not necessarily original 4 cards)
function getHintSteps(currentNumbers) {
  const nums = currentNumbers.map(n => n.value);
  const labs = currentNumbers.map(n => n.label);

  // Returns array of {expr, result, labelA, labelB, op} steps leading to 24, or null
  function find(ns, ls) {
    if (ns.length === 1) return Math.abs(ns[0] - 24) < 1e-9 ? [] : null;
    for (let i = 0; i < ns.length; i++) for (let j = 0; j < ns.length; j++) {
      if (i === j) continue;
      const rN = ns.filter((_,k) => k!==i && k!==j);
      const rL = ls.filter((_,k) => k!==i && k!==j);
      const [a, b, la, lb] = [ns[i], ns[j], ls[i], ls[j]];
      const ops = [
        [a+b, "+"],
        [a-b, "−"],
        [a*b, "×"],
      ];
      if (Math.abs(b) > 1e-9) ops.push([a/b, "÷"]);
      // power
      if (b >= 0 && b <= 5 && Number.isInteger(b)) ops.push([Math.pow(a,b), "^"]);
      // sqrt (single-operand — handled separately, skip here)
      for (const [r, op] of ops) {
        const expr = `${la} ${op} ${lb} = ${fmt(r)}`;
        const rest = find([...rN, r], [...rL, fmt(r)]);
        if (rest !== null) return [{expr, result: r}, ...rest];
      }
    }
    return null;
  }
  return find(nums, labs);
}

function fmt(n) { return Number.isInteger(n)?String(n):n.toFixed(3).replace(/\.?0+$/,""); }

// ── TM superscript component ──────────────────────────────────────────────
function TM() {
  return <sup style={{fontSize:"0.45em",verticalAlign:"super",fontWeight:400,WebkitTextFillColor:"currentColor",letterSpacing:0}}>&trade;</sup>;
}

// ── sub-components ─────────────────────────────────────────────────────────
function PlayingCard({card,selected,used,onClick,animIdx}) {
  const red = card.suit==="♥"||card.suit==="♦";
  return (
    <div onClick={used?null:onClick} style={{
      width:86,minWidth:86,height:118,borderRadius:10,
      background: used?"#1e293b": selected?"#fff8e1":"white",
      border: used?"2px solid #334155": selected?"3px solid #f59e0b":"3px solid #e2e8f0",
      boxShadow: selected?"0 8px 24px rgba(245,158,11,0.5)":"0 4px 12px rgba(0,0,0,0.2)",
      cursor:used?"default":"pointer",
      display:"flex",flexDirection:"column",justifyContent:"space-between",
      padding:"5px 7px",
      transform: used?"scale(0.92)": selected?"translateY(-10px) scale(1.08)":"scale(1)",
      transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      userSelect:"none",
      opacity: used?0.35:1,
      animation:`cardDeal 0.4s ease ${animIdx*0.08}s both`,
      position:"relative",
    }}>
      {used&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#475569"}}>✓</div>}
      <div style={{fontSize:13,fontWeight:700,color:red?"#e53e3e":"#1a202c",fontFamily:"Georgia,serif",lineHeight:1.1}}>
        {CARD_FACE_LABEL[card.val]}
        <span style={{fontSize:11}}>{card.suit}</span>
      </div>
      <div style={{fontSize:20,textAlign:"center",color:red?"#e53e3e":"#1a202c"}}>{card.suit}</div>
      <div style={{fontSize:13,fontWeight:700,color:red?"#e53e3e":"#1a202c",textAlign:"right",transform:"rotate(180deg)",fontFamily:"Georgia,serif",lineHeight:1.1}}>
        {CARD_FACE_LABEL[card.val]}
        <span style={{fontSize:11}}>{card.suit}</span>
      </div>
    </div>
  );
}

function OpBtn({op,active,onClick,disabled}) {
  const isWide = op==="ʸ√"; // wider label needs adjusted font
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:isWide?52:44,height:44,borderRadius:isWide?12:"50%",
      border:active?"2px solid #f59e0b":disabled?"2px solid #1e293b":"2px solid #334155",
      background:active?"#fef3c7":disabled?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.05)",
      fontSize:isWide?14:18,fontWeight:800,cursor:disabled?"default":"pointer",
      color:active?"#92400e":disabled?"#1e3a5f":"#94a3b8",
      transform:active?"scale(1.18)":"scale(1)",
      transition:"all 0.15s",boxShadow:active?"0 4px 12px rgba(245,158,11,0.4)":"none",
    }}>{op}</button>
  );
}

// ── Intro Demo Modal ──────────────────────────────────────────────────────
function loadIntroDone() {
  try { return localStorage.getItem("game24_intro_done") === "1"; } catch { return false; }
}
function saveIntroDone() {
  try { localStorage.setItem("game24_intro_done", "1"); } catch {}
}

function IntroDemoModal({ lang, onDone }) {
  // Demo: 1 × 2 × 3 × 4 = 24 — all 4 cards used
  // Board state per step:
  // Steps 0:      cards=[1,2,3,4]  result=null
  // Step  1:      arrow on card 1 (select first number)
  // Step  2:      arrow on ×      (select operator)
  // Step  3:      arrow on card 2 (select second number)
  // Step  4:      cards=[2,3,4]   result=2  arrow on result 2 (tap to confirm)
  // Step  5:      cards=[3,4]     arrow on × (select operator again)
  // Step  6:      arrow on card 3 (select third number)
  // Step  7:      cards=[4]       result=6  arrow on result 6 (tap to confirm)
  // Step  8:      cards=[4]       arrow on × (one more time)
  // Step  9:      arrow on card 4 (last card!)
  // Step 10:      🎉 = 24!

  const STEPS = [
    { en:"Use + − × ÷ to make 24 with all 4 cards!",  zh:"用 + − × ÷ 把全部4张牌凑成24！",          fr:"Utilise + − × ÷ avec les 4 cartes pour faire 24 !" },
    { en:"Tap a number to select it",                   zh:"点击一个数字选中它",                       fr:"Appuie sur un nombre pour le sélectionner" },
    { en:"Now tap an operator",                         zh:"点击一个运算符",                           fr:"Appuie sur un opérateur" },
    { en:"Tap the second number",                       zh:"点击第二个数字",                           fr:"Appuie sur le deuxième nombre" },
    { en:"Tap the result to confirm — 1×2=2 ✓",        zh:"点击结果确认 — 1×2=2 ✓",                  fr:"Appuie sur le résultat — 1×2=2 ✓" },
    { en:"Keep going — tap × again",                    zh:"继续——再次点击 ×",                         fr:"Continue — appuie encore sur ×" },
    { en:"Now tap 3",                                   zh:"点击 3",                                   fr:"Appuie sur 3" },
    { en:"Tap the result — 2×3=6 ✓",                   zh:"点击结果 — 2×3=6 ✓",                      fr:"Appuie sur le résultat — 2×3=6 ✓" },
    { en:"Almost there — tap × one last time",          zh:"快了！最后一次点击 ×",                     fr:"Presque fini — appuie sur × une dernière fois" },
    { en:"Tap 4 — the last card!",                      zh:"点击 4 — 最后一张牌！",                   fr:"Appuie sur 4 — la dernière carte !" },
    { en:"🎉 6×4 = 24! All 4 cards used — you win!",   zh:"🎉 6×4=24！4张牌全用上了——你赢了！",      fr:"🎉 6×4 = 24 ! Les 4 cartes utilisées — gagné !", celebrate:true },
  ];

  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length - 1) return;
    const delay = step === 0 ? 2200 : 1700;
    const t = setTimeout(() => { setStep(s=>s+1); setAnimKey(k=>k+1); }, delay);
    return () => clearTimeout(t);
  }, [step]);

  function skip() { saveIntroDone(); onDone(); }
  function play() { saveIntroDone(); onDone(); }

  const txt = lang==="zh" ? STEPS[step].zh : lang==="fr" ? STEPS[step].fr : STEPS[step].en;
  const solved = step >= 10;

  // Board state: which original cards are still visible, and intermediate result
  // After step 4+ card 1 consumed, result=2 shown
  // After step 7+ card 2 consumed (result 2 used), result=6 shown
  // After step 10 card 4 consumed, show celebration
  const showCard1 = step < 4;
  const showCard2 = step < 4;
  const showCard3 = step < 7;
  const showCard4 = step < 10;
  const showResult2 = step >= 4 && step < 7;
  const showResult6 = step >= 7 && step < 10;

  // Arrow targets
  const arrowCard1  = step === 1;
  const arrowOp1    = step === 2;
  const arrowCard2  = step === 3;
  const arrowRes2   = step === 4;
  const arrowOp2    = step === 5;
  const arrowCard3  = step === 6;
  const arrowRes6   = step === 7;
  const arrowOp3    = step === 8;
  const arrowCard4  = step === 9;

  // Highlighted (selected/active) states
  const card1Sel    = step >= 1 && step <= 3;
  const opSel       = step === 2 || step === 5 || step === 8;
  const card2Sel    = step === 3;
  const res2Sel     = step === 4;
  const card3Sel    = step === 6;
  const res6Sel     = step === 7;
  const card4Sel    = step === 9;

  const Arrow = ({color="#f6d365"}) => (
    <div style={{
      position:"absolute", top:-44, left:"50%", transform:"translateX(-50%)",
      fontSize:32, animation:"introArrow 0.7s ease infinite",
      color, filter:`drop-shadow(0 0 8px ${color})`,
      pointerEvents:"none",
    }}>⬇️</div>
  );

  const cardSt = (selected, color="#f6d365", used=false) => ({
    width:58, height:74, borderRadius:10,
    background: used ? "rgba(255,255,255,0.03)" :
      selected ? `linear-gradient(135deg,${color}22,${color}44)` : "linear-gradient(135deg,#1e293b,#0f172a)",
    border:`2px solid ${used ? "rgba(255,255,255,0.06)" : selected ? color : "rgba(255,255,255,0.15)"}`,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:24, fontWeight:900,
    color: used ? "rgba(255,255,255,0.15)" : selected ? color : "#94a3b8",
    boxShadow: selected ? `0 0 16px ${color}66` : "none",
    transition:"all 0.35s", position:"relative",
  });

  const opSt = (active) => ({
    width:42, height:42, borderRadius:9,
    background: active ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.07)",
    border:`2px solid ${active ? "#f59e0b" : "rgba(255,255,255,0.15)"}`,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:18, fontWeight:900, color: active ? "#1a1a2e" : "#64748b",
    boxShadow: active ? "0 0 14px rgba(245,158,11,0.5)" : "none",
    transition:"all 0.3s",
  });

  const resSt = (selected, val) => ({
    width:64, height:64, borderRadius:12,
    background: selected ? "linear-gradient(135deg,#34d39922,#34d39944)" : "linear-gradient(135deg,#1e3a2b,#0f2a1c)",
    border:`2px solid ${selected ? "#34d399" : "rgba(52,211,153,0.3)"}`,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:20, fontWeight:900,
    color: selected ? "#34d399" : "#4ade80",
    boxShadow: selected ? "0 0 16px rgba(52,211,153,0.5)" : "none",
    transition:"all 0.35s", position:"relative",
  });

  // Running expression label
  const exprLabel = () => {
    if (step < 2) return "";
    if (step === 2) return "1 ×";
    if (step === 3) return "1 × 2";
    if (step <= 4) return "1 × 2 = 2 ✓";
    if (step === 5) return "2 ×";
    if (step === 6) return "2 × 3";
    if (step <= 7) return "2 × 3 = 6 ✓";
    if (step === 8) return "6 ×";
    if (step === 9) return "6 × 4";
    return "6 × 4 = 24 🎉";
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      background:"rgba(0,0,0,0.93)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Trebuchet MS',sans-serif", padding:20,
    }}>
      <style>{`
        @keyframes introBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes introArrow{0%,100%{transform:translateX(-50%) translateY(0) scale(1)}50%{transform:translateX(-50%) translateY(7px) scale(1.18)}}
        @keyframes introFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes introPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes introSolve{0%{transform:scale(1)}40%{transform:scale(1.3)}100%{transform:scale(1)}}
        @keyframes introShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      `}</style>

      {/* Skip button */}
      <button onClick={skip} style={{
        position:"absolute", top:20, right:20,
        background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)",
        borderRadius:20, padding:"8px 18px",
        color:"#94a3b8", fontSize:14, fontWeight:700, cursor:"pointer",
      }}>{lang==="zh"?"跳过":lang==="fr"?"Passer":"Skip"} ✕</button>

      {/* Title */}
      <div style={{textAlign:"center", marginBottom:20}}>
        <div style={{fontSize:32, marginBottom:4, animation:"introBounce 2s ease infinite"}}>🃏</div>
        <div style={{
          fontSize:20, fontWeight:900,
          background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)", backgroundSize:"200%",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          animation:"introShimmer 2s linear infinite",
        }}>{lang==="zh"?"怎么玩？":lang==="fr"?"Comment jouer ?":"How to play?"}</div>
      </div>

      {/* Instruction text */}
      <div key={animKey} style={{
        minHeight:48, display:"flex", alignItems:"center", justifyContent:"center",
        marginBottom:20, animation:"introFadeIn 0.4s ease", padding:"0 12px",
      }}>
        <div style={{
          color: solved ? "#f6d365" : "white",
          fontSize: solved ? 18 : 16,
          fontWeight:800, textAlign:"center", lineHeight:1.4,
          animation: solved ? "introPulse 0.8s ease" : "none",
        }}>{txt}</div>
      </div>

      {/* Game board */}
      <div style={{
        background:"linear-gradient(135deg,#1e293b,#0f172a)",
        border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:24, padding:"22px 18px",
        width:"100%", maxWidth:340,
        boxShadow:"0 8px 40px rgba(0,0,0,0.5)",
      }}>

        {/* Cards row — 2×2 grid like Classic mode */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, maxWidth:140, margin:"0 auto 14px"}}>
          {/* Card 1 */}
          <div style={{position:"relative", display:"flex", justifyContent:"center"}}>
            {showCard1 && <div style={cardSt(card1Sel)}>1</div>}
            {!showCard1 && <div style={cardSt(false,"#f6d365",true)}>1</div>}
            {arrowCard1 && <Arrow color="#f6d365"/>}
          </div>
          {/* Card 2 */}
          <div style={{position:"relative", display:"flex", justifyContent:"center"}}>
            {showCard2 && <div style={cardSt(card2Sel)}>2</div>}
            {!showCard2 && <div style={cardSt(false,"#f6d365",true)}>2</div>}
            {arrowCard2 && <Arrow color="#f6d365"/>}
          </div>
          {/* Card 3 */}
          <div style={{position:"relative", display:"flex", justifyContent:"center"}}>
            {showCard3 && <div style={cardSt(card3Sel)}>3</div>}
            {!showCard3 && <div style={cardSt(false,"#f6d365",true)}>3</div>}
            {arrowCard3 && <Arrow color="#f6d365"/>}
          </div>
          {/* Card 4 */}
          <div style={{position:"relative", display:"flex", justifyContent:"center"}}>
            {showCard4 && <div style={cardSt(card4Sel)}>4</div>}
            {!showCard4 && <div style={cardSt(false,"#f6d365",true)}>4</div>}
            {arrowCard4 && <Arrow color="#f6d365"/>}
          </div>
        </div>

        {/* Operators row */}
        <div style={{display:"flex", justifyContent:"center", gap:8, marginBottom:14}}>
          {["+","−","×","÷"].map(op=>(
            <div key={op} style={{position:"relative"}}>
              <div style={opSt(op==="×" && opSel)}>{op}</div>
              {op==="×" && (arrowOp1||arrowOp2||arrowOp3) && <Arrow color="#f59e0b"/>}
            </div>
          ))}
        </div>

        {/* Intermediate results */}
        {(showResult2 || showResult6 || solved) && (
          <div style={{display:"flex", justifyContent:"center", gap:12, animation:"introFadeIn 0.4s ease"}}>
            {showResult2 && (
              <div style={{position:"relative"}}>
                <div style={resSt(res2Sel, 2)}>2</div>
                {arrowRes2 && <Arrow color="#34d399"/>}
              </div>
            )}
            {showResult6 && (
              <div style={{position:"relative"}}>
                <div style={resSt(res6Sel, 6)}>6</div>
                {arrowRes6 && <Arrow color="#34d399"/>}
              </div>
            )}
            {solved && (
              <div style={{
                width:72, height:72, borderRadius:14,
                background:"linear-gradient(135deg,#f6d36522,#fda08544)",
                border:"2px solid #f6d365",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:32, animation:"introSolve 0.6s ease",
                boxShadow:"0 0 24px rgba(246,211,101,0.5)",
              }}>🎉</div>
            )}
          </div>
        )}

        {/* Running expression */}
        {step >= 2 && (
          <div key={step} style={{
            textAlign:"center", marginTop:10,
            color: solved ? "#f6d365" : "#64748b",
            fontSize:13, fontWeight:700,
            animation:"introFadeIn 0.3s ease",
          }}>{exprLabel()}</div>
        )}
      </div>

      {/* Progress dots */}
      <div style={{display:"flex", gap:6, marginTop:20, marginBottom:16}}>
        {STEPS.map((_,i)=>(
          <div key={i} style={{
            width: i===step ? 18 : 7, height:7, borderRadius:4,
            background: i<=step ? "#f6d365" : "rgba(255,255,255,0.15)",
            transition:"all 0.3s",
          }}/>
        ))}
      </div>

      {/* CTA on last step */}
      {solved && (
        <button onClick={play} style={{
          background:"linear-gradient(135deg,#f6d365,#fda085)",
          border:"none", borderRadius:16, padding:"15px 44px",
          color:"#1a1a2e", fontSize:17, fontWeight:900, cursor:"pointer",
          boxShadow:"0 4px 24px rgba(246,211,101,0.5)",
          animation:"introPulse 1s ease infinite",
        }}>{lang==="zh"?"开始游戏！▶":lang==="fr"?"Jouer ! ▶":"Let's Play! ▶"}</button>
      )}
    </div>
  );
}

// ── Setup screen ───────────────────────────────────────────────────────────
function SetupScreen({onStart, onJunior, onDaily, onBattle, onStats, lang, setLang, unlocked, leaderboard, setLeaderboard, autoSelectHard, setJustUnlockedHard, badges, personalBest, skipInstructions, preSelectDiff}) {
  const t=T[lang];
  const [numPlayers,setNumPlayers]=useState(1);
  const [showInstructions,setShowInstructions]=useState(!skipInstructions);
  const [showLB,setShowLB]=useState(false);
  const [showBadges,setShowBadges]=useState(false);
  const [showModeSelect, setShowModeSelect] = useState(!skipInstructions);
  const [names,setNames]=useState(["Player 1","Player 2","Player 3","Player 4"]);
  const [diff,setDiff]=useState(autoSelectHard?"Hard":preSelectDiff||"Easy");
  const [soloTimer,setSoloTimer]=useState(true); // solo timer on by default
  const defaultRounds = (d) => d==="Easy" ? 5 : 10;
  const [rounds,setRounds]=useState(()=>defaultRounds(autoSelectHard?"Hard":preSelectDiff||"Easy"));

  // If coming back from progression nudge, skip mode select
  useEffect(()=>{
    if (skipInstructions) setShowModeSelect(false);
  },[skipInstructions]);

  function updateName(i,v){const n=[...names];n[i]=v;setNames(n);}

  // Mode selection screen — two large buttons
  if (showModeSelect) return (
    <div style={{
      minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:24,
    }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
      `}</style>

      {/* Title */}
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:48,marginBottom:8}}>🃏</div>
        <h1 style={{
          fontSize:42,fontWeight:900,margin:"0 0 4px",letterSpacing:-2,
          background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:"shimmer 3s linear infinite",overflow:"visible",paddingTop:6,
        }}>Game24<sup style={{fontSize:"0.48em",WebkitTextFillColor:"#fda085",color:"#fda085",position:"relative",top:"-0.5em",marginLeft:2}}>&trade;</sup></h1>
        <p style={{color:"#64748b",fontSize:13,margin:"0 0 8px"}}>
          {lang==="zh"?"数学扑克牌游戏":"The Math Card Game"}
        </p>
        <div style={{display:"flex",justifyContent:"center",gap:8,alignItems:"center"}}>
          <LangSwitcher lang={lang} setLang={setLang}/>
          <button onClick={()=>onStats()} title="My Stats" style={{background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:16,padding:"3px 10px",color:"#a78bfa",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            <span>📊</span>
          </button>
        </div>
      </div>

      {/* Four mode buttons */}
      <div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",gap:16,animation:"fadeIn 0.5s ease"}}>

        {/* Daily Challenge — FIRST: low friction hook for new visitors */}
        <button onClick={()=>onDaily()} style={{
          width:"100%",padding:"24px 20px",borderRadius:20,
          background:"linear-gradient(135deg,#1e2a4a,#0f1f3d)",
          cursor:"pointer",textAlign:"left",
          boxShadow:"0 8px 32px rgba(96,165,250,0.2)",
          border:"1px solid rgba(96,165,250,0.45)",
          transition:"all 0.2s",
          position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",top:12,right:12,background:"rgba(96,165,250,0.2)",border:"1px solid #60a5fa",borderRadius:8,padding:"2px 8px",color:"#60a5fa",fontSize:10,fontWeight:700,letterSpacing:1}}>📅 {lang==="zh"?"每日更新":lang==="fr"?"QUOTIDIEN":"DAILY"}</div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{fontSize:44}}>📅</div>
            <div>
              <div style={{color:"#93c5fd",fontWeight:900,fontSize:22,marginBottom:4}}>
                {lang==="zh"?"每日挑战":lang==="fr"?"Défi du Jour":"Daily Challenge"}
              </div>
              <div style={{color:"#64748b",fontSize:13}}>
                {lang==="zh"?"每天同一道题，全球一起挑战！":lang==="fr"?"Le même puzzle chaque jour pour tous !":"Same puzzle, every player, every day"}
              </div>
            </div>
          </div>
        </button>

        {/* Classic Mode */}
        <button onClick={()=>setShowModeSelect(false)} style={{
          width:"100%",padding:"24px 20px",borderRadius:20,
          background:"linear-gradient(135deg,#1e3a5f,#0f2744)",
          cursor:"pointer",textAlign:"left",
          boxShadow:"0 8px 32px rgba(96,165,250,0.2)",
          border:"1px solid rgba(96,165,250,0.3)",
          transition:"all 0.2s",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{fontSize:44}}>🎮</div>
            <div>
              <div style={{color:"white",fontWeight:900,fontSize:22,marginBottom:4}}>
                {lang==="zh"?"经典模式":lang==="fr"?"Mode Classique":"Classic Mode"}
              </div>
              <div style={{color:"#64748b",fontSize:13}}>
                {lang==="zh"?"简单 → 中等 → 困难":lang==="fr"?"Facile → Moyen → Difficile":"Easy → Medium → Hard"}
              </div>
            </div>
          </div>
        </button>

        {/* Junior Mode */}
        <button onClick={()=>onJunior()} style={{
          width:"100%",padding:"24px 20px",borderRadius:20,
          background:"linear-gradient(135deg,#0a3d2b,#052e1c)",
          cursor:"pointer",textAlign:"left",
          boxShadow:"0 8px 32px rgba(52,211,153,0.2)",
          border:"1px solid rgba(52,211,153,0.3)",
          transition:"all 0.2s",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{fontSize:44}}>🌟</div>
            <div>
              <div style={{color:"#34d399",fontWeight:900,fontSize:22,marginBottom:4}}>
                {lang==="zh"?"儿童模式":lang==="fr"?"Mode Junior":"Junior Mode"}
              </div>
              <div style={{color:"#64748b",fontSize:13}}>
                {lang==="zh"?"适合 5-12 岁":lang==="fr"?"5–12 ans · Amusant et facile !":"Ages 5–12 · Fun & Easy!"}
              </div>
            </div>
          </div>
        </button>

        {/* Battle Mode */}
        <button onClick={()=>onBattle()} style={{
          width:"100%",padding:"24px 20px",borderRadius:20,
          background:"linear-gradient(135deg,#3d0a0a,#2a0a0a)",
          cursor:"pointer",textAlign:"left",
          boxShadow:"0 8px 32px rgba(239,68,68,0.2)",
          border:"1px solid rgba(239,68,68,0.4)",
          transition:"all 0.2s",
          position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",top:12,right:12,background:"rgba(239,68,68,0.2)",border:"1px solid #ef4444",borderRadius:8,padding:"2px 8px",color:"#ef4444",fontSize:10,fontWeight:700,letterSpacing:1}}>⚔️ {lang==="zh"?"最新":lang==="fr"?"NOUVEAU":"NEW"}</div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{fontSize:44}}>⚔️</div>
            <div>
              <div style={{color:"#ef4444",fontWeight:900,fontSize:22,marginBottom:4}}>
                {lang==="zh"?"对战模式":lang==="fr"?"Mode Combat":"Battle Mode"} 🔥
              </div>
              <div style={{color:"#64748b",fontSize:13}}>
                {lang==="zh"?"你的大脑就是你的武器":lang==="fr"?"Ton cerveau est ton arme":"Your brain is your weapon"}
              </div>
            </div>
          </div>
        </button>

      </div>
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:24,
    }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
        input{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:8px;
          color:white;padding:8px 12px;font-size:14px;width:100%;box-sizing:border-box;outline:none;}
        input:focus{border-color:#f59e0b;}
      `}</style>

      {/* How to Play Modal */}
      {showInstructions&&(
        <div style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
          display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:1000,padding:20,
        }}>
          <div style={{
            background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:24,padding:28,maxWidth:380,width:"100%",
            animation:"modalIn 0.3s ease",
          }}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{marginBottom:12}}><LangSwitcher lang={lang} setLang={setLang}/></div>
              <div style={{fontSize:40,marginBottom:8}}>🃏</div>
              <h2 style={{color:"white",fontSize:22,fontWeight:900,margin:0}}>{t.howToPlayTitle}</h2>
            </div>
            <div style={{marginBottom:24}}>
              {t.howToPlayLines.map((line,i)=>(
                <div key={i} style={{
                  color:"#cbd5e1",fontSize:14,marginBottom:10,
                  padding:"8px 12px",
                  background:"rgba(255,255,255,0.04)",
                  borderRadius:8,lineHeight:1.5,
                }}>{line}</div>
              ))}
            </div>
            <button onClick={()=>setShowInstructions(false)} style={{
              width:"100%",padding:"14px",borderRadius:12,border:"none",
              background:"linear-gradient(135deg,#f6d365,#fda085)",
              color:"#1a1a2e",fontSize:15,fontWeight:800,cursor:"pointer",
              boxShadow:"0 4px 20px rgba(246,211,101,0.4)",marginBottom:8,
            }}>{t.gotIt}</button>
            <button onClick={()=>setShowModeSelect(true)} style={{
              width:"100%",padding:"10px",borderRadius:12,
              border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.04)",
              color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer",
            }}>🏠 {lang==="zh"?"主菜单":lang==="fr"?"Menu principal":"Main Menu"}</button>
          </div>
        </div>
      )}

      <div style={{textAlign:"center",marginBottom:4}}>
        <h1 style={{
          fontSize:52,fontWeight:900,margin:"0 0 2px",letterSpacing:-2,
          background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:"shimmer 3s linear infinite",overflow:"visible",paddingTop:6,
        }}>Game24<sup style={{fontSize:"0.48em",WebkitTextFillColor:"#fda085",color:"#fda085",position:"relative",top:"-0.5em",marginLeft:2}}>&trade;</sup></h1>
        <p style={{
          color:"#94a3b8",fontSize:13,margin:"0 0 4px",fontWeight:500,
        }}>{lang==="zh"?"数学扑克牌游戏":"The Math Card Game"}</p>
      </div>
      <div style={{marginBottom:20}}><LangSwitcher lang={lang} setLang={setLang}/></div>

      <div style={{
        background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:20,padding:28,width:"100%",maxWidth:360,animation:"fadeIn 0.5s ease",
      }}>
        {/* Difficulty */}
        <div style={{marginBottom:24}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>{t.difficulty}</div>
          <div style={{display:"flex",gap:8}}>
            {Object.keys(DIFFICULTY).map(d=>{
              const isLocked=d==="Hard"&&!unlocked.Hard;
              return (
              <button key={d} onClick={()=>{if(isLocked)return;setDiff(prev=>{if(rounds===defaultRounds(prev))setRounds(defaultRounds(d));return d;});}} style={{
                flex:1,padding:"8px 4px",borderRadius:10,border:"none",
                background:isLocked?"rgba(255,255,255,0.03)":diff===d?DIFFICULTY[d].color:"rgba(255,255,255,0.07)",
                color:isLocked?"#334155":diff===d?"#1a1a2e":"#64748b",
                fontWeight:700,fontSize:13,cursor:isLocked?"not-allowed":"pointer",
                transition:"all 0.2s",position:"relative",
              }}>
                {isLocked?"🔒":t[d.toLowerCase()]||d}
              </button>);
            })}
          </div>
          <div style={{color:"#475569",fontSize:11,marginTop:8,textAlign:"center"}}>
            {DIFFICULTY[diff].timeLimit}s · +{DIFFICULTY[diff].pointsPerSolve} {lang==="zh"?"分":"pts"} · {lang==="zh"?"数字":"cards"} {DIFFICULTY[diff].cardNote}{diff==="Easy"?` · ${lang==="zh"?"基础运算":lang==="fr"?"operations de base seulement":"basic ops only"}`:""}{!unlocked.Hard?` · ${lang==="zh"?"Medium 150分解锁Hard":lang==="fr"?"150pts en Moyen pour debloquer Difficile":"Score 150pts on Medium to unlock Hard"}`:""}
          </div>
        </div>

        {/* Solo timer option — only shown for 1 player */}
        {numPlayers===1&&(
          <div style={{marginBottom:24}}>
            <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>{t.timerSolo}</div>
            <div style={{display:"flex",gap:8}}>
              {[{v:true,label:t.timerOn},{v:false,label:t.timerOff}].map(opt=>(
                <button key={String(opt.v)} onClick={()=>setSoloTimer(opt.v)} style={{
                  flex:1,padding:"8px 6px",borderRadius:10,border:"none",fontSize:12,
                  background:soloTimer===opt.v?(opt.v?"#34d399":"#a78bfa"):"rgba(255,255,255,0.07)",
                  color:soloTimer===opt.v?"#1a1a2e":"#64748b",fontWeight:700,cursor:"pointer",
                  transition:"all 0.2s",
                }}>{opt.label}</button>
              ))}
            </div>
            <div style={{color:"#475569",fontSize:11,marginTop:6,textAlign:"center"}}>
              {soloTimer?t.timerOnNote:t.timerOffNote}
            </div>
          </div>
        )}

        {/* Players */}
        <div style={{marginBottom:24}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>{t.players}</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[1,2,3,4].map(n=>(
              <button key={n} onClick={()=>setNumPlayers(n)} style={{
                flex:1,padding:"8px 4px",borderRadius:10,border:"none",
                background:numPlayers===n?PLAYER_COLORS[n-1]:"rgba(255,255,255,0.07)",
                color:numPlayers===n?"#1a1a2e":"#64748b",fontWeight:800,fontSize:15,cursor:"pointer",
                transition:"all 0.2s",
              }}>{n}</button>
            ))}
          </div>
          {Array.from({length:numPlayers},(_,i)=>(
            <div key={i} style={{marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:PLAYER_COLORS[i],flexShrink:0}}/>
              <input value={names[i]} onChange={e=>updateName(i,e.target.value)}
                placeholder={`Player ${i+1}`}/>
            </div>
          ))}
        </div>

        {/* Rounds selector */}
        <div style={{marginBottom:24}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>{t.roundsPerPlayer}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[3,5,8,10,15,20].map(r=>(
              <button key={r} onClick={()=>setRounds(r)} style={{
                flex:1,minWidth:40,padding:"8px 4px",borderRadius:10,border:"none",
                background:rounds===r?"#60a5fa":"rgba(255,255,255,0.07)",
                color:rounds===r?"#1a1a2e":"#64748b",fontWeight:700,fontSize:14,cursor:"pointer",
                transition:"all 0.2s",
              }}>{r}</button>
            ))}
          </div>
          <div style={{color:"#475569",fontSize:11,marginTop:6,textAlign:"center"}}>
            {t.roundsNote(rounds,numPlayers)}
          </div>
        </div>

        {/* Personal Best */}
        {Object.keys(personalBest).length>0&&(
          <div style={{
            background:"rgba(246,211,101,0.08)",border:"1px solid rgba(246,211,101,0.2)",
            borderRadius:12,padding:"10px 14px",marginBottom:12,
          }}>
            <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>
              {lang==="zh"?"个人最高分":"Personal Best"}
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {Object.entries(personalBest).map(([diff,score])=>(
                <div key={diff} style={{textAlign:"center"}}>
                  <div style={{color:DIFFICULTY[diff]?.color||"#94a3b8",fontSize:11,fontWeight:700}}>{lang==="zh"?{Easy:"简单",Medium:"中等",Hard:"困难"}[diff]||diff:lang==="fr"?{Easy:"Facile",Medium:"Moyen",Hard:"Difficile"}[diff]||diff:diff}</div>
                  <div style={{color:"#f6d365",fontWeight:900,fontSize:18}}>{score}</div>
                  <div style={{color:"#64748b",fontSize:10}}>{lang==="zh"?"等级":lang==="fr"?"Niveau":"Level"} {Math.floor(score/10)+1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={()=>onStart({numPlayers,names:names.slice(0,numPlayers),difficulty:diff,soloTimer:numPlayers===1?soloTimer:true,rounds})} style={{
          width:"100%",padding:"14px",borderRadius:12,border:"none",
          background:"linear-gradient(135deg,#f6d365,#fda085)",
          color:"#1a1a2e",fontSize:16,fontWeight:800,cursor:"pointer",
          boxShadow:"0 4px 20px rgba(246,211,101,0.4)",marginBottom:10,
        }}>{t.startGame}</button>

        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowLB(true)} style={{
            flex:1,padding:"10px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.04)",color:"#94a3b8",
            fontSize:14,fontWeight:600,cursor:"pointer",
          }}>🏆 {lang==="zh"?"排行榜":lang==="fr"?"Classement":"Leaderboard"}</button>
          <button onClick={()=>setShowBadges(true)} style={{
            flex:1,padding:"10px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.04)",color:"#94a3b8",
            fontSize:14,fontWeight:600,cursor:"pointer",
          }}>🎖️ {lang==="zh"?"成就":"Badges"} {badges.length>0?`(${badges.length})`:""}</button>
        </div>

        <button onClick={()=>setShowModeSelect(true)} style={{
          width:"100%",padding:"10px",borderRadius:12,marginTop:8,
          border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.04)",
          color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer",
        }}>🏠 {lang==="zh"?"主菜单":lang==="fr"?"Menu principal":"Main Menu"}</button>

        {/* Badges Modal */}
        {showBadges&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
            display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
            <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",
              border:"1px solid rgba(255,255,255,0.12)",borderRadius:24,
              padding:24,maxWidth:380,width:"100%",maxHeight:"80vh",overflowY:"auto"}}>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:36}}>🎖️</div>
                <h2 style={{color:"white",fontSize:20,fontWeight:900,margin:"4px 0"}}>
                  {lang==="zh"?"成就徽章":"Achievement Badges"}
                </h2>
                <div style={{color:"#64748b",fontSize:12}}>{badges.length}/{BADGES.length} {lang==="zh"?"已解锁":lang==="fr"?"debloque":"unlocked"}</div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                {BADGES.map(badge=>{
                  const earned=badges.includes(badge.id);
                  return (
                    <div key={badge.id} style={{
                      background:earned?"rgba(246,211,101,0.1)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${earned?"#f6d365":"rgba(255,255,255,0.06)"}`,
                      borderRadius:12,padding:"8px 10px",flex:"1",minWidth:"44%",
                      opacity:earned?1:0.4,
                    }}>
                      <div style={{fontSize:22,marginBottom:2}}>{earned?badge.icon:"🔒"}</div>
                      <div style={{color:earned?"#f6d365":"#475569",fontSize:12,fontWeight:700}}>
                        {lang==="zh"?badge.zh:lang==="fr"?(badge.fr||badge.en):badge.en}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>setShowBadges(false)} style={{
                width:"100%",padding:"12px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,#f6d365,#fda085)",
                color:"#1a1a2e",fontSize:14,fontWeight:800,cursor:"pointer",
              }}>{lang==="zh"?"关闭":lang==="fr"?"Fermer":"Close"}</button>
            </div>
          </div>
        )}

        {/* Leaderboard Modal */}
        {showLB&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
            display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
            <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",
              border:"1px solid rgba(255,255,255,0.12)",borderRadius:24,
              padding:24,maxWidth:380,width:"100%",maxHeight:"80vh",overflowY:"auto"}}>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:36}}>🏆</div>
                <h2 style={{color:"white",fontSize:20,fontWeight:900,margin:"4px 0"}}>
                  {lang==="zh"?"排行榜":lang==="fr"?"Classement":"Leaderboard"}
                </h2>
              </div>
              {leaderboard.length===0?(
                <p style={{color:"#475569",textAlign:"center",fontSize:14}}>
                  {lang==="zh"?"暂无记录，快去挑战吧！":lang==="fr"?"Pas encore de scores !":"No scores yet — play to get on the board!"}
                </p>
              ):(
                leaderboard.map((entry,i)=>(
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:10,
                    background:"rgba(255,255,255,0.04)",borderRadius:12,
                    padding:"10px 14px",marginBottom:8,
                  }}>
                    <div style={{fontSize:18,width:28,textAlign:"center"}}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{color:"white",fontWeight:700,fontSize:14}}>{entry.name}</div>
                      <div style={{color:"#64748b",fontSize:11}}>
                        {entry.difficulty} · {lang==="zh"?"等级":lang==="fr"?"Niveau":lang==="fr"?"Niveau":"Level"}{Math.floor(entry.score/10)+1} · {entry.date} · 🔥{entry.streak}
                      </div>
                    </div>
                    <div style={{color:"#f6d365",fontWeight:900,fontSize:20}}>{entry.score}</div>
                  </div>
                ))
              )}
              {leaderboard.length>0&&(
                <button onClick={()=>{saveLeaderboard([]);setLeaderboard([]);}} style={{
                  width:"100%",padding:"8px",borderRadius:10,marginTop:8,
                  border:"1px solid #ef4444",background:"transparent",
                  color:"#ef4444",fontSize:12,cursor:"pointer",
                }}>{lang==="zh"?"清除记录":lang==="fr"?"Effacer les scores":"Clear All Scores"}</button>
              )}
              <button onClick={()=>setShowLB(false)} style={{
                width:"100%",padding:"12px",borderRadius:12,border:"none",marginTop:10,
                background:"linear-gradient(135deg,#f6d365,#fda085)",
                color:"#1a1a2e",fontSize:14,fontWeight:800,cursor:"pointer",
              }}>{lang==="zh"?"关闭":lang==="fr"?"Fermer":"Close"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main game ──────────────────────────────────────────────────────────────
// ── Junior Mode Screen ─────────────────────────────────────────────────────
function JuniorScreen({lang, setLang, onBack}) {
  const [name, setName] = useState("⭐ Player");
  const [level, setLevel] = useState("⭐");
  const [rounds, setRounds] = useState(5);
  const [screen, setScreen] = useState("setup"); // setup | game | end
  const [juniorBadges, setJuniorBadges] = useState(()=>loadJuniorBadges());
  const [juniorLB, setJuniorLB] = useState(()=>loadJuniorLeaderboard());
  const [showLB, setShowLB] = useState(false);
  const [showBadges, setShowBadges] = useState(false);

  // Game state
  const [cards, setCards] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [operator, setOperator] = useState(null);
  const [steps, setSteps] = useState([]);
  const [message, setMessage] = useState({text:"",type:""});
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [turnOver, setTurnOver] = useState(false);
  const [totalSolves, setTotalSolves] = useState(()=>loadJuniorSolves());
  const [newBadges, setNewBadges] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [solvedRounds, setSolvedRounds] = useState(0);
  const [showJrLeaveConfirm, setShowJrLeaveConfirm] = useState(false);
  const [jrPaused, setJrPaused] = useState(false);
  const [showJrHelp, setShowJrHelp] = useState(false);
  const [jrTutStep, setJrTutStep] = useState(-1);
  const jrShareCardRef = useRef(null);
  const [jrSharing, setJrSharing] = useState(false);
  const [jrHint, setJrHint] = useState(null); // hint string or null

  const jl = JUNIOR_LEVELS[level];

  const encouragingMessages = lang==="zh"
    ? ["🎉 太棒了！","🌟 你真聪明！","💪 厉害！","🎊 好样的！","✨ 继续加油！","🏆 超级棒！"]
    : ["🎉 Amazing!","🌟 You're so smart!","💪 Awesome!","🎊 Well done!","✨ Keep it up!","🏆 Superstar!"];

  const jrTutCards = level==="⭐" ? JR1_TUTORIAL_CARDS : JR2_TUTORIAL_CARDS;
  const jrTutSteps = level==="⭐" ? JR1_TUTORIAL_STEPS : JR2_TUTORIAL_STEPS;

  function dealJuniorCards() {
    const maxCard = jl.maxCard;
    const target = jl.target;
    const ops = jl.ops;
    const pool = [];
    for (const s of SUITS) for (const v of VALUES) if (v<=maxCard) pool.push({suit:s,val:v,id:s+v});
    let drawn, attempts=0;
    do {
      pool.sort(()=>Math.random()-0.5);
      drawn = pool.slice(0,3);
      attempts++;
      if (attempts>200) break;
    } while (!solveJunior(drawn.map(c=>c.val), target, ops));
    setCards(drawn);
    setNumbers(drawn.map(c=>({value:c.val, label:String(c.val), sourceId:c.id})));
    setSelectedIdx(null);
    setOperator(null);
    setSteps([]);
    setMessage({text:"",type:""});
    setTurnOver(false);
    setStartTime(Date.now());
    setJrHint(null);
  }

  function startJuniorGame() {
    setScore(0);
    setStreak(0);
    setRound(1);
    setSolvedRounds(0);
    setScreen("game");
    // Show tutorial on first visit for this level
    const isFirstTime = !loadJrTutorialDone(level);
    if (isFirstTime) {
      setCards(jrTutCards);
      setNumbers(jrTutCards.map(c=>({value:c.val, label:String(c.val), sourceId:c.id})));
      setSelectedIdx(null);
      setOperator(null);
      setSteps([]);
      setMessage({text:"",type:""});
      setTurnOver(false);
      setStartTime(Date.now());
      setJrTutStep(0);
    } else {
      dealJuniorCards();
      setJrTutStep(-1);
    }
  }

  function handleNumberClick(idx) {
    if (turnOver) return;
    // Tutorial mode
    if (jrTutStep>=0) {
      const step = jrTutSteps[jrTutStep];
      if (step.type!=="number") return;
      if (numbers[idx].label!==step.target) {
        setMessage({text:lang==="zh"?`👆 点击  ${step.target}  ！`:`👆 ${lang==="fr"?"Appuyez":"Tap"}  ${step.target}  !`,type:"bad"});
        return;
      }
      if (!step.isSecond) {
        setSelectedIdx(idx);
        setOperator(null);
        setMessage({text:"",type:""});
        setJrTutStep(s=>s+1);
      } else {
        setJrTutStep(s=>s+1);
        applyJuniorOp(selectedIdx, operator, idx);
      }
      return;
    }
    if (selectedIdx===null) {
      setSelectedIdx(idx);
      setOperator(null);
      setMessage({text:"",type:""});
    } else if (selectedIdx===idx) {
      setSelectedIdx(null);
      setOperator(null);
    } else if (operator!==null) {
      applyJuniorOp(selectedIdx, operator, idx);
    }
  }

  function applyJuniorOp(iA, op, iB) {
    const a=numbers[iA].value, b=numbers[iB].value;
    const la=numbers[iA].label, lb=numbers[iB].label;
    let result;
    if (op==="+") result=a+b;
    else if (op==="−") result=a-b;
    else if (op==="×") result=a*b;
    else if (op==="÷") {
      if (Math.abs(b)<1e-9||Math.abs((a/b)-Math.round(a/b))>1e-9) {
        setMessage({text:lang==="zh"?"不能整除哦！":lang==="fr"?"La division n'est pas entiere !":"That doesn't divide evenly!",type:"bad"});
        return;
      }
      result=a/b;
    }
    const expr=`${la} ${op} ${lb} = ${result}`;
    setSteps(s=>[...s,{expr,result}]);
    const newNums=numbers.filter((_,i)=>i!==iA&&i!==iB);
    newNums.push({value:result,label:String(result),sourceId:`step_${steps.length+1}`});
    setNumbers(newNums);
    setSelectedIdx(null);
    setOperator(null);
    if (newNums.length===1) {
      if (Math.abs(result-jl.target)<1e-9) {
        handleJuniorSolve();
      } else {
        setMessage({text:lang==="zh"?`结果是${result}，不是${jl.target}，再试试！`:`${lang==="fr"?`Resultat ${result}, pas ${jl.target} — reessayez !`:`Got ${result}, not ${jl.target} — try resetting!`}`,type:"bad"});
      }
    } else {
      setMessage({text:`✓ ${expr}`,type:"step"});
    }
  }

  function handleJuniorSolve() {
    // Mark tutorial done
    if (jrTutStep>=0) {
      saveJrTutorialDone(level);
      setJrTutStep(-1);
    }
    const timeElapsed = Math.round((Date.now()-startTime)/1000);
    const pts = jl.pointsPerSolve;
    const newScore = score+pts;
    const newStreak = streak+1;
    const newTotalSolves = totalSolves+1;
    const newSolvedRounds = solvedRounds+1;
    setScore(newScore);
    setStreak(newStreak);
    setTotalSolves(newTotalSolves);
    setSolvedRounds(newSolvedRounds);
    saveJuniorSolves(newTotalSolves);
    setTurnOver(true);
    setShowConfetti(true);
    setTimeout(()=>setShowConfetti(false),2500);
    const msg = encouragingMessages[Math.floor(Math.random()*encouragingMessages.length)];
    setMessage({text:`${msg} +${pts}pts`,type:"win"});
    // Check badges
    const earned = checkJuniorBadges(juniorBadges,{totalSolves:newTotalSolves,streak:newStreak,timeElapsed,score:newScore});
    if (earned.length>0) {
      const all=[...juniorBadges,...earned];
      setJuniorBadges(all);
      saveJuniorBadges(all);
      setNewBadges(earned);
      setTimeout(()=>setNewBadges([]),4000);
    }
  }

  function handleReset() {
    setNumbers(cards.map(c=>({value:c.val,label:String(c.val),sourceId:c.id})));
    setSelectedIdx(null);
    setOperator(null);
    setSteps([]);
    setMessage({text:"",type:""});
    setJrHint(null);
  }

  function handleJrHint() {
    // Junior-specific hint finder — works with 3 numbers and target 12 or 24
    const target = jl.target;
    const ops = jl.ops;

    function findJrSolution(nums, labs) {
      if (nums.length===1) return Math.abs(nums[0]-target)<1e-9 ? [] : null;
      for (let i=0;i<nums.length;i++) for (let j=0;j<nums.length;j++) {
        if (i===j) continue;
        const rN=nums.filter((_,k)=>k!==i&&k!==j);
        const rL=labs.filter((_,k)=>k!==i&&k!==j);
        const [a,b,la,lb]=[nums[i],nums[j],labs[i],labs[j]];
        const tries=[];
        if (ops.includes("+")) tries.push([a+b,"+"]);
        if (ops.includes("−")) tries.push([a-b,"−"]);
        if (ops.includes("×")) tries.push([a*b,"×"]);
        if (ops.includes("÷")&&Math.abs(b)>1e-9&&Math.abs((a/b)-Math.round(a/b))<1e-9) tries.push([a/b,"÷"]);
        for (const [r,op] of tries) {
          const expr=`${la} ${op} ${lb} = ${r}`;
          const rest=findJrSolution([...rN,r],[...rL,String(r)]);
          if (rest!==null) return [expr,...rest];
        }
      }
      return null;
    }

    const nums=numbers.map(n=>n.value);
    const labs=numbers.map(n=>n.label);
    const solution=findJrSolution(nums,labs);
    if (solution&&solution.length>0) {
      setJrHint(solution.join(" → "));
    } else {
      // No solution from current state — suggest reset
      setJrHint(lang==="zh"?"点击重置再试试！":lang==="fr"?"Reinitialiser et reessayer !":"Tap Reset and try again!");
    }
  }

  function handleNext() {
    if (round>=rounds) {
      // Save to leaderboard
      const date=new Date().toLocaleDateString();
      const newEntries=[...juniorLB,{name,score,streak,level,date}].sort((a,b)=>b.score-a.score).slice(0,20);
      setJuniorLB(newEntries);
      saveJuniorLeaderboard(newEntries);
      setScreen("end");
    } else {
      setRound(r=>r+1);
      dealJuniorCards();
    }
  }

  const msgColor={win:"#34d399",bad:"#ef4444",step:"#f6d365","":"#94a3b8"}[message.type]||"#94a3b8";

  // Setup screen
  if (screen==="setup") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0d2137,#0a3d2b,#0d2137)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:24}}>
      <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        input{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:white;padding:8px 12px;font-size:14px;width:100%;box-sizing:border-box;outline:none;}
        input:focus{border-color:#34d399;}`}</style>

      <div style={{fontSize:48,marginBottom:4}}>🌟</div>
      <h1 style={{fontSize:32,fontWeight:900,margin:"0 0 4px",color:"#34d399"}}>
        {lang==="zh"?"儿童模式":lang==="fr"?"Mode Junior":"Junior Mode"}
      </h1>
      <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>
        {lang==="zh"?"适合 5-12 岁":lang==="fr"?"5–12 ans":"Ages 5–12"}
      </p>

      <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:20,padding:24,width:"100%",maxWidth:340,animation:"fadeIn 0.5s ease"}}>

        {/* Name */}
        <div style={{marginBottom:20}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
            {lang==="zh"?"你的名字":lang==="fr"?"Votre nom":"Your Name"}
          </div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder={lang==="zh"?"输入名字":lang==="fr"?"Entrez votre nom":"Enter your name"}/>
        </div>

        {/* Level */}
        <div style={{marginBottom:20}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
            {lang==="zh"?"选择等级":lang==="fr"?"Choisir le niveau":"Choose Level"}
          </div>
          <div style={{display:"flex",gap:8}}>
            {Object.entries(JUNIOR_LEVELS).map(([key,jl])=>(
              <button key={key} onClick={()=>setLevel(key)} style={{
                flex:1,padding:"12px 8px",borderRadius:12,border:"none",
                background:level===key?jl.color:"rgba(255,255,255,0.07)",
                color:level===key?"#1a1a2e":"#64748b",
                fontWeight:800,fontSize:13,cursor:"pointer",transition:"all 0.2s",
              }}>
                <div style={{fontSize:20,marginBottom:4}}>{key}</div>
                <div>{lang==="zh"?jl.zh:lang==="fr"?(jl.fr||jl.en):jl.en}</div>
                <div style={{fontSize:10,marginTop:2,opacity:0.8}}>{lang==="zh"?"数字":lang==="fr"?"Cartes":"Cards"} {jl.cardNote}</div>
                <div style={{fontSize:10,opacity:0.8}}>{lang==="zh"?"目标":lang==="fr"?"Cible":"Target"} {jl.target}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Rounds */}
        <div style={{marginBottom:20}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
            {lang==="zh"?"题目数量":lang==="fr"?"Nombre de manches":"Number of Rounds"}
          </div>
          <div style={{display:"flex",gap:8}}>
            {[3,5,8,10].map(r=>(
              <button key={r} onClick={()=>setRounds(r)} style={{
                flex:1,padding:"10px 4px",borderRadius:10,border:"none",
                background:rounds===r?"#34d399":"rgba(255,255,255,0.07)",
                color:rounds===r?"#1a1a2e":"#64748b",
                fontWeight:700,fontSize:15,cursor:"pointer",transition:"all 0.2s",
              }}>{r}</button>
            ))}
          </div>
        </div>

        <button onClick={startJuniorGame} style={{
          width:"100%",padding:"14px",borderRadius:12,border:"none",
          background:"linear-gradient(135deg,#34d399,#059669)",
          color:"white",fontSize:16,fontWeight:800,cursor:"pointer",
          boxShadow:"0 4px 20px rgba(52,211,153,0.4)",marginBottom:10,
        }}>🌟 {lang==="zh"?"开始游戏！":lang==="fr"?"Jouons !":"Let's Play!"}</button>

        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowLB(true)} style={{
            flex:1,padding:"10px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer",
          }}>🏆 {lang==="zh"?"排行榜":lang==="fr"?"Classement":"Leaderboard"}</button>
          <button onClick={()=>setShowBadges(true)} style={{
            flex:1,padding:"10px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer",
          }}>🎖️ {lang==="zh"?"成就":lang==="fr"?"Trophees":"Badges"} {juniorBadges.length>0?`(${juniorBadges.length})`:""}</button>
        </div>

        <button onClick={onBack} style={{
          width:"100%",padding:"10px",borderRadius:12,marginTop:8,
          border:"1px solid rgba(255,255,255,0.1)",background:"transparent",
          color:"#64748b",fontSize:13,cursor:"pointer",
        }}>🏠 {lang==="zh"?"主菜单":lang==="fr"?"Menu principal":"Main Menu"}</button>
      </div>

      {/* Leaderboard Modal */}
      {showLB&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
          <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid rgba(255,255,255,0.12)",borderRadius:24,
            padding:24,maxWidth:380,width:"100%",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36}}>🏆</div>
              <h2 style={{color:"#34d399",fontSize:20,fontWeight:900,margin:"4px 0"}}>
                {lang==="zh"?"儿童排行榜":lang==="fr"?"Classement Junior":"Junior Leaderboard"}
              </h2>
            </div>
            {juniorLB.length===0?(
              <p style={{color:"#475569",textAlign:"center",fontSize:14}}>
                {lang==="zh"?"暂无记录！":lang==="fr"?"Pas encore de scores !":"No scores yet — play to get on the board!"}
              </p>
            ):(
              juniorLB.map((entry,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                  background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 14px",marginBottom:8}}>
                  <div style={{fontSize:18,width:28,textAlign:"center"}}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:"white",fontWeight:700,fontSize:14}}>{entry.name}</div>
                    <div style={{color:"#64748b",fontSize:11}}>{entry.level} · {entry.date} · 🔥{entry.streak}</div>
                  </div>
                  <div style={{color:"#34d399",fontWeight:900,fontSize:20}}>{entry.score}</div>
                </div>
              ))
            )}
            <button onClick={()=>setShowLB(false)} style={{
              width:"100%",padding:"12px",borderRadius:12,border:"none",marginTop:8,
              background:"linear-gradient(135deg,#34d399,#059669)",
              color:"white",fontSize:14,fontWeight:800,cursor:"pointer",
            }}>{lang==="zh"?"关闭":lang==="fr"?"Fermer":"Close"}</button>
          </div>
        </div>
      )}

      {/* Badges Modal */}
      {showBadges&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
          <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid rgba(255,255,255,0.12)",borderRadius:24,
            padding:24,maxWidth:380,width:"100%",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36}}>🎖️</div>
              <h2 style={{color:"#34d399",fontSize:20,fontWeight:900,margin:"4px 0"}}>
                {lang==="zh"?"儿童成就":lang==="fr"?"Trophees Junior":"Junior Badges"}
              </h2>
              <div style={{color:"#64748b",fontSize:12}}>{juniorBadges.length}/{JUNIOR_BADGES.length} {lang==="zh"?"已解锁":lang==="fr"?"debloque":"unlocked"}</div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
              {JUNIOR_BADGES.map(badge=>{
                const earned=juniorBadges.includes(badge.id);
                return (
                  <div key={badge.id} style={{
                    background:earned?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.03)",
                    border:`1px solid ${earned?"#34d399":"rgba(255,255,255,0.06)"}`,
                    borderRadius:12,padding:"8px 10px",flex:"1",minWidth:"44%",
                    opacity:earned?1:0.4,
                  }}>
                    <div style={{fontSize:22,marginBottom:2}}>{earned?badge.icon:"🔒"}</div>
                    <div style={{color:earned?"#34d399":"#475569",fontSize:12,fontWeight:700}}>
                      {lang==="zh"?badge.zh:lang==="fr"?(badge.fr||badge.en):badge.en}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={()=>setShowBadges(false)} style={{
              width:"100%",padding:"12px",borderRadius:12,border:"none",
              background:"linear-gradient(135deg,#34d399,#059669)",
              color:"white",fontSize:14,fontWeight:800,cursor:"pointer",
            }}>{lang==="zh"?"关闭":lang==="fr"?"Fermer":"Close"}</button>
          </div>
        </div>
      )}
    </div>
  );

  // Game screen
  if (screen==="game") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0d2137,#0a3d2b,#0d2137)",
      display:"flex",flexDirection:"column",alignItems:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:"16px 12px",overflowY:"auto",
      animation:"fadeInScreen 0.3s ease"}}>
      <style>{`
        @keyframes cardDeal{from{opacity:0;transform:translateY(-30px) scale(0.85)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes popIn{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
        @keyframes badgeSlide{0%{transform:translateX(120%);opacity:0}15%{transform:translateX(0);opacity:1}85%{transform:translateX(0);opacity:1}100%{transform:translateX(120%);opacity:0}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      `}</style>

      {/* Confetti */}
      {showConfetti&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>
          {Array.from({length:40}).map((_,i)=>{
            const colors=["#34d399","#f6d365","#f472b6","#60a5fa","#a78bfa","#fb923c"];
            return <div key={i} style={{
              position:"absolute",top:"-20px",left:`${Math.random()*100}%`,
              width:6+Math.random()*8,height:6+Math.random()*8,
              background:colors[i%colors.length],
              borderRadius:Math.random()>0.5?"50%":"2px",
              animation:`confettiFall ${1.5+Math.random()}s ease-in ${Math.random()*0.8}s forwards`,
            }}/>;
          })}
        </div>
      )}

      {/* New badge notifications */}
      {newBadges.map((id,i)=>{
        const badge=JUNIOR_BADGES.find(b=>b.id===id);
        if (!badge) return null;
        return (
          <div key={id} style={{position:"fixed",top:`${70+i*70}px`,right:16,zIndex:1000,
            background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid #34d399",borderRadius:14,padding:"10px 16px",minWidth:200,
            animation:"badgeSlide 4s ease forwards",boxShadow:"0 4px 20px rgba(52,211,153,0.3)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:28}}>{badge.icon}</div>
              <div>
                <div style={{color:"#34d399",fontWeight:800,fontSize:13}}>
                  {lang==="zh"?"新成就解锁！":lang==="fr"?"Trophee debloque !":"Badge Unlocked!"}
                </div>
                <div style={{color:"white",fontWeight:700,fontSize:14}}>
                  {lang==="zh"?badge.zh:lang==="fr"?(badge.fr||badge.en):badge.en}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Header */}
      <div style={{width:"100%",maxWidth:360,marginBottom:4}}>
        <h1 style={{fontSize:22,fontWeight:900,margin:"0 0 6px",color:"#34d399",textAlign:"center"}}>
          🌟 {lang==="zh"?"儿童模式":lang==="fr"?"Mode Junior":"Junior Mode"}
        </h1>
        <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"center"}}>
          <LangSwitcher lang={lang} setLang={setLang}/>
          <button onClick={()=>setShowJrHelp(true)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,padding:"4px 10px",color:"#64748b",fontSize:12,cursor:"pointer"}}>❓</button>
          <button onClick={()=>setJrPaused(p=>!p)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,padding:"4px 10px",color:"#64748b",fontSize:12,cursor:"pointer"}}>{jrPaused?"▶":"⏸"}</button>
          <button onClick={()=>setShowJrLeaveConfirm(true)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,padding:"4px 10px",color:"#64748b",fontSize:13,cursor:"pointer"}}>🏠</button>
        </div>
      </div>

      {/* Leave confirmation */}
      {/* Pause overlay */}
      {jrPaused&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:12}}>⏸</div>
            <h2 style={{color:"white",fontSize:24,fontWeight:900,marginBottom:8}}>{lang==="zh"?"游戏暂停":lang==="fr"?"Pause":"Paused"}</h2>
            <button onClick={()=>setJrPaused(false)} style={{background:"linear-gradient(135deg,#34d399,#059669)",border:"none",borderRadius:12,padding:"14px 28px",color:"white",fontSize:16,fontWeight:800,cursor:"pointer"}}>
              ▶ {lang==="zh"?"继续":lang==="fr"?"Continuer":"Resume"}
            </button>
          </div>
        </div>
      )}

      {/* Help overlay */}
      {showJrHelp&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}}>
          <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:20,padding:24,maxWidth:340,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:8}}>🌟</div>
            <h3 style={{color:"#34d399",fontSize:18,fontWeight:900,margin:"0 0 16px"}}>{lang==="zh"?"儿童模式说明":lang==="fr"?"Comment jouer":"How to play"}</h3>
            {[
              {zh:"用四张牌上的数字凑成目标数字！",fr:"Utilise les 4 cartes pour atteindre le nombre cible !",en:"Use the 4 cards to make the target number!"},
              {zh:"点击数字 → 选运算符 → 点击另一个数字",fr:"Appuie un nombre → un operateur → un autre nombre",en:"Tap number → operator → another number"},
              {zh:"卡住了？点击提示！",fr:"Bloque ? Utilise l'indice !",en:"Stuck? Tap the hint button!"},
            ].map((line,i)=>(
              <div key={i} style={{background:"rgba(52,211,153,0.08)",borderRadius:10,padding:"8px 12px",marginBottom:8,color:"#94a3b8",fontSize:13,textAlign:"left"}}>
                {lang==="zh"?line.zh:lang==="fr"?line.fr:line.en}
              </div>
            ))}
            <button onClick={()=>setShowJrHelp(false)} style={{background:"linear-gradient(135deg,#34d399,#059669)",border:"none",borderRadius:12,padding:"12px 28px",color:"white",fontSize:15,fontWeight:800,cursor:"pointer",marginTop:8}}>
              {lang==="zh"?"明白了！":lang==="fr"?"Compris !":"Got it!"}
            </button>
          </div>
        </div>
      )}

      {showJrLeaveConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}}>
          <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,
            padding:28,maxWidth:320,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🏠</div>
            <h3 style={{color:"white",fontSize:18,fontWeight:900,margin:"0 0 8px"}}>
              {lang==="zh"?"离开游戏？":lang==="fr"?"Quitter le jeu ?":"Leave game?"}
            </h3>
            <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>
              {lang==="zh"?"当前进度将会丢失。":lang==="fr"?"Votre progression sera perdue.":"Your progress will be lost."}
            </p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowJrLeaveConfirm(false)} style={{
                flex:1,padding:"12px",borderRadius:12,
                border:"1px solid rgba(255,255,255,0.15)",background:"transparent",
                color:"#94a3b8",fontSize:14,fontWeight:700,cursor:"pointer",
              }}>{lang==="zh"?"取消":lang==="fr"?"Annuler":"Cancel"}</button>
              <button onClick={()=>{setShowJrLeaveConfirm(false);setScreen("setup");}} style={{
                flex:1,padding:"12px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,#ef4444,#b91c1c)",
                color:"white",fontSize:14,fontWeight:700,cursor:"pointer",
              }}>{lang==="zh"?"离开":lang==="fr"?"Oui, quitter":"Yes, leave"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Score bar */}
      <div style={{display:"flex",gap:12,marginBottom:14,
        background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",
        borderRadius:14,padding:"8px 18px",flexWrap:"wrap",justifyContent:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>
            {lang==="zh"?"轮次":lang==="fr"?"Manche":"Round"}
          </div>
          <div style={{color:"white",fontWeight:800,fontSize:18}}>{round}/{rounds}</div>
        </div>
        <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>
            {lang==="zh"?"得分":lang==="fr"?"Score":"Score"}
          </div>
          <div style={{color:"#34d399",fontWeight:800,fontSize:18}}>{score}</div>
        </div>
        <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>
            {lang==="zh"?"连胜":lang==="fr"?"Serie":"Streak"}
          </div>
          <div style={{color:"#f472b6",fontWeight:800,fontSize:18}}>🔥{streak}</div>
        </div>
        <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>
            {lang==="zh"?"目标":lang==="fr"?"Cible":"Target"}
          </div>
          <div style={{color:"#f6d365",fontWeight:900,fontSize:18}}>{jl.target}</div>
        </div>
      </div>

      {/* Target reminder */}
      <div style={{
        background:"rgba(246,211,101,0.1)",border:"2px solid #f6d365",
        borderRadius:16,padding:"8px 24px",marginBottom:16,textAlign:"center",
      }}>
        <div style={{color:"#f6d365",fontWeight:900,fontSize:22}}>
          {lang==="zh"?`目标 = ${jl.target} 🎯`:`${lang==="fr"?"Faire":"Make"}  ${jl.target}! 🎯`}
        </div>
      </div>

      {/* Cards — 3 cards in a row */}
      <div style={{display:"flex",gap:12,marginBottom:16,justifyContent:"center"}}>
        {cards.map((card,i)=>{
          const inPool=numbers.some(n=>n.sourceId===card.id);
          const red=card.suit==="♥"||card.suit==="♦";
          return (
            <div key={card.id} style={{
              width:86,minWidth:86,height:118,borderRadius:10,
              background:inPool?"white":"#1e293b",
              border:inPool?"3px solid #e2e8f0":"2px solid #334155",
              boxShadow:"0 4px 12px rgba(0,0,0,0.2)",
              display:"flex",flexDirection:"column",justifyContent:"space-between",
              padding:"5px 7px",opacity:inPool?1:0.35,
              transition:"all 0.2s",position:"relative",
              animation:`cardDeal 0.4s ease ${i*0.1}s both`,
            }}>
              {!inPool&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#475569"}}>✓</div>}
              <div style={{fontSize:13,fontWeight:700,color:red?"#e53e3e":"#1a202c",fontFamily:"Georgia,serif"}}>
                {card.val}<span style={{fontSize:11}}>{card.suit}</span>
              </div>
              <div style={{fontSize:20,textAlign:"center",color:red?"#e53e3e":"#1a202c"}}>{card.suit}</div>
              <div style={{fontSize:13,fontWeight:700,color:red?"#e53e3e":"#1a202c",textAlign:"right",transform:"rotate(180deg)",fontFamily:"Georgia,serif"}}>
                {card.val}<span style={{fontSize:11}}>{card.suit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Number pool */}
      <div style={{marginBottom:14,textAlign:"center"}}>
        <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
          {lang==="zh"?"可用数字":lang==="fr"?"Nombres disponibles":"Available Numbers"}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {numbers.map((n,i)=>{
            const isTutTarget = jrTutStep>=0
              && jrTutStep<jrTutSteps.length
              && jrTutSteps[jrTutStep].type==="number"
              && n.label===jrTutSteps[jrTutStep].target;
            return (
              <div key={i} onClick={()=>handleNumberClick(i)} style={{
                width:62,height:62,borderRadius:14,
                background:selectedIdx===i?"#fef3c7":isTutTarget?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.08)",
                border:`3px solid ${selectedIdx===i?"#f59e0b":isTutTarget?"#34d399":"rgba(255,255,255,0.2)"}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,fontWeight:900,
                color:selectedIdx===i?"#92400e":isTutTarget?"#34d399":"white",
                cursor:turnOver?"default":"pointer",
                transform:selectedIdx===i?"scale(1.15)":isTutTarget?"scale(1.12)":"scale(1)",
                transition:"all 0.15s",
                boxShadow:selectedIdx===i?"0 4px 16px rgba(245,158,11,0.4)":isTutTarget?"0 0 0 3px rgba(52,211,153,0.3), 0 4px 16px rgba(52,211,153,0.2)":"none",
                animation:"popIn 0.3s ease",
              }}>{n.label}</div>
            );
          })}
        </div>
      </div>

      {/* Tutorial bubble */}
      {jrTutStep>=0&&jrTutStep<jrTutSteps.length&&(
        <div style={{
          background:"linear-gradient(135deg,#0a3d2b,#052e1c)",
          border:"2px solid #34d399",borderRadius:16,
          padding:"12px 20px",marginBottom:12,
          textAlign:"center",maxWidth:320,width:"100%",
          animation:"popIn 0.3s ease",
          boxShadow:"0 0 0 4px rgba(52,211,153,0.15)",
        }}>
          <div style={{fontSize:14,color:"white",fontWeight:700,lineHeight:1.6}}>
            {lang==="zh"?jrTutSteps[jrTutStep].bubbleZh:lang==="fr"?(jrTutSteps[jrTutStep].bubbleFr||jrTutSteps[jrTutStep].bubble):jrTutSteps[jrTutStep].bubble}
          </div>
          <div style={{marginTop:8,display:"flex",gap:4,justifyContent:"center"}}>
            {jrTutSteps.map((_,i)=>(
              <div key={i} style={{
                width:7,height:7,borderRadius:"50%",
                background:i<jrTutStep?"#34d399":i===jrTutStep?"#f6d365":"rgba(255,255,255,0.15)",
                transition:"all 0.3s",
              }}/>
            ))}
          </div>
          <button onClick={()=>{saveJrTutorialDone(level);setJrTutStep(-1);dealJuniorCards();}} style={{
            marginTop:10,background:"transparent",border:"1px solid rgba(52,211,153,0.3)",
            borderRadius:8,padding:"4px 12px",color:"#64748b",fontSize:11,cursor:"pointer",
          }}>{lang==="zh"?"跳过教程":lang==="fr"?"Passer le tutoriel":"Skip tutorial"}</button>
        </div>
      )}

      {/* Operators */}
      {!turnOver&&(
        <div style={{display:"flex",gap:10,marginBottom:14,justifyContent:"center"}}>
          {jl.ops.map(op=>{
            const isTutOp = jrTutStep>=0
              && jrTutStep<jrTutSteps.length
              && jrTutSteps[jrTutStep].type==="op"
              && op===jrTutSteps[jrTutStep].target;
            return (
              <div key={op} style={{
                filter:isTutOp?"drop-shadow(0 0 8px rgba(52,211,153,0.9))":"none",
                transform:isTutOp?"scale(1.18)":"scale(1)",
                transition:"all 0.2s",
              }}>
                <button onClick={()=>{
                  if (jrTutStep>=0) {
                    const step=jrTutSteps[jrTutStep];
                    if (step.type!=="op") return;
                    if (op!==step.target) {
                      setMessage({text:lang==="zh"?`👆 点击  ${step.target}  ！`:`👆 ${lang==="fr"?"Appuyez":"Tap"}  ${step.target}  !`,type:"bad"});
                      return;
                    }
                    setOperator(op);
                    setMessage({text:"",type:""});
                    setJrTutStep(s=>s+1);
                    return;
                  }
                  if (selectedIdx!==null) setOperator(o=>o===op?null:op);
                }} style={{
                  width:52,height:52,borderRadius:"50%",
                  border:`2px solid ${operator===op?"#f59e0b":isTutOp?"#34d399":"#334155"}`,
                  background:operator===op?"#fef3c7":isTutOp?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.05)",
                  fontSize:22,fontWeight:800,cursor:"pointer",
                  color:operator===op?"#92400e":isTutOp?"#34d399":"#94a3b8",
                  transform:operator===op?"scale(1.18)":"scale(1)",
                  transition:"all 0.15s",
                  boxShadow:operator===op?"0 4px 12px rgba(245,158,11,0.4)":"none",
                }}>{op}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Steps */}
      {steps.length>0&&(
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:12,padding:"10px 16px",marginBottom:12,width:"100%",maxWidth:320}}>
          {steps.map((s,i)=>(
            <div key={i} style={{color:"#94a3b8",fontSize:13,marginBottom:3}}>
              <span style={{color:"#475569",marginRight:6}}>{lang==="zh"?`第${i+1}步：`:`${lang==="fr"?"Etape":"Step"} ${i+1}:`}</span>{s.expr}
            </div>
          ))}
        </div>
      )}

      {/* Message */}
      {message.text&&(
        <div style={{
          background:`${msgColor}18`,border:`1px solid ${msgColor}`,
          borderRadius:12,padding:"10px 20px",marginBottom:12,
          color:msgColor,fontSize:16,fontWeight:700,textAlign:"center",
          animation:"popIn 0.3s ease",
        }}>{message.text}</div>
      )}

      {/* Instruction */}
      {!turnOver&&selectedIdx===null&&(
        <div style={{color:"#334155",fontSize:12,textAlign:"center",marginBottom:10}}>
          {lang==="zh"?"点击数字 → 选择运算符 → 点击另一个数字":lang==="fr"?"Appuyez nombre → operateur → nombre":"Tap a number → tap an operator → tap another number"}
        </div>
      )}

      {/* Hint display */}
      {jrHint&&(
        <div style={{
          background:"rgba(167,139,250,0.12)",border:"2px solid #a78bfa",
          borderRadius:14,padding:"12px 18px",marginBottom:12,
          textAlign:"center",maxWidth:320,width:"100%",
          animation:"popIn 0.3s ease",
        }}>
          <div style={{color:"#c4b5fd",fontWeight:700,fontSize:12,marginBottom:6}}>
            💡 {lang==="zh"?"答案提示：":lang==="fr"?"Voici comment :":"Here's how:"}
          </div>
          <div style={{color:"white",fontWeight:800,fontSize:14,lineHeight:1.6}}>
            {jrHint}
          </div>
        </div>
      )}

      {/* Buttons */}
      {!turnOver?(
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button onClick={handleReset} style={{
            background:"transparent",border:"2px solid #64748b",
            borderRadius:10,padding:"8px 18px",color:"#64748b",
            fontSize:13,fontWeight:700,cursor:"pointer",
          }}>↺ {lang==="zh"?"重置":lang==="fr"?"Reinitialiser":"Reset"}</button>
          <button onClick={handleJrHint} style={{
            background:"rgba(167,139,250,0.1)",border:"2px solid #a78bfa",
            borderRadius:10,padding:"8px 18px",color:"#a78bfa",
            fontSize:13,fontWeight:700,cursor:"pointer",
          }}>💡 {lang==="zh"?"帮帮我！":lang==="fr"?"Aide !":"Help!"}</button>
        </div>
      ):(
        <button onClick={handleNext} style={{
          background:"linear-gradient(135deg,#34d399,#059669)",
          border:"none",borderRadius:12,padding:"14px 28px",
          color:"white",fontSize:15,fontWeight:800,cursor:"pointer",
          boxShadow:"0 4px 20px rgba(52,211,153,0.4)",
          animation:"popIn 0.4s ease",
        }}>
          {round>=rounds
            ?(lang==="zh"?"🏆 查看结果":"🏆 See Results")
            :(lang==="zh"?"下一题 ▶":"Next Puzzle ▶")}
        </button>
      )}
    </div>
  );

  // End screen
  const earnedJrBadges = JUNIOR_BADGES.filter(b=>juniorBadges.includes(b.id));

  async function handleJrShare() {
    setJrSharing(true);
    try {
      await new Promise((resolve, reject) => {
        if (window.html2canvas) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      const canvas = await window.html2canvas(jrShareCardRef.current, {
        backgroundColor: null, scale: 2, logging: false,
      });
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'game24-junior-score.png', {type:'image/png'});
        if (navigator.share && navigator.canShare && navigator.canShare({files:[file]})) {
          await navigator.share({
            title: lang==="zh"?"看看我的成绩！":"Look what I did!",
            text: lang==="zh"?`我在24点儿童模式得了${score}分！`:`I scored ${score} pts in Game24 Junior Mode!`,
            url: 'https://game24-taupe.vercel.app',
            files: [file],
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'game24-junior-score.png'; a.click();
          URL.revokeObjectURL(url);
        }
        setJrSharing(false);
      }, 'image/png');
    } catch(e) { console.error(e); setJrSharing(false); }
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0d2137,#0a3d2b,#0d2137)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:24}}>
      <style>{`@keyframes trophy{0%,100%{transform:scale(1) rotate(-5deg)}50%{transform:scale(1.1) rotate(5deg)}}`}</style>
      <div style={{fontSize:64,animation:"trophy 1.5s ease infinite",marginBottom:8}}>🏆</div>
      <h2 style={{color:"#34d399",fontSize:28,fontWeight:900,margin:"0 0 4px"}}>
        {lang==="zh"?"太棒了！":"Amazing job!"}
      </h2>
      <p style={{color:"#64748b",fontSize:14,marginBottom:20}}>{name} · {level}</p>

      <div style={{background:"rgba(52,211,153,0.08)",border:"1px solid #34d399",
        borderRadius:16,padding:20,marginBottom:20,textAlign:"center",width:"100%",maxWidth:300}}>
        <div style={{display:"flex",gap:20,justifyContent:"center"}}>
          <div>
            <div style={{color:"#34d399",fontWeight:900,fontSize:36}}>{score}</div>
            <div style={{color:"#64748b",fontSize:12}}>{lang==="zh"?"分数":"Score"}</div>
          </div>
          <div>
            <div style={{color:"#f472b6",fontWeight:900,fontSize:36}}>🔥{streak}</div>
            <div style={{color:"#64748b",fontSize:12}}>{lang==="zh"?"连胜":lang==="fr"?"Serie":"Streak"}</div>
          </div>
          <div>
            <div style={{color:"#f6d365",fontWeight:900,fontSize:36}}>{solvedRounds}</div>
            <div style={{color:"#64748b",fontSize:12}}>{lang==="zh"?"答对":"Solved"}</div>
          </div>
        </div>
      </div>

      {/* Badges earned */}
      {earnedJrBadges.length>0&&(
        <div style={{marginBottom:16,textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:11,marginBottom:8}}>
            {lang==="zh"?"已获得成就":"Badges Earned"}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {earnedJrBadges.map(b=>(
              <div key={b.id} style={{fontSize:24}}>{b.icon}</div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden share card */}
      <div ref={jrShareCardRef} style={{
        position:"fixed",left:"-9999px",top:0,
        width:380,background:"linear-gradient(135deg,#0d2137,#0a3d2b)",
        borderRadius:24,padding:28,fontFamily:"'Trebuchet MS',sans-serif",
        border:"2px solid rgba(52,211,153,0.5)",
      }}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:6}}>🌟</div>
          <div style={{fontSize:28,fontWeight:900,color:"#34d399",letterSpacing:-1}}>
            {"Game 24 | 24点"}
          </div>
          <div style={{color:"#64748b",fontSize:12,marginTop:2}}>
            {lang==="zh"?"儿童模式":lang==="fr"?"Mode Junior":"Junior Mode"} · {level}
          </div>
        </div>

        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(52,211,153,0.5),transparent)",marginBottom:20}}/>

        {/* Big score */}
        <div style={{
          background:"linear-gradient(135deg,rgba(52,211,153,0.15),rgba(52,211,153,0.05))",
          borderRadius:16,padding:"20px 16px",marginBottom:16,
          border:"1px solid rgba(52,211,153,0.3)",textAlign:"center",
        }}>
          <div style={{color:"white",fontWeight:900,fontSize:20,marginBottom:12}}>
            👤 {name}
          </div>
          <div style={{color:"#34d399",fontWeight:900,fontSize:64,lineHeight:1,marginBottom:4}}>
            {score}
          </div>
          <div style={{color:"#64748b",fontSize:13,marginBottom:12}}>
            {lang==="zh"?"分数":"points"}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
              <div style={{color:"#f472b6",fontWeight:900,fontSize:20}}>🔥{streak}</div>
              <div style={{color:"#64748b",fontSize:10}}>{lang==="zh"?"连胜":lang==="fr"?"Serie":"Streak"}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
              <div style={{color:"#f6d365",fontWeight:900,fontSize:20}}>{solvedRounds}/{rounds}</div>
              <div style={{color:"#64748b",fontSize:10}}>{lang==="zh"?"答对":"Solved"}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
              <div style={{color:"#34d399",fontWeight:900,fontSize:16,marginTop:4}}>{level}</div>
              <div style={{color:"#64748b",fontSize:10}}>{lang==="zh"?"等级":lang==="fr"?"Niveau":"Level"}</div>
            </div>
          </div>
        </div>

        {/* Badges */}
        {earnedJrBadges.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
              {lang==="zh"?"成就徽章":"Badges Earned"}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {earnedJrBadges.map(b=>(
                <div key={b.id} style={{
                  background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",
                  borderRadius:8,padding:"4px 8px",fontSize:12,color:"#34d399",
                }}>{b.icon} {lang==="zh"?b.zh:lang==="fr"?(b.fr||b.en):b.en}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(52,211,153,0.5),transparent)",marginBottom:16}}/>

        {/* Kid-friendly CTA */}
        <div style={{
          background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.3)",
          borderRadius:12,padding:"12px 16px",marginBottom:12,textAlign:"center",
        }}>
          <div style={{color:"#34d399",fontWeight:900,fontSize:15,marginBottom:4}}>
            {lang==="zh"?"🌟 看看我做到了！":"🌟 Look what I did!"}
          </div>
          <div style={{color:"#94a3b8",fontSize:12}}>
            {lang==="zh"?"你也来试试吧！":"Come play with me!"}
          </div>
        </div>

        <div style={{textAlign:"center"}}>
          <div style={{color:"#34d399",fontWeight:700,fontSize:13}}>
            🃏 game24-taupe.vercel.app
          </div>
          <div style={{color:"#334155",fontSize:10,marginTop:2}}>
            {lang==="zh"?"免费畅玩，无需下载":"Free to play · No download needed"}
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:10}}>
        <button onClick={()=>{setScreen("setup");setScore(0);setStreak(0);setRound(1);setSolvedRounds(0);}} style={{
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:12,padding:"12px 20px",color:"#94a3b8",fontSize:14,fontWeight:800,cursor:"pointer",
        }}>{lang==="zh"?"再玩一次":lang==="fr"?"Rejouer":"Play Again"}</button>
        <button onClick={onBack} style={{
          background:"linear-gradient(135deg,#34d399,#059669)",
          border:"none",borderRadius:12,padding:"12px 20px",
          color:"white",fontSize:14,fontWeight:800,cursor:"pointer",
        }}>{lang==="zh"?"返回主菜单":lang==="fr"?"Menu principal":"Main Menu"}</button>
      </div>

      {/* Share button */}
      <button onClick={handleJrShare} disabled={jrSharing} style={{
        background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",
        border:"none",borderRadius:12,padding:"12px 28px",
        color:"white",fontSize:14,fontWeight:800,cursor:jrSharing?"not-allowed":"pointer",
        opacity:jrSharing?0.7:1,
        boxShadow:"0 4px 20px rgba(59,130,246,0.35)",
      }}>
        {jrSharing?(lang==="zh"?"生成中...":lang==="fr"?"Generation...":"Generating..."):(lang==="zh"?"📤 分享成绩":"📤 Share Score")}
      </button>
    </div>
  );
}

// ── Help Modal (tabbed: How to Play | Demo) ───────────────────────────────
function HelpModal({lang, setLang, onClose, onReplayTutorial}) {
  const [tab, setTab] = useState("howto"); // "howto" | "demo"
  const t = T[lang];

  // Static demo steps showing 1×2×3×4=24
  const demoSteps = [
    { en:"Tap  1  to select it",        zh:"点击数字  1  选中它",          numbers:["1","2","3","4"], selected:"1", op:null,  result:null },
    { en:"Tap  ×  to choose multiply",  zh:"点击  ×  选择乘法",            numbers:["1","2","3","4"], selected:"1", op:"×",   result:null },
    { en:"Tap  2  →  1×2 = 2",          zh:"点击  2  →  1×2 = 2",         numbers:["1","2","3","4"], selected:"1", op:"×",   result:"1×2=2" },
    { en:"Tap  2  (the result)",         zh:"点击结果  2",                   numbers:["2","3","4"],     selected:"2", op:null,  result:null },
    { en:"Tap  ×  again",               zh:"再次点击  ×",                   numbers:["2","3","4"],     selected:"2", op:"×",   result:null },
    { en:"Tap  3  →  2×3 = 6",          zh:"点击  3  →  2×3 = 6",         numbers:["2","3","4"],     selected:"2", op:"×",   result:"2×3=6" },
    { en:"Tap  6  (the result)",         zh:"点击结果  6",                   numbers:["6","4"],         selected:"6", op:null,  result:null },
    { en:"Tap  ×  one more time",       zh:"最后一次点击  ×",               numbers:["6","4"],         selected:"6", op:"×",   result:null },
    { en:"Tap  4  →  6×4 = 24  🎉",     zh:"点击  4  →  6×4 = 24  🎉",   numbers:["6","4"],         selected:"6", op:"×",   result:"6×4=24 🎉" },
  ];

  const [demoIdx, setDemoIdx] = useState(0);
  const ds = demoSteps[demoIdx];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
      <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",
        border:"1px solid rgba(255,255,255,0.15)",borderRadius:24,padding:24,
        maxWidth:380,width:"100%",maxHeight:"88vh",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{marginBottom:10}}><LangSwitcher lang={lang} setLang={setLang}/></div>
          <div style={{fontSize:36,marginBottom:4}}>🃏</div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:16,background:"rgba(255,255,255,0.05)",
          borderRadius:12,padding:4}}>
          {[{id:"howto",label:lang==="zh"?"📖 游戏说明":"📖 How to Play"},
            {id:"demo", label:lang==="zh"?"🎮 演示":"🎮 Demo"}].map(tb=>(
            <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
              flex:1,padding:"8px",borderRadius:10,border:"none",
              background:tab===tb.id?"linear-gradient(135deg,#334155,#1e293b)":"transparent",
              color:tab===tb.id?"white":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",
              transition:"all 0.2s",
            }}>{tb.label}</button>
          ))}
        </div>

        {/* How to Play tab */}
        {tab==="howto"&&(
          <div style={{overflowY:"auto",flex:1,marginBottom:14}}>
            {t.howToPlayLines.map((line,i)=>(
              <div key={i} style={{color:"#cbd5e1",fontSize:13,marginBottom:8,
                padding:"8px 12px",background:"rgba(255,255,255,0.04)",
                borderRadius:8,lineHeight:1.5}}>{line}</div>
            ))}
          </div>
        )}

        {/* Demo tab */}
        {tab==="demo"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column"}}>
            {/* Step instruction */}
            <div style={{background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.3)",
              borderRadius:12,padding:"10px 14px",marginBottom:12,textAlign:"center"}}>
              <div style={{color:"#93c5fd",fontWeight:700,fontSize:13}}>
                {lang==="zh"?`第${demoIdx+1}步 / 共9步`:`Step ${demoIdx+1} of 9`}
              </div>
              <div style={{color:"white",fontWeight:800,fontSize:15,marginTop:4}}>
                {lang==="zh"?ds.zh:ds.en}
              </div>
              {ds.result&&(
                <div style={{color:"#34d399",fontWeight:900,fontSize:16,marginTop:6,
                  background:"rgba(52,211,153,0.1)",borderRadius:8,padding:"4px 10px",
                  display:"inline-block"}}>
                  ✓ {ds.result}
                </div>
              )}
            </div>

            {/* Mini number pool visual */}
            <div style={{marginBottom:12,textAlign:"center"}}>
              <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
                {lang==="zh"?"可用数字":lang==="fr"?"Nombres disponibles":"Available Numbers"}
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                {ds.numbers.map((n,i)=>{
                  const isSel = n===ds.selected;
                  return (
                    <div key={i} style={{
                      width:46,height:46,borderRadius:10,
                      background:isSel?"#fef3c7":"rgba(255,255,255,0.08)",
                      border:`2px solid ${isSel?"#f59e0b":"rgba(255,255,255,0.15)"}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:16,fontWeight:900,
                      color:isSel?"#92400e":"white",
                      transform:isSel?"scale(1.12)":"scale(1)",
                      boxShadow:isSel?"0 4px 12px rgba(245,158,11,0.4)":"none",
                    }}>{n}</div>
                  );
                })}
              </div>
            </div>

            {/* Mini operator row */}
            <div style={{marginBottom:12,textAlign:"center"}}>
              <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
                {lang==="zh"?"运算符":"Operators"}
              </div>
              <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                {["+","−","×","÷"].map(op=>{
                  const isActive = op===ds.op;
                  return (
                    <div key={op} style={{
                      width:38,height:38,borderRadius:"50%",
                      border:`2px solid ${isActive?"#f59e0b":"#334155"}`,
                      background:isActive?"#fef3c7":"rgba(255,255,255,0.05)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:16,fontWeight:800,
                      color:isActive?"#92400e":"#94a3b8",
                      transform:isActive?"scale(1.18)":"scale(1)",
                      boxShadow:isActive?"0 4px 12px rgba(245,158,11,0.4)":"none",
                      filter:isActive?"drop-shadow(0 0 6px rgba(245,158,11,0.6))":"none",
                    }}>{op}</div>
                  );
                })}
              </div>
            </div>

            {/* Progress dots */}
            <div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:12}}>
              {demoSteps.map((_,i)=>(
                <div key={i} style={{
                  width:6,height:6,borderRadius:"50%",cursor:"pointer",
                  background:i<demoIdx?"#34d399":i===demoIdx?"#60a5fa":"rgba(255,255,255,0.15)",
                  transition:"all 0.3s",
                }} onClick={()=>setDemoIdx(i)}/>
              ))}
            </div>

            {/* Prev / Next */}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setDemoIdx(i=>Math.max(0,i-1))} disabled={demoIdx===0} style={{
                flex:1,padding:"10px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.04)",color:demoIdx===0?"#1e293b":"#94a3b8",
                fontWeight:700,fontSize:13,cursor:demoIdx===0?"not-allowed":"pointer",
              }}>◀ {lang==="zh"?"上一步":"Prev"}</button>
              {demoIdx<demoSteps.length-1?(
                <button onClick={()=>setDemoIdx(i=>i+1)} style={{
                  flex:1,padding:"10px",borderRadius:10,border:"none",
                  background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",
                  color:"white",fontWeight:700,fontSize:13,cursor:"pointer",
                }}>{lang==="zh"?"下一步":"Next"} ▶</button>
              ):(
                <button onClick={()=>{setDemoIdx(0);onReplayTutorial();}} style={{
                  flex:1,padding:"10px",borderRadius:10,border:"none",
                  background:"linear-gradient(135deg,#34d399,#059669)",
                  color:"white",fontWeight:700,fontSize:13,cursor:"pointer",
                }}>▶ {lang==="zh"?"亲自试试！":"Try it live!"}</button>
              )}
            </div>
          </div>
        )}

        {/* Close button */}
        <button onClick={onClose} style={{
          width:"100%",padding:"13px",borderRadius:12,border:"none",marginTop:12,
          background:"linear-gradient(135deg,#f6d365,#fda085)",
          color:"#1a1a2e",fontSize:15,fontWeight:800,cursor:"pointer",
        }}>{t.gotIt}</button>
      </div>
    </div>
  );
}

// ── Battle Abilities ──────────────────────────────────────────────────────
const ABILITIES = [
  { id:"hint",   icon:"💡", en:"Hint",        zh:"提示",     fr:"Indice",       desc:"Shows your next step",        descZh:"显示下一步",      descFr:"Montre la prochaine etape" },
  { id:"double", icon:"💥", en:"Double Dmg",  zh:"双倍伤害", fr:"Double Degats",desc:"Next solve steals 2 lives",   descZh:"下次解题夺2命",   descFr:"Vole 2 vies au prochain solve" },
  { id:"hack",   icon:"👾", en:"Hack",         zh:"黑客",     fr:"Piratage",     desc:"Disrupts robot for 4s",      descZh:"干扰机器人4秒",   descFr:"Perturbe le robot 4 secondes" },
  { id:"cancel", icon:"✂️", en:"Cancel Op",   zh:"取消运算", fr:"Annuler Op",   desc:"Removes one operator",        descZh:"取消一个运算符", descFr:"Supprime un operateur" },
  { id:"switch", icon:"🔄", en:"Switch",       zh:"交换",     fr:"Echange",      desc:"Resets robot progress",      descZh:"重置机器人进度",  descFr:"Reinitialise le robot" },
  { id:"shield", icon:"🛡️", en:"Shield",      zh:"护盾",     fr:"Bouclier",     desc:"Block next life loss",       descZh:"格挡下次失命",   descFr:"Bloque la prochaine perte" },
];

function pickAbilities() {
  const arr = [...ABILITIES].sort(()=>Math.random()-0.5);
  return arr.slice(0,2);
}

// ── Battle Mode Screen ─────────────────────────────────────────────────────
function BattleScreen({ lang, setLang, onBack }) {
  const t = T[lang];
  const ALL_OPS = ["+","−","×","÷","^","√"];
  const BLIVES = 3;

  const [phase, setPhase] = useState("setup");
  const [robotDiff, setRobotDiff] = useState("Medium");
  const [playerName, setPlayerName] = useState("Player");
  const [playerLives, setPlayerLives] = useState(BLIVES);
  const [robotLives, setRobotLives] = useState(BLIVES);
  const [playerLivesLost, setPlayerLivesLost] = useState(0);
  const [roundWinner, setRoundWinner] = useState(null);
  const [matchWinner, setMatchWinner] = useState(null);
  const [roundNum, setRoundNum] = useState(1);
  const [countdown, setCountdown] = useState(3);
  const [showConfetti, setShowConfetti] = useState(false);

  // Abilities
  const [abilities, setAbilities] = useState([]);
  const [abilityAnim, setAbilityAnim] = useState(null); // {icon, text}
  const [hackActive, setHackActive] = useState(false);
  const [cancelledOp, setCancelledOp] = useState(null);
  const [hintText, setHintText] = useState(null);
  const [doubleDmg, setDoubleDmg] = useState(false);
  const [shield, setShield] = useState(false);
  const [robotDoubleDmg, setRobotDoubleDmg] = useState(false);
  const hackPenaltyRef = useRef(0);
  const robotElapsedRef = useRef(0);

  // 3D effect states
  const [robotState, setRobotState] = useState("idle");
  const [playerHit, setPlayerHit] = useState(false);
  const [robotHit, setRobotHit] = useState(false);
  const [cardFlip, setCardFlip] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  // Puzzle
  const [cards, setCards] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [operator, setOperator] = useState(null);
  const [steps, setSteps] = useState([]);
  const [message, setMessage] = useState({text:"",type:""});
  const [timeLeft, setTimeLeft] = useState(60);
  const [robotSolved, setRobotSolved] = useState(false);
  const [robotSolution, setRobotSolution] = useState(null);

  // Badges
  const [battleBadges, setBattleBadges] = useState(()=>loadBattleBadges());
  const [newBattleBadges, setNewBattleBadges] = useState([]);

  const timerRef = useRef(null);
  const robotRef = useRef(null);
  const roundEndRef = useRef(false);
  const msgColor = {win:"#34d399",bad:"#ef4444",step:"#f6d365","":"#94a3b8"}[message.type]||"#94a3b8";
  const rs = ROBOT_SPEED[robotDiff];

  function flashAbility(icon, text) {
    setAbilityAnim({icon, text});
    setTimeout(()=>setAbilityAnim(null), 1600);
  }

  function useAbility(ab) {

    setAbilities(prev=>prev.filter(a=>a.id!==ab.id));
    if (ab.id==="hint") {
      const steps = getHintSteps(numbers);
      if (steps&&steps.length>0) { setHintText(steps[0].expr); setTimeout(()=>setHintText(null),5000); }
      flashAbility("💡", lang==="zh"?"提示已激活！":lang==="fr"?"Indice active !":"Hint activated!");
    } else if (ab.id==="double") {
      setDoubleDmg(true);
      flashAbility("💥", lang==="zh"?"双倍伤害！":lang==="fr"?"Double degats !":"Double damage!");
    } else if (ab.id==="hack") {
      hackPenaltyRef.current += 4;
      setHackActive(true);
      setRobotState("hack");
      setTimeout(()=>{setHackActive(false);setRobotState("thinking");}, 4000);
      flashAbility("👾", lang==="zh"?"黑客攻击！":lang==="fr"?"Piratage du robot !":"Hacking robot!");
    } else if (ab.id==="cancel") {
      const removable = ALL_OPS.filter(op=>op!=="+"&&op!==cancelledOp);
      if (removable.length>0) {
        const picked = removable[Math.floor(Math.random()*removable.length)];
        setCancelledOp(picked);
        flashAbility("✂️", (lang==="zh"?"已取消运算符 ":lang==="fr"?"Operateur annule ":"Cancelled operator ")+picked);
      }
    } else if (ab.id==="switch") {
      hackPenaltyRef.current += 4; robotElapsedRef.current = 0;
      flashAbility("🔄", lang==="zh"?"机器人进度已重置！":lang==="fr"?"Robot reinitialise !":"Robot reset!");
    } else if (ab.id==="shield") {
      setShield(true);
      flashAbility("🛡️", lang==="zh"?"护盾已激活！":lang==="fr"?"Bouclier actif !":"Shield up!");
    }
  }

  function dealCards() {
    const deck=[];
    for (const s of SUITS) for (const v of VALUES.filter(v=>v<=10)) deck.push({suit:s,val:v,id:s+v});
    let drawn, tries=0;
    do { deck.sort(()=>Math.random()-0.5); drawn=deck.slice(0,4); tries++; if(tries>100)break; } while(!hasSolution(drawn));
    return drawn;
  }

  function startRound() {
    roundEndRef.current=false; hackPenaltyRef.current=0; robotElapsedRef.current=0;
    const nc=dealCards();
    setCards(nc); setNumbers(nc.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
    setSelectedIdx(null); setOperator(null); setSteps([]); setMessage({text:"",type:""});
    setTimeLeft(60); setRobotSolved(false); setRobotSolution(null); setRoundWinner(null);
    setCancelledOp(null); setHintText(null); setHackActive(false);
    // Robot double damage chance scales with difficulty
    const ddChance={Easy:0.15,Medium:0.25,Hard:0.40}[robotDiff]||0.25;
    setRobotDoubleDmg(Math.random()<ddChance);
    setAbilities(pickAbilities());
    // Trigger card flip animation
    setCardFlip(false);
    setTimeout(()=>setCardFlip(true), 50);
    setRobotState("thinking");
    setPlayerHit(false); setRobotHit(false);
    setPhase("playing");
  }

  function startCountdown() { setPhase("countdown"); setCountdown(3); }

  useEffect(()=>{
    if(phase!=="countdown") return;
    if(countdown<=0){startRound();return;}
    const t=setTimeout(()=>setCountdown(c=>c-1),1000);
    return()=>clearTimeout(t);
  },[phase,countdown]);

  useEffect(()=>{
    if(phase!=="playing"||roundEndRef.current) return;
    const {minThinkTime,solveChance}=ROBOT_SPEED[robotDiff];
    robotElapsedRef.current=0;
    robotRef.current=setInterval(()=>{
      if(roundEndRef.current){clearInterval(robotRef.current);return;}
      robotElapsedRef.current+=1;
      if(robotElapsedRef.current<minThinkTime+hackPenaltyRef.current) return;
      if(Math.random()<solveChance){clearInterval(robotRef.current);doRobotSolve();}
    },1000);
    return()=>clearInterval(robotRef.current);
  },[phase,robotDiff,roundNum]);

  useEffect(()=>{
    if(phase!=="playing") return;
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){clearInterval(timerRef.current);if(!roundEndRef.current)endRound("timeout");return 0;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[phase,roundNum]);

  function endRound(winner) {
    if(roundEndRef.current) return;
    roundEndRef.current=true;
    clearInterval(timerRef.current); clearInterval(robotRef.current);
    setRoundWinner(winner);
    let pl=playerLives, rl=robotLives, pll=playerLivesLost;
    const dmg=doubleDmg&&winner==="player"?2:1;
    const robotDmg=robotDoubleDmg&&winner==="robot"?2:1;
    // Trigger hit animations
    if(winner==="player"){
      setRobotHit(true); setTimeout(()=>{setRobotHit(false);setRobotState(pl<=1?"explode":"hit");setTimeout(()=>setRobotState("idle"),600);},100);
      setScreenShake(true); setTimeout(()=>setScreenShake(false),400);
    }
    if(winner==="robot"||winner==="timeout"){
      setPlayerHit(true); setTimeout(()=>setPlayerHit(false),600);
      setScreenShake(true); setTimeout(()=>setScreenShake(false),400);
      setRobotState("solved");
    }
    if(winner==="robot"||winner==="timeout") {
      if(shield){setShield(false);}
      else{pl=Math.max(0,playerLives-robotDmg);pll=playerLivesLost+robotDmg;setPlayerLives(pl);setPlayerLivesLost(pll);}
    }
    if(winner==="player"){rl=Math.max(0,robotLives-dmg);setRobotLives(rl);if(doubleDmg)setDoubleDmg(false);}
    if(winner==="timeout"){rl=Math.max(0,robotLives-1);setRobotLives(rl);}
    if(pl<=0||rl<=0){
      const mw=pl<=0?"robot":"player"; setMatchWinner(mw);
      if(mw==="player"){
        setShowConfetti(true); setTimeout(()=>setShowConfetti(false),3000);
        const tw=loadBattleWins()+1; saveBattleWins(tw);
        const earned=checkBattleBadges(battleBadges,{won:true,playerLivesLost:pll,robotDifficulty:robotDiff,totalWins:tw});
        const fe=pl===1?earned:earned.filter(b=>b!=="battle_comeback");
        if(fe.length>0){const all=[...battleBadges,...fe];setBattleBadges(all);saveBattleBadges(all);setNewBattleBadges(fe);setTimeout(()=>setNewBattleBadges([]),4000);}
      }
      setTimeout(()=>setPhase("matchEnd"),1600);
    } else {
      // No pause — start next round countdown immediately
      setTimeout(()=>{setRoundNum(r=>r+1);startCountdown();},1800);
    }
  }

  function doRobotSolve() {
    const orig=cards.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id}));
    setRobotSolution(getHintSteps(orig)); setRobotSolved(true);
    setRobotState("solved");
    endRound("robot");
  }

  function handleNumberClick(idx) {
    if(phase!=="playing"||roundEndRef.current) return;
    if(selectedIdx===null){setSelectedIdx(idx);setOperator(null);setMessage({text:"",type:""});}
    else if(selectedIdx===idx){setSelectedIdx(null);setOperator(null);}
    else if(operator==="√"){doSqrt(selectedIdx);}
    else if(operator!==null){doOp(selectedIdx,operator,idx);}
  }

  function doOp(iA,op,iB) {
    const a=numbers[iA].value,b=numbers[iB].value,la=numbers[iA].label,lb=numbers[iB].label;
    let r;
    if(op==="+")r=a+b; else if(op==="−")r=a-b; else if(op==="×")r=a*b;
    else if(op==="÷"){if(Math.abs(b)<1e-9){setMessage({text:t.cantDivideZero,type:"bad"});return;}r=a/b;}
    else if(op==="^")r=Math.pow(a,b);
    const expr=`${la} ${op} ${lb} = ${fmt(r)}`;
    const nn=numbers.filter((_,i)=>i!==iA&&i!==iB);
    nn.push({value:r,label:fmt(r),sourceId:`s${steps.length+1}`});
    setSteps(s=>[...s,{expr,r}]); setNumbers(nn); setSelectedIdx(null); setOperator(null);
    if(nn.length===1){if(Math.abs(r-24)<1e-9){endRound("player");}else setMessage({text:t.notTwentyFour(fmt(r)),type:"bad"});}
    else
    setMessage({text:`✓ ${expr}`,type:"step"});
  }

  function doSqrt(idx) {
    const a=numbers[idx].value;
    if(a<0){setMessage({text:lang==="zh"?"不能对负数开方！":lang==="fr"?"Impossible avec un negatif !":"Can't sqrt negative!",type:"bad"});setSelectedIdx(null);setOperator(null);return;}
    const r=Math.sqrt(a),expr=`√${fmt(a)} = ${fmt(r)}`;
    const nn=numbers.filter((_,i)=>i!==idx);
    nn.push({value:r,label:fmt(r),sourceId:`s${steps.length+1}`});
    setSteps(s=>[...s,{expr,r}]); setNumbers(nn); setSelectedIdx(null); setOperator(null);
    if(nn.length===1){if(Math.abs(r-24)<1e-9)endRound("player");else setMessage({text:t.notTwentyFour(fmt(r)),type:"bad"});}
    else
    setMessage({text:`✓ ${expr}`,type:"step"});
  }

  function doReset(){setNumbers(cards.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));setSelectedIdx(null);setOperator(null);setSteps([]);setMessage({text:"",type:""});}

  // ── SETUP ──
  if(phase==="setup") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a0505,#2d0a0a,#1a0505)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Trebuchet MS',sans-serif",padding:24}}>
      <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}} @keyframes popIn{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}} @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:52,marginBottom:8}}>⚔️</div>
        <h1 style={{fontSize:36,fontWeight:900,margin:"0 0 4px",background:"linear-gradient(90deg,#ef4444,#f97316,#ef4444)",backgroundSize:"200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 2s linear infinite"}}>{lang==="zh"?"对战模式":lang==="fr"?"Mode Combat":"Battle Mode"}</h1>
        <p style={{color:"#64748b",fontSize:13,margin:"0 0 8px",fontStyle:"italic"}}>{lang==="zh"?"「你的大脑就是你的武器」":lang==="fr"?"\"Ton cerveau est ton arme\"":"\"Your brain is your weapon\""}</p>
        <div style={{display:"flex",justifyContent:"center"}}>
          <LangSwitcher lang={lang} setLang={setLang}/>
        </div>
      </div>
      <div style={{width:"100%",maxWidth:360,animation:"fadeIn 0.4s ease"}}>
        <div style={{marginBottom:16}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>{lang==="zh"?"你的名字":lang==="fr"?"Votre nom":"Your Name"}</div>
          <input value={playerName} onChange={e=>setPlayerName(e.target.value||"Player")} placeholder="Player" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,color:"white",padding:"10px 14px",fontSize:15,width:"100%",boxSizing:"border-box",outline:"none"}}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>{lang==="zh"?"机器人难度":lang==="fr"?"Difficulte du robot":"Robot Difficulty"}</div>
          <div style={{display:"flex",gap:8}}>
            {Object.entries(ROBOT_SPEED).map(([key,val])=>(
              <button key={key} onClick={()=>setRobotDiff(key)} style={{flex:1,padding:"10px 6px",borderRadius:14,border:"none",background:robotDiff===key?`${val.color}22`:"rgba(255,255,255,0.05)",outline:robotDiff===key?`2px solid ${val.color}`:"2px solid transparent",color:robotDiff===key?val.color:"#64748b",fontWeight:800,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}>
                <div style={{fontSize:20,marginBottom:4}}>{key==="Easy"?"🐢":key==="Medium"?"🦊":"⚡"}</div>
                <div>{lang==="zh"?val.labelZh:lang==="fr"?(val.labelFr||val.label):val.label}</div>
                <div style={{fontSize:10,fontWeight:400,marginTop:2,color:"#64748b"}}>{lang==="zh"?val.descZh:lang==="fr"?(val.descFr||val.desc):val.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:16,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,padding:"10px 14px"}}>
          <div style={{color:"#ef4444",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>⚡ {lang==="zh"?"每轮随机获得2个技能":lang==="fr"?"2 capacites aleatoires par manche":"2 random abilities per round"}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {ABILITIES.map(ab=>(
              <div key={ab.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"4px 8px",display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:13}}>{ab.icon}</span>
                <span style={{color:"#cbd5e1",fontSize:11,fontWeight:700}}>{lang==="zh"?ab.zh:lang==="fr"?(ab.fr||ab.en):ab.en}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginBottom:16,background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:14,padding:"10px 14px"}}>
          {[{icon:"❤️",en:`${BLIVES} lives each — first to 0 loses`,zh:`各有${BLIVES}条命`,fr:`${BLIVES} vies — le premier a 0 perd`},{icon:"⚔️",en:"Solve 24 first → steal a life",zh:"先解出→夺命",fr:"Resoudre 24 en premier → voler une vie"},{icon:"⏱️",en:"60s — timeout = both lose 1",zh:"60秒超时双方各失1命",fr:"60s — temps ecoule = les deux perdent 1"}].map((r,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:i<2?6:0}}><div style={{fontSize:13}}>{r.icon}</div><div style={{color:"#94a3b8",fontSize:12}}>{lang==="zh"?r.zh:lang==="fr"?(r.fr||r.en):r.en}</div></div>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <div style={{color:"#64748b",fontSize:11,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>{lang==="zh"?"战斗勋章":lang==="fr"?"Trophees Combat":"Battle Badges"} ({battleBadges.length}/{BATTLE_BADGES.length})</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {BATTLE_BADGES.map(b=>(
              <div key={b.id} style={{background:battleBadges.includes(b.id)?"rgba(239,68,68,0.12)":"rgba(255,255,255,0.03)",border:`1px solid ${battleBadges.includes(b.id)?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.08)"}`,borderRadius:8,padding:"3px 7px",fontSize:11,color:battleBadges.includes(b.id)?"#fca5a5":"#334155"}}>{b.icon} {lang==="zh"?b.zh:lang==="fr"?(b.fr||b.en):b.en}</div>
            ))}
          </div>
        </div>
        <button onClick={startCountdown} style={{width:"100%",padding:"16px",borderRadius:16,border:"none",background:"linear-gradient(135deg,#ef4444,#b91c1c)",color:"white",fontSize:17,fontWeight:900,cursor:"pointer",boxShadow:"0 4px 24px rgba(239,68,68,0.4)",marginBottom:10,animation:"popIn 0.4s ease"}}>⚔️ {lang==="zh"?"开始对战！":lang==="fr"?"Commencer !":"Start Battle!"}</button>
        <button onClick={onBack} style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748b",fontSize:14,fontWeight:700,cursor:"pointer"}}>🏠 {lang==="zh"?"返回主页":lang==="fr"?"Menu principal":"Main Menu"}</button>
      </div>
    </div>
  );

  // ── COUNTDOWN ──
  if(phase==="countdown") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a0505,#2d0a0a,#1a0505)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Trebuchet MS',sans-serif"}}>
      <style>{`@keyframes bigPop{0%{transform:scale(2);opacity:0}60%{transform:scale(0.9)}100%{transform:scale(1);opacity:1}}`}</style>
      <div style={{fontSize:16,color:"#64748b",marginBottom:16,textTransform:"uppercase",letterSpacing:2}}>{lang==="zh"?"准备！":lang==="fr"?"Prets !":"Get ready!"}</div>
      <div key={countdown} style={{fontSize:110,fontWeight:900,color:"#ef4444",animation:"bigPop 0.6s ease",lineHeight:1}}>{countdown===0?"GO!":countdown}</div>
      <div style={{marginTop:20,color:"#475569",fontSize:13}}>{lang==="zh"?`对战 🤖 ${rs.labelZh}`:`vs 🤖 ${rs.label} Robot`} · {lang==="zh"?"第":lang==="fr"?"Manche ":"Round "}{roundNum}</div>
    </div>
  );

  // ── MATCH END ──
  if(phase==="matchEnd") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a0505,#2d0a0a,#1a0505)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Trebuchet MS',sans-serif",padding:24}}>
      <style>{`@keyframes trophy{0%,100%{transform:scale(1) rotate(-5deg)}50%{transform:scale(1.1) rotate(5deg)}} @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}} @keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}} @keyframes badgeSlide{0%{transform:translateX(120%);opacity:0}15%,85%{transform:translateX(0);opacity:1}100%{transform:translateX(120%);opacity:0}}`}</style>
      {showConfetti&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>{Array.from({length:50}).map((_,i)=>{const c=["#ef4444","#f97316","#f6d365","#34d399","#60a5fa","#a78bfa"];return <div key={i} style={{position:"absolute",top:"-20px",left:`${Math.random()*100}%`,width:6+Math.random()*8,height:6+Math.random()*8,background:c[i%c.length],borderRadius:Math.random()>0.5?"50%":"2px",animation:`confettiFall ${1.5+Math.random()}s ease-in ${Math.random()*0.8}s forwards`}}/>;})}</div>}
      {newBattleBadges.map((id,i)=>{const b=BATTLE_BADGES.find(x=>x.id===id);return b?<div key={id} style={{position:"fixed",top:`${70+i*70}px`,right:16,zIndex:1000,background:"linear-gradient(135deg,#1e293b,#0f172a)",border:"1px solid #ef4444",borderRadius:14,padding:"10px 16px",minWidth:200,animation:"badgeSlide 4s ease forwards",boxShadow:"0 4px 20px rgba(239,68,68,0.3)"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{fontSize:28}}>{b.icon}</div><div><div style={{color:"#ef4444",fontWeight:800,fontSize:13}}>{lang==="zh"?"战斗勋章！":lang==="fr"?"Trophee Combat !":"Battle Badge!"}</div><div style={{color:"white",fontWeight:700,fontSize:14}}>{lang==="zh"?b.zh:lang==="fr"?(b.fr||b.en):b.en}</div></div></div></div>:null;})}
      <div style={{fontSize:64,animation:"trophy 1.5s ease infinite",marginBottom:8}}>{matchWinner==="player"?"🏆":"💀"}</div>
      <h2 style={{fontSize:30,fontWeight:900,margin:"0 0 4px",background:matchWinner==="player"?"linear-gradient(90deg,#f6d365,#fda085,#f6d365)":"linear-gradient(90deg,#ef4444,#b91c1c,#ef4444)",backgroundSize:"200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 2s linear infinite"}}>{matchWinner==="player"?(lang==="zh"?"你赢了！🎉":lang==="fr"?"Vous gagnez ! 🎉":"You Win! 🎉"):(lang==="zh"?"机器人赢了！":lang==="fr"?"Le robot gagne !":"Robot Wins!")}</h2>
      <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>{lang==="zh"?`对战 🤖 ${rs.labelZh}`:`vs 🤖 ${rs.label} Robot`} · {lang==="zh"?"第":lang==="fr"?"Manche ":"Round "}{roundNum}</p>
      <div style={{display:"flex",gap:20,marginBottom:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"14px 22px"}}>
        <div style={{textAlign:"center"}}><div style={{color:"#f6d365",fontSize:12,fontWeight:700,marginBottom:5}}>{playerName}</div><div style={{display:"flex",gap:3}}>{Array.from({length:BLIVES}).map((_,i)=><div key={i} style={{fontSize:16,filter:i<playerLives?"none":"grayscale(1) opacity(0.2)"}}>❤️</div>)}</div></div>
        <div style={{color:"#334155",fontSize:22,display:"flex",alignItems:"center"}}>VS</div>
        <div style={{textAlign:"center"}}><div style={{color:rs.color,fontSize:12,fontWeight:700,marginBottom:5}}>🤖 {lang==="zh"?rs.labelZh:lang==="fr"?(rs.labelFr||rs.label):rs.label}</div><div style={{display:"flex",gap:3}}>{Array.from({length:BLIVES}).map((_,i)=><div key={i} style={{fontSize:16,filter:i<robotLives?"none":"grayscale(1) opacity(0.2)"}}>❤️</div>)}</div></div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={()=>{setPhase("setup");setPlayerLives(BLIVES);setRobotLives(BLIVES);setPlayerLivesLost(0);setRoundNum(1);setMatchWinner(null);setNewBattleBadges([]);setDoubleDmg(false);setShield(false);setRobotDoubleDmg(false);}} style={{background:"linear-gradient(135deg,#ef4444,#b91c1c)",border:"none",borderRadius:12,padding:"14px 22px",color:"white",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 20px rgba(239,68,68,0.35)"}}>⚔️ {lang==="zh"?"再战一局":lang==="fr"?"Rejouer":"Play Again"}</button>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:"14px 22px",color:"#94a3b8",fontSize:15,fontWeight:800,cursor:"pointer"}}>🏠 {lang==="zh"?"返回主页":lang==="fr"?"Menu principal":"Main Menu"}</button>
      </div>
    </div>
  );

  // ── PLAYING ──
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a0505,#2d0a0a,#1a0505)",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'Trebuchet MS',sans-serif",padding:"10px 12px",overflowY:"auto",position:"relative",animation:screenShake?"screenShakeAnim 0.4s ease":"fadeInScreen 0.3s ease"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes abilityFlash{0%{transform:translate(-50%,-50%) scale(0.7);opacity:0}15%{transform:translate(-50%,-50%) scale(1.1);opacity:1}75%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-50%) scale(0.9);opacity:0}}
        @keyframes glitchA{0%{clip-path:inset(20% 0 55% 0);transform:translate(-3px)}50%{clip-path:inset(60% 0 5% 0);transform:translate(3px)}100%{clip-path:inset(20% 0 55% 0);transform:translate(-3px)}}
        @keyframes glitchB{0%{clip-path:inset(55% 0 20% 0);transform:translate(3px)}50%{clip-path:inset(10% 0 65% 0);transform:translate(-3px)}100%{clip-path:inset(55% 0 20% 0);transform:translate(3px)}}
        @keyframes flicker{0%,100%{opacity:1}50%{opacity:0.25}}
        @keyframes robotBounce{0%,100%{transform:translateY(0) scale(1)}25%{transform:translateY(-8px) scale(1.05)}75%{transform:translateY(-4px) scale(1.02)}}
        @keyframes robotShake{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-8px) rotate(-5deg)}40%{transform:translateX(8px) rotate(5deg)}60%{transform:translateX(-5px) rotate(-3deg)}80%{transform:translateX(5px) rotate(3deg)}}
        @keyframes robotExplode{0%{transform:scale(1);opacity:1}30%{transform:scale(1.4);opacity:0.8;filter:brightness(3) hue-rotate(40deg)}60%{transform:scale(0.8);opacity:0.5}100%{transform:scale(1.1);opacity:1;filter:brightness(1)}}
        @keyframes robotHack{0%,100%{transform:skewX(0) skewY(0);filter:hue-rotate(0)}25%{transform:skewX(8deg) skewY(-3deg);filter:hue-rotate(120deg) brightness(1.5)}50%{transform:skewX(-6deg) skewY(2deg);filter:hue-rotate(240deg) brightness(0.8)}75%{transform:skewX(4deg) skewY(-1deg);filter:hue-rotate(180deg) brightness(1.3)}}
        @keyframes robotThink{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes playerHitAnim{0%,100%{transform:translateX(0);filter:none}20%{transform:translateX(-6px);filter:brightness(2) saturate(0)}40%{transform:translateX(6px);filter:brightness(0.5)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes heartLose{0%{transform:scale(1) rotate(0);opacity:1}30%{transform:scale(1.3) rotate(-15deg);filter:brightness(2)}60%{transform:scale(0.5) rotate(30deg);opacity:0.5}100%{transform:scale(0) rotate(45deg);opacity:0}}
        @keyframes heartPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        @keyframes cardFlipIn{0%{transform:perspective(600px) rotateY(-90deg) scale(0.8);opacity:0}60%{transform:perspective(600px) rotateY(10deg) scale(1.05)}100%{transform:perspective(600px) rotateY(0) scale(1);opacity:1}}
        @keyframes screenShakeAnim{0%,100%{transform:translate(0)}20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,3px)}80%{transform:translate(3px,-1px)}}
        @keyframes vsGlow{0%,100%{text-shadow:0 0 10px #ef4444,0 0 20px #ef4444}50%{text-shadow:0 0 20px #f97316,0 0 40px #f97316,0 0 60px #ef4444}}
        @keyframes doubleDmgPulse{0%,100%{box-shadow:0 0 8px #f97316}50%{box-shadow:0 0 20px #f97316,0 0 40px #ef4444}}
      `}</style>

      {/* Hack glitch overlay */}
      {hackActive&&(
        <div style={{position:"fixed",inset:0,zIndex:500,pointerEvents:"none",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,255,65,0.04)",animation:"flicker 0.12s infinite"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#001a00,#1a0505,#000)",opacity:0.92,animation:"glitchA 0.25s infinite"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#1a0505,#000,#001a00)",opacity:0.85,animation:"glitchB 0.18s infinite"}}/>
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:"#00ff41",fontFamily:"monospace",fontSize:15,fontWeight:700,textAlign:"center",textShadow:"0 0 12px #00ff41",animation:"flicker 0.09s infinite",zIndex:501}}>
            {["SYSTEM OVERRIDE","HACK ACTIVE","ERR 0x4F3A","CTRL+ALT+DEL","GLITCH.EXE"][Math.floor(Date.now()/600)%5]}
          </div>
        </div>
      )}

      {/* Ability flash */}
      {abilityAnim&&(
        <div style={{position:"fixed",top:"50%",left:"50%",zIndex:600,pointerEvents:"none",animation:"abilityFlash 1.6s ease forwards",background:"rgba(0,0,0,0.88)",border:"2px solid #ef4444",borderRadius:22,padding:"18px 32px",textAlign:"center",minWidth:200}}>
          <div style={{fontSize:44,marginBottom:6}}>{abilityAnim.icon}</div>
          <div style={{color:"#fca5a5",fontWeight:900,fontSize:15}}>{abilityAnim.text}</div>
        </div>
      )}

      {/* Header */}
      <div style={{width:"100%",maxWidth:420,marginBottom:8,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
        <h2 style={{fontSize:17,fontWeight:900,margin:0,background:"linear-gradient(90deg,#ef4444,#f97316)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",textAlign:"center"}}>⚔️ {lang==="zh"?"对战模式":lang==="fr"?"Mode Combat":"Battle Mode"}</h2>
        <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center"}}>
          <LangSwitcher lang={lang} setLang={setLang}/>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"3px 10px",color:"#64748b",fontSize:11,cursor:"pointer"}}>🏠</button>
        </div>
      </div>

      {/* ── 3D Battle Arena ── */}
      <div style={{width:"100%",maxWidth:420,marginBottom:8,animation:screenShake?"screenShakeAnim 0.4s ease":"none"}}>

        {/* VS Bar — timer centred, names + lives on sides */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,
          background:"linear-gradient(135deg,rgba(239,68,68,0.08),rgba(239,68,68,0.04))",
          border:"1px solid rgba(239,68,68,0.2)",borderRadius:16,padding:"8px 12px"}}>

          {/* Player side */}
          <div style={{flex:1,textAlign:"left"}}>
            <div style={{color:"#f6d365",fontSize:11,fontWeight:800,marginBottom:4}}>
              {playerName}{shield?" 🛡️":""}
            </div>
            <div style={{display:"flex",gap:3}}>
              {Array.from({length:BLIVES}).map((_,i)=>(
                <div key={i} style={{
                  fontSize:18,
                  filter:i<playerLives?"none":"grayscale(1) opacity(0.15)",
                  transform:i<playerLives?"scale(1)":"scale(0.7)",
                  transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                  animation:i===playerLives-1&&playerHit?"heartLose 0.5s ease forwards":
                            i<playerLives&&doubleDmg?"heartPulse 0.8s ease infinite":"none",
                }}>❤️</div>
              ))}
            </div>
          </div>

          {/* Timer centre */}
          <div style={{textAlign:"center",padding:"0 10px"}}>
            <div style={{color:"#475569",fontSize:9,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>
              {lang==="zh"?"第":lang==="fr"?"Man. ":"Rnd "}{roundNum}
            </div>
            <div style={{
              color:timeLeft<=10?"#ef4444":timeLeft<=20?"#f59e0b":"#34d399",
              fontWeight:900,fontSize:28,lineHeight:1,
              animation:timeLeft<=10?"pulse 0.7s infinite":"none",
              textShadow:timeLeft<=10?"0 0 12px #ef4444":"none",
            }}>{timeLeft}s</div>
            <div style={{
              fontSize:12,fontWeight:900,
              background:"linear-gradient(90deg,#ef4444,#f97316)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              animation:"vsGlow 2s ease infinite",
            }}>VS</div>
          </div>

          {/* Robot side */}
          <div style={{flex:1,textAlign:"right"}}>
            <div style={{color:rs.color,fontSize:11,fontWeight:800,marginBottom:4}}>
              🤖 {lang==="zh"?rs.labelZh:lang==="fr"?(rs.labelFr||rs.label):rs.label}{robotDoubleDmg?" 💥":""}
            </div>
            <div style={{display:"flex",gap:3,justifyContent:"flex-end"}}>
              {Array.from({length:BLIVES}).map((_,i)=>(
                <div key={i} style={{
                  fontSize:18,
                  filter:i<robotLives?"none":"grayscale(1) opacity(0.15)",
                  transform:i<robotLives?"scale(1)":"scale(0.7)",
                  transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                  animation:i===robotLives-1&&robotHit?"heartLose 0.5s ease forwards":"none",
                }}>❤️</div>
              ))}
            </div>
          </div>
        </div>

        {/* Robot avatar + status */}
        <div style={{
          background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",
          borderRadius:14,padding:"10px 14px",
          display:"flex",alignItems:"center",gap:12,
          animation:doubleDmg&&robotDoubleDmg?"doubleDmgPulse 0.8s infinite":"none",
        }}>
          {/* Animated robot avatar */}
          <div style={{
            fontSize:36,flexShrink:0,
            animation:
              robotState==="thinking"?"robotThink 2s ease infinite":
              robotState==="solved"?"robotBounce 0.6s ease":
              robotState==="hit"?"robotShake 0.5s ease":
              robotState==="explode"?"robotExplode 0.6s ease":
              robotState==="hack"?"robotHack 0.3s ease infinite":
              "none",
            filter:
              robotState==="solved"?"brightness(1.5) drop-shadow(0 0 8px "+rs.color+")":
              robotState==="hack"?"hue-rotate(120deg) brightness(1.3)":
              robotState==="hit"?"brightness(2) saturate(0)":
              "none",
            transition:"filter 0.3s",
          }}>🤖</div>

          {/* Status text */}
          <div style={{flex:1}}>
            <div style={{color:
              robotState==="solved"?"#34d399":
              robotState==="hack"?"#00ff41":
              robotState==="hit"?"#ef4444":
              "#94a3b8",
              fontSize:12,fontWeight:robotState!=="thinking"?700:400,
              transition:"color 0.3s",
            }}>
              {robotSolved?(lang==="zh"?"✓ 解出了！":lang==="fr"?"✓ Resolu !":"✓ Solved!"):
               robotState==="hack"?(lang==="zh"?"系统错误...":lang==="fr"?"ERREUR SYSTEME...":"SYSTEM ERROR..."):
               (lang==="zh"?"正在思考...":lang==="fr"?"Reflechit...":"Thinking...")}
            </div>
            {cancelledOp&&<div style={{color:"#f59e0b",fontSize:10,fontWeight:700,marginTop:2}}>✂️ {cancelledOp} {lang==="zh"?"已取消":lang==="fr"?"annule":"cancelled"}</div>}
          </div>

          {/* Thinking dots */}
          {!robotSolved&&robotState!=="hack"&&(
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{
                  width:5,height:5,borderRadius:"50%",
                  background:rs.color,
                  animation:`pulse 1.2s ease ${i*0.3}s infinite`,
                  boxShadow:`0 0 6px ${rs.color}`,
                }}/>
              ))}
            </div>
          )}

          {/* Double damage warning */}
          {robotDoubleDmg&&(
            <div style={{background:"rgba(239,68,68,0.2)",border:"1px solid #ef4444",borderRadius:8,padding:"3px 8px",fontSize:11,color:"#fca5a5",fontWeight:800,flexShrink:0}}>
              💥 x2
            </div>
          )}
        </div>
      </div>

      {/* Hint */}
      {hintText&&<div style={{width:"100%",maxWidth:420,marginBottom:8,background:"rgba(167,139,250,0.12)",border:"1px solid #a78bfa",borderRadius:12,padding:"7px 14px",textAlign:"center",animation:"popIn 0.3s ease"}}><div style={{color:"#c4b5fd",fontSize:11,fontWeight:700,marginBottom:2}}>💡 {lang==="zh"?"提示 — 下一步：":lang==="fr"?"Indice — prochaine etape :":"Hint — next step:"}</div><div style={{color:"#e9d5ff",fontSize:14,fontWeight:800}}>{hintText}</div></div>}

      {/* Cards with 3D flip */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12,width:"fit-content"}}>
        {cards.map((card,i)=>{
          const inPool=numbers.some(n=>n.sourceId===card.id);
          return (
            <div key={card.id} style={{animation:cardFlip?`cardFlipIn 0.5s ease ${i*0.08}s both`:"none"}}>
              <PlayingCard card={card} used={!inPool} selected={false} animIdx={i} onClick={()=>{}}/>
            </div>
          );
        })}
      </div>

      {/* Numbers */}
      <div style={{marginBottom:10,textAlign:"center"}}>
        <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>{t.availableNumbers}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          {numbers.map((n,i)=>(
            <div key={i} onClick={()=>handleNumberClick(i)} style={{width:54,height:54,borderRadius:12,background:selectedIdx===i?"#fef3c7":"rgba(255,255,255,0.08)",border:`2px solid ${selectedIdx===i?"#f59e0b":"rgba(255,255,255,0.15)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:selectedIdx===i?"#92400e":"white",cursor:"pointer",transform:selectedIdx===i?"scale(1.15)":"scale(1)",transition:"all 0.15s",animation:"popIn 0.3s ease"}}>{n.label}</div>
          ))}
        </div>
      </div>

      {/* Operators */}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap",justifyContent:"center"}}>
        {ALL_OPS.map(op=>{
          const cancelled=op===cancelledOp;
          return (
            <div key={op} style={{position:"relative",opacity:cancelled?0.3:1}}>
              <OpBtn op={op} active={operator===op} disabled={cancelled} onClick={()=>{if(cancelled)return;if(op==="√"&&selectedIdx!==null)doSqrt(selectedIdx);else if(selectedIdx!==null)setOperator(o=>o===op?null:op);}}/>
              {cancelled&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:10,pointerEvents:"none",color:"#f59e0b",fontWeight:900}}>✂️</div>}
            </div>
          );
        })}
      </div>

      {/* Steps */}
      {steps.length>0&&<div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"7px 12px",marginBottom:8,width:"100%",maxWidth:360}}>{steps.map((s,i)=><div key={i} style={{color:"#94a3b8",fontSize:12,marginBottom:2}}><span style={{color:"#475569",marginRight:6}}>{lang==="zh"?`第${i+1}步：`:`${lang==="fr"?"Etape":"Step"} ${i+1}:`}</span>{s.expr}</div>)}</div>}

      {/* Nudges */}
      {selectedIdx===null&&<div style={{color:"#334155",fontSize:11,textAlign:"center",marginBottom:6}}>{lang==="zh"?"点击数字→运算符→数字":lang==="fr"?"Appuyez nombre → opérateur → nombre":"Tap number → operator → number"}</div>}
      {selectedIdx!==null&&operator===null&&<div style={{color:"#f59e0b",fontSize:12,textAlign:"center",marginBottom:6}}>{lang==="zh"?"选择运算符 ↑":lang==="fr"?"Choisir opérateur ↑":"Pick operator ↑"}</div>}
      {selectedIdx!==null&&operator!==null&&<div style={{color:"#34d399",fontSize:12,textAlign:"center",marginBottom:6}}>{lang==="zh"?"点击第二个数字 ↑":lang==="fr"?"Deuxième nombre ↑":"Tap second number ↑"}</div>}

      {/* Message */}
      {message.text&&<div style={{background:`${msgColor}18`,border:`1px solid ${msgColor}`,borderRadius:12,padding:"8px 16px",marginBottom:8,color:msgColor,fontSize:14,fontWeight:700,textAlign:"center",animation:"popIn 0.3s ease",maxWidth:340}}>{message.text}</div>}

      {/* Abilities */}
      <div style={{width:"100%",maxWidth:420,marginBottom:8}}>
        <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:5,textAlign:"center"}}>⚡ {lang==="zh"?"我的技能":lang==="fr"?"Mes capacites":"My Abilities"}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {abilities.length===0
            ?<div style={{color:"#334155",fontSize:12,padding:"8px 0"}}>{lang==="zh"?"技能已用完":lang==="fr"?"Plus de capacites":"No abilities left"}</div>
            :abilities.map(ab=>(
              <button key={ab.id} onClick={()=>useAbility(ab)} style={{background:"linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))",border:"2px solid rgba(239,68,68,0.4)",borderRadius:14,padding:"10px 14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:80,transition:"all 0.2s"}}>
                <div style={{fontSize:26}}>{ab.icon}</div>
                <div style={{color:"#fca5a5",fontSize:11,fontWeight:700}}>{lang==="zh"?ab.zh:lang==="fr"?(ab.fr||ab.en):ab.en}</div>
                <div style={{color:"#475569",fontSize:9,textAlign:"center",lineHeight:1.2}}>{lang==="zh"?ab.descZh:lang==="fr"?(ab.descFr||ab.desc):ab.desc}</div>
              </button>
            ))
          }
        </div>
      </div>

      {/* Reset */}
      <button onClick={doReset} style={{background:"transparent",border:"2px solid #475569",borderRadius:10,padding:"6px 18px",color:"#64748b",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:4}}>{t.reset}</button>

      <Analytics/>
    </div>
  );
}


// ── Personal Stats Screen ──────────────────────────────────────────────────
function StatsScreen({ lang, setLang, onBack }) {
  // Load all data from localStorage
  const lb        = (() => { try { return JSON.parse(localStorage.getItem("game24_leaderboard")||"[]"); } catch { return []; } })();
  const pb        = (() => { try { return JSON.parse(localStorage.getItem("game24_pb")||"{}"); } catch { return {}; } })();
  const badges    = (() => { try { return JSON.parse(localStorage.getItem("game24_badges")||"[]"); } catch { return []; } })();
  const bWins     = (() => { try { return parseInt(localStorage.getItem("game24_battle_wins")||"0"); } catch { return 0; } })();
  const bBadges   = (() => { try { return JSON.parse(localStorage.getItem("game24_battle_badges")||"[]"); } catch { return []; } })();
  const daily     = (() => { try { return JSON.parse(localStorage.getItem("game24_daily")||"null"); } catch { return null; } })();
  const dailyStr  = (() => { try { return JSON.parse(localStorage.getItem("game24_daily_streak")||'{"count":0}'); } catch { return {count:0}; } })();
  const jrSolves  = (() => { try { return parseInt(localStorage.getItem("game24_jr_solves")||"0"); } catch { return 0; } })();
  const jrBadges  = (() => { try { return JSON.parse(localStorage.getItem("game24_jr_badges")||"[]"); } catch { return []; } })();
  const jrLB      = (() => { try { return JSON.parse(localStorage.getItem("game24_jr_leaderboard")||"[]"); } catch { return []; } })();

  // Derive stats
  const totalClassicGames = lb.length;
  const bestClassicScore  = lb.length ? Math.max(...lb.map(e=>e.score)) : 0;
  const bestStreak        = lb.length ? Math.max(...lb.map(e=>e.streak||0)) : 0;
  const totalBadges       = badges.length + bBadges.length + jrBadges.length;
  const totalBadgesMax    = 15 + 5 + 6; // classic + battle + junior (approx)
  const jrBestScore       = jrLB.length ? Math.max(...jrLB.map(e=>e.score)) : 0;
  const hasAnyData        = totalClassicGames > 0 || bWins > 0 || jrSolves > 0 || daily;

  function fmtTime(s) {
    if (!s) return "--";
    const m = Math.floor(s/60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${String(sec).padStart(2,"0")}s` : `${sec}s`;
  }

  const L = {
    title:      { en:"My Stats",           zh:"我的统计",         fr:"Mes Statistiques" },
    noData:     { en:"No games played yet — start playing to see your stats!",
                  zh:"还没有游戏记录，快去玩吧！",
                  fr:"Pas encore de parties — commencez a jouer !" },
    classic:    { en:"Classic Mode",       zh:"经典模式",         fr:"Mode Classique" },
    junior:     { en:"Junior Mode",        zh:"儿童模式",         fr:"Mode Junior" },
    battle:     { en:"Battle Mode",        zh:"对战模式",         fr:"Mode Combat" },
    daily:      { en:"Daily Challenge",    zh:"每日挑战",         fr:"Defi du Jour" },
    badges:     { en:"Trophies",           zh:"成就",             fr:"Trophees" },
    games:      { en:"Games played",       zh:"游戏次数",         fr:"Parties jouees" },
    bestScore:  { en:"Best score",         zh:"最高分",           fr:"Meilleur score" },
    bestStreak: { en:"Best streak",        zh:"最长连胜",         fr:"Meilleure serie" },
    wins:       { en:"Battles won",        zh:"胜利次数",         fr:"Batailles gagnees" },
    solves:     { en:"Puzzles solved",     zh:"解题次数",         fr:"Puzzles resolus" },
    streak:     { en:"Daily streak",       zh:"每日连续",         fr:"Serie quotidienne" },
    bestTime:   { en:"Best time",          zh:"最佳用时",         fr:"Meilleur temps" },
    pb:         { en:"Personal bests",     zh:"个人最佳",         fr:"Records personnels" },
    easy:       { en:"Easy",               zh:"简单",             fr:"Facile" },
    medium:     { en:"Medium",             zh:"中等",             fr:"Moyen" },
    hard:       { en:"Hard",               zh:"困难",             fr:"Difficile" },
    earned:     { en:"earned",             zh:"已获得",           fr:"obtenus" },
    days:       { en:"days",               zh:"天",               fr:"jours" },
    hints:      { en:"hints used",         zh:"提示次数",         fr:"indices utilises" },
    noHints:    { en:"No hints!",          zh:"未使用提示！",     fr:"Sans indices !" },
    back:       { en:"Back",               zh:"返回",             fr:"Retour" },
  };
  const t = (key) => L[key]?.[lang] || L[key]?.en || key;

  function StatCard({ icon, label, value, color="#f6d365", sub }) {
    return (
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:14,padding:"12px 14px",flex:1,minWidth:0}}>
        <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{icon} {label}</div>
        <div style={{color,fontWeight:900,fontSize:22,lineHeight:1}}>{value}</div>
        {sub&&<div style={{color:"#475569",fontSize:10,marginTop:3}}>{sub}</div>}
      </div>
    );
  }

  function Section({ icon, title, color, children }) {
    return (
      <div style={{width:"100%",maxWidth:420,marginBottom:16}}>
        <div style={{color,fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
          <span>{icon}</span>{title}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      display:"flex",flexDirection:"column",alignItems:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:"20px 16px",overflowY:"auto",
      animation:"fadeInScreen 0.3s ease"}}>
      <style>{`@keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>

      {/* Header */}
      <div style={{width:"100%",maxWidth:420,marginBottom:20,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
        <div style={{fontSize:40,marginBottom:4}}>📊</div>
        <h1 style={{fontSize:28,fontWeight:900,margin:0,
          background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:"shimmer 3s linear infinite"}}>{t("title")}</h1>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <LangSwitcher lang={lang} setLang={setLang}/>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"3px 12px",color:"#64748b",fontSize:12,cursor:"pointer"}}>🏠</button>
        </div>
      </div>

      {!hasAnyData ? (
        <div style={{textAlign:"center",color:"#475569",fontSize:14,marginTop:40,maxWidth:300}}>
          <div style={{fontSize:48,marginBottom:16}}>🎮</div>
          {t("noData")}
        </div>
      ) : (
        <>
          {/* ── Classic Mode ── */}
          {totalClassicGames > 0 && (
            <Section icon="🎮" title={t("classic")} color="#f6d365">
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <StatCard icon="🎯" label={t("games")} value={totalClassicGames} color="#f6d365"/>
                <StatCard icon="⭐" label={t("bestScore")} value={bestClassicScore} color="#f6d365"/>
                <StatCard icon="🔥" label={t("bestStreak")} value={bestStreak} color="#f97316"/>
              </div>
              {Object.keys(pb).length > 0 && (
                <div style={{background:"rgba(246,211,101,0.06)",border:"1px solid rgba(246,211,101,0.15)",borderRadius:12,padding:"10px 14px"}}>
                  <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t("pb")}</div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    {["Easy","Medium","Hard"].map(d => pb[d] ? (
                      <div key={d} style={{textAlign:"center"}}>
                        <div style={{color:{Easy:"#34d399",Medium:"#f59e0b",Hard:"#ef4444"}[d],fontSize:10,fontWeight:700,marginBottom:2}}>{t(d.toLowerCase())}</div>
                        <div style={{color:"#f6d365",fontWeight:900,fontSize:18}}>{pb[d]}</div>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ── Junior Mode ── */}
          {jrSolves > 0 && (
            <Section icon="🌟" title={t("junior")} color="#34d399">
              <div style={{display:"flex",gap:8}}>
                <StatCard icon="✅" label={t("solves")} value={jrSolves} color="#34d399"/>
                {jrBestScore > 0 && <StatCard icon="⭐" label={t("bestScore")} value={jrBestScore} color="#34d399"/>}
                <StatCard icon="🎖️" label={t("badges")} value={`${jrBadges.length}/6`} color="#34d399"/>
              </div>
            </Section>
          )}

          {/* ── Battle Mode ── */}
          {bWins > 0 && (
            <Section icon="⚔️" title={t("battle")} color="#ef4444">
              <div style={{display:"flex",gap:8}}>
                <StatCard icon="🏆" label={t("wins")} value={bWins} color="#ef4444"/>
                <StatCard icon="🎖️" label={t("badges")} value={`${bBadges.length}/5`} color="#ef4444"/>
              </div>
            </Section>
          )}

          {/* ── Daily Challenge ── */}
          {(daily || dailyStr.count > 0) && (
            <Section icon="📅" title={t("daily")} color="#60a5fa">
              <div style={{display:"flex",gap:8}}>
                <StatCard icon="🔥" label={t("streak")} value={`${dailyStr.count} ${t("days")}`} color="#f472b6"/>
                {daily && <StatCard icon="⏱️" label={t("bestTime")} value={fmtTime(daily.totalTime)} color="#60a5fa"
                  sub={daily.hintsUsed===0 ? t("noHints") : `${daily.hintsUsed} ${t("hints")}`}/>}
              </div>
            </Section>
          )}

          {/* ── Total Trophies ── */}
          <Section icon="🏅" title={t("badges")} color="#a78bfa">
            <div style={{background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:14,padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{fontSize:40}}>🏅</div>
                <div>
                  <div style={{color:"#a78bfa",fontWeight:900,fontSize:32}}>{totalBadges}</div>
                  <div style={{color:"#64748b",fontSize:12}}>{t("earned")} · {badges.length} {t("classic")} · {bBadges.length} {t("battle")} · {jrBadges.length} {t("junior")}</div>
                </div>
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}


// ── Daily Challenge Screen ─────────────────────────────────────────────────
function DailyChallengeScreen({ lang, setLang, onBack }) {
  const t = T[lang];
  const todayKey = getTodayKey();
  const existingResult = loadDailyResult();
  const alreadyDone = existingResult && existingResult.dateKey === todayKey;

  // Game state
  const [phase, setPhase] = useState(alreadyDone ? "done" : "playing"); // playing | solved | failed | done
  const dailyCards = getDailyCards();
  const [cards] = useState(dailyCards);
  const [numbers, setNumbers] = useState(dailyCards.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [operator, setOperator] = useState(null);
  const [steps, setSteps] = useState([]);
  const [message, setMessage] = useState({text:"",type:""});
  const [elapsed, setElapsed] = useState(0); // stopwatch
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintPenalty, setHintPenalty] = useState(0); // total added seconds
  const [showHintSteps, setShowHintSteps] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sharing, setSharing] = useState(false);
  const dailyStreak = loadDailyStreak();
  const shareCardRef = useRef(null);

  const timerRef = useRef(null);

  // Format date nicely
  function formatDate(key) {
    const y = parseInt(key.slice(0,4));
    const m = parseInt(key.slice(4,6)) - 1;
    const d = parseInt(key.slice(6,8));
    return new Date(y,m,d).toLocaleDateString(lang==="zh"?"zh-CN":"en-GB",{day:"numeric",month:"long",year:"numeric"});
  }

  const displayDate = formatDate(todayKey);
  const DAILY_OPS = ["+","−","×","÷","^","√"]; // Medium operators

  // Stopwatch
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = setInterval(() => setElapsed(e => e+1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  function fmtTime(s) {
    const m = Math.floor(s/60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${String(sec).padStart(2,"0")}s` : `${sec}s`;
  }

  function handleNumberClick(idx) {
    if (phase !== "playing") return;

    if (selectedIdx === null) {
      setSelectedIdx(idx); setOperator(null); setMessage({text:"",type:""});
    } else if (selectedIdx === idx) {
      setSelectedIdx(null); setOperator(null);
    } else if (operator === "!") {
      applyFactorial(selectedIdx);
    } else if (operator === "√") {
      applySqrt(selectedIdx);
    } else if (operator !== null) {
      applyOp(selectedIdx, operator, idx);
    }
  }

  function applyOp(iA, op, iB) {
    const a=numbers[iA].value, b=numbers[iB].value;
    const la=numbers[iA].label, lb=numbers[iB].label;
    let result;
    if (op==="+") result=a+b;
    else if (op==="−") result=a-b;
    else if (op==="×") result=a*b;
    else if (op==="÷") {
      if (Math.abs(b)<1e-9){setMessage({text:t.cantDivideZero,type:"bad"});return;}
      result=a/b;
    } else if (op==="^") result=Math.pow(a,b);
    else if (op==="ʸ√") {
      if (Math.abs(b)<1e-9){setMessage({text:lang==="zh"?"根指数不能为零！":"Root degree can't be zero!",type:"bad"});return;}
      if (a<0){
        if(!Number.isInteger(b)||b%2===0){setMessage({text:lang==="zh"?"负数只能开奇数次方根！":"Odd integer root only for negative base!",type:"bad"});return;}
        result=-(Math.pow(-a,1/b));
      } else result=Math.pow(a,1/b);
    }
    const expr=`${la} ${op} ${lb} = ${fmt(result)}`;
    setSteps(s=>[...s,{expr,result}]);
    const newNums=numbers.filter((_,i)=>i!==iA&&i!==iB);
    newNums.push({value:result,label:fmt(result),sourceId:`step_${steps.length+1}`});
    setNumbers(newNums);
    setSelectedIdx(null); setOperator(null);
    if (newNums.length===1) {
      if (Math.abs(result-24)<1e-9) handleSolve(newNums);
      else setMessage({text:t.notTwentyFour(fmt(result)),type:"bad"});
    } else {
      setMessage({text:`✓ ${expr}`,type:"step"});
    }
  }

  function applySqrt(idx) {
    const a=numbers[idx].value;
    if(a<0){setMessage({text:lang==="zh"?"不能对负数开方！":"Can't take sqrt of a negative number!",type:"bad"});setSelectedIdx(null);setOperator(null);return;}
    const result=Math.sqrt(a);
    const expr=`√${fmt(a)} = ${fmt(result)}`;
    setSteps(s=>[...s,{expr,result}]);
    const newNums=numbers.filter((_,i)=>i!==idx);
    newNums.push({value:result,label:fmt(result),sourceId:`step_${steps.length+1}`});
    setNumbers(newNums); setSelectedIdx(null); setOperator(null);
    if(newNums.length===1){if(Math.abs(result-24)<1e-9)handleSolve(newNums);else setMessage({text:t.notTwentyFour(fmt(result)),type:"bad"});}
    setMessage({text:`✓ ${expr}`,type:"step"});
  }

  function applyFactorial(idx) {
    const a=numbers[idx].value;
    if(!Number.isInteger(a)||a<0||a>7){setMessage({text:lang==="zh"?`${fmt(a)}! 超出范围 (只能用 0-7)`:`${fmt(a)}! out of range (0–7 only)`,type:"bad"});setSelectedIdx(null);setOperator(null);return;}
    let result=1; for(let i=2;i<=a;i++) result*=i;
    const expr=`${fmt(a)}! = ${fmt(result)}`;
    setSteps(s=>[...s,{expr,result}]);
    const newNums=numbers.filter((_,i)=>i!==idx);
    newNums.push({value:result,label:fmt(result),sourceId:`step_${steps.length+1}`});
    setNumbers(newNums); setSelectedIdx(null); setOperator(null);
    if(newNums.length===1){if(Math.abs(result-24)<1e-9)handleSolve(newNums);else setMessage({text:t.notTwentyFour(fmt(result)),type:"bad"});}
    setMessage({text:`✓ ${expr}`,type:"step"});
  }

  function handleSolve() {
    clearInterval(timerRef.current);
    const totalTime = elapsed + hintPenalty;
    setShowConfetti(true);
    setTimeout(()=>setShowConfetti(false), 2500);

    // Save result
    const result = { dateKey: todayKey, solved: true, elapsed, hintsUsed, hintPenalty, totalTime };
    saveDailyResult(result);

    // Update streak
    const streak = loadDailyStreak();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const yKey = `${yesterday.getFullYear()}${String(yesterday.getMonth()+1).padStart(2,"0")}${String(yesterday.getDate()).padStart(2,"0")}`;
    const newCount = (streak.lastKey === yKey || streak.lastKey === todayKey) ? streak.count + (streak.lastKey===todayKey?0:1) : 1;
    saveDailyStreak({ count: newCount, lastKey: todayKey });

    setPhase("solved");
    setMessage({text:"",type:""});
  }

  function handleReset() {
    setNumbers(cards.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
    setSelectedIdx(null); setOperator(null); setSteps([]); setMessage({text:"",type:""}); setShowHintSteps(null);
  }

  function handleHint() {
    const hSteps = getHintSteps(numbers);
    if (!showHintSteps) {
      setShowHintSteps({steps: hSteps||[], revealed: 1});
    } else if (showHintSteps.revealed < showHintSteps.steps.length) {
      setShowHintSteps(h=>({...h, revealed: h.revealed+1}));
    }
    setHintsUsed(h=>h+1);
    setHintPenalty(p=>p+30);
    setElapsed(e=>e+30); // add 30s to stopwatch visually
    setMessage({text: lang==="zh"?"⏱ +30秒 (使用提示)":"⏱ +30s time penalty for hint", type:"bad"});
    setTimeout(()=>setMessage({text:"",type:""}), 2000);
  }

  async function handleShare() {
    setSharing(true);
    try {
      await new Promise((resolve, reject) => {
        if (window.html2canvas) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve; script.onerror = reject;
        document.head.appendChild(script);
      });
      const canvas = await window.html2canvas(shareCardRef.current, {backgroundColor:null, scale:2, logging:false});
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'game24-daily.png', {type:'image/png'});
        const result = loadDailyResult();
        const totalTime = result ? result.totalTime : elapsed + hintPenalty;
        if (navigator.share && navigator.canShare && navigator.canShare({files:[file]})) {
          await navigator.share({
            title: lang==="zh"?"我完成了今天的24点日挑战！":"I solved today's Game24 Daily Challenge!",
            text: lang==="zh"
              ? `我用 ${fmtTime(totalTime)} 完成了今天的24点！${hintsUsed>0?`（使用了${hintsUsed}次提示）`:""}来挑战我吧！`
              : `I solved today's Game24 in ${fmtTime(totalTime)}!${hintsUsed>0?` (${hintsUsed} hint${hintsUsed>1?"s":""})`:""} Can you beat me?`,
            url: 'https://game24-taupe.vercel.app',
            files: [file],
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'game24-daily.png'; a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, 'image/png');
    } catch(e) { console.error(e); setSharing(false); }
  }

  const msgColor = {win:"#34d399",bad:"#ef4444",step:"#f6d365","":"#94a3b8"}[message.type]||"#94a3b8";
  const streakNow = loadDailyStreak();
  const result = loadDailyResult();

  // ── Solved / Already Done screen ──
  if (phase === "solved" || phase === "done") {
    const res = result || {};
    const totalTime = res.totalTime ?? (elapsed + hintPenalty);
    const hUsed = res.hintsUsed ?? hintsUsed;
    const hPen = res.hintPenalty ?? hintPenalty;
    const rawTime = res.elapsed ?? elapsed;
    const streak = streakNow;

    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        fontFamily:"'Trebuchet MS',sans-serif",padding:24}}>
        <style>{`@keyframes trophy{0%,100%{transform:scale(1) rotate(-5deg)}50%{transform:scale(1.1) rotate(5deg)}} @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}} @keyframes popIn{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}} @keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>

        {/* Confetti on fresh solve */}
        {phase==="solved"&&showConfetti&&(
          <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>
            {Array.from({length:40}).map((_,i)=>{
              const colors=["#f6d365","#fda085","#f472b6","#34d399","#60a5fa","#a78bfa"];
              return <div key={i} style={{position:"absolute",top:"-20px",left:`${Math.random()*100}%`,width:6+Math.random()*8,height:6+Math.random()*8,background:colors[i%colors.length],borderRadius:Math.random()>0.5?"50%":"2px",animation:`confettiFall ${1.5+Math.random()}s ease-in ${Math.random()*0.8}s forwards`}}/>;
            })}
          </div>
        )}

        {/* Lang toggle + back */}
        <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
          <LangSwitcher lang={lang} setLang={setLang}/>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:16,padding:"3px 14px",color:"#94a3b8",fontSize:12,cursor:"pointer"}}>🏠</button>
        </div>

        <div style={{fontSize:56,animation:"trophy 1.5s ease infinite",marginBottom:8}}>📅</div>
        <h2 style={{fontSize:26,fontWeight:900,margin:"0 0 4px",
          background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:"shimmer 2s linear infinite",
        }}>
          {lang==="zh"?"每日挑战完成！":"Daily Challenge Complete!"}
        </h2>
        <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>{displayDate}</p>

        {/* Result card */}
        <div style={{width:"100%",maxWidth:340,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(246,211,101,0.3)",borderRadius:20,padding:20,marginBottom:20}}>
          {/* Cards used */}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
            {cards.map((card,i)=>{
              const red=card.suit==="♥"||card.suit==="♦";
              return (
                <div key={i} style={{width:64,height:86,borderRadius:8,background:"white",border:"2px solid #e2e8f0",
                  display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"4px 6px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:red?"#e53e3e":"#1a202c",fontFamily:"Georgia,serif"}}>
                    {CARD_FACE_LABEL[card.val]}<span style={{fontSize:10}}>{card.suit}</span>
                  </div>
                  <div style={{fontSize:16,textAlign:"center",color:red?"#e53e3e":"#1a202c"}}>{card.suit}</div>
                  <div style={{fontSize:12,fontWeight:700,color:red?"#e53e3e":"#1a202c",textAlign:"right",transform:"rotate(180deg)",fontFamily:"Georgia,serif"}}>
                    {CARD_FACE_LABEL[card.val]}<span style={{fontSize:10}}>{card.suit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:12}}>
            <div style={{textAlign:"center",flex:1,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 4px"}}>
              <div style={{color:"#f6d365",fontWeight:900,fontSize:28}}>{fmtTime(totalTime)}</div>
              <div style={{color:"#64748b",fontSize:11}}>{lang==="zh"?"总用时":lang==="fr"?"Temps total":"Total time"}</div>
              {hPen>0&&<div style={{color:"#ef4444",fontSize:10,marginTop:2}}>{lang==="zh"?`(含${hPen}秒提示惩罚)`:`(incl. ${hPen}s hint penalty)`}</div>}
            </div>
            <div style={{textAlign:"center",flex:1,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 4px"}}>
              <div style={{color:"#f472b6",fontWeight:900,fontSize:28}}>🔥{streak.count}</div>
              <div style={{color:"#64748b",fontSize:11}}>{lang==="zh"?"连续天数":lang==="fr"?"Serie du jour":"Day streak"}</div>
            </div>
          </div>
          {hUsed > 0 && (
            <div style={{textAlign:"center",color:"#a78bfa",fontSize:13,marginBottom:8}}>
              💡 {lang==="zh"?`使用了 ${hUsed} 次提示`:`${hUsed} hint${hUsed>1?"s":""} used`}
            </div>
          )}
          {hUsed === 0 && (
            <div style={{textAlign:"center",color:"#34d399",fontSize:13,fontWeight:700,marginBottom:8}}>
              🧠 {lang==="zh"?"无提示完成！":"Solved without hints!"}
            </div>
          )}
        </div>

        {/* Come back tomorrow */}
        <div style={{background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.2)",borderRadius:14,padding:"10px 20px",marginBottom:20,textAlign:"center",maxWidth:320,width:"100%"}}>
          <div style={{color:"#60a5fa",fontSize:13,fontWeight:700}}>
            {lang==="zh"?"🌅 明天再来！每天都有新题目。":lang==="fr"?"🌅 Revenez demain pour un nouveau puzzle !":"🌅 Come back tomorrow for a new puzzle!"}
          </div>
        </div>

        {/* Buttons */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:"12px 20px",color:"#94a3b8",fontSize:14,fontWeight:800,cursor:"pointer"}}>
            🏠 {lang==="zh"?"返回主页":lang==="fr"?"Menu principal":"Main Menu"}
          </button>
          <button onClick={handleShare} disabled={sharing} style={{background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",border:"none",borderRadius:12,padding:"12px 20px",color:"white",fontSize:14,fontWeight:800,cursor:sharing?"not-allowed":"pointer",opacity:sharing?0.7:1,boxShadow:"0 4px 20px rgba(59,130,246,0.35)"}}>
            {sharing?(lang==="zh"?"生成中...":lang==="fr"?"Generation...":"Generating..."):(lang==="zh"?"📤 分享成绩":lang==="fr"?"📤 Partager":"📤 Share")}
          </button>
        </div>

        {/* Hidden share card */}
        <div ref={shareCardRef} style={{position:"fixed",left:"-9999px",top:0,width:380,
          background:"linear-gradient(135deg,#1a1a2e,#0f3460)",borderRadius:24,padding:28,
          fontFamily:"'Trebuchet MS',sans-serif",border:"2px solid rgba(246,211,101,0.5)"}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:36,marginBottom:4}}>📅</div>
            <div style={{fontSize:26,fontWeight:900,color:"#f6d365"}}>Game24<sup style={{fontSize:"0.45em",color:"#fda085",position:"relative",top:"-0.5em",marginLeft:1}}>&trade;</sup></div>
            <div style={{color:"#64748b",fontSize:12}}>{lang==="zh"?"每日挑战":"Daily Challenge"} · {displayDate}</div>
          </div>
          <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(246,211,101,0.5),transparent)",marginBottom:16}}/>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
            {cards.map((card,i)=>{
              const red=card.suit==="♥"||card.suit==="♦";
              return <div key={i} style={{width:60,height:82,borderRadius:8,background:"white",border:"2px solid #e2e8f0",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"4px 5px"}}>
                <div style={{fontSize:11,fontWeight:700,color:red?"#e53e3e":"#1a202c",fontFamily:"Georgia,serif"}}>{CARD_FACE_LABEL[card.val]}<span style={{fontSize:9}}>{card.suit}</span></div>
                <div style={{fontSize:15,textAlign:"center",color:red?"#e53e3e":"#1a202c"}}>{card.suit}</div>
                <div style={{fontSize:11,fontWeight:700,color:red?"#e53e3e":"#1a202c",textAlign:"right",transform:"rotate(180deg)",fontFamily:"Georgia,serif"}}>{CARD_FACE_LABEL[card.val]}<span style={{fontSize:9}}>{card.suit}</span></div>
              </div>;
            })}
          </div>
          <div style={{background:"rgba(246,211,101,0.1)",borderRadius:16,padding:"16px",marginBottom:16,textAlign:"center",border:"1px solid rgba(246,211,101,0.3)"}}>
            <div style={{color:"#f6d365",fontWeight:900,fontSize:48,lineHeight:1}}>{fmtTime(totalTime)}</div>
            <div style={{color:"#64748b",fontSize:12,marginTop:4}}>{lang==="zh"?"总用时":lang==="fr"?"Temps total":"Total time"}{hPen>0?(lang==="zh"?`（含${hPen}秒提示惩罚）`:`${lang==="fr"?` (incl. ${hPen}s penalite)`:" (incl. "+hPen+"s hint penalty)"}`):""}</div>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}>
            <div style={{background:"rgba(244,114,182,0.1)",borderRadius:12,padding:"10px 20px",textAlign:"center",border:"1px solid rgba(244,114,182,0.2)"}}>
              <div style={{color:"#f472b6",fontWeight:900,fontSize:24}}>🔥{streak.count}</div>
              <div style={{color:"#64748b",fontSize:11}}>{lang==="zh"?"连续天数":lang==="fr"?"Serie du jour":"Day streak"}</div>
            </div>
            {hUsed===0&&<div style={{background:"rgba(52,211,153,0.1)",borderRadius:12,padding:"10px 20px",textAlign:"center",border:"1px solid rgba(52,211,153,0.2)"}}>
              <div style={{color:"#34d399",fontWeight:900,fontSize:20}}>🧠</div>
              <div style={{color:"#34d399",fontSize:12,fontWeight:700}}>{lang==="zh"?"无提示":lang==="fr"?"Sans indice":"No hints"}</div>
            </div>}
          </div>
          <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"10px",textAlign:"center",marginBottom:12}}>
            <div style={{color:"#ef4444",fontWeight:900,fontSize:14}}>{lang==="zh"?"🔥 你能更快吗？":"🔥 Can you beat my time?"}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{color:"#f6d365",fontWeight:700,fontSize:13}}>🃏 game24-taupe.vercel.app</div>
            <div style={{color:"#334155",fontSize:10,marginTop:2}}>{lang==="zh"?"免费畅玩，无需下载":"Free to play · No download needed"}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing screen ──
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:"16px 12px",overflowY:"auto",
      animation:"fadeInScreen 0.3s ease"}}>
      <style>{`@keyframes cardDeal{from{opacity:0;transform:translateY(-30px) scale(0.85)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}} @keyframes popIn{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}} @keyframes fadeSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <h1 style={{fontSize:30,fontWeight:900,margin:"0 0 2px",letterSpacing:-1,
        background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmer 3s linear infinite"}}>Game24<sup style={{fontSize:"0.48em",WebkitTextFillColor:"#fda085",color:"#fda085",position:"relative",top:"-0.5em",marginLeft:2}}>&trade;</sup></h1>

      <div style={{display:"flex",gap:8,marginBottom:12,justifyContent:"center"}}>
        <LangSwitcher lang={lang} setLang={setLang}/>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,padding:"3px 12px",color:"#64748b",fontSize:12,cursor:"pointer"}}>🏠</button>
      </div>

      {/* Daily Challenge label + date */}
      <div style={{background:"linear-gradient(135deg,rgba(96,165,250,0.15),rgba(167,139,250,0.1))",border:"1px solid rgba(96,165,250,0.35)",borderRadius:16,padding:"10px 20px",marginBottom:14,textAlign:"center"}}>
        <div style={{color:"#93c5fd",fontWeight:900,fontSize:16,letterSpacing:1}}>📅 {lang==="zh"?"每日挑战":lang==="fr"?"DEFI DU JOUR":"DAILY CHALLENGE"}</div>
        <div style={{color:"#64748b",fontSize:12,marginTop:2}}>{displayDate}</div>
      </div>

      {/* Stopwatch + hints used */}
      <div style={{display:"flex",gap:16,marginBottom:14,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:14,padding:"8px 20px",alignItems:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{lang==="zh"?"用时":lang==="fr"?"Temps":"Time"}</div>
          <div style={{color:"#60a5fa",fontWeight:900,fontSize:22}}>{fmtTime(elapsed)}</div>
        </div>
        {hintPenalty > 0 && (
          <>
            <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{lang==="zh"?"提示惩罚":"Penalty"}</div>
              <div style={{color:"#ef4444",fontWeight:800,fontSize:18}}>+{hintPenalty}s</div>
            </div>
          </>
        )}
        {hintsUsed > 0 && (
          <>
            <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{lang==="zh"?"提示":"Hints"}</div>
              <div style={{color:"#a78bfa",fontWeight:800,fontSize:18}}>💡{hintsUsed}</div>
            </div>
          </>
        )}
        <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{lang==="zh"?"连续":lang==="fr"?"Serie":"Streak"}</div>
          <div style={{color:"#f472b6",fontWeight:800,fontSize:18}}>🔥{streakNow.count}</div>
        </div>
      </div>

      {/* Cards 2×2 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16,width:"fit-content"}}>
        {cards.map((card,i)=>{
          const inPool=numbers.some(n=>n.sourceId===card.id);
          return <PlayingCard key={card.id} card={card} used={!inPool} selected={false} animIdx={i} onClick={()=>{}}/>;
        })}
      </div>

      {/* Number pool */}
      <div style={{marginBottom:14,textAlign:"center"}}>
        <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>{t.availableNumbers}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          {numbers.map((n,i)=>(
            <div key={i} onClick={()=>handleNumberClick(i)} style={{
              width:54,height:54,borderRadius:12,
              background:selectedIdx===i?"#fef3c7":"rgba(255,255,255,0.08)",
              border:`2px solid ${selectedIdx===i?"#f59e0b":"rgba(255,255,255,0.15)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:18,fontWeight:900,
              color:selectedIdx===i?"#92400e":"white",
              cursor:"pointer",
              transform:selectedIdx===i?"scale(1.15)":"scale(1)",
              transition:"all 0.15s",
              boxShadow:selectedIdx===i?"0 4px 16px rgba(245,158,11,0.4)":"none",
              animation:"popIn 0.3s ease",
            }}>{n.label}</div>
          ))}
        </div>
      </div>

      {/* Operators */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",justifyContent:"center"}}>
        {DAILY_OPS.map(op=>(
          <OpBtn key={op} op={op} active={operator===op} onClick={()=>{
            if(op==="!"&&selectedIdx!==null){applyFactorial(selectedIdx);}
            else if(op==="√"&&selectedIdx!==null){applySqrt(selectedIdx);}
            else if(selectedIdx!==null){setOperator(o=>o===op?null:op);}
          }} disabled={false}/>
        ))}
      </div>

      {/* Steps log */}
      {steps.length>0&&(
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"10px 16px",marginBottom:12,width:"100%",maxWidth:360}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>{t.steps}</div>
          {steps.map((s,i)=>(
            <div key={i} style={{color:"#94a3b8",fontSize:13,marginBottom:3,animation:"fadeSlide 0.3s ease"}}>
              <span style={{color:"#475569",marginRight:6}}>{lang==="zh"?`第${i+1}步：`:`${lang==="fr"?"Etape":"Step"} ${i+1}:`}</span>{s.expr}
            </div>
          ))}
        </div>
      )}

      {/* Instruction nudges */}
      {selectedIdx===null&&<div style={{color:"#334155",fontSize:11,textAlign:"center",marginBottom:10}}>{lang==="zh"?"点击数字 → 选择运算符 → 点击另一个数字":lang==="fr"?"Appuyez nombre → operateur → nombre":"Tap a number → tap an operator → tap another number"}</div>}
      {selectedIdx!==null&&operator===null&&<div style={{color:"#f59e0b",fontSize:12,textAlign:"center",marginBottom:10}}>{lang==="zh"?"请选择运算符 ↑":lang==="fr"?"Choisir un operateur ↑":"Now pick an operator ↑"}</div>}
      {selectedIdx!==null&&operator!==null&&<div style={{color:"#34d399",fontSize:12,textAlign:"center",marginBottom:10}}>{lang==="zh"?"请点击第二个数字 ↑":lang==="fr"?"Appuyez le 2eme nombre ↑":"Now tap the second number ↑"}</div>}

      {/* Message */}
      {message.text&&<div style={{background:`${msgColor}18`,border:`1px solid ${msgColor}`,borderRadius:12,padding:"9px 18px",marginBottom:12,color:msgColor,fontSize:14,fontWeight:700,textAlign:"center",animation:"popIn 0.3s ease",maxWidth:340}}>{message.text}</div>}

      {/* Hint display */}
      {showHintSteps&&(
        <div style={{background:"rgba(167,139,250,0.12)",border:"1px solid #a78bfa",borderRadius:12,padding:"10px 16px",marginBottom:10,color:"#a78bfa",fontSize:13,textAlign:"center",maxWidth:340,width:"100%"}}>
          <div style={{fontWeight:700,marginBottom:6,fontSize:12,color:"#c4b5fd",textTransform:"uppercase",letterSpacing:1}}>
            💡 {lang==="zh"?"逐步提示":"Step-by-step hint"} ({showHintSteps.revealed}/{showHintSteps.steps.length})
          </div>
          {showHintSteps.steps.slice(0,showHintSteps.revealed).map((s,i)=>(
            <div key={i} style={{marginBottom:4,padding:"5px 10px",background:"rgba(167,139,250,0.1)",borderRadius:8,color:"#e9d5ff",fontSize:14,fontWeight:700,animation:"popIn 0.25s ease"}}>
              <span style={{color:"#7c3aed",fontSize:11,marginRight:6}}>{lang==="zh"?`第${i+1}步`:`Step ${i+1}`}</span>{s.expr}
            </div>
          ))}
          {showHintSteps.revealed < showHintSteps.steps.length && <div style={{color:"#6d28d9",fontSize:11,marginTop:6}}>{lang==="zh"?`再点一次提示查看第${showHintSteps.revealed+1}步`:`Tap hint for step ${showHintSteps.revealed+1}`}</div>}
        </div>
      )}

      {/* Action buttons */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:8}}>
        <button onClick={handleReset} style={{background:"transparent",border:"2px solid #64748b",borderRadius:10,padding:"7px 16px",color:"#64748b",fontSize:13,fontWeight:700,cursor:"pointer"}}>{t.reset}</button>
        <button onClick={handleHint} style={{background:"transparent",border:"2px solid #a78bfa",borderRadius:10,padding:"7px 16px",color:"#a78bfa",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {showHintSteps && showHintSteps.revealed < showHintSteps.steps.length
            ? `💡 ${lang==="zh"?"下一步":lang==="fr"?"Suivant":"Next"} ${showHintSteps.revealed+1}/${showHintSteps.steps.length} (+30s)`
            : `💡 ${lang==="zh"?"提示 (+30秒)":lang==="fr"?"Indice (+30s)":"Hint (+30s)"}`}
        </button>
      </div>

      <p style={{color:"#1e3a5f",fontSize:11,marginTop:8,textAlign:"center"}}>
        {lang==="zh"?"每天同一题目，全球玩家一起挑战！":lang==="fr"?"Meme puzzle pour tous aujourd'hui · Mondial":"Same puzzle for everyone today · Worldwide"}
      </p>
      <Analytics/>
    </div>
  );
}

export default function App() {
  const [screen,setScreen]=useState("setup"); // setup | game | roundEnd | gameEnd | junior | daily | battle | stats
  const [config,setConfig]=useState(null);
  const [lang,setLang]=useState("en");
  const [showIntro,setShowIntro]=useState(()=>!loadIntroDone());
  const [showHelp,setShowHelp]=useState(false);
  const [unlocked,setUnlocked]=useState(()=>({Easy:true,Medium:true,Hard:loadUnlocked().Hard||false}));
  const [justUnlockedHard,setJustUnlockedHard]=useState(false);
  const justUnlockedHardRef=useRef(false);
  const showMediumNudgeRef=useRef(false);
  const autoAdvanceRef=useRef(null);
  const [leaderboard,setLeaderboard]=useState(()=>loadLeaderboard());
  const [showLeaderboard,setShowLeaderboard]=useState(false);
  const [badges,setBadges]=useState(()=>loadBadges());
  const [newBadges,setNewBadges]=useState([]);
  const [personalBest,setPersonalBest]=useState(()=>loadPersonalBest());
  const [showConfetti,setShowConfetti]=useState(false);
  const [totalSolves,setTotalSolves]=useState(0);
  const [skipUsed,setSkipUsed]=useState(false);
  const [showMediumNudge,setShowMediumNudge]=useState(false);
  const [skipInstructions,setSkipInstructions]=useState(false);
  const [showDiffMenu,setShowDiffMenu]=useState(false);
  const [paused,setPaused]=useState(false);
  const [preSelectDiff,setPreSelectDiff]=useState(null);
  const [tutorialStep,setTutorialStep]=useState(-1); // -1 = not in tutorial
  const [showLeaveConfirm,setShowLeaveConfirm]=useState(false);

  // players: [{name, score, streak, hintsUsed}]
  const [players,setPlayers]=useState([]);
  const [currentPlayer,setCurrentPlayer]=useState(0);
  const [round,setRound]=useState(1);
  const ROUNDS_PER_PLAYER = config?.rounds || 5;

  // card/game state
  const [deck,setDeck]=useState([]);
  const [cards,setCards]=useState([]); // [{suit,val,id}] – original 4 cards
  const [numbers,setNumbers]=useState([]); // working pool: [{value, label, sourceId}]
  const [selectedIdx,setSelectedIdx]=useState(null); // index in numbers[]
  const [operator,setOperator]=useState(null);
  const [steps,setSteps]=useState([]); // [{expr, result}]
  const [timeLeft,setTimeLeft]=useState(60);
  const [extensions,setExtensions]=useState(2);
  const [extFlash,setExtFlash]=useState(false);
  const [message,setMessage]=useState({text:"",type:""});
  const [showHint,setShowHint]=useState(null); // {steps:[...], revealed:N} or null
  const [autoHint,setAutoHint]=useState(null);
  const autoHintRef=useRef(null);
  const [difficulty,setDifficulty]=useState("Medium");
  const [timerEnabled,setTimerEnabled]=useState(true); // solo can toggle per-puzzle
  const timerRef=useRef(null);
  const [turnOver,setTurnOver]=useState(false);

  function startGame(cfg) {
    setConfig(cfg);
    setDifficulty(cfg.difficulty);
    setTimerEnabled(cfg.soloTimer!==false);
    setPlayers(cfg.names.map(name=>({name,score:0,streak:0,hintsUsed:0})));
    setCurrentPlayer(0);
    setRound(1);
    setScreen("game");
    const newDeck=generateDeck();
    setDeck(newDeck);
    setExtensions(2);
    setTurnOver(false);
    setSkipUsed(false);
    setTotalSolves(0);
    setShowMediumNudge(false);
    showMediumNudgeRef.current=false;
    setPaused(false);

    // First-ever visit: load tutorial puzzle instead of random cards
    const isFirstTime = !loadTutorialDone();
    if (isFirstTime && cfg.numPlayers===1) {
      setCards(TUTORIAL_CARDS);
      setNumbers(TUTORIAL_CARDS.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
      setSelectedIdx(null);
      setOperator(null);
      setSteps([]);
      setMessage({text:"",type:""});
      setShowHint(null);
      setTimeLeft(DIFFICULTY[cfg.difficulty].timeLimit);
      setAutoHint(null);
      setTutorialStep(0);
    } else {
      dealCards(newDeck, cfg.difficulty);
      setTutorialStep(-1);
    }
  }

  function dealCards(d=deck, diff=difficulty) {
    const maxCard=DIFFICULTY[diff].maxCard;
    let pool=[...d].filter(card=>FACE[card.val]<=maxCard);
    if (pool.length<4){pool=generateDeck().filter(card=>FACE[card.val]<=maxCard);}
    let drawn, attempts=0;
    const needWholeOnly = diff==="Easy";
    do {
      pool=pool.sort(()=>Math.random()-0.5);
      drawn=pool.slice(0,4);
      attempts++;
      if (attempts>80) break; // fallback to any solvable if no whole-only found
    } while (needWholeOnly
      ? !solveWholeOnly(drawn.map(c=>FACE[c.val]))
      : !hasSolution(drawn));
    setDeck(pool.slice(4));
    setCards(drawn);
    setNumbers(drawn.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
    setSelectedIdx(null);
    setOperator(null);
    setSteps([]);
    setMessage({text:"",type:""});
    setShowHint(null); // reset step-by-step hint
    setTimeLeft(DIFFICULTY[diff].timeLimit);
    setTurnOver(false);
    setAutoHint(null);
    if (autoHintRef.current) clearTimeout(autoHintRef.current);
    // keep timerEnabled as-is — player chose it per puzzle
  }

  const isSolo = config?.numPlayers===1;

  // Auto-hint after 30s on Easy mode
  useEffect(()=>{
    if (screen!=="game"||turnOver||difficulty!=="Easy"||autoHint) return;
    if (autoHintRef.current) clearTimeout(autoHintRef.current);
    autoHintRef.current=setTimeout(()=>{
      const hint=getFirstStep(cards);
      if (hint) setAutoHint(hint);
    },30000);
    return ()=>{ if(autoHintRef.current) clearTimeout(autoHintRef.current); };
  },[screen,turnOver,difficulty,cards,autoHint]);
  const timerActive = (!isSolo || timerEnabled) && tutorialStep<0; // no timer during tutorial

  // timer — active in multiplayer always, solo only when timerEnabled
  useEffect(()=>{
    if (screen!=="game"||turnOver||!timerActive||paused) return;
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if (t<=1){ clearInterval(timerRef.current); handleTimeUp(); return 0; }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[screen,turnOver,currentPlayer,round,timerActive,paused]);

  function handleTimeUp() {
    setMessage({text:t.timeUp,type:"bad"});
    setTurnOver(true);
  }

  function handleNumberClick(idx) {
    if (turnOver) return;
    // In tutorial: only allow tapping the highlighted number
    if (tutorialStep>=0) {
      const step=TUTORIAL_STEPS[tutorialStep];
      if (step.type!=="number") return; // waiting for op tap
      if (numbers[idx].label!==step.target) {
        setMessage({text:lang==="zh"?`👆 请点击  ${step.target}  ！`:`👆 ${lang==="fr"?"Appuie d'abord sur":"Tap the"}  ${step.target}  ${lang==="fr"?"!":"first!"}`,type:"bad"});
        return;
      }
      // Correct number tapped
      if (!step.isSecond) {
        // First number in a pair — just select it
        setSelectedIdx(idx);
        setOperator(null);
        setMessage({text:"",type:""});
        setTutorialStep(s=>s+1);
      } else {
        // Second number in a pair — trigger the actual calculation
        setTutorialStep(s=>s+1);
        applyOp(selectedIdx, operator, idx);
      }
      return;
    }
    if (selectedIdx===null) {
      setSelectedIdx(idx);
      setOperator(null);
      setMessage({text:"",type:""});
    } else if (selectedIdx===idx) {
      setSelectedIdx(null);
      setOperator(null);
    } else if (operator==="!") {
      applyFactorial(selectedIdx);
    } else if (operator==="√") {
      applySqrt(selectedIdx);
    } else if (operator!==null) {
      applyOp(selectedIdx, operator, idx);
    }
  }

  function applyOp(iA, op, iB) {
    const a=numbers[iA].value, b=numbers[iB].value;
    const la=numbers[iA].label, lb=numbers[iB].label;
    let result;
    if (op==="+") result=a+b;
    else if (op==="−") result=a-b;
    else if (op==="×") result=a*b;
    else if (op==="÷") {
      if (Math.abs(b)<1e-9){setMessage({text:t.cantDivideZero,type:"bad"});return;}
      result=a/b;
    } else if (op==="^") result=Math.pow(a,b);
    else if (op==="ʸ√") {
      // y-th root: a^(1/b) — first number is base, second is root degree
      if (Math.abs(b)<1e-9){setMessage({text:lang==="zh"?"根指数不能为零！":"Root degree can't be zero!",type:"bad"});return;}
      if (a<0) {
        // Only allow odd integer root degrees for negative bases
        if (!Number.isInteger(b)||b%2===0) {
          setMessage({text:lang==="zh"?"负数只能开奇数次方根！":"Negative base only allows odd integer root degrees!",type:"bad"});return;
        }
        result=-(Math.pow(-a,1/b));
      } else {
        result=Math.pow(a,1/b);
      }
    }


    const expr=`${la} ${op} ${lb} = ${fmt(result)}`;
    const newStep={expr,result};
    setSteps(s=>[...s,newStep]);

    // Remove the two used numbers, add result
    const newNums=numbers.filter((_,i)=>i!==iA&&i!==iB);
    newNums.push({value:result,label:fmt(result),sourceId:`step_${steps.length+1}`});
    setNumbers(newNums);
    setSelectedIdx(null);
    setOperator(null);

    // check win: if only 1 number left
    if (newNums.length===1) {
      if (Math.abs(result-24)<1e-9) {
        handleSolve();
      } else {
        setMessage({text:t.notTwentyFour(fmt(result)),type:"bad"});
      }
    } else {
      setMessage({text:`✓ ${expr}`,type:"step"});
    }
  }

  function handleSolve() {
    clearInterval(timerRef.current);
    // Mark tutorial complete
    if (tutorialStep>=0) {
      saveTutorialDone();
      setTutorialStep(-1);
    }
    const diffCfg=DIFFICULTY[difficulty];
    const speedBonus=timerActive?Math.max(0,Math.floor(timeLeft/5)):0;
    const pts=diffCfg.pointsPerSolve+speedBonus;
    const newStreak=players[currentPlayer].streak+1;
    const newScore=players[currentPlayer].score+pts;
    const newTotalSolves=totalSolves+1;
    setTotalSolves(newTotalSolves);
    setPlayers(ps=>{
      const next=[...ps];
      next[currentPlayer]={...next[currentPlayer],score:newScore,streak:newStreak};
      return next;
    });

    // Confetti!
    setShowConfetti(true);
    setTimeout(()=>setShowConfetti(false),2500);

    // Personal best
    const pbKey=difficulty;
    const currentPB=personalBest[pbKey]||0;
    if (newScore>currentPB) {
      const newPB={...personalBest,[pbKey]:newScore};
      setPersonalBest(newPB);
      savePersonalBest(newPB);
    }

    // Check badges
    const totalRounds=config.numPlayers*ROUNDS_PER_PLAYER;
    const currentTurn=(round-1)*config.numPlayers+currentPlayer;
    const earned=checkBadges(badges,{
      totalSolves:newTotalSolves, streak:newStreak, timeLeft,
      difficulty, hintUsed:players[currentPlayer].hintsUsed>0,
      skipUsed, score:newScore, totalRounds, solvedRounds:newTotalSolves,
    });
    if (earned.length>0) {
      const allBadges=[...badges,...earned];
      setBadges(allBadges);
      saveBadges(allBadges);
      setNewBadges(earned);
      setTimeout(()=>setNewBadges([]),4000);
      if (earned.includes("easy_grad")) {
        setShowMediumNudge(true);
        showMediumNudgeRef.current=true;
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      }
    }

    const newLevel=Math.floor(newScore/10)+1;
    const prevLevel=Math.floor(players[currentPlayer].score/10)+1;
    const levelUpMsg=newLevel>prevLevel?` 🆙 ${lang==="zh"?`升至等级${newLevel}`:`${lang==="fr"?"Niveau":"Level"} ${newLevel}!`}`:"";
    setMessage({text:t.winMsg(pts,timerActive?speedBonus:0)+levelUpMsg,type:"win"});
    setTurnOver(true);
    // Suggest Medium when Easy score reaches 40pts
    if (difficulty==="Easy" && newScore>=80 && !showMediumNudge) {
      setShowMediumNudge(true);
      showMediumNudgeRef.current=true;
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    }

    // Check Hard unlock
    if (difficulty==="Medium" && newScore>=LEVEL_UP_SCORE.Medium && !unlocked.Hard) {
      const newUnlocked={...unlocked,Hard:true};
      setUnlocked(newUnlocked);
      saveUnlocked(newUnlocked);
      setJustUnlockedHard(true);
      justUnlockedHardRef.current=true;
    }
    // Auto-advance to next turn after 2 seconds
    // Skip if any nudge/unlock message is showing — let player choose
    autoAdvanceRef.current = setTimeout(()=>{
      if (!justUnlockedHardRef.current && !showMediumNudgeRef.current) {
        handleNextTurn();
      }
    }, 2000);
  }

  function applySqrt(idx) {
    const a=numbers[idx].value;
    if (a < 0) {
      setMessage({text:lang==="zh"?"不能对负数开方！":"Can't take sqrt of negative number!",type:"bad"});
      setSelectedIdx(null); setOperator(null); return;
    }
    const result=Math.sqrt(a);
    const expr=`√${fmt(a)} = ${fmt(result)}`;
    setSteps(s=>[...s,{expr,result}]);
    const newNums=numbers.filter((_,i)=>i!==idx);
    newNums.push({value:result,label:fmt(result),sourceId:`step_${steps.length+1}`});
    setNumbers(newNums);
    setSelectedIdx(null); setOperator(null);
    if (newNums.length===1) {
      if (Math.abs(result-24)<1e-9) handleSolve();
      else setMessage({text:t.notTwentyFour(fmt(result)),type:"bad"});
    } else {
      setMessage({text:`✓ ${expr}`,type:"step"});
    }
  }

  function applyFactorial(idx) {
    const a = numbers[idx].value;
    // Only allow factorial on non-negative integers up to 7 (7!=5040 is already huge)
    if (!Number.isInteger(a) || a < 0 || a > 7) {
      setMessage({text: lang==="zh"?`${fmt(a)}! 超出范围 (只能用 0-7)`:`${fmt(a)}! is out of range (0–7 only)`, type:"bad"});
      setSelectedIdx(null);
      setOperator(null);
      return;
    }
    let result = 1;
    for (let i = 2; i <= a; i++) result *= i;
    const expr = `${fmt(a)}! = ${fmt(result)}`;
    setSteps(s=>[...s, {expr, result}]);
    const newNums = numbers.filter((_,i)=>i!==idx);
    newNums.push({value:result, label:fmt(result), sourceId:`step_${steps.length+1}`});
    setNumbers(newNums);
    setSelectedIdx(null);
    setOperator(null);
    if (newNums.length===1) {
      if (Math.abs(result-24)<1e-9) handleSolve();
      else setMessage({text: t.notTwentyFour(fmt(result)), type:"bad"});
    } else {
      setMessage({text:`✓ ${expr}`, type:"step"});
    }
  }

  function handleReset() {
    setNumbers(cards.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
    setSelectedIdx(null);
    setOperator(null);
    setSteps([]);
    setMessage({text:"",type:""});
    setShowHint(null);
    setAutoHint(null);
    if (autoHintRef.current) clearTimeout(autoHintRef.current);
  }

  function handleHint() {
    if (difficulty === "Easy") {
      // Easy: show full solution expression (existing behaviour via getFirstStep auto-hint)
      // Manual hint on Easy shows the full answer path
      const steps = getHintSteps(numbers);
      const fullExpr = steps ? steps.map(s => s.expr).join(" → ") : null;
      setShowHint({steps: steps||[], revealed: steps ? steps.length : 0});
      setPlayers(ps=>{
        const next=[...ps];
        next[currentPlayer]={...next[currentPlayer],hintsUsed:next[currentPlayer].hintsUsed+1};
        return next;
      });
    } else {
      // Medium/Hard: reveal one step at a time
      if (!showHint) {
        // First tap: compute steps from current working numbers, reveal step 1
        const steps = getHintSteps(numbers);
        setShowHint({steps: steps||[], revealed: 1});
      } else if (showHint.revealed < showHint.steps.length) {
        // Subsequent taps: reveal next step
        setShowHint(h => ({...h, revealed: h.revealed + 1}));
      }
      // Each tap costs a hint
      setPlayers(ps=>{
        const next=[...ps];
        next[currentPlayer]={...next[currentPlayer],hintsUsed:next[currentPlayer].hintsUsed+1};
        return next;
      });
    }
  }

  function handleExtend() {
    if (extensions<=0||turnOver) return;
    setExtensions(e=>e-1);
    setTimeLeft(t=>t+30);
    setExtFlash(true);
    setTimeout(()=>setExtFlash(false),700);
  }

  function handleSkipTrack() {
    setSkipUsed(true);
    handleNextTurn();
  }

  function handleNextTurn() {
    // Advance to next player or next round
    const totalTurns=config.numPlayers*ROUNDS_PER_PLAYER;
    const currentTurn=(round-1)*config.numPlayers+currentPlayer;
    if (currentTurn+1>=totalTurns) {
      setScreen("gameEnd");
      return;
    }
    const nextPlayer=(currentPlayer+1)%config.numPlayers;
    const nextRound=nextPlayer===0?round+1:round;
    setCurrentPlayer(nextPlayer);
    setRound(nextRound);
    setExtensions(2);
    dealCards(deck, difficulty);
  }

  const cp=players[currentPlayer]||{name:"",score:0,streak:0};
  const t=T[lang];
  const msgColor={win:"#34d399",bad:"#ef4444",step:"#f6d365","":"#94a3b8"}[message.type]||"#94a3b8";

  if (showIntro) return <IntroDemoModal lang={lang} onDone={()=>setShowIntro(false)}/>;

  if (screen==="setup") return <SetupScreen onStart={startGame} onJunior={()=>setScreen("junior")} onDaily={()=>setScreen("daily")} onBattle={()=>setScreen("battle")} onStats={()=>setScreen("stats")} lang={lang} setLang={setLang}
    unlocked={unlocked} leaderboard={leaderboard} setLeaderboard={setLeaderboard}
    autoSelectHard={justUnlockedHard} setJustUnlockedHard={setJustUnlockedHard}
    badges={badges} personalBest={personalBest}
    skipInstructions={skipInstructions} preSelectDiff={preSelectDiff}/>;

  if (screen==="junior") return <JuniorScreen lang={lang} setLang={setLang} onBack={()=>setScreen("setup")}/>;

  if (screen==="daily") return <DailyChallengeScreen lang={lang} setLang={setLang} onBack={()=>setScreen("setup")}/>;

  if (screen==="battle") return <BattleScreen lang={lang} setLang={setLang} onBack={()=>setScreen("setup")}/>

  if (screen==="stats") return <StatsScreen lang={lang} setLang={setLang} onBack={()=>setScreen("setup")}/>

  if (screen==="gameEnd") return (
    <GameEnd players={players} onRestart={()=>{setSkipInstructions(false);setPreSelectDiff(null);setScreen("setup");}} onPlayAgain={()=>{ setSkipInstructions(true); setPreSelectDiff(difficulty); setScreen("setup"); }} difficulty={difficulty} lang={lang} setLang={setLang}
      leaderboard={leaderboard} setLeaderboard={setLeaderboard} badges={badges}
      onKeepPlaying={()=>{ dealCards(deck, difficulty); setRound(1); setCurrentPlayer(0); setScreen("game"); setPlayers(ps=>ps.map(p=>({...p,score:0,streak:0,hintsUsed:0}))); }}/>
  );

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      display:"flex",flexDirection:"column",alignItems:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:"16px 12px",
      overflowY:"auto",
      animation:"fadeInScreen 0.3s ease",
    }}>
      <style>{`
        @keyframes cardDeal{from{opacity:0;transform:translateY(-30px) scale(0.85)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes extFlash{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
        @keyframes badgeSlide{0%{transform:translateX(120%);opacity:0}15%{transform:translateX(0);opacity:1}85%{transform:translateX(0);opacity:1}100%{transform:translateX(120%);opacity:0}}
        @keyframes tutPulse{0%,100%{box-shadow:0 0 0 3px rgba(96,165,250,0.4)}50%{box-shadow:0 0 0 6px rgba(96,165,250,0.15)}}
      `}</style>

      {/* Confetti */}
      {showConfetti&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>
          {Array.from({length:40}).map((_,i)=>{
            const colors=["#f6d365","#fda085","#f472b6","#34d399","#60a5fa","#a78bfa","#fb923c"];
            const color=colors[i%colors.length];
            const left=Math.random()*100;
            const delay=Math.random()*0.8;
            const size=6+Math.random()*8;
            const duration=1.5+Math.random()*1;
            return (
              <div key={i} style={{
                position:"absolute",top:"-20px",
                left:`${left}%`,
                width:size,height:size,
                background:color,
                borderRadius:Math.random()>0.5?"50%":"2px",
                animation:`confettiFall ${duration}s ease-in ${delay}s forwards`,
              }}/>
            );
          })}
        </div>
      )}

      {/* New badge notifications */}
      {newBadges.map((id,i)=>{
        const badge=BADGES.find(b=>b.id===id);
        if (!badge) return null;
        return (
          <div key={id} style={{
            position:"fixed",top:`${70+i*70}px`,right:16,zIndex:1000,
            background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid #f6d365",borderRadius:14,
            padding:"10px 16px",minWidth:200,
            animation:"badgeSlide 4s ease forwards",
            boxShadow:"0 4px 20px rgba(246,211,101,0.3)",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:28}}>{badge.icon}</div>
              <div>
                <div style={{color:"#f6d365",fontWeight:800,fontSize:13}}>
                  {lang==="zh"?"新成就解锁！":lang==="fr"?"Trophee debloque !":"Badge Unlocked!"}
                </div>
                <div style={{color:"white",fontWeight:700,fontSize:14}}>
                  {lang==="zh"?badge.zh:lang==="fr"?(badge.fr||badge.en):badge.en}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Title */}
      <h1 style={{
        fontSize:34,fontWeight:900,margin:"0 0 2px",letterSpacing:-1,
        background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmer 3s linear infinite",
      }}>Game24<sup style={{fontSize:"0.48em",WebkitTextFillColor:"#fda085",color:"#fda085",position:"relative",top:"-0.5em",marginLeft:2}}>&trade;</sup></h1>
      <div style={{display:"flex",gap:8,marginBottom:8,justifyContent:"center"}}>
        <LangSwitcher lang={lang} setLang={setLang}/>
        <button onClick={()=>setShowHelp(true)} style={{
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:16,padding:"3px 12px",color:"#64748b",fontSize:12,cursor:"pointer",
        }}>❓</button>
        <button onClick={()=>setPaused(p=>!p)} style={{
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:16,padding:"3px 12px",color:"#64748b",fontSize:12,cursor:"pointer",
        }}>{paused?"▶":"⏸"}</button>
        <button onClick={()=>setShowLeaveConfirm(true)} style={{
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:16,padding:"3px 12px",color:"#64748b",fontSize:12,cursor:"pointer",
        }}>🏠</button>
      </div>

      {/* Leave confirmation overlay */}
      {showLeaveConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}}>
          <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid rgba(255,255,255,0.15)",borderRadius:20,
            padding:28,maxWidth:320,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🏠</div>
            <h3 style={{color:"white",fontSize:18,fontWeight:900,margin:"0 0 8px"}}>
              {lang==="zh"?"离开游戏？":lang==="fr"?"Quitter le jeu ?":"Leave game?"}
            </h3>
            <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>
              {lang==="zh"?"当前进度将会丢失。":lang==="fr"?"Votre progression sera perdue.":"Your progress will be lost."}
            </p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowLeaveConfirm(false)} style={{
                flex:1,padding:"12px",borderRadius:12,
                border:"1px solid rgba(255,255,255,0.15)",background:"transparent",
                color:"#94a3b8",fontSize:14,fontWeight:700,cursor:"pointer",
              }}>{lang==="zh"?"取消":lang==="fr"?"Annuler":"Cancel"}</button>
              <button onClick={()=>{
                setShowLeaveConfirm(false);
                setPaused(false);
                setSkipInstructions(false);
                setPreSelectDiff(null);
                setScreen("setup");
              }} style={{
                flex:1,padding:"12px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,#ef4444,#b91c1c)",
                color:"white",fontSize:14,fontWeight:700,cursor:"pointer",
              }}>{lang==="zh"?"离开":lang==="fr"?"Oui, quitter":"Yes, leave"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {paused&&(
        <div style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          zIndex:500,
        }}>
          <div style={{fontSize:56,marginBottom:16}}>⏸</div>
          <h2 style={{color:"white",fontSize:28,fontWeight:900,margin:"0 0 8px"}}>
            {lang==="zh"?"游戏暂停":"Game Paused"}
          </h2>
          <p style={{color:"#64748b",marginBottom:28,fontSize:14}}>
            {lang==="zh"?"计时器已停止":"Timer is stopped"}
          </p>
          <button onClick={()=>setPaused(false)} style={{
            background:"linear-gradient(135deg,#f6d365,#fda085)",
            border:"none",borderRadius:14,padding:"14px 36px",
            color:"#1a1a2e",fontSize:16,fontWeight:800,cursor:"pointer",
            boxShadow:"0 4px 20px rgba(246,211,101,0.4)",marginBottom:12,
          }}>▶ {lang==="zh"?"继续游戏":lang==="fr"?"Reprendre":"Resume"}</button>
          <button onClick={()=>{setPaused(false);setSkipInstructions(false);setPreSelectDiff(null);setScreen("setup");}} style={{
            background:"transparent",border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:14,padding:"10px 28px",
            color:"#94a3b8",fontSize:14,fontWeight:700,cursor:"pointer",
          }}>🏠 {lang==="zh"?"返回主页":lang==="fr"?"Menu principal":"Main Menu"}</button>
        </div>
      )}

      {/* Help modal in game — tabbed: How to Play | Demo */}
      {showHelp&&(
        <HelpModal lang={lang} setLang={setLang} onClose={()=>setShowHelp(false)}
          onReplayTutorial={()=>{
            setShowHelp(false);
            setCards(TUTORIAL_CARDS);
            setNumbers(TUTORIAL_CARDS.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
            setSelectedIdx(null); setOperator(null); setSteps([]);
            setMessage({text:"",type:""}); setShowHint(null);
            setTurnOver(false); setTutorialStep(0);
          }}
        />
      )}

      {/* Player scoreboard */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",justifyContent:"center"}}>
        {players.map((p,i)=>(
          <div key={i} style={{
            background:i===currentPlayer?PLAYER_BG[i]:"rgba(255,255,255,0.03)",
            border:`2px solid ${i===currentPlayer?PLAYER_COLORS[i]:"rgba(255,255,255,0.08)"}`,
            borderRadius:12,padding:"6px 12px",textAlign:"center",minWidth:70,
            transition:"all 0.3s",
          }}>
            <div style={{fontSize:11,color:PLAYER_COLORS[i],fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>
              {i===currentPlayer?"▶ ":""}{p.name}
            </div>
            <div style={{fontSize:20,fontWeight:900,color:"white"}}>{p.score}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>
              {lang==="zh"?"等级":lang==="fr"?"Niveau":"Level"} {Math.floor(p.score/10)+1}
            </div>
            {p.streak>1&&<div style={{fontSize:10,color:"#f472b6"}}>🔥{p.streak}</div>}
          </div>
        ))}
      </div>

      {/* Round + timer bar */}
      <div style={{
        display:"flex",alignItems:"center",gap:16,marginBottom:14,
        background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",
        borderRadius:14,padding:"8px 18px",flexWrap:"wrap",justifyContent:"center",
      }}>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{t.round}</div>
          <div style={{color:"white",fontWeight:800,fontSize:18}}>{round}/{ROUNDS_PER_PLAYER}</div>
        </div>
        <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
        {isSolo ? (
          <>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{t.time}</div>
              <div style={{
                fontWeight:900,fontSize:22,
                color:!timerEnabled?"#a78bfa":timeLeft<=10?"#ef4444":timeLeft<=20?"#f59e0b":"#34d399",
                animation:timerEnabled&&timeLeft<=10?"pulse 0.7s infinite":"none",
              }}>{timerEnabled?`${timeLeft}s`:"∞"}</div>
            </div>
            <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
            <div style={{textAlign:"center"}}>
              <button onClick={()=>{
                if (!turnOver){
                  setTimerEnabled(e=>{
                    // if turning on, also restart the timer cleanly
                    return !e;
                  });
                }
              }} style={{
                background:timerEnabled?"linear-gradient(135deg,#34d399,#059669)":"linear-gradient(135deg,#a78bfa,#7c3aed)",
                border:"none",borderRadius:8,padding:"4px 10px",
                color:"white",fontWeight:800,fontSize:11,cursor:turnOver?"not-allowed":"pointer",
                opacity:turnOver?0.5:1,
              }}>{timerEnabled?"⏱ On":"∞ Off"}</button>
              <div style={{color:"#475569",fontSize:10,marginTop:2}}>{timerEnabled?t.speedBonus:t.noBonus}</div>
            </div>
          </>
        ) : (
          <>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{t.time}</div>
              <div style={{
                fontWeight:900,fontSize:22,
                color:timeLeft<=10?"#ef4444":timeLeft<=20?"#f59e0b":"#34d399",
                animation:timeLeft<=10?"pulse 0.7s infinite":"none",
              }}>{timeLeft}s</div>
            </div>
            <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
            <div style={{textAlign:"center"}}>
              <button onClick={handleExtend} disabled={extensions<=0||turnOver} style={{
                background:extensions>0?"linear-gradient(135deg,#34d399,#059669)":"rgba(255,255,255,0.05)",
                border:"none",borderRadius:8,padding:"4px 10px",
                color:extensions>0?"white":"#334155",fontWeight:800,fontSize:12,
                cursor:extensions>0?"pointer":"not-allowed",
                animation:extFlash?"extFlash 0.5s ease":"none",
              }}>+30s</button>
              <div style={{color:"#475569",fontSize:10,marginTop:2}}>{extensions} left</div>
            </div>
          </>
        )}
        <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
        <div style={{textAlign:"center",position:"relative"}}>
          <button onClick={()=>setShowDiffMenu(d=>!d)} style={{
            background:"transparent",border:"none",cursor:"pointer",padding:"2px 4px",
          }}>
            <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{t.diff} ▾</div>
            <div style={{color:DIFFICULTY[difficulty].color,fontWeight:800,fontSize:13}}>{lang==="zh"?{Easy:"简单",Medium:"中等",Hard:"困难"}[difficulty]||difficulty:lang==="fr"?{Easy:"Facile",Medium:"Moyen",Hard:"Difficile"}[difficulty]||difficulty:difficulty}</div>
          </button>
          {showDiffMenu&&(
            <div style={{
              position:"absolute",top:"110%",right:0,zIndex:100,
              background:"#1e293b",border:"1px solid rgba(255,255,255,0.15)",
              borderRadius:12,padding:8,minWidth:140,
              boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
            }}>
              {Object.keys(DIFFICULTY).map(d=>{
                const isLocked=d==="Hard"&&!unlocked.Hard;
                return (
                  <button key={d} onClick={()=>{
                    if (isLocked) return;
                    setShowDiffMenu(false);
                    setSkipInstructions(true);
                    setScreen("setup");
                  }} style={{
                    display:"block",width:"100%",padding:"7px 12px",
                    background:d===difficulty?"rgba(255,255,255,0.08)":"transparent",
                    border:"none",borderRadius:8,
                    color:isLocked?"#334155":DIFFICULTY[d].color,
                    fontWeight:700,fontSize:13,cursor:isLocked?"not-allowed":"pointer",
                    textAlign:"left",marginBottom:2,
                  }}>
                    {isLocked?"🔒 ":""}{lang==="zh"?{Easy:"简单",Medium:"中等",Hard:"困难"}[d]||d:lang==="fr"?{Easy:"Facile",Medium:"Moyen",Hard:"Difficile"}[d]||d:d}
                    {d===difficulty?" ✓":""}
                  </button>
                );
              })}
              <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:6,paddingTop:6}}>
                <button onClick={()=>{setShowDiffMenu(false);setSkipInstructions(false);setScreen("setup");}} style={{
                  display:"block",width:"100%",padding:"7px 12px",
                  background:"transparent",border:"none",borderRadius:8,
                  color:"#94a3b8",fontWeight:600,fontSize:12,cursor:"pointer",textAlign:"left",
                }}>🏠 {lang==="zh"?"返回主页":lang==="fr"?"Menu principal":"Main Menu"}</button>
              </div>
            </div>
          )}
        </div>
        {personalBest[difficulty]>0&&(
          <>
            <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>
                {lang==="zh"?"最高分":"Best"}
              </div>
              <div style={{color:"#f6d365",fontWeight:800,fontSize:16}}>
                {personalBest[difficulty]}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Current player banner */}
      <div style={{
        color:PLAYER_COLORS[currentPlayer],fontSize:13,fontWeight:700,
        marginBottom:12,letterSpacing:1,
        textTransform:"uppercase",
      }}>
        {t.yourTurn(cp.name)}
      </div>

      {/* Cards — always 2×2 grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16,width:"fit-content"}}>
        {cards.map((card,i)=>{
          const inPool=numbers.some(n=>n.sourceId===card.id);
          return (
            <PlayingCard key={card.id} card={card} used={!inPool}
              selected={false} animIdx={i}
              onClick={()=>{}}
            />
          );
        })}
      </div>

      {/* Tutorial bubble */}
      {tutorialStep>=0&&tutorialStep<TUTORIAL_STEPS.length&&(
        <div style={{
          background:"linear-gradient(135deg,#1e3a5f,#0f2744)",
          border:"2px solid #60a5fa",borderRadius:16,
          padding:"12px 20px",marginBottom:12,
          textAlign:"center",maxWidth:320,width:"100%",
          animation:"popIn 0.3s ease",
          boxShadow:"0 0 0 4px rgba(96,165,250,0.15)",
        }}>
          <div style={{fontSize:13,color:"white",fontWeight:700,lineHeight:1.6}}>
            {lang==="zh"?TUTORIAL_STEPS[tutorialStep].bubbleZh:lang==="fr"?(TUTORIAL_STEPS[tutorialStep].bubbleFr||TUTORIAL_STEPS[tutorialStep].bubble):TUTORIAL_STEPS[tutorialStep].bubble}
          </div>
          <div style={{marginTop:8,display:"flex",gap:4,justifyContent:"center"}}>
            {TUTORIAL_STEPS.map((_,i)=>(
              <div key={i} style={{
                width:6,height:6,borderRadius:"50%",
                background:i<tutorialStep?"#34d399":i===tutorialStep?"#60a5fa":"rgba(255,255,255,0.15)",
                transition:"all 0.3s",
              }}/>
            ))}
          </div>
          <button onClick={()=>{saveTutorialDone();setTutorialStep(-1);dealCards(deck,difficulty);}} style={{
            marginTop:10,background:"transparent",border:"1px solid rgba(96,165,250,0.3)",
            borderRadius:8,padding:"4px 12px",color:"#64748b",fontSize:11,cursor:"pointer",
          }}>{lang==="zh"?"跳过教程":lang==="fr"?"Passer le tutoriel":"Skip tutorial"}</button>
        </div>
      )}

      {/* Working numbers pool */}
      <div style={{marginBottom:14,textAlign:"center"}}>
        <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>{t.availableNumbers}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          {numbers.map((n,i)=>{
            const isTutTarget = tutorialStep>=0
              && tutorialStep<TUTORIAL_STEPS.length
              && TUTORIAL_STEPS[tutorialStep].type==="number"
              && n.label===TUTORIAL_STEPS[tutorialStep].target;
            return (
            <div key={i} onClick={()=>handleNumberClick(i)} style={{
              width:54,height:54,borderRadius:12,
              background:selectedIdx===i?"#fef3c7":isTutTarget?"rgba(96,165,250,0.2)":"rgba(255,255,255,0.08)",
              border:`2px solid ${selectedIdx===i?"#f59e0b":isTutTarget?"#60a5fa":"rgba(255,255,255,0.15)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:18,fontWeight:900,
              color:selectedIdx===i?"#92400e":isTutTarget?"#93c5fd":"white",
              cursor:turnOver?"default":"pointer",
              transform:selectedIdx===i?"scale(1.15)":isTutTarget?"scale(1.12)":"scale(1)",
              transition:"all 0.15s",
              boxShadow:selectedIdx===i?"0 4px 16px rgba(245,158,11,0.4)":isTutTarget?"0 0 0 3px rgba(96,165,250,0.4), 0 4px 16px rgba(96,165,250,0.3)":"none",
              animation:isTutTarget?"popIn 0.3s ease":"popIn 0.3s ease",
            }}>{n.label}</div>
            );
          })}
        </div>
      </div>

      {/* Operators */}
      {!turnOver&&(
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",justifyContent:"center"}}>
          {["+","−","×","÷","^","√","ʸ√","!"].map(op=>{
            const allowed=DIFFICULTY[difficulty].ops.includes(op);
            const isTutTarget = tutorialStep>=0
              && tutorialStep<TUTORIAL_STEPS.length
              && TUTORIAL_STEPS[tutorialStep].type==="op"
              && op===TUTORIAL_STEPS[tutorialStep].target;
            return (
              <div key={op} style={{
                position:"relative",
                filter:isTutTarget?"drop-shadow(0 0 8px rgba(96,165,250,0.9))":"none",
                transform:isTutTarget?"scale(1.18)":"scale(1)",
                transition:"all 0.2s",
              }}>
                <OpBtn op={op} active={operator===op} onClick={()=>{
                  if (!allowed) return;
                  // In tutorial: only allow the highlighted operator
                  if (tutorialStep>=0) {
                    const step=TUTORIAL_STEPS[tutorialStep];
                    if (step.type!=="op") return;
                    if (op!==step.target) {
                      setMessage({text:lang==="zh"?`👆 请点击  ${step.target}  ！`:`👆 ${lang==="fr"?"Appuie sur":"Tap"}  ${step.target}  ${lang==="fr"?"maintenant !":"now!"}`,type:"bad"});
                      return;
                    }
                    setOperator(op);
                    setMessage({text:"",type:""});
                    setTutorialStep(s=>s+1);
                    return;
                  }
                  if (op==="!" && selectedIdx!==null) {
                    applyFactorial(selectedIdx);
                  } else if (op==="√" && selectedIdx!==null) {
                    applySqrt(selectedIdx);
                  } else if (selectedIdx!==null) {
                    setOperator(o=>o===op?null:op);
                  }
                }} disabled={!allowed}/>
                {!allowed&&(
                  <div style={{
                    position:"absolute",inset:0,borderRadius:"50%",
                    background:"rgba(0,0,0,0.55)",display:"flex",
                    alignItems:"center",justifyContent:"center",
                    fontSize:16,pointerEvents:"none",
                  }}>🔒</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Steps log */}
      {steps.length>0&&(
        <div style={{
          background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:12,padding:"10px 16px",marginBottom:12,width:"100%",maxWidth:360,
        }}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>{t.steps}</div>
          {steps.map((s,i)=>(
            <div key={i} style={{color:"#94a3b8",fontSize:13,marginBottom:3,animation:"fadeSlide 0.3s ease"}}>
              <span style={{color:"#475569",marginRight:6}}>{lang==="zh"?`第${i+1}步：`:`${lang==="fr"?"Etape":"Step"} ${i+1}:`}</span>{s.expr}
            </div>
          ))}
        </div>
      )}

      {/* Instruction when nothing selected */}
      {!turnOver&&selectedIdx===null&&(
        <div style={{color:"#334155",fontSize:11,textAlign:"center",marginBottom:10}}>
          Tap a number → tap an operator → tap another number
        </div>
      )}
      {!turnOver&&selectedIdx!==null&&operator===null&&(
        <div style={{color:"#f59e0b",fontSize:12,textAlign:"center",marginBottom:10}}>
          Now pick an operator ↑
        </div>
      )}
      {!turnOver&&selectedIdx!==null&&operator!==null&&(
        <div style={{color:"#34d399",fontSize:12,textAlign:"center",marginBottom:10}}>
          Now tap the second number ↑
        </div>
      )}

      {/* Message */}
      {message.text&&(
        <div style={{
          background:`${msgColor}18`,border:`1px solid ${msgColor}`,
          borderRadius:12,padding:"9px 18px",marginBottom:12,
          color:msgColor,fontSize:14,fontWeight:700,textAlign:"center",
          animation:"popIn 0.3s ease",maxWidth:340,
        }}>{message.text}</div>
      )}

      {/* Hint display */}
      {showHint&&showHint.steps&&(
        <div style={{
          background:"rgba(167,139,250,0.12)",border:"1px solid #a78bfa",
          borderRadius:12,padding:"10px 16px",marginBottom:10,
          color:"#a78bfa",fontSize:13,textAlign:"center",
          maxWidth:340,width:"100%",
        }}>
          {difficulty==="Easy"?(
            // Easy: show all steps at once
            <div>💡 {showHint.steps.map(s=>s.expr).join(" → ")} = 24</div>
          ):(
            // Medium/Hard: show steps one by one
            <div>
              <div style={{fontWeight:700,marginBottom:6,fontSize:12,color:"#c4b5fd",textTransform:"uppercase",letterSpacing:1}}>
                💡 {lang==="zh"?"逐步提示":"Step-by-step hint"} ({showHint.revealed}/{showHint.steps.length})
              </div>
              {showHint.steps.slice(0, showHint.revealed).map((s,i)=>(
                <div key={i} style={{
                  marginBottom:4,padding:"5px 10px",
                  background:"rgba(167,139,250,0.1)",borderRadius:8,
                  color:"#e9d5ff",fontSize:14,fontWeight:700,
                  animation:"popIn 0.25s ease",
                }}>
                  <span style={{color:"#7c3aed",fontSize:11,marginRight:6}}>
                    {lang==="zh"?`第${i+1}步`:`Step ${i+1}`}
                  </span>
                  {s.expr}
                </div>
              ))}
              {showHint.revealed < showHint.steps.length && (
                <div style={{color:"#6d28d9",fontSize:11,marginTop:6}}>
                  {lang==="zh"?`再点一次提示查看第${showHint.revealed+1}步`:`${lang==="fr"?"Indice suivant":"Tap hint again"} ${showHint.revealed+1}`}
                </div>
              )}
              {showHint.revealed === showHint.steps.length && (
                <div style={{color:"#34d399",fontSize:11,marginTop:6,fontWeight:700}}>
                  {lang==="zh"?"✓ 完整解法已显示":"✓ Full solution shown"}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {autoHint&&!showHint&&!turnOver&&(
        <div style={{
          background:"rgba(52,211,153,0.1)",border:"1px solid #34d399",
          borderRadius:12,padding:"10px 16px",marginBottom:10,
          color:"#34d399",fontSize:13,textAlign:"center",
          animation:"popIn 0.4s ease",
        }}>
          <div style={{fontWeight:700,marginBottom:2}}>
            {lang==="zh"?"💡 小提示 — 试试第一步：":"💡 Hint — try this first step:"}
          </div>
          <div style={{fontSize:15,fontWeight:800}}>{autoHint}</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:4}}>
            {lang==="zh"?"(30秒后自动显示)":"(auto-shown after 30 seconds)"}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!turnOver?(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:8}}>
          {[
            {label:t.reset, action:handleReset, color:"#64748b", disabled:false},
            {
              label: difficulty==="Easy"
                ? t.hint
                : showHint
                  ? (showHint.revealed < showHint.steps.length
                      ? `💡 ${lang==="zh"?"下一步":"Next"} ${showHint.revealed+1}/${showHint.steps.length}`
                      : `💡 ${lang==="zh"?"已全部显示":"All shown"}`)
                  : t.hint,
              action: (difficulty!=="Easy" && showHint && showHint.revealed>=showHint.steps.length)
                ? null : handleHint,
              color: (difficulty!=="Easy" && showHint && showHint.revealed>=showHint.steps.length)
                ? "#1e3a5f" : "#a78bfa",
              disabled: !!(difficulty!=="Easy" && showHint && showHint.revealed>=showHint.steps.length),
            },
            ...(isSolo?[{label:t.skip,action:handleSkipTrack,color:"#f472b6",disabled:false}]:[]),
          ].map(b=>(
            <button key={b.label} onClick={b.disabled?null:b.action} style={{
              background:"transparent",border:`2px solid ${b.color}`,
              borderRadius:10,padding:"7px 16px",color:b.color,
              fontSize:13,fontWeight:700,cursor:b.disabled?"not-allowed":"pointer",
              opacity:b.disabled?0.4:1,
            }}>{b.label}</button>
          ))}
        </div>
      ):(
        <>
          {justUnlockedHard&&(
            <div style={{
              background:"linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.05))",
              border:"2px solid #ef4444",borderRadius:16,
              padding:"12px 20px",marginBottom:12,textAlign:"center",
              animation:"popIn 0.5s ease",
            }}>
              <div style={{fontSize:28,marginBottom:4}}>🔓🔥</div>
              <div style={{color:"#ef4444",fontWeight:900,fontSize:16,marginBottom:4}}>
                {lang==="zh"?"困难模式已解锁！":lang==="fr"?"Mode Difficile debloque !":"Hard Mode Unlocked!"}
              </div>
              <div style={{color:"#94a3b8",fontSize:12}}>
                {lang==="zh"?"准备好迎接挑战了吗？":"Ready for the real challenge?"}
              </div>
            </div>
          )}

          {showMediumNudge&&!justUnlockedHard&&(
            <div style={{
              background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))",
              border:"2px solid #f59e0b",borderRadius:16,
              padding:"12px 20px",marginBottom:12,textAlign:"center",
              animation:"popIn 0.5s ease",
            }}>
              <div style={{fontSize:28,marginBottom:4}}>🌟⬆️</div>
              <div style={{color:"#f59e0b",fontWeight:900,fontSize:15,marginBottom:4}}>
                {lang==="zh"?"你做得很棒！准备好升级了吗？":"You're doing great! Ready for more?"}
              </div>
              <div style={{color:"#94a3b8",fontSize:12,marginBottom:10}}>
                {lang==="zh"?"试试中等难度，挑战更多运算！":lang==="fr"?"Essayez le mode Moyen !":"Try Medium mode for a bigger challenge!"}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
            {justUnlockedHard&&(
              <button onClick={()=>{
                setJustUnlockedHard(false);
                justUnlockedHardRef.current=false;
                setPreSelectDiff("Hard");
                setSkipInstructions(true);
                setScreen("setup");
              }} style={{
                background:"linear-gradient(135deg,#ef4444,#b91c1c)",
                border:"none",borderRadius:12,padding:"12px 20px",
                color:"white",fontSize:14,fontWeight:800,cursor:"pointer",
                boxShadow:"0 4px 20px rgba(239,68,68,0.4)",
                animation:"popIn 0.4s ease",
              }}>
                🔥 {lang==="zh"?"去玩困难模式！":lang==="fr"?"Jouer en mode Difficile !":"Play Hard Mode!"}
              </button>
            )}
            {showMediumNudge&&!justUnlockedHard&&(
              <button onClick={()=>{
                setShowMediumNudge(false);
                showMediumNudgeRef.current=false;
                setPaused(false);
                setSkipInstructions(true);
                setPreSelectDiff("Medium");
                setScreen("setup");
              }} style={{
                background:"linear-gradient(135deg,#f59e0b,#d97706)",
                border:"none",borderRadius:12,padding:"12px 20px",
                color:"white",fontSize:14,fontWeight:800,cursor:"pointer",
                boxShadow:"0 4px 20px rgba(245,158,11,0.4)",
                animation:"popIn 0.4s ease",
              }}>
                ⬆️ {lang==="zh"?"试试中等难度！":lang==="fr"?"Essayez le mode Moyen !":"Try Medium Mode!"}
              </button>
            )}
            <button onClick={handleNextTurn} style={{
              background:"linear-gradient(135deg,#f6d365,#fda085)",
              border:"none",borderRadius:12,padding:"12px 20px",
              color:"#1a1a2e",fontSize:14,fontWeight:800,cursor:"pointer",
              boxShadow:"0 4px 20px rgba(246,211,101,0.4)",marginTop:4,
              animation:"popIn 0.4s ease",
            }}>
              {((round-1)*config.numPlayers+currentPlayer+1)>=config.numPlayers*ROUNDS_PER_PLAYER
                ?t.seeResults
                :isSolo?t.nextPuzzle:t.nextPlayer(players[(currentPlayer+1)%config.numPlayers]?.name)}
            </button>
          </div>
        </>
      )}

      <p style={{color:"#1e293b",fontSize:10,marginTop:12,textAlign:"center"}}>
        {t.roundsPerPlayerNote(ROUNDS_PER_PLAYER)}
      </p>
      <Analytics />
    </div>
  );
}

// ── Game End screen ────────────────────────────────────────────────────────
function GameEnd({players,onRestart,onPlayAgain,onKeepPlaying,difficulty,lang,setLang,leaderboard,setLeaderboard,badges}) {
  const t=T[lang];
  const sorted=[...players].sort((a,b)=>b.score-a.score);
  const winner=sorted[0];
  const [sharing,setSharing]=useState(false);
  const shareCardRef=useRef(null);

  // Save all players to leaderboard on mount
  useState(()=>{
    const date=new Date().toLocaleDateString();
    const newEntries=[...leaderboard];
    players.forEach(p=>{
      if (p.score>0) newEntries.push({name:p.name,score:p.score,difficulty,streak:p.streak,date});
    });
    newEntries.sort((a,b)=>b.score-a.score);
    const top20=newEntries.slice(0,20);
    saveLeaderboard(top20);
    setLeaderboard(top20);
  });

  // Badges earned this session (approximate — show all unlocked badges)
  const earnedBadges = BADGES.filter(b=>badges.includes(b.id));

  async function handleShare() {
    setSharing(true);
    try {
      // Load html2canvas via script tag if not already loaded
      await new Promise((resolve, reject) => {
        if (window.html2canvas) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      const canvas = await window.html2canvas(shareCardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'game24-score.png', {type:'image/png'});
        if (navigator.share && navigator.canShare && navigator.canShare({files:[file]})) {
          await navigator.share({
            title: lang==="zh"?"我的24点成绩！":"My Game24 Score!",
            text: lang==="zh"?`我在24点游戏中得了${winner.score}分！来挑战我吧！`:`I scored ${winner.score} pts in Game24! Can you beat me?`,
            url: 'https://game24-taupe.vercel.app',
            files: [file],
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'game24-score.png';
          a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, 'image/png');
    } catch(e) {
      console.error(e);
      setSharing(false);
    }
  }

  const diffLabel = lang==="zh"?{Easy:"简单",Medium:"中等",Hard:"困难"}[difficulty]||difficulty:lang==="fr"?{Easy:"Facile",Medium:"Moyen",Hard:"Difficile"}[difficulty]||difficulty:difficulty;

  return (
    <div style={{
      minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:24,
    }}>
      <style>{`
        @keyframes trophy{0%,100%{transform:scale(1) rotate(-5deg)}50%{transform:scale(1.1) rotate(5deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      `}</style>
      <div style={{fontSize:56,animation:"trophy 1.5s ease infinite",marginBottom:8}}>🏆</div>
      <h2 style={{
        fontSize:32,fontWeight:900,margin:"0 0 4px",
        background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmer 2s linear infinite",
      }}>
        {players.length>1?t.wins(winner.name):t.gameOver}
      </h2>
      <p style={{color:"#64748b",marginBottom:12,fontSize:13}}>
        {diffLabel} {lang==="zh"?"模式":"mode"}
      </p>

      <div style={{width:"100%",maxWidth:340,marginBottom:24}}>
        {sorted.map((p,i)=>{
          const pi=players.indexOf(p);
          return (
            <div key={i} style={{
              display:"flex",alignItems:"center",gap:12,
              background:i===0?"rgba(246,211,101,0.12)":"rgba(255,255,255,0.04)",
              border:`1px solid ${i===0?"#f6d365":"rgba(255,255,255,0.08)"}`,
              borderRadius:14,padding:"12px 16px",marginBottom:8,
              animation:`fadeIn 0.4s ease ${i*0.1}s both`,
            }}>
              <div style={{fontSize:22,width:32,textAlign:"center"}}>
                {["🥇","🥈","🥉","4️⃣"][i]}
              </div>
              <div style={{flex:1}}>
                <div style={{color:PLAYER_COLORS[pi],fontWeight:700,fontSize:14}}>{p.name}</div>
                <div style={{color:"#64748b",fontSize:11}}>
                  {t.streak(p.streak)} · {t.hintsUsed(p.hintsUsed)}
                </div>
              </div>
              <div style={{color:"white",fontWeight:900,fontSize:22}}>{p.score}</div>
            </div>
          );
        })}
      </div>

      {/* Shareable card — hidden off-screen, captured by html2canvas */}
      <div ref={shareCardRef} style={{
        position:"fixed", left:"-9999px", top:0,
        width:380, background:"linear-gradient(135deg,#1a1a2e,#0f3460)",
        borderRadius:24, padding:28, fontFamily:"'Trebuchet MS',sans-serif",
        border:"2px solid rgba(246,211,101,0.5)",
        boxShadow:"0 0 40px rgba(246,211,101,0.15)",
      }}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:6}}>🃏</div>
          <div style={{fontSize:30,fontWeight:900,color:"#f6d365",letterSpacing:-1}}>
            {"Game 24 | 24点"}
          </div>
          <div style={{color:"#64748b",fontSize:12,marginTop:2}}>
            {lang==="zh"?"数学扑克牌游戏":"The Math Card Game"}
          </div>
        </div>

        {/* Divider */}
        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(246,211,101,0.5),transparent)",marginBottom:20}}/>

        {/* Big score hero */}
        <div style={{
          background:"linear-gradient(135deg,rgba(246,211,101,0.15),rgba(253,160,133,0.1))",
          borderRadius:16,padding:"20px 16px",marginBottom:16,
          border:"1px solid rgba(246,211,101,0.3)",textAlign:"center",
        }}>
          <div style={{color:"white",fontWeight:900,fontSize:20,marginBottom:12}}>
            👤 {winner.name}
          </div>
          <div style={{color:"#f6d365",fontWeight:900,fontSize:64,lineHeight:1,marginBottom:4}}>
            {winner.score}
          </div>
          <div style={{color:"#64748b",fontSize:13,marginBottom:12}}>
            {lang==="zh"?"分数":"points"}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <div style={{
              background:"rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 14px",
              textAlign:"center",
            }}>
              <div style={{color:"white",fontWeight:900,fontSize:20}}>{Math.floor(winner.score/10)+1}</div>
              <div style={{color:"#64748b",fontSize:10}}>{lang==="zh"?"等级":lang==="fr"?"Niveau":"Level"}</div>
            </div>
            <div style={{
              background:"rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 14px",
              textAlign:"center",
            }}>
              <div style={{color:"#f472b6",fontWeight:900,fontSize:20}}>🔥{winner.streak}</div>
              <div style={{color:"#64748b",fontSize:10}}>{lang==="zh"?"连胜":lang==="fr"?"Serie":"Streak"}</div>
            </div>
            <div style={{
              background:"rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 14px",
              textAlign:"center",
            }}>
              <div style={{color:DIFFICULTY[difficulty].color,fontWeight:900,fontSize:16,marginTop:2}}>{diffLabel}</div>
              <div style={{color:"#64748b",fontSize:10}}>{lang==="zh"?"难度":"Mode"}</div>
            </div>
          </div>
        </div>

        {/* Multiplayer scores */}
        {players.length>1&&(
          <div style={{marginBottom:16}}>
            {sorted.slice(1).map((p,i)=>(
              <div key={i} style={{
                display:"flex",justifyContent:"space-between",
                padding:"6px 12px",background:"rgba(255,255,255,0.04)",
                borderRadius:8,marginBottom:4,
              }}>
                <div style={{color:"#94a3b8",fontSize:13}}>{["🥈","🥉","4️⃣"][i]} {p.name}</div>
                <div style={{color:"#94a3b8",fontWeight:700,fontSize:13}}>{p.score}</div>
              </div>
            ))}
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
              {lang==="zh"?"成就徽章":"Badges Earned"}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {earnedBadges.map(b=>(
                <div key={b.id} style={{
                  background:"rgba(246,211,101,0.1)",border:"1px solid rgba(246,211,101,0.25)",
                  borderRadius:8,padding:"4px 8px",fontSize:12,color:"#f6d365",
                }}>{b.icon} {lang==="zh"?b.zh:lang==="fr"?(b.fr||b.en):b.en}</div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(246,211,101,0.5),transparent)",marginBottom:16}}/>

        {/* Challenge CTA — the social hook */}
        <div style={{
          background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",
          borderRadius:12,padding:"12px 16px",marginBottom:12,textAlign:"center",
        }}>
          <div style={{color:"#ef4444",fontWeight:900,fontSize:15,marginBottom:4}}>
            {lang==="zh"?"🔥 你能超过我吗？":"🔥 Think you can beat me?"}
          </div>
          <div style={{color:"#94a3b8",fontSize:12}}>
            {lang==="zh"?`挑战我的 ${winner.score} 分！`:`Challenge my score of ${winner.score} pts!`}
          </div>
        </div>

        {/* URL */}
        <div style={{textAlign:"center"}}>
          <div style={{color:"#f6d365",fontWeight:700,fontSize:13}}>
            🃏 game24-taupe.vercel.app
          </div>
          <div style={{color:"#334155",fontSize:10,marginTop:2}}>
            {lang==="zh"?"免费畅玩，无需下载":"Free to play · No download needed"}
          </div>
        </div>
      </div>

      {/* Level up suggestion */}
      {players.length===1&&LEVEL_UP_SCORE[difficulty]&&winner.score>=LEVEL_UP_SCORE[difficulty]&&(
        <div style={{
          background:"rgba(52,211,153,0.1)",border:"1px solid #34d399",
          borderRadius:12,padding:"10px 18px",marginBottom:16,textAlign:"center",
          color:"#34d399",fontSize:13,fontWeight:600,
        }}>
          {t.levelUp(difficulty==="Easy"?(lang==="zh"?"中等":lang==="fr"?"Moyen":"Medium"):(lang==="zh"?"困难":lang==="fr"?"Difficile":"Hard"))}
        </div>
      )}

      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:10}}>
        <button onClick={onRestart} style={{
          background:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:12,padding:"14px 24px",
          color:"#94a3b8",fontSize:15,fontWeight:800,cursor:"pointer",
        }}>{lang==="zh"?"返回主页":lang==="fr"?"Menu principal":"Main Menu"}</button>
        <button onClick={onPlayAgain} style={{
          background:"linear-gradient(135deg,#f6d365,#fda085)",
          border:"none",borderRadius:12,padding:"14px 24px",
          color:"#1a1a2e",fontSize:15,fontWeight:800,cursor:"pointer",
          boxShadow:"0 4px 20px rgba(246,211,101,0.35)",
        }}>{lang==="zh"?"再来一局 ▶":"Play Again ▶"}</button>
      </div>

      {/* Share button */}
      <button onClick={handleShare} disabled={sharing} style={{
        background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",
        border:"none",borderRadius:12,padding:"12px 28px",
        color:"white",fontSize:14,fontWeight:800,cursor:sharing?"not-allowed":"pointer",
        opacity:sharing?0.7:1,
        boxShadow:"0 4px 20px rgba(59,130,246,0.35)",
      }}>
        {sharing?(lang==="zh"?"生成中...":lang==="fr"?"Generation...":"Generating..."):(lang==="zh"?"📤 分享成绩":"📤 Share Score")}
      </button>
    </div>
  );
}
