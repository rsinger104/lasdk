window.AssistAgentSDK = {
    ERROR_CODE : {
        CONNECTION_LOST: 0,
        PERMISSION: 1,
        SOCKET: 2,
        CALL_FAIL: 3,
        POPUP: 4,
        SESSION_IN_PROGRESS: 5,
        SESSION_CREATION_FAILURE: 6,
        UNDEFINED_FUNCTION  : 7
    },    
	socketConnected: false,
	universalTimeout: null,

    remoteView : null,

    annotationWindow : null,
    spotlightWindow : null,
    sharedWindow :null,
    localeSet : false,
    sdkUrl : '',
    sharedDocs : {},
    stroke : "red",
    strokeOpacity : 1.0,
    strokeWidth : 1,

    tempInputElement: null,
    
    setRemoteView : function(remoteView) {
        // The passed remote view should be a div in which we will put the share and drawing canvas elements
        // TODO some checks?

        AssistAgentSDK.remoteView = remoteView;
    },

    remoteViewSizeChanged : function(newX, newY) {
        console.log("The remote view size has changed to: " + newX + ", " + newY);
    },

    setRemoteViewCallBack : function(newRemoteViewFunction) {
        AssistAgentSDK.remoteViewSizeChanged = newRemoteViewFunction;
    },

    snapshotCallBack : null,
    snapshotTopic : null,
    
    consumerJoinedCallback : null,
    consumerLeftCallback : null,
    screenShareRejectedCallback : null,
    consumerEndedSupportCallback : null,
    
    connectionLostCallback : null, 
    connectionEstablishedCallback : null,
    connectionRetryCallback : null,
    connectionReestablishedCallback : null,
    zoomStartedCallback : null,
    zoomEndedCallback : null, 
    consumerCursorCallbacks: {
        move: function(x, y) {
            var ghost = document.getElementById('consumer-cursor-shadow');
            if (!ghost) {
                ghost = document.createElement('img');
                ghost.setAttribute('id', 'consumer-cursor-shadow');
                document.body.appendChild(ghost);
            }
            ghost.style.left = x + "px";
            ghost.style.top = y + "px";
            ghost.style.visibility = 'visible';
            ghost.style.zIndex = '2147483647';
            ghost.style.position = 'absolute';
            if (!ghost.getAttribute('src')) {
                ghost.setAttribute('src', '/assistserver/sdk/web/agent/img/remote-cursor.png');
            }

        },
        hide: function() {
            var ghost = document.getElementById("consumer-cursor-shadow");
            if (ghost) {
                ghost.style.visibility = 'hidden';
            }
        }
    },

    setZoomStartedCallback : function(zoomStartedCallback) {
    	console.log("Setting zoomStartedCallback.");
    	if (zoomStartedCallback) {
    		AssistAgentSDK.zoomStartedCallback = zoomStartedCallback;
        }
    },
    setZoomEndedCallback : function(zoomEndedCallback) {
    	console.log("Setting zoomEndedCallback.");
    	if (zoomEndedCallback) {
    		AssistAgentSDK.zoomEndedCallback = zoomEndedCallback;
        }
    },

    setConnectionLostCallback : function(connectionLostCallback) {
    	console.log("Setting connectivityLostCallback.");
    	if (connectionLostCallback) {
    		AssistAgentSDK.connectionLostCallback = connectionLostCallback;
        }
    },
    
    setConnectionEstablishedCallback : function(connectionEstablishedCallback) {
    	console.log("Setting connectionEstablishedCallback.");
    	if (connectionEstablishedCallback) {
    		AssistAgentSDK.connectionEstablishedCallback = connectionEstablishedCallback;
        }
    },
    
    setConnectionRetryCallback : function(connectionRetryCallback) {
    	console.log("Setting connectionRetryCallback.");
    	if (connectionRetryCallback) {
    		AssistAgentSDK.connectionRetryCallback = connectionRetryCallback;
        }
    },
    
    setConnectionReestablishedCallback : function(connectionReestablishedCallback) {
    	console.log("Setting connectionReestablishedCallback.");
    	if (connectionReestablishedCallback) {
    		AssistAgentSDK.connectionReestablishedCallback = connectionReestablishedCallback;
        }
    },
    setError : function(error) {
        
        if(AssistAgentSDK.onError){
            AssistAgentSDK.onError(error);
        }
        else {
            console.error(JSON.stringify(error));
        }
    },

    forms : {},

    joinSnapshotTopic: function () {
        var imageData;
        // join the snapshot topic, reconstruct snapshots and pass them back to the listener
        AssistAgentSDK.snapshotTopic.messageReceived = function(source, message) {
            var type = new Uint16Array(message.buffer, 0, 1)[0];
            switch (type) {
                case SNAPSHOT_START:
                    imageData = [];
                    break;
                case SNAPSHOT_CHUNK:
                    var payload = new Uint8Array(message.buffer, 2);
                    imageData[imageData.length] = payload;
                    break;
                case SNAPSHOT_END:
                    var bytes = 0;
                    for (var i = 0; i < imageData.length; i++) {
                        bytes += imageData[i].byteLength;
                    }
                    var fullImage = new Uint8Array(bytes);
                    var nextOffset = 0;
                    for (i = 0; i < imageData.length; i++) {
                        fullImage.set(imageData[i], nextOffset);
                        nextOffset += imageData[i].byteLength;
                    }
                    var dataUri = "data:image/jpeg;base64," + encode(fullImage);
                    imageData = undefined;
                    console.log("Snapshot image received.");
                    AssistAgentSDK.snapshotCallBack(dataUri);
                    break;
            }
        };
        AssistAgentSDK.snapshotTopic.join();
    },

    setSnapshotCallBack : function(newSnapshotCallBack) {
        AssistAgentSDK.snapshotCallBack = newSnapshotCallBack;
        if (AssistAgentSDK.snapshotTopic) {
            var isMember = false;
            for (var i = 0; i < AssistAgentSDK.snapshotTopic.participants.length; i++) {
                if (AssistAgentSDK.snapshotTopic.participants[i].isMe()) {
                    isMember = true;
                    break;
                }
            }
            if (newSnapshotCallBack && !isMember) {
                // If there is a snapshot topic, we're not a member, and we have a callback join it
                    AssistAgentSDK.joinSnapshotTopic();
            } else if (isMember && !newSnapshotCallBack) {
                // If we are a member and we no longer have a call back, leave
                AssistAgentSDK.snapshotTopic.leave();
            }
        }
    },
    
    setScreenShareActiveCallback : function(screenShareActiveCallback) {
    	console.log("Setting screenShareActive callback.");
    	AssistAgentSDK.screenShareActiveCallback = screenShareActiveCallback;
    },
    
    setScreenShareRejectedCallback : function(screenShareRejectedCallback) {
    	console.log("Setting screenShareRejectedCallback");
    	if (screenShareRejectedCallback) {
    		AssistAgentSDK.screenShareRejectedCallback = screenShareRejectedCallback
        }
    },
    
    //Set callback for when the consumer has joined the root topic
    setConsumerJoinedCallback : function(consumerJoinedCallback) {
    	console.log("Setting consumerJoinedCallback.");
    	AssistAgentSDK.consumerJoinedCallback = consumerJoinedCallback;
    },
    
    //Set the callback for when the consumer has left the root topic
    setConsumerLeftCallback : function(consumerLeftCallback) {
    	console.log("Setting consumerLeftCallback.");
    	AssistAgentSDK.consumerLeftCallback = consumerLeftCallback;
    },

    setConsumerEndedSupportCallback : function(consumerEndedSupportCallback) {
    	console.log("Setting consumerEndedSupportCallback.");
    	AssistAgentSDK.consumerEndedSupportCallback = consumerEndedSupportCallback;
    },
    
    setCallEndedCallback : function(callEndedCallback) {
    	console.log("Setting callEndedCallback.");
    	AssistAgentSDK.callEndedCallback = callEndedCallback;
    },
    setOnErrorCallback : function (onErrorCallback) {
        console.log("Setting onErrorCallback.");
        AssistAgentSDK.onError = onErrorCallback;
    },
        
    setFormCallBack : function(newFormCallBack) {
        AssistAgentSDK.formCallBack = newFormCallBack;
        if (AssistAgentSDK.formInputTopic) {
            var isMember = false;
            for (var i = 0; i < AssistAgentSDK.formInputTopic.participants.length; i++) {
                if (AssistAgentSDK.formInputTopic.participants[i].isMe()) {
                    isMember = true;
                    break;
                }
            }
            if (newFormCallBack && !isMember) {
                // If there is a form topic, we're not a member, and we have a callback join it
                AssistAgentSDK.joinFormTopic();
            } else if (isMember && !newFormCallBack) {
                // If we are a member and we no longer have a call back, leave
                AssistAgentSDK.formInputTopic.leave();
            }
        }
    },
    setConsumerCursorCallback : function(move) {
        console.log("Setting consumerCursorCallbacks move fucntion");
        AssistAgentSDK.consumerCursorCallbacks.move = move;
    },
    setConsumerCursorCallbacks : function(consumerCursorCallbacks) {
        console.log("Setting consumerCursorCallbacks");
        AssistAgentSDK.consumerCursorCallbacks = consumerCursorCallbacks;
    },
    sendNewFormCallback: function (element) {
        if (AssistAgentSDK.formCallBack) {

            if (AssistAgentSDK.formCallBack instanceof Function) {
                AssistAgentSDK.formCallBack(element);
            }
            else {
                var formCallbackError = { code: AssistAgentSDK.ERROR_CODE.UNDEFINED_FUNCTION, message: "formCallBack is not a function" };
                AssistAgentSDK.setError(formCallbackError);
            }
        }
    },
    joinFormTopic : function() {
        AssistAgentSDK.formInputTopic.messageReceived = function(source, message) {
            var type = new Int16Array(message.buffer, 0, 1)[0];
            if (type == INPUT_ELEMENTS_ON_PAGE) {
                var messagePayload = new Uint8Array(message.buffer, 2);
                var payloadString = convertPayloadToString(messagePayload);
                var inputDescriptors = unescapeAndParse(payloadString);
                // Create a new form
                var formElement = document.createElement("form");
                formElement.id = "assist_form_" + inputDescriptors.screenId;
                formElement.screenId = inputDescriptors.screenId;
                var tableElement = document.createElement("table");
                tableElement.id = "assist_form_table_" + inputDescriptors.screenId;
                formElement.appendChild(tableElement);
                var submitButton = document.createElement("input");
                var tableHead = document.createElement("thead");
                var tableHeadRow = document.createElement("tr");
                var headerDescription = document.createElement("td");
                var headerAgentSide = document.createElement("td");
                var headerButtons = document.createElement("td");
                var headerConsumerSide = document.createElement("td");
		headerDescription.appendChild(document.createTextNode(i18n.t("assistI18n:agent.forms.fieldName")));
		headerAgentSide.appendChild(document.createTextNode(i18n.t("assistI18n:agent.forms.agentChanges")));
		headerConsumerSide.appendChild(document.createTextNode(i18n.t("assistI18n:agent.forms.consumerChanges")));
                tableElement.appendChild(tableHead);
                tableHead.appendChild(tableHeadRow);
                tableHeadRow.appendChild(headerDescription);
                tableHeadRow.appendChild(headerAgentSide);
                tableHeadRow.appendChild(headerButtons);
                tableHeadRow.appendChild(headerConsumerSide);
                for (var i = 0; i < inputDescriptors.descriptors.length; i++ ) {
                    var tableRow = document.createElement("tr");
                    var descriptor = inputDescriptors.descriptors[i];
                    var lableTd = document.createElement("td");
                    var labelElement = document.createElement("label");
                    tableRow.appendChild(lableTd);
                    lableTd.appendChild(labelElement);
                    var inputElement;
                    var remoteValueElement;
                    if (descriptor.type == "select") {
                        inputElement = document.createElement("select");
                        remoteValueElement = document.createElement("select");

                    } else if (descriptor.type == "textarea") {
                        inputElement = document.createElement("textarea");
                        remoteValueElement = document.createElement("textarea");
                    } else {
                        inputElement = document.createElement("input");
                        remoteValueElement = document.createElement("input");
                        inputElement.setAttribute("type", descriptor.type);
                        remoteValueElement.setAttribute("type", descriptor.type);
                    }
                    labelElement.tabIndex = -1;
                    remoteValueElement.tabIndex = -1;
                    inputElement.tabIndex = 1000 + i;
                    var inputTd = document.createElement("td");
                    tableRow.appendChild(inputTd);
                    inputTd.appendChild(inputElement);
                    var labelText = document.createTextNode(descriptor.label);
                    labelElement.appendChild(labelText);
                    inputElement.id = "assist_input_" + inputDescriptors.screenId + "_" + descriptor.index;
                    inputElement.index = descriptor.index;
                    labelElement.setAttribute("for", inputElement.id);
                    remoteValueElement.id = "assist_remote_value_" + inputDescriptors.screenId + "_" + descriptor.index;
                    var useRemoteTd = document.createElement("td");
                    var useRemoteElement = document.createElement("button");
                    useRemoteElement.textContent = i18n.t("assistI18n:agent.forms.keepExisting_symbol");
                    useRemoteElement.title = i18n.t("assistI18n:agent.forms.keepExisting_title");
                    useRemoteElement.addEventListener("click", function() {
                        var input = inputElement;
                        var remote = remoteValueElement;
                        return function (event) {
                            input.modified = false;
                            input.classList.remove("assist_modified")
                            if (input.value || remote.value) {
                                input.value = remote.value;
                            }
                            if (input.checked || remote.checked) {
                                input.checked = remote.checked;
                            }
                        };
                    }());
                    useRemoteTd.appendChild(useRemoteElement);
                    tableRow.appendChild(useRemoteTd);
                    var remoteTd = document.createElement("td");
                    remoteTd.appendChild(remoteValueElement);
                    tableRow.appendChild(remoteTd);
                    remoteValueElement.disabled = true;
                    // set default values etc here
                    switch(descriptor.type) {
                        case "radio":
                            inputElement.setAttribute("name", descriptor.radioGroup + "_local");
                            remoteValueElement.setAttribute("name", descriptor.radioGroup + "_remote");
                            // fall through
                        case "checkbox":
                            if (descriptor.checked) {
                                inputElement.setAttribute("checked", "true");
                                remoteValueElement.setAttribute("checked", "true");
                            }
                            break;
                        case "select":
                            var options = descriptor.options;
                            for (var j = 0; j < options.length; j++) {
                                var optionElement = document.createElement("option");
                                optionElement.value = options[j].value;
                                optionElement.textContent = options[j].label;
                                if (options[j].value == descriptor.value) optionElement.setAttribute("selected", "selected");
                                inputElement.appendChild(optionElement);
                                var optionClone = optionElement.cloneNode(true);
                                remoteValueElement.appendChild(optionClone);
                            }
                            if (descriptor.value) {
                                remoteValueElement.value = descriptor.value;
                            }
                            break;
                        default:
                            if (descriptor.pattern) {
                                inputElement.setAttribute("pattern", descriptor.pattern);
                            }
                            if (descriptor.value) {
                                remoteValueElement.value = descriptor.value;
                            }
                            if (descriptor.placeholder) {
                                inputElement.setAttribute("placeholder", descriptor.placeholder);
                            }
                            inputElement.addEventListener("keydown", function(event)
                            {
                                if (event.keyCode == 13) {
                                    event.target.modified = true;
                                    submitButton.click();
                                    event.preventDefault();
                                    event.stopPropagation();
                                }
                            });
                            break;
                    }
                    inputElement.addEventListener("change", function(event) {
                       event.target.modified = true;
                       event.target.classList.add("assist_modified");
                    });
                    tableElement.appendChild(tableRow);
                }

                submitButton.setAttribute("type", "submit");
                submitButton.value = i18n.t("assistI18n:agent.forms.submit");
                submitButton.tabIndex = 1000 + inputDescriptors.descriptors.length;
                formElement.appendChild(submitButton);
                formElement.addEventListener("submit", function(event){
                    event.preventDefault();
                    // create and send the updated values description
                    var values = [];
                    var inputs = formElement.getElementsByTagName("*");
                    for (var i = 0; i < inputs.length; i++) {
                        var input = inputs[i];
                        var remoteElement = formElement.ownerDocument.getElementById("assist_remote_value_" + formElement.screenId + "_" + input.index);
                        if (input.tagName != "INPUT" && input.tagName != "SELECT" && input.tagName != "TEXTAREA") {
                            continue;
                        }
                        if (!input.modified) {
                            continue;
                        }
                        input.modified = false;
                        input.classList.remove("assist_modified")
                        if (input.index == undefined || input.index == null) {
                            continue;
                        }
                        var type;
                        if (input.tagName == "INPUT") {
                            type = input.type;
                        } else {
                            type = input.tagName.toLowerCase();
                        }
                        var value = {index: input.index};
                        switch (type) {
                            case "radio":
                            case "checkbox":
                                value.checked = input.checked;
                                if (remoteElement) {
                                    remoteElement.checked = input.checked;
                                }
                                break;
                            default:
                                value.value = input.value;
                                if (remoteElement) {
                                    remoteElement.value = input.value;
                                }
                                break;
                        }
                        values[values.length] = value;
                    }
                    // Don't send if nothing has changed
                    if (values.length > 0) {
                        var descriptor = {screenId: formElement.screenId, descriptors: values};
                        var descriptorString = stringifyAndEscape(descriptor);
                        var message = new Uint8Array(descriptorString.length + 2);
                        var header = new Int16Array(message.buffer, 0, 2);
                        header[0] = INPUT_ELEMENTS_POPULATED;
                        var payload = new Uint8Array(message.buffer, 2);
                        for (var i = 0; i < descriptorString.length; i++) {
                            payload[i] = descriptorString.charCodeAt(i);
                        }
                        AssistAgentSDK.formInputTopic.sendMessage(message);
                    }
                });
                AssistAgentSDK.forms[inputDescriptors.screenId] = formElement;
                AssistAgentSDK.sendNewFormCallback(formElement);                
            } else if (type == INPUT_ELEMENT_CLICKED) {
                var header = new Int16Array(message.buffer, 2, 2);
                var x = header[0];
                var y = header[1];

                var payload = new Uint8Array(message.buffer, 6);
                var stringPayload = convertPayloadToString(payload);
                var descriptor = unescapeAndParse(stringPayload);

                displayTempFormElement(descriptor, {x: x, y: y });
                
            } else if (type == INPUT_ELEMENTS_POPULATED) {
                // Update the existing form with the new values
                var payload = new Uint8Array(message.buffer, 2);
                var payloadString = convertPayloadToString(payload);
                var updateDescriptor = unescapeAndParse(payloadString);
                var screenId = updateDescriptor.screenId;
                var updatedElements = updateDescriptor.descriptors;
                var form = AssistAgentSDK.forms[screenId];
                if (form) {
                    for (var i = 0; i < updatedElements.length; i++) {
                        var updatedElement = updatedElements[i];

                        if (AssistAgentSDK.tempInputElement) {
                            if (parseInt(AssistAgentSDK.tempInputElement.dataset.index) === updatedElement.index) {
                                AssistAgentSDK.tempInputElement.blur();
                            }
                        }

                        var inputElement = form.ownerDocument.getElementById("assist_input_" + screenId + "_" + updatedElement.index)
                        var remoteValueElement = form.ownerDocument.getElementById("assist_remote_value_" + screenId + "_" + updatedElement.index)
                        if (inputElement) {
                            if (updatedElement.placeholder) {
                                inputElement.setAttribute("placeholder", updatedElement.placeholder);
                            }
                        }
                        if (remoteValueElement) {
                            if (updatedElement.value || updatedElement.value === "" || updatedElement.value === 0) {
                                remoteValueElement.value = updatedElement.value;
                                if (inputElement.localName == 'select') {
                                    var opts = inputElement.options;
                                    for(var opt, j = 0; opt = opts[j]; j++) {
                                        if(opt.value == updatedElement.value) {
                                            inputElement.selectedIndex = j;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (updatedElement.placeholder || updatedElement.placeholder === "" || updatedElement.placeholder === 0) {
                                remoteValueElement.setAttribute("placeholder", updatedElement.placeholder);
                            }
                            if (updatedElement.checked) {
                                remoteValueElement.checked = true;
                            } else if (remoteValueElement.checked) {
                                remoteValueElement.checked = false;
                            }
                        }

                    }
                }
            }
            else if (type == INPUT_ELEMENTS_MOVED) {
                if (AssistAgentSDK.tempInputElement) {
                    AssistAgentSDK.tempInputElement.blur();
                }
            }
            else if (type === INPUT_SELECT_FOCUSED) {
                var header = new Int16Array(message.buffer, 2, 2);
                var x = header[0];
                var y = header[1];

                var payload = new Uint8Array(message.buffer, 6);
                var stringPayload = convertPayloadToString(payload);
                var descriptor = unescapeAndParse(stringPayload);

                displayTempFormElement(descriptor, {x: x, y: y})
            }
            else if (type === INPUT_SELECT_BLURRED) {
                var payload = new Uint8Array(message.buffer, 2);
                var payloadString = convertPayloadToString(payload);

                if (AssistAgentSDK.tempInputElement) {
                    try {
                        var form = AssistAgentSDK.tempInputElement.parentNode;
                        form.parentNode.removeChild(form);
                    }
                    catch (e) {
                        //Already removed as part of the 'blur' event
                    }
                }
            }

            function displayTempFormElement(elementDescriptor, screenLocation) {
                var localX = AssistAgentSDK.sharedWindow.element.offsetWidth / AssistAgentSDK.sharedWindow.width * screenLocation.x + "px";
                var localY = AssistAgentSDK.sharedWindow.element.offsetHeight / AssistAgentSDK.sharedWindow.height * screenLocation.y + "px";

                if ((elementDescriptor.by || elementDescriptor.by == 0) && !AssistAED.isMe({id:elementDescriptor.by})) {
                    // a form element was clicked, but not by us so just return.
                    return;
                }

                switch (elementDescriptor.clicked.type) {
                    case "textarea":
                        AssistAgentSDK.tempInputElement = document.createElement("textarea");
                        break;
                    case "select":
                        AssistAgentSDK.tempInputElement = document.createElement("select");
                        if (elementDescriptor.clicked.options.length < 10) {
                            AssistAgentSDK.tempInputElement.size = elementDescriptor.clicked.options.length;
                        }
                        else {
                            AssistAgentSDK.tempInputElement.size = 10;
                        }

                        elementDescriptor.clicked.options.forEach(function(option) {
                            var optionElement = document.createElement("option");
                            optionElement.value = option.value;
                            optionElement.text = option.label;
                            AssistAgentSDK.tempInputElement.appendChild(optionElement);
                        });
                        break;
                    default:
                        AssistAgentSDK.tempInputElement = document.createElement("input");
                        AssistAgentSDK.tempInputElement.setAttribute("type", "text");
                        break;
                }
                if (elementDescriptor.clicked.placeholder) {
                    AssistAgentSDK.tempInputElement.setAttribute("placeholder", elementDescriptor.clicked.placeholder);
                }
                if (elementDescriptor.clicked.value) {
                	AssistAgentSDK.tempInputElement.value = elementDescriptor.clicked.value;
                }

                AssistAgentSDK.tempInputElement.dataset.index = elementDescriptor.clicked.index;

                var tempFormElement = document.createElement("form");
                tempFormElement.appendChild(AssistAgentSDK.tempInputElement);
                tempFormElement.style.top = localY;
                tempFormElement.style.left = localX;
                tempFormElement.style.zIndex = "9999999";
                tempFormElement.classList.add("assist-temp-input");

                var clickNext = false;
                var send = function(event) {
                    event.preventDefault();
                    var valueDesc = [{index: elementDescriptor.clicked.index, value: AssistAgentSDK.tempInputElement.value}];
                    var sendDescriptor = {screenId: elementDescriptor.screenId, descriptors: valueDesc};
                    if (clickNext) {
                        valueDesc[0].clickNext = true;
                    }
                    var descriptorString = stringifyAndEscape(sendDescriptor);
                    var message = new Uint8Array(descriptorString.length + 2);
                    var header = new Int16Array(message.buffer, 0, 2);
                    header[0] = INPUT_ELEMENTS_POPULATED;
                    var payload = new Uint8Array(message.buffer, 2);
                    for (var i = 0; i < descriptorString.length; i++) {
                        payload[i] = descriptorString.charCodeAt(i);
                    }
                    AssistAgentSDK.formInputTopic.sendMessage(message);
                    // update the local form view with the new value (if it exists)
                    var form = AssistAgentSDK.forms[elementDescriptor.screenId];
                    if (form) {
                        var remoteValueElement = form.ownerDocument.getElementById("assist_remote_value_" + sendDescriptor.screenId + "_" + valueDesc[0].index);
                        if (remoteValueElement) {
                            remoteValueElement.value = valueDesc[0].value;
                        }
                    }
                    AssistAgentSDK.tempInputElement.blur();
                };

                AssistAgentSDK.tempInputElement.addEventListener("pointerdown", function(event) {
                    event.stopPropagation();
                });

                if (elementDescriptor.clicked.type === "select") {
                    AssistAgentSDK.tempInputElement.addEventListener("change", send);
                }

                function removeElement(event) {
                    AssistAgentSDK.tempInputElement.removeEventListener("blur", removeElement);
                    var form = event.target.parentNode;
                    form.parentNode.removeChild(form);
                }
                AssistAgentSDK.tempInputElement.addEventListener("blur", removeElement);

                tempFormElement.addEventListener("submit", send);
                var tempSubmitBtn = document.createElement("input");
                tempSubmitBtn.type = "submit";
                tempSubmitBtn.hidden = true;
                tempFormElement.appendChild(tempSubmitBtn);
                AssistAgentSDK.tempInputElement.addEventListener("keydown", function(event) {
                   if (event.keyCode == "13") {
                       tempSubmitBtn.click();
                       event.preventDefault();
                   } else if (event.keyCode == "27") {
                       AssistAgentSDK.tempInputElement.blur();
                   } else if (event.keyCode == "9") {
                       clickNext = true;
                       tempSubmitBtn.click();
                       if (tempFormElement.parentNode) {
                           // Validation must have failed...
                           clickNext = false;
                       }
                       event.preventDefault();
                   }
                });
                AssistAgentSDK.sharedWindow.element.appendChild(tempFormElement);
                AssistAgentSDK.tempInputElement.focus();

                // Kludge - reset value after focus so that cursor at end of field.
                var tmp = AssistAgentSDK.tempInputElement.value;
                AssistAgentSDK.tempInputElement.value = '';
                AssistAgentSDK.tempInputElement.value = tmp;
            }
        };
        AssistAgentSDK.formInputTopic.participantLeft = function(participant) {
            // If we got kicked out, notify the console
            if (AssistAED.isMe(participant)) {
                AssistAgentSDK.formInputTopic = undefined;
                AssistAgentSDK.sendNewFormCallback(undefined);
                return;
            }
            // TODO if in future we have multiple consumers we should map forms to consumers and remove the form if that consumer it belongs to has left
            var hasConsumer = false;
            for (var i = 0; i < AssistAgentSDK.formInputTopic.participants.length; i++) {
                if (AssistAgentSDK.formInputTopic.participants[i].metadata.role == "consumer") {
                    hasConsumer = true;
                }
            }
            if (!hasConsumer) {
                AssistAgentSDK.formInputTopic.leave();
                AssistAgentSDK.formInputTopic = undefined;
                AssistAgentSDK.sendNewFormCallback(undefined);

                if (AssistAgentSDK.tempInputElement) {
                    AssistAgentSDK.tempInputElement.blur();
                }
            }
        };
        AssistAgentSDK.formInputTopic.join();
    },
    
    OffAssistPagesException : function(message) {
    	this.message = message;
    },
    
    DrawStyleArgumentException : function(message) {
    	this.message = message;
    },

	drawSelected : function() {
		if (!AssistAgentSDK.consumerIsOnAssistPages) {
			throw new AssistAgentSDK.OffAssistPagesException();
		}
        if (AssistAgentSDK.annotationWindow) {
            AssistAgentSDK.annotationWindow.enableDrawing(AssistAgentSDK.sdkUrl);
        }
        if (AssistAgentSDK.spotlightWindow) {
            AssistAgentSDK.spotlightWindow.disableSpotlight();
        }
        if (AssistAgentSDK.sharedWindow) {
            AssistAgentSDK.sharedWindow.disableInteraction();
        }
        AssistAgentSDK.selected = "draw";
	},

	controlSelected : function() {
        if (AssistAgentSDK.annotationWindow) {
            AssistAgentSDK.annotationWindow.disableDrawing();
        }
        if (AssistAgentSDK.spotlightWindow) {
            AssistAgentSDK.spotlightWindow.disableSpotlight();
        }
        if (AssistAgentSDK.sharedWindow) {
            AssistAgentSDK.sharedWindow.enableInteraction();
        }
        AssistAgentSDK.selected = "control";
	},

    spotlightSelected : function() {
        if (!AssistAgentSDK.consumerIsOnAssistPages) {
			throw new AssistAgentSDK.OffAssistPagesException();
		}
        if (AssistAgentSDK.spotlightWindow) {
            AssistAgentSDK.spotlightWindow.enableSpotlight(AssistAgentSDK.sdkUrl, function() {
             
                 if (AssistAgentSDK.annotationWindow) {
                   AssistAgentSDK.annotationWindow.disableDrawing();
                 }
                 if (AssistAgentSDK.sharedWindow) {
                   AssistAgentSDK.sharedWindow.disableInteraction();
                 }
                 AssistAgentSDK.selected = "spotlight";
             });
        }
        AssistAgentSDK.selected = "spotlight";
    },
	
	clearSelected : function() {
        // Clear local and remote
        if (AssistAgentSDK.annotationWindow) {
            AssistAgentSDK.annotationWindow.clear(true);
        }
	},
	
	clearShareView : function() {
        // Only clear locally
        if (AssistAgentSDK.annotationWindow) {
            AssistAgentSDK.annotationWindow.clear(false);
        }
	},

	endSupport : function() {

        if (AssistAgentSDK.rootTopic) {
            AssistAgentSDK.rootTopic.leave();
            AssistAgentSDK.rootTopic = undefined;
        }
        // remove all the elements from the screen share window and close all the topics
        if (AssistAgentSDK.sharedWindow) {
            AssistAgentSDK.sharedWindow.closed(INITIATOR_CLOSE_SCREENSHARE);
            AssistAgentSDK.sharedWindow = undefined;
        }
        AssistAgentSDK.screenShareTopic = undefined;
        var masks = AssistAgentSDK.remoteView.getElementsByClassName("inactive-mask");
        while (masks[0]) {
            AssistAgentSDK.remoteView.removeChild(masks[0]);
        }
        AssistAgentSDK.inSession = false;
        AssistAgentSDK.screenShareRequested = false;
		AssistAgentSDK.clearShareView();
	},

    pushDocument : function(docUrl, eventHandler, docMetadata) {
    	if (!AssistAgentSDK.consumerIsOnAssistPages) {
    		alert(i18n.t("assistI18n:agent.alerts.docPushToUnsupportedPage"));
    		return;
    	}
    	console.log("Pushing document URL: " + docUrl);
        var sharedDocId = AssistAgentSDK.sharedWindow.pushDocument(docUrl, eventHandler, docMetadata);
        return sharedDocId;
    },
    
    pushContent : function(docUrl, eventHandler, docMetadata) {
    	if (!AssistAgentSDK.consumerIsOnAssistPages) {
    		alert(i18n.t("assistI18n:agent.alerts.docPushToUnsupportedPage"));
    		return;
    	}
    	console.log("Retrieving and preparing to push content from url: " + docUrl);
        var sharedDocId = AssistAgentSDK.sharedWindow.pushContent(docUrl, eventHandler, docMetadata);
        return sharedDocId;
    },
    
    closeDocument : function(sharedDocId) {
    	return AssistAgentSDK.sharedWindow.closeDocument(sharedDocId);
    },
    
    sendRootTopicMessage: function (requestMessage) {
        var messageString = stringifyAndEscape(requestMessage);
        var messageBytes = new Uint8Array(messageString.length);
        for (var i = 0; i < messageString.length; i++) {
            messageBytes[i] = messageString.charCodeAt(i);
        }
        AssistAgentSDK.rootTopic.sendMessage(messageBytes);
    },

    screenShareRequested : false,
    screenShareTopic : undefined,

    requestScreenShare : function() {
        // if we already have access to an existing screen share topic, ignore
        if (AssistAgentSDK.sharedWindow) {
            return;
        }
        AssistAgentSDK.screenShareRequested = true;
        // If there is already a private screen share topic we don't have access to, request access to it
        if (AssistAgentSDK.screenShareTopic && AssistAgentSDK.screenShareTopic.permissions) {
            var me = AssistAED.getMe();
            var myPermission = AssistAgentSDK.screenShareTopic.getPermissionForParticipant(me);
            if (myPermission == AssistAED.PERMISSIONS.NONE) {
                AssistAgentSDK.screenShareTopic.updatePermission(AssistAED.PERMISSIONS.REQUESTED);
            }
        } else {
            //  If there is no screen share topic, request one
            console.log("Requesting screen share.");
            var requestMessage = {type: "requestScreenShare"};
            AssistAgentSDK.sendRootTopicMessage(requestMessage);
        }
    },

    pushLink : function(linkUrl) {
        console.log("Pushing link: " + linkUrl);
        var encodedURL = encodeURLIfNecessary(linkUrl);
        var linkMessage = {type:"url", url:encodedURL};
        AssistAgentSDK.sendRootTopicMessage(linkMessage);

    },
	
	init : function(configuration) {
        if (configuration.sdkUrl) {
            this.sdkUrl = configuration.sdkUrl;
        } 
        
		if (AssistAgentSDK.inSession == true) {
			AssistAgentSDK.rejectSupport(configuration.correlationId, configuration.url);
            var sessionError = {code: AssistAgentSDK.ERROR_CODE.SESSION_IN_PROGRESS, message: "There is already a session in use."};
            AssistAgentSDK.setError(sessionError);
            return;
		}
		AssistAgentSDK.setLocale(configuration.locale);
				
		AssistAgentSDK.topic = configuration.correlationId;
		AssistAgentSDK.inSession = true;
		
		AssistAgentSDK.consumerIsOnAssistPages = false;

		AssistAgentSDK.connectWebSocket(configuration);
	},

    validateAgentDrawStyle : function(stroke, strokeOpacity, strokeWidth) {
        if (!AssistAgentSDK.isValidColour(stroke)) {
            var error = "Invalid colour " + stroke;
            console.log(error);
            throw AssistAgentSDK.DrawStyleArgumentException(error);
        }

        if (isNaN(strokeOpacity)) {
            var error = "Opacity should be a number:" + strokeOpacity;
            console.log(error);
            throw AssistAgentSDK.DrawStyleArgumentException(error);
        }

        if (strokeOpacity < 0.0 || strokeOpacity > 1.0) {
            var error = "Opacity out of range 0.0<=x<=1.0:" + strokeOpacity;
            console.log(error);
            throw AssistAgentSDK.DrawStyleArgumentException(error);
        }

        if (isNaN(strokeWidth)) {
            var error = "Width should be a number:" + strokeWidth;
            console.log(error);
            throw AssistAgentSDK.DrawStyleArgumentException(error);
        }

        if (strokeWidth < 1 || strokeWidth > 25) {
            var error = "Width out of range 1 <=x<=25:" + strokeWidth
            console.log(error);
            throw AssistAgentSDK.DrawStyleArgumentException(error);
        }
    },

    isValidColour : function (str) {
        var regExp = new RegExp("^#[a-f0-9]{6}$", "i");
        return regExp.exec(str) != null;
    },

	connectWebSocket : function(configuration) {
        AssistAED.setConfig(configuration);

        var terminateCallback = function () {
            AssistAgentSDK.endSupport();
        };

        AssistAED.setSocketConnectionConfiguration(configuration,terminateCallback);
        AssistAED.setErrorCallback(function(error){
           AssistAgentSDK.setError(error);
        });
        AssistAED.connectRootTopic(AssistAgentSDK.topic || configuration.correlationId, function(rootTopic) {
            AssistAgentSDK.rootTopic = rootTopic;
            rootTopic.participantJoined = function(newParticipant) {
            	console.log("Participant joined: role = " + newParticipant.metadata.role);
            	if (newParticipant.metadata.role == "consumer") {
            		if (AssistAgentSDK.consumerJoinedCallback) {
            			console.log("Calling consumerJoinedCallback.");
            			AssistAgentSDK.consumerJoinedCallback();
            		}
            	}
            };
            rootTopic.participantLeft = function(participant) {
            	console.log("Participant left; role = " + participant.metadata.role);
            	if (participant.metadata.role == "consumer") {
            		if (AssistAgentSDK.consumerLeftCallback) {
            			console.log("Calling consumerLeftCallback.");
            			AssistAgentSDK.consumerLeftCallback();
            		}
            	}
            };

            function tearDownSharedWindow () {
               if (AssistAgentSDK.sharedWindow) {
                    AssistAgentSDK.sharedWindow.closed(INITIATOR_UNKNOWN);
                    AssistAgentSDK.sharedWindow = undefined;
                    AssistAgentSDK.clearShareView();
               }
            };

            function joinCobrowse(newSubtopic) {
                tearDownSharedWindow();
                AssistAgentSDK.sharedWindow = new ClientSharedWindow(newSubtopic, AssistAgentSDK.remoteView);
                if (AssistAgentSDK.zoomStartedCallback) {
                    AssistAgentSDK.sharedWindow.setZoomStartedCallback(AssistAgentSDK.zoomStartedCallback);
                }
                if (AssistAgentSDK.zoomEndedCallback) {
                    AssistAgentSDK.sharedWindow.setZoomEndedCallback(AssistAgentSDK.zoomEndedCallback);
                }

                AssistAgentSDK.sharedWindow.consumerCursorCallbacks = AssistAgentSDK.consumerCursorCallbacks;
                AssistAgentSDK.sharedWindow.remoteViewSizeChanged = function (x, y) {
                    // This is called rather than passed to allow the containing page to change it
                    AssistAgentSDK.remoteViewSizeChanged(x, y);
                };

                AssistAgentSDK.sharedWindow.onError = function (error) {
                    AssistAgentSDK.setError(error);
                };
                var inactiveMask = document.createElement("div");
                var maskBackground = document.createElement("div");
                inactiveMask.appendChild(maskBackground);
                inactiveMask.classList.add("inactive-mask");
                maskBackground.classList.add("mask-background");
                var maskText = document.createElement("span");
                maskText.appendChild(document.createTextNode(i18n.t("assistI18n:agent.navigateAwayAssist")));
                maskText.classList.add("mask-text");
                inactiveMask.appendChild(maskText);

                AssistAgentSDK.sharedWindow.messageHandlers[OFF_ASSIST_MESSAGE] = function () {
                    AssistAgentSDK.remoteView.appendChild(inactiveMask);
                    AssistAgentSDK.consumerIsOnAssistPages = false;
                    if (AssistAgentSDK.screenShareActiveCallback != null) {
                        AssistAgentSDK.screenShareActiveCallback(false);
                    }
                };
                AssistAgentSDK.sharedWindow.messageHandlers[ON_ASSIST_MESSAGE] = function () {
                    // Only handle the consumer ON_ASSIST_MESSAGE if we thought they were not
                    if (!AssistAgentSDK.consumerIsOnAssistPages) {
                        var masks = AssistAgentSDK.remoteView.getElementsByClassName("inactive-mask");
                        while (masks.length > 0) {
                            masks[0].parentElement.removeChild(masks[0]);
                        }
                        AssistAgentSDK.consumerIsOnAssistPages = true;
                        if (AssistAgentSDK.screenShareActiveCallback != null) {
                            AssistAgentSDK.screenShareActiveCallback(true);
                        }
                    }
                };

                newSubtopic.participantJoined = function (newParticipant) {
                    if (AssistAED.isMe(newParticipant)) {
                        AssistAgentSDK.sharedWindow.addAnnotationWindow(function (annotationWindow) {
                            AssistAgentSDK.annotationWindow = annotationWindow;
                            // Use cached values to set stroke parameters.
                            AssistAgentSDK.annotationWindow.setAgentDrawStyle(AssistAgentSDK.stroke,
                                AssistAgentSDK.strokeOpacity, AssistAgentSDK.strokeWidth);
                        }, (AssistAgentSDK.selected == "draw"));
                        AssistAgentSDK.sharedWindow.addSpotlightWindow(function (spotlightWindow) {
                            AssistAgentSDK.spotlightWindow = spotlightWindow;
                        }, (AssistAgentSDK.selected == "spotlight"));
                    }
                };
                
                newSubtopic.privateSubtopicOpened = function(newPrivateTopic) {
                    if (newPrivateTopic.metadata.type == "scrollbar") {
                        if (AssistAgentSDK.sharedWindow && newSubtopic.metadata.scrollable) {
                            // Create scrollbars as hidden by default
                            AssistAgentSDK.sharedWindow.createScrollbars(false, false);
                        }

                        newPrivateTopic.permissionChanged = function(participant, newPermission) {
                            if (AssistAED.isMe(participant)) { // this will always be true since we're never the owner, but check anyway
                                if (newPermission == AssistAED.PERMISSIONS.ALLOWED) {
                                    if (AssistAgentSDK.sharedWindow && newSubtopic.metadata.scrollable) {
                                        AssistAgentSDK.sharedWindow.joinScrollbarSubTopic(newPrivateTopic);
                                    }
                                }
                            };
                        }
                    }
                };

                newSubtopic.join();
            }

            rootTopic.subtopicOpened = function(newSubtopic) {
              if (newSubtopic.metadata.type == "shared-window") {
                  joinCobrowse(newSubtopic);
              } else if (newSubtopic.metadata.type == "snapshot") {
                    AssistAgentSDK.snapshotTopic = newSubtopic;
                  if (AssistAgentSDK.snapshotCallBack) {
                      AssistAgentSDK.joinSnapshotTopic();
                  }
              } else if (newSubtopic.metadata.type == "input") {
                  AssistAgentSDK.formInputTopic = newSubtopic;
                  if (AssistAgentSDK.formCallBack)
                  {
                      AssistAgentSDK.joinFormTopic();
                  }
              }
            };

            rootTopic.privateSubtopicOpened = function(newPrivateTopic) {
                if (newPrivateTopic.metadata.type == "shared-window") {
                    AssistAgentSDK.screenShareTopic = newPrivateTopic;
                    if (AssistAgentSDK.screenShareRequested) {
                        newPrivateTopic.updatePermission(AssistAED.PERMISSIONS.REQUESTED);
                    }
                    newPrivateTopic.permissionChanged = function(participant, newPermission) {
                        if (AssistAED.isMe(participant)) { // this will always be true since we're never the owner, but check anyway
                            if (newPermission == AssistAED.PERMISSIONS.ALLOWED) {
                                joinCobrowse(newPrivateTopic);
                            } else if (newPermission == AssistAED.PERMISSIONS.DENIED) {
                                AssistAgentSDK.screenShareRejectedCallback();
                                AssistAgentSDK.screenShareRequested = false;
                            }
                        }
                    };
                    newPrivateTopic.participantLeft = function(participant) {
                        if (AssistAED.isMe(participant)) {
                            // Got kicked out of the screen share, clean up
                            AssistAgentSDK.sharedWindow.closed(INITIATOR_UNKNOWN);
                            AssistAgentSDK.sharedWindow = undefined;
                            AssistAgentSDK.clearShareView();
                        }
                    }
                } else if (newPrivateTopic.metadata.type == "input") {
                    newPrivateTopic.permissionChanged = function(participant, newPermission) {
                        if (AssistAED.isMe(participant)) { // this will always be true since we're never the owner, but check anyway
                            if (newPermission == AssistAED.PERMISSIONS.ALLOWED) {
                                AssistAgentSDK.formInputTopic = newPrivateTopic;
                                if (AssistAgentSDK.formCallBack)
                                {
                                    AssistAgentSDK.joinFormTopic();
                                }
                            }
                        }
                    };
                } else {
                    // Not expecting any other private topics...
                }
            };

            rootTopic.subtopicClosed = function(closedTopic) {
            	if (closedTopic.metadata.type == "shared-window") {
            		console.log("shared-window topic closed.");
                    AssistAgentSDK.sharedWindow.closed(INITIATOR_UNKNOWN);
                    AssistAgentSDK.sharedWindow = undefined;
                    AssistAgentSDK.screenShareTopic = undefined;
                    AssistAgentSDK.clearShareView();
            	}
                if (closedTopic == AssistAgentSDK.formInputTopic) {
                    AssistAgentSDK.formInputTopic = undefined;
                    AssistAgentSDK.sendNewFormCallback(undefined);
                }
            };
            // Listen for rejected co-browse
            rootTopic.messageReceived = function(source, messageBytes) {
                var messageString = convertPayloadToString(messageBytes);
                var message = unescapeAndParse(messageString);
                switch (message.type) {
                    case "rejectScreenShare":
            			console.log("Calling screenShareRejectedCallback.");
                        if (AssistAgentSDK.screenShareRejectedCallback) {
                        	AssistAgentSDK.screenShareRejectedCallback();
                        }
                        break;
                    case "consumerEndedSupport":
                        if (AssistAgentSDK.consumerEndedSupportCallback != null) {
                            console.log("Calling consumerEndedSupportCallback");
                            AssistAgentSDK.consumerEndedSupportCallback();
                        }
                        break;

                }
            };
            
            // Connection status call backs
            rootTopic.connectionEstablished = function() {
            	if (AssistAgentSDK.connectionEstablishedCallback) {
            		AssistAgentSDK.connectionEstablishedCallback();
            	}
            };
            rootTopic.connectionReestablished = function() {
            	if (AssistAgentSDK.connectionReestablishedCallback) {
            		AssistAgentSDK.connectionReestablishedCallback();
            	}
            };
            rootTopic.connectionLost = function() {
            	if (AssistAgentSDK.connectionLostCallback) {
            		AssistAgentSDK.connectionLostCallback();
            	}
            };
            rootTopic.connectionRetry = function(retryCount, retryTimeInMilliSeconds) {
            	if (AssistAgentSDK.connectionRetryCallback) {
            		AssistAgentSDK.connectionRetryCallback(retryCount, retryTimeInMilliSeconds);
            	}
            };
            
        }, configuration.sessionToken);
	},
		
    // TODO this seems entirely redundant since we rejected the call already... Figure out why it's here...
	rejectSupport : function(configuration) {
		console.log("rejecting support");
	},
	
        setAgentDrawStyle : function(stroke, strokeOpacity, strokeWidth) {
            console.log("Setting agent stroke style (" + stroke + "," + strokeOpacity + "," + strokeWidth + ")");
            AssistAgentSDK.validateAgentDrawStyle(stroke, strokeOpacity, strokeWidth);
            
            // Update cached stroke parameters, and set on annotation window if one exists.
            AssistAgentSDK.stroke = stroke;
            AssistAgentSDK.strokeOpacity = strokeOpacity;
            AssistAgentSDK.strokeWidth = strokeWidth;
            
            if (AssistAgentSDK.annotationWindow) {
                AssistAgentSDK.annotationWindow.setAgentDrawStyle(stroke, strokeOpacity, strokeWidth);
            }
                       
            console.log("Set agent stroke style");
        },
        
	startSupport : function(configuration) {
		AssistAgentSDK.init(configuration);
	},



	//This method adapted from code at http://stackoverflow.com/questions/5916900/detect-version-of-browser
    getBrowser : function() {
        var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []; 
        if(/trident/i.test(M[1])){
            return 'IE';
        }   
        if(M[1]==='Chrome'){
            tem=ua.match(/\bOPR\/(\d+)/)
            if(tem!=null)   {return 'Opera';}
        }   
        M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
        if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
        return M[0];
    },
    
	//This method adapted from code at http://stackoverflow.com/questions/5916900/detect-version-of-browser
	getBrowserVersion : function() {
	    var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];                                                                                                                         
	    if(/trident/i.test(M[1])){
	        tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
	        return (tem[1]||'');
	    }
	    if(M[1]==='Chrome'){
	        tem=ua.match(/\bOPR\/(\d+)/)
	        if(tem!=null)   {return tem[1];}
	    }   
	    M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
	    if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
	    return M[1];
	},
	
	isBrowserSupported : function() {
    	var browser = AssistAgentSDK.getBrowser();
    	var version = AssistAgentSDK.getBrowserVersion();
    	console.log("Browser: " + browser + " " + version);
		if (browser == "Chrome")
			return version >= 33;
		if (browser == "Firefox")
			return version >= 28;
		return false;
	},
	
	isVideoSupported : function() {
		if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
			navigator.msGetUserMedia)
		{
			return true;
		}
		return false;
	},

	setLocale : function(locale) {
	    if (AssistAgentSDK.localeSet) {
	        return;
	    }
        var lang = "en";
        if (typeof locale !== "undefined" && locale !== null) {
            lang = locale;
        }
        // TODO: What's the best way to get the path?
        var localeUrl = AssistAgentSDK.sdkUrl + '../shared/locales/__ns__.__lng__.json';
        if (AssistAgentSDK.i18nLoader) {
            i18n.init({useCookie: false, ns:{namespaces:['assistI18n']}, lng:lang, fallbackLng: 'en', customLoad: function() { 
                var args = [localeUrl];
                args = args.concat(Array.prototype.slice.call(arguments));
                return AssistAgentSDK.i18nLoader.apply(AssistAgentSDK, args);
            }});
        } else {
            i18n.init({useCookie: false, ns:{namespaces:['assistI18n']}, lng:lang, fallbackLng: 'en', resGetPath: localeUrl});
        }
        AssistAgentSDK.localeSet = true;
        if (isRTL(lang)) {
            // TODO: How should we best reference this?
            var sharedWinRTLSource = AssistAgentSDK.sdkUrl + "../shared/css/shared-window-rtl.css";
            var link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("type", "text/css");
            link.setAttribute("href", sharedWinRTLSource);
            document.getElementsByTagName("head")[0].appendChild(link);
        }

        // TODO: Would like to share this knowledge with the consumer side.
        function isRTL(locale) {
            return typeof locale !== "undefined" && locale != null &&
            (startsWith(locale, "ar") || startsWith(locale, "dv") || startsWith(locale, "fa") || locale === "ha" || startsWith(locale, "ha-") ||
            startsWith(locale, "he") || startsWith(locale, "khw") || locale === "ks" || startsWith(locale, "ks-") || startsWith(locale, "ku") ||
            startsWith(locale, "ps") || startsWith(locale, "ur") || startsWith(locale, "yi"));
            function startsWith(str, searchString) {
                return str.lastIndexOf(searchString, 0) === 0;
            }
        }
  },
  
  startZoom : function () {
      if (AssistAgentSDK.rootTopic) {
          if (AssistAgentSDK.sharedWindow && AssistAgentSDK.sharedWindow.hasAtLeastOneSharedDocument()) {
              console.log("Cannot zoom when a document is shared.");
          } else {
              var zoomMessage = {type:"startZoom"};
              AssistAgentSDK.sendRootTopicMessage(zoomMessage);
          }
      }
  },
  
  endZoom : function () {
      if (AssistAgentSDK.rootTopic) {
          var zoomMessage = {type:"endZoom"};
          AssistAgentSDK.sendRootTopicMessage(zoomMessage);
      }
  }
};

(function setSDKPath() {
    var sdkUrl = '';
    try {
        var scripts = document.getElementsByTagName('script');
        var src = scripts[scripts.length - 1].src; // last script should be us
        var path = src.substring(0, src.lastIndexOf("js/")); 
        var file = src.substring(src.lastIndexOf("/") + 1, src.length);

        if (file == "assist-console.js") { // need this check in case we've been uglified into some other script loader
            sdkUrl = path;
        }
        
    } catch (e) {
    }
    
    window.AssistAgentSDK.sdkUrl = sdkUrl;
})();

function convertPayloadToString(message) {
    var payloadString = '';
    for (var i = 0; i < message.length; i++) {
        payloadString += String.fromCharCode(message[i]);
    }
    return payloadString;
}