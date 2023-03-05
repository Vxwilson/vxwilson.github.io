// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getStorage, ref, listAll, getDownloadURL} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-storage.js";

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
console.log('fsd');

const listRef = ref(storage, 'photos');
// Find all the prefixes and items.
listAll(listRef)
  .then((res) => {
    res.prefixes.forEach((folderRef) => {
      // All the prefixes under listRef.
      // You may call listAll() recursively on them.
    });
    res.items.forEach((itemRef) => {
      // All the items under listRef.
    //   console.log(itemRef);
    //   console.log(itemRef._location.path_);
      addImage(itemRef._location.path_);
    });
  }).catch((error) => {
    // Uh-oh, an error occurred!
  });

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function addImage(path){
    getDownloadURL(ref(storage, path))
    .then((url) => {
        console.log(url);
        // Or inserted into an <img> element
        var img = htmlToElement('<figure class="pf"><img src=' + url + ' class="photo" style="width:100%"></img></figure>');
        // var img = document.createElement("img");
        // img.innerHTML = '<img src=' + url + ' style="width:100%"></img>'
        // img.setAttribute('src', url);
        document.getElementById("adder").appendChild(img);
    })
    .catch((error) => {
        // Handle any errors
    });
}

  