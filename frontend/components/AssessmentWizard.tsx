"use client";

import { useEffect, useRef, useState } from "react";
import {
  AssessmentInput,
  AssessmentResult,
  DATA_TYPE_LABELS,
  DataType,
  EMPTY_INPUT,
  PURPOSE_LABELS,
  Purpose,
  YesNo,
  requestAssessment,
  validateDescription,
  validateQuestions,
} from "@/lib/assessment";

const STEPS = ["Describe", "Answer questions", "Assessment", "Recommendations"] as const;
const STORAGE_KEY = "governance-assessment-draft-v1";

function Choice({ selected, children, onClick }: { selected: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="choice" aria-pressed={selected} onClick={onClick}>
      <span aria-hidden="true" className="choice-mark">{selected ? "✓" : ""}</span>
      {children}
    </button>
  );
}

function BinaryQuestion({ legend, value, onChange, detail }: {
  legend: string;
  value: YesNo | "";
  onChange: (value: YesNo) => void;
  detail?: string;
}) {
  return (
    <fieldset className="question-block">
      <legend>{legend}</legend>
      {detail && <p>{detail}</p>}
      <div className="binary-row">
        <Choice selected={value === "yes"} onClick={() => onChange("yes")}>Yes</Choice>
        <Choice selected={value === "no"} onClick={() => onChange("no")}>No</Choice>
      </div>
    </fieldset>
  );
}

export function AssessmentWizard() {
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [input, setInput] = useState<AssessmentInput>(EMPTY_INPUT);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mainHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    let restored: AssessmentInput;
    try { restored = { ...EMPTY_INPUT, ...JSON.parse(saved) as AssessmentInput }; } catch { return; }
    const restoreDraft = window.setTimeout(() => setInput(restored), 0);
    return () => window.clearTimeout(restoreDraft);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  useEffect(() => {
    if (step > 0) mainHeading.current?.focus();
  }, [step]);

  const update = <K extends keyof AssessmentInput>(key: K, value: AssessmentInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    if (result) {
      setResult(null);
      setMaxReached((current) => Math.min(current, 1));
    }
    setError(null);
  };

  const moveTo = (nextStep: number) => {
    if (nextStep === 1) {
      const message = validateDescription(input.description);
      if (message) { setError(message); return; }
    }
    setError(null);
    setStep(nextStep);
    setMaxReached((current) => Math.max(current, nextStep));
  };

  const assess = async () => {
    const message = validateQuestions(input);
    if (message) { setError(message); return; }
    setLoading(true);
    setError(null);
    const response = await requestAssessment(input);
    setResult(response);
    setLoading(false);
    moveTo(2);
  };

  const reset = () => {
    setInput(EMPTY_INPUT);
    setResult(null);
    setStep(0);
    setMaxReached(0);
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const download = () => {
    if (!result) return;
    const report = [
      "DATA GOVERNANCE READINESS ASSESSMENT",
      `Assessed: ${new Date(result.assessedAt).toLocaleString()}`,
      "",
      "USE CASE",
      input.description,
      "",
      `RISK: ${result.level} — ${result.score}/100`,
      result.guidance,
      "",
      "SCORING FACTORS",
      ...result.factors.map((item) => `- ${item.label}: +${item.points}`),
      "",
      "RECOMMENDED CONTROLS",
      ...result.recommendations.map((item) => `- ${item}`),
      "",
      "KARLSGATE CAPABILITIES",
      ...result.capabilities.map((item) => `- ${item}`),
      ...(result.limitations.length ? ["", "LIMITATIONS", ...result.limitations.map((item) => `- ${item}`)] : []),
      "",
      "Decision support only. Specialist legal, privacy, and security review may still be required.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "data-governance-assessment.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main>
      <header className="masthead">
        <a className="brand" href="#top" aria-label="Karlsgate home">KARLSGATE</a>
        <span className="edition">READINESS / 01</span>
      </header>

      <div className="shell" id="top">
        <aside className="orientation" aria-label="Assessment progress">
          <p className="eyebrow">Data Governance Readiness Analyzer</p>
          <h1>Know the risk<br />before data moves.</h1>
          <p className="intro">Describe the initiative in ordinary language. We’ll surface governance concerns and the controls needed to proceed.</p>
          <ol className="step-list">
            {STEPS.map((label, index) => (
              <li key={label} className={index === step ? "current" : index < step ? "complete" : ""}>
                <button
                  type="button"
                  onClick={() => index <= maxReached && moveTo(index)}
                  disabled={index > maxReached}
                  aria-current={index === step ? "step" : undefined}
                >
                  <span>0{index + 1}</span>{label}
                </button>
              </li>
            ))}
          </ol>
          <div className="progress-copy">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="progress-track" aria-hidden="true"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        </aside>

        <section className="workspace" aria-live="polite">
          {step === 0 && (
            <div className="step-panel">
              <p className="section-number">01 / DESCRIBE</p>
              <h2 ref={mainHeading} tabIndex={-1}>What are you proposing?</h2>
              <p className="lede">Include what data is involved, who needs it, and the outcome you want.</p>
              <label className="text-field" htmlFor="description">
                <span>Use-case description <b>Required</b></span>
                <textarea
                  id="description"
                  value={input.description}
                  onChange={(event) => update("description", event.target.value)}
                  maxLength={1000}
                  aria-describedby="description-help description-error"
                  aria-invalid={Boolean(error)}
                  placeholder="For example: We want to compare our customer database with a partner’s records to understand which customers we share."
                />
              </label>
              <div className="field-meta" id="description-help"><span>A clear sentence or two is enough.</span><span>{input.description.length} / 1,000</span></div>
              {error && <p className="error" id="description-error" role="alert">{error}</p>}
              <div className="actions end"><button className="primary" type="button" onClick={() => moveTo(1)}>Continue <span>→</span></button></div>
            </div>
          )}

          {step === 1 && (
            <div className="step-panel">
              <p className="section-number">02 / ANSWER QUESTIONS</p>
              <h2 ref={mainHeading} tabIndex={-1}>How will the data be handled?</h2>
              <p className="lede">Answer based on the planned operating model—not the best-case outcome.</p>

              <fieldset className="question-block">
                <legend>What information is involved?</legend>
                <p>Select every type that applies.</p>
                <div className="choice-grid">
                  {(Object.entries(DATA_TYPE_LABELS) as [DataType, string][]).map(([key, label]) => (
                    <Choice key={key} selected={input.dataTypes.includes(key)} onClick={() => update("dataTypes", input.dataTypes.includes(key) ? input.dataTypes.filter((item) => item !== key) : [...input.dataTypes, key])}>{label}</Choice>
                  ))}
                </div>
              </fieldset>

              <BinaryQuestion legend="Will another organization access the data?" value={input.externalAccess} onChange={(value) => update("externalAccess", value)} />
              <BinaryQuestion legend="Will raw identifiable values be exchanged?" detail="Raw means unmasked values that directly identify a person." value={input.rawExchange} onChange={(value) => update("rawExchange", value)} />
              <BinaryQuestion legend="Will data leave its current controlled environment?" value={input.dataMovement} onChange={(value) => update("dataMovement", value)} />
              <BinaryQuestion legend="Will it be combined with other datasets?" value={input.combined} onChange={(value) => update("combined", value)} />
              <BinaryQuestion legend="Could it be reused beyond the purpose described?" value={input.secondaryUse} onChange={(value) => update("secondaryUse", value)} />

              <label className="select-field" htmlFor="purpose">
                <span>What is the intended use?</span>
                <select id="purpose" value={input.purpose} onChange={(event) => update("purpose", event.target.value as Purpose)}>
                  {(Object.entries(PURPOSE_LABELS) as [Purpose, string][]).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              {error && <p className="error" role="alert">{error}</p>}
              <div className="actions"><button className="secondary" type="button" onClick={() => moveTo(0)}>← Back</button><button className="primary" type="button" disabled={loading} onClick={assess}>{loading ? "Assessing…" : "Assess risk"} <span>→</span></button></div>
            </div>
          )}

          {step === 2 && result && (
            <div className="step-panel">
              <p className="section-number">03 / ASSESSMENT</p>
              <h2 ref={mainHeading} tabIndex={-1}>The proposed use case is <em>{result.level.toLowerCase()} risk.</em></h2>
              <div className={`score ${result.level.toLowerCase()}`}>
                <span className="score-number">{result.score}</span><span className="score-total">/ 100</span>
                <div><b>{result.level} RISK</b><p>{result.guidance}</p></div>
              </div>
              <div className="rule" />
              <h3>What drives this score</h3>
              <ul className="factor-list">
                {result.factors.map((factor) => <li key={factor.label}><span>{factor.label}</span><b>+{factor.points}</b></li>)}
              </ul>
              <p className="method-note">Transparent rules, capped at 100. Review the versioned rubric for assumptions and thresholds.</p>
              <div className="actions"><button className="secondary" type="button" onClick={() => moveTo(1)}>← Back</button><button className="primary" type="button" onClick={() => moveTo(3)}>See recommendations <span>→</span></button></div>
            </div>
          )}

          {step === 3 && result && (
            <div className="step-panel">
              <p className="section-number">04 / RECOMMENDATIONS</p>
              <h2 ref={mainHeading} tabIndex={-1}>Controls before approval.</h2>
              <p className="lede">Use this record to begin privacy, security, and business-owner review.</p>
              <h3>Recommended protections</h3>
              <ol className="recommendation-list">
                {result.recommendations.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}
              </ol>
              <div className="capability-panel">
                <p className="section-number">KARLSGATE CAPABILITY FIT</p>
                <h3>{result.capabilities.join(" · ")}</h3>
                <p>Karlsgate can apply these controls without requiring raw identifiers to be exposed to another party.</p>
              </div>
              {result.limitations.length > 0 && <div className="limitations"><h3>Specialist review required</h3>{result.limitations.map((item) => <p key={item}>{item}</p>)}</div>}
              <details className="summary"><summary>Assessment record</summary><dl><div><dt>Use case</dt><dd>{input.description}</dd></div><div><dt>Data</dt><dd>{input.dataTypes.map((item) => DATA_TYPE_LABELS[item]).join(", ")}</dd></div><div><dt>Purpose</dt><dd>{PURPOSE_LABELS[input.purpose]}</dd></div><div><dt>Assessed</dt><dd>{new Date(result.assessedAt).toLocaleString()}</dd></div></dl></details>
              <div className="actions wrap"><button className="secondary" type="button" onClick={() => moveTo(2)}>← Back</button><div><button className="secondary" type="button" onClick={reset}>Start over</button><button className="primary" type="button" onClick={download}>Download report ↓</button></div></div>
            </div>
          )}
        </section>
      </div>
      <footer><span>Decision support, not legal advice.</span><span>Rubric v1.0</span></footer>
    </main>
  );
}
