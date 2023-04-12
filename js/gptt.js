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
