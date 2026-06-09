import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchBulkQuestions,
  getTestById,
  publishTest,
  type BulkFetchedQuestion,
} from "../api/tests";
import { useAuthStore } from "../store/authStore";

type TestSummary = {
  name: string;
  type: string;
  subject: string;
  topic?: string;
  subTopic?: string;
  difficulty: string;
  totalTime?: number;
  totalQuestions?: number;
  totalMarks?: number;
};

const publishTimeOptions = [
  "09:00","10:00","11:00","12:00","13:00",
  "14:00","15:00","16:00","17:00","18:00",
];

const optionLabel = (key: string) =>
  ({ option1: "A", option2: "B", option3: "C", option4: "D" }[key] ?? key);

export const TestPreviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [testId, setTestId] = useState("");
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [questions, setQuestions] = useState<BulkFetchedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [liveUntil, setLiveUntil] = useState("custom");
  const [schedulePublishDate, setSchedulePublishDate] = useState("");
  const [schedulePublishTime, setSchedulePublishTime] = useState("");
  const [publishEndDate, setPublishEndDate] = useState("");
  const [publishEndTime, setPublishEndTime] = useState("");
  const [publishError, setPublishError] = useState("");
  const [publishStatus, setPublishStatus] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const publishPanelRef = useRef<HTMLElement | null>(null);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const userId = (user?.userId as string | undefined) ?? "vedant-admin";

  useEffect(() => {
    const stateTestId =
      (location.state as { testId?: string } | null)?.testId ?? "";
    const currentTestId =
      stateTestId || (sessionStorage.getItem("preproute-current-test-id") ?? "");
    setTestId(currentTestId);

    if (!currentTestId) {
      setLoadError("No test selected.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const summaryStr = sessionStorage.getItem("preproute-current-test-summary");
    let storedSummary: Record<string, unknown> = {};
    if (summaryStr && stateTestId === sessionStorage.getItem("preproute-current-test-id")) {
      try { storedSummary = JSON.parse(summaryStr); } catch {}
    }

    getTestById(currentTestId)
      .then(async (testResponse) => {
        if (!isMounted) return;

        if (testResponse.status !== "success") {
          setLoadError("Unable to load test details.");
          setIsLoading(false);
          return;
        }

        const td = testResponse.data;
        const summary: TestSummary = {
          name: td.name,
          type: (storedSummary.type as string) ?? "Chapter Wise",
          subject: (storedSummary.subject as string) ?? td.subject ?? "—",
          topic: storedSummary.topic as string | undefined,
          subTopic: storedSummary.subTopic as string | undefined,
          difficulty: (storedSummary.difficulty as string) ?? "easy",
          totalTime: (storedSummary.totalTime as number | undefined) ?? undefined,
          totalQuestions:
            (storedSummary.totalQuestions as number | undefined) ??
            td.total_questions,
          totalMarks:
            (storedSummary.totalMarks as number | undefined) ?? td.total_marks,
        };
        setTestSummary(summary);

        const questionIds = td.questions ?? [];
        if (questionIds.length === 0) {
          setIsLoading(false);
          return;
        }

        const fetched = await fetchBulkQuestions(questionIds);
        if (isMounted) {
          setQuestions(fetched);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError("Unable to load test.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [location.state]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  const handlePublish = async () => {
    setPublishError("");
    setPublishStatus("");

    if (publishMode === "schedule" && (!schedulePublishDate || !schedulePublishTime)) {
      setPublishError("Select the scheduled date and time.");
      return;
    }

    if (liveUntil === "custom" && (!publishEndDate || !publishEndTime)) {
      setPublishError("Select the custom end date and time.");
      return;
    }

    setIsPublishing(true);

    try {
      if (testId) {
        const response = await publishTest(testId);

        if (response.status !== "success") {
          setPublishError("Unable to publish test.");
          setIsPublishing(false);
          return;
        }

        sessionStorage.removeItem("preproute-current-test-id");
        sessionStorage.removeItem("preproute-current-test-name");
        sessionStorage.removeItem("preproute-current-test-summary");
        sessionStorage.removeItem(`preproute-question-state-${testId}`);
      }

      navigate("/dashboard");
    } catch {
      setPublishError("Unable to publish test.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Main menu">
        <img className="dashboard-brand" src="/logo.png" alt="PrepRoute logo" />
        <nav className="sidebar-menu">
          <button
            type="button"
            className="menu-item"
            onClick={() => navigate("/dashboard")}
          >
            <img className="menu-icon" src="/dashicondef.png" alt="" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => navigate("/test-creation")}
          >
            <img className="menu-icon" src="/createTestClicked.png" alt="" />
            <span>Test Creation</span>
          </button>
          <button
            type="button"
            className="menu-item"
          >
            <img className="menu-icon" src="/track.png" alt="" />
            <span>Test Tracking</span>
          </button>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="question-topbar">
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
            <span>Preview &amp; Publish</span>
          </nav>
          <div className="preview-topbar-actions">
            <button
              type="button"
              className="secondary-action preview-edit-btn"
              onClick={() => navigate("/test-creation")}
            >
              Edit Test
            </button>
            <button
              type="button"
              className="secondary-action preview-edit-btn"
              onClick={() => navigate("/test-creation/questions")}
            >
              Edit Questions
            </button>
            <button
              type="button"
              className="primary-action publish-action"
              onClick={() => {
                publishPanelRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              Publish Test
            </button>
          </div>
        </div>

        <div className="question-scroll-frame preview-scroll-frame">
          {isLoading ? (
            <p className="test-list-loading">Loading test...</p>
          ) : loadError ? (
            <p className="form-message error">{loadError}</p>
          ) : (
            <>
              {testSummary && (
                <section className="question-test-card">
                  <div>
                    <span className="chapter-badge">{testSummary.type}</span>
                    <h1>
                      <span className="test-title-label">
                        <img
                          src="/queslogo.jpeg"
                          alt=""
                          aria-hidden="true"
                        />
                        {testSummary.name}
                      </span>
                      <span className="difficulty-pill">
                        {testSummary.difficulty}
                      </span>
                    </h1>
                    <dl>
                      <div>
                        <dt>Subject</dt>
                        <dd>{testSummary.subject}</dd>
                      </div>
                      {testSummary.topic ? (
                        <div>
                          <dt>Topic</dt>
                          <dd>
                            <span>{testSummary.topic}</span>
                          </dd>
                        </div>
                      ) : null}
                      {testSummary.subTopic ? (
                        <div>
                          <dt>Sub Topic</dt>
                          <dd>
                            <span>{testSummary.subTopic}</span>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                  <div className="test-stat-row">
                    {testSummary.totalTime ? (
                      <span className="test-stat-time">
                        <img
                          src="/timeicon.png"
                          alt=""
                          aria-hidden="true"
                        />
                        {testSummary.totalTime} Min
                      </span>
                    ) : null}
                    {testSummary.totalQuestions != null ? (
                      <span className="test-stat-with-icon">
                        <img
                          src="/quesicon.png"
                          alt=""
                          aria-hidden="true"
                        />
                        {testSummary.totalQuestions} Q's
                      </span>
                    ) : null}
                    {testSummary.totalMarks != null ? (
                      <span className="test-stat-with-icon">
                        <img
                          src="/markicon.png"
                          alt=""
                          aria-hidden="true"
                        />
                        {testSummary.totalMarks} Marks
                      </span>
                    ) : null}
                  </div>
                </section>
              )}

              {questions.length === 0 ? (
                <div className="preview-no-questions">
                  <p>No questions have been added to this test yet.</p>
                  <button
                    type="button"
                    className="primary-action"
                    onClick={() => navigate("/test-creation/questions")}
                  >
                    Add Questions
                  </button>
                </div>
              ) : (
                <section className="preview-questions-list" aria-label="Questions">
                  <h2 className="preview-questions-heading">
                    All Questions
                    <span className="preview-questions-count">
                      {questions.length} question{questions.length !== 1 ? "s" : ""}
                    </span>
                  </h2>
                  {questions.map((q, index) => (
                    <article
                      key={q.id}
                      id={`preview-q-${index + 1}`}
                      className="preview-question-card"
                    >
                      <div className="preview-question-header">
                        <span className="preview-question-number">
                          Q{index + 1}
                        </span>
                        <span className={`difficulty-badge difficulty-${q.difficulty === "medium" ? "medium" : q.difficulty === "difficult" ? "hard" : "easy"}`}>
                          {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                        </span>
                      </div>

                      <div
                        className="preview-question-text"
                        dangerouslySetInnerHTML={{ __html: q.question }}
                      />

                      <ol className="preview-option-list" type="A">
                        {(["option1", "option2", "option3", "option4"] as const).map(
                          (key) => (
                            <li
                              key={key}
                              className={`preview-option${q.correct_option === key ? " preview-option-correct" : ""}`}
                            >
                              <span className="preview-option-label">
                                {optionLabel(key)}
                              </span>
                              <span>{q[key as keyof BulkFetchedQuestion] as string}</span>
                              {q.correct_option === key && (
                                <span className="preview-correct-tick" aria-label="Correct answer">
                                  ✓
                                </span>
                              )}
                            </li>
                          ),
                        )}
                      </ol>

                      {q.explanation ? (
                        <div className="preview-explanation">
                          <span className="preview-explanation-label">
                            Solution:
                          </span>
                          <span>{q.explanation}</span>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </section>
              )}

              <section
                ref={publishPanelRef}
                className="publish-confirmation-panel"
                aria-label="Publish test"
              >
                <div className="publish-confirmation-heading">
                  <h2>Publish Test</h2>
                  {questions.length > 0 && (
                    <span>
                      {questions.length} Question{questions.length !== 1 ? "s" : ""} ready
                    </span>
                  )}
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

                {publishMode === "schedule" && (
                  <section
                    className="schedule-publish-panel"
                    aria-label="Schedule date and time"
                  >
                    <h3>Select Date and Time</h3>
                    <div className="publish-date-row">
                      <label>
                        {!schedulePublishDate && (
                          <span>Select Date</span>
                        )}
                        <input
                          type="date"
                          className={schedulePublishDate ? "" : "empty-date"}
                          value={schedulePublishDate}
                          onChange={(e) => setSchedulePublishDate(e.target.value)}
                        />
                      </label>
                      <label>
                        <select
                          className={schedulePublishTime ? "" : "empty-select"}
                          value={schedulePublishTime}
                          onChange={(e) => setSchedulePublishTime(e.target.value)}
                        >
                          <option value="" disabled>
                            Select Time
                          </option>
                          {publishTimeOptions.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>
                )}

                <section
                  className="live-until-panel"
                >
                  <h3>Live Until</h3>
                  <p>
                    Choose how long this test should remain available on the
                    platform.
                  </p>
                  <div className="live-duration-grid">
                    {(
                      [
                        ["always", "Always Available"],
                        ["3-weeks", "3 Weeks"],
                        ["1-week", "1 Week"],
                        ["1-month", "1 Month"],
                        ["2-weeks", "2 Weeks"],
                        ["custom", "Custom Duration"],
                      ] as [string, string][]
                    ).map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="preview_live_until"
                          checked={liveUntil === value}
                          onChange={() => setLiveUntil(value)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="publish-date-row">
                    <label>
                      {!publishEndDate && <span>Select End Date</span>}
                      <input
                        type="date"
                        className={publishEndDate ? "" : "empty-date"}
                        value={publishEndDate}
                        onChange={(e) => setPublishEndDate(e.target.value)}
                        disabled={liveUntil !== "custom"}
                      />
                    </label>
                    <label>
                      <select
                        className={publishEndTime ? "" : "empty-select"}
                        value={publishEndTime}
                        onChange={(e) => setPublishEndTime(e.target.value)}
                        disabled={liveUntil !== "custom"}
                      >
                        <option value="" disabled>
                          Select End Time
                        </option>
                        {publishTimeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                {publishError && (
                  <p className="form-message error">{publishError}</p>
                )}
                {publishStatus && (
                  <p className="form-message success">{publishStatus}</p>
                )}

                <div className="publish-confirmation-actions">
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => navigate("/dashboard")}
                  >
                    Back to Dashboard
                  </button>
                  <button
                    type="button"
                    className="primary-action"
                    disabled={isPublishing || Boolean(publishStatus)}
                    onClick={handlePublish}
                  >
                    {isPublishing
                      ? "Publishing..."
                      : publishStatus
                        ? "Published!"
                        : "Confirm Publish"}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
};
