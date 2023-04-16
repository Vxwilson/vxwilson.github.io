/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore, doc, getDocs, getDoc, query, orderBy, limit, collection} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";

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

const auth = getAuth();

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, see docs for a list of available properties
    // https://firebase.google.com/docs/reference/js/firebase.User
    const uid = user.uid;
    console.log('uid changed', uid);
    console.log('username', user.uids);

    // this is a window function in another js file (callback)
    try{
        updateAuthState(user);
    } catch (e) {
        console.log(e);
    }
    // updateAuthState(user);
    // ...
  } else {
    // User is signed out
    // ...
  }
});

var apiKey = '';


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

window.onload = async function(){
    await get_gpt_api_key().then(api => {
        apiKey = api;
    });

    await getLatestBlog();
}

window.getCurrentUser = async function(){
    // if (user) {
    //     // User is signed in, see docs for a list of available properties
    //     // https://firebase.google.com/docs/reference/js/firebase.User
    //     // ...
    //   } else {
    //     // No user is signed in.
    //   }
    return auth.currentUser;
}


// set up luck button
window.getLuck = async function(){
    var input = "Write a couple of creative sentences to predict my luck of the day (from 0 to 10), \
    make it oddly specific and non-animal related. Then on a new line rate the luck over 10.";

    document.getElementById("luck").innerHTML = "generating... ";

    await getPrompt(input, '','',100).then(message =>{
        var result = message['choices'][0]['message']['content'];
        document.getElementById("luck").innerHTML = result;
    });
}

// set up getting latest blogpost
window.getLatestBlog = async function(){
    const q = query(collection(db, "blog"), orderBy("date", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
        // return doc.data();
        document.getElementById("latestBlogTitle").innerHTML = "<i style='font-weight:400'></i> " + doc.data().title;
        document.getElementById("latestBlogIntro").innerHTML = "<i style='font-weight:400'></i> " +doc.data().intro;
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
          'Authorization': `Bearer ${apiKey}`
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
          top_p: 0.3,
          max_tokens: max
        })
      })

    return await response.json();
}





