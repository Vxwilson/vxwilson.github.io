// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc, collection } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-storage.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


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
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

// const flameApp = flamelink({
// app,
// env: 'production', // optional, defaults to `production`
// locale: 'en-US', // optional, defaults to `en-US`
// dbType: 'rtdb', // optional, defaults to `rtdb` - can be 'rtdb' or 'cf' (Realtime DB vs Cloud Firestore)
// })

// try {
// const products = await flameApp.content.get({ schemaKey: 'products' })
// console.log('All of your products:', products)
// } catch (error) {
// // handle any errors
// }

export { app, db, analytics, storage };
