// Examples:
//   overt:brew?1=update&1[name]=node
//   overt:brew-cask?1=add-source-repository&1[name]=getovert/tap&1[url]=https://github.com/getovert/homebrew-tap&2=install&2[name]=overt

import {
  ConfirmActionTask,
  describeTask,
  promptCannedMessageForTask,
  Task,
  TaskNotifyPoints,
  urlInTask,
} from "../Task";
import taskQueue from "../TaskQueue";

export async function handleURL(urlString: string) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "overt:") return;

    const packageManager = url.pathname;

    const actionNames: string[] = [...url.searchParams.keys()]
      .map(Number)
      .filter((key) => !isNaN(key))
      .sort()
      .map((key) => url.searchParams.get(`${key}`) as string);

    const actions: [Task, TaskNotifyPoints][] = actionNames.map(
      (actionName, index) => {
        function param(name: string) {
          const param = optionalParam(name);
          if (!param) {
            throw new Error(
              `Required parameter not provided: ${index + 1}[${name}]`
            );
          }
          return param;
        }
        function optionalParam(name: string) {
          return url.searchParams.get(`${index + 1}[${name}]`);
        }

        switch (actionName) {
          case "install":
            return [
              {
                type: "install",
                label: `Install ${param("name")}`,
                packageManager,
                packageIdentifier: param("name"),
              },
              ["before", "after"],
            ];
          case "update":
          case "upgrade":
            return [
              {
                type: "upgrade",
                label: `Update ${param("name")}`,
                packageManager,
                packageIdentifier: param("name"),
              },
              ["before", "after"],
            ];
          case "uninstall":
            return [
              {
                type: "uninstall",
                label: `Uninstall ${param("name")}`,
                packageManager,
                packageIdentifier: param("name"),
              },
              ["before", "after"],
            ];
          case "add-source-repository":
            return [
              {
                type: "add-source-repository",
                label: `Add source ${param("name")} to ${packageManager}`,
                packageManager,
                name: param("name"),
                url: param("url"),
              },
              ["after"],
            ];
          case "remove-source-repository":
            return [
              {
                type: "remove-source-repository",
                label: `Remove source ${param("name")} from ${packageManager}`,
                packageManager,
                name: param("name"),
              },
              ["after"],
            ];
          default:
            throw new Error(`Unknown action: ${url.pathname}`);
        }
      }
    );

    const confirmActionTasks = actions.map(
      ([action, notify], index): ConfirmActionTask => ({
        type: "confirm-action",
        label: "Confirm action from URL",

        action,
        notify,

        promptTitle: `Confirm action from URL (${index + 1}/${actions.length})`,
        prompt: `You clicked a link to ${describeTask(action)}.`,
        promptCannedMessage: promptCannedMessageForTask(action),
        url: urlInTask(action),
        confirmButtonTitle: "Continue",
        cancelButtonTitle: "Cancel",
      })
    );

    for (const task of confirmActionTasks) {
      const deadTask = await taskQueue.push(task);
      if (deadTask.state !== "succeeded") break;
    }
  } catch (error) {
    console.error(`Failed to handle URL: ${urlString}`);
    throw error;
  }
}

window.url.setHandler(handleURL);
