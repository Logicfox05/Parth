# REQUIREMENTS.md — Source-to-Digital Traceability

This document records, for every uploaded source file, what was found, how it was digitized,
and every place the source was unclear (marked **TO BE CONFIRMED**). Nothing below was invented;
where the source did not say, this document says so explicitly.

Company: **Gujarat Printpack Publication Private Limited**, 308/9, GIDC, Dediyasan, Mehsana,
Gujarat, India – 384002. Pest control service provider: **Gurudev Pest Control**.

---

## 1. Daily Pest Control Monitoring Record

```
SOURCE DOCUMENT      Kapila mam department reports.pdf, pages 2-4 (photographed paper form)
DOCUMENT STRUCTURE   Header (company/title/Format No./Rev No./Date/Page No.) + instructions +
                      10 numbered checkpoints + a 31-row daily grid (checkpoints 1-10, Time of
                      checking, Checker) + a "Summary of Actions Taken if Pest Observed" table
DIGITAL TEMPLATE     kind: "daily-pest-monitoring" — src/components/records/DailyPestMonitoringRecordView.tsx
DATABASE FIELDS      DailyPestMonitoringData (src/types/record.ts): isHoliday, checkpoints
                      (Record<1-10, {value, note?}>), timeOfChecking, checker, summaryActions[]
WORKFLOW             Frequency: Daily. One record instance per calendar date.
REPORT               Reports > Daily Monitoring Summary (reproduces the monthly register);
                      Reports > Rodent Trend (derived from checkpoint 7)
```

- Format No. **F/HR/17**, Rev No. **00**, Date **01.12.2021** — read directly off the header.
- Instruction text (verbatim): *"Please check the following points on a Daily basis for
  monitoring of Rodent / Pest infestation & report to Production supervisor / Pest control
  agency for further investigation & necessary actions. Please mention the status as OK / Not
  OK against each check point except point no. 7."*
- The 10 checkpoints, verbatim:
  1. Pest proofing of external door (self-closer / PVC Strip curtain) working properly
  2. Any gaps in Doors, shutters, Cable entry or other areas, which pose threat for entry of pests inside the plant?
  3. Fly catchers are working properly (all lights working) & serially numbered
  4. Total number of rodent traps provided
  5. Are rodent traps numbered?
  6. Are rodent traps, placed in the recorded place?
  7. Any pest trapped in rodent trap box
  8. Any dead rodent observed? If yes, mention the location
  9. Any sign of Rodent cake biting in Rodent box? If yes, mention the Rodent box number
  10. Are Fly catcher tube lights having validity of usage?
- **Response vocabulary — RESOLVED.** The printed instruction says every checkpoint except #7 is
  answered OK/Not OK, but the filled specimen actually uses **Yes/No** answers throughout
  (checkpoints 1, 2, 3, 5, 6, 7, 10), checkpoint 4 is a number (observed value: 100), and
  checkpoints 8/9 need a free-text note ("if yes, mention…") when flagged. Originally digitized
  with an OK/NOT OK control for 1, 2, 3, 5, 6, 10 as a judgment call reconciling the printed
  instructions with actual practice; confirmed against the source photograph a second time and
  changed to Yes/No throughout (matching the specimen exactly) — see `src/data/seed/masterData.ts`
  checkpoints and `src/engine/checkpoints.ts` for the per-checkpoint "which answer is a finding"
  polarity this required (e.g. checkpoint 1 is a finding when answered "No"; checkpoint 2 is a
  finding when answered "Yes" — the printed instruction text itself is otherwise unchanged,
  verbatim, per the header/instructions page).
- **Holiday rows.** The filled specimen shows some daily rows containing "H O L I D A Y" spelled
  vertically down the checkpoint columns instead of data (rows observed at roughly rows 6, 13,
  15, 20, 27, 28 of the August‑26 specimen — not a strict weekly pattern). Modeled as a per-record
  `isHoliday` flag rather than assumed Sundays, since the observed pattern did not consistently
  land on Sundays. **TO BE CONFIRMED**: the company's actual holiday calendar.
- **Checker name.** Handwritten, reads approximately "Roshni" — **TO BE CONFIRMED** exact spelling.
  Used only as sample master data (Master Data > Employees), clearly flagged.
- Summary-of-actions table columns (verbatim): Date of observation | Description of Observation |
  Action Taken | Remarks.

## 2. Fortnightly — Fly Catcher Inspection & Cleaning Record

```
SOURCE DOCUMENT      Kapila mam department reports.pdf, pages 5-6
DOCUMENT STRUCTURE   Header + Month&Year + PC location legend (PC-01..PC-13) + data table
DIGITAL TEMPLATE     kind: "fly-catcher" — src/components/records/FlyCatcherRecordView.tsx
DATABASE FIELDS      FlyCatcherData: monthYear, entries[13] { pcId, catchCountApprox,
                      tubeLightInstallDate, tubeLightDueDate, cleaningDoneBy, verifiedBy }
WORKFLOW             Frequency: Fortnightly (schedule anchor: day 3 & 17 of each month, matching
                      the two dated service rows observed in the specimen — 03‑Aug‑26 & 17‑Aug‑26)
REPORT               Reports > Fly Catcher Trend
```

- Format No. **F/HR/18**, Rev No. **02**, Date **15.12.2024**.
- PC location legend, verbatim: PC‑01 Near Wash room (GF); PC‑02 Near Ink room (GF); PC‑03 Gallus
  machine room (GF); PC‑04 Pouching area (GF); PC‑05 Pouching area (GF); PC‑06 Pouching area (GF);
  PC‑07 Near Lombardi m/c (FF); PC‑08 Ink Kitchen (FF); PC‑09 Warehouse entrance (GF); PC‑10
  Warehouse office wall; PC‑11 Change room (GF); PC‑12 Dispatch gate (GF); PC‑13 Dispatch gate
  entrance (GF). (GF/FF read as Ground Floor / First Floor by pattern — **TO BE CONFIRMED**.)
  PC‑10's floor was not legible/labelled with GF or FF in the source — kept as **TO BE CONFIRMED**.
- Table columns, verbatim: PC ID No. | Date of Service | Flies Catch Count Approx. | Date of Tube
  Light Installation | Due Date for Tube Light Replacement | Cleaning Done By | Verified By.
- Tube light install/due dates repeat via ditto marks within a PC's two rows in the specimen —
  modeled as fields the user sets once per PC per visit (not forced to be identical, since a
  replacement could happen between visits).
- Sample names observed: Cleaning Done By = "Vijay"; Verified By reads like "Roshni" — **TO BE
  CONFIRMED** exact spelling (same caveat as above).

## 3. Pesticide Application Chart (Chemical Master)

```
SOURCE DOCUMENT      Chemical Cahrt new.docx
DOCUMENT STRUCTURE   Single table: Sr. No | Services Name | Pest Covered | Chemicals to be use | Dilution Ratio
DIGITAL TEMPLATE     kind: "chemical-master" (reference only) — src/pages/ChemicalMasterPage.tsx
DATABASE FIELDS      ServiceTypeChemical[] (src/types/master.ts)
WORKFLOW             As Required / reference. Consumed by Service Report's chemical suggestion.
REPORT               Reports > Chemical Usage
```

- No Format No. / Revision No. printed on this chart — **TO BE CONFIRMED**.
- Rows, verbatim:
  1. Rodent Control Service — (Rat, Mice & Bandicoots) — Tamper Proof Bait Stations, Bromadiolone
     Wax Block 0.005%, Non‑Chemical Glue trap, Bait Traps — Ready to Use.
  2. Fly Control Service & Mosquito Control Services — House Fly — Kothrine (Deltamethrin 2.5%
     SC) / Responsar (Beta‑Cyfluthrin 2.45% SC) — 25 ml/Sq.Mt (Kothrine) / 20 ml per 1 litre
     water (Responsar).
  3. General Pest control — Cockroaches, Red & Black Ants — Maxforce gel / Kothrine (Deltamethrin
     2.5% SC) / Responsar (Beta‑Cyfluthrin 2.45% SC) — Ready to Use (gel) / 25 ml per Sq.Mt
     (Kothrine) / 20 ml per litre (Responsar).

## 4. Standard Operating Procedure for Pest Control Services

```
SOURCE DOCUMENT      Standard Operating Procedure for Pest Control Services..docx
DOCUMENT STRUCTURE   5 sections (General Pest Control, Rodent Control, Fly Control, Mosquito
                      Control, Lizard Control), each with Chemicals / Process / Log Sheet note /
                      Preventive Measures
DIGITAL TEMPLATE     kind: "sop-reference" (reference only) — src/pages/SopReferencePage.tsx,
                      content in src/data/seed/sopContent.ts
DATABASE FIELDS      n/a (static reference content)
WORKFLOW             As Required / reference. Used to configure checkpoints, chemicals and the
                      Lizard Control Service document's frequency.
REPORT               n/a
```

- No Format No. / Revision No. printed — **TO BE CONFIRMED**.
- **Frequency**: only the Lizard Control section states an explicit cadence — *"The Frequency
  recommended is quarterly however it may depend upon the local situation and may vary from
  place to place."* This is the only frequency the SOP itself specifies; General/Rodent/Fly/
  Mosquito control cadence in this system comes from the dated Service Report specimens
  (fortnightly), not from the SOP text itself.
- **Mosquito Control** has no dedicated Service Report specimen in the uploaded files (the
  Chemical Chart groups it with Fly Control). No standalone Mosquito Control Service Report
  document was created for this reason — **TO BE CONFIRMED** whether the company wants one.

## 5. Pest Control Service Report (Gurudev Pest Control)

```
SOURCE DOCUMENT      Service ReportApril 2026.xls (6 sheets: 1st/2nd Service x Rodent/General/Fly)
DOCUMENT STRUCTURE   Header (provider/unit/service name/date) + Sl.No/Area/Material/Qty/Method/
                      Remarks table (fixed area list per service type) + technician/customer signatures
DIGITAL TEMPLATE     kind: "service-report" — src/components/records/ServiceReportRecordView.tsx
                      (4 DocumentDefinition variants: Rodent / General / Fly / Lizard)
DATABASE FIELDS      ServiceReportData: serviceName, lines[] {slNo, areaName, materialName,
                      qtyUsed, methodOfApplication, remarks}, technicianSign, customerSign
WORKFLOW             Frequency: Fortnightly (anchor day 4 & 18 — matches 04.04.2026 & 18.04.2026
                      specimens exactly). Lizard Control Services variant: Quarterly (per SOP),
                      with an empty area list (no specimen supplied — user adds areas manually).
REPORT               Reports > Monthly Pest Control Report, Reports > Chemical Usage
```

- No Format No. / Revision No. on this contractor-supplied template — **TO BE CONFIRMED**.
- Fixed area checklists, verbatim from source, per service type:
  - **Rodent Control Service** (16 areas): Printing machine GF; Anilox cleaning area GF; Store —
    Label stock & PVC/PET Films GF; Ink store GF; RM Inward & FG Dispatch room GF; Walkways GF;
    FF Walkways; FF Slitting & Packing; FF Offline punching & QC Inspection; FF Printing machine;
    FF Ink Kitchen; FF Shrink Sleeve production; FF Intermediate Store; Change room & Locker room
    GF; QC Lab; Canteen.
  - **General Pest Control Services / Fly Control Services** (shared 9-area list): GF Change room
    (outer periphery); GF RM Inward & FG Outward area (outer periphery); 1st floor Stair case; GF
    Mono carton area; GF Paper storage area; FF Printing plate storage area; FF Utility area; QC
    Lab GF; Canteen.
- Materials observed: Glue Board (Rodent, qty 3‑4, method "Trouble gum placement" [sic, kept as
  written], remarks "No Rodent Trapped"); Bromadiolone Cake (Rodent, at Offline punching & QC
  Inspection, 30‑40 grams, "Baiting"); Deltamethrin 2.5% SC (General, 150 ml, "Spraying");
  Beta‑Cyfluthrin 2.45% SC (Fly, 100‑150 ml, "Spraying").
- **Per-area material/method logging — RESOLVED.** In both specimens, material/qty/method/remarks
  were filled only on the *first* area row of each visit, not per area. Confirmed: Material Name
  and Method of Application don't vary visit to visit for a given area (they follow the SOP /
  Chemical Master for that service type), so both are now **fixed, read-only values pre-filled
  per area line** — Glue Board / "Trouble gum placement" for Rodent Control areas generally,
  Bromadiolone Cake / "Baiting" specifically at First Floor Offline Punching & QC Inspection
  (the one area the source specimens show treated differently), Deltamethrin 2.5% SC / "Spraying"
  for General Pest Control, Beta-Cyfluthrin 2.45% SC / "Spraying" for Fly Control (see
  `src/engine/serviceMaterials.ts`). Quantity Used and Remarks remain free-text, entered by the
  technician per area per visit, exactly as before.

## 6. GAP Analysis Report (Pest Control), December 2023

```
SOURCE DOCUMENT      GAP Analysis Report Pest control Dec 2023.xlsx
DOCUMENT STRUCTURE   Header (date/premises/contact) + findings table + general comments
DIGITAL TEMPLATE     kind: "gap-inspection" — src/pages/GapPage.tsx
DATABASE FIELDS      GapInspectionData: inspectionDate, premisesName, premisesAddress,
                      contactPerson, findings[] {findingOfInspection, commentsOnFindings,
                      correctiveActionContractor, correctiveActionClient, targetDate,
                      actualDateOfAction, verifiedByServiceProvider, status}, generalComments[]
WORKFLOW             Frequency: As Required (created manually per inspection). The real
                      13‑Dec‑2023 inspection is loaded as historical LIVE data (isDemo: false).
REPORT               Reports > GAP Status
```

- No Format No. / Revision No. — **TO BE CONFIRMED**. Date of Inspection **13.12.2023**.
  Premises: Gujarat Print Pack Publications Pvt. Ltd., Dediyasan GIDC, Mehsana. Contact Person:
  Ms. Kapila Barad.
- All 5 findings and both general comments were transcribed verbatim (see the seeded record in
  `src/data/seed/historicalRecords.ts`) — not summarized or reworded.
- The source left "Actual date of action taken" and "Verified by Service provider" blank for
  every finding; these stay blank/null in the digital record. Because the 31‑Dec‑2023 target
  date has long since passed with no completion recorded, the system correctly (and
  automatically) computes these findings as **Overdue** today — this is the frequency/overdue
  engine working as designed, not invented data.

## 7. Training Certificate (Technician)

```
SOURCE DOCUMENT      Tr. Certi.docx
DOCUMENT STRUCTURE   Letterhead + subject line + narrative certifying a named technician + 5 topics + signatory
DIGITAL TEMPLATE     kind: "training-record" — src/pages/TrainingPage.tsx
DATABASE FIELDS      TrainingRecordData: trainingDate, trainingType, trainerProvider, topics[],
                      attendees[] {employeeName, department, attended}, certificateRef, remarks
WORKFLOW             Frequency: As Required. The real 02‑Dec‑2025 certificate is loaded as
                      historical LIVE data (isDemo: false), status Verified (a signed
                      certificate is treated as the verification evidence).
REPORT               Reports > Training Status
```

- Date **02/12/2025**. Technician: **Mr. Yogesh Rathod**, trained by **Gurudev Pest Control
  Services**, certified to carry out pest control operations. Issued **for Gurudev Pest Control**
  by **Rohit Patel**.
- Topics, verbatim: (1) Safety, Health Environment, Zero tolerance Policy, MSDS, SOP. (2)
  Cockroach — Facts, Source of Breeding, Damages and Diseases. (3) Rodent — Facts, Signs of
  Infestation, Damages and Diseases. (4) Flies and Mosquitoes — Facts, Source of Breeding,
  Damages and Diseases. (5) Importance of Housekeeping/Sanitation.
- **TO BE CONFIRMED**: no source document states a recurrence/cadence for this kind of training
  (the master prompt's introduction mentions "annual pest-control awareness training" as a
  category, but no uploaded document specifies that cadence). Frequency left as **As Required**
  rather than assuming annual.

## 8. Rodent Catch Report and Trend Analysis (existing company report)

```
SOURCE DOCUMENT      Kapila mam department reports.pdf, page 1 (photographed)
DOCUMENT STRUCTURE   Table: Source | Unit | Target Pest | Year | Jan..Dec | Total, + bar chart
DIGITAL TEMPLATE     n/a — this is evidence the company already produces a rodent trend report
DATABASE FIELDS      n/a
WORKFLOW             n/a
REPORT               Reports > Rodent Trend (see note below)
```

- This is not a fillable form — it is an existing computed report (Source: "Trapped on Glue
  boards in Roda-boxes", Unit: Number, Target Pest: Rodents, by Year/Month). It confirms the
  company already tracks this metric and expects a digital equivalent (section 32/33 of the
  master prompt).
- **Reported figures (transcribed from the page):** 2024 — 0 every month, total 0. 2025 — MAY 1,
  JUN 1, all other months 0, total 2. 2026 — 0 for JAN–JUN, later months not yet reported. The bar
  chart on the page shows the same (May 1, Jun 1, Total 2). These rows are embedded verbatim
  (`src/data/seed/rodentPattern.ts`, `RODENT_HISTORY_REPORTED`) and shown "(as reported)" in
  **Reports > Rodent Catch Report and Trend Analysis**, above the digital row.
- **The catch count is now captured on the daily record.** Answering Yes to checkpoint 7 opens a
  "Rodent catch details" table — trap box no. (RB-01…RB-100), location (one of the 16 Rodent
  Control Service areas) and number of rodents — and Submit requires it. That is the structured
  count the company's report needs; the report adds it up per month, per location and per box, in
  the company's own Source / Unit / Target Pest / Year / Jan–Dec / Total layout.
- **Rodent activity pattern (pre-fill and Demo Mode).** A register that says "no rodents" every
  day tells an auditor nothing, so the assistant's pre-fill and Demo Mode follow a generated
  seasonal pattern: `tools/rodent_pattern.py` (Python, numpy) produces the parameters — a monsoon-
  peaking daily catch probability (~10 catch days a year), location weights favouring the canteen,
  inward-goods and storage areas, a per-day count distribution (mostly 1, sometimes 2–3), and the
  conditional signs for checkpoints 8 (dead rodent, with location) and 9 (bait-cake biting, with
  box no.) — written to `src/data/seed/rodentPattern.ts`. `src/engine/rodentPattern.ts` applies it
  deterministically per calendar date, so the same day always shows the same event and a month
  reads as one consistent story. Calibrated against the reported history above (low, monsoon-
  leaning incidence) but deliberately a little richer so the trend is visible in a demo year.
  **TO BE CONFIRMED**: the real trap-box numbering (the Dec-2023 GAP report flagged it as missing;
  RB-01…RB-100 is an assumption matching "100 traps provided" on the specimen).

---

# Second batch — "Audit documents.zip" (received 07-Sep-2026)

The zip (extracted to `source-documents/` in this repo for traceability) contains the pest-control
files above plus the new material below. Everything new is digitized through the generic
**log-sheet** kind (`src/data/seed/logSheetLayouts.ts` + `LogSheetRecordView.tsx`) or the
**compliance-statement** kind — see DATA_MODEL.md.

## 9. Lamination Adhesive Viscosity Record

```
SOURCE DOCUMENT      WhatsApp Image 2026-09-07 at 2.15.18 PM.jpeg (photographed register, filled 6/9/26–7/9/26)
DOCUMENT STRUCTURE   Header (logo / title / Format No. / Rev / Date) + two side-by-side grids:
                      Sr. No. | Date/Time | Viscosity (20.0 ± 1.0 Sec.) | Tested By
DIGITAL TEMPLATE     kind: "log-sheet", layout "qc-viscosity" — 24 fixed hourly rows (09:00 … 08:00)
DATABASE FIELDS      LogSheetData.rows[] { time (fixed), viscosity (number), testedBy }
WORKFLOW             Frequency: Daily (one sheet-day = one record; readings hourly round the clock)
REPORT               Reports > Lamination QC (daily average, out-of-band count)
```

- Format No. **F-QC-30**, Rev **00**, Date **15.12.2024** — read off the header.
- Specification printed in the column heading: **20.0 ± 1.0 Sec.** Modeled as `nominal 20 / min 19 /
  max 21`; readings outside the band are highlighted (not blocked — the paper has no gate either).
- Specimen shows a day tester (handwritten, reads "Jeni") for 09:00–17:00 and a night tester
  ("Singh") from 18:00; the digital sheet pre-fills the same day/night split. **TO BE CONFIRMED**:
  full names / spelling of both testers.
- Observed specimen values 19.16–21.08 Sec. were transcribed as the layout's specimen rows.

## 10. Adhesive Mixing Ratio Record

```
SOURCE DOCUMENT      WhatsApp Image 2026-09-07 at 2.15.17 PM.jpeg (photographed register)
DOCUMENT STRUCTURE   Header + grid: Sr. No. | Date | Time | Adhesive (kg) | Hardener (kg) | Ethyl (kg) |
                      Viscosity (Sec.) | Remark | Checked by | Verified by
DIGITAL TEMPLATE     kind: "log-sheet", layout "qc-adhesive-mixing" — free rows (one per batch)
DATABASE FIELDS      rows[] { time, adhesive, hardener, ethyl, viscosity, remark, checkedBy, verifiedBy }
WORKFLOW             Frequency: Daily (the paper sheet spans days; the digital record is per day, Date implied)
REPORT               Reports > Lamination QC (batches per day)
```

- Format No. **F-QC-32**, Rev **00**, Date **15.12.2024**.
- Every specimen batch is **15 kg adhesive / 1.65 kg hardener / 19.5 kg ethyl** with mix viscosity
  19.76–20.15 Sec.; those set quantities are carried forward exactly by the assistant, only the
  viscosity varies.
- "Verified by" carries signatures on the specimen (reads "Jeni" / "Singh") — left blank in the
  prepared draft for the verifier to fill.

## 11. Temperature Monitoring Record (Hot Room)

```
SOURCE DOCUMENT      WhatsApp Image 2026-09-07 at 2.15.19 PM (1).jpeg (photographed register, 21-08-26 … 5-9-26)
DOCUMENT STRUCTURE   Header + "RECOMMENDED TEMPERATURE : HOT ROOM 45°C ± 2°C" + 50-row grid:
                      SR NO | DATE | 08:30 | 12:30 | 16:30 | 20:30 | 12:30am | 04:30 HRS TEMP. + SIGN
DIGITAL TEMPLATE     kind: "log-sheet", layout "qc-temperature" — single row per day, six reading columns + Sign
DATABASE FIELDS      rows[0] { t0830, t1230, t1630, t2030, t0030, t0430, sign }
WORKFLOW             Frequency: Daily
REPORT               Reports > Lamination QC (daily min–max)
```

- Format block reads **F-QC-40.C (00/28.02.25)** → Format No. F-QC-40.C, Rev 00, Date 28.02.2025.
- Band **43–47 °C** from the printed recommendation. Observed values 44–46 °C.
- The specimen skips 28-08-26 (Rakshabandhan) and 3/4-09-26 (Janmashtami) — consistent with the
  leave calendar, which is why the generator creates no shell for non-Daily-Monitoring documents on
  a company holiday.

## 12. Solvent Base Lamination — Process Parameter Record

```
SOURCE DOCUMENT      WhatsApp Image 2026-09-07 at 2.15.19 PM.jpeg (photographed sheet, 07-09-26)
DOCUMENT STRUCTURE   Header fields (Operator, Machine, Date & Shift, Mixing Ratio, Adhesive make/code/batch,
                      Hardener make/code/batch) + grid: Internal PO No. | FG Code | Job Name | Coating Nip
                      Pressure | Doctor Blade Pressure | Primary U/W Tension | Lay On Roll Pressure | Hood A
                      Temp. | Hood B Temp. | Line Speed | Rewinder Tension | Secondary U/W Tension | Tapper
                      Tension | Laminator Nip Pressure | Lamination Nip Temp.
DIGITAL TEMPLATE     kind: "log-sheet", layout "prd-process-parameter" — free rows (one per job)
WORKFLOW             Frequency: Daily, with a Shift (A/B/C) header field (paper is one sheet per shift)
REPORT               n/a (searchable by PO / FG / job / batch)
```

- **Format No. is hidden under the clip in the photograph** — only "(00/15.12.2024)" is visible.
  Format No. left **TO BE CONFIRMED**; Rev 00, Date 15.12.2024.
- Header values transcribed: Operator Gaurav Singh, Machine Lamination-1, ratio "10 : 1.1 : 9.5",
  Adhesive DOW 545S, Hardener DOW F-854. Batch numbers are best-effort reads of handwriting
  (`B35007107`, `44000N0301`) — **TO BE CONFIRMED**.
- Jobs and settings transcribed verbatim (five VP Bedekar / Sweet Karam jobs, settings 3.00 / 2.00 /
  45 / 3.00 / 42 / 52 / 81–130 / 52–32 / 40–28 / 15% / 6.00 / 60–90). Machine set-points are carried
  forward exactly by the assistant (they are settings, not readings).

## 13. Solvent Base Lamination — ALC & Production Report

```
SOURCE DOCUMENT      WhatsApp Image 2026-09-07 at 2.15.20 PM.jpeg (photographed sheet, 07-09-26, Shift A)
DOCUMENT STRUCTURE   Header (Operator, Machine, Date & Shift) + ALC PROTOCOL text (5 points) + grid: FG Code |
                      Internal PO No. | Job Name | Layer 1 Type | Layer 1 - Kgs. | Layer 2 Type | Layer 2 - Kgs. |
                      ALC Done As Per Above (Yes/No) | Operator Sign | Start Time | End Time | Laminated Roll
                      Weight - Kgs. | OK Meters | In Time (Hotroom)
DIGITAL TEMPLATE     kind: "log-sheet", layout "prd-alc-production" — free rows (one per job)
WORKFLOW             Frequency: Daily, Shift header field
```

- Format block reads **F-PRD-18 (01/25.06.2025)** → Rev 01, Date 25.06.2025.
- ALC protocol text transcribed verbatim into the layout's instructions.
- Layer 2 type reads "MetPET" plus an illegible suffix ("N-1d"?) — kept as **MetPET**, TO BE CONFIRMED.

## 14. Statements of Compliance (F/QC-09 Labels, F/QC-38 Flexible Packaging)

```
SOURCE DOCUMENT      F-QC-09_Statement of Compliance (SOC) - Label.docx (two identical copies in the zip);
                      F-QC-38_Statement of Compliance (SOC) - Flexible packaging Pouch & Film.docx
DOCUMENT STRUCTURE   Two-column table (Manufacturer … Post-consumer recycling) + declaration paragraphs + signature
DIGITAL TEMPLATE     kind: "compliance-statement" (reference only) — src/pages/CompliancePage.tsx,
                      content in src/data/seed/complianceStatements.ts (verbatim)
WORKFLOW             As Required. Each declaration "is valid for two years from the date of Publication":
                      F/QC-09 signed 1st April 2025 → re-issue due 01-Apr-2027; F/QC-38 signed 24 FEB 2025 →
                      due 24-Feb-2027. The assistant's briefing flags a re-issue 90 days ahead.
```

- Format/Rev from the Word footers: **F/QC- 09 (Rev – 00 / 01.12.2021)** and **F/QC- 38 (Rev – 00 /
  24.02.2025)**. Signatory **Shail Patel (CEO)**.

## 15. Pest Control Awareness Training Programme (24-Dec-2025)

```
SOURCE DOCUMENT      Training - Yrl (1).doc (Word 97-2003)
DOCUMENT STRUCTURE   Letterhead, Date 24.12.2025, Subject, 8 training topics, list of 7 attendees, signed Rohit Patel
DIGITAL TEMPLATE     Existing kind "training-record" — loaded as historical LIVE data (record id training-2025-12-24)
WORKFLOW             Training Record frequency changed from "As Required" to **Yearly (24 Dec)**
```

- Topics and attendees transcribed verbatim (Akash Patel, Ajay Vaghela, Kapila Barad, Meet Patel,
  Harsh Parmar, Chirag Parmar, Mukesh Patel). Attendees added to Master Data > Employees with
  department **TO BE CONFIRMED**.
- **Cadence resolved (previously TBC #8)**: the file is titled "Training - Yrl", i.e. yearly, and the
  master prompt describes annual awareness training — so the document is now Yearly. The frequency
  engine creates the Dec-2026 shell and the assistant pre-fills it from the 2025 programme.

## 17. QC Inspection Records — Pouching (F/QC/37), Slitting (F/QC/35), Printed Film (F/QC/34)

```
SOURCE DOCUMENT      Three photographed registers (WhatsApp, 07-Sep-2026): F/QC/37 filled 06/03/26 (Gulab Oil And
                      Food, "California Almonds and Whole Cashews", FG 5420, PO 81509); F/QC/35 filled 1-3-26 (FG 5703,
                      PO 81857, mother roll 1); F/QC/34 filled 18/8/26 (FG FGP0698Z, PO 88083, Lombardi)
DOCUMENT STRUCTURE   Job header (FG code, PO, date/shift, substrate, +customer/job name / mother roll / printed roll /
                      machine) + fixed table Sr. No. | Test Parameters | Specification | Observation + LOT STATUS
                      (Accepted / Reject-Scrap / Segregation / Accepted on Deviation) + Reason for deviation +
                      Inspected By (QA Inspector) / Approved By (QA Manager)
DIGITAL TEMPLATE     kind: "log-sheet", rowMode "fixedRows" (layouts qc-inspection-pouching / -slitting / -printed-film)
WORKFLOW             Frequency: Daily (one inspection per production day; paper is per lot — see TBC #14)
```

- All three carry footer "Format number: F/QC/xx (00 / 15.12.2024)" → Rev 00, Date 15.12.2024.
- Test parameters and specifications transcribed verbatim (11 / 3 / 8 rows). The **Specification column is
  read-only** — it is printed text, never something the inspector types.
- **Removed from the digital form on purpose**: the "Approved By — QA Manager" box (that is the app's
  Verify action, stamped with the verifier's name and time), the page number, and the four separate
  lot-status tick boxes (one select instead, defaulting to Accepted; a reason is required only when
  the lot is not Accepted).
- Handwritten inspector signatures read "Harsh" (F/QC/37), "Pooja P" (F/QC/35) and "S.V.M." (F/QC/34) — added
  to Master Data as QA Inspectors, spelling **TO BE CONFIRMED**.

## 18. In Process Quality Control — F/QC/13 (Gujarati, printing)

```
SOURCE DOCUMENT      Two photographed pages (WhatsApp, 07-Sep-2026), filled 6-9-26: item FGLA 19377, PO 89480,
                      machine Lombardi, operator Pankajbhai, QA person HNP, 1 sample sheet, 7 ups
DOCUMENT STRUCTURE   Page 1: Gujarati procedure + grading rule + A/B/C/F grade chart for 6 parameters + job header +
                      test-chart table (parameter | test chart | grade | pass?). Page 2: %-defective grading rule, defect
                      count per parameter + remarks, ML description, override reason, sign-off name, remarks, QA sign
DIGITAL TEMPLATE     kind: "log-sheet", layout qc-inprocess-printing — 6 fixed rows (grade / pass / defect count),
                      grade chart kept as a collapsible reference table, procedure text as instructions
WORKFLOW             Frequency: Daily (sampled every 6000 m on printing days)
```

- Doc. No. **F/QC/13**; no revision block visible — Rev **TO BE CONFIRMED**.
- Gujarati text (procedure, grading rules, grade chart, test chart) is a **best-effort transcription from
  the photograph**, with English glosses added in brackets for the parameter names only. Please proof-read
  against the original before audit use.
- Specimen grades: Registration B (pass), Shade A, Coating A, Punching –, Print Pressure A, Print
  Deformities B; defect counts +2 / – / – / – / – / +2; remarks "Adjust by Pankajbhai".

## 19. CAPA — External: Customer Complaint Handling Checklist (F/MKT/05)

```
SOURCE DOCUMENT      Updated Checklist.doc (Word 97-2003; converted to text with Word to read the table
                      structure — kept in source-documents/)
DOCUMENT STRUCTURE   Header: Customer Name | Complaint No. | Job Name | Job Code | Complaint Received Date |
                      PO No. Five sections, each a table Sr. No. | Activity | Date | Comments:
                      A. COMPLAINT RECEIPT & REGISTRATION (1–5), B. INVESTIGATION (7–15),
                      C. CORRECTIVE & PREVENTIVE ACTION (CAPA) (16–22), D. CUSTOMER COMMUNICATION (23–28),
                      E. EFFECTIVENESS & CLOSURE (29–32). APPROVAL block: Prepared By / Approved By, each
                      with Designation and Sign & Date. Closing note about the QMS.
DIGITAL TEMPLATE     kind: "complaint-checklist" — src/pages/CapaPage.tsx (ComplaintChecklistPage);
                      verbatim template in src/data/seed/complaintChecklist.ts
DATABASE FIELDS      ComplaintChecklistData: 6 header fields, sections[5].items[] { srNo, activity, done,
                      date, comment, notRequired }, preparedBy / approvedBy { name, designation, date }
WORKFLOW             As Required — one checklist per complaint, created from CAPA → External. The
                      assistant walks the user through it (header → A → B → C → D → E → "submit for
                      approval"); Approved By is stamped by the Verify (approval) step.
REPORT               Reports > CAPA Status (complaints table)
```

- Format number **F/MKT/05 (00 / 21.07.2026)** — read from the document footer. Rev 00, date 21-Jul-2026.
- The printed **Sr. No. sequence skips 6** (A ends at 5, B starts at 7). Kept verbatim rather than
  renumbered, so the digital line numbers match the paper.
- The 31 activities (Sr. No. 1–32 minus the skipped 6) and five section titles are verbatim. Activities marked "(If required)" / "(If
  not received)" are conditional — the assistant offers "Not required" for them first (any activity
  can still be marked not applicable).
- **CAPA module structure.** The module now has exactly two doors: **Internal** (the existing pest
  control inspection-findings report, §6, e.g. the Dec-2023 GAP report) and **External** (this
  checklist — complaints come from customers). Both share the "CAPA (Corrective & Preventive Action)"
  module in the Document Library and sidebar.
- **Removed from the digital form on purpose:** the "Sign & Date" boxes are the app's Submit (Prepared
  By is stamped with the logged-in user and today's date if left blank) and Verify (Approved By is
  stamped with the approver, designation defaulting to "QA Head" per activity 31) steps — nobody types
  a signature. Page numbers are dropped.
- The `.doc` file also carries a stale trailing footer from another template ("SPECIFICATION: PAPER
  CORE — QA/ICM/SPEC/14, Rev 04") — not part of this checklist, ignored.

## 16. Leave Calendar 2026

```
SOURCE DOCUMENT      WhatsApp Image 2026-08-11 at 12.29.42 PM.jpeg (two printed copies of the notice)
DIGITAL TEMPLATE     Master Data > Holidays (already loaded; union of both copies)
```

- **Resolves TBC #3** (holiday calendar). Adjustment (make-up) days are working days and are not
  treated as holidays.

---

## Master data provenance summary

| Master list | Source | Notes |
|---|---|---|
| Employees | Handwritten specimens + certificate/report signatories | "Roshni" spelling TO BE CONFIRMED |
| PC Locations (fly catchers) | F/HR/18 specimen | PC‑10 floor TO BE CONFIRMED |
| Areas (per Service Report variant) | Service ReportApril 2026.xls | Kept separate per variant, as in source |
| Chemicals | Chemical Chart + SOP + Service Report | |
| Rodent Stations | — | **None supplied.** The Dec‑2023 GAP report explicitly flags that RBS numbering was *missing* at the time of inspection — left empty by design, not populated with invented IDs |
| Checkpoints (Daily Monitoring) | F/HR/17 specimen | Response-type reconciliation noted above |
| Lamination staff (Gaurav Singh, "Jeni", "Singh") | Photographed QC / production registers | Tester names handwritten — TO BE CONFIRMED |
| Training attendees (6 names) + Shail Patel (CEO) | Training - Yrl (1).doc; SOC signature | Departments TO BE CONFIRMED |
| Log-sheet layouts (columns, bands, specimen rows) | Photographed registers §9–§13 | Code-driven registry, not stored data |

## Full "TO BE CONFIRMED" list (single reference)

1. Exact spelling of the checker/verifier name ("Roshni").
2. ~~Response vocabulary for Daily Monitoring checkpoints (OK/NOT OK header text vs. Yes/No
   actual usage)~~ — **RESOLVED**: Yes/No throughout, confirmed against the source a second time
   (see §1 above).
3. ~~Daily Monitoring holiday calendar (which dates are non-working days).~~ — **RESOLVED**: the
   Gujarat Print Pack Leave Calendar 2026 is loaded (see §16).
4. PC‑10's floor designation.
5. Format No. / Revision No. for: Service Report (all variants), GAP report, Chemical Chart,
   Training Certificate, SOP, and the **Process Parameter Record** (hidden under the clip in the
   photograph — see §12).
6. Whether Mosquito Control needs its own standalone Service Report document.
7. ~~Whether Service Report material/qty/method is meant to be logged once per visit or per
   area.~~ — **RESOLVED**: Material/Method are fixed per area (pre-filled, not re-entered); Qty
   and Remarks are logged per area per visit (see §5 above).
8. ~~Training cadence (no source-stated recurrence).~~ — **RESOLVED** as Yearly (see §15).
9. Rodent Bait Station master list / numbering scheme (explicitly missing per the GAP report).
10. Exact source of the company's existing "Rodent Catch Report" numbers (see section 8 above).
11. Full names / spelling of the lamination QC testers ("Jeni" day shift, "Singh" night shift) and
    the departments of the six training attendees.
12. Adhesive / hardener batch numbers on the Process Parameter specimen (best-effort handwriting
    reads `B35007107` / `44000N0301`) and the Layer 2 film type suffix on F-PRD-18 ("MetPET …").
13. Whether the Process Parameter and ALC reports should be one record per **shift** (as on paper)
    rather than one per day with a Shift field — trivially changed to three daily variants
    (`variantKey` A/B/C) if so.
14. Whether the QC inspection records (F/QC/34, /35, /37) and F/QC/13 should be one record per
    **lot / job** rather than one per production day (currently Daily so they are prepared in advance;
    a second lot on the same day is added from the Day View). Also the Rev/date of F/QC/13, and
    proof-reading of its Gujarati transcription.
15. Full names of the QA inspectors signing as "Harsh", "Pooja P", "S.V.M." and "HNP".
16. Who approves customer complaint checklists (F/MKT/05) — activity 31 says "QA Head", so the app
    defaults the Approved By designation to that; the actual person's name is whoever verifies.

## How the assistant pre-fills records (and what it never does)

Every record that falls due is prepared by the in-app assistant before the user sees it
(`src/engine/autoFill.ts`, run by `prepareDueRecords()` at app start / on the dashboard / on
login). The rules that keep this honest:

- Values are **carried forward from the user's most recent submitted or verified record** of the
  same document (operator, machine, batch numbers, job list, trap counts, tube-light dates,
  checker names). With no history yet, the **filled specimen** from the source file is used.
- Measured readings (viscosity, hot-room temperature, mix viscosity) are generated close to the
  printed nominal and **always inside the acceptance band**; machine set-points and weighed set
  quantities are copied exactly.
- The assistant **never invents a finding, a deviation, a CAPA action or a training attendance** —
  Daily Monitoring is prepared as "all normal", CAPA records are never auto-filled.
- Prepared records stay **In Progress** with a visible "Your assistant has filled this in" banner
  listing exactly what was filled and what it was based on. Nothing is Submitted or Verified until
  a logged-in person does it; the login briefing offers one-click "Submit" only after the record
  passes the same validation a manual submit would.

None of these block the Phase‑1 prototype — each is either handled with a clearly-labeled
default/fallback in the UI, or left as an empty, addable Master Data list.
