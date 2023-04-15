/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";


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

const collectionRef = collection(db, 'blog');

getDocs(collectionRef)
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data());
      //check if blog 'show' is true
      if(doc.data()['show'] == true){
        makeButtonForBlog(doc.data());
      }
      // makeButtonForBlog(doc.data());
    });
  })
  .catch((error) => {
    console.log("Error getting documents: ", error);
  });

function makeButtonForBlog(blogData){
    var blogButton = _htmlToElement(
        `
        <div class="blogSelection nonBlog">
        <span>
            <h5>${blogData['title']}</h5>
        </span>
        <!-- <div class="">
            <p></p>
        </div> -->
        </div>
        `
    );

    document.getElementById("blogSelectionContainer").appendChild(blogButton);
    blogButton.addEventListener("click", function(){
        loadBlog(blogData);
    });
}

function loadBlog(blogData){
    //hide all selectors ui and show blog ui
    // document.getElementById("blogSelectionContainer").style.display = "none";
    // //unhide all elements with class = blogContainer
    // var blogContainers = document.getElementsByClassName("blogHeader");
    // for (var i = 0; i < blogContainers.length; i++) {
    //     blogContainers[i].style.display = "block";
    // }
    // var blogContainers = document.getElementsByClassName("blogContainer");
    // for (var i = 0; i < blogContainers.length; i++) {
    //     blogContainers[i].style.display = "block";
    // }

    var blogContainers = document.getElementsByClassName("isBlog");
    for (var i = 0; i < blogContainers.length; i++) {
        blogContainers[i].style.display = "block";
    }
    var blogContainers = document.getElementsByClassName("nonBlog");
    for (var i = 0; i < blogContainers.length; i++) {
        blogContainers[i].style.display = "none";
    }

    // document.getElementById("blogContent").style.display = "block";

    //change heading title/date to blog title
    document.getElementById("blogTitle").innerHTML = blogData['title'];
    document.getElementById("blogIntro").innerHTML = blogData['intro'];
    document.getElementById("blogDate").innerHTML = blogData['date'].toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('blogContent').innerHTML = blogData['content'];


    updateCodeStyle();

}

window.hideBlog = function(){
    //hide all selectors ui and show blog ui
    // document.getElementById("blogSelectionContainer").style.display = "block";
    //unhide all elements with class = blogContainer
    var blogContainers = document.getElementsByClassName("isBlog");
    for (var i = 0; i < blogContainers.length; i++) {
        blogContainers[i].style.display = "none";
    }
    var blogContainers = document.getElementsByClassName("nonBlog");
    for (var i = 0; i < blogContainers.length; i++) {
        blogContainers[i].style.display = "block";
    }

    //change heading title back to default
    // document.getElementById("title").innerHTML = "VEIS";
    // document.getElementById("date").innerHTML = "a collection of some <i>very exciting items</i>";
    
}

function updateCodeStyle(){
    hljs.highlightAll();
}