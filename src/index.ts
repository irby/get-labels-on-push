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
  octokit: InstanceType<typeof GitHub>,
  maxRetries: number = 3,
  delayMs: number = 1500 // Default 1.5 seconds delay
): Promise<string[]> {
  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;
  const commit_sha = github.context.sha;
  
  core.info(`Looking for PR associated with commit ${commit_sha.substring(0, 7)}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    core.debug(`Attempt ${attempt} to read PR labels from commit ${commit_sha}...`);

    const response = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha,
    });
    
    if (response.data.length > 0) {
      const pr = response.data[0];
      
      // Get full PR details to check if it's fully loaded
      const { data: fullPR } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pr.number,
      });
      
      const labels = fullPR.labels.map((label) => label.name || "");
      const mergedAt = fullPR.merged_at ? new Date(fullPR.merged_at) : null;
      const now = new Date();
      
      // Check if PR was just merged (within last 10 seconds)
      const justMerged = mergedAt && (now.getTime() - mergedAt.getTime()) < 10000;
      
      if (labels.length > 0) {
        // We have labels - we're good!
        core.info(`✓ Found PR #${pr.number} with labels: ${labels.join(', ')}`);
        return labels;
      } else if (justMerged && attempt < maxRetries) {
        // PR just merged and has no labels - might be a timing issue
        core.info(`PR #${pr.number} was just merged and has no labels yet. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      } else {
        // Either:
        // 1. PR genuinely has no labels
        // 2. PR is old enough that labels should be loaded
        core.info(`✓ Found PR #${pr.number} with no labels`);
        return [];
      }
    }
    
    if (attempt < maxRetries) {
      core.warning(`Attempt ${attempt}/${maxRetries}: No PR found yet, waiting ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  core.warning(`⚠ No PR found after ${maxRetries} attempts. This might be a direct push to main.`);
  return [];
}

function nameToIdentifier(name: string) {
    return name
        .replace(/['"“‘”’]+/gu, '')  // remove quotes
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')  // non alphanum to dashes
        .replace(/-+/g, '-')  // remove consecutive dashes
        .toLowerCase()
}

function nameToEnvironmentVariableName(name: string) {
    return 'GITHUB_PR_LABEL_' + (
        _deburr(name)  // remove accents
            .replace(/['"“‘”’]+/gu, '')  // remove quotes
            .replace(/[^\w]+/g, '_')  // non-alphanum to underscores
            .replace(/_+/g, '_')  // remove consecutive underscores
            .toUpperCase()
    )
}

function appendLabelsObject(labelObject: {[k: string]: true}, identifier: string) {
    labelObject[identifier] = true;
}
