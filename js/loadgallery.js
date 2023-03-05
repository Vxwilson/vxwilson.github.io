//Loads the gallery.

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

initPhotos();

function initPhotos(){
  const listRef = ref(storage, 'photos');
  // Find all the prefixes and items.
  listAll(listRef)
    .then((res) => {
      res.prefixes.forEach((folderRef) => {
        // All the prefixes under listRef.
        // You may call listAll() recursively on them.
      });
      res.items.forEach((itemRef) => {
        _addImage(itemRef._location.path_);
      });
    }).catch((error) => {
      // Uh-oh, an error occurred!
    });
}

function _htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function _addImage(path){
    getDownloadURL(ref(storage, path))
    .then((url) => {
        var fig = _htmlToElement('<figure class="pf"><img src=' + url + ' class="photo"></img></figure>');

        fig.addEventListener("click", function() {
          window.loadmodal(url);
        })

        document.getElementById("adder").appendChild(fig);

    })
    .catch((error) => {
        // Handle any errors
    });
}

window.loadmodal = function(url){
  //code for expanding images into modal box upon clicking

  const modal = document.querySelector(".modal");
  const overlay = document.querySelector(".overlay");

  // When the user clicks anywhere outside of the modal, close it
  // window.onclick = function(event) {
  //   if (event.target == overlay) {
  //     // modal.style.display = "none";
  //     modal.classList.add("hidden");
  //     overlay.classList.add("hidden");
  //   }
  // }

  overlay.addEventListener('click', function(){
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
  })

  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");

  var fig = document.getElementById("modal_img");

  fig.src = url;
}


  