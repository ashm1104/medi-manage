export const TREATMENT_TYPE_SUBTYPE_MAP = {
  Consultation: ["Initial", "Follow-up"],
  Procedure: ["Minor", "Major"],
  Surgery: ["Elective", "Emergency"],
  Therapy: ["Physio", "Medication"],
  Diagnostic: ["Lab", "Imaging"],
} as const;

export type TreatmentType = keyof typeof TREATMENT_TYPE_SUBTYPE_MAP;

const TREATMENT_TYPES = Object.keys(TREATMENT_TYPE_SUBTYPE_MAP) as TreatmentType[];

function normalizeByCatalog<T extends readonly string[]>(value: unknown, catalog: T): T[number] | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return catalog.find((item) => item.toLowerCase() === normalized);
}

export function normalizeTreatmentType(value: unknown): TreatmentType | undefined {
  return normalizeByCatalog(value, TREATMENT_TYPES);
}

export function getTreatmentSubTypes(type: unknown): readonly string[] {
  const treatmentType = normalizeTreatmentType(type);
  return treatmentType ? TREATMENT_TYPE_SUBTYPE_MAP[treatmentType] : [];
}

export function normalizeTreatmentSubType(type: unknown, subType: unknown): string | undefined {
  const treatmentType = normalizeTreatmentType(type);
  if (!treatmentType) return undefined;
  return normalizeByCatalog(subType, TREATMENT_TYPE_SUBTYPE_MAP[treatmentType]);
}

