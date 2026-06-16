import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  bulkCreateQuestions,
  createTest,
  fetchBulkQuestions,
  getTestById,
  getSubjects,
  getSubTopicsByTopic,
  getTopicsBySubject,
  publishTest,
  updateTest,
  type Subject,
  type SubTopic,
  type BulkQuestionPayload,
  type TestPayload,
  type Topic,
} from "../api/tests";
import { useAuthStore } from "../store/authStore";

type TestSummaryState = {
  type: string;
  subjectId?: string;
  subject: string;
  topicId?: string;
  topic: string;
  subTopicId?: string;
  subTopic: string;
  difficulty: string;
  totalTime: number;
  totalMarks: number;
  totalQuestions: number;
  correctMarks?: number;
  wrongMarks?: number;
  unattemptMarks?: number;
};

type QuestionDraft = {
  questionText: string;
  questionOptions: string[];
  correctOption: BulkQuestionPayload["questions"][number]["correct_option"];
  explanation: string;
  questionTextAlign: "left" | "center" | "right";
  questionDifficulty: string;
  questionTopicId: string;
  questionSubTopicId: string;
};

type StoredQuestionState = {
  activeQuestionNumber: number;
  questionDrafts: Record<number, QuestionDraft>;
  savedQuestionIds: Record<number, string>;
};

const createEmptyQuestionDraft = (defaults?: {
  topicId?: string;
  subTopicId?: string;
  difficulty?: string;
}): QuestionDraft => ({
  questionText: "",
  questionOptions: ["", "", "", ""],
  correctOption: "option1",
  explanation: "",
  questionTextAlign: "left",
  questionDifficulty: defaults?.difficulty ?? "easy",
  questionTopicId: defaults?.topicId ?? "",
  questionSubTopicId: defaults?.subTopicId ?? "",
});

const getStoredTestSummary = (): TestSummaryState => {
  const storedSummary = sessionStorage.getItem(
    "preproute-current-test-summary",
  );

  if (storedSummary) {
    try {
      return JSON.parse(storedSummary) as TestSummaryState;
    } catch {
      sessionStorage.removeItem("preproute-current-test-summary");
    }
  }

  return {
    type: "Chapter Wise",
    subject: "Subject",
    topic: "Topic",
    subTopic: "Sub Topic",
    difficulty: "easy",
    totalTime: 60,
    totalMarks: 250,
    totalQuestions: 50,
  };
};

const getQuestionStorageKey = (testId: string) =>
  `preproute-question-state-${testId}`;

const getStoredQuestionState = (testId: string): StoredQuestionState => {
  if (!testId) {
    return {
      activeQuestionNumber: 1,
      questionDrafts: {},
      savedQuestionIds: {},
    };
  }

  const storedQuestionState = sessionStorage.getItem(
    getQuestionStorageKey(testId),
  );

  if (storedQuestionState) {
    try {
      return JSON.parse(storedQuestionState) as StoredQuestionState;
    } catch {
      sessionStorage.removeItem(getQuestionStorageKey(testId));
    }
  }

  return {
    activeQuestionNumber: 1,
    questionDrafts: {},
    savedQuestionIds: {},
  };
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [selectedTestType, setSelectedTestType] = useState("chapterwise");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedSubTopicId, setSelectedSubTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [formStatus, setFormStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTestId, setCurrentTestId] = useState(
    () => sessionStorage.getItem("preproute-current-test-id") ?? "",
  );
  const [currentTestName, setCurrentTestName] = useState(
    () =>
      sessionStorage.getItem("preproute-current-test-name") ?? "Sample Test",
  );
  const [currentTestSummary, setCurrentTestSummary] =
    useState<TestSummaryState>(getStoredTestSummary);
  const initialQuestionState = getStoredQuestionState(currentTestId);
  const initialQuestionDraft =
    initialQuestionState.questionDrafts[
      initialQuestionState.activeQuestionNumber
    ] ??
    createEmptyQuestionDraft({
      topicId: currentTestSummary.topicId,
      subTopicId: currentTestSummary.subTopicId,
      difficulty: currentTestSummary.difficulty,
    });
  const [questionText, setQuestionText] = useState(
    initialQuestionDraft.questionText,
  );
  const [questionOptions, setQuestionOptions] = useState(
    initialQuestionDraft.questionOptions,
  );
  const [correctOption, setCorrectOption] = useState<
    BulkQuestionPayload["questions"][number]["correct_option"]
  >(initialQuestionDraft.correctOption);
  const [explanation, setExplanation] = useState(
    initialQuestionDraft.explanation,
  );
  const [questionTextAlign, setQuestionTextAlign] = useState<
    "left" | "center" | "right"
  >(initialQuestionDraft.questionTextAlign);
  const [questionDifficulty, setQuestionDifficulty] = useState(
    initialQuestionDraft.questionDifficulty,
  );
  const [questionTopicId, setQuestionTopicId] = useState(
    initialQuestionDraft.questionTopicId,
  );
  const [questionSubTopicId, setQuestionSubTopicId] = useState(
    initialQuestionDraft.questionSubTopicId,
  );
  const [questionStatus, setQuestionStatus] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [activeQuestionNumber, setActiveQuestionNumber] = useState(
    initialQuestionState.activeQuestionNumber,
  );
  const [questionDrafts, setQuestionDrafts] = useState<
    Record<number, QuestionDraft>
  >(initialQuestionState.questionDrafts);
  const [savedQuestionIds, setSavedQuestionIds] = useState<
    Record<number, string>
  >(initialQuestionState.savedQuestionIds);
  const [questionNotice, setQuestionNotice] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormStatus, setEditFormStatus] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [isUpdatingTest, setIsUpdatingTest] = useState(false);
  const [editTestType, setEditTestType] = useState(selectedTestType);
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editTopicId, setEditTopicId] = useState("");
  const [editSubTopicId, setEditSubTopicId] = useState("");
  const [editTopics, setEditTopics] = useState<Topic[]>([]);
  const [editSubTopics, setEditSubTopics] = useState<SubTopic[]>([]);
  const [editDifficulty, setEditDifficulty] = useState("easy");
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [liveUntil, setLiveUntil] = useState("custom");
  const [schedulePublishDate, setSchedulePublishDate] = useState("");
  const [schedulePublishTime, setSchedulePublishTime] = useState("");
  const [publishEndDate, setPublishEndDate] = useState("");
  const [publishEndTime, setPublishEndTime] = useState("");
  const [publishError, setPublishError] = useState("");
  const [publishStatus, setPublishStatus] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingSavedQuestion, setIsEditingSavedQuestion] = useState(false);
  const questionNoticeTimeoutRef = useRef<number | null>(null);
  const questionEditorRef = useRef<HTMLDivElement | null>(null);
  const questionEditorSectionRef = useRef<HTMLDivElement | null>(null);
  const publishConfirmationRef = useRef<HTMLElement | null>(null);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const userId = (user?.userId as string | undefined) ?? "vedant-admin";
  const [selectedMenu, setSelectedMenu] = useState<
    "dashboard" | "test-creation" | "tracking"
  >("test-creation");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isTestCreation = location.pathname.startsWith("/test-creation");
  const isQuestionCreation = location.pathname === "/test-creation/questions";
  const plannedQuestionCount = Math.max(
    1,
    currentTestSummary.totalQuestions || 1,
  );
  const savedQuestionCount = Object.keys(savedQuestionIds).length;
  const areAllQuestionsSaved = savedQuestionCount >= plannedQuestionCount;
  const isQuestionDraftFilled = (draft?: QuestionDraft) =>
    Boolean(draft?.questionText?.trim()) &&
    (draft?.questionOptions ?? []).every((opt) => opt.trim() !== "");
  let filledUpToNumber = 0;
  for (let i = 1; i <= plannedQuestionCount; i++) {
    if (isQuestionDraftFilled(questionDrafts[i]) || savedQuestionIds[i]) {
      filledUpToNumber = i;
    } else break;
  }
  const nextFillableNumber = Math.min(
    filledUpToNumber + 1,
    plannedQuestionCount,
  );
  const questionListLabels = Array.from(
    { length: plannedQuestionCount },
    (_, index) => `Question ${index + 1}`,
  );
  const publishTimeOptions = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ];
  const defaultQuestionDraft = () =>
    createEmptyQuestionDraft({
      topicId: currentTestSummary.topicId ?? selectedTopicId,
      subTopicId: currentTestSummary.subTopicId ?? selectedSubTopicId,
      difficulty: currentTestSummary.difficulty,
    });
  const questionTopicOptions =
    topics.length > 0
      ? topics
      : currentTestSummary.topicId
        ? [
            {
              id: currentTestSummary.topicId,
              name: currentTestSummary.topic,
              subject_id: currentTestSummary.subjectId ?? "",
            },
          ]
        : [];
  const questionSubTopicOptions =
    subTopics.length > 0
      ? subTopics
      : currentTestSummary.subTopicId
        ? [
            {
              id: currentTestSummary.subTopicId,
              name: currentTestSummary.subTopic,
              topic_id: currentTestSummary.topicId ?? "",
            },
          ]
        : [];
  const editTopicOptions =
    editTopics.length > 0
      ? editTopics
      : currentTestSummary.topicId
        ? [
            {
              id: currentTestSummary.topicId,
              name: currentTestSummary.topic,
              subject_id: currentTestSummary.subjectId ?? "",
            },
          ]
        : [];
  const editSubTopicOptions =
    editSubTopics.length > 0
      ? editSubTopics
      : currentTestSummary.subTopicId
        ? [
            {
              id: currentTestSummary.subTopicId,
              name: currentTestSummary.subTopic,
              topic_id: currentTestSummary.topicId ?? "",
            },
          ]
        : [];

  useEffect(() => {
    let isMounted = true;

    getSubjects()
      .then((nextSubjects) => {
        if (isMounted) {
          setSubjects(nextSubjects);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFormError("Unable to load subjects.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!selectedSubjectId) {
      return () => {
        isMounted = false;
      };
    }

    getTopicsBySubject(selectedSubjectId)
      .then((nextTopics) => {
        if (isMounted) {
          setTopics(nextTopics);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFormError("Unable to load topics.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSubjectId]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedTopicId) {
      return () => {
        isMounted = false;
      };
    }

    getSubTopicsByTopic(selectedTopicId)
      .then((nextSubTopics) => {
        if (isMounted) {
          setSubTopics(nextSubTopics);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFormError("Unable to load sub-topics.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTopicId]);

  useEffect(() => {
    let isMounted = true;

    if (!isEditModalOpen || !editSubjectId) {
      return () => {
        isMounted = false;
      };
    }

    getTopicsBySubject(editSubjectId)
      .then((nextTopics) => {
        if (isMounted) {
          setEditTopics(nextTopics);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEditFormError("Unable to load topics.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [editSubjectId, isEditModalOpen]);

  useEffect(() => {
    let isMounted = true;

    if (!isEditModalOpen || !editTopicId) {
      return () => {
        isMounted = false;
      };
    }

    getSubTopicsByTopic(editTopicId)
      .then((nextSubTopics) => {
        if (isMounted) {
          setEditSubTopics(nextSubTopics);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEditFormError("Unable to load sub-topics.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [editTopicId, isEditModalOpen]);

  useEffect(() => {
    if (!isQuestionCreation || !currentTestId) {
      return;
    }

    let isMounted = true;
    const hasStoredTestSummary = Boolean(
      sessionStorage.getItem("preproute-current-test-summary"),
    );
    const hasStoredQuestionState = Boolean(
      sessionStorage.getItem(getQuestionStorageKey(currentTestId)),
    );

    getTestById(currentTestId)
      .then(async (response) => {
        if (!isMounted || response.status !== "success") return;
        const d = response.data;
        if (d.name) setCurrentTestName(d.name);
        setCurrentTestSummary((prev) => ({
          ...prev,
          type: d.type ? getTestTypeLabel(d.type) : prev.type,
          difficulty: d.difficulty ?? prev.difficulty,
          totalTime: d.total_time ?? prev.totalTime,
          totalMarks: d.total_marks ?? prev.totalMarks,
          totalQuestions: hasStoredTestSummary
            ? prev.totalQuestions
            : d.total_questions ?? prev.totalQuestions,
          correctMarks: d.correct_marks ?? prev.correctMarks,
          wrongMarks: d.wrong_marks ?? prev.wrongMarks,
          unattemptMarks: d.unattempt_marks ?? prev.unattemptMarks,
        }));

        // Fetch existing questions when editing from the list (no local draft state)
        if (!hasStoredQuestionState && d.questions && d.questions.length > 0) {
          const questionIds = d.questions.filter(Boolean) as string[];
          const fetched = await fetchBulkQuestions(questionIds);
          if (!isMounted) return;

          const topicId = d.topics?.[0] ?? "";
          const subTopicId = d.sub_topics?.[0] ?? "";
          const newDrafts: Record<number, QuestionDraft> = {};
          const newSavedIds: Record<number, string> = {};

          fetched.forEach((q, i) => {
            newDrafts[i + 1] = {
              questionText: q.question,
              questionOptions: [q.option1, q.option2, q.option3, q.option4],
              correctOption: q.correct_option,
              explanation: q.explanation,
              questionTextAlign: "left",
              questionDifficulty: q.difficulty,
              questionTopicId: topicId,
              questionSubTopicId: subTopicId,
            };
            newSavedIds[i + 1] = q.id;
          });

          setQuestionDrafts(newDrafts);
          setSavedQuestionIds(newSavedIds);
          applyQuestionDraft(newDrafts[1] ?? defaultQuestionDraft());
        }
      })
      .catch(() => {
        if (isMounted) setQuestionError("Unable to load test details.");
      });

    return () => {
      isMounted = false;
    };
  }, [currentTestId, isQuestionCreation]);

  useEffect(() => {
    if (!isQuestionCreation) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (
        questionEditorRef.current &&
        questionEditorRef.current.innerHTML !== questionText
      ) {
        questionEditorRef.current.innerHTML = questionText;
      }
    });
  }, [activeQuestionNumber, isQuestionCreation, questionText]);

  useEffect(() => {
    if (!isQuestionCreation || !currentTestId) {
      return;
    }

    const currentDraft: QuestionDraft = {
      questionText,
      questionOptions,
      correctOption,
      explanation,
      questionTextAlign,
      questionDifficulty,
      questionTopicId,
      questionSubTopicId,
    };
    const nextQuestionDrafts = {
      ...questionDrafts,
      [activeQuestionNumber]: currentDraft,
    };

    sessionStorage.setItem(
      getQuestionStorageKey(currentTestId),
      JSON.stringify({
        activeQuestionNumber,
        questionDrafts: nextQuestionDrafts,
        savedQuestionIds,
      }),
    );
  }, [
    activeQuestionNumber,
    correctOption,
    currentTestId,
    explanation,
    isQuestionCreation,
    questionDifficulty,
    questionDrafts,
    questionOptions,
    questionSubTopicId,
    questionText,
    questionTextAlign,
    questionTopicId,
    savedQuestionIds,
  ]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedTopicId("");
    setSelectedSubTopicId("");
    setTopics([]);
    setSubTopics([]);
  };

  const handleTopicChange = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSelectedSubTopicId("");
    setSubTopics([]);
  };

  const handleCreateTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormStatus("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const totalTime = Number(formData.get("total_time"));
    const totalMarks = Number(formData.get("total_marks"));
    const totalQuestions = Number(formData.get("total_questions"));

    if (
      !name ||
      !selectedSubjectId ||
      !selectedTopicId ||
      !selectedSubTopicId
    ) {
      setFormError("Please fill test name, subject, topic and sub-topic.");
      return;
    }

    if (!totalTime || !totalMarks || !totalQuestions) {
      setFormError(
        "Please enter duration, total marks and number of questions.",
      );
      return;
    }

    const payload: TestPayload = {
      name,
      type: selectedTestType,
      subject: selectedSubjectId,
      topics: [selectedTopicId],
      sub_topics: [selectedSubTopicId],
      correct_marks: Number(formData.get("correct_marks")),
      wrong_marks: Number(formData.get("wrong_marks")),
      unattempt_marks: Number(formData.get("unattempt_marks")),
      difficulty,
      total_time: totalTime,
      total_marks: totalMarks,
      total_questions: totalQuestions,
      status: "draft",
    };

    setIsSubmitting(true);

    try {
      const response = await createTest(payload);
      if (response.status !== "success") {
        setFormError("Unable to create test.");
        return;
      }

      const testId = response.data.id;
      const selectedSubjectObj = subjects.find(
        (s) => s.id === selectedSubjectId,
      );
      const selectedTopicObj = topics.find((t) => t.id === selectedTopicId);
      const selectedSubTopicObj = subTopics.find(
        (st) => st.id === selectedSubTopicId,
      );
      const nextSummary: TestSummaryState = {
        type: getTestTypeLabel(selectedTestType),
        subjectId: selectedSubjectId,
        subject: selectedSubjectObj?.name ?? selectedSubjectId,
        topicId: selectedTopicId,
        topic: selectedTopicObj?.name ?? selectedTopicId,
        subTopicId: selectedSubTopicId,
        subTopic: selectedSubTopicObj?.name ?? selectedSubTopicId,
        difficulty,
        totalTime,
        totalMarks,
        totalQuestions,
        correctMarks: payload.correct_marks,
        wrongMarks: payload.wrong_marks,
        unattemptMarks: payload.unattempt_marks,
      };
      sessionStorage.setItem("preproute-current-test-id", testId);
      sessionStorage.setItem("preproute-current-test-name", name);
      sessionStorage.setItem(
        "preproute-current-test-summary",
        JSON.stringify(nextSummary),
      );
      setCurrentTestId(testId);
      setCurrentTestName(name);
      setCurrentTestSummary(nextSummary);
      setActiveQuestionNumber(1);
      setQuestionDrafts({});
      setSavedQuestionIds({});
      setQuestionError("");
      setQuestionStatus("");
      setQuestionNotice("");
      setIsEditingSavedQuestion(false);
      applyQuestionDraft(
        createEmptyQuestionDraft({
          topicId: nextSummary.topicId,
          subTopicId: nextSummary.subTopicId,
          difficulty: nextSummary.difficulty,
        }),
      );
      navigate("/test-creation/questions");
    } catch {
      setFormError("Unable to create test.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTestTypeLabel = (type: string) =>
    type === "chapterwise"
      ? "Chapter Wise"
      : type === "pyq"
        ? "PYQ"
        : "Mock Test";

  const openEditTestModal = () => {
    setEditFormError("");
    setEditFormStatus("");
    setEditTestType(
      currentTestSummary.type === "Chapter Wise"
        ? "chapterwise"
        : currentTestSummary.type === "PYQ"
          ? "pyq"
          : "mock",
    );
    setEditSubjectId(currentTestSummary.subjectId ?? selectedSubjectId);
    setEditTopicId(currentTestSummary.topicId ?? selectedTopicId);
    setEditSubTopicId(currentTestSummary.subTopicId ?? selectedSubTopicId);
    setEditTopics([]);
    setEditSubTopics([]);
    setEditDifficulty(currentTestSummary.difficulty);
    setIsEditModalOpen(true);
  };

  const closeEditTestModal = () => {
    if (!isUpdatingTest) {
      setIsEditModalOpen(false);
      setEditFormError("");
      setEditFormStatus("");
    }
  };

  const handleEditSubjectChange = (subjectId: string) => {
    setEditSubjectId(subjectId);
    setEditTopicId("");
    setEditSubTopicId("");
    setEditTopics([]);
    setEditSubTopics([]);
  };

  const handleEditTopicChange = (topicId: string) => {
    setEditTopicId(topicId);
    setEditSubTopicId("");
    setEditSubTopics([]);
  };

  const handleEditTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditFormError("");
    setEditFormStatus("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const totalTime = Number(formData.get("total_time"));
    const totalMarks = Number(formData.get("total_marks"));
    const totalQuestions = Number(formData.get("total_questions"));
    const correctMarks = Number(formData.get("correct_marks"));
    const wrongMarks = Number(formData.get("wrong_marks"));
    const unattemptMarks = Number(formData.get("unattempt_marks"));

    if (!name || !editSubjectId || !editTopicId || !editSubTopicId) {
      setEditFormError("Please fill test name, subject, topic and sub-topic.");
      return;
    }

    if (!totalTime || !totalMarks || !totalQuestions) {
      setEditFormError(
        "Please enter duration, total marks and number of questions.",
      );
      return;
    }

    const selectedSubject = subjects.find(
      (subject) => subject.id === editSubjectId,
    );
    const selectedTopic = editTopicOptions.find(
      (topic) => topic.id === editTopicId,
    );
    const selectedSubTopic = editSubTopicOptions.find(
      (subTopic) => subTopic.id === editSubTopicId,
    );
    const nextSummary: TestSummaryState = {
      type: getTestTypeLabel(editTestType),
      subjectId: editSubjectId,
      subject: selectedSubject?.name ?? editSubjectId,
      topicId: editTopicId,
      topic: selectedTopic?.name ?? editTopicId,
      subTopicId: editSubTopicId,
      subTopic: selectedSubTopic?.name ?? editSubTopicId,
      difficulty: editDifficulty,
      totalTime,
      totalMarks,
      totalQuestions,
      correctMarks,
      wrongMarks,
      unattemptMarks,
    };

    setIsUpdatingTest(true);

    try {
      if (currentTestId) {
        const response = await updateTest(currentTestId, {
          name,
          type: editTestType,
          subject: editSubjectId,
          topics: [editTopicId],
          sub_topics: [editSubTopicId],
          correct_marks: correctMarks,
          wrong_marks: wrongMarks,
          unattempt_marks: unattemptMarks,
          difficulty: editDifficulty,
          total_time: totalTime,
          total_marks: totalMarks,
          total_questions: totalQuestions,
          questions: Object.values(savedQuestionIds),
          status: "draft",
        });

        if (response.status !== "success") {
          setEditFormError("Unable to update test.");
          return;
        }
      }

      setCurrentTestName(name);
      setCurrentTestSummary(nextSummary);
      setSelectedTestType(editTestType);
      setSelectedSubjectId(editSubjectId);
      setSelectedTopicId(editTopicId);
      setSelectedSubTopicId(editSubTopicId);
      setDifficulty(editDifficulty);
      sessionStorage.setItem("preproute-current-test-name", name);
      sessionStorage.setItem(
        "preproute-current-test-summary",
        JSON.stringify(nextSummary),
      );
      setEditFormStatus("Test updated successfully.");
      setIsEditModalOpen(false);
    } catch {
      setEditFormError("Unable to update test.");
    } finally {
      setIsUpdatingTest(false);
    }
  };

  const handleQuestionOptionChange = (index: number, value: string) => {
    setQuestionOptions((nextOptions) =>
      nextOptions.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  };

  const getCurrentQuestionDraft = (): QuestionDraft => ({
    questionText: questionEditorRef.current?.innerHTML ?? questionText,
    questionOptions,
    correctOption,
    explanation,
    questionTextAlign,
    questionDifficulty,
    questionTopicId,
    questionSubTopicId,
  });

  const applyQuestionDraft = (draft: QuestionDraft) => {
    setQuestionText(draft.questionText);
    setQuestionOptions(draft.questionOptions);
    setCorrectOption(draft.correctOption);
    setExplanation(draft.explanation);
    setQuestionTextAlign(draft.questionTextAlign);
    setQuestionDifficulty(draft.questionDifficulty);
    setQuestionTopicId(draft.questionTopicId);
    setQuestionSubTopicId(draft.questionSubTopicId);

    window.requestAnimationFrame(() => {
      if (questionEditorRef.current) {
        questionEditorRef.current.innerHTML = draft.questionText;
      }
    });
  };

  const saveCurrentQuestionDraft = () => {
    const currentDraft = getCurrentQuestionDraft();
    setQuestionDrafts((nextDrafts) => ({
      ...nextDrafts,
      [activeQuestionNumber]: currentDraft,
    }));
    return currentDraft;
  };

  const getQuestionEditorPlainText = () =>
    questionEditorRef.current?.innerText.trim() ?? "";

  const syncQuestionEditorText = () => {
    setQuestionText(questionEditorRef.current?.innerHTML ?? "");
  };

  const runQuestionEditorCommand = (command: string, value?: string) => {
    questionEditorRef.current?.focus();
    document.execCommand(command, false, value);
    syncQuestionEditorText();
  };

  const handleQuestionEditorAction = (
    action:
      | "italic"
      | "bold"
      | "underline"
      | "link"
      | "align"
      | "list"
      | "image"
      | "formula",
  ) => {
    if (action === "align") {
      setQuestionTextAlign((currentAlign) =>
        currentAlign === "left"
          ? "center"
          : currentAlign === "center"
            ? "right"
            : "left",
      );
      questionEditorRef.current?.focus();
      return;
    }

    if (action === "link") {
      const url = window.prompt("Enter link URL");
      if (!url) {
        questionEditorRef.current?.focus();
        return;
      }

      runQuestionEditorCommand("createLink", url);
      return;
    }

    if (action === "image") {
      const url = window.prompt("Enter image URL");
      if (!url) {
        questionEditorRef.current?.focus();
        return;
      }

      runQuestionEditorCommand("insertImage", url);
      return;
    }

    if (action === "list") {
      runQuestionEditorCommand("insertUnorderedList");
      return;
    }

    if (action === "formula") {
      runQuestionEditorCommand(
        "insertHTML",
        '<span class="question-formula">f(x)</span>&nbsp;',
      );
      return;
    }

    runQuestionEditorCommand(action);
  };

  const handleSelectQuestion = (questionNumber: number) => {
    if (questionNumber < 1 || questionNumber > plannedQuestionCount) {
      return;
    }

    if (
      !areAllQuestionsSaved &&
      !isQuestionDraftFilled(questionDrafts[questionNumber]) &&
      questionNumber > nextFillableNumber
    ) {
      return;
    }

    saveCurrentQuestionDraft();
    setActiveQuestionNumber(questionNumber);
    applyQuestionDraft(
      questionDrafts[questionNumber] ?? defaultQuestionDraft(),
    );
    setIsEditingSavedQuestion(areAllQuestionsSaved);
    setQuestionError("");
    setQuestionStatus("");
    setQuestionNotice("");

    if (questionNoticeTimeoutRef.current) {
      window.clearTimeout(questionNoticeTimeoutRef.current);
    }

    if (areAllQuestionsSaved) {
      window.requestAnimationFrame(() => {
        questionEditorSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const handleClearQuestionDrafts = () => {
    setQuestionDrafts({});
    setSavedQuestionIds({});
    setActiveQuestionNumber(1);
    setQuestionError("");
    setQuestionStatus("");
    if (currentTestId) {
      sessionStorage.removeItem(getQuestionStorageKey(currentTestId));
    }
    applyQuestionDraft(defaultQuestionDraft());
  };

  const handleSaveQuestion = async () => {
    setQuestionError("");
    setQuestionStatus("");
    const currentDraft = saveCurrentQuestionDraft();
    const questionPlainText = getQuestionEditorPlainText();

    if (!currentTestId) {
      setQuestionError("Create a test before adding questions.");
      return;
    }

    if (
      !questionPlainText ||
      currentDraft.questionOptions.some((option) => !option.trim())
    ) {
      setQuestionError("Please enter the question and all four options.");
      return;
    }

    // Not the last question — advance locally without calling the API
    if (!areAllQuestionsSaved && activeQuestionNumber < plannedQuestionCount) {
      const nextQuestionNumber = activeQuestionNumber + 1;
      setActiveQuestionNumber(nextQuestionNumber);
      applyQuestionDraft(
        questionDrafts[nextQuestionNumber] ?? defaultQuestionDraft(),
      );
      return;
    }

    // Last question — validate all drafts then call bulk API
    const allDrafts = { ...questionDrafts, [activeQuestionNumber]: currentDraft };
    for (let i = 1; i <= plannedQuestionCount; i++) {
      if (!isQuestionDraftFilled(allDrafts[i])) {
        setQuestionError(
          `Question ${i} is incomplete. Please go back and fill it in.`,
        );
        return;
      }
    }

    setIsSavingQuestion(true);

    try {
      const subjectId = currentTestSummary.subjectId ?? "";
      const questionsPayload = Array.from(
        { length: plannedQuestionCount },
        (_, i) => {
          const draft = allDrafts[i + 1];
          return {
            type: "mcq" as const,
            question: draft.questionText.trim(),
            option1: draft.questionOptions[0].trim(),
            option2: draft.questionOptions[1].trim(),
            option3: draft.questionOptions[2].trim(),
            option4: draft.questionOptions[3].trim(),
            correct_option: draft.correctOption,
            explanation: draft.explanation.trim(),
            difficulty: draft.questionDifficulty,
            test_id: currentTestId,
            subject: subjectId,
          };
        },
      );

      const bulkResponse = await bulkCreateQuestions({
        questions: questionsPayload,
      });

      if (bulkResponse.status !== "success") {
        setQuestionError("Unable to create questions.");
        return;
      }

      const nextSavedIds: Record<number, string> = {};
      bulkResponse.data.forEach((q, i) => {
        nextSavedIds[i + 1] = q.id;
      });

      const updateResponse = await updateTest(currentTestId, {
        name: currentTestName,
        questions: bulkResponse.data.map((q) => q.id),
        total_questions: currentTestSummary.totalQuestions,
        total_marks: currentTestSummary.totalMarks,
      });

      if (updateResponse.status !== "success") {
        setQuestionError("Questions created, but test update failed.");
        return;
      }

      setSavedQuestionIds(nextSavedIds);
      setIsEditingSavedQuestion(false);
      window.requestAnimationFrame(() => {
        publishConfirmationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch {
      setQuestionError("Unable to save questions.");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handlePublishClick = () => {
    if (!areAllQuestionsSaved) {
      setQuestionNotice(
        `Save all ${plannedQuestionCount} questions before publishing.`,
      );

      if (questionNoticeTimeoutRef.current) {
        window.clearTimeout(questionNoticeTimeoutRef.current);
      }

      questionNoticeTimeoutRef.current = window.setTimeout(() => {
        setQuestionNotice("");
      }, 3200);
      return;
    }

    publishConfirmationRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setIsEditingSavedQuestion(false);
  };

  const handleConfirmPublish = async () => {
    setPublishError("");
    setPublishStatus("");

    if (!areAllQuestionsSaved) {
      setPublishError("Complete all questions before publishing.");
      return;
    }

    if (
      publishMode === "schedule" &&
      (!schedulePublishDate || !schedulePublishTime)
    ) {
      setPublishError("Select the scheduled date and time.");
      return;
    }

    if (liveUntil === "custom" && (!publishEndDate || !publishEndTime)) {
      setPublishError("Select the custom end date and time.");
      return;
    }

    setIsPublishing(true);

    try {
      if (currentTestId) {
        const response = await publishTest(currentTestId);

        if (response.status !== "success") {
          setPublishError("Unable to publish test.");
          return;
        }

        sessionStorage.removeItem("preproute-current-test-id");
        sessionStorage.removeItem("preproute-current-test-name");
        sessionStorage.removeItem("preproute-current-test-summary");
        sessionStorage.removeItem(
          `preproute-question-state-${currentTestId}`,
        );
      }

      navigate("/dashboard");
    } catch {
      setPublishError("Unable to publish test.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isQuestionCreation) {
    return (
      <main className="question-creation-shell">
        {isSidebarOpen && (
          <div
            className="sidebar-overlay sidebar-open"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`question-left-panel${isSidebarOpen ? " sidebar-open" : ""}`}
          aria-label="Question creation navigation"
        >
          <div className="question-logo-block">
            <img src="/logo.png" alt="PrepRoute logo" />
          </div>
          <div className="question-sidebar-body">
            <nav className="question-icon-rail" aria-label="Question tools" />
            <section className="question-list-panel">
              <div className="question-list-heading">
                <span>Question creation</span>
                <button type="button" aria-label="Collapse question list">
                  <img src="/leftarr.jpeg" alt="" aria-hidden="true" />
                </button>
              </div>
              <p>Total Questions . {plannedQuestionCount}</p>
              <div className="question-list-items">
                {questionListLabels.map((label, index) => {
                  const questionNumber = index + 1;
                  const isFilled =
                    isQuestionDraftFilled(questionDrafts[questionNumber]) ||
                    Boolean(savedQuestionIds[questionNumber]);
                  const isDisabled =
                    !areAllQuestionsSaved &&
                    !isFilled &&
                    questionNumber > nextFillableNumber;

                  return (
                    <button
                      key={`${label}-${index}`}
                      type="button"
                      className={[
                        activeQuestionNumber === questionNumber ? "active" : "",
                        isFilled ? "saved" : "",
                        isDisabled ? "disabled" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={isDisabled}
                      onClick={() => handleSelectQuestion(questionNumber)}
                    >
                      <span className="question-list-label">
                        <img
                          src={isFilled ? "/tickmark.jpeg" : "/incomplete.jpeg"}
                          alt=""
                          aria-hidden="true"
                          className="question-state-icon"
                        />
                        {label}
                      </span>
                      <img
                        src={
                          isDisabled ? "/incomparr.jpeg" : "/rightarrow.jpeg"
                        }
                        alt=""
                        aria-hidden="true"
                        className="question-arrow-icon"
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </aside>

        <section className="question-page-main">
          <header className="question-topbar">
            <button
              type="button"
              className="hamburger-btn"
              aria-label="Open menu"
              onClick={() => setIsSidebarOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
              </svg>
            </button>
            <img className="header-logo-mobile" src="/logo.png" alt="PrepRoute" />
            <div className="header-actions">
              <button
                type="button"
                className="notification-btn"
                aria-label="Notifications"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3a5 5 0 0 0-5 5v2.6c0 .8-.3 1.6-.8 2.2L4.8 14.5a1 1 0 0 0 .8 1.6h12.8a1 1 0 0 0 .8-1.6l-1.4-1.7a3.4 3.4 0 0 1-.8-2.2V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 21Z" />
                </svg>
              </button>
              <div className="profile-menu">
                <button
                  type="button"
                  className="profile-chip"
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  onClick={() => setIsProfileOpen((open) => !open)}
                >
                  <img
                    className="avatar-circle"
                    src="/profileicon.jpeg"
                    alt=""
                  />
                  <div>
                    <p className="profile-name">{userId}</p>
                    <p className="profile-role">Admin</p>
                  </div>
                  <svg
                    className="profile-caret"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M5.4 7.6 10 12.2l4.6-4.6 1.2 1.2L10 14.6 4.2 8.8l1.2-1.2Z" />
                  </svg>
                </button>
                {isProfileOpen && (
                  <div className="profile-dropdown" role="menu">
                    <div className="profile-dropdown-user">
                      <p className="profile-dropdown-name">{userId}</p>
                      <p className="profile-dropdown-role">Admin</p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="question-publish-bar">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span>Test Creation</span>
              <span>/</span>
              <span>Create Test</span>
              <span>/</span>
              <span>Chapter Wise</span>
            </nav>
            <button
              type="button"
              className="primary-action publish-action"
              onClick={handlePublishClick}
            >
              Publish
            </button>
          </div>

          <div className="question-scroll-frame">
            <section className="question-test-card">
              <button
                type="button"
                className="edit-pencil"
                aria-label="Edit test details"
                onClick={openEditTestModal}
              >
                <img src="/edit.png" alt="" aria-hidden="true" />
              </button>
              <div>
                <span className="chapter-badge">{currentTestSummary.type}</span>
                <h1>
                  <span className="test-title-label">
                    <img src="/queslogo.jpeg" alt="" aria-hidden="true" />
                    {currentTestName}
                  </span>
                  <span className="difficulty-pill">
                    {currentTestSummary.difficulty}
                  </span>
                </h1>
                <dl>
                  <div>
                    <dt>Subject</dt>
                    <dd>{currentTestSummary.subject}</dd>
                  </div>
                  <div>
                    <dt>Topic</dt>
                    <dd>
                      <span>{currentTestSummary.topic}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Sub Topic</dt>
                    <dd>
                      <span>{currentTestSummary.subTopic}</span>
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="test-stat-row">
                <span className="test-stat-time">
                  <img src="/timeicon.png" alt="" aria-hidden="true" />
                  {currentTestSummary.totalTime} Min
                </span>
                <span className="test-stat-with-icon">
                  <img src="/quesicon.png" alt="" aria-hidden="true" />
                  {currentTestSummary.totalQuestions} Q's
                </span>
                <span className="test-stat-with-icon">
                  <img src="/markicon.png" alt="" aria-hidden="true" />
                  {currentTestSummary.totalMarks} Marks
                </span>
              </div>
            </section>

            {areAllQuestionsSaved && !isEditingSavedQuestion ? (
              <section
                ref={publishConfirmationRef}
                className="publish-confirmation-panel"
                aria-label="Publish test confirmation"
              >
                <div className="publish-confirmation-heading">
                  <h2>Test created</h2>
                  <span>All {plannedQuestionCount} Questions done</span>
                </div>

                <div
                  className="publish-mode-tabs"
                  role="tablist"
                  aria-label="Publish mode"
                >
                  <button
                    type="button"
                    className={publishMode === "now" ? "active" : ""}
                    role="tab"
                    aria-selected={publishMode === "now"}
                    onClick={() => {
                      setPublishMode("now");
                      setPublishError("");
                    }}
                  >
                    Publish Now
                  </button>
                  <button
                    type="button"
                    className={publishMode === "schedule" ? "active" : ""}
                    role="tab"
                    aria-selected={publishMode === "schedule"}
                    onClick={() => {
                      setPublishMode("schedule");
                      setPublishError("");
                    }}
                  >
                    Schedule Publish
                  </button>
                </div>

                {publishMode === "schedule" ? (
                  <section
                    className="schedule-publish-panel"
                    aria-label="Schedule publish date and time"
                  >
                    <h3>Select Date and Time</h3>
                    <div className="publish-date-row">
                      <label>
                        {schedulePublishDate ? null : <span>Select Date</span>}
                        <input
                          type="date"
                          className={schedulePublishDate ? "" : "empty-date"}
                          value={schedulePublishDate}
                          onChange={(event) =>
                            setSchedulePublishDate(event.target.value)
                          }
                        />
                      </label>
                      <label>
                        <select
                          className={schedulePublishTime ? "" : "empty-select"}
                          value={schedulePublishTime}
                          onChange={(event) =>
                            setSchedulePublishTime(event.target.value)
                          }
                        >
                          <option value="" disabled>
                            Select Time
                          </option>
                          {publishTimeOptions.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>
                ) : null}

                <section
                  className="live-until-panel"
                >
                  <h3>Live Until</h3>
                  <p>
                    Choose how long this test should remain available on the
                    platform.
                  </p>

                  <div className="live-duration-grid">
                    {[
                      ["always", "Always Available"],
                      ["3-weeks", "3 Weeks"],
                      ["1-week", "1 Week"],
                      ["1-month", "1 Month"],
                      ["2-weeks", "2 Weeks"],
                      ["custom", "Custom Duration"],
                    ].map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="live_until"
                          checked={liveUntil === value}
                          onChange={() => setLiveUntil(value)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="publish-date-row">
                    <label>
                      {publishEndDate ? null : <span>Select End Date</span>}
                      <input
                        type="date"
                        className={publishEndDate ? "" : "empty-date"}
                        value={publishEndDate}
                        onChange={(event) =>
                          setPublishEndDate(event.target.value)
                        }
                        disabled={liveUntil !== "custom"}
                      />
                    </label>
                    <label>
                      <select
                        className={publishEndTime ? "" : "empty-select"}
                        value={publishEndTime}
                        onChange={(event) =>
                          setPublishEndTime(event.target.value)
                        }
                        disabled={liveUntil !== "custom"}
                      >
                        <option value="" disabled>
                          Select End Time
                        </option>
                        {publishTimeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                {publishError ? (
                  <p className="form-message error">{publishError}</p>
                ) : null}
                {publishStatus ? (
                  <p className="form-message success">{publishStatus}</p>
                ) : null}

                <div className="publish-confirmation-actions">
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => navigate("/test-creation")}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary-action"
                    disabled={isPublishing}
                    onClick={handleConfirmPublish}
                  >
                    {isPublishing ? "Publishing..." : "Confirm"}
                  </button>
                </div>
              </section>
            ) : (
              <>
                <div className="question-number-row" ref={questionEditorSectionRef}>
                  <h2>
                    Question{" "}
                    <span className="active-question-number">
                      {activeQuestionNumber}
                    </span>
                    <span>/{plannedQuestionCount}</span>
                  </h2>
                  <div>
                    <button type="button">+ MCQ</button>
                    <button type="button">CSV</button>
                  </div>
                </div>

                {questionNotice ? (
                  <p className="question-number-notice">{questionNotice}</p>
                ) : null}

                <button
                  type="button"
                  className="delete-edits-btn"
                  onClick={handleClearQuestionDrafts}
                >
                  <img src="/del.jpeg" alt="" aria-hidden="true" />
                  Delete All Edits
                </button>

                <div className="question-editor">
                  <span
                    className="question-editor-toolbar"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <button
                      type="button"
                      onClick={() => handleQuestionEditorAction("italic")}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionEditorAction("bold")}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionEditorAction("underline")}
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionEditorAction("link")}
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionEditorAction("align")}
                    >
                      Align
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionEditorAction("list")}
                    >
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionEditorAction("image")}
                    >
                      Image
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionEditorAction("formula")}
                    >
                      fx
                    </button>
                  </span>
                  <div
                    ref={questionEditorRef}
                    className="question-editor-surface"
                    contentEditable
                    data-placeholder="Type here"
                    role="textbox"
                    aria-label="Question text"
                    style={{ textAlign: questionTextAlign }}
                    onInput={syncQuestionEditorText}
                  />
                </div>

                <section className="mcq-options">
                  <h3>Type the options below</h3>
                  {[1, 2, 3, 4].map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name="answer-option"
                        checked={correctOption === `option${option}`}
                        onChange={() =>
                          setCorrectOption(
                            `option${option}` as BulkQuestionPayload["questions"][number]["correct_option"],
                          )
                        }
                      />
                      <input
                        type="text"
                        placeholder="Type Option here"
                        value={questionOptions[option - 1]}
                        onChange={(event) =>
                          handleQuestionOptionChange(
                            option - 1,
                            event.target.value,
                          )
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Delete option ${option}`}
                      >
                        x
                      </button>
                    </label>
                  ))}
                </section>

                <label className="solution-editor">
                  <span>Add Solution</span>
                  <textarea
                    placeholder="Type here"
                    rows={7}
                    value={explanation}
                    onChange={(event) => setExplanation(event.target.value)}
                  />
                </label>

                <div className="question-pager">
                  <button
                    type="button"
                    aria-label="Previous question"
                    onClick={() =>
                      handleSelectQuestion(activeQuestionNumber - 1)
                    }
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    aria-label="Next question"
                    onClick={() =>
                      handleSelectQuestion(activeQuestionNumber + 1)
                    }
                  >
                    {">"}
                  </button>
                </div>

                <section className="question-settings">
                  <h3>Question settings</h3>
                  <label className="form-field">
                    <span>Level of Difficulty</span>
                    <select
                      value={questionDifficulty}
                      onChange={(event) =>
                        setQuestionDifficulty(event.target.value)
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="difficult">Difficult</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Topic</span>
                    <select
                      value={questionTopicId}
                      onChange={(event) => {
                        setQuestionTopicId(event.target.value);
                        setQuestionSubTopicId("");
                      }}
                    >
                      <option value="" disabled>
                        Select from Drop-down
                      </option>
                      {questionTopicOptions.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Sub-topic</span>
                    <select
                      value={questionSubTopicId}
                      disabled={!questionTopicId}
                      onChange={(event) =>
                        setQuestionSubTopicId(event.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select from Drop-down
                      </option>
                      {questionSubTopicOptions.map((subTopic) => (
                        <option key={subTopic.id} value={subTopic.id}>
                          {subTopic.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                {questionError ? (
                  <p className="form-message error">{questionError}</p>
                ) : null}
                {questionStatus ? (
                  <p className="form-message success">{questionStatus}</p>
                ) : null}

                <div className="question-bottom-actions">
                  <button
                    type="button"
                    className="exit-action"
                    onClick={() => navigate("/test-creation")}
                  >
                    Exit Test Creation
                  </button>
                  <button
                    type="button"
                    className="primary-action"
                    disabled={isSavingQuestion}
                    onClick={handleSaveQuestion}
                  >
                    {isSavingQuestion
                      ? "Saving..."
                      : areAllQuestionsSaved
                        ? "Update"
                        : "Next"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
        {isEditModalOpen ? (
          <div className="edit-test-modal-backdrop" role="presentation">
            <section
              className="edit-test-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-test-title"
            >
              <header className="edit-test-modal-header">
                <h2 id="edit-test-title">Edit Test creation</h2>
                <button
                  type="button"
                  aria-label="Close edit test"
                  onClick={closeEditTestModal}
                >
                  x
                </button>
              </header>

              <div className="edit-test-modal-body">
                <div
                  className="test-tabs edit-test-tabs"
                  role="tablist"
                  aria-label="Edit test type"
                >
                  <button
                    type="button"
                    className={`test-tab${editTestType === "chapterwise" ? " active" : ""}`}
                    role="tab"
                    aria-selected={editTestType === "chapterwise"}
                    onClick={() => setEditTestType("chapterwise")}
                  >
                    Chapter Wise
                  </button>
                  <button
                    type="button"
                    className={`test-tab${editTestType === "pyq" ? " active" : ""}`}
                    role="tab"
                    aria-selected={editTestType === "pyq"}
                    onClick={() => setEditTestType("pyq")}
                  >
                    PYQ
                  </button>
                  <button
                    type="button"
                    className={`test-tab${editTestType === "mock" ? " active" : ""}`}
                    role="tab"
                    aria-selected={editTestType === "mock"}
                    onClick={() => setEditTestType("mock")}
                  >
                    Mock Test
                  </button>
                </div>

                <form
                  className="test-form edit-test-form"
                  onSubmit={handleEditTest}
                >
                  <label className="form-field">
                    <span>Subject</span>
                    <select
                      value={editSubjectId}
                      onChange={(event) =>
                        handleEditSubjectChange(event.target.value)
                      }
                    >
                      <option value="" disabled>
                        Choose from Drop-down
                      </option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Name of Test</span>
                    <input
                      type="text"
                      name="name"
                      placeholder="Enter name of Test"
                      defaultValue={currentTestName}
                    />
                  </label>

                  <label className="form-field">
                    <span>Topic</span>
                    <select
                      value={editTopicId}
                      disabled={!editSubjectId}
                      onChange={(event) =>
                        handleEditTopicChange(event.target.value)
                      }
                    >
                      <option value="" disabled>
                        Choose from Drop-down
                      </option>
                      {editTopicOptions.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Sub Topic</span>
                    <select
                      value={editSubTopicId}
                      disabled={!editTopicId}
                      onChange={(event) =>
                        setEditSubTopicId(event.target.value)
                      }
                    >
                      <option value="" disabled>
                        Choose from Drop-down
                      </option>
                      {editSubTopicOptions.map((subTopic) => (
                        <option key={subTopic.id} value={subTopic.id}>
                          {subTopic.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Duration (Minutes)</span>
                    <input
                      type="number"
                      name="total_time"
                      placeholder="Enter the time"
                      defaultValue={currentTestSummary.totalTime}
                    />
                  </label>

                  <fieldset className="difficulty-group">
                    <legend>Test Difficulty Level</legend>
                    <label>
                      <input
                        type="radio"
                        name="edit_difficulty"
                        checked={editDifficulty === "easy"}
                        onChange={() => setEditDifficulty("easy")}
                      />
                      <span>Easy</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="edit_difficulty"
                        checked={editDifficulty === "medium"}
                        onChange={() => setEditDifficulty("medium")}
                      />
                      <span>Medium</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="edit_difficulty"
                        checked={editDifficulty === "difficult"}
                        onChange={() => setEditDifficulty("difficult")}
                      />
                      <span>Difficult</span>
                    </label>
                  </fieldset>

                  <div className="marking-title">Marking Scheme:</div>

                  <div className="marking-grid">
                    <label className="form-field compact">
                      <span>Wrong Answer</span>
                      <input
                        type="number"
                        name="wrong_marks"
                        defaultValue={currentTestSummary.wrongMarks ?? -1}
                      />
                    </label>
                    <label className="form-field compact">
                      <span>Unattempted</span>
                      <input
                        type="number"
                        name="unattempt_marks"
                        defaultValue={currentTestSummary.unattemptMarks ?? 0}
                      />
                    </label>
                    <label className="form-field compact">
                      <span>Correct Answer</span>
                      <input
                        type="number"
                        name="correct_marks"
                        defaultValue={currentTestSummary.correctMarks ?? 5}
                      />
                    </label>
                    <label className="form-field wide">
                      <span>No of Questions</span>
                      <input
                        type="number"
                        name="total_questions"
                        placeholder="Ex:250 Marks"
                        defaultValue={currentTestSummary.totalQuestions}
                      />
                    </label>
                    <label className="form-field wide disabled">
                      <span>Total Marks</span>
                      <input
                        type="number"
                        name="total_marks"
                        placeholder="Ex:250 Marks"
                        defaultValue={currentTestSummary.totalMarks}
                      />
                    </label>
                  </div>

                  {editFormError ? (
                    <p className="form-message error">{editFormError}</p>
                  ) : null}
                  {editFormStatus ? (
                    <p className="form-message success">{editFormStatus}</p>
                  ) : null}

                  <div className="form-actions edit-test-actions">
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={closeEditTestModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="primary-action"
                      disabled={isUpdatingTest}
                    >
                      {isUpdatingTest ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      {formStatus ? (
        <div className="toast-success" role="status">
          {formStatus}
        </div>
      ) : null}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay sidebar-open"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`dashboard-sidebar${isSidebarOpen ? " sidebar-open" : ""}`} aria-label="Main menu">
        <img className="dashboard-brand" src="/logo.png" alt="Nandi logo" />
        <nav className="sidebar-menu">
          <button
            type="button"
            className="menu-item"
            onClick={() => { setIsSidebarOpen(false); navigate("/dashboard"); }}
          >
            <img className="menu-icon" src="/dashicondef.png" alt="" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`menu-item${
              selectedMenu === "test-creation" && isTestCreation ? " active" : ""
            }`}
            onClick={() => {
              setIsSidebarOpen(false);
              setSelectedMenu("test-creation");
              navigate("/test-creation");
            }}
          >
            <img className="menu-icon" src="/createTestClicked.png" alt="" />
            <span>Test Creation</span>
          </button>
          <button
            type="button"
            className={`menu-item${selectedMenu === "tracking" ? " active" : ""}`}
            onClick={() => { setIsSidebarOpen(false); setSelectedMenu("tracking"); }}
          >
            <img className="menu-icon" src="/track.png" alt="" />
            <span>Test Tracking</span>
          </button>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <button
            type="button"
            className="hamburger-btn"
            aria-label="Open menu"
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
            </svg>
          </button>
          <img className="header-logo-mobile" src="/logo.png" alt="PrepRoute" />
          <div className="header-actions">
            <button
              type="button"
              className="notification-btn"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a5 5 0 0 0-5 5v2.6c0 .8-.3 1.6-.8 2.2L4.8 14.5a1 1 0 0 0 .8 1.6h12.8a1 1 0 0 0 .8-1.6l-1.4-1.7a3.4 3.4 0 0 1-.8-2.2V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 21Z" />
              </svg>
            </button>
            <div className="profile-menu">
              <button
                type="button"
                className="profile-chip"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((open) => !open)}
              >
                <img className="avatar-circle" src="/profileicon.jpeg" alt="" />
                <div>
                  <p className="profile-name">{userId}</p>
                  <p className="profile-role">Admin</p>
                </div>
                <svg
                  className="profile-caret"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M5.4 7.6 10 12.2l4.6-4.6 1.2 1.2L10 14.6 4.2 8.8l1.2-1.2Z" />
                </svg>
              </button>
              {isProfileOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown-user">
                    <p className="profile-dropdown-name">{userId}</p>
                    <p className="profile-dropdown-role">Admin</p>
                  </div>
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="test-form-panel" aria-label="Create test">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>Test Creation</span>
            <span>/</span>
            <span>Create Test</span>
            <span>/</span>
            <span>Chapter Wise</span>
          </nav>

          <div className="test-tabs" role="tablist" aria-label="Test type">
            <button
              type="button"
              className={`test-tab${selectedTestType === "chapterwise" ? " active" : ""}`}
              role="tab"
              aria-selected={selectedTestType === "chapterwise"}
              onClick={() => setSelectedTestType("chapterwise")}
            >
              Chapter Wise
            </button>
            <button
              type="button"
              className={`test-tab${selectedTestType === "pyq" ? " active" : ""}`}
              role="tab"
              aria-selected={selectedTestType === "pyq"}
              onClick={() => setSelectedTestType("pyq")}
            >
              PYQ
            </button>
            <button
              type="button"
              className={`test-tab${selectedTestType === "mock" ? " active" : ""}`}
              role="tab"
              aria-selected={selectedTestType === "mock"}
              onClick={() => setSelectedTestType("mock")}
            >
              Mock Test
            </button>
          </div>

          <form className="test-form" onSubmit={handleCreateTest}>
            <label className="form-field">
              <span>Subject</span>
              <select
                value={selectedSubjectId}
                onChange={(event) => handleSubjectChange(event.target.value)}
              >
                <option value="" disabled>
                  Choose from Drop-down
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Name of Test</span>
              <input type="text" name="name" placeholder="Enter name of Test" />
            </label>

            <label className="form-field">
              <span>Topic</span>
              <select
                value={selectedTopicId}
                disabled={!selectedSubjectId}
                onChange={(event) => handleTopicChange(event.target.value)}
              >
                <option value="" disabled>
                  Choose from Drop-down
                </option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Sub Topic</span>
              <select
                value={selectedSubTopicId}
                disabled={!selectedTopicId}
                onChange={(event) => setSelectedSubTopicId(event.target.value)}
              >
                <option value="" disabled>
                  Choose from Drop-down
                </option>
                {subTopics.map((subTopic) => (
                  <option key={subTopic.id} value={subTopic.id}>
                    {subTopic.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Duration (Minutes)</span>
              <input
                type="number"
                name="total_time"
                placeholder="Enter the time"
              />
            </label>

            <fieldset className="difficulty-group">
              <legend>Test Difficulty Level</legend>
              <label>
                <input
                  type="radio"
                  name="difficulty"
                  checked={difficulty === "easy"}
                  onChange={() => setDifficulty("easy")}
                />
                <span>Easy</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="difficulty"
                  checked={difficulty === "medium"}
                  onChange={() => setDifficulty("medium")}
                />
                <span>Medium</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="difficulty"
                  checked={difficulty === "difficult"}
                  onChange={() => setDifficulty("difficult")}
                />
                <span>Difficult</span>
              </label>
            </fieldset>

            <div className="marking-title">Marking Scheme:</div>

            <div className="marking-grid">
              <label className="form-field compact">
                <span>Wrong Answer</span>
                <input type="number" name="wrong_marks" defaultValue="-1" />
              </label>
              <label className="form-field compact">
                <span>Unattempted</span>
                <input type="number" name="unattempt_marks" defaultValue="+0" />
              </label>
              <label className="form-field compact">
                <span>Correct Answer</span>
                <input type="number" name="correct_marks" defaultValue="+5" />
              </label>
              <label className="form-field wide">
                <span>No of Questions</span>
                <input
                  type="number"
                  name="total_questions"
                  placeholder="Ex:50 Questions"
                />
              </label>
              <label className="form-field wide">
                <span>Total Marks</span>
                <input
                  type="number"
                  name="total_marks"
                  placeholder="Ex:250 Marks"
                />
              </label>
            </div>

            {formError ? (
              <p className="form-message error">{formError}</p>
            ) : null}

            <div className="form-actions">
              <button type="button" className="secondary-action" onClick={() => navigate("/dashboard")}>
                Cancel
              </button>
              <button
                type="submit"
                className="primary-action"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Next"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
};
