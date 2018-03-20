;(function(document, windowConsole) {
    
    "use strict";
    
    function ConsoleLog(oldConsole) {
        
        var console;
        this.setConsole = function(aConsole) {
            console = aConsole;
        }
        
        function log(message) {
            try {
                console[this](message);
            } catch(e) {
                oldConsole[this](message);
            }
        }
        
        this.log = log.bind("log");
        this.info = log.bind("info");
        this.warn = log.bind("warn");
        this.error = log.bind("error");
    }

    window.console = new ConsoleLog(windowConsole);
    
    var cqClasses = ["no-call", "call-quality-good", "call-quality-moderate", "call-quality-poor"];
    var connectionQuality;
    
    var cleanUpListeners = [];
    var browserInfo;
    var targetWindow;
    var targetDocument;
    var localVideoEnabled;
    var agentPictureUrl;
    var agentName;
    var currentCall;
    var agentVideoWindow;
    var checkPageTimeout;
    var debug = false;
    var muted = false;
    var videoToggleEnabled = true;
    var isOnRecognizedAssistPage = true;
    var videoWindowX = "20px";
    var videoWindowY = "20px";
    var AssistControllerInterface;
    var configuration;
    

        
    window.AssistCSDK = {
        init: function(AssistUtils, aConsole, aConfig, aTargetWindow, aAssistControllerInterface,
            onAgentVideoWindowCreatedCallback, onInCallCallback) {
            
            AssistCSDK.initRun = true;
            localVideoEnabled = aConfig.hasLocalVideo(); // we may need to toggle this, so track separately from config object.  Only change on init (not reconnect)
            rewire(AssistUtils, aConsole, aConfig, aTargetWindow, aAssistControllerInterface);
            
            window.onunload = function() {
                console.log("window onunload");
                endCall();
            };
            
            agentVideoWindow = createAgentVideoWindow();
            onAgentVideoWindowCreatedCallback(agentVideoWindow);
            
            loadCSDK(function() {
                populateSessionTokenAndCid(function() {
                    initiateCall(function() {
                        onInCallCallback();
                    });
                });
            }, true);
        },
 
        setAgentName: function(aAgentName) {
    
            agentName = aAgentName;
            console.log("Setting agentName to " + agentName);
            
            if (!agentName || agentName == 'undefined') {
                return;
            }
            
            var nameDiv = targetDocument.getElementById("name-div");

            if (nameDiv != null) {
                nameDiv.firstChild.nodeValue = agentName;
            }
        },

        setAgentPicture: function(aAgentPictureUrl) {
        
            var agentPictureUrl = aAgentPictureUrl;
            console.log("Setting agentPictureUrl to " + agentPictureUrl);
            
            if (!agentPictureUrl || agentPictureUrl == 'undefined') {
                return;
            }
            
            var picture = targetDocument.getElementById("picture");
            if ((picture !== null) && (typeof picture !== "undefined")) {
                picture.setAttribute("src", agentPictureUrl);
            }
        },
        
        endCall: function() {

            try {
                if (currentCall != undefined) {
                    currentCall.end();  
                }
            } catch(e) {
                console.warn("Couldn't end call", e);
            }
            destroySession();            
            
            try {
                for (var i = 0, len = cleanUpListeners.length; i < len; i++) {
                    cleanUpListeners[i].window.removeEventListener(cleanUpListeners[i].type, cleanUpListeners[i].method, false);
                }
            } catch (e) {
                console.warn("Couldn't remove all event listeners");
            }
            
            window.onunload = null;
            
            if (debug != true) {
                window.close();
            }
        },
        
        reconnect: function(AssistUtils, aConsole, aConfig, aTargetWindow, aAssistControllerInterface, onAgentVideoWindowCreatedCallback) {
            
            rewire(AssistUtils, aConsole, aConfig, aTargetWindow, aAssistControllerInterface);
            
            agentVideoWindow = targetDocument.getElementById("assist-sdk");

            if (!agentVideoWindow) {
                agentVideoWindow = createAgentVideoWindow();
            }
            onAgentVideoWindowCreatedCallback(agentVideoWindow);
            
            // todo: setup browserinfo for safari
            // safari - need to call setVideoElement again on page change - annoyingly, it won't work if you do it straight away
            var videoContainer = targetDocument.getElementsByClassName("assist-video-container")[0];
            
            if (browserInfo.safari == true) {
                if (currentCall) {
                    setTimeout(function() {
                        currentCall.setVideoElement(videoContainer);   
                    }, 1000);
                }

                if (window.opener) {
                    try {
                        window.open("", window.opener.name);
                    } catch (e) {
                        console.warn("Could not return focus to main page");
                    }
                }
            }

            if (videoContainer.childNodes[0]) {
                var element = videoContainer.childNodes[0];
                if (element.tagName == "VIDEO") {
                    console.log("playing video");
                    element.play();
                }
            }
            
            //If in mid-call (reconnected), redraw connection quality indicator.
            if (currentCall != null) {
                currentCall.onConnectionQualityChanged(connectionQuality);
            }
        }
    }; // api ends here
    
    function rewire(AssistUtils, aConsole, aConfig, aTargetWindow, aAssistControllerInterface) {
 
        window.AssistUtils = AssistUtils;
        AssistControllerInterface = aAssistControllerInterface;
        
        configuration = aConfig; // if we don't pass up a new config object every time IE can get upset about using the one from the previous page
        debug = configuration.getDebugMode();
        
        browserInfo = configuration.getBrowserInfo();
        targetWindow = aTargetWindow;
        targetDocument = targetWindow.document;
        
        console.setConsole(aConsole);
        
        isOnRecognizedAssistPage = true;
        showOffAssistWarning(false);
        
        if ("onpagehide" in window) {
            targetWindow.addEventListener("pagehide", handleUnload, false);
            cleanUpListeners.push({ window: targetWindow, type: "pagehide", method: handleUnload });
        } else {
            targetWindow.addEventListener("unload", handleUnload, false);
            cleanUpListeners.push({ window: targetWindow, type: "unload", method: handleUnload });
        }
    }
        
    // if we end support via the popup by closing the popup or pressing end then we need to trigger end on AssistSDK
    // whereas if AssistCSDK.endCall is called directly it's being triggered from an endSupport call from AssistSDK
    function endCall() {
        console.log("endCall: AssistCSDK");
        try {
            AssistCSDK.endCall();
            AssistControllerInterface.endSupport();
        } catch(e) {
            console.warn("Failed end support session");
        }
        // don't need AssistSDK.endCall because endSupport will call up to it
    }
    
    function destroySession() {
        console.log("Making request to destroy session.");
        
        var request = new XMLHttpRequest();

        var url = "/assistserver/consumer";
        
        request.open("DELETE", url, true);

        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                console.log("Status: " + request.status + " " + request.statusText);
                if (request.status == 200) {
                    console.log("Response text: " + request.responseText);
                }
            }
        };
        
        request.send(null);
    }
    
    function populateSessionTokenAndCid(callback) {
        var request = new XMLHttpRequest();

        var url = "/assistserver/";
        if (configuration.getSessionToken()) {
            if (configuration.getCorrelationId()) {
                callback();
                return;
            }
            
            var postData = "type=get&targetServer=" + configuration.getTargetServer()
                + "&originServer=" + configuration.getOriginServer()
                + "&sessionToken=" + configuration.getSessionToken();
                
            url += "session";
        } else {
            var postData = "type=create&targetServer=" + configuration.getTargetServer()
                + "&originServer=" + configuration.getOriginServer();
                
            url += "consumer";
        }
        if (configuration.getUrl()) {
            url = configuration.getUrl() + url;
        }
            
        console.log("AssistCSDK.init(): url = " + url);
       
        request.open("POST", url, true);
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                if (request.status == 200) {
                    var result = JSON.parse(request.responseText);
                    var correlationId = result.address;
                    var sessionToken = result.token;
                    configuration.setSessionToken(sessionToken);
                    configuration.setCorrelationId(correlationId);
                    
                    callback();
                } else if (request.status == 403) {
                    AssistControllerInterface.doError('SESSION_CREATION_FAILURE',
                    {code:AssistControllerInterface.getSessionCreationFailureCode(),
                    message: message});
                }
            }
        };

        request.send(postData);
    }
   
    //ie will download in parallel but load in-order of first returned, so need to force sequential execution
    function loadCSDK(callback, sequentialLoading) { 

        if (configuration.hasDestination()) {
           var baseUrl = configuration.getUrl() || "";   
           
            var scripts = [
                    baseUrl + "/gateway/adapter.js",
                    baseUrl + "/gateway/csdk-phone.js",
                    baseUrl + "/gateway/csdk-aed.js",
                    baseUrl + "/gateway/csdk-common.js"];

            if (!sequentialLoading) {
                AssistUtils.loadScripts(scripts, document, function() {
                    console.log("csdk: scripts loaded");
                    waitForUC();
                });
            } else {
                ;(function loadSequential(i) {
                    if (i < scripts.length) {
                        AssistUtils.loadScripts([scripts[i]], document, function() { loadSequential(++i); });
                    } else { // when done loading scripts, wait for UC to be ready before declaring us done
                        waitForUC();
                    }
                })(0);
            }
        }
        
        function waitForUC() { // this is mostly an IE thing, when UC becomes available the plugin is actually ready
            if (typeof window['UC'] == 'undefined') {
                console.log("UC not ready yet, waiting");
                setTimeout(waitForUC, 200);
            } else {
                console.log("csdk: calling callback");
                callback();
            }
        };
    }
    
    function initiateCall(onInCallCallback) {

        UC.onInitialisedFailed = function() {
        };

        var hasLocalMedia = false;
        
        var webcamStatus = document.getElementById('webcamStatus');
        var content = document.getElementById("content");
        
        if (content) {
            var contentStyle = window.getComputedStyle(content, null);
            window.resizeTo(parseInt(contentStyle.getPropertyValue("width")) + 20, parseInt(contentStyle.getPropertyValue("height")) + 120);
        }
        
        setTimeout(function() { // Wait a second before displaying the prompt for local media in case it has already been granted
            if (!hasLocalMedia) {
                if (webcamStatus) {
                    webcamStatus.classList.add("assist_webcam_requested");
                }
                if (content) {
                    content.classList.add("assist_with_webcam_request");
                    var contentStyle = window.getComputedStyle(content, null);
                    window.resizeTo(parseInt(contentStyle.getPropertyValue("width")) + 20, parseInt(contentStyle.getPropertyValue("height")) + 120);
                }
            }
        }, 200);
        
        
        UC.onInitialised = function() {
            var call = UC.phone.createCall(configuration.getDestination());
            
            setupNewCallHandlers(call, onInCallCallback);
            
            call.dial(true, (configuration.getVideoMode() != "none"));
         };   
         
        UC.start(configuration.getSessionToken(), configuration.getStunServers());
        
        if (browserInfo.ie == true) {
            hasLocalMedia = true;
            if (webcamStatus) {
                webcamStatus.classList.add("assist_webcam_allowed");
            }
        } else {
            UC.phone.onLocalMediaStream = function(localMediaStream) {
                hasLocalMedia = true;
                if (webcamStatus) {
                    webcamStatus.classList.remove("assist_webcam_requested");
                    webcamStatus.classList.add("assist_webcam_allowed");
                }
                if (content) {
                    content.classList.remove("assist_with_webcam_request");
                    var contentStyle = window.getComputedStyle(content, null);
                    window.resizeTo(parseInt(contentStyle.getPropertyValue("width")) + 20, parseInt(contentStyle.getPropertyValue("height")) + 60);
                }
                document.getElementById("status").textContent = i18n.t("assistI18n:popup.status.connecting");
                try {
                    // not to be confused with assist-controller.js - this is directly calling customer impl of onWebCamUseAccepted
                    // todo: maybe these should be routed via onSDKCallback in assist-controller.js somehow
                    targetWindow.AssistSDK.onWebcamUseAccepted();
                } 
                catch (e) {}
            };
        }
    }
    
    function setupNewCallHandlers(newCall, onInCallCallback) {

        currentCall = newCall;

        newCall.onRemoteMediaStream = function(remoteMediaStream) {
        
            console.log("on remote media stream");
            var audioElement = document.getElementById("audio-element");
            
            if (audioElement) {
                var windowURL = window.URL || window.webkitURL;
                audioElement.src = windowURL.createObjectURL(remoteMediaStream);
            }
            
            var supportDiv = targetDocument.getElementById("assist-sdk");
            var videoElements = supportDiv.getElementsByTagName("VIDEO");
            if (videoElements && videoElements.length == 1) {
                videoElements[0].muted = true;
            }
        };
        
        var videoContainer = targetDocument.getElementsByClassName("assist-video-container")[0]
        newCall.setVideoElement(videoContainer);

        newCall.onInCall = function() {
            console.log("In onInCall()");

            if (localVideoEnabled == false) {
                newCall.setLocalMediaEnabled(false, true);
            }
            
            if (configuration.hasVideo()) {
                var videoContainer = targetDocument.getElementsByClassName("assist-video-container")[0]
                videoContainer.style.visibility = "visible";
            }
            targetDocument.getElementById("status-div").style.visibility = "hidden"; // confusingly, these are two different things <- page
            document.getElementById("status").textContent = i18n.t("assistI18n:popup.status.connected"); // <- popup
            
            onInCallCallback(); // <- for triggering AssistSDK to start websocket
        };

        newCall.onEnded = function() {
            console.log("In newCall.onEnded().");
            currentCall = null;
            endCall();
        };

        newCall.onCallFailed = newCall.onDialFailed = function(message) {
            console.log("callfailed-dialfailed");
            endCall();
            displayModal(i18n.t("assistI18n:notice.callFailed"));
            error('FAILED', message);
        };

        newCall.onGetUserMediaError = function() {
            console.log("ongetusermediaerror");
            endCall();
            console.log("Access to camera/microphone failed.");
            displayModal(i18n.t("assistI18n:notice.userMediaError"));
        };

        newCall.onConnectionQualityChanged = function(quality) {
            connectionQuality = quality;
            if (isOnRecognizedAssistPage) {
                var cqIndicator = targetDocument.getElementById("call-quality-indicator");
                if (cqIndicator == null) {
                    cqIndicator = targetDocument.createElement("div");
                    cqIndicator.id = "call-quality-indicator";
                    
                    // look it up in-place, otherwise closures mean we can end up referencing old supportDiv
                    var supportDiv = targetDocument.getElementById("assist-sdk"); 
                    supportDiv.appendChild(cqIndicator);
                }
                var qualityClass;
                if (quality >= 90) {
                    qualityClass = cqClasses[1];
                } else if (quality >= 70) {
                    qualityClass = cqClasses[2];
                } else {
                    qualityClass = cqClasses[3];
                }
                setCallQuality(cqIndicator, qualityClass);
            }
        };

        newCall.onBusy = function(message) {
            error("BUSY", message);
        };
        
        newCall.onNotFound = function(message) {
            error("NOT_FOUND", message);
        };
        
        newCall.onTimeout = function(message) {
            error("TIMEOUT", message);
        };
    }
    
    function setCallQuality(cqIndicator, cqClass) {
        for (var i = 0; i < cqClasses.length; i++) {
            if (cqClass != cqClasses[i]) {
                cqIndicator.classList.remove(cqClasses[i])
            } else {
                cqIndicator.classList.add(cqClasses[i]);
            }
        }
    }
    
    function error(type, message) {
        console.log("call was busy or not found");
        displaySupportBusyModal();
        AssistControllerInterface.doError('ERROR_CALL_' + type, {message: message});
        endCall();
    }
    
    function createAgentVideoWindow() {
        
        var withVideo = configuration.hasVideo();
        
        console.log("with video: " + withVideo);
        var className;
        if (withVideo == false) {
            className = "without-video audio-only";
        } else {
            className = "with-video";
        }

        var supportDiv = targetDocument.createElement("div");
        supportDiv.id = "assist-sdk";
        supportDiv.className = className;
        
        try {
            if (agentVideoWindow && !browserInfo.ie) {
                videoWindowX = agentVideoWindow.style.left;
                videoWindowY = agentVideoWindow.style.top;
            }
        } catch (e) {
        }
        supportDiv.style.top = videoWindowY;
        supportDiv.style.left = videoWindowX;

        var videoContainer = targetDocument.createElement("div");
        videoContainer.id = "video";
        videoContainer.className = "assist-video-container";
        supportDiv.appendChild(videoContainer);

        var nameDiv = targetDocument.createElement("div");
        nameDiv.id = "name-div";

        console.log("agentName is " + agentName);
        if (agentName == null) {
            agentName = "";
        }
        
        var agentNameNode = targetDocument.createTextNode(agentName);
        nameDiv.appendChild(agentNameNode);
        supportDiv.appendChild(nameDiv);
        
        if (withVideo) {
        	var menuButton = targetDocument.createElement("div");
        	menuButton.id = "menu-button";
        	menuButton.classList.add("button");
        	menuButton.onclick = function() {
                menuDiv.style.visibility = (menuDiv.style.visibility == "hidden") ? "visible" : "hidden";
            };
        	supportDiv.appendChild(menuButton);
            
        	var menuDiv = targetDocument.createElement("div");
        	menuDiv.id = "menu";
        	menuDiv.style.visibility = "hidden";
        	supportDiv.appendChild(menuDiv);
            
            var mute = targetDocument.createElement("div");
            mute.id = "mute-button";
            mute.classList.add("unmuted");
            mute.classList.add("button");
            mute.onclick = toggleMute;
            menuDiv.appendChild(mute);
            
            var br = targetDocument.createElement("br");
            menuDiv.appendChild(br);
            
            var videoToggleButton = targetDocument.createElement("div");
            videoToggleButton.id = "video-toggle-button";
            videoToggleButton.classList.add(localVideoEnabled ? "unmuted" : "muted");
            videoToggleButton.classList.add(videoToggleEnabled ? "enabled" : "disabled");
            videoToggleButton.classList.add("button");
            videoToggleButton.onclick = toggleVideo;
            menuDiv.appendChild(videoToggleButton);
            
            var br = targetDocument.createElement("br");
            menuDiv.appendChild(br);
            
        } else {
            var mute = targetDocument.createElement("div");
            mute.id = "mute-button";
            mute.classList.add("unmuted");
            mute.classList.add("button");
            mute.onclick = toggleMute;
            supportDiv.appendChild(mute);
        }
        
        if (!withVideo) {
            var picture = targetDocument.createElement("img"); // todo: find out if this is still necessary
            picture.id = "picture";
            var agentPictureUrl = agentPictureUrl;
            console.log("agentPictureUrl is " + agentPictureUrl);
            if (agentPictureUrl != null) {
                    picture.setAttribute("src", agentPictureUrl);
            }
                           
            supportDiv.appendChild(picture);
        }
        
        var end = targetDocument.createElement("div");
        end.id = "end-button";
        end.onclick = endCall;
        end.classList.add("button");
        supportDiv.appendChild(end);
    
        var statusDiv = targetDocument.createElement("div");
        statusDiv.id = "status-div";
        statusDiv.innerHTML =  "<center>" + i18n.t("assistI18n:popup.status.connecting") + "</center>";
        supportDiv.appendChild(statusDiv);
        statusDiv.style.visibility = "visible";
        
        if (withVideo) {        
            videoContainer.style.visibility = "hidden";
            
            if (currentCall != null) {
                currentCall.setVideoElement(videoContainer);

                var videoElements = supportDiv.getElementsByTagName("VIDEO");
                if (videoElements && videoElements.length == 1) {
                    videoElements[0].muted = true;
                }

                videoContainer.style.visibility = "visible";
                statusDiv.style.visibility = "hidden";
            }
        }
        
        return supportDiv;
    }
    
    function displayModal(message) {
        var okButtonText = i18n.t("assistI18n:button.ok");
        console.log("seting up support reject modal");

        var modalContainer = targetDocument.createElement("div");
        modalContainer.id = "assist-support-rejected-modal";
        targetDocument.body.appendChild(modalContainer);

        var modal = targetDocument.createElement("div");

        modalContainer.appendChild(modal);

        var p = targetDocument.createElement("p");
        p.innerHTML = message;
        modal.appendChild(p);

        var input = targetDocument.createElement("input");
        input.type = "button";
        input.value = okButtonText;
        p.appendChild(input);
        
        AssistControllerInterface.removeOnClick(input, "assist-support-rejected-modal");
    }

    function displaySupportBusyModal() {
    	 displayModal(i18n.t("assistI18n:notice.noAgents"));
    }
    
    function handleUnload() {
        console.log("In handleUnload()");
        isOnRecognizedAssistPage = false;
        if (checkPageTimeout) {
            clearTimeout(checkPageTimeout);
        }
        checkPageTimeout = setTimeout(checkPage, 4000);
    }

    function checkPage() {
        try {
            if (targetDocument.readyState !== "complete") {
                // Page not ready, but we're allowed to know that, which is promising. Try again later
                checkPageTimeout = setTimeout(checkPage, 500);
                return;
            }
        } catch (error) {
            // An error occurred trying to read the documents ready state, suggesting that we're not
            // on an assist enabled page.
        }
    	if (!isOnRecognizedAssistPage) {
    		//AssistSDK.isOnAssistPages = false;
    		showOffAssistWarning(true);
        }
    }
    
    
    function showOffAssistWarning(visible) {
        var assistPopupContent = document.getElementById("content");
        var assistWarningPanel = document.getElementById('warningPanel');

        if (visible) {
            assistPopupContent.classList.add("warning_panel_visible");
            assistWarningPanel.classList.add("visible");
        } else {
            assistPopupContent.classList.remove("warning_panel_visible");
            assistWarningPanel.classList.remove("visible");
        }

        var assistPopupComputedStyle = window.getComputedStyle(assistPopupContent, null);
        window.resizeTo(parseInt(assistPopupComputedStyle.getPropertyValue("width")) + 20, parseInt(assistPopupComputedStyle.getPropertyValue("height")) + 120);
        window.focus();
    }
    

    function toggleMute() {
        var muteButton = targetDocument.getElementById("mute-button");
        var videoToggleButton = targetDocument.getElementById("video-toggle-button");
        
        if (muted == false) {
            muted = true;
            muteButton.classList.remove("unmuted");
            muteButton.classList.add("muted");
            if (videoToggleButton != null) {
                videoToggleEnabled = false;
            	videoToggleButton.classList.remove("enabled");
            	videoToggleButton.classList.add("disabled");
            }
            enableOrDisableLocalVideoAndAudio();
            
        } else {
            muted = false;
            enableOrDisableLocalVideoAndAudio();
            muteButton.classList.remove("muted");
            muteButton.classList.add("unmuted");
            
            if (videoToggleButton != null) {
            	videoToggleEnabled = true;
            	videoToggleButton.classList.remove("disabled");
            	videoToggleButton.classList.add("enabled");
            }
        }
    }
    
    function toggleVideo() {
        var videoToggleButton = targetDocument.getElementById("video-toggle-button");
        
    	if (videoToggleEnabled == false) {
    		return;
        }
        
    	if (localVideoEnabled == false) {
    		localVideoEnabled = true;
    		videoToggleButton.classList.remove("muted");
    		videoToggleButton.classList.add("unmuted");
    		enableOrDisableLocalVideoAndAudio();
    	} else {
    		localVideoEnabled = false;
    		videoToggleButton.classList.remove("unmuted");
    		videoToggleButton.classList.add("muted");
    		enableOrDisableLocalVideoAndAudio();
    	}
    }
    
    function enableOrDisableLocalVideoAndAudio() {
    	var enablingVideo = localVideoEnabled && !muted;
    	var enablingAudio = !muted;
    	console.log("Setting video to " + ((enablingVideo) ? "enabled" : "disabled") + ".");
    	console.log("Setting audio to " + ((enablingAudio) ? "enabled" : "disabled") + ".");
    	if (currentCall != null) {
    		currentCall.setLocalMediaEnabled(enablingVideo, enablingAudio);
    	}
    }
    
})(document, window.console);
