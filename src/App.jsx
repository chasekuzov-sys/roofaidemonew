import { useState, useEffect, useRef } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const STAGES = ["New Lead","Inspection Scheduled","Estimate Sent","Follow-Up","Negotiating","Closed Won","Closed Lost"];
const SM = {
  "New Lead":             { color:"#60a5fa", accent:"#1d4ed8", action:"Send intro message",   urgency:2 },
  "Inspection Scheduled": { color:"#c084fc", accent:"#7c3aed", action:"Confirm appointment",  urgency:2 },
  "Estimate Sent":        { color:"#fbbf24", accent:"#d97706", action:"Follow up on estimate", urgency:3 },
  "Follow-Up":            { color:"#f87171", accent:"#dc2626", action:"Re-engage homeowner",   urgency:4 },
  "Negotiating":          { color:"#fb923c", accent:"#ea580c", action:"Update on supplement",  urgency:4 },
  "Closed Won":           { color:"#34d399", accent:"#059669", action:"Request referral",      urgency:1 },
  "Closed Lost":          { color:"#6b7280", accent:"#4b5563", action:"Check back in 90 days", urgency:0 },
};
const WIN_P = { "New Lead":15,"Inspection Scheduled":35,"Estimate Sent":50,"Follow-Up":40,"Negotiating":65,"Closed Won":100,"Closed Lost":0 };
const LEAD_SOURCES = ["Referral","Door Knock","Storm Lead","Online","Repeat Customer","Other"];
const SOURCE_COLORS = { "Referral":"#34d399","Door Knock":"#60a5fa","Storm Lead":"#fbbf24","Online":"#c084fc","Repeat Customer":"#fb7185","Other":"#6b7280" };
const LOSS_REASONS = ["Price too high","Went with competitor","Homeowner not ready","Insurance denied","No response"];
const WIN_REASONS  = ["Best price","Referral trust","Fastest timeline","Financing offered","Insurance handled"];
const SEQ = {
  "New Lead":      [{day:0,ch:"sms",msg:"Hi {name}! This is {rep} from {co}. You may have storm damage — I'd love to schedule a free inspection. When works?"},{day:2,ch:"sms",msg:"Hey {name}, following up. We work directly with your insurance at no cost unless we find damage. Available this week?"},{day:5,ch:"email",msg:"Hi {name}, last follow-up. We have an opening Friday morning to inspect your roof. Let me know!"}],
  "Estimate Sent": [{day:2,ch:"sms",msg:"Hi {name}, just checking you received the estimate. Happy to walk through it — takes 10 min. Questions?"},{day:5,ch:"sms",msg:"Hey {name}, we offer 0% financing for 12 months which brings your cost way down. Want details?"},{day:10,ch:"email",msg:"Hi {name}, finalizing our schedule this week. I'd hate you to lose your spot — ready to move forward?"}],
  "Follow-Up":     [{day:1,ch:"sms",msg:"Hey {name}, still thinking things over? Happy to answer any questions or adjust the estimate."},{day:4,ch:"sms",msg:"{name}, booking up fast this season. Want to lock in a date?"},{day:8,ch:"email",msg:"Hi {name}, if pricing was a concern we have flexible financing. Would love to make this work."}],
};
const REPLIES = { 1:"Hey, still thinking about it. Can you do anything about the deductible?",2:"Just reviewed the estimate — looks good. Can we schedule a call?",3:"Do you really offer 0% financing? Want me to send details?",4:"Sounds good. Let me know when the supplement resolves.",5:"Hi! Derek gave me your number. When can you come look?" };
const PITCH_M = { "4/12":1.0,"5/12":1.05,"6/12":1.1,"7/12":1.15,"8/12":1.2,"9/12":1.28,"10/12":1.36,"steep":1.5 };
const SHINGLE_C = { "3-tab":85,"architectural":110,"designer":165,"metal":380,"tile":420 };
const TEAROFF_C = { "1_layer":55,"2_layers":85,"3_layers":120,"none":0 };

const LEADS = [
  {id:1,name:"Mike Hargrove",phone:"(720) 555-0182",email:"mike.hargrove@gmail.com",address:"4821 Pinecrest Dr, Denver CO",rep:"Jordan S.",stage:"Follow-Up",daysSince:3,value:18400,insurance:"State Farm",claimType:"Hail Damage",adjuster:"Carol Jennings",insOffer:14200,estValue:18400,source:"Storm Lead",outcome:null,notes:"Hesitant about deductible. Two competing quotes.",hasUnread:false,seqActive:false,estPending:false,estApproved:null,messages:[{from:"us",ch:"sms",text:"Hey Mike — sent over the estimate and financing options.",date:"Apr 17",time:"9:05 AM"},{from:"them",ch:"email",text:"Still comparing options. What's your timeline?",date:"Apr 15",time:"2:41 PM"}]},
  {id:2,name:"Sandra Olvera",phone:"(720) 555-0341",email:"sandra.o@outlook.com",address:"912 Maple Ave, Aurora CO",rep:"Jordan S.",stage:"Estimate Sent",daysSince:1,value:12750,insurance:"Allstate",claimType:"Wind Damage",adjuster:"Tom Burke",insOffer:12750,estValue:12750,source:"Referral",outcome:null,notes:"Very motivated. Wants done before summer.",hasUnread:false,seqActive:true,estPending:false,estApproved:null,messages:[{from:"us",ch:"email",text:"Sandra, attached is the full estimate — $12,750. We work directly with Allstate.",date:"Apr 18",time:"11:00 AM"}]},
  {id:3,name:"Patricia Wynn",phone:"(720) 555-0915",email:"pwynn@hotmail.com",address:"2201 Columbine Way, Westminster CO",rep:"Marcus T.",stage:"Inspection Scheduled",daysSince:2,value:15600,insurance:"Progressive",claimType:"Hail Damage",adjuster:"Pending",insOffer:0,estValue:15600,source:"Door Knock",outcome:null,notes:"Inspection Friday 10am. Asked about financing.",hasUnread:true,seqActive:false,estPending:true,estApproved:null,messages:[{from:"us",ch:"sms",text:"Confirmed your inspection Friday Apr 25 at 10am!",date:"Apr 19",time:"1:15 PM"},{from:"them",ch:"sms",text:"Confirmed! Do you offer financing?",date:"Apr 19",time:"2:02 PM"}]},
  {id:4,name:"James Thornton",phone:"(303) 555-0092",email:"jthornton@yahoo.com",address:"3307 Ridgeline Blvd, Littleton CO",rep:"Marcus T.",stage:"Negotiating",daysSince:0,value:24100,insurance:"Liberty Mutual",claimType:"Hail + Wind",adjuster:"Priya Shah",insOffer:19900,estValue:24100,source:"Storm Lead",outcome:null,notes:"Insurance came in $4,200 short. Supplement filed.",hasUnread:false,seqActive:false,estPending:false,estApproved:null,messages:[{from:"us",ch:"sms",text:"Supplement filed with Liberty Mutual — resolves in 1-2 weeks.",date:"Apr 19",time:"8:30 AM"},{from:"them",ch:"sms",text:"Ok. Will that delay our start date?",date:"Apr 14",time:"9:15 AM"}]},
  {id:5,name:"Brenda Castillo",phone:"(720) 555-0774",email:"bcastillo@gmail.com",address:"588 Oak Street, Centennial CO",rep:"Jordan S.",stage:"New Lead",daysSince:0,value:9800,insurance:"USAA",claimType:"Hail Damage",adjuster:"Pending",insOffer:0,estValue:9800,source:"Referral",outcome:null,notes:"Referral from Derek. Hasn't filed claim yet.",hasUnread:false,seqActive:true,estPending:false,estApproved:null,messages:[]},
  {id:6,name:"Derek Faulkner",phone:"(303) 555-0561",email:"dfaulkner@comcast.net",address:"1145 Summit Ridge, Parker CO",rep:"Marcus T.",stage:"Closed Won",daysSince:11,value:31500,insurance:"Farmers",claimType:"Wind + Hail",adjuster:"Stan Miller",insOffer:31500,estValue:31500,source:"Referral",outcome:"Referral trust",notes:"Job starts May 3rd. Referred Brenda.",hasUnread:false,seqActive:false,estPending:false,estApproved:null,messages:[{from:"us",ch:"sms",text:"Job confirmed May 3rd. Thanks for the referral!",date:"Apr 10",time:"3:00 PM"}]},
  {id:7,name:"Tony Reeves",phone:"(303) 555-0228",email:"treeves@gmail.com",address:"2211 Oak Ave, Parker CO",rep:"Jordan S.",stage:"Closed Lost",daysSince:14,value:11200,insurance:"Geico",claimType:"Wind Damage",adjuster:"Dan Park",insOffer:8000,estValue:11200,source:"Online",outcome:"Price too high",notes:"Went with cheaper competitor.",hasUnread:false,seqActive:false,estPending:false,estApproved:null,messages:[{from:"us",ch:"sms",text:"Following up one last time.",date:"Apr 7",time:"10:00 AM"},{from:"them",ch:"sms",text:"Decided to go with someone else, sorry.",date:"Apr 8",time:"2:20 PM"}]},
];

function urgOf(l){ if(["Closed Won","Closed Lost"].includes(l.stage))return 0; return Math.min(l.daysSince*20,60)+(SM[l.stage]?.urgency||2)*10+(l.hasUnread?50:0)+(l.estApproved&&!l.estSent?40:0); }

async function ai(system,user,max=1200){
  const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,user,max_tokens:max})});
  if(!r.ok)throw new Error("API error");
  const d=await r.json();
  if(d.error)throw new Error(d.error);
  return d.text;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const I={
  back:  ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
  plus:  ()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  send:  ()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  check: ()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  bolt:  ()=><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  phone: ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  mail:  ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  doc:   ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  clock: ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  edit:  ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>,
  warn:  ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  reply: ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>,
};

function Spin({s=13,c="#fff"}){return <span style={{display:"inline-block",width:s,height:s,border:`2px solid ${c}33`,borderTopColor:c,borderRadius:"50%",animation:"spin .6s linear infinite",flexShrink:0}}/>;}

// ─── TOASTS ──────────────────────────────────────────────────────────────────
function SendToast({name,onDone}){
  const [p,setP]=useState(0);
  useEffect(()=>{const t1=setTimeout(()=>setP(1),1200);const t2=setTimeout(()=>onDone(),2600);return()=>{clearTimeout(t1);clearTimeout(t2);};},[]);
  return(
    <div style={{position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%)",zIndex:500,pointerEvents:"none",animation:"toastUp .25s cubic-bezier(.34,1.56,.64,1)"}}>
      <div style={{background:p?"#0d1a0f":"#0a0a0a",border:`1px solid ${p?"#22c55e33":"#ffffff15"}`,borderRadius:14,padding:"13px 22px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 20px 60px rgba(0,0,0,0.5)",minWidth:220,transition:"background .4s,border .4s"}}>
        {p?<span style={{color:"#22c55e",display:"flex"}}><I.check/></span>:<Spin/>}
        <span style={{color:"#fff",fontSize:14,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>{p?`Sent to ${name} ✓`:`Sending to ${name}…`}</span>
      </div>
    </div>
  );
}

function ReplyToast({name,preview,onTap,onDone}){
  useEffect(()=>{const t=setTimeout(()=>onDone(),6000);return()=>clearTimeout(t);},[]);
  return(
    <div onClick={onTap} style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:500,width:"calc(100% - 32px)",maxWidth:460,cursor:"pointer",animation:"toastDown .3s cubic-bezier(.34,1.56,.64,1)"}}>
      <div style={{background:"#0a0a0a",border:"1px solid #22c55e44",borderRadius:18,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{width:38,height:38,borderRadius:12,background:"#0d1a0f",border:"1px solid #22c55e33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💬</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:2,fontFamily:"'DM Sans',sans-serif"}}>Reply from {name}</div>
          <div style={{fontSize:12,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{preview}</div>
        </div>
        <div style={{fontSize:11,color:"#22c55e",fontWeight:700,flexShrink:0}}>View →</div>
      </div>
    </div>
  );
}

function OutcomeSheet({stage,onConfirm,onCancel}){
  const isWon=stage==="Closed Won";
  const [sel,setSel]=useState(null);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400,backdropFilter:"blur(8px)"}}>
      <div style={{background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"28px 24px 40px"}}>
        <div style={{width:36,height:4,background:"#333",borderRadius:2,margin:"0 auto 24px"}}/>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:10}}>{isWon?"🏆":"📋"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"'DM Serif Display',serif",marginBottom:6}}>{isWon?"What closed it?":"Why did we lose?"}</div>
          <div style={{fontSize:13,color:"#6b7280"}}>{isWon?"Helps the team repeat what works":"Helps improve future pitches"}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
          {(isWon?WIN_REASONS:LOSS_REASONS).map(r=>(
            <button key={r} onClick={()=>setSel(r)} style={{padding:"14px 18px",borderRadius:12,border:`1.5px solid ${sel===r?(isWon?"#22c55e":"#ef4444"):"#1a1a1a"}`,background:sel===r?(isWon?"#0d1a0f":"#1a0a0a"):"#141414",fontSize:14,fontWeight:sel===r?700:400,color:sel===r?(isWon?"#22c55e":"#ef4444"):"#9ca3af",cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",transition:"all .15s"}}>
              {r}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"14px",background:"#141414",border:"1px solid #1a1a1a",borderRadius:12,fontSize:14,fontWeight:600,color:"#6b7280",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          <button onClick={()=>onConfirm(sel)} disabled={!sel} style={{flex:2,padding:"14px",background:sel?(isWon?"#22c55e":"#fff"):"#1a1a1a",border:"none",borderRadius:12,fontSize:14,fontWeight:800,color:sel?(isWon?"#fff":"#000"):"#333",cursor:sel?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif",transition:"all .15s"}}>{isWon?"Mark Won ✓":"Mark Lost"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function Landing({onStart,onDemo}){
  return(
    <div style={{minHeight:"100vh",background:"#050505",color:"#fff",fontFamily:"'DM Sans',sans-serif",overflowX:"hidden"}}>
      {/* Ambient glow */}
      <div style={{position:"fixed",top:-200,left:"50%",transform:"translateX(-50%)",width:600,height:600,background:"radial-gradient(circle,#22c55e18 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-300,right:-200,width:700,height:700,background:"radial-gradient(circle,#3b82f618 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      {/* Nav */}
      <nav style={{position:"relative",zIndex:10,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"22px 32px",borderBottom:"1px solid #ffffff08"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,background:"linear-gradient(135deg,#22c55e,#16a34a)",borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 0 20px #22c55e44"}}>🏠</div>
          <div><div style={{fontWeight:800,fontSize:17,letterSpacing:"-0.03em",fontFamily:"'DM Serif Display',serif"}}>RoofAI</div><div style={{fontSize:9,color:"#22c55e",fontWeight:700,letterSpacing:"0.15em"}}>SALES PLATFORM</div></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onDemo} style={{background:"transparent",border:"1px solid #ffffff18",borderRadius:10,padding:"9px 20px",color:"#9ca3af",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Log In</button>
          <button onClick={onStart} style={{background:"#22c55e",border:"none",borderRadius:10,padding:"9px 22px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 0 20px #22c55e55"}}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{position:"relative",zIndex:10,textAlign:"center",padding:"100px 24px 80px",maxWidth:680,margin:"0 auto"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#22c55e12",border:"1px solid #22c55e33",borderRadius:20,padding:"6px 16px",marginBottom:32,animation:"fadeUp .6s ease both"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",animation:"pulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:"0.08em"}}>AI-POWERED ROOFING SALES</span>
        </div>
        <h1 style={{fontSize:"clamp(38px,8vw,58px)",fontWeight:900,letterSpacing:"-0.04em",lineHeight:1.02,margin:"0 0 24px",fontFamily:"'DM Serif Display',serif",animation:"fadeUp .6s .1s ease both",opacity:0,animationFillMode:"forwards"}}>
          Close more roofs.<br/>
          <span style={{background:"linear-gradient(135deg,#22c55e,#4ade80)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Work half as hard.</span>
        </h1>
        <p style={{fontSize:18,color:"#6b7280",lineHeight:1.7,margin:"0 0 40px",animation:"fadeUp .6s .2s ease both",opacity:0,animationFillMode:"forwards"}}>
          RoofAI handles follow-up, builds estimates, and tracks every deal from first call to closed job — so your team focuses on what they do best.
        </p>
        <div style={{display:"flex",gap:14,justifyContent:"center",animation:"fadeUp .6s .3s ease both",opacity:0,animationFillMode:"forwards"}}>
          <button onClick={onStart} style={{background:"#22c55e",border:"none",borderRadius:13,padding:"16px 36px",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 0 40px #22c55e44,inset 0 1px 0 #4ade8066",letterSpacing:"-0.01em"}}>Start Free Trial →</button>
          <button onClick={onDemo} style={{background:"#ffffff08",border:"1px solid #ffffff12",borderRadius:13,padding:"16px 28px",color:"#9ca3af",fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>View Demo</button>
        </div>
        <div style={{fontSize:12,color:"#374151",marginTop:20,animation:"fadeUp .6s .4s ease both",opacity:0,animationFillMode:"forwards"}}>No credit card · 14-day free trial · Cancel anytime</div>
      </div>

      {/* Stats bar */}
      <div style={{position:"relative",zIndex:10,display:"flex",justifyContent:"center",borderTop:"1px solid #0f0f0f",borderBottom:"1px solid #0f0f0f",background:"#08080a",marginBottom:80}}>
        {[["3×","More follow-ups per day"],["~40min","Saved per estimate"],["$0","Extra headcount needed"]].map(([n,l],i)=>(
          <div key={i} style={{flex:1,maxWidth:220,textAlign:"center",padding:"32px 16px",borderRight:i<2?"1px solid #0f0f0f":"none"}}>
            <div style={{fontSize:34,fontWeight:900,color:"#22c55e",letterSpacing:"-0.04em",fontFamily:"'DM Serif Display',serif"}}>{n}</div>
            <div style={{fontSize:12,color:"#4b5563",marginTop:8,lineHeight:1.4}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Feature grid */}
      <div style={{position:"relative",zIndex:10,maxWidth:700,margin:"0 auto",padding:"0 24px 80px"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:"0.1em",marginBottom:12}}>EVERYTHING YOU NEED</div>
          <div style={{fontSize:32,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",fontFamily:"'DM Serif Display',serif"}}>Built for how roofers actually work</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2}}>
          {[["⚡","AI Follow-Up","Personalized SMS and emails in one tap. Send in seconds, not minutes."],["📋","Smart Estimating","Rep submits measurements. AI builds the estimate. Estimator approves in minutes."],["📊","Manager Dashboard","Win rates, lead sources, rep performance — data owners have never had before."],["⚖️","Insurance Tracking","Flag supplement gaps and adjuster pushback automatically on every job."],["🔁","Auto Sequences","Set follow-up sequences once. They run automatically so no deal goes cold."],["🏆","Full Pipeline","From first call to closed job — every step tracked in one place."]].map(([icon,title,desc],i)=>(
            <div key={i} style={{background:"#0a0a0a",border:"1px solid #111",padding:"24px",transition:"border-color .2s",cursor:"default"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#22c55e33"} onMouseLeave={e=>e.currentTarget.style.borderColor="#111"}>
              <div style={{fontSize:26,marginBottom:12}}>{icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8,fontFamily:"'DM Serif Display',serif"}}>{title}</div>
              <div style={{fontSize:12,color:"#4b5563",lineHeight:1.6}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{position:"relative",zIndex:10,maxWidth:420,margin:"0 auto",padding:"0 24px 100px",textAlign:"center"}}>
        <div style={{fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:"0.1em",marginBottom:12}}>SIMPLE PRICING</div>
        <div style={{fontSize:32,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:32,fontFamily:"'DM Serif Display',serif"}}>One plan. Everything included.</div>
        <div style={{background:"#0a0a0a",border:"1px solid #22c55e33",borderRadius:20,padding:"36px",position:"relative",boxShadow:"0 0 60px #22c55e18"}}>
          <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"#22c55e",borderRadius:20,padding:"4px 16px",fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>MOST POPULAR</div>
          <div style={{fontSize:13,color:"#4b5563",marginBottom:8}}>Per company / month</div>
          <div style={{fontSize:60,fontWeight:900,color:"#fff",letterSpacing:"-0.05em",lineHeight:1,fontFamily:"'DM Serif Display',serif"}}>$299</div>
          <div style={{fontSize:13,color:"#374151",marginTop:6,marginBottom:28}}>Up to 5 users included</div>
          <div style={{display:"flex",flexDirection:"column",gap:12,textAlign:"left",marginBottom:28}}>
            {["Unlimited leads & pipeline","AI message generation","Automated follow-up sequences","Smart estimate builder","Manager dashboard & analytics","SMS & email sending","Insurance gap tracking","Priority support"].map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:12}}><span style={{color:"#22c55e",fontSize:14,flexShrink:0}}>✓</span><span style={{fontSize:13,color:"#6b7280"}}>{f}</span></div>
            ))}
          </div>
          <button onClick={onStart} style={{width:"100%",padding:"16px",background:"#22c55e",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 0 30px #22c55e44"}}>Start Free Trial →</button>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({onDone}){
  const [step,setStep]=useState(0);
  const [co,setCo]=useState({name:"",phone:"",city:"",logo:"🏠"});
  const [reps,setReps]=useState([{name:"Jordan S.",role:"Account Manager"},{name:"Marcus T.",role:"Estimator"}]);
  const [margin,setMargin]=useState("18");
  const [role,setRole]=useState("rep");
  const TOTAL=6;
  const inp={width:"100%",background:"#141414",border:"1px solid #1a1a1a",borderRadius:11,padding:"13px 16px",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#fff",boxSizing:"border-box",outline:"none"};
  const pct=`${(step/(TOTAL-1))*100}%`;
  return(
    <div style={{minHeight:"100vh",background:"#050505",display:"flex",flexDirection:"column",fontFamily:"'DM Sans',sans-serif"}}>
      {/* Progress */}
      <div style={{height:3,background:"#111"}}><div style={{height:"100%",width:pct,background:"#22c55e",transition:"width .5s cubic-bezier(.34,1.56,.64,1)",boxShadow:"0 0 10px #22c55e"}}/></div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:"1px solid #0f0f0f"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:30,height:30,background:"#22c55e",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{co.logo}</div><span style={{fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>RoofAI</span></div>
        <span style={{fontSize:12,color:"#374151",fontWeight:600}}>Step {step+1} of {TOTAL}</span>
      </div>
      <div style={{flex:1,padding:"36px 24px",maxWidth:460,margin:"0 auto",width:"100%",display:"flex",flexDirection:"column"}}>
        {step===0&&(<div style={{textAlign:"center",paddingTop:24}}>
          <div style={{fontSize:52,marginBottom:20,animation:"float 3s ease-in-out infinite"}}>🏠</div>
          <div style={{fontSize:26,fontWeight:800,color:"#fff",marginBottom:10,fontFamily:"'DM Serif Display',serif"}}>Welcome to RoofAI</div>
          <div style={{fontSize:15,color:"#6b7280",lineHeight:1.7,marginBottom:32}}>Set up your company in 2 minutes. You'll be closing more deals today.</div>
          <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:16,padding:"20px",marginBottom:32,textAlign:"left"}}>
            {[["⚡","AI follow-up & messaging"],["📋","Smart estimate builder"],["📊","Manager analytics"],["🔁","Auto follow-up sequences"]].map(([icon,text])=>(
              <div key={text} style={{display:"flex",alignItems:"center",gap:14,marginBottom:12,lastChild:{marginBottom:0}}}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:14,color:"#9ca3af"}}>{text}</span></div>
            ))}
          </div>
          <button onClick={()=>setStep(1)} style={{width:"100%",padding:"15px",background:"#22c55e",border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 0 30px #22c55e44"}}>Let's get started →</button>
        </div>)}
        {step===1&&(<div>
          <div style={{fontSize:24,fontWeight:800,color:"#fff",marginBottom:6,fontFamily:"'DM Serif Display',serif"}}>Your company</div>
          <div style={{fontSize:14,color:"#6b7280",marginBottom:24}}>Appears on estimates and client messages.</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[["Company Name *","name","Summit Roofing Co."],["Business Phone","phone","(720) 555-0100"],["City / Market","city","Denver, CO"]].map(([l,k,p])=>(
              <div key={k}><div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:6,letterSpacing:"0.06em"}}>{l}</div><input value={co[k]} onChange={e=>setCo(c=>({...c,[k]:e.target.value}))} placeholder={p} style={inp}/></div>
            ))}
            <div><div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:8,letterSpacing:"0.06em"}}>LOGO / ICON</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["🏠","🔨","⚡","🏗️","🌟","🦅","🏢","🔧"].map(e=><button key={e} onClick={()=>setCo(c=>({...c,logo:e}))} style={{width:46,height:46,borderRadius:11,border:`2px solid ${co.logo===e?"#22c55e":"#1a1a1a"}`,background:co.logo===e?"#0d1a0f":"#141414",fontSize:22,cursor:"pointer",transition:"all .15s"}}>{e}</button>)}</div></div>
          </div>
        </div>)}
        {step===2&&(<div>
          <div style={{fontSize:24,fontWeight:800,color:"#fff",marginBottom:6,fontFamily:"'DM Serif Display',serif"}}>Your team</div>
          <div style={{fontSize:14,color:"#6b7280",marginBottom:24}}>Add reps — you can add more anytime.</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
            {reps.map((rep,i)=>(
              <div key={i} style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:12,padding:"14px"}}>
                <div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:8,letterSpacing:"0.06em"}}>REP {i+1}</div>
                <div style={{display:"flex",gap:8}}>
                  <input value={rep.name} onChange={e=>setReps(r=>r.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="Full name" style={{...inp,flex:2}}/>
                  <select value={rep.role} onChange={e=>setReps(r=>r.map((x,j)=>j===i?{...x,role:e.target.value}:x))} style={{...inp,flex:1,cursor:"pointer"}}>
                    <option>Account Manager</option><option>Estimator</option><option>Owner</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>setReps(r=>[...r,{name:"",role:"Account Manager"}])} style={{width:"100%",padding:"12px",background:"transparent",border:"1.5px dashed #1a1a1a",borderRadius:11,fontSize:13,fontWeight:600,color:"#374151",cursor:"pointer",fontFamily:"inherit"}}>+ Add rep</button>
        </div>)}
        {step===3&&(<div>
          <div style={{fontSize:24,fontWeight:800,color:"#fff",marginBottom:6,fontFamily:"'DM Serif Display',serif"}}>Default margin</div>
          <div style={{fontSize:14,color:"#6b7280",marginBottom:24}}>Built into every estimate automatically.</div>
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            {["12","15","18","20","25"].map(m=><button key={m} onClick={()=>setMargin(m)} style={{flex:1,minWidth:55,padding:"13px 0",borderRadius:10,border:`1.5px solid ${margin===m?"#22c55e":"#1a1a1a"}`,background:margin===m?"#0d1a0f":"#141414",color:margin===m?"#22c55e":"#6b7280",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{m}%</button>)}
          </div>
          <input type="number" value={margin} onChange={e=>setMargin(e.target.value)} placeholder="Custom %" style={{...inp,textAlign:"center",fontSize:20,fontWeight:800,color:"#22c55e",marginBottom:18}}/>
          <div style={{background:"#0d1a0f",border:"1px solid #22c55e22",borderRadius:12,padding:"16px"}}>
            <div style={{fontSize:11,color:"#22c55e",fontWeight:700,marginBottom:10,letterSpacing:"0.06em"}}>EXAMPLE ESTIMATE</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"#6b7280"}}>Job cost</span><span style={{fontSize:13,color:"#9ca3af"}}>$12,000</span></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:"#22c55e"}}>Margin ({margin}%)</span><span style={{fontSize:13,color:"#22c55e",fontWeight:700}}>+${Math.round(12000*(parseInt(margin)||0)/100).toLocaleString()}</span></div>
            <div style={{borderTop:"1px solid #22c55e22",paddingTop:10,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:14,fontWeight:700,color:"#fff"}}>Customer price</span><span style={{fontSize:20,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${(12000+Math.round(12000*(parseInt(margin)||0)/100)).toLocaleString()}</span></div>
          </div>
        </div>)}
        {step===4&&(<div>
          <div style={{fontSize:24,fontWeight:800,color:"#fff",marginBottom:6,fontFamily:"'DM Serif Display',serif"}}>Your role</div>
          <div style={{fontSize:14,color:"#6b7280",marginBottom:24}}>Customizes your experience.</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{r:"rep",l:"Account Manager",d:"I manage leads, follow up, and close deals.",i:"📱"},{r:"estimator",l:"Estimator",d:"I build estimates and handle insurance.",i:"📋"},{r:"manager",l:"Owner / Manager",d:"I oversee the team and track performance.",i:"📊"}].map(({r,l,d,i})=>(
              <button key={r} onClick={()=>setRole(r)} style={{padding:"18px",borderRadius:14,border:`1.5px solid ${role===r?"#22c55e":"#1a1a1a"}`,background:role===r?"#0d1a0f":"#0a0a0a",textAlign:"left",cursor:"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:26}}>{i}</span><div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:3,fontFamily:"'DM Serif Display',serif"}}>{l}</div><div style={{fontSize:12,color:"#6b7280"}}>{d}</div></div>{role===r&&<span style={{color:"#22c55e",fontSize:18}}>✓</span>}</div>
              </button>
            ))}
          </div>
        </div>)}
        {step===5&&(<div style={{textAlign:"center",paddingTop:24}}>
          <div style={{fontSize:56,marginBottom:20}}>🚀</div>
          <div style={{fontSize:26,fontWeight:800,color:"#fff",marginBottom:10,fontFamily:"'DM Serif Display',serif"}}>{co.name||"Your company"} is ready!</div>
          <div style={{fontSize:14,color:"#6b7280",lineHeight:1.7,marginBottom:28}}>Pipeline configured, team set up, AI ready.</div>
          <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:16,padding:"20px",marginBottom:28,textAlign:"left"}}>
            {[`✓ ${reps.filter(r=>r.name).length} reps configured`,`✓ ${margin}% default margin set`,`✓ Follow-up sequences ready`,`✓ Smart estimate builder active`].map(t=><div key={t} style={{fontSize:14,color:"#6b7280",fontWeight:500,marginBottom:8}}>{t}</div>)}
          </div>
          <button onClick={()=>onDone({co,reps,margin,role})} style={{width:"100%",padding:"15px",background:"#22c55e",border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 0 30px #22c55e44"}}>Go to my dashboard →</button>
        </div>)}
        {step>0&&step<5&&(
          <div style={{display:"flex",gap:10,marginTop:"auto",paddingTop:24}}>
            <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"13px",background:"#141414",border:"1px solid #1a1a1a",borderRadius:12,fontSize:14,fontWeight:600,color:"#6b7280",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
            <button onClick={()=>setStep(s=>s+1)} style={{flex:2,padding:"13px",background:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,color:"#000",cursor:"pointer",fontFamily:"inherit"}}>Continue →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ACTION CARD (the hero component) ─────────────────────────────────────────
function ActionCard({lead,rank,onOpen,onSend,onSimReply}){
  const m=SM[lead.stage];
  const isTop=rank<=2;
  const isCritical=lead.daysSince>=3||lead.hasUnread||lead.estApproved;
  const [gen,setGen]=useState(false);
  const [draft,setDraft]=useState("");

  async function quickSMS(e){
    e.stopPropagation();setGen(true);setDraft("");
    try{setDraft(await ai(`Roofing follow-up SMS. Max 140 chars. Friendly. Real name. No placeholders. ONLY the message.`,`${m.action}: ${lead.name}, ${lead.claimType}, $${lead.value.toLocaleString()}, ${lead.insurance}, Stage: ${lead.stage}, ${lead.daysSince}d ago. Notes: ${lead.notes}`));}
    catch{setDraft("Connection error.");}finally{setGen(false);}
  }
  function doSend(e){
    e.stopPropagation();if(!draft.trim())return;
    onSend(lead.id,draft);setDraft("");
    if(REPLIES[lead.id])setTimeout(()=>onSimReply(lead.id),3000);
  }

  return(
    <div style={{marginBottom:10,animation:`fadeUp .4s ${rank*.05}s ease both`,opacity:0,animationFillMode:"forwards"}}>
      {/* Urgency bar on left edge for critical */}
      <div style={{background:"#0a0a0a",borderRadius:16,overflow:"hidden",border:`1px solid ${lead.hasUnread?"#22c55e33":lead.estApproved?"#60a5fa33":isTop?"#1a1a1a":"#111"}`,position:"relative",transition:"border-color .2s"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=m.color+"44"}
        onMouseLeave={e=>e.currentTarget.style.borderColor=lead.hasUnread?"#22c55e33":lead.estApproved?"#60a5fa33":isTop?"#1a1a1a":"#111"}
      >
        {/* Left accent bar for top cards */}
        {isTop&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,${m.color},${m.color}44)`,borderRadius:"3px 0 0 3px"}}/>}

        <div onClick={()=>onOpen(lead)} style={{padding:"16px 18px 16px",paddingLeft:isTop?22:18,cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
          {/* Rank */}
          <div style={{width:32,height:32,borderRadius:10,background:rank===1?"#22c55e":rank===2?"#1a1a1a":"#0f0f0f",border:rank===1?"none":rank===2?"1px solid #222":"1px solid #141414",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:rank===1?"0 0 16px #22c55e55":"none"}}>
            <span style={{fontSize:13,fontWeight:900,color:rank===1?"#fff":rank===2?"#9ca3af":"#374151",fontFamily:"'DM Serif Display',serif"}}>{rank}</span>
          </div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
              <span style={{fontWeight:700,fontSize:16,color:"#fff",letterSpacing:"-0.02em",fontFamily:"'DM Serif Display',serif"}}>{lead.name}</span>
              {lead.hasUnread&&<span style={{fontSize:10,fontWeight:700,color:"#22c55e",background:"#0d1a0f",border:"1px solid #22c55e33",borderRadius:5,padding:"2px 7px",display:"flex",alignItems:"center",gap:3}}><I.reply/> Reply</span>}
              {lead.estApproved&&<span style={{fontSize:10,fontWeight:700,color:"#60a5fa",background:"#0d1a2e",border:"1px solid #60a5fa33",borderRadius:5,padding:"2px 7px"}}>EST READY</span>}
              {lead.estPending&&!lead.estApproved&&<span style={{fontSize:10,fontWeight:700,color:"#fbbf24",background:"#1a1500",border:"1px solid #fbbf2433",borderRadius:5,padding:"2px 7px"}}>PENDING</span>}
              {lead.daysSince>=3&&!lead.hasUnread&&!lead.estApproved&&<span style={{fontSize:10,fontWeight:700,color:"#f87171",background:"#1a0a0a",border:"1px solid #f8717133",borderRadius:5,padding:"2px 7px"}}>OVERDUE</span>}
              {lead.seqActive&&<span style={{fontSize:10,fontWeight:700,color:"#60a5fa",background:"#0a0d1a",border:"1px solid #60a5fa22",borderRadius:5,padding:"2px 6px"}}>AUTO</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:m.color,flexShrink:0,boxShadow:`0 0 6px ${m.color}88`}}/>
              <span style={{fontSize:12,color:"#4b5563"}}>{m.action}</span>
              <span style={{fontSize:12,color:"#1f2937"}}>·</span>
              <span style={{fontSize:12,color:"#374151"}}>{lead.daysSince===0?"today":`${lead.daysSince}d ago`}</span>
            </div>
          </div>

          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:17,fontWeight:900,color:"#fff",letterSpacing:"-0.03em",fontFamily:"'DM Serif Display',serif"}}>${(lead.value/1000).toFixed(0)}k</div>
            <div style={{fontSize:11,color:m.color,fontWeight:700,marginTop:2}}>{WIN_P[lead.stage]}%</div>
          </div>
        </div>

        {/* Message strip */}
        {!["Closed Won","Closed Lost"].includes(lead.stage)&&(
          <div style={{borderTop:"1px solid #111",padding:"11px 18px",paddingLeft:isTop?22:18,background:"#080808"}}>
            {!draft?(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={quickSMS} disabled={gen} style={{display:"flex",alignItems:"center",gap:7,background:gen?"#141414":"#1a1a1a",border:`1px solid ${gen?"#222":"#222"}`,borderRadius:9,padding:"8px 16px",color:gen?"#374151":"#fff",fontSize:12,fontWeight:700,cursor:gen?"not-allowed":"pointer",fontFamily:"inherit",transition:"all .15s",flexShrink:0}} onMouseEnter={e=>{if(!gen)e.currentTarget.style.background="#22c55e";if(!gen)e.currentTarget.style.borderColor="#22c55e";}} onMouseLeave={e=>{e.currentTarget.style.background=gen?"#141414":"#1a1a1a";e.currentTarget.style.borderColor="#222";}}>
                  {gen?<Spin s={11} c="#374151"/>:<I.bolt/>}{gen?"Writing…":"Quick SMS"}
                </button>
                <span style={{fontSize:12,color:"#1f2937"}}>{lead.estApproved?"Estimate ready to send":lead.seqActive?"Auto-sequence running":"AI writes & sends"}</span>
              </div>
            ):(
              <div>
                <div style={{fontSize:13,color:"#9ca3af",lineHeight:1.6,background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:10,padding:"10px 14px",marginBottom:10}}>{draft}</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={e=>{e.stopPropagation();setDraft("");}} style={{flex:1,padding:"9px",background:"#141414",border:"1px solid #1a1a1a",borderRadius:9,fontSize:12,fontWeight:600,color:"#6b7280",cursor:"pointer",fontFamily:"inherit"}}>Discard</button>
                  <button onClick={doSend} style={{flex:2,padding:"9px",background:"#22c55e",border:"none",borderRadius:9,fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:"0 0 16px #22c55e44"}}><I.send/> Send SMS</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LEAD DETAIL ──────────────────────────────────────────────────────────────
function LeadDetail({lead,cfg,role,onBack,onUpdate,onSend,onSimReply}){
  const m=SM[lead.stage];
  const [view,setView]=useState("detail");
  const [tab,setTab]=useState(lead.hasUnread?"history":"message");
  const [msgType,setMsgType]=useState("follow-up");
  const [channel,setChannel]=useState("sms");
  const [tone,setTone]=useState("friendly");
  const [draft,setDraft]=useState("");
  const [loading,setLoading]=useState(false);
  const [analysis,setAnalysis]=useState("");
  const [aLoading,setALoading]=useState(false);
  const [toast,setToast]=useState(null);
  const [outcome,setOutcome]=useState(null);
  const [jobData,setJobData]=useState(null);
  const threadRef=useRef(null);

  useEffect(()=>{if(lead.hasUnread)onUpdate({...lead,hasUnread:false});},[lead.id]);
  useEffect(()=>{if(threadRef.current)threadRef.current.scrollTop=threadRef.current.scrollHeight;},[lead.messages,tab]);
  useEffect(()=>{
    async function load(){
      setALoading(true);
      try{setAnalysis(await ai(`Roofing sales coach. Respond EXACTLY:\nSITUATION: [one sentence]\nRISK: [one sentence]\nDO THIS: [one action starting with verb]`,`${lead.name}|${lead.stage}|$${lead.value.toLocaleString()}|${lead.insurance}|${lead.daysSince}d|${lead.source}|Notes:${lead.notes}|Last:${lead.messages.slice(-1)[0]?.text||"none"}`));}
      catch{setAnalysis("");}finally{setALoading(false);}
    }
    load();
  },[lead.id]);

  // Sub-views
  if(view==="jobsubmit")return <JobSubmit lead={lead} onBack={()=>setView("detail")} onSubmit={job=>{setJobData(job);onUpdate({...lead,estPending:true});setView("estimate")}}/>;
  if(view==="estimate")return <EstimateBuilder lead={lead} job={jobData||{squares:"28",pitch:"6/12",stories:"1",tearoff:"1_layer",shingle:"architectural",damage:lead.claimType,notes:lead.notes}} margin={cfg?.margin||"18"} onBack={()=>setView("detail")} onApprove={est=>{onUpdate({...lead,estPending:false,estApproved:est,value:est.total,estValue:est.total,stage:"Estimate Sent",seqActive:true});setView("detail");}}/>;
  if(view==="estview")return <EstimateView lead={lead} est={lead.estApproved} onBack={()=>setView("detail")} onSend={()=>{const msg={from:"us",ch:"email",text:`Estimate sent: $${lead.estApproved.total.toLocaleString()} for ${lead.claimType}`,date:"Today",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};onUpdate({...lead,messages:[...lead.messages,msg],daysSince:0,stage:"Estimate Sent",seqActive:true});setToast(lead.name.split(" ")[0]);setTimeout(()=>setToast(null),2800);setView("detail");}}/>;
  if(view==="seq"){
    const tmpl=SEQ[lead.stage]||[];
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#050505"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,background:"#050505",zIndex:10}}>
          <button onClick={()=>setView("detail")} style={{background:"none",border:"none",cursor:"pointer",color:"#6b7280",display:"flex"}}><I.back/></button>
          <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>Follow-Up Sequence</div><div style={{fontSize:12,color:"#374151"}}>{lead.name} · {lead.stage}</div></div>
          <button onClick={()=>onUpdate({...lead,seqActive:!lead.seqActive})} style={{background:lead.seqActive?"#0d1a0f":"#141414",border:`1px solid ${lead.seqActive?"#22c55e44":"#1a1a1a"}`,borderRadius:20,padding:"7px 16px",fontSize:12,fontWeight:700,color:lead.seqActive?"#22c55e":"#6b7280",cursor:"pointer",fontFamily:"inherit"}}>{lead.seqActive?"● Active":"○ Inactive"}</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
          {tmpl.length===0?<div style={{textAlign:"center",color:"#374151",padding:"60px 0"}}>No sequence for this stage.</div>:(
            <>
              <div style={{background:lead.seqActive?"#0d1a0f":"#0a0a0a",border:`1px solid ${lead.seqActive?"#22c55e33":"#111"}`,borderRadius:12,padding:"14px 16px",marginBottom:24}}>
                <div style={{fontSize:13,color:lead.seqActive?"#22c55e":"#6b7280",fontWeight:600}}>{lead.seqActive?`✓ Active — ${tmpl.length} messages auto-send over ${tmpl.at(-1).day} days`:`Activate to auto-follow up with ${lead.name.split(" ")[0]} over ${tmpl.at(-1).day} days.`}</div>
              </div>
              <div style={{position:"relative"}}><div style={{position:"absolute",left:15,top:0,bottom:0,width:1,background:"#111",zIndex:0}}/>
                {tmpl.map((t,i)=>(
                  <div key={i} style={{display:"flex",gap:16,marginBottom:20,position:"relative",zIndex:1}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:lead.seqActive?"#22c55e":"#141414",border:lead.seqActive?"none":"1px solid #1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:"#fff"}}>{t.day===0?"Now":`D${t.day}`}</div>
                    <div style={{flex:1,background:"#0a0a0a",border:`1px solid ${lead.seqActive?"#22c55e22":"#111"}`,borderRadius:12,padding:"12px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:10,color:t.ch==="sms"?"#60a5fa":"#fbbf24",fontWeight:700,letterSpacing:"0.05em"}}>{t.ch.toUpperCase()}</span><span style={{fontSize:10,color:"#374151"}}>{t.day===0?"Immediately":`Day ${t.day}`}</span></div>
                      <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6}}>{t.msg.replace("{name}",lead.name.split(" ")[0]).replace("{rep}",lead.rep).replace("{co}",cfg?.co?.name||"our team")}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={()=>onUpdate({...lead,seqActive:!lead.seqActive})} style={{width:"100%",padding:"14px",background:lead.seqActive?"transparent":"#22c55e",border:`1.5px solid ${lead.seqActive?"#f8717133":"transparent"}`,borderRadius:12,color:lead.seqActive?"#f87171":"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginTop:8,boxShadow:lead.seqActive?"none":"0 0 24px #22c55e44"}}>{lead.seqActive?"⏹ Deactivate":"▶ Activate Sequence"}</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const gap=lead.insOffer>0?lead.estValue-lead.insOffer:0;
  const sel={background:"#141414",border:"1px solid #1a1a1a",borderRadius:9,padding:"9px 11px",fontSize:12,fontFamily:"'DM Sans',sans-serif",color:"#9ca3af",fontWeight:600,outline:"none",width:"100%"};

  function handleStage(s){if(["Closed Won","Closed Lost"].includes(s))setOutcome(s);else onUpdate({...lead,stage:s});}
  async function generate(){
    setLoading(true);setDraft("");
    try{setDraft(await ai(channel==="sms"?`Roofing ${msgType} SMS. Max 140 chars. ${tone}. Real name. ONLY the message.`:`Roofing ${msgType} email body. 3-4 sentences. ${tone}. Real name. ONLY the body.`,`${lead.name}|${lead.claimType}|$${lead.value.toLocaleString()}|${lead.insurance}|${lead.stage}|${lead.daysSince}d|Notes:${lead.notes}`));}
    catch{setDraft("Connection error.");}finally{setLoading(false);}
  }
  function handleSend(){
    if(!draft.trim())return;
    const msg={from:"us",ch:channel,text:draft,date:"Today",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
    onUpdate({...lead,messages:[...lead.messages,msg],daysSince:0});
    setToast(lead.name.split(" ")[0]);setDraft("");setTab("history");
    if(REPLIES[lead.id])setTimeout(()=>onSimReply(lead.id),3000);
    setTimeout(()=>setToast(null),2800);
  }

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#050505"}}>
      {toast&&<SendToast name={toast} onDone={()=>setToast(null)}/>}
      {outcome&&<OutcomeSheet stage={outcome} onConfirm={r=>{onUpdate({...lead,stage:outcome,outcome:r});setOutcome(null);}} onCancel={()=>setOutcome(null)}/>}

      {/* Header */}
      <div style={{padding:"16px 20px 0",borderBottom:"1px solid #111",background:"#050505",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <button onClick={onBack} style={{background:"#141414",border:"1px solid #1a1a1a",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}><I.back/></button>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",fontFamily:"'DM Serif Display',serif"}}>{lead.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
              <span style={{fontSize:12,color:"#4b5563"}}>{lead.claimType} · {lead.rep}</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:"#4b5563"}}><span style={{width:5,height:5,borderRadius:"50%",background:SOURCE_COLORS[lead.source]||"#6b7280",display:"inline-block"}}/>{lead.source}</span>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${lead.value.toLocaleString()}</div>
            <div style={{fontSize:11,color:m.color,fontWeight:700,marginTop:1}}>{WIN_P[lead.stage]}% win</div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          {lead.estApproved?(
            <button onClick={()=>setView("estview")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",background:"#0d1a0f",border:"1px solid #22c55e44",borderRadius:10,fontSize:12,fontWeight:700,color:"#22c55e",cursor:"pointer",fontFamily:"inherit"}}><I.doc/> Send Estimate ✓</button>
          ):lead.estPending?(
            <button onClick={()=>setView("estimate")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",background:"#1a1500",border:"1px solid #fbbf2444",borderRadius:10,fontSize:12,fontWeight:700,color:"#fbbf24",cursor:"pointer",fontFamily:"inherit"}}><I.doc/> Build Estimate ⏳</button>
          ):(
            <button onClick={()=>role==="estimator"?setView("estimate"):setView("jobsubmit")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",background:"#141414",border:"1px solid #1a1a1a",borderRadius:10,fontSize:12,fontWeight:700,color:"#6b7280",cursor:"pointer",fontFamily:"inherit"}}><I.doc/> {role==="estimator"?"Build Estimate":"Request Estimate"}</button>
          )}
          <button onClick={()=>setView("seq")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",background:lead.seqActive?"#0a0d1a":"#141414",border:`1px solid ${lead.seqActive?"#60a5fa44":"#1a1a1a"}`,borderRadius:10,fontSize:12,fontWeight:700,color:lead.seqActive?"#60a5fa":"#6b7280",cursor:"pointer",fontFamily:"inherit"}}><I.clock/> {lead.seqActive?"Seq ●":"Sequence"}</button>
        </div>

        {lead.hasUnread&&<div onClick={()=>setTab("history")} style={{background:"#0d1a0f",border:"1px solid #22c55e33",borderRadius:11,padding:"11px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}><span style={{fontSize:16}}>💬</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#22c55e"}}>New reply from {lead.name.split(" ")[0]}</div><div style={{fontSize:12,color:"#4b5563",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.messages.at(-1)?.text}</div></div><span style={{fontSize:12,color:"#22c55e",fontWeight:700}}>Read →</span></div>}
        {gap>0&&<div style={{background:"#1a0d00",border:"1px solid #fb923c33",borderRadius:10,padding:"9px 14px",marginBottom:10,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:"#9a3412",fontWeight:600}}>Insurance gap</span><span style={{fontSize:13,color:"#fb923c",fontWeight:800}}>${gap.toLocaleString()} short</span></div>}
        {(analysis||aLoading)&&<div style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:11,padding:"11px 14px",marginBottom:10}}>{aLoading?<div style={{display:"flex",alignItems:"center",gap:8}}><Spin s={12} c="#374151"/><span style={{fontSize:12,color:"#374151"}}>Analyzing…</span></div>:<div style={{fontSize:12,color:"#6b7280",lineHeight:1.75,whiteSpace:"pre-line"}}>{analysis}</div>}</div>}

        <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:10}}>
          {STAGES.map(s=><button key={s} onClick={()=>handleStage(s)} style={{flexShrink:0,padding:"5px 11px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",border:`1.5px solid ${lead.stage===s?SM[s].color:"#1a1a1a"}`,background:lead.stage===s?SM[s].color+"22":"transparent",color:lead.stage===s?SM[s].color:"#374151",fontFamily:"inherit",transition:"all .15s"}}>{s}</button>)}
        </div>
        <div style={{display:"flex",marginTop:-10}}>
          {[["message","💬 Message"],["history","🕐 History"],["info","📋 Info"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"11px 0",background:"none",border:"none",borderBottom:tab===t?"2px solid #22c55e":"2px solid transparent",fontSize:12,fontWeight:tab===t?700:500,color:tab===t?"#fff":"#374151",cursor:"pointer",fontFamily:"inherit",marginBottom:-1,transition:"color .15s"}}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}} ref={tab==="history"?threadRef:null}>
        {tab==="message"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["CHANNEL",channel,setChannel,[["sms","📱 SMS"],["email","📧 Email"],["call","📞 Script"]]],["TYPE",msgType,setMsgType,[["follow-up","Follow-Up"],["first touch","First Touch"],["estimate","Estimate"],["closing","Closing"],["insurance update","Insurance"],["referral","Referral"]]],["TONE",tone,setTone,[["friendly","Friendly"],["professional","Professional"],["urgent","Urgent"],["empathetic","Empathetic"]]]].map(([label,val,setter,opts])=>(
                <div key={label}><div style={{fontSize:9,color:"#374151",fontWeight:700,marginBottom:5,letterSpacing:"0.06em"}}>{label}</div><select value={val} onChange={e=>setter(e.target.value)} style={sel}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              ))}
            </div>
            <button onClick={generate} disabled={loading} style={{width:"100%",padding:"13px",background:loading?"#141414":"#1a1a1a",border:`1px solid ${loading?"#222":"#222"}`,borderRadius:11,color:loading?"#374151":"#fff",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:14,fontFamily:"inherit",transition:"all .2s"}} onMouseEnter={e=>{if(!loading){e.currentTarget.style.background="#22c55e";e.currentTarget.style.borderColor="#22c55e";}}} onMouseLeave={e=>{e.currentTarget.style.background=loading?"#141414":"#1a1a1a";e.currentTarget.style.borderColor="#222";}}>
              {loading?<><Spin/> Writing…</>:<><I.bolt/> Generate Message</>}
            </button>
            <textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Message appears here — edit before sending" style={{width:"100%",minHeight:110,background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:11,padding:"14px",fontSize:14,lineHeight:1.65,color:"#9ca3af",resize:"vertical",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box",outline:"none"}}/>
            {channel==="sms"&&draft&&<div style={{fontSize:11,color:draft.length>160?"#f87171":"#374151",textAlign:"right",marginTop:5}}>{draft.length}/160</div>}
            {draft&&<div style={{display:"flex",gap:8,marginTop:10}}><button onClick={()=>setDraft("")} style={{flex:1,padding:"12px",background:"#141414",border:"1px solid #1a1a1a",borderRadius:10,fontSize:13,fontWeight:700,color:"#6b7280",cursor:"pointer",fontFamily:"inherit"}}>Discard</button><button onClick={handleSend} style={{flex:2,padding:"12px",background:"#22c55e",border:"none",borderRadius:10,fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:"0 0 20px #22c55e44"}}><I.send/> Send {channel.toUpperCase()}</button></div>}
          </div>
        )}
        {tab==="history"&&(
          <div ref={threadRef} style={{display:"flex",flexDirection:"column",gap:10}}>
            {lead.messages.length===0?<div style={{textAlign:"center",color:"#1f2937",padding:"60px 0",fontSize:14}}>No messages yet</div>
            :lead.messages.map((msg,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.from==="us"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"82%",background:msg.from==="us"?"#0d1a0f":"#0a0a0a",border:`1px solid ${msg.from==="us"?"#22c55e22":"#111"}`,borderRadius:14,padding:"11px 15px"}}>
                  <div style={{fontSize:14,color:msg.from==="us"?"#d1fae5":"#9ca3af",lineHeight:1.6}}>{msg.text}</div>
                  <div style={{fontSize:10,color:msg.from==="us"?"#22c55e44":"#374151",marginTop:6,display:"flex",gap:8}}><span>{msg.ch?.toUpperCase()}</span><span>{msg.date} {msg.time||""}</span>{msg.from==="us"&&<span style={{color:"#22c55e"}}>✓ delivered</span>}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==="info"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[["Phone",lead.phone,"tel"],["Email",lead.email,"email"],["Insurance",lead.insurance],["Adjuster",lead.adjuster],["Estimate",`$${lead.estValue.toLocaleString()}`],["Ins. Offer",lead.insOffer>0?`$${lead.insOffer.toLocaleString()}`:"Pending"],["Source",lead.source],["Rep",lead.rep],["Sequence",lead.seqActive?"Active ✓":"Inactive"],["Est. Status",lead.estApproved?"Approved ✓":lead.estPending?"Pending ⏳":"Not requested"],["Outcome",lead.outcome||"—"]].map(([label,value,type])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:"#0a0a0a",border:"1px solid #111",borderRadius:11}}>
                <span style={{fontSize:12,color:"#374151",fontWeight:600}}>{label}</span>
                {type==="tel"?<a href={`tel:${value}`} style={{fontSize:13,color:"#fff",fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5}}><I.phone/>{value}</a>:type==="email"?<a href={`mailto:${value}`} style={{fontSize:13,color:"#fff",fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:5}}><I.mail/>{value}</a>:<span style={{fontSize:13,color:"#fff",fontWeight:600}}>{value}</span>}
              </div>
            ))}
            {lead.notes&&<div style={{padding:"14px 16px",background:"#1a1200",border:"1px solid #fbbf2422",borderRadius:11}}><div style={{fontSize:10,color:"#78350f",fontWeight:700,marginBottom:6,letterSpacing:"0.06em"}}>NOTES</div><div style={{fontSize:13,color:"#92400e",lineHeight:1.6}}>{lead.notes}</div></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── JOB SUBMIT ───────────────────────────────────────────────────────────────
function JobSubmit({lead,onSubmit,onBack}){
  const [f,setF]=useState({squares:"",pitch:"6/12",stories:"1",tearoff:"1_layer",shingle:"architectural",damage:lead?.claimType||"Hail Damage",ridge:"",flashing:"",boots:"2",skylights:"0",chimneys:"0",notes:"",urgency:"standard"});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const inp={width:"100%",background:"#141414",border:"1px solid #1a1a1a",borderRadius:10,padding:"12px 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#fff",outline:"none",boxSizing:"border-box"};
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#050505"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,background:"#050505",zIndex:10}}>
        <button onClick={onBack} style={{background:"#141414",border:"1px solid #1a1a1a",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}><I.back/></button>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>Request Estimate</div><div style={{fontSize:12,color:"#374151"}}>{lead?.name} · {lead?.claimType}</div></div>
        <span style={{fontSize:10,color:"#fbbf24",fontWeight:700,background:"#1a1500",border:"1px solid #fbbf2433",borderRadius:6,padding:"3px 9px"}}>→ ESTIMATOR</span>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:10,letterSpacing:"0.06em"}}>DAMAGE TYPE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {["Hail Damage","Wind Damage","Wind + Hail","Storm Damage","Full Replacement","Partial Repair"].map(d=>(
              <button key={d} onClick={()=>set("damage",d)} style={{padding:"7px 13px",borderRadius:8,border:`1.5px solid ${f.damage===d?"#22c55e":"#1a1a1a"}`,background:f.damage===d?"#0d1a0f":"#141414",color:f.damage===d?"#22c55e":"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{d}</button>
            ))}
          </div>
        </div>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:10,fontFamily:"'DM Serif Display',serif"}}>📐 Measurements</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[["Squares *","squares","28","number"],["Ridge (LF)","ridge","65","number"],["Flashing (LF)","flashing","40","number"],["Pipe Boots","boots","2","number"]].map(([l,k,p,t])=>(
            <div key={k}><div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:5,letterSpacing:"0.05em"}}>{l.toUpperCase()}</div><input type={t} value={f[k]} onChange={e=>set(k,e.target.value)} placeholder={p} style={inp}/></div>
          ))}
        </div>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:10,fontFamily:"'DM Serif Display',serif"}}>🏠 Roof Details</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[["Pitch","pitch",["4/12","5/12","6/12","7/12","8/12","9/12","10/12","steep"]],["Stories","stories",["1","2","3"]],["Tearoff","tearoff",[["1_layer","1 Layer"],["2_layers","2 Layers"],["3_layers","3 Layers"],["none","None"]]],["Shingle","shingle",[["3-tab","3-Tab"],["architectural","Architectural"],["designer","Designer"],["metal","Metal"],["tile","Tile"]]]].map(([l,k,opts])=>(
            <div key={k}><div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:5,letterSpacing:"0.05em"}}>{l.toUpperCase()}</div><select value={f[k]} onChange={e=>set(k,e.target.value)} style={{...inp,cursor:"pointer"}}>{opts.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o}>{o}</option>)}</select></div>
          ))}
        </div>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:10,fontFamily:"'DM Serif Display',serif"}}>⚡ Extras</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[["Skylights","skylights"],["Chimneys","chimneys"]].map(([l,k])=>(
            <div key={k}><div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:5,letterSpacing:"0.05em"}}>{l.toUpperCase()}</div><input type="number" value={f[k]} onChange={e=>set(k,e.target.value)} style={inp}/></div>
          ))}
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:8,letterSpacing:"0.06em"}}>URGENCY</div>
          <div style={{display:"flex",gap:8}}>
            {[["standard","Standard","#6b7280"],["priority","Priority","#fbbf24"],["urgent","Urgent ⚡","#f87171"]].map(([v,l,c])=>(
              <button key={v} onClick={()=>set("urgency",v)} style={{flex:1,padding:"9px",borderRadius:9,border:`1.5px solid ${f.urgency===v?c:"#1a1a1a"}`,background:f.urgency===v?c+"22":"#141414",color:f.urgency===v?c:"#6b7280",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:10,color:"#374151",fontWeight:700,marginBottom:6,letterSpacing:"0.06em"}}>SITE NOTES</div>
          <textarea value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Unusual conditions, competing quotes, homeowner concerns..." style={{...inp,minHeight:70,resize:"vertical"}}/>
        </div>
        <button onClick={()=>onSubmit(f)} disabled={!f.squares} style={{width:"100%",padding:"15px",background:f.squares?"#22c55e":"#141414",border:f.squares?"none":"1px solid #1a1a1a",borderRadius:12,color:f.squares?"#fff":"#374151",fontWeight:800,fontSize:15,cursor:f.squares?"pointer":"not-allowed",fontFamily:"inherit",boxShadow:f.squares?"0 0 30px #22c55e44":"none"}}>
          📤 Submit to Estimator
        </button>
      </div>
    </div>
  );
}

// ─── ESTIMATE BUILDER ─────────────────────────────────────────────────────────
function EstimateBuilder({lead,job,margin:defMargin,onApprove,onBack}){
  const [phase,setPhase]=useState("gen");
  const [items,setItems]=useState([]);
  const [flags,setFlags]=useState([]);
  const [notes,setNotes]=useState("");
  const [margin,setMargin]=useState(parseInt(defMargin)||18);
  const [editId,setEditId]=useState(null);
  const [pct,setPct]=useState(0);
  const [msg,setMsg]=useState("Analyzing job…");
  const [nid,setNid]=useState(100);

  useEffect(()=>{gen();},[]);

  async function gen(){
    setPhase("gen");setItems([]);setPct(0);
    const msgs=["Analyzing job details…","Calculating material quantities…","Applying regional labor rates…","Checking insurance compliance…","Building line items…","Finalizing estimate…"];
    let p=0;const iv=setInterval(()=>{p++;setPct(Math.min(p*2,90));setMsg(msgs[Math.min(Math.floor(p/8),msgs.length-1)]);},80);
    try{
      const sq=parseFloat(job?.squares)||28;
      const pm=PITCH_M[job?.pitch]||1.1;
      const sm=job?.stories==="3"?1.22:job?.stories==="2"?1.12:1.0;
      const sc=SHINGLE_C[job?.shingle]||110;
      const tc=TEAROFF_C[job?.tearoff]||55;
      const labor=Math.round(85*pm*sm);
      const ridge=parseFloat(job?.ridge)||Math.round(sq*2.2);
      const flashing=parseFloat(job?.flashing)||Math.round(sq*1.5);
      const boots=parseInt(job?.boots)||2;

      const raw=await ai(`Expert roofing estimator. Respond ONLY with valid JSON:\n{"items":[{"id":1,"category":"Tearoff","description":"...","qty":28,"unit":"sq","unitCost":55,"total":1540},...],\n"insuranceFlags":["..."],"estimatorNotes":"..."}.\nCategories: Tearoff,Materials,Labor,Flashing,Gutters,Extras,Cleanup. 2024 Colorado pricing. 8-14 items.`,
        `CLIENT:${lead?.name}|${lead?.insurance}|${lead?.claimType}\nSPECS:${sq}sq|${job?.pitch}(${pm}x)|${job?.stories}story(${sm}x)\nMATERIALS:${job?.shingle}~$${sc}/sq|tearoff${tc>0?`~$${tc}/sq`:"none"}|labor~$${labor}/sq\nDIM:ridge${ridge}lf|flashing${flashing}lf\nEXTRAS:${boots}boots|${job?.skylights||0}skylights|${job?.chimneys||0}chimneys\nNOTES:${job?.notes||"None"}`,
        1500);
      clearInterval(iv);setPct(100);
      let parsed;
      try{parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());}
      catch{parsed={items:[{id:1,category:"Tearoff",description:`Remove existing shingles`,qty:sq,unit:"sq",unitCost:tc,total:sq*tc},{id:2,category:"Materials",description:`${job?.shingle||"Architectural"} shingles`,qty:Math.round(sq*1.1),unit:"sq",unitCost:sc,total:Math.round(sq*1.1)*sc},{id:3,category:"Materials",description:"Synthetic underlayment",qty:sq,unit:"sq",unitCost:22,total:sq*22},{id:4,category:"Labor",description:"Install roofing system",qty:sq,unit:"sq",unitCost:labor,total:sq*labor},{id:5,category:"Flashing",description:"Drip edge & step flashing",qty:flashing,unit:"lf",unitCost:18,total:flashing*18},{id:6,category:"Extras",description:"Ridge cap & ventilation",qty:Math.round(ridge/3),unit:"bdl",unitCost:65,total:Math.round(ridge/3)*65},{id:7,category:"Extras",description:`Pipe boots`,qty:boots,unit:"ea",unitCost:85,total:boots*85},{id:8,category:"Cleanup",description:"Site cleanup & haul away",qty:1,unit:"job",unitCost:450,total:450}],insuranceFlags:["Document all damage with photos before tearoff"],estimatorNotes:"Standard estimate generated."};}
      setTimeout(()=>{setItems(parsed.items||[]);setFlags(parsed.insuranceFlags||[]);setNotes(parsed.estimatorNotes||"");setPhase("review");},400);
    }catch{clearInterval(iv);setPhase("review");}
  }

  function upd(id,key,val){setItems(p=>p.map(item=>{if(item.id!==id)return item;const u={...item,[key]:["qty","unitCost"].includes(key)?parseFloat(val)||0:val};if(["qty","unitCost"].includes(key))u.total=u.qty*u.unitCost;return u;}));}
  function del(id){setItems(p=>p.filter(i=>i.id!==id));}
  function add(){setItems(p=>[...p,{id:nid,category:"Extras",description:"",qty:1,unit:"ea",unitCost:0,total:0}]);setNid(n=>n+1);}

  const sub=items.reduce((s,i)=>s+(i.total||0),0);
  const mamt=Math.round(sub*margin/100);
  const total=sub+mamt;
  const cats=[...new Set(items.map(i=>i.category))];
  const CC={"Tearoff":"#f87171","Materials":"#60a5fa","Labor":"#c084fc","Flashing":"#fbbf24","Gutters":"#34d399","Extras":"#fb923c","Cleanup":"#6b7280"};
  const gap=lead?.insOffer>0?total-lead.insOffer:0;

  if(phase==="gen")return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#050505"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"#141414",border:"1px solid #1a1a1a",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}><I.back/></button>
        <div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>Building Estimate…</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32}}>
        <div style={{fontSize:52,marginBottom:24,animation:"float 2s ease-in-out infinite",filter:"drop-shadow(0 0 20px #22c55e88)"}}>⚡</div>
        <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:8,fontFamily:"'DM Serif Display',serif"}}>AI Building Estimate</div>
        <div style={{fontSize:13,color:"#4b5563",marginBottom:28}}>{msg}</div>
        <div style={{width:"100%",maxWidth:280,height:4,background:"#111",borderRadius:2,overflow:"hidden",marginBottom:10}}>
          <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#22c55e,#4ade80)",borderRadius:2,transition:"width .3s ease",boxShadow:"0 0 10px #22c55e"}}/>
        </div>
        <div style={{fontSize:12,color:"#22c55e",fontWeight:700}}>{pct}%</div>
        <div style={{fontSize:12,color:"#1f2937",marginTop:20,textAlign:"center",lineHeight:1.7}}>{job?.squares} sq · {job?.pitch} pitch · {job?.stories} story<br/>{job?.shingle} shingles</div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#050505"}}>
      <div style={{padding:"16px 20px 0",borderBottom:"1px solid #111",background:"#050505",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <button onClick={onBack} style={{background:"#141414",border:"1px solid #1a1a1a",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}><I.back/></button>
          <div style={{flex:1}}><div style={{fontSize:11,color:"#22c55e",fontWeight:700,letterSpacing:"0.07em",marginBottom:2}}>⚡ AI GENERATED · REVIEW & APPROVE</div><div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>{lead?.name}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${total.toLocaleString()}</div><div style={{fontSize:11,color:"#22c55e",fontWeight:700}}>{margin}% margin</div></div>
        </div>
        <div style={{paddingBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:"#374151",fontWeight:600,letterSpacing:"0.05em"}}>MARGIN</span><span style={{fontSize:12,fontWeight:800,color:"#22c55e"}}>{margin}% · +${mamt.toLocaleString()}</span></div>
          <input type="range" min="10" max="35" value={margin} onChange={e=>setMargin(parseInt(e.target.value))} style={{width:"100%",accentColor:"#22c55e",cursor:"pointer",height:3}}/>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {flags.length>0&&<div style={{background:"#1a1200",border:"1px solid #fbbf2433",borderRadius:12,padding:"12px 14px",marginBottom:16}}><div style={{fontSize:10,color:"#92400e",fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:6,letterSpacing:"0.05em"}}><I.warn/> INSURANCE FLAGS</div>{flags.map((f,i)=><div key={i} style={{fontSize:12,color:"#78350f",lineHeight:1.6,marginBottom:4,paddingLeft:10,borderLeft:"2px solid #fbbf24"}}>{f}</div>)}</div>}
        {notes&&<div style={{background:"#0a1020",border:"1px solid #60a5fa22",borderRadius:12,padding:"12px 14px",marginBottom:16}}><div style={{fontSize:10,color:"#1d4ed8",fontWeight:700,marginBottom:4,letterSpacing:"0.05em"}}>ESTIMATOR NOTES</div><div style={{fontSize:12,color:"#4b5563",lineHeight:1.6}}>{notes}</div></div>}
        {gap>0&&<div style={{background:"#1a0d00",border:"1px solid #fb923c33",borderRadius:12,padding:"12px 14px",marginBottom:16,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#9a3412",fontWeight:600}}>Supplement needed</span><span style={{fontSize:14,color:"#fb923c",fontWeight:800}}>${gap.toLocaleString()} short</span></div>}

        {cats.map(cat=>(
          <div key={cat} style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{width:7,height:7,borderRadius:2,background:CC[cat]||"#6b7280",flexShrink:0,boxShadow:`0 0 6px ${CC[cat]}66`}}/>
              <span style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:"0.05em"}}>{cat.toUpperCase()}</span>
              <div style={{flex:1,height:1,background:"#111"}}/>
              <span style={{fontSize:11,color:"#374151"}}>${items.filter(i=>i.category===cat).reduce((s,i)=>s+(i.total||0),0).toLocaleString()}</span>
            </div>
            {items.filter(i=>i.category===cat).map(item=>(
              <div key={item.id} style={{background:"#0a0a0a",border:`1px solid ${editId===item.id?"#22c55e44":"#111"}`,borderRadius:11,padding:"11px 13px",marginBottom:8,transition:"border-color .15s"}}>
                {editId===item.id?(
                  <div>
                    <input value={item.description} onChange={e=>upd(item.id,"description",e.target.value)} style={{width:"100%",background:"#141414",border:"1px solid #1a1a1a",borderRadius:8,padding:"8px 11px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#fff",outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <input type="number" value={item.qty} onChange={e=>upd(item.id,"qty",e.target.value)} style={{width:62,background:"#141414",border:"1px solid #1a1a1a",borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#fff",outline:"none",textAlign:"center"}}/>
                      <select value={item.unit} onChange={e=>upd(item.id,"unit",e.target.value)} style={{flex:1,background:"#141414",border:"1px solid #1a1a1a",borderRadius:8,padding:"8px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",color:"#9ca3af",outline:"none"}}>
                        {["sq","lf","bdl","ea","job","hr"].map(u=><option key={u}>{u}</option>)}
                      </select>
                      <input type="number" value={item.unitCost} onChange={e=>upd(item.id,"unitCost",e.target.value)} style={{width:85,background:"#141414",border:"1px solid #1a1a1a",borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#fff",outline:"none"}}/>
                      <span style={{fontSize:13,fontWeight:800,color:"#fff",minWidth:60,textAlign:"right",fontFamily:"'DM Serif Display',serif"}}>${(item.qty*item.unitCost).toLocaleString()}</span>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <button onClick={()=>{del(item.id);setEditId(null);}} style={{flex:1,padding:"7px",background:"#1a0a0a",border:"1px solid #f8717133",borderRadius:8,fontSize:12,fontWeight:600,color:"#f87171",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><I.trash/> Remove</button>
                      <button onClick={()=>setEditId(null)} style={{flex:2,padding:"7px",background:"#22c55e",border:"none",borderRadius:8,fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Done ✓</button>
                    </div>
                  </div>
                ):(
                  <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setEditId(item.id)}>
                    <div style={{flex:1}}><div style={{fontSize:13,color:"#9ca3af",marginBottom:1}}>{item.description}</div><div style={{fontSize:11,color:"#374151"}}>{item.qty} {item.unit} @ ${item.unitCost?.toLocaleString()}</div></div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:800,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${(item.total||0).toLocaleString()}</span><span style={{color:"#374151"}}><I.edit/></span></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <button onClick={add} style={{width:"100%",padding:"11px",background:"transparent",border:"1.5px dashed #1a1a1a",borderRadius:10,fontSize:13,fontWeight:600,color:"#374151",cursor:"pointer",marginBottom:18,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>+ Add line item</button>

        <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:"#4b5563"}}>Subtotal</span><span style={{fontSize:13,color:"#9ca3af"}}>${sub.toLocaleString()}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,color:"#22c55e"}}>Margin ({margin}%)</span><span style={{fontSize:13,fontWeight:700,color:"#22c55e"}}>+${mamt.toLocaleString()}</span></div>
          <div style={{borderTop:"1px solid #111",paddingTop:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:15,fontWeight:800,color:"#fff"}}>Total</span><span style={{fontSize:26,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${total.toLocaleString()}</span></div>
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={gen} style={{flex:1,padding:"13px",background:"#141414",border:"1px solid #1a1a1a",borderRadius:11,fontSize:13,fontWeight:700,color:"#6b7280",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><I.bolt/> Regenerate</button>
          <button onClick={()=>onApprove({items,total,sub,mamt,margin})} style={{flex:2,padding:"13px",background:"#22c55e",border:"none",borderRadius:11,fontSize:14,fontWeight:800,color:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 0 24px #22c55e44"}}><I.check/> Approve & Send to Rep</button>
        </div>
      </div>
    </div>
  );
}

// ─── ESTIMATE VIEW (Rep sends) ────────────────────────────────────────────────
function EstimateView({lead,est,onBack,onSend}){
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  function doSend(){setSending(true);setTimeout(()=>{setSending(false);setSent(true);onSend();},2000);}
  const cats=[...new Set(est.items.map(i=>i.category))];
  const CC={"Tearoff":"#f87171","Materials":"#60a5fa","Labor":"#c084fc","Flashing":"#fbbf24","Gutters":"#34d399","Extras":"#fb923c","Cleanup":"#6b7280"};
  if(sent)return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#050505",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:60,marginBottom:20,filter:"drop-shadow(0 0 20px #22c55e88)"}}>📧</div>
      <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:8,fontFamily:"'DM Serif Display',serif"}}>Estimate Sent!</div>
      <div style={{fontSize:14,color:"#6b7280",marginBottom:6}}>Delivered to {lead?.name}</div>
      <div style={{fontSize:32,fontWeight:900,color:"#22c55e",marginBottom:10,fontFamily:"'DM Serif Display',serif"}}>${est.total.toLocaleString()}</div>
      <div style={{background:"#0d1a0f",border:"1px solid #22c55e33",borderRadius:12,padding:"14px 18px",marginBottom:28,fontSize:13,color:"#22c55e",width:"100%"}}>✓ Follow-up sequence activated automatically</div>
      <button onClick={onBack} style={{padding:"13px 28px",background:"#141414",border:"1px solid #1a1a1a",borderRadius:12,fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>← Back to pipeline</button>
    </div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#050505"}}>
      <div style={{background:"#0d1a0f",border:"none",borderBottom:"1px solid #22c55e33",padding:"11px 20px",display:"flex",alignItems:"center",gap:8}}><I.check/><span style={{fontSize:13,fontWeight:700,color:"#22c55e",fontFamily:"'DM Sans',sans-serif"}}>Approved by estimator — ready to send</span></div>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #111",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"#141414",border:"1px solid #1a1a1a",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#6b7280",display:"flex",alignItems:"center",justifyContent:"center"}}><I.back/></button>
        <div style={{flex:1}}><div style={{fontSize:17,fontWeight:800,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>{lead?.name}</div><div style={{fontSize:12,color:"#4b5563"}}>{lead?.claimType} · {lead?.insurance}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${est.total.toLocaleString()}</div><div style={{fontSize:11,color:"#22c55e",fontWeight:700}}>{est.margin}% margin</div></div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>
        {cats.map(cat=>(
          <div key={cat} style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:6,height:6,borderRadius:2,background:CC[cat]||"#6b7280"}}/><span style={{fontSize:10,fontWeight:700,color:"#374151",letterSpacing:"0.05em"}}>{cat.toUpperCase()}</span></div>
            {est.items.filter(i=>i.category===cat).map(item=>(
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #0f0f0f"}}>
                <div style={{flex:1}}><div style={{fontSize:13,color:"#6b7280"}}>{item.description}</div><div style={{fontSize:11,color:"#374151",marginTop:1}}>{item.qty} {item.unit} @ ${item.unitCost}</div></div>
                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>${(item.total||0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:14,padding:"16px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:"#4b5563"}}>Subtotal</span><span style={{fontSize:13,color:"#9ca3af"}}>${est.sub.toLocaleString()}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,color:"#22c55e"}}>Margin ({est.margin}%)</span><span style={{fontSize:13,color:"#22c55e",fontWeight:700}}>+${est.mamt.toLocaleString()}</span></div>
          <div style={{borderTop:"1px solid #111",paddingTop:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:15,fontWeight:800,color:"#fff"}}>Total</span><span style={{fontSize:24,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${est.total.toLocaleString()}</span></div>
        </div>
        <button onClick={doSend} disabled={sending} style={{width:"100%",padding:"15px",background:sending?"#0d1a0f":"#22c55e",border:sending?"1px solid #22c55e44":"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:15,cursor:sending?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:sending?"none":"0 0 30px #22c55e44"}}>
          {sending?<><Spin/> Sending…</>:<><I.send/> Send to {lead?.name?.split(" ")[0]}</>}
        </button>
      </div>
    </div>
  );
}

// ─── ESTIMATOR QUEUE ──────────────────────────────────────────────────────────
function EstQueue({leads,cfg,onOpen}){
  const pending=leads.filter(l=>l.estPending&&!l.estApproved);
  const approved=leads.filter(l=>l.estApproved);
  const active=leads.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage)&&!l.estPending&&!l.estApproved);
  return(
    <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
      {pending.length>0&&(<>
        <div style={{fontSize:10,color:"#fbbf24",fontWeight:700,letterSpacing:"0.08em",marginBottom:12,display:"flex",alignItems:"center",gap:6}}>⏳ AWAITING ESTIMATE ({pending.length})</div>
        {pending.map(l=>(
          <div key={l.id} onClick={()=>onOpen(l,"estimate")} style={{background:"#0a0a0a",border:"1px solid #fbbf2433",borderRadius:16,padding:"16px 18px",marginBottom:10,cursor:"pointer",transition:"border-color .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#fbbf2466"} onMouseLeave={e=>e.currentTarget.style.borderColor="#fbbf2433"}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>{l.name}</div><div style={{fontSize:12,color:"#4b5563"}}>{l.claimType} · {l.insurance}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:17,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${(l.value/1000).toFixed(0)}k</div><div style={{fontSize:11,color:"#fbbf24",fontWeight:700,marginTop:2}}>Build estimate →</div></div>
            </div>
          </div>
        ))}
      </>)}
      {approved.length>0&&(<>
        <div style={{fontSize:10,color:"#22c55e",fontWeight:700,letterSpacing:"0.08em",marginBottom:12,marginTop:pending.length?20:0}}>✓ APPROVED — AWAITING SEND ({approved.length})</div>
        {approved.map(l=>(
          <div key={l.id} onClick={()=>onOpen(l,"detail")} style={{background:"#0a0a0a",border:"1px solid #22c55e33",borderRadius:16,padding:"16px 18px",marginBottom:10,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>{l.name}</div><div style={{fontSize:12,color:"#22c55e"}}>Approved · ${l.estApproved?.total?.toLocaleString()}</div></div>
              <div style={{fontSize:11,color:"#60a5fa",fontWeight:700}}>Rep sending →</div>
            </div>
          </div>
        ))}
      </>)}
      {pending.length===0&&approved.length===0&&(
        <div style={{textAlign:"center",padding:"70px 0"}}>
          <div style={{fontSize:36,marginBottom:14}}>✓</div>
          <div style={{fontSize:15,fontWeight:700,color:"#374151",fontFamily:"'DM Serif Display',serif"}}>All caught up!</div>
          <div style={{fontSize:12,color:"#1f2937",marginTop:6}}>No estimates waiting</div>
        </div>
      )}
      {active.length>0&&(<>
        <div style={{fontSize:10,color:"#374151",fontWeight:700,letterSpacing:"0.08em",marginBottom:12,marginTop:20}}>ALL ACTIVE LEADS</div>
        {active.map(l=>(
          <div key={l.id} onClick={()=>onOpen(l,"detail")} style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:12,padding:"13px 16px",marginBottom:8,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#1a1a1a"} onMouseLeave={e=>e.currentTarget.style.borderColor="#111"}>
            <div><div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>{l.name}</div><div style={{fontSize:11,color:"#374151",marginTop:1}}>{l.rep} · {l.claimType}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:10,fontWeight:700,color:SM[l.stage].color,background:SM[l.stage].color+"22",border:`1px solid ${SM[l.stage].color}33`,borderRadius:5,padding:"2px 8px"}}>{l.stage}</span><span style={{fontSize:14,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>${(l.value/1000).toFixed(0)}k</span></div>
          </div>
        ))}
      </>)}
    </div>
  );
}

// ─── MANAGER DASHBOARD ────────────────────────────────────────────────────────
function MgrDash({leads,onOpen}){
  const active=leads.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));
  const won=leads.filter(l=>l.stage==="Closed Won");
  const lost=leads.filter(l=>l.stage==="Closed Lost");
  const pipeline=active.reduce((s,l)=>s+l.value,0);
  const wonRev=won.reduce((s,l)=>s+l.value,0);
  const weighted=active.reduce((s,l)=>s+l.value*(WIN_P[l.stage]/100),0);
  const suppGap=leads.filter(l=>l.insOffer>0).reduce((s,l)=>s+Math.max(0,l.estValue-l.insOffer),0);
  const overdue=active.filter(l=>l.daysSince>=3).length;
  const estPend=leads.filter(l=>l.estPending).length;
  const tc=won.length+lost.length;
  const wr=tc>0?Math.round(won.length/tc*100):null;
  const srcMap={};leads.forEach(l=>{srcMap[l.source]=(srcMap[l.source]||{count:0,won:0,value:0});srcMap[l.source].count++;if(l.stage==="Closed Won")srcMap[l.source].won++;srcMap[l.source].value+=l.value;});
  const srcStats=Object.entries(srcMap).sort((a,b)=>b[1].value-a[1].value);
  const lossMap={};lost.forEach(l=>{if(l.outcome)lossMap[l.outcome]=(lossMap[l.outcome]||0)+1;});
  const reps=[...new Set(leads.map(l=>l.rep))];
  const repStats=reps.map(rep=>{const rl=leads.filter(l=>l.rep===rep);const rw=rl.filter(l=>l.stage==="Closed Won");const rc=rl.filter(l=>["Closed Won","Closed Lost"].includes(l.stage));return{rep,active:rl.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage)).length,won:rw.length,pipeline:rl.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage)).reduce((s,l)=>s+l.value,0),wr:rc.length>0?Math.round(rw.length/rc.length*100):null};});
  return(
    <div style={{flex:1,overflowY:"auto",padding:"14px 18px 40px"}}>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[{l:"Active Pipeline",v:`$${(pipeline/1000).toFixed(0)}k`,s:`${active.length} deals`,c:"#fff"},{l:"Weighted Forecast",v:`$${(weighted/1000).toFixed(0)}k`,s:"by win probability",c:"#60a5fa"},{l:"Closed Revenue",v:`$${(wonRev/1000).toFixed(0)}k`,s:`${won.length} jobs won`,c:"#22c55e"},{l:"Win Rate",v:wr!=null?`${wr}%`:"—",s:`${tc} closed`,c:wr>=50?"#22c55e":wr>=30?"#fbbf24":"#f87171"}].map(({l,v,s,c})=>(
          <div key={l} style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:14,padding:"16px"}}>
            <div style={{fontSize:9,color:"#374151",fontWeight:700,letterSpacing:"0.08em",marginBottom:8}}>{l.toUpperCase()}</div>
            <div style={{fontSize:28,fontWeight:900,color:c,letterSpacing:"-0.04em",lineHeight:1,fontFamily:"'DM Serif Display',serif"}}>{v}</div>
            <div style={{fontSize:11,color:"#374151",marginTop:6}}>{s}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(overdue>0||suppGap>0||estPend>0)&&(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {overdue>0&&<div style={{background:"#1a0a0a",border:"1px solid #f8717133",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#7f1d1d",fontWeight:600}}>⚠ {overdue} lead{overdue>1?"s":""} overdue</span><span style={{fontSize:12,color:"#f87171",fontWeight:700}}>3+ days</span></div>}
          {suppGap>0&&<div style={{background:"#1a0d00",border:"1px solid #fb923c33",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#7c2d12",fontWeight:600}}>📋 ${(suppGap/1000).toFixed(0)}k supplement gaps</span><span style={{fontSize:12,color:"#fb923c",fontWeight:700}}>Pending</span></div>}
          {estPend>0&&<div style={{background:"#1a1500",border:"1px solid #fbbf2433",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#713f12",fontWeight:600}}>📄 {estPend} estimate{estPend>1?"s":""} in queue</span><span style={{fontSize:12,color:"#fbbf24",fontWeight:700}}>Estimator queue</span></div>}
        </div>
      )}

      {/* Source performance */}
      <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:14,padding:"18px",marginBottom:12}}>
        <div style={{fontSize:10,color:"#374151",fontWeight:700,letterSpacing:"0.08em",marginBottom:14}}>LEAD SOURCE PERFORMANCE</div>
        {srcStats.map(([src,stats])=>(
          <div key={src} style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{width:7,height:7,borderRadius:2,background:SOURCE_COLORS[src]||"#6b7280",flexShrink:0,boxShadow:`0 0 6px ${SOURCE_COLORS[src]||"#6b7280"}66`}}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{src}</span><span style={{fontSize:12,color:"#374151"}}>{stats.count} leads · {stats.won} won</span></div>
              <div style={{height:3,background:"#111",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${stats.count>0?Math.round(stats.won/stats.count*100):0}%`,background:SOURCE_COLORS[src]||"#6b7280",borderRadius:2,boxShadow:`0 0 6px ${SOURCE_COLORS[src]||"#6b7280"}66`}}/></div>
              <div style={{fontSize:10,color:"#1f2937",marginTop:3}}>{stats.count>0?Math.round(stats.won/stats.count*100):0}% win rate</div>
            </div>
          </div>
        ))}
      </div>

      {/* Loss reasons */}
      {Object.keys(lossMap).length>0&&(
        <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:14,padding:"18px",marginBottom:12}}>
          <div style={{fontSize:10,color:"#374151",fontWeight:700,letterSpacing:"0.08em",marginBottom:14}}>WHY WE'RE LOSING DEALS</div>
          {Object.entries(lossMap).map(([r,c])=>(
            <div key={r} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #0f0f0f"}}>
              <span style={{fontSize:13,color:"#6b7280"}}>{r}</span>
              <span style={{fontSize:13,fontWeight:800,color:"#f87171",fontFamily:"'DM Serif Display',serif"}}>{c}×</span>
            </div>
          ))}
        </div>
      )}

      {/* Rep performance */}
      <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:14,padding:"18px",marginBottom:12}}>
        <div style={{fontSize:10,color:"#374151",fontWeight:700,letterSpacing:"0.08em",marginBottom:14}}>REP PERFORMANCE</div>
        {repStats.map(rs=>(
          <div key={rs.rep} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #0f0f0f"}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#141414",border:"1px solid #1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>👤</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>{rs.rep}</div><div style={{fontSize:11,color:"#374151",marginTop:2}}>{rs.active} active · ${(rs.pipeline/1000).toFixed(0)}k · {rs.won} won</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:900,color:rs.wr>=50?"#22c55e":rs.wr>=30?"#fbbf24":"#4b5563",fontFamily:"'DM Serif Display',serif"}}>{rs.wr!=null?`${rs.wr}%`:"—"}</div><div style={{fontSize:10,color:"#374151"}}>win rate</div></div>
          </div>
        ))}
      </div>

      {/* All leads */}
      <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:14,padding:"18px"}}>
        <div style={{fontSize:10,color:"#374151",fontWeight:700,letterSpacing:"0.08em",marginBottom:14}}>ALL LEADS</div>
        {leads.map(l=>(
          <div key={l.id} onClick={()=>onOpen(l,"detail")} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid #0f0f0f",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>{l.name}</span>{l.hasUnread&&<span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block",boxShadow:"0 0 6px #22c55e"}}/>}{l.estPending&&<span style={{fontSize:9,color:"#fbbf24",fontWeight:700,background:"#1a1500",border:"1px solid #fbbf2433",borderRadius:3,padding:"1px 5px"}}>EST</span>}</div><div style={{fontSize:11,color:"#374151",marginTop:1,display:"flex",alignItems:"center",gap:5}}><span>{l.rep}</span><span>·</span><span style={{display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:5,height:5,borderRadius:"50%",background:SOURCE_COLORS[l.source]||"#6b7280",display:"inline-block"}}/>{l.source}</span></div></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,fontWeight:700,color:SM[l.stage].color,background:SM[l.stage].color+"22",border:`1px solid ${SM[l.stage].color}33`,borderRadius:5,padding:"2px 8px"}}>{l.stage}</span><span style={{fontSize:14,fontWeight:900,color:"#fff",fontFamily:"'DM Serif Display',serif",minWidth:36,textAlign:"right"}}>${(l.value/1000).toFixed(0)}k</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADD LEAD ─────────────────────────────────────────────────────────────────
function AddLead({cfg,onAdd,onClose}){
  const [f,setF]=useState({name:"",phone:"",value:"",insurance:"",claimType:"Hail Damage",source:"Referral",notes:"",rep:(cfg?.reps?.filter(r=>r.name)[0]?.name)||"Jordan S."});
  const inp={width:"100%",background:"#141414",border:"1px solid #1a1a1a",borderRadius:10,padding:"13px 16px",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#fff",boxSizing:"border-box",outline:"none"};
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(12px)"}}>
      <div style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"24px 24px 40px",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"#1a1a1a",borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"'DM Serif Display',serif"}}>New Lead</div><button onClick={onClose} style={{background:"#141414",border:"1px solid #1a1a1a",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:16,color:"#6b7280"}}>✕</button></div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[["Name *","name","John Smith"],["Phone *","phone","(720) 555-0000"],["Estimate ($)","value","15000"],["Insurance","insurance","State Farm"]].map(([l,k,p])=><div key={k}><div style={{fontSize:9,color:"#374151",fontWeight:700,marginBottom:5,letterSpacing:"0.06em"}}>{l}</div><input value={f[k]} onChange={e=>set(k,e.target.value)} placeholder={p} style={inp}/></div>)}
          {[["CLAIM TYPE","claimType",["Hail Damage","Wind Damage","Wind + Hail","Storm Damage","Other"]],["LEAD SOURCE","source",LEAD_SOURCES],["ASSIGN TO","rep",(cfg?.reps?.filter(r=>r.name).map(r=>r.name))||["Jordan S.","Marcus T."]]].map(([l,k,opts])=><div key={k}><div style={{fontSize:9,color:"#374151",fontWeight:700,marginBottom:5,letterSpacing:"0.06em"}}>{l}</div><select value={f[k]} onChange={e=>set(k,e.target.value)} style={{...inp,cursor:"pointer"}}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>)}
          <div><div style={{fontSize:9,color:"#374151",fontWeight:700,marginBottom:5,letterSpacing:"0.06em"}}>NOTES</div><textarea value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Referral source, situation, competing quotes…" style={{...inp,minHeight:70,resize:"vertical"}}/></div>
        </div>
        <button onClick={()=>{if(!f.name||!f.phone)return;onAdd({...f,id:Date.now(),value:parseInt(f.value)||0,stage:"New Lead",daysSince:0,address:"",adjuster:"Pending",insOffer:0,estValue:parseInt(f.value)||0,outcome:null,hasUnread:false,seqActive:false,estPending:false,estApproved:null,messages:[]});}} style={{width:"100%",padding:"15px",background:"#22c55e",border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:18,fontFamily:"inherit",boxShadow:"0 0 30px #22c55e44"}}>Add Lead</button>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState("landing");
  const [cfg,setCfg]=useState(null);
  const [leads,setLeads]=useState(()=>[...LEADS].sort((a,b)=>urgOf(b)-urgOf(a)));
  const [sel,setSel]=useState(null);
  const [selView,setSelView]=useState("detail");
  const [showAdd,setShowAdd]=useState(false);
  const [role,setRole]=useState("rep");
  const [listTab,setListTab]=useState("today");
  const [rTst,setRTst]=useState(null);

  const CSS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes toastUp{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes toastDown{from{opacity:0;transform:translateX(-50%) translateY(-16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}input[type=range]{height:3px;border-radius:2px}`;

  function upd(u){setLeads(p=>p.map(l=>l.id===u.id?u:l).sort((a,b)=>urgOf(b)-urgOf(a)));setSel(u);}
  function doSend(id,text){setLeads(p=>p.map(l=>l.id===id?{...l,daysSince:0,messages:[...l.messages,{from:"us",ch:"sms",text,date:"Today",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]}:l).sort((a,b)=>urgOf(b)-urgOf(a)));}
  function simRep(id){
    const rt=REPLIES[id];if(!rt)return;
    const lead=leads.find(l=>l.id===id);if(!lead)return;
    setLeads(p=>p.map(l=>l.id===id?{...l,hasUnread:true,daysSince:0,messages:[...l.messages,{from:"them",ch:"sms",text:rt,date:"Today",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]}:l).sort((a,b)=>urgOf(b)-urgOf(a)));
    setRTst({id,name:lead.name.split(" ")[0],preview:rt});
  }
  function addLead(l){setLeads(p=>[l,...p]);setShowAdd(false);}
  function open(l,v="detail"){setSel(l);setSelView(v);}

  const active=leads.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));
  const overdue=active.filter(l=>l.daysSince>=3).length;
  const unread=leads.filter(l=>l.hasUnread).length;
  const estPend=leads.filter(l=>l.estPending).length;
  const today=active.filter(l=>l.daysSince>=2||l.stage==="New Lead"||l.hasUnread||l.estApproved);
  const wonL=leads.filter(l=>l.stage==="Closed Won");
  const display=listTab==="today"?today:listTab==="won"?wonL:active;
  const coName=cfg?.co?.name||"RoofAI";
  const coLogo=cfg?.co?.logo||"🏠";

  if(screen==="landing")return(<><style>{CSS}</style><Landing onStart={()=>setScreen("onboarding")} onDemo={()=>{setCfg({co:{name:"Summit Roofing",logo:"🏠"},reps:[{name:"Jordan S.",role:"Account Manager"},{name:"Marcus T.",role:"Estimator"}],margin:"18",role:"rep"});setRole("rep");setScreen("app");}}/></>);
  if(screen==="onboarding")return(<><style>{CSS}</style><Onboarding onDone={c=>{setCfg(c);setRole(c.role);setScreen("app");}}/></>);

  if(sel){
    const cur=leads.find(l=>l.id===sel.id)||sel;
    return(
      <div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'DM Sans',sans-serif",background:"#050505",overflow:"hidden"}}>
        <style>{CSS}</style>
        {rTst&&<ReplyToast name={rTst.name} preview={rTst.preview} onTap={()=>{const l=leads.find(x=>x.id===rTst.id);if(l){setSel(l);setSelView("detail");}setRTst(null);}} onDone={()=>setRTst(null)}/>}
        <LeadDetail lead={cur} cfg={cfg} role={role} onBack={()=>setSel(null)} onUpdate={upd} onSend={doSend} onSimReply={simRep}/>
      </div>
    );
  }

  const ROLES=[["rep","Rep","📱"],["estimator","Estimator","📋"],["manager","Manager","📊"]];

  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",background:"#050505",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>
      {rTst&&<ReplyToast name={rTst.name} preview={rTst.preview} onTap={()=>{const l=leads.find(x=>x.id===rTst.id);if(l){setSel(l);setSelView("detail");}setRTst(null);}} onDone={()=>setRTst(null)}/>}

      {/* Header */}
      <div style={{background:"#050505",padding:"18px 20px 0",borderBottom:"1px solid #0f0f0f",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,background:"linear-gradient(135deg,#22c55e,#16a34a)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 16px #22c55e55",flexShrink:0}}>{coLogo}</div>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:"#fff",letterSpacing:"-0.03em",lineHeight:1,fontFamily:"'DM Serif Display',serif"}}>{coName}</div>
              <div style={{fontSize:11,color:"#1f2937",marginTop:3,display:"flex",gap:5}}>
                {unread>0&&<span style={{color:"#22c55e",fontWeight:700}}>{unread} repl{unread>1?"ies":"y"} ·</span>}
                {overdue>0&&<span style={{color:"#f87171",fontWeight:700}}>{overdue} overdue ·</span>}
                {estPend>0&&<span style={{color:"#fbbf24",fontWeight:700}}>{estPend} est ·</span>}
                <span>{active.length} active</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Role switcher — elegant pill */}
            <div style={{background:"#0a0a0a",border:"1px solid #111",borderRadius:12,padding:3,display:"flex",gap:2}}>
              {ROLES.map(([r,l,icon])=>(
                <button key={r} onClick={()=>setRole(r)} style={{padding:"6px 11px",borderRadius:9,border:"none",background:role===r?"#1a1a1a":"transparent",color:role===r?"#fff":"#374151",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",whiteSpace:"nowrap"}}>{icon}</button>
              ))}
            </div>
            {role!=="manager"&&<button onClick={()=>setShowAdd(true)} style={{width:34,height:34,background:"#1a1a1a",border:"1px solid #222",borderRadius:10,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#22c55e";e.currentTarget.style.borderColor="#22c55e";}} onMouseLeave={e=>{e.currentTarget.style.background="#1a1a1a";e.currentTarget.style.borderColor="#222";}}><I.plus/></button>}
          </div>
        </div>

        {/* Tabs */}
        {role==="rep"&&(
          <div style={{display:"flex",gap:2,paddingBottom:0}}>
            {[["today",`Today (${today.length})`],["all",`All (${active.length})`],["won","Won 🏆"]].map(([t,l])=>(
              <button key={t} onClick={()=>setListTab(t)} style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:listTab===t?"2px solid #22c55e":"2px solid transparent",fontSize:12,fontWeight:listTab===t?700:500,color:listTab===t?"#fff":"#374151",cursor:"pointer",fontFamily:"inherit",marginBottom:-1,transition:"all .15s"}}>{l}</button>
            ))}
          </div>
        )}
        {role==="estimator"&&<div style={{paddingBottom:12}}><span style={{fontSize:12,color:"#374151",fontWeight:600}}>Estimate queue · {estPend} pending</span></div>}
        {role==="manager"&&<div style={{paddingBottom:12}}><span style={{fontSize:12,color:"#374151",fontWeight:600}}>Owner view · all reps · {active.length} active deals</span></div>}
      </div>

      {/* Body */}
      {role==="rep"&&(
        <div style={{padding:"14px 18px",flex:1,overflowY:"auto"}}>
          {display.length===0?(
            <div style={{textAlign:"center",padding:"80px 0"}}>
              <div style={{fontSize:36,marginBottom:14}}>✓</div>
              <div style={{fontSize:16,fontWeight:700,color:"#374151",fontFamily:"'DM Serif Display',serif"}}>{listTab==="today"?"All caught up!":"No leads here."}</div>
            </div>
          ):display.map((l,i)=><ActionCard key={l.id} lead={l} rank={i+1} onOpen={open} onSend={doSend} onSimReply={simRep}/>)}
        </div>
      )}
      {role==="estimator"&&<EstQueue leads={leads} cfg={cfg} onOpen={open}/>}
      {role==="manager"&&<MgrDash leads={leads} onOpen={open}/>}

      {showAdd&&<AddLead cfg={cfg} onAdd={addLead} onClose={()=>setShowAdd(false)}/>}
    </div>
  );
}
