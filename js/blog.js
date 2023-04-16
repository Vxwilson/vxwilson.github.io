/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getFirestore, doc, getDoc, query, orderBy, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";


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

async function init() {
    // latest on top
    const q = query(collectionRef, orderBy("date", "desc"));

    await getDocs(q)
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                //   console.log(doc.id, " => ", doc.data());
                //check if blog 'show' is true
                if (doc.data()['show'] == true) {
                    makeButtonForBlog(doc.data());
                }
                // makeButtonForBlog(doc.data());
            });
        })
        .catch((error) => {
            console.log("Error getting documents: ", error);
        });
}

/////// init 
await tryOpenBlog(getTitle()).then((result) => {
    if (result == false) {
        // so that the back button returns to the main page
        history.pushState({ state: 'hidingBlog' }, null, null);
    }
});
init();
//

function makeButtonForBlog(blogData) {
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
    blogButton.addEventListener("click", function () {
        loadBlog(blogData);
    });
}

function getTitle() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get('title');
}

async function tryOpenBlog(title) {
    if (title != null) {
        //find blog with title
        getDoc(doc(db, "blog", title)).then((doc) => {
            if (doc.exists()) {
                loadBlog(doc.data());
                return true;
            } else {
                console.log("No such document!");
                // redirect to blog page
                location.href = "/blog";
            }
        }).catch((error) => {
            console.log("Error getting document:", error);
        });
    } else {
        return false;
    }
}

function loadBlog(blogData) {
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

    history.pushState({ state: 'showingBlog' }, null, '?title=' + blogData['title']);
}

window.hideBlog = function () {
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

    history.pushState({ state: 'hidingBlog' }, 'b', '/blog');
    // history.pushState({state: 'hidingBlog'}, 'hidingBlog', '/blog');
    //change heading title back to default
    // document.getElementById("title").innerHTML = "VEIS";
    // document.getElementById("date").innerHTML = "a collection of some <i>very exciting items</i>";

}

function updateCodeStyle() {
    hljs.highlightAll();
}

window.addEventListener('popstate', function (event) {
    if (event.state) {
        console.log('popped with state: ' + event.state.state + '');

        //check base state 
        if (event.state.state === 'hidingBlog') {
            // base state change
            this.history.replaceState({ state: 'showingBlog' }, null, null);
            // below function will push another state on top of the base state
            hideBlog();
        } else {
            //base state change (does nothing tho since we are returning to home page at this point)
            this.history.replaceState({ state: 'hidingBlog' }, null, null);

            window.location.href = '/';
        }

    } else {
        //no blog is opened, but back is pressed; return to home page 
        console.log('popped with no state');
        window.location.href = '/';
    }
});
