/* DOCUMENT PACKET FILE */

function DocumentPacket(timeoutFunction) {
this.timeoutDocument = timeoutFunction;
}
     
DocumentPacket.prototype.sendPushContent = function (eventHandler, arrayBuffer, contentType,sharedItem,topic) {

    if(!topic.permissions){
        this.sendPushContentVersion10_6(eventHandler, arrayBuffer, contentType,topic);
        return;
    }

    this.sendPushContentVersion11_5(eventHandler, arrayBuffer, contentType,sharedItem,topic);
};

DocumentPacket.prototype.sendPushContentVersion10_6 = function(eventHandler, arrayBuffer, contentType,topic) {

        var content = new Uint8Array(arrayBuffer);
        var startMessage = new Uint8Array(contentType.length + 2);
        var startMessageHeader = new Int16Array(startMessage.buffer, 0, 1);
        startMessageHeader[0] = PUSH_CONTENT_START;
        var startMessagePayload = new Uint8Array(startMessage.buffer, 2);
        for (var i = 0; i < contentType.length; i++) {
            startMessagePayload[i] = contentType.charCodeAt(i);
        }
        topic.sendMessage(startMessage);
        console.log("Sent content start indicator.");

        //Then send the data chunks
        for (var pos = 0; pos < content.length; pos += DATA_CHUNK_SIZE) {
            var chunkSize = Math.min(content.length - pos, DATA_CHUNK_SIZE)
            var chunkMessage = new Uint8Array(chunkSize + 2);
            var chunkMessageHeader = new Int16Array(chunkMessage.buffer, 0, 1);
            chunkMessageHeader[0] = PUSH_CONTENT_CHUNK;
            var endpos = pos + DATA_CHUNK_SIZE;
            var chunkMessagePayload = new Uint8Array(chunkMessage.buffer, 2);
            //Copy the image data into the chunk message
            for (var b = 0; b < DATA_CHUNK_SIZE; b++) {
                chunkMessagePayload[b] = content[pos + b];
            }
            topic.sendMessage(chunkMessage);
            console.log("Sent content data chunk.");
        }

        //Finally send the end indicator
        var endMessage = new Uint8Array(2);
        var endMessageHeader = new Int16Array(endMessage.buffer, 0, 1);
        endMessageHeader[0] = PUSH_CONTENT_END;
        topic.sendMessage(endMessage);
        console.log("Sent content end indicator.");
};
  
DocumentPacket.prototype.sendPushContentVersion11_5 = function (eventHandler, arrayBuffer, contentType, sharedItem,topic) {
    var content = new Uint8Array(arrayBuffer);
    sharedItem.content = content;
    //First send the start message, with the content type (mime type)
    var startMessage = new Uint8Array(contentType.length + 4);
    var startMessageHeader = new Int16Array(startMessage.buffer, 0, 2);
    startMessageHeader[0] = PUSH_CONTENT_START;
    startMessageHeader[1] = sharedItem.id;
    var startMessagePayload = new Uint8Array(startMessage.buffer, 4);
    for (var i = 0; i < contentType.length; i++) {
        startMessagePayload[i] = contentType.charCodeAt(i);
    }
    topic.sendMessage(startMessage);
    console.log("Sent content start indicator; sharedItemId = " + sharedItem.id);
    var _self = this;
    sharedItem.timer = setTimeout(function () { _self.timeoutDocument(sharedItem.id); },
        SHARED_DOCUMENT_TIMEOUT_MILLIS);
};

/* END OF DOCUMENT PACKET FILE */var WINDOW_RESIZED_MESSAGE = 1001;
var WINDOW_MOVED_MESSAGE = 1002;
var WINDOW_RECTANGLE_UPDATED = 1003;
var WINDOW_CLOSED_MESSAGE = 1004;
var SCROLLBAR_VISIBILITY_MESSAGE = 1005;

var ANNOTATIONS_SET = 2001;
var ANNOTATION_ADDED = 2002;

var MOUSE_DOWN_MESSAGE =3001;
var MOUSE_UP_MESSAGE = 3002;
var MOUSE_DOUBLE_CLICK_MESSAGE = 3003;
var MOUSE_MOVE_MESSAGE = 3004;

var PUSH_DOCUMENT_MESSAGE = 4001;
var DOCUMENT_ZOOMED_LEVEL_CHANGED = 4002;
var PUSH_CONTENT_START = 4003;
var PUSH_CONTENT_CHUNK = 4004;
var PUSH_CONTENT_END = 4005;
var SHARED_DOCUMENT_ACCEPTED = 4006;
var SHARED_DOCUMENT_REJECTED = 4007;
var SHARED_DOCUMENT_SUCCEEDED = 4008;
var SHARED_DOCUMENT_FAILED = 4009;
var SHARED_DOCUMENT_CLOSE_REQUEST = 4010;
var SHARED_DOCUMENT_CLOSED = 4011;
var PUSH_CONTENT_METADATA = 4012;

var SNAPSHOT_START = 5001;
var SNAPSHOT_CHUNK = 5002;
var SNAPSHOT_END = 5003;

var INPUT_ELEMENTS_ON_PAGE = 6001;
var INPUT_ELEMENTS_POPULATED = 6002;
var INPUT_AT_LOCATION = 6003;
var INPUT_ELEMENT_CLICKED = 6004;
var INPUT_ELEMENTS_MOVED = 6005;
var INPUT_SELECT_FOCUSED = 6006;
var INPUT_SELECT_BLURRED = 6007;

var SCROLL_UP_MESSAGE = 7001;
var SCROLL_DOWN_MESSAGE = 7002;
var SCROLL_LEFT_MESSAGE = 7003;
var SCROLL_RIGHT_MESSAGE = 7004;

var OFF_ASSIST_MESSAGE = 8001;
var ON_ASSIST_MESSAGE = 8002;

var CURSOR_PING = 9001;

//Used for snapshots and pushed content
var DATA_CHUNK_SIZE = 1400;

var PUSH_METHOD_URL = 1;
var PUSH_METHOD_CONTENT = 2;

var INPUT_ELEMENT_TYPES = [];

var INITIATOR_UNKNOWN = 0;
var INITIATOR_CONSUMER = 1;
var INITIATOR_AGENT = 2;
var INITIATOR_CLOSE_SCREENSHARE = 3;
var initiatorStrings = {};
initiatorStrings[INITIATOR_UNKNOWN] = "unknown";
initiatorStrings[INITIATOR_CONSUMER] = "consumer";
initiatorStrings[INITIATOR_AGENT] = "agent";
initiatorStrings[INITIATOR_CLOSE_SCREENSHARE] = "endSupport";


var CONNECTION_ERROR = 2;
var DOCUMENT_ERROR = 1;
 
var SHARED_DOCUMENT_ERROR_CONNECTION_ERROR = 1;
var SHARED_DOCUMENT_ERROR_HTTP_ERROR = 2;
var SHARED_DOCUMENT_ERROR_UNSUPPORTED_MIME_TYPE = 3;
var SHARED_DOCUMENT_ERROR_FILE_PARSING_ERROR = 4;
var SHARED_DOCUMENT_ERROR_NO_DATA_RECEIVED = 5;
var SHARED_DOCUMENT_ERROR_CO_BROWSE_NOT_ACTIVE = 6;

var assistSdkUrl;
var spotlightEnabledCallback;

var zoomStartedCallback;
var zoomEndedCallback;

var sharedItemErrorTextMessages = {};
sharedItemErrorTextMessages[SHARED_DOCUMENT_ERROR_CONNECTION_ERROR] = "Connection error";
sharedItemErrorTextMessages[SHARED_DOCUMENT_ERROR_HTTP_ERROR] = "HTTP error";
sharedItemErrorTextMessages[SHARED_DOCUMENT_ERROR_UNSUPPORTED_MIME_TYPE] =
	"Unsupported MIME type";
sharedItemErrorTextMessages[SHARED_DOCUMENT_ERROR_FILE_PARSING_ERROR] = "File parsing error";
sharedItemErrorTextMessages[SHARED_DOCUMENT_ERROR_NO_DATA_RECEIVED] = "No data received";
sharedItemErrorTextMessages[SHARED_DOCUMENT_ERROR_CO_BROWSE_NOT_ACTIVE] = "Co-browse not active";

var pdfWorkerBlobURL;
var SHARED_DOCUMENT_TIMEOUT_MILLIS = 5 * 60 * 1000;   //5 minutes

var DEVICE_INPUT_TYPE = (window.PointerEvent) ? "pointer" : "mouse";
var SHARED_DOCUMENT_METADATA_FRAGMENT = "#sharedDocMetadata="

//TODO: move this somewhere else - both consumer and agent side need it, though.
window.isIE = (function() {

    try {
        var userAgent = window.navigator.userAgent;

        if ((userAgent.indexOf('MSIE') > -1) || (userAgent.indexOf('Trident/') > -1)) {
            return true;
        }
        return false;
    } catch(e) {
        return false;
    }
})();

function hasChildDocumentWindows(parent) {
    var hasDocuments = false; 
    for (var x = 0; x < parent.children.length; x++) {
        if (typeof parent.children[x].metadata.sharedItemId !== 'undefined') {
            hasDocuments = true;
            break;
        }
    }
    return hasDocuments;
}

function zoomWindowOpen() {
    return document.getElementById("assist-zoom-window") != null;
}

// Split any multi-byte characters into single bytes so we can put the string in a Uint8Array
function encodeMultiByteCharacters(unencodedString) {
    return unescape(encodeURIComponent(unencodedString));
}

function decodeMultiByteCharacters(encodedString) {
    return decodeURIComponent(escape(encodedString));
}

// Percent-encode any characters that are not allowed in a URL
function encodeURLIfNecessary(url) {
    var decodedURL = decodeURI(url);
    if (decodedURL == url) {
        // Either the URL has not been encoded, or encoding has no effect.
        return encodeURI(url);
    }
    else {
        // The URL has already been encoded.
        return url;
    }
}

function unescapeAndParse(escapedUTF8String) {
    return JSON.parse(decodeMultiByteCharacters(escapedUTF8String));
}

function stringifyAndEscape(jsonObject) {
    return encodeMultiByteCharacters(JSON.stringify(jsonObject));
}

function addClassSvg(element, classToAdd) {
    var classes = (element.getAttribute("class") || "").split(" ");
    for (var i = 0; i < classes.length; i++) {
        if (classes[i] == classToAdd) {
            return; // already has 'classToAdd'
        }
    }

    element.setAttribute("class", element.getAttribute("class") + " " + classToAdd);
}

function removeClassSvg(element, classToRemove) {
    var className = (element.getAttribute("class") + "").replace(classToRemove, "").trim();
    element.setAttribute("class", className);
}

function getStyle(className_, window) {
    var styleSheets = window.document.styleSheets;
    var styleSheetsLength = styleSheets.length;
    for(var i = 0; i < styleSheetsLength; i++){
        var classes = styleSheets[i].rules || styleSheets[i].cssRules;
        var classesLength = classes.length;
        for (var x = 0; x < classesLength; x++) {
            if (classes[x].selectorText == className_) {
                var ret;
                if(classes[x].cssText){
                    ret = classes[x].cssText;
                } else {
                    ret = classes[x].style.cssText;
                }
                if(ret.indexOf(classes[x].selectorText) == -1){
                    ret = classes[x].selectorText + "{" + ret + "}";
                }
                return ret;
            }
        }
    }
}

(function(){
INPUT_ELEMENT_TYPES[1] = "text";
INPUT_ELEMENT_TYPES[2] = "radio";
INPUT_ELEMENT_TYPES[3] = "checkbox";
    for (var i = 0; i < INPUT_ELEMENT_TYPES.length; i++) {
        if (INPUT_ELEMENT_TYPES[i]) {
            INPUT_ELEMENT_TYPES[INPUT_ELEMENT_TYPES[i]] = i;
        }
    }
}());

var IMAGE_FORMAT = [];
IMAGE_FORMAT[1] = "png";
IMAGE_FORMAT[2] = "jpeg";
IMAGE_FORMAT.PNG = IMAGE_FORMAT.indexOf("png");
IMAGE_FORMAT.JPEG = IMAGE_FORMAT.indexOf("jpeg");

var SVG_NAMESPACE = "http://www.w3.org/2000/svg";

var IGNORE_INTERACTION_FLAG = "ignore-interaction";

var getPixelValue = function(attribute, parentValue) {
    // Only handles px or %
    if (attribute.indexOf && attribute.indexOf("%") > -1) {
        return parseFloat(attribute) / 100 * parentValue;
    }
    return parseFloat(attribute);
};

var fromString = function(string, payload) {
    payload = payload || new Uint8Array(string.length);
    var encodedString = encodeMultiByteCharacters(string);
    for (var i = 0; i < encodedString.length; i++) {
        payload[i] = encodedString.charCodeAt(i);
    }
    return payload;
};

function deepCloneWithNameSpace(svg, el, ns) {
    var nsEl = svg.ownerDocument.createElementNS(ns, el.localName);

    Array.prototype.slice.call(el.attributes).forEach(function(attribute) {
        nsEl.setAttribute(attribute.name, attribute.value);
    });

    while (el.firstChild) {
        if (el.firstChild.namespaceURI != ns) {
            nsEl.appendChild(deepCloneWithNameSpace(svg, el.firstChild, ns));
            el.removeChild(el.firstChild);
        } else {
            nsEl.appendChild(el.firstChild);
        }
    }

    return nsEl;
};

//Get the x and y coords of an HTML element.
//Taken from http://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element
function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

//Pass a variable number of elements as arguments.  Get back the left, top, right, and bottom edges
//of the bounding box around the elements.
function getBoundingBox() {
	var elements = arguments;
	var minLeft = null;
	var minTop = null;
	var maxRight = null;
	var maxBottom = null;
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];
		if (element == null)
			continue;
		var offset = getOffset(element);
		var style = element.ownerDocument.defaultView.getComputedStyle(element);
		var left = offset.left;
		var top = offset.top;
		var width = parseFloat(style.width);
		var height = parseFloat(style.height);
		var right = left + width;
		var bottom = top + height;
		if (minLeft == null || left < minLeft)
			minLeft = left;
		if (minTop == null || top < minTop)
			minTop = top;
		if (maxRight == null || right > maxRight)
			maxRight = right;
		if (maxBottom == null || bottom > maxBottom)
			maxBottom = bottom;
	}
	return { left:minLeft, top:minTop, right:maxRight, bottom:maxBottom };
}

function SharedWindow(topic, element, parentWindow, cleanUpElement) {
    var _self = this;

    this.topic = topic;
    this.element = element;

    this.maxUpdateInterval = 100;

    this.parentWindow = parentWindow;
    var clientRect = _self.element.getBoundingClientRect();
    var parentRect = _self.element.parentNode.getBoundingClientRect();
    this.width = clientRect.width || parentRect.width;
    this.height = clientRect.height || parentRect.height;

    this.children = [];

    this.messageHandlers = [];

    this.metadata = topic.metadata;

    this.moving = false;
	this.cleanUpElement = !!cleanUpElement;

    var documentEventListeners = [];

    if (DEVICE_INPUT_TYPE === "pointer") {
        element.style.touchAction = "none";
    }

    _self.closed = function(initiator) {
    	console.log("In SharedWindow.closed().");

        var elChildren = _self.element.children;
        if (elChildren && typeof elChildren !== undefined) {
          for (var i=0; i < elChildren.length; i++) {
            var child = elChildren[i];
            if (child.classList && (typeof child.classList !== undefined) && child.classList.contains('move-handle')) {
              _self.element.removeChild(child);
              break;
            } 
          }
        }
        _self.element.removeAttribute("data-html2canvas-ignore");

        if (_self.element.classList && typeof _self.element.classList !== undefined) {
          _self.element.classList.remove("shared-element");
          _self.element.classList.remove("moveable");
        }

        try {
            if (cleanUpElement) {
                _self.element.parentNode.removeChild(_self.element);
            }
            _self.removeElementEventListeners();
        } catch(e) {
            console.warn(e);
        }

        if (_self.parentWindow) {
        	if (_self.parentWindow.children.indexOf(_self) != -1) {
        		_self.parentWindow.children.splice(_self.parentWindow.children.indexOf(_self),
        				1);
        	} else {
        		console.log("_self not found in list of parent window's children!");
        	}
        }

        for (var i = _self.children.length; i > 0; i--) {
            _self.children[i - 1].closed(initiator);
        }
    };
    
    _self.deleteStaleCanvas = function() {
            if (window.staleCanvas && window.staleCanvas.parentElement) {
                var parent = window.staleCanvas.parentElement;
                parent.removeChild(window.staleCanvas);
                window.staleCanvas = undefined;
            }
    }

    topic.subtopicClosed = function(closingSubtopic) {
    	var closerParticipant = closingSubtopic.owner;
    	var role = closerParticipant.metadata.role;
    	var initiator;
    	if (role == "consumer") {
    		initiator = INITIATOR_CONSUMER;
    	} else if (role == "agent") {
    		initiator = INITIATOR_AGENT;
    	} else {
    		initiator = INITIATOR_UNKNOWN;
    	}
    	console.log("In topic.subtopicClosed(); role = " + role);
        for (var i = 0; i < _self.children.length; i++) {
            if (_self.children[i].topic === closingSubtopic) {
                _self.children[i].closed(initiator);
                break;
            }
        }

        if (closingSubtopic.metadata.type == "zoom-window") {
            if (zoomEndedCallback) {
                zoomEndedCallback();
            }
        }
    };

    _self.addDocumentEventListener = function(eventName, listener) {
        var eventDesc = {name : eventName, listener : listener};
        documentEventListeners.push(eventDesc);
        _self.element.ownerDocument.addEventListener(eventName, listener);
    };

    var elementEventListeners = [];
    _self.addElementEventListener = function(anElement, eventName, listener) {
        var eventDesc = {element : anElement, name : eventName, listener : listener};
        elementEventListeners.push(eventDesc);
        anElement.addEventListener(eventName, listener);
    };

    _self.deleteElementEventListeners = function() {

        while(elementEventListeners.length) {
            var elementEventDesc = elementEventListeners.shift();
            elementEventDesc.element.removeEventListener(elementEventDesc.name, elementEventDesc.listener);
        }

        while (documentEventListeners.length) {
            var docEventDesc = documentEventListeners.shift();
            _self.element.ownerDocument.removeEventListener(docEventDesc.name, docEventDesc.listener);
        }
        documentEventListeners = [];
        elementEventListeners = [];

    };

    _self.removeElementEventListeners = function() {

        for (var j = 0; j< elementEventListeners.length; j++) {
            var elementEventDesc = elementEventListeners[j];
            elementEventDesc.element.removeEventListener(elementEventDesc.name, elementEventDesc.listener);
            _self.removeWrapped(elementEventDesc.name, elementEventDesc.element, elementEventDesc.listener);
        }

        for (var i = 0; i < documentEventListeners.length; i++) {
            var docEventDesc = documentEventListeners[i];
            _self.element.ownerDocument.removeEventListener(docEventDesc.name, docEventDesc.listener);
            _self.removeWrapped(docEventDesc.name, _self.element.ownerDocument, docEventDesc.listener);
        }
    };

    _self.ownerDocumentChanged = function() {
        for (var i = 0; i < documentEventListeners.length; i++) {
            var docEventDesc = documentEventListeners[i];
            _self.wrapEventListener(docEventDesc.name, _self.element.ownerDocument, docEventDesc.listener);
        }
        // Delete any previous wrapped listeners as they're broken anyway
        for (var j = 0; j< elementEventListeners.length; j++) {
            var elementEventDesc = elementEventListeners[j];
            delete elementEventDesc.element.wrappedListeners;
            delete elementEventDesc.element.previousFunc;
        }
        for (var j = 0; j< elementEventListeners.length; j++) {
            var elementEventDesc = elementEventListeners[j];
            _self.wrapEventListener(elementEventDesc.name, elementEventDesc.element, elementEventDesc.listener);
        }
        for (var k = 0; k < _self.children.length; k++) {
            _self.children[k].ownerDocumentChanged();
        }
    };

    _self.wrapEventListener = function(eventName, element, listener) {
        var listenerHandleName = "on" + eventName;
        if (!element.previousFunc) {
            element.previousFunc = [];
        }
        if (!element.wrappedListeners) {
            element.wrappedListeners = [];
        }
        if (!element.wrappedListeners[eventName]) {
            var previousFunc = element[listenerHandleName];
            element[listenerHandleName] = function (event) {
                if (element.previousFunc[eventName]) {
                    element.previousFunc[eventName](event);
                }
                if (element.wrappedListeners[eventName]) {
                    for (var i = 0; i < element.wrappedListeners[eventName].length; i++)
                        element.wrappedListeners[eventName][i](event);
                }
            };
            element[listenerHandleName].isWrapper = true;
            if (previousFunc && !previousFunc.isWrapper) {
                element.previousFunc[eventName] = previousFunc;
            }
            element.wrappedListeners[eventName] = [];
        }
        element.wrappedListeners[eventName][element.wrappedListeners[eventName].length] = listener;
    };

    _self.removeWrapped = function(eventName, element, listener) {
        if (element.wrappedListeners && element.wrappedListeners[eventName]) {
            for (var i = 0; i < element.wrappedListeners[eventName].length; i++) {
                if (element.wrappedListeners[eventName][i] === listener) {
                    element.wrappedListeners[eventName].splice(i, 1);
                    if (element.wrappedListeners[eventName].length == 0) {
                        delete element.wrappedListeners[eventName];
                        element["on" + eventName] = element.previousFunc[eventName];
                        delete element.previousFunc[eventName];
                    }
                    return;
                }
            }
        }
    };

    _self.elementChanged = function(oldElement, newElement) {
        if (oldElement == _self.element) {
            _self.element = newElement;
        }
        for (var i = 0; i< elementEventListeners.length; i++) {
            var elementEventDesc = elementEventListeners[i];
            if (elementEventDesc.element === oldElement) {
                elementEventDesc.element.removeEventListener(elementEventDesc.name, elementEventDesc.listener);
                elementEventDesc.element = newElement;
                elementEventDesc.element.addEventListener(elementEventDesc.name, elementEventDesc.listener);
            }
        }
        // move any handles to the new window
        var handles = oldElement.getElementsByClassName("handle");
        for (var j = 0; j < handles.length; j++) {
            newElement.appendChild(handles[j]);
            // TODO we could refresh the listeners now, but we should expect the owner document changed call later anyway
        }
        // Move the new window to the location of the old
        newElement.style.top = oldElement.style.top;
        newElement.style.left = oldElement.style.left;
    };

    // Listen for subtopics
    topic.subtopicOpened = function(newSubtopic) {
        switch (newSubtopic.metadata.type) {
            case "shared-window":
                // There is a new child window which wasn't created locally
                var childDiv = _self.element.ownerDocument.createElement("div");
                childDiv.classList.add("child-shared-div");
                if (!newSubtopic.metadata.interactive) {
                    childDiv.classList.add("non-interactive");
                }

                if (newSubtopic.metadata.name == "draggable-agent-window") {
                    childDiv.classList.add("stay-on-top");
                }

                _self.element.appendChild(childDiv);

                _self.children.push(new ClientSharedWindow(newSubtopic, childDiv, _self, true));
                newSubtopic.join();
                break;
            case "annotation":
                var annotationImg = _self.element.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
                addClassSvg(annotationImg, "annotation-layer"); // ie doesn't support classList on svg
                _self.element.appendChild(annotationImg);
                _self.children.push(new AnnotationWindow(newSubtopic, annotationImg, _self, true));
                newSubtopic.join();
                _self.sendResizedMessage();
                break;
            case "spotlight":
                console.log("Subtopic Opened - Adding Spotlight SVG");
                var spotlightDiv = _self.element.ownerDocument.createElement("div");
                addClassSvg(spotlightDiv, "spotlight-layer"); //ie
                _self.element.appendChild(spotlightDiv);
                _self.children.push(new SpotlightWindow(newSubtopic, spotlightDiv, _self, true));
                newSubtopic.join();
                _self.sendResizedMessage();
                break;
            case "zoom-window":
                var childDiv = _self.element.ownerDocument.createElement("div");
                childDiv.classList.add("child-shared-div");
                childDiv.classList.add("non-interactive");
                childDiv.classList.add("stay-on-top");
                childDiv.classList.add("zoom-window");
                childDiv.id = "assist-zoom-window";
                // Hide window until the correct size has been sent by the consumer
                childDiv.style.visibility = "hidden";

                _self.element.appendChild(childDiv);
                
                var newZoomWindow = new ClientSharedWindow(newSubtopic, childDiv, _self, true);
                addZoomFunctionality(newZoomWindow, newZoomWindow.drawCanvas, _self.drawCanvas);
                _self.children.push(newZoomWindow);
                newSubtopic.join();
                
                break;
        }
    };

    if (_self.metadata.moveable) {
        _self.element.classList.add("moveable");
        var moveHandle = _self.element.ownerDocument.createElement("div");
        moveHandle.classList.add("move-handle");
        moveHandle.classList.add("handle");
        moveHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        moveHandle.setAttribute("data-html2canvas-ignore", "true");
        _self.element.appendChild(moveHandle);

        _self.moveHandle = moveHandle;

        // add javascript listeners for mouse events to the parent div if this window can be moved
        var xStart;
        var yStart;
        var lastEvent;

        //The number of pixels on each side of the shared window that must remain visible.
        var mustRemainVisibleGlobalPixels = _self.metadata.mustRemainVisiblePixels;
        //(Optional) The number of pixels at the bottom of the shared window that must remain visible.
        //This can be different from the number of pixels on the other sides of the shared window that
        //must remain visible.
        var mustRemainVisibleBottomGlobalPixels = _self.metadata.mustRemainVisibleBottomPixels;

        _self.adjustPosition = function(xLocalDelta, yLocalDelta) {
            var boundingBox = getBoundingBox(_self.element, _self.resizeHandle, _self.closeHandle,
            		_self.moveHandle);

            var parentWindowOffset = getOffset(_self.parentWindow.element);
            var parentLeft = parentWindowOffset.left;
            var parentTop = parentWindowOffset.top;
            var parentWindowElemStyle = _self.parentWindow.element.ownerDocument.defaultView.getComputedStyle(_self.parentWindow.element);
            var parentWidth = parseFloat(parentWindowElemStyle.width);
            var parentHeight = parseFloat(parentWindowElemStyle.height);
            var parentRight = parentLeft + parentWidth;
            var parentBottom = parentTop + parentHeight;
            var allowedOffScreenHorizPixels = 0;
            var allowedOffScreenVertPixels = 0;
            var allowedOffScreenTopPixels;
          	var boundingBoxWidth = boundingBox.right - boundingBox.left + 1;
        	var boundingBoxHeight = boundingBox.bottom - boundingBox.top + 1;
            if (mustRemainVisibleGlobalPixels != null) {
            	var mustRemainVisibleHorizPixels =
            		_self.scaleXToLocalPixels(mustRemainVisibleGlobalPixels);
            	var mustRemainVisibleVertPixels =
            		_self.scaleYToLocalPixels(mustRemainVisibleGlobalPixels);
            	allowedOffScreenHorizPixels = boundingBoxWidth - mustRemainVisibleHorizPixels;
            	allowedOffScreenVertPixels = boundingBoxHeight - mustRemainVisibleVertPixels;
            }
            if (mustRemainVisibleBottomGlobalPixels != null) {
            	var mustRemainVisibleBottomPixels =
            		_self.scaleYToLocalPixels(mustRemainVisibleBottomGlobalPixels);
            	allowedOffScreenTopPixels = boundingBoxHeight - mustRemainVisibleBottomPixels;
            } else {
            	allowedOffScreenTopPixels = allowedOffScreenVertPixels;
            }

            if (boundingBox.left + xLocalDelta < parentLeft - allowedOffScreenHorizPixels) {
            	xLocalDelta = parentLeft - boundingBox.left - allowedOffScreenHorizPixels;
            }
            if (boundingBox.top + yLocalDelta < parentTop - allowedOffScreenTopPixels) {
            	yLocalDelta = parentTop - boundingBox.top - allowedOffScreenTopPixels;
            }
            if (boundingBox.right + xLocalDelta >
            	parentRight + allowedOffScreenHorizPixels)
            {
            	xLocalDelta = parentRight - boundingBox.right + allowedOffScreenHorizPixels;
            }
            if (boundingBox.bottom + yLocalDelta >
            	parentBottom + allowedOffScreenVertPixels)
            {
            	yLocalDelta = parentBottom - boundingBox.bottom + allowedOffScreenVertPixels;
            }

            // Convert to the global coordinate system
            var xGlobalDelta = _self.scaleXToGlobal(xLocalDelta);
            var yGlobalDelta = _self.scaleYToGlobal(yLocalDelta); //yLocalDelta / parseInt(div.offsetHeight) * parseInt(_self.drawCanvas.height);

            var top = _self.element.style.top;
            var left = _self.element.style.left;

            // In theory these values should actually be better, but they're rounded which causes some issues
            // they're still better than nothing though
            if (!top || !left) {
                var clientRect = _self.element.getBoundingClientRect();
                top = clientRect.top;
                left = clientRect.left;
            }

            var xPrevious = getPixelValue(left, _self.parentWindow.width);
            var yPrevious = getPixelValue(top, _self.parentWindow.height);

            var xNew = xPrevious + xGlobalDelta;
            var yNew = yPrevious + yGlobalDelta;

            var xNewLocal = _self.scaleXToLocal(xNew);
            var yNewLocal = _self.scaleYToLocal(yNew);

            _self.element.style.left = xNewLocal;
            _self.element.style.top = yNewLocal;
            
            if(_self.isZoomWindow) {
                // Display a different section of the existing canvas because we moved
                _self.refreshImage();
            }

            // Limit sending events to the max update interval
            var now = new Date();
            if (lastEvent) {
              if ((lastEvent.getTime() + _self.maxUpdateInterval) < now.getTime()) {
                  _self.sendMovedMessage(xNew, yNew);
                  lastEvent = now;

                  if (_self.parentWindow instanceof HostSharedWindow) {
                      _self.clearAnnotations();
                  }
              }
            }
        };

        var moveActionHandler = function(event) {
              if (_self.moving) {
                  // Calculate the delta in the local coordinate system
                  var xLocalDelta = event.clientX - xStart;
                  var yLocalDelta = event.clientY - yStart;

                  xStart = event.clientX;
                  yStart = event.clientY;

                  _self.adjustPosition(xLocalDelta, yLocalDelta);
                  event.preventDefault();
                  event.stopPropagation();
              }
          };

        var downActionHandler = function(event) {
             if (event.button == 0) {
                 xStart = event.clientX;
                 yStart = event.clientY;
                 lastEvent = new Date();
                 _self.moving = true;
                 _self.element.parentNode.style.pointerEvents = "all";
                 _self.element.style.transition = "";
                 event.preventDefault();
                 event.stopPropagation();
             }
        };

        var upActionHandler = function(event) {
              if (event.button == 0 && _self.moving) {
                  _self.moving = false;
                  _self.element.parentNode.style.pointerEvents = "";
                  var globalX = getPixelValue(_self.element.style.left, _self.parentWindow.width);
                  var globalY = getPixelValue(_self.element.style.top, _self.parentWindow.height);
                  _self.sendMovedMessage(globalX, globalY);
                  event.preventDefault();
                  event.stopPropagation();
                  if (_self.isZoomWindow && _self.hasScaledCanvas) {
                      // We have stopped moving, so send the new high-quality image to the agent.
                      _self.refreshImage(null, true);
                  }
              }
        };

        if (DEVICE_INPUT_TYPE === "pointer") {
            moveHandle.style.touchAction = "none";
        }

        _self.addElementEventListener(moveHandle, DEVICE_INPUT_TYPE.concat("down"), downActionHandler);
        _self.addDocumentEventListener(DEVICE_INPUT_TYPE.concat("move"), moveActionHandler);
        _self.addDocumentEventListener(DEVICE_INPUT_TYPE.concat("up"), upActionHandler);

        this.sendMovedMessage = function(xNew, yNew) {
            var movedMessage = new Int16Array(4);
            movedMessage[0] = WINDOW_MOVED_MESSAGE;
            movedMessage[1] = xNew;
            movedMessage[2] = yNew;
            movedMessage[3] = _self.moving ? 1 : 0;
            topic.sendMessage(movedMessage);
        };
    }

    if (topic.metadata.resizeable) {
        // add handles and javascript listeners for mouse events to the parent div if this window can be resized
        var resizeHandle = _self.element.ownerDocument.createElement("div");
        resizeHandle.classList.add("handle");
        resizeHandle.classList.add("resize-handle");
        resizeHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        resizeHandle.setAttribute("data-html2canvas-ignore", "true");

        _self.resizeHandle = resizeHandle;

        _self.resizing = false;
        var startX;
        var startY;

        var downActionHandler = function(event){
            if(event.button === 0) {
                _self.resizing = true;
                _self.element.style.border = "2px solid black";
                startX = event.clientX;
                startY = event.clientY;
                event.preventDefault();
                event.stopPropagation();
            }
        };
        var moveActionHandler = function(event) {
            if (_self.resizing) {
                var deltaX = event.clientX - startX;
                var deltaY = event.clientY - startY;

                var boundingBox = getBoundingBox(_self.element, _self.resizeHandle, _self.closeHandle,
                        _self.moveHandle);

                var parentWindowOffset = getOffset(_self.parentWindow.element);
                var parentLeft = parentWindowOffset.left;
                var parentTop = parentWindowOffset.top;
                var parentWindowElemStyle = _self.parentWindow.element.ownerDocument.defaultView.getComputedStyle(_self.parentWindow.element);
                var parentWidth = parseFloat(parentWindowElemStyle.width);
                var parentHeight = parseFloat(parentWindowElemStyle.height);
                var parentRight = parentLeft + parentWidth;
                var parentBottom = parentTop + parentHeight;

                // Make sure the user can't enlarge the window so the bottom or right edges hang outside
                // of the containing window.
                if (boundingBox.right + deltaX > parentRight) {
                    deltaX = parentRight - boundingBox.right;
                }
                if (boundingBox.bottom + deltaY > parentBottom) {
                    deltaY = parentBottom - boundingBox.bottom;
                }

                var scaledDeltaX = _self.scaleXToGlobal(deltaX);
                var scaledDeltaY = _self.scaleYToGlobal(deltaY);

                if (topic.metadata.maintainAspect) {
                    var elementAspect = _self.height / _self.width;

                    if (Math.abs(deltaY * elementAspect) > Math.abs(deltaX / elementAspect)) {
                        scaledDeltaX = scaledDeltaY / elementAspect;
                    } else {
                        scaledDeltaY = scaledDeltaX * elementAspect;
                    }
                }

                // TODO should we draw a resize guide showing the size the element will be once it's resized, or resize the actual element?
                // We should probably avoid resizing the actual content
                _self.resizeElement(scaledDeltaX, scaledDeltaY);
                event.preventDefault();
                event.stopPropagation();
                startX = event.clientX;
                startY = event.clientY;
            }
        };
        var upActionHandler = function(event) {
              if(event.button === 0 && _self.resizing) {
                  _self.resizing = false;
                  _self.element.style.border = "";
                  _self.resizeElement(0, 0, 0);
                  event.preventDefault();
                  event.stopPropagation();
              }
        };

        if (DEVICE_INPUT_TYPE === "pointer") {
            resizeHandle.style.touchAction = "none";
        }

        _self.addElementEventListener(resizeHandle, DEVICE_INPUT_TYPE.concat("down"), downActionHandler);
        _self.addDocumentEventListener(DEVICE_INPUT_TYPE.concat("move"), moveActionHandler);
        _self.addDocumentEventListener(DEVICE_INPUT_TYPE.concat("up"), upActionHandler);

        _self.element.appendChild(resizeHandle);
    }

    if (topic.metadata.closeable) {
        // Add a close handle
        var closeHandle = _self.element.ownerDocument.createElement("div");
        closeHandle.classList.add("close-handle");
        closeHandle.classList.add("handle");
        closeHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        closeHandle.setAttribute("data-html2canvas-ignore", "true");

        var downActionHandler = function(event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        _self.addElementEventListener(closeHandle, DEVICE_INPUT_TYPE.concat("down"), downActionHandler);
        _self.element.appendChild(closeHandle);
        _self.closeHandle = closeHandle;
    }

    _self.close = function(initiator) {
        var closeMessage = new Int16Array(2);
        closeMessage[0] = WINDOW_CLOSED_MESSAGE;
        closeMessage[1] = initiator;
        topic.sendMessage(closeMessage);
        topic.leave();
        _self.closed(initiator);
    };

    this.messageHandlers[WINDOW_CLOSED_MESSAGE] = function(message) {
    	console.log("Received WINDOW_CLOSED_MESSAGE.");
        var initiator = new Int16Array(message.buffer, 2, 1)[0];
        topic.leave();
        _self.closed(initiator);
    };

    if(topic.metadata.zoomable) {
        var zoomInHandle = _self.element.ownerDocument.createElement("div");
        zoomInHandle.classList.add("handle");
        zoomInHandle.classList.add("zoom-in-handle");
        _self.addElementEventListener(zoomInHandle, "click", function(event) {
            _self.zoomIn();
            event.preventDefault();
            event.stopPropagation();
        });
        zoomInHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        zoomInHandle.setAttribute("data-html2canvas-ignore", "true");
        
        _self.element.appendChild(zoomInHandle);

        var zoomOutHandle = _self.element.ownerDocument.createElement("div");
        zoomOutHandle.classList.add("handle");
        zoomOutHandle.classList.add("zoom-out-handle");
        _self.addElementEventListener(zoomOutHandle, "click", function(event) {
            _self.zoomOut();
            event.preventDefault();
            event.stopPropagation();
        });
        zoomOutHandle.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        zoomOutHandle.setAttribute("data-html2canvas-ignore", "true");
        
        _self.element.appendChild(zoomOutHandle);

        _self.zoomLevel = 100;
        _self.minZoomLevel = 25;
        _self.maxZoomLevel = 300;

        var zoomLevelIndicator = _self.element.ownerDocument.createElement("input");
        zoomLevelIndicator.type = "text";
        zoomLevelIndicator.classList.add("handle");
        zoomLevelIndicator.classList.add("zoom-indicator");
        zoomLevelIndicator.setAttribute(IGNORE_INTERACTION_FLAG, "true");
        zoomLevelIndicator.setAttribute("data-html2canvas-ignore", "true");
        
        _self.element.appendChild(zoomLevelIndicator);

        _self.updateZoomLevelIndicator = function () {
            zoomLevelIndicator.value = i18n.t("assistI18n:shared.formattedPercent", {"number": _self.zoomLevel});
        }
        
        _self.addElementEventListener(zoomLevelIndicator, "blur", function(event) {
            var indicatorValue = parseInt(zoomLevelIndicator.value);
            if (indicatorValue) {
                indicatorValue = Math.min(_self.maxZoomLevel, indicatorValue);
                indicatorValue = Math.max(_self.minZoomLevel, indicatorValue);
                _self.zoomLevel = indicatorValue;
                _self.applyZoom();
            }
            _self.updateZoomLevelIndicator();
        });

        _self.addElementEventListener(zoomLevelIndicator, "keypress", function(event) {
           if (event.keyCode == 13) {
               zoomLevelIndicator.blur();
           }
        });

        // This is here as the event listeners which send mouse events to the remote endpoint would normally prevent the default action.
        _self.addElementEventListener(zoomLevelIndicator,"click", zoomLevelIndicator.focus);

        _self.sendZoomLevelChangedMessage = function() {
            _self.updateZoomLevelIndicator();
            var zoomInMessage = new Int16Array(2);
            zoomInMessage[0] = DOCUMENT_ZOOMED_LEVEL_CHANGED;
            zoomInMessage[1] = _self.zoomLevel;
            topic.sendMessage(zoomInMessage);
        };

        _self.zoomIn = function() {
            _self.zoomLevel = Math.min(_self.zoomLevel + (10 * Math.max(5, Math.round(_self.zoomLevel / 100))), _self.maxZoomLevel);
            _self.applyZoom();
        };

        _self.zoomOut = function() {
            _self.zoomLevel = Math.max(_self.zoomLevel - (10 * Math.max(5, Math.round(_self.zoomLevel / 100))), _self.minZoomLevel);
            _self.applyZoom();
        };
        _self.applyZoom = function() {
            _self.sendZoomLevelChangedMessage();
        };

        _self.messageHandlers[DOCUMENT_ZOOMED_LEVEL_CHANGED] = function(message) {
            _self.zoomLevel = new Int16Array(message.buffer, 2, 1)[0];
            _self.updateZoomLevelIndicator();
              if(_self.refreshPdfContent) {
                _self.refreshPdfContent();
            }
        };
    }

    this.openSharedWindowSubTopic = function(elementToShare, metadata, createdCallBack, scaleFactor, cleanUpElement) {
        topic.openSubtopic(metadata, function(newSubtopic){
            var newWindow = new HostSharedWindow(newSubtopic, elementToShare, _self, scaleFactor, cleanUpElement);
            _self.children.push(newWindow);
            createdCallBack(newWindow, newSubtopic);
        });
    };
    
    this.shareSubWindow = function(elementToShare, metadata, createdCallBack, scaleFactor, cleanUpElement) {
        metadata.type = "shared-window";
        _self.openSharedWindowSubTopic(elementToShare, metadata, createdCallBack, scaleFactor, cleanUpElement);
    };

    this.closeSubWindowForElement = function(element) {
      for (var i = 0; i < _self.children.length; i++) {
        var candidate = _self.children[i];
        if ((candidate instanceof HostSharedWindow) && (candidate.element === element)) {
          candidate.close();
          break;
        }
      }
    };

    this.closeSharedSubWindows = function() {
      for (var i = 0; i < _self.children.length; i++) {
        var candidate = _self.children[i];
        if (candidate instanceof HostSharedWindow) {
          candidate.close();
          break;
        }
      }
    };

    this.setZoomStartedCallback = function(zoomStarted) {
        zoomStartedCallback = zoomStarted;
    };
    this.setZoomEndedCallback = function(zoomEnded) {
        zoomEndedCallback = zoomEnded;
    };
    this.hasAtLeastOneSharedDocument = function() {
        return hasChildDocumentWindows(this); 
    }

    this.sendResizedMessage = function() {
        var windowResizedMessage = new Int16Array(3);
        windowResizedMessage[0] = WINDOW_RESIZED_MESSAGE;
        windowResizedMessage[1] = _self.width;
        windowResizedMessage[2] = _self.height;
        topic.sendMessage(windowResizedMessage);
    };

    topic.messageReceived = function(source, payload) {
        // screen related message received
        var type = new Int16Array(payload.buffer, 0, 1)[0];
        if (_self.messageHandlers[type]) {
            _self.messageHandlers[type](payload, source);
        } else {
          _self.onError({code:CONNECTION_ERROR,message : "Unhandled message of type: " + type + " in topic " + topic});
        }

    };

    this.sendSizeAndPosition = function() {
        // Force sending size and position, TODO link this to new members joining
        _self.sendResizedMessage();
        if (_self.parentWindow) {
            _self.sendMovedMessage(getPixelValue(_self.element.style.left), getPixelValue(_self.element.style.top));
        }
    };

    this.addAnnotationWindow = function(callBack, active) {
        var metadata = {};
        metadata.type = "annotation";
        topic.openSubtopic(metadata, function(newSubtopic){
            var annotationSvg = _self.element.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");
            addClassSvg(annotationSvg, "annotation-layer"); // ie doesn't support classList on svg
            _self.element.appendChild(annotationSvg);
            var annotations = new AnnotationWindow(newSubtopic, annotationSvg, _self, true, active);
            _self.children.push(annotations);
            // This is the owner so it should be resending the current set of annotations when a new participant joins
            //newSubtopic.participantJoined = function(newParticipant) {
            //    annotations.resendAnnotations();
            //};
            callBack(annotations);
        });
    };

    this.addSpotlightWindow = function(callBack, active) {
        var metadata = {};
        metadata.type = "spotlight";
        topic.openSubtopic(metadata, function(newSubtopic){
            var spotlightDiv = _self.element.ownerDocument.createElement("div");
            addClassSvg(spotlightDiv, "spotlight-layer"); // ie doesn't support classList on svg
            _self.element.appendChild(spotlightDiv);
            var spotlights = new SpotlightWindow(newSubtopic, spotlightDiv, _self, true, active);
            _self.children.push(spotlights);
            callBack(spotlights);
        });
    };

    //The reverse of scaleXToGlobal
    this.scaleXToLocalPixels = function(globalX) {
    	return globalX * (globalX / _self.scaleXToGlobal(globalX));
    }

    //The reverse of scaleYToGlobal
    this.scaleYToLocalPixels = function(globalY) {
    	return globalY * (globalY / _self.scaleYToGlobal(globalY));
    }
    
    this.getChildZoomWindow = function () {
        var zoomWindow;
        for (var i = 0; i < _self.children.length; i++) {
            if (_self.children[i].isZoomWindow) {
                zoomWindow = _self.children[i];
                break;
            }
        }
        return zoomWindow;
    }
}

SharedWindow.prototype = {
    remoteViewSizeChanged : function(width, height) {
        console.log("Remote view size changed for a view without a parent. New size is: " + width +" * " + height);
    },

    parentResized : function() {
        console.log("The parent of this element has been resized");
    },
    onError : function(error){
        console.log(JSON.stringify(error));
    }
};

function HostSharedWindow(topic, sharedElement, parentWindow, sFactor, cleanUpElement, hasPermissionToInteractCallback) {
    SharedWindow.call(this, topic, sharedElement, parentWindow, cleanUpElement);
    var _self = this;

    _self.imageFormat = IMAGE_FORMAT.PNG;

    var sharedItems = {};

    // The factor to scale the image by when sending
    var scaleFactor;

    var pushRequestCallback = null;

    this.documentReceivedSuccessCallback = null;
    this.documentReceivedErrorCallback = null;
    this.annotationAddedCallback = null;
    this.annotationsClearedCallback = null;

    this.scaleXToGlobal = function(localX) {
        // No scaling for host
        return localX;
    };

    this.setImageQualityScaleFactor = function(factor) {
        if (factor) {
            scaleFactor = Math.min(1, Math.max(0, factor));
        }
    };

    if (sFactor === undefined)
    	sFactor = 1.0;
    _self.setImageQualityScaleFactor(sFactor);

    this.scaleYToGlobal = function(localY) {
        // No scaling for host
        return localY;
    };

    this.scaleXToLocal = function(globalX) {
        // No scaling but add the units
        return  globalX + "px";
    };

    this.scaleYToLocal = function(globalY) {
        // no scaling but add the units
        return  globalY + "px";
    };

    if (topic.metadata.closeable) {
    	_self.addElementEventListener(_self.closeHandle, "click", function(event) {
    		_self.close(INITIATOR_CONSUMER);
    		event.preventDefault();
    		event.stopPropagation();
    	});
    }

    this.setPushRequestCallback = function(pPushRequestCallback) {
    	pushRequestCallback = pPushRequestCallback;
    };

    this.setDocumentReceivedSuccessCallback = function(pDocumentReceivedSuccessCallback) {
    	this.documentReceivedSuccessCallback = pDocumentReceivedSuccessCallback;
    };

    this.setDocumentReceivedErrorCallback = function(pDocumentReceivedErrorCallback) {
    	this.documentReceivedErrorCallback = pDocumentReceivedErrorCallback;
    };

    this.setAnnotationAddedCallback = function(annotationAddedCallback) {
    	this.annotationAddedCallback = annotationAddedCallback;
    };

    this.setAnnotationsClearedCallback = function(annotationsClearedCallback) {
    	this.annotationsClearedCallback = annotationsClearedCallback;
    };

    this.sendRectangleUpdate = function (data, xOffset, yOffset, fullWidth, fullHeight, format) {
        var data = data
            .substring(data.indexOf(",") + 1);
        var binary = window.atob(data);
        var len = binary.length;

        var message = new Uint8Array(len + 12);
        var header = new Int16Array(message.buffer, 0, 6);
        header[0] = WINDOW_RECTANGLE_UPDATED;
        header[1] = xOffset;
        header[2] = yOffset;
        header[3] = fullWidth;
        header[4] = fullHeight;
        header[5] = format;
        var payload = new Uint8Array(message.buffer, 12);

        for (var i = 0; i < len; ++i) {
            payload[i] = binary.charCodeAt(i);
        }

        topic.sendMessage(message);
    };
    
    this.sendScrollbarVisibility = function() {
        if (_self.scrollbarSubTopic) {
            var xVisibility = 0;
            var yVisibility = 0;
            var docElement = _self.element.ownerDocument.documentElement;
            
            if (docElement.clientWidth < docElement.scrollWidth) {
                xVisibility = 1;
            }
            if (docElement.clientHeight < docElement.scrollHeight) {
                yVisibility = 1;
            }
            
            var message = new Uint8Array(6);
            var header = new Int16Array(message.buffer);
            header[0] = SCROLLBAR_VISIBILITY_MESSAGE;
            header[1] = xVisibility;
            header[2] = yVisibility;
            _self.scrollbarSubTopic.sendMessage(message);
        }
    };

    var lastSent = document.createElement('canvas');
    var deltaImage = document.createElement('canvas');
    var annotationCanvas = document.createElement('canvas');
    this.contentChanged = function(canvas, force, callback) {
        var clearAnnotations = function() {
            for (var i = 0; i < _self.children.length; i++) {
                if (_self.children[i] instanceof AnnotationWindow) {
                    _self.children[i].clear(true);
                }
            }
        };

        var resized = canvas.height != _self.height || canvas.width != _self.width;
        _self.height = canvas.height;
        _self.width = canvas.width;

        var scaledWidth = _self.width * scaleFactor;
        var scaledheight = _self.height * scaleFactor;

        deltaImage.width = scaledWidth;
        deltaImage.height = scaledheight;

        var lastSentContext = lastSent.getContext('2d');
        var deltaContext;
        var hasDimensions = scaledWidth > 0 && scaledheight > 0;
        if (hasDimensions) {
            deltaContext = deltaImage.getContext('2d');
            deltaContext.drawImage(canvas, 0, 0, scaledWidth, scaledheight);
        }
        if (force || resized) {
            // Send the actual height and width to the topic along with the position.
            _self.sendSizeAndPosition();

            if (resized) {
                for (var i = 0; i < _self.children.length; i++) {
                    _self.children[i].parentResized();
                }
                // Clear the annotations
                clearAnnotations();
            }
        } else if (hasDimensions) {
            var deltaImageData = deltaContext.getImageData(0, 0, scaledWidth, scaledheight);
            var lastImageData = lastSentContext.getImageData(0, 0, scaledWidth, scaledheight);
            var deltaBuffer = new ArrayBuffer(deltaImageData.data.length);
            var lastBuffer = new ArrayBuffer(lastImageData.data.length);

            var delta32 = new Uint32Array(deltaBuffer);
            var last32 = new Uint32Array(lastBuffer);
            var delta8;
            var last8;
            function createImageDifferenceArray() {
              delta8.set(deltaImageData.data);
              last8.set(lastImageData.data);

              if (_self.imageFormat === IMAGE_FORMAT.PNG) {
                for (var i = 0; i < last32.length; i++) {
                  if (last32[i] == delta32[i]) {
                    delta32[i] = 0;
                  }
                }
              }
            }
            try {
              delta8 = new Uint8ClampedArray(deltaBuffer);
              last8 = new Uint8ClampedArray(lastBuffer);
              createImageDifferenceArray();
              deltaImageData.data.set(delta8);
            } catch (e) {
              delta8 = new Uint8Array(deltaBuffer);
              last8 = new Uint8Array(lastBuffer);
              createImageDifferenceArray();
              //noinspection JSAnnotator,JSValidateTypes - this could be a version of IE11 where Uint8ClampedArray hasn't been implemented yet.
              deltaImageData.data = delta8.buffer;
            }

            deltaContext.putImageData(deltaImageData, 0, 0);
        }
        if (!hasDimensions) {
            return;
        }
        _self.sendRectangleUpdate(deltaImage.toDataURL("image/" + IMAGE_FORMAT[_self.imageFormat]), 0, 0, _self.width, _self.height, _self.imageFormat);
        _self.sendScrollbarVisibility();
        
        lastSent.width = scaledWidth;
        lastSent.height = scaledheight;
        lastSentContext.drawImage(canvas, 0, 0, scaledWidth, scaledheight);
        if (callback) {
            callback();
        }

        // check annotations
        //setTimeout(function() {
        annotationCanvas.width = scaledWidth;
        annotationCanvas.height = scaledheight;
        var annotationContext =  annotationCanvas.getContext('2d');
        annotationContext.clearRect(0, 0, scaledWidth, scaledheight);
        for (var i = 0; i < _self.children.length; i++) {
            if (_self.children[i] instanceof AnnotationWindow) {
                var svg = _self.children[i].element;
                var pathElems = svg.getElementsByTagNameNS(SVG_NAMESPACE, "path");
                for (var j = 0; j < pathElems.length; j++) {
                    var pathElem = pathElems[j];
                    var dAttr = pathElem.getAttribute("d");
                    // TODO this assumes a single M followed by sevel Ls, true for now...
                    var findM = /M\s+(\d+)\s+(\d+)/g;
                    var findL = /L\s+(\d+)\s+(\d+)/g;
                    var matchesM = findM.exec(dAttr);
                    var matchesL = dAttr.match(findL);
                    annotationContext.lineCap = 'round';
                    var width = pathElem.getAttribute('stroke-width') || 1;
                    var newStrokeWidth = (10 + parseInt(width)) * scaleFactor;
                    annotationContext.lineWidth = newStrokeWidth;
                    annotationContext.moveTo(matchesM[1], matchesM[2]);
                    for (var k = 0; k < matchesL.length; k++) {
                        var matches = /L\s+(\d+)\s+(\d+)/g.exec(matchesL[k]);
                        annotationContext.lineTo(matches[1] * scaleFactor, matches[2] * scaleFactor);
                    }
                    annotationContext.stroke();
                }
            }
        }
        var annotationImageData = annotationContext.getImageData(0, 0, scaledWidth, scaledheight);
        var annotationBuffer = new ArrayBuffer(annotationImageData.data.length);
        var annotation32 = new Uint32Array(annotationBuffer);
        var annotation8;
        try {
          annotation8 = new Uint8ClampedArray(annotationBuffer);
        } catch (e) {
          annotation8 = new Uint8Array(annotationBuffer);
        }

        annotation8.set(annotationImageData.data);

        for (var i = 0; i < annotation32.length; i++) {
            if (annotation32[i] != 0 && delta32[i] != 0) {
                clearAnnotations();
                break;
            }
        }
    };

    if (topic.metadata.moveable) {
        this.messageHandlers[WINDOW_MOVED_MESSAGE] = function (message) {
            var location = new Int16Array(message.buffer, 2);
            //   move this if it is not the (a?) top level window
            if (_self.parentWindow) {
                _self.element.style.transition = "top " + _self.maxUpdateInterval + ", left " + _self.maxUpdateInterval;
                _self.element.style.left = location[0] + "px";
                _self.element.style.top = location[1] + "px";
                _self.clearAnnotations();
                
                if (_self.isZoomWindow) {
                    // Display a different section of our existing canvas because the agent moved us.
                    // If we have finished being moved, send the new high-quality image back to the agent.
                    var sendUpdate = false;
                    if(location.length > 2 && location[2] == 0) {
                        sendUpdate = true;
                    }
                    _self.refreshImage(null, sendUpdate);
                }
            }
        };
    }
    // We're the host so send the initial size and position
    _self.sendResizedMessage();
    if (_self.parentWindow) { // Only send the position if there is something for it to be relative to
        _self.sendMovedMessage(getPixelValue(_self.element.style.left, _self.parentWindow.width),
            getPixelValue(_self.element.style.top, _self.parentWindow.height));
    }
    var mouseDownElement;
    if (topic.metadata.interactive) {
        _self.element.classList.add("interactive");

        var get_global_coords = function(details) {
          var localX = details[0];
          var localY = details[1];
          var rect = _self.element.getBoundingClientRect();
          var globalX = rect.left + localX;
          var globalY = rect.top + localY;
          return {
            x:globalX,
            y:globalY
          };
        };

        var targettedElement = function(details) {
          var crd = get_global_coords(details);
          return(_self.element.ownerDocument.elementFromPoint(crd.x, crd.y));
        };

        var createPointerEvent = function(eventType, doc, clientX, clientY, button) {
            var event;
            try {
                event = doc.createEvent('PointerEvent');
                event.initPointerEvent(eventType, true, true, doc.defaultView, 1, 0, 0, clientX, clientY,
                    false, false, false, false, button, null, 0, 0, 1, 1, 0, 0, 0 , 0, 1, "mouse", new Date().getTime(), true);
            }
            catch (e) {
                event = new PointerEvent(eventType, {
                    cancelable: true,
                    bubbles: true,
                    pointerId: 1,
                    pointerType: "mouse",
                    clientX: clientX,
                    clientY: clientY,
                    button: button,
                    view: doc.defaultView,
                    detail: 1,
                    isPrimary: true,
                    pressure: 0.5
                });
            }

            return event;
        };

        var dispatchMouseEvent = function(eventType, details, source) {
            var crd = get_global_coords(details);
            var button;
            if (details.length == 3) {
                button = details[2];
            } else {
                button = null;
            }

            var targetElement = targettedElement(details);

            if (targetElement && isInteractive(targetElement, source)) {
                var event;
                if (eventType.indexOf("pointer") > -1) {
                    event = createPointerEvent(eventType, targetElement.ownerDocument, crd.x, crd.y, button);
                    event.assist_generated = true;
                    event.assist_source = source.id;
                    targetElement.dispatchEvent(event);

                    eventType = eventType.replace("pointer", "mouse");
                }

                event = targetElement.ownerDocument.createEvent('MouseEvents');
                event.initMouseEvent(eventType, true, true, targetElement.ownerDocument.defaultView, 1, 0, 0, crd.x, crd.y,
                    false, false, false, false, button, null);

                event.assist_generated = true;
                event.assist_source = source.id;

                targetElement.dispatchEvent(event);
            }
            return targetElement;
        };
        
        var isInteractive = function(targetElement, source) {
        
            if (!targetElement) {
                return false;
            }
            
            if (targetElement.getAttribute(IGNORE_INTERACTION_FLAG)) {
                return false;
            }
            
            if (hasPermissionToInteractCallback) { // targetElement may be masked by permissions
                return hasPermissionToInteractCallback(targetElement, source);
            } else {
                return true;
            }
        };

        var hasNoShow = function(targetElement) {
            return targetElement.classList ? targetElement.classList.contains('assist-no-show') : null
            || (targetElement.parentElement && hasNoShow(targetElement.parentElement));
        };

        this.messageHandlers[MOUSE_DOWN_MESSAGE] = function (message, source) {
            var details = new Int16Array(message.buffer, 2, 3);
            var targetElement = targettedElement(details);
            if (targetElement && !hasNoShow(targetElement)) {
              dispatchMouseEvent(DEVICE_INPUT_TYPE.concat("down"), details, source);
              if (details[2] == 0) {
                  mouseDownElement = targetElement;
              }
            }
        };

        this.messageHandlers[MOUSE_UP_MESSAGE] = function (message, source) {
            var details = new Int16Array(message.buffer, 2, 3);
            var targetElement = targettedElement(details);
            if (targetElement && !hasNoShow(targetElement)) {
              dispatchMouseEvent(DEVICE_INPUT_TYPE.concat("up"), details, source);
              if (details[2] == 0 && targetElement && targetElement == mouseDownElement && isInteractive(targetElement, source)) {
                dispatchMouseEvent("click", details, source);
              };
            }
            mouseDownElement = null;
        };

        this.messageHandlers[MOUSE_DOUBLE_CLICK_MESSAGE] = function (message, source) {
          var details = new Int16Array(message.buffer, 2, 2);
          var targetElement = targettedElement(details);
          if (targetElement && !hasNoShow(targetElement)) {
            dispatchMouseEvent("dblclick", details, source);
          };
        };

        this.messageHandlers[MOUSE_MOVE_MESSAGE] = function (message, source) {
          var details = new Int16Array(message.buffer, 2, 2);
          var targetElement = targettedElement(details);
          if (targetElement && !hasNoShow(targetElement)) {
             dispatchMouseEvent(DEVICE_INPUT_TYPE.concat("move"), details, source);
          }
        };
    }

    _self.messageHandlers[PUSH_DOCUMENT_MESSAGE] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
        console.log("Received push document message for sharedItemId: " + sharedItemId);
        var payload = new Uint8Array(message.buffer, 4);
        var url = String.fromCharCode.apply(null, payload);
        var sharedItem = new SharedItem(sharedItemId);
        var metadataPos = url.indexOf(SHARED_DOCUMENT_METADATA_FRAGMENT);
        if(metadataPos >= 0) {
            var metadata = url.substring(metadataPos + SHARED_DOCUMENT_METADATA_FRAGMENT.length, url.length);
            sharedItem.metadata = decodeMultiByteCharacters(metadata);
            url = url.substring(0, metadataPos);
        }
        sharedItem.url = url;
        sharedItems[sharedItemId] = sharedItem;
        /**
         * Handle the acceptance of a document share request.
         *
         * @callback allow
         */
        function allow() {
        	var acceptMessage = new Uint8Array(4);
        	var acceptMessageHeader = new Int16Array(acceptMessage.buffer, 0, 2);
        	acceptMessageHeader[0] = SHARED_DOCUMENT_ACCEPTED;
        	acceptMessageHeader[1] = sharedItemId;
        	console.log("Sending shared document accepted message for sharedItemId: " + sharedItemId);
        	topic.sendMessage(acceptMessage);
        	topic.openSubtopic({type : "shared-window", moveable : true, resizeable : true, interactive : true, closeable : true, zoomable : true, sharedItemId: sharedItemId}, function(newTopic){
        		var container = _self.element.ownerDocument.createElement("div");
        		_self.element.appendChild(container);
        		var documentWindow = new DocumentWindow(newTopic, container, _self, {url: url}, scaleFactor, topic, sharedItem, true);
        		_self.children.push(documentWindow);
        	});
        }

        /**
         * Handle the rejection of a document share request.
         *
         * @callback deny
         */
        function deny() {
        	var rejectMessage = new Uint8Array(4);
        	var rejectMessageHeader = new Int16Array(rejectMessage.buffer, 0, 2);
        	rejectMessageHeader[0] = SHARED_DOCUMENT_REJECTED;
        	rejectMessageHeader[1] = sharedItemId;
        	console.log("Sending shared document rejected message for sharedItemId: " + sharedItemId);
        	topic.sendMessage(rejectMessage);
        }

        if (pushRequestCallback) {
        	pushRequestCallback(allow, deny);
        } else {
        	allow();
        }

    };

    _self.messageHandlers[PUSH_CONTENT_START] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
    	console.log("Push content start message received for sharedItemId: " + sharedItemId);
        var payload = new Uint8Array(message.buffer, 4);
        sharedItems[sharedItemId] = new SharedItem(sharedItemId);
        sharedItems[sharedItemId].contentType = String.fromCharCode.apply(null, payload);
        sharedItems[sharedItemId].pushContentDataChunks = [];

        function allow() {
        	var acceptMessage = new Uint8Array(4);
        	var acceptMessageHeader = new Int16Array(acceptMessage.buffer, 0, 2);
        	acceptMessageHeader[0] = SHARED_DOCUMENT_ACCEPTED;
        	acceptMessageHeader[1] = sharedItemId;
        	console.log("Sending shared document accepted message for sharedItemId: " + sharedItemId);
        	topic.sendMessage(acceptMessage);
        }
        function deny() {
        	var rejectMessage = new Uint8Array(4);
        	var rejectMessageHeader = new Int16Array(rejectMessage.buffer, 0, 2);
        	rejectMessageHeader[0] = SHARED_DOCUMENT_REJECTED;
        	rejectMessageHeader[1] = sharedItemId;
        	console.log("Sending shared document rejected message for sharedItemId: " + sharedItemId);
        	topic.sendMessage(rejectMessage);
        }

        if (pushRequestCallback) {
        	pushRequestCallback(allow, deny);
        } else {
        	allow();
        }
    };

    _self.messageHandlers[PUSH_CONTENT_CHUNK] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
    	console.log("Push content chunk received for sharedItemId: " + sharedItemId);
        var sharedItem = sharedItems[sharedItemId];
        console.log("sharedItemId = " + sharedItemId);
        console.log("sharedItem = " + sharedItem);
        var payload = new Uint8Array(message.buffer, 4);
        sharedItem.pushContentDataChunks[sharedItem.pushContentDataChunks.length] = payload;
    };

    _self.messageHandlers[PUSH_CONTENT_METADATA] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
    	console.log("Push content metadata received for sharedItemId: " + sharedItemId);
        var sharedItem = sharedItems[sharedItemId];
        console.log("sharedItemId = " + sharedItemId);
        console.log("sharedItem = " + sharedItem);
        var payload = new Uint8Array(message.buffer, 4);
        sharedItems[sharedItemId].metadata = decodeMultiByteCharacters(String.fromCharCode.apply(null, payload));
    };

    _self.messageHandlers[PUSH_CONTENT_END] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
    	console.log("Push content end message received for sharedItemId: " + sharedItemId);
        var sharedItem = sharedItems[sharedItemId];
    	//Find total byte length of the pushed chunks
        var bytes = 0;
        for (var i = 0; i < sharedItem.pushContentDataChunks.length; i++) {
            bytes += sharedItem.pushContentDataChunks[i].byteLength;
        }
        //Combine chunks into one Uint8Array.
        var fullData = new Uint8Array(bytes);
        var nextOffset = 0;
        for (i = 0; i < sharedItem.pushContentDataChunks.length; i++) {
            fullData.set(sharedItem.pushContentDataChunks[i], nextOffset);
            nextOffset += sharedItem.pushContentDataChunks[i].byteLength;
        }
        //var dataUri = "data:" + sharedItem.contentType + ";base64," + encode(fullData);
        console.log("Pushed content received and processed.");

        topic.openSubtopic({type : "shared-window", moveable : true, resizeable : true,
        		interactive : true, closeable : true, zoomable : true,
        		sharedItemId: sharedItemId}, function(newTopic) {
            var container = _self.element.ownerDocument.createElement("div");
            _self.element.appendChild(container);
            console.log("Creating new document window.");
            var documentWindow = new DocumentWindow(newTopic, container, _self, {contentType: sharedItem.contentType, data: fullData}, scaleFactor, topic, sharedItem, true);
            _self.children.push(documentWindow);
        });
        sharedItems[sharedItemId] = null;
    };

    _self.messageHandlers[SHARED_DOCUMENT_CLOSE_REQUEST] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
    	console.log("Shared document close request message received for sharedItemId: " + sharedItemId);
    	for (var i = 0; i < _self.children.length; i++) {
    		var w = _self.children[i];
    		console.log("Child window: ");
    		console.log(w);
    		if (w instanceof DocumentWindow) {
    			console.log("Child document window found, its sharedItemId is " + w.sharedItemId);
    			if (w.sharedItemId == sharedItemId) {
    				console.log("Found matching child window... closing.");
    				w.close(INITIATOR_AGENT);
    			}
    		}
    	}
    };


    var updateTimer;
    _self.scheduleObserver = function() {
        // configuration of the observer:
        var config = {
            attributes : true,
            childList : true,
            characterData : true,
            subtree : true,
            attributeOldValue : true
        };

        var observer = new MutationObserver(function(mutations) {
            var refresh = false;
            for (var i = 0; i < mutations.length && !refresh; i++) {
                var mutation = mutations[i];
                if (mutation.type == "attributes" && mutation.attributeName == "style") {
                    var oldStyle = mutation.oldValue;
                    if (oldStyle) {
                        oldStyle.top = mutation.target.style.top;
                        oldStyle.left = mutation.target.style.left;
                    }
                    // If the only thing that has changed is the position then don't redraw
                    refresh = (oldStyle == mutation.target.style);

                } else {
                    refresh = true;
                }
            }
            if (refresh) {
                _self.refreshContent();
            }
        });

        // pass in the target node, as well as the observer options
        observer.observe(_self.element, config);

        _self.closed = function(initiator) {
        	console.log("In HostSharedWindow.closed().");
        	console.log("_self is: ");
        	console.log(_self);
        	if (_self instanceof DocumentWindow) {
        		console.log("_self is a DocumentWindow; sharedItemId is " + _self.sharedItemId);
        	}
            try {
                if (_self.cleanUpElement && _self.element.parentNode) {
                    _self.element.parentNode.removeChild(_self.element);
                }
                observer.disconnect();
                _self.removeElementEventListeners();
            } catch(e) {
                console.warn(e);
            }

            //Clear annotations when a shared document window is closed.
            _self.clearAnnotations();

            if (_self.parentWindow) {
            	if (_self.parentWindow.children.indexOf(_self) != -1) {
            		_self.parentWindow.children.splice(
            				_self.parentWindow.children.indexOf(_self), 1);
            	} else {
            		console.log("_self not found in parent window's children!");
            	}
            }

            for (var i = _self.children.length; i > 0; i--) {
                _self.children[i - 1].closed(initiator);
            }
            _self.element.classList.remove("interactive");
            console.log("End HostSharedWindow.closed().");
        };
    };

    _self.clearAnnotations = function() {
        var parent = _self.parentWindow;
        for (var i = 0; i < parent.children.length; i++) {
        	var x = parent.children[i];
        	if (x instanceof AnnotationWindow) {
        		x.clear(true);
        	}
        }
    };

    _self.refreshContent = function(force) {
        if (force) {
            lastSent.getContext("2d").clearRect(0,0,lastSent.width, lastSent.height);
        }
        if (updateTimer) {
            clearTimeout(updateTimer);
        }
        updateTimer = setTimeout(function() {
            window.html2canvas(_self.element, {
                onrendered: _self.contentChanged,
                useCORS: true
            });
        }, 500);
    };

    _self.parentResized = function() {
        _self.sendMovedMessage(getPixelValue(_self.element.style.left, _self.parentWindow.width),
            getPixelValue(_self.element.style.top, _self.parentWindow.width));
    };

    _self.close = function(initiator) {
    	if (_self instanceof DocumentWindow) {
    		console.log("close() called on DocumentWindow with sharedItemId " + _self.sharedItemId);
    	}
        var closeMessage = new Int16Array(2);
        closeMessage[0] = WINDOW_CLOSED_MESSAGE;
        closeMessage[1] = initiator;
        topic.sendMessage(closeMessage);
        topic.leave();
        _self.closed(initiator);
    };

    _self.messageHandlers[WINDOW_RESIZED_MESSAGE] = function(message) {
        var newSize = new Int16Array(message.buffer, 2, 2);
        if (!_self.isZoomWindow) {
            _self.element.style.width = newSize[0] + "px";
            _self.element.style.height = newSize[1] + "px";
            _self.refreshContent();
        }
        else {
            _self.resize(newSize[0], newSize[1], false);
        }
    };

    _self.resizeElement = function(deltaX, deltaY) {
        var newX = parseFloat(_self.element.style.width) + deltaX;
        var newY = parseFloat(_self.element.style.height) + deltaY;
        _self.element.style.width = _self.scaleXToLocal(newX);
        _self.element.style.height = _self.scaleYToLocal(newY);
        _self.refreshContent();
    };

    _self.messageHandlers[INPUT_AT_LOCATION] = function(message) {
        var location = new Int16Array(message.buffer, 2, 2);
        var x = location[0];
        var y = location[1];
        var payload = new Uint8Array(message.buffer, 6);
        var inputString = String.fromCharCode.apply(null, payload);
        // TODO if the top element is not appropriate we could hide it and check the one under it, continuing until we hit a valid element or the document body
        // then un-hide all of the hidden elements
        var targetElement = _self.element.ownerDocument.elementFromPoint(x, y);
        // TODO validate the target element, handle scenarios where it isn't a text input element
        targetElement.value = inputString;
        _self.refreshContent();
    };
    
    _self.openScrollbarSubTopic = function() {
        topic.openPrivateSubtopic({type:"scrollbar"}, function(newTopic) {
            _self.scrollbarSubTopic = newTopic;
            if(_self.pendingScrollbarAgents) {
                // Add permissions for agents who started co-browse before the scrollbar topic was ready:
                _self.pendingScrollbarAgents.forEach(_self.setScrollbarPermissions);
                _self.pendingScrollbarAgents = [];
            }
            
            newTopic.participantJoined = function(newParticipant) {
                if (newParticipant.metadata.role == "agent") {
                    _self.sendScrollbarVisibility();
                }
            };
        }, []);
    };
    
    _self.setScrollbarPermissions = function(agent) {
      if(_self.scrollbarSubTopic) {
          if (!hasPermissionToInteractCallback || hasPermissionToInteractCallback(_self.element.ownerDocument.body, agent)) {
              _self.scrollbarSubTopic.updatePermission(AssistAED.PERMISSIONS.ALLOWED, agent);
          }
      }
      else {
          // The sub-topic is not ready yet.
          if (!_self.pendingScrollbarAgents) {
              _self.pendingScrollbarAgents = [];
          }
          
          if (_self.pendingScrollbarAgents.every(function(pendingAgent){pendingAgent.id != agent.id})) {
              _self.pendingScrollbarAgents.push(agent);
          };
      }
    }
    
    _self.messageHandlers[SCROLL_UP_MESSAGE] = function(message, source) {
        scrollBy(4, -1, source, 0);
    };

    _self.messageHandlers[SCROLL_DOWN_MESSAGE] = function(message, source) {
        scrollBy(4, 1, source, 0);
    };
    
    _self.messageHandlers[SCROLL_LEFT_MESSAGE] = function(message, source) {
        scrollBy(4, 0, source, -1);
    };
    
    _self.messageHandlers[SCROLL_RIGHT_MESSAGE] = function(message, source) {
        scrollBy(4, 0, source, 1);
    };

    function scrollBy(divisor, yMultiplier, source, xMultiplier) {
        var document = _self.element.ownerDocument;
        var window = document.defaultView;
        
        if (hasPermissionToInteractCallback && hasPermissionToInteractCallback(document.body, source) == false) {
            return;
        }
        
        var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        
        var quarterViewportWidth = viewportWidth / divisor;
        var quarterViewportHeight = viewportHeight / divisor;
                
        window.scrollBy((quarterViewportWidth * xMultiplier), (quarterViewportHeight * yMultiplier));
    };

    this.shareDocument = function(document, onLoad, onError) {
      if (zoomWindowOpen()) {
        _self.onError({code: DOCUMENT_ERROR, message: "Cannot share document when zooming."});
      } else {
        var displayDoc = function(docDesc) {
            var sharedItemId = "local";
            var sharedItem = new SharedItem(sharedItemId);
            topic.openSubtopic({type : "shared-window", moveable : true, resizeable : true, interactive : true, closeable : true, zoomable : true, sharedItemId: sharedItemId}, function(newTopic){
                var container = _self.element.ownerDocument.createElement("div");
                _self.element.appendChild(container);
                var documentWindow = new DocumentWindow(newTopic, container, _self, docDesc, scaleFactor, topic, sharedItem, true);
                _self.children.push(documentWindow);
            });
        };
        // document may be a URL (or data URL), File, or Blob
        if ((typeof document) == 'string') {
            // If it's a URL just send it in
            displayDoc({url:document, onLoad:onLoad, onError:onError});
        } else {
            // Assume we're dealing with a blob or file
            var reader = new FileReader();
            reader.onload = function(event) {
                var type = document.type;
                if (document.type == "") { 
                    // happens with pdfs on machines with no pdf reader installed (on IE only?)
                    // shouldn't happen with images though
                    var ext = document.name.match(/\.[0-9a-z]+$/i)
                    if (ext.length > 1) {
                        ext = ext[0].toLowerCase();
                    }
                    if (ext == ".pdf") {
                        type = "application/pdf";
                    }
                }
                displayDoc({data: new Uint8Array(event.target.result), contentType: type, onLoad:onLoad, onError:onError});
            };
            // TODO handle errors
            reader.readAsArrayBuffer(document);
        }
      }
    };
}

HostSharedWindow.prototype = Object.create(SharedWindow.prototype);

function ClientSharedWindow(topic, containingDiv, parentWindow, cleanUpElement) {
    clearTimeout(window.staleCanvasTimer);
    SharedWindow.call(this, topic, containingDiv, parentWindow, cleanUpElement);
    var _self = this;
    var documentPacket;
    var sharedItemCounter = 0;
    var sharedItems = {};
    this.consumerCursorCallbacks = {move: function(x, y) {}, hide: function() {}};

    // add a canvas to the parent div to draw the remote view on
    _self.drawCanvas = _self.element.ownerDocument.createElement("canvas");
    // set appropriate CSS classes
    _self.drawCanvas.classList.add("remote-view-element");
    _self.drawCanvas.classList.add("drawing-layer");
    _self.drawCanvas.classList.add("interstitial");
    _self.element.classList.add("shared-window");
    _self.element.classList.add("active");
   
    if (window.staleCanvas) {
        _self.drawCanvas.height = window.staleCanvas.height;
        _self.drawCanvas.width = window.staleCanvas.width;
    } else {
        _self.drawCanvas.height = 1000;
        _self.drawCanvas.width = 1500;
    }

    _self.element.appendChild(_self.drawCanvas);

    if (topic.metadata.closeable) {
        _self.addElementEventListener(_self.closeHandle, "click", function(event) {
            _self.close(INITIATOR_AGENT);
            event.preventDefault();
            event.stopPropagation();
        });
    }

    this.joinScrollbarSubTopic = function(scrollbarSubTopic) {
        scrollbarSubTopic.messageReceived = function(source, message) {
            var header = new Int16Array(message.buffer);
            if (header[0] == SCROLLBAR_VISIBILITY_MESSAGE) {
                var xVisibility = header[1];
                var yVisibility = header[2];
                _self.setScrollbarVisibility(xVisibility, yVisibility);
            }
        };
        
        scrollbarSubTopic.join();
    }
    
    this.createScrollbars = function(xVisibility, yVisibility) {
        var sendMouseMessage = function(messageType, event) {
            var mouseMessage = new Int16Array(1);
            mouseMessage[0] = messageType;

            topic.sendMessage(mouseMessage);
            event.preventDefault();
        };

        _self.scrollbarTop = _self.element.ownerDocument.createElement("div");
        _self.scrollbarTop.classList.add("scrollbar");
        _self.scrollbarTop.classList.add("top");

        _self.scrollbarBottom = _self.element.ownerDocument.createElement("div");
        _self.scrollbarBottom.classList.add("scrollbar");
        _self.scrollbarBottom.classList.add("bottom");
        
        _self.scrollbarLeft = _self.element.ownerDocument.createElement("div");
        _self.scrollbarLeft.classList.add("scrollbar");
        _self.scrollbarLeft.classList.add("left");
        
        _self.scrollbarRight = _self.element.ownerDocument.createElement("div");
        _self.scrollbarRight.classList.add("scrollbar");
        _self.scrollbarRight.classList.add("right");
        
        _self.setScrollbarVisibility(xVisibility, yVisibility);

        _self.element.appendChild(_self.scrollbarTop);
        _self.element.appendChild(_self.scrollbarBottom);
        _self.element.appendChild(_self.scrollbarLeft);
        _self.element.appendChild(_self.scrollbarRight);

        _self.addElementEventListener(_self.scrollbarTop, "click", function(event) {
            event.stopPropagation();
            sendMouseMessage(SCROLL_UP_MESSAGE, event);
        });

        _self.addElementEventListener(_self.scrollbarBottom, "click", function(event) {
            event.stopPropagation();
            sendMouseMessage(SCROLL_DOWN_MESSAGE, event);
        });
        
        _self.addElementEventListener(_self.scrollbarLeft, "click", function(event) {
            event.stopPropagation();
            sendMouseMessage(SCROLL_LEFT_MESSAGE, event);
        });
        
        _self.addElementEventListener(_self.scrollbarRight, "click", function(event) {
            event.stopPropagation();
            sendMouseMessage(SCROLL_RIGHT_MESSAGE, event);
        });
    }
    
    this.setScrollbarVisibility = function(xVisibility, yVisibility) {
        if (yVisibility) {
            if (xVisibility) {
                // Make room for the horizontal one:
                _self.scrollbarBottom.style.bottom = _self.scrollbarRight.offsetHeight + "px";
            }
            else {
                _self.scrollbarBottom.style.bottom = "";
            }
            _self.scrollbarTop.style.visibility = "visible";
            _self.scrollbarBottom.style.visibility = "visible";
        }
        else {
            _self.scrollbarTop.style.visibility = "hidden";
            _self.scrollbarBottom.style.visibility = "hidden";
        }
        
        if (xVisibility) {
            _self.scrollbarLeft.style.visibility = "visible";
            _self.scrollbarRight.style.visibility = "visible";
        }
        else {
            _self.scrollbarLeft.style.visibility = "hidden";
            _self.scrollbarRight.style.visibility = "hidden";
        }
    }

    this.scaleXToGlobal = function(localX) {
        return localX / parseInt(_self.element.getBoundingClientRect().width) * parseInt(_self.drawCanvas.width);
    };

    this.scaleYToGlobal = function(localY) {
        return localY / parseInt(_self.element.getBoundingClientRect().height) * parseInt(_self.drawCanvas.height);
    };

    this.scaleXToLocal = function(globalX) {
        return (globalX / _self.parentWindow.width * 100) + "%"
    };

    this.scaleYToLocal = function(globalY) {
        return (globalY / _self.parentWindow.height * 100) + "%"
    };

    // TODO add a canvas or SVG to the parent div to draw annotations on and a subtopic to send them in



    this.parentResized = function() {
        _self.element.style.width = (_self.width / _self.parentWindow.width * 100) + "%";
        _self.element.style.height = (_self.height / _self.parentWindow.height * 100) + "%";
    };

    // assign message handlers
    this.messageHandlers[WINDOW_RESIZED_MESSAGE] = function(message) {
        var size = new Int16Array(message.buffer, 2, 2);
        var changed = false;
        _self.width = size[0];
        if (_self.drawCanvas.width != _self.width) {
            _self.drawCanvas.width = _self.width;
            changed = true;
        }
        _self.height = size[1];
        if(_self.drawCanvas.height != _self.height) {
            _self.drawCanvas.height = _self.height;
            changed = true;
        }
        if (_self.parentWindow) {
            // set the height and width if this isn't a top level window
            _self.element.style.width = (size[0] / _self.parentWindow.width * 100) + "%";
            _self.element.style.height = (size[1] / _self.parentWindow.height * 100) + "%";
        } else if (changed) {
            // call back if this is the (a?) top level window
            _self.remoteViewSizeChanged(size[0], size[1]);
        }
        for (var i = 0; i < _self.children.length; i++) {
            _self.children[i].parentResized();
        }
    };

    this.messageHandlers[WINDOW_MOVED_MESSAGE] = function(message) {
        var location = new Int16Array(message.buffer, 2, 2);
        //   move this if it is not the (a?) top level window
        if (_self.parentWindow) {
            _self.element.style.left = (location[0] / _self.parentWindow.width * 100) + "%";
            _self.element.style.top = (location[1] / _self.parentWindow.height * 100) + "%";
        }
        
        if(_self.isZoomWindow) {
           // Display a different section of our existing canvas because the consumer moved us
            _self.refreshImage();
        }
    };

    this.messageHandlers[WINDOW_RECTANGLE_UPDATED] = function(message) {
        var header = new Int16Array(message.buffer, 2, 5);
        var xOffset = header[0];
        var yOffset = header[1];
        var scaledWidth = header[2];
        var scaledHeight = header[3];
        var format = IMAGE_FORMAT[header[4]];
        var imageData = new Uint8Array(message.buffer, 12);
        var base64 = "data:image/" + format + ";base64," + encode(imageData);

        loadBase64Image(_self.drawCanvas, base64, xOffset, yOffset, scaledWidth, scaledHeight);
	    _self.deleteStaleCanvas();
        _self.drawCanvas.classList.remove("interstitial");
        
        // Backwards compatibility with clients who don't have scrollbar sub-topic:
        if(topic.metadata.scrollable && !_self.scrollbarTop) {
            _self.createScrollbars(false, true);
        }
    };

    if (topic.metadata.interactive) {
        _self.element.classList.add("interactive");

        var mouseDown = false;
        var sendMouseMessage = function(messageType, event, optionalParam) {
            var sentForThisWindow = false;
            if (!event.sentRemotely) {
                var boundingRect = _self.element.getBoundingClientRect();
                var messageSize = (optionalParam || optionalParam === 0) ? 4 : 3;
                var mouseMessage = new Int16Array(messageSize);
                mouseMessage[0] = messageType;
                mouseMessage[1] = _self.scaleXToGlobal(event.clientX - boundingRect.left);
                mouseMessage[2] = _self.scaleYToGlobal(event.clientY - boundingRect.top);
                if (optionalParam || optionalParam === 0) {
                    mouseMessage[3] = optionalParam;
                }
                topic.sendMessage(mouseMessage);
                event.sentRemotely = true;
                sentForThisWindow = true;
            }

            return sentForThisWindow;
        };

        var upActionHandler = function(event) {
              if (!_self.moving && mouseDown) {
                  if (event.button == 0) {
                      mouseDown = false;
                  }
                  sendMouseMessage(MOUSE_UP_MESSAGE, event, event.button);
              }
        };

        var downActionHandler = function(event) {
            if (!_self.moving) {
                var sentForThisWindow = sendMouseMessage(MOUSE_DOWN_MESSAGE, event, event.button);
                if (event.button == 0 &&  sentForThisWindow) {
                    mouseDown = true;
                }
            }
        };

        var moveActionHandler = function(event) {
            if (!_self.moving && mouseDown) {
                var now = new Date();
                if (!(lastSent &&
                    (lastSent.getTime() + _self.maxUpdateInterval > now.getTime()))) {
                    sendMouseMessage(MOUSE_MOVE_MESSAGE, event);
                    lastSent = now;
                }
            }
        };

        var dblclickActionHandler = function(event) {
            if (!_self.moving) {
                sendMouseMessage(MOUSE_DOUBLE_CLICK_MESSAGE, event);
            }
        };

        var lastSent;

        _self.addDocumentEventListener(DEVICE_INPUT_TYPE.concat("up"), upActionHandler);
        _self.addElementEventListener(_self.element, DEVICE_INPUT_TYPE.concat("down"), downActionHandler, false);
        _self.addElementEventListener(_self.element, DEVICE_INPUT_TYPE.concat("move"), moveActionHandler, false);
        _self.addElementEventListener(_self.element, "dblclick", dblclickActionHandler, false);
    }

    this.disableInteraction = function() {
        _self.element.classList.remove("active");
    };

    this.enableInteraction = function() {
        _self.element.classList.add("active");
    };

    var timeoutDocument = function(sharedItemId) {
    	var sharedItem = sharedItems[sharedItemId];
    	if (sharedItem == null) {
    		return;
    	}
        _self.onError({code:DOCUMENT_ERROR,message : "Timer expired for sharedItemId: " + sharedItemId + "; deleting shared document."});
        var documentEvent = {type: "timeout", sharedDocId: sharedItemId};
        if (sharedItem.eventHandler) {
        	sharedItem.eventHandler(documentEvent);
        }
    	sharedItem = null;
    	sharedItems[sharedItemId] = null;
    };
    documentPacket = new DocumentPacket(timeoutDocument);

    // Sends a message telling the windows host to create a new window containing the document
    // in the passed url
    this.pushDocument = function(docUrl, eventHandler, docMetadata) {
      if (zoomWindowOpen()) {
        _self.onError({code: DOCUMENT_ERROR, message: "Cannot push document when zooming."});
      } else {
    	var sharedItemId = sharedItemCounter;
    	sharedItemCounter++;
    	var sharedItem = {id: sharedItemId, url: docUrl, pushMethod: PUSH_METHOD_URL,
    			eventHandler: eventHandler, metadata: docMetadata};
    	sharedItems[sharedItemId] = sharedItem;
        var encodedUrl = encodeURLIfNecessary(docUrl);
        if (docMetadata) {
            encodedUrl += SHARED_DOCUMENT_METADATA_FRAGMENT;
            // We don't need to percent-encode the metadata because it will get stripped off anyway.
            encodedUrl += encodeMultiByteCharacters(docMetadata);
        }
        var pushDocMessage = new Uint8Array(encodedUrl.length + 4);
        var header = new Int16Array(pushDocMessage.buffer, 0, 2);
        header[0] = PUSH_DOCUMENT_MESSAGE;
        header[1] = sharedItemId;
        var payload = new Uint8Array(pushDocMessage.buffer, 4);
        for (var i = 0; i < encodedUrl.length; i++) {
            payload[i] = encodedUrl.charCodeAt(i);
        }
        console.log("Sending push document message with sharedItemId: " + sharedItemId);
        topic.sendMessage(pushDocMessage);
    	console.log("pushDocument(): sharedItems is:");
    	console.log(sharedItems);
        sharedItem.timer = setTimeout(function() { timeoutDocument(sharedItemId); },
        		SHARED_DOCUMENT_TIMEOUT_MILLIS);
        return sharedItemId;
      }
    };

    // Retrieves a document from the given url or file, and pushes that document to the consumer.  Sends a
    // message telling the windows host to create a new window containing the document whose contents 
    // are pushed over the socket
    this.pushContent = function(document, eventHandler, docMetadata) {
      if (zoomWindowOpen()) {
        _self.onError({code: DOCUMENT_ERROR, message: "Cannot push content when zooming."});
      } else {
        var sharedItemId = sharedItemCounter;
        sharedItemCounter++;
        var sharedItem = {
            id: sharedItemId, pushMethod: PUSH_METHOD_CONTENT,
            eventHandler: eventHandler, metadata: docMetadata
        };
        if (typeof document === "string") {
            //Retrieve the document contents
            var oReq = new XMLHttpRequest();
            oReq.open("GET", document, true);
            oReq.responseType = "arraybuffer";

            oReq.onreadystatechange = function (event) {
                if (oReq.readyState == 4) {
                    var documentEvent = {};
                    sharedItem.url = document;
                    sharedItems[sharedItemId] = sharedItem;
                    if (oReq.status == 200) {
                        var contentType = oReq.getResponseHeader("content-type");
                        sharedItem.contentType = contentType;
                        var arrayBuffer = oReq.response;
                        if (arrayBuffer == null || arrayBuffer.length == 0) {
                            _self.onError({code: DOCUMENT_ERROR, message: "Error retrieving document: " + document});
                            return;
                        }
                        documentPacket.sendPushContent(eventHandler, arrayBuffer, contentType, sharedItem, topic);
                    } else {
                        _self.onError({
                            code: DOCUMENT_ERROR,
                            message: "Error retrieving document: " + oReq.status + " " + oReq.statusText
                        });
                        documentEvent.type = "failed";
                        documentEvent.errorCode = SHARED_DOCUMENT_ERROR_HTTP_ERROR;
                        documentEvent.errorText =
                            sharedItemErrorTextMessages[documentEvent.errorCode];
                        documentEvent.httpErrorCode = oReq.status;
                        documentEvent.errorDetails = oReq.statusText;
                        if (eventHandler) {
                            eventHandler(documentEvent);
                        }
                    }
                }
            };
            console.log("Attempting to retrieve document at url: " + document);
            oReq.send();
        } else  if (document && document.name) {
            sharedItem.url = document.name;
            // determine content type
            var contentType;
            if (document.name.indexOf(".") > -1) {
                // We only really care if it's a PDF as that's the only file type we render differently.
                var extension = document.name.substring(document.name.lastIndexOf(".") + 1).toLowerCase();
                switch (extension) {
                    case "pdf" :
                        contentType = "application/pdf";
                        break;
                    case "jpg" :
                    case "png" :
                    case "bmp" :
                    case "gif" :
                    case "svg" :
                        contentType = "image/" + extension;
                        break;
                }
            }
            var reader = new FileReader();
            reader.addEventListener("load", function () {
                sharedItems[sharedItemId] = sharedItem;
                documentPacket.sendPushContent(eventHandler, reader.result, contentType, sharedItem, topic);
            });
            reader.readAsArrayBuffer(document);
        }
    	return sharedItemId;
      }
    };

    this.closeDocument = function(sharedItemId) {
    	console.log("In closeDocument(); sharedItemId = " + sharedItemId);
    	var message = new Uint8Array(4);
    	var messageHeader = new Int16Array(message.buffer, 0, 2);
    	messageHeader[0] = SHARED_DOCUMENT_CLOSE_REQUEST;
    	messageHeader[1] = sharedItemId;
    	console.log("Sending shared document close request message for sharedItemId: " + sharedItemId);
    	topic.sendMessage(message);
    };

    this.messageHandlers[SHARED_DOCUMENT_ACCEPTED] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
    	console.log("Received shared document accepted message for sharedItemId: " + sharedItemId);
        var sharedItem = sharedItems[sharedItemId];
        console.log("SHARED_DOCUMENT_ACCEPTED: sharedItems is: ");
        console.log(sharedItems);
        if (sharedItem == null) {
            _self.onError({code:DOCUMENT_ERROR,message : "No shared doc found for sharedItemId: " + sharedItemId + " (may have timed out)"});            
        	return;
        }
        if (sharedItem.pushMethod == PUSH_METHOD_CONTENT && sharedItem.content != null)
        {
        	//Push by content
        	//Now send the data chunks
        	for (var pos = 0; pos < sharedItem.content.length; pos += DATA_CHUNK_SIZE) {
        		var chunkSize = Math.min(sharedItem.content.length - pos, DATA_CHUNK_SIZE)
        		var chunkMessage = new Uint8Array(chunkSize + 4);
        		var chunkMessageHeader = new Int16Array(chunkMessage.buffer, 0, 2);
        		chunkMessageHeader[0] = PUSH_CONTENT_CHUNK;
        		chunkMessageHeader[1] = sharedItemId;
        		var chunkMessagePayload = new Uint8Array(chunkMessage.buffer, 4);
        		//Copy the image data into the chunk message
        		for (var b = 0; b < DATA_CHUNK_SIZE; b++) {
        			chunkMessagePayload[b] = sharedItem.content[pos + b];
        		}
        		topic.sendMessage(chunkMessage);
        		console.log("Sent content data chunk.");
        	}

        	//Now send the metadata
        	if (sharedItem.metadata)
        	{
        		var encodedMetadata = encodeMultiByteCharacters(sharedItem.metadata);
        		var metadataMessage = new Uint8Array(encodedMetadata.length + 4);
        		var metadataMessageHeader = new Int16Array(metadataMessage.buffer, 0, 2);
        		metadataMessageHeader[0] = PUSH_CONTENT_METADATA;
        		metadataMessageHeader[1] = sharedItem.id;
        		var metadataMessagePayload = new Uint8Array(metadataMessage.buffer, 4);
        		for (var i = 0; i < encodedMetadata.length; i++) {
        			metadataMessagePayload[i] = encodedMetadata.charCodeAt(i);
        		}
        		topic.sendMessage(metadataMessage);
        		console.log("Sent content metadata for sharedItemId = " + sharedItem.id);
        	}

        	//Finally send the end indicator
        	var endMessage = new Uint8Array(4);
        	var endMessageHeader = new Int16Array(endMessage.buffer, 0, 2);
        	endMessageHeader[0] = PUSH_CONTENT_END;
        	endMessageHeader[1] = sharedItemId;
        	topic.sendMessage(endMessage);
        	console.log("Sent content end indicator.");
        }
    };

    this.messageHandlers[SHARED_DOCUMENT_REJECTED] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
    	console.log("Received shared document rejected message for sharedItemId: " + sharedItemId);
        var sharedItem = sharedItems[sharedItemId];
        if (sharedItem == null) {
            _self.onError({code:DOCUMENT_ERROR,message : "No shared doc found for sharedItemId: " + sharedItemId + " (may have timed out)"});            
        	return;
        }
        var documentEvent = {type: "rejected", sharedDocId: sharedItemId};
        if (sharedItem.eventHandler) {
        	sharedItem.eventHandler(documentEvent);
        }
    	clearTimeout(sharedItem.timer);
    	sharedItem = null;
    	sharedItems[sharedItemId] = null;
    };

    this.messageHandlers[SHARED_DOCUMENT_SUCCEEDED] = function(message) {
        var header = new Int16Array(message.buffer, 2, 1);
        var sharedItemId = header[0];
    	console.log("Received shared document succeeded message for sharedItemId: " + sharedItemId);
        var sharedItem = sharedItems[sharedItemId];
        console.log("SHARED_DOCUMENT_SUCCEEDED: sharedItems is: ");
        console.log(sharedItems);
        if (sharedItem == null) {
            _self.onError({code:DOCUMENT_ERROR,message : "No shared doc found for sharedItemId: " + sharedItemId + " (may have timed out)"});            
        	return;
        }
    	clearTimeout(sharedItem.timer);
    	var documentEvent = {type: "succeeded", sharedDocId: sharedItemId, metadata: sharedItem.metadata};
    	if (sharedItem.eventHandler) {
    		sharedItem.eventHandler(documentEvent);
    	}
    	sharedItem.content = null;   //free up memory
    };

    this.messageHandlers[SHARED_DOCUMENT_FAILED] = function(message) {
        var header = new Int16Array(message.buffer, 2, 3);
        var sharedItemId = header[0];
        var errorCode = header[1];
        var httpErrorCode = header[2];
        var payload = new Uint8Array(message.buffer, 8);
        var errorDetails = String.fromCharCode.apply(null, payload);
    	console.log("Received shared document failed message for sharedItemId: " + sharedItemId);
        var sharedItem = sharedItems[sharedItemId];
        if (sharedItem == null) {
            _self.onError({code:DOCUMENT_ERROR,message : "No shared doc found for sharedItemId: " + sharedItemId + " (may have timed out)"});            
        	return;
        }

    	var documentEvent = {type: "failed", sharedDocId: sharedItemId,
    			errorCode: errorCode, errorText: sharedItemErrorTextMessages[errorCode], metadata: sharedItem.metadata};

    	console.log("Received SHARED_DOCUMENT_FAILED message.");
    	console.log("Error code is: " + errorCode);
        console.log("Error text message is: " + sharedItemErrorTextMessages[errorCode]);

    	if (errorCode == SHARED_DOCUMENT_ERROR_HTTP_ERROR) {
    		documentEvent.httpErrorCode = httpErrorCode;
    	}
    	if (errorDetails != null && errorDetails.length > 0) {
    		documentEvent.errorDetails = errorDetails;
    	}
    	if (sharedItem.eventHandler) {
    		sharedItem.eventHandler(documentEvent);
    	}
        _self.onError({code:errorCode,message : sharedItemErrorTextMessages[errorCode]});            
    	clearTimeout(sharedItem.timer);
    	sharedItem = null;
    	sharedItems[sharedItemId] = null;
    };

    //The SHARED_DOCUMENT_CLOSED message is sent only by the iOS client to indicate that a 
    //shared doc has been closed.  On the web client, we instead send a message that the 
    //window was closed, and we have the shared doc id in the topic metadata.
    this.messageHandlers[SHARED_DOCUMENT_CLOSED] = function(message) {
        var header = new Int16Array(message.buffer, 2, 2);
        var sharedItemId = header[0];
        var initiator = header[1];
    	console.log("Received shared document closed message for sharedItemId: " + sharedItemId);
    	_self.handleDocumentClosed(sharedItemId, initiator);
    };


    this.messageHandlers[MOUSE_MOVE_MESSAGE] = function(message, source) {
        var crd = _self.get_mapped_cursor_coords(new Int16Array(message.buffer, 2, 2));
        _self.consumerCursorCallbacks.move(crd.x, crd.y);
    };

    _self.get_mapped_cursor_coords = function(details) {
        var localX = details[0];
        var localY = details[1];
        var rect = _self.element.getBoundingClientRect();
        var globalX = rect.left + (localX * (_self.drawCanvas.clientWidth / _self.width));
        var globalY = rect.top + (localY * (_self.drawCanvas.clientHeight / _self.height));
        return {
            x:globalX,
            y:globalY
        };
    };

    _self.handleDocumentClosed = function(sharedItemId, initiator) {
    	console.log("handleDocumentClosed(): sharedItems is: ");
    	console.log(sharedItems);
        var sharedItem = sharedItems[sharedItemId];
        if (sharedItem == null) {
        	console.log("No shared doc found for sharedItemId: " + sharedItemId);
        	return;
        }
    	var documentEvent = {type: "closed", sharedDocId: sharedItemId,
    			initiator: initiatorStrings[initiator]};
        if (sharedItem.eventHandler) {
        	sharedItem.eventHandler(documentEvent);
        }
        sharedItem = null;
        sharedItems[sharedItemId] = null;
    };

    var scheduleResizedMessage = function(delay) {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(_self.sendResizedMessage, delay);
    };

    var resizeTimeout;
    this.resizeElement =function(deltaX, deltaY, delay) {
        delay = delay | 200;
        var newX = _self.width + deltaX;
        var newY = _self.height + deltaY;
        _self.element.style.width = _self.scaleXToLocal(newX);
        _self.element.style.height = _self.scaleYToLocal(newY);
        _self.width = newX;
        _self.height = newY;
        scheduleResizedMessage(delay);
    };

    var valueToSend;
    var inputLocationDiv = _self.element.ownerDocument.createElement("DIV");
    inputLocationDiv.classList.add("input-location");
    inputLocationDiv.addEventListener("click", function(event){
        var boundingRect = _self.element.getBoundingClientRect();

        var inputAtLocationMessage = new Uint8Array(valueToSend.length + 6);
        var header = new Int16Array(inputAtLocationMessage.buffer, 0, 3);
        var payload = new Uint8Array(inputAtLocationMessage.buffer, 6, valueToSend.length);
        header[0] = INPUT_AT_LOCATION;
        header[1] = _self.scaleXToGlobal(event.clientX - boundingRect.left);
        header[2] = _self.scaleYToGlobal(event.clientY - boundingRect.top);
        for (var i = 0; i < valueToSend.length; i++) {
            payload[i] = valueToSend.charCodeAt(i);
        }
        inputLocationDiv.style.pointerEvents = "";
        valueToSend = undefined;
        _self.topic.sendMessage(inputAtLocationMessage);
    });

    _self.inputAtNextClickedLocation = function(inputString) {
        valueToSend = inputString;
        inputLocationDiv.style.pointerEvents = "all";
    };

    _self.element.appendChild(inputLocationDiv);


    _self.closed = function(initiator) {
    	console.log("In ClientSharedWindow.closed(); initiator = " + initiator);
    	_self.consumerCursorCallbacks.hide();
        _self.removeElementEventListeners();
        if (_self.cleanUpElement) {
        	if (_self.element.parentNode) {
        		_self.element.parentNode.removeChild(_self.element);
        	}
        	if (_self.parentWindow.children.indexOf(_self) != -1) {
        		_self.parentWindow.children.splice(_self.parentWindow.children.indexOf(_self), 1);
        	} else {
        		console.log("_self not found in list of parent window's children!");
        	}
        } else {
            if (window.staleCanvas) {
                if (_self.drawCanvas.parentElement) {
                  _self.drawCanvas.parentElement.removeChild(_self.drawCanvas);
                }
            } else {
        	window.staleCanvas = _self.drawCanvas;
      		window.staleCanvas.classList.add("interstitial");
            }
                if (window.staleCanvasTimer)
                {
                    clearTimeout(window.staleCanvasTimer);
                    window.staleCanvasTimer = undefined;
                }
                window.staleCanvasTimer = setTimeout(function() { 
                    _self.deleteStaleCanvas();
                    window.staleCanvasTimer = undefined;
                }, 5000);

            _self.element.removeChild(inputLocationDiv);
            if (topic.metadata.scrollable && _self.scrollbarTop) {
                _self.element.removeChild(_self.scrollbarTop);
                _self.element.removeChild(_self.scrollbarBottom);
                _self.element.removeChild(_self.scrollbarLeft);
                _self.element.removeChild(_self.scrollbarRight);
            }
        }
        //If this is a window containing a shared document, clean up the shared doc.
        if (topic.metadata.sharedItemId != null) {
        	var sharedItemId = parseInt(topic.metadata.sharedItemId);
        	console.log("Detected document window closed for sharedItemId: " +
        			sharedItemId);
        	_self.parentWindow.handleDocumentClosed(sharedItemId, initiator);
        }
        //If this is the screenshare window, handle the closing of all of its shared docs
        //which do not have their own shared window.  (They don't have their own shared window
        //when the iOS client is used as the consumer client.)
        if (sharedItems != null) {
        	for (var sharedItemId in sharedItems) {
        		if (sharedItems[sharedItemId] != null) {
        			console.log("Looking for child window matching sharedItemId: " +
        					sharedItemId);
        			var foundChildWin = false;
        			for (var j = 0; j < _self.children.length; j++) {
        				var w = _self.children[j];
        				if (w instanceof DocumentWindow &&
        						w.topic.metadata.sharedItemId == sharedItemId)
        				{
        					foundChildWin = true;
        					console.log("Found child window for sharedItemId: " + sharedItemId +
        							"... doing nothing (yet).");
        					break;
        				}
        			}
        			if (!foundChildWin) {
        				console.log("Didn't find child window for sharedItemId: " + sharedItemId);
        				console.log("This must be a doc shared to an iOS client... cleaning up document.");
        				_self.handleDocumentClosed(sharedItemId, initiator);
        			}
        		}
        	}
        }
        //Now call closed() on the child windows.  This will clean up any shared docs that 
        //have their own shared window, among other things.
        for (var i = _self.children.length; i > 0; i--) {
            _self.children[i - 1].closed(initiator);
        }
        _self.element.classList.remove("interactive");
        _self.element.classList.remove("shared-window");
    };
}

ClientSharedWindow.prototype = Object.create(SharedWindow.prototype);

function loadBase64Image(canvas, src, x, y, width, height) {
    var img = new Image();

    img.src = src;
    img.onload = function() {
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, x, y, width, height);
    };
}

function encode(input, offset) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = offset || 0;

    while (i < input.length) {
        chr1 = input[i++];
        chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index
        chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
            keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
}

function AnnotationWindow(topic, svg, parentWindow, cleanUpElement, active) {

    SharedWindow.call(this, topic, svg, parentWindow, cleanUpElement);
    this.parentWindow = parentWindow;
    var _self = this;

    this.stroke = "red";
    this.strokeOpacity = 1.0;
    this.strokeWidth = 1;

    var transform = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "g");

    svg.appendChild(transform);

    this.setAgentDrawStyle = function(stroke, strokeOpacity, strokeWidth) {
        console.log("Setting agent stroke style (" + stroke + "," + strokeOpacity + "," + strokeWidth + ")");
        this.stroke = stroke;
        this.strokeOpacity = strokeOpacity;
        this.strokeWidth = strokeWidth;
        console.log("Set agent stroke style");
    }

    this.messageHandlers[ANNOTATION_ADDED] = function(message, source) {
        addAnnotations(message, source);
    };

    this.messageHandlers[ANNOTATIONS_SET] = function(message, source) {
        _self.clear(false);
        addAnnotations(message, source);
    };

    function parseSVGPath(path, points) {
        var splitted = path.split(" ");
        // Look for X,Y pairs in M X Y L X Y Z

        if (splitted[0] == 'M') {
            var idx = 1;
            while (idx < splitted.length) {
                points[points.length] = { x: splitted[idx++],
                                          y: splitted[idx++] };
                idx++; // Skip 'L'
            }
        }
    }


    function addAnnotations(message, source) {
        // Recalculate scale transform in case it's changed without us being notified
        if (_self.parentWindow) {
            var width = svg.parentNode.offsetWidth;
            var scale = (width / _self.parentWindow.width);
            transform.setAttribute("transform", "scale(" + scale + ")");
        }
        var stringPayload = String.fromCharCode.apply(null, new Uint8Array(message.buffer, 2));
        var temp = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "svg");

        var div = svg.ownerDocument.createElement("div"); // svg in IE doesn't support .innerHTML, but divs do
        div.innerHTML = stringPayload;

        var addedAnnotation = {
            points : [],
            stroke : null,
            strokeOpacity : null,
            strokeWidth : null,
            getLastPoint : function() {
                if (this.points.length > 0) {
                    return this.points[this.points.length-1];
                }
                return null;
            }
        };

        while (div.firstChild) {
            addedAnnotation.stroke = div.firstChild.attributes.getNamedItem("stroke").value;
            addedAnnotation.strokeOpacity = div.firstChild.attributes.getNamedItem("stroke-opacity").value;
            addedAnnotation.strokeWidth = div.firstChild.attributes.getNamedItem("stroke-width").value;

            var d = div.firstChild.attributes.getNamedItem("d").value;
            parseSVGPath(d, addedAnnotation.points);

            temp.appendChild(div.firstChild);
        }

        while (temp.firstChild) {
            if (temp.firstChild.namespaceURI != SVG_NAMESPACE) {
                transform.appendChild(deepCloneWithNameSpace(svg, temp.firstChild, SVG_NAMESPACE));
                temp.removeChild(temp.firstChild);
            } else {
                transform.appendChild(temp.firstChild);
            }
        }

        if (_self.parentWindow.annotationAddedCallback) {
            _self.parentWindow.annotationAddedCallback(addedAnnotation, source.metadata.name);
        }
    }

    this.parentResized = function() {
        // TODO should we clear the annotations? They make little sense now...
        // Add the scale attribute if there is a parent to scale relative to
        if (_self.parentWindow && typeof svg.parentNode !== 'undefined' && svg.parentNode != null) {
            var width = svg.parentNode.offsetWidth;
            var scale = (width / _self.parentWindow.width);
            transform.setAttribute("transform", "scale(" + scale + ")");
        }
    };


    _self.parentResized();

    var mousedown = false;
    var previousPosition=[];
    var startX;
    var startY;
    var lastEvent;
    var boundingRect;




    var path;

    var drawPending = function() {
        if (path) {
            var div = path.ownerDocument.createElement("div");
            div.appendChild(deepCloneWithNameSpace(path, path, SVG_NAMESPACE));
            var pathString = div.innerHTML;
            var message = new Uint8Array(pathString.length + 2);
            var type = new Int16Array(message.buffer, 0, 1);
            type[0] = ANNOTATION_ADDED;
            var payload = new Uint8Array(message.buffer, 2);
            fromString(pathString, payload);
            topic.sendMessage(message);
            path = null;
        }
    };

    var downActionHandler = function(event) {
        if (event.button == 0) {
            boundingRect = svg.parentNode.getBoundingClientRect();
            var scaleFactor = _self.parentWindow.width / svg.parentNode.offsetWidth;
            startX = Math.round((event.clientX - boundingRect.left) * scaleFactor);
            startY = Math.round((event.clientY - boundingRect.top) * scaleFactor);
            lastEvent = new Date();
            mousedown = true;
            previousPosition = [event.clientX, event.clientY];
            event.preventDefault();
            event.stopPropagation();
        }
    };

    var moveActionHandler = function(event) {
        var currentPosition = [event.clientX, event.clientY]
        if (mousedown && mouseHasMoved(previousPosition, currentPosition)) {
            previousPosition = [event.clientX, event.clientY];
            var scaleFactor = _self.parentWindow.width / svg.parentNode.offsetWidth;
            var pointX = Math.round((event.clientX - boundingRect.left) * scaleFactor);
            var pointY = Math.round((event.clientY - boundingRect.top) * scaleFactor);
            var now = new Date();

            path = path || svg.ownerDocument.createElementNS(SVG_NAMESPACE, "path");
            // For compactness we could drop most of the spaces and all but the first L
            var d = path.getAttribute("d") || "M " + startX + " " + startY;
            d += " L " + pointX + " " + pointY;
            path.setAttribute("d", d);
            path.setAttribute("stroke", _self.stroke);
            path.setAttribute("stroke-width", _self.strokeWidth);
            path.setAttribute("stroke-opacity", _self.strokeOpacity);
            path.setAttribute("fill", "none");
            transform.appendChild(path);

            // Limit the sending of annotation updates to the MAX_ANNOTATION_INTERVAL
            if ((lastEvent.getTime() + _self.maxUpdateInterval) < now.getTime()) {
                drawPending();
                lastEvent = now;
                startX = pointX;
                startY = pointY;
            }
            event.preventDefault();
            event.stopPropagation();
        }
    };

    var upActionHandler = function(event) {
          mousedown = false;

          drawPending();
          previousPosition = [];
    };

    _self.addElementEventListener(svg, DEVICE_INPUT_TYPE.concat("down"), downActionHandler, false);
    _self.addElementEventListener(svg, DEVICE_INPUT_TYPE.concat("move"), moveActionHandler, false);
    _self.addDocumentEventListener(DEVICE_INPUT_TYPE.concat("up"), upActionHandler, false);

    function mouseHasMoved(previousPosition, currentPosition)
    {
    	if(previousPosition[0] !== currentPosition[0] || previousPosition[1] !== currentPosition[1])
    	{
    		return true;
    	}
    	return false;
    }

    this.clear = function(clearRemote) {
        try {
            while (transform.firstChild) {
                transform.removeChild(transform.firstChild);
            }
        } catch(e) {
            console.warn(e);
        }

        if (clearRemote) {
            var clearMessage = new Int16Array(1);
            clearMessage[0] = ANNOTATIONS_SET;
            topic.sendMessage(clearMessage);
        }

        if (_self.parentWindow.annotationsClearedCallback) {
            _self.parentWindow.annotationsClearedCallback();
        }
    };

    var ieCursorActiveStyle, ieCursorInactiveStyle, ieCursorDoOnce;
    this.enableDrawing = function(sdkUrl) {
        if (typeof assistSdkUrl==='undefined' || assistSdkUrl===null) {
            assistSdkUrl = sdkUrl;
        }
        if (isIE && sdkUrl) {
            if (!ieCursorDoOnce) {
                sdkUrl = sdkUrl.replace(/\/?$/, '/');
                ieCursorActiveStyle = "url('" + sdkUrl + "../shared/assets/pencil_cursor.cur" + "'), pointer";

                var computedStyle = svg.ownerDocument.defaultView.getComputedStyle(svg, null);
                ieCursorInactiveStyle = computedStyle['cursor'];
            }
            
            if (ieCursorActiveStyle) {
                svg.style.cursor = ieCursorActiveStyle;
            }
            
            ieCursorDoOnce = true;
        }
        
        addClassSvg(svg, "active"); // ie doesn't support classList on svg
    };

    this.disableDrawing = function() {
        removeClassSvg(svg, "active"); // ie doesn't support classList on svg
        if (isIE && ieCursorInactiveStyle) {
            svg.style.cursor = ieCursorInactiveStyle;
        }
    };

    var elementWindow = function() {
        var windowCandidates = [];
        windowCandidates.push(window);
        if (window.opener) {
            windowCandidates.push(window.opener);
        }
        // TODO also check iframes if there are any
        for (var i = 0; i < windowCandidates.length; i++) {
            if (windowCandidates[i].document == _self.element.ownerDocument)
            return windowCandidates[i];
        }
    }();

    if (elementWindow) {
        // TODO this won't be refreshed on navigation...
        _self.addElementEventListener(elementWindow, "resize", function() {
            _self.parentResized();
        });
    }
    
    if (active == true) {
        this.enableDrawing(assistSdkUrl);
    }
}

AnnotationWindow.prototype = Object.create(SharedWindow.prototype);

function DocumentWindow(topic, containingDiv, parentWindow, docDesc, scaleFactor, pushTopic,
		sharedItem, cleanUpElement)
{
	console.log("Creating new DocumentWindow with scaleFactor: " + scaleFactor);
    var _self = this;
    HostSharedWindow.call(this, topic, containingDiv, parentWindow, scaleFactor, cleanUpElement);
    _self.sharedItemId = sharedItem.id;
    console.log("Assigning shared item " + sharedItem.id + " to this document window.");
    _self.sharedItem = sharedItem;
    sharedItem.documentWindow = this;
    _self.element.classList.add("document-window");
    var viewDiv = _self.element.ownerDocument.createElement("div");
    viewDiv.classList.add("shared-document-view");
    _self.element.appendChild(viewDiv);

    if (DEVICE_INPUT_TYPE === "pointer") {
        viewDiv.style.touchAction = "none";
    }

    var onLoad = docDesc.onLoad;
    var onError = docDesc.onError;

    function sendSharedDocSucceededMessage(pushTopic, sharedItemId) {
        if (onLoad) {
            onLoad();
            return;
        }
        if (pushTopic != null) {
        	var succeededMessage = new Uint8Array(4);
        	var succeededMessageHeader = new Int16Array(succeededMessage.buffer, 0, 2);
        	succeededMessageHeader[0] = SHARED_DOCUMENT_SUCCEEDED;
        	succeededMessageHeader[1] = sharedItemId;
        	console.log("Sending shared document succeeded message for sharedItemId: " + sharedItemId);
        	pushTopic.sendMessage(succeededMessage);
        } else {
        	console.log("sendSharedDocSucceededMessage(): pushTopic is null... not sending shared document succeeded message.");
        }
    }

    function handleConsumerDocumentRetrievalFailure(req, topic) {
        console.log("Error retrieving document: " + req.status + " " + req.statusText);
        var errorMessage = req.status + " " + req.statusText;
        var errorCode = SHARED_DOCUMENT_ERROR_HTTP_ERROR;
        var httpErrorCode = req.status;
        var httpErrorText = req.statusText;
        showError(errorMessage, null, false, errorCode, httpErrorCode,
            httpErrorText, topic, _self.sharedItemId);
    }

    function showError(errorMessage, docFrame, isImage, errorCode, httpErrorCode,
    		errorDetails, pushTopic, sharedItemId)
    {
        if (onError) {
            if (topic.metadata.closeable) {
                _self.close(INITIATOR_CONSUMER);
            }
            onError({errorCode:errorCode, message:errorMessage});
            return;
        }
    	console.log("In showError(); sharedItemId = " + sharedItemId + ", pushTopic = " + pushTopic);
    	if (docFrame == null) {
    		docFrame = _self.element.ownerDocument.createElement("div");
            docFrame.classList.add("document-frame");
    	}
    	var errSpan = _self.element.ownerDocument.createElement("span");
    	errSpan.classList.add("shared-document-error");
    	var shareTargetType = i18n.t("assistI18n:error.shareFail.targetType" + ((isImage == true) ? ".image" : ".document"));
    	var formattedMessage = "<p>";

        console.log("errormsg: " + errorMessage);

    	formattedMessage += i18n.t("assistI18n:error.shareFail.message", {"targetType":shareTargetType}) + "</p>";
        formattedMessage += "<p>" + i18n.t("assistI18n:error.shareFail.error", {"error":("" + errorMessage)});

    	formattedMessage += "</p>";
  	    errSpan.innerHTML = formattedMessage;

    	docFrame.appendChild(errSpan);
    	var errBoxWidth = 550;
    	var errBoxHeight = 175;
		var errBoxX = (_self.parentWindow.width - errBoxWidth) / 2;
		_self.element.style.left = errBoxX + "px";
		var errBoxY = (_self.parentWindow.height - errBoxHeight) / 2;
		_self.element.style.top = errBoxY + "px";
		_self.sendMovedMessage(errBoxX, errBoxY);
		_self.width = errBoxWidth + "px";
		_self.element.style.width = _self.width;
		_self.height = errBoxHeight + "px";
		_self.element.style.height = _self.height;
        viewDiv.appendChild(docFrame);

        if (pushTopic != null) {
        	console.log("errorDetails = " + errorDetails);
        	console.log("errorDetails.length = " + errorDetails.length);
        	var errorDetailsLen = (errorDetails == null) ? 0 : errorDetails.length;
        	var failedMessageLen = 8 + errorDetailsLen;
        	console.log("failedMessageLen = " + failedMessageLen);
        	var failedMessage = new Uint8Array(8 + errorDetailsLen);
        	var failedMessageHeader = new Int16Array(failedMessage.buffer, 0, 4);
        	failedMessageHeader[0] = SHARED_DOCUMENT_FAILED;
        	failedMessageHeader[1] = sharedItemId;
        	failedMessageHeader[2] = errorCode;
        	failedMessageHeader[3] = (httpErrorCode == null) ? 0 : httpErrorCode;
        	var payload = new Uint8Array(failedMessage.buffer, 8);
        	for (var i = 0; i < errorDetailsLen; i++) {
        		payload[i] = errorDetails.charCodeAt(i);
        	}
        	console.log("Sending shared document failed message for sharedItemId: " + sharedItemId);
        	pushTopic.sendMessage(failedMessage);
        } else {
        	console.log("showError(): pushTopic is null... not sending document failed message.");
        }
        if (parentWindow.documentReceivedErrorCallback) {
        	parentWindow.documentReceivedErrorCallback(sharedItem);
        }
    }


    function handlePdfDocument(pdfGetter) {
        _self.pdfDoc = null;
        var renderPage = function(page, canvas, image, isLastPage) {
            var viewport = page.getViewport(2);
            canvas.height = viewport.height;
            //          canvas.style.height = viewport.height / 2 + "px";
            canvas.width = viewport.width;
            image.style.width = viewport.width / 2 + "px";
            image.classList.add("document");
            var context = canvas.getContext("2d");
            var renderContext = {
                canvasContext: context,
                viewport: viewport
            };


            var rTask = page.render(renderContext);

            rTask.promise.then(function() {
                image.src = canvas.toDataURL("image/png");
                if (isLastPage == true) {
                    console.log("Document has finished rendering - update content.");
                    // Re-render.
                    _self.refreshContent();
                }
            });
        };

        var getAndRenderPage = function(pdfDoc, pageNum, pageCanvas, pageImage) {
            pdfDoc.getPage(pageNum).then(function(page) {
                var isLastPage = false;
                if (pageNum == pdfDoc.numPages) {
                    isLastPage = true;
                }
                renderPage(page, pageCanvas, pageImage, isLastPage);
            });
        };

        var docFrame = _self.element.ownerDocument.createElement("div");
        docFrame.classList.add("document-frame");
        console.log("About to try to load and render pdf document.");
        try {
            pdfGetter().then(function(pdfDoc) {
                _self.pdfDoc = pdfDoc;
                for (var i = 1; i <= pdfDoc.numPages; i++) {
                    var pageCanvas = _self.element.ownerDocument.createElement("canvas");
                    var pageImage = _self.element.ownerDocument.createElement("img");
                    docFrame.appendChild(pageImage);
                    getAndRenderPage(pdfDoc, i, pageCanvas, pageImage);
                }
                sendSharedDocSucceededMessage(pushTopic, _self.sharedItemId);
    	        if (parentWindow.documentReceivedSuccessCallback) {
                    parentWindow.documentReceivedSuccessCallback(sharedItem);
    	        }
            }, function(err) {
                //This is called if an error occurs in pdf loading or parsing
                console.log("PDF loading or parsing error: " + err);
                showError(err, docFrame, false);
            });
        } catch (err) {
            console.log("PDF loading or parsing error: " + err);
            showError(err, docFrame, false);
        }
        var newX = _self.parentWindow.width * 0.1;
        _self.element.style.left = newX + "px";
        var newY = _self.parentWindow.height * 0.1;
        _self.element.style.top = newY + "px";
        _self.sendMovedMessage(newX, newY);
        _self.width = _self.parentWindow.width * 0.8 + "px";
        _self.element.style.width = _self.width;
        _self.height = _self.parentWindow.height * 0.8 + "px";
        _self.element.style.height = _self.height;

        viewDiv.appendChild(docFrame);

        _self.refreshPdfContent = function () {
            var docImgs = docFrame.getElementsByTagName("img");
            for (var i = 0; i < docImgs.length; i++) {
                var docImg = docImgs[i];
                // Currently rendering at 200% and then letting the browser scale, this should look fairly good zoomed
                // but won't need to be re-rendered, which seems to cause some issues (like the pdf being rendered back to front and upside down)
                docImg.style.width = docImg.naturalWidth * _self.zoomLevel / 200 + "px";
            }
            _self.refreshContent();

        };
 
        _self.applyZoom = function() {
            _self.sendZoomLevelChangedMessage();
            _self.refreshPdfContent();
        };
        _self.applyZoom();
    };

    var getPdfDoc = function(document) {
        
        PDFJS.disableFontFace=true;
        PDFJS.cMapUrl = this.window.AssistController.config.getUrl() + '/assistserver/sdk/web/shared/js/thirdparty/cmaps/';
        PDFJS.cMapPacked = true;
         
        // Return a promise
        if (pdfWorkerBlobURL) {
            PDFJS.workerSrc = pdfWorkerBlobURL;
            return PDFJS.getDocument(document);
        } else {
            var pdfWorkerPromise = new PDFJS.LegacyPromise()
            var workerAjax = new XMLHttpRequest();

            //the callback function to be callled when AJAX request comes back
            workerAjax.onreadystatechange=function() {
                if (workerAjax.readyState == 4) {
                    if (workerAjax.status == 200) {
                        pdfWorkerBlobURL = window.URL.createObjectURL(new Blob([workerAjax.responseText], {
                            type: "text/javascript"
                        }));
                        PDFJS.workerSrc = pdfWorkerBlobURL;

                    } else {
                        // Unable to download the worker script so disable the worker and load the PDF without it
                        PDFJS.disableWorker = true;
                    }
                    PDFJS.getDocument(document).then(function (doc) {
                        pdfWorkerPromise.resolve(doc);
                    });
                }
            };
            workerAjax.open("GET",PDFJS.workerSrc,true);
            workerAjax.send();

            return pdfWorkerPromise;
        }
    };

    function handleDocumentUrl(url, contentType) {
    	console.log("In handleDocumentUrl(); contentType = " + contentType);
    	if (contentType.indexOf("image/") == 0) {
    		// This is an image of some sort so display it as such
    		var image = _self.element.ownerDocument.createElement("img");
    		image.onload = function() {
    			// Determine the optimal starting size for this image
    			// Calculate the aspect ratio of the image and the parent window to determine the bounding dimention
    			var imageAspect = image.naturalHeight / image.naturalWidth;
    			var parentAspect = parentWindow.height / parentWindow.width;

    			var height;
    			var width;
    			if (imageAspect > parentAspect) {
    				// the image has a narrower aspect than the parent so limit it to 80% of the parents height
    				height = Math.min(image.naturalHeight, (parentWindow.height * 0.8));
    				width = height / imageAspect;
    			} else {
    				// the image has the same or a wider aspect than the parent so limit it to 80% of the parents width
    				width = Math.min(image.naturalWidth, (parentWindow.width * 0.8));
    				height = width * imageAspect;
    			}
    			_self.height = height;
    			_self.width = width;
    			_self.element.style.height = height + "px";// parentWindow.height * 100 + "%";
    			_self.element.style.width =  width + "px"; // parentWindow.width * 100 + "%";

    			// If this is an image format we can encode in to then it's probably a good idea to do so
    			var imageFormat = IMAGE_FORMAT.indexOf(contentType.substring(6));
    			if (imageFormat) {
    				_self.imageFormat = imageFormat;
    			}
    			// To start stick it in the center
    			_self.element.style.top = ((_self.parentWindow.height - _self.height) / 2) + "px";
    			_self.element.style.left = ((_self.parentWindow.width - _self.width) / 2) + "px";

    			viewDiv.appendChild(image);

    			_self.sendSizeAndPosition();
    			_self.refreshContent();

    			_self.applyZoom = function() {
    				_self.sendZoomLevelChangedMessage();
    				image.height = _self.zoomLevel * image.naturalHeight / 100;
    				image.width = _self.zoomLevel * image.naturalWidth / 100;
    				// Flick the auto overflow off and back on so that the scrollbars are not counted when
    				// determining if scroll bars are needed. (I.e. so we don't sometimes have scroll bars at 100%)
    				viewDiv.style.overflow = "hidden";
    				setTimeout(function(){viewDiv.style.overflow = "";}, 1);
    			};
    			_self.applyZoom();

    			console.log("Successfully rendered image.");
    	        sendSharedDocSucceededMessage(pushTopic, _self.sharedItemId);
    	        if (parentWindow.documentReceivedSuccessCallback) {
    	        	parentWindow.documentReceivedSuccessCallback(sharedItem);
    	        }
    		};
	        image.onerror = function() {
	        	var errMessage = "Error loading or parsing image file";
	        	console.log(errMessage);
	            showError(errMessage, null, true, SHARED_DOCUMENT_ERROR_FILE_PARSING_ERROR,
	            		null, errMessage, pushTopic, _self.sharedItemId);
	        };
	        image.setAttribute("src", url);
	    } else {
	        // TODO check for "application/pdf" mime type or just assume?
	        if (contentType.indexOf("application/pdf") == 0) {
                handlePdfDocument(function() {return getPdfDoc({url:url});});
            } else {
	        	var errText = "Unrecognized MIME type: " + contentType;
	        	showError(errText, null, false,
	        			SHARED_DOCUMENT_ERROR_UNSUPPORTED_MIME_TYPE, null, errText,
	        			pushTopic, _self.sharedItemId);
	        }
	    }

	    //Clear annotations when shared document window is opened.
	    _self.clearAnnotations();

	    _self.messageHandlers[DOCUMENT_ZOOMED_LEVEL_CHANGED] = function(message) {
	    	_self.zoomLevel = new Int16Array(message.buffer, 2, 1)[0];
	    	_self.element.getElementsByClassName("zoom-indicator")[0].textContent = i18n.t("assistI18n:shared.formattedPercent", {"number": _self.zoomLevel});
	    	_self.applyZoom();
	    };
	}

    if (docDesc.url) {
        var url = docDesc.url;

        console.log("url = " + url);
        var dataRegex = /^data:(.*?);/;
        var matches = dataRegex.exec(url);
        if (matches != null) {
            var contentType = matches[1];
            console.log("Data url... calling handleDocumentUrl()");
            handleDocumentUrl(url, contentType);
        } else {
            try {
                var getRequest = new XMLHttpRequest();
                getRequest.open("get", url, true);
                getRequest.onreadystatechange = function (event) {
                    if (getRequest.readyState == 4) {
                        if (getRequest.status == 200) {
                            var contentType = getRequest.getResponseHeader("Content-Type");
                            console.log("contentType = " + contentType);
                            handleDocumentUrl(url, contentType);
                        } else {
                            handleConsumerDocumentRetrievalFailure(getRequest, pushTopic);
                        }
                    }
                };
                getRequest.send(null);
            } catch (ex) {
                handleConsumerDocumentRetrievalFailure(getRequest, pushTopic);
            }
        }
    } else {
        if (docDesc.data) {
            if (docDesc.contentType.indexOf("application/pdf") == 0) {
                handlePdfDocument(function () {
                        return getPdfDoc({data: docDesc.data});
                })
            } else {
                var dataUri = "data:" + docDesc.contentType + ";base64," + encode(docDesc.data);
                handleDocumentUrl(dataUri, docDesc.contentType);
            }
        }
    }

    _self.addElementEventListener(viewDiv, "scroll", function(event) {
        _self.refreshContent();
        //Clear annotations when shared document is scrolled.
        _self.clearAnnotations();
    });

    var scrolling = false;
    var startX;
    var startY;

    var downActionHandler = function(event) {
       if (event.button == 0) {
           scrolling = true;
           startX = event.clientX;
           startY = event.clientY;
           event.preventDefault();
           event.stopPropagation();
       }
    };

    var moveActionHandler = function(event) {
       if (scrolling) {
           var deltaX = startX - event.clientX;
           var deltaY = startY - event.clientY;
           viewDiv.scrollLeft += deltaX;
           viewDiv.scrollTop += deltaY;
           event.preventDefault();
           event.stopPropagation();
           startX = event.clientX;
           startY = event.clientY;
       }
    };

    var upActionHandler = function(event) {
       if (event.button == 0) {

        scrolling = false;
       }
    };

    _self.addElementEventListener(viewDiv, DEVICE_INPUT_TYPE.concat("down"), downActionHandler);
    _self.addDocumentEventListener(DEVICE_INPUT_TYPE.concat("move"), moveActionHandler);
    _self.addDocumentEventListener(DEVICE_INPUT_TYPE.concat("up"), upActionHandler);

    _self.scheduleObserver();

    _self.clearAnnotations = function() {
        var parent = _self.parentWindow;
        for (var i = 0; i < parent.children.length; i++) {
        	var x = parent.children[i];
        	if (x instanceof AnnotationWindow) {
        		x.clear(true);
        	}
        }
    };

    _self.closed = function(initiator) {
    	console.log("In DocumentSharedWindow.closed().");
    	console.log("_self.sharedItemId is " + _self.sharedItemId);
        try {
            if (_self.parentWindow && _self.element.parentNode) {
                _self.element.parentNode.removeChild(_self.element);
            }
            observer.disconnect();
            _self.removeElementEventListeners();
        } catch(e) {
            console.warn(e);
        }

        //Clear annotations when a shared document window is closed.
        _self.clearAnnotations();

        //Free up memory from pdf doc when a shared doc window is closed.
        _self.pdfDoc = null;

        if (_self.parentWindow) {
        	if (_self.parentWindow.children.indexOf(_self) != -1) {
        		_self.parentWindow.children.splice(
        				_self.parentWindow.children.indexOf(_self), 1);
        	} else {
        		console.log("_self not found in parent window's children!");
        	}
        }

        for (var i = _self.children.length; i > 0; i--) {
            _self.children[i - 1].closed(initiator);
        }
        _self.element.classList.remove("interactive");

        if (!_self.alreadyClosed && sharedItem.onClosed) {
        	sharedItem.onClosed(initiatorStrings[initiator]);
        }

        _self.alreadyClosed = true;
        console.log("End DocumentSharedWindow.closed().");
    };

    _self.topic.participantJoined = function(newParticipant) {
        _self.sendSizeAndPosition();
        _self.refreshContent(true);
    }

};

DocumentWindow.prototype = Object.create(HostSharedWindow.prototype);

function SharedItem(id) {
	var _self = this;
	_self.id = id;
	_self.close = function() {
		console.log("Closing shared item: " + _self.id);
		if (_self.documentWindow != null) {
            _self.documentWindow.close(INITIATOR_CONSUMER);
		}
	}
}

function SpotlightWindow(topic, spotlightDiv, parentWindow, cleanUpElement, active) {
    SharedWindow.call(this, topic, spotlightDiv, parentWindow, cleanUpElement);
    var _self = this;

    var scale;
    this.parentResized = function() {
        if (_self.parentWindow) {
            var width = spotlightDiv.parentNode.offsetWidth;
            scale = (width / _self.parentWindow.width);
        }
    };

    function cursorPing(pointXScaled, pointYScaled) {
    	
    	var unscaleFactor =  spotlightDiv.parentNode.offsetWidth / _self.parentWindow.width;
    	
    	var pointX = pointXScaled * unscaleFactor;
    	var pointY = pointYScaled * unscaleFactor;

        function createSpotlightPoint(x, y) {
            var spotlightPoint = document.createElement("div");
            spotlightPoint.style.left = (x - 40) + "px";
            spotlightPoint.style.top = (y - 40) + "px";
            spotlightPoint.setAttribute("class", "spotlight-point");
            return spotlightPoint;
        }

    	var spotlightPoint1 = createSpotlightPoint(pointX, pointY);
        var spotlightPoint2 = createSpotlightPoint(pointX, pointY);


    	/* We are adding spotlightDiv to parent because on IE10 we are forced to display:none 
    		the spotlightDiv to stop it receiving events when not active */
        var spotlightParent = spotlightDiv.parentElement;
        spotlightParent.appendChild(spotlightPoint1);
    	setTimeout(function() { spotlightParent.removeChild(spotlightPoint1);}, 3000);
        setTimeout(function() { spotlightParent.appendChild(spotlightPoint2);}, 170);
        setTimeout(function() { spotlightParent.removeChild(spotlightPoint2);}, 3170);
    };

    this.messageHandlers[CURSOR_PING] = function(message) {
        var header = new Int16Array(message.buffer, 0, 3);
        var pointXScaled = header[1];
        var pointYScaled = header[2];
        cursorPing(pointXScaled, pointYScaled);
    };

    _self.parentResized();

    var downActionHandler = function(event) {
        if (event.button === 0) {
            var boundingRect = spotlightDiv.parentNode.getBoundingClientRect();

            var scaleFactor = _self.parentWindow.width / spotlightDiv.parentNode.offsetWidth;

            var pointXScaled = Math.round((event.clientX - boundingRect.left) * scaleFactor);
            var pointYScaled = Math.round((event.clientY - boundingRect.top) * scaleFactor);

            var cursorPingMessage = new Int16Array(3);
            cursorPingMessage[0] = CURSOR_PING;
            cursorPingMessage[1] = pointXScaled;
            cursorPingMessage[2] = pointYScaled;
            topic.sendMessage(cursorPingMessage);

            event.preventDefault();
            event.stopPropagation();
            cursorPing(pointXScaled, pointYScaled);

        }
    };

    _self.addElementEventListener(spotlightDiv, DEVICE_INPUT_TYPE.concat("down"), downActionHandler, false);

    var ieCursorActiveStyle, ieCursorInactiveStyle, ieCursorDoOnce;
    this.enableSpotlight = function(sdkUrl, callback) {
        if (typeof callback !== 'undefined') {
            spotlightEnabledCallback = callback;
        }

        if (typeof assistSdkUrl==='undefined' || assistSdkUrl===null) {
            assistSdkUrl = sdkUrl;
        }
        if (isIE && sdkUrl) {
            if (!ieCursorDoOnce) {
                sdkUrl = sdkUrl.replace(/\/?$/, '/');
                ieCursorActiveStyle = "url('" + sdkUrl + "../shared/assets/spotlight_cursor.cur" + "'), auto";

                var computedStyle = spotlightDiv.ownerDocument.defaultView.getComputedStyle(spotlightDiv, null);
                ieCursorInactiveStyle = computedStyle['cursor'];
            }
            
            if (ieCursorActiveStyle) {
                spotlightDiv.style.cursor = ieCursorActiveStyle;
            }
            
            ieCursorDoOnce = true;
        }
        
        spotlightDiv.classList.add("active");


        if (typeof spotlightEnabledCallback !== 'undefined') {
          spotlightEnabledCallback();
        }
    };

    this.disableSpotlight = function() {
    	spotlightDiv.classList.remove("active");
        if (isIE && ieCursorInactiveStyle) {
            spotlightDiv.style.cursor = ieCursorInactiveStyle;
        }
    };

    var elementWindow = function() {
        var windowCandidates = [];
        windowCandidates.push(window);
        if (window.opener) {
            windowCandidates.push(window.opener);
        }
        // TODO also check iframes if there are any
        for (var i = 0; i < windowCandidates.length; i++) {
            if (windowCandidates[i].document == _self.element.ownerDocument)
            return windowCandidates[i];
        }
    }();

    if (elementWindow) {
        // TODO this won't be refreshed on navigation...
        _self.addElementEventListener(elementWindow, "resize", function() {
            _self.parentResized();
        });
    }
    
    if (active == true) {
        this.enableSpotlight(assistSdkUrl);
    }
};

SpotlightWindow.prototype = Object.create(SharedWindow.prototype);

function addZoomFunctionality(sharedWindow, zoomCanvas, sourceCanvas) {
    sharedWindow.isZoomWindow = true;
    sharedWindow.zoomCanvas = zoomCanvas;
    sharedWindow.sourceCanvas = sourceCanvas;
    sharedWindow.initialZoomLevel = 200;
    sharedWindow.zoomLevel = sharedWindow.initialZoomLevel;
    sharedWindow.minZoomLevel = 100; // Don't allow zooming out past 100%
    sharedWindow.maxZoomLevel = 400;
    sharedWindow.updateZoomLevelIndicator();
    sharedWindow.minSize = 100;
    sharedWindow.maxSize = 800;
    // Assume the style will not change during a zoom session:
    sharedWindow.computedStyle = sharedWindow.element.ownerDocument.defaultView.getComputedStyle(sharedWindow.element, null);
    // Assume we have symmetrical borders:
    sharedWindow.leftBorderWidth = (sharedWindow.element.offsetWidth - sharedWindow.element.clientWidth) / 2;
    sharedWindow.topBorderWidth = (sharedWindow.element.offsetHeight - sharedWindow.element.clientHeight) / 2;
    
    if (!sharedWindow.element.style.left) {
        sharedWindow.element.style.left = parseFloat(sharedWindow.computedStyle['left']) + "px";
    }
    
    if (!sharedWindow.element.style.top) {
        sharedWindow.element.style.top = parseFloat(sharedWindow.computedStyle['top']) + "px";
    }
    
    sharedWindow.getLeftPx = function () {
        return this.leftBorderWidth + getPixelValue(this.element.style.left, this.parentWindow.width);
    };
    
    sharedWindow.getTopPx = function () {
        return this.topBorderWidth + getPixelValue(this.element.style.top, this.parentWindow.height);
    };

    sharedWindow.getZoomCoordinates = function () {
        var zoomScale = this.zoomLevel/100;
        var canvasScale = this.hasScaledCanvas ? (this.initialZoomLevel/100) : 1;
        
        var drawAreaCoords = {
            width: this.zoomCanvas.width,
            height: this.zoomCanvas.height,
            left: 0,
            top: 0,
            right: this.zoomCanvas.width,
            bottom: this.zoomCanvas.height
        };
        
        var zoomAreaCoords = {
            width: this.zoomCanvas.width / zoomScale * canvasScale,
            height: this.zoomCanvas.height / zoomScale * canvasScale,
            left: this.getLeftPx() * canvasScale,
            top: this.getTopPx() * canvasScale,
        };

        zoomAreaCoords.left += ((this.zoomCanvas.width * canvasScale/2) - (zoomAreaCoords.width/2));
        zoomAreaCoords.top += ((this.zoomCanvas.height * canvasScale/2) - (zoomAreaCoords.height/2));
        zoomAreaCoords.right = zoomAreaCoords.left + zoomAreaCoords.width;
        zoomAreaCoords.bottom = zoomAreaCoords.top + zoomAreaCoords.height;
        
        return {
            drawArea: drawAreaCoords,
            zoomArea: zoomAreaCoords
        };
    };
    
    sharedWindow.handleOutOfBounds = function (coords, positionProperty, positionLimit, sizeProperty, multiplier) {
        if ((coords.zoomArea[positionProperty] * multiplier) > positionLimit) {
            var outOfBoundsPx = (coords.zoomArea[positionProperty] * multiplier) - positionLimit;
            var outOfBoundsPortion = outOfBoundsPx / coords.zoomArea[sizeProperty];
            if (outOfBoundsPortion > 1) {
                // The zoom area is completely out of the viewport.
                coords.outsideViewport = true;
            }
            else {
                coords.zoomArea[positionProperty] -= (outOfBoundsPx * multiplier);
                coords.zoomArea[sizeProperty] -= outOfBoundsPx;
                coords.drawArea[positionProperty] -= (coords.drawArea[sizeProperty] * outOfBoundsPortion * multiplier);
                coords.drawArea[sizeProperty] -= (coords.drawArea[sizeProperty] * outOfBoundsPortion);
            }
            coords.partialZoomArea = true;
        }
    };

    sharedWindow.refreshImage = function (newScaledCanvas, sendUpdate) {
        if (newScaledCanvas) {
            this.sourceCanvas = newScaledCanvas;
            this.hasScaledCanvas = true;
        }
        if (this.element && this.sourceCanvas && this.zoomCanvas) {
            var zoomContext = this.zoomCanvas.getContext("2d");
            var coords = this.getZoomCoordinates();
            
            // Handle co-ordinates outside the viewport:
            this.handleOutOfBounds(coords, 'left', 0, 'width', -1);
            this.handleOutOfBounds(coords, 'top', 0, 'height', -1);
            this.handleOutOfBounds(coords, 'right', this.sourceCanvas.width, 'width', 1);
            this.handleOutOfBounds(coords, 'bottom', this.sourceCanvas.height, 'height', 1);

            if (coords.partialZoomArea) {
                // Remove the previous image
                zoomContext.fillStyle = "#FFFFFF";
                zoomContext.fillRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);
            }
            
            if (!coords.outsideViewport) {
                zoomContext.drawImage(
                    this.sourceCanvas,
                    coords.zoomArea.left, coords.zoomArea.top, coords.zoomArea.width, coords.zoomArea.height,
                    coords.drawArea.left, coords.drawArea.top, coords.drawArea.width, coords.drawArea.height
                    );
            }

            if(this.element.style.visibility == "hidden") {
                this.element.style.visibility = "visible";
            }
            
            if (sendUpdate) {
                // Send the new image to the agent
                this.contentChanged(this.zoomCanvas, true);
            }
        }
    };
    
    sharedWindow.applyZoom = function() {
        this.sendZoomLevelChangedMessage();
        if (this.hasScaledCanvas) {
            this.refreshImage(null, true);
        }
    };
    
    // This allows the zoom buttons to work properly:
    sharedWindow.refreshPdfContent = function () {
        if (this.hasScaledCanvas) {
            this.refreshImage(null, true);
        }
    }
    
    sharedWindow.resize = function(newX, newY, resizing) {
        this.element.style.width = this.scaleXToLocal(newX);
        this.element.style.height = this.scaleYToLocal(newY);
        this.zoomCanvas.width = newX;
        this.zoomCanvas.height = newY;
        this.width = newX;
        this.height = newY;
        
        if (resizing) {
            this.refreshImage();
        }
        else {
            // User has let go of the resize button
            if (this.hasScaledCanvas) {
                this.refreshImage(null, true);
            }
            else {
                this.refreshImage();
                this.sendResizedMessage();
            }
        }
    }
    
    sharedWindow.resizeElement = function(deltaX, deltaY) {
        var newX = Math.min(Math.max(this.zoomCanvas.width + deltaX, this.minSize), this.maxSize);
        var newY = Math.min(Math.max(this.zoomCanvas.height + deltaY, this.minSize), this.maxSize);
        this.resize(newX, newY, this.resizing);
    };

    if (zoomStartedCallback) {
        zoomStartedCallback();
    }
};
