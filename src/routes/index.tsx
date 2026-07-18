import { createFileRoute } from "@tanstack/react-router";
import {
  useState, useCallback, useRef, useEffect,
  type DragEvent, type ChangeEvent, type CSSProperties
} from "react";

export const Route = createFileRoute("/")(
  { component: DiagnosisAI }
);

/* ─────────────── INJECTED STYLES ─────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&display=swap');

:root { --mx: 50vw; --my: 50vh; }

* { box-sizing: border-box; }

.dia-app {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  min-height: 100vh;
  background: radial-gradient(ellipse at 20% 10%, #1a0030 0%, #06060F 55%, #001420 100%);
  color: #fff;
  overflow-x: hidden;
  position: relative;
}

/* cursor glow */
.dia-cursor {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 1;
  background: radial-gradient(circle 480px at var(--mx) var(--my),
    rgba(170,0,255,0.13) 0%,
    rgba(41,121,255,0.10) 30%,
    rgba(0,229,255,0.06) 60%,
    transparent 80%);
  transition: background 0.05s;
}

/* doodles */
.dia-doodle {
  position: absolute;
  pointer-events: none;
  user-select: none;
  opacity: 0.13;
}

@keyframes dia-float {
  0%,100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-22px) rotate(6deg); }
}
@keyframes dia-float2 {
  0%,100% { transform: translateY(0) rotate(5deg); }
  50%      { transform: translateY(-14px) rotate(-4deg); }
}
@keyframes dia-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes dia-orbit {
  from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
}
@keyframes dia-draw {
  0%   { stroke-dashoffset: 900; opacity: 0; }
  10%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
@keyframes dia-pulse-dot {
  0%,100% { transform: scale(1); opacity: 0.5; }
  50%      { transform: scale(1.6); opacity: 1; }
}
@keyframes dia-dna {
  0%   { transform: translateY(0);   }
  100% { transform: translateY(-80px); }
}

/* glass card */
.dia-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 20px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  position: relative;
  overflow: hidden;
}
.dia-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  opacity: 0;
  transition: opacity 0.3s;
  background: radial-gradient(circle 300px at var(--cx,50%) var(--cy,50%),
    rgba(255,255,255,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.dia-card:hover::before { opacity: 1; }

/* glow colours per card */
.dia-card.glow-cyan:hover   { box-shadow: 0 0 0 1px rgba(0,229,255,0.4), 0 8px 40px rgba(0,229,255,0.18); border-color: rgba(0,229,255,0.35); transform: translateY(-2px); }
.dia-card.glow-violet:hover { box-shadow: 0 0 0 1px rgba(170,0,255,0.45), 0 8px 40px rgba(170,0,255,0.18); border-color: rgba(170,0,255,0.4); transform: translateY(-2px); }
.dia-card.glow-green:hover  { box-shadow: 0 0 0 1px rgba(0,230,118,0.4), 0 8px 40px rgba(0,230,118,0.18); border-color: rgba(0,230,118,0.35); transform: translateY(-2px); }
.dia-card.glow-orange:hover { box-shadow: 0 0 0 1px rgba(255,109,0,0.4), 0 8px 40px rgba(255,109,0,0.18); border-color: rgba(255,109,0,0.35); transform: translateY(-2px); }
.dia-card.glow-red:hover    { box-shadow: 0 0 0 1px rgba(255,23,68,0.4), 0 8px 40px rgba(255,23,68,0.18); border-color: rgba(255,23,68,0.35); transform: translateY(-2px); }
.dia-card.glow-blue:hover   { box-shadow: 0 0 0 1px rgba(41,121,255,0.4), 0 8px 40px rgba(41,121,255,0.18); border-color: rgba(41,121,255,0.35); transform: translateY(-2px); }
.dia-card.glow-rainbow:hover {
  box-shadow: 0 0 0 1px rgba(170,0,255,0.5), 0 8px 50px rgba(0,229,255,0.2), 0 0 80px rgba(255,23,68,0.1);
  border-color: rgba(170,0,255,0.5);
  transform: translateY(-2px);
}

/* inputs */
.dia-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  padding: 10px 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  -webkit-appearance: none;
}
.dia-input::placeholder { color: rgba(255,255,255,0.28); }
.dia-input:focus {
  border-color: rgba(0,229,255,0.5);
  box-shadow: 0 0 0 3px rgba(0,229,255,0.12);
}
textarea.dia-input { resize: none; line-height: 1.55; }
select.dia-input { cursor: pointer; }
select.dia-input option { background: #12122a; color: #fff; }

/* label */
.dia-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.45);
  margin-bottom: 6px;
}

/* section title */
.dia-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.4);
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.dia-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.08);
}

/* rainbow gradient text */
.dia-rainbow-text {
  background: linear-gradient(90deg, #FF1744, #FF6D00, #FFD600, #00E676, #00E5FF, #2979FF, #AA00FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* upload zone rainbow border */
@keyframes dia-rainbow-border {
  0%   { box-shadow: 0 0 0 2px #FF1744, 0 0 18px rgba(255,23,68,0.3); }
  14%  { box-shadow: 0 0 0 2px #FF6D00, 0 0 18px rgba(255,109,0,0.3); }
  28%  { box-shadow: 0 0 0 2px #FFD600, 0 0 18px rgba(255,214,0,0.3); }
  42%  { box-shadow: 0 0 0 2px #00E676, 0 0 18px rgba(0,230,118,0.3); }
  57%  { box-shadow: 0 0 0 2px #00E5FF, 0 0 18px rgba(0,229,255,0.3); }
  71%  { box-shadow: 0 0 0 2px #2979FF, 0 0 18px rgba(41,121,255,0.3); }
  85%  { box-shadow: 0 0 0 2px #AA00FF, 0 0 18px rgba(170,0,255,0.3); }
  100% { box-shadow: 0 0 0 2px #FF1744, 0 0 18px rgba(255,23,68,0.3); }
}
.dia-upload-zone {
  border: 2px dashed rgba(255,255,255,0.15);
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: rgba(255,255,255,0.02);
}
.dia-upload-zone:hover,
.dia-upload-zone.dragging {
  animation: dia-rainbow-border 3s linear infinite;
  background: rgba(255,255,255,0.05);
}

/* chip system selector */
.dia-chip {
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.15);
  padding: 5px 13px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s;
  background: transparent;
  color: rgba(255,255,255,0.6);
  font-family: inherit;
}
.dia-chip:hover {
  border-color: rgba(255,255,255,0.35);
  color: #fff;
  transform: translateY(-1px);
}
.dia-chip.active {
  background: linear-gradient(135deg, #AA00FF 0%, #2979FF 50%, #00E5FF 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 20px rgba(170,0,255,0.35);
}

/* rainbow button */
@keyframes dia-btn-glow {
  0%,100% { box-shadow: 0 0 25px rgba(170,0,255,0.5), 0 4px 15px rgba(0,229,255,0.3); }
  50%      { box-shadow: 0 0 40px rgba(255,23,68,0.5), 0 4px 20px rgba(255,214,0,0.3); }
}
.dia-btn-rainbow {
  width: 100%;
  height: 48px;
  border-radius: 14px;
  border: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #FF1744 0%, #FF6D00 20%, #FFD600 40%, #00E676 60%, #00E5FF 80%, #AA00FF 100%);
  background-size: 200%;
  animation: dia-btn-glow 3s ease-in-out infinite;
  transition: transform 0.15s, filter 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.02em;
}
.dia-btn-rainbow:hover:not(:disabled) { transform: translateY(-2px) scale(1.01); filter: brightness(1.1); }
.dia-btn-rainbow:active:not(:disabled) { transform: scale(0.98); }
.dia-btn-rainbow:disabled { opacity: 0.55; cursor: not-allowed; animation: none; filter: grayscale(0.5); }

.dia-btn-secondary {
  height: 48px;
  padding: 0 20px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.07);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.75);
  cursor: pointer;
  transition: all 0.2s;
}
.dia-btn-secondary:hover { background: rgba(255,255,255,0.12); color: #fff; transform: translateY(-1px); }

.dia-btn-download {
  width: 100%;
  height: 48px;
  border-radius: 14px;
  border: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #00E676 0%, #00E5FF 50%, #2979FF 100%);
  box-shadow: 0 4px 20px rgba(0,229,255,0.3);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.dia-btn-download:hover { transform: translateY(-2px); box-shadow: 0 6px 30px rgba(0,229,255,0.45); }

/* accordion toggle */
.dia-api-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  border-radius: 20px;
  transition: color 0.2s;
}
.dia-api-toggle:hover { color: rgba(255,255,255,0.9); }

/* file item */
.dia-file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  transition: border-color 0.2s;
}
.dia-file-item:hover { border-color: rgba(0,229,255,0.3); }

/* results */
.dia-diff-item {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.04);
  padding: 14px 16px;
  transition: all 0.2s;
}
.dia-diff-item:hover { border-color: rgba(0,229,255,0.25); background: rgba(0,229,255,0.04); }

.dia-badge-high     { background: rgba(255,23,68,0.2);   border: 1px solid rgba(255,23,68,0.4);   color: #FF6B85; }
.dia-badge-moderate { background: rgba(255,214,0,0.15);  border: 1px solid rgba(255,214,0,0.4);   color: #FFD600; }
.dia-badge-low      { background: rgba(0,229,255,0.12);  border: 1px solid rgba(0,229,255,0.35);  color: #00E5FF; }
.dia-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* error box */
.dia-error {
  border-radius: 14px;
  border: 1px solid rgba(255,23,68,0.35);
  background: rgba(255,23,68,0.1);
  padding: 14px 16px;
  font-size: 13px;
  color: #FF8095;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* empty state */
.dia-empty {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  border: 2px dashed rgba(255,255,255,0.1);
  text-align: center;
  padding: 48px 32px;
  background: rgba(255,255,255,0.02);
}

/* loading */
.dia-loading {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
  text-align: center;
  padding: 48px 32px;
}
@keyframes dia-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.dia-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(255,255,255,0.08);
  border-top-color: #00E5FF;
  border-radius: 50%;
  animation: dia-spin 0.9s linear infinite;
  margin-bottom: 16px;
}

/* scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
`;

/* ─────────────── CONSTANTS ─────────────── */
const BODY_SYSTEMS = [
  "Cardiovascular","Respiratory","Gastrointestinal","Neurological",
  "Musculoskeletal","Genitourinary","Endocrine","Dermatological",
  "Haematological","Ophthalmological","ENT","Psychiatric","Immunological","Hepatobiliary",
];
const DURATIONS = [
  { value:"", label:"Select duration" },
  { value:"hours",   label:"Hours (< 24 h)" },
  { value:"days",    label:"Days (1–7 days)" },
  { value:"weeks",   label:"Weeks (1–4 weeks)" },
  { value:"months",  label:"Months (1–6 months)" },
  { value:"chronic", label:"Chronic (> 6 months)" },
];
const SEVERITIES = [
  { value:"", label:"Select severity" },
  { value:"mild",     label:"Mild – tolerable" },
  { value:"moderate", label:"Moderate – some limitation" },
  { value:"severe",   label:"Severe – significant limitation" },
  { value:"critical", label:"Critical – emergency" },
];
const ACCEPTED = ["image/jpeg","image/png","image/webp","application/pdf","text/plain"];

/* ─────────────── TYPES ─────────────── */
interface UploadedFile {
  id:string; file:File; name:string;
  type:"image"|"pdf"|"text"; size:string;
  base64?:string; extractedText?:string; preview?:string;
}
interface Differential {
  rank:number; diagnosis:string;
  likelihood:"High"|"Moderate"|"Low"; reasoning:string;
}
interface DiagnosisResult {
  summary:string;
  differentials:Differential[];
  investigationFindings:string[];
  redFlags:string[];
  recommendedWorkup:string[];
  managementPlan:string[];
  clinicalPearl:string;
  disclaimer:string;
}

/* ─────────────── FILE HELPERS ─────────────── */
const fmtSize = (b:number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
const fileKind = (f:File):"image"|"pdf"|"text" =>
  f.type.startsWith("image/") ? "image" : f.type === "application/pdf" ? "pdf" : "text";

const toBase64 = (f:File) => new Promise<string>((res,rej) => {
  const r = new FileReader();
  r.onload = () => res((r.result as string).split(",")[1]);
  r.onerror = () => rej(new Error("Read failed"));
  r.readAsDataURL(f);
});
const toDataURL = (f:File) => new Promise<string>((res,rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = () => rej(new Error("Read failed"));
  r.readAsDataURL(f);
});
const extractPDFText = async (file:File) => {
  const raw = new TextDecoder("latin1").decode(new Uint8Array(await file.arrayBuffer()));
  const chunks:string[] = [];
  const re = /\(([^)\\]{3,})\)/g; let m;
  while ((m = re.exec(raw)) !== null) {
    const s = m[1].replace(/\\n/g,"\n").trim();
    if (s.length>2 && /[a-zA-Z0-9]/.test(s)) chunks.push(s);
  }
  const txt = chunks.join(" ").replace(/\s{2,}/g," ").trim();
  return txt.length>100 ? txt.slice(0,8000) : `[PDF: ${file.name} — context from filename only]`;
};
const readTextFile = (f:File) => new Promise<string>((res,rej) => {
  const r = new FileReader();
  r.onload = () => res((r.result as string).slice(0,8000));
  r.onerror = () => rej(new Error("failed")); r.readAsText(f);
});
async function processFile(file:File):Promise<UploadedFile> {
  const kind = fileKind(file);
  const uf:UploadedFile = { id:`${Date.now()}-${Math.random().toString(36).slice(2)}`, file, name:file.name, type:kind, size:fmtSize(file.size) };
  if (kind==="image") { uf.preview = await toDataURL(file); uf.base64 = await toBase64(file); }
  else if (kind==="pdf") { uf.extractedText = await extractPDFText(file); }
  else { uf.extractedText = await readTextFile(file); }
  return uf;
}

/* ─────────────── AI HELPERS ─────────────── */
function buildPrompt(age:string,sex:string,cc:string,dur:string,sev:string,sys:string[],hist:string,files:UploadedFile[]) {
  const fc = files.length ? files.map(f=>f.type==="image"?`[IMAGE: ${f.name} — vision-analysed]`:`[DOC: ${f.name}]\n${f.extractedText??""}`).join("\n\n---\n\n") : null;
  return `You are a senior clinician. Provide a structured differential diagnosis and clinical analysis for an AI decision-support tool.

PATIENT: Age ${age||"?"}, Sex ${sex||"?"}, Duration ${dur||"?"}, Severity ${sev||"?"}
Body systems: ${sys.join(", ")||"not specified"}
Chief complaint: ${cc||"see uploaded documents"}
History/notes: ${hist||"none"}
${fc?`\nUPLOADED FILES:\n${fc}`:""}

Respond ONLY in valid JSON (no fences):
{
  "summary":"2-3 sentence clinical summary integrating all information",
  "differentials":[{"rank":1,"diagnosis":"...","likelihood":"High|Moderate|Low","reasoning":"2-3 sentences"}],
  "investigationFindings":["key finding from uploaded reports (empty if no uploads)"],
  "redFlags":["urgent features"],
  "recommendedWorkup":["investigations to order"],
  "managementPlan":["immediate steps"],
  "clinicalPearl":"one memorable teaching point",
  "disclaimer":"one-line medical-legal disclaimer"
}
Return 4–6 differentials, 3–6 management steps.`;
}

async function callGroqText(key:string, prompt:string):Promise<DiagnosisResult> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
    body:JSON.stringify({model:"llama-3.3-70b-versatile",messages:[{role:"user",content:prompt}],temperature:0.3,max_tokens:2000}),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})) as {error?:{message?:string}}; throw new Error(e?.error?.message??`Groq ${res.status}`); }
  const d = await res.json() as {choices:Array<{message:{content:string}}>};
  return JSON.parse(d.choices[0].message.content.replace(/```json|```/g,"").trim()) as DiagnosisResult;
}

async function callGroqVision(key:string, b64:string, mime:string):Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
    body:JSON.stringify({
      model:"meta-llama/llama-4-scout-17b-16e-instruct",
      messages:[{role:"user",content:[
        {type:"image_url",image_url:{url:`data:${mime};base64,${b64}`}},
        {type:"text",text:"Analyse this medical image/report. List: 1) Investigation type, 2) Key findings (normal & abnormal), 3) Significant abnormalities, 4) Clinical interpretation. Be specific, use medical terminology. Max 300 words."},
      ]}],
      temperature:0.2, max_tokens:600,
    }),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})) as {error?:{message?:string}}; throw new Error(e?.error?.message??`Vision ${res.status}`); }
  const d = await res.json() as {choices:Array<{message:{content:string}}>};
  return d.choices[0].message.content;
}

async function runDiagnosis(key:string,age:string,sex:string,cc:string,dur:string,sev:string,sys:string[],hist:string,files:UploadedFile[]):Promise<DiagnosisResult> {
  const enriched:UploadedFile[] = [];
  for (const f of files) {
    if (f.type==="image"&&f.base64) {
      try { enriched.push({...f, extractedText: await callGroqVision(key,f.base64,f.file.type)}); }
      catch { enriched.push({...f, extractedText:`[Image: ${f.name} — vision unavailable]`}); }
    } else { enriched.push(f); }
  }
  return callGroqText(key, buildPrompt(age,sex,cc,dur,sev,sys,hist,enriched));
}

/* ─────────────── PDF REPORT ─────────────── */
function openPDFReport(result:DiagnosisResult, pi:{age:string;sex:string;chiefComplaint:string;duration:string;severity:string}, files:UploadedFile[]) {
  const now = new Date();
  const ds = now.toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});
  const ts = now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
  const li = (arr:string[],col="#00A896")=>arr.map(x=>`<li style="margin:4px 0;color:#334155;font-size:13px;padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:${col}">•</span>${x}</li>`).join("");
  const dRows = result.differentials.map(d=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">${d.rank}. ${d.diagnosis}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;"><span style="padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${d.likelihood==="High"?"#fee2e2":d.likelihood==="Moderate"?"#fef3c7":"#dbeafe"};color:${d.likelihood==="High"?"#991b1b":d.likelihood==="Moderate"?"#92400e":"#1e40af"};">${d.likelihood}</span></td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">${d.reasoning}</td></tr>`).join("");
  const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>DiagnosisAI Report — ${ds}</title>
<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.no-print{display:none!important;}@page{margin:18mm 15mm;}}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;margin:0;padding:0;background:#fff;}
.header{background:linear-gradient(135deg,#0F4C81 0%,#0a3460 100%);color:white;padding:24px 32px;}
.header h1{margin:0;font-size:24px;font-weight:800;}.header h1 span{color:#00D4BE;}
.header p{margin:4px 0 0;font-size:12px;opacity:.8;letter-spacing:.1em;text-transform:uppercase;}
.meta-bar{background:linear-gradient(90deg,#AA00FF,#2979FF,#00E5FF);padding:10px 32px;display:flex;justify-content:space-between;align-items:center;}
.meta-bar span{color:white;font-size:12px;font-weight:500;}
.body{padding:28px 32px;}
.patient-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;}
.patient-cell{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;}
.patient-cell label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:3px;}
.patient-cell span{font-size:14px;font-weight:600;color:#1e293b;}
.complaint-box{background:#eff6ff;border-left:4px solid #0F4C81;border-radius:6px;padding:14px 16px;margin-bottom:24px;}
.summary-box{background:#f0fdf4;border-left:4px solid #00A896;border-radius:6px;padding:14px 16px;margin-bottom:24px;}
.section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:0 0 12px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;}
.section{margin-bottom:24px;}
table{width:100%;border-collapse:collapse;font-size:13px;}
th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;}
.red-flags{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;}
.footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;font-size:11px;color:#94a3b8;line-height:1.6;}
.pearl{background:#eff6ff;border-left:4px solid #7C4DFF;padding:12px 16px;border-radius:6px;margin-bottom:24px;}
.print-btn{position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#AA00FF,#2979FF,#00E5FF);color:white;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(170,0,255,0.4);}
</style></head><body>
<button class="no-print print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
<div class="header"><h1>Diagnosis<span>AI</span></h1><p>Clinical Decision Support Report</p></div>
<div class="meta-bar"><span>📅 ${ds} at ${ts}</span><span>AI-Assisted Clinical Analysis · Educational Use Only</span></div>
<div class="body">
<div class="patient-grid">
<div class="patient-cell"><label>Age</label><span>${pi.age||"—"}</span></div>
<div class="patient-cell"><label>Sex</label><span>${pi.sex?pi.sex[0].toUpperCase()+pi.sex.slice(1):"—"}</span></div>
<div class="patient-cell"><label>Duration</label><span>${pi.duration||"—"}</span></div>
<div class="patient-cell" style="grid-column:span 3"><label>Severity</label><span>${pi.severity||"—"}</span></div>
</div>
<div class="complaint-box"><label style="font-size:11px;font-weight:700;text-transform:uppercase;color:#3b82f6;letter-spacing:.08em;">Chief Complaint</label><p style="margin:6px 0 0;font-size:14px;color:#1e293b;font-weight:500;">${pi.chiefComplaint}</p></div>
${files.length?`<div class="section"><h3 class="section-title">📎 Uploaded Documents</h3>${files.map(f=>`<div style="font-size:13px;color:#475569;margin:4px 0;">📄 ${f.name} (${f.size})</div>`).join("")}</div>`:""}
<div class="summary-box"><label style="font-size:11px;font-weight:700;text-transform:uppercase;color:#059669;letter-spacing:.08em;">Clinical Summary</label><p style="margin:6px 0 0;font-size:13px;color:#166534;line-height:1.6;">${result.summary}</p></div>
${result.investigationFindings?.length?`<div class="section"><h3 class="section-title">🔬 Investigation Findings</h3><ul style="margin:0;padding-left:0;list-style:none;">${li(result.investigationFindings,"#00A896")}</ul></div>`:""}
<div class="section"><h3 class="section-title">🧠 Differential Diagnosis</h3><table><thead><tr><th>Diagnosis</th><th style="text-align:center;width:100px;">Likelihood</th><th>Clinical Reasoning</th></tr></thead><tbody>${dRows}</tbody></table></div>
${result.redFlags?.length?`<div class="red-flags"><h3 class="section-title" style="color:#dc2626;border-bottom-color:#fecaca;">⚠️ Red Flags</h3><ul style="margin:0;padding-left:0;list-style:none;">${li(result.redFlags,"#dc2626")}</ul></div>`:""}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
<div class="section" style="margin:0"><h3 class="section-title">📋 Recommended Workup</h3><ul style="margin:0;padding-left:0;list-style:none;">${li(result.recommendedWorkup??[],"#0F4C81")}</ul></div>
<div class="section" style="margin:0"><h3 class="section-title">💊 Management Plan</h3><ul style="margin:0;padding-left:0;list-style:none;">${li(result.managementPlan??[],"#00A896")}</ul></div>
</div>
${result.clinicalPearl?`<div class="pearl"><label style="font-size:11px;font-weight:700;text-transform:uppercase;color:#7C4DFF;letter-spacing:.08em;">🩺 Clinical Pearl</label><p style="margin:4px 0 0;font-size:13px;color:#4527a0;">${result.clinicalPearl}</p></div>`:""}
</div>
<div class="footer"><strong>⚠️ DISCLAIMER:</strong> ${result.disclaimer||"This report is AI-generated for educational and clinical decision-support purposes only. It does not replace professional clinical examination or judgment."}<br><br>DiagnosisAI — Powered by Groq × LLaMA 3.3 · LLaMA 4 Vision · Developed by Satya Sundar Thakur</div>
</body></html>`;
  const w = window.open("","_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }
}

/* ─────────────── DOODLE COMPONENTS ─────────────── */
function DoodleHeartbeat() {
  return (
    <svg width="420" height="70" className="dia-doodle" style={{ top:"82px", left:"50%", transform:"translateX(-50%)", opacity:0.11 }}>
      <defs>
        <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF1744"/><stop offset="50%" stopColor="#00E5FF"/><stop offset="100%" stopColor="#AA00FF"/>
        </linearGradient>
      </defs>
      <path d="M0,35 L80,35 L95,12 L108,58 L121,35 L148,35 L165,5 L178,65 L191,35 L420,35"
        fill="none" stroke="url(#ecgGrad)" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="900" style={{ animation:"dia-draw 4s ease-in-out infinite" }} />
    </svg>
  );
}
function DoodlePill({ style }:{style?:CSSProperties}) {
  return (
    <svg width="70" height="28" className="dia-doodle" style={style}>
      <defs><linearGradient id="pillG" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FF6D00"/><stop offset="100%" stopColor="#FFD600"/>
      </linearGradient></defs>
      <rect x="2" y="2" width="66" height="24" rx="12" fill="url(#pillG)" stroke="#FF6D00" strokeWidth="1"/>
      <line x1="35" y1="2" x2="35" y2="26" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
    </svg>
  );
}
function DoodleDNA({ style }:{style?:CSSProperties}) {
  const dots = Array.from({length:10},(_,i)=>i);
  return (
    <svg width="40" height="200" className="dia-doodle" style={style}>
      {dots.map(i=>{
        const y = i*20+10; const x1=8, x2=32;
        const lx = i%2===0?x1:x2; const rx = i%2===0?x2:x1;
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="rgba(170,0,255,0.5)" strokeWidth="1.5"/>
            <circle cx={lx} cy={y} r="4" fill="#AA00FF" style={{ animation:`dia-pulse-dot 2s ease-in-out ${i*0.2}s infinite` }}/>
            <circle cx={rx} cy={y} r="4" fill="#00E5FF" style={{ animation:`dia-pulse-dot 2s ease-in-out ${i*0.2+0.5}s infinite` }}/>
          </g>
        );
      })}
    </svg>
  );
}
function DoodleCross({ style, color="#00E676" }:{style?:CSSProperties;color?:string}) {
  return (
    <svg width="32" height="32" className="dia-doodle" style={style}>
      <rect x="10" y="2" width="12" height="28" rx="4" fill={color}/>
      <rect x="2" y="10" width="28" height="12" rx="4" fill={color}/>
    </svg>
  );
}
function DoodleAtom({ style }:{style?:CSSProperties}) {
  return (
    <svg width="90" height="90" className="dia-doodle" style={style}>
      <defs><linearGradient id="atomG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2979FF"/><stop offset="100%" stopColor="#00E5FF"/>
      </linearGradient></defs>
      <ellipse cx="45" cy="45" rx="40" ry="18" fill="none" stroke="url(#atomG)" strokeWidth="1.5"/>
      <ellipse cx="45" cy="45" rx="40" ry="18" fill="none" stroke="url(#atomG)" strokeWidth="1.5" transform="rotate(60 45 45)"/>
      <ellipse cx="45" cy="45" rx="40" ry="18" fill="none" stroke="url(#atomG)" strokeWidth="1.5" transform="rotate(120 45 45)"/>
      <circle cx="45" cy="45" r="6" fill="#00E5FF"/>
      <circle cx="45" cy="7" r="3.5" fill="#2979FF" style={{ animation:"dia-orbit 4s linear infinite", transformOrigin:"45px 45px" }}/>
    </svg>
  );
}
function DoodleStethoscope({ style }:{style?:CSSProperties}) {
  return (
    <svg width="100" height="120" className="dia-doodle" style={style}>
      <defs><linearGradient id="stetG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF1744"/><stop offset="100%" stopColor="#FF6D00"/>
      </linearGradient></defs>
      <path d="M30,10 Q30,50 50,60 Q70,70 70,90 A20,20 0 1,1 30,90" fill="none" stroke="url(#stetG)" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="30" cy="10" r="6" fill="url(#stetG)"/>
      <circle cx="70" cy="10" r="6" fill="url(#stetG)"/>
      <path d="M30,10 Q30,18 38,22" fill="none" stroke="url(#stetG)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/* ─────────────── CURSOR GLOW ─────────────── */
function CursorGlow() {
  useEffect(()=>{
    const h = (e:PointerEvent)=>{
      document.documentElement.style.setProperty("--mx",`${e.clientX}px`);
      document.documentElement.style.setProperty("--my",`${e.clientY}px`);
    };
    window.addEventListener("pointermove",h,{passive:true});
    return ()=>window.removeEventListener("pointermove",h);
  },[]);
  return <div className="dia-cursor"/>;
}

/* ─────────────── SUB-COMPONENTS ─────────────── */
function LikelihoodBadge({level}:{level:"High"|"Moderate"|"Low"}) {
  const cls = level==="High"?"dia-badge-high":level==="Moderate"?"dia-badge-moderate":"dia-badge-low";
  return <span className={`dia-badge ${cls}`}>{level}</span>;
}

function FileUploadZone({ files, onAdd, onRemove }:{ files:UploadedFile[]; onAdd:(f:File[])=>void; onRemove:(id:string)=>void; }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handleDrop = useCallback((e:DragEvent<HTMLDivElement>)=>{ e.preventDefault(); setDrag(false); const fs = Array.from(e.dataTransfer.files).filter(f=>ACCEPTED.includes(f.type)); if(fs.length) onAdd(fs); },[onAdd]);
  const handleChange = (e:ChangeEvent<HTMLInputElement>)=>{ const fs=Array.from(e.target.files??[]); if(fs.length) onAdd(fs); e.target.value=""; };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
      <div className={`dia-upload-zone${drag?" dragging":""}`}
        onDrop={handleDrop} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
        onClick={()=>ref.current?.click()}>
        <div style={{marginBottom:"10px",fontSize:"32px"}}>⬆️</div>
        <p style={{margin:"0 0 4px",fontWeight:700,fontSize:"14px",color:"rgba(255,255,255,0.85)"}}>Drop files or <span style={{color:"#00E5FF"}}>browse</span></p>
        <p style={{margin:0,fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>X-rays, lab reports, PDFs, prescriptions — JPG · PNG · PDF · TXT</p>
        <input ref={ref} type="file" multiple accept={ACCEPTED.join(",")} style={{display:"none"}} onChange={handleChange}/>
      </div>
      {files.map(f=>(
        <div key={f.id} className="dia-file-item">
          {f.type==="image"&&f.preview
            ? <img src={f.preview} alt={f.name} style={{width:44,height:44,objectFit:"cover",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",flexShrink:0}}/>
            : <div style={{width:44,height:44,borderRadius:8,background:`rgba(${f.type==="pdf"?"255,23,68":"100,100,255"},0.15)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"20px"}}>{f.type==="pdf"?"📄":"📝"}</div>
          }
          <div style={{minWidth:0,flex:1}}>
            <p style={{margin:0,fontSize:"13px",fontWeight:600,color:"rgba(255,255,255,0.9)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</p>
            <p style={{margin:"2px 0 0",fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>{f.type==="image"?"Image":f.type==="pdf"?"PDF":"Text"} · {f.size}</p>
          </div>
          <button onClick={()=>onRemove(f.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:"18px",padding:"4px",transition:"color 0.2s",flexShrink:0}}
            onMouseEnter={e=>(e.currentTarget.style.color="#FF1744")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.35)")}>✕</button>
        </div>
      ))}
    </div>
  );
}

function ResultsPanel({ result, pi, files }:{ result:DiagnosisResult; pi:{age:string;sex:string;chiefComplaint:string;duration:string;severity:string}; files:UploadedFile[]; }) {
  const rows = [
    { icon:"🔬", title:"Investigation Findings", items:result.investigationFindings, glow:"glow-green", col:"#00E676", visible:result.investigationFindings?.length>0 },
    { icon:"⚠️", title:"Red Flags", items:result.redFlags, glow:"glow-red", col:"#FF1744", visible:result.redFlags?.length>0 },
    { icon:"📋", title:"Recommended Workup", items:result.recommendedWorkup??[], glow:"glow-cyan", col:"#00E5FF", visible:true },
    { icon:"💊", title:"Management Plan", items:result.managementPlan??[], glow:"glow-blue", col:"#2979FF", visible:true },
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px",animation:"dia-float2 0.5s ease-out"}}>
      <button className="dia-btn-download" onClick={()=>openPDFReport(result,pi,files)}>⬇ Download PDF Report</button>
      {/* Summary */}
      <div className="dia-card glow-green" style={{padding:"18px 20px"}}>
        <p style={{margin:"0 0 8px",fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#00E676"}}>Clinical Summary</p>
        <p style={{margin:0,fontSize:"13px",lineHeight:1.65,color:"rgba(255,255,255,0.82)"}}>{result.summary}</p>
      </div>
      {/* Differentials */}
      <div className="dia-card glow-violet" style={{padding:"18px 20px"}}>
        <p className="dia-section-title">🧠 Differential Diagnosis</p>
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {result.differentials.map(d=>(
            <div key={d.rank} className="dia-diff-item">
              <div style={{display:"flex",alignItems:"center",gap:"10px",justifyContent:"space-between",marginBottom:"6px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#AA00FF,#2979FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:800,flexShrink:0}}>{d.rank}</span>
                  <span style={{fontWeight:700,fontSize:"13px",color:"rgba(255,255,255,0.92)"}}>{d.diagnosis}</span>
                </div>
                <LikelihoodBadge level={d.likelihood}/>
              </div>
              <p style={{margin:0,fontSize:"12px",color:"rgba(255,255,255,0.55)",lineHeight:1.55,paddingLeft:30}}>{d.reasoning}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Findings rows */}
      {rows.filter(r=>r.visible).map(r=>(
        <div key={r.title} className={`dia-card ${r.glow}`} style={{padding:"18px 20px"}}>
          <p className="dia-section-title">{r.icon} {r.title}</p>
          <ul style={{margin:0,padding:0,listStyle:"none",display:"flex",flexDirection:"column",gap:"6px"}}>
            {r.items.map((item,i)=>(
              <li key={i} style={{fontSize:"12px",color:"rgba(255,255,255,0.72)",display:"flex",gap:"8px",alignItems:"flex-start",lineHeight:1.5}}>
                <span style={{color:r.col,flexShrink:0,marginTop:"1px"}}>▸</span>{item}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {/* Pearl */}
      {result.clinicalPearl && (
        <div className="dia-card glow-rainbow" style={{padding:"18px 20px",borderLeft:"4px solid #AA00FF"}}>
          <p style={{margin:"0 0 6px",fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#AA00FF"}}>🩺 Clinical Pearl</p>
          <p style={{margin:0,fontSize:"13px",color:"rgba(255,255,255,0.8)",lineHeight:1.6}}>{result.clinicalPearl}</p>
        </div>
      )}
      <p style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",lineHeight:1.6,padding:"12px 16px",background:"rgba(255,255,255,0.03)",borderRadius:"10px"}}>
        ⚠️ {result.disclaimer||"For educational and decision-support use only. Does not replace clinical judgment."}
      </p>
    </div>
  );
}

/* ─────────────── MAIN ─────────────── */
function DiagnosisAI() {
  const [age,setAge]=useState("");
  const [sex,setSex]=useState("");
  const [cc,setCc]=useState("");
  const [dur,setDur]=useState("");
  const [sev,setSev]=useState("");
  const [sys,setSys]=useState<string[]>([]);
  const [hist,setHist]=useState("");
  const [files,setFiles]=useState<UploadedFile[]>([]);
  const [procFiles,setProcFiles]=useState(false);
  const [apiKey,setApiKey]=useState(()=>typeof window!=="undefined"?localStorage.getItem("groq_api_key")??"":"");
  const [showApi,setShowApi]=useState(false);
  const [loading,setLoading]=useState(false);
  const [loadStep,setLoadStep]=useState("");
  const [result,setResult]=useState<DiagnosisResult|null>(null);
  const [error,setError]=useState<string|null>(null);

  const toggleSys = useCallback((s:string)=>setSys(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]),[]);

  const handleAddFiles = useCallback(async(fs:File[])=>{
    setProcFiles(true);
    try { const p = await Promise.all(fs.map(processFile)); setFiles(prev=>[...prev,...p]); }
    finally { setProcFiles(false); }
  },[]);

  const handleSubmit = useCallback(async()=>{
    if (!cc.trim()&&files.length===0){ setError("Enter a chief complaint or upload investigation files."); return; }
    const key=apiKey.trim();
    if (!key){ setError("Groq API key required — expand API Settings."); setShowApi(true); return; }
    setError(null); setResult(null); setLoading(true);
    try {
      localStorage.setItem("groq_api_key",key);
      setLoadStep(files.some(f=>f.type==="image")?"Analysing images with vision AI…":"Generating clinical analysis…");
      setResult(await runDiagnosis(key,age,sex,cc,dur,sev,sys,hist,files));
    } catch(e){ setError(e instanceof Error?e.message:"Unexpected error."); }
    finally{ setLoading(false); setLoadStep(""); }
  },[apiKey,age,sex,cc,dur,sev,sys,hist,files]);

  const pi = { age, sex, chiefComplaint:cc, duration:dur, severity:sev };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:STYLES}}/>
      <div className="dia-app" id="dia-root">
        <CursorGlow/>

        {/* background doodles */}
        <DoodleHeartbeat/>
        <DoodlePill style={{ top:160, right:80, animation:"dia-float 6s ease-in-out infinite" }}/>
        <DoodlePill style={{ top:320, left:30, animation:"dia-float2 7s ease-in-out 1s infinite", transform:"rotate(45deg)" }}/>
        <DoodleDNA style={{ top:200, right:20, animation:"dia-dna 8s linear infinite" }}/>
        <DoodleDNA style={{ top:400, left:5, animation:"dia-dna 10s linear 2s infinite", opacity:0.08 }}/>
        <DoodleCross style={{ top:130, left:60, animation:"dia-float 5s ease-in-out 0.5s infinite" }} color="#00E676"/>
        <DoodleCross style={{ top:500, right:50, animation:"dia-float2 8s ease-in-out 2s infinite" }} color="#FFD600"/>
        <DoodleCross style={{ top:700, left:100, animation:"dia-float 9s ease-in-out 1s infinite" }} color="#AA00FF"/>
        <DoodleAtom style={{ bottom:200, left:20, animation:"dia-float2 7s ease-in-out infinite" }}/>
        <DoodleStethoscope style={{ bottom:120, right:30, animation:"dia-float 8s ease-in-out 3s infinite" }}/>

        {/* header */}
        <header style={{ position:"relative", zIndex:10, padding:"0 16px" }}>
          <div style={{ maxWidth:960, margin:"0 auto", padding:"22px 0", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, border:"1px solid rgba(255,255,255,0.12)", boxShadow:"0 0 20px rgba(0,229,255,0.2)" }}>🩺</div>
            <div>
              <h1 style={{ margin:0, fontSize:28, fontWeight:800, letterSpacing:"-0.03em" }}>
                <span className="dia-rainbow-text">DiagnosisAI</span>
              </h1>
              <p style={{ margin:0, fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)" }}>Clinical Decision Support</p>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <span style={{ padding:"4px 12px", borderRadius:999, border:"1px solid rgba(0,229,255,0.3)", fontSize:11, color:"#00E5FF", background:"rgba(0,229,255,0.08)", fontWeight:600 }}>⚡ AI-Powered</span>
              <span style={{ padding:"4px 12px", borderRadius:999, border:"1px solid rgba(170,0,255,0.3)", fontSize:11, color:"#AA00FF", background:"rgba(170,0,255,0.08)", fontWeight:600 }}>Groq × LLaMA</span>
            </div>
          </div>
          {/* rainbow divider */}
          <div style={{ height:2, background:"linear-gradient(90deg,#FF1744,#FF6D00,#FFD600,#00E676,#00E5FF,#2979FF,#AA00FF)", maxWidth:960, margin:"0 auto", borderRadius:1 }}/>
        </header>

        {/* hero strip */}
        <div style={{ position:"relative", zIndex:10, padding:"0 16px" }}>
          <div style={{ maxWidth:960, margin:"0 auto", padding:"14px 0" }}>
            <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.5 }}>
              Upload X-rays, lab reports, or prescriptions — enter symptoms — get a structured AI clinical report with PDF download.
              <span style={{ marginLeft:8, color:"rgba(255,255,255,0.3)", fontSize:11 }}>For educational &amp; decision-support use only.</span>
            </p>
          </div>
        </div>

        {/* main grid */}
        <main style={{ position:"relative", zIndex:10, maxWidth:960, margin:"0 auto", padding:"24px 16px 64px" }}>
          <div style={{ display:"grid", gap:24, gridTemplateColumns:"minmax(0,1fr) 420px" }}>

            {/* ── left: input form ── */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Patient */}
              <div className="dia-card glow-cyan" style={{ padding:"20px" }}>
                <p className="dia-section-title">👤 Patient Details</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div><label className="dia-label">Age</label><input className="dia-input" type="number" min={0} max={120} placeholder="e.g. 45" value={age} onChange={e=>setAge(e.target.value)}/></div>
                  <div><label className="dia-label">Sex</label>
                    <select className="dia-input" value={sex} onChange={e=>setSex(e.target.value)}>
                      <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload */}
              <div className="dia-card glow-rainbow" style={{ padding:"20px" }}>
                <p className="dia-section-title">
                  📎 Upload Investigations &amp; Prescriptions
                  <span style={{ marginLeft:8, padding:"2px 8px", borderRadius:999, background:"rgba(0,229,255,0.15)", color:"#00E5FF", fontSize:"9px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>SOS</span>
                </p>
                {procFiles
                  ? <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center", padding:"20px 0", color:"rgba(255,255,255,0.5)", fontSize:13 }}><div className="dia-spinner" style={{ width:24, height:24, margin:0 }}/>Processing files…</div>
                  : <FileUploadZone files={files} onAdd={handleAddFiles} onRemove={id=>setFiles(p=>p.filter(f=>f.id!==id))}/>
                }
              </div>

              {/* Chief complaint */}
              <div className="dia-card glow-green" style={{ padding:"20px" }}>
                <p className="dia-section-title">🗣 Chief Complaint</p>
                <textarea className="dia-input" rows={4}
                  placeholder="Onset, character, radiation, aggravating/relieving factors, associated symptoms…"
                  value={cc} onChange={e=>setCc(e.target.value)} style={{ minHeight:100 }}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:14 }}>
                  <div><label className="dia-label">Duration</label>
                    <select className="dia-input" value={dur} onChange={e=>setDur(e.target.value)}>
                      {DURATIONS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div><label className="dia-label">Severity</label>
                    <select className="dia-input" value={sev} onChange={e=>setSev(e.target.value)}>
                      {SEVERITIES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Systems */}
              <div className="dia-card glow-violet" style={{ padding:"20px" }}>
                <p className="dia-section-title">🫀 Body Systems Involved</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {BODY_SYSTEMS.map(s=>(
                    <button key={s} className={`dia-chip${sys.includes(s)?" active":""}`} onClick={()=>toggleSys(s)}>{s}</button>
                  ))}
                </div>
                {sys.length>0&&<p style={{ margin:"10px 0 0",fontSize:11,color:"rgba(255,255,255,0.35)" }}>{sys.length} system{sys.length>1?"s":""} selected</p>}
              </div>

              {/* History */}
              <div className="dia-card glow-orange" style={{ padding:"20px" }}>
                <p className="dia-section-title">📝 History &amp; Notes</p>
                <textarea className="dia-input" rows={3}
                  placeholder="PMH, medications, allergies, family history, social history, travel…"
                  value={hist} onChange={e=>setHist(e.target.value)} style={{ minHeight:80 }}/>
              </div>

              {/* API Settings */}
              <div className="dia-card glow-blue" style={{ padding:0 }}>
                <button className="dia-api-toggle" onClick={()=>setShowApi(!showApi)}>
                  <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                    🔑 API Settings
                    {apiKey&&<span style={{ padding:"2px 8px", borderRadius:999, background:"rgba(0,230,118,0.15)", color:"#00E676", fontSize:"10px", fontWeight:700 }}>✓ Key saved</span>}
                  </span>
                  <span style={{ fontSize:16 }}>{showApi?"▲":"▼"}</span>
                </button>
                {showApi&&(
                  <div style={{ padding:"0 20px 20px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                    <label className="dia-label" style={{ marginTop:14 }}>Groq API Key</label>
                    <input className="dia-input" type="password" placeholder="gsk_…"
                      value={apiKey} onChange={e=>setApiKey(e.target.value)} style={{ fontFamily:"monospace" }}/>
                    <p style={{ margin:"8px 0 0", fontSize:11, color:"rgba(255,255,255,0.3)" }}>
                      Free key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color:"#00E5FF" }}>console.groq.com</a> · Stored in browser only
                    </p>
                  </div>
                )}
              </div>

              {/* Error */}
              {error&&(
                <div className="dia-error">
                  <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:"flex", gap:12 }}>
                <button className="dia-btn-rainbow" onClick={handleSubmit} disabled={loading||procFiles}>
                  {loading ? <><div className="dia-spinner" style={{ width:20, height:20, margin:0 }}/>{loadStep||"Analysing…"}</> : <>🧠 Generate AI Report</>}
                </button>
                {(result||error)&&<button className="dia-btn-secondary" onClick={()=>{setResult(null);setError(null);}}>✕ Clear</button>}
              </div>
            </div>

            {/* ── right: results ── */}
            <div>
              {!result&&!loading&&(
                <div className="dia-empty">
                  <div style={{ fontSize:60, marginBottom:16, filter:"drop-shadow(0 0 20px rgba(170,0,255,0.5))" }}>🩺</div>
                  <p style={{ margin:"0 0 6px", fontWeight:700, fontSize:15, color:"rgba(255,255,255,0.7)" }}>Your AI clinical report appears here</p>
                  <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.3)" }}>Upload investigations or describe symptoms, then click Generate.</p>
                </div>
              )}
              {loading&&(
                <div className="dia-loading">
                  <div className="dia-spinner"/>
                  <p style={{ margin:"0 0 4px", fontWeight:600, fontSize:14, color:"rgba(255,255,255,0.8)" }}>{loadStep||"Processing…"}</p>
                  <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.35)" }}>LLaMA 3.3 70B + LLaMA 4 Vision · Groq</p>
                </div>
              )}
              {result&&!loading&&<ResultsPanel result={result} pi={pi} files={files}/>}
            </div>
          </div>
        </main>

        {/* footer */}
        <footer style={{ position:"relative", zIndex:10, borderTop:"1px solid rgba(255,255,255,0.06)", padding:"20px 16px", textAlign:"center" }}>
          <div style={{ height:2, background:"linear-gradient(90deg,#FF1744,#FF6D00,#FFD600,#00E676,#00E5FF,#2979FF,#AA00FF)", maxWidth:960, margin:"0 auto 16px", borderRadius:1 }}/>
          <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.25)" }}>
            <strong style={{ color:"rgba(255,255,255,0.5)" }}>DiagnosisAI</strong> — clinical decision support &amp; medical education only · not a substitute for clinical judgment<br/>
            Groq × LLaMA 3.3 · LLaMA 4 Vision · Built by <span style={{ color:"#00E5FF" }}>Satya Sundar Thakur</span>
          </p>
        </footer>
      </div>
    </>
  );
}
