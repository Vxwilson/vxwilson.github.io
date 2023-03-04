var ba = ["MSIE","Trident","Edge"];
var b, ua = navigator.userAgent;
for(var i=0; i < ba.length; i++){
    if( ua.indexOf(ba[i]) > -1 ){
        b = ba[i];
        break;
    }
}
if(b == "MSIE" || b == "Trident" || b == "Edge"){
    b = "Internet Explorer";
    alert("You are using the " + b + " browser and this browser is incompatible with this website and many others.  Please open this page in a different browser, either Chrome or Firefox.  Thank you!");
}


// let buildTime = new Date(document.getElementById('rates-mtime').innerText);
// let pageLoadTime = new Date;
// const MINUTE = 1000 * 60;
// const LOAD_TIME = 1.5; 
const calcAgo = ()=>{
    // let now = new Date;

    // let minAgo = Math.ceil((now - buildTime) / MINUTE);
    // document.getElementById('rates-time-ago').innerText = `(${minAgo} min ago)`;

    // if (minAgo > 0.5 && (now - pageLoadTime) > MINUTE) {
    //     document.getElementById('rates-time-ago').innerText = `(${minAgo} min ago (done))`;
    //     document.location.reload();
    //     document.getElementById('rates-mtime').innerText = new Date;
    // }
    document.getElementById('time-now').innerText = new Date().toLocaleString();
}
;

window.addEventListener('load', function() {
    calcAgo();
    setInterval(calcAgo, 1000);
});