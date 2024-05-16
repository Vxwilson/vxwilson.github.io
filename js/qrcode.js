// !function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var r;r="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,r.QRCode=t()}}(function(){return function(){function t(r,e,n){function o(u,a){if(!e[u]){if(!r[u]){var f="function"==typeof require&&require;if(!a&&f)return f(u,!0);if(i)return i(u,!0);var s=new Error("Cannot find module '"+u+"'");throw s.code="MODULE_NOT_FOUND",s}var h=e[u]={exports:{}};r[u][0].call(h.exports,function(t){return o(r[u][1][t]||t)},h,h.exports,t,r,e,n)}return e[u].exports}for(var i="function"==typeof require&&require,u=0;u<n.length;u++)o(n[u]);return o}return t}()({1:[function(t,r,e){r.exports=function(){return"function"==typeof Promise&&Promise.prototype&&Promise.prototype.then}},{}],2:[function(t,r,e){var n=t("./utils").getSymbolSize;e.getRowColCoords=function(t){if(1===t)return[];for(var r=Math.floor(t/7)+2,e=n(t),o=145===e?26:2*Math.ceil((e-13)/(2*r-2)),i=[e-7],u=1;u<r-1;u++)i[u]=i[u-1]-o;return i.push(6),i.reverse()},e.getPositions=function(t){for(var r=[],n=e.getRowColCoords(t),o=n.length,i=0;i<o;i++)for(var u=0;u<o;u++)0===i&&0===u||0===i&&u===o-1||i===o-1&&0===u||r.push([n[i],n[u]]);return r}},{"./utils":21}],3:[function(t,r,e){function n(t){this.mode=o.ALPHANUMERIC,this.data=t}var o=t("./mode"),i=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];n.getBitsLength=function(t){return 11*Math.floor(t/2)+t%2*6},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){var r;for(r=0;r+2<=this.data.length;r+=2){var e=45*i.indexOf(this.data[r]);e+=i.indexOf(this.data[r+1]),t.put(e,11)}this.data.length%2&&t.put(i.indexOf(this.data[r]),6)},r.exports=n},{"./mode":14}],4:[function(t,r,e){function n(){this.buffer=[],this.length=0}n.prototype={get:function(t){var r=Math.floor(t/8);return 1==(this.buffer[r]>>>7-t%8&1)},put:function(t,r){for(var e=0;e<r;e++)this.putBit(1==(t>>>r-e-1&1))},getLengthInBits:function(){return this.length},putBit:function(t){var r=Math.floor(this.length/8);this.buffer.length<=r&&this.buffer.push(0),t&&(this.buffer[r]|=128>>>this.length%8),this.length++}},r.exports=n},{}],5:[function(t,r,e){function n(t){if(!t||t<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=t,this.data=o.alloc(t*t),this.reservedBit=o.alloc(t*t)}var o=t("../utils/buffer");n.prototype.set=function(t,r,e,n){var o=t*this.size+r;this.data[o]=e,n&&(this.reservedBit[o]=!0)},n.prototype.get=function(t,r){return this.data[t*this.size+r]},n.prototype.xor=function(t,r,e){this.data[t*this.size+r]^=e},n.prototype.isReserved=function(t,r){return this.reservedBit[t*this.size+r]},r.exports=n},{"../utils/buffer":28}],6:[function(t,r,e){function n(t){this.mode=i.BYTE,this.data=o.from(t)}var o=t("../utils/buffer"),i=t("./mode");n.getBitsLength=function(t){return 8*t},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){for(var r=0,e=this.data.length;r<e;r++)t.put(this.data[r],8)},r.exports=n},{"../utils/buffer":28,"./mode":14}],7:[function(t,r,e){var n=t("./error-correction-level"),o=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],i=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];e.getBlocksCount=function(t,r){switch(r){case n.L:return o[4*(t-1)+0];case n.M:return o[4*(t-1)+1];case n.Q:return o[4*(t-1)+2];case n.H:return o[4*(t-1)+3];default:return}},e.getTotalCodewordsCount=function(t,r){switch(r){case n.L:return i[4*(t-1)+0];case n.M:return i[4*(t-1)+1];case n.Q:return i[4*(t-1)+2];case n.H:return i[4*(t-1)+3];default:return}}},{"./error-correction-level":8}],8:[function(t,r,e){function n(t){if("string"!=typeof t)throw new Error("Param is not a string");switch(t.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+t)}}e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2},e.isValid=function(t){return t&&void 0!==t.bit&&t.bit>=0&&t.bit<4},e.from=function(t,r){if(e.isValid(t))return t;try{return n(t)}catch(t){return r}}},{}],9:[function(t,r,e){var n=t("./utils").getSymbolSize;e.getPositions=function(t){var r=n(t);return[[0,0],[r-7,0],[0,r-7]]}},{"./utils":21}],10:[function(t,r,e){var n=t("./utils"),o=n.getBCHDigit(1335);e.getEncodedBits=function(t,r){for(var e=t.bit<<3|r,i=e<<10;n.getBCHDigit(i)-o>=0;)i^=1335<<n.getBCHDigit(i)-o;return 21522^(e<<10|i)}},{"./utils":21}],11:[function(t,r,e){var n=t("../utils/buffer"),o=n.alloc(512),i=n.alloc(256);!function(){for(var t=1,r=0;r<255;r++)o[r]=t,i[t]=r,256&(t<<=1)&&(t^=285);for(r=255;r<512;r++)o[r]=o[r-255]}(),e.log=function(t){if(t<1)throw new Error("log("+t+")");return i[t]},e.exp=function(t){return o[t]},e.mul=function(t,r){return 0===t||0===r?0:o[i[t]+i[r]]}},{"../utils/buffer":28}],12:[function(t,r,e){function n(t){this.mode=o.KANJI,this.data=t}var o=t("./mode"),i=t("./utils");n.getBitsLength=function(t){return 13*t},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){var r;for(r=0;r<this.data.length;r++){var e=i.toSJIS(this.data[r]);if(e>=33088&&e<=40956)e-=33088;else{if(!(e>=57408&&e<=60351))throw new Error("Invalid SJIS character: "+this.data[r]+"\nMake sure your charset is UTF-8");e-=49472}e=192*(e>>>8&255)+(255&e),t.put(e,13)}},r.exports=n},{"./mode":14,"./utils":21}],13:[function(t,r,e){function n(t,r,n){switch(t){case e.Patterns.PATTERN000:return(r+n)%2==0;case e.Patterns.PATTERN001:return r%2==0;case e.Patterns.PATTERN010:return n%3==0;case e.Patterns.PATTERN011:return(r+n)%3==0;case e.Patterns.PATTERN100:return(Math.floor(r/2)+Math.floor(n/3))%2==0;case e.Patterns.PATTERN101:return r*n%2+r*n%3==0;case e.Patterns.PATTERN110:return(r*n%2+r*n%3)%2==0;case e.Patterns.PATTERN111:return(r*n%3+(r+n)%2)%2==0;default:throw new Error("bad maskPattern:"+t)}}e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var o={N1:3,N2:3,N3:40,N4:10};e.isValid=function(t){return null!=t&&""!==t&&!isNaN(t)&&t>=0&&t<=7},e.from=function(t){return e.isValid(t)?parseInt(t,10):void 0},e.getPenaltyN1=function(t){for(var r=t.size,e=0,n=0,i=0,u=null,a=null,f=0;f<r;f++){n=i=0,u=a=null;for(var s=0;s<r;s++){var h=t.get(f,s);h===u?n++:(n>=5&&(e+=o.N1+(n-5)),u=h,n=1),h=t.get(s,f),h===a?i++:(i>=5&&(e+=o.N1+(i-5)),a=h,i=1)}n>=5&&(e+=o.N1+(n-5)),i>=5&&(e+=o.N1+(i-5))}return e},e.getPenaltyN2=function(t){for(var r=t.size,e=0,n=0;n<r-1;n++)for(var i=0;i<r-1;i++){var u=t.get(n,i)+t.get(n,i+1)+t.get(n+1,i)+t.get(n+1,i+1);4!==u&&0!==u||e++}return e*o.N2},e.getPenaltyN3=function(t){for(var r=t.size,e=0,n=0,i=0,u=0;u<r;u++){n=i=0;for(var a=0;a<r;a++)n=n<<1&2047|t.get(u,a),a>=10&&(1488===n||93===n)&&e++,i=i<<1&2047|t.get(a,u),a>=10&&(1488===i||93===i)&&e++}return e*o.N3},e.getPenaltyN4=function(t){for(var r=0,e=t.data.length,n=0;n<e;n++)r+=t.data[n];return Math.abs(Math.ceil(100*r/e/5)-10)*o.N4},e.applyMask=function(t,r){for(var e=r.size,o=0;o<e;o++)for(var i=0;i<e;i++)r.isReserved(i,o)||r.xor(i,o,n(t,i,o))},e.getBestMask=function(t,r){for(var n=Object.keys(e.Patterns).length,o=0,i=1/0,u=0;u<n;u++){r(u),e.applyMask(u,t);var a=e.getPenaltyN1(t)+e.getPenaltyN2(t)+e.getPenaltyN3(t)+e.getPenaltyN4(t);e.applyMask(u,t),a<i&&(i=a,o=u)}return o}},{}],14:[function(t,r,e){function n(t){if("string"!=typeof t)throw new Error("Param is not a string");switch(t.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+t)}}var o=t("./version-check"),i=t("./regex");e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(t,r){if(!t.ccBits)throw new Error("Invalid mode: "+t);if(!o.isValid(r))throw new Error("Invalid version: "+r);return r>=1&&r<10?t.ccBits[0]:r<27?t.ccBits[1]:t.ccBits[2]},e.getBestModeForData=function(t){return i.testNumeric(t)?e.NUMERIC:i.testAlphanumeric(t)?e.ALPHANUMERIC:i.testKanji(t)?e.KANJI:e.BYTE},e.toString=function(t){if(t&&t.id)return t.id;throw new Error("Invalid mode")},e.isValid=function(t){return t&&t.bit&&t.ccBits},e.from=function(t,r){if(e.isValid(t))return t;try{return n(t)}catch(t){return r}}},{"./regex":19,"./version-check":22}],15:[function(t,r,e){function n(t){this.mode=o.NUMERIC,this.data=t.toString()}var o=t("./mode");n.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(t){var r,e,n;for(r=0;r+3<=this.data.length;r+=3)e=this.data.substr(r,3),n=parseInt(e,10),t.put(n,10);var o=this.data.length-r;o>0&&(e=this.data.substr(r),n=parseInt(e,10),t.put(n,3*o+1))},r.exports=n},{"./mode":14}],16:[function(t,r,e){var n=t("../utils/buffer"),o=t("./galois-field");e.mul=function(t,r){for(var e=n.alloc(t.length+r.length-1),i=0;i<t.length;i++)for(var u=0;u<r.length;u++)e[i+u]^=o.mul(t[i],r[u]);return e},e.mod=function(t,r){for(var e=n.from(t);e.length-r.length>=0;){for(var i=e[0],u=0;u<r.length;u++)e[u]^=o.mul(r[u],i);for(var a=0;a<e.length&&0===e[a];)a++;e=e.slice(a)}return e},e.generateECPolynomial=function(t){for(var r=n.from([1]),i=0;i<t;i++)r=e.mul(r,[1,o.exp(i)]);return r}},{"../utils/buffer":28,"./galois-field":11}],17:[function(t,r,e){function n(t,r){for(var e=t.size,n=w.getPositions(r),o=0;o<n.length;o++)for(var i=n[o][0],u=n[o][1],a=-1;a<=7;a++)if(!(i+a<=-1||e<=i+a))for(var f=-1;f<=7;f++)u+f<=-1||e<=u+f||(a>=0&&a<=6&&(0===f||6===f)||f>=0&&f<=6&&(0===a||6===a)||a>=2&&a<=4&&f>=2&&f<=4?t.set(i+a,u+f,!0,!0):t.set(i+a,u+f,!1,!0))}function o(t){for(var r=t.size,e=8;e<r-8;e++){var n=e%2==0;t.set(e,6,n,!0),t.set(6,e,n,!0)}}function i(t,r){for(var e=v.getPositions(r),n=0;n<e.length;n++)for(var o=e[n][0],i=e[n][1],u=-2;u<=2;u++)for(var a=-2;a<=2;a++)-2===u||2===u||-2===a||2===a||0===u&&0===a?t.set(o+u,i+a,!0,!0):t.set(o+u,i+a,!1,!0)}function u(t,r){for(var e,n,o,i=t.size,u=A.getEncodedBits(r),a=0;a<18;a++)e=Math.floor(a/3),n=a%3+i-8-3,o=1==(u>>a&1),t.set(e,n,o,!0),t.set(n,e,o,!0)}function a(t,r,e){var n,o,i=t.size,u=B.getEncodedBits(r,e);for(n=0;n<15;n++)o=1==(u>>n&1),n<6?t.set(n,8,o,!0):n<8?t.set(n+1,8,o,!0):t.set(i-15+n,8,o,!0),n<8?t.set(8,i-n-1,o,!0):n<9?t.set(8,15-n-1+1,o,!0):t.set(8,15-n-1,o,!0);t.set(i-8,8,1,!0)}function f(t,r){for(var e=t.size,n=-1,o=e-1,i=7,u=0,a=e-1;a>0;a-=2)for(6===a&&a--;;){for(var f=0;f<2;f++)if(!t.isReserved(o,a-f)){var s=!1;u<r.length&&(s=1==(r[u]>>>i&1)),t.set(o,a-f,s),i--,-1===i&&(u++,i=7)}if((o+=n)<0||e<=o){o-=n,n=-n;break}}}function s(t,r,e){var n=new d;e.forEach(function(r){n.put(r.mode.bit,4),n.put(r.getLength(),T.getCharCountIndicator(r.mode,t)),r.write(n)});var o=g.getSymbolTotalCodewords(t),i=b.getTotalCodewordsCount(t,r),u=8*(o-i);for(n.getLengthInBits()+4<=u&&n.put(0,4);n.getLengthInBits()%8!=0;)n.putBit(0);for(var a=(u-n.getLengthInBits())/8,f=0;f<a;f++)n.put(f%2?17:236,8);return h(n,t,r)}function h(t,r,e){for(var n=g.getSymbolTotalCodewords(r),o=b.getTotalCodewordsCount(r,e),i=n-o,u=b.getBlocksCount(r,e),a=n%u,f=u-a,s=Math.floor(n/u),h=Math.floor(i/u),c=h+1,p=s-h,d=new E(p),y=0,v=new Array(u),w=new Array(u),m=0,A=l.from(t.buffer),B=0;B<u;B++){var T=B<f?h:c;v[B]=A.slice(y,y+T),w[B]=d.encode(v[B]),y+=T,m=Math.max(m,T)}var R,C,P=l.alloc(n),I=0;for(R=0;R<m;R++)for(C=0;C<u;C++)R<v[C].length&&(P[I++]=v[C][R]);for(R=0;R<p;R++)for(C=0;C<u;C++)P[I++]=w[C][R];return P}function c(t,r,e,h){var c;if(C(t))c=R.fromArray(t);else{if("string"!=typeof t)throw new Error("Invalid data");var l=r;if(!l){var p=R.rawSplit(t);l=A.getBestVersionForData(p,e)}c=R.fromString(t,l||40)}var d=A.getBestVersionForData(c,e);if(!d)throw new Error("The amount of data is too big to be stored in a QR Code");if(r){if(r<d)throw new Error("\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: "+d+".\n")}else r=d;var v=s(r,e,c),w=g.getSymbolSize(r),b=new y(w);return n(b,r),o(b),i(b,r),a(b,e,0),r>=7&&u(b,r),f(b,v),isNaN(h)&&(h=m.getBestMask(b,a.bind(null,b,e))),m.applyMask(h,b),a(b,e,h),{modules:b,version:r,errorCorrectionLevel:e,maskPattern:h,segments:c}}var l=t("../utils/buffer"),g=t("./utils"),p=t("./error-correction-level"),d=t("./bit-buffer"),y=t("./bit-matrix"),v=t("./alignment-pattern"),w=t("./finder-pattern"),m=t("./mask-pattern"),b=t("./error-correction-code"),E=t("./reed-solomon-encoder"),A=t("./version"),B=t("./format-info"),T=t("./mode"),R=t("./segments"),C=t("isarray");e.create=function(t,r){if(void 0===t||""===t)throw new Error("No input text");var e,n,o=p.M;return void 0!==r&&(o=p.from(r.errorCorrectionLevel,p.M),e=A.from(r.version),n=m.from(r.maskPattern),r.toSJISFunc&&g.setToSJISFunction(r.toSJISFunc)),c(t,e,o,n)}},{"../utils/buffer":28,"./alignment-pattern":2,"./bit-buffer":4,"./bit-matrix":5,"./error-correction-code":7,"./error-correction-level":8,"./finder-pattern":9,"./format-info":10,"./mask-pattern":13,"./mode":14,"./reed-solomon-encoder":18,"./segments":20,"./utils":21,"./version":23,isarray:33}],18:[function(t,r,e){function n(t){this.genPoly=void 0,this.degree=t,this.degree&&this.initialize(this.degree)}var o=t("../utils/buffer"),i=t("./polynomial"),u=t("buffer").Buffer;n.prototype.initialize=function(t){this.degree=t,this.genPoly=i.generateECPolynomial(this.degree)},n.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");var r=o.alloc(this.degree),e=u.concat([t,r],t.length+this.degree),n=i.mod(e,this.genPoly),a=this.degree-n.length;if(a>0){var f=o.alloc(this.degree);return n.copy(f,a),f}return n},r.exports=n},{"../utils/buffer":28,"./polynomial":16,buffer:30}],19:[function(t,r,e){var n="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";n=n.replace(/u/g,"\\u");var o="(?:(?![A-Z0-9 $%*+\\-./:]|"+n+")(?:.|[\r\n]))+";e.KANJI=new RegExp(n,"g"),e.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),e.BYTE=new RegExp(o,"g"),e.NUMERIC=new RegExp("[0-9]+","g"),e.ALPHANUMERIC=new RegExp("[A-Z $%*+\\-./:]+","g");var i=new RegExp("^"+n+"$"),u=new RegExp("^[0-9]+$"),a=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");e.testKanji=function(t){return i.test(t)},e.testNumeric=function(t){return u.test(t)},e.testAlphanumeric=function(t){return a.test(t)}},{}],20:[function(t,r,e){function n(t){return unescape(encodeURIComponent(t)).length}function o(t,r,e){for(var n,o=[];null!==(n=t.exec(e));)o.push({data:n[0],index:n.index,mode:r,length:n[0].length});return o}function i(t){var r,e,n=o(y.NUMERIC,c.NUMERIC,t),i=o(y.ALPHANUMERIC,c.ALPHANUMERIC,t);return v.isKanjiModeEnabled()?(r=o(y.BYTE,c.BYTE,t),e=o(y.KANJI,c.KANJI,t)):(r=o(y.BYTE_KANJI,c.BYTE,t),e=[]),n.concat(i,r,e).sort(function(t,r){return t.index-r.index}).map(function(t){return{data:t.data,mode:t.mode,length:t.length}})}function u(t,r){switch(r){case c.NUMERIC:return l.getBitsLength(t);case c.ALPHANUMERIC:return g.getBitsLength(t);case c.KANJI:return d.getBitsLength(t);case c.BYTE:return p.getBitsLength(t)}}function a(t){return t.reduce(function(t,r){var e=t.length-1>=0?t[t.length-1]:null;return e&&e.mode===r.mode?(t[t.length-1].data+=r.data,t):(t.push(r),t)},[])}function f(t){for(var r=[],e=0;e<t.length;e++){var o=t[e];switch(o.mode){case c.NUMERIC:r.push([o,{data:o.data,mode:c.ALPHANUMERIC,length:o.length},{data:o.data,mode:c.BYTE,length:o.length}]);break;case c.ALPHANUMERIC:r.push([o,{data:o.data,mode:c.BYTE,length:o.length}]);break;case c.KANJI:r.push([o,{data:o.data,mode:c.BYTE,length:n(o.data)}]);break;case c.BYTE:r.push([{data:o.data,mode:c.BYTE,length:n(o.data)}])}}return r}function s(t,r){for(var e={},n={start:{}},o=["start"],i=0;i<t.length;i++){for(var a=t[i],f=[],s=0;s<a.length;s++){var h=a[s],l=""+i+s;f.push(l),e[l]={node:h,lastCount:0},n[l]={};for(var g=0;g<o.length;g++){var p=o[g];e[p]&&e[p].node.mode===h.mode?(n[p][l]=u(e[p].lastCount+h.length,h.mode)-u(e[p].lastCount,h.mode),e[p].lastCount+=h.length):(e[p]&&(e[p].lastCount=h.length),n[p][l]=u(h.length,h.mode)+4+c.getCharCountIndicator(h.mode,r))}}o=f}for(g=0;g<o.length;g++)n[o[g]].end=0;return{map:n,table:e}}function h(t,r){var e,n=c.getBestModeForData(t);if((e=c.from(r,n))!==c.BYTE&&e.bit<n.bit)throw new Error('"'+t+'" cannot be encoded with mode '+c.toString(e)+".\n Suggested mode is: "+c.toString(n));switch(e!==c.KANJI||v.isKanjiModeEnabled()||(e=c.BYTE),e){case c.NUMERIC:return new l(t);case c.ALPHANUMERIC:return new g(t);case c.KANJI:return new d(t);case c.BYTE:return new p(t)}}var c=t("./mode"),l=t("./numeric-data"),g=t("./alphanumeric-data"),p=t("./byte-data"),d=t("./kanji-data"),y=t("./regex"),v=t("./utils"),w=t("dijkstrajs");e.fromArray=function(t){return t.reduce(function(t,r){return"string"==typeof r?t.push(h(r,null)):r.data&&t.push(h(r.data,r.mode)),t},[])},e.fromString=function(t,r){for(var n=i(t,v.isKanjiModeEnabled()),o=f(n),u=s(o,r),h=w.find_path(u.map,"start","end"),c=[],l=1;l<h.length-1;l++)c.push(u.table[h[l]].node);return e.fromArray(a(c))},e.rawSplit=function(t){return e.fromArray(i(t,v.isKanjiModeEnabled()))}},{"./alphanumeric-data":3,"./byte-data":6,"./kanji-data":12,"./mode":14,"./numeric-data":15,"./regex":19,"./utils":21,dijkstrajs:31}],21:[function(t,r,e){var n,o=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];e.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return 4*t+17},e.getSymbolTotalCodewords=function(t){return o[t]},e.getBCHDigit=function(t){for(var r=0;0!==t;)r++,t>>>=1;return r},e.setToSJISFunction=function(t){if("function"!=typeof t)throw new Error('"toSJISFunc" is not a valid function.');n=t},e.isKanjiModeEnabled=function(){return void 0!==n},e.toSJIS=function(t){return n(t)}},{}],22:[function(t,r,e){e.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40}},{}],23:[function(t,r,e){function n(t,r,n){for(var o=1;o<=40;o++)if(r<=e.getCapacity(o,n,t))return o}function o(t,r){return h.getCharCountIndicator(t,r)+4}function i(t,r){var e=0;return t.forEach(function(t){var n=o(t.mode,r);e+=n+t.getBitsLength()}),e}function u(t,r){for(var n=1;n<=40;n++){if(i(t,n)<=e.getCapacity(n,r,h.MIXED))return n}}var a=t("./utils"),f=t("./error-correction-code"),s=t("./error-correction-level"),h=t("./mode"),c=t("./version-check"),l=t("isarray"),g=a.getBCHDigit(7973);e.from=function(t,r){return c.isValid(t)?parseInt(t,10):r},e.getCapacity=function(t,r,e){if(!c.isValid(t))throw new Error("Invalid QR Code version");void 0===e&&(e=h.BYTE);var n=a.getSymbolTotalCodewords(t),i=f.getTotalCodewordsCount(t,r),u=8*(n-i);if(e===h.MIXED)return u;var s=u-o(e,t);switch(e){case h.NUMERIC:return Math.floor(s/10*3);case h.ALPHANUMERIC:return Math.floor(s/11*2);case h.KANJI:return Math.floor(s/13);case h.BYTE:default:return Math.floor(s/8)}},e.getBestVersionForData=function(t,r){var e,o=s.from(r,s.M);if(l(t)){if(t.length>1)return u(t,o);if(0===t.length)return 1;e=t[0]}else e=t;return n(e.mode,e.getLength(),o)},e.getEncodedBits=function(t){if(!c.isValid(t)||t<7)throw new Error("Invalid QR Code version");for(var r=t<<12;a.getBCHDigit(r)-g>=0;)r^=7973<<a.getBCHDigit(r)-g;return t<<12|r}},{"./error-correction-code":7,"./error-correction-level":8,"./mode":14,"./utils":21,"./version-check":22,isarray:33}],24:[function(t,r,e){function n(t,r,e,n,u){var a=[].slice.call(arguments,1),f=a.length,s="function"==typeof a[f-1];if(!s&&!o())throw new Error("Callback required as last argument");if(!s){if(f<1)throw new Error("Too few arguments provided");return 1===f?(e=r,r=n=void 0):2!==f||r.getContext||(n=e,e=r,r=void 0),new Promise(function(o,u){try{var a=i.create(e,n);o(t(a,r,n))}catch(t){u(t)}})}if(f<2)throw new Error("Too few arguments provided");2===f?(u=e,e=r,r=n=void 0):3===f&&(r.getContext&&void 0===u?(u=n,n=void 0):(u=n,n=e,e=r,r=void 0));try{var h=i.create(e,n);u(null,t(h,r,n))}catch(t){u(t)}}var o=t("./can-promise"),i=t("./core/qrcode"),u=t("./renderer/canvas"),a=t("./renderer/svg-tag.js");e.create=i.create,e.toCanvas=n.bind(null,u.render),e.toDataURL=n.bind(null,u.renderToDataURL),e.toString=n.bind(null,function(t,r,e){return a.render(t,e)})},{"./can-promise":1,"./core/qrcode":17,"./renderer/canvas":25,"./renderer/svg-tag.js":26}],25:[function(t,r,e){function n(t,r,e){t.clearRect(0,0,r.width,r.height),r.style||(r.style={}),r.height=e,r.width=e,r.style.height=e+"px",r.style.width=e+"px"}function o(){try{return document.createElement("canvas")}catch(t){throw new Error("You need to specify a canvas element")}}var i=t("./utils");e.render=function(t,r,e){var u=e,a=r;void 0!==u||r&&r.getContext||(u=r,r=void 0),r||(a=o()),u=i.getOptions(u);var f=i.getImageWidth(t.modules.size,u),s=a.getContext("2d"),h=s.createImageData(f,f);return i.qrToImageData(h.data,t,u),n(s,a,f),s.putImageData(h,0,0),a},e.renderToDataURL=function(t,r,n){var o=n;void 0!==o||r&&r.getContext||(o=r,r=void 0),o||(o={});var i=e.render(t,r,o),u=o.type||"image/png",a=o.rendererOpts||{};return i.toDataURL(u,a.quality)}},{"./utils":27}],26:[function(t,r,e){function n(t,r){var e=t.a/255,n=r+'="'+t.hex+'"';return e<1?n+" "+r+'-opacity="'+e.toFixed(2).slice(1)+'"':n}function o(t,r,e){var n=t+r;return void 0!==e&&(n+=" "+e),n}function i(t,r,e){for(var n="",i=0,u=!1,a=0,f=0;f<t.length;f++){var s=Math.floor(f%r),h=Math.floor(f/r);s||u||(u=!0),t[f]?(a++,f>0&&s>0&&t[f-1]||(n+=u?o("M",s+e,.5+h+e):o("m",i,0),i=0,u=!1),s+1<r&&t[f+1]||(n+=o("h",a),a=0)):i++}return n}var u=t("./utils");e.render=function(t,r,e){var o=u.getOptions(r),a=t.modules.size,f=t.modules.data,s=a+2*o.margin,h=o.color.light.a?"<path "+n(o.color.light,"fill")+' d="M0 0h'+s+"v"+s+'H0z"/>':"",c="<path "+n(o.color.dark,"stroke")+' d="'+i(f,a,o.margin)+'"/>',l='viewBox="0 0 '+s+" "+s+'"',g=o.width?'width="'+o.width+'" height="'+o.width+'" ':"",p='<svg xmlns="http://www.w3.org/2000/svg" '+g+l+' shape-rendering="crispEdges">'+h+c+"</svg>\n";return"function"==typeof e&&e(null,p),p}},{"./utils":27}],27:[function(t,r,e){function n(t){if("number"==typeof t&&(t=t.toString()),"string"!=typeof t)throw new Error("Color should be defined as hex string");var r=t.slice().replace("#","").split("");if(r.length<3||5===r.length||r.length>8)throw new Error("Invalid hex color: "+t);3!==r.length&&4!==r.length||(r=Array.prototype.concat.apply([],r.map(function(t){return[t,t]}))),6===r.length&&r.push("F","F");var e=parseInt(r.join(""),16);return{r:e>>24&255,g:e>>16&255,b:e>>8&255,a:255&e,hex:"#"+r.slice(0,6).join("")}}e.getOptions=function(t){t||(t={}),t.color||(t.color={});var r=void 0===t.margin||null===t.margin||t.margin<0?4:t.margin,e=t.width&&t.width>=21?t.width:void 0,o=t.scale||4;return{width:e,scale:e?4:o,margin:r,color:{dark:n(t.color.dark||"#000000ff"),light:n(t.color.light||"#ffffffff")},type:t.type,rendererOpts:t.rendererOpts||{}}},e.getScale=function(t,r){return r.width&&r.width>=t+2*r.margin?r.width/(t+2*r.margin):r.scale},e.getImageWidth=function(t,r){var n=e.getScale(t,r);return Math.floor((t+2*r.margin)*n)},e.qrToImageData=function(t,r,n){for(var o=r.modules.size,i=r.modules.data,u=e.getScale(o,n),a=Math.floor((o+2*n.margin)*u),f=n.margin*u,s=[n.color.light,n.color.dark],h=0;h<a;h++)for(var c=0;c<a;c++){var l=4*(h*a+c),g=n.color.light;if(h>=f&&c>=f&&h<a-f&&c<a-f){var p=Math.floor((h-f)/u),d=Math.floor((c-f)/u);g=s[i[p*o+d]?1:0]}t[l++]=g.r,t[l++]=g.g,t[l++]=g.b,t[l]=g.a}}},{}],28:[function(t,r,e){"use strict";function n(t,r,e){return n.TYPED_ARRAY_SUPPORT||this instanceof n?"number"==typeof t?a(this,t):y(this,t,r,e):new n(t,r,e)}function o(t){if(t>=w)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+w.toString(16)+" bytes");return 0|t}function i(t){return t!==t}function u(t,r){var e;return n.TYPED_ARRAY_SUPPORT?(e=new Uint8Array(r),e.__proto__=n.prototype):(e=t,null===e&&(e=new n(r)),e.length=r),e}function a(t,r){var e=u(t,r<0?0:0|o(r));if(!n.TYPED_ARRAY_SUPPORT)for(var i=0;i<r;++i)e[i]=0;return e}function f(t,r){var e=0|g(r),n=u(t,e),o=n.write(r);return o!==e&&(n=n.slice(0,o)),n}function s(t,r){for(var e=r.length<0?0:0|o(r.length),n=u(t,e),i=0;i<e;i+=1)n[i]=255&r[i];return n}function h(t,r,e,o){if(e<0||r.byteLength<e)throw new RangeError("'offset' is out of bounds");if(r.byteLength<e+(o||0))throw new RangeError("'length' is out of bounds");var i;return i=void 0===e&&void 0===o?new Uint8Array(r):void 0===o?new Uint8Array(r,e):new Uint8Array(r,e,o),n.TYPED_ARRAY_SUPPORT?i.__proto__=n.prototype:i=s(t,i),i}function c(t,r){if(n.isBuffer(r)){var e=0|o(r.length),a=u(t,e);return 0===a.length?a:(r.copy(a,0,0,e),a)}if(r){if("undefined"!=typeof ArrayBuffer&&r.buffer instanceof ArrayBuffer||"length"in r)return"number"!=typeof r.length||i(r.length)?u(t,0):s(t,r);if("Buffer"===r.type&&Array.isArray(r.data))return s(t,r.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}function l(t,r){r=r||1/0;for(var e,n=t.length,o=null,i=[],u=0;u<n;++u){if((e=t.charCodeAt(u))>55295&&e<57344){if(!o){if(e>56319){(r-=3)>-1&&i.push(239,191,189);continue}if(u+1===n){(r-=3)>-1&&i.push(239,191,189);continue}o=e;continue}if(e<56320){(r-=3)>-1&&i.push(239,191,189),o=e;continue}e=65536+(o-55296<<10|e-56320)}else o&&(r-=3)>-1&&i.push(239,191,189);if(o=null,e<128){if((r-=1)<0)break;i.push(e)}else if(e<2048){if((r-=2)<0)break;i.push(e>>6|192,63&e|128)}else if(e<65536){if((r-=3)<0)break;i.push(e>>12|224,e>>6&63|128,63&e|128)}else{if(!(e<1114112))throw new Error("Invalid code point");if((r-=4)<0)break;i.push(e>>18|240,e>>12&63|128,e>>6&63|128,63&e|128)}}return i}function g(t){return n.isBuffer(t)?t.length:"undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer)?t.byteLength:("string"!=typeof t&&(t=""+t),0===t.length?0:l(t).length)}function p(t,r,e,n){for(var o=0;o<n&&!(o+e>=r.length||o>=t.length);++o)r[o+e]=t[o];return o}function d(t,r,e,n){return p(l(r,t.length-e),t,e,n)}function y(t,r,e,n){if("number"==typeof r)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&r instanceof ArrayBuffer?h(t,r,e,n):"string"==typeof r?f(t,r,e):c(t,r)}var v=t("isarray");n.TYPED_ARRAY_SUPPORT=function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()}catch(t){return!1}}();var w=n.TYPED_ARRAY_SUPPORT?2147483647:1073741823;n.TYPED_ARRAY_SUPPORT&&(n.prototype.__proto__=Uint8Array.prototype,n.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&n[Symbol.species]===n&&Object.defineProperty(n,Symbol.species,{value:null,configurable:!0,enumerable:!1,writable:!1})),n.prototype.write=function(t,r,e){void 0===r?(e=this.length,r=0):void 0===e&&"string"==typeof r?(e=this.length,r=0):isFinite(r)&&(r|=0,isFinite(e)?e|=0:e=void 0);var n=this.length-r;if((void 0===e||e>n)&&(e=n),t.length>0&&(e<0||r<0)||r>this.length)throw new RangeError("Attempt to write outside buffer bounds");return d(this,t,r,e)},n.prototype.slice=function(t,r){var e=this.length;t=~~t,r=void 0===r?e:~~r,t<0?(t+=e)<0&&(t=0):t>e&&(t=e),r<0?(r+=e)<0&&(r=0):r>e&&(r=e),r<t&&(r=t);var o;if(n.TYPED_ARRAY_SUPPORT)o=this.subarray(t,r),o.__proto__=n.prototype;else{var i=r-t;o=new n(i,void 0);for(var u=0;u<i;++u)o[u]=this[u+t]}return o},n.prototype.copy=function(t,r,e,o){if(e||(e=0),o||0===o||(o=this.length),r>=t.length&&(r=t.length),r||(r=0),o>0&&o<e&&(o=e),o===e)return 0;if(0===t.length||0===this.length)return 0;if(r<0)throw new RangeError("targetStart out of bounds");if(e<0||e>=this.length)throw new RangeError("sourceStart out of bounds");if(o<0)throw new RangeError("sourceEnd out of bounds");o>this.length&&(o=this.length),t.length-r<o-e&&(o=t.length-r+e);var i,u=o-e;if(this===t&&e<r&&r<o)for(i=u-1;i>=0;--i)t[i+r]=this[i+e];else if(u<1e3||!n.TYPED_ARRAY_SUPPORT)for(i=0;i<u;++i)t[i+r]=this[i+e];else Uint8Array.prototype.set.call(t,this.subarray(e,e+u),r);return u},n.prototype.fill=function(t,r,e){if("string"==typeof t){if("string"==typeof r?(r=0,e=this.length):"string"==typeof e&&(e=this.length),1===t.length){var o=t.charCodeAt(0);o<256&&(t=o)}}else"number"==typeof t&&(t&=255);if(r<0||this.length<r||this.length<e)throw new RangeError("Out of range index");if(e<=r)return this;r>>>=0,e=void 0===e?this.length:e>>>0,t||(t=0);var i;if("number"==typeof t)for(i=r;i<e;++i)this[i]=t;else{var u=n.isBuffer(t)?t:new n(t),a=u.length;for(i=0;i<e-r;++i)this[i+r]=u[i%a]}return this},n.concat=function(t,r){if(!v(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return u(null,0);var e;if(void 0===r)for(r=0,e=0;e<t.length;++e)r+=t[e].length;var o=a(null,r),i=0;for(e=0;e<t.length;++e){var f=t[e];if(!n.isBuffer(f))throw new TypeError('"list" argument must be an Array of Buffers');f.copy(o,i),i+=f.length}return o},n.byteLength=g,n.prototype._isBuffer=!0,n.isBuffer=function(t){return!(null==t||!t._isBuffer)},r.exports.alloc=function(t){var r=new n(t);return r.fill(0),r},r.exports.from=function(t){return new n(t)}},{isarray:33}],29:[function(t,r,e){"use strict";function n(t){var r=t.length;if(r%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var e=t.indexOf("=");return-1===e&&(e=r),[e,e===r?0:4-e%4]}function o(t){var r=n(t),e=r[0],o=r[1];return 3*(e+o)/4-o}function i(t,r,e){return 3*(r+e)/4-e}function u(t){var r,e,o=n(t),u=o[0],a=o[1],f=new l(i(t,u,a)),s=0,h=a>0?u-4:u;for(e=0;e<h;e+=4)r=c[t.charCodeAt(e)]<<18|c[t.charCodeAt(e+1)]<<12|c[t.charCodeAt(e+2)]<<6|c[t.charCodeAt(e+3)],f[s++]=r>>16&255,f[s++]=r>>8&255,f[s++]=255&r;return 2===a&&(r=c[t.charCodeAt(e)]<<2|c[t.charCodeAt(e+1)]>>4,f[s++]=255&r),1===a&&(r=c[t.charCodeAt(e)]<<10|c[t.charCodeAt(e+1)]<<4|c[t.charCodeAt(e+2)]>>2,f[s++]=r>>8&255,f[s++]=255&r),f}function a(t){return h[t>>18&63]+h[t>>12&63]+h[t>>6&63]+h[63&t]}function f(t,r,e){for(var n,o=[],i=r;i<e;i+=3)n=(t[i]<<16&16711680)+(t[i+1]<<8&65280)+(255&t[i+2]),o.push(a(n));return o.join("")}function s(t){for(var r,e=t.length,n=e%3,o=[],i=0,u=e-n;i<u;i+=16383)o.push(f(t,i,i+16383>u?u:i+16383));return 1===n?(r=t[e-1],o.push(h[r>>2]+h[r<<4&63]+"==")):2===n&&(r=(t[e-2]<<8)+t[e-1],o.push(h[r>>10]+h[r>>4&63]+h[r<<2&63]+"=")),o.join("")}e.byteLength=o,e.toByteArray=u,e.fromByteArray=s
// ;for(var h=[],c=[],l="undefined"!=typeof Uint8Array?Uint8Array:Array,g="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",p=0,d=g.length;p<d;++p)h[p]=g[p],c[g.charCodeAt(p)]=p;c["-".charCodeAt(0)]=62,c["_".charCodeAt(0)]=63},{}],30:[function(t,r,e){"use strict";function n(t){if(t>$)throw new RangeError('The value "'+t+'" is invalid for option "size"');var r=new Uint8Array(t);return Object.setPrototypeOf(r,o.prototype),r}function o(t,r,e){if("number"==typeof t){if("string"==typeof r)throw new TypeError('The "string" argument must be of type string. Received type number');return f(t)}return i(t,r,e)}function i(t,r,e){if("string"==typeof t)return s(t,r);if(ArrayBuffer.isView(t))return h(t);if(null==t)throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof t);if(J(t,ArrayBuffer)||t&&J(t.buffer,ArrayBuffer))return c(t,r,e);if("number"==typeof t)throw new TypeError('The "value" argument must not be of type number. Received type number');var n=t.valueOf&&t.valueOf();if(null!=n&&n!==t)return o.from(n,r,e);var i=l(t);if(i)return i;if("undefined"!=typeof Symbol&&null!=Symbol.toPrimitive&&"function"==typeof t[Symbol.toPrimitive])return o.from(t[Symbol.toPrimitive]("string"),r,e);throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof t)}function u(t){if("number"!=typeof t)throw new TypeError('"size" argument must be of type number');if(t<0)throw new RangeError('The value "'+t+'" is invalid for option "size"')}function a(t,r,e){return u(t),t<=0?n(t):void 0!==r?"string"==typeof e?n(t).fill(r,e):n(t).fill(r):n(t)}function f(t){return u(t),n(t<0?0:0|g(t))}function s(t,r){if("string"==typeof r&&""!==r||(r="utf8"),!o.isEncoding(r))throw new TypeError("Unknown encoding: "+r);var e=0|d(t,r),i=n(e),u=i.write(t,r);return u!==e&&(i=i.slice(0,u)),i}function h(t){for(var r=t.length<0?0:0|g(t.length),e=n(r),o=0;o<r;o+=1)e[o]=255&t[o];return e}function c(t,r,e){if(r<0||t.byteLength<r)throw new RangeError('"offset" is outside of buffer bounds');if(t.byteLength<r+(e||0))throw new RangeError('"length" is outside of buffer bounds');var n;return n=void 0===r&&void 0===e?new Uint8Array(t):void 0===e?new Uint8Array(t,r):new Uint8Array(t,r,e),Object.setPrototypeOf(n,o.prototype),n}function l(t){if(o.isBuffer(t)){var r=0|g(t.length),e=n(r);return 0===e.length?e:(t.copy(e,0,0,r),e)}return void 0!==t.length?"number"!=typeof t.length||K(t.length)?n(0):h(t):"Buffer"===t.type&&Array.isArray(t.data)?h(t.data):void 0}function g(t){if(t>=$)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+$.toString(16)+" bytes");return 0|t}function p(t){return+t!=t&&(t=0),o.alloc(+t)}function d(t,r){if(o.isBuffer(t))return t.length;if(ArrayBuffer.isView(t)||J(t,ArrayBuffer))return t.byteLength;if("string"!=typeof t)throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof t);var e=t.length,n=arguments.length>2&&!0===arguments[2];if(!n&&0===e)return 0;for(var i=!1;;)switch(r){case"ascii":case"latin1":case"binary":return e;case"utf8":case"utf-8":return D(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*e;case"hex":return e>>>1;case"base64":return z(t).length;default:if(i)return n?-1:D(t).length;r=(""+r).toLowerCase(),i=!0}}function y(t,r,e){var n=!1;if((void 0===r||r<0)&&(r=0),r>this.length)return"";if((void 0===e||e>this.length)&&(e=this.length),e<=0)return"";if(e>>>=0,r>>>=0,e<=r)return"";for(t||(t="utf8");;)switch(t){case"hex":return N(this,r,e);case"utf8":case"utf-8":return P(this,r,e);case"ascii":return M(this,r,e);case"latin1":case"binary":return U(this,r,e);case"base64":return C(this,r,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return S(this,r,e);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}function v(t,r,e){var n=t[r];t[r]=t[e],t[e]=n}function w(t,r,e,n,i){if(0===t.length)return-1;if("string"==typeof e?(n=e,e=0):e>2147483647?e=2147483647:e<-2147483648&&(e=-2147483648),e=+e,K(e)&&(e=i?0:t.length-1),e<0&&(e=t.length+e),e>=t.length){if(i)return-1;e=t.length-1}else if(e<0){if(!i)return-1;e=0}if("string"==typeof r&&(r=o.from(r,n)),o.isBuffer(r))return 0===r.length?-1:m(t,r,e,n,i);if("number"==typeof r)return r&=255,"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(t,r,e):Uint8Array.prototype.lastIndexOf.call(t,r,e):m(t,[r],e,n,i);throw new TypeError("val must be string, number or Buffer")}function m(t,r,e,n,o){function i(t,r){return 1===u?t[r]:t.readUInt16BE(r*u)}var u=1,a=t.length,f=r.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(t.length<2||r.length<2)return-1;u=2,a/=2,f/=2,e/=2}var s;if(o){var h=-1;for(s=e;s<a;s++)if(i(t,s)===i(r,-1===h?0:s-h)){if(-1===h&&(h=s),s-h+1===f)return h*u}else-1!==h&&(s-=s-h),h=-1}else for(e+f>a&&(e=a-f),s=e;s>=0;s--){for(var c=!0,l=0;l<f;l++)if(i(t,s+l)!==i(r,l)){c=!1;break}if(c)return s}return-1}function b(t,r,e,n){e=Number(e)||0;var o=t.length-e;n?(n=Number(n))>o&&(n=o):n=o;var i=r.length;n>i/2&&(n=i/2);for(var u=0;u<n;++u){var a=parseInt(r.substr(2*u,2),16);if(K(a))return u;t[e+u]=a}return u}function E(t,r,e,n){return H(D(r,t.length-e),t,e,n)}function A(t,r,e,n){return H(j(r),t,e,n)}function B(t,r,e,n){return A(t,r,e,n)}function T(t,r,e,n){return H(z(r),t,e,n)}function R(t,r,e,n){return H(F(r,t.length-e),t,e,n)}function C(t,r,e){return 0===r&&e===t.length?q.fromByteArray(t):q.fromByteArray(t.slice(r,e))}function P(t,r,e){e=Math.min(t.length,e);for(var n=[],o=r;o<e;){var i=t[o],u=null,a=i>239?4:i>223?3:i>191?2:1;if(o+a<=e){var f,s,h,c;switch(a){case 1:i<128&&(u=i);break;case 2:f=t[o+1],128==(192&f)&&(c=(31&i)<<6|63&f)>127&&(u=c);break;case 3:f=t[o+1],s=t[o+2],128==(192&f)&&128==(192&s)&&(c=(15&i)<<12|(63&f)<<6|63&s)>2047&&(c<55296||c>57343)&&(u=c);break;case 4:f=t[o+1],s=t[o+2],h=t[o+3],128==(192&f)&&128==(192&s)&&128==(192&h)&&(c=(15&i)<<18|(63&f)<<12|(63&s)<<6|63&h)>65535&&c<1114112&&(u=c)}}null===u?(u=65533,a=1):u>65535&&(u-=65536,n.push(u>>>10&1023|55296),u=56320|1023&u),n.push(u),o+=a}return I(n)}function I(t){var r=t.length;if(r<=X)return String.fromCharCode.apply(String,t);for(var e="",n=0;n<r;)e+=String.fromCharCode.apply(String,t.slice(n,n+=X));return e}function M(t,r,e){var n="";e=Math.min(t.length,e);for(var o=r;o<e;++o)n+=String.fromCharCode(127&t[o]);return n}function U(t,r,e){var n="";e=Math.min(t.length,e);for(var o=r;o<e;++o)n+=String.fromCharCode(t[o]);return n}function N(t,r,e){var n=t.length;(!r||r<0)&&(r=0),(!e||e<0||e>n)&&(e=n);for(var o="",i=r;i<e;++i)o+=W[t[i]];return o}function S(t,r,e){for(var n=t.slice(r,e),o="",i=0;i<n.length;i+=2)o+=String.fromCharCode(n[i]+256*n[i+1]);return o}function L(t,r,e){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+r>e)throw new RangeError("Trying to access beyond buffer length")}function x(t,r,e,n,i,u){if(!o.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(r>i||r<u)throw new RangeError('"value" argument is out of bounds');if(e+n>t.length)throw new RangeError("Index out of range")}function _(t,r,e,n,o,i){if(e+n>t.length)throw new RangeError("Index out of range");if(e<0)throw new RangeError("Index out of range")}function k(t,r,e,n,o){return r=+r,e>>>=0,o||_(t,r,e,4,3.4028234663852886e38,-3.4028234663852886e38),V.write(t,r,e,n,23,4),e+4}function O(t,r,e,n,o){return r=+r,e>>>=0,o||_(t,r,e,8,1.7976931348623157e308,-1.7976931348623157e308),V.write(t,r,e,n,52,8),e+8}function Y(t){if(t=t.split("=")[0],t=t.trim().replace(Z,""),t.length<2)return"";for(;t.length%4!=0;)t+="=";return t}function D(t,r){r=r||1/0;for(var e,n=t.length,o=null,i=[],u=0;u<n;++u){if((e=t.charCodeAt(u))>55295&&e<57344){if(!o){if(e>56319){(r-=3)>-1&&i.push(239,191,189);continue}if(u+1===n){(r-=3)>-1&&i.push(239,191,189);continue}o=e;continue}if(e<56320){(r-=3)>-1&&i.push(239,191,189),o=e;continue}e=65536+(o-55296<<10|e-56320)}else o&&(r-=3)>-1&&i.push(239,191,189);if(o=null,e<128){if((r-=1)<0)break;i.push(e)}else if(e<2048){if((r-=2)<0)break;i.push(e>>6|192,63&e|128)}else if(e<65536){if((r-=3)<0)break;i.push(e>>12|224,e>>6&63|128,63&e|128)}else{if(!(e<1114112))throw new Error("Invalid code point");if((r-=4)<0)break;i.push(e>>18|240,e>>12&63|128,e>>6&63|128,63&e|128)}}return i}function j(t){for(var r=[],e=0;e<t.length;++e)r.push(255&t.charCodeAt(e));return r}function F(t,r){for(var e,n,o,i=[],u=0;u<t.length&&!((r-=2)<0);++u)e=t.charCodeAt(u),n=e>>8,o=e%256,i.push(o),i.push(n);return i}function z(t){return q.toByteArray(Y(t))}function H(t,r,e,n){for(var o=0;o<n&&!(o+e>=r.length||o>=t.length);++o)r[o+e]=t[o];return o}function J(t,r){return t instanceof r||null!=t&&null!=t.constructor&&null!=t.constructor.name&&t.constructor.name===r.name}function K(t){return t!==t}var q=t("base64-js"),V=t("ieee754"),Q="function"==typeof Symbol&&"function"==typeof Symbol.for?Symbol.for("nodejs.util.inspect.custom"):null;e.Buffer=o,e.SlowBuffer=p,e.INSPECT_MAX_BYTES=50;var $=2147483647;e.kMaxLength=$,o.TYPED_ARRAY_SUPPORT=function(){try{var t=new Uint8Array(1),r={foo:function(){return 42}};return Object.setPrototypeOf(r,Uint8Array.prototype),Object.setPrototypeOf(t,r),42===t.foo()}catch(t){return!1}}(),o.TYPED_ARRAY_SUPPORT||"undefined"==typeof console||"function"!=typeof console.error||console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."),Object.defineProperty(o.prototype,"parent",{enumerable:!0,get:function(){if(o.isBuffer(this))return this.buffer}}),Object.defineProperty(o.prototype,"offset",{enumerable:!0,get:function(){if(o.isBuffer(this))return this.byteOffset}}),"undefined"!=typeof Symbol&&null!=Symbol.species&&o[Symbol.species]===o&&Object.defineProperty(o,Symbol.species,{value:null,configurable:!0,enumerable:!1,writable:!1}),o.poolSize=8192,o.from=function(t,r,e){return i(t,r,e)},Object.setPrototypeOf(o.prototype,Uint8Array.prototype),Object.setPrototypeOf(o,Uint8Array),o.alloc=function(t,r,e){return a(t,r,e)},o.allocUnsafe=function(t){return f(t)},o.allocUnsafeSlow=function(t){return f(t)},o.isBuffer=function(t){return null!=t&&!0===t._isBuffer&&t!==o.prototype},o.compare=function(t,r){if(J(t,Uint8Array)&&(t=o.from(t,t.offset,t.byteLength)),J(r,Uint8Array)&&(r=o.from(r,r.offset,r.byteLength)),!o.isBuffer(t)||!o.isBuffer(r))throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(t===r)return 0;for(var e=t.length,n=r.length,i=0,u=Math.min(e,n);i<u;++i)if(t[i]!==r[i]){e=t[i],n=r[i];break}return e<n?-1:n<e?1:0},o.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},o.concat=function(t,r){if(!Array.isArray(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return o.alloc(0);var e;if(void 0===r)for(r=0,e=0;e<t.length;++e)r+=t[e].length;var n=o.allocUnsafe(r),i=0;for(e=0;e<t.length;++e){var u=t[e];if(J(u,Uint8Array)&&(u=o.from(u)),!o.isBuffer(u))throw new TypeError('"list" argument must be an Array of Buffers');u.copy(n,i),i+=u.length}return n},o.byteLength=d,o.prototype._isBuffer=!0,o.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var r=0;r<t;r+=2)v(this,r,r+1);return this},o.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var r=0;r<t;r+=4)v(this,r,r+3),v(this,r+1,r+2);return this},o.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var r=0;r<t;r+=8)v(this,r,r+7),v(this,r+1,r+6),v(this,r+2,r+5),v(this,r+3,r+4);return this},o.prototype.toString=function(){var t=this.length;return 0===t?"":0===arguments.length?P(this,0,t):y.apply(this,arguments)},o.prototype.toLocaleString=o.prototype.toString,o.prototype.equals=function(t){if(!o.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===o.compare(this,t)},o.prototype.inspect=function(){var t="",r=e.INSPECT_MAX_BYTES;return t=this.toString("hex",0,r).replace(/(.{2})/g,"$1 ").trim(),this.length>r&&(t+=" ... "),"<Buffer "+t+">"},Q&&(o.prototype[Q]=o.prototype.inspect),o.prototype.compare=function(t,r,e,n,i){if(J(t,Uint8Array)&&(t=o.from(t,t.offset,t.byteLength)),!o.isBuffer(t))throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof t);if(void 0===r&&(r=0),void 0===e&&(e=t?t.length:0),void 0===n&&(n=0),void 0===i&&(i=this.length),r<0||e>t.length||n<0||i>this.length)throw new RangeError("out of range index");if(n>=i&&r>=e)return 0;if(n>=i)return-1;if(r>=e)return 1;if(r>>>=0,e>>>=0,n>>>=0,i>>>=0,this===t)return 0;for(var u=i-n,a=e-r,f=Math.min(u,a),s=this.slice(n,i),h=t.slice(r,e),c=0;c<f;++c)if(s[c]!==h[c]){u=s[c],a=h[c];break}return u<a?-1:a<u?1:0},o.prototype.includes=function(t,r,e){return-1!==this.indexOf(t,r,e)},o.prototype.indexOf=function(t,r,e){return w(this,t,r,e,!0)},o.prototype.lastIndexOf=function(t,r,e){return w(this,t,r,e,!1)},o.prototype.write=function(t,r,e,n){if(void 0===r)n="utf8",e=this.length,r=0;else if(void 0===e&&"string"==typeof r)n=r,e=this.length,r=0;else{if(!isFinite(r))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");r>>>=0,isFinite(e)?(e>>>=0,void 0===n&&(n="utf8")):(n=e,e=void 0)}var o=this.length-r;if((void 0===e||e>o)&&(e=o),t.length>0&&(e<0||r<0)||r>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");for(var i=!1;;)switch(n){case"hex":return b(this,t,r,e);case"utf8":case"utf-8":return E(this,t,r,e);case"ascii":return A(this,t,r,e);case"latin1":case"binary":return B(this,t,r,e);case"base64":return T(this,t,r,e);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return R(this,t,r,e);default:if(i)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),i=!0}},o.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var X=4096;o.prototype.slice=function(t,r){var e=this.length;t=~~t,r=void 0===r?e:~~r,t<0?(t+=e)<0&&(t=0):t>e&&(t=e),r<0?(r+=e)<0&&(r=0):r>e&&(r=e),r<t&&(r=t);var n=this.subarray(t,r);return Object.setPrototypeOf(n,o.prototype),n},o.prototype.readUIntLE=function(t,r,e){t>>>=0,r>>>=0,e||L(t,r,this.length);for(var n=this[t],o=1,i=0;++i<r&&(o*=256);)n+=this[t+i]*o;return n},o.prototype.readUIntBE=function(t,r,e){t>>>=0,r>>>=0,e||L(t,r,this.length);for(var n=this[t+--r],o=1;r>0&&(o*=256);)n+=this[t+--r]*o;return n},o.prototype.readUInt8=function(t,r){return t>>>=0,r||L(t,1,this.length),this[t]},o.prototype.readUInt16LE=function(t,r){return t>>>=0,r||L(t,2,this.length),this[t]|this[t+1]<<8},o.prototype.readUInt16BE=function(t,r){return t>>>=0,r||L(t,2,this.length),this[t]<<8|this[t+1]},o.prototype.readUInt32LE=function(t,r){return t>>>=0,r||L(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},o.prototype.readUInt32BE=function(t,r){return t>>>=0,r||L(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},o.prototype.readIntLE=function(t,r,e){t>>>=0,r>>>=0,e||L(t,r,this.length);for(var n=this[t],o=1,i=0;++i<r&&(o*=256);)n+=this[t+i]*o;return o*=128,n>=o&&(n-=Math.pow(2,8*r)),n},o.prototype.readIntBE=function(t,r,e){t>>>=0,r>>>=0,e||L(t,r,this.length);for(var n=r,o=1,i=this[t+--n];n>0&&(o*=256);)i+=this[t+--n]*o;return o*=128,i>=o&&(i-=Math.pow(2,8*r)),i},o.prototype.readInt8=function(t,r){return t>>>=0,r||L(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},o.prototype.readInt16LE=function(t,r){t>>>=0,r||L(t,2,this.length);var e=this[t]|this[t+1]<<8;return 32768&e?4294901760|e:e},o.prototype.readInt16BE=function(t,r){t>>>=0,r||L(t,2,this.length);var e=this[t+1]|this[t]<<8;return 32768&e?4294901760|e:e},o.prototype.readInt32LE=function(t,r){return t>>>=0,r||L(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},o.prototype.readInt32BE=function(t,r){return t>>>=0,r||L(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},o.prototype.readFloatLE=function(t,r){return t>>>=0,r||L(t,4,this.length),V.read(this,t,!0,23,4)},o.prototype.readFloatBE=function(t,r){return t>>>=0,r||L(t,4,this.length),V.read(this,t,!1,23,4)},o.prototype.readDoubleLE=function(t,r){return t>>>=0,r||L(t,8,this.length),V.read(this,t,!0,52,8)},o.prototype.readDoubleBE=function(t,r){return t>>>=0,r||L(t,8,this.length),V.read(this,t,!1,52,8)},o.prototype.writeUIntLE=function(t,r,e,n){if(t=+t,r>>>=0,e>>>=0,!n){x(this,t,r,e,Math.pow(2,8*e)-1,0)}var o=1,i=0;for(this[r]=255&t;++i<e&&(o*=256);)this[r+i]=t/o&255;return r+e},o.prototype.writeUIntBE=function(t,r,e,n){if(t=+t,r>>>=0,e>>>=0,!n){x(this,t,r,e,Math.pow(2,8*e)-1,0)}var o=e-1,i=1;for(this[r+o]=255&t;--o>=0&&(i*=256);)this[r+o]=t/i&255;return r+e},o.prototype.writeUInt8=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,1,255,0),this[r]=255&t,r+1},o.prototype.writeUInt16LE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,2,65535,0),this[r]=255&t,this[r+1]=t>>>8,r+2},o.prototype.writeUInt16BE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,2,65535,0),this[r]=t>>>8,this[r+1]=255&t,r+2},o.prototype.writeUInt32LE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,4,4294967295,0),this[r+3]=t>>>24,this[r+2]=t>>>16,this[r+1]=t>>>8,this[r]=255&t,r+4},o.prototype.writeUInt32BE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,4,4294967295,0),this[r]=t>>>24,this[r+1]=t>>>16,this[r+2]=t>>>8,this[r+3]=255&t,r+4},o.prototype.writeIntLE=function(t,r,e,n){if(t=+t,r>>>=0,!n){var o=Math.pow(2,8*e-1);x(this,t,r,e,o-1,-o)}var i=0,u=1,a=0;for(this[r]=255&t;++i<e&&(u*=256);)t<0&&0===a&&0!==this[r+i-1]&&(a=1),this[r+i]=(t/u>>0)-a&255;return r+e},o.prototype.writeIntBE=function(t,r,e,n){if(t=+t,r>>>=0,!n){var o=Math.pow(2,8*e-1);x(this,t,r,e,o-1,-o)}var i=e-1,u=1,a=0;for(this[r+i]=255&t;--i>=0&&(u*=256);)t<0&&0===a&&0!==this[r+i+1]&&(a=1),this[r+i]=(t/u>>0)-a&255;return r+e},o.prototype.writeInt8=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,1,127,-128),t<0&&(t=255+t+1),this[r]=255&t,r+1},o.prototype.writeInt16LE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,2,32767,-32768),this[r]=255&t,this[r+1]=t>>>8,r+2},o.prototype.writeInt16BE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,2,32767,-32768),this[r]=t>>>8,this[r+1]=255&t,r+2},o.prototype.writeInt32LE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,4,2147483647,-2147483648),this[r]=255&t,this[r+1]=t>>>8,this[r+2]=t>>>16,this[r+3]=t>>>24,r+4},o.prototype.writeInt32BE=function(t,r,e){return t=+t,r>>>=0,e||x(this,t,r,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),this[r]=t>>>24,this[r+1]=t>>>16,this[r+2]=t>>>8,this[r+3]=255&t,r+4},o.prototype.writeFloatLE=function(t,r,e){return k(this,t,r,!0,e)},o.prototype.writeFloatBE=function(t,r,e){return k(this,t,r,!1,e)},o.prototype.writeDoubleLE=function(t,r,e){return O(this,t,r,!0,e)},o.prototype.writeDoubleBE=function(t,r,e){return O(this,t,r,!1,e)},o.prototype.copy=function(t,r,e,n){if(!o.isBuffer(t))throw new TypeError("argument should be a Buffer");if(e||(e=0),n||0===n||(n=this.length),r>=t.length&&(r=t.length),r||(r=0),n>0&&n<e&&(n=e),n===e)return 0;if(0===t.length||0===this.length)return 0;if(r<0)throw new RangeError("targetStart out of bounds");if(e<0||e>=this.length)throw new RangeError("Index out of range");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-r<n-e&&(n=t.length-r+e);var i=n-e;if(this===t&&"function"==typeof Uint8Array.prototype.copyWithin)this.copyWithin(r,e,n);else if(this===t&&e<r&&r<n)for(var u=i-1;u>=0;--u)t[u+r]=this[u+e];else Uint8Array.prototype.set.call(t,this.subarray(e,n),r);return i},o.prototype.fill=function(t,r,e,n){if("string"==typeof t){if("string"==typeof r?(n=r,r=0,e=this.length):"string"==typeof e&&(n=e,e=this.length),void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!o.isEncoding(n))throw new TypeError("Unknown encoding: "+n);if(1===t.length){var i=t.charCodeAt(0);("utf8"===n&&i<128||"latin1"===n)&&(t=i)}}else"number"==typeof t?t&=255:"boolean"==typeof t&&(t=Number(t));if(r<0||this.length<r||this.length<e)throw new RangeError("Out of range index");if(e<=r)return this;r>>>=0,e=void 0===e?this.length:e>>>0,t||(t=0);var u;if("number"==typeof t)for(u=r;u<e;++u)this[u]=t;else{var a=o.isBuffer(t)?t:o.from(t,n),f=a.length;if(0===f)throw new TypeError('The value "'+t+'" is invalid for argument "value"');for(u=0;u<e-r;++u)this[u+r]=a[u%f]}return this};var Z=/[^+\/0-9A-Za-z-_]/g,W=function(){for(var t=new Array(256),r=0;r<16;++r)for(var e=16*r,n=0;n<16;++n)t[e+n]="0123456789abcdef"[r]+"0123456789abcdef"[n];return t}()},{"base64-js":29,ieee754:32}],31:[function(t,r,e){"use strict";var n={single_source_shortest_paths:function(t,r,e){var o={},i={};i[r]=0;var u=n.PriorityQueue.make();u.push(r,0);for(var a,f,s,h,c,l,g,p;!u.empty();){a=u.pop(),f=a.value,h=a.cost,c=t[f]||{};for(s in c)c.hasOwnProperty(s)&&(l=c[s],g=h+l,p=i[s],(void 0===i[s]||p>g)&&(i[s]=g,u.push(s,g),o[s]=f))}if(void 0!==e&&void 0===i[e]){var d=["Could not find a path from ",r," to ",e,"."].join("");throw new Error(d)}return o},extract_shortest_path_from_predecessor_list:function(t,r){for(var e=[],n=r;n;)e.push(n),t[n],n=t[n];return e.reverse(),e},find_path:function(t,r,e){var o=n.single_source_shortest_paths(t,r,e);return n.extract_shortest_path_from_predecessor_list(o,e)},PriorityQueue:{make:function(t){var r,e=n.PriorityQueue,o={};t=t||{};for(r in e)e.hasOwnProperty(r)&&(o[r]=e[r]);return o.queue=[],o.sorter=t.sorter||e.default_sorter,o},default_sorter:function(t,r){return t.cost-r.cost},push:function(t,r){var e={value:t,cost:r};this.queue.push(e),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return 0===this.queue.length}}};void 0!==r&&(r.exports=n)},{}],32:[function(t,r,e){e.read=function(t,r,e,n,o){var i,u,a=8*o-n-1,f=(1<<a)-1,s=f>>1,h=-7,c=e?o-1:0,l=e?-1:1,g=t[r+c];for(c+=l,i=g&(1<<-h)-1,g>>=-h,h+=a;h>0;i=256*i+t[r+c],c+=l,h-=8);for(u=i&(1<<-h)-1,i>>=-h,h+=n;h>0;u=256*u+t[r+c],c+=l,h-=8);if(0===i)i=1-s;else{if(i===f)return u?NaN:1/0*(g?-1:1);u+=Math.pow(2,n),i-=s}return(g?-1:1)*u*Math.pow(2,i-n)},e.write=function(t,r,e,n,o,i){var u,a,f,s=8*i-o-1,h=(1<<s)-1,c=h>>1,l=23===o?Math.pow(2,-24)-Math.pow(2,-77):0,g=n?0:i-1,p=n?1:-1,d=r<0||0===r&&1/r<0?1:0;for(r=Math.abs(r),isNaN(r)||r===1/0?(a=isNaN(r)?1:0,u=h):(u=Math.floor(Math.log(r)/Math.LN2),r*(f=Math.pow(2,-u))<1&&(u--,f*=2),r+=u+c>=1?l/f:l*Math.pow(2,1-c),r*f>=2&&(u++,f/=2),u+c>=h?(a=0,u=h):u+c>=1?(a=(r*f-1)*Math.pow(2,o),u+=c):(a=r*Math.pow(2,c-1)*Math.pow(2,o),u=0));o>=8;t[e+g]=255&a,g+=p,a/=256,o-=8);for(u=u<<o|a,s+=o;s>0;t[e+g]=255&u,g+=p,u/=256,s-=8);t[e+g-p]|=128*d}},{}],33:[function(t,r,e){var n={}.toString;r.exports=Array.isArray||function(t){return"[object Array]"==n.call(t)}},{}]},{},[24])(24)});
//# sourceMappingURL=qrcode.min.js.map

/**
 * @fileoverview
 * - Using the 'QRCode for Javascript library'
 * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
 * - this library has no dependencies.
 * 
 * @author davidshimjs
 * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
 * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
 */
var QRCode;

(function () {
	//---------------------------------------------------------------------
	// QRCode for JavaScript
	//
	// Copyright (c) 2009 Kazuhiko Arase
	//
	// URL: http://www.d-project.com/
	//
	// Licensed under the MIT license:
	//   http://www.opensource.org/licenses/mit-license.php
	//
	// The word "QR Code" is registered trademark of 
	// DENSO WAVE INCORPORATED
	//   http://www.denso-wave.com/qrcode/faqpatent-e.html
	//
	//---------------------------------------------------------------------
	function QR8bitByte(data) {
		this.mode = QRMode.MODE_8BIT_BYTE;
		this.data = data;
		this.parsedData = [];

		// Added to support UTF-8 Characters
		for (var i = 0, l = this.data.length; i < l; i++) {
			var byteArray = [];
			var code = this.data.charCodeAt(i);

			if (code > 0x10000) {
				byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
				byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
				byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
				byteArray[3] = 0x80 | (code & 0x3F);
			} else if (code > 0x800) {
				byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
				byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
				byteArray[2] = 0x80 | (code & 0x3F);
			} else if (code > 0x80) {
				byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
				byteArray[1] = 0x80 | (code & 0x3F);
			} else {
				byteArray[0] = code;
			}

			this.parsedData.push(byteArray);
		}

		this.parsedData = Array.prototype.concat.apply([], this.parsedData);

		if (this.parsedData.length != this.data.length) {
			this.parsedData.unshift(191);
			this.parsedData.unshift(187);
			this.parsedData.unshift(239);
		}
	}

	QR8bitByte.prototype = {
		getLength: function (buffer) {
			return this.parsedData.length;
		},
		write: function (buffer) {
			for (var i = 0, l = this.parsedData.length; i < l; i++) {
				buffer.put(this.parsedData[i], 8);
			}
		}
	};

	function QRCodeModel(typeNumber, errorCorrectLevel) {
		this.typeNumber = typeNumber;
		this.errorCorrectLevel = errorCorrectLevel;
		this.modules = null;
		this.moduleCount = 0;
		this.dataCache = null;
		this.dataList = [];
	}

	QRCodeModel.prototype={addData:function(data){var newData=new QR8bitByte(data);this.dataList.push(newData);this.dataCache=null;},isDark:function(row,col){if(row<0||this.moduleCount<=row||col<0||this.moduleCount<=col){throw new Error(row+","+col);}
	return this.modules[row][col];},getModuleCount:function(){return this.moduleCount;},make:function(){this.makeImpl(false,this.getBestMaskPattern());},makeImpl:function(test,maskPattern){this.moduleCount=this.typeNumber*4+17;this.modules=new Array(this.moduleCount);for(var row=0;row<this.moduleCount;row++){this.modules[row]=new Array(this.moduleCount);for(var col=0;col<this.moduleCount;col++){this.modules[row][col]=null;}}
	this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(test,maskPattern);if(this.typeNumber>=7){this.setupTypeNumber(test);}
	if(this.dataCache==null){this.dataCache=QRCodeModel.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);}
	this.mapData(this.dataCache,maskPattern);},setupPositionProbePattern:function(row,col){for(var r=-1;r<=7;r++){if(row+r<=-1||this.moduleCount<=row+r)continue;for(var c=-1;c<=7;c++){if(col+c<=-1||this.moduleCount<=col+c)continue;if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4)){this.modules[row+r][col+c]=true;}else{this.modules[row+r][col+c]=false;}}}},getBestMaskPattern:function(){var minLostPoint=0;var pattern=0;for(var i=0;i<8;i++){this.makeImpl(true,i);var lostPoint=QRUtil.getLostPoint(this);if(i==0||minLostPoint>lostPoint){minLostPoint=lostPoint;pattern=i;}}
	return pattern;},createMovieClip:function(target_mc,instance_name,depth){var qr_mc=target_mc.createEmptyMovieClip(instance_name,depth);var cs=1;this.make();for(var row=0;row<this.modules.length;row++){var y=row*cs;for(var col=0;col<this.modules[row].length;col++){var x=col*cs;var dark=this.modules[row][col];if(dark){qr_mc.beginFill(0,100);qr_mc.moveTo(x,y);qr_mc.lineTo(x+cs,y);qr_mc.lineTo(x+cs,y+cs);qr_mc.lineTo(x,y+cs);qr_mc.endFill();}}}
	return qr_mc;},setupTimingPattern:function(){for(var r=8;r<this.moduleCount-8;r++){if(this.modules[r][6]!=null){continue;}
	this.modules[r][6]=(r%2==0);}
	for(var c=8;c<this.moduleCount-8;c++){if(this.modules[6][c]!=null){continue;}
	this.modules[6][c]=(c%2==0);}},setupPositionAdjustPattern:function(){var pos=QRUtil.getPatternPosition(this.typeNumber);for(var i=0;i<pos.length;i++){for(var j=0;j<pos.length;j++){var row=pos[i];var col=pos[j];if(this.modules[row][col]!=null){continue;}
	for(var r=-2;r<=2;r++){for(var c=-2;c<=2;c++){if(r==-2||r==2||c==-2||c==2||(r==0&&c==0)){this.modules[row+r][col+c]=true;}else{this.modules[row+r][col+c]=false;}}}}}},setupTypeNumber:function(test){var bits=QRUtil.getBCHTypeNumber(this.typeNumber);for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3]=mod;}
	for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)]=mod;}},setupTypeInfo:function(test,maskPattern){var data=(this.errorCorrectLevel<<3)|maskPattern;var bits=QRUtil.getBCHTypeInfo(data);for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<6){this.modules[i][8]=mod;}else if(i<8){this.modules[i+1][8]=mod;}else{this.modules[this.moduleCount-15+i][8]=mod;}}
	for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<8){this.modules[8][this.moduleCount-i-1]=mod;}else if(i<9){this.modules[8][15-i-1+1]=mod;}else{this.modules[8][15-i-1]=mod;}}
	this.modules[this.moduleCount-8][8]=(!test);},mapData:function(data,maskPattern){var inc=-1;var row=this.moduleCount-1;var bitIndex=7;var byteIndex=0;for(var col=this.moduleCount-1;col>0;col-=2){if(col==6)col--;while(true){for(var c=0;c<2;c++){if(this.modules[row][col-c]==null){var dark=false;if(byteIndex<data.length){dark=(((data[byteIndex]>>>bitIndex)&1)==1);}
	var mask=QRUtil.getMask(maskPattern,row,col-c);if(mask){dark=!dark;}
	this.modules[row][col-c]=dark;bitIndex--;if(bitIndex==-1){byteIndex++;bitIndex=7;}}}
	row+=inc;if(row<0||this.moduleCount<=row){row-=inc;inc=-inc;break;}}}}};QRCodeModel.PAD0=0xEC;QRCodeModel.PAD1=0x11;QRCodeModel.createData=function(typeNumber,errorCorrectLevel,dataList){var rsBlocks=QRRSBlock.getRSBlocks(typeNumber,errorCorrectLevel);var buffer=new QRBitBuffer();for(var i=0;i<dataList.length;i++){var data=dataList[i];buffer.put(data.mode,4);buffer.put(data.getLength(),QRUtil.getLengthInBits(data.mode,typeNumber));data.write(buffer);}
	var totalDataCount=0;for(var i=0;i<rsBlocks.length;i++){totalDataCount+=rsBlocks[i].dataCount;}
	if(buffer.getLengthInBits()>totalDataCount*8){throw new Error("code length overflow. ("
	+buffer.getLengthInBits()
	+">"
	+totalDataCount*8
	+")");}
	if(buffer.getLengthInBits()+4<=totalDataCount*8){buffer.put(0,4);}
	while(buffer.getLengthInBits()%8!=0){buffer.putBit(false);}
	while(true){if(buffer.getLengthInBits()>=totalDataCount*8){break;}
	buffer.put(QRCodeModel.PAD0,8);if(buffer.getLengthInBits()>=totalDataCount*8){break;}
	buffer.put(QRCodeModel.PAD1,8);}
	return QRCodeModel.createBytes(buffer,rsBlocks);};QRCodeModel.createBytes=function(buffer,rsBlocks){var offset=0;var maxDcCount=0;var maxEcCount=0;var dcdata=new Array(rsBlocks.length);var ecdata=new Array(rsBlocks.length);for(var r=0;r<rsBlocks.length;r++){var dcCount=rsBlocks[r].dataCount;var ecCount=rsBlocks[r].totalCount-dcCount;maxDcCount=Math.max(maxDcCount,dcCount);maxEcCount=Math.max(maxEcCount,ecCount);dcdata[r]=new Array(dcCount);for(var i=0;i<dcdata[r].length;i++){dcdata[r][i]=0xff&buffer.buffer[i+offset];}
	offset+=dcCount;var rsPoly=QRUtil.getErrorCorrectPolynomial(ecCount);var rawPoly=new QRPolynomial(dcdata[r],rsPoly.getLength()-1);var modPoly=rawPoly.mod(rsPoly);ecdata[r]=new Array(rsPoly.getLength()-1);for(var i=0;i<ecdata[r].length;i++){var modIndex=i+modPoly.getLength()-ecdata[r].length;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0;}}
	var totalCodeCount=0;for(var i=0;i<rsBlocks.length;i++){totalCodeCount+=rsBlocks[i].totalCount;}
	var data=new Array(totalCodeCount);var index=0;for(var i=0;i<maxDcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<dcdata[r].length){data[index++]=dcdata[r][i];}}}
	for(var i=0;i<maxEcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<ecdata[r].length){data[index++]=ecdata[r][i];}}}
	return data;};var QRMode={MODE_NUMBER:1<<0,MODE_ALPHA_NUM:1<<1,MODE_8BIT_BYTE:1<<2,MODE_KANJI:1<<3};var QRErrorCorrectLevel={L:1,M:0,Q:3,H:2};var QRMaskPattern={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var QRUtil={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0),G18:(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0),G15_MASK:(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1),getBCHTypeInfo:function(data){var d=data<<10;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)>=0){d^=(QRUtil.G15<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)));}
	return((data<<10)|d)^QRUtil.G15_MASK;},getBCHTypeNumber:function(data){var d=data<<12;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)>=0){d^=(QRUtil.G18<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)));}
	return(data<<12)|d;},getBCHDigit:function(data){var digit=0;while(data!=0){digit++;data>>>=1;}
	return digit;},getPatternPosition:function(typeNumber){return QRUtil.PATTERN_POSITION_TABLE[typeNumber-1];},getMask:function(maskPattern,i,j){switch(maskPattern){case QRMaskPattern.PATTERN000:return(i+j)%2==0;case QRMaskPattern.PATTERN001:return i%2==0;case QRMaskPattern.PATTERN010:return j%3==0;case QRMaskPattern.PATTERN011:return(i+j)%3==0;case QRMaskPattern.PATTERN100:return(Math.floor(i/2)+Math.floor(j/3))%2==0;case QRMaskPattern.PATTERN101:return(i*j)%2+(i*j)%3==0;case QRMaskPattern.PATTERN110:return((i*j)%2+(i*j)%3)%2==0;case QRMaskPattern.PATTERN111:return((i*j)%3+(i+j)%2)%2==0;default:throw new Error("bad maskPattern:"+maskPattern);}},getErrorCorrectPolynomial:function(errorCorrectLength){var a=new QRPolynomial([1],0);for(var i=0;i<errorCorrectLength;i++){a=a.multiply(new QRPolynomial([1,QRMath.gexp(i)],0));}
	return a;},getLengthInBits:function(mode,type){if(1<=type&&type<10){switch(mode){case QRMode.MODE_NUMBER:return 10;case QRMode.MODE_ALPHA_NUM:return 9;case QRMode.MODE_8BIT_BYTE:return 8;case QRMode.MODE_KANJI:return 8;default:throw new Error("mode:"+mode);}}else if(type<27){switch(mode){case QRMode.MODE_NUMBER:return 12;case QRMode.MODE_ALPHA_NUM:return 11;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 10;default:throw new Error("mode:"+mode);}}else if(type<41){switch(mode){case QRMode.MODE_NUMBER:return 14;case QRMode.MODE_ALPHA_NUM:return 13;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 12;default:throw new Error("mode:"+mode);}}else{throw new Error("type:"+type);}},getLostPoint:function(qrCode){var moduleCount=qrCode.getModuleCount();var lostPoint=0;for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount;col++){var sameCount=0;var dark=qrCode.isDark(row,col);for(var r=-1;r<=1;r++){if(row+r<0||moduleCount<=row+r){continue;}
	for(var c=-1;c<=1;c++){if(col+c<0||moduleCount<=col+c){continue;}
	if(r==0&&c==0){continue;}
	if(dark==qrCode.isDark(row+r,col+c)){sameCount++;}}}
	if(sameCount>5){lostPoint+=(3+sameCount-5);}}}
	for(var row=0;row<moduleCount-1;row++){for(var col=0;col<moduleCount-1;col++){var count=0;if(qrCode.isDark(row,col))count++;if(qrCode.isDark(row+1,col))count++;if(qrCode.isDark(row,col+1))count++;if(qrCode.isDark(row+1,col+1))count++;if(count==0||count==4){lostPoint+=3;}}}
	for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount-6;col++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row,col+1)&&qrCode.isDark(row,col+2)&&qrCode.isDark(row,col+3)&&qrCode.isDark(row,col+4)&&!qrCode.isDark(row,col+5)&&qrCode.isDark(row,col+6)){lostPoint+=40;}}}
	for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount-6;row++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row+1,col)&&qrCode.isDark(row+2,col)&&qrCode.isDark(row+3,col)&&qrCode.isDark(row+4,col)&&!qrCode.isDark(row+5,col)&&qrCode.isDark(row+6,col)){lostPoint+=40;}}}
	var darkCount=0;for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount;row++){if(qrCode.isDark(row,col)){darkCount++;}}}
	var ratio=Math.abs(100*darkCount/moduleCount/moduleCount-50)/5;lostPoint+=ratio*10;return lostPoint;}};var QRMath={glog:function(n){if(n<1){throw new Error("glog("+n+")");}
	return QRMath.LOG_TABLE[n];},gexp:function(n){while(n<0){n+=255;}
	while(n>=256){n-=255;}
	return QRMath.EXP_TABLE[n];},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};for(var i=0;i<8;i++){QRMath.EXP_TABLE[i]=1<<i;}
	for(var i=8;i<256;i++){QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];}
	for(var i=0;i<255;i++){QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;}
	function QRPolynomial(num,shift){if(num.length==undefined){throw new Error(num.length+"/"+shift);}
	var offset=0;while(offset<num.length&&num[offset]==0){offset++;}
	this.num=new Array(num.length-offset+shift);for(var i=0;i<num.length-offset;i++){this.num[i]=num[i+offset];}}
	QRPolynomial.prototype={get:function(index){return this.num[index];},getLength:function(){return this.num.length;},multiply:function(e){var num=new Array(this.getLength()+e.getLength()-1);for(var i=0;i<this.getLength();i++){for(var j=0;j<e.getLength();j++){num[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)));}}
	return new QRPolynomial(num,0);},mod:function(e){if(this.getLength()-e.getLength()<0){return this;}
	var ratio=QRMath.glog(this.get(0))-QRMath.glog(e.get(0));var num=new Array(this.getLength());for(var i=0;i<this.getLength();i++){num[i]=this.get(i);}
	for(var i=0;i<e.getLength();i++){num[i]^=QRMath.gexp(QRMath.glog(e.get(i))+ratio);}
	return new QRPolynomial(num,0).mod(e);}};function QRRSBlock(totalCount,dataCount){this.totalCount=totalCount;this.dataCount=dataCount;}
	QRRSBlock.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];QRRSBlock.getRSBlocks=function(typeNumber,errorCorrectLevel){var rsBlock=QRRSBlock.getRsBlockTable(typeNumber,errorCorrectLevel);if(rsBlock==undefined){throw new Error("bad rs block @ typeNumber:"+typeNumber+"/errorCorrectLevel:"+errorCorrectLevel);}
	var length=rsBlock.length/3;var list=[];for(var i=0;i<length;i++){var count=rsBlock[i*3+0];var totalCount=rsBlock[i*3+1];var dataCount=rsBlock[i*3+2];for(var j=0;j<count;j++){list.push(new QRRSBlock(totalCount,dataCount));}}
	return list;};QRRSBlock.getRsBlockTable=function(typeNumber,errorCorrectLevel){switch(errorCorrectLevel){case QRErrorCorrectLevel.L:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+0];case QRErrorCorrectLevel.M:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+1];case QRErrorCorrectLevel.Q:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+2];case QRErrorCorrectLevel.H:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+3];default:return undefined;}};function QRBitBuffer(){this.buffer=[];this.length=0;}
	QRBitBuffer.prototype={get:function(index){var bufIndex=Math.floor(index/8);return((this.buffer[bufIndex]>>>(7-index%8))&1)==1;},put:function(num,length){for(var i=0;i<length;i++){this.putBit(((num>>>(length-i-1))&1)==1);}},getLengthInBits:function(){return this.length;},putBit:function(bit){var bufIndex=Math.floor(this.length/8);if(this.buffer.length<=bufIndex){this.buffer.push(0);}
	if(bit){this.buffer[bufIndex]|=(0x80>>>(this.length%8));}
	this.length++;}};var QRCodeLimitLength=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]];
	
	function _isSupportCanvas() {
		return typeof CanvasRenderingContext2D != "undefined";
	}
	
	// android 2.x doesn't support Data-URI spec
	function _getAndroid() {
		var android = false;
		var sAgent = navigator.userAgent;
		
		if (/android/i.test(sAgent)) { // android
			android = true;
			var aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i);
			
			if (aMat && aMat[1]) {
				android = parseFloat(aMat[1]);
			}
		}
		
		return android;
	}
	
	var svgDrawer = (function() {

		var Drawing = function (el, htOption) {
			this._el = el;
			this._htOption = htOption;
		};

		Drawing.prototype.draw = function (oQRCode) {
			var _htOption = this._htOption;
			var _el = this._el;
			var nCount = oQRCode.getModuleCount();
			var nWidth = Math.floor(_htOption.width / nCount);
			var nHeight = Math.floor(_htOption.height / nCount);

			this.clear();

			function makeSVG(tag, attrs) {
				var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
				for (var k in attrs)
					if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
				return el;
			}

			var svg = makeSVG("svg" , {'viewBox': '0 0 ' + String(nCount) + " " + String(nCount), 'width': '100%', 'height': '100%', 'fill': _htOption.colorLight});
			svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
			_el.appendChild(svg);

			svg.appendChild(makeSVG("rect", {"fill": _htOption.colorLight, "width": "100%", "height": "100%"}));
			svg.appendChild(makeSVG("rect", {"fill": _htOption.colorDark, "width": "1", "height": "1", "id": "template"}));

			for (var row = 0; row < nCount; row++) {
				for (var col = 0; col < nCount; col++) {
					if (oQRCode.isDark(row, col)) {
						var child = makeSVG("use", {"x": String(col), "y": String(row)});
						child.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#template")
						svg.appendChild(child);
					}
				}
			}
		};
		Drawing.prototype.clear = function () {
			while (this._el.hasChildNodes())
				this._el.removeChild(this._el.lastChild);
		};
		return Drawing;
	})();

	var useSVG = document.documentElement.tagName.toLowerCase() === "svg";

	// Drawing in DOM by using Table tag
	var Drawing = useSVG ? svgDrawer : !_isSupportCanvas() ? (function () {
		var Drawing = function (el, htOption) {
			this._el = el;
			this._htOption = htOption;
		};
			
		/**
		 * Draw the QRCode
		 * 
		 * @param {QRCode} oQRCode
		 */
		Drawing.prototype.draw = function (oQRCode) {
            var _htOption = this._htOption;
            var _el = this._el;
			var nCount = oQRCode.getModuleCount();
			var nWidth = Math.floor(_htOption.width / nCount);
			var nHeight = Math.floor(_htOption.height / nCount);
			var aHTML = ['<table style="border:0;border-collapse:collapse;">'];
			
			for (var row = 0; row < nCount; row++) {
				aHTML.push('<tr>');
				
				for (var col = 0; col < nCount; col++) {
					aHTML.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + nWidth + 'px;height:' + nHeight + 'px;background-color:' + (oQRCode.isDark(row, col) ? _htOption.colorDark : _htOption.colorLight) + ';"></td>');
				}
				
				aHTML.push('</tr>');
			}
			
			aHTML.push('</table>');
			_el.innerHTML = aHTML.join('');
			
			// Fix the margin values as real size.
			var elTable = _el.childNodes[0];
			var nLeftMarginTable = (_htOption.width - elTable.offsetWidth) / 2;
			var nTopMarginTable = (_htOption.height - elTable.offsetHeight) / 2;
			
			if (nLeftMarginTable > 0 && nTopMarginTable > 0) {
				elTable.style.margin = nTopMarginTable + "px " + nLeftMarginTable + "px";	
			}
		};
		
		/**
		 * Clear the QRCode
		 */
		Drawing.prototype.clear = function () {
			this._el.innerHTML = '';
		};
		
		return Drawing;
	})() : (function () { // Drawing in Canvas
		function _onMakeImage() {
			this._elImage.src = this._elCanvas.toDataURL("image/png");
			this._elImage.style.display = "block";
			this._elCanvas.style.display = "none";			
		}
		
		// Android 2.1 bug workaround
		// http://code.google.com/p/android/issues/detail?id=5141
		if (this._android && this._android <= 2.1) {
	    	var factor = 1 / window.devicePixelRatio;
	        var drawImage = CanvasRenderingContext2D.prototype.drawImage; 
	    	CanvasRenderingContext2D.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
	    		if (("nodeName" in image) && /img/i.test(image.nodeName)) {
		        	for (var i = arguments.length - 1; i >= 1; i--) {
		            	arguments[i] = arguments[i] * factor;
		        	}
	    		} else if (typeof dw == "undefined") {
	    			arguments[1] *= factor;
	    			arguments[2] *= factor;
	    			arguments[3] *= factor;
	    			arguments[4] *= factor;
	    		}
	    		
	        	drawImage.apply(this, arguments); 
	    	};
		}
		
		/**
		 * Check whether the user's browser supports Data URI or not
		 * 
		 * @private
		 * @param {Function} fSuccess Occurs if it supports Data URI
		 * @param {Function} fFail Occurs if it doesn't support Data URI
		 */
		function _safeSetDataURI(fSuccess, fFail) {
            var self = this;
            self._fFail = fFail;
            self._fSuccess = fSuccess;

            // Check it just once
            if (self._bSupportDataURI === null) {
                var el = document.createElement("img");
                var fOnError = function() {
                    self._bSupportDataURI = false;

                    if (self._fFail) {
                        self._fFail.call(self);
                    }
                };
                var fOnSuccess = function() {
                    self._bSupportDataURI = true;

                    if (self._fSuccess) {
                        self._fSuccess.call(self);
                    }
                };

                el.onabort = fOnError;
                el.onerror = fOnError;
                el.onload = fOnSuccess;
                el.src = "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // the Image contains 1px data.
                return;
            } else if (self._bSupportDataURI === true && self._fSuccess) {
                self._fSuccess.call(self);
            } else if (self._bSupportDataURI === false && self._fFail) {
                self._fFail.call(self);
            }
		};
		
		/**
		 * Drawing QRCode by using canvas
		 * 
		 * @constructor
		 * @param {HTMLElement} el
		 * @param {Object} htOption QRCode Options 
		 */
		var Drawing = function (el, htOption) {
    		this._bIsPainted = false;
    		this._android = _getAndroid();
		
			this._htOption = htOption;
			this._elCanvas = document.createElement("canvas");
			this._elCanvas.width = htOption.width;
			this._elCanvas.height = htOption.height;
			el.appendChild(this._elCanvas);
			this._el = el;
			this._oContext = this._elCanvas.getContext("2d");
			this._bIsPainted = false;
			this._elImage = document.createElement("img");
			this._elImage.alt = "Scan me!";
			this._elImage.style.display = "none";
			this._el.appendChild(this._elImage);
			this._bSupportDataURI = null;
		};
			
		/**
		 * Draw the QRCode
		 * 
		 * @param {QRCode} oQRCode 
		 */
		Drawing.prototype.draw = function (oQRCode) {
            var _elImage = this._elImage;
            var _oContext = this._oContext;
            var _htOption = this._htOption;
            
			var nCount = oQRCode.getModuleCount();
			var nWidth = _htOption.width / nCount;
			var nHeight = _htOption.height / nCount;
			var nRoundedWidth = Math.round(nWidth);
			var nRoundedHeight = Math.round(nHeight);

			_elImage.style.display = "none";
			this.clear();
			
			for (var row = 0; row < nCount; row++) {
				for (var col = 0; col < nCount; col++) {
					var bIsDark = oQRCode.isDark(row, col);
					var nLeft = col * nWidth;
					var nTop = row * nHeight;
					_oContext.strokeStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
					_oContext.lineWidth = 1;
					_oContext.fillStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;					
					_oContext.fillRect(nLeft, nTop, nWidth, nHeight);
					
					// 안티 앨리어싱 방지 처리
					_oContext.strokeRect(
						Math.floor(nLeft) + 0.5,
						Math.floor(nTop) + 0.5,
						nRoundedWidth,
						nRoundedHeight
					);
					
					_oContext.strokeRect(
						Math.ceil(nLeft) - 0.5,
						Math.ceil(nTop) - 0.5,
						nRoundedWidth,
						nRoundedHeight
					);
				}
			}
			
			this._bIsPainted = true;
		};
			
		/**
		 * Make the image from Canvas if the browser supports Data URI.
		 */
		Drawing.prototype.makeImage = function () {
			if (this._bIsPainted) {
				_safeSetDataURI.call(this, _onMakeImage);
			}
		};
			
		/**
		 * Return whether the QRCode is painted or not
		 * 
		 * @return {Boolean}
		 */
		Drawing.prototype.isPainted = function () {
			return this._bIsPainted;
		};
		
		/**
		 * Clear the QRCode
		 */
		Drawing.prototype.clear = function () {
			this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height);
			this._bIsPainted = false;
		};
		
		/**
		 * @private
		 * @param {Number} nNumber
		 */
		Drawing.prototype.round = function (nNumber) {
			if (!nNumber) {
				return nNumber;
			}
			
			return Math.floor(nNumber * 1000) / 1000;
		};
		
		return Drawing;
	})();
	
	/**
	 * Get the type by string length
	 * 
	 * @private
	 * @param {String} sText
	 * @param {Number} nCorrectLevel
	 * @return {Number} type
	 */
	function _getTypeNumber(sText, nCorrectLevel) {			
		var nType = 1;
		var length = _getUTF8Length(sText);
		
		for (var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
			var nLimit = 0;
			
			switch (nCorrectLevel) {
				case QRErrorCorrectLevel.L :
					nLimit = QRCodeLimitLength[i][0];
					break;
				case QRErrorCorrectLevel.M :
					nLimit = QRCodeLimitLength[i][1];
					break;
				case QRErrorCorrectLevel.Q :
					nLimit = QRCodeLimitLength[i][2];
					break;
				case QRErrorCorrectLevel.H :
					nLimit = QRCodeLimitLength[i][3];
					break;
			}
			
			if (length <= nLimit) {
				break;
			} else {
				nType++;
			}
		}
		
		if (nType > QRCodeLimitLength.length) {
			throw new Error("Too long data");
		}
		
		return nType;
	}

	function _getUTF8Length(sText) {
		var replacedText = encodeURI(sText).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
		return replacedText.length + (replacedText.length != sText ? 3 : 0);
	}
	
	/**
	 * @class QRCode
	 * @constructor
	 * @example 
	 * new QRCode(document.getElementById("test"), "http://jindo.dev.naver.com/collie");
	 *
	 * @example
	 * var oQRCode = new QRCode("test", {
	 *    text : "http://naver.com",
	 *    width : 128,
	 *    height : 128
	 * });
	 * 
	 * oQRCode.clear(); // Clear the QRCode.
	 * oQRCode.makeCode("http://map.naver.com"); // Re-create the QRCode.
	 *
	 * @param {HTMLElement|String} el target element or 'id' attribute of element.
	 * @param {Object|String} vOption
	 * @param {String} vOption.text QRCode link data
	 * @param {Number} [vOption.width=256]
	 * @param {Number} [vOption.height=256]
	 * @param {String} [vOption.colorDark="#000000"]
	 * @param {String} [vOption.colorLight="#ffffff"]
	 * @param {QRCode.CorrectLevel} [vOption.correctLevel=QRCode.CorrectLevel.H] [L|M|Q|H] 
	 */
	QRCode = function (el, vOption) {
		this._htOption = {
			width : 256, 
			height : 256,
			typeNumber : 4,
			colorDark : "#000000",
			colorLight : "#ffffff",
			correctLevel : QRErrorCorrectLevel.H
		};
		
		if (typeof vOption === 'string') {
			vOption	= {
				text : vOption
			};
		}
		
		// Overwrites options
		if (vOption) {
			for (var i in vOption) {
				this._htOption[i] = vOption[i];
			}
		}
		
		if (typeof el == "string") {
			el = document.getElementById(el);
		}

		if (this._htOption.useSVG) {
			Drawing = svgDrawer;
		}
		
		this._android = _getAndroid();
		this._el = el;
		this._oQRCode = null;
		this._oDrawing = new Drawing(this._el, this._htOption);
		
		if (this._htOption.text) {
			this.makeCode(this._htOption.text);	
		}
	};
	
	/**
	 * Make the QRCode
	 * 
	 * @param {String} sText link data
	 */
	QRCode.prototype.makeCode = function (sText) {
		this._oQRCode = new QRCodeModel(_getTypeNumber(sText, this._htOption.correctLevel), this._htOption.correctLevel);
		this._oQRCode.addData(sText);
		this._oQRCode.make();
		this._el.title = sText;
		this._oDrawing.draw(this._oQRCode);			
		this.makeImage();
	};
	
	/**
	 * Make the Image from Canvas element
	 * - It occurs automatically
	 * - Android below 3 doesn't support Data-URI spec.
	 * 
	 * @private
	 */
	QRCode.prototype.makeImage = function () {
		if (typeof this._oDrawing.makeImage == "function" && (!this._android || this._android >= 3)) {
			this._oDrawing.makeImage();
		}
	};
	
	/**
	 * Clear the QRCode
	 */
	QRCode.prototype.clear = function () {
		this._oDrawing.clear();
	};
	
	/**
	 * @name QRCode.CorrectLevel
	 */
	QRCode.CorrectLevel = QRErrorCorrectLevel;
})();