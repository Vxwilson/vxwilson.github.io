var gpt_api_key = '';

const GPTState = {
    NORMAL: 1,
    DAN: 2,
    X: 3
};

let userName = 'User';
let GPTName = 'GPT';
let currentState = GPTState.NORMAL;

let saveMemory = false;
let totalTokens = 0;
let totalTokensThisRound = 0;

let conversation = [
    // {
    //   sender: "User",
    //   timestamp: "2021-05-01T12:00:00Z",
    //   content: "Hi"
    // },
    // {
    //   sender: "GPT",
    //   timestamp: "2021-05-01T12:01:00Z",
    //   content: "Hi, how can I assist you?"
    // },
];

let currentSummary = ``;

/////////init//////////
// await get_gpt_api_key().then(api => {
//     gpt_api_key = api;
// });

setupHeaderButtons();
//////////////////////

var system_prompt = ``;
var assistant_prompt = ``;
var user_prompt = ``;


function setupHeaderButtons() {
    const GPTbutton = document.getElementById("gptStyleButton");

    GPTbutton.addEventListener("click", function () {
        currentState = getNextState(currentState);
        GPTbutton.textContent = getTextForState(currentState);

        //update gptName based on state
        switch (currentState) {
            case GPTState.NORMAL:
                GPTName = "GPT";
                break;
            case GPTState.DAN:
                GPTName = "DAN";
                break;
            case GPTState.V3:
                GPTName = "V3";
                break;
            default:
                GPTName = "GPT";
                break;
        }
    });

    const saveMemoryButton = document.getElementById("memoryButton");

    saveMemoryButton.addEventListener("click", function () {
        saveMemory = !saveMemory;

        if (saveMemory) {
            saveMemoryButton.textContent = "Memory";
        } else {
            saveMemoryButton.textContent = "Memoryless";
        }

        //clear memory regardless
        conversation = [];
        totalTokens = 0;
        currentSummary = "";
        //update UI
        document.getElementById("conversation").innerHTML = "";
    });
}

function getNextState(currentState) {
    switch (currentState) {
        case GPTState.NORMAL:
            return GPTState.DAN;
        //   case State.DAN:
        //     return State.V3;
        //   case State.V3:
        //     return State.NORMAL;
        default:
            return GPTState.NORMAL;
    }
}

function getTextForState(state) {
    switch (state) {
        case GPTState.NORMAL:
            return "Normal";
        case GPTState.DAN:
            return "Dan";
        case GPTState.V3:
            return "V3";
        default:
            return "Normal";
    }
}

function addConversation(sender, content) {
    conversation.push({
        sender: sender,
        timestamp: new Date().toISOString(),
        content: content
    });
}

function updateConversationUI() {
    let conversationUI = document.getElementById("conversation");
    conversationUI.innerHTML = "";
    conversation.forEach(message => {
        let processedMessage = processMessage(message.content);
        conversationUI.innerHTML += `
        <div class="message">
            <p class="message-sender" style="font-weight:bold; color:rgb(138, 133, 114)">${message.sender}</p>
            <p class="message-content"> <b style="color:rgb(74, 66, 78)">></b> ${processedMessage} \n\n</p>
        </div>
        `;
    });
}

function processMessage(message) {
    // add code tags for code inside message while ``` is in message
    while (message.includes('```')) {
        message = message.replace('```', '<code>').replace('```', '</code>');
    }
    return message;
}

// summarize using preexisting summary as context and incorporate the new exchange to produce a new summary that is both concise and detailed.
async function summarize(newUserMessage, newGPTMessage) {
    let prompt = `
    Please generate a very concise (but retaining important details) summary of a conversation between two subjects. 
    You will be provided with a preexisting summary of the prior conversation and ONE new exchange between the two subjects. 
    Your summary MUST be based on the following ruleset: 
    use the preexisting summary as context (if existing), and incorporate the new exchange to produce a new summary that is very concise.

    preexisting summary: [${currentSummary === '' ? 'n/a' : currentSummary}]

    new exchange: 
    user: ${newUserMessage}
    gpt: ${newGPTMessage}
    `

    await getPrompt(prompt, '', '', 175, 0.7, 0.8).then(message => {
        currentSummary = message['choices'][0]['message']['content'];

        totalTokens += message['usage']['total_tokens'];
        totalTokensThisRound += message['usage']['total_tokens'];

        //log to compare prompt and output
        console.log('prompt: \n' + prompt);
        console.log('output: \n' + currentSummary);
    });


}

function updateTokenUI() {
    var pp_thousand_tokens = 0.002;
    var token_string = `Total tokens: ${totalTokens} (${(totalTokens / 1000 * pp_thousand_tokens * 4.4).toFixed(5)}MYR) (+${totalTokensThisRound} tokens)`;
    document.getElementById("token").innerHTML = token_string;
}

// pressing ctrl+enter will trigger the generate button
function setUpGenerateButton() {
    const textarea = document.getElementById('prompt');
    const button = document.getElementById('generateButton');

    textarea.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault(); // prevent default behavior of adding a new line
            button.click(); // trigger click event on the button
        }
    });
}
