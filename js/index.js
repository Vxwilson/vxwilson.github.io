/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore, doc, getDocs, getDoc, query, orderBy, limit, collection } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
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

// const auth = getAuth();

var apiKey = '';


window.get_gpt_api_key = async function () {
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

window.showChangeLog = async function () {
    // find the element with id "changelog" and set display to block
    //calls the function to parse the changelog text file
    await parseChangelog();

    document.getElementById("changelogModal").style.display = "block";
    document.getElementById("changelogModal").style.opacity = "1";
}


// function to parse the changelog text file
// finds a div with id changelogContent and sets the innerHTML to the parsed changelog
window.parseChangelog = async function () {
    // first clear the changelogContent div
    document.getElementById("changelogContent").innerHTML = "";

    var changelog = await fetch('assets/changelog.txt').then(r => r.text());

    // process changelog; first split by our symbol $$ to get date
    changelog = changelog.split("$$");

    // remove the first element, which is empty
    changelog.shift();
    // print out to console
    console.log(changelog);

    // now we have an array of strings, each string is a date following by the changelog for that date
    // we want, for each element, to create a <span> element with the date, and a <ul> element with the changelog
    // then we want to append these to the changelogContent div

    // create a new div to hold the changelog
    var changelogDiv = document.createElement("div");
    changelogDiv.id = "changelogDiv";

    // reverse the changelog array so that the most recent date is first
    changelog.reverse();

    // for each element in the changelog array
    for (var i = 0; i < changelog.length; i++) {
        // get the first split by \n, which is the date, and remove it from the string
        var date = changelog[i].split("\n")[0];
        changelog[i] = changelog[i].replace(date, "");

        // trim the string
        changelog[i] = changelog[i].trim();

        // create a new span element with the date
        var dateSpan = document.createElement("span");
        dateSpan.classList.add("dateSpan");
        dateSpan.innerHTML = date;

        // create a new ul element with the changelog
        var changelogUl = document.createElement("ul");
        changelogUl.classList.add("changelogUl");
        
        for (var j = 0; j < changelog[i].split("\n").length; j++) {
            var changelogLi = document.createElement("li");
            changelogLi.id = "changelogLi";
            changelogLi.innerHTML = changelog[i].split("\n")[j];

            // append the li to the ul
            changelogUl.appendChild(changelogLi);
        }

        // append the span and ul to the div
        changelogDiv.appendChild(dateSpan);
        changelogDiv.appendChild(changelogUl);

        // add a line break
        var lineBreak = document.createElement("br");
        changelogDiv.appendChild(lineBreak);
    }

    // append the div to the changelogContent div
    document.getElementById("changelogContent").appendChild(changelogDiv);

    // document.getElementById("changelogContent").innerHTML = changelog;
    console.log(changelog);
}

// set up luck button
window.getLuck = async function () {
    // var input = `
    // Hi. What's my luck today?
    // `

    // var system_prompt = `
    // You are a crazy but imaginative fortune teller.
    // You first make up a customer's luck of the day (it can be anything) in one paragraph, then give luck rating out of 10.
    // `
    var input = ``;
    var system_prompt = ``;
    var assistant_prompt = ``;



    
    // input = `
    // Write a couple of creative sentences to predict luck of the day (it can be anything),
    // make it specific and themed. Then on a new line rate the luck over 10.
    // `

    assistant_prompt = `
    You must not mention explicitly, but your response should mix up two genres such as 
    [fantasy, sci-fi, romance, surreal comedy, horror, mystery, thriller, unreliable narrative, etc.]
    be creative.
    `

    


    system_prompt = `
    you can predict anything, but make it bizarre, detailed, and themed. 
    `

    assistant_prompt = `
    your prediction can range from very bad to very good, do not shy away from predicting bad luck.
    `

    input = `
    Use 2 to 3 sentences to describe a prediction of my luck of the day,
    Then on a new line give the corresponding luck score (out of 10).
    `


    document.getElementById("luck").innerHTML = "generating... ";

    await getPrompt(input, system_prompt, assistant_prompt, 130, 1.4).then(message => {
        var result = message['choices'][0]['message']['content'];
        document.getElementById("luck").innerHTML = result;
    });
}

// set up getting latest blogpost
window.getLatestBlog = async function () {
    const q = query(collection(db, "blog"), orderBy("date", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
        // return doc.data();
        document.getElementById("latestBlogTitle").innerHTML = "<i style='font-weight:400'></i> " + doc.data().title;
        document.getElementById("latestBlogIntro").innerHTML = "<i style='font-weight:400'></i> " + doc.data().intro;

        var a = document.getElementById('latestBlogLink'); //or grab it by tagname etc
        a.href = "blog/?title=" + doc.data().title;
        console.log(a.href);
    });
}

async function getPrompt(user_prompt='', system_prompt='', assistant_prompt='', max=100, temperature=1.0){
    if(user_prompt === ''){
        // user_prompt = 'Write a sad poem about my border collie, Pepper';
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
          temperature: 1.4 ,
        //   top_p: 0.9,  // low value of this makes the generation repetitive
          //frequency_penalty: 0.7,
          max_tokens: max
        })
      })

    return await response.json();
}


window.onload = async function () {
    await get_gpt_api_key().then(api => {
        apiKey = api;
    });

    await getLatestBlog();
}