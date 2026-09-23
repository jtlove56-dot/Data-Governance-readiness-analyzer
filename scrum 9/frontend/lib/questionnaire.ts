export const dataTypes = [
  { value: "names", label: "Names", example: "First names, surnames or full names" },
  { value: "email", label: "Email addresses", example: "Personal or work email addresses" },
  { value: "health", label: "Health information", example: "Conditions, treatments or medical records" },
  { value: "financial", label: "Financial information", example: "Income, bank details or transactions" },
  { value: "location", label: "Location information", example: "Addresses, GPS or travel history" },
  { value: "online_ids", label: "Online identifiers", example: "Device IDs, IP addresses or account IDs" },
  { value: "other", label: "Other data", example: "Any types that are not listed above" },
  { value: "unknown", label: "Some types are not yet known", example: "The data is still being explored" }
] as const;

export type DataType = (typeof dataTypes)[number]["value"];
export type Choice = "yes" | "no" | "unsure";
export type Answers = {
  schema_version: "1.0"; data_types: DataType[]; other_data_types: string;
  people: string; organizations: string; external_access: Choice | "";
  external_access_details: string; identifiable_exchange: Choice | "";
  data_movement: string; purpose: string; expected_output: string;
  secondary_use: Choice | ""; secondary_use_details: string;
  reidentification: Choice | ""; reidentification_details: string;
};
export type FieldKey = Exclude<keyof Answers, "schema_version" | "data_types">;
export type Errors = Partial<Record<keyof Answers, string>>;
export type Question = {
  key: FieldKey; label: string; hint: string; type: "text" | "choice";
  show?: (answers: Answers) => boolean;
};
export const initialAnswers: Answers = {
  schema_version: "1.0", data_types: [], other_data_types: "", people: "",
  organizations: "", external_access: "", external_access_details: "",
  identifiable_exchange: "", data_movement: "", purpose: "", expected_output: "",
  secondary_use: "", secondary_use_details: "", reidentification: "",
  reidentification_details: ""
};
export const steps: { title: string; heading: string; description: string; questions: Question[] }[] = [
  {
    title: "Data", heading: "What data is involved?",
    description: "Include the types of information your use case will collect, use or share.",
    questions: [{ key: "other_data_types", label: "What other data is involved?", type: "text",
      hint: "For example, employment history or photos. Describe the type, without entering real records.",
      show: (a) => a.data_types.includes("other") }]
  },
  {
    title: "Participants", heading: "Who is involved?",
    description: "Describe the people and organizations taking part in this use case.",
    questions: [
      { key: "people", label: "Which people are involved or affected?", type: "text",
        hint: "For example, customers whose data is used and analysts who handle it. Use roles or groups, not personal names." },
      { key: "organizations", label: "Which organizations are taking part?", type: "text",
        hint: "Include your organization and any partners or suppliers. Names or descriptions such as 'our research partner' are enough." },
      { key: "external_access", label: "Will another organization access the data?", type: "choice",
        hint: "Access includes viewing data in your system, receiving a copy or processing it on your behalf." },
      { key: "external_access_details", label: "Who will have access, and to what?", type: "text",
        hint: "For example, our research partner will receive age groups and purchase totals. Say what is unknown if arrangements are still being decided.",
        show: (a) => a.external_access === "yes" }
    ]
  },
  {
    title: "Sharing", heading: "How will the data move?",
    description: "Consider each transfer between people, organizations and systems.",
    questions: [
      { key: "identifiable_exchange", label: "Will data that identifies people be exchanged?", type: "choice",
        hint: "This means original records with details such as names, email addresses or other information that could identify someone, rather than only grouped totals." },
      { key: "data_movement", label: "Where does the data go, and how does it get there?", type: "text",
        hint: "For example, our customer system sends purchase records to a partner through a secure API, and the partner returns grouped totals. If nothing moves, say where it stays." },
      { key: "reidentification", label: "Could someone work out who a person is from shared data or results?", type: "choice",
        hint: "This is called re-identification. Even without names, combining a postcode, age and other records might reveal a person. Choose 'Not sure' if you do not know." },
      { key: "reidentification_details", label: "What could make someone identifiable?", type: "text",
        hint: "For example, very small groups or combining the results with a public directory. Include any planned precautions, or say what is unknown.",
        show: (a) => a.reidentification === "yes" }
    ]
  },
  {
    title: "Purpose", heading: "What will the data be used for?",
    description: "Describe the planned outcome and any possible later uses.",
    questions: [
      { key: "purpose", label: "What are you trying to achieve?", type: "text",
        hint: "For example, understand which services customers need so we can improve our offering." },
      { key: "expected_output", label: "What will the work produce?", type: "text",
        hint: "For example, a report of grouped statistics, predictions for individual customers or a combined dataset. Include who will receive it." },
      { key: "secondary_use", label: "Might the data be used for another purpose later?", type: "choice",
        hint: "This is called secondary use. Examples include a future research project, marketing or training an AI model." },
      { key: "secondary_use_details", label: "What other uses are possible?", type: "text",
        hint: "Describe any proposed later use and who would use the data. Say what is unknown if plans are not final.",
        show: (a) => a.secondary_use === "yes" }
    ]
  }
];
export function validateStep(answers: Answers, step: number): Errors {
  const errors: Errors = {};
  if (step === 0 && answers.data_types.length === 0) {
    errors.data_types = "Select at least one data type, or indicate that types are not yet known.";
  }
  for (const question of steps[step].questions) {
    if (question.show && !question.show(answers)) continue;
    const value = answers[question.key].trim();
    if (!value) errors[question.key] = question.type === "choice"
      ? "Choose Yes, No or Not sure." : "Enter an answer. If details are unknown, say what still needs to be decided.";
    else if (value.length > 2000) errors[question.key] = "Keep your answer to 2,000 characters or fewer.";
  }
  return errors;
}
export function toRequest(answers: Answers): Answers {
  const result = { ...answers, data_types: [...answers.data_types] };
  for (const step of steps) for (const q of step.questions) {
    const value = q.show && !q.show(answers) ? "" : answers[q.key].trim();
    Object.assign(result, { [q.key]: value });
  }
  return result;
}
export const choiceLabels: Record<Choice, string> = { yes: "Yes", no: "No", unsure: "Not sure" };
