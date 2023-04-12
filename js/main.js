/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore, doc, getDoc} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";



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

window.get_gpt_api_key = async function(){
    const docRef = doc(db, "cred_admin", "passcode");
    var api = '';
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        var api = docSnap.data().gpt_api_key;
    } else { 
        console.log("No api key found!");
    }
    return api;
}

// var gpt_api_key = '';

// await get_gpt_api_key().then(api =>{
//     gpt_api_key = api;
// });

window.getLuck = async function(){
    var input = "Write two sentences randomly about my luck of the day, \
    make it creative and fun, with absurdism elements. Then on a new line rate the luck over 10.";

    document.getElementById("luck").innerHTML = "generating... ";

    await getPrompt(input).then(message =>{
        var result = message['choices'][0]['message']['content'];
        document.getElementById("luck").innerHTML = result;
    });
}

async function getPrompt(user_prompt='', system_prompt='', assistant_prompt='', max=100){
    if(user_prompt === ''){
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
                  'role':'system',
                  'content': system_prompt
              },
              {
                'role':'assistant',
                'content': assistant_prompt
              },
              {
                  'role': 'user',
                  'content': user_prompt
              }
          ],
          temperature: 1,
          top_p: 0.5,
          frequency_penalty: 0.7,
          max_tokens: max
        })
      })

    return await response.json();
}



