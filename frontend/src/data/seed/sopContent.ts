// Standard Operating Procedure for Pest Control Services — structured
// verbatim-as-possible from the source .docx. Reference-only; not rewritten
// beyond light formatting for on-screen readability.
export interface SopSection {
  title: string;
  chemicals: string;
  process: string;
  logSheet: string;
  preventiveMeasures: string;
  frequency: string;
}

export const SOP_SECTIONS: SopSection[] = [
  {
    title: "1. General Pest Control (Cockroaches, Ants & Crawling Insects)",
    chemicals:
      "Maxforce gel – Ready-to-use (RTU) gel. Kothrine (Deltamethrin 2.5% SC) – 25 ml/Sq.Mt. Deltamethrin 2.5% + D-trans Allethrin 2% – 25-50 ml/Sq.Mt. Responsar (Beta-Cyfluthrin 2.45% SC) – 20ml / 1 litre of water.",
    process:
      "A. General Spray — spraying of chemical emulsion at the skirting level, external perimeter wall of the building, manholes and sewers, toilets, common areas. B. Gel Application — micro application of gel formulation at cockroach hide-outs, where the area is not cleaned or washed, in canteen and pantry locations.",
    logSheet: "Job sheet shall maintain details of areas and chemicals with timings.",
    preventiveMeasures:
      "For this treatment to be effective, an integrated approach — involving housekeeping, engineering & maintenance staff — is necessary. Suggested/evaluated during audit inspection.",
    frequency: "TO BE CONFIRMED (service report specimens observed at fortnightly cadence)",
  },
  {
    title: "2. Rodent Control Service (Rat, Mice & Bandicoots)",
    chemicals:
      "Bromadiolone 0.005% a.i. (RTU formulation – Wax blocks), Non-chemical based glue pads, Bait trays, Tamper Proof Bait Stations.",
    process:
      "1st Line of Defense: around the compound wall of factory premises with Bromadiolone cake or chemically treated granules. 2nd Line of Defense: around the external perimeter wall of each building with Bromadiolone cake. 3rd Line of Defense: inside the premises with non-chemical based glue trap.",
    logSheet:
      "Drawing of placement of rodent bait station and glue traps will be maintained. An individual rodent bait station / glue board trap log sheet will be maintained to track rodent activity.",
    preventiveMeasures:
      "Suggested/evaluated during audit inspection. Effective control requires preventive/rodent-proofing measures: good sanitation, daily garbage pickup, proper storage indoor and outdoor, reduced outdoor harborage, removal of weeds/old equipment/scrap, rodent proofing, etc.",
    frequency: "TO BE CONFIRMED (service report specimens observed at fortnightly cadence)",
  },
  {
    title: "3. Fly Control Service (House Fly, Drain Fly, Fruit Fly)",
    chemicals: "Kothrine (Deltamethrin 2.5% SC) – 25 ml/Sq.Mt. Responsar (Beta-Cyfluthrin 2.45% SC) – 20ml / 1 litre of water.",
    process:
      "For control of houseflies, flesh flies, etc. (which may spread conjunctivitis, poliomyelitis, typhoid fever, tuberculosis, anthrax, diarrhea). Treatment decided per surrounding conditions; based on preventive control of breeding points within the compound. No pesticide/space/residual sprays used inside sensitive areas (production, FG, packing). Water-based space sprays / residual insecticide (govt.-permitted) applied outdoors; all breeding places, external periphery and sewers/drains treated.",
    logSheet: "Job sheet shall maintain details of areas and chemicals with timings.",
    preventiveMeasures:
      "Reliance on insecticide alone often fails to give long-term control. Constant effort to eliminate and dry out breeding sites; periodic habitat alteration recommended.",
    frequency: "TO BE CONFIRMED (service report specimens observed at fortnightly cadence)",
  },
  {
    title: "4. Mosquito Control Services (Mosquitoes)",
    chemicals: "Kothrine (Deltamethrin 2.5% SC) – 25 ml/Sq.Mt. Responsar (Beta-Cyfluthrin 2.45% SC) – 20ml / 1 litre of water.",
    process:
      "Integrated pest control program — chemical measures alone are not a substitute for other measures. Incidence highest during monsoon; regular spraying/fogging recommended around the factory building throughout the year. Chemical sprayed at the external perimeter. Installation of Insectocutor machines recommended in Production and other areas given agricultural surroundings.",
    logSheet: "Job sheet shall maintain details of areas and chemicals with timings.",
    preventiveMeasures: "Stagnant water removed periodically; sanitary/cleaning activity maintained regularly to control breeding/harborage.",
    frequency: "TO BE CONFIRMED — no standalone service report specimen supplied; Chemical Chart groups Mosquito Control with Fly Control Service.",
  },
  {
    title: "5. Lizard Control Services (House Lizard)",
    chemicals: "Kothrine (Deltamethrin 2.5% SC) – 25 ml/Sq.Mt. Responsar (Beta-Cyfluthrin 2.45% SC) – 20ml / 1 litre of water.",
    process:
      "Lizards (geckos) are active primarily during daylight and move indoors in early evening/morning seeking insects attracted to light. They feed on insects and spiders, especially ants. Treatment targets live lizards, confined to non-production areas; physical control used in production areas.",
    logSheet: "Log sheet as required, with details of date and timing etc.",
    preventiveMeasures:
      "Limit open doors/windows especially at ground level; sticky traps around doors/windows; reduce outdoor/indoor lighting at night; reduce surrounding vegetation.",
    frequency: "Quarterly (explicitly stated in source: \"recommended is quarterly however it may depend upon the local situation and may vary from place to place\").",
  },
];
