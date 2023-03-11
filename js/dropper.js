/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getStorage, ref, uploadBytes, listAll, getMetadata, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-storage.js";

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


//////////////UPLOAD

window.upload_files = function () {
    // let img = document.getElementById("image_upload") 
    const files = document.querySelector("#files_upload").files;

    //multiple pics
    for (let i = 0; i < files.length; i++) {
        const name = +new Date() + "-" + files[i].name;
        const reff = ref(storage, 'dropper/files/' + name);

        uploadBytes(reff, files[i]).then((snapshot) => {
            console.log('Uploaded a file!');
            document.getElementById("uploaded_files").style.display = 'block';
            setTimeout(function () {
                document.getElementById("uploaded_files").style.display = 'none';
            }, 3000);
            initDataSingle(reff);
            // _addImage(reff);
            refresh();
        })
    }
}

window.upload_string = function () {
    var sentence = document.getElementById('sentence').value
    var json_string = JSON.stringify(sentence, undefined, 2);
    var blob = new Blob([json_string], { type: 'text/plain' });
   

    const name = +new Date() + "-string";
    const reff = ref(storage, 'dropper/files/' + name);

    uploadBytes(reff, blob).then((snapshot) => {
        console.log('Uploaded text!');
        document.getElementById("uploaded_text").style.display = 'block';
        setTimeout(function () {
            document.getElementById("uploaded_text").style.display = 'none';
        }, 3000);
        initDataSingle(reff);
        refresh();
    })
}


///////////////DOWNLOAD and SHOW
initData();

function initDataSingle(itemRef) {
    var contentType = '';

    getMetadata(itemRef)
        .then((metadata) => {
            contentType = metadata.contentType;
            switch (contentType) {
                case 'image/jpeg':
                case 'image/jpg':
                case 'image/png':
                    _addImage(itemRef);
                    break;
                case 'text/plain':
                    _addText(itemRef);
                    // _addFile(itemRef);


                    break;
                default:
                    _addFile(itemRef);

                    break;
            }
        })
        .catch((error) => {
        });
}

function initData() {
    const listRef = ref(storage, 'dropper/files/');
    // Find all the prefixes and items.
    listAll(listRef)
        .then((res) => {
            res.items.forEach((itemRef) => {
                initDataSingle(itemRef);
                // var contentType = '';

                // getMetadata(itemRef)
                //     .then((metadata) => {
                //         contentType = metadata.contentType;
                //         switch (contentType) {
                //             case 'image/jpeg':
                //             case 'image/jpg':
                //             case 'image/png':
                //                 _addImage(itemRef._location.path_);
                //                 break;
                //             case 'text/plain':
                //                 _addText(itemRef);
                //                 // _addFile(itemRef);


                //                 break;
                //             default:
                //                 _addFile(itemRef);

                //                 break;
                //         }
                //     })
                //     .catch((error) => {
                //     });
            });
        }).catch((error) => {
        });
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
                    var tt = t.replace(/['"]+/g, '')
                    var e = _htmlToElement(
                    '<div class="textblock">'
                    + '<button class="button-11" onclick="'+copyToClipBoard(tt)+'">' + tt + '</button>'
                    // + '<a href="' + '' + '"</a>'
                    +'</div>'
                    );
                    
                    var close = _htmlToElement('<span class="close">x</span>');
                    // var close = _htmlToElement('<a href="' + '#' + '" class="close">x</a>');
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

const copyToClipBoard = async (t) => {
    // try {
    //     await navigator.clipboard.writeText(t);
    //     console.log('Content copied to clipboard');
    // } catch (err) {
    //     console.error('Failed to copy: ', err);
    // }
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
            // +'<a href='+url+'>'
            +'<img src=/photos/barcode.png class="photo"></img>'
            // +'</a>'
            +'<figcaption> ' +item.name+' </figcaption>'
            +'</figure>'
            );
            document.getElementById("files").appendChild(fig);
            // fig.setAttribute('src', url);

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

function refresh(){
    window.location = window.location;
}

