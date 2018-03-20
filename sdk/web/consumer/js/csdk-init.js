
if (window.opener) {        
    window.open("", window.opener.name);
}

;(function waitForApiSet() {
    if (typeof window["AssistSDKInterface"] == 'undefined') {
        setTimeout(waitForApiSet, 200);
    } else {
        console.log("api found");
        i18n.init({
            debug: true,
            ns: {namespaces:['assistI18n']},
            useCookie: false,
            lng: lang,
            fallbackLng: 'en',
            resGetPath: '../shared/locales/__ns__.__lng__.json'},
            function(t) {
                $("html").i18n();
                AssistSDKInterface.ready();
            });
    }
})();
