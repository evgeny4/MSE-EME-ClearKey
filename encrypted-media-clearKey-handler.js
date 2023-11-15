function Base64ToHex(str)
{
    let bin = window.atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    let res = "";
    for (let i = 0; i < bin.length; i++) {
        res += ("0" + bin.charCodeAt(i).toString(16)).substr(-2);
    }
    return res;
}

function HexToBase64(hex)
{
    let bin = "";
    for (let i = 0; i < hex.length; i += 2) {
        bin += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return window.btoa(bin).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function stringToArray(s)
{
    let array = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
        array[i] = s.charCodeAt(i);
    }
    return array;
}

function EncryptedMediaHandler(video, videoConf, audioConf)
{
    if (!navigator.requestMediaKeySystemAccess) {
        console.log("EME API is not supported");
        return;
    } else {
        console.log("EME API is supported");
    }

    this.video = video;
    this.keys = videoConf.keys;
    this.audioConf = null;
    if (audioConf) {
        for (var attrname in audioConf.keys) {
            this.keys[attrname] =  audioConf.keys[attrname];
        }
        this.audioConf = audioConf;
    }
    this.videoConf = videoConf;
    this.sessions = [];
    this.setMediaKeyPromise;
    this.video.addEventListener("encrypted", this.onEncrypted.bind(this));
    return this;
};

function buf2hex(buffer) { // buffer is an ArrayBuffer
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
  }

var DecodeHexStringToByteArray = function (hexString) {
    var result = [];
    while (hexString.length >= 2) { 
        result.push(parseInt(hexString.substring(0, 2), 16));
        hexString = hexString.substring(2, hexString.length);
    }
    return result;
 }

EncryptedMediaHandler.prototype = {

    installKeys : function(video) 
    {
        let self = this;        
        // let arrKey = new Uint8Array([0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xdb, 0xdc, 0xdd, 0xde, 0xdf]);
        
        const uint8ArrayToBase64 = (u8arr) => btoa(String.fromCharCode.apply(null, u8arr))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=*$/, '');

        // let initDataType = 'webm';
        // let initData = arrKey;

        let pssh = new Uint8Array([
            0x00, 0x00, 0x00, 0x34, 0x70, 0x73, 0x73, 0x68, // BMFF box header ('pssh')
            0x01, 0x00, 0x00, 0x00,                         // Full box header (version = 1, flags = 0)
            0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, // SystemID
            0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2, 0xfb, 0x4b,
            0x00, 0x00, 0x00, 0x01,                         // KID_count (2)
            0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, // First KID 
            0xd8, 0xd9, 0xda, 0xdb, 0xdc, 0xdd, 0xde, 0xdf,            
            0x00, 0x00, 0x00, 0x00                          // Size of Data (0)
        ]);


        
        let initData = pssh;
        let initDataType = 'cenc'; // event.initData;

        // let initData = 'keyids'; // event.initData;
        // let initDataType = new TextEncoder().encode('{"kids":["0NHS09TV1tfY2drb3N3e3w"]}');

        if (!this.setMediaKeyPromise) {
            let options = [
                {    initDataTypes: ['cenc'],
                     videoCapabilities: [{contentType : self.videoConf.mimeType}] }
            ];

            if (self.audioConf) {
                options.audioCapabilities = [{contentType : self.audioConf.mimeType}];
            }

            console.log("Request keySystem");
            let key_system = navigator.requestMediaKeySystemAccess("org.w3.clearkey", options)
            
            key_system.catch(function(error){
                console.log("Failed to request key system, error:" + error);
            });
            this.setMediaKeyPromise = key_system.then(function(keySystemAccess) {
                console.log("Create MediaKeys");
                return keySystemAccess.createMediaKeys();
            }).then(function(mediaKeys) {
                console.log("MediaKeys is created, set mediaKeys to video");
                return video.setMediaKeys(mediaKeys);
            });
        }

        this.setMediaKeyPromise.then(function() {
            console.log("Create MediaKeys session");
            let session = video.mediaKeys.createSession();
            self.sessions.push(session);
            session.addEventListener("message", self.onMessage.bind(self));
            session.addEventListener("keystatuseschange", self.onKeyStatusChange.bind(self));
            console.log("Generate LicenseRequest");
            let result = session.generateRequest(initDataType, initData);
            
            result.catch(function(error){
                console.log("generateRequest is failed, error:" + error + ", stack: " + error.stack);
            });
        });

        this.setMediaKeyPromise.catch(function(error){
            console.log("setMediaKeys is failed, error:" + error);
        });
    },

    onEncrypted : function(event)
    {
        console.log("onEncrypted, initDataType: '" + event.initDataType + "', initData: '" + buf2hex(event.initData) + "'");
    },

    onMessage : function(event)
    {
        let session = event.target;
        let msgStr = String.fromCharCode.apply(String, new Uint8Array(event.message));
        let msg = JSON.parse(msgStr);
        let outKeys = [];
        let keys = this.keys;

        let kids = [HexToBase64("d0d1d2d3d4d5d6d7d8d9dadbdcdddedf"), HexToBase64("b0b1b2b3b4b5b6b7b8b9babbbcbdbebf")];

        for (var i = 0; i < kids.length; i++) {
            let id64 = kids[i];
            let idHex = Base64ToHex(kids[i]).toLowerCase();
            var key = keys[idHex];
            if (key) {
                outKeys.push({
                    "kty":"oct",
                    "alg":"A128KW",
                    "kid":id64,
                    "k":HexToBase64(key)
                });
            }
        }
        var update = JSON.stringify({
                        "keys" : outKeys,
                        "type" : msg.type
                     });

        session.update(stringToArray(update).buffer);
    },

    onKeyStatusChange : function(event)
    {
        let session = event.target;
        let keysStatus = session.keyStatuses;
        for (let key of keysStatus.entries()) {
            let keyId = key[0];
            let status = key[1];
            let base64KId = Base64ToHex(window.btoa(String.fromCharCode.apply(String,new Uint8Array(keyId))));
            console.log("Session:" + " keyId=" + base64KId + " status=" + status);
        }
    }
};
