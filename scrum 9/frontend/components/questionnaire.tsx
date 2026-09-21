"use client";

import { useRef, useState } from "react";
import {
  Answers, Choice, Errors, FieldKey, Question, choiceLabels, dataTypes,
  initialAnswers, steps, toRequest, validateStep
} from "../lib/questionnaire";

export function Questionnaire() {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState("");
  const [receipt, setReceipt] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const requestInFlight = useRef(false);

  function navigate(next: number) {
    setStep(next);
    setErrors({});
    setFailure("");
    requestAnimationFrame(() => heading.current?.focus());
  }

  function showErrors(nextErrors: Errors) {
    setErrors(nextErrors);
    requestAnimationFrame(() => errorSummary.current?.focus());
  }

  function change(key: FieldKey, value: string) {
    setAnswers((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  function goForward(target = step + 1) {
    // Revalidate earlier steps when jumping forward after an edit.
    for (let index = 0; index < target; index++) {
      const nextErrors = validateStep(answers, index);
      if (Object.keys(nextErrors).length) {
        setStep(index);
        showErrors(nextErrors);
        return;
      }
    }
    setFurthest((previous) => Math.max(previous, target));
    navigate(target);
  }

  async function submit() {
    if (requestInFlight.current) return;
    for (let index = 0; index < steps.length; index++) {
      const nextErrors = validateStep(answers, index);
      if (Object.keys(nextErrors).length) {
        setStep(index);
        showErrors(nextErrors);
        return;
      }
    }
    requestInFlight.current = true;
    setSending(true);
    setFailure("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");
      const response = await fetch(`${base}/assessments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequest(answers)), signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(response.status === 422
          ? "Your answers could not be validated. Review your answers and try again."
          : "We could not submit your answers. They are still here; please try again.");
      }
      const result: unknown = await response.json();
      if (typeof result !== "object" || result === null || !("submission_id" in result)
          || typeof result.submission_id !== "string" || !("status" in result)
          || result.status !== "validated") {
        throw new Error("The service returned an unexpected response. Your answers are still here; please try again.");
      }
      setReceipt(result.submission_id);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (error) {
      setFailure(error instanceof Error && error.name !== "AbortError" && error.name !== "TypeError"
        ? error.message : "We could not reach the service. Your answers are still here; please try again.");
    } finally {
      clearTimeout(timeout);
      requestInFlight.current = false;
      setSending(false);
    }
  }

  function renderQuestion(question: Question) {
    if (question.show && !question.show(answers)) return null;
    const key = question.key;
    const describedBy = `${key}-hint${errors[key] ? ` ${key}-error` : ""}`;
    return <fieldset className="question" key={key}>
      <legend>{question.label} <span className="required">(required)</span></legend>
      <p className="hint" id={`${key}-hint`}>{question.hint}</p>
      {question.type === "text" ? <textarea
        id={key} aria-label={question.label} aria-describedby={describedBy}
        aria-invalid={Boolean(errors[key])} required maxLength={2000} rows={3}
        value={answers[key]} onChange={(event) => change(key, event.target.value)}
      /> : <div className="choices" id={key} tabIndex={-1}>
        {(Object.keys(choiceLabels) as Choice[]).map((value) => <label className="choice" key={value}>
          <input type="radio" name={key} value={value} checked={answers[key] === value}
            required aria-describedby={describedBy}
            onChange={() => change(key, value)} />
          {choiceLabels[value]}
        </label>)}
      </div>}
      {errors[key] && <p className="field-error" id={`${key}-error`}>{errors[key]}</p>}
    </fieldset>;
  }

  return <>
    <header className="app-header"><div className="header-inner">
      <div className="brand"><span className="brand-mark" aria-hidden="true">K</span>Karlsgate</div>
      <span className="header-label">Data governance</span>
    </div></header>
    <main className="workspace">
      <aside className="sidebar">
        <p className="eyebrow">NEW ASSESSMENT</p>
        <h1>Data use questionnaire</h1>
        <nav aria-label="Questionnaire steps"><ol className="step-list">
          {[...steps.map((item) => item.title), "Review"].map((title, index) => <li key={title}>
            <button type="button" className={`step-button ${index === step ? "active" : ""}`}
              aria-current={index === step ? "step" : undefined}
              disabled={index > furthest || sending || Boolean(receipt)}
              onClick={() => index <= step ? navigate(index) : goForward(index)}>
              <span className="step-number">{index + 1}</span><span>{title}</span>
            </button>
          </li>)}
        </ol></nav>
        <div className="privacy-note"><strong>Describe the data.</strong><p>Use examples and roles. Do not enter actual personal records, passwords or credentials.</p></div>
      </aside>
      <section className="form-area" aria-label="Questionnaire">
        {receipt ? <div className="confirmation" role="status">
          <p className="eyebrow">SUBMISSION CHECKED</p>
          <h2 ref={heading} tabIndex={-1}>Your answers passed validation.</h2>
          <p>No risk score has been calculated. Your answers have not been saved to a database.</p>
          <p className="receipt">Submission reference: <span>{receipt}</span></p>
          <button className="primary" type="button" onClick={() => { setReceipt(""); navigate(4); }}>Review answers</button>
        </div> : <>
          <div className="form-heading">
            <p className="eyebrow">STEP {step + 1} OF 5</p>
            <h2 ref={heading} tabIndex={-1}>{step < 4 ? steps[step].heading : "Review your answers"}</h2>
            <p>{step < 4 ? steps[step].description : "Check the details before submitting your questionnaire."}</p>
          </div>
          {Object.values(errors).some(Boolean) && <div className="error-summary" role="alert" tabIndex={-1} ref={errorSummary}>
            <strong>Some answers need your attention.</strong>
            <ul>{Object.entries(errors).filter(([, message]) => message).map(([key, message]) => <li key={key}><a href={`#${key}`}>{message}</a></li>)}</ul>
          </div>}
          <form noValidate onSubmit={(event) => { event.preventDefault(); if (step === 4) void submit(); else goForward(); }}>
            <fieldset className="form-fields" disabled={sending}>
              {step === 0 && <fieldset className="question" id="data_types" tabIndex={-1}>
                <legend>Data types <span className="required">(select all that apply)</span></legend>
                <div className="data-grid">{dataTypes.map((item) => <label className={`data-option ${answers.data_types.includes(item.value) ? "selected" : ""}`} key={item.value}>
                  <input type="checkbox" value={item.value} checked={answers.data_types.includes(item.value)}
                    aria-invalid={Boolean(errors.data_types)} aria-describedby={errors.data_types ? "data_types-error" : undefined}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setAnswers((previous) => ({ ...previous, data_types: checked
                        ? [...previous.data_types, item.value] : previous.data_types.filter((value) => value !== item.value) }));
                      setErrors((previous) => ({ ...previous, data_types: undefined }));
                    }} />
                  <span><strong>{item.label}</strong><span className="option-hint">{item.example}</span></span>
                </label>)}</div>
                {errors.data_types && <p className="field-error" id="data_types-error">{errors.data_types}</p>}
              </fieldset>}
              {step < 4 && steps[step].questions.map(renderQuestion)}
              {step === 4 && <>
                {steps.map((section, index) => <section className="review-section" key={section.title}>
                  <div className="review-heading"><h3>{section.title}</h3><button type="button" className="text-button" onClick={() => navigate(index)} aria-label={`Edit ${section.title.toLowerCase()}`}>Edit</button></div>
                  <dl>
                    {index === 0 && <div><dt>Data types</dt><dd>{dataTypes.filter((item) => answers.data_types.includes(item.value)).map((item) => item.label).join(", ")}</dd></div>}
                    {section.questions.filter((q) => !q.show || q.show(answers)).map((q) => <div key={q.key}>
                      <dt>{q.label}</dt><dd>{q.type === "choice" ? choiceLabels[answers[q.key] as Choice] : answers[q.key]}</dd>
                    </div>)}
                  </dl>
                </section>)}
                <p className="submission-note">Submitting checks your answers. Risk scoring and database storage are not yet available. Answers remain available while this page is open; refreshing or closing it clears them.</p>
              </>}
            </fieldset>
            {failure && <p className="error-summary" role="alert">{failure}</p>}
            <footer className="form-footer">
              {step > 0 ? <button type="button" className="secondary" disabled={sending} onClick={() => navigate(step - 1)}>Back</button> : <span />}
              <button type="submit" className="primary" disabled={sending}>{sending ? "Submitting..." : step === 4 ? "Submit questionnaire" : step === 3 ? "Review answers" : "Continue"}</button>
            </footer>
          </form>
          <p className="draft-note">Answers stay with you as you move between steps.</p>
        </>}
      </section>
    </main>
  </>;
}
