/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getStorage, ref, uploadBytes, listAll, getMetadata, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-storage.js";
import { getFirestore, doc, setDoc, getDoc, collection } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";



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
const storage = getStorage(app);
const db = getFirestore(app);

//////////////GET CODE to fetch bucket
var code = '';

window.getCode = function(){
    const queryString = window.location.search;
    console.log(queryString);
    const urlParams = new URLSearchParams(queryString);
    code = urlParams.get('code');
}
window.checkCode = async function(){ //check then init, called when load
    const buckets = await getDoc(doc(db, "cred_admin", "buckets"));
    const bucket_name = code;
    if(buckets.data()[bucket_name] === true){
        console.log("bucket exists.");
    }else{
        code = 'gallery';
    }

    initData();
}

window.checkCodeOnly = async function(){  // check only
    const buckets = await getDoc(doc(db, "cred_admin", "buckets"));
    const bucket_name = code;
    if(buckets.data()[bucket_name] === true){
        console.log("bucket exists.");
        return true;
    }else{
        console.log('gall');
        // code = 'gallery';
        return false;
    }
}

//////////////CREATE bucket
window.show_goto = function(){
    document.getElementById("goto_form").style.display = "flex";
    // console.log('create');
}


window.hide_goto = function(){
    // element.style.display = "none";
    document.getElementById("goto_form").style.display = "none";
}

window.try_go_bucket = function(input=''){
    if(input === ''){
        input = document.getElementById("input_code").value
    }
    if(input ===''){
        console.log('no bucket exists');
        hide_goto();
        return;
    }

    var temp = code;
    code = input;
    if(checkCodeOnly()){
        window.location.href = '//' + window.location.host + window.location.pathname + ('?code=' + code);
    }else{
        code = temp;
    }
}

window.show_create = function(){
    document.getElementById("create_form").style.display = "flex";
    // console.log('create');
}


window.hide_create = function(){
    // element.style.display = "none";
    document.getElementById("create_form").style.display = "none";
}

window.try_create = async function(){
    const docRef = doc(db, "cred_admin", "passcode");

    var passcode = '';
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        passcode = docSnap.data().code;
        window.alert(passcode);
        const given_code = document.getElementById("code").value;
        if(given_code == passcode){  //password correct
                //check if bucket name already exists
            const buckets = await getDoc(doc(db, "cred_admin", "buckets"));
            const bucket_name = document.getElementById("b_name").value
            if(buckets.data()[bucket_name] === true){
                console.log("bucket already exists.");
                window.alert("bucket exists.");
            }else{
                //create bucket
                create_bucket(document.getElementById("b_name").value);
            }
        }
    } else { 
        console.log("No such document!");
        //password file not found
    }
}

window.create_bucket = async function(bucket_name){
    console.log('creating ' + bucket_name);
    const buckets = doc(db, "cred_admin", "buckets");

    setDoc(buckets, {
        [bucket_name]: true
    }, { merge: true });
}


//////////////UPLOAD
window.try_upload = function(){
    const files = document.querySelector("#files_upload").files;
    if(files.length === 0){
        upload_string();
    }else{
        upload_files();
    }
}

window.upload_files = function () {
    // let img = document.getElementById("image_upload") 
    const files = document.querySelector("#files_upload").files;

    //multiple pics
    for (let i = 0; i < files.length; i++) {
        const name = +new Date() + "-" + files[i].name;
        const reff = ref(storage, 'dropper/files/' +code+'/'+ name);

        uploadBytes(reff, files[i]).then((snapshot) => {
            console.log('Uploaded a file!');
            document.getElementById("uploaded").style.display = 'block';
            setTimeout(function () {
                document.getElementById("uploaded").style.display = 'none';
            }, 3000);
            initDataSingle(reff);
            // _addImage(reff);
        })
    }
    document.querySelector("#files_upload").value = null;
    // refresh();
}

window.upload_string = function () {
    var sentence = document.getElementById('sentence').value
    console.log(sentence);

    if(sentence === ''){
        window.alert('empty string detected.');
        return;
    }

    // sentence = JSON.parse(sentence);
    var json_string = JSON.stringify(sentence, undefined, 2);
    console.log(json_string);
    var blob = new Blob([sentence], { type: 'text/plain' });
   

    const name = +new Date() + "-string";
    const reff = ref(storage, 'dropper/files/' +code+'/'+ name);

    uploadBytes(reff, blob).then((snapshot) => {
        document.getElementById('sentence').value = ''; //empties element
        // console.log('Uploaded text!');
        document.getElementById("uploaded").style.display = 'block';
        setTimeout(function () {
            document.getElementById("uploaded").style.display = 'none';
        }, 3000);
        initDataSingle(reff);
        // refresh();
    })
}


///////////////DOWNLOAD and SHOW
// initData();

function initDataSingle(itemRef) {
    var contentType = '';

    getMetadata(itemRef)
        .then((metadata) => {
            contentType = metadata.contentType;
            switch (contentType) {
                case 'image/jpeg':
                case 'image/jpg':
                case 'image/png':
                case 'image/heif':
                case 'image/heic':
                    _addImage(itemRef);
                    break;
                case 'text/plain':
                case 'application/json':
                    _addText(itemRef);
                    // _addFile(itemRef);


                    break;
                default:
                    console.log('adding type ' + contentType);
                    _addFile(itemRef);

                    break;
            }
        })
        .catch((error) => {
        });
}

function initData() {
    updateUI();
    const listRef = ref(storage, 'dropper/files/'+code+'/');
    // Find all the prefixes and items.
    listAll(listRef)
        .then((res) => {
            res.items.forEach((itemRef) => {
                initDataSingle(itemRef);
            });
        }).catch((error) => {
    });

}

function updateUI(){
    console.log(code);
    document.getElementById("bucket_title").innerText = code;
}

function _htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}


function _addText(item) {
    getDownloadURL(ref(storage, item._location.path_))
        .then((url) => {
            fetch(url)
                .then( r => r.text() )
                .then( t => {
                    // var tt = t.replace(/['"]+/g, '')
                    var tt = t;
                    var e = _htmlToElement(
                    '<div class="textblock">'
                    // + '<button onclick="'+copyToClipBoard(tt)+'">' + tt + '</button>'
                    // + '<a href="' + '' + '"</a>'
                    +'</div>'
                    );
                    var button = _htmlToElement('<button>'+tt+'</button>');
                    button.addEventListener("click", function () {
                        copyToClipBoard(tt);
                    })
                    e.appendChild(button);
                    
                    var close = _htmlToElement('<span class="close">x</span>');
                    close.addEventListener("click", function () {
                        console.log(item);
                        deleteFileAtPath(item.fullPath, e);
                    })
                    e.appendChild(close);


                    document.getElementById("textdiv").appendChild(e);
            });
            
        })
        .catch((error) => {
            // Handle any errors
    });
}

async function copyToClipBoard(t){
        try {
        await navigator.clipboard.writeText(t);
        }
        catch (err) {
        console.error('Could not write to clipboard', err);
        }
    }

function _addImage(item) {
    getDownloadURL(ref(storage, item._location.path_))
        .then((url) => {
            var fig = _htmlToElement('<figure class="pf"><img src=' + url + ' class="photo"></img></figure>');
            var close = _htmlToElement('<span class="close">x</span>');
                // var close = _htmlToElement('<a href="' + '#' + '" class="close">x</a>');
            close.addEventListener("click", function () {
                console.log(item);

                deleteFileAtPath(item.fullPath, fig);
            })
            fig.appendChild(close);
            document.getElementById("pictures").appendChild(fig);
        })
        .catch((error) => {
            // Handle any errors
    });
}

function _addFile(item) {
    getDownloadURL(ref(storage, item._location.path_))
        .then((url) => {
            var fig = _htmlToElement(
            '<figure class="pf">'
            +'<img src=/photos/barcode.png class="photo"></img>'
            +'<figcaption> ' +item.name+' </figcaption>'
            +'</figure>'
            );
            document.getElementById("files").appendChild(fig);
            // fig.setAttribute('src', url);
            var close = _htmlToElement('<span class="close">x</span>');
                    close.addEventListener("click", function () {
                        console.log(item);
                        deleteFileAtPath(item.fullPath, e);
                    })
                    e.appendChild(close);

            fig.addEventListener("click", function () {
                downloadURI(url, item.name);
            })
        })
        .catch((error) => {
            // Handle any errors
    });
}


function downloadURI(url, filename) {
fetch(url, {
    // mode: "no-cors"
})
    .then(response => response.blob())
    .then(blob => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
})
.catch(console.error);
}

function deleteFileAtPath(path, element){
    const delRef = ref(storage, path);
    deleteObject(delRef).then(() =>{
        console.log('deleted');
        element.parentNode.removeChild(element);
        refresh();
    })
}
document.addEventListener("DOMContentLoaded", function(event) { 
    var scrollpos = localStorage.getItem('scrollpos');
    if (scrollpos) window.scrollTo(0, scrollpos);
});

//goto on enter key press
// Get the input field
var input = document.getElementById("input_code");

// Execute a function when the user presses a key on the keyboard
input.addEventListener("keypress", function(event) {
  // If the user presses the "Enter" key on the keyboard
  if (event.key === "Enter") {
    // Cancel the default action, if needed
    event.preventDefault();
    // Trigger the button element with a click
    document.getElementById("goto_button").click();
  }
});

function refresh(){
    console.log('refreshed');
    window.location = window.location;
}

window.addEventListener('load', (event) =>{
    getCode();
    checkCode();
});


