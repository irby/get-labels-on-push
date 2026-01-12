import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import _deburr from 'lodash/deburr';

export async function run() {
  core.debug("Start");

  const token = core.getInput("github-token", { required: true });
  const octokit = github.getOctokit(token);

  const labelNames = await getPullRequestLabelNames(octokit);
  core.debug(`PR label names: ${labelNames}`);
  const labelsObject: {[k: string]: true} = {}

  for (const label of labelNames)
  {
    const identifier = nameToIdentifier(label);
    const environmentVariable = nameToEnvironmentVariableName(label);

    core.exportVariable(environmentVariable, '1');
    core.info(`\nFound label ${label}. \n  Setting env var for remaining steps: ${environmentVariable}=1`)
    appendLabelsObject(labelsObject, identifier)
  }

  const labelsString = ' ' + Object.keys(labelsObject).join(' ') + ' '

  core.info(`\nAction output:\nlabels: ${JSON.stringify(labelsString)}\nlabels-object: ${JSON.stringify(labelsObject)}`)
  core.setOutput('labels', labelsString);
  core.setOutput('labels-object', labelsObject);
}

async function getPullRequestLabelNames(
  octokit: InstanceType<typeof GitHub>
): Promise<string[]> {
  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;
  const commit_sha = github.context.sha;
  core.debug(
    `PR context - Owner: ${owner} Repo: ${repo} Commit_SHA: ${commit_sha}`
  );

  const response =
    await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha,
    });
  core.debug(`Retrieved commit data: ${response.data}`);

  const pr = response.data.length > 0 && response.data[0];
  core.debug(`Retrieved PR: ${pr}`);

  return pr ? pr.labels.map((label) => label.name || "") : [];
}

export function nameToIdentifier(name: string) {
    return name
        .replace(/['"“‘”’]+/gu, '')  // remove quotes
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')  // non alphanum to dashes
        .replace(/-+/g, '-')  // remove consecutive dashes
        .toLowerCase()
}

export function nameToEnvironmentVariableName(name: string) {
    return 'GITHUB_PR_LABEL_' + (
        _deburr(name)  // remove accents
            .replace(/['"“‘”’]+/gu, '')  // remove quotes
            .replace(/[^\w]+/g, '_')  // non-alphanum to underscores
            .replace(/_+/g, '_')  // remove consecutive underscores
            .toUpperCase()
    )
}

export function appendLabelsObject(labelObject: {[k: string]: true}, identifier: string) {
    labelObject[identifier] = true;
}
