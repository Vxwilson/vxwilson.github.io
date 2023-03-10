/////////// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getStorage, ref, uploadBytes, listAll, getMetadata, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-storage.js";

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
    const pics = document.querySelector("#files_upload").files;

    //multiple pics
    for (let i = 0; i < pics.length; i++) {
        const name = +new Date() + "-" + pics[i].name;
        const reff = ref(storage, 'dropper/files/' + name);

        uploadBytes(reff, pics[i]).then((snapshot) => {
            console.log('Uploaded a picture!');
            document.getElementById("uploaded_files").style.display = 'block';
            setTimeout(function () {
                document.getElementById("uploaded_files").style.display = 'none';
            }, 3000);
        })
    }
}

window.upload_string = function () {
    var sentence = document.getElementById('sentence').value
    var json_string = JSON.stringify(sentence, undefined, 2);
    var link = document.createElement('a');
    link.download = 'data.json';
    var blob = new Blob([json_string], { type: 'text/plain' });
    // link.href = window.URL.createObjectURL(blob);
    // link.click();

    const name = +new Date() + "-string";
    const reff = ref(storage, 'dropper/files/' + name);

    uploadBytes(reff, blob).then((snapshot) => {
        console.log('Uploaded text!');
        document.getElementById("uploaded_text").style.display = 'block';
        setTimeout(function () {
            document.getElementById("uploaded_text").style.display = 'none';
        }, 3000);
    })
}


///////////////DOWNLOAD and SHOW
initPhotos();

function initPhotos() {
    const listRef = ref(storage, 'dropper/files/');
    // Find all the prefixes and items.
    listAll(listRef)
        .then((res) => {
            //   res.prefixes.forEach((folderRef) => {
            //     // All the prefixes under listRef.
            //     // You may call listAll() recursively on them.
            //   });
            res.items.forEach((itemRef) => {
                var contentType = '';

                getMetadata(itemRef)
                    .then((metadata) => {
                        contentType = metadata.contentType;
                        switch (contentType) {
                            case 'image/jpeg':
                            case 'image/jpg':
                            case 'image/png':
                                _addImage(itemRef._location.path_);
                                break;
                            case 'text/plain':
                                _addText(itemRef._location.path_);
                                // _addFile(itemRef);


                                break;
                            default:
                                _addFile(itemRef);

                                break;
                        }
                    })
                    .catch((error) => {
                    });
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


function _addText(path) {
    getDownloadURL(ref(storage, path))
        .then((url) => {
            fetch(url)
                .then( r => r.text() )
                .then( t => {
                    var tt = t.replace(/['"]+/g, '')
                    var fig = _htmlToElement(
                    '<figure class="pf"><p>'
                    + '<button onclick="'+copyToClipBoard(tt)+'">' + tt + '</button>'
                    +'</p></figure>'
                    );
                document.getElementById("texts").appendChild(fig);
            });
            
        })
        .catch((error) => {
            // Handle any errors
    });
}

const copyToClipBoard = async (t) => {
    try {
        await navigator.clipboard.writeText(t);
        console.log('Content copied to clipboard');
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
    }

function _addImage(path) {
    getDownloadURL(ref(storage, path))
        .then((url) => {
            var fig = _htmlToElement('<figure class="pf"><img src=' + url + ' class="photo"></img></figure>');
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
                // download_file(url);
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
    // fig.appendChild(link);
})
.catch(console.error);

// const xhr = new XMLHttpRequest();
// xhr.responseType = 'blob';
// xhr.onload = (event) => {
//   const blob = xhr.response;
// };
// xhr.open('GET', url);
// xhr.send();
}

