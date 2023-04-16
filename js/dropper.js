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

/////init
setCollapsible();
// var user = null;
var code = '';


window.addEventListener('load', (event) => {
    getCode();
    checkCode();
});
//////////////GET CODE to fetch bucket

window.updateAuthState = function (user) {
    if (user) {
        console.log('user logged in', user.uid);
        // code = user.displayName;
    } else {
        console.log('user logged out');
    }
}


window.getCode = function () {
    const queryString = window.location.search;
    console.log(queryString);
    const urlParams = new URLSearchParams(queryString);
    code = urlParams.get('code');
}
window.checkCode = async function () { //check then init, called when load
    const buckets = await getDoc(doc(db, "cred_admin", "buckets"));
    const bucket_name = code;
    if (buckets.data()[bucket_name] === true) {
        // console.log("bucket exists.");
    } else {
        code = 'gallery';
    }

    initData();
}

window.checkCodeOnly = async function () {  // check only
    const buckets = await getDoc(doc(db, "cred_admin", "buckets"));
    const bucket_name = code;
    if (buckets.data()[bucket_name] === true) {
        console.log("bucket exists.");
        return true;
    } else {
        // code = 'gallery';
        return false;
    }
}

//////////////CREATE bucket
window.show_goto = function () {
    document.getElementById("goto_form").style.display = "flex";
    document.getElementById("input_code").focus();
    // console.log('create');
}


window.hide_goto = function () {
    // element.style.display = "none";
    document.getElementById("goto_form").style.display = "none";
}

window.try_go_bucket = function (input = '') {
    if (input === '') {
        input = document.getElementById("input_code").value
    }
    // not needed as input is required todo remove
    if (input === '') {
        console.log('no bucket exists');
        hide_goto();
        return;
    }

    var temp = code;
    code = input;
    if (checkCodeOnly()) {
        // window.location.href = '//' + window.location.host + window.location.pathname + ('?code=' + code);
        initData();
        hide_goto();
    } else {
        code = temp;
    }
}

window.show_create = function () {
    document.getElementById("create_form").style.display = "flex";
    document.getElementById("code").focus();
    // console.log('create');
}


window.hide_create = function () {
    // element.style.display = "none";
    document.getElementById("create_form").style.display = "none";
}

window.try_create = async function () {
    const docRef = doc(db, "cred_admin", "passcode");

    var passcode = '';
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        passcode = docSnap.data().code;
        const given_code = document.getElementById("code").value;
        if (given_code == passcode) {  //password correct
            //check if bucket name already exists
            const buckets = await getDoc(doc(db, "cred_admin", "buckets"));
            const bucket_name = document.getElementById("b_name").value
            if (buckets.data()[bucket_name] === true) {
                console.log("bucket already exists.");
                window.alert("bucket exists.");
            } else {
                //create bucket
                await create_bucket(document.getElementById("b_name").value);
                //wait one second to goto bucket
                await new Promise(r => setTimeout(r, 800));
                await try_go_bucket(document.getElementById("b_name").value);
            }
        }
    } else {
        console.log("No such document!");
        //password file not found
    }
}

window.create_bucket = async function (bucket_name) {
    console.log('creating ' + bucket_name);
    const buckets = doc(db, "cred_admin", "buckets");

    setDoc(buckets, {
        [bucket_name]: true
    }, { merge: true });
}


//////////////UPLOAD
window.try_upload = function () {
    const files = document.querySelector("#files_upload").files;
    if (files.length === 0) {
        upload_string();
    } else {
        upload_files();
    }
}

window.upload_files = function () {
    // let img = document.getElementById("image_upload") 
    const files = document.querySelector("#files_upload").files;

    //multiple pics
    for (let i = 0; i < files.length; i++) {
        const name = files[i].name;
        // const name = +new Date() + "-" + files[i].name;
        const reff = ref(storage, 'dropper/files/' + code + '/' + name);

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

    if (sentence === '') {
        window.alert('empty string detected.');
        return;
    }

    // sentence = JSON.parse(sentence);
    var json_string = JSON.stringify(sentence, undefined, 2);
    console.log(json_string);
    var blob = new Blob([sentence], { type: 'text/plain' });


    const name = +new Date() + "-string";
    const reff = ref(storage, 'dropper/files/' + code + '/' + name);

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
            // console.log(metadata);
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
                    // console.log('adding type ' + contentType);
                    _addFile(itemRef);

                    break;
            }
        })
        .catch((error) => {
        });
}

function initData(private_bucket = false) {
    updateUI();

    let listRef;
    if (private_bucket) {
        listRef = ref(storage, `dropper/private/${use}` + code + '/');
    } else {
        listRef = ref(storage, 'dropper/files/' + code + '/');
    }
    // Find all the prefixes and items.
    listAll(listRef)
        .then((res) => {
            res.items.forEach((itemRef) => {

                //sort by date
                getMetadata(itemRef).then((metadata) => {
                    // console.log(metadata);
                    // var timeStamp = metadata.timeCreated;
                    // console.log(new Date(timeStamp).getTime());
                })
                    .catch((error) => {
                    });

                initDataSingle(itemRef);

            });

        }).catch((error) => {
        });

}

function updateCodeStyle() {
    hljs.highlightAll();
}

function updateUI() {
    document.getElementById("bucket_title").innerText = code;
    document.title = "dropper - " + code;

    //empty page content
    document.getElementById("textdiv").innerHTML = '';
    document.getElementById("pictures").innerHTML = '';
    document.getElementById("files").innerHTML = '';
}

function _htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function makeCloseButton(item, parentEle, eleToDelete) {
    var close = _htmlToElement('\
    <span class="close fa fa-trash-o"></span>');
    // var close = _htmlToElement('<span class="close fa fa-trash-o"></span>');

    // close.addEventListener("click", function () {
    //     deleteFileAtPathAndRemove(item.fullPath, parentEle);
    // })
    parentEle.childNodes[0].after(close);

    $(close).on('click', function () {
        deleteFileAtPathAndRemove(item.fullPath, eleToDelete);
    })

    // parentEle.insertBefore(close, parentEle.childNodes[0]);
}

function makeDownloadButton(item, parentEle, url) {
    var download = _htmlToElement('<span class="close fa fa-cloud-download"></span>');

    download.addEventListener("click", function () {
        downloadURI(url, item.name);
    })

    parentEle.childNodes[0].after(download);


    // parentEle.insertBefore(download, parentEle.childNodes[0]);
}

// for clipboard
function makeCopyButton(text, parentEle) {
    var copy = _htmlToElement('<span class="close fa fa-copy"></span>');

    copy.addEventListener("click", function () {
        copyToClipBoard(text);
    })

    parentEle.childNodes[0].after(copy);
}

function _addText(item) {
    getDownloadURL(ref(storage, item._location.path_))
        .then((url) => {
            fetch(url)
                .then(r => r.text())
                .then(t => {
                    var resultDict = textProcessor(t);
                    console.log(resultDict);
                    var fig = _htmlToElement(
                        '<div class="textblock block">\
                    </div>'
                    );

                    // stores delete button etc
                    var buttonContainer = _htmlToElement(
                        '<div class="textbuttoncontainer">\
                    </div>')


                    // cheat: uncomment below to temporarily delete somthing
                    // makeCloseButton(item, buttonContainer, fig);

                    if (resultDict['pin'] == false) {
                        //can be deleted
                        makeCloseButton(item, buttonContainer, fig);
                    } else {
                        //add pin icon 
                        var pin = '<span class="fa fa-thumb-tack"></span> \n'
                        resultDict["output"] = pin + resultDict["output"];
                    }

                    // makeCopyButton(t, buttonContainer);


                    var textbutton = _htmlToElement('<span class="textspan" hover_text="Copy">' + resultDict["output"] + '</span>');
                    // var textbutton = _htmlToElement('<button>' + resultDict["output"] + '</button>');
                    textbutton.addEventListener("click", function () {
                        copyToClipBoard(t);
                    })
                    fig.appendChild(textbutton);
                    fig.appendChild(buttonContainer);

                    document.getElementById("textdiv").appendChild(fig);

                    updateCodeStyle();
                });

        })
        .catch((error) => {
            // Handle any errors
        });
}


//urlify text, then process it by:
//checking for tags, marked by -tag-
function textProcessor(text) {
    var output = urlify4(text);

    var outputDict = { "output": '', "pin": false };
    // pinned text cant be deleted
    if (output.includes("-pin-")) {
        output = output.replace("-pin-", "").trim();
        outputDict["pin"] = true;
    }
    // add more tags
    // if(output.includes("-pin-")){
    //     output = output.replace("-pin-", "");
    // }

    outputDict['output'] = output;

    return outputDict;
}

const url5Regex = /(https?:\/\/)?(www\.)?([\w-]+\.)+[\w]{2,}([/?#]\S*)?/ig
function urlify4(text) {
    // var urlRegex =/(https?:\/\/)?(www\.)?([\w-]+\.)+[\w]{2,}([/?#]\S*)?/ig
    return text.replace(url5Regex, function (url) {
        var text = url;
        //adds in front to make urls valid
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        } else { //beautify by removing the http when displayed
            // text = text.replace('https://', '');
            // text = text.replace('http://', '');
        }
        return '<a href="' + url + '" target="_blank">' + text + '</a>';
    });
}

// function urlify3(text) {
//     var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
//     return text.replace(urlRegex, function(url) {
//         return '<a href="' + url + '" target="_blank">' + url + '</a>';
//     });
// }

// //urlify that works with .www
// function urlify2(text) {
//     var urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
//     //var urlRegex = /(https?:\/\/[^\s]+)/g;
//     return text.replace(urlRegex, function(url,b,c) {
//         var url2 = (c == 'www.') ?  'http://' +url : url;
//         return '<a href="' +url2+ '" target="_blank">' + url + '</a>';
//     }) 
// }

// // wraps urls in text with the a tag and return it
// function urlify(text, openNew=true) {
//     var urlRegex = /(https?:\/\/[^\s]+)/g;
//     if(openNew){
//         return text.replace(urlRegex, function(url) {
//             return '<a href="' + url + '" target="_blank">' + url + '</a>';
//         })
//     }
//     return text.replace(urlRegex, function(url) {
//       return '<a href="' + url + '">' + url + '</a>';
//     })

// or alternatively
// return text.replace(urlRegex, '<a href="$1">$1</a>')
// }
//   var text = 'Find me at http://www.example.com and also at http://stackoverflow.com';
// var html = urlify(text);

// console.log(html);


async function copyToClipBoard(t) {
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
            var fig = _htmlToElement('<figure class="block">\
            <img src=' + url + ' class="photo"></img>\
            </figure>');

            // stores delete button etc
            var buttonContainer = _htmlToElement(
                '<div class="textbuttoncontainer">\
            </div>')

            fig.appendChild(buttonContainer);

            makeDownloadButton(item, buttonContainer, url);
            makeCloseButton(item, buttonContainer, fig);
            document.getElementById("pictures").appendChild(fig);

            //todo not brute force the index
            console.log(fig.childNodes);
            fig.childNodes[1].addEventListener("click", function () {
                console.log('clicked');
                window.loadmodal(url);
            })
        })
        .catch((error) => {
            // Handle any errors
        });
}

function _addFile(item) {
    getDownloadURL(ref(storage, item._location.path_))
        .then((url) => {
            var fig = _htmlToElement(
                '<div class="block">' +
                '<figure style="display:block">'
                + '<img src=/photos/barcode.png class="photo"></img>'
                + '<figcaption> ' + item.name + ' </figcaption>'
                + '</figure>'
                + '</div>'
            );

            // stores delete button etc
            var buttonContainer = _htmlToElement(
                '<div class="textbuttoncontainer">\
                </div>')

            document.getElementById("files").appendChild(fig);

            fig.appendChild(buttonContainer);
            // fig.appendChild(buttonContainer);

            makeDownloadButton(item, buttonContainer, url);
            makeCloseButton(item, buttonContainer, fig);

            //fix this 
            fig.childNodes[0].addEventListener("click", function () {
                // var download = _htmlToElement('<a href=' + url + ' target="_blank" download class="close fa fa-cloud-download"></a>');
                open(url);
                // downloadURI(url, item.name);
            })


        })
        .catch((error) => {
            // Handle any errors
        });
}



window.loadmodal = function (url) {
    //code for expanding images into modal box upon clicking

    const modal = document.querySelector(".modal");
    const overlay = document.querySelector(".overlay");

    overlay.addEventListener('click', function () {
        modal.classList.add("hidden");
        overlay.classList.add("hidden");
    })

    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");

    var fig = document.getElementById("modal_img");

    fig.src = url;
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

function deleteFileAtPathAndRemove(path, element) {
    const delRef = ref(storage, path);
    deleteObject(delRef).then(() => {
        element.parentNode.removeChild(element);
        // refresh();
    })
}
// document.addEventListener("DOMContentLoaded", function (event) {
//     var scrollpos = localStorage.getItem('scrollpos');
//     if (scrollpos) window.scrollTo(0, scrollpos);
// });

//goto on enter key press
// Get the input field
var input = document.getElementById("input_code");

// Execute a function when the user presses a key on the keyboard
input.addEventListener("keypress", function (event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        document.getElementById("goto_button").click();
    }
});

window.refresh = function () {
    window.location = window.location;
}

window.sharelink = async function () {
    var link = '' + window.location.host + window.location.pathname + ('?code=' + code);
    try {
        await navigator.clipboard.writeText(link);
    }
    catch (err) {
        console.error('Could not write to clipboard', err);
    }
}



function setCollapsible() {
    var coll = document.getElementsByClassName("collapsible");
    var i;

    for (i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = (content.scrollHeight) + "px";
            }
        });
    }
}



