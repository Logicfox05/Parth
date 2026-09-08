// Master data seeded strictly from the uploaded source documents.
// Provenance of every row is documented in REQUIREMENTS.md.
import type { MasterData } from "../../types";

export const SEED_MASTER_DATA: MasterData = {
  // Observed in the filled Daily Monitoring / Fly Catcher specimens (handwritten;
  // exact spelling TO BE CONFIRMED) plus named individuals from the Training
  // Certificate, GAP report and Service Reports.
  employees: [
    { id: "emp-checker-1", name: "Roshni", role: "Checker / Verifier — spelling TO BE CONFIRMED (handwritten source)", department: "Production / HR", active: true },
    { id: "emp-vijay", name: "Vijay", role: "Fly Catcher Cleaning", department: "Housekeeping", active: true },
    { id: "emp-yogesh", name: "Yogesh Rathod", role: "Technician (Gurudev Pest Control)", department: "Pest Control Service Provider", active: true },
    { id: "emp-rohit", name: "Rohit Patel", role: "Signatory, Gurudev Pest Control", department: "Pest Control Service Provider", active: true },
    { id: "emp-kapila", name: "Ms. Kapila Barad", role: "Client Contact Person / Training Coordinator", department: "Gujarat Printpack Publication Pvt. Ltd.", active: true },
    // Lamination QC / Production — names read off the photographed F-QC-30,
    // F-QC-32, Process Parameter and F-PRD-18 registers (Sept-2026).
    { id: "emp-gaurav", name: "Gaurav Singh", role: "Lamination Operator (Lamination-1)", department: "Production", active: true },
    { id: "emp-jeni", name: "Jeni", role: "QC Tester — day shift (Lamination QC) — spelling TO BE CONFIRMED (handwritten)", department: "Quality Control", active: true },
    { id: "emp-singh", name: "Singh", role: "QC Tester — night shift (Lamination QC) — full name TO BE CONFIRMED (handwritten)", department: "Quality Control", active: true },
    // QC inspection registers (F/QC/13, /34, /35, /37) — signatures read off
    // the photographs; full names TO BE CONFIRMED.
    { id: "emp-pooja", name: "Pooja P", role: "QA Inspector (slitting / inspection records) — full name TO BE CONFIRMED", department: "Quality Assurance", active: true },
    { id: "emp-svm", name: "S.V.M.", role: "QA Inspector (printed film) — initials only, TO BE CONFIRMED", department: "Quality Assurance", active: true },
    { id: "emp-hnp", name: "HNP", role: "QA Person (in-process printing QC) — initials only, TO BE CONFIRMED", department: "Quality Assurance", active: true },
    { id: "emp-pankaj", name: "Pankajbhai", role: "Printing Operator (Lombardi)", department: "Production", active: true },
    // Statement of Compliance signatory.
    { id: "emp-shail", name: "Shail Patel", role: "CEO — SOC Signatory", department: "Management", active: true },
    // Attendees of the 24-Dec-2025 pest control awareness training (Training - Yrl (1).doc).
    { id: "emp-akash", name: "Akash Patel", role: "Staff — pest control awareness trainee", department: "TO BE CONFIRMED", active: true },
    { id: "emp-ajay", name: "Ajay Vaghela", role: "Staff — pest control awareness trainee", department: "TO BE CONFIRMED", active: true },
    { id: "emp-meet", name: "Meet Patel", role: "Staff — pest control awareness trainee", department: "TO BE CONFIRMED", active: true },
    { id: "emp-harsh", name: "Harsh Parmar", role: "Staff — pest control awareness trainee", department: "TO BE CONFIRMED", active: true },
    { id: "emp-chirag", name: "Chirag Parmar", role: "Staff — pest control awareness trainee", department: "TO BE CONFIRMED", active: true },
    { id: "emp-mukesh", name: "Mukesh Patel", role: "Staff — pest control awareness trainee", department: "TO BE CONFIRMED", active: true },
  ],

  // Areas are kept separate per source document, exactly as filed on paper
  // (the three Service Report variants and Daily Monitoring do not share one
  // area list in the source material).
  areas: [
    // Rodent Control Service Report (16 areas)
    { id: "area-rcs-1", name: "Printing machine - Ground Floor", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-2", name: "Anilox cleaning area - Ground floor", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-3", name: "Store - Label stock & PVC / PET Films - Ground floor", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-4", name: "Ink store - Ground floor", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-5", name: "RM Inward & FG Dispatch room - Ground floor", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-6", name: "Walkways - Ground Floor", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-7", name: "First floor - Walkways", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-8", name: "First floor - Slitting & Packing", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-9", name: "First floor - Offline punching & QC Inspection", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-10", name: "First floor - Printing machine", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-11", name: "First floor - Ink Kitchen", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-12", name: "First floor - Shrink Sleeve production", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-13", name: "First floor - Intermediate Store", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-14", name: "Change room & Locker room - Ground Floor", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-15", name: "QC Lab", context: "service-report:Rodent Control Service" },
    { id: "area-rcs-16", name: "Canteen", context: "service-report:Rodent Control Service" },
    // General Pest Control Services / Fly Control Services (shared 9-area list in source)
    { id: "area-gp-1", name: "Ground Floor - Change room (outer periphery)", context: "service-report:General Pest Control Services" },
    { id: "area-gp-2", name: "Ground Floor - RM Inward & FG Outward area (outer periphery)", context: "service-report:General Pest Control Services" },
    { id: "area-gp-3", name: "1st floor - Stair case", context: "service-report:General Pest Control Services" },
    { id: "area-gp-4", name: "Ground floor - Mono carton area", context: "service-report:General Pest Control Services" },
    { id: "area-gp-5", name: "Ground floor - Paper storage area", context: "service-report:General Pest Control Services" },
    { id: "area-gp-6", name: "First floor - Printing plate storage area", context: "service-report:General Pest Control Services" },
    { id: "area-gp-7", name: "First floor - Utility area", context: "service-report:General Pest Control Services" },
    { id: "area-gp-8", name: "QC Lab - Ground Floor", context: "service-report:General Pest Control Services" },
    { id: "area-gp-9", name: "Canteen", context: "service-report:General Pest Control Services" },
    { id: "area-fc-1", name: "Ground Floor - Change room (outer periphery)", context: "service-report:Fly Control Services" },
    { id: "area-fc-2", name: "Ground Floor - RM Inward & FG Outward area (outer periphery)", context: "service-report:Fly Control Services" },
    { id: "area-fc-3", name: "1st floor - Stair case", context: "service-report:Fly Control Services" },
    { id: "area-fc-4", name: "Ground floor - Mono carton area", context: "service-report:Fly Control Services" },
    { id: "area-fc-5", name: "Ground floor - Paper storage area", context: "service-report:Fly Control Services" },
    { id: "area-fc-6", name: "First floor - Printing plate storage area", context: "service-report:Fly Control Services" },
    { id: "area-fc-7", name: "First floor - Utility area", context: "service-report:Fly Control Services" },
    { id: "area-fc-8", name: "QC Lab - Ground Floor", context: "service-report:Fly Control Services" },
    { id: "area-fc-9", name: "Canteen", context: "service-report:Fly Control Services" },
  ],

  // Fly Catcher (fly killer machine) locations PC-01 .. PC-13, verbatim from
  // the Fortnightly Fly Catcher Inspection & Cleaning Record (F/HR/18).
  pcLocations: [
    { id: "PC-01", location: "Near Wash room", floor: "GF" },
    { id: "PC-02", location: "Near Ink room", floor: "GF" },
    { id: "PC-03", location: "Gallus machine room", floor: "GF" },
    { id: "PC-04", location: "Pouching area", floor: "GF" },
    { id: "PC-05", location: "Pouching area", floor: "GF" },
    { id: "PC-06", location: "Pouching area", floor: "GF" },
    { id: "PC-07", location: "Near Lombardi m/c", floor: "FF" },
    { id: "PC-08", location: "Ink Kitchen", floor: "FF" },
    { id: "PC-09", location: "Warehouse entrance", floor: "GF" },
    { id: "PC-10", location: "Warehouse office wall", floor: "TO BE CONFIRMED" },
    { id: "PC-11", location: "Change room", floor: "GF" },
    { id: "PC-12", location: "Dispatch gate", floor: "GF" },
    { id: "PC-13", location: "Dispatch gate entrance", floor: "GF" },
  ],

  // Chemicals referenced across the SOP, Pesticide Application Chart and
  // Service Reports.
  chemicals: [
    { id: "chem-bromadiolone", name: "Bromadiolone Wax Block 0.005% a.i.", formulation: "Ready-to-use wax block / cake" },
    { id: "chem-glue-board", name: "Non-Chemical Glue Trap / Glue Board", formulation: "Physical trap (non-chemical)" },
    { id: "chem-bait-trap", name: "Bait Traps / Bait Trays", formulation: "Tamper Proof Bait Station" },
    { id: "chem-kothrine", name: "Kothrine (Deltamethrin 2.5% SC)", activeIngredient: "Deltamethrin 2.5%", formulation: "SC (Suspension Concentrate)" },
    { id: "chem-responsar", name: "Responsar (Beta-Cyfluthrin 2.45% SC)", activeIngredient: "Beta-Cyfluthrin 2.45%", formulation: "SC (Suspension Concentrate)" },
    { id: "chem-maxforce", name: "Maxforce Gel", formulation: "Ready-to-use (RTU) gel" },
  ],

  // Pesticide Application Chart (Chemical Chart new.docx) — Service Type -> Pest -> Chemical -> Dilution.
  serviceTypeChemicals: [
    {
      id: "stc-rodent",
      serviceName: "Rodent Control Service",
      pestCovered: "Rat, Mice & Bandicoots",
      chemicals: [
        "Tamper Proof Bait Stations",
        "Bromadiolone Wax Block 0.005%",
        "Non-Chemical Glue trap",
        "Bait Traps",
      ],
      dilutionRatio: "Ready to Use",
    },
    {
      id: "stc-fly-mosquito",
      serviceName: "Fly Control Service & Mosquito Control Services",
      pestCovered: "House Fly",
      chemicals: [
        "Kothrine (Deltamethrin 2.5% SC)",
        "Responsar (Beta-Cyfluthrin 2.45% SC)",
      ],
      dilutionRatio: "25 ml/Sq.Mt (Kothrine) | 20 ml / 1 litre of water (Responsar)",
    },
    {
      id: "stc-general",
      serviceName: "General Pest control",
      pestCovered: "Cockroaches, Red & Black Ants",
      chemicals: [
        "Maxforce gel",
        "Kothrine (Deltamethrin 2.5% SC)",
        "Responsar (Beta-Cyfluthrin 2.45% SC)",
      ],
      dilutionRatio: "Ready to Use (gel) | 25 ml/Sq.Mt (Kothrine) | 20 ml / 1 litre of water (Responsar)",
    },
  ],

  // No explicit Rodent Bait Station ID master list was present in the uploaded
  // source files (the GAP report flags that station numbering was *missing*
  // at the time of the Dec-2023 inspection). Left empty by design — populate
  // from the Master Data screen once the company's RBS layout/numbering is
  // confirmed. TO BE CONFIRMED.
  rodentStations: [],

  // Daily Pest Control Monitoring Record (F/HR/17) — 10 checkpoints, verbatim.
  // Response vocabulary: Yes/No throughout (matching the actual filled
  // register, not the printed instruction's "OK/Not OK" wording — see
  // REQUIREMENTS.md), except checkpoint 4 which is a count. `flagWhen` is
  // the answer that represents a finding — polarity varies per question.
  checkpoints: [
    { no: 1, text: "Pest proofing of external door (self-closer / PVC Strip curtain) working properly", responseType: "yesno", flagWhen: "No" },
    { no: 2, text: "Any gaps in Doors, shutters, Cable entry or other areas, which pose threat for entry of pests inside the plant?", responseType: "yesno", flagWhen: "Yes" },
    { no: 3, text: "Fly catchers are working properly (all lights working) & serially numbered", responseType: "yesno", flagWhen: "No" },
    { no: 4, text: "Total number of rodent traps provided", responseType: "number" },
    { no: 5, text: "Are rodent traps numbered?", responseType: "yesno", flagWhen: "No" },
    { no: 6, text: "Are rodent traps, placed in the recorded place?", responseType: "yesno", flagWhen: "No" },
    { no: 7, text: "Any pest trapped in rodent trap box", responseType: "yesno", flagWhen: "Yes" },
    { no: 8, text: "Any dead rodent observed? If yes, mention the location", responseType: "yesno-note", notePrompt: "Mention the location", flagWhen: "Yes" },
    { no: 9, text: "Any sign of Rodent cake biting in Rodent box? If yes, mention the Rodent box number", responseType: "yesno-note", notePrompt: "Mention the Rodent box number", flagWhen: "Yes" },
    { no: 10, text: "Are Fly catcher tube lights having validity of usage?", responseType: "yesno", flagWhen: "No" },
  ],

  // Best-effort default mapping from each recordable document to a role
  // keyword — matched case-insensitively against Employee.role above (e.g.
  // "Checker" matches Roshni's "Checker / Verifier — ..."). Admins can
  // correct these in Master Data as real responsibilities are confirmed;
  // "training-record" is left unassigned rather than guessed, since no
  // employee role here obviously covers training coordination.
  documentRoleKeywords: {
    "daily-pest-monitoring": "Checker",
    "fly-catcher": "Fly Catcher Cleaning",
    "service-report-rodent": "Technician",
    "service-report-general": "Technician",
    "service-report-fly": "Technician",
    "service-report-lizard": "Technician",
    "gap-inspection": "Signatory",
    "capa-customer-complaint": "QA",
    "training-record": "Training Coordinator",
    "qc-viscosity": "QC Tester",
    "qc-adhesive-mixing": "QC Tester",
    "qc-temperature": "QC Tester",
    "prd-process-parameter": "Lamination Operator",
    "prd-alc-production": "Lamination Operator",
    "qc-inspection-pouching": "QA Inspector",
    "qc-inspection-slitting": "QA Inspector",
    "qc-inspection-printed-film": "QA Inspector",
    "qc-inprocess-printing": "QA Person",
  },

  // "Gujarat Print Pack Leave Calendar 2026" — taken from the two copies of
  // the company's official leave-calendar notice (union of both; the second
  // copy adds one extra Uttarayan day not on the first). The "Adjustment
  // Date" a working makeup day is intentionally NOT included here — it's the
  // opposite of a holiday.
  holidays: [
    { id: "hol-2026-01-14", date: "2026-01-14", name: "Uttarayan" },
    { id: "hol-2026-01-15", date: "2026-01-15", name: "Uttarayan" },
    { id: "hol-2026-01-26", date: "2026-01-26", name: "Republic Day" },
    { id: "hol-2026-03-04", date: "2026-03-04", name: "Dhuleti" },
    { id: "hol-2026-08-15", date: "2026-08-15", name: "Independence Day" },
    { id: "hol-2026-08-28", date: "2026-08-28", name: "Rakshabandhan" },
    { id: "hol-2026-09-04", date: "2026-09-04", name: "Janmashtami" },
    { id: "hol-2026-10-19", date: "2026-10-19", name: "Navratri Atham" },
    { id: "hol-2026-10-20", date: "2026-10-20", name: "Navratri Navam" },
    { id: "hol-2026-11-09", date: "2026-11-09", name: "New Year" },
    { id: "hol-2026-11-10", date: "2026-11-10", name: "Bhai Dooj" },
    { id: "hol-2026-11-11", date: "2026-11-11", name: "Padtar Diwas" },
    { id: "hol-2026-11-12", date: "2026-11-12", name: "Padtar Diwas" },
    { id: "hol-2026-11-13", date: "2026-11-13", name: "Padtar Diwas" },
  ],
};

export const COMPANY = {
  name: "GUJARAT PRINTPACK PUBLICATION PRIVATE LIMITED",
  shortName: "Gujarat Print Pack Publications Pvt. Ltd.",
  address: "308/9, GIDC, Dediyasan, Mehsana, Gujarat, India – 384002",
  serviceProvider: "Gurudev Pest Control",
};
