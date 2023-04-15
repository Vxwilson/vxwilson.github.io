/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";


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



let editor;

InlineEditor
    .create( document.querySelector( '#editor' ) )
    .then( newEditor => {
        editor = newEditor;
    } )
    .catch( error => {
        console.error( error );
    } );

// // Assuming there is a <button id="submit">Submit</button> in your application.
// document.querySelector( '#submit' ).addEventListener( 'click', () => {
//     const editorData = editor.getData();

//     // ...
// } );

window.updatePreview = function () {
    const data = editor.getData();
    document.getElementById('blogContent').innerHTML = data;
    //update blog title
    let title = document.getElementById('title').value;
    document.getElementById('blogTitle').innerHTML = title == null || title == "" ? "Untitled" : title;
    document.getElementById('blogDate').innerHTML = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    updateCodeStyle();
}

window.onload = function (){
    updatePreview();
}

window.uploadBlog = async function () {
    const data = editor.getData();
    var title = document.getElementById('title').value;

    //check if title is empty
    console.log(title);
    if (title == null || title == "") {
        alert("Please enter a title for your blog");
        return;
    }
    //process title to remove spaces and special characters
    title = title.replace(/[^a-zA-Z0-9]/g, '');
    title = title.toLowerCase();
    
    //check if doc exists
    const docRef = doc(db, "blog", title);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        alert("Title already exists. Please enter a different title.");
        return;
    }

    // set doc to firestore
    await setDoc(doc(db, "blog", title), {
        title: title,
        content: data,
        show: true,
        date: new Date()
    });
    
}

function updateCodeStyle(){
    hljs.highlightAll();
}