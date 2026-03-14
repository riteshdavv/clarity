import { useState, useEffect, useRef, useCallback } from "react";

// ─── GOOGLE DRIVE CONFIG ────────────────────────────────────────────────────
const CLIENT_ID = "874576772917-njkp7muukjot06s0oaqca8gj96c8b83c.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "clarity-data.json";
const LS_KEY = "clarity_state_v1";
const LS_FILE_ID = "clarity_file_id";
const LS_TOKEN = "clarity_token";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
const fmtTime = () => new Date().toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
const uid = () => Date.now() + Math.random();
const VAGUE = ["work on","think about","look at","deal with","handle","do something","figure out","check on"];
const isVague = (v) => VAGUE.some((w) => v.toLowerCase().includes(w)) && v.length > 4;

// localStorage helpers — safe wrappers
const lsGet = (key, fallback = null) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const lsSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};
const lsDel = (key) => { try { localStorage.removeItem(key); } catch {} };

// ─── COLORS ─────────────────────────────────────────────────────────────────
const G = {
  bg:"#0e0e0e", surface:"#161616", surface2:"#1e1e1e",
  border:"#2a2a2a", border2:"#333", text:"#e8e4dc",
  muted:"#666", muted2:"#888", accent:"#c8b89a", accent2:"#a89070",
  green:"#5a8a6a", greenSoft:"#1e2d22", red:"#a06060", redSoft:"#2d1e1e",
  tagTodayBg:"#1a2a3a", tagTodayText:"#7ab0d0",
  tagWeekBg:"#2a1a3a", tagWeekText:"#a07ad0",
  tagSomedayBg:"#2a2a1a", tagSomedayText:"#c0b060",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${G.bg};}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:${G.border2};border-radius:2px;}
  input,textarea,button{font-family:'DM Sans',sans-serif;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes spin{to{transform:rotate(360deg);}}
  .fade-up{animation:fadeUp 0.3s ease both;}
  .fade-in{animation:fadeIn 0.3s ease both;}
  .spin{animation:spin 1s linear infinite;display:inline-block;}
  input[type=range]{-webkit-appearance:none;width:100%;height:3px;background:${G.border2};border-radius:2px;outline:none;}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:${G.accent};cursor:pointer;transition:transform 0.2s;}
  input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.3);}
  button:disabled{opacity:0.4;cursor:not-allowed;}
`;

// ─── STYLES ─────────────────────────────────────────────────────────────────
const s = {
  shell:{display:"flex",minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",fontWeight:300,background:G.bg,color:G.text},
  sidebar:{width:215,flexShrink:0,borderRight:`1px solid ${G.border}`,display:"flex",flexDirection:"column",padding:"28px 0",height:"100vh",overflowY:"auto",position:"sticky",top:0},
  main:{flex:1,minWidth:0,padding:"44px 48px",maxWidth:820,overflowY:"auto",height:"100vh"},
  logoWrap:{padding:"0 22px 22px",borderBottom:`1px solid ${G.border}`,marginBottom:18},
  logoName:{fontFamily:"'Instrument Serif',serif",fontSize:22,color:G.accent,letterSpacing:-0.5},
  logoTag:{fontSize:9,color:G.muted,letterSpacing:2,textTransform:"uppercase",marginTop:2},
  navSection:{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:G.muted,padding:"14px 12px 4px"},
  navItem:(a)=>({display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,cursor:"pointer",fontSize:12.5,color:a?G.accent:G.muted2,background:a?G.surface2:"transparent",border:a?`1px solid ${G.border}`:"1px solid transparent",margin:"1px 10px",transition:"all 0.15s"}),
  navIcon:{fontSize:14,width:18,textAlign:"center"},
  dateBlock:{padding:"14px 22px",borderTop:`1px solid ${G.border}`,marginTop:"auto"},
  dateBig:{fontFamily:"'Instrument Serif',serif",fontSize:28,color:G.muted,lineHeight:1},
  dateSub:{fontSize:11,color:G.muted,marginTop:3},
  pageHeader:{marginBottom:34},
  pageTitle:{fontFamily:"'Instrument Serif',serif",fontSize:30,color:G.text,letterSpacing:-0.5},
  pageSub:{fontSize:13,color:G.muted,marginTop:5},
  card:{background:G.surface,border:`1px solid ${G.border}`,borderRadius:12,padding:24,marginBottom:16},
  cardLabel:{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:G.muted,marginBottom:14},
  input:{width:"100%",background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,color:G.text,fontSize:13.5,padding:"11px 13px",outline:"none",fontFamily:"inherit",fontWeight:300},
  textarea:{width:"100%",background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,color:G.text,fontSize:13.5,padding:"11px 13px",outline:"none",fontFamily:"inherit",fontWeight:300,resize:"none"},
  btnPrimary:{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:8,fontSize:13,cursor:"pointer",border:"none",background:G.accent,color:"#1a1208",fontWeight:500},
  btnGhost:{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,fontSize:12,cursor:"pointer",border:`1px solid ${G.border}`,background:"transparent",color:G.muted2},
  tag:(t)=>({fontSize:10,padding:"3px 9px",borderRadius:20,fontWeight:500,flexShrink:0,background:t==="today"?G.tagTodayBg:t==="week"?G.tagWeekBg:G.tagSomedayBg,color:t==="today"?G.tagTodayText:t==="week"?G.tagWeekText:G.tagSomedayText}),
  empty:{textAlign:"center",padding:"36px 20px",color:G.muted,fontSize:13,lineHeight:1.8},
  promptBox:{background:G.surface2,border:`1px solid ${G.border}`,borderLeft:`3px solid ${G.accent}`,borderRadius:8,padding:"12px 14px",fontSize:12.5,color:G.muted2,marginTop:10,lineHeight:1.5},
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
const Input = ({style={},...p}) => <input style={{...s.input,...style}} {...p}/>;
const Textarea = ({rows=2,style={},...p}) => <textarea rows={rows} style={{...s.textarea,...style}} {...p}/>;
const BtnPrimary = ({children,style={},...p}) => <button style={{...s.btnPrimary,...style}} {...p}>{children}</button>;
const BtnGhost = ({children,style={},...p}) => <button style={{...s.btnGhost,...style}} {...p}>{children}</button>;
const Card = ({children,style={}}) => <div style={{...s.card,...style}} className="fade-up">{children}</div>;
const CardLabel = ({children}) => <div style={s.cardLabel}>{children}</div>;
const Empty = ({icon="◈",children}) => <div style={s.empty}><div style={{fontSize:28,marginBottom:10,opacity:0.35}}>{icon}</div>{children}</div>;

// ─── INIT STATE ──────────────────────────────────────────────────────────────
const INIT = {
  userName:null, habit:null, habitDays:{}, dims:[],
  tasks:[], reviews:[], intents:[], loops:[], ships:[],
  nd:[], friction:[], ge:[], doom:[], energyLog:[],
  reflections:[], cogLog:[], avoidLog:[], stopReasons:[]
};

// Load state from localStorage on startup
const loadLocalState = () => {
  const saved = lsGet(LS_KEY);
  if (saved && saved.userName) return { ...INIT, ...saved };
  return INIT;
};

// ─── GOOGLE DRIVE HOOK ───────────────────────────────────────────────────────
function useDriveSync(state, onLoadFromDrive) {
  const [driveStatus, setDriveStatus] = useState("idle");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const tokenRef = useRef(lsGet(LS_TOKEN));
  const fileIdRef = useRef(lsGet(LS_FILE_ID));
  const saveTimerRef = useRef(null);
  const gapiReadyRef = useRef(false);

  // Load scripts once
  useEffect(() => {
    const loadScript = (src) => new Promise((res) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const el = document.createElement("script");
      el.src = src; el.async = true; el.onload = res;
      document.head.appendChild(el);
    });

    Promise.all([
      loadScript("https://accounts.google.com/gsi/client"),
      loadScript("https://apis.google.com/js/api.js"),
    ]).then(() => {
      window.gapi.load("client", async () => {
        await window.gapi.client.init({});
        await window.gapi.client.load("https://www.googleapis.com/discovery/v1/apis/drive/v3/rest");
        gapiReadyRef.current = true;

        // If we have a saved token + fileId, try to restore session silently
        if (tokenRef.current && fileIdRef.current) {
          window.gapi.client.setToken({ access_token: tokenRef.current });
          setIsSignedIn(true);
          setDriveStatus("ready");
          // Load latest data from Drive
          loadLatest();
        }
      });
    });
  }, []);

  const loadLatest = useCallback(async () => {
    const fid = fileIdRef.current;
    const token = tokenRef.current;
    if (!fid || !token) return;
    try {
      const resp = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fid}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.status === 401) {
        // Token expired — clear and ask user to reconnect
        lsDel(LS_TOKEN);
        lsDel(LS_FILE_ID);
        tokenRef.current = null;
        fileIdRef.current = null;
        setIsSignedIn(false);
        setDriveStatus("idle");
        return;
      }
      if (!resp.ok) return;
      const data = await resp.json();
      if (data && data.userName) {
        onLoadFromDrive({ ...INIT, ...data });
        // Also update localStorage
        lsSet(LS_KEY, data);
      }
      setDriveStatus("ready");
    } catch (e) {
      console.error("Drive load error:", e);
    }
  }, [onLoadFromDrive]);

  const findOrCreateFile = useCallback(async () => {
    const list = await window.gapi.client.drive.files.list({
      spaces: "appDataFolder",
      fields: "files(id,name)",
      q: `name='${FILE_NAME}'`,
    });
    if (list.result.files.length > 0) return list.result.files[0].id;
    const create = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenRef.current}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] }),
    });
    const file = await create.json();
    return file.id;
  }, []);

  const signIn = useCallback(() => {
    if (!window.google?.accounts?.oauth2) {
      alert("Google Sign-in not loaded yet. Wait a moment and try again.");
      return;
    }
    setDriveStatus("signing-in");

    // Use prompt:none first for silent re-auth, fall back to popup
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      // This prevents the page from reloading — keeps everything in a popup
      callback: async (resp) => {
        if (resp.error) {
          console.error("OAuth error:", resp.error);
          setDriveStatus("error");
          return;
        }

        // Store token
        tokenRef.current = resp.access_token;
        lsSet(LS_TOKEN, resp.access_token);
        window.gapi.client.setToken({ access_token: resp.access_token });

        setDriveStatus("loading");

        try {
          // Find or create the Drive file
          const fid = await findOrCreateFile();
          fileIdRef.current = fid;
          lsSet(LS_FILE_ID, fid);

          // Load existing data
          const loadResp = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fid}?alt=media`,
            { headers: { Authorization: `Bearer ${resp.access_token}` } }
          );

          if (loadResp.ok) {
            try {
              const data = await loadResp.json();
              if (data && data.userName) {
                onLoadFromDrive({ ...INIT, ...data });
                lsSet(LS_KEY, data);
              }
            } catch {
              // File exists but empty — that's fine
            }
          }

          setIsSignedIn(true);
          setDriveStatus("ready");
        } catch (e) {
          console.error("Drive setup error:", e);
          setDriveStatus("error");
        }
      },
    });

    // requestAccessToken opens a popup — does NOT redirect the page
    client.requestAccessToken({ prompt: "consent" });
  }, [findOrCreateFile, onLoadFromDrive]);

  // Debounced save — 2s after last state change
  const scheduleSave = useCallback((data) => {
    const fid = fileIdRef.current;
    const token = tokenRef.current;
    if (!fid || !token || !isSignedIn) return;

    clearTimeout(saveTimerRef.current);
    setDriveStatus("saving");

    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fid}?uploadType=media`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );
        setDriveStatus("ready");
      } catch (e) {
        console.error("Drive save error:", e);
        setDriveStatus("error");
      }
    }, 2000);
  }, [isSignedIn]);

  return { driveStatus, isSignedIn, signIn, scheduleSave };
}

// ─── SYNC STATUS BAR ─────────────────────────────────────────────────────────
function SyncBar({ status, isSignedIn, onSignIn }) {
  const cfg = {
    idle:        { color:G.muted,   icon:"○", text:"Not synced to Drive", spin:false },
    "signing-in":{ color:G.accent,  icon:"◌", text:"Connecting...",       spin:true  },
    loading:     { color:G.accent,  icon:"◌", text:"Loading your data...", spin:true  },
    ready:       { color:G.green,   icon:"●", text:"Synced to Drive",     spin:false },
    saving:      { color:G.accent2, icon:"◌", text:"Saving...",           spin:true  },
    error:       { color:G.red,     icon:"◎", text:"Sync error — retry",  spin:false },
  };
  const c = cfg[status] || cfg.idle;

  return (
    <div style={{ padding:"10px 12px", borderTop:`1px solid ${G.border}` }}>
      {!isSignedIn ? (
        <button onClick={onSignIn} style={{
          width:"100%", padding:"9px 12px", borderRadius:8, fontSize:11.5, cursor:"pointer",
          border:`1px solid ${G.accent2}`, background:"rgba(200,184,154,0.07)", color:G.accent,
          fontFamily:"inherit", display:"flex", alignItems:"center", gap:8, justifyContent:"center",
        }}>
          <span style={{fontSize:14}}>☁</span> Connect Google Drive
        </button>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, color:c.color, padding:"0 2px" }}>
          <span className={c.spin?"spin":""} style={{fontSize:10}}>{c.icon}</span>
          {c.text}
        </div>
      )}
    </div>
  );
}

// ─── ONBOARDING ─────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [name,setName]=useState("");
  const [habit,setHabit]=useState("");
  const [dims,setDims]=useState(["","",""]);

  const finish = () => {
    if (!name.trim()) { alert("Please enter your name to continue."); return; }
    onDone({
      name: name.trim(),
      habit: habit.trim(),
      dims: dims.filter(d=>d.trim()).map(d=>({id:uid(),text:d.trim(),rating:0}))
    });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(14,14,14,0.97)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} className="fade-in">
      <div style={{maxWidth:500,width:"90%",background:G.surface,border:`1px solid ${G.border2}`,borderRadius:20,padding:40,maxHeight:"92vh",overflowY:"auto"}} className="fade-up">
        <div style={{fontFamily:"'Instrument Serif',serif",fontSize:28,color:G.accent,marginBottom:6}}>Welcome to Clarity</div>
        <div style={{fontSize:13,color:G.muted,marginBottom:28,lineHeight:1.7}}>This tool tracks the gap between who you are now and who you're becoming. Set up Future You in 60 seconds — you can always edit these later.</div>

        <div style={{marginBottom:18}}>
          <div style={s.cardLabel}>Your name</div>
          <Input value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?"/>
        </div>

        <div style={{marginBottom:18}}>
          <div style={s.cardLabel}>One habit you're building right now</div>
          <Input value={habit} onChange={e=>setHabit(e.target.value)} placeholder='"I document everything I build"'/>
        </div>

        <div style={{marginBottom:26}}>
          <div style={s.cardLabel}>Future Me dimensions <span style={{opacity:0.5,fontStyle:"italic",textTransform:"none",letterSpacing:0}}>(behaviors, not goals)</span></div>
          {dims.map((d,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
              <Input value={d} onChange={e=>{const n=[...dims];n[i]=e.target.value;setDims(n);}}
                placeholder={i===0?'"I ship one Torque demo per week"':i===1?'"I start work within 20 min of waking"':'"I respond to leads the same day"'}/>
              {dims.length>1&&<button onClick={()=>setDims(dims.filter((_,j)=>j!==i))} style={{background:"transparent",border:`1px solid ${G.border}`,color:G.muted,borderRadius:8,padding:"0 10px",cursor:"pointer",fontSize:18,flexShrink:0}}>×</button>}
            </div>
          ))}
          <BtnGhost style={{fontSize:12,marginTop:4}} onClick={()=>setDims([...dims,""])}>+ Add dimension</BtnGhost>
        </div>

        <BtnPrimary style={{width:"100%",justifyContent:"center",padding:"12px 18px",fontSize:14}} onClick={finish}>
          Begin →
        </BtnPrimary>
      </div>
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function Tasks({state,setState}) {
  const [input,setInput]=useState("");
  const [tag,setTag]=useState("today");
  const [filter,setFilter]=useState("today");
  const [stopModal,setStopModal]=useState(null);

  const add=()=>{if(!input.trim())return;setState(s=>({...s,tasks:[...s.tasks,{id:uid(),text:input.trim(),tag,done:false,date:todayStr()}]}));setInput("");};
  const complete=(id)=>setState(s=>({...s,tasks:s.tasks.map(t=>t.id===id?{...t,done:true,doneDate:todayStr()}:t)}));
  const remove=(id)=>{const t=state.tasks.find(x=>x.id===id);if(t&&t.tag==="today"&&!t.done){setStopModal(t);return;}setState(s=>({...s,tasks:s.tasks.filter(x=>x.id!==id)}));};
  const logStop=(reason)=>{if(stopModal)setState(s=>({...s,tasks:s.tasks.filter(x=>x.id!==stopModal.id),stopReasons:[...(s.stopReasons||[]),{date:todayStr(),reason,task:stopModal.text}]}));setStopModal(null);};

  const vague=isVague(input);
  const shown=filter==="all"?state.tasks.filter(t=>!t.done):state.tasks.filter(t=>!t.done&&t.tag===filter);
  const done=state.tasks.filter(t=>t.done&&t.doneDate===todayStr());

  const tagColors={today:{text:G.tagTodayText,bg:G.tagTodayBg},week:{text:G.tagWeekText,bg:G.tagWeekBg},someday:{text:G.tagSomedayText,bg:G.tagSomedayBg}};
  const TagBtn=({t,label})=>{const c=tagColors[t];return<button onClick={()=>setTag(t)} style={{fontSize:11,padding:"4px 12px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",border:`1.5px solid ${tag===t?c.text:G.border}`,background:tag===t?c.bg:"transparent",color:tag===t?c.text:G.muted,opacity:tag===t?1:0.5}}>{label}</button>;};
  const Tab=({f,label})=><div onClick={()=>setFilter(f)} style={{flex:1,padding:"7px 10px",borderRadius:6,fontSize:12,textAlign:"center",cursor:"pointer",background:filter===f?G.surface:"transparent",color:filter===f?G.text:G.muted,border:filter===f?`1px solid ${G.border}`:"1px solid transparent"}}>{label}</div>;

  return (
    <div>
      {stopModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(14,14,14,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}} className="fade-in">
          <div style={{background:G.surface,border:`1px solid ${G.border2}`,borderRadius:12,padding:28,maxWidth:360,width:"90%"}} className="fade-up">
            <div style={{fontSize:15,color:G.text,marginBottom:6}}>Why didn't this happen?</div>
            <div style={{fontSize:12,color:G.muted,marginBottom:18,fontStyle:"italic"}}>"{stopModal.text}"</div>
            {["Got distracted","Wasn't specific enough","Ran out of energy","Changed priority"].map(r=>(
              <button key={r} onClick={()=>logStop(r)} style={{display:"block",width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${G.border}`,fontSize:13,color:G.muted2,cursor:"pointer",background:"transparent",textAlign:"left",marginBottom:8,fontFamily:"inherit"}}>{r}</button>
            ))}
            <BtnGhost style={{marginTop:4,fontSize:12}} onClick={()=>{setState(s=>({...s,tasks:s.tasks.filter(x=>x.id!==stopModal.id)}));setStopModal(null);}}>Just remove it</BtnGhost>
          </div>
        </div>
      )}
      <div style={s.pageHeader} className="fade-up">
        <div style={s.pageTitle}>Next Actions</div>
        <div style={s.pageSub}>Every item must be a concrete physical action — no vague tasks.</div>
      </div>
      <Card>
        <CardLabel>Add action</CardLabel>
        <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="What's the next physical thing you'll do?" onKeyDown={e=>e.key==="Enter"&&add()}/>
        {vague&&<div style={s.promptBox}>→ That sounds vague. What's the next physical thing you'll literally do? Open which file? Type what command?</div>}
        <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:G.muted}}>Tag:</span>
          <TagBtn t="today" label="Today"/><TagBtn t="week" label="This Week"/><TagBtn t="someday" label="Someday"/>
          <BtnPrimary style={{marginLeft:"auto"}} onClick={add}>Add</BtnPrimary>
        </div>
      </Card>
      <div style={{display:"flex",gap:2,background:G.surface2,borderRadius:8,padding:3,marginBottom:20}}>
        <Tab f="today" label="Today"/><Tab f="week" label="This Week"/><Tab f="someday" label="Someday"/><Tab f="all" label="All"/>
      </div>
      <div style={{...s.card,padding:"4px 24px"}}>
        {shown.length===0?<Empty icon="◈">No actions here.<br/>Add something concrete above.</Empty>
        :shown.map(t=>(
          <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 0",borderBottom:`1px solid ${G.border}`}} className="fade-up">
            <div onClick={()=>complete(t.id)} style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${G.border2}`,flexShrink:0,marginTop:2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=G.green;e.currentTarget.style.background=G.greenSoft;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border2;e.currentTarget.style.background="transparent";}}/>
            <div style={{flex:1,fontSize:14,lineHeight:1.5}}>{t.text}</div>
            <span style={s.tag(t.tag)}>{t.tag==="week"?"This Week":t.tag.charAt(0).toUpperCase()+t.tag.slice(1)}</span>
            <span onClick={()=>remove(t.id)} style={{cursor:"pointer",color:G.muted,fontSize:18,padding:"0 2px",lineHeight:1}}>×</span>
          </div>
        ))}
      </div>
      {done.length>0&&(
        <div style={{marginTop:20,borderTop:`1px solid ${G.border}`,paddingTop:16}}>
          <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:G.muted,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
            Done today <span style={{background:G.greenSoft,color:G.green,fontSize:10,padding:"2px 7px",borderRadius:10}}>{done.length}</span>
          </div>
          {done.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${G.border}`,opacity:0.6}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:G.greenSoft,border:`1.5px solid ${G.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:G.green,flexShrink:0}}>✓</div>
              <div style={{flex:1,fontSize:13,textDecoration:"line-through",color:G.muted}}>{t.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Morning({state,setState}) {
  const [input,setInput]=useState("");
  const today=todayStr();
  const ti=state.intents.find(i=>i.date===today);
  const set=()=>{if(!input.trim())return;setState(s=>({...s,intents:[{date:today,text:input.trim()},...s.intents.filter(i=>i.date!==today)]}));setInput("");};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Morning Intent</div><div style={s.pageSub}>One sentence. What matters most today? Not a list — one thing.</div></div>
      <Card>
        {ti?(<><CardLabel>{fmtDate(today)}</CardLabel><div style={{fontFamily:"'Instrument Serif',serif",fontSize:24,color:G.accent,fontStyle:"italic",lineHeight:1.4,padding:"8px 0 16px"}}>{ti.text}</div><BtnGhost onClick={()=>setState(s=>({...s,intents:s.intents.filter(i=>i.date!==today)}))}>Reset for today</BtnGhost></>)
        :(<><CardLabel>Today's one thing</CardLabel><Input value={input} onChange={e=>setInput(e.target.value)} placeholder="What matters most today?" onKeyDown={e=>e.key==="Enter"&&set()} maxLength={120}/><BtnPrimary style={{marginTop:12}} onClick={set}>Set intent</BtnPrimary></>)}
      </Card>
      {state.intents.filter(i=>i.date!==today).length>0&&<Card><CardLabel>Past intents</CardLabel>{state.intents.filter(i=>i.date!==today).slice(0,10).map(i=><div key={i.date} style={{padding:"12px 0",borderBottom:`1px solid ${G.border}`}}><div style={{fontSize:11,color:G.muted,marginBottom:4}}>{fmtDate(i.date)}</div><div style={{fontSize:13,color:G.muted2,fontStyle:"italic"}}>{i.text}</div></div>)}</Card>}
    </div>
  );
}

function Review({state,setState}) {
  const [r1,setR1]=useState("");const [r2,setR2]=useState("");const [r3,setR3]=useState("");
  const save=()=>{if(!r1&&!r2&&!r3)return;setState(s=>({...s,reviews:[{id:uid(),date:todayStr(),time:fmtTime(),r1,r2,r3},...s.reviews]}));setR1("");setR2("");setR3("");};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Daily Review</div><div style={s.pageSub}>Three questions. Under 3 minutes. Do this before you close your laptop.</div></div>
      <Card>
        <CardLabel>Today's review</CardLabel>
        <div style={{marginBottom:14}}><div style={{fontSize:13,color:G.muted2,fontStyle:"italic",marginBottom:7}}>What did you actually complete today?</div><Textarea value={r1} onChange={e=>setR1(e.target.value)} placeholder="Be honest, not impressive..."/></div>
        <div style={{marginBottom:14}}><div style={{fontSize:13,color:G.muted2,fontStyle:"italic",marginBottom:7}}>What got in the way?</div><Textarea value={r2} onChange={e=>setR2(e.target.value)} placeholder="Name it specifically..."/></div>
        <div style={{marginBottom:16}}><div style={{fontSize:13,color:G.muted2,fontStyle:"italic",marginBottom:7}}>What's the single next physical action for tomorrow morning?</div><Textarea value={r3} onChange={e=>setR3(e.target.value)} placeholder="One action, concrete and physical..."/></div>
        <BtnPrimary onClick={save}>Save review</BtnPrimary>
      </Card>
      {state.reviews.slice(0,15).map(r=>(
        <Card key={r.id}>
          <div style={{fontSize:11,color:G.muted,marginBottom:10}}>{fmtDate(r.date)} · {r.time}</div>
          {r.r1&&<div style={{fontSize:13,color:G.text,marginBottom:8,lineHeight:1.6}}><span style={{color:G.muted,fontSize:11}}>Completed — </span>{r.r1}</div>}
          {r.r2&&<div style={{fontSize:13,color:G.text,marginBottom:8,lineHeight:1.6}}><span style={{color:G.muted,fontSize:11}}>In the way — </span>{r.r2}</div>}
          {r.r3&&<div style={{fontSize:13,color:G.text,lineHeight:1.6}}><span style={{color:G.muted,fontSize:11}}>Tomorrow first — </span>{r.r3}</div>}
        </Card>
      ))}
    </div>
  );
}

function CogLoad({state,setState}) {
  const [vals,setVals]=useState({sleep:0,clarity:0,energy:0});
  const avg=(vals.sleep+vals.clarity+vals.energy)/3;
  const mode=avg>=4?"push":avg>=2.5?"moderate":avg>0?"maintenance":null;
  const modeData={push:{bg:"#1a2a1a",border:"#2a4a2a",color:"#80c080",icon:"🟢",text:"You're showing up strong. Push on your hardest work today."},moderate:{bg:"#2a2a1a",border:"#4a4a2a",color:"#c0c060",icon:"🟡",text:"Moderate day. Mix hard and light tasks. Don't waste peak hours on admin."},maintenance:{bg:G.redSoft,border:"#4a2a2a",color:"#c06060",icon:"🔴",text:"Maintenance day. Do only small, concrete things. Don't plan ambitiously on a depleted brain."}};
  const Dots=({k})=><div style={{flex:1,textAlign:"center"}}><div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:6}}>{[1,2,3,4,5].map(i=><div key={i} onClick={()=>setVals(v=>({...v,[k]:i}))} style={{width:26,height:26,borderRadius:"50%",border:`1.5px solid ${vals[k]>=i?G.accent:G.border2}`,background:vals[k]>=i?G.accent:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:vals[k]>=i?"#1a1208":G.muted,transition:"all 0.15s"}}>{i}</div>)}</div><div style={{fontSize:11,color:G.muted,textTransform:"capitalize"}}>{k}</div></div>;
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Cognitive Load</div><div style={s.pageSub}>Rate your state before you plan your day. Capacity determines what's possible.</div></div>
      <Card>
        <CardLabel>How are you showing up today?</CardLabel>
        <div style={{display:"flex",gap:12,marginBottom:16}}><Dots k="sleep"/><Dots k="clarity"/><Dots k="energy"/></div>
        {mode&&<div style={{background:modeData[mode].bg,border:`1px solid ${modeData[mode].border}`,borderRadius:8,padding:"12px 16px",fontSize:13,color:modeData[mode].color,lineHeight:1.5,marginBottom:14}} className="fade-up">{modeData[mode].icon} {modeData[mode].text}</div>}
        <BtnPrimary onClick={()=>setState(s=>({...s,cogLog:[{date:todayStr(),...vals},...s.cogLog]}))}>Log today</BtnPrimary>
      </Card>
    </div>
  );
}

function Avoiding({state,setState}) {
  const [step,setStep]=useState(1);const [thing,setThing]=useState("");const [reason,setReason]=useState("");const [small,setSmall]=useState("");const [done,setDone]=useState(null);
  const finish=()=>{const data={date:todayStr(),thing,reason,small};setState(s=>({...s,avoidLog:[data,...s.avoidLog]}));setDone(data);};
  const reset=()=>{setStep(1);setThing("");setReason("");setSmall("");setDone(null);};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>What Are You Avoiding?</div><div style={s.pageSub}>Name it. Break it down. Just naming it dissolves half the resistance.</div></div>
      <Card>
        {done?(<div className="fade-up"><div style={{fontFamily:"'Instrument Serif',serif",fontSize:20,color:G.accent,marginBottom:12}}>Named it. ✓</div><div style={{fontSize:13,color:G.muted2,lineHeight:1.8}}>Avoiding: <strong style={{color:G.text}}>{done.thing}</strong><br/>Reason: {done.reason}<br/>10-min version: <em style={{color:G.accent}}>{done.small}</em></div><BtnGhost style={{marginTop:16}} onClick={reset}>Do this again</BtnGhost></div>)
        :step===1?(<><div style={{fontSize:13,color:G.muted2,fontStyle:"italic",marginBottom:8}}>What's the one thing you've been putting off the longest?</div><Input value={thing} onChange={e=>setThing(e.target.value)} placeholder="Be specific..." onKeyDown={e=>e.key==="Enter"&&thing.trim()&&setStep(2)}/><BtnPrimary style={{marginTop:12}} onClick={()=>thing.trim()&&setStep(2)}>Next →</BtnPrimary></>)
        :step===2?(<><div style={{fontSize:13,color:G.muted2,fontStyle:"italic",marginBottom:12}}>What's the actual reason?</div><div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{["It's unclear","It's scary","It's boring","It feels too big"].map(r=><button key={r} onClick={()=>setReason(r)} style={{padding:"8px 16px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"inherit",border:`1.5px solid ${reason===r?G.accent2:G.border}`,background:reason===r?"rgba(168,144,112,0.1)":"transparent",color:reason===r?G.accent:G.muted2}}>{r}</button>)}</div><BtnPrimary onClick={()=>reason&&setStep(3)} disabled={!reason}>Next →</BtnPrimary></>)
        :(<><div style={{fontSize:13,color:G.muted2,fontStyle:"italic",marginBottom:8}}>What's the smallest version you could do in 10 minutes?</div><Input value={small} onChange={e=>setSmall(e.target.value)} placeholder="The tiniest possible version..." onKeyDown={e=>e.key==="Enter"&&small.trim()&&finish()}/><BtnPrimary style={{marginTop:12}} onClick={()=>small.trim()&&finish()}>Done — I've named it</BtnPrimary></>)}
      </Card>
    </div>
  );
}

function Doomscroll({state,setState}) {
  const log=(val)=>{const t=todayStr();setState(s=>({...s,doom:[{date:t,val},...s.doom.filter(d=>d.date!==t)]}));};
  const last30=[...Array(30)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split("T")[0];});
  const logged=last30.filter(d=>state.doom.find(x=>x.date===d));
  const labels={no:"✓ Didn't scroll","yes-short":"~15 min","yes-long":"30–60 min","yes-heavy":"1h+"};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Doomscroll Log</div><div style={s.pageSub}>No judgment. Just honest data. Seeing the pattern is sobering enough.</div></div>
      <Card><CardLabel>Did you doomscroll today?</CardLabel><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[{v:"no",l:"No, I didn't"},{v:"yes-short",l:"~15 min"},{v:"yes-long",l:"30–60 min"},{v:"yes-heavy",l:"1h+"}].map(o=><button key={o.v} onClick={()=>log(o.v)} style={{padding:"9px 16px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"inherit",border:`1.5px solid ${o.v==="no"?G.green:G.red}`,background:o.v==="no"?G.greenSoft:G.redSoft,color:o.v==="no"?G.green:G.red}}>{o.l}</button>)}</div></Card>
      <Card><CardLabel>Last 30 days</CardLabel>
        {logged.length===0?<Empty icon="◻">No entries yet.</Empty>:<div style={{fontSize:12,color:G.muted,lineHeight:2}}>{logged.map(d=>{const e=state.doom.find(x=>x.date===d);return<div key={d}>{fmtDate(d)}: <span style={{color:e?.val==="no"?G.green:G.red}}>{labels[e?.val]||e?.val}</span></div>;})}</div>}
        {logged.length>0&&<div style={{marginTop:12,fontSize:12,color:G.muted}}>You doomscrolled {logged.filter(d=>state.doom.find(x=>x.date===d)?.val!=="no").length} out of {logged.length} logged days.</div>}
      </Card>
    </div>
  );
}

function Energy({state,setState}) {
  const log=(level)=>setState(s=>({...s,energyLog:[{id:uid(),date:todayStr(),time:fmtTime(),level},...s.energyLog]}));
  const levels=[{v:"sharp",label:"🟢 Sharp",color:G.green,bg:G.greenSoft},{v:"okay",label:"🟡 Okay",color:"#c0c060",bg:"#2a2a1a"},{v:"foggy",label:"🔴 Foggy",color:G.muted,bg:G.surface2}];
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Energy Peaks</div><div style={s.pageSub}>Log your focus a few times a day. Patterns emerge after a week.</div></div>
      <Card><CardLabel>How's your focus right now?</CardLabel><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{levels.map(l=><button key={l.v} onClick={()=>log(l.v)} style={{padding:"8px 16px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"inherit",border:`1.5px solid ${l.color}`,background:l.bg,color:l.color}}>{l.label}</button>)}</div></Card>
      <Card><CardLabel>Energy log</CardLabel>
        {state.energyLog.length===0?<Empty icon="◐">Log your focus a few times today.</Empty>
        :state.energyLog.slice(0,40).map(e=>{const l=levels.find(x=>x.v===e.level)||levels[2];return<div key={e.id} style={{display:"flex",gap:12,alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${G.border}`}}><span style={{color:G.muted,fontSize:11,flexShrink:0,minWidth:130}}>{e.date} {e.time}</span><span style={{padding:"3px 12px",borderRadius:20,fontSize:11,background:l.bg,color:l.color,border:`1px solid ${l.color}`}}>{l.label}</span></div>;})}
      </Card>
    </div>
  );
}

function Loops({state,setState}) {
  const [input,setInput]=useState("");
  const add=()=>{if(!input.trim())return;setState(s=>({...s,loops:[...s.loops,{id:uid(),text:input.trim(),date:todayStr()}]}));setInput("");};
  const convert=(id)=>{const l=state.loops.find(x=>x.id===id);if(!l)return;setState(s=>({...s,loops:s.loops.filter(x=>x.id!==id),tasks:[...s.tasks,{id:uid(),text:l.text,tag:"today",done:false,date:todayStr()}]}));};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Open Loop Inbox</div><div style={s.pageSub}>Everything in your head that isn't a task yet. Get it out.</div></div>
      <Card><CardLabel>Dump it here</CardLabel><Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Unfinished thought, vague intention, anxiety..." onKeyDown={e=>e.key==="Enter"&&add()}/><BtnPrimary style={{marginTop:10}} onClick={add}>Add to inbox</BtnPrimary></Card>
      <Card><CardLabel>Your loops {state.loops.length>0&&<span style={{color:G.muted}}>({state.loops.length})</span>}</CardLabel>
        {state.loops.length===0?<Empty icon="○">Your mind is clear.</Empty>
        :state.loops.map(l=><div key={l.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 0",borderBottom:`1px solid ${G.border}`}} className="fade-up">
          <div style={{flex:1,fontSize:13,color:G.muted2,lineHeight:1.5}}>{l.text}</div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>convert(l.id)} style={{fontSize:10,padding:"3px 9px",borderRadius:4,cursor:"pointer",border:`1px solid ${G.tagTodayBg}`,background:G.tagTodayBg,color:G.tagTodayText,fontFamily:"inherit"}}>→ Task</button>
            <button onClick={()=>setState(s=>({...s,loops:s.loops.filter(x=>x.id!==l.id)}))} style={{fontSize:10,padding:"3px 9px",borderRadius:4,cursor:"pointer",border:`1px solid ${G.border}`,background:"transparent",color:G.muted,fontFamily:"inherit"}}>Delete</button>
          </div>
        </div>)}
      </Card>
    </div>
  );
}

function Shipping({state,setState}) {
  const [input,setInput]=useState("");
  const icons=["◆","◈","◉","▲","●"];
  const add=()=>{if(!input.trim())return;setState(s=>({...s,ships:[{id:uid(),text:input.trim(),date:todayStr(),time:fmtTime(),icon:icons[Math.floor(Math.random()*icons.length)]},...s.ships]}));setInput("");};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Shipping Log</div><div style={s.pageSub}>Not tasks — outputs. Proof that you're moving. Read this on low-motivation days.</div></div>
      <Card><CardLabel>Log what you shipped</CardLabel><Input value={input} onChange={e=>setInput(e.target.value)} placeholder="e.g. Recorded Torque demo for lead gen workflow..." onKeyDown={e=>e.key==="Enter"&&add()}/><BtnPrimary style={{marginTop:10}} onClick={add}>Log it</BtnPrimary></Card>
      <Card><CardLabel>What you've shipped</CardLabel>
        {state.ships.length===0?<Empty icon="◆">Log your first shipped output.<br/>Proof beats motivation.</Empty>
        :state.ships.map(s_=><div key={s_.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 0",borderBottom:`1px solid ${G.border}`}} className="fade-up">
          <div style={{width:32,height:32,borderRadius:"50%",background:G.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:G.green}}>{s_.icon}</div>
          <div style={{flex:1}}><div style={{fontSize:14,color:G.text}}>{s_.text}</div><div style={{fontSize:11,color:G.muted,marginTop:2}}>{fmtDate(s_.date)} · {s_.time}</div></div>
          <span onClick={()=>setState(s=>({...s,ships:s.ships.filter(x=>x.id!==s_.id)}))} style={{cursor:"pointer",color:G.muted,fontSize:17,padding:"0 2px"}}>×</span>
        </div>)}
      </Card>
    </div>
  );
}

function Habit({state,setState}) {
  const [input,setInput]=useState("");
  const today=todayStr();
  const done=state.habitDays[today];
  const last30=[...Array(30)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().split("T")[0];});
  const count=last30.filter(d=>state.habitDays[d]).length;
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>The One Habit</div><div style={s.pageSub}>One habit. One checkbox. Tracking ten habits means tracking zero.</div></div>
      {!state.habit?(<Card><CardLabel>Define your one habit</CardLabel><Input value={input} onChange={e=>setInput(e.target.value)} placeholder='"I start work within 20 minutes of waking"' onKeyDown={e=>e.key==="Enter"&&input.trim()&&setState(s=>({...s,habit:input.trim()}))}/><BtnPrimary style={{marginTop:10}} onClick={()=>input.trim()&&setState(s=>({...s,habit:input.trim()}))}>Set habit</BtnPrimary></Card>)
      :(<Card>
        <div style={{display:"flex",alignItems:"center",gap:20,padding:"8px 0 16px"}}>
          <div onClick={()=>setState(s=>({...s,habitDays:{...s.habitDays,[today]:!s.habitDays[today]}}))} style={{width:56,height:56,borderRadius:"50%",border:`2px solid ${done?G.green:G.border2}`,background:done?G.greenSoft:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:G.green,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",flexShrink:0}}>{done?"✓":""}</div>
          <div><div style={{fontSize:15,color:G.text,marginBottom:4}}>{state.habit}</div><div style={{fontSize:12,color:G.muted}}>{count} out of last 30 days</div></div>
        </div>
        <BtnGhost onClick={()=>setState(s=>({...s,habit:null}))}>Change habit</BtnGhost>
      </Card>)}
    </div>
  );
}

function FutureMe({state,setState}) {
  const [input,setInput]=useState("");
  const add=()=>{if(!input.trim())return;setState(s=>({...s,dims:[...s.dims,{id:uid(),text:input.trim(),rating:0}]}));setInput("");};
  const avg=state.dims.length?state.dims.reduce((a,d)=>a+(d.rating||0),0)/state.dims.length:0;
  const pct=Math.round(avg);const circ=364.4;const offset=circ*(1-avg/100);
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Future Me Gap</div><div style={s.pageSub}>Rate yourself weekly. The gap closing over time is the progress.</div></div>
      <Card>
        <div style={{display:"flex",gap:28,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
            <div style={{position:"relative",width:130,height:130}}>
              <svg width="130" height="130" viewBox="0 0 130 130" style={{transform:"rotate(-90deg)"}}>
                <circle cx="65" cy="65" r="54" fill="none" stroke={G.border2} strokeWidth="7"/>
                <circle cx="65" cy="65" r="54" fill="none" stroke={G.accent} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontFamily:"'Instrument Serif',serif",fontSize:34,color:G.accent,lineHeight:1}}>{state.dims.length?pct+"%":"—"}</div>
                <div style={{fontSize:9,color:G.muted,letterSpacing:1,textTransform:"uppercase",marginTop:3}}>Progress</div>
              </div>
            </div>
            <div style={{fontSize:12,color:G.muted,marginTop:12,textAlign:"center",maxWidth:140,lineHeight:1.5}}>{state.dims.length?(pct<100?`${100-pct}% gap to Future You`:"You're living it."):"Add dimensions below"}</div>
          </div>
          <div style={{flex:1,minWidth:200}}>
            {state.dims.length===0?<div style={{color:G.muted,fontSize:13,lineHeight:1.7,paddingTop:8}}>Add your Future Me dimensions below.</div>
            :state.dims.map(d=>(
              <div key={d.id} style={{marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <span style={{fontSize:13,color:G.text,flex:1,paddingRight:8,lineHeight:1.4}}>{d.text}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <span style={{fontFamily:"'Instrument Serif',serif",fontSize:16,color:G.accent}}>{d.rating||0}%</span>
                    <span onClick={()=>setState(s=>({...s,dims:s.dims.filter(x=>x.id!==d.id)}))} style={{cursor:"pointer",color:G.muted,fontSize:16}}>×</span>
                  </div>
                </div>
                <input type="range" min="0" max="100" value={d.rating||0} onChange={e=>setState(s=>({...s,dims:s.dims.map(x=>x.id===d.id?{...x,rating:+e.target.value}:x)}))}/>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card><CardLabel>Add dimension</CardLabel><Input value={input} onChange={e=>setInput(e.target.value)} placeholder='"I document everything I build"' onKeyDown={e=>e.key==="Enter"&&add()}/><BtnPrimary style={{marginTop:10}} onClick={add}>Add</BtnPrimary></Card>
    </div>
  );
}

function NotDoing({state,setState}) {
  const [input,setInput]=useState("");
  const add=()=>{if(!input.trim())return;setState(s=>({...s,nd:[...s.nd,{id:uid(),text:input.trim()}]}));setInput("");};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Not Doing This Week</div><div style={s.pageSub}>Deliberately deferred. Not forgotten — chosen. This removes the guilt.</div></div>
      <Card><CardLabel>Add to not-doing list</CardLabel><Input value={input} onChange={e=>setInput(e.target.value)} placeholder="What are you consciously not doing this week?" onKeyDown={e=>e.key==="Enter"&&add()}/><BtnPrimary style={{marginTop:10}} onClick={add}>Add</BtnPrimary></Card>
      <Card><CardLabel>This week I am not doing</CardLabel>
        {state.nd.length===0?<Empty icon="◁">Things you consciously skip go here.</Empty>
        :state.nd.map(n=><div key={n.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${G.border}`,fontSize:13,color:G.muted2}} className="fade-up">
          <span style={{color:G.muted,fontSize:11,flexShrink:0}}>✗</span><span style={{flex:1}}>{n.text}</span>
          <span onClick={()=>setState(s=>({...s,nd:s.nd.filter(x=>x.id!==n.id)}))} style={{cursor:"pointer",color:G.muted,fontSize:17}}>×</span>
        </div>)}
      </Card>
    </div>
  );
}

function Friction({state,setState}) {
  const [input,setInput]=useState("");
  const add=()=>{if(!input.trim())return;setState(s=>({...s,friction:[{id:uid(),text:input.trim(),date:todayStr()},...s.friction]}));setInput("");};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Friction Log</div><div style={s.pageSub}>Name what slowed you down. No solution required. Patterns emerge on their own.</div></div>
      <Card><CardLabel>This week's friction</CardLabel><Textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="What slowed you down most this week?"/><BtnPrimary style={{marginTop:10}} onClick={add}>Log it</BtnPrimary></Card>
      {state.friction.length===0?<Empty icon="◂">Name what slows you down.</Empty>
      :state.friction.map(f=><Card key={f.id}><div style={{fontSize:11,color:G.muted,marginBottom:6}}>{fmtDate(f.date)}</div><div style={{fontSize:13,color:G.muted2,lineHeight:1.6}}>{f.text}</div></Card>)}
    </div>
  );
}

function GoodEnough({state,setState}) {
  const [proj,setProj]=useState("");const [thresh,setThresh]=useState("");
  const add=()=>{if(!proj.trim()||!thresh.trim())return;setState(s=>({...s,ge:[...s.ge,{id:uid(),project:proj.trim(),threshold:thresh.trim()}]}));setProj("");setThresh("");};
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Good Enough to Ship</div><div style={s.pageSub}>Define done-enough before you start. It stops the perfectionism loop.</div></div>
      <Card><CardLabel>Add project threshold</CardLabel><Input value={proj} onChange={e=>setProj(e.target.value)} placeholder="Project name" style={{marginBottom:8}}/><Textarea value={thresh} onChange={e=>setThresh(e.target.value)} placeholder="Done enough means..."/><BtnPrimary style={{marginTop:10}} onClick={add}>Save threshold</BtnPrimary></Card>
      <Card><CardLabel>Your thresholds</CardLabel>
        {state.ge.length===0?<Empty icon="◇">Define done-enough for your projects.</Empty>
        :state.ge.map(g=><div key={g.id} style={{padding:"13px 0",borderBottom:`1px solid ${G.border}`}} className="fade-up">
          <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:14,color:G.text,marginBottom:4}}>{g.project}</div><span onClick={()=>setState(s=>({...s,ge:s.ge.filter(x=>x.id!==g.id)}))} style={{cursor:"pointer",color:G.muted,fontSize:17}}>×</span></div>
          <div style={{fontSize:12,color:G.muted2,fontStyle:"italic",lineHeight:1.5}}>{g.threshold}</div>
        </div>)}
      </Card>
    </div>
  );
}

function Reflection({state,setState}) {
  const [choice,setChoice]=useState(null);const [note,setNote]=useState("");
  const save=()=>{if(!choice)return;setState(s=>({...s,reflections:[{id:uid(),date:todayStr(),choice,note},...s.reflections]}));setChoice(null);setNote("");};
  const opts=[{v:"yes",label:"Yes, they did",color:G.green,bg:G.greenSoft},{v:"partially",label:"Partially",color:"#c0c060",bg:"#2a2a1a"},{v:"no",label:"Not really",color:G.red,bg:G.redSoft}];
  return (
    <div>
      <div style={s.pageHeader} className="fade-up"><div style={s.pageTitle}>Weekly Reflection</div><div style={s.pageSub}>One question. One line. Five minutes max.</div></div>
      <Card>
        <div style={{fontFamily:"'Instrument Serif',serif",fontSize:18,color:G.text,marginBottom:14,lineHeight:1.4}}>Did your actions this week match who you're trying to become?</div>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>{opts.map(o=><button key={o.v} onClick={()=>setChoice(o.v)} style={{flex:1,minWidth:100,padding:"11px 12px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:`1.5px solid ${choice===o.v?o.color:G.border}`,background:choice===o.v?o.bg:"transparent",color:choice===o.v?o.color:G.muted2}}>{o.label}</button>)}</div>
        <Textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="One line about why..." style={{marginBottom:12}}/>
        <BtnPrimary onClick={save}>Save reflection</BtnPrimary>
      </Card>
      {state.reflections.map(r=>{const o=opts.find(x=>x.v===r.choice)||opts[2];return<Card key={r.id}><div style={{fontSize:11,color:G.muted,marginBottom:8}}>{fmtDate(r.date)}</div><div style={{fontSize:13,color:o.color,marginBottom:r.note?8:0}}>{o.label}</div>{r.note&&<div style={{fontSize:13,color:G.muted2,lineHeight:1.5}}>{r.note}</div>}</Card>;})}
    </div>
  );
}

// ─── NAV + PAGE MAP ──────────────────────────────────────────────────────────
const NAV=[
  {section:"Daily",items:[{id:"tasks",icon:"◈",label:"Actions"},{id:"morning",icon:"◌",label:"Morning Intent"},{id:"review",icon:"◎",label:"Daily Review"},{id:"cog",icon:"◑",label:"Cognitive Load"}]},
  {section:"Awareness",items:[{id:"avoiding",icon:"◷",label:"Avoiding"},{id:"doomscroll",icon:"◻",label:"Doomscroll Log"},{id:"energy",icon:"◐",label:"Energy Peaks"}]},
  {section:"Build",items:[{id:"loops",icon:"○",label:"Open Loops"},{id:"shipping",icon:"◆",label:"Shipping Log"},{id:"habit",icon:"◉",label:"Habit"}]},
  {section:"Weekly",items:[{id:"future",icon:"◈",label:"Future Me"},{id:"notdoing",icon:"◁",label:"Not Doing"},{id:"friction",icon:"◂",label:"Friction Log"},{id:"goodenough",icon:"◇",label:"Good Enough"},{id:"reflect",icon:"◈",label:"Reflection"}]},
];
const PAGES={tasks:Tasks,morning:Morning,review:Review,cog:CogLoad,avoiding:Avoiding,doomscroll:Doomscroll,energy:Energy,loops:Loops,shipping:Shipping,habit:Habit,future:FutureMe,notdoing:NotDoing,friction:Friction,goodenough:GoodEnough,reflect:Reflection};

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function App() {
  // Load from localStorage on first render
  const [state, setState] = useState(() => loadLocalState());
  const [page, setPage] = useState("tasks");
  const [showOnboard, setShowOnboard] = useState(() => !loadLocalState().userName);
  const mainRef = useRef(null);

  // Callback when Drive loads data — merge into state
  const handleLoadFromDrive = useCallback((driveData) => {
    setState(driveData);
    if (driveData.userName) setShowOnboard(false);
  }, []);

  const { driveStatus, isSignedIn, signIn, scheduleSave } = useDriveSync(state, handleLoadFromDrive);

  // Save to localStorage on every state change
  useEffect(() => {
    if (!showOnboard && state.userName) {
      lsSet(LS_KEY, state);
    }
  }, [state, showOnboard]);

  // Save to Drive (debounced) on every state change
  useEffect(() => {
    if (isSignedIn && !showOnboard && state.userName) {
      scheduleSave(state);
    }
  }, [state, isSignedIn, showOnboard]);

  const handleOnboard = ({ name, habit, dims }) => {
    const newState = { ...state, userName: name, habit: habit || null, dims };
    setState(newState);
    lsSet(LS_KEY, newState);
    setShowOnboard(false);
  };

  const goto = (p) => { setPage(p); if (mainRef.current) mainRef.current.scrollTop = 0; };

  const now = new Date();
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const PageComponent = PAGES[page] || Tasks;

  return (
    <>
      <style>{css}</style>
      {showOnboard && <Onboarding onDone={handleOnboard} />}
      <div style={s.shell}>
        <aside style={s.sidebar}>
          <div style={s.logoWrap}>
            <div style={s.logoName}>Clarity</div>
            <div style={s.logoTag}>Build the gap</div>
          </div>
          <nav style={{flex:1,padding:"0 0 8px"}}>
            {NAV.map(section=>(
              <div key={section.section}>
                <div style={s.navSection}>{section.section}</div>
                {section.items.map(item=>(
                  <div key={item.id} style={s.navItem(page===item.id)} onClick={()=>goto(item.id)}>
                    <span style={s.navIcon}>{item.icon}</span>{item.label}
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <SyncBar status={driveStatus} isSignedIn={isSignedIn} onSignIn={signIn}/>
          <div style={s.dateBlock}>
            <div style={s.dateBig}>{now.getDate()}</div>
            <div style={s.dateSub}>{days[now.getDay()]}, {months[now.getMonth()]}</div>
          </div>
        </aside>
        <main ref={mainRef} style={s.main}>
          <PageComponent state={state} setState={setState} key={page}/>
        </main>
      </div>
    </>
  );
}
