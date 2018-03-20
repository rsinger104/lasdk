
var INITIALISATION_FAILURE = 0;
var CALL_FAILED = 6;

function getEncodedServerAddr() {
    var protocol = window.location.protocol;
    var port = window.location.port;
    var hostname = window.location.hostname;
    if (port === "") {
        if (protocol === "https:") {
            port = "443";
        } else {
            port = "80";
        }
    }
    return encodeURIComponent(Base64.encode(protocol + "//" + hostname + ":" + port));
}

/**
 *
 *  Base64 encode / decode
 *  http://www.webtoolkit.info/
 *
 **/
var Base64 = {

// private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

// public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = Base64._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

        }

        return output;
    },

// public method for decoding
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = Base64._utf8_decode(output);

        return output;

    },

// private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

// private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;

        while ( i < utftext.length ) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }

        return string;
    }

};

function CallManager() {

    var cqClasses = ["no-call", "call-quality-good", "call-quality-moderate", "call-quality-poor"];

    var preview;
    var video;
    var cqIndicator;
    var cqClass = cqClasses[0];
    var currentCall = null;
    var self = this;

    var localStream;
    var remoteStream;

    this.setLocalVideoElement = function(localVideo) {
        // check if we already have a local stream and if so assign it to this element
        console.log("set local video element");
        preview = localVideo;
    };

    this.setRemoteVideoElement = function(remoteVideo) {
        // check if we already have a remote stream and if so assign it to this element
        console.log("set remote video element");
        video = remoteVideo;
        if (currentCall) {
            currentCall.setVideoElement(video);
        }
    };

    // TODO make this private
    this.setCallQuality = function (cqIndicator, cqClass) {
        for (var i = 0; i < cqClasses.length; i++) {
            if (cqClass != cqClasses[i]) {
                cqIndicator.classList.remove(cqClasses[i])
            } else {
                cqIndicator.classList.add(cqClasses[i]);
            }
        }
    };

    this.setCallQualityIndicator = function(indicator) {
        cqIndicator = indicator;
        self.setCallQuality(cqIndicator, cqClass);
    };



    this.init = function(configuration) {
        AssistAgentSDK.setLocale(configuration.locale);

        self.ringring = document.createElement("audio");
        if (isIE) {
            self.ringring.setAttribute("src", AssistAgentSDK.sdkUrl + "audio/ringring.mp3");
        } else {
            self.ringring.setAttribute("src", AssistAgentSDK.sdkUrl + "audio/ringring.wav");
        }
        self.ringring.setAttribute("loop", "loop");

        var url = "/assistserver/agent";
        if (configuration.url) {
            url = configuration.url + url;
        }

        function startUC(sessionToken) {
            console.log("Session Token: " + sessionToken);
            UC.onInitialisedFailed = function () {
                AssistAgentSDK.setError({code:INITIALISATION_FAILURE, message:"UC initialisation failure"});
            };

            UC.onInitialised = function () {
                
                console.log("UC onInitialised fired");
                UC.phone.setPreviewElement(preview); 
                
                UC.phone.onIncomingCall = function (newCall) {
                    var correlationId = newCall.getRemoteAddress();
                    console.log("incoming call: " + newCall.getCallId());

                    var rejectCall = function() {
                        console.log("incoming call rejected: " + newCall.getCallId()); 
                        newCall.end();
                        AssistAgentSDK.setError({code:CALL_FAILED, message:"Call rejected"});
                        AssistAgentSDK.rejectSupport({correlationId: correlationId, url: configuration.url});
                    };

                   var onCancel = function() {};//may be overriden by client app

                    var acceptCall = function() {
                        console.log("incoming call accepted: " + newCall.getCallId()); 
                        currentCall = newCall;
                        AssistAgentSDK.startSupport({
                            correlationId: correlationId,
                            agentName: configuration.agentName,
                            agentPictureUrl: configuration.agentPictureUrl,
                            agentText: configuration.agentText,
                            url: configuration.url,
                            sessionToken: sessionToken
                        });

                        currentCall.onInCall = function () {
                            self.configureStartCall();
                            UC.phone.setPreviewElement(preview);
                            currentCall.setVideoElement(video);
                        };

                        currentCall.onEnded = function () {
                            currentCall = null;
                            self.endCall();
                            self.configureEndCall();
                            remoteStream = undefined;
                            if (cqIndicator) {
                                self.setCallQuality(cqIndicator, cqClasses[0]);
                            }
                            if (isIE) {
                                UC.phone.setPreviewElement(preview);
                            }
                            video.poster = "data:image/svg;base64,PHN2Zz48L3N2Zz4=";
                        };

                        currentCall.onConnectionQualityChanged = function (quality) {
                            console.log("Connection quality changed.  New quality is " + quality);
                            if (cqIndicator) {
                                var qualityClass;
                                if (quality >= 90) {
                                    qualityClass = cqClasses[1];
                                } else if (quality >= 70) {
                                    qualityClass = cqClasses[2];
                                } else {
                                    qualityClass = cqClasses[3];
                                }
                                self.setCallQuality(cqIndicator, qualityClass);
                            }
                        };
                        currentCall.answer(true, true);
                    }

                    if (currentCall != null) {
                        rejectCall();
                        return;
                    }

                    var defaultIncomingHandling = function() {
                        var answer = configuration.autoanswer;
                        console.log(" r == " + answer == true);

                        if (answer == false) {
                            self.ringring.play();
                            answer = confirm(i18n.t("assistI18n:agent.incoming", {"caller": newCall.getRemoteAddress()}));
                            self.ringring.pause();
                        }
                        if (answer == true) {
                            acceptCall();
                        } else {
                            rejectCall();
                        }
                    };

                    if (typeof configuration.incomingCallback !== 'undefined')
                    {
                        var newCallEvent = { accept: acceptCall , 
                                             reject: rejectCall, 
                                             onIncomingCallCancel: onCancel, 
                                             callId: newCall.getCallId(), 
                                             remoteAddress: newCall.getRemoteAddress(), 
                                             remoteDisplayName: newCall.getRemotePartyDisplayName()
                                           };
                        newCall.onEnded = function() {
                            newCallEvent.onIncomingCallCancel();
                        };
                        configuration.incomingCallback(newCallEvent);
                       // expecting async callback in form of newCallEvent.accept() or newCallEvent.reject()
                    }
                    else 
                    {
                        defaultIncomingHandling();
                    }
                };
            };
            
            var browserInfo = {};
            browserInfo[getBrowser().toLowerCase()] = true;
            
            if (UC.checkBrowserCompatibility) {
                checkBrowserCompatibility(browserInfo, function() {
                    UC.start(sessionToken, configuration.stunServers);
                });
            } else {
                UC.start(sessionToken, configuration.stunServers);
            }
        }
            
        function checkBrowserCompatibility(browserInfo, pluginInstalledCallback) {
        
            UC.checkBrowserCompatibility(function(pluginInfo) {

                switch (pluginInfo.status) {
                    case "installRequired": {     
                        var container = displayInstallRequiredModal(browserInfo, pluginInfo);
                        
                        if (pluginInfo.restartRequired == false) {
                            pollForPlugin(pluginInfo.status, container, pluginInstalledCallback);
                        }
                        break;
                    }
                    case "upgradeRequired": {
                        displayUpgradeRequiredModal(browserInfo, pluginInfo);
                        break;
                    }
                    case "upgradeOptional": {
                        displayUpgradeOptionalModal(browserInfo, pluginInfo, pluginInstalledCallback);
                        break;
                    }
                    default: {
                        pluginInstalledCallback();
                    }
                }
            });
        }
        
        function pollForPlugin(undesiredStatus, container, pluginInstalledCallback) {
        
            var interval = setInterval(function() {
                UC.checkBrowserCompatibility(function(pluginInfo) {
                    if (pluginInfo.status != undesiredStatus) {
                        container.parentNode.removeChild(container);
                        clearInterval(interval);
                        pluginInstalledCallback();
                    } 
                });
            }, 5000);
            
            return interval;
        }
   
        function displayModal(instructions, rejectText, browserInfo, pluginInfo) {
        
            var document = window.top.document;
            
            var browser = (browserInfo.ie) ? "ie" : "safari";
            var message = i18n.t("assistI18n:plugin." + browser + "." + instructions, {
                "pluginUrl": pluginInfo.pluginUrl,
                "minimumRequiredVersion": pluginInfo.minimumRequired,
                "latestAvailableVersion": pluginInfo.latestAvailable,
                "installedVersion": pluginInfo.installedVersion
            });
            
            var cancelText = i18n.t("assistI18n:plugin." + rejectText);
            var pluginUrl = pluginInfo.pluginUrl;

            var modalContainer = document.createElement("div");
            modalContainer.id = "modal";
            modalContainer.className = "plugin-info";
            modalContainer.style.display = "none"; // when the css loads, this will display
            document.body.appendChild(modalContainer);

            var modal = document.createElement("div");

            modalContainer.appendChild(modal);

            var p = document.createElement("p");
            p.innerHTML = message + "<br /><br />";
            modal.appendChild(p);
            
            var downloadPluginText = i18n.t("assistI18n:plugin.downloadPlugin");
            var installPluginButton = document.createElement("input");
            installPluginButton.type = "button";
            installPluginButton.value = downloadPluginText;
            p.appendChild(installPluginButton);
            
            installPluginButton.addEventListener("click", function() {
                window.top.location.assign(pluginUrl);
            });
            
            var cancelButton = document.createElement("input");
            cancelButton.type = "button";
            cancelButton.value = cancelText;
            p.appendChild(cancelButton);
            
            return { p: p, container: modalContainer, document: document, cancelButton: cancelButton, installPluginButton: installPluginButton };
        }
        
        function displayInstallRequiredModal(browserInfo, pluginInfo) {

            var modal = displayModal("installRequired", "rejectRequired", browserInfo, pluginInfo);

            var modalContainer = modal.container;
            var cancelButton = modal.cancelButton;

            cancelButton.onclick = function() {
                modalContainer.parentNode.removeChild(modalContainer);
            };
            
            return modalContainer;
        }
        
        function displayUpgradeRequiredModal(browserInfo, pluginInfo) {
        
            var modal = displayModal("upgradeRequired", "rejectRequired", browserInfo, pluginInfo);

            var modalContainer = modal.container;
            var cancelButton = modal.cancelButton;

            cancelButton.onclick = function() {
                modalContainer.parentNode.removeChild(modalContainer);
            };
            
            return modalContainer;
        }
        
        function displayUpgradeOptionalModal(browserInfo, pluginInfo, onRejectOptionalUpgradeCallback) {
        
            var modal = displayModal("upgradeOptional", "rejectUpgradeOptional", browserInfo, pluginInfo);

            var modalContainer = modal.container;
            var cancelButton = modal.cancelButton;
            var installPluginButton = modal.installPluginButton;
            
            cancelButton.onclick = function() {
                modalContainer.parentNode.removeChild(modalContainer);
                onRejectOptionalUpgradeCallback();
            };
            
            installPluginButton.addEventListener("click", function() {
                cancelButton.value = i18n.t("assistI18n:plugin.continueUpgradeOptional");
            });
            
            return modalContainer;
        }
        
        //This method adapted from code at http://stackoverflow.com/questions/5916900/detect-version-of-browser
        function getBrowser() {
            var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if(/trident/i.test(M[1]) || /MSIE/i.test(M[1])){
                return 'IE';
            }
            if(M[1]==='Chrome'){
                tem=ua.match(/\bOPR\/(\d+)/)
                if(tem!=null)   {return 'Opera';}
            }
            M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
            if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
            return M[0];
        }

        if (configuration.sessionToken) {
            startUC(configuration.sessionToken);
        } else {

            var request = new XMLHttpRequest();
            request.open("POST", url, true);
            request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");


            request.onreadystatechange = function () {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        var result = JSON.parse(request.responseText);
                        var sessionToken = result.token;
                        startUC(sessionToken);
                    } else {
                        AssistAgentSDK.setError({code:CALL_FAILED, message:"Make call failed"});
                    }
                }
            };

            console.log("username=" + configuration.username + "&password="
            + configuration.password + "&type=create&targetServer=" + getEncodedServerAddr());
            request.send("username=" + configuration.username + "&password="
            + configuration.password + "&type=create&targetServer=" + getEncodedServerAddr()
            + "&name=" + configuration.agentName + "&text=" + configuration.agentText);
            
            //Add page unload handler to send request to the server to destroy the session
            window.addEventListener("unload", function() {
            	var url = "/assistserver/agent";
                if (configuration.url) {
                    url = configuration.url + url;
                }
                var request = new XMLHttpRequest();
                request.open("DELETE", url, false);
                request.send();
            });
        }
    };

    this.endCall = function() {
        if (currentCall != null) {
            currentCall.end();
            try {
                currentCall.setLocalMediaEnabled(true, true);
            } catch (e) {}
            currentCall = null;
            this.configureEndCall();
        }
        AssistAgentSDK.endSupport();
        remoteStream = undefined;
        if (cqIndicator) {
            self.setCallQuality(cqIndicator, cqClasses[0]);
        }
        if (AssistAgentSDK.callEndedCallback) {
        	AssistAgentSDK.callEndedCallback();
        }
    };

    this.configureStartCall = function() {
    };

    this.configureEndCall = function() {
    };

    this.setMuted = function(muted) {
        if (currentCall != null) {
            currentCall.setLocalMediaEnabled(!muted, !muted);
        }
    };

    window.addEventListener("unload", function() {
        self.endCall();
    });
}

CallManager = new CallManager();
