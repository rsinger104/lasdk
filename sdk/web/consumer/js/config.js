;(function() {
    
    var SESSION_DATA_NAME = "assist-session-config";
    var LOCAL_STORAGE_DATA_NAME = "assist-localstorage-config";
    var LOCAL_STORAGE_PLUGIN_EXPIRY_KEY = "assist-plugin-prompt-expiry";
    var storage = sessionStorage || false;
        
    window.Config = function(configuration) {
        this.hasVideo = function() {
            if (this.getVideoMode() == "none") {
                return false;
            }
            return true;
        };

        this.trace = function() {
            return configuration.trace || false;
        }
        
        this.hasLocalVideo = function() {
        	return (this.getVideoMode() == "full");
        }
        
        this.hasAudio = function() {
            if (!this.hasDestination()) {
                return false;
            }
            return true;
        };
        
        this.hasDestination = function() {
            if ("destination" in configuration) {
                return true;
            }
            return false;
        };

        this.hasShadowCursor = function() {
            return configuration.shadowCursor;
        };

        this.getShadowCursorDelay = function() {
            return configuration.shadowCursorDelay;
        };
        
        this.getBrowserInfo = function() {
            if ("browserInfo" in configuration) {
                return configuration.browserInfo;
            } else {
                return {};
            }
        };

        this.getSessionToken = function() {
            return configuration.sessionToken;
        };
        
        this.getAllowedIframeOrigins = function() {
            return configuration.allowedIframeOrigins;
        };

        this.setSessionToken = function(sessionToken) {
            if (sessionToken && !configuration.sessionToken) {
                configuration.sessionToken = sessionToken;
            }
            
            save();
        };
        
        this.setPluginUpgradePromptTimeout = function(timeout) {
            if (timeout) {
                configuration.pluginUpgradePromptTimeout = timeout;
            }
            
            save();
        };
        
        this.setPluginUpgradePromptExpiration = function() {
            
            var expires = (1000*24*60*60); // 1 day default
            if ("pluginUpgradePromptTimeout" in configuration) {
                var userSpecifiedTimeout = parseTimestamp(configuration.pluginUpgradePromptTimeout);
                if (userSpecifiedTimeout) {
                    expires = userSpecifiedTimeout;
                } else {
                    console.warn("Could not parse user specified plugin prompt timeout, using default of 1 day");
                }
            }
            
            var now = Date.now();
            var schedule = now + expires;
            
            if (localStorage) {
                try {
                    localStorage.setItem(LOCAL_STORAGE_PLUGIN_EXPIRY_KEY, schedule);
                } catch(e) {
                    console.warn("Couldn't set plugin prompt expiration on local storage");
                }
            }
        };
        
        function parseTimestamp(num) {
            try {
                if (num != '' && !isNaN(parseFloat(num)) && isFinite(num)) {
                    return Math.abs(num);
                }
            } catch(e) {
                return null;
            }
        }
        
        this.hasPluginUpgradePromptExpired = function() {
            
            var expiration;
            if (!localStorage) {
                return true;
            } else {
                try {
                    expiration = localStorage.getItem(LOCAL_STORAGE_PLUGIN_EXPIRY_KEY);
                } catch(e) {
                    console.warn("Couldn't get plugin prompt expiration from storage");
                    return true;
                }
            }
            
            var now = Date.now();  

            var expiresIn = parseTimestamp(expiration);
            if (expiresIn === undefined || expiresIn === null) { 
                expiresIn = 0; 
            }

            if (expiresIn < now) {
                try {
                    localStorage.removeItem(LOCAL_STORAGE_PLUGIN_EXPIRY_KEY);
                } catch(e) {
                }
                return true;
            } else {
                return false;
            }
        }
        
        this.setScreenShareAllowed = function(allowed) {
            configuration.screenShareAllowed = allowed;
            
            save();
            if (isIE()) {
                saveLocally();
            }
        };
        
        this.isScreenShareAllowed = function() {
            return configuration.screenShareAllowed || false;
        };

        this.getDestination = function() {
            return configuration.destination;
        };
        
        this.getUrl = function() {
            return configuration.url;
        };
        
        this.getCorrelationId = function() {
            return configuration.correlationId;
        };

        this.setCorrelationId = function(correlationId) {
            configuration.correlationId = correlationId;
            save();
        };

        this.getUUI = function() {
            return configuration.uui;
        }

        this.setUUI = function(uui) {
            configuration.uui = uui;
            save();
        }
        
        this.getVideoMode = function() {
            if (this.hasDestination() == false) {
                return "none";
            } else if ("videoMode" in configuration && typeof configuration["videoMode"] != 'undefined') {
                return configuration.videoMode;
            } else {
                return "full";
            }
        };
        
        this.getStunServers = function() {
            return configuration.stunservers;
        };
        
        this.getTargetServer = function() {
            return getEncodedServerAddr(this.getUrl());
        };
        
        this.getOriginServer = function() {
            return getEncodedServerAddr();
        };
        
        this.getConnectionEstablished = function() {
        	return configuration.connectionEstablished;
        };
        
        this.getDebugMode = function() {
        	return configuration.debugMode;
        };

        this.setScaleFactor = function(scaleFactor) {
          configuration.scaleFactor = scaleFactor;
          save();
        };

        this.getScaleFactor = function() {
            var scaleFactor = parseFloat(configuration.scaleFactor);
            if (!scaleFactor && scaleFactor !== 0) {
                return undefined;
            }
            return scaleFactor;
        };
        
        this.unset = function() {
            if (storage) {
                storage.removeItem(SESSION_DATA_NAME);
            }
        }
        
    
        function save() {
            if (storage) {
                if (typeof configuration === 'object' && configuration != undefined) {
                    storage.setItem(SESSION_DATA_NAME, JSON.stringify(configuration));
                }
            }
        }
        function saveLocally() {
            if (localStorage && typeof configuration === 'object' && configuration != undefined) {
                    localStorage.setItem(LOCAL_STORAGE_DATA_NAME, JSON.stringify(configuration));
            }
        }
    }

    function getEncodedServerAddr(url) {
        var protocol = window.location.protocol;
        var port = window.location.port;
        var hostname = window.location.hostname;

        var urlToEncode;
        if (url == null) {
            if (port === "") {
                urlToEncode = protocol + "//" + hostname;
            } else {
                urlToEncode = protocol + "//" + hostname + ":" + port;
            }
        } else {
            urlToEncode = url;
        }

        return encodeURIComponent(AssistUtils.Base64.encode(urlToEncode));
    }

    function isIE() {
        var userAgent = window.navigator.userAgent;

        if ((userAgent.indexOf('MSIE') > -1) || (userAgent.indexOf('Trident/') > -1)) {
            return true;
        }
        return false;
    }
})();
