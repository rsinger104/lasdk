(function() {

    window.AssistUtils = {
        /**
         *
         *  Base64 encode / decode
         *  http://www.webtoolkit.info/
         *
         **/
        Base64 : {
        // private property
            _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

        // public method for encoding
            encode : function (input) {
                var output = "";
                var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                var i = 0;

                input = utf8_encode(input);

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
                
                function utf8_encode(string) {
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
                }
            }
        },
        
        getSdkPath : function() {
            return document.getElementsByTagName("base")[0].href;
        },
        
        loadCSS : function(document, url, id) {      
            
            if (id && document.getElementById(id) != null) {
                return;
            }
            
            var link = document.createElement("link");
            
            if (id) {
                link.id = id;
            }
            
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("type", "text/css");
            link.setAttribute("href", url);
            document.getElementsByTagName("head")[0].appendChild(link);
        },
        
        loadScript : function(src, doc, callback) {
            var doc = doc || document;
            
            if (doc.readyState !== 'complete' && !callback) {
                doc.write('<script type="text/javascript" src="' + src + '"><\/script>');
            } else {
                var script = doc.createElement("script");
                script.type = "text/javascript";
                script.src = src;
                
                if (callback) {
                    if(script.addEventListener) {
                        script.addEventListener("load", callback, false);
                    } else if (script.readyState) {
                        script.onreadystatechange = callback;
                    }
                }
                
                doc.body.appendChild(script);
            }
        },
        
        loadScripts : function(urls, document, callback) {
            
            console.log("load scripts");
            var numScripts = urls.length;
            var scriptsLoaded = 0;
            
            var loadedCallback = callback ? doScriptLoadedCallback : null;
            for (var i = 0; i < urls.length; i++) {
                AssistUtils.loadScript(urls[i], document, loadedCallback);
            }
            
            function doScriptLoadedCallback(event) {
                console.log("script loaded: " + event.target.src);
                scriptsLoaded++;

                if (scriptsLoaded == numScripts) {
                    console.log("loaded all scripts");
                    callback();
                }
            }
        },

        hasAgent: function(topic) {
            if (topic && topic.participants) {
                for (var i = 0; i < topic.participants.length; i++) {
                    if (topic.participants[i].metadata.role == "agent") {
                        return true;
                    }
                }
            }
            return false;
        },
        
        isRTL: function(locale) {
            return typeof locale !== "undefined" && locale != null &&
                    (startsWith(locale, "ar") || startsWith(locale, "dv") || startsWith(locale, "fa") || locale === "ha" || startsWith(locale, "ha-") ||
                    startsWith(locale, "he") || startsWith(locale, "khw") || locale === "ks" || startsWith(locale, "ks-") || startsWith(locale, "ku") ||
                    startsWith(locale, "ps") || startsWith(locale, "ur") || startsWith(locale, "yi"));
            function startsWith(str, searchString) {
                return str.lastIndexOf(searchString, 0) === 0;
            }
        },
        
        isFormElement: function(element) {
            return (element.tagName == "INPUT" || element.tagName == "SELECT" || element.tagName == "TEXTAREA");
        },

        hasFormElement: function(element) {
            if (element.querySelectorAll) {
                var inputElements = element.querySelectorAll("input, select, textarea");
                return (inputElements.length > 0);
            }

            return false;
        },

        fakeTopic: function(metadata) {
            this.metadata = metadata || {};
            this.local = true;

            this.sendMessage = function(payload) {
            }
            
            this.openSubtopic = function(metadata, callBack) {
                var newTopic = new AssistUtils.fakeTopic(metadata);
                callBack(newTopic);
            };
            
            this.closeTopic = function(metadata) {};
            this.joinTopic = function(metadata) {};            
            this.leaveTopic = function(metadata) {};
        },

        mergeUnique: function(destination, source) {
            for (var index = 0; index < source.length; index++) {
                var value = source[index];
                if (destination.indexOf(value) === -1) {
                    destination.push(value);
                }
            }
        },

        removeDuplicateNestedNodes: function(nodeList) {
            if (!nodeList) return;

            for (var nodeIdx = 0; nodeIdx < nodeList.length; nodeIdx++) {
                var potentialDescendant = nodeList[nodeIdx];
                if (elementIsDescendantOfAListItem(potentialDescendant)) {
                    nodeList.splice(nodeIdx--, 1);
                }
            }

            function elementIsDescendantOfAListItem(potentialDescendant) {
                for (var nodeIdx = 0; nodeIdx < nodeList.length; nodeIdx++) {
                    var potentialParent = nodeList[nodeIdx];

                    if(!potentialParent.contains) {
                        continue;
                    }

                    if (potentialParent !== potentialDescendant && potentialParent.contains(potentialDescendant)) {
                        return true;
                    }
                }

                return false;
            }
        }
    }
})();