import * as core from "@actions/core";
import { Toolkit } from "actions-toolkit";

/**
 * @typedef {object} Args
 * @property {string} command
 * @property {boolean} verbose
 */

/**
 * Get action arguments.
 *
 * @return {Args}
 */
function getArgs() {
  const keys = ["command", "verbose"];
  const args = {};
  for (const key of keys) {
    args[key] = core.getInput(key);
  }
  return args;
}

/**
 * Exec command.
 *
 * @param {Toolkit<void, void>} tools
 * @param {string} commandLine - command to execute
 * @return Promise<void>
 */
async function exec(tools, commandLine) {
  const exitCode = await tools.exec(commandLine);
  if (exitCode !== 0) {
    throw new Error(`${commandLine} returned ${exitCode}`);
  }
}

/**
 * @param {Toolkit<void, void>} tools
 */
async function setupRepository(tools) {
  try {
    await exec(tools, `git config --global --add safe.directory ${process.env.GITHUB_WORKSPACE}`);
  } catch (e) {
    throw new Error(`Setup repository: ${e}`);
  }
}

/**
 * Exec given command.
 *
 * @param {Toolkit<void, void>} tools
 * @param {string} command
 */
async function execCommand(tools, command) {
  await exec(tools, command);
}

/**
 * Exec `git status --short`.
 *
 * @param {Toolkit<void, void>} tools
 * @return {string} stdout
 */
async function gitStatus(tools) {
  let stdout = "";
  const options = {};
  options.listeners = {
    stdout: (data) => {
      stdout += data.toString();
    },
  };
  const exitCode = await tools.exec("git", ["status", "--short"], options);
  if (exitCode !== 0) {
    throw new Error("git status");
  }
  return stdout;
}

/**
 * Display detailed status.
 *
 * @param {Toolkit<void, void>} tools
 * @param {string} stdout - stdout of `git status --short`
 */
async function describeGitStatus(tools, stdout) {
  for (const line of stdout.split("\n").filter((x) => x)) {
    await core.group(line, async () => {
      const [tag, target] = line.trim().split(/[ ]+/);
      switch (tag) {
        case "A": // added
          await exec(tools, `cat ${target}`);
          break;
        case "M": // modified
          await exec(tools, `git diff @ -- ${target}`);
          break;
      }
    });
  }
}

/**
 * Check diffs.
 *
 * @param {Toolkit<void, void>} tools
 * @param {boolean} verbose
 * @return {boolean} if true, diff found
 */
async function diffAction(tools, verbose) {
  await exec(tools, "git add -A");
  const stdout = await gitStatus(tools);
  if (stdout === "") {
    return false;
  }
  if (verbose) {
    await describeGitStatus(tools, stdout);
  }
  return true;
}

/**
 * @param {Toolkit<void, void>} tools
 * @return {boolean} if true, diff found
 */
async function run(tools) {
  core.startGroup("Get args");
  const args = getArgs();
  core.endGroup();
  await core.group("Setup repository", async () => {
    await setupRepository(tools);
  });
  await core.group("Execute command", async () => {
    await execCommand(tools, args.command);
  });
  return await core.group("Diff action", async () => {
    return await diffAction(tools, args.verbose);
  });
}

/**
 * @param {Toolkit<void, void>} tools
 */
async function main(tools) {
  try {
    const diffFound = await run(tools);
    if (diffFound) {
      tools.exit.failure("Diff found!");
    }
  } catch (e) {
    tools.exit.failure(e);
  }
}

Toolkit.run(main);
