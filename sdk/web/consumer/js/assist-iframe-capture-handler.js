;(function() {

    var iframeOrigins = false;
    var iframeScreenshotHandler;
    var hasPermissionToViewCallback;
    var permissionDefsCallback;
    var sourceWindow;
    var listenerWindow;
    
    var iframeChannels = [];
    
    function deleteChannels(channels) {
        channels = channels.slice(0);
        channels.forEach(function(channel) {
            try {
                clearInterval(channel.pingInterval);
                if (channel.port) {
                    channel.port.postMessage({
                        message: "assistClose"
                    });
                    channel.port.close();
                }
            } catch (e) {
            }
        });

        channels.forEach(function(channel) {
            var index = iframeChannels.indexOf(channel);
            if (index > -1) { 
                iframeChannels.splice(index, 1);
            }
        });
    }

    function IframeChannel(iframe) {
        this.iframe = iframe;
        this.cachedImg = false;
        this.pongReceived = false;

        var self = this;
        
        var removeIframeOnReload = function() {
            console.log("iframe reloaded, so removing from cache");
            deleteChannels([self]);
            iframe.removeEventListener("load", removeIframeOnReload);
            iframeScreenshotHandler();
        };
        
        iframe.addEventListener("load", removeIframeOnReload);
    }
    
    IframeChannel.prototype.setPort = function(port) {
        this.port = port;
        port.onmessage = handlePortMessage;
    };
    
    IframeChannel.prototype.discover = function() {
        this.iframe.contentWindow.postMessage({ 
            message: "assistDiscover"
        }, "*"); // we post to anyone, but we check responses for trust against their origin when we get assistDiscoverAck
    };

    IframeChannel.prototype.ping = function(firstPing) {
        if (this.port && (this.pongReceived == true || firstPing == true)) {
            this.port.postMessage({
                message: "assistPing"
            });
        } else {
            deleteChannels([this]);
            iframeScreenshotHandler();
        }

        this.pongReceived = false;
    };
    
    window.AssistIFrameCaptureHandler = {
        init : function(aSourceWindow, aListenerWindow, origins, handler, aPermissionDefsCallback, aHasPermissionToViewCallback) {
            
            listenerWindow = aListenerWindow;
            sourceWindow = aSourceWindow;
            iframeScreenshotHandler = handler;
            hasPermissionToViewCallback = aHasPermissionToViewCallback;
            permissionDefsCallback = aPermissionDefsCallback;
            
            if (typeof origins !== 'undefined') {
                if (Array.isArray(origins)) {
                    iframeOrigins = origins;    
                } else {
                    iframeOrigins = false; // if the arg is just junk, then disable iframes, since we don't know what the intention was
                }
            } else {
                iframeOrigins = ["*"]; // default to star for backwards compatibility
            }
            
            listenerWindow.addEventListener("message", handleWindowMessage);
        },
        destroy: function() {
            listenerWindow && listenerWindow.removeEventListener("message", handleWindowMessage);
            deleteChannels(iframeChannels);
        },
        addIFrame: function(iframe) {
            
            if (!validateIframeForDrawing(iframe)) {
                return;
            }
            
            var exists = iframeChannels.some(function(iframeChannel) {
                return iframeChannel.iframe === iframe;
            });
            
            if (!exists) {
                var iframeChannel = new IframeChannel(iframe);
                iframeChannels.push(iframeChannel);
                iframeChannel.discover();
            }
        },
        getCachedImg: function(element) {
            var matchingChannels = iframeChannels.filter(function(iframeChannel) {
                return iframeChannel.iframe === element;
            });
            
            if (matchingChannels.length > 0) {
                var channel = matchingChannels[0];
                
                if (!validateIframeForDrawing(channel.iframe)) {
                    console.log("iframe no longer validates, removing and ignoring");
                    return;
                }
               
                return channel.cachedImg;
            }
        },
        isCacheValid: function() {
            var cacheValid = true;
            for (var i = 0, len = iframeChannels.length; i < len; i++) {
                var channel = iframeChannels[i];
                if (validateIframeForDrawing(channel.iframe)) {
                    if (channel.cachedImg == false) {
                        cacheValid = false;
                        break;
                    }
                }
            }
            
            return cacheValid;
        }
    };
    
    function handleWindowMessage(event) {
    
        if (iframeOrigins) {
            var allowedOrigin = false;
            for (var i = 0, len = iframeOrigins.length; i < len; i++) {
                if (iframeOrigins[i] === event.origin || iframeOrigins[i] === "*") {
                    allowedOrigin = true;
                    break;
                }
            }
            
            if (allowedOrigin == true) {
                if (event.data.message === "assistDiscoverAck") {
                    if (event.ports[0]) {
                        var port = event.ports[0];
                        
                        var matchingIframeChannels = iframeChannels.filter(function(iframeChannel) {
                            return iframeChannel.iframe.contentWindow === event.source;
                        });
                        
                        if (matchingIframeChannels.length > 0) {
                            var channel = matchingIframeChannels[0];
                            if (!channel.port) {
                                channel.setPort(port);
                                channel.ping(true);
                                channel.pingInterval = setInterval(function() {
                                    channel.ping(false);
                                }, 15000);
                            } else {
                                console.warn("Got iframe ack for iframe we already have a port for, ignoring");
                            }
                        } else {
                            console.warn("Got a verified ack and port for an iframe we're not tracking, ignoring");
                            try {
                                port.close();
                            } catch (e) {
                            }
                        }

                    } else {
                        console.warn("Got a verified ack from an iframe with no message channel attached, ignoring");
                    }
                }
            }
        } else {
            if (event.data.message === "assistDiscoverAck") {
                console.warn("Potentially malicious iframe attempted to send screenshare data to page without registering");
            }
        }
    }
    
    function isDrawableIframe(iframe) {
        
        if (!iframe) {
            return false; // no iframe
        }
        
        if (!iframeOrigins) {
            return false; // no origins so iframe support is explicitly turned off (default is "*")
        }
        
        if (!sourceWindow.document.body.contains(iframe)) {
            return false; // iframe not attached to document
        }
        
        if (iframe.classList.contains("assist-no-show")) {
            return false; // iframe is masked
        } else {
            var element = iframe;
            while (element.parentNode && element.parentNode.nodeType == Node.ELEMENT_NODE) {
                if (element.parentNode.classList.contains("assist-no-show")) {
                    return false; // ancestor of iframe is masked
                }
                
                element = element.parentNode;
            }
        }
        
        if (hasPermissionToViewCallback) { // iframe may be masked by permissions
            var hasPermissionToViewIframe = hasPermissionToViewCallback(iframe);
            
            if (hasPermissionToViewIframe == true) {
                return true;
            }
        }
        
        return false;
    }
    
    function validateIframeForDrawing(iframe) {
        if (isDrawableIframe(iframe)) {
            return true;
        } else {
            if (iframe) {
                var matchingChannels = iframeChannels.filter(function(iframeChannel) {
                    return iframeChannel.iframe === iframe;
                });
                
                deleteChannels(matchingChannels);
            }
        }
        
        return false;
    }

    function getIframeChannelForEvent(event) {
        var port = event.target;
        if (!port) {
            return;
        }
        
        var matchingChannels = iframeChannels.filter(function(iframeChannel) {
            return iframeChannel.port === port;
        });
        
        if (matchingChannels.length > 0) {
            var channel = matchingChannels[0];
            
            if (!validateIframeForDrawing(channel.iframe)) {
                console.log("iframe no longer validates, removing and ignoring");
                return;
            }

            return channel;
        } else {
            console.warn("No matching channel for port");
            try {
                port.close();
            } catch (e) {
            }
        }
    }
      
    function handlePortMessage(event) {
        
        if (event.data.message == "assistCapture") {
            handleCapture(event);
        } else if (event.data.message == "assistInvalidateCache") {
            handleInvalidateCache(event);
        } else if (event.data.message == "assistPong") {
            handlePong(event);
        }
    }

    function handlePong(event) {
        var channel = getIframeChannelForEvent(event);
        if (!channel || !channel.iframe) {
            return;
        }

        channel.pongReceived = true;
    }

    function handleInvalidateCache(event) {
        var channel = getIframeChannelForEvent(event);
        if (!channel || !channel.iframe) {
            return;
        }

        channel.cachedImg = false;
    }

    function handleCapture(event) {
        
        var channel = getIframeChannelForEvent(event);
        if (!channel || !channel.iframe) {
            return;
        }

        var dataUrl = event.data.transfer.dataUrl;
        
        if (!dataUrl || dataUrl.indexOf("data:image/png") !== 0) {
            console.warn("Expected datauri on channel, ignoring");
            return;
        }

        var width = channel.iframe.clientWidth;
        var height = channel.iframe.clientHeight;

        var img = new Image();
        img.width = width;
        img.height = height;
        
        img.onload = function() {
            channel.cachedImg = img;
            iframeScreenshotHandler(channel.iframe);
        };
        
        img.src = dataUrl;
    }
})();
