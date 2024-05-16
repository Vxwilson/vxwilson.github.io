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
hljs.addPlugin(new CopyButtonPlugin());

setCollapsible();
setTextBoxExpandable();
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
    // parentEle.childNodes[0].after(close);
    parentEle.appendChild(close);

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

    // parentEle.childNodes[0].after(download);
    parentEle.appendChild(download);
}


// make scannable QR code to download
// Function to create a QR code and display it
// function createQRCode(url, fileName) {
//     const qrCodeContainer = document.getElementById('qrCodeContainer');
//     qrCodeContainer.innerHTML = ''; // Clear previous QR code

//     const qrCodeElement = document.createElement('div');
//     qrCodeElement.id = 'qrcode';
//     qrCodeContainer.appendChild(qrCodeElement);

//     QRCode.toCanvas(document.getElementById('qrcode'), url, function (error) {
//         if (error) console.error(error);
//         console.log('QR code generated!');
//     });

//     // Add a label to show the file name
//     const label = document.createElement('p');
//     label.textContent = fileName;
//     qrCodeContainer.appendChild(label);

//     // Show the QR code container
//     qrCodeContainer.style.display = 'block';
// }

// Function to add the QR code button next to the download button
// function makeQRCodeButton(item, parentEle, url) {
//     const qrCodeButton = _htmlToElement('<span class="fa fa-qrcode qr-button"></span>');

//     qrCodeButton.addEventListener('click', function () {
//         createQRCode(url, item.name);
//     });

//     parentEle.childNodes[0].after(qrCodeButton);
// }

// Function to create a QR code and display it
function createQRCode(url, fileName) {
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const qrCodeElement = document.getElementById('qrcode');
    const fileNameElement = document.getElementById('fileName');

    qrCodeElement.innerHTML = ''; // Clear previous QR code

    var qrcode = new QRCode(qrCodeElement, {
        text: url,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
    });

    fileNameElement.textContent = fileName;

    // Show the QR code container
    qrCodeContainer.style.display = 'block';
}

// Function to hide the QR code container
window.hideQRCode = function () {
    document.getElementById('qrCodeContainer').style.display = 'none';
}

// Function to add the QR code button next to the download button
function makeQRCodeButton(item, parentEle, url) {
    const qrCodeButton = _htmlToElement('<span class="fa fa-qrcode qr-button"></span>');

    qrCodeButton.addEventListener('click', function () {
        createQRCode(url, item.name);
    });

    // parentEle.childNodes[0].after(qrCodeButton);
    parentEle.appendChild(qrCodeButton);
}

// for clipboard
function makeCopyButton(text, parentEle) {
    var copy = _htmlToElement('<button class="copy-button">Copy</button>');

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

                    makeCopyButton(t, fig);


                    var textbutton = _htmlToElement('<span class="textspan" hover_text="Copy">' + resultDict["output"] + '</span>');
                    // var textbutton = _htmlToElement('<button>' + resultDict["output"] + '</button>');
                    // textbutton.addEventListener("click", function () {
                    //     copyToClipBoard(t);
                    // })
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
    // var output = urlify4(text);
    var output = text;

    var outputDict = { "output": '', "pin": false };
    // pinned text cant be deleted
    if (output.includes("-pin-")) {
        output = output.replace("-pin-", "").trim();
        outputDict["pin"] = true;
    }
    // add more tags
    // if(output.includes("")){
    // }


    // automatic code detection for hljs, and adding of code tags
    // splitting text by two line breaks into blocks

    let languages = ["cpp", "javascript", "java", "php", "python", "sql", "autohotkey", "ruby", "kotlin", "markdown", "csharp", "go"];
    // let languages = hljs.listLanguages();
    console.log(hljs.listLanguages());
    var blocks = output.split("\n\n\n");

    var lastBlockIsCode = false;
    for (var i = 0; i < blocks.length; i++) {
        let highlightResult = hljs.highlightAuto(blocks[i], languages);

        if (typeof highlightResult.language != 'undefined' && highlightResult.relevance >= 20) {
            console.log('language detected: ' + highlightResult.language + 'relevance: ' + highlightResult.relevance + '');
            //add pre code tags
            blocks[i] = '<pre><code class="' + highlightResult.language + '">' + blocks[i] + '</code></pre>';
            lastBlockIsCode = true;
        } else if (typeof highlightResult.language != 'undefined') {
            console.log('language detected: ' + highlightResult.language + 'relevance: ' + highlightResult.relevance + '');

        }
    }
    output = blocks.join("\n\n");

    output = urlify4(output);
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

function _addFile2(item) {
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
            makeQRCodeButton(item, buttonContainer, url);
            makeCloseButton(item, buttonContainer, fig);

            //fix this 
            fig.childNodes[0].addEventListener("click", function () {
                // var download = _htmlToElement('<a href=' + url + ' target="_blank" download class="close fa fa-cloud-download"></a>');
                // open(url);
                createQRCode(url, item.name);
                // downloadURI(url, item.name);
            })


        })
        .catch((error) => {
            // Handle any errors
        });
}

function _addFile(item) {
    getDownloadURL(ref(storage, item._location.path_))
        .then((url) => {
            getMetadata(ref(storage, item._location.path_))
                .then((metadata) => {
                    // Extract file size from metadata
                    var fileSize = metadata.size;

                    var fileExt = item.name.split('.').pop(); // get file extension
                    var fileName = item.name.split('.')[0]; // get file name without extension
                    var color = getColorForFileExt(fileExt); // add a function to map file extensions to colors
                    var bgColor = getColorForFileExt(fileExt);

    
                    var fig = _htmlToElement(
                        '<div class="block">' +
                        '<div class="block" style="width: 90%; background-color: ' + bgColor + '; border-radius: 5px; height: 110px; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; position: relative;">' +
                        '<div style="display: flex; flex-direction: row; justify-content: space-between; width:100%">' +
                        '<span style="color: #333; font-size: 14px; text-align: left; font-weight: 600; word-break:break-all; word-wrap: break-word;white-space: normal;">' + fileName + '</span>' +
                        '<span style="color: #888; font-size: 14px; width: 50px; font-weight: 500; text-align: right">.' + fileExt + '</span>' +
                        '</div>' +
                        '<span style="color: #888; font-size: 12px; text-align: left; margin-top: 0px;">' + getItemSize(fileSize) + '</span>' +
                        '</div>' +
                        '</div>'
                    );
                    
                    var buttonContainer = _htmlToElement(
                        '<div class="textbuttoncontainer"></div>'
                    );


                    fig.appendChild(buttonContainer);

                    makeCloseButton(item, buttonContainer, fig);
                    makeDownloadButton(item, buttonContainer, url);
                    makeQRCodeButton(item, buttonContainer, url);

                    fig.addEventListener("click", function () {
                        console.log('clicked a childnode file');
                        // createQRCode(url, item.name);
                    });

                    fig.childNodes[0].addEventListener("click", function () {
                        console.log('clicked a childnode file');
                        // createQRCode(url, item.name);
                        open(url);
                    });

                    document.getElementById("files").appendChild(fig);
                    console.log("added file");
                })
                .catch((error) => {
                    // Handle error while fetching metadata
                    console.error('Error getting metadata:', error);
                });
        })
        .catch((error) => {
            // Handle any errors
            console.log("error adding file");
            console.log(error);
        });
}

function getItemSize(item) {
    // Return the file size in a human-readable format (e.g., "1.2 MB")
    const fileSize = item;
    console.log("the size is " + fileSize)
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = fileSize;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return size.toFixed(1) + ' ' + units[unitIndex];
}

function getColorForFileExt_old(ext) {
    const hueMap = {
        zip: 60, // yellow
        pdf: 0, // red
        doc: 120, // green
        xls: 180, // cyan
        ppt: 240, // blue
        mp3: 300, // magenta
        // add more cases for other file extensions
    };
    const saturation = 40; // light pastel color
    const lightness = 90; // light pastel color

    const hue = hueMap[ext] || 0; // default to red if no hue is mapped
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getColorForFileExt(ext) {
    // Use a hash function to generate a unique hue based on the extension string.
    const hash = hashString(ext);
    // Normalize the hash value to be within the 0-360 range for HSL hue.
    const hue = (hash % 360 + 360) % 360; 
    const saturation = 26; // light pastel color
    const lightness = 86; // light pastel color
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  
  // Simple hash function (replace with a more robust one if needed)
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }


window.loadmodal = function (url) {
    //code for expanding images into modal box upon clicking

    const modal = document.querySelector(".modal");
    const overlay = document.querySelector(".overlay");

    // overlay.addEventListener('click', function () {
    //     modal.classList.add("hidden");
    //     overlay.classList.add("hidden");
    // })

    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");

    var model = document.getElementById("myModal");

    overlay.addEventListener('wheel', function (event) {
        event.preventDefault(); // Prevent default scroll behavior
    });

    overlay.addEventListener('click', function () {
        modal.classList.add("hidden");
        overlay.classList.add("hidden");
    })

    modal.addEventListener('wheel', function (event) {
        event.preventDefault(); // Prevent default scroll behavior
    });

    modal.addEventListener('click', function () {
        modal.classList.add("hidden");
        overlay.classList.add("hidden");
    })

    var fig = document.getElementById("modal_img");

    fig.style.transform = 'scale(' + 1 + ')';
    var scale = 1;

    fig.addEventListener('wheel', function (event) {
        event.preventDefault(); // Prevent default scroll behavior
        console.log('scrolling');
        var delta = event.deltaY || event.detail || event.wheelDelta;
        // Adjust the scale based on the scroll direction
        if (delta < 0) {
            if (scale < 2) {
                scale += 0.05; // Increase scale for zooming in
            }
        } else {
            if (scale > 0.5) {
                scale -= 0.05; // Decrease scale for zooming out
            }
        }
        // get the current leftmost position of the image
        // var left = fig.style.left;

        // console.log(left);


        fig.style.transform = `scale(${scale})`;


        // displacement of the image
        var rect = fig.getBoundingClientRect();
        console.log(rect.top, rect.right, rect.bottom, rect.left);

        var dx = (event.clientX - rect.left) * (scale - 1);

        var dy = (event.clientY - rect.top) * (scale - 1);

        fig.style.left = rect.left - dx + 'px';
        fig.style.top = rect.top - dy + 'px';


        console.log(fig.style.left, fig.style.top);
    });

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

function setTextBoxExpandable() {
    const tx = document.getElementById("sentence");
    const coll = document.getElementById("collapsibleButton");

    //set min height
    const minHeight = 50;
    //set max height
    const maxHeight = 230;
    tx.setAttribute("style", "height:" + minHeight + "px;overflow-y:hidden;");

    tx.addEventListener("input", onInput, false);

    function onInput() {
        this.style.height = 0;
        var finalH = (Math.min(maxHeight, this.scrollHeight))

        if (finalH < minHeight) {
            finalH = minHeight;
        }

        this.style.height = (finalH) + "px";

        //show/hide scroll bar if needed
        if (this.scrollHeight > maxHeight) {
            this.style.overflowY = "scroll";
        } else {
            this.style.overflowY = "hidden";
        }

        //expand the collapsible
        let h = parseInt(coll.nextElementSibling.style.maxHeight);
        coll.nextElementSibling.style.maxHeight = (h + finalH) + "px";
    }
}



