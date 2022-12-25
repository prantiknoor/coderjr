const vscode = require("vscode");
const axios = require("axios");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Coder Jr extension activated.");

  let disposable = vscode.commands.registerCommand(
    "coderjr.command",
    async () => {
      let apiKey = getApiKey();
      if (!apiKey) {
        let input = await openInputBoxForApiKey();
        if (!input) {
          const action = "How to get API KEY";
          const action2 = "Get API Key";
          let clickedAction = await vscode.window.showWarningMessage(
            "Please enter you API Key", action, action2);
          if (clickedAction === action) {
            openLink(VIDEO_GUIDE_URL);
          } else if (clickedAction === action2) {
            openLink(GETTING_API_KEY_URL);
          }
          return;
        }
        apiKey = input;
        storeApiKey(apiKey);
      }

      const comment = getComment();

      if (!comment) {
        return vscode.window.showWarningMessage(
          "You should be in a position to comment."
        );
      } else if (comment.split(" ").length < 3) {
        return vscode.window.showWarningMessage(
          "You must use a minimum of three words."
        );
      }

      let statusBarMsg = vscode.window.setStatusBarMessage("Searching...");

      let response = await requestToOpenAi(comment, apiKey);

      statusBarMsg.dispose();

      if (response.status === "failed") {
        vscode.window.setStatusBarMessage("Failed", 3000);
        return vscode.window.showErrorMessage(response.msg);
      }

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
 * @param {String} apiKey the API Key of OpenAI
 *
 * @returns {Promise<Object>}
 */
async function requestToOpenAi(query, apiKey) {
  let languageId = vscode.window.activeTextEditor.document.languageId;

  const options = {
    method: "POST",
    url: "https://api.openai.com/v1/completions",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    data: {
      model: "text-davinci-003",
      prompt: `${query} (${languageId})`,
      temperature: 0.3,
      max_tokens: 290,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
  };

  let response;
  try {
    response = await axios.default.request(options);
  } catch (err) {
    response = err.response;
    storeApiKey(""); // Remove the invalid API Key.
    return { status: "failed", msg: response.data.error.message };
  }

  if (response.status !== 200)
    return { status: "failed", msg: response.statusText };

  let text = response.data.choices[0].text;
  return text.slice(2, text.length);
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

  return new Promise((resolve) => {
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
 * It gives comment if the cursor is in a comment line
 * Else it will return an empty string
 *
 * @returns {String}
 */
function getComment() {
  let editor = vscode.window.activeTextEditor;
  if (!editor) return "";

  let lineIndex = editor.selection.active.line;
  let lineText = editor.document.lineAt(lineIndex).text;

  let comments, i = 0;
  do {
    comments = lineText.match(COMMENT_REGEX[i]);
  } while (++i < COMMENT_REGEX.length && !comments);

  if (!comments) return "";
  let comment = comments[0].replace(/\/\/|\/\*|\*\/|#|<!--|-->/g, "");
  return comment.trim();
}

async function openInputBoxForApiKey() {
  let input = await vscode.window.showInputBox({
    placeHolder: 'Enter your API Key of OpenAI'
  });
  return input;
}

async function storeApiKey(apiKey) {
  let config = vscode.workspace.getConfiguration();
  config.update('openAi.apiKey', apiKey, true);
}

function getApiKey() {
  let config = vscode.workspace.getConfiguration();
  let apiKey = config.get('openAi.apiKey');
  return apiKey;
}

function openLink(link) {
  var url = vscode.Uri.parse(link);
  vscode.env.openExternal(url).then((success) => {
    if (success) {
      console.log(`Successfully opened ${url} in the browser`);
    } else {
      console.error(`Failed to open ${url} in the browser`);
    }
  });
}

function deactivate() { }


const VIDEO_GUIDE_URL = "http://www.youtube.com/watch?v=HHoCB_qZlks";
const GETTING_API_KEY_URL = "https://beta.openai.com/account/api-keys";

const COMMENT_REGEX = [
  /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, // /* */ , //
  /#[^\n]*/g, // #
  /<!--([\s\S]*?)-->/g // <!-- -->
];

module.exports = {
  activate,
  deactivate,
};
