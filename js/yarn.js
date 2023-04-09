import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore, doc, arrayUnion, updateDoc, setDoc, getDoc, collection } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

///////////init database////////////
const firebaseConfig = {
    apiKey: "AIzaSyB7_zWxwHufzF2Ztc3-h7XhEpTBW2LslKA",
    authDomain: "test-7bbdd.firebaseapp.com",
    projectId: "test-7bbdd",
    storageBucket: "test-7bbdd.appspot.com",
    messagingSenderId: "942999556834",
    appId: "1:942999556834:web:2b980e669574da9f1284bb",
    measurementId: "G-EDZ5NLDH3Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const storiesRef = doc(db, "yarn", "stories");
const storiesSnap = await getDoc(storiesRef);

var gpt_api_key = '';

await get_gpt_api_key().then(api => {
    gpt_api_key = api;
});

if (storiesSnap.exists()) {
    console.log("Document data:", storiesSnap.data());
} else {
    console.log("No such document!");
}

var story_data = storiesSnap.data();
var summary = story_data["summary"];


/////////init//////////
setCollapsible();
var full_story = composeStory();
document.getElementById("fullstory").innerHTML = full_story;

//////////////////////

var system_prompt = " \
You are Yarn the writer, good at following style guiding to write continuations of existing stories. \
"
// var assistant_prompt = ` 
// General style:
// ${story_data['style']}

// Existing summary:
// ${summary}

// You have been providing a style guide, concise summary of an existing story. Based on user prompt detailing 
// how next paragraph should be, you are to generate two paragraphs with the following format: 

// [100 word paragraph based on the prompt]
// Summary: [one paragraph of summary, must retain all existing important information + new content]
// `


var assistant_prompt = ` 
Style guide:
${story_data['style']}

Existing summary:
${summary}

You are provided a style guide and concise summary of an existing story. Based on user prompt detailing 
how next paragraph should be, generate one: 

[medium-length paragraph based that advances the plot]
`
// display summary 
document.getElementById("summary").innerHTML = summary;

//generate story from database
function composeStory(){
    var story = '';
    var paragraphs = story_data["paragraphs"];
    console.log(paragraphs);
    for (let i = 0; i < paragraphs.length; i++) {
        story += paragraphs[i]['paragraph'] + "\n\n";
    }
    console.log(story);

    return story;
}

window.generateFromPrompt = async function () {
    // update summary to reflect new story
    document.getElementById("summary").innerHTML = summary;


    var input = document.getElementById("prompt").value;
    var user_prompt = "[" + input + "]";
    var result = ''
    var tokens = 0;

    document.getElementById("result").innerHTML = "generating";
    document.getElementById("token").innerHTML = "generating";


    ///////////generate////////////

    await getPrompt(user_prompt, assistant_prompt, system_prompt).then(message => {
        console.log(message);
        result = message['choices'][0]['message']['content'];

        document.getElementById("result").innerHTML = result;
        console.log('result: ' + result);
        tokens = tokens + message['usage']['total_tokens'];
    });

    // add para
    await updateDoc(storiesRef, {
        paragraphs: arrayUnion({ paragraph: result })
    });


    ///////////summarize////////////

    var assistant_prompt2 =
        `
    Can you please generate a summary a story so far? I will provide you two paragraphs: one that summarizes all the important events until now, and another paragraph. 
    Please create a concise summary that covers the two paragraphs and retain important information. Do NOT write new paragraphs.
    `

    var input_prompt2 =
        `
    Summary:
    ${summary}
    New paragraph:
    ${result}
    `
    await getPrompt(input_prompt2, assistant_prompt2).then(message => {
        var result = message['choices'][0]['message']['content'];
        summary = result;


        tokens = tokens + message['usage']['total_tokens'];
        var pp_thousand_tokens = 0.002;
        // price = f"{tokens / 1000 * pp_thousand_tokens} USD"
        var token_string = "Tokens: " + tokens + " (" + tokens / 1000 * pp_thousand_tokens * 4.4 + " MYR)";
        document.getElementById("token").innerHTML = token_string;
    });

    // update summary
    await updateDoc(storiesRef, { summary: summary });

}

async function getPrompt(user_prompt = '', assistant_prompt = '', system_prompt = '') {
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
            max_tokens: 180
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
