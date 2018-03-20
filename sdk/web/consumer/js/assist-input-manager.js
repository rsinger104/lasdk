;(function () {

    "use strict";

    var inputElements = [];
    var inputDescriptor;
    var inputUid = 0;

    var targetWindow;
    var inputElementsPopulatedCallback;
    var inputElementClickedCallback;
    var inputElementsOnPageCallback;
    var selectElementFocusListener;
    var hasPermissionToInteractCallback;
    var AssistControllerInterface;
    var elementListenerContextData = new Map();

    //This object used is to resolve an issue in Safari that overwrites changed values when the options list is dismissed:
    function SafariSelectValueChangeUnexpectedlyListener(onChangedUnexpectedlyHandler) {
        var POLL_INTERVAL_MS = 1000;
        var valueChangedExpectedly = false;
        var valueOfElementOnFocus;
        var selectValuePoller;

        var onChangeHandler = function(event) {
            valueChangedExpectedly = true;
        }

        var onFocusHandler = function(event) {
            var selectElement = event.target;
            valueOfElementOnFocus = selectElement.value;
            selectValuePoller = setInterval(function() {
                if (selectElement.value === valueOfElementOnFocus) return;
                if (valueChangedExpectedly) {
                    valueOfElementOnFocus = selectElement.value;
                    valueChangedExpectedly = false;
                    return;
                }
                clearInterval(selectValuePoller);
                onChangedUnexpectedlyHandler(selectElement, valueOfElementOnFocus, selectElement.value);
            }, POLL_INTERVAL_MS);
        }
        var onBlurHandler = function(event) {
            var selectElement = event.target;
            if (selectElement.value !== valueOfElementOnFocus &&
                valueChangedExpectedly === false) {
                onChangedUnexpectedlyHandler(selectElement, valueOfElementOnFocus, selectElement.value);
            }
            clearInterval(selectValuePoller);
        }

        return {
            registerExpectedValueChange: function() {
                valueChangedExpectedly = true;
            },
            addSelectElement: function(selectElement) {
                selectElement.addEventListener("change", onChangeHandler);
                selectElement.addEventListener("focus", onFocusHandler);
                selectElement.addEventListener("blur", onBlurHandler);
            }
        }
    }
    var safariSelectValueChangeUnexpectedlyListener;

    var SUPPORTED_INPUT_ELEMENTS = ["INPUT", "SELECT", "TEXTAREA"];
    var INLINE_TEXT_EDITABLE = ["color", "date", "datetime", "datetime-local", "email", "month",
        "number", "range", "search", "tel", "text", "time", "url", "week", "textarea", "select"];

    window.AssistInputManager = {
          isSafari: (function () {

            try {
              return /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
            } catch (e) {
              return false;
            }
          })(),
        init: function (configuration, aAssistControllerInterface, aInputElementsPopulatedCallback, aInputElementClickedCallback,
                        aInputElementsOnPageCallback, aSelectElementFocusListener, aHasPermissionToInteractCallback, aTargetWindow) {

            AssistControllerInterface = aAssistControllerInterface;
            inputElementsPopulatedCallback = aInputElementsPopulatedCallback;
            inputElementClickedCallback = aInputElementClickedCallback;
            inputElementsOnPageCallback = aInputElementsOnPageCallback;
            selectElementFocusListener = aSelectElementFocusListener;
            hasPermissionToInteractCallback = aHasPermissionToInteractCallback;
            targetWindow = aTargetWindow || window;

            if (AssistInputManager.isSafari === true) {
                safariSelectValueChangeUnexpectedlyListener = new SafariSelectValueChangeUnexpectedlyListener(function(selectElement, from, to) {
                    var contextData = elementListenerContextData.get(selectElement);
                    if (!contextData) return;
                    var descriptor = contextData.elementInputDescriptor;

                    descriptor.value = selectElement.value;
                    // Send an updated descriptor to the agent
                    var updateDescriptor = {
                        screenId: inputDescriptor.screenId,
                        descriptors: [descriptor]
                    };
                    var descriptorString = stringifyAndEscape(updateDescriptor);

                    if (inputElementsPopulatedCallback) {
                        inputElementsPopulatedCallback(descriptorString);
                    }
                });
            }
        },

        mapInputElements: function (document) {
            document = document || window.document;

            var inputs = document.querySelectorAll(SUPPORTED_INPUT_ELEMENTS.join());
            var labels = document.getElementsByTagName("label");

            var inputDescriptors = [];
            for (var i = 0; i < inputs.length; i++) {
                var input = inputs[i];

                if (!isVisible(input) || hasAssistNoShow(input) || !hasPermissionToInteractCallback(input)) {
                    continue;
                }

                var type = input.tagName == "INPUT" ? input.getAttribute("type") : input.tagName.toLowerCase();
                if (type == null) type = "text";

                var label = getLabelNameForInputElement(document, input, type);

                // There is no point sending a descriptor to the agent if we have absolutely no label so only continue if we have some sort of descriptor
                // Except if it is a list box which might be sufficiently self explanatory
                if (!label && type != "select") {
                    continue;
                }

                var elementInputDescriptor = createElementInputDescriptorForElement(input, label, type, i);
                if (elementInputDescriptor) {
                    inputDescriptors[inputDescriptors.length] = elementInputDescriptor;
                    applyInputElementListeners(input, type);
                    elementListenerContextData.set(input, {elementInputDescriptor: elementInputDescriptor, inputType: type});
                }
            }

            if (inputDescriptors.length > 0) {
                sendInputDescriptorsViaInputTopic(inputs, inputDescriptors);
            } else {
                AssistControllerInterface.noInputs();
                // There are no inputs to send so clear the descriptors and leave the input topic if there is one
                inputDescriptor = {};
            }
        },

        getListenedInputElements: function() {
            var listenedInputElements = [];

            elementListenerContextData.forEach(function(value, key) {
                listenedInputElements.push(key);
            });

            return listenedInputElements;
        }
    };


    function hasAssistNoShow(element) {
        return element.classList.contains("assist-no-show")
            || (element.parentElement && hasAssistNoShow(element.parentElement));
    };

    function getStyle(el, property) {
        return window.getComputedStyle(el,null)[property];
    };

    function isVisible(element) {
        if ('0' === getStyle(element, 'opacity') || 'none' === getStyle(element, 'display') || 'hidden' === getStyle(element, 'visibility')) {
            return false;
        }
        return element.offsetWidth > 0 && element.offsetHeight > 0;
    };

    function stringifyAndEscape(jsonObject) {
        return unescape(encodeURIComponent(JSON.stringify(jsonObject)));
    }

    function isInArray(value, array) {
        return array.indexOf(value) > -1;
    }

    function getLabelNameForInputElement(document, inputElement, elementType) {
        var labelElement = document.querySelector('label[for="' + inputElement.id + '"]');

        if (labelElement) {
            return labelElement.textContent;
        }

        var inputTitle = inputElement.getAttribute("title");
        if (inputTitle) {
            return inputTitle;
        }

        if (elementType == "radio") {
            return inputElement.value;
        }

        var inputName = inputElement.getAttribute("name");
        if (inputName) {
            return inputName
        }

        var labelId = inputElement.id;
        if (labelId) {
            return labelId;
        }

        return undefined;
    }

    function createElementInputDescriptorForElement(inputElement, inputLabel, elementType, elementIndex) {
       var elementInputDescriptor = {type: elementType, label: inputLabel, index: elementIndex};

        switch (elementType) {
            case "password":
            case "hidden":
            case "image":
            case "submit":
                return undefined;
            case "radio":
                elementInputDescriptor.radioGroup = inputElement.getAttribute("name");
                if (inputElement.checked) {
                     elementInputDescriptor.checked = true;
                }
                break;
            case "checkbox":
                elementInputDescriptor.checked = inputElement.checked;
                break;
            case "select":
                var options = inputElement.getElementsByTagName("option");
                var optionDescs = [];
                for (var j = 0; j < options.length; j++) {
                    optionDescs[optionDescs.length] = {
                        value: options[j].value,
                        label: options[j].textContent
                    };
                }
                elementInputDescriptor.value = inputElement.value;
                elementInputDescriptor.options = optionDescs;
                break;
            default:
                var pattern = inputElement.getAttribute("pattern");
                if (pattern) {
                    elementInputDescriptor.pattern = pattern;
                }
                var placeholder = inputElement.getAttribute("placeholder");
                if (placeholder) {
                    elementInputDescriptor.placeholder = placeholder;
                }
                var value = inputElement.value;
                if (value) {
                    elementInputDescriptor.value = value;
                }
                break;
        }

        return elementInputDescriptor;
    }

    function inputChangeListener(event) {
        var inputElement = event.target;
        var contextData = elementListenerContextData.get(inputElement);

        var inputType = contextData.inputType,
            descriptor = contextData.elementInputDescriptor;

        switch (inputType) {
            case "radio":
            case "checkbox":
                descriptor.checked = inputElement.checked;
                break;
                    default:
                        descriptor.value = inputElement.value;
                        break;
        }
        // Send an updated descriptor to the agent
        var updateDescriptor = {
            screenId: inputDescriptor.screenId,
            descriptors: [descriptor]
        };
        var descriptorString = stringifyAndEscape(updateDescriptor);

        if (inputElementsPopulatedCallback) {
            inputElementsPopulatedCallback(descriptorString, inputElement);
        }
    }

    function inputClickListener(event) {
        var inputElement = event.target;
        var contextData = elementListenerContextData.get(inputElement);

        if (!contextData) return;

        var elementDescriptor = contextData.elementInputDescriptor;

        // If the click event was sent from the remote endpoint then notify the
        if (event.assist_generated && inputDescriptor) {
            // update placeholder
            var inputElement = inputElements[elementDescriptor.index];
            if (!hasPermissionToInteractCallback(inputElement)) {
                return;
            }

            var placeholder = inputElement.getAttribute("placeholder");
            if (placeholder) {
                elementDescriptor.placeholder = placeholder;
            }
            elementDescriptor.value = inputElement.value;
            var desc = {
                screenId: inputDescriptor.screenId,
                clicked: elementDescriptor
            };
            if (event.assist_source || event.assist_source == 0) {
                desc.by = event.assist_source;
            }

            var descString = stringifyAndEscape(desc);

            // These values will probably be slightly off, but being able to see the remote text box behind
            // is generally better anyway
            var bounds = inputElement.getBoundingClientRect();

            if (inputElementClickedCallback) {
                inputElementClickedCallback(descString, bounds.left, bounds.top);
            }
        }
        if (event.assist_generated) event.preventDefault();
    }

    function selectFocusListener(event) {
        var contextData = elementListenerContextData.get(event.target);
        if (!contextData) return;
        var elementDescriptor = contextData.elementInputDescriptor;

        var element = event.target;
        var onFocusElementValue = element.value;

        var desc = {
            screenId: inputDescriptor.screenId,
            clicked: elementDescriptor
        };

        if (event.assist_source || event.assist_source == 0) {
            desc.by = event.assist_source;
        }

        var descString = stringifyAndEscape(desc);

        var bounds = event.target.getBoundingClientRect();
        selectElementFocusListener("focus", descString, bounds.left, bounds.top);
    }

    function selectBlurListener(event) {
        var contextData = elementListenerContextData.get(event.target);
        if (!contextData) return;
        var inputDescriptor = contextData.elementInputDescriptor;
        var descriptorString = stringifyAndEscape(inputDescriptor);

        var bounds = event.target.getBoundingClientRect();
        selectElementFocusListener("blur", descriptorString, bounds.left, bounds.top);
    }

    function multiSelectMouseUpListener(event) {
        if(event.assist_generated) {
            if (!AssistInputManager.isSafari) {
                event.target.selected = !event.target.selected;
            }
            AssistControllerInterface.doRender();
        }
    }

    function selectMouseDownListener(event) {
      if (event.assist_generated) {
        event.preventDefault();
      }
    }

    function applyInputElementListeners(inputElement, type) {
        if (!elementListenerContextData.get(inputElement)) {
            inputElement.addEventListener("change", inputChangeListener);

            if (type === "select" && inputElement.multiple) {
              inputElement.addEventListener("mouseup", multiSelectMouseUpListener);

            } else {
              if (isInArray(type, INLINE_TEXT_EDITABLE)) {
                inputElement.addEventListener("click", inputClickListener);
                if (type === "select") {
                  if (safariSelectValueChangeUnexpectedlyListener) {
                    safariSelectValueChangeUnexpectedlyListener.addSelectElement(inputElement);
                  }

                  inputElement.addEventListener("focus", selectFocusListener);
                  inputElement.addEventListener("blur", selectBlurListener);
                  inputElement.addEventListener("mousedown", selectMouseDownListener);
                }
              }
            }
        }
    }

    function sendInputDescriptorsViaInputTopic(inputs, inputDescriptors) {
        inputElements = inputs;
        // We need a unique ID to prevent data for one form being used to populate another
        var pageId = ++inputUid;
        inputDescriptor = {screenId: pageId, descriptors: inputDescriptors};
        // Create the form info topic under the screen share topic if it doesn't already exist
        var sendInputDescriptor = function () {

            var jsonPayload = stringifyAndEscape(inputDescriptor);
            if (inputElementsOnPageCallback) {
                inputElementsOnPageCallback(jsonPayload);
            }

        };
        if (AssistControllerInterface.hasInputTopic() && AssistControllerInterface.inputTopicHasAgent()) {
            sendInputDescriptor();
        } else if (AssistControllerInterface.hasInputTopic() == false) {
            AssistControllerInterface.openInputTopic(
                function agentJoined() {
                    sendInputDescriptor();
                },
                function inputElementsPopulated(message) {

                    var messagePayload = new Uint8Array(message.buffer, 2);
                    var populatedElementsString = String.fromCharCode.apply(null, messagePayload);
                    var populatedElements = unescapeAndParse(populatedElementsString);
                    if (populatedElements.screenId != inputUid) {
                        // The populated element description refers to a form on another page, ignore it
                        return;
                    }
                    var alteredElements = populatedElements.descriptors;
                    for (var i = 0; i < alteredElements.length; i++) {
                        var altered = alteredElements[i];
                        var element = inputElements[altered.index];
                        if (!hasPermissionToInteractCallback(element)) {
                            continue;
                        }

                        var type = element.tagName == "INPUT" ? element.getAttribute("type") : element.tagName.toLowerCase();;
                        switch (type) {
                            case "radio":
                            case "checkbox":
                                element.checked = altered.checked;
                                break;
                                default:
                                    element.value = altered.value;
                                    break;
                        }

                        if (safariSelectValueChangeUnexpectedlyListener) {
                            safariSelectValueChangeUnexpectedlyListener.registerExpectedValueChange();
                        }

                        if (altered.clickNext) {
                            // In order to try to simulate tabbing through the document naturally, find the next element in the tab order
                            // and if it is a form element, simulate an agent click on it.
                            // This is not really possible but grabbing the next element in the descriptor list should be a good proxy
                            for (var i = 0; i < inputDescriptor.descriptors.length; i++) {
                                if (altered.index == inputDescriptor.descriptors[i].index) {
                                    for (var nextDescriptorIndex = i + 1; nextDescriptorIndex < inputDescriptor.descriptors.length; nextDescriptorIndex++) {
                                        var nextDescriptor = inputDescriptor.descriptors[nextDescriptorIndex];
                                        if (nextDescriptor) {
                                            var nextElement = inputElements[nextDescriptor.index];
                                            if (nextElement.tagName == "TEXTAREA" ||
                                                (nextElement.tagName == "INPUT" && (isInArray(nextElement.getAttribute("type"), INLINE_TEXT_EDITABLE)))) {
                                                var bounds = nextElement.getBoundingClientRect();
                                                var viewWidth = targetWindow.innerWidth;// || document.body.clientWidth;
                                                var viewHeight = targetWindow.innerHeight;// || document.body.clientHeight;
                                                var scrollX = (window.pageXOffset === undefined ? targetWindow.document.body.scrollLeft : targetWindow.pageXOffset);
                                                var scrollY = (window.pageYOffset === undefined ? targetWindow.document.body.scrollTop : targetWindow.pageYOffset);
                                                if (bounds.top >= scrollY && bounds.bottom <= (scrollY + viewHeight)
                                                    && bounds.left >= scrollX && bounds.right <= (scrollX + viewWidth)) {
                                                    // Only send the click if the element is entirely visible
                                                    nextDescriptor.value = nextElement.value;
                                                    var desc = {
                                                        screenId: inputDescriptor.screenId,
                                                        clicked: nextDescriptor
                                                    };
                                                    var descString = stringifyAndEscape(desc);

                                                    if (inputElementClickedCallback) {
                                                        inputElementClickedCallback(descString, bounds.left, bounds.top);
                                                    }

                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            );
        }
    }

})();