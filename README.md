# PR Labels on Push

A GitHub Action that extracts labels from the pull request associated with a pushed commit and makes them available to other steps in your workflow. Labels are exposed as **step outputs** and **environment variables**, allowing you to conditionally run jobs or steps based on PR labels.

This action is intended to be used with `push` events where the pushed commit is part of a pull request.

---

## How do I use this?

Perhaps you have a test or release step that should only run when a PR label such as `release:master` is set. Your workflow might look like this:

```yaml
jobs:
  test:
    # Explicit permissions required for this action
    permissions:
      contents: read
      pull-requests: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Get PR labels
        id: pr-labels
        uses: irby/get-labels-on-push@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      # Environment variables are created for each label
      # Label names are normalized to uppercase and non-alphanumeric
      # characters are replaced with underscores.
      - run: |
          if [ -n "$GITHUB_PR_LABEL_RELEASE_MASTER" ]; then
            echo "This is a release label!"
          fi

      # Or use the action output.
      # The labels output is a space-delimited string of lowercase
      # kebab-case label names, surrounded by spaces.
      - run: |
          scripts/release-major.sh
        if: contains(steps.pr-labels.outputs.labels, ' release-major ')
```

### Previous Versions of GitHub Action

You can reference or pin previous versions of this GitHub Action by referencing an existing [tag](https://github.com/irby/get-labels-on-push/tags).

For example:

```yaml
  - name: Get PR labels
        id: pr-labels
        uses: irby/get-labels-on-push@v1.0.1
```

## Code Based on the Following

I created this GitHub Action to combine the behaviors of these two different GitHub Actions. I am in great gratitude to these projects for forming the basis of this project.

- [joerick/pr-labels-action](https://github.com/joerick/pr-labels-action)
- [shioyang/check-pr-labels-on-push-action](https://github.com/shioyang/check-pr-labels-on-push-action)
