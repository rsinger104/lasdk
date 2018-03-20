(function () {
    var PING_MESSAGE_ID = 100;
    var PONG_MESSAGE_ID = 200;
    var JOIN_TOPIC_MESSAGE_ID = 10100;
    var LEAVE_TOPIC_MESSAGE_ID = 10200;
    var OPEN_TOPIC_MESSAGE_ID = 10300;
    var OPEN_PRIVATE_TOPIC_MESSAGE_ID = 10310;
    var CLOSE_TOPIC_MESSAGE_ID = 10400;
    var SET_TOPIC_PERMISSION_MESSAGE_ID = 10500;
    var SEND_MESSAGE_MESSAGE_ID = 20100;
    var TOPIC_LIST_MESSAGE_ID = 10000;
    var PARTICIPANT_LIST_MESSAGE_ID = 15000;
    var pingDelay = 10000;


    var PERMISSIONS = {
        NONE: 0,
        REQUESTED: 1,
        ALLOWED: 2,
        DENIED: 3
    };

    var permissionStrings = [];
    permissionStrings[PERMISSIONS.NONE] = "NONE";
    permissionStrings[PERMISSIONS.ALLOWED] = "ALLOWED";
    permissionStrings[PERMISSIONS.DENIED] = "DENIED";
    permissionStrings[PERMISSIONS.REQUESTED] = "REQUESTED";

    window.AED = function () {

        this.PERMISSIONS = PERMISSIONS;
        this.PERMISSIONS.STRINGS = permissionStrings;

        var rootTopic;
        var topicSocket;
        var previousParticipantId;
        var participantId;
        var configuration;
        var topics = [];
        var participants = [];
        var pendingSubtopicCallbacks = [];
        var pingTimer;
        var messageWasReceived = false;
        var sessionToken;
        var connectionRetryCount = 0;
        var maxConnectionRetryCount = 10;

        var socketTimeout;
        var terminateCallback;
        var socketRetryIntervals = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
        
        var ERROR_CODE = {
            CONNECTION_LOST: 0,
            PERMISSION: 1,
            SOCKET: 2,
            CALL_FAIL: 3,
            POPUP: 4,
            SESSION_IN_PROGRESS: 5,
            SESSION_CREATION_FAILURE: 6
        };

        var _self = this;



        var errorCallback = function (error) {
            console.log(JSON.stringify(error));
        }

        var socketCallBacks = {
            onDisconnect: function (error, connector) {
                console.log("onDisconnect", error, connector);
            },
            onConnect: function () {
                console.log("onConnect");
            },
            onTerminated: function (error) {
                console.log("onTerminated", error);
            },
            willRetry: function (inSeconds, retryAttemptNumber, maxRetryAttempts, connector) {
                console.log("willRetry", inSeconds, retryAttemptNumber, maxRetryAttempts, connector);
            }
        };

        var socketConnector = {
            reconnect: function () {
                clearTimeout(socketTimeout);
                topicSocket.reconnectTopic();
            },
            terminate: function (error) {
                clearTimeout(socketTimeout);
                _self.reportConnectionLost(error);
                terminateCallback();
            }
        };


        function reportError(error) {
            if (_self.errorCallback) {
                _self.errorCallback(error);
            }
            else {
                console.log(JSON.stringify(error));
            }
        }


        this.setErrorCallback = function (errorCallback) {
            _self.errorCallback = errorCallback;
        }

        function createErrorMessage(code, message) {
            return { code: code, message: message }
        }

        this.setSocketCallbacks = function (callbacks) {
            if (callbacks !== undefined) {

                if (typeof callbacks.onConnect === 'function') {
                    socketCallBacks.onConnect = callbacks.onConnect;
                }

                if (typeof callbacks.onDisconnect === 'function') {
                    socketCallBacks.onDisconnect = callbacks.onDisconnect;
                }

                if (typeof callbacks.willRetry === 'function') {
                    socketCallBacks.willRetry = callbacks.willRetry;
                }

                if (typeof callbacks.onTerminated === 'function') {
                    socketCallBacks.onTerminated = callbacks.onTerminated;
                }
            }
        };

        this.setSocketConnectionConfiguration = function (configuration, callback) {

            this.setSocketCallbacks(configuration.connectionStatusCallbacks);

            if (Array.isArray(configuration.retryIntervals)) {
                socketRetryIntervals = configuration.retryIntervals;
            }

            terminateCallback = callback;
        };



        function resetAEDVariables() {
            if (topicSocket && topicSocket.close) {
                topicSocket.onclose = function () {
                };
                topicSocket.close();
            }
            clearTimeout(pingTimer);
            rootTopic = undefined;
            topicSocket = undefined;
            previousParticipantId = undefined;
            participantId = undefined;
            topics = [];
            participants = [];
            pendingSubtopicCallbacks = [];

        }

        var disconnect = function (error) {
            resetAEDVariables();
            socketCallBacks.onDisconnect(error, socketConnector);
        };

        var sendPing = function () {
            var pingMessage = new Uint16Array(3);
            pingMessage[0] = PING_MESSAGE_ID;
            pingMessage[1] = 0;
            pingMessage[2] = participantId;
            topicSocket.send(pingMessage);
            pingTimer = setTimeout(function () {
                if (messageWasReceived) {
                    messageWasReceived = false;
                    sendPing();
                } else {
                    reconnectSocketIfRetriesRemaining();                    
                }
            }, pingDelay);
        };

        function reconnectSocketIfRetriesRemaining() {
            topicSocket.close();
            if (topicSocket.onclose) {
                topicSocket.onclose(); // doesn't seem to always fire on close()
            }
        }

        var messageHandlers = function () {
            var handlers = [];

            handlers[JOIN_TOPIC_MESSAGE_ID] = function (topicId, sourceId, payload) {
                console.log("Join topic message received for topic " + topicId + " from " + sourceId);
                // add the participant to the topic
                var participant = participants[sourceId];
                if (!participant) {
                    var participantDesc = parseAsJson(payload);
                    var metadata = {};
                    if (participantDesc.metadata) {
                        metadata = JSON.parse(participantDesc.metadata);
                    }
                    participant = new Participant(sourceId, metadata);
                    participants[sourceId] = participant;
                }
                var topic = topics[topicId];
                topic.participants.push(participant);
                // Notify the topic call back
                topic.participantJoined(participant);

            };
            handlers[LEAVE_TOPIC_MESSAGE_ID] = function (topicId, sourceId, payload) {
                console.log("Leave topic message received for topic " + topicId + " from " + sourceId);
                var topic = topics[topicId];
                var participant = participants[sourceId];
                topic.participants.splice(topic.participants.indexOf(participant), 1);
                topic.participantLeft(participant);
                //if (topicId == 0) {
                //    // TODO should we do this? Considering the permission model maybe not...
                //    // The participant left the root topic and are therefore totally gone so forget them entirely
                //    participants[sourceId] = undefined;
                //}
            };
            handlers[OPEN_TOPIC_MESSAGE_ID] = function (topicId, sourceId, payload) {
                console.log("Open topic message received for topic " + topicId + " from " + sourceId);

                var subtopicDesc = parseAsJson(payload);
                var parentTopic = topics[topicId];
                var owner = participants[sourceId];

                var metadata = {};
                if (subtopicDesc.metadata) {
                    metadata = JSON.parse(subtopicDesc.metadata);
                }
                if (topics[subtopicDesc.id]) {
                    // The topic already exists so we're reconnecting
                    // TODO consider comparing the metadata
                } else {
                    var subtopic = new Topic(subtopicDesc.id, owner, parentTopic, metadata, operations);
                    topics[subtopic.id] = subtopic;
                    parentTopic.subtopics.push(subtopic);
                    if (sourceId === participantId) {
                        pendingSubtopicCallbacks[topicId].callBackForTopic(subtopic);
                    } else {
                        parentTopic.subtopicOpened(subtopic);
                    }
                }
            };
            handlers[OPEN_PRIVATE_TOPIC_MESSAGE_ID] = function (topicId, sourceId, payload) {
                console.log("Open private topic message received for topic " + topicId + " from " + sourceId);

                var subtopicDesc = parseAsJson(payload);
                var parentTopic = topics[topicId];
                var owner = participants[sourceId];

                var metadata = {};
                if (subtopicDesc.metadata) {
                    metadata = JSON.parse(subtopicDesc.metadata);
                }
                if (topics[subtopicDesc.id]) {
                    // The topic already exists so we're reconnecting
                    // TODO consider comparing the metadata
                } else {
                    var subtopic = new PrivateTopic(subtopicDesc.id, owner, parentTopic, metadata, operations);
                    topics[subtopic.id] = subtopic;
                    parentTopic.subtopics.push(subtopic);
                    if (sourceId === participantId) {
                        pendingSubtopicCallbacks[topicId].callBackForTopic(subtopic);
                    } else {
                        parentTopic.privateSubtopicOpened(subtopic);
                    }
                }
            };
            handlers[CLOSE_TOPIC_MESSAGE_ID] = function (topicId, sourceId, payload) {
                console.log("Close topic message received for topic " + topicId + " from " + sourceId);
                var closedTopic = topics[topicId];
                // If we were a member of this topic we should notify the listener that everyone has left
                for (var i = 0; i < closedTopic.participants.length; i++) {
                    var removeParticipant = closedTopic.participants[i];
                    if (!window.AssistAED.isMe(removeParticipant)) {
                        closedTopic.participants.splice(i, 1);
                        closedTopic.participantLeft(removeParticipant);
                    }
                }
                var parentTopic = closedTopic.parent;
                if (!parentTopic) {
                    // No parent topic implies that this is the root topic
                    var error = null;
                    disconnect(error);
                } else {
                    parentTopic.subtopics.splice(parentTopic.subtopics.indexOf(closedTopic), 1);
                    topics[closedTopic.id] = undefined;
                    parentTopic.subtopicClosed(closedTopic);
                }
            };
            handlers[SEND_MESSAGE_MESSAGE_ID] = function (topicId, sourceId, payload) {
                var topic = topics[topicId];
                var source = participants[sourceId];
                topic.messageReceived(source, new Uint8Array(payload));
            };
            handlers[TOPIC_LIST_MESSAGE_ID] = function (topicId, sourceId, payload) {
                // The source of a topic list message is always us because it's our joining the topic which
                // causes it to be sent. So if we didn't know our own ID, set it now
                if (participantId && participantId != sourceId) {
                    // we've reconnected so store our old id so we can ignore it leaving topics
                    previousParticipantId = participantId;
                }
                participantId = sourceId;

                // Get the topic to which these subtopic belong
                var parentTopic = topics[topicId];

                parentTopic.joined = true;

                // parse payload as a JSON object containing all the subtopics
                var topicList = parseAsJson(payload);

                if (parentTopic.subtopics.length > 0) {
                    // We already knew about some subtopic in this topic. This implies we're reconnecting
                    var removeList = [];
                    for (var i = 0; i < parentTopic.subtopics.length; i++) {
                        // check that all the subtopics we expect to be there still are
                        var subtopic = parentTopic.subtopics[i];
                        var found = false;
                        for (var j = 0; j < topicList.length; j++) {
                            if (subtopic.id === topicList[j].id) {
                                // TODO check metatdata?
                                found = true;
                                if (subtopic.joined) {
                                    // we believe we should be joined to this subtopic, but we're not currently
                                    // so join it if we can
                                    if (!AssistAED.isMe(subtopic.owner) && subtopic.permissions) {
                                        // This subtopic has restricted permissions so we may not be able to join it
                                        // We will be told shortly so for now we'll assume we got kicked out
                                        subtopic.permissions[participantId] = undefined;

                                        var participant = participants[participantId];
                                        subtopic.participants.splice(subtopic.participants.indexOf(participant), 1);
                                        subtopic.participantLeft(participant);

                                        subtopic.subtopics.forEach(function (childTopic) {
                                            childTopic.leave();
                                        });
                                    } else {
                                        operations.joinTopic(subtopic.id);
                                    }
                                }
                                break;
                            }
                        }
                        if (!found) {
                            removeList.push(i);
                        }
                    }
                    // Remove the topic in reverse order to avoid having to search for changed indices
                    var removeTopic = function (removedTopic) {
                        while (removedTopic.subtopics && removedTopic.subtopics.length > 0) {
                            removeTopic(removedTopic.subtopics[0]);
                        }
                        delete topics[removedTopic.id];
                        if (removedTopic.parent) {
                            removedTopic.parent.subtopics.splice(removedTopic.parent.subtopics.indexOf(removedTopic), 1);
                            removedTopic.parent.subtopicClosed(removedTopic);
                        }
                    };
                    for (i = removeList.length - 1; i >= 0; i--) {
                        var removed = parentTopic.subtopics[removeList[i]];
                        removeTopic(removed);
                    }
                }

                for (var i = 0; i < topicList.length; i++) {
                    var topicDesc = topicList[i];
                    if (topics[topicDesc.id]) {
                        // We already knew about this subtopic, TODO should we check that we had the right parent and metadata for it?
                    } else {
                        var owner = participants[topicDesc.owner];

                        var metadata = {};
                        if (topicDesc.metadata) {
                            metadata = JSON.parse(topicDesc.metadata);
                        }
                        var aTopic;
                        if (topicDesc.private) {
                            aTopic = new PrivateTopic(topicDesc.id, owner, parentTopic, metadata, operations);
                        } else {
                            aTopic = new Topic(topicDesc.id, owner, parentTopic, metadata, operations);
                        }

                        topics[aTopic.id] = aTopic;
                        parentTopic.subtopics.push(aTopic);

                        if (topicDesc.private) {
                            parentTopic.privateSubtopicOpened(aTopic)
                        } else {
                            parentTopic.subtopicOpened(aTopic);
                        }
                    }
                }
            };
            handlers[PARTICIPANT_LIST_MESSAGE_ID] = function (topicId, sourceId, payload) {
                // The source of a participant list message is always us because it's our joining the topic which
                // causes it to be sent. So if we didn't know our own ID, set it now
                if (!participantId) {
                    participantId = sourceId;
                }

                var parentTopic = topics[topicId];

                var participantList = parseAsJson(payload);

                var removeList = [];
                for (var i = 0; i < parentTopic.participants.length; i++) {
                    var participant = parentTopic.participants[i];
                    var found = false;
                    for (var j = 0; j < participantList.length; j++) {
                        if (participantList[j].id == participant.id) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        removeList.push(i);
                    }
                }
                var oldParticipantLeft = false;
                for (i = removeList.length - 1; i >= 0; i--) {
                    var removed = parentTopic.participants[removeList[i]];
                    parentTopic.participants.splice(removeList[i], 1);
                    if (removed.id == previousParticipantId && parentTopic.joined) {
                        oldParticipantLeft = true;
                    } else {
                        parentTopic.participantLeft(removed);
                    }
                }
                var joinedParticipants = [];
                for (i = 0; i < participantList.length; i++) {
                    var participantDesc = participantList[i];
                    var aParticipant;
                    if (participants[participantDesc.id]) {
                        // we already knew about this participant, TODO consider checking metadata
                        aParticipant = participants[participantDesc.id];
                    } else {
                        var metadata = {};
                        if (participantDesc.metadata) {
                            metadata = JSON.parse(participantDesc.metadata);
                        }
                        aParticipant = new Participant(participantDesc.id, metadata);
                        participants[aParticipant.id] = aParticipant;
                    }
                    if (parentTopic.participants.indexOf(aParticipant) == -1) {
                        parentTopic.participants.push(aParticipant);
                        if (aParticipant.id == participantId && oldParticipantLeft) {
                            // We're not joining or leaving but just changing the id we're known by due to a reconnect
                        } else {
                            joinedParticipants.push(aParticipant);
                        }
                    }
                }
                joinedParticipants.forEach(parentTopic.participantJoined);
            };
            handlers[PONG_MESSAGE_ID] = function (topicId, sourceId, payload) {
                //We record that a message was received in TopicSocket.onmessage(), and we
                //only send another ping after the first ping's timeout expires (in
                //sendPing()), so no need to do anything here.
            };
            handlers[SET_TOPIC_PERMISSION_MESSAGE_ID] = function (topicId, sourceId, payload) {
                console.log("Set topic permission message received for topic " + topicId + " from " + sourceId);

                var topic = topics[topicId];
                var source = participants[sourceId];

                var message = new Uint16Array(payload.buffer, 6);

                var targetId = message[0];
                var permissionCode = message[1];
                // TODO check permission code?
                if (topic.permissions) {
                    if (topic.permissions[targetId] != permissionCode) {
                        if (permissionCode == PERMISSIONS.NONE) {
                            topic.permissions[targetId] = undefined;
                        } else {
                            topic.permissions[targetId] = permissionCode;
                        }
                        topic.permissionChanged(participants[targetId], permissionCode);
                        if (topic.joined && AssistAED.isMe(participants[targetId]) && permissionCode != PERMISSIONS.ALLOWED) {
                            //  We just got kicked out of this topic
                            var kick = function (topic) {
                                topic.subtopics.forEach(kick);
                                topic.joined = false;
                                topic.participants.splice(topic.participants.indexOf(participants[participantId]), 1);
                                topic.participantLeft(participants[participantId]);
                            };
                            kick(topic);
                        }
                    }
                } else {
                    var error = createErrorMessage(ERROR_CODE.PERMISSION,"Unexpected error - Received a permission change message on a topic with no permissions.");
                    reportError(error);
                }
            };
            return handlers;
        } ();

        this.getWebSocket = function (topicId) {
            var toUrl;

            var host = window.location.host;
            if (window.location.protocol === "https:") {
                toUrl = "wss:";
            } else {
                toUrl = "ws:";
            }

            if (configuration && configuration.url) {
                host = configuration.url.replace(/(^https?:)?\/\//, "");

                var url = document.createElement("a");
                url.href = configuration.url;
                toUrl = (url.protocol == "http:") ? "ws:" : "wss:";
            }

            toUrl = toUrl + "//" + host + "/assistserver/topic?appkey=" + topicId + "&topic=" + topicId + "&sessionId=" + sessionToken;

            var webSocket = null;
            if ('WebSocket' in window) {
                webSocket = new WebSocket(toUrl);
            } else if ('MozWebSocket' in window) {
                webSocket = new MozWebSocket(toUrl);
            }

            if (webSocket != null) {
                webSocket.binaryType = "arraybuffer";
            }
            return webSocket;

        };

        var operations = new function () {
            this.openSubtopic = function (topicId, metadata, callBack) {
                if (!pendingSubtopicCallbacks[topicId]) {
                    pendingSubtopicCallbacks[topicId] = new SubtopicCallbacks();
                }
                pendingSubtopicCallbacks[topicId].addSubtopicCallback(metadata, callBack);

                sendWithJSON(topicId, metadata, OPEN_TOPIC_MESSAGE_ID);
            };

            this.openPrivateSubtopic = function (topicId, metadata, callBack, initialPermissions) {
                initialPermissions = initialPermissions || {};
                if (!pendingSubtopicCallbacks[topicId]) {
                    pendingSubtopicCallbacks[topicId] = new SubtopicCallbacks();
                }
                pendingSubtopicCallbacks[topicId].addSubtopicCallback(metadata, callBack);

                var dataString = unescape(encodeURIComponent(JSON.stringify(metadata)));
                var payloadLength = 0;
                if (dataString) {
                    payloadLength = dataString.length;
                }
                var permissionsSize = Object.keys(initialPermissions).length * 2;
                var headerLength = 4 + permissionsSize;
                var message = new Uint8Array(payloadLength + (headerLength * 2));
                var header = new Uint16Array(message.buffer, 0, headerLength);
                if (dataString) {
                    var payload = new Uint8Array(message.buffer, headerLength * 2, payloadLength);
                    setJsonPayload(dataString, payload);
                }
                header[0] = OPEN_PRIVATE_TOPIC_MESSAGE_ID;
                header[1] = topicId;
                header[2] = participantId;
                header[3] = Object.keys(initialPermissions).length;

                var headerPosition = 0;
                for (var participantId in initialPermissions) {
                    if (!initialPermissions.hasOwnProperty(participantId)) {
                        continue;
                    }
                    var participantPermission = initialPermissions[participantId];
                    header[4 + (headerPosition * 2)] = participantId;
                    header[5 + (headerPosition * 2)] = participantPermission;
                    headerPosition++;
                }
                topicSocket.send(message);
            };

            this.closeTopic = function (topicId, metadata) {
                sendWithJSON(topicId, metadata, CLOSE_TOPIC_MESSAGE_ID);
            };

            this.joinTopic = function (topicId, metadata) {
                topics[topicId].joined = true;
                sendWithJSON(topicId, metadata, JOIN_TOPIC_MESSAGE_ID);
            };

            this.leaveTopic = function (topicId, metadata) {
                topics[topicId].joined = false;
                try {
                    sendWithJSON(topicId, metadata, LEAVE_TOPIC_MESSAGE_ID);
                } catch (err) {
                    var error = createErrorMessage(ERROR_CODE.PERMISSION,"Error trying to leave topic " + topicId + ": " + err);
                    reportError(error);
                }
                if (topicId == 0) {
                    var error = null;
                    disconnect(error);
                }
            };

            this.sendMessage = function (topicId, payload) {
                var message = new Uint8Array(payload.byteLength + 6);
                var header = new Uint16Array(message.buffer, 0, 3);
                var payloadView = new Uint8Array(message.buffer, 6, payload.byteLength);
                var uint8Payload;
                if (payload.buffer) {
                    uint8Payload = new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
                } else {
                    uint8Payload = new Uint8Array(payload);
                }
                payloadView.set(uint8Payload);
                header[0] = SEND_MESSAGE_MESSAGE_ID;
                header[1] = topicId;
                header[2] = participantId;
                topicSocket.send(message);
            };

            var sendWithJSON = function (topicId, metadata, messageType) {
                var dataString = unescape(encodeURIComponent(JSON.stringify(metadata)));
                var payloadLength = 0;
                if (dataString) {
                    payloadLength = dataString.length;
                }
                var message = new Uint8Array(payloadLength + 6);
                var header = new Uint16Array(message.buffer, 0, 3);
                if (dataString) {
                    var payload = new Uint8Array(message.buffer, 6, payloadLength);
                    setJsonPayload(dataString, payload);
                }
                header[0] = messageType;
                header[1] = topicId;
                header[2] = participantId;
                topicSocket.send(message);
            };

            this.setTopicPermission = function (topicId, permissionCode, participantToSet) {
                var targetId = participantToSet || participantId;
                topics[topicId].permissions[targetId] = permissionCode || undefined;
                var message = new Uint16Array(5);
                message[0] = SET_TOPIC_PERMISSION_MESSAGE_ID;
                message[1] = topicId;
                message[2] = participantId;
                message[3] = targetId;
                message[4] = permissionCode;
                topicSocket.send(message);
                return targetId;
            }
        };

        _self.setConfig = function (config) {
            configuration = config;
        };

        _self.reportConnectionLost = function (reason) {
            if (rootTopic) {
                rootTopic.connectionLost();
            }
            reportError(reason);
            connectionRetryCount = 0;
            socketCallBacks.onTerminated(reason);
        };

        _self.connectRootTopic = function (topic, callback, token, reconnecting) {
            if (connectionRetryCount >= maxConnectionRetryCount) {
                var error = createErrorMessage(ERROR_CODE.CONNECTION_LOST, "Failed to reconnect after retry count " + connectionRetryCount);
                socketConnector.terminate(error);
                return;
            }
            sessionToken = token;
            if (topicSocket) {
                topicSocket.onclose = function () { };
                topicSocket.close();
                clearTimeout(pingTimer);
            }
            if (!reconnecting) {
                // TODO clean up existing topics and participants
            }

            topicSocket = _self.getWebSocket(topic);
            if (!topicSocket) {
                alert('WebSocket is not supported by this browser.');
                return;
            }

            topicSocket.onopen = function () {
                if (reconnecting) {
                    // handle reconection
                    if (rootTopic) {
                        rootTopic.connectionReestablished();
                    }
                    console.log(" Info: Socket connection for topic " + topic + " reconnected.");
                } else {
                    console.log(" Info: Socket connection for topic " + topic + " opened.");
                    rootTopic = new Topic(0, undefined, undefined, { "type": "root" }, operations);
                    topics[0] = rootTopic;
                    callback(rootTopic);
                    rootTopic.connectionEstablished();
                }

                socketCallBacks.onConnect();
                sendPing();
            };


            topicSocket.onmessage = function (event) {
                var header = new Uint16Array(event.data, 0, 3);

                var payload = undefined;
                if (event.data.byteLength > 6) {
                    payload = new Uint8Array(event.data, 6);
                }

                messageWasReceived = true;
                connectionRetryCount = 0;

                var messageType = header[0];
                var topicHeader = header[1];
                var sourceHeader = header[2];

                messageHandlers[messageType](topicHeader, sourceHeader, payload);
            };

            topicSocket.reconnectTopic = function () {
                _self.connectRootTopic(topic, function () {
                }, sessionToken, true);
            };

            topicSocket.onclose = function (event) {
                console.log('Topic Socket Closed');
                topicSocket.onclose = function () {
                };
                connectionRetryCount++;

                maxConnectionRetryCount = socketRetryIntervals.length;

                if (socketRetryIntervals.length == 0) {
                    var error = createErrorMessage(ERROR_CODE.CONNECTION_LOST,"No retry intervals specified, not attempting to reconnect");
                    socketConnector.terminate(error);
                    return;
                }

                if (connectionRetryCount <= maxConnectionRetryCount) {
                    var timeoutInMs = socketRetryIntervals[connectionRetryCount - 1] * 1000;

                    console.log("Reconnection of Topic Socket after " + timeoutInMs + "ms (try " + connectionRetryCount + " of " + maxConnectionRetryCount + ")");

                    if (rootTopic) {
                        rootTopic.connectionRetry(connectionRetryCount, timeoutInMs);
                    }

                    socketTimeout = setTimeout(topicSocket.reconnectTopic, timeoutInMs);

                    if (connectionRetryCount > 1) {
                        var SOCKET_NO_STATUS_CLOSE = 1005;
                        var code = (typeof event === 'undefined') ? SOCKET_NO_STATUS_CLOSE : event.code;
                        var socketErrorMessage = createErrorMessage(ERROR_CODE.SOCKET, "Socket error , code :" + code);
                        socketCallBacks.onDisconnect(socketErrorMessage, socketConnector);
                    }

                    socketCallBacks.willRetry(socketRetryIntervals[connectionRetryCount - 1], connectionRetryCount, maxConnectionRetryCount, socketConnector);

                }


            };
        };

        var parseAsJson = function (payload) {
            var payloadString = decodeURIComponent(escape(String.fromCharCode.apply(null, payload)));
            return JSON.parse(payloadString);
        };

        var setJsonPayload = function (metadata, payload) {
            for (var i = 0; i < metadata.length; i++) {
                payload[i] = metadata.charCodeAt(i);
            }
        };

        this.isMe = function (participant) {
            return participant.id == participantId;
        };

        this.getMe = function () {
            return participants[participantId];
        }
    };

    function Topic(id, owner, parent, metadata, operations) {

        var subtopics = [];
        var participants = [];

        this.parent = parent;

        this.id = id;

        this.metadata = metadata;

        this.owner = owner;

        this.subtopics = subtopics;

        this.participants = participants;

        this.openSubtopic = function (metadata, callBack) {
            operations.openSubtopic(id, metadata, callBack);
        };

        this.openPrivateSubtopic = function (metadata, callBack, initialPermissions) {
            operations.openPrivateSubtopic(id, metadata, callBack, initialPermissions);
        };

        this.closeTopic = function (payload) {
            // TODO check if we're the owner and don't try if we're not
            operations.closeTopic(id, payload);
        };

        this.join = function () {
            operations.joinTopic(id);
        };

        this.leave = function () {
            operations.leaveTopic(id);
        };

        this.sendMessage = function (payload) {
            operations.sendMessage(id, payload);
        };
    }

    Topic.prototype = {
        participantJoined: function (newParticipant) {
            console.log("New participant joined topic " + newParticipant.metadata);
        },

        participantLeft: function (leavingParticipant) {
            console.log("Participant left topic " + leavingParticipant.metadata);
        },

        subtopicOpened: function (newSubtopic) {
            console.log("New subtopic created " + newSubtopic.metadata);
        },

        privateSubtopicOpened: function (newPrivateSubtopic) {
            console.log("New private subtopic created " + newPrivateSubtopic.metadata);
        },

        subtopicClosed: function (closingSubtopic) {
            console.log("Subtopic closed " + closingSubtopic.metadata);
        },

        messageReceived: function (source, message) {
        },

        connectionEstablished: function () {
        },

        connectionReestablished: function () {
        },

        connectionLost: function () {
        },

        connectionRetry: function (connectionRetryCount, connectionRetryTimeInMs) {
        }
    };

    function PrivateTopic(id, owner, parent, metadata, operations) {
        Topic.call(this, id, owner, parent, metadata, operations);
        var _self = this;

        _self.permissions = {};
        _self.permissions[owner.id] = PERMISSIONS.ALLOWED;

        _self.updatePermission = function (permission, participant) {
            if (!participant || AssistAED.isMe(participant)) {
                // If no participant is provided (or the local participant is provided)
                // then update this participants permission if it is requested or none
                if (permission == PERMISSIONS.NONE || permission == PERMISSIONS.REQUESTED) {
                    var participantId = operations.setTopicPermission(id, permission);
                    _self.permissions[participantId] = permission;
                }
            } else if (AssistAED.isMe(_self.owner)) {
                // If a participant is provided, and isn't us only update if we own this topic
                _self.permissions[participant.id] = permission;
                operations.setTopicPermission(id, permission, participant.id);
            } else {
                // TODO maybe mention that this isn't going to work...
            }
        };

        _self.getPermissionForParticipant = function (participant) {
            return _self.permissions[participant.id] || PERMISSIONS.NONE;
        };
    }

    PrivateTopic.prototype = Object.create(Topic.prototype);
    PrivateTopic.prototype.permissionChanged = function (participant, newPermission) {
        console.log("Permission changed for participant " + participant.metadata + " to " + permissionStrings[newPermission]);
    };

    function Participant(id, metadata) {
        this.id = id;
        this.metadata = metadata;
    };

    function SubtopicCallbacks() {

        var callBacks = {};

        this.addSubtopicCallback = function (metadata, callBack) {
            var key = getKeyFor(metadata);
            var metadataCallbacks = callBacks[key];
            if (!metadataCallbacks) {
                metadataCallbacks = [];
                callBacks[key] = metadataCallbacks;
            }
            metadataCallbacks.push(callBack);
        };

        this.callBackForTopic = function (subtopic) {
            var key = getKeyFor(subtopic.metadata);
            var metadataCallbacks = callBacks[key];
            var callBack = metadataCallbacks.shift();
            if (metadataCallbacks.length == 0) {
                delete callBacks[key];
            }
            callBack(subtopic);
        };

        var getKeyFor = function (metadata) {
            for (var key in callBacks) {
                if (metadataEqual(metadata, key)) {
                    return key;
                }
            }
            return metadata;
        };

        var metadataEqual = function (m1, m2) {
            if (m1.length != m2.length) {
                return false;
            }
            for (var key in m1) {
                if (m1[key] !== m2[key]) {
                    return false;
                }
            }
            return true;
        };
    };
    window.AssistAED = new window.AED;

} ());
