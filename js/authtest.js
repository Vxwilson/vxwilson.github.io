import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js"
import { getAuth, createUserWithEmailAndPassword, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-auth.js"

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
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
// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
// connectAuthEmulator(auth, "http://localhost:9099");

// Create a new user account associated with the specified email address and password.
// On successful creation of the user account, this user will also be signed in to your application.
// User account creation can fail if the account already exists or the password is invalid.

// const email = 'vxwilson@hotmail.com';
// const password = "12345678Abcd_";

window.createUser = async function() {

    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        // Signed in 
        const user = userCredential.user;
        console.log(user);
        // ...
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;

        console.log(errorCode, errorMessage)
        // ..
    });
}