import { spawn } from "child_process";
import * as vscode from "vscode";

interface FormatterConfig {
  command:
    | string
    | {
        [platform in NodeJS.Platform | "*"]: string;
      };
  disabled?: boolean;
  languages: string[];
}

interface ExtensionConfig {
  formatters: readonly FormatterConfig[];
}

let disposables: readonly vscode.Disposable[] = [];

/** Called when extension is activated */
export function activate(_context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Josephus' Custom Formatters");
  disposables = registerFormatters(getFormatterConfigs(), outputChannel);

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (!e.affectsConfiguration("josephusCustomFormatters")) return;
    disposables.forEach((d) => d.dispose());
    disposables = registerFormatters(getFormatterConfigs(), outputChannel);
    outputChannel.appendLine("Reloaded custom formatter configurations");
  });

  disposables = registerFormatters(getFormatterConfigs(), outputChannel);
}

function getFormatterConfigs(): readonly FormatterConfig[] {
  const config = vscode.workspace.getConfiguration("josephusCustomFormatters");
  return config.get<ExtensionConfig["formatters"]>("formatters", []);
}

function registerFormatters(
  formatters: readonly FormatterConfig[],
  outputChannel: vscode.OutputChannel,
): readonly vscode.Disposable[] {
  return formatters
    .flatMap((formatter) => {
      if (formatter.disabled) return [];

      if (!formatter.languages) {
        vscode.window.showErrorMessage("Custom formatter does not have any languages defined");
        return [];
      }

      let commandTemplate: string;
      if (typeof formatter.command === "string") {
        commandTemplate = formatter.command;
      } else {
        let platformCommand = formatter.command[process.platform];
        if (!platformCommand) platformCommand = formatter.command["*"];
        commandTemplate = platformCommand;
      }

      if (!commandTemplate) {
        vscode.window.showWarningMessage(
          "Not registering custom formatter for languages " +
            JSON.stringify(formatter.languages) +
            ", because no command is specified for this platform",
        );
        return [];
      }

      return [
        vscode.languages.registerDocumentFormattingEditProvider(formatter.languages, {
          provideDocumentFormattingEdits(document, options) {
            return formatDocument(document, options, commandTemplate, outputChannel);
          },
        }),
      ];
    })
    .filter((v) => v != null) as vscode.Disposable[];
}

function formatDocument(
  document: vscode.TextDocument,
  options: vscode.FormattingOptions,
  commandTemplate: string,
  outputChannel: vscode.OutputChannel,
): Promise<vscode.TextEdit[]> {
  const command = commandTemplate
    .replace(/\${file}/g, document.fileName)
    .replace(/\${fileRelativeToWorkspace}/g, vscode.workspace.asRelativePath(document.fileName))
    .replace(/\${insertSpaces}/g, "" + options.insertSpaces)
    .replace(/\${tabSize}/g, "" + options.tabSize);

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const workspaceFolderFallback = vscode.workspace.workspaceFolders?.[0];
  const cwd = workspaceFolder?.uri?.fsPath || workspaceFolderFallback?.uri.fsPath;

  return new Promise<vscode.TextEdit[]>((resolve, reject) => {
    outputChannel.appendLine(`Started formatter: ${command}`);

    const textToFormat = document.getText();
    const targetRange = new vscode.Range(
      document.lineAt(0).range.start,
      document.lineAt(document.lineCount - 1).rangeIncludingLineBreak.end,
    );

    const startedAt = Date.now();
    const process = spawn(command, { cwd, shell: true });
    process.stdout.setEncoding("utf8");
    process.stderr.setEncoding("utf8");

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    process.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    process.on("close", (code, signal) => {
      const duration = Date.now() - startedAt;

      if (code !== 0) {
        const reason = signal
          ? `terminated by signal ${signal} (likely due to a timeout or external termination)`
          : `exited with code ${code}`;
        const message = `Formatter failed in ${duration}ms: ${command}\nReason: ${reason}`;
        outputChannel.appendLine(message);

        if (stderr !== "") {
          outputChannel.appendLine(`Stderr:\n${stderr}`);
        }
        if (stdout !== "") {
          outputChannel.appendLine(`Stdout:\n${stdout}`);
        }

        vscode.window.showErrorMessage(message, "Show output").then((selection) => {
          if (selection === "Show output") {
            outputChannel.show();
          }
        });

        reject(new Error(message));

        return;
      }

      if (textToFormat.length > 0 && stdout.length === 0) {
        outputChannel.appendLine(`Formatter returned nothing in ${duration}ms - not applying changes.`);
        resolve([]);
        return;
      }

      outputChannel.appendLine(`Finished running formatter in ${duration}ms: ${command}`);
      if (stderr.length > 0) {
        outputChannel.appendLine(`Possible issues occurred:\n${stderr}`);
      }

      resolve([new vscode.TextEdit(targetRange, stdout)]);

      return;
    });

    process.stdin.write(textToFormat);

    process.stdin.end();
  });
}

/** Called when extension is deactivated */
export function deactivate() {
  disposables.forEach((d) => d.dispose());
}
