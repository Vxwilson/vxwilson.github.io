// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getStorage, ref,uploadBytes } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7_zWxwHufzF2Ztc3-h7XhEpTBW2LslKA",
    authDomain: "test-7bbdd.firebaseapp.com",
    projectId: "test-7bbdd",
    storageBucket: "test-7bbdd.appspot.com",
    messagingSenderId: "942999556834",
    appId: "1:942999556834:web:2b980e669574da9f1284bb",
    measurementId: "G-EDZ5NLDH3Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

window.upload = function(){
    // let img = document.getElementById("image_upload") 
    const file = document.querySelector("#image_upload").files[0];
    const name = +new Date() + "-" + file.name;
    const reff = ref(storage, 'photos/' + name);

    uploadBytes(reff, file).then((snapshot) => {
        console.log('Uploaded a blob or file!');
        document.getElementById("uploaded_text").style.display = 'block';
        setTimeout(function(){
            document.getElementById("uploaded_text").style.display = 'none';
        },3000);
    });
}