import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope,
  Brain,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ClipboardList,
  ShieldAlert,
  Activity,
  Key,
  Upload,
  FileText,
  ImageIcon,
  X,
  Download,
  FileSearch,
  Paperclip,
} from "lucide-react";

export const Route = createFileRoute("/")(
  { component: DiagnosisAI }
);

// ─── constants ───────────────────────────────────────────────────────────────

const BODY_SYSTEMS = [
  "Cardiovascular","Respiratory","Gastrointestinal","Neurological",
  "Musculoskeletal","Genitourinary","Endocrine","Dermatological",
  "Haematological","Ophthalmological","ENT","Psychiatric",
  "Immunological","Hepatobiliary",
];

const DURATIONS = [
  { value: "hours",   label: "Hours (< 24 h)" },
  { value: "days",    label: "Days (1–7 days)" },
  { value: "weeks",   label: "Weeks (1–4 weeks)" },
  { value: "months",  label: "Months (1–6 months)" },
  { value: "chronic", label: "Chronic (> 6 months)" },
];

const SEVERITIES = [
  { value: "mild",     label: "Mild – tolerable, daily life unaffected" },
  { value: "moderate", label: "Moderate – noticeable, some limitation" },
  { value: "severe",   label: "Severe – significant limitation" },
  { value: "critical", label: "Critical – emergency presentation" },
];

const ACCEPTED_TYPES = ["image/jpeg","image/png","image/webp","application/pdf","text/plain"];

// ─── types ───────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  type: "image" | "pdf" | "text";
  size: string;
  base64?: string;
  extractedText?: string;
  preview?: string;
}

interface Differential {
  rank: number;
  diagnosis: string;
  likelihood: "High" | "Moderate" | "Low";
  reasoning: string;
}

interface DiagnosisResult {
  summary: string;
  differentials: Differential[];
  investigationFindings: string[];
  redFlags: string[];
  recommendedWorkup: string[];
  managementPlan: string[];
  clinicalPearl: string;
  disclaimer: string;
}

// ─── file helpers ─────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(f: File): "image" | "pdf" | "text" {
  if (f.type.startsWith("image/")) return "image";
  if (f.type === "application/pdf") return "pdf";
  return "text";
}

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      res(result.split(",")[1]);
    };
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

async function toDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

async function extractPDFText(file: File): Promise<string> {
  // Basic client-side text extraction from PDF binary
  const buf = await file.arrayBuffer();
  const raw = new TextDecoder("latin1").decode(new Uint8Array(buf));
  // Extract strings inside parentheses (PDF text operators)
  const chunks: string[] = [];
  const re = /\(([^)\\]{3,})\)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const s = m[1].replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
    if (s.length > 2 && /[a-zA-Z0-9]/.test(s)) chunks.push(s);
  }
  const result = chunks.join(" ").replace(/\s{2,}/g, " ").trim();
  return result.length > 100 ? result.slice(0, 8000) : `[PDF file: ${file.name} — text extraction limited; AI will interpret from filename and context]`;
}

async function readTextFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).slice(0, 8000));
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsText(file);
  });
}

async function processFile(file: File): Promise<UploadedFile> {
  const kind = fileKind(file);
  const uf: UploadedFile = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    name: file.name,
    type: kind,
    size: fmtSize(file.size),
  };
  if (kind === "image") {
    const dataUrl = await toDataURL(file);
    uf.base64 = await toBase64(file);
    uf.preview = dataUrl;
  } else if (kind === "pdf") {
    uf.extractedText = await extractPDFText(file);
  } else {
    uf.extractedText = await readTextFile(file);
  }
  return uf;
}

// ─── AI helpers ──────────────────────────────────────────────────────────────

function buildPrompt(
  age: string, sex: string, chiefComplaint: string,
  duration: string, severity: string, systems: string[],
  history: string, uploadedFiles: UploadedFile[]
): string {
  const fileContext = uploadedFiles.length
    ? uploadedFiles.map(f => {
        if (f.type === "image") return `[IMAGE FILE]: ${f.name} — visual analysis requested`;
        return `[DOCUMENT: ${f.name}]\n${f.extractedText ?? "No text extracted"}`;
      }).join("\n\n---\n\n")
    : null;

  return `You are a senior clinician and consultant providing a structured clinical analysis and differential diagnosis for an AI decision-support platform. Analyze ALL provided information including any uploaded investigation reports, prescriptions, and documents.

PATIENT DETAILS:
- Age: ${age || "Not specified"}
- Sex: ${sex || "Not specified"}
- Chief complaint: ${chiefComplaint || "Not provided"}
- Duration: ${duration || "Not specified"}
- Severity: ${severity || "Not specified"}
- Body systems involved: ${systems.length ? systems.join(", ") : "Not specified"}
- Relevant history / notes: ${history || "None"}
${fileContext ? `\nUPLOADED INVESTIGATIONS & DOCUMENTS:\n${fileContext}` : ""}

Respond ONLY with valid JSON (no markdown fences, no extra keys) matching this schema exactly:
{
  "summary": "2-3 sentence clinical summary integrating all provided information including any investigation findings",
  "differentials": [
    { "rank": 1, "diagnosis": "string", "likelihood": "High", "reasoning": "2-3 sentences citing relevant clinical features and investigations" }
  ],
  "investigationFindings": ["Key abnormal or notable finding from uploaded reports (empty array if no uploads)"],
  "redFlags": ["string — features suggesting serious/life-threatening conditions"],
  "recommendedWorkup": ["string — specific investigations to order next"],
  "managementPlan": ["string — immediate management steps"],
  "clinicalPearl": "One memorable teaching point relevant to this case",
  "disclaimer": "One-line medical-legal disclaimer"
}

Return 4-6 differentials. investigationFindings should highlight key abnormalities from uploaded documents. managementPlan should have 3-5 actionable steps.`;
}

async function callGroqText(apiKey: string, prompt: string): Promise<DiagnosisResult> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Groq error ${res.status}`);
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content ?? "";
  return JSON.parse(text.replace(/```json|```/g, "").trim()) as DiagnosisResult;
}

async function callGroqVision(apiKey: string, prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: "text", text: `You are a clinical radiologist and pathologist. Analyze this medical image/report and extract all clinically relevant findings. List: 1) What type of investigation this appears to be, 2) Key findings (normal and abnormal), 3) Significant abnormalities if any, 4) Clinical interpretation. Be specific and use medical terminology. Limit to 300 words.` },
        ],
      }],
      temperature: 0.2,
      max_tokens: 600,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Vision API error ${res.status}`);
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "";
}

async function runDiagnosis(
  apiKey: string, age: string, sex: string, chiefComplaint: string,
  duration: string, severity: string, systems: string[],
  history: string, uploadedFiles: UploadedFile[]
): Promise<DiagnosisResult> {
  // Step 1: For image files, run vision analysis first and attach findings as text
  const enrichedFiles: UploadedFile[] = [];
  for (const f of uploadedFiles) {
    if (f.type === "image" && f.base64) {
      try {
        const visionText = await callGroqVision(apiKey, "", f.base64, f.file.type);
        enrichedFiles.push({ ...f, extractedText: visionText });
      } catch {
        enrichedFiles.push({ ...f, extractedText: `[Image: ${f.name} — vision analysis unavailable]` });
      }
    } else {
      enrichedFiles.push(f);
    }
  }
  // Step 2: Full clinical analysis
  const prompt = buildPrompt(age, sex, chiefComplaint, duration, severity, systems, history, enrichedFiles);
  return callGroqText(apiKey, prompt);
}

// ─── PDF Report Generator ─────────────────────────────────────────────────────

function generateAndDownloadPDF(
  result: DiagnosisResult,
  patientInfo: { age: string; sex: string; chiefComplaint: string; duration: string; severity: string },
  uploadedFiles: UploadedFile[]
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const diffRows = result.differentials.map(d => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">${d.rank}. ${d.diagnosis}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
        <span style="padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${
          d.likelihood === "High" ? "#fee2e2" : d.likelihood === "Moderate" ? "#fef3c7" : "#dbeafe"
        };color:${
          d.likelihood === "High" ? "#991b1b" : d.likelihood === "Moderate" ? "#92400e" : "#1e40af"
        };">${d.likelihood}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">${d.reasoning}</td>
    </tr>`).join("");

  const listItems = (arr: string[], color = "#0F4C81") => arr.map(item =>
    `<li style="margin:4px 0;color:#334155;font-size:13px;"><span style="color:${color};margin-right:6px;">•</span>${item}</li>`
  ).join("");

  const filesSection = uploadedFiles.length ? `
    <div style="margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
      <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Uploaded Documents</h3>
      ${uploadedFiles.map(f => `<div style="font-size:13px;color:#475569;margin:4px 0;">📎 ${f.name} (${f.size})</div>`).join("")}
    </div>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DiagnosisAI Report — ${dateStr}</title>
<style>
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page { margin: 18mm 15mm; }
  }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; background: #fff; }
  .header { background: linear-gradient(135deg, #0F4C81 0%, #0a3460 100%); color: white; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
  .header h1 span { color: #00D4BE; }
  .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.8; letter-spacing: 0.1em; text-transform: uppercase; }
  .meta-bar { background: #00A896; padding: 10px 32px; display: flex; justify-content: space-between; align-items: center; }
  .meta-bar span { color: white; font-size: 12px; font-weight: 500; }
  .body { padding: 28px 32px; }
  .patient-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 24px; }
  .patient-cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .patient-cell label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 3px; }
  .patient-cell span { font-size: 14px; font-weight: 600; color: #1e293b; }
  .complaint-box { background: #eff6ff; border-left: 4px solid #0F4C81; border-radius: 6px; padding: 14px 16px; margin-bottom: 24px; }
  .complaint-box label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #3b82f6; letter-spacing: 0.08em; }
  .complaint-box p { margin: 6px 0 0; font-size: 14px; color: #1e293b; font-weight: 500; }
  .summary-box { background: #f0fdf4; border-left: 4px solid #00A896; border-radius: 6px; padding: 14px 16px; margin-bottom: 24px; }
  .summary-box label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #059669; letter-spacing: 0.08em; }
  .summary-box p { margin: 6px 0 0; font-size: 13px; color: #166534; line-height: 1.6; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0 0 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .section { margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
  .red-flags { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .red-flags .section-title { color: #dc2626; border-bottom-color: #fecaca; }
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 11px; color: #94a3b8; line-height: 1.6; }
  .pearl { background: #eff6ff; border-left: 4px solid #0F4C81; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; }
  .pearl label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0F4C81; letter-spacing: 0.08em; }
  .pearl p { margin: 4px 0 0; font-size: 13px; color: #1e40af; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #0F4C81; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(15,76,129,0.4); }
</style>
</head>
<body>
<button class="no-print print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
<div class="header">
  <h1>Diagnosis<span>AI</span></h1>
  <p>Clinical Decision Support Report</p>
</div>
<div class="meta-bar">
  <span>📅 Generated: ${dateStr} at ${timeStr}</span>
  <span>⚕️ AI-Assisted Clinical Analysis · For Educational & Decision Support Use Only</span>
</div>
<div class="body">

  <div class="patient-grid">
    <div class="patient-cell"><label>Age</label><span>${patientInfo.age || "—"}</span></div>
    <div class="patient-cell"><label>Sex</label><span>${patientInfo.sex ? patientInfo.sex.charAt(0).toUpperCase() + patientInfo.sex.slice(1) : "—"}</span></div>
    <div class="patient-cell"><label>Duration</label><span>${patientInfo.duration || "—"}</span></div>
    <div class="patient-cell" style="grid-column:span 3"><label>Severity</label><span>${patientInfo.severity || "—"}</span></div>
  </div>

  <div class="complaint-box">
    <label>Chief Complaint</label>
    <p>${patientInfo.chiefComplaint}</p>
  </div>

  ${filesSection}

  <div class="summary-box">
    <label>Clinical Summary</label>
    <p>${result.summary}</p>
  </div>

  ${result.investigationFindings?.length ? `
  <div class="section">
    <h3 class="section-title">📋 Investigation Findings</h3>
    <ul style="margin:0;padding-left:0;list-style:none;">${listItems(result.investigationFindings, "#00A896")}</ul>
  </div>` : ""}

  <div class="section">
    <h3 class="section-title">🧠 Differential Diagnosis</h3>
    <table>
      <thead><tr><th>Diagnosis</th><th style="text-align:center;width:100px;">Likelihood</th><th>Clinical Reasoning</th></tr></thead>
      <tbody>${diffRows}</tbody>
    </table>
  </div>

  ${result.redFlags?.length ? `
  <div class="red-flags">
    <h3 class="section-title">⚠️ Red Flags — Urgent Evaluation Required</h3>
    <ul style="margin:0;padding-left:0;list-style:none;">${listItems(result.redFlags, "#dc2626")}</ul>
  </div>` : ""}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    <div class="section" style="margin:0">
      <h3 class="section-title">🔬 Recommended Workup</h3>
      <ul style="margin:0;padding-left:0;list-style:none;">${listItems(result.recommendedWorkup ?? [], "#0F4C81")}</ul>
    </div>
    <div class="section" style="margin:0">
      <h3 class="section-title">💊 Management Plan</h3>
      <ul style="margin:0;padding-left:0;list-style:none;">${listItems(result.managementPlan ?? [], "#00A896")}</ul>
    </div>
  </div>

  ${result.clinicalPearl ? `
  <div class="pearl">
    <label>🩺 Clinical Pearl</label>
    <p>${result.clinicalPearl}</p>
  </div>` : ""}

</div>
<div class="footer">
  <strong>⚠️ DISCLAIMER:</strong> ${result.disclaimer || "This report is generated by an AI system for educational and clinical decision-support purposes only. It does not constitute a medical diagnosis, replace clinical examination, or supersede the judgment of a qualified clinician. Always correlate with the full clinical picture. DiagnosisAI — Powered by Groq × LLaMA 3.3 · Developed by Satya Sundar Thakur"}
</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function LikelihoodBadge({ level }: { level: "High" | "Moderate" | "Low" }) {
  const s: Record<string, string> = {
    High: "bg-red-100 text-red-800 border-red-300",
    Moderate: "bg-amber-100 text-amber-800 border-amber-300",
    Low: "bg-sky-100 text-sky-800 border-sky-300",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s[level]}`}>{level}</span>;
}

function FileUploadZone({
  files, onAdd, onRemove,
}: {
  files: UploadedFile[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    const items = Array.from(e.dataTransfer.files).filter(f => ACCEPTED_TYPES.includes(f.type));
    if (items.length) onAdd(items);
  }, [onAdd]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const items = Array.from(e.target.files ?? []);
    if (items.length) onAdd(items);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all ${
          dragging ? "border-[#0F4C81] bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-[#0F4C81] hover:bg-blue-50"
        }`}
      >
        <Upload className="mx-auto mb-2 h-7 w-7 text-slate-400" />
        <p className="text-sm font-medium text-slate-600">
          Drag & drop files here, or <span className="text-[#0F4C81] underline">browse</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Images (JPG, PNG, WEBP) · PDF reports · Text files — max 10 MB each
        </p>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_TYPES.join(",")}
          className="hidden" onChange={handleChange} />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              {f.type === "image" && f.preview
                ? <img src={f.preview} alt={f.name} className="h-10 w-10 rounded object-cover border border-slate-200 flex-shrink-0" />
                : <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${f.type === "pdf" ? "bg-red-50" : "bg-slate-100"}`}>
                    {f.type === "pdf" ? <FileText className="h-5 w-5 text-red-500" /> : <FileText className="h-5 w-5 text-slate-500" />}
                  </div>
              }
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{f.name}</p>
                <p className="text-xs text-slate-400">
                  {f.type === "image" ? "Image" : f.type === "pdf" ? "PDF Document" : "Text File"} · {f.size}
                </p>
              </div>
              <button onClick={() => onRemove(f.id)} className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsPanel({
  result, patientInfo, uploadedFiles,
}: {
  result: DiagnosisResult;
  patientInfo: { age: string; sex: string; chiefComplaint: string; duration: string; severity: string };
  uploadedFiles: UploadedFile[];
}) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Download button */}
      <Button
        onClick={() => generateAndDownloadPDF(result, patientInfo, uploadedFiles)}
        className="w-full gap-2 font-semibold"
        style={{ background: "linear-gradient(90deg, #0F4C81 0%, #00A896 100%)" }}
      >
        <Download className="h-4 w-4" />
        Download PDF Report
      </Button>

      {/* Summary */}
      <Card className="border-l-4 border-l-[#00A896] border-0 bg-emerald-50 shadow-sm">
        <CardContent className="pt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#00A896]">Clinical Summary</p>
          <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Investigation findings */}
      {result.investigationFindings?.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#00A896]">
              <FileSearch className="h-4 w-4" />Investigation Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.investigationFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <Paperclip className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#00A896]" />{f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Differentials */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#0F4C81]">
            <Brain className="h-4 w-4" />Differential Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.differentials.map(d => (
            <div key={d.rank} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#0F4C81] text-[10px] font-bold text-white">{d.rank}</span>
                  <span className="font-semibold text-slate-800 text-sm">{d.diagnosis}</span>
                </div>
                <LikelihoodBadge level={d.likelihood} />
              </div>
              <p className="mt-2 pl-7 text-xs text-slate-600 leading-relaxed">{d.reasoning}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Red Flags */}
      {result.redFlags?.length > 0 && (
        <Card className="border-red-200 bg-red-50 shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.redFlags.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />{f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Workup + Management */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#0F4C81]">
              <ClipboardList className="h-4 w-4" />Recommended Workup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {(result.recommendedWorkup ?? []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#0F4C81]" />{item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#00A896]">
              <Activity className="h-4 w-4" />Management Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {(result.managementPlan ?? []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#00A896]" />{item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Pearl */}
      {result.clinicalPearl && (
        <Card className="border-l-4 border-l-[#0F4C81] border-0 bg-blue-50 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0F4C81]">Clinical Pearl</p>
            <p className="mt-1 text-sm text-slate-700">{result.clinicalPearl}</p>
          </CardContent>
        </Card>
      )}

      <p className="rounded-lg bg-slate-100 px-4 py-3 text-[10px] text-slate-500 leading-relaxed">
        ⚠️ {result.disclaimer || "For educational and decision-support purposes only. Does not replace clinical judgment or examination."}
      </p>
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

function DiagnosisAI() {
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [history, setHistory] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [apiKey, setApiKey] = useState(
    () => typeof window !== "undefined" ? localStorage.getItem("groq_api_key") ?? "" : ""
  );
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSystem = useCallback((s: string) => {
    setSelectedSystems(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }, []);

  const handleAddFiles = useCallback(async (files: File[]) => {
    setProcessingFiles(true);
    try {
      const processed = await Promise.all(files.map(processFile));
      setUploadedFiles(p => [...p, ...processed]);
    } finally {
      setProcessingFiles(false);
    }
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setUploadedFiles(p => p.filter(f => f.id !== id));
  }, []);

  const patientInfo = { age, sex, chiefComplaint, duration, severity };

  const handleSubmit = useCallback(async () => {
    if (!chiefComplaint.trim() && uploadedFiles.length === 0) {
      setError("Please enter a chief complaint or upload investigation files.");
      return;
    }
    const key = apiKey.trim();
    if (!key) {
      setError("A Groq API key is required. Expand API Settings below.");
      setShowApiSettings(true); return;
    }
    setError(null); setResult(null); setIsLoading(true);
    try {
      localStorage.setItem("groq_api_key", key);
      const hasImages = uploadedFiles.some(f => f.type === "image");
      if (hasImages) setLoadingStep("Analysing images with vision AI…");
      else setLoadingStep("Generating clinical analysis…");
      const res = await runDiagnosis(key, age, sex, chiefComplaint, duration, severity, selectedSystems, history, uploadedFiles);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false); setLoadingStep("");
    }
  }, [apiKey, age, sex, chiefComplaint, duration, severity, selectedSystems, history, uploadedFiles]);

  const handleReset = () => {
    setAge(""); setSex(""); setChiefComplaint(""); setDuration(""); setSeverity("");
    setSelectedSystems([]); setHistory(""); setUploadedFiles([]);
    setResult(null); setError(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F4F8" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #0F4C81 0%, #0a3460 100%)" }}>
        <div className="mx-auto max-w-5xl px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Diagnosis<span style={{ color: "#00D4BE" }}>AI</span>
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-widest text-blue-200">
                Clinical Decision Support
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant="outline" className="border-white/30 bg-white/10 text-[11px] text-white">
                <Activity className="mr-1 h-3 w-3" />AI-Powered
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Hero strip */}
      <div className="border-b" style={{ background: "linear-gradient(90deg, #00A896 0%, #00C4B4 100%)" }}>
        <div className="mx-auto max-w-5xl px-4 py-3">
          <p className="text-sm font-medium text-white">
            Enter symptoms, upload investigation reports or prescriptions — AI analyses all inputs and generates a structured clinical report.
            <span className="ml-2 opacity-75 text-xs">For educational &amp; decision-support use only.</span>
          </p>
        </div>
      </div>

      {/* Body */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* Left: form */}
          <div className="space-y-5">
            {/* Patient demographics */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Age</Label>
                  <Input type="number" min={0} max={120} placeholder="e.g. 45" value={age} onChange={e => setAge(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Sex</Label>
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Upload zone */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Upload Investigations &amp; Prescriptions
                  <Badge className="ml-1 bg-[#00A896]/15 text-[#00A896] text-[10px]">SOS</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {processingFiles
                  ? <div className="flex items-center gap-2 py-4 justify-center text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />Processing files…
                    </div>
                  : <FileUploadZone files={uploadedFiles} onAdd={handleAddFiles} onRemove={handleRemoveFile} />
                }
              </CardContent>
            </Card>

            {/* Chief complaint */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chief Complaint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe symptoms in detail — onset, character, radiation, aggravating/relieving factors, associated symptoms…"
                  className="min-h-[110px] resize-none text-sm"
                  value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Severity</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Body systems */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Body Systems Involved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {BODY_SYSTEMS.map(s => {
                    const on = selectedSystems.includes(s);
                    return (
                      <button key={s} onClick={() => toggleSystem(s)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${on ? "border-[#0F4C81] bg-[#0F4C81] text-white shadow-sm" : "border-slate-300 bg-white text-slate-600 hover:border-[#0F4C81] hover:text-[#0F4C81]"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Relevant History &amp; Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Past medical history, medications, allergies, family history, social history, recent travel…"
                  className="min-h-[80px] resize-none text-sm"
                  value={history} onChange={e => setHistory(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* API Settings */}
            <Card className="border-0 shadow-md">
              <button onClick={() => setShowApiSettings(!showApiSettings)} className="flex w-full items-center justify-between px-6 py-4 text-left">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Key className="h-4 w-4 text-slate-400" />API Settings
                  {apiKey && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700"><CheckCircle2 className="h-3 w-3" />Key saved</span>}
                </span>
                {showApiSettings ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showApiSettings && (
                <CardContent className="pt-0 pb-5 space-y-3">
                  <Separator />
                  <div className="space-y-1.5 pt-3">
                    <Label className="text-xs font-medium text-slate-600">Groq API Key</Label>
                    <Input type="password" placeholder="gsk_…" value={apiKey}
                      onChange={e => setApiKey(e.target.value)} className="h-9 font-mono text-sm" />
                    <p className="text-[11px] text-slate-400">
                      Free keys at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-[#0F4C81] underline">console.groq.com</a>. Stored in browser only.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={isLoading || processingFiles}
                className="flex-1 h-11 text-sm font-semibold" style={{ backgroundColor: "#0F4C81" }}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{loadingStep || "Analysing…"}</> : <><Brain className="mr-2 h-4 w-4" />Generate AI Report</>}
              </Button>
              {(result || error) && (
                <Button variant="outline" onClick={handleReset} className="h-11 px-5 text-sm">Clear</Button>
              )}
            </div>
          </div>

          {/* Right: results */}
          <div>
            {!result && !isLoading && (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "#E8F0F9" }}>
                  <Stethoscope className="h-7 w-7" style={{ color: "#0F4C81" }} />
                </div>
                <p className="text-sm font-medium text-slate-500">Your AI clinical report will appear here.</p>
                <p className="mt-1 text-xs text-slate-400">Upload investigations or enter symptoms and click Generate.</p>
              </div>
            )}
            {isLoading && (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
                <Loader2 className="mb-4 h-8 w-8 animate-spin" style={{ color: "#0F4C81" }} />
                <p className="text-sm font-medium text-slate-600">{loadingStep || "Processing…"}</p>
                <p className="mt-1 text-xs text-slate-400">Powered by LLaMA 3.3 70B + LLaMA 4 Vision</p>
              </div>
            )}
            {result && !isLoading && (
              <ResultsPanel result={result} patientInfo={patientInfo} uploadedFiles={uploadedFiles} />
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 text-center">
          <p className="text-[11px] text-slate-400">
            <strong>DiagnosisAI</strong> — Clinical decision support &amp; medical education. Not a substitute for clinical judgment.
            Groq × LLaMA 3.3 · LLaMA 4 Vision · Built by Satya Sundar Thakur
          </p>
        </div>
      </footer>
    </div>
  );
}
