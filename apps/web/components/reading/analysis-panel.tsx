import type {
  InterpretationHistoryItem,
  QuestionThreadItem,
} from "../../lib/reading-studio-types";
import { InterpretationsList } from "./interpretations-list";
import { ThreadsList } from "./threads-list";

export type RightPanelTab = "threads" | "interpretations";

interface AnalysisPanelProps {
  activeTab: RightPanelTab;
  threads: QuestionThreadItem[];
  interpretations: InterpretationHistoryItem[];
  onTabChange: (nextTab: RightPanelTab) => void;
}

const tabStyles = {
  active: "border-[var(--color-accent)] bg-[var(--color-accent)] text-black",
  inactive:
    "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-muted)] hover:border-white/35 hover:text-[var(--color-ink)]",
};

export function AnalysisPanel({
  activeTab,
  threads,
  interpretations,
  onTabChange,
}: AnalysisPanelProps) {
  return (
    <section aria-label="Reading analysis panels" className="space-y-4">
      <div role="tablist" aria-label="Analysis tabs" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "threads"}
          aria-controls="analysis-tabpanel-threads"
          id="analysis-tab-threads"
          onClick={() => onTabChange("threads")}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            activeTab === "threads" ? tabStyles.active : tabStyles.inactive
          }`}
        >
          Threads
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "interpretations"}
          aria-controls="analysis-tabpanel-interpretations"
          id="analysis-tab-interpretations"
          onClick={() => onTabChange("interpretations")}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            activeTab === "interpretations" ? tabStyles.active : tabStyles.inactive
          }`}
        >
          Interpretations
        </button>
      </div>

      <div
        role="tabpanel"
        id={
          activeTab === "threads"
            ? "analysis-tabpanel-threads"
            : "analysis-tabpanel-interpretations"
        }
        aria-labelledby={
          activeTab === "threads" ? "analysis-tab-threads" : "analysis-tab-interpretations"
        }
      >
        {activeTab === "threads" ? (
          <ThreadsList threads={threads} />
        ) : (
          <InterpretationsList interpretations={interpretations} />
        )}
      </div>
    </section>
  );
}
