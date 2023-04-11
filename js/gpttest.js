import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore, doc, arrayUnion, updateDoc, setDoc, getDoc, collection } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

///////////init database////////////
// const firebaseConfig = {
//     apiKey: "AIzaSyB7_zWxwHufzF2Ztc3-h7XhEpTBW2LslKA",
//     authDomain: "test-7bbdd.firebaseapp.com",
//     projectId: "test-7bbdd",
//     storageBucket: "test-7bbdd.appspot.com",
//     messagingSenderId: "942999556834",
//     appId: "1:942999556834:web:2b980e669574da9f1284bb",
//     measurementId: "G-EDZ5NLDH3Q"
// };

// const app = initializeApp(firebaseConfig);


var gpt_api_key = '';

await get_gpt_api_key().then(api => {
    gpt_api_key = api;
});

/////////init//////////
// setCollapsible();
//////////////////////

var system_prompt = ` 
` 
var assistant_prompt = ` 
`


window.generateFromPrompt = async function () {
    // update summary to reflect new story


    var input = document.getElementById("prompt").value;
    var user_prompt = input;
    var result = ''
    var tokens = 0;

    document.getElementById("result").innerHTML = "generating";
    document.getElementById("token").innerHTML = "generating";


    ///////////generate////////////

    await getPrompt(user_prompt, assistant_prompt, system_prompt).then(message => {
        result = message['choices'][0]['message']['content'];

        document.getElementById("result").innerHTML = result;
        
        //update total tokens
        tokens = message['usage']['total_tokens'];
        var pp_thousand_tokens = 0.002;
        // price = f"{tokens / 1000 * pp_thousand_tokens} USD"
        var token_string = "Tokens: " + tokens + " (" + tokens / 1000 * pp_thousand_tokens * 4.4 + " MYR)";
        document.getElementById("token").innerHTML = token_string;
    });
}

async function getPrompt(user_prompt = '', assistant_prompt = '', system_prompt = '', max_tokens = 350) {
    if (user_prompt === '') {
        user_prompt = 'Write a sad poem about my border collie, Pepper';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gpt_api_key}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    'role': 'system',
                    'content': system_prompt
                },
                {
                    'role': 'assistant',
                    'content': assistant_prompt
                },
                {
                    'role': 'user',
                    'content': user_prompt
                }
            ],
            temperature: 1,
            top_p: 0.4,
            max_tokens: max_tokens
        })
    })
    return await response.json();
}

function setCollapsible() {
    var coll = document.getElementsByClassName("collapsible");
    var i;

    for (i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
          this.classList.toggle("active");
          var content = this.nextElementSibling;
          if (content.style.maxHeight){
            content.style.maxHeight = null;
          } else {
            content.style.maxHeight = content.scrollHeight + "px";
          }
        });
      }
}
