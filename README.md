# PR Labels on Push

A Github action that extracts labels from the most recent push and makes them available to other actions. Labels are available as step outputs and environment variables that you can use in later steps in your action.

## How do I use this?

Perhaps you have a test that you only want to run when PR label `release:master` is set. Your workflow should look like this:

```yaml
jobs:
  test:
    steps:
      - name: Get PR labels
        id: pr-labels
        uses: irby/get-labels-on-push@v1.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      # GITHUB_PR_LABEL_RELEASE_MASTER was set by pr-labels action
      - run: |
          if [ -n "$GITHUB_PR_LABEL_RELEASE_MASTER" ]; then
            echo "This is a release label!"
          fi

      # or you can use the action output.
      # For the label name, use lowercase kebab-case and surround with spaces
      - run: |
          scripts/release-major.sh
        if: contains(steps.pr-labels.outputs.labels, ' release-major ')
```

## Code Based on the Following

I created this GitHub Action to combine the behaviors of these two different GitHub Actions. I am in great gratitude to these projects for forming the basis of this project.

- [joerick/pr-labels-action](https://github.com/joerick/pr-labels-action)
- [shioyang/check-pr-labels-on-push-action](https://github.com/shioyang/check-pr-labels-on-push-action)
