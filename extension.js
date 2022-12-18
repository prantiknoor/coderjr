const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Coder Jr extension activated.");

  let disposable = vscode.commands.registerCommand(
    "coderjr.command",
    async () => {
      // it checks if the cursor in a comment line or not
      const inCommentLine = isInCommentLine();

      if (!inCommentLine) {
        vscode.window.showInformationMessage("You should be in a comment");
        return;
      }

      let statusBarMsg = vscode.window.setStatusBarMessage("Searching...");

      let response = await makeHttpRequestToOpenAi("");

      statusBarMsg.dispose();

      let selection = await insertText(response);

      selectText(selection);
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * This makes http request to openAi with the query as prompt
 *
 * @param {String} query it is the prompt for openai chatGPT
 * 
 * @returns {Promise<String>}
 */
async function makeHttpRequestToOpenAi(query) {
  // TODO make real http request

  return await new Promise((resolve) => {
    setTimeout(() => {
      resolve(`function fahrenheitToCelsius(fahrenheit) {
	return (fahrenheit - 32) / 1.8;
}`);
    }, 2000);
  });
}

/**
 * It inserts text after the comment and 
 * returns the selection of inserted text
 *
 * @param {string} text this will be inserted to the doc
 * @returns {Promise<vscode.Selection>}
 */
async function insertText(text) {
  let editor = vscode.window.activeTextEditor;

  if (!editor) return;

  let lineIndex = editor.selection.active.line;
  let characterIndex = editor.document.lineAt(lineIndex).text.length;
  let insertionPosition = new vscode.Position(lineIndex, characterIndex);
  let edit = new vscode.WorkspaceEdit();
  edit.insert(editor.document.uri, insertionPosition, `\n${text}`);
  vscode.workspace.applyEdit(edit);

	let startLine = lineIndex + 1;
  let startPos = new vscode.Position(startLine, 0);
  let endPos = getEndPosition(text, startLine);

	return new Promise(resolve => {
		setTimeout(() => {
			let selection = new vscode.Selection(startPos, endPos);
			resolve(selection);
		}, 10);
	});
}

/**
 * This Helper function helps to get end position of inserted line
 * 
 * @param {String} text the insertion text
 * @param {number} startLine the index of start line of insertion
 * @returns {vscode.Position}
 */
function getEndPosition(text, startLine) {
  let lines = text.split("\n");
  let line = startLine + lines.length;
  let endPos = new vscode.Position(line, 0);
  return endPos;
}

/**
 * Selects a range of text in the active text editor.
 *
 * @param {vscode.Selection} selection - The start position of the selection range.
 */
function selectText(selection) {
  const textEditor = vscode.window.activeTextEditor;
  textEditor.selection = selection;
}

/**
 * It checks if the active cursor line text is comment or not.
 *
 * @returns {Boolean}
 */
function isInCommentLine() {
  let editor = vscode.window.activeTextEditor;
  if (!editor) return false;

  let lineIndex = editor.selection.active.line;
  let lineText = editor.document.lineAt(lineIndex).text;
  return COMMENT_REGEX.test(lineText);
}

function deactivate() {}

const COMMENT_REGEX = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm;

module.exports = {
  activate,
  deactivate,
};
