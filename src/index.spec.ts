import * as core from "@actions/core";
import * as github from "@actions/github";
import { run } from "./index";

// Mock the modules
jest.mock("@actions/core");
jest.mock("@actions/github");

describe("run", () => {
  let mockOctokit: any;
  let mockGetInput: jest.SpiedFunction<typeof core.getInput>;
  let mockExportVariable: jest.SpiedFunction<typeof core.exportVariable>;
  let mockSetOutput: jest.SpiedFunction<typeof core.setOutput>;
  let mockInfo: jest.SpiedFunction<typeof core.info>;
  let mockDebug: jest.SpiedFunction<typeof core.debug>;
  let mockWarning: jest.SpiedFunction<typeof core.warning>;

  beforeEach(() => {
    // Use fake timers
    jest.useFakeTimers();
    
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup core mocks
    mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
    mockExportVariable = core.exportVariable as jest.MockedFunction<typeof core.exportVariable>;
    mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;
    mockInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockDebug = core.debug as jest.MockedFunction<typeof core.debug>;
    mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;

    // Setup default return values
    mockGetInput.mockReturnValue("fake-token");

    // Setup octokit mock
    mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn(),
        },
        repos: {
          listPullRequestsAssociatedWithCommit: jest.fn(),
          getCommit: jest.fn(),
        },
      },
    };

    (github.getOctokit as jest.MockedFunction<typeof github.getOctokit>)
      .mockReturnValue(mockOctokit as any);

    // Setup github context mock
    Object.defineProperty(github, "context", {
      value: {
        repo: {
          owner: "test-owner",
          repo: "test-repo",
        },
        sha: "abc123",
      },
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore real timers after each test
    jest.useRealTimers();
  });

  it("should process PR with no labels", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1, labels: [] }],
    });

    await run();

    expect(mockExportVariable).not.toHaveBeenCalled();
    expect(mockSetOutput).toHaveBeenCalledWith("labels", "  ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {});
  });

  it("should process PR with single label", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [{ name: "bug" }],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(mockExportVariable).toHaveBeenCalledWith("GITHUB_PR_LABEL_BUG", "1");
    expect(mockSetOutput).toHaveBeenCalledWith("labels", " bug ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", { bug: true });
  });

  it("should process PR with multiple labels", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [
          { name: "bug" },
          { name: "enhancement" },
          { name: "documentation" },
        ],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(mockExportVariable).toHaveBeenCalledTimes(3);
    expect(mockExportVariable).toHaveBeenCalledWith("GITHUB_PR_LABEL_BUG", "1");
    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_ENHANCEMENT",
      "1"
    );
    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_DOCUMENTATION",
      "1"
    );

    expect(mockSetOutput).toHaveBeenCalledWith(
      "labels",
      " bug enhancement documentation "
    );
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {
      bug: true,
      enhancement: true,
      documentation: true,
    });
  });

  it("should handle labels with special characters", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [
          { name: "needs review" },
          { name: "WIP: feature" },
          { name: "type/bug-fix" },
        ],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_NEEDS_REVIEW",
      "1"
    );
    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_WIP_FEATURE",
      "1"
    );
    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_TYPE_BUG_FIX",
      "1"
    );

    expect(mockSetOutput).toHaveBeenCalledWith(
      "labels",
      " needs-review wip-feature type-bug-fix "
    );
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {
      "needs-review": true,
      "wip-feature": true,
      "type-bug-fix": true,
    });
  });

  it("should handle labels with accents and unicode", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [{ name: "café" }, { name: "naïve" }],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_CAFE",
      "1"
    );
    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_NAIVE",
      "1"
    );

    expect(mockSetOutput).toHaveBeenCalledWith("labels", " café naïve ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {
      café: true,
      naïve: true,
    });
  });

  it("should handle commit with no associated PRs", async () => {
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [],
    });

    const runPromise = run();
    
    // Fast-forward through all retries
    await jest.runAllTimersAsync();
    await runPromise;

    expect(mockExportVariable).not.toHaveBeenCalled();
    expect(mockSetOutput).toHaveBeenCalledWith("labels", "  ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {});
    expect(mockWarning).toHaveBeenCalledWith(
      expect.stringContaining("No PR found after")
    );
  });

  it("should retrieve github token from input", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(mockGetInput).toHaveBeenCalledWith("github-token", {
      required: true,
    });
    expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
  });

  it("should use correct github context", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit
    ).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      commit_sha: "abc123",
    });
  });

  it("should log info messages for each label", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [{ name: "bug" }, { name: "enhancement" }],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(mockInfo).toHaveBeenCalledWith(
      expect.stringContaining("Found label bug")
    );
    expect(mockInfo).toHaveBeenCalledWith(
      expect.stringContaining("GITHUB_PR_LABEL_BUG=1")
    );
    expect(mockInfo).toHaveBeenCalledWith(
      expect.stringContaining("Found label enhancement")
    );
  });

  it("should handle labels with quotes", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [{ name: `"quoted"` }, { name: `'single'` }],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_QUOTED",
      "1"
    );
    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_SINGLE",
      "1"
    );

    expect(mockSetOutput).toHaveBeenCalledWith("labels", " quoted single ");
  });

  it("should handle labels with consecutive underscores", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 1,
        labels: [{ name: `feeling__lucky` }, { name: `foo ____bar` }],
        merged_at: "2026-01-01T00:00:00.000Z",
      },
    });
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [{ number: 1 }],
    });

    await run();

    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_FEELING_LUCKY",
      "1"
    );
    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_FOO_BAR",
      "1"
    );

    expect(mockSetOutput).toHaveBeenCalledWith(
      "labels",
      " feeling-lucky foo-bar "
    );
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {
      "feeling-lucky": true,
      "foo-bar": true,
    });
  });

  describe("retry logic", () => {
    it("should retry when no PR is found initially and succeed on second attempt", async () => {
      // First call returns no PRs, second call returns a PR
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ number: 1 }] });

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          number: 1,
          labels: [{ name: "bug" }],
          merged_at: "2026-01-01T00:00:00.000Z",
        },
      });

      const runPromise = run();

      // Fast-forward through the first delay
      await jest.advanceTimersByTimeAsync(3000);
      await runPromise;

      expect(
        mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit
      ).toHaveBeenCalledTimes(2);
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("Attempt 1/3: No PR found yet")
      );
      expect(mockSetOutput).toHaveBeenCalledWith("labels", " bug ");
    });

    it("should retry when PR has no labels on first attempt (just merged)", async () => {
      const justMergedTime = new Date(Date.now() - 2000).toISOString(); // 2 seconds ago

      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
        data: [{ number: 1 }],
      });

      // First call: no labels (just merged), second call: has labels
      mockOctokit.rest.pulls.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            labels: [],
            merged_at: justMergedTime,
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 1,
            labels: [{ name: "bug" }],
            merged_at: justMergedTime,
          },
        });

      const runPromise = run();

      // Fast-forward through retry delay
      await jest.advanceTimersByTimeAsync(3000);
      await runPromise;

      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledTimes(2);
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("PR #1 was just merged and has no labels yet")
      );
      expect(mockSetOutput).toHaveBeenCalledWith("labels", " bug ");
    });

    it("should not retry when PR has no labels and was not just merged", async () => {
      const oldMergeTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
        data: [{ number: 1 }],
      });

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          number: 1,
          labels: [],
          merged_at: oldMergeTime,
        },
      });

      await run();

      // Should only call once since PR is old enough
      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledTimes(1);
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("Found PR #1 with no labels")
      );
      expect(mockSetOutput).toHaveBeenCalledWith("labels", "  ");
    });

    it("should exhaust all retries when PR is never found", async () => {
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
        data: [],
      });

      const runPromise = run();

      // Fast-forward through all 3 retry delays (3 seconds each)
      await jest.advanceTimersByTimeAsync(3000);
      await jest.advanceTimersByTimeAsync(3000);
      await jest.advanceTimersByTimeAsync(3000);
      await runPromise;

      expect(
        mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit
      ).toHaveBeenCalledTimes(3);
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("No PR found after 3 attempts")
      );
    });

    it("should exhaust retries when PR exists but labels never appear", async () => {
      const justMergedTime = new Date(Date.now() - 2000).toISOString();

      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
        data: [{ number: 1 }],
      });

      // Always return no labels
      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          number: 1,
          labels: [],
          merged_at: justMergedTime,
        },
      });

      const runPromise = run();

      // Fast-forward through all retry delays
      await jest.advanceTimersByTimeAsync(3000);
      await jest.advanceTimersByTimeAsync(3000);
      await runPromise;

      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledTimes(3);
      expect(mockSetOutput).toHaveBeenCalledWith("labels", "  ");
      expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {});
    });

    it("should succeed on third attempt after two retries", async () => {
      // Simulate PR taking time to be associated
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ number: 1 }] });

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          number: 1,
          labels: [{ name: "enhancement" }],
          merged_at: "2026-01-01T00:00:00.000Z",
        },
      });

      const runPromise = run();

      // Fast-forward through two delays
      await jest.advanceTimersByTimeAsync(3000);
      await jest.advanceTimersByTimeAsync(3000);
      await runPromise;

      expect(
        mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit
      ).toHaveBeenCalledTimes(3);
      expect(mockSetOutput).toHaveBeenCalledWith("labels", " enhancement ");
    });

    it("should handle mixed scenario: PR found late with labels appearing late", async () => {
      const justMergedTime = new Date(Date.now() - 2000).toISOString();

      // PR not found initially
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ number: 1 }] })
        .mockResolvedValueOnce({ data: [{ number: 1 }] });

      // When PR is found, labels not there yet, then appear
      mockOctokit.rest.pulls.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            labels: [],
            merged_at: justMergedTime,
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 1,
            labels: [{ name: "bug" }, { name: "urgent" }],
            merged_at: justMergedTime,
          },
        });

      const runPromise = run();

      // Fast-forward through delays
      await jest.advanceTimersByTimeAsync(3000); // First retry for no PR
      await jest.advanceTimersByTimeAsync(3000); // Second retry for no labels
      await runPromise;

      expect(mockSetOutput).toHaveBeenCalledWith("labels", " bug urgent ");
      expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {
        bug: true,
        urgent: true,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle API errors gracefully", async () => {
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockRejectedValue(
        new Error("API Error")
      );

      await expect(run()).rejects.toThrow("API Error");
    });

    it("should handle PR with no merged_at timestamp", async () => {
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
        data: [{ number: 1 }],
      });

      mockOctokit.rest.pulls.get.mockResolvedValue({
        data: {
          number: 1,
          labels: [],
          merged_at: null, // Not merged yet
        },
      });

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith("labels", "  ");
      expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {});
    });
  });
});