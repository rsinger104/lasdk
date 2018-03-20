;(function(window) {
    window.init = function(configuration, callback) {
        init(configuration, callback);
    }

    window.reconnect = function(configuration, callback) {
        AssistController.reconnect = true;
        init(configuration, callback);
    }

    function init(configuration, callback) {
        if (configuration.disableLogging) {
            console.log = function() {};
            console.error = function() {};
            console.warn = function() {};
            console.info = function() {};
        }

        i18n.init({
            debug: true, 
            ns: {namespaces:['assistI18n']},
            useCookie: false,
            lng: configuration.locale,
            fallbackLng: 'en',
            resGetPath: '../shared/locales/__ns__.__lng__.json'},
            function(t) {
                
                var config = new Config(configuration);
                
                initialiseMutationObserver(function () {

                    // in IE, we load the CSDK scripts in the iframe first to prompt in the main window for plugin installation.
                    // When we eventually detect the plugin is installed, only then do we proceed with the Assist session
                    var browserInfo = config.getBrowserInfo();
                    if ((browserInfo.ie == true || browserInfo.safari == true) && config.hasDestination()) {

                        // plugins gui needs css to be loaded earlier
                        AssistUtils.loadCSS(window.top.document, AssistUtils.getSdkPath() + "css/assist.css", "ASSIST-CSS");

                        var scripts = [
                            config.getUrl() + "/gateway/csdk-phone.js",
                            config.getUrl() + "/gateway/csdk-common.js"];

                        ; (function loadSequential(i) {
                            if (i < scripts.length) {
                                AssistUtils.loadScripts([scripts[i]], document, function () { loadSequential(++i); });
                            } else { // when done loading scripts, wait for UC to be ready before declaring us done
                                console.log("got scripts, waiting for BHO");
                                waitForUC(function () {

                                    if (UC.checkBrowserCompatibility) {
                                        checkBrowserCompatibility(config, browserInfo, function () {
                                            start(config, callback);
                                        });
                                    } else {
                                        start(config, callback);
                                    }
                                });
                            }
                        })(0);

                    } else {
                        start(config, callback);
                    }

                });
            }
        );
    }
    
    function checkBrowserCompatibility(config, browserInfo, pluginInstalledCallback) {
    
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
                    if (config.hasPluginUpgradePromptExpired()) { // if the prompt expiration has expired, show prompt again
                        displayUpgradeOptionalModal(config, browserInfo, pluginInfo, pluginInstalledCallback);
                    } else {
                        pluginInstalledCallback();
                    }
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
        modalContainer.id = "assist-support-rejected-modal";
        modalContainer.className = "assist-plugin-info";
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
            AssistSDKInterface.supportEnded(); // would like to have called AssistController.endSupport here but it's not ready yet.
                                                // It eventually calls up to this method anyway, which does the cleanup we need.
        };
        
        return modalContainer;
    }
    
    function displayUpgradeRequiredModal(browserInfo, pluginInfo) {
    
        var modal = displayModal("upgradeRequired", "rejectRequired", browserInfo, pluginInfo);

        var modalContainer = modal.container;
        var cancelButton = modal.cancelButton;

        cancelButton.onclick = function() {
            modalContainer.parentNode.removeChild(modalContainer);
            AssistSDKInterface.supportEnded(); // would like to have called AssistController.endSupport here but it's not ready yet.
                                                // It eventually calls up to this method anyway, which does the cleanup we need.
        };
        
        return modalContainer;
    }
    
    function displayUpgradeOptionalModal(config, browserInfo, pluginInfo, onRejectOptionalUpgradeCallback) {
    
        var modal = displayModal("upgradeOptional", "rejectUpgradeOptional", browserInfo, pluginInfo);

        var modalContainer = modal.container;
        var cancelButton = modal.cancelButton;
        var installPluginButton = modal.installPluginButton;
        
        var cancelButtonIsNotNow = true;
        cancelButton.onclick = function() {
            modalContainer.parentNode.removeChild(modalContainer);
            if (cancelButtonIsNotNow) {
                config.setPluginUpgradePromptExpiration(); // set new timeout
            }
            onRejectOptionalUpgradeCallback();
        };
        
        installPluginButton.addEventListener("click", function() {
            cancelButtonIsNotNow = false; // cancel button is now a continue operation after an upgrade
            cancelButton.value = i18n.t("assistI18n:plugin.continueUpgradeOptional");
            installPluginButton.parentNode.removeChild(installPluginButton);
        });
        
        return modalContainer;
    }

    function start(config, callback) {
        callback && callback();
        AssistController.startSupport(config);
    }

    function waitForUC(callback) {
        if (typeof window['UC'] == 'undefined') {
            console.log("UC not ready yet, waiting");
            setTimeout(function() {
                waitForUC(callback);
            }, 200);
        } else {
            callback();
        }
    };
    
    // when this passes we at least know that all the scripts have executed and are loaded, so init is ready to be called
    ;(function waitForApiSet() {
        if (typeof window["AssistSDKInterface"] == 'undefined') {
            setTimeout(waitForApiSet, 200);
        } else {
            AssistSDKInterface.ready();
        }
    })();

    function isInternetExplorer11() {
        var userAgent = window.navigator.userAgent;
        if (userAgent.indexOf("Trident/7.0") > 0) {
            return true;
        }
        return false;
    }

    function initialiseMutationObserver(callback) {
        var mutationObserverPolyFillUrl = AssistUtils.getSdkPath() + "../shared/js/thirdparty/MutationObserver.js";

        if (isInternetExplorer11()) {
            AssistUtils.loadScripts([mutationObserverPolyFillUrl], document, function () {
                MutationObserver = JsMutationObserver;
                callback();
            });
        }
        else {
            callback();
        }
    }

    
})(window);