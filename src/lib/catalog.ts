/**
 * Workflow → task catalog + phase grouping, mirrored from the main app
 * (client/src/lib/workflows.ts + the /workflows page phases) so the admin
 * dashboard's cap tree matches the app's /workflows layout exactly.
 *
 * Models per task come from the backend (`getModels`), keyed by task id — this
 * file only provides the phase/workflow/task structure, descriptions, and the
 * "coming soon" (disabled) flags.
 */
import {
  Activity,
  Cpu,
  Database,
  Dna,
  FileText,
  LineChart,
  ListFilter,
  Microscope,
  Scissors,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface CatalogWorkflow {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  disabled?: boolean;
}

export interface CatalogTask {
  id: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  disabled?: boolean;
}

export interface CatalogPhase {
  title: string;
  subtitle: string;
  workflowIds: string[];
}

export const PHASES: CatalogPhase[] = [
  {
    title: "Discover",
    subtitle: "Build a clearer picture of your target before you invest heavy lab time.",
    workflowIds: ["basic-characterization", "enzyme-discovery", "target-selection"],
  },
  {
    title: "Optimize",
    subtitle: "Explore variants and rankings so you only test what looks most promising.",
    workflowIds: ["protein-engineering"],
  },
  {
    title: "Design",
    subtitle: "Shape new sequences or edits with guidance instead of starting from a blank page.",
    workflowIds: ["protein-design", "crispr-engineering"],
  },
  {
    title: "Validate & scale",
    subtitle: "Move from computer suggestions toward experiments and scale-up you can plan for.",
    workflowIds: ["lab-validation", "process-optimization", "scale-up"],
  },
  {
    title: "Report",
    subtitle: "Summarize what you did and what you learned — for yourself or your team.",
    workflowIds: ["gen-report"],
  },
];

export const WORKFLOWS: Record<string, CatalogWorkflow> = {
  "basic-characterization": { id: "basic-characterization", title: "Basic Characterization", description: "Characterize protein properties and review literature", Icon: FileText },
  "enzyme-discovery": { id: "enzyme-discovery", title: "Enzyme Discovery", description: "Find novel sequences", Icon: Microscope },
  "target-selection": { id: "target-selection", title: "Target Selection", description: "Identify and select target enzymes", Icon: Dna, disabled: true },
  "protein-engineering": { id: "protein-engineering", title: "Protein/enzyme engineering", description: "Improve efficiency, stability, activity, specificity, solubility, and related traits — plus active-learning workflows to prioritize variants and steer directed evolution.", Icon: Cpu },
  "protein-design": { id: "protein-design", title: "Protein/enzyme design", description: "Design new protein or enzyme structures", Icon: Zap },
  "crispr-engineering": { id: "crispr-engineering", title: "CRISPR Engineering", description: "Design CRISPR experiments and guide RNAs", Icon: Scissors, disabled: true },
  "lab-validation": { id: "lab-validation", title: "Lab Validation", description: "Validate predictions experimentally", Icon: Activity, disabled: true },
  "process-optimization": { id: "process-optimization", title: "Process Optimization", description: "Optimize production processes", Icon: ListFilter, disabled: true },
  "scale-up": { id: "scale-up", title: "Scale-up", description: "Scale production to industrial levels", Icon: Database, disabled: true },
  "gen-report": { id: "gen-report", title: "Generate Report", description: "Create scientific reports from your work", Icon: FileText },
};

export const TASKS_BY_WORKFLOW: Record<string, CatalogTask[]> = {
  "target-selection": [
    { id: "genome-annotation", title: "Genome Annotation", desc: "Map functional regions", Icon: Dna },
    { id: "protein-finder", title: "Protein Finder", desc: "Identify proteins", Icon: Dna },
    { id: "literature-search", title: "Literature Search", desc: "Search scientific literature", Icon: FileText },
  ],
  "basic-characterization": [
    { id: "protein-profile", title: "Get Protein Profile", desc: "Build profile from Uniprot", Icon: Activity },
    { id: "fetch-structure", title: "Fetch Structure", desc: "Fetch PDB from profile or by PDB ID", Icon: Database },
    { id: "predict-structure", title: "Predict Structure", desc: "Predict 3D structure from sequence with OmegaFold", Icon: Cpu },
    { id: "literature-review", title: "Literature Review", desc: "Build profile from literature", Icon: FileText },
  ],
  "enzyme-discovery": [
    { id: "enzyme-annotation", title: "Enzyme Annotation", desc: "Predict EC numbers from proteome", Icon: Activity },
    { id: "reaction-to-enzyme", title: "Reaction to Enzyme", desc: "Recommend enzymes for a target reaction", Icon: Zap },
  ],
  "protein-engineering": [
    { id: "predict-mutation", title: "Predict, Scan, Rank", desc: "Score mutations you supply, or scan & rank every single mutation across the protein", Icon: Zap },
    { id: "learn-and-predict", title: "Predict and Learn", desc: "ALDE active-learning rounds, or MULTI-evolve (zero-shot + multi-mutant ensemble)", Icon: Zap },
    { id: "plot-fitness-predictions", title: "Visualize Data", desc: "Fitness predictions (scatter / histogram), or round-by-round Predict-and-Learn progress", Icon: LineChart },
  ],
  "protein-design": [
    { id: "binder-design", title: "Binder Design", desc: "RFdiffusion + ProteinMPNN — generate new backbones and design sequences for each", Icon: Zap },
    { id: "sequence-redesign", title: "Sequence Redesign", desc: "ProteinMPNN — design sequences for a backbone you already have", Icon: Zap },
    { id: "enzyme-design", title: "Enzyme Design", desc: "RFdiffusion2 — atom-level scaffolding around an active site or ligand geometry", Icon: Zap, disabled: true },
    { id: "generate-protein", title: "Generate Proteins (deprecated)", desc: "Use Enzyme Design instead — same RFdiffusion2 model.", Icon: Zap, disabled: true },
  ],
  "lab-validation": [],
  "process-optimization": [
    { id: "optimize-parameters", title: "Optimize Parameters", desc: "Optimize process parameters", Icon: ListFilter },
  ],
  "scale-up": [],
  "crispr-engineering": [
    { id: "get-gene-sequence", title: "Get Gene Sequence", desc: "Fetch gene sequence from NCBI based on protein and organism", Icon: Dna },
    { id: "plan-experiment", title: "Plan Experiment", desc: "Design CRISPR experiments with expert guidance", Icon: FileText },
    { id: "design-guide-rnas", title: "Design Guide RNAs", desc: "Generate guide RNAs and HDR templates for mutations", Icon: Scissors },
  ],
  "gen-report": [
    { id: "gen-report", title: "Generate Report", desc: "Generate structured report", Icon: FileText },
  ],
};
