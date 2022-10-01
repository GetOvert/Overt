// Examples:
//   overt:install?package-manager=brew-cask&name=getovert/tap/overt
//   overt:add-source-repository?package-manager=brew&name=getovert/tap&url=https://github.com/GetOvert/homebrew-tap

import { describeTask, Task, TaskNotifyPoints } from "./tasks/model/Task";
import taskQueue from "./tasks/model/TaskQueue";

export function handleURL(urlString: string) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "overt:") return;

    function param(name: string) {
      const param = url.searchParams.get(name);
      if (!param) {
        throw new Error(`Required parameter not provided: ${name}`);
      }
      return param;
    }
    function optionalParam(name: string) {
      return url.searchParams.get(name);
    }

    const [action, notify] = ((): [Task, TaskNotifyPoints] | [] => {
      switch (url.pathname) {
        case "install":
          return [
            {
              type: "install",
              label: `Install ${param("name")}`,
              packageManager: param("package-manager"),
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
              packageManager: param("package-manager"),
              packageIdentifier: param("name"),
            },
            ["before", "after"],
          ];
        case "uninstall":
          return [
            {
              type: "uninstall",
              label: `Uninstall ${param("name")}`,
              packageManager: param("package-manager"),
              packageIdentifier: param("name"),
            },
            ["before", "after"],
          ];
        case "add-source-repository":
          return [
            {
              type: "add-source-repository",
              label: `Add source ${param("name")} to ${param(
                "package-manager"
              )}`,
              packageManager: param("package-manager"),
              name: param("name"),
              url: param("url"),
            },
            ["after"],
          ];
        case "remove-source-repository":
          return [
            {
              type: "remove-source-repository",
              label: `Remove source ${param("name")} from ${param(
                "package-manager"
              )}`,
              packageManager: param("package-manager"),
              name: param("name"),
            },
            ["after"],
          ];
        default:
          return [];
      }
    })();
    if (!action) throw new Error(`Unknown action: ${url.pathname}`);

    taskQueue.push({
      type: "confirm-action",
      label: "Confirm action from URL",

      action,
      notify,

      prompt: `You clicked a link to ${describeTask(
        action
      )}.\n\nDo you want to allow this?\nOnly continue if you trust the source.`,
      promptTitle: "Confirm action from URL",
      confirmButtonTitle: "Continue",
      cancelButtonTitle: "Cancel",
    });
  } catch (error) {
    console.error(`Failed to handle URL: ${urlString}`);
    throw error;
  }
}

window.url.setHandler(handleURL);
