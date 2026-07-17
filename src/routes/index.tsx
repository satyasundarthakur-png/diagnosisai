import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
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
} from "lucide-react";

export const Route = createFileRoute("/")(
  {
    component: DiagnosisAI,
  }
);

// ─── constants ──────────────────────────────────────────────────────────────

const BODY_SYSTEMS = [
  "Cardiovascular",
  "Respiratory",
  "Gastrointestinal",
  "Neurological",
  "Musculoskeletal",
  "Genitourinary",
  "Endocrine",
  "Dermatological",
  "Haematological",
  "Ophthalmological",
  "ENT",
  "Psychiatric",
  "Immunological",
  "Hepatobiliary",
];

const DURATIONS = [
  { value: "hours", label: "Hours (< 24 h)" },
  { value: "days", label: "Days (1–7 days)" },
  { value: "weeks", label: "Weeks (1–4 weeks)" },
  { value: "months", label: "Months (1–6 months)" },
  { value: "chronic", label: "Chronic (> 6 months)" },
];

const SEVERITIES = [
  { value: "mild", label: "Mild – tolerable, daily life unaffected" },
  { value: "moderate", label: "Moderate – noticeable, some limitation" },
  { value: "severe", label: "Severe – significant limitation" },
  { value: "critical", label: "Critical – emergency presentation" },
];

// ─── types ───────────────────────────────────────────────────────────────────

interface DiagnosisResult {
  differentials: Array<{
    rank: number;
    diagnosis: string;
    likelihood: "High" | "Moderate" | "Low";
    reasoning: string;
  }>;
  redFlags: string[];
  recommendedWorkup: string[];
  clinicalPearl: string;
  disclaimer: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildPrompt(
  age: string,
  sex: string,
  chiefComplaint: string,
  duration: string,
  severity: string,
  systems: string[],
  history: string
): string {
  return `You are a senior clinician providing a structured differential diagnosis for an educational/decision-support tool.

PATIENT DETAILS:
- Age: ${age || "Not specified"}
- Sex: ${sex || "Not specified"}
- Chief complaint: ${chiefComplaint}
- Duration: ${duration || "Not specified"}
- Severity: ${severity || "Not specified"}
- Body systems involved: ${systems.length ? systems.join(", ") : "Not specified"}
- Relevant history / additional notes: ${history || "None"}

Respond ONLY with valid JSON matching this schema exactly (no markdown fences, no extra keys):
{
  "differentials": [
    {
      "rank": 1,
      "diagnosis": "string",
      "likelihood": "High" | "Moderate" | "Low",
      "reasoning": "string (2-3 sentences)"
    }
  ],
  "redFlags": ["string"],
  "recommendedWorkup": ["string"],
  "clinicalPearl": "string (1 memorable teaching point)",
  "disclaimer": "string (one line medical-legal disclaimer)"
}

Return 4-6 differentials ordered by likelihood. Red flags should warn about features suggesting serious/life-threatening diagnoses. Recommended workup should list 4-6 specific investigations.`;
}

async function callGroq(
  apiKey: string,
  prompt: string
): Promise<DiagnosisResult> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(
      err?.error?.message ?? `Groq API error ${res.status}`
    );
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = data.choices[0]?.message?.content ?? "";
  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as DiagnosisResult;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function LikelihoodBadge({
  level,
}: {
  level: "High" | "Moderate" | "Low";
}) {
  const styles: Record<string, string> = {
    High: "bg-red-100 text-red-800 border-red-300",
    Moderate: "bg-amber-100 text-amber-800 border-amber-300",
    Low: "bg-sky-100 text-sky-800 border-sky-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[level]}`}
    >
      {level}
    </span>
  );
}

function ResultsPanel({ result }: { result: DiagnosisResult }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Differentials */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0F4C81]">
            <Brain className="h-4 w-4" />
            Differential Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.differentials.map((d) => (
            <div
              key={d.rank}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0F4C81] text-[11px] font-bold text-white">
                    {d.rank}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {d.diagnosis}
                  </span>
                </div>
                <LikelihoodBadge level={d.likelihood} />
              </div>
              <p className="mt-2 pl-8 text-sm text-slate-600">{d.reasoning}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Red Flags */}
      {result.redFlags?.length > 0 && (
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Red Flags — Requires Urgent Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.redFlags.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommended Workup */}
      {result.recommendedWorkup?.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#00A896]">
              <ClipboardList className="h-4 w-4" />
              Recommended Workup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.recommendedWorkup.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#00A896]" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Clinical Pearl */}
      {result.clinicalPearl && (
        <Card className="border-l-4 border-l-[#0F4C81] border-0 bg-blue-50 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0F4C81]">
              Clinical Pearl
            </p>
            <p className="mt-1 text-sm text-slate-700">{result.clinicalPearl}</p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="rounded-lg bg-slate-100 px-4 py-3 text-[11px] text-slate-500 leading-relaxed">
        ⚠️{" "}
        {result.disclaimer ||
          "This output is for educational and clinical decision-support purposes only. It does not replace clinical judgment, physical examination, or investigations. Always correlate with the full clinical picture."}
      </p>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

function DiagnosisAI() {
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [history, setHistory] = useState("");
  const [apiKey, setApiKey] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem("groq_api_key") ?? "" : "")
  );
  const [showApiSettings, setShowApiSettings] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleSystem = useCallback((system: string) => {
    setSelectedSystems((prev) =>
      prev.includes(system) ? prev.filter((s) => s !== system) : [...prev, system]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!chiefComplaint.trim()) {
      setError("Please describe the chief complaint.");
      return;
    }
    const key = apiKey.trim();
    if (!key) {
      setError("A Groq API key is required. Expand API Settings below.");
      setShowApiSettings(true);
      return;
    }
    setError(null);
    setResult(null);
    setIsLoading(true);
    try {
      localStorage.setItem("groq_api_key", key);
      const prompt = buildPrompt(
        age, sex, chiefComplaint, duration, severity, selectedSystems, history
      );
      const res = await callGroq(key, prompt);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, age, sex, chiefComplaint, duration, severity, selectedSystems, history]);

  const handleReset = () => {
    setAge(""); setSex(""); setChiefComplaint(""); setDuration("");
    setSeverity(""); setSelectedSystems([]); setHistory("");
    setResult(null); setError(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F4F8" }}>
      {/* ── Header ── */}
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
              <Badge
                variant="outline"
                className="border-white/30 bg-white/10 text-[11px] text-white"
              >
                <Activity className="mr-1 h-3 w-3" />
                AI-Powered
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero strip ── */}
      <div
        className="border-b"
        style={{ background: "linear-gradient(90deg, #00A896 0%, #00C4B4 100%)" }}
      >
        <div className="mx-auto max-w-5xl px-4 py-3">
          <p className="text-sm font-medium text-white">
            Enter patient symptoms below to generate a structured differential diagnosis with clinical reasoning.
            <span className="ml-2 opacity-75 text-xs">For educational &amp; decision-support use only.</span>
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* ── Left: Input form ── */}
          <div className="space-y-6">
            {/* Patient demographics */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Age</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    placeholder="e.g. 45"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Sex</Label>
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Chief complaint */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Chief Complaint <span className="text-red-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe the main symptom(s) in detail — onset, character, radiation, aggravating/relieving factors, associated symptoms…"
                  className="min-h-[120px] resize-none text-sm"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Severity</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Body systems */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Body Systems Involved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {BODY_SYSTEMS.map((system) => {
                    const active = selectedSystems.includes(system);
                    return (
                      <button
                        key={system}
                        onClick={() => toggleSystem(system)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          active
                            ? "border-[#0F4C81] bg-[#0F4C81] text-white shadow-sm"
                            : "border-slate-300 bg-white text-slate-600 hover:border-[#0F4C81] hover:text-[#0F4C81]"
                        }`}
                      >
                        {system}
                      </button>
                    );
                  })}
                </div>
                {selectedSystems.length > 0 && (
                  <p className="mt-3 text-[11px] text-slate-400">
                    {selectedSystems.length} system{selectedSystems.length > 1 ? "s" : ""} selected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Additional history */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Relevant History & Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Past medical history, medications, allergies, family history, social history, recent travel, occupation…"
                  className="min-h-[90px] resize-none text-sm"
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* API Settings */}
            <Card className="border-0 shadow-md">
              <button
                onClick={() => setShowApiSettings(!showApiSettings)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Key className="h-4 w-4 text-slate-400" />
                  API Settings
                  {apiKey && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                      <CheckCircle2 className="h-3 w-3" /> Key saved
                    </span>
                  )}
                </span>
                {showApiSettings ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {showApiSettings && (
                <CardContent className="pt-0 pb-5 space-y-3">
                  <Separator />
                  <div className="space-y-1.5 pt-3">
                    <Label className="text-xs font-medium text-slate-600">
                      Groq API Key
                    </Label>
                    <Input
                      type="password"
                      placeholder="gsk_…"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-9 font-mono text-sm"
                    />
                    <p className="text-[11px] text-slate-400">
                      Free keys at{" "}
                      <a
                        href="https://console.groq.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0F4C81] underline underline-offset-2"
                      >
                        console.groq.com
                      </a>
                      . Stored locally in your browser only.
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
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 h-11 text-sm font-semibold"
                style={{ backgroundColor: "#0F4C81" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Diagnosis…
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate Differential Diagnosis
                  </>
                )}
              </Button>
              {(result || error) && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="h-11 px-5 text-sm"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* ── Right: Results ── */}
          <div>
            {!result && !isLoading && (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#E8F0F9" }}
                >
                  <Stethoscope className="h-7 w-7" style={{ color: "#0F4C81" }} />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Your AI-generated differential diagnosis will appear here.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Fill in the symptom details on the left and click Generate.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
                <Loader2
                  className="mb-4 h-8 w-8 animate-spin"
                  style={{ color: "#0F4C81" }}
                />
                <p className="text-sm font-medium text-slate-600">
                  Analysing clinical data…
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Generating differential diagnosis with Llama 3.3 70B
                </p>
              </div>
            )}

            {result && !isLoading && <ResultsPanel result={result} />}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 text-center">
          <p className="text-[11px] text-slate-400">
            <strong>DiagnosisAI</strong> — for clinical decision support and medical education only.
            Not a substitute for professional clinical judgment.
            Powered by Groq × LLaMA 3.3 · Built by Satya Sundar Thakur
          </p>
        </div>
      </footer>
    </div>
  );
}
