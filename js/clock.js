var ba = ["MSIE", "Trident", "Edge"];
var b, ua = navigator.userAgent;
for (var i = 0; i < ba.length; i++) {
    if (ua.indexOf(ba[i]) > -1) {
        b = ba[i];
        break;
    }
}
if (b == "MSIE" || b == "Trident" || b == "Edge") {
    b = "Internet Explorer";
    alert("You are using the " + b + " browser and this browser is incompatible with this website and many others.  Please open this page in a different browser, either Chrome or Firefox.  Thank you!");
}

const calcAgo = () => {
    document.getElementById('time-now').innerText = new Date().toLocaleString();
}
    ;

window.addEventListener('load', function () {
    calcAgo();
    setInterval(calcAgo, 1000);
});