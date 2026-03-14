/* TypeScript interfaces matching the backend API schemas */

export interface FunctionMetrics {
  name: string;
  line_start: number;
  line_end: number | null;
  loc: number;
  complexity: number;
  nesting_depth: number;
  parameters: number;
}

export interface CodeSmellResult {
  file: string;
  issue: string;
  function: string | null;
  line: number | null;
  suggestion: string;
}

export interface RefactorSuggestion {
  file: string;
  function: string | null;
  issue: string;
  suggestion: string;
  priority: string;
}

export interface FileMetrics {
  file_path: string;
  language: string;
  loc: number;
  blank_lines: number;
  comment_lines: number;
  num_functions: number;
  num_classes: number;
  cyclomatic_complexity: number;
  max_nesting_depth: number;
  avg_function_length: number;
  max_function_length: number;
  num_imports: number;
  num_branches: number;
  num_loops: number;
  maintainability_index: number;
  risk_score: number;
  risk_level: string;
  bug_risk_probability: number;
  functions: FunctionMetrics[];
  code_smells: CodeSmellResult[];
  refactor_suggestions: RefactorSuggestion[];
}

export interface ProjectOverview {
  total_files: number;
  total_functions: number;
  total_classes: number;
  total_loc: number;
  avg_complexity: number;
  avg_maintainability: number;
  health_score: number;
  languages: Record<string, number>;
}

export interface AnalysisResult {
  analysis_id: string;
  project_name: string;
  overview: ProjectOverview;
  files: FileMetrics[];
  code_smells: CodeSmellResult[];
  refactor_suggestions: RefactorSuggestion[];
  risk_distribution: Record<string, number>;
}
