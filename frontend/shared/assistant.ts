export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantStudyMode = "standard" | "focus" | "weak_review" | "fast_drill";

export type AssistantAction =
  | {
      type: "navigate";
      target: "dashboard" | "kits" | "progress" | "help" | "settings" | "create" | "assistant";
    }
  | {
      type: "open_help_topic";
      topic: "streaks" | "general";
    }
  | {
      type: "open_kit";
      sourceId: string;
      destination: "review" | "study-mode";
    }
  | {
      type: "create_kit";
      title: string;
      content: string;
      visibility: "private" | "public";
    };

export type AssistantRequest = {
  messages: AssistantMessage[];
  routeContext: {
    currentTab: string;
    currentKitId: string | null;
  };
};

export type AssistantResponse = {
  message: string;
  action: AssistantAction | null;
  suggestions: string[];
  assistantName: "Juno";
  usedModel: boolean;
};

export type AssistantProgressSnapshot = {
  totals: {
    sources: number;
    questions: number;
    sessions: number;
    attempts: number;
  };
  recommendation: {
    headline: string;
    summary: string;
    actionType: "create_kit" | "open_kits" | "review_weak_kit";
    sourceId: string | null;
    mode: AssistantStudyMode | null;
  } | null;
};
