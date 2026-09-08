// Fixed material/method-of-application defaults per Service Report variant
// (see REQUIREMENTS.md §5 for provenance — the two real April-2026 service
// report specimens and the SOP's chemical charts). The chemical used and how
// it's applied don't change visit to visit; only quantity and remarks do —
// so these are treated as fixed reference values pre-filled onto every line,
// not something the technician retypes each visit.
export interface FixedMaterial {
  materialName: string;
  methodOfApplication: string;
}

const VARIANT_DEFAULTS: Record<string, FixedMaterial> = {
  "Rodent Control Service": { materialName: "Glue Board", methodOfApplication: "Trouble gum placement" },
  "General Pest Control Services": { materialName: "Deltamethrin 2.5% SC", methodOfApplication: "Spraying" },
  "Fly Control Services": { materialName: "Beta-Cyfluthrin 2.45% SC", methodOfApplication: "Spraying" },
  "Lizard Control Services": { materialName: "Kothrine (Deltamethrin 2.5% SC)", methodOfApplication: "Spraying" },
};

// One documented exception: the Dec-2023/April-2026 specimens show this
// specific Rodent Control area baited with Bromadiolone Cake rather than the
// glue boards used everywhere else on the same visit.
const AREA_OVERRIDES: Record<string, FixedMaterial> = {
  "First floor - Offline punching & QC Inspection": { materialName: "Bromadiolone Cake", methodOfApplication: "Baiting" },
};

export function fixedMaterialForServiceArea(variantKey: string | undefined, areaName: string): FixedMaterial {
  const override = AREA_OVERRIDES[areaName];
  if (override) return override;
  return variantKey && VARIANT_DEFAULTS[variantKey] ? VARIANT_DEFAULTS[variantKey] : { materialName: "", methodOfApplication: "" };
}
