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

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup core mocks
    mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
    mockExportVariable = core.exportVariable as jest.MockedFunction<typeof core.exportVariable>;
    mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;
    mockInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockDebug = core.debug as jest.MockedFunction<typeof core.debug>;

    // Setup default return values
    mockGetInput.mockReturnValue("fake-token");

    // Setup octokit mock
    mockOctokit = {
      rest: {
        repos: {
          listPullRequestsAssociatedWithCommit: jest.fn(),
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

  it("should process PR with no labels", async () => {
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [],
        },
      ],
    });

    await run();

    expect(mockExportVariable).not.toHaveBeenCalled();
    expect(mockSetOutput).toHaveBeenCalledWith("labels", "  ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {});
  });

  it("should process PR with single label", async () => {
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [{ name: "bug" }],
        },
      ],
    });

    await run();

    expect(mockExportVariable).toHaveBeenCalledWith("GITHUB_PR_LABEL_BUG", "1");
    expect(mockSetOutput).toHaveBeenCalledWith("labels", " bug ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", { bug: true });
  });

  it("should process PR with multiple labels", async () => {
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [
            { name: "bug" },
            { name: "enhancement" },
            { name: "documentation" },
          ],
        },
      ],
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
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [
            { name: "needs review" },
            { name: "WIP: feature" },
            { name: "type/bug-fix" },
          ],
        },
      ],
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
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [{ name: "café" }, { name: "naïve" }],
        },
      ],
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

    await run();

    expect(mockExportVariable).not.toHaveBeenCalled();
    expect(mockSetOutput).toHaveBeenCalledWith("labels", "  ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", {});
  });

  it("should retrieve github token from input", async () => {
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [],
    });

    await run();

    expect(mockGetInput).toHaveBeenCalledWith("github-token", {
      required: true,
    });
    expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
  });

  it("should use correct github context", async () => {
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [],
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
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [{ name: "bug" }, { name: "enhancement" }],
        },
      ],
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
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [{ name: `"quoted"` }, { name: `'single'` }],
        },
      ],
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

  it("should handle labels with non-alphanumeric characters", async () => {
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [{ name: `needs $` }, { name: `#1` }],
        },
      ],
    });

    await run();

    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL_NEEDS_",
      "1"
    );
    expect(mockExportVariable).toHaveBeenCalledWith(
      "GITHUB_PR_LABEL__1",
      "1"
    );

    expect(mockSetOutput).toHaveBeenCalledWith("labels", " needs- -1 ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", { "-1": true, "needs-": true });
  });

  it("should handle labels with consecutive underscores", async () => {
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit.mockResolvedValue({
      data: [
        {
          labels: [{ name: `feeling__lucky` }, { name: `foo ____bar` }],
        },
      ],
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

    expect(mockSetOutput).toHaveBeenCalledWith("labels", " feeling-lucky foo-bar ");
    expect(mockSetOutput).toHaveBeenCalledWith("labels-object", { "feeling-lucky": true, "foo-bar": true });
  });
});