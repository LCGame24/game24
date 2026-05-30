import { useState, useEffect, useRef } from "react";

// ── constants ──────────────────────────────────────────────────────────────
const SUITS = ["♠","♥","♦","♣"];
const VALUES = [1,2,3,4,5,6,7,8,9,10,11,12,13];
const LABELS = {1:"1",2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"11",12:"12",13:"13"};
// Card face shows traditional letter + numeric value for face cards
const CARD_FACE_LABEL = {1:"A",2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"J",12:"Q",13:"K"};
const CARD_FACE_NUM   = {1:null,2:null,3:null,4:null,5:null,6:null,7:null,8:null,9:null,10:null,11:"11",12:"12",13:"13"};
const FACE  = {1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:11,12:12,13:13};

const DIFFICULTY = {
  Easy:   { timeLimit: 90,  pointsPerSolve: 8,  hintPenalty: 2, label:"Easy",   color:"#34d399" },
  Medium: { timeLimit: 60,  pointsPerSolve: 12, hintPenalty: 4, label:"Medium", color:"#f59e0b" },
  Hard:   { timeLimit: 40,  pointsPerSolve: 20, hintPenalty: 8, label:"Hard",   color:"#ef4444" },
};
const LEVEL_UP_SCORE = { Easy: 40, Medium: 100 }; // score needed to unlock next diff

const PLAYER_COLORS = ["#f6d365","#f472b6","#34d399","#60a5fa"];
const PLAYER_BG     = ["rgba(246,211,101,0.15)","rgba(244,114,182,0.15)","rgba(52,211,153,0.15)","rgba(96,165,250,0.15)"];

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

function getHint(cards) {
  const nums=cards.map(c=>FACE[c.val]), ls=cards.map(c=>String(FACE[c.val]));
  function find(ns,ls) {
    if (ns.length===1) return Math.abs(ns[0]-24)<1e-9?ls[0]:null;
    for (let i=0;i<ns.length;i++) for (let j=0;j<ns.length;j++) {
      if (i===j) continue;
      const rN=ns.filter((_,k)=>k!==i&&k!==j), rL=ls.filter((_,k)=>k!==i&&k!==j);
      const [a,b,la,lb]=[ns[i],ns[j],ls[i],ls[j]];
      const ops=[[a+b,`(${la}+${lb})`],[a-b,`(${la}-${lb})`],[a*b,`(${la}×${lb})`]];
      if (Math.abs(b)>1e-9) ops.push([a/b,`(${la}÷${lb})`]);
      for (const [r,e] of ops){ const res=find([...rN,r],[...rL,e]); if(res!==null) return res; }
    }
    return null;
  }
  return find(nums,ls);
}

function fmt(n) { return Number.isInteger(n)?String(n):n.toFixed(3).replace(/\.?0+$/,""); }

// ── sub-components ─────────────────────────────────────────────────────────
function PlayingCard({card,selected,used,onClick,animIdx}) {
  const red = card.suit==="♥"||card.suit==="♦";
  return (
    <div onClick={used?null:onClick} style={{
      width:72,height:100,borderRadius:10,
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
        {CARD_FACE_NUM[card.val]&&<span style={{fontSize:9,display:"block",color:red?"#c53030":"#4a5568"}}>=({CARD_FACE_NUM[card.val]})</span>}
        <span style={{fontSize:11}}>{card.suit}</span>
      </div>
      <div style={{fontSize:20,textAlign:"center",color:red?"#e53e3e":"#1a202c"}}>{card.suit}</div>
      <div style={{fontSize:13,fontWeight:700,color:red?"#e53e3e":"#1a202c",textAlign:"right",transform:"rotate(180deg)",fontFamily:"Georgia,serif",lineHeight:1.1}}>
        {CARD_FACE_LABEL[card.val]}
        {CARD_FACE_NUM[card.val]&&<span style={{fontSize:9,display:"block",color:red?"#c53030":"#4a5568"}}>=({CARD_FACE_NUM[card.val]})</span>}
        <span style={{fontSize:11}}>{card.suit}</span>
      </div>
    </div>
  );
}

function OpBtn({op,active,onClick}) {
  return (
    <button onClick={onClick} style={{
      width:44,height:44,borderRadius:"50%",
      border:active?"2px solid #f59e0b":"2px solid #334155",
      background:active?"#fef3c7":"rgba(255,255,255,0.05)",
      fontSize:18,fontWeight:800,cursor:"pointer",
      color:active?"#92400e":"#94a3b8",
      transform:active?"scale(1.18)":"scale(1)",
      transition:"all 0.15s",boxShadow:active?"0 4px 12px rgba(245,158,11,0.4)":"none",
    }}>{op}</button>
  );
}

// ── Setup screen ───────────────────────────────────────────────────────────
function SetupScreen({onStart}) {
  const [numPlayers,setNumPlayers]=useState(1);
  const [names,setNames]=useState(["Player 1","Player 2","Player 3","Player 4"]);
  const [diff,setDiff]=useState("Medium");
  const [soloTimer,setSoloTimer]=useState(true); // solo timer on by default
  const [rounds,setRounds]=useState(5);

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
        input{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:8px;
          color:white;padding:8px 12px;font-size:14px;width:100%;box-sizing:border-box;outline:none;}
        input:focus{border-color:#f59e0b;}
      `}</style>

      <h1 style={{
        fontSize:56,fontWeight:900,margin:"0 0 4px",letterSpacing:-2,
        background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmer 3s linear infinite",
      }}>24</h1>
      <p style={{color:"#64748b",letterSpacing:3,fontSize:12,textTransform:"uppercase",marginBottom:32}}>The Math Card Game</p>

      <div style={{
        background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:20,padding:28,width:"100%",maxWidth:360,animation:"fadeIn 0.5s ease",
      }}>
        {/* Difficulty */}
        <div style={{marginBottom:24}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Difficulty</div>
          <div style={{display:"flex",gap:8}}>
            {Object.keys(DIFFICULTY).map(d=>(
              <button key={d} onClick={()=>setDiff(d)} style={{
                flex:1,padding:"8px 4px",borderRadius:10,border:"none",
                background:diff===d?DIFFICULTY[d].color:"rgba(255,255,255,0.07)",
                color:diff===d?"#1a1a2e":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",
                transition:"all 0.2s",
              }}>{d}</button>
            ))}
          </div>
          <div style={{color:"#475569",fontSize:11,marginTop:8,textAlign:"center"}}>
            {DIFFICULTY[diff].timeLimit}s per round · +{DIFFICULTY[diff].pointsPerSolve} pts per solve
          </div>
        </div>

        {/* Solo timer option — only shown for 1 player */}
        {numPlayers===1&&(
          <div style={{marginBottom:24}}>
            <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Timer (Solo)</div>
            <div style={{display:"flex",gap:8}}>
              {[{v:true,label:"⏱ On — earn speed bonus"},{v:false,label:"∞ Off — no speed bonus"}].map(opt=>(
                <button key={String(opt.v)} onClick={()=>setSoloTimer(opt.v)} style={{
                  flex:1,padding:"8px 6px",borderRadius:10,border:"none",fontSize:12,
                  background:soloTimer===opt.v?(opt.v?"#34d399":"#a78bfa"):"rgba(255,255,255,0.07)",
                  color:soloTimer===opt.v?"#1a1a2e":"#64748b",fontWeight:700,cursor:"pointer",
                  transition:"all 0.2s",
                }}>{opt.label}</button>
              ))}
            </div>
            <div style={{color:"#475569",fontSize:11,marginTop:6,textAlign:"center"}}>
              {soloTimer?"Speed bonus earned for fast solves":"No time pressure — solve at your own pace"}
            </div>
          </div>
        )}

        {/* Players */}
        <div style={{marginBottom:24}}>
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Players</div>
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
          <div style={{color:"#94a3b8",fontSize:12,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Rounds per Player</div>
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
            {numPlayers>1?`${rounds * numPlayers} total puzzles across all players`:`${rounds} puzzles to solve`}
          </div>
        </div>

        <button onClick={()=>onStart({numPlayers,names:names.slice(0,numPlayers),difficulty:diff,soloTimer:numPlayers===1?soloTimer:true,rounds})} style={{
          width:"100%",padding:"14px",borderRadius:12,border:"none",
          background:"linear-gradient(135deg,#f6d365,#fda085)",
          color:"#1a1a2e",fontSize:16,fontWeight:800,cursor:"pointer",
          boxShadow:"0 4px 20px rgba(246,211,101,0.4)",
        }}>Start Game ▶</button>
      </div>
    </div>
  );
}

// ── Main game ──────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("setup"); // setup | game | roundEnd | gameEnd
  const [config,setConfig]=useState(null);

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
  const [showHint,setShowHint]=useState(null);
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
    dealCards(newDeck, cfg.difficulty);
    setExtensions(2);
    setTurnOver(false);
  }

  function dealCards(d=deck, diff=difficulty) {
    let pool=[...d], drawn, attempts=0;
    if (pool.length<4){pool=generateDeck();}
    do {
      pool=pool.sort(()=>Math.random()-0.5);
      drawn=pool.slice(0,4);
      attempts++;
    } while (!hasSolution(drawn)&&attempts<100);
    setDeck(pool.slice(4));
    setCards(drawn);
    setNumbers(drawn.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
    setSelectedIdx(null);
    setOperator(null);
    setSteps([]);
    setMessage({text:"",type:""});
    setShowHint(null);
    setTimeLeft(DIFFICULTY[diff].timeLimit);
    setTurnOver(false);
    // keep timerEnabled as-is — player chose it per puzzle
  }

  const isSolo = config?.numPlayers===1;
  const timerActive = !isSolo || timerEnabled; // multi always timed; solo depends on toggle

  // timer — active in multiplayer always, solo only when timerEnabled
  useEffect(()=>{
    if (screen!=="game"||turnOver||!timerActive) return;
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if (t<=1){ clearInterval(timerRef.current); handleTimeUp(); return 0; }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[screen,turnOver,currentPlayer,round,timerActive]);

  function handleTimeUp() {
    setMessage({text:"⏰ Time's up!",type:"bad"});
    setTurnOver(true);
  }

  function handleNumberClick(idx) {
    if (turnOver) return;
    if (selectedIdx===null) {
      setSelectedIdx(idx);
      setOperator(null);
      setMessage({text:"",type:""});
    } else if (selectedIdx===idx) {
      setSelectedIdx(null);
      setOperator(null);
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
      if (Math.abs(b)<1e-9){setMessage({text:"Can't divide by zero!",type:"bad"});return;}
      result=a/b;
    } else if (op==="^") result=Math.pow(a,b);
    else if (op==="√") { result=Math.sqrt(a); }

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
        setMessage({text:`Result is ${fmt(result)}, not 24. Try resetting!`,type:"bad"});
      }
    } else {
      setMessage({text:`✓ ${expr}`,type:"step"});
    }
  }

  function handleSolve() {
    clearInterval(timerRef.current);
    const diffCfg=DIFFICULTY[difficulty];
    const speedBonus=timerActive?Math.max(0,Math.floor(timeLeft/5)):0;
    const pts=diffCfg.pointsPerSolve+speedBonus;
    setPlayers(ps=>{
      const next=[...ps];
      next[currentPlayer]={...next[currentPlayer],
        score:next[currentPlayer].score+pts,
        streak:next[currentPlayer].streak+1,
      };
      return next;
    });
    setMessage({text:timerActive&&speedBonus>0?`🎉 24! +${pts} pts (⚡${speedBonus} speed bonus)`:`🎉 24! +${pts} pts`,type:"win"});
    setTurnOver(true);
    // Auto-advance to next turn after 2 seconds
    setTimeout(()=>{ handleNextTurn(); }, 2000);
  }

  function handleReset() {
    setNumbers(cards.map(c=>({value:FACE[c.val],label:LABELS[c.val],sourceId:c.id})));
    setSelectedIdx(null);
    setOperator(null);
    setSteps([]);
    setMessage({text:"",type:""});
  }

  function handleHint() {
    const hint=getHint(cards);
    setShowHint(hint);
    setPlayers(ps=>{
      const next=[...ps];
      next[currentPlayer]={...next[currentPlayer],hintsUsed:next[currentPlayer].hintsUsed+1};
      return next;
    });
  }

  function handleExtend() {
    if (extensions<=0||turnOver) return;
    setExtensions(e=>e-1);
    setTimeLeft(t=>t+30);
    setExtFlash(true);
    setTimeout(()=>setExtFlash(false),700);
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
  const msgColor={win:"#34d399",bad:"#ef4444",step:"#f6d365","":"#94a3b8"}[message.type]||"#94a3b8";

  if (screen==="setup") return <SetupScreen onStart={startGame}/>;

  if (screen==="gameEnd") return (
    <GameEnd players={players} onRestart={()=>setScreen("setup")} difficulty={difficulty}/>
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
      `}</style>

      {/* Title */}
      <h1 style={{
        fontSize:38,fontWeight:900,margin:"0 0 2px",letterSpacing:-1,
        background:"linear-gradient(90deg,#f6d365,#fda085,#f6d365)",backgroundSize:"200%",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        animation:"shimmer 3s linear infinite",
      }}>24</h1>

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
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Round</div>
          <div style={{color:"white",fontWeight:800,fontSize:18}}>{round}/{ROUNDS_PER_PLAYER}</div>
        </div>
        <div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>
        {isSolo ? (
          <>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Time</div>
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
              <div style={{color:"#475569",fontSize:10,marginTop:2}}>{timerEnabled?"speed bonus":"no bonus"}</div>
            </div>
          </>
        ) : (
          <>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Time</div>
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
        <div style={{textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Diff</div>
          <div style={{color:DIFFICULTY[difficulty].color,fontWeight:800,fontSize:13}}>{difficulty}</div>
        </div>
      </div>

      {/* Current player banner */}
      <div style={{
        color:PLAYER_COLORS[currentPlayer],fontSize:13,fontWeight:700,
        marginBottom:12,letterSpacing:1,
        textTransform:"uppercase",
      }}>
        {cp.name}'s Turn
      </div>

      {/* Cards */}
      <div style={{display:"flex",gap:10,marginBottom:16,justifyContent:"center",flexWrap:"wrap"}}>
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

      {/* Working numbers pool */}
      <div style={{marginBottom:14,textAlign:"center"}}>
        <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Available Numbers</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          {numbers.map((n,i)=>(
            <div key={i} onClick={()=>handleNumberClick(i)} style={{
              width:54,height:54,borderRadius:12,
              background:selectedIdx===i?"#fef3c7":"rgba(255,255,255,0.08)",
              border:`2px solid ${selectedIdx===i?"#f59e0b":"rgba(255,255,255,0.15)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:18,fontWeight:900,
              color:selectedIdx===i?"#92400e":"white",
              cursor:turnOver?"default":"pointer",
              transform:selectedIdx===i?"scale(1.15)":"scale(1)",
              transition:"all 0.15s",
              boxShadow:selectedIdx===i?"0 4px 16px rgba(245,158,11,0.4)":"none",
              animation:"popIn 0.3s ease",
            }}>{n.label}</div>
          ))}
        </div>
      </div>

      {/* Operators */}
      {!turnOver&&(
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",justifyContent:"center"}}>
          {["+","−","×","÷","^","√"].map(op=>(
            <OpBtn key={op} op={op} active={operator===op} onClick={()=>{
              if (selectedIdx!==null) setOperator(o=>o===op?null:op);
            }}/>
          ))}
        </div>
      )}

      {/* Steps log */}
      {steps.length>0&&(
        <div style={{
          background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:12,padding:"10px 16px",marginBottom:12,width:"100%",maxWidth:360,
        }}>
          <div style={{color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Steps</div>
          {steps.map((s,i)=>(
            <div key={i} style={{color:"#94a3b8",fontSize:13,marginBottom:3,animation:"fadeSlide 0.3s ease"}}>
              <span style={{color:"#475569",marginRight:6}}>Step {i+1}:</span>{s.expr}
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

      {/* Hint */}
      {showHint&&(
        <div style={{
          background:"rgba(167,139,250,0.12)",border:"1px solid #a78bfa",
          borderRadius:12,padding:"8px 16px",marginBottom:10,
          color:"#a78bfa",fontSize:13,textAlign:"center",
        }}>💡 {showHint} = 24</div>
      )}

      {/* Action buttons */}
      {!turnOver?(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:8}}>
          {[
            {label:"↺ Reset",action:handleReset,color:"#64748b"},
            {label:"💡 Hint",action:handleHint,color:"#a78bfa"},
            ...(isSolo?[{label:"⏭ Skip",action:handleNextTurn,color:"#f472b6"}]:[]),
          ].map(b=>(
            <button key={b.label} onClick={b.action} style={{
              background:"transparent",border:`2px solid ${b.color}`,
              borderRadius:10,padding:"7px 16px",color:b.color,
              fontSize:13,fontWeight:700,cursor:"pointer",
            }}>{b.label}</button>
          ))}
        </div>
      ):(
        <button onClick={handleNextTurn} style={{
          background:"linear-gradient(135deg,#f6d365,#fda085)",
          border:"none",borderRadius:12,padding:"12px 28px",
          color:"#1a1a2e",fontSize:15,fontWeight:800,cursor:"pointer",
          boxShadow:"0 4px 20px rgba(246,211,101,0.4)",marginTop:4,
          animation:"popIn 0.4s ease",
        }}>
          {((round-1)*config.numPlayers+currentPlayer+1)>=config.numPlayers*ROUNDS_PER_PLAYER
            ?"🏆 See Final Results"
            :isSolo?"Next Puzzle ▶":`Next: ${players[(currentPlayer+1)%config.numPlayers]?.name}'s Turn ▶`}
        </button>
      )}

      <p style={{color:"#1e293b",fontSize:10,marginTop:12,textAlign:"center"}}>
        {ROUNDS_PER_PLAYER} rounds per player
      </p>
    </div>
  );
}

// ── Game End screen ────────────────────────────────────────────────────────
function GameEnd({players,onRestart,difficulty}) {
  const sorted=[...players].sort((a,b)=>b.score-a.score);
  const winner=sorted[0];



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
        {players.length>1?`${winner.name} Wins!`:"Game Over!"}
      </h2>
      <p style={{color:"#64748b",marginBottom:24,fontSize:13}}>{difficulty} mode</p>

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
                  🔥 Best streak {p.streak} · 💡 {p.hintsUsed} hints used
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
          🎉 Score unlocked next difficulty! Try {difficulty==="Easy"?"Medium":"Hard"} mode.
        </div>
      )}

      <button onClick={onRestart} style={{
        background:"linear-gradient(135deg,#f6d365,#fda085)",
        border:"none",borderRadius:12,padding:"14px 32px",
        color:"#1a1a2e",fontSize:16,fontWeight:800,cursor:"pointer",
        boxShadow:"0 4px 20px rgba(246,211,101,0.35)",
      }}>Play Again</button>
    </div>
  );
}
