;(function() {

    var scriptIncludeBaseUrl = (function getSDKUrl() {
        try {
            var scripts = document.getElementsByTagName('script');
            var src = scripts[scripts.length - 1].src; // last script should be us
            var url = src.substring(0, src.lastIndexOf("/") + 1);
            var file = src.substring(src.lastIndexOf("/") + 1, src.length);
            
            if (file == "assist-iframe.js") { // need this check in case we've been uglified into some other script loader
                return url;
            }

        } catch (e) {
        }
    })();

    var assistLogger = {
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        log: console.log.bind(console),
        info: console.info.bind(console)
    };

    var disableAssistLogging = function() {
        assistLogger.warn = function() {};
        assistLogger.log = function() {};
        assistLogger.error = function() {};
        assistLogger.info = function() {};
    };
    
    var timeout;
    var messageChannel;
    var mutationObserver;

    var uiChangingHtmlAttributes = ["class", "style", "src", "rows", "cols", "disabled",
                                        "width", "height", "hidden", "placeholder", "shape",
                                        "span", "srcdoc", "type", "value"];
    
    var mutationObserverConfig = {
        attributes : true,
        childList : true,
        characterData : true,
        subtree : true,
        attributeFilter: uiChangingHtmlAttributes
    };
    
    window.AssistIFrameSDK = {
        init : function(configuration) {

            if (configuration && configuration.disableLogging) {
                disableAssistLogging();
            }

            var inIFrame = (function() {
                try {
                    return window.self !== window.top;
                } catch (e) { // browser can block access to window.top, in which case, we're probably an iframe
                    return true;
                }
            })();
            
            if (inIFrame == false) {
                assistLogger.warn("Don't appear to be running in an iframe");
                return;
            }
            
            configuration.allowedOrigins = configuration.allowedOrigins || [];
            
            var sdkUrl = configuration.sdkUrl || scriptIncludeBaseUrl;

            initialiseMutationObserver(sdkUrl, function () {

                loadScript(sdkUrl + "/thirdparty/canvg-1.4/rgbcolor.js", document);
                loadScript(sdkUrl + "/thirdparty/canvg-1.4/StackBlur.js", document);
                loadScript(sdkUrl + "/thirdparty/canvg-1.4/canvg.js", document);
                loadScript(sdkUrl + "/thirdparty/html2canvas.js", document, function () {

                    initMessageListener(configuration);
                    initScrollListener();
                    initMutationObserver();
                    initResizeListener();
                });

            });

        }
    };
    
    function initScrollListener() {
        window.addEventListener("scroll", function(e) {
            triggerDraw();
        }, false);
    }
    
    function initMutationObserver() {
        mutationObserver = new MutationObserver(function(mutations) {
            triggerDraw();
        });
        
        mutationObserver.observe(document.body, mutationObserverConfig);
    }

    function initResizeListener() {
        window.addEventListener("resize", function(event) {
            triggerDraw();
        });
    }

    function triggerDraw() {
        clearTimeout(timeout);

        if (messageChannel && cacheInvalidateSentForThisRender == false) {
            cacheInvalidateSentForThisRender = true;
            sendInvalidateCache();
        }

        timeout = setTimeout(function() {
            if (messageChannel) {
                cacheInvalidateSentForThisRender = false;
                capture();
            }
        }, 500);
    }
    
    function initMessageListener(configuration) {
                        
        if (messageChannel) {
            return;
        }
            
        assistLogger.log("Iframe added message listener");
        window.addEventListener("message", function(event) {
            assistLogger.log("Iframe received message");

            var allowedOrigin = false;
            for (var i = 0, len = configuration.allowedOrigins.length; i < len; i++) {
                if (configuration.allowedOrigins[i] === event.origin || configuration.allowedOrigins[i] === "*") {
                    allowedOrigin = configuration.allowedOrigins[i];
                    break;
                }
            }
            
            if (allowedOrigin != false) {
                
                if (event.data.message == "assistDiscover") {
                    initMessageChannel(event.source, allowedOrigin);
                }

            }
        }, false);
    }
    
    function initMessageChannel(source, allowedOrigin) {
        
        cacheInvalidateSentForThisRender = false;
        messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = function(event) {
            if (event.data.message == "assistClose") {
                close();
            } else if (event.data.message == "assistPing") {
                if (messageChannel) {
                    messageChannel.port1.postMessage({ message: "assistPong" });
                }
            }
        }
        
        source.postMessage({ message: "assistDiscoverAck" }, allowedOrigin, [ messageChannel.port2 ]);
        setTimeout(function() {
            capture();
        }, 0);
    }

    function close() {
        try {
            messageChannel.port1.close();
        } catch (e) {
            assistLogger.warn("Couldn't close message channel port");
            assistLogger.warn(e);
        }
        messageChannel = undefined;
    }

    function sendInvalidateCache() {
        assistLogger.log("invalidating cache");
        messageChannel.port1.postMessage({ message: "assistInvalidateCache" });
    }
    
    function capture() {
        
        mutationObserver.disconnect();
        assistLogger.log("Capturing iframe content");
        html2canvas(document.body, {
            onrendered: function(canvas) {
                messageChannel.port1.postMessage({ message: "assistCapture", transfer: { 
                    dataUrl: canvas.toDataURL("image/png")
                }});
                
                mutationObserver.observe(document.body, mutationObserverConfig);
            },
            width: window.innerWidth,
            height: window.innerHeight,
            useCORS: true
        });
    }
    
    // TODO: in the new world use build to pull this from utils.js
    function loadScript(src, doc, callback) {
        var doc = doc || document;

        var script = doc.createElement("script");
        script.type = "text/javascript";
        script.src = src;
        
        if (callback) {
            if (script.addEventListener) {
                script.addEventListener("load", callback, false);
            } else if (script.readyState) {
                script.onreadystatechange = callback;
            }
        }
        
        doc.body.appendChild(script);
        
    }

 function isInternetExplorer11() {
        var userAgent = window.navigator.userAgent;
        if (userAgent.indexOf("Trident/7.0") > 0) {
            return true;
        }
        return false;
    }

 
    function initialiseMutationObserver(sdkUrl,callback) {
        var mutationObserverPolyFillUrl = sdkUrl + "../../../shared/js/thirdparty/MutationObserver.js";

        if (isInternetExplorer11()) {
            loadScript(mutationObserverPolyFillUrl, document, function () {
                MutationObserver = JsMutationObserver;
                callback();
            });
        }
        else {
            callback();
        }
    }
})();
