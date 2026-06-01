import { useState, useEffect, useRef } from "react";

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

const PLAYER_COLORS = ["#f6d365","#f472b6","#34d399","#60a5fa"];
const PLAYER_BG     = ["rgba(246,211,101,0.15)","rgba(244,114,182,0.15)","rgba(52,211,153,0.15)","rgba(96,165,250,0.15)"];

// Tutorial: guided first puzzle using 1×2×3×4=24
// Steps: tap 1 → tap × → tap 2 → (=2) → tap 2 → tap × → tap 3 → (=6) → tap 6 → tap × → tap 4 → 🎉
const TUTORIAL_CARDS = [
  {suit:"♠",val:1,id:"tut_1"},
  {suit:"♥",val:2,id:"tut_2"},
  {suit:"♦",val:3,id:"tut_3"},
  {suit:"♣",val:4,id:"tut_4"},
];
// tutorialStep: 0=tap 1, 1=tap ×, 2=tap 2, 3=tap ×, 4=tap 3, 5=tap ×, 6=tap 4, 7=done
const TUTORIAL_STEPS = [
  { type:"number", target:"1",   bubble:"👆 Tap the  1  to start!", bubbleZh:"👆 点击数字  1  开始！" },
  { type:"op",     target:"×",   bubble:"Now tap  ×  to multiply!", bubbleZh:"点击  ×  进行乘法！" },
  { type:"number", target:"2",   bubble:"Tap  2  — let's make 1×2!", bubbleZh:"点击  2  — 算出 1×2！" },
  { type:"op",     target:"×",   bubble:"Great! Now tap  ×  again!", bubbleZh:"棒极了！再次点击  ×  ！" },
  { type:"number", target:"3",   bubble:"Tap  3  — almost there!", bubbleZh:"点击  3  — 快成功了！" },
  { type:"op",     target:"×",   bubble:"One more  ×  to go!", bubbleZh:"最后一个  ×  ！" },
  { type:"number", target:"4",   bubble:"Tap  4  to make 24! 🎯", bubbleZh:"点击  4  凑成24！🎯" },
];

// ── translations ───────────────────────────────────────────────────────────
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
  }
};


// ── helpers ────────────────────────────────────────────────────────────────
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

// ── Setup screen ───────────────────────────────────────────────────────────
function SetupScreen({onStart, lang, setLang, unlocked, leaderboard, setLeaderboard, autoSelectHard, setJustUnlockedHard, badges, personalBest, skipInstructions, preSelectDiff}) {
  const t=T[lang];
  const [numPlayers,setNumPlayers]=useState(1);
  const [showInstructions,setShowInstructions]=useState(!skipInstructions);
  const [showLB,setShowLB]=useState(false);
  const [showBadges,setShowBadges]=useState(false);
  const [names,setNames]=useState(["Player 1","Player 2","Player 3","Player 4"]);
  const [diff,setDiff]=useState(autoSelectHard?"Hard":preSelectDiff||"Easy");
  const [soloTimer,setSoloTimer]=useState(true); // solo timer on by default
  const defaultRounds = (d) => d==="Easy" ? 5 : 10;
  const [rounds,setRounds]=useState(()=>defaultRounds(autoSelectHard?"Hard":preSelectDiff||"Easy"));

  function updateName(i,v){const n=[...names];n[i]=v;setNames(n);}

  return (
    <div style={{
      minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:24,
    }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
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
              <button onClick={()=>setLang(l=>l==="en"?"zh":"en")} style={{
                background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:16,padding:"3px 14px",color:"#94a3b8",fontSize:12,
                cursor:"pointer",marginBottom:12,
              }}>{t.language}</button>
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
              boxShadow:"0 4px 20px rgba(246,211,101,0.4)",
            }}>{t.gotIt}</button>
          </div>
        </div>
      )}

      <div style={{textAlign:"center",marginBottom:4}}>
        <h1 style={{
          fontSize:52,fontWeight:900,margin:"0 0 2px",letterSpacing:-2,
          background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:"shimmer 3s linear infinite",
        }}>{lang==="zh"?"24点":"Game 24"}</h1>
        <p style={{
          color:"#94a3b8",fontSize:13,margin:"0 0 4px",fontWeight:500,
        }}>{lang==="zh"?"数学扑克牌游戏":"The Math Card Game"}</p>
      </div>
      <button onClick={()=>setLang(l=>l==="en"?"zh":"en")} style={{
        background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.2)",
        borderRadius:20,padding:"4px 14px",color:"#94a3b8",fontSize:13,
        cursor:"pointer",marginBottom:20,
      }}>{t.language}</button>

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
            {DIFFICULTY[diff].timeLimit}s · +{DIFFICULTY[diff].pointsPerSolve} {lang==="zh"?"分":"pts"} · {lang==="zh"?"数字":"cards"} {DIFFICULTY[diff].cardNote}{diff==="Easy"?` · ${lang==="zh"?"基础运算":"basic ops only"}`:""}{!unlocked.Hard?` · ${lang==="zh"?"Medium 150分解锁Hard":"Score 150pts on Medium to unlock Hard"}`:""}
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
                  <div style={{color:DIFFICULTY[diff]?.color||"#94a3b8",fontSize:11,fontWeight:700}}>{lang==="zh"?{Easy:"简单",Medium:"中等",Hard:"困难"}[diff]||diff:diff}</div>
                  <div style={{color:"#f6d365",fontWeight:900,fontSize:18}}>{score}</div>
                  <div style={{color:"#64748b",fontSize:10}}>{lang==="zh"?"等级":"Level"} {Math.floor(score/10)+1}</div>
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
          }}>🏆 {lang==="zh"?"排行榜":"Leaderboard"}</button>
          <button onClick={()=>setShowBadges(true)} style={{
            flex:1,padding:"10px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.04)",color:"#94a3b8",
            fontSize:14,fontWeight:600,cursor:"pointer",
          }}>🎖️ {lang==="zh"?"成就":"Badges"} {badges.length>0?`(${badges.length})`:""}</button>
        </div>

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
                <div style={{color:"#64748b",fontSize:12}}>{badges.length}/{BADGES.length} {lang==="zh"?"已解锁":"unlocked"}</div>
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
                        {lang==="zh"?badge.zh:badge.en}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>setShowBadges(false)} style={{
                width:"100%",padding:"12px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,#f6d365,#fda085)",
                color:"#1a1a2e",fontSize:14,fontWeight:800,cursor:"pointer",
              }}>{lang==="zh"?"关闭":"Close"}</button>
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
                  {lang==="zh"?"排行榜":"Leaderboard"}
                </h2>
              </div>
              {leaderboard.length===0?(
                <p style={{color:"#475569",textAlign:"center",fontSize:14}}>
                  {lang==="zh"?"暂无记录，快去挑战吧！":"No scores yet — play to get on the board!"}
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
                        {entry.difficulty} · {lang==="zh"?"等级":"Level"}{Math.floor(entry.score/10)+1} · {entry.date} · 🔥{entry.streak}
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
                }}>{lang==="zh"?"清除记录":"Clear All Scores"}</button>
              )}
              <button onClick={()=>setShowLB(false)} style={{
                width:"100%",padding:"12px",borderRadius:12,border:"none",marginTop:10,
                background:"linear-gradient(135deg,#f6d365,#fda085)",
                color:"#1a1a2e",fontSize:14,fontWeight:800,cursor:"pointer",
              }}>{lang==="zh"?"关闭":"Close"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main game ──────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("setup"); // setup | game | roundEnd | gameEnd
  const [config,setConfig]=useState(null);
  const [lang,setLang]=useState("en");
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
        setMessage({text:`👆 Tap the  ${step.target}  first!`,type:"bad"});
        return;
      }
      // Correct tap — advance tutorial
      setSelectedIdx(idx);
      setOperator(null);
      setMessage({text:"",type:""});
      setTutorialStep(s=>s+1);
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
    const levelUpMsg=newLevel>prevLevel?` 🆙 ${lang==="zh"?`升至等级${newLevel}`:`Level ${newLevel}!`}`:"";
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

  if (screen==="setup") return <SetupScreen onStart={startGame} lang={lang} setLang={setLang}
    unlocked={unlocked} leaderboard={leaderboard} setLeaderboard={setLeaderboard}
    autoSelectHard={justUnlockedHard} setJustUnlockedHard={setJustUnlockedHard}
    badges={badges} personalBest={personalBest}
    skipInstructions={skipInstructions} preSelectDiff={preSelectDiff}/>;

  if (screen==="gameEnd") return (
    <GameEnd players={players} onRestart={()=>{setSkipInstructions(false);setPreSelectDiff(null);setScreen("setup");}} onPlayAgain={()=>{ setSkipInstructions(true); setPreSelectDiff(difficulty); setScreen("setup"); }} difficulty={difficulty} lang={lang} setLang={setLang}
      leaderboard={leaderboard} setLeaderboard={setLeaderboard}
      onKeepPlaying={()=>{ dealCards(deck, difficulty); setRound(1); setCurrentPlayer(0); setScreen("game"); setPlayers(ps=>ps.map(p=>({...p,score:0,streak:0,hintsUsed:0}))); }}/>
  );

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
      display:"flex",flexDirection:"column",alignItems:"center",
      fontFamily:"'Trebuchet MS',sans-serif",padding:"16px 12px",
      overflowY:"auto",
    }}>
      <style>{`
        @keyframes cardDeal{from{opacity:0;transform:translateY(-30px) scale(0.85)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
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
                  {lang==="zh"?"新成就解锁！":"Badge Unlocked!"}
                </div>
                <div style={{color:"white",fontWeight:700,fontSize:14}}>
                  {lang==="zh"?badge.zh:badge.en}
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
      }}>{lang==="zh"?"24点":"Game 24"}</h1>
      <div style={{display:"flex",gap:8,marginBottom:8,justifyContent:"center"}}>
        <button onClick={()=>setLang(l=>l==="en"?"zh":"en")} style={{
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:16,padding:"3px 12px",color:"#64748b",fontSize:12,cursor:"pointer",
        }}>{t.language}</button>
        <button onClick={()=>setShowHelp(true)} style={{
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:16,padding:"3px 12px",color:"#64748b",fontSize:12,cursor:"pointer",
        }}>❓</button>
        <button onClick={()=>setPaused(p=>!p)} style={{
          background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:16,padding:"3px 12px",color:"#64748b",fontSize:12,cursor:"pointer",
        }}>{paused?"▶":"⏸"}</button>
      </div>

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
          }}>▶ {lang==="zh"?"继续游戏":"Resume"}</button>
          <button onClick={()=>{setPaused(false);setSkipInstructions(false);setPreSelectDiff(null);setScreen("setup");}} style={{
            background:"transparent",border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:14,padding:"10px 28px",
            color:"#94a3b8",fontSize:14,fontWeight:700,cursor:"pointer",
          }}>🏠 {lang==="zh"?"返回主页":"Main Menu"}</button>
        </div>
      )}

      {/* Help modal in game */}
      {showHelp&&(
        <div style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
          display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:1000,padding:20,
        }}>
          <div style={{
            background:"linear-gradient(135deg,#1e293b,#0f172a)",
            border:"1px solid rgba(255,255,255,0.15)",
            borderRadius:24,padding:28,maxWidth:380,width:"100%",
          }}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <button onClick={()=>setLang(l=>l==="en"?"zh":"en")} style={{
                background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:16,padding:"3px 14px",color:"#94a3b8",fontSize:12,
                cursor:"pointer",marginBottom:12,
              }}>{t.language}</button>
              <div style={{fontSize:40,marginBottom:8}}>🃏</div>
              <h2 style={{color:"white",fontSize:22,fontWeight:900,margin:0}}>{t.howToPlayTitle}</h2>
            </div>
            <div style={{marginBottom:24}}>
              {t.howToPlayLines.map((line,i)=>(
                <div key={i} style={{
                  color:"#cbd5e1",fontSize:14,marginBottom:10,
                  padding:"8px 12px",background:"rgba(255,255,255,0.04)",
                  borderRadius:8,lineHeight:1.5,
                }}>{line}</div>
              ))}
            </div>
            <button onClick={()=>setShowHelp(false)} style={{
              width:"100%",padding:"14px",borderRadius:12,border:"none",
              background:"linear-gradient(135deg,#f6d365,#fda085)",
              color:"#1a1a2e",fontSize:15,fontWeight:800,cursor:"pointer",
            }}>{t.gotIt}</button>
          </div>
        </div>
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
              {lang==="zh"?"等级":"Level"} {Math.floor(p.score/10)+1}
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
            <div style={{color:DIFFICULTY[difficulty].color,fontWeight:800,fontSize:13}}>{lang==="zh"?{Easy:"简单",Medium:"中等",Hard:"困难"}[difficulty]||difficulty:difficulty}</div>
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
                    {isLocked?"🔒 ":""}{lang==="zh"?{Easy:"简单",Medium:"中等",Hard:"困难"}[d]||d:d}
                    {d===difficulty?" ✓":""}
                  </button>
                );
              })}
              <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:6,paddingTop:6}}>
                <button onClick={()=>{setShowDiffMenu(false);setSkipInstructions(false);setScreen("setup");}} style={{
                  display:"block",width:"100%",padding:"7px 12px",
                  background:"transparent",border:"none",borderRadius:8,
                  color:"#94a3b8",fontWeight:600,fontSize:12,cursor:"pointer",textAlign:"left",
                }}>🏠 {lang==="zh"?"返回主页":"Main Menu"}</button>
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
            {lang==="zh"?TUTORIAL_STEPS[tutorialStep].bubbleZh:TUTORIAL_STEPS[tutorialStep].bubble}
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
          }}>{lang==="zh"?"跳过教程":"Skip tutorial"}</button>
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
                      setMessage({text:`👆 Tap  ${step.target}  now!`,type:"bad"});
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
              <span style={{color:"#475569",marginRight:6}}>{lang==="zh"?`第${i+1}步：`:`Step ${i+1}:`}</span>{s.expr}
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
                  {lang==="zh"?`再点一次提示查看第${showHint.revealed+1}步`:`Tap hint again for step ${showHint.revealed+1}`}
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
                {lang==="zh"?"困难模式已解锁！":"Hard Mode Unlocked!"}
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
                {lang==="zh"?"试试中等难度，挑战更多运算！":"Try Medium mode for a bigger challenge!"}
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
                🔥 {lang==="zh"?"去玩困难模式！":"Play Hard Mode!"}
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
                ⬆️ {lang==="zh"?"试试中等难度！":"Try Medium Mode!"}
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
    </div>
  );
}

// ── Game End screen ────────────────────────────────────────────────────────
function GameEnd({players,onRestart,onPlayAgain,onKeepPlaying,difficulty,lang,setLang,leaderboard,setLeaderboard}) {
  const t=T[lang];
  const sorted=[...players].sort((a,b)=>b.score-a.score);
  const winner=sorted[0];

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
        {difficulty==="Easy"?(lang==="zh"?"简单":"Easy"):difficulty==="Medium"?(lang==="zh"?"中等":"Medium"):(lang==="zh"?"困难":"Hard")} {lang==="zh"?"模式":"mode"}
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

      {/* Level up suggestion */}
      {players.length===1&&LEVEL_UP_SCORE[difficulty]&&winner.score>=LEVEL_UP_SCORE[difficulty]&&(
        <div style={{
          background:"rgba(52,211,153,0.1)",border:"1px solid #34d399",
          borderRadius:12,padding:"10px 18px",marginBottom:16,textAlign:"center",
          color:"#34d399",fontSize:13,fontWeight:600,
        }}>
          {t.levelUp(difficulty==="Easy"?(lang==="zh"?"中等":"Medium"):(lang==="zh"?"困难":"Hard"))}
        </div>
      )}

      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={onRestart} style={{
          background:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:12,padding:"14px 24px",
          color:"#94a3b8",fontSize:15,fontWeight:800,cursor:"pointer",
        }}>{lang==="zh"?"返回主页":"Main Menu"}</button>
        <button onClick={onPlayAgain} style={{
          background:"linear-gradient(135deg,#f6d365,#fda085)",
          border:"none",borderRadius:12,padding:"14px 24px",
          color:"#1a1a2e",fontSize:15,fontWeight:800,cursor:"pointer",
          boxShadow:"0 4px 20px rgba(246,211,101,0.35)",
        }}>{lang==="zh"?"再来一局 ▶":"Play Again ▶"}</button>
      </div>
    </div>
  );
}
