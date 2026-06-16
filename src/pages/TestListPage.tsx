import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteTest, getTests, type TestListItem } from "../api/tests";
import { useAuthStore } from "../store/authStore";

const ITEMS_PER_PAGE = 10;

const STATUS_LABELS: Record<string, string> = {
  live: "Live",
  published: "Published",
  draft: "Draft",
};

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusLabel = (status?: string | null) => {
  if (!status) return "Draft";
  return STATUS_LABELS[status] ?? status;
};

const getStatusClass = (status?: string | null) => {
  if (status === "live") return "status-badge status-live";
  if (status === "published") return "status-badge status-published";
  return "status-badge status-draft";
};

const getDifficultyClass = (difficulty?: string) => {
  if (difficulty === "medium") return "difficulty-badge difficulty-medium";
  if (difficulty === "difficult") return "difficulty-badge difficulty-hard";
  return "difficulty-badge difficulty-easy";
};

const getTestTypeLabel = (type?: string) => {
  if (type === "chapterwise") return "Chapter Wise";
  if (type === "pyq") return "PYQ";
  if (type === "mock") return "Mock Test";
  return type ?? "—";
};

const buildPageNumbers = (current: number, total: number): (number | "...")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
};

export const TestListPage = () => {
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState<"dashboard" | "test-creation" | "tracking">("dashboard");
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const userId = (user?.userId as string | undefined) ?? "vedant-admin";

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getTests()
      .then((data) => {
        if (isMounted) {
          setTests(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError("Unable to load tests.");
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  const handleView = (test: TestListItem) => {
    sessionStorage.setItem("preproute-current-test-id", test.id);
    navigate("/test-creation/preview", { state: { testId: test.id } });
  };

  const handleEdit = (test: TestListItem) => {
    const summary = {
      type: getTestTypeLabel(test.type),
      subjectId: test.subject ?? "",
      subject: test.subject ?? "",
      topicId: test.topics?.[0] ?? "",
      topic: test.topics?.[0] ?? "",
      subTopicId: test.sub_topics?.[0] ?? "",
      subTopic: test.sub_topics?.[0] ?? "",
      difficulty: test.difficulty ?? "easy",
      totalTime: test.total_time ?? 0,
      totalMarks: test.total_marks ?? 0,
      totalQuestions: test.total_questions ?? 0,
      correctMarks: test.correct_marks ?? 0,
      wrongMarks: test.wrong_marks ?? 0,
      unattemptMarks: test.unattempt_marks ?? 0,
    };
    sessionStorage.setItem("preproute-current-test-id", test.id);
    sessionStorage.setItem("preproute-current-test-name", test.name ?? "");
    sessionStorage.setItem("preproute-current-test-summary", JSON.stringify(summary));
    navigate("/test-creation/questions");
  };

  const handleDeleteConfirm = async (testId: string) => {
    setIsDeletingId(testId);
    setDeleteError("");
    try {
      await deleteTest(testId);
      setTests((prev) => prev.filter((t) => t.id !== testId));
      setConfirmDeleteId(null);
    } catch {
      setDeleteError("Unable to delete test. Please try again.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      !searchQuery ||
      test.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const testStatus = test.status ?? "draft";
    const matchesStatus = statusFilter === "all" || testStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: tests.length,
    draft: tests.filter((t) => !t.status || t.status === "draft").length,
    live: tests.filter((t) => t.status === "live").length,
    published: tests.filter((t) => t.status === "published").length,
  };

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTests = filteredTests.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );
  const pageNumbers = buildPageNumbers(safePage, totalPages);

  return (
    <main className="dashboard-shell">
      {isSidebarOpen && (
        <div
          className="sidebar-overlay sidebar-open"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`dashboard-sidebar${isSidebarOpen ? " sidebar-open" : ""}`} aria-label="Main menu">
        <img className="dashboard-brand" src="/logo.png" alt="PrepRoute logo" />
        <nav className="sidebar-menu">
          <button
            type="button"
            className={`menu-item${selectedMenu === "dashboard" ? " active" : ""}`}
            onClick={() => { setIsSidebarOpen(false); setSelectedMenu("dashboard"); navigate("/dashboard"); }}
          >
            <img className="menu-icon" src="/dashicondef.png" alt="" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => { setIsSidebarOpen(false); setSelectedMenu("test-creation"); navigate("/test-creation"); }}
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
          <div className="header-actions">
            <button type="button" className="notification-btn" aria-label="Notifications">
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
                <svg className="profile-caret" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5.4 7.6 10 12.2l4.6-4.6 1.2 1.2L10 14.6 4.2 8.8l1.2-1.2Z" />
                </svg>
              </button>
              {isProfileOpen && (
                <div className="profile-dropdown" role="menu">
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="test-list-panel">
          <div className="test-list-toolbar">
            <div className="test-list-search">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M8.5 3a5.5 5.5 0 1 0 3.47 9.73l3.65 3.65a1 1 0 1 0 1.41-1.41l-3.65-3.65A5.5 5.5 0 0 0 8.5 3Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="primary-action create-test-btn"
              onClick={() => navigate("/test-creation")}
            >
              + Create New Test
            </button>
          </div>

          <div className="status-filter-tabs" role="tablist" aria-label="Filter by status">
            {(
              [
                ["all", "All"],
                ["draft", "Draft"],
                ["live", "Live"],
                ["published", "Published"],
              ] as [string, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={statusFilter === value}
                className={`status-filter-tab${statusFilter === value ? " active" : ""}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
                <span className="status-filter-count">
                  {statusCounts[value as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>

          {deleteError ? <p className="form-message error">{deleteError}</p> : null}

          {isLoading ? (
            <p className="test-list-loading">Loading tests...</p>
          ) : loadError ? (
            <p className="form-message error">{loadError}</p>
          ) : filteredTests.length === 0 ? (
            <div className="test-list-empty">
              <p>No tests found.</p>
              <button
                type="button"
                className="primary-action"
                onClick={() => navigate("/test-creation")}
              >
                Create your first test
              </button>
            </div>
          ) : (
            <>
              <div className="test-list-table-wrapper">
                <table className="test-list-table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Subject</th>
                      <th>Type</th>
                      <th>Difficulty</th>
                      <th>Status</th>
                      <th>Questions</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTests.map((test) => (
                      <tr key={test.id}>
                        <td className="test-name-cell">
                          <span className="test-name-text">{test.name}</span>
                          {test.total_time ? (
                            <span className="test-duration-tag">{test.total_time} min</span>
                          ) : null}
                        </td>
                        <td>{test.subject ?? "—"}</td>
                        <td>{test.type ?? "—"}</td>
                        <td>
                          {test.difficulty ? (
                            <span className={getDifficultyClass(test.difficulty)}>
                              {test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <span className={getStatusClass(test.status)}>
                            {getStatusLabel(test.status)}
                          </span>
                        </td>
                        <td>
                          {test.total_questions != null
                            ? `${test.total_questions} Qs · ${test.total_marks ?? "—"} Marks`
                            : "—"}
                        </td>
                        <td>{formatDate(test.created_at)}</td>
                        <td className="actions-cell">
                          {confirmDeleteId === test.id ? (
                            <span className="delete-confirm-row">
                              <span className="delete-confirm-label">Delete?</span>
                              <button
                                type="button"
                                className="table-action-btn confirm-btn"
                                disabled={isDeletingId === test.id}
                                onClick={() => handleDeleteConfirm(test.id)}
                              >
                                {isDeletingId === test.id ? "..." : "Yes"}
                              </button>
                              <button
                                type="button"
                                className="table-action-btn edit-btn"
                                disabled={isDeletingId === test.id}
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="table-action-btn view-btn"
                                onClick={() => handleView(test)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="table-action-btn edit-btn"
                                onClick={() => handleEdit(test)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="table-action-btn delete-btn"
                                onClick={() => { setConfirmDeleteId(test.id); setDeleteError(""); }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="test-list-pagination">
                <button
                  type="button"
                  className="page-btn"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  ←
                </button>
                {pageNumbers.map((page, i) =>
                  page === "..." ? (
                    <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      className={`page-btn${safePage === page ? " active" : ""}`}
                      onClick={() => setCurrentPage(page as number)}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="page-btn"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
};
