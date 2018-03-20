/*
  html2canvas 0.4.1 <http://html2canvas.hertzen.com>
  Copyright (c) 2013 Niklas von Hertzen

  Released under MIT License
*/

(function(window, document, undefined){

"use strict";

var _html2canvas = {},
readCache,
computedCSS,
html2canvas,
offsetX,
images;

    _html2canvas.showBoundingTextRectangles = false;

    _html2canvas.isChrome = (function () {

        try {
            return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        } catch (e) {
            return false;
        }
    })();

    _html2canvas.isSafari = (function () {

        try {
            return /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
        } catch (e) {
            return false;
        }
    })();

    _html2canvas.isIE = (function () {

        try {
            var userAgent = window.navigator.userAgent;

            if ((userAgent.indexOf('MSIE') > -1) || (userAgent.indexOf('Trident/') > -1) || (userAgent.indexOf('Edge') > -1)) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    })();

  _html2canvas.isEdge = (function () {

    try {
      var userAgent = window.navigator.userAgent;

      if (userAgent.indexOf('Edge') > -1) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  })();

_html2canvas.elementReadCache = function() {
    var readCache = new Map();

    function createCacheObject() {
        return {
            computedStyle: {},
            boundingBox: undefined
        }
    }

    function cacheElementStyleAttribute(keyElement, attribute) {
        var cachedObject = readCache.get(keyElement);

        var computedCSS = keyElement.ownerDocument.defaultView.getComputedStyle(keyElement, null);
        var computedCSSAttrValue = computedCSS[attribute];

        if (!cachedObject) {
            cachedObject = createCacheObject();
            readCache.set(keyElement, cachedObject);
        }

        cachedObject.computedStyle[attribute] = computedCSSAttrValue;
    }

    function cacheBoundingClientRect(keyElement) {
        var cachedObject = readCache.get(keyElement);

        var clientRect = keyElement.getBoundingClientRect();

        if (!cachedObject) {
            cachedObject = createCacheObject();
            readCache.set(keyElement, cachedObject);
        }

        cachedObject.boundingBox = {
            bottom: clientRect.bottom,
            height: clientRect.height,
            left: clientRect.left,
            right: clientRect.right,
            top: clientRect.top,
            width: clientRect.width
        };
    }

    return {
        getComputedStyleAttributeForElement: function(element, attribute) {
            var cachedObject = readCache.get(element);

            if (!cachedObject || !cachedObject.computedStyle[attribute]) {
                cacheElementStyleAttribute(element, attribute);
                cachedObject = readCache.get(element);
            }

            return cachedObject.computedStyle[attribute];
        },

       getBoundingClientRectForElement: function(element) {
            var cachedObject = readCache.get(element);

            if (!element.getBoundingClientRect) {
                return undefined;
            }

            if (!cachedObject || !cachedObject.boundingBox) {
                cacheBoundingClientRect(element);
                cachedObject = readCache.get(element);
            }

            return cachedObject.boundingBox;
       },

       clear: function() {
        readCache.clear();
       }
    }
}

  _html2canvas.Util = {};

_html2canvas.Util.log = function(a) {
  if (_html2canvas.logging && window.console && window.console.log) {
    window.console.log(a);
  }
};

_html2canvas.Util.getFileTypeFromSource = function(imageSrc) {
    var strippedQueryUrlEnd = (imageSrc.indexOf("?") === -1) ? imageSrc.length : imageSrc.indexOf("?");
    var queryStrippedSrc = imageSrc.substr(0, strippedQueryUrlEnd);

    var fileName = queryStrippedSrc.substr(queryStrippedSrc.lastIndexOf('/') + 1);

    var indexOfExtension = fileName.lastIndexOf(".") + 1;
    if (indexOfExtension === 0) {
        return undefined;
    }

    var fileType = fileName.substr(indexOfExtension);

    return fileType;
}

_html2canvas.Util.trimText = (function(isNative){
  return function(input) {
    return isNative ? isNative.apply(input) : ((input || '') + '').replace( /^\s+|\s+$/g , '' );
  };
})(String.prototype.trim);

_html2canvas.Util.asFloat = function(v) {
  return parseFloat(v);
};

(function() {
    function getColourInArrayBoxShadowArgArray(boxShadowArgArray) {
      for (var argIndex in boxShadowArgArray) {
        if (boxShadowArgArray[argIndex].indexOf("rgba") > -1) {
            var rgbaColour = boxShadowArgArray.splice(argIndex, argIndex+4).join(" ");
            return rgbaColour;
        }
        else if (boxShadowArgArray[argIndex].indexOf("rgb") > -1) {
            var rgbColour = boxShadowArgArray.splice(argIndex, argIndex+3).join(" ");
            return rgbColour;
        }
      }
      for (var argIndex in boxShadowArgArray) {
        if (isNaN(parseInt(boxShadowArgArray[argIndex]))) {
          var stringColour = boxShadowArgArray.splice(argIndex, 1).join();
          return stringColour;
        }
      }

      return undefined;
    }

    _html2canvas.Util.extractBoxShadowProperties = function(styleString) {
      var style = {};
      if (typeof styleString != "string" || styleString === "") return style;
      if (styleString.toLowerCase() === "none") return style;

      var styleArray = styleString.split(" ");
      style["colour"] = getColourInArrayBoxShadowArgArray(styleArray);

      var insetIndex = styleArray.indexOf("inset");
      if (insetIndex !== -1) {
        style["inset"] = true;
        styleArray.splice(insetIndex, 1);
      }

      style["hshadow"] = styleArray[0];
      style["vshadow"] = styleArray[1];
      style["blur"] = styleArray[2] || "0px";
      style["spread"] = styleArray[3] || "0px";

      for (var styleKey in style) {
          if (styleKey === "colour" || styleKey === "inset") continue;

          var styleValue = style[styleKey];
          var toInt = parseInt(styleValue);
          style[styleKey] = (isNaN(toInt)) ? 0 : toInt;
      }

      return style;
    }
})();

(function() {
  // TODO: support all possible length values
  var TEXT_SHADOW_PROPERTY = /((rgba|rgb)\([^\)]+\)(\s-?\d+px){0,})/g;
  var TEXT_SHADOW_VALUES = /(-?\d+px)|(#.+)|(rgb\(.+\))|(rgba\(.+\))/g;
  _html2canvas.Util.parseTextShadows = function (value) {
    if (!value || value === 'none') {
      return [];
    }

    // find multiple shadow declarations
    var shadows = value.match(TEXT_SHADOW_PROPERTY),
      results = [];
    for (var i = 0; shadows && (i < shadows.length); i++) {
      var s = shadows[i].match(TEXT_SHADOW_VALUES);
      results.push({
        color: s[0],
        offsetX: s[1] ? s[1].replace('px', '') : 0,
        offsetY: s[2] ? s[2].replace('px', '') : 0,
        blur: s[3] ? s[3].replace('px', '') : 0
      });
    }
    return results;
  };
})();


_html2canvas.Util.parseBackgroundImage = function (value) {
    var whitespace = ' \r\n\t',
        method, definition, prefix, prefix_i, block, results = [],
        c, mode = 0, numParen = 0, quote, args;

    var appendResult = function(){
        if(method) {
            if(definition.substr( 0, 1 ) === '"') {
                definition = definition.substr( 1, definition.length - 2 );
            }
            if(definition) {
                args.push(definition);
            }
            if(method.substr( 0, 1 ) === '-' &&
                    (prefix_i = method.indexOf( '-', 1 ) + 1) > 0) {
                prefix = method.substr( 0, prefix_i);
                method = method.substr( prefix_i );
            }
            results.push({
                prefix: prefix,
                method: method.toLowerCase(),
                value: block,
                args: args
            });
        }
        args = []; //for some odd reason, setting .length = 0 didn't work in safari
        method =
            prefix =
            definition =
            block = '';
    };

    appendResult();
    for(var i = 0, ii = value.length; i<ii; i++) {
        c = value[i];
        if(mode === 0 && whitespace.indexOf( c ) > -1){
            continue;
        }
        switch(c) {
            case '"':
            case '\'':
                if(!quote) {
                    quote = c;
                }
                else if(quote === c) {
                    quote = null;
                }
                break;

            case '(':
                if(quote) { break; }
                else if(mode === 0) {
                    mode = 1;
                    block += c;
                    continue;
                } else {
                    numParen++;
                }
                break;

            case ')':
                if(quote) { break; }
                else if(mode === 1) {
                    if(numParen === 0) {
                        mode = 0;
                        block += c;
                        appendResult();
                        continue;
                    } else {
                        numParen--;
                    }
                }
                break;

            case ',':
                if(quote) { break; }
                else if(mode === 0) {
                    appendResult();
                    continue;
                }
                else if (mode === 1) {
                    if(numParen === 0 && !method.match(/^url$/i)) {
                        args.push(definition);
                        definition = '';
                        block += c;
                        continue;
                    }
                }
                break;
        }

        block += c;
        if(mode === 0) { method += c; }
        else { definition += c; }
    }
    appendResult();

    return results;
};

_html2canvas.Util.Bounds = function(node) {
    var clientRect = readCache.getBoundingClientRectForElement(node);

    if (!clientRect) {
        return {};
    }

    var width = node.offsetWidth || clientRect.width;

    return {
        top: clientRect.top,
        bottom: clientRect.bottom || (clientRect.top + clientRect.height),
        right: clientRect.left + width,
        left: clientRect.left,
        width:  width,
        height: node.offsetHeight || clientRect.height
    };
};

function toPX(element, attribute, value ) {
    var rsLeft = element.runtimeStyle && element.runtimeStyle[attribute],
        left,
        style = element.style;

    // Check if we are not dealing with pixels, (Opera has issues with this)
    // Ported from jQuery css.js
    // From the awesome hack by Dean Edwards
    // http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

    // If we're not dealing with a regular pixel number
    // but a number that has a weird ending, we need to convert it to pixels

    if ( !/^-?[0-9]+\.?[0-9]*(?:px)?$/i.test( value ) && /^-?\d/.test(value) ) {
        // Remember the original values
        left = style.left;

        // Put in the new values to get a computed value out
        if (rsLeft) {
            element.runtimeStyle.left = element.currentStyle.left;
        }
        style.left = attribute === "fontSize" ? "1em" : (value || 0);
        value = style.pixelLeft + "px";

        // Revert the changed values
        style.left = left;
        if (rsLeft) {
            element.runtimeStyle.left = rsLeft;
        }
    }

    if (!/^(thin|medium|thick)$/i.test(value)) {
        return Math.round(parseFloat(value)) + "px";
    }

    return value;
}

function asInt(val) {
    return parseInt(val, 10);
}

_html2canvas.Util.BackgroundParser = function() {
    function parseBackgroundValue(backgroundValue, index) {
        backgroundValue = (backgroundValue || '').split(',');
        backgroundValue = backgroundValue[index || 0] || backgroundValue[0] || 'auto';
        backgroundValue = _html2canvas.Util.trimText(backgroundValue).split(' ');

        return backgroundValue;
    }

    function positionStringToPercentage(positionString) {
        switch (positionString) {
            case "top": return "0%";
            case "left": return "0%";
            case "center": return "50%";
            case "bottom": return "100%";
            case "right": return "100%";
            default: return positionString;
        }
    }

    return {
        parseBackgroundPosition: function(value, element, attribute, index) {
             value = parseBackgroundValue(value, index);

             if(value[1] === undefined) {
                 value[0] = readCache.getComputedStyleAttributeForElement(element, "background-position-x");
                 value[1] = readCache.getComputedStyleAttributeForElement(element, "background-position-y");
             }

             value[0] = positionStringToPercentage(value[0]);
             value[1] = positionStringToPercentage(value[1]);

             value[0] = (value[0].indexOf( "%" ) === -1) ? toPX(element, attribute + "X", value[0]) : value[0];
             value[1] = (value[1].indexOf("%") === -1) ? toPX(element, attribute + "Y", value[1]) : value[1];

             return value;
        },
        parseBackgroundSize: function(value, element, attribute, index) {
            value = parseBackgroundValue(value, index);

            if (!value[0] || value[0].match(/cover|contain|auto/)) {
                return value;
            }

            if(value[1] === undefined) {
                value[1] = 'auto';
            }

            value[0] = (value[0].indexOf( "%" ) === -1) ? toPX(element, attribute + "X", value[0]) : value[0];
            value[1] = (value[1].indexOf("%") === -1) ? toPX(element, attribute + "Y", value[1]) : value[1];

            return value;
        }
    }
}();

_html2canvas.Util.getCSS = function (element, attribute, index) {
    var value = readCache.getComputedStyleAttributeForElement(element, attribute);

    if (attribute === "backgroundSize") {
        return _html2canvas.Util.BackgroundParser.parseBackgroundSize(value, element, attribute, index);
    }
    else if (attribute === "backgroundPosition") {
        return _html2canvas.Util.BackgroundParser.parseBackgroundPosition(value, element, attribute, index);
    }
    else if (/border(Top|Bottom)(Left|Right)Radius/.test(attribute)) {
      var arr = value.split(" ");
      if (arr.length <= 1) {
          arr[1] = arr[0];
      }
      return arr.map(asInt);
    }

  if ((attribute === 'fontVariant' ) && !(/^(normal|small-caps)$/.test(value))) {
      
      value = 'normal';
  }
  return value;
};

_html2canvas.Util.resizeBounds = function( current_width, current_height, target_width, target_height, stretch_mode ){
  var target_ratio = target_width / target_height,
    current_ratio = current_width / current_height,
    output_width, output_height;

  if(!stretch_mode || stretch_mode === 'auto') {
    output_width = target_width;
    output_height = target_height;
  } else if(target_ratio < current_ratio ^ stretch_mode === 'contain') {
    output_height = target_height;
    output_width = target_height * current_ratio;
  } else {
    output_width = target_width;
    output_height = target_width / current_ratio;
  }

  return {
    width: output_width,
    height: output_height
  };
};

function backgroundBoundsFactory( prop, el, bounds, image, imageIndex, backgroundSize ) {
    var bgposition =  _html2canvas.Util.getCSS( el, prop, imageIndex ) ,
    topPos,
    left,
    percentage,
    val;

    if (bgposition.length === 1){
      val = bgposition[0];

      bgposition = [];

      bgposition[0] = val;
      bgposition[1] = val;
    }

    if (bgposition[0].toString().indexOf("%") !== -1){
      percentage = (parseFloat(bgposition[0])/100);
      left = bounds.width * percentage;
      if(prop !== 'backgroundSize') {
        left -= (backgroundSize || image).width*percentage;
      }
    } else {
      if(prop === 'backgroundSize') {
        if(bgposition[0] === 'auto') {
          left = image.width;
        } else {
          if (/contain|cover/.test(bgposition[0])) {
            var resized = _html2canvas.Util.resizeBounds(image.width, image.height, bounds.width, bounds.height, bgposition[0]);
            left = resized.width;
            topPos = resized.height;
          } else {
            left = parseInt(bgposition[0], 10);
          }
        }
      } else {
        left = parseInt( bgposition[0], 10);
      }
    }


    if(bgposition[1] === 'auto') {
      topPos = left / image.width * image.height;
    } else if (bgposition[1].toString().indexOf("%") !== -1){
      percentage = (parseFloat(bgposition[1])/100);
      topPos =  bounds.height * percentage;
      if(prop !== 'backgroundSize') {
        topPos -= (backgroundSize || image).height * percentage;
      }

    } else {
      topPos = parseInt(bgposition[1],10) || topPos;
    }

    return [left, topPos];
}

_html2canvas.Util.BackgroundPosition = function( el, bounds, image, imageIndex, backgroundSize ) {
    var result = backgroundBoundsFactory( 'backgroundPosition', el, bounds, image, imageIndex, backgroundSize );
    return { left: (isNaN(result[0])) ? 0 : result[0], top: (isNaN(result[1])) ? 0 : result[1] };
};

_html2canvas.Util.BackgroundSize = function( el, bounds, image, imageIndex ) {
    var result = backgroundBoundsFactory( 'backgroundSize', el, bounds, image, imageIndex );
    return { width: (isNaN(result[0])) ? 0 : result[0], height: (isNaN(result[1])) ? 0 : result[1] };
};

_html2canvas.Util.Extend = function (options, defaults) {
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      defaults[key] = options[key];
    }
  }
  return defaults;
};


/*
 * Derived from jQuery.contents()
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */
_html2canvas.Util.Children = function( elem ) {
    var children;

    try {
        if (elem.nodeName && elem.nodeName.toUpperCase() === "IFRAME") {
            var iframeDocument = elem.contentDocument || elem.contentWindow.document;
        }

        if (iframeDocument) {
            return [iframeDocument];
        }

        children = (function(array) {
          var ret = [];
          if (array !== null) {
            (function(first, second ) {
              var i = first.length,
              j = 0;

              if (typeof second.length === "number") {
                for (var l = second.length; j < l; j++) {
                  first[i++] = second[j];
                }
              } else {
                while (second[j] !== undefined) {
                  first[i++] = second[j++];
                }
              }

              first.length = i;

              return first;
            })(ret, array);
          }
          return ret;
        })(elem.childNodes);

  } catch (ex) {
    _html2canvas.Util.log("html2canvas.Util.Children failed with exception: " + ex.message);
    children = [];
  }
  return children;
};

_html2canvas.Util.isTransparent = function(backgroundColor) {
  return (backgroundColor === "transparent" || backgroundColor === "rgba(0, 0, 0, 0)");
};
_html2canvas.Util.Font = (function () {

  var fontData = {};

  return function(font, fontSize, doc) {
    if (fontData[font + "-" + fontSize] !== undefined) {
      return fontData[font + "-" + fontSize];
    }

    var container = doc.createElement('div'),
    img = doc.createElement('img'),
    span = doc.createElement('span'),
    sampleText = 'Hidden Text',
    baseline,
    middle,
    metricsObj;

    container.style.visibility = "hidden";
    container.style.fontFamily = font;
    container.style.fontSize = fontSize;
    container.style.margin = 0;
    container.style.padding = 0;

    doc.body.appendChild(container);

    // http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever (handtinywhite.gif)
    img.src = "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";
    img.width = 1;
    img.height = 1;

    img.style.margin = 0;
    img.style.padding = 0;
    img.style.verticalAlign = "baseline";

    span.style.fontFamily = font;
    span.style.fontSize = fontSize;
    span.style.margin = 0;
    span.style.padding = 0;

    span.appendChild(doc.createTextNode(sampleText));
    container.appendChild(span);
    container.appendChild(img);
    baseline = (img.offsetTop - span.offsetTop) + 1;

    container.removeChild(span);
    container.appendChild(doc.createTextNode(sampleText));

    container.style.lineHeight = "normal";
    img.style.verticalAlign = "super";

    middle = (img.offsetTop-container.offsetTop) + 1;
    metricsObj = {
      baseline: baseline,
      lineWidth: 1,
      middle: middle
    };

    fontData[font + "-" + fontSize] = metricsObj;

    doc.body.removeChild(container);

    return metricsObj;
  };
})();

(function(){
  var Util = _html2canvas.Util,
    Generate = {};

  _html2canvas.Generate = Generate;

  var reGradients = [
  /^(linear-gradient)\((0|[0-9.]+[a-z]{3,4}|[a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/,
  /^(-webkit-linear-gradient)\((0|[0-9.]+[a-z]{3,4}|[a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/,
  /^(-o-linear-gradient)\(([a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/,
  /^(-webkit-gradient)\((linear|radial),\s((?:\d{1,3}%?)\s(?:\d{1,3}%?),\s(?:\d{1,3}%?)\s(?:\d{1,3}%?))([\w\d\.\s,%\(\)\-]+)\)$/,
  /^(-moz-linear-gradient)\(([0-9.]+[a-z]{3,4}|(?:\d{1,3}%?)\s(?:\d{1,3}%?))([\w\d\.\s,%\(\)]+)\)$/,
  /^(-webkit-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s([a-z\-]+)([\w\d\.\s,%\(\)]+)\)$/,
  /^(-moz-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s?([a-z\-]*)([\w\d\.\s,%\(\)]+)\)$/,
  /^(-o-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s([a-z\-]+)([\w\d\.\s,%\(\)]+)\)$/
  ];

 var isAngleString = (function() {
    var angleArgStrings = ["deg", "grad", "rad", "turn", "top", "right", "bottom", "right"];

    return function(angleArgument) {
        if (angleArgument === "0") return true; //Edge will give just give us "0" for an angle of 0

        var isAngleStr = angleArgStrings.some(function(angleArgString) {
            if (angleArgument.indexOf(angleArgString) > -1) {
                return true;
            }

            return false;
        });

        return isAngleStr;
    }
 })();

    function GradientCoordinatesCalculator(gradientProperty, shapeDimensions) {
        var x0, y0, x1, y1;
        var ANGLE_TYPES = {
            GRAD: "grad",
            TURN: "turn",
            DEG: "deg",
            RAD: "rad"
        };

        function createCoordsObject(x0, y0, x1, y1) {
            return {
                x0: x0 || 0,
                y0: y0 || 0,
                x1: x1 || 0,
                y1: y1 || 0
            };
        }

        return {
            calculateUsingAngle: function(angleValue, angleUnits) {
                var GRAD_MULTIPLIER= 0.015708, TURN_MULTIPLIER =  6.28319, DEG_MULTIPLIER = (Math.PI / 180);

                var radians;
                switch (angleUnits) {
                    case ANGLE_TYPES.GRAD:
                        radians = parseFloat(angleValue) * GRAD_MULTIPLIER;
                        break;
                    case ANGLE_TYPES.TURN:
                        radians = parseFloat(angleValue) * TURN_MULTIPLIER;
                        break;
                    case ANGLE_TYPES.DEG:
                        radians = parseFloat(angleValue) * DEG_MULTIPLIER;
                        break;
                    case ANGLE_TYPES.RAD:
                        radians = angleValue;
                }

                if (gradientProperty === "linear-gradient") {
                  var y0 = (Math.cos(radians) + 1) / 2;
                  var y1 = 1 - y0;
                  var x0 = (-Math.sin(radians) + 1) / 2;
                  var x1 = 1 - x0;
                }
                else {
                  var y1 = (Math.cos(radians) + 1) / 2;
                  var y0 = 1 - y1;
                  var x1 = (-Math.sin(radians) + 1) / 2;
                  var x0 = 1 - x1;
                }

                return createCoordsObject(shapeDimensions.width * x0, shapeDimensions.height * y0,
                                          shapeDimensions.width * x1, shapeDimensions.height * y1);
            },
            calculateUsingDirection: function(directionTokens) {
                var isTo = false;
                for (var directionTokenIdx = 0; directionTokenIdx < directionTokens.length; directionTokenIdx++) {
                    var directionToken = directionTokens[directionTokenIdx];

                    if (directionToken === "to") {
                        isTo = true;
                    }
                    else if (directionToken === "top") {
                        y0 = (isTo) ? shapeDimensions.height : 0;
                        y1 = (isTo) ? 0 : shapeDimensions.height;
                    }
                    else if (directionToken === "right") {
                        x0 = (isTo) ? 0 : shapeDimensions.width;
                        x1 = (isTo) ? shapeDimensions.width : 0;
                    }
                    else if (directionToken === "bottom") {
                        y0 = (isTo) ? 0 : shapeDimensions.height;
                        y1 = (isTo) ? shapeDimensions.height : 0;
                    }
                    else if (directionToken === "left") {
                        x0 = (isTo) ? shapeDimensions.width : 0;
                        x1 = (isTo) ? 0 : shapeDimensions.width;
                    }
                }

                if(x0 === null && x1 === null){ // center
                    x0 = x1 = shapeDimensions.width / 2;
                }
                if(y0 === null && y1 === null){ // center
                    y0 = y1 = shapeDimensions.height / 2;
                }

                return createCoordsObject(x0, y0, x1, y1);
            },
            calculateUsingPercentages: function(fromPercentage, toPercentage) {
                x0 = (fromPercentage * shapeDimensions.width) / 100;
                y0 = (toPercentage * shapeDimensions.height) / 100;
                x1 = shapeDimensions.width - x0;
                y1 = shapeDimensions.height - y0;

                return createCoordsObject(x0, y0, x1, y1);
            }
        }
     }

  /*
 * TODO: Add IE10 vendor prefix (-ms) support
 * TODO: Add W3C gradient (linear-gradient) support
 * TODO: Add old Webkit -webkit-gradient(radial, ...) support
 * TODO: Maybe some RegExp optimizations are possible ;o)
 */
  Generate.parseGradient = function(css, bounds) {
    var gradient, i, len = reGradients.length, m1, stop, m2, m2Len, step, m3, tl,tr,br,bl;

    for(i = 0; i < len; i+=1){
      m1 = css.match(reGradients[i]);
      if(m1) {
        break;
      }
    }

    if (!m1) {
        return gradient;
    }

    var cssGradientFunctionType = m1[1];
    var gradientCoordinatesCalculator = new GradientCoordinatesCalculator(cssGradientFunctionType, bounds);

    switch(cssGradientFunctionType) {
        case 'linear-gradient':
        case '-webkit-linear-gradient':
        case '-o-linear-gradient':
            var firstGradientFunctionArgument = m1[2];

            if (!isAngleString(firstGradientFunctionArgument)) {
                var colours = m1.splice(2);
                m1.push("to bottom");
                m1 = m1.concat(colours.join(""));
            }

            gradient = {
                type: 'linear',
                colorStops: []
            };

            var angleRegExpMatch = m1[2];
            var gradientAngleMatch = angleRegExpMatch.match(/0|([0-9.]+)([a-z]{3,4})/);

            if (gradientAngleMatch) {
                var angleValue, angleUnits;
                if (gradientAngleMatch[0] === "0") {
                    angleValue = gradientAngleMatch[0], angleUnits = "deg";
                }
                else {
                    angleValue = gradientAngleMatch[1], angleUnits = gradientAngleMatch[2];
                }

                _html2canvas.Util.Extend(gradientCoordinatesCalculator.calculateUsingAngle(angleValue, angleUnits), gradient);
            }
            else {
                var gradientDirectionTokens = angleRegExpMatch.split(" ");
                _html2canvas.Util.Extend(gradientCoordinatesCalculator.calculateUsingDirection(gradientDirectionTokens), gradient);
            }

            // get colors and stops
            m2 = m1[3].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}(?:%|px))?)+/g);
            if(m2){
                m2Len = m2.length;
                step = 1 / Math.max(m2Len - 1, 1);
                for(i = 0; i < m2Len; i+=1){
                      m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%|px)?/);
                      if(m3[2]){
                        stop = parseFloat(m3[2]);
                        if(m3[3] === '%'){
                          stop /= 100;
                        } else { // px - stupid opera
                          stop /= bounds.width;
                        }
                      } else {
                        stop = i * step;
                      }
                      gradient.colorStops.push({
                        color: m3[1],
                        stop: stop
                      });
                }
            }
            break;

        case '-moz-linear-gradient':

          gradient = {
            type: 'linear',
            colorStops: []
          };

          var angleRegExpMatch = m1[2];
          var percentageRegExpMatch = angleRegExpMatch.match(/(\d{1,3})%?\s(\d{1,3})%?/);
          var gradientAngleMatch = angleRegExpMatch.match(/([0-9.]+)([a-z]{3,4})/);

          if (percentageRegExpMatch) {
            var fromPercentage = percentageRegExpMatch[1], toPercentage = percentageRegExpMatch[2];
            _html2canvas.Util.Extend(gradientCoordinatesCalculator.calculateUsingPercentages(fromPercentage, toPercentage), gradient);
          }
          else if (gradientAngleMatch) {
            var angleValue = gradientAngleMatch[1], angleUnits = gradientAngleMatch[2];
            _html2canvas.Util.Extend(gradientCoordinatesCalculator.calculateUsingAngle(angleValue, angleUnits), gradient);
          }
          else {
            _html2canvas.Util.Extend({x0: 0, y0: 0, x1: 0, y1: 0}, gradient);
          }

          // get colors and stops
          m2 = m1[3].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}%)?)+/g);
          if(m2){
            m2Len = m2.length;
            step = 1 / Math.max(m2Len - 1, 1);
            for(i = 0; i < m2Len; i+=1){
              m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%)?/);
              if(m3[2]){
                stop = parseFloat(m3[2]);
                if(m3[3]){ // percentage
                  stop /= 100;
                }
              } else {
                stop = i * step;
              }
              gradient.colorStops.push({
                color: m3[1],
                stop: stop
              });
            }
          }
          break;

        case '-webkit-gradient':

          gradient = {
            type: m1[2] === 'radial' ? 'circle' : m1[2], // TODO: Add radial gradient support for older mozilla definitions
            x0: 0,
            y0: 0,
            x1: 0,
            y1: 0,
            colorStops: []
          };

          // get coordinates
          m2 = m1[3].match(/(\d{1,3})%?\s(\d{1,3})%?,\s(\d{1,3})%?\s(\d{1,3})%?/);
          if(m2){
            gradient.x0 = (m2[1] * bounds.width) / 100;
            gradient.y0 = (m2[2] * bounds.height) / 100;
            gradient.x1 = (m2[3] * bounds.width) / 100;
            gradient.y1 = (m2[4] * bounds.height) / 100;
          }

          // get colors and stops
          m2 = m1[4].match(/((?:from|to|color-stop)\((?:[0-9\.]+,\s)?(?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)\))+/g);
          if(m2){
            m2Len = m2.length;
            for(i = 0; i < m2Len; i+=1){
              m3 = m2[i].match(/(from|to|color-stop)\(([0-9\.]+)?(?:,\s)?((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\)/);
              stop = parseFloat(m3[2]);
              if(m3[1] === 'from') {
                stop = 0.0;
              }
              if(m3[1] === 'to') {
                stop = 1.0;
              }
              gradient.colorStops.push({
                color: m3[3],
                stop: stop
              });
            }
          }
          break;

        case '-webkit-radial-gradient':
        case '-moz-radial-gradient':
        case '-o-radial-gradient':

          gradient = {
            type: 'circle',
            x0: 0,
            y0: 0,
            x1: bounds.width,
            y1: bounds.height,
            cx: 0,
            cy: 0,
            rx: 0,
            ry: 0,
            colorStops: []
          };

          // center
          m2 = m1[2].match(/(\d{1,3})%?\s(\d{1,3})%?/);
          if(m2){
            gradient.cx = (m2[1] * bounds.width) / 100;
            gradient.cy = (m2[2] * bounds.height) / 100;
          }

          // size
          m2 = m1[3].match(/\w+/);
          m3 = m1[4].match(/[a-z\-]*/);
          if(m2 && m3){
            switch(m3[0]){
              case 'farthest-corner':
              case 'cover': // is equivalent to farthest-corner
              case '': // mozilla removes "cover" from definition :(
                tl = Math.sqrt(Math.pow(gradient.cx, 2) + Math.pow(gradient.cy, 2));
                tr = Math.sqrt(Math.pow(gradient.cx, 2) + Math.pow(gradient.y1 - gradient.cy, 2));
                br = Math.sqrt(Math.pow(gradient.x1 - gradient.cx, 2) + Math.pow(gradient.y1 - gradient.cy, 2));
                bl = Math.sqrt(Math.pow(gradient.x1 - gradient.cx, 2) + Math.pow(gradient.cy, 2));
                gradient.rx = gradient.ry = Math.max(tl, tr, br, bl);
                break;
              case 'closest-corner':
                tl = Math.sqrt(Math.pow(gradient.cx, 2) + Math.pow(gradient.cy, 2));
                tr = Math.sqrt(Math.pow(gradient.cx, 2) + Math.pow(gradient.y1 - gradient.cy, 2));
                br = Math.sqrt(Math.pow(gradient.x1 - gradient.cx, 2) + Math.pow(gradient.y1 - gradient.cy, 2));
                bl = Math.sqrt(Math.pow(gradient.x1 - gradient.cx, 2) + Math.pow(gradient.cy, 2));
                gradient.rx = gradient.ry = Math.min(tl, tr, br, bl);
                break;
              case 'farthest-side':
                if(m2[0] === 'circle'){
                  gradient.rx = gradient.ry = Math.max(
                    gradient.cx,
                    gradient.cy,
                    gradient.x1 - gradient.cx,
                    gradient.y1 - gradient.cy
                    );
                } else { // ellipse

                  gradient.type = m2[0];

                  gradient.rx = Math.max(
                    gradient.cx,
                    gradient.x1 - gradient.cx
                    );
                  gradient.ry = Math.max(
                    gradient.cy,
                    gradient.y1 - gradient.cy
                    );
                }
                break;
              case 'closest-side':
              case 'contain': // is equivalent to closest-side
                if(m2[0] === 'circle'){
                  gradient.rx = gradient.ry = Math.min(
                    gradient.cx,
                    gradient.cy,
                    gradient.x1 - gradient.cx,
                    gradient.y1 - gradient.cy
                    );
                } else { // ellipse

                  gradient.type = m2[0];

                  gradient.rx = Math.min(
                    gradient.cx,
                    gradient.x1 - gradient.cx
                    );
                  gradient.ry = Math.min(
                    gradient.cy,
                    gradient.y1 - gradient.cy
                    );
                }
                break;

            // TODO: add support for "30px 40px" sizes (webkit only)
            }
          }

          // color stops
          m2 = m1[5].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}(?:%|px))?)+/g);
          if(m2){
            m2Len = m2.length;
            step = 1 / Math.max(m2Len - 1, 1);
            for(i = 0; i < m2Len; i+=1){
              m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%|px)?/);
              if(m3[2]){
                stop = parseFloat(m3[2]);
                if(m3[3] === '%'){
                  stop /= 100;
                } else { // px - stupid opera
                  stop /= bounds.width;
                }
              } else {
                stop = i * step;
              }
              gradient.colorStops.push({
                color: m3[1],
                stop: stop
              });
            }
          }
          break;
    }


    return gradient;
  };

  function addScrollStops(grad) {
    return function(colorStop) {
      try {
        grad.addColorStop(colorStop.stop, colorStop.color);
      }
      catch(e) {
        Util.log(['failed to add color stop: ', e, '; tried to add: ', colorStop]);
      }
    };
  }

  Generate.Gradient = function(src, bounds) {
    if(bounds.width === 0 || bounds.height === 0) {
      return;
    }

    var canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d'),
    gradient, grad;

    canvas.width = bounds.width;
    canvas.height = bounds.height;

    // TODO: add support for multi defined background gradients
    gradient = _html2canvas.Generate.parseGradient(src, bounds);

    if(gradient) {
      switch(gradient.type) {
        case 'linear':
          grad = ctx.createLinearGradient(gradient.x0, gradient.y0, gradient.x1, gradient.y1);
          gradient.colorStops.forEach(addScrollStops(grad));
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, bounds.width, bounds.height);
          break;

        case 'circle':
          grad = ctx.createRadialGradient(gradient.cx, gradient.cy, 0, gradient.cx, gradient.cy, gradient.rx);
          gradient.colorStops.forEach(addScrollStops(grad));
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, bounds.width, bounds.height);
          break;

        case 'ellipse':
          var canvasRadial = document.createElement('canvas'),
            ctxRadial = canvasRadial.getContext('2d'),
            ri = Math.max(gradient.rx, gradient.ry),
            di = ri * 2;

          canvasRadial.width = canvasRadial.height = di;

          grad = ctxRadial.createRadialGradient(gradient.rx, gradient.ry, 0, gradient.rx, gradient.ry, ri);
          gradient.colorStops.forEach(addScrollStops(grad));

          ctxRadial.fillStyle = grad;
          ctxRadial.fillRect(0, 0, di, di);

          ctx.fillStyle = gradient.colorStops[gradient.colorStops.length - 1].color;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(canvasRadial, gradient.cx - gradient.rx, gradient.cy - gradient.ry, 2 * gradient.rx, 2 * gradient.ry);
          break;
      }
    }

    return canvas;
  };

  Generate.ListAlpha = function(number) {
    var tmp = "",
    modulus;

    do {
      modulus = number % 26;
      tmp = String.fromCharCode((modulus) + 64) + tmp;
      number = number / 26;
    }while((number*26) > 26);

    return tmp;
  };

  Generate.ListRoman = function(number) {
    var romanArray = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"],
    decimal = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1],
    roman = "",
    v,
    len = romanArray.length;

    if (number <= 0 || number >= 4000) {
      return number;
    }

    for (v=0; v < len; v+=1) {
      while (number >= decimal[v]) {
        number -= decimal[v];
        roman += romanArray[v];
      }
    }

    return roman;
  };

})();

// Return the color property of the assist-show-agent-console css class.
function getNoShowBgColor(document) {
    var element = document.createElement("div");
    element.style.display = "none";
    element.className = "assist-no-show-agent-console";
    document.body.appendChild(element);
    var color = _html2canvas.Util.getCSS(element, "color");
    document.body.removeChild(element);
    return color;
}

function h2cRenderContext(width, height) {
  var storage = [];
  return {
    storage: storage,
    width: width,
    height: height,
    clip: function() {
      storage.push({
        type: "function",
        name: "clip",
        'arguments': arguments
      });
    },
    translate: function() {
      storage.push({
        type: "function",
        name: "translate",
        'arguments': arguments
      });
    },
    fill: function() {
      storage.push({
        type: "function",
        name: "fill",
        'arguments': arguments
      });
    },
    save: function() {
      storage.push({
        type: "function",
        name: "save",
        'arguments': arguments
      });
    },
    restore: function() {
      storage.push({
        type: "function",
        name: "restore",
        'arguments': arguments
      });
    },
    beginPath: function () {
      storage.push({
        type: "function",
        name: "beginPath",
        'arguments': arguments
      });
    },
    arc: function () {
      storage.push({
        type: "function",
        name: "arc",
        'arguments': arguments
      });
    },
    stroke: function () {
      storage.push({
        type: "function",
        name: "stroke",
        'arguments': arguments
      });
    },
    closePath: function () {
      storage.push({
        type: "function",
        name: "closePath",
        'arguments': arguments
      });
    },
    fillRect: function () {
      storage.push({
        type: "function",
        name: "fillRect",
        'arguments': arguments
      });
    },
    strokeRect: function () {
      storage.push({
        type: "function",
        name: "strokeRect",
        'arguments': arguments
      });
    },    
    createPattern: function() {
      storage.push({
        type: "function",
        name: "createPattern",
        'arguments': arguments
      });
    },
    drawShape: function() {

      var shape = [];

      storage.push({
        type: "function",
        name: "drawShape",
        'arguments': shape
      });

      return {
        moveTo: function() {
          shape.push({
            name: "moveTo",
            'arguments': arguments
          });
        },
        lineTo: function() {
          shape.push({
            name: "lineTo",
            'arguments': arguments
          });
        },
        arcTo: function() {
          shape.push({
            name: "arcTo",
            'arguments': arguments
          });
        },
        bezierCurveTo: function() {
          shape.push({
            name: "bezierCurveTo",
            'arguments': arguments
          });
        },
        quadraticCurveTo: function() {
          shape.push({
            name: "quadraticCurveTo",
            'arguments': arguments
          });
        }
      };

    },
    drawImage: function () {
      storage.push({
        type: "function",
        name: "drawImage",
        'arguments': arguments
      });
    },
    rect: function() {
      storage.push({
       type: "function",
       name: "rect",
         'arguments': arguments
       });
    },
    fillText: function () {
      storage.push({
        type: "function",
        name: "fillText",
        'arguments': arguments
      });
    },
    setVariable: function (variable, value) {
      storage.push({
        type: "variable",
        name: variable,
        'arguments': value
      });
      return value;
    }
  };
}
_html2canvas.Parse = function (images, options) {

  var element = (( options.elements === undefined ) ? window.document.body : options.elements[0]), // select body by default
  numDraws = 0,
  doc = element.ownerDocument,
  Util = _html2canvas.Util,
  support = Util.Support(options, doc),
  ignoreElementsRegExp = new RegExp("(" + options.ignoreElements + ")"),
  body = doc.body,
  getCSS = Util.getCSS,
  listItemPaddingMultiplier = .75,
  pseudoHide = "___html2canvas___pseudoelement",
  hidePseudoElements = doc.createElement('style'),
  iframeImages = new Map(),
  elementContexts = new Map();

  hidePseudoElements.innerHTML = '.' + pseudoHide + '-before:before { content: "" !important; display: none !important; }' +
  '.' + pseudoHide + '-after:after { content: "" !important; display: none !important; }';

  body.appendChild(hidePseudoElements);

  images = images || {};

  function copyBoxModel(destination, source) {
    if (_html2canvas.isSafari) {
      destination.style.paddingLeft = '1px';
      destination.style.paddingTop = '1px';

    } else {
      destination.style.paddingBottom = source.paddingBottom;
      destination.style.paddingLeft = source.paddingLeft;
      destination.style.paddingRight = source.paddingRight;
      destination.style.paddingTop = source.paddingTop;
    }
    destination.style.marginBottom = source.marginBottom;
    destination.style.marginLeft = source.marginLeft;
    destination.style.marginRight = source.marginRight;
    destination.style.marginTop = source.marginTop;
    destination.style.borderBottomWidth = source.borderBottomWidth;
    destination.style.borderLeftWidth = source.borderLeftWidth;
    destination.style.borderRightWidth = source.borderRightWidth;
    destination.style.borderTopWidth = source.borderTopWidth;
  }

  function copyBoxModelAndStyle(destination, source) {
    copyBoxModel(destination, source);
    destination.style.borderBottomStyle = source.borderBottomStyle;
    destination.style.borderLeftStyle = source.borderLeftStyle;
    destination.style.borderRightStyle = source.borderRightStyle;
    destination.style.borderTopStyle = source.borderTopStyle;
    destination.style.borderBottomColor = source.borderBottomColor;
    destination.style.borderLeftColor = source.borderLeftColor;
    destination.style.borderRightColor = source.borderRightColor;
    destination.style.borderTopColor = source.borderTopColor;
    destination.style.backgroundColor = source.backgroundColor;
  }

  function documentWidth () {
    return Math.max(
      Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth),
      Math.max(doc.body.offsetWidth, doc.documentElement.offsetWidth),
      Math.max(doc.body.clientWidth, doc.documentElement.clientWidth)
      );
  }

  function documentHeight () {
    return Math.max(
      Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight),
      Math.max(doc.body.offsetHeight, doc.documentElement.offsetHeight),
      Math.max(doc.body.clientHeight, doc.documentElement.clientHeight)
      );
  }

  function getCSSInt(element, attribute) {
    var val = parseInt(getCSS(element, attribute), 10);
    return (isNaN(val)) ? 0 : val; // borders in old IE are throwing 'medium' for demo.html
  }
  
  function getCSSFloat(element, attribute) {
    var val = parseFloat(getCSS(element, attribute));
    return (isNaN(val)) ? 0.0 : val;
  }

  function renderRect (ctx, x, y, w, h, bgcolor) {
    if (bgcolor !== "transparent"){
      ctx.setVariable("fillStyle", bgcolor);
      ctx.fillRect(x, y, w, h);
      numDraws+=1;
    }
  }

  function capitalize(m, p1, p2) {
    if (m.length > 0) {
      return p1 + p2.toUpperCase();
    }
  }

  function textTransform (text, transform) {
    switch(transform){
      case "lowercase":
        return text.toLowerCase();
      case "capitalize":
        return text.replace( /(^|\s|:|-|\(|\))([a-z])/g, capitalize);
      case "uppercase":
        return text.toUpperCase();
      default:
        return text;
    }
  }

  function noLetterSpacing(letter_spacing) {
    return (/^(normal|none|0px)$/.test(letter_spacing));
  }

  /**
   * Modified to enable vertical clipping portions of text by providing clipTop and clipSize params
   */
  function drawText(currentText, textBounds, clip, ctx) {
    if (currentText !== null && Util.trimText(currentText).length > 0) {
        if (isClipDefined(clip)) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(textBounds.left, textBounds.top+clip.clipTop, textBounds.width, clip.clipSize);
          ctx.clip();
          ctx.fillText(currentText, textBounds.left, textBounds.bottom);
          ctx.restore();
        }
        else {
          ctx.fillText(currentText, textBounds.left, textBounds.bottom);
        }
    }

    numDraws+=1;

    function isClipDefined(clip) {
      return (clip !== undefined && !isNaN(clip.clipTop) && !isNaN(clip.clipSize) );
    }
  }

  function setTextVariables(ctx, el, text_decoration, color) {
    var align = false,
    bold = getCSS(el, "fontWeight"),
    family = getCSS(el, "fontFamily"),
    size = getCSS(el, "fontSize"),
    shadows = Util.parseTextShadows(getCSS(el, "textShadow"));

    switch(parseInt(bold, 10)){
      case 401:
        bold = "bold";
        break;
      case 400:
        bold = "normal";
        break;
    }

    ctx.setVariable("fillStyle", color);
    ctx.setVariable("font", [getCSS(el, "fontStyle"), getCSS(el, "fontVariant"), bold, size, family].join(" "));
    ctx.setVariable("textAlign", (align) ? "right" : "left");

    if (shadows.length) {
      // TODO: support multiple text shadows
      // apply the first text shadow
      ctx.setVariable("shadowColor", shadows[0].color);
      ctx.setVariable("shadowOffsetX", shadows[0].offsetX);
      ctx.setVariable("shadowOffsetY", shadows[0].offsetY);
      ctx.setVariable("shadowBlur", shadows[0].blur);
    }

    if (text_decoration !== "none"){
      return Util.Font(family, size, doc);
    }
  }

  function renderTextDecoration(ctx, text_decoration, bounds, metrics, color) {
    switch(text_decoration) {
      case "underline":
        // Draws a line at the baseline of the font
        // TODO As some browsers display the line as more than 1px if the font-size is big, need to take that into account both in position and size
        renderRect(ctx, bounds.left, Math.floor(bounds.bottom - metrics.lineWidth) , bounds.width, 1, color);
        break;
      case "overline":
        renderRect(ctx, bounds.left, Math.round(bounds.top), bounds.width, 1, color);
        break;
      case "line-through":
        // TODO try and find exact position for line-through
        renderRect(ctx, bounds.left, Math.ceil(bounds.top + metrics.middle + metrics.lineWidth), bounds.width, 1, color);
        break;
    }
  }
 
  function getTextBounds(element, state, text, textDecoration, isLast, matrix) {
    var bounds;

    if (textDecoration !== "none" || Util.trimText(text).length !== 0) {
          bounds = textRangeBounds(text, state.node, state.textOffset);
    }
    state.textOffset += text.length;

    return bounds;
  }

  function textRangeBounds(text, textNode, textOffset) {
    var range = doc.createRange();
    range.setStart(textNode, textOffset);
    range.setEnd(textNode, textOffset + text.length);
    var bounds =  range.getBoundingClientRect();
    range.detach();

    bounds = modifyBoundsWhenButtonAndInternetExplorer(textNode,bounds);

    return bounds;
  }

  function isACenteredLineHeightElement(nodeName) {
    var centeredLineHeightElements = ["BUTTON", "SPAN", "VALUEWRAP"];
    var nodeNameAsUpper = nodeName.toUpperCase();

    return (centeredLineHeightElements.indexOf(nodeNameAsUpper) > -1)
  }

    function modifyBoundsWhenButtonAndInternetExplorer(textNode, bounds) {
        if (!_html2canvas.isIE) return bounds;

        if (isACenteredLineHeightElement(textNode.parentNode.nodeName)) {
            var fontSize = parseFloat(getCSS(textNode.parentNode, "fontSize"));
            var lineHeight = parseFloat(getCSS(textNode.parentNode, "line-height"));

            if (!isNaN(lineHeight)) {
                var roundedLineHeight = Math.round(lineHeight);
                var currentBoundsHeight = bounds.height;
                var roundedBoundsHeight = Math.round(bounds.height);

                if (Math.round(fontSize) < roundedLineHeight) {
                    if (roundedBoundsHeight > roundedLineHeight) {
                        // There is something (e.g. an image) bigger than the line height.
                        currentBoundsHeight = lineHeight;
                    }

                    if (roundedBoundsHeight >= roundedLineHeight) {
                        var centre = bounds.bottom - Math.round(currentBoundsHeight/2);
                        var newHeight = fontSize;
                        var newTop = centre - Math.round(newHeight/2);

                        bounds = {
                            top: newTop,
                            left: bounds.left,
                            right: bounds.right,
                            bottom: newTop + newHeight,
                            height: newHeight,
                            width: bounds.width,
                        };
                    }
                }
            }
        }

        return bounds;
    }

  function isOnNewLine(prevBounds, bounds) {
      return !!(prevBounds && bounds.bottom !== prevBounds.bottom);

  }

  /**
   * is provided DOM element a SELECT box.
   * @param {Element} el the DOM element to check.
   * @return {boolean} true when the element is a SELECT box.
   */
  function isSelect(el) {
    return hasNodeNameOf(el, 'SElECT');
  }
  /**
   * is provided DOM element a multi SELECT box.
   * @param {Element} el the DOM element to check.
   * @return {boolean} true when the element is a multi SELECT box.
   */

  function isMultiSelect(el) {
    return isSelect(el) && el.multiple;
  }

  /**
   * is provided DOM element a TEXTAREA.
   * @param {Element} el the DOM element to check.
   * @return {boolean} true when the element is a TEXTAREA.
   */
  function isTextArea(el) {
    return hasNodeNameOf(el, 'TEXTAREA');
  }

  /**
   * is provided DOM element is of the type provided.
   * @param {Element} el the DOM element to check.
   * @param {String} name the required type
   * @return {boolean} true when type matches elements node name.
   */
  function hasNodeNameOf(el, name) {
    return el.nodeName.toUpperCase() === name.toUpperCase();
  }

  function renderText(el, textNode, stack) {
    var ctx = stack.ctx,
    color = textNode.style ? textNode.fgColor || textNode.style.color : getCSS(el, "color"),
    textDecoration = getCSS(el, "textDecoration"),
    textAlign = getCSS(el, "textAlign"),
    metrics,
    textList,
    containingElementBounds = _html2canvas.Util.Bounds(el),
    state = {
      node: textNode.text,
      textOffset: 0
    };

    if(textNode.style) {
      var canvas = document.createElement("canvas");
      var drawCtx = canvas.getContext('2d');
      drawCtx.fillStyle = textNode.bgColor || textNode.style.backgroundColor;
      var b = Util.Bounds(textNode.text.parentNode);
      drawCtx.fillRect(0, 0, b.width, b.height);
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, b.left, b.top, canvas.width, canvas.height);
    }

      if (Util.trimText(textNode.text.nodeValue).length > 0) {
      textNode.text.nodeValue = textTransform(textNode.text.nodeValue, getCSS(el, "textTransform"));
      textAlign = textAlign.replace(["-webkit-auto"],["auto"]);

      textList = (!options.letterRendering && /^(left|right|justify|auto)$/.test(textAlign) && noLetterSpacing(getCSS(el, "letterSpacing"))) ?
        textNode.text.nodeValue.split(/(\b| )/)
      : textNode.text.nodeValue.split("");

      metrics = setTextVariables(ctx, el, textDecoration, color);

      if (options.chinese) {
        textList.forEach(function(word, index) {
          if (/.*[\u4E00-\u9FA5].*$/.test(word)) {
            word = word.split("");
            word.unshift(index, 1);
            textList.splice.apply(textList, word);
          }
        });
      }

      var prevBounds;
      for (var index = 0; index < textList.length; index++) {
        var text = textList[index];
        var bounds = getTextBounds(el, state, text, textDecoration, (index < textList.length - 1), stack.transform.matrix);

        if (bounds && bounds.width > 0) {
          //Consider scroll position of text within the textbox:
          var textBottom = Math.ceil(bounds.bottom)-el.scrollTop;
          var textTop = Math.ceil(bounds.top)-el.scrollTop;

          //For clipping out part of text:
          var clip = {clipTop:0, clipSize:bounds.height};

          if (isTextArea(el)) {
            var textAreaPositionInViewport = readCache.getBoundingClientRectForElement(el);
            var textOverTopAmount = textAreaPositionInViewport.top-textTop;
            clip.clipTop = (textOverTopAmount < 0) ? 0 : textOverTopAmount;

            var textOverBottomAmount = textBottom-textAreaPositionInViewport.bottom;
            clip.clipSize = (textOverBottomAmount > 0) ? bounds.height-(textOverBottomAmount) : bounds.height;

            if (clip.clipSize > bounds.height) return;
          }

          var scrollBounds = {width: bounds.width, left: bounds.left, top: textTop, bottom: textBottom};


          if (_html2canvas.isIE) {
              // in ie and edge client rectangle return from a range doesn't account for the font overflowing
              // the inline-element's defined rectangle size, which is the default behaviour in all browsers.
              // If we do not provide clipping information to drawText, it renders the text as is.
              //
              // If overflow behaviour is defined for the inline-element it will still be honoured.
              var fontSize = parseFloat(getCSS(el, "fontSize"));
              if (fontSize > bounds.height) {
                  clip = {};
              }

              if ((index == 0) && (el.firstChild === textNode.text)) {
                var beforePos = stack.pseudoPositioningBefore;
                if (typeof beforePos !== "undefined") {
                  if (containingElementBounds.right > beforePos.right) {
                    scrollBounds.left = beforePos.right;
                  }
                } else if (isElementAListItem(el)) {
                    var liBounds = _html2canvas.Util.Bounds(el);
                    var paddingLeft = getCSSInt(el, "paddingLeft");

                    scrollBounds.left = liBounds.left + paddingLeft;
                    scrollBounds.width = bounds.width +  bounds.left - scrollBounds.left;
                }
              }
          }

          drawRectTextBoundsIfEnabled(bounds,ctx);
          drawText(text, scrollBounds, clip, ctx);
          if (!_html2canvas.isIE){
              renderTextDecoration(ctx, textDecoration, scrollBounds, metrics, color);
          }
          else if (!isOnNewLine(prevBounds, bounds)) {
              renderTextDecoration(ctx, textDecoration, scrollBounds, metrics, color);
          }

          prevBounds = bounds;
        }

      }
    }
  }
   
  function drawRectTextBoundsIfEnabled(bounds, context) {
    context.fillStyle = '#EEEEEE';
    context.strokeStyle = '#555555s';

    if (_html2canvas.showBoundingTextRectangles) {
      context.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
    }
  }
  
  function listPosition (element, stack, val) {
    var boundElement = doc.createElement( "boundelement" ),
    originalType,
    bounds;

    boundElement.style.display = "inline";

    originalType = element.style.listStyleType;
    element.style.listStyleType = "none";

    boundElement.appendChild(doc.createTextNode(val));

    element.insertBefore(boundElement, element.firstChild);

    bounds = Util.Bounds(boundElement);
    addPseudoPositioningForLaterIE(boundElement, stack, "before");
    element.removeChild(boundElement);
    element.style.listStyleType = originalType;
    return bounds;
  }

  function elementIndex(el) {
    var i = -1,
    count = 1,
    childs = el.parentNode.childNodes;

    if (el.parentNode) {
      while(childs[++i] !== el) {
        if (childs[i].nodeType === 1) {
          count++;
        }
      }
      return count;
    } else {
      return -1;
    }
  }

  function listItemText(element, type) {
    var currentIndex = elementIndex(element), text;
    switch(type){
      case "decimal":
        text = currentIndex;
        break;
      case "decimal-leading-zero":
        text = (currentIndex.toString().length === 1) ? currentIndex = "0" + currentIndex.toString() : currentIndex.toString();
        break;
      case "upper-roman":
        text = _html2canvas.Generate.ListRoman( currentIndex );
        break;
      case "lower-roman":
        text = _html2canvas.Generate.ListRoman( currentIndex ).toLowerCase();
        break;
      case "lower-alpha":
        text = _html2canvas.Generate.ListAlpha( currentIndex ).toLowerCase();
        break;
      case "upper-alpha":
        text = _html2canvas.Generate.ListAlpha( currentIndex );
        break;
    }

    return text + ". ";
  }

  function renderListItem(element, stack, elBounds) {
    var x,
    text,
    ctx = stack.ctx,
    type = getCSS(element, "listStyleType"),
    listBounds;

    if (/^(decimal|decimal-leading-zero|upper-alpha|upper-latin|upper-roman|lower-alpha|lower-greek|lower-latin|lower-roman)$/i.test(type)) {
      text = listItemText(element, type);
      listBounds = listPosition(element, stack, text);
      setTextVariables(ctx, element, "none", getCSS(element, "color"));

      if (getCSS(element, "listStylePosition") === "inside") {
        ctx.setVariable("textAlign", "left");
        x = elBounds.left;
      } else {
        delete stack.pseudoPositioningBefore;
        return;
      }

      drawText(text, listBounds, undefined, ctx);
    }
  }

  function loadImage (src){
    var img = images[src];
    return (img && img.succeeded === true) ? img.img : false;
  }

  function clipBounds(src, dst){
    var x = Math.max(src.left, dst.left),
    y = Math.max(src.top, dst.top),
    x2 = Math.min((src.left + src.width), (dst.left + dst.width)),
    y2 = Math.min((src.top + src.height), (dst.top + dst.height));

    return {
      left:x,
      top:y,
      width:x2-x,
      height:y2-y
    };
  }

  function setZ(element, stack, parentStack){
    var newContext,
    isPositioned = stack.cssPosition !== 'static',
    zIndex = isPositioned ? getCSS(element, 'zIndex') : 'auto',
    opacity = getCSS(element, 'opacity'),
    isFloated = getCSS(element, 'cssFloat') !== 'none',
    hasTransformation = getCSS(element, 'transform') !== 'none';

    // https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Understanding_z_index/The_stacking_context
    // When a new stacking context should be created:
    // the root element (HTML),
    // positioned (absolutely or relatively) with a z-index value other than "auto",
    // elements with an opacity value less than 1. (See the specification for opacity),
    // on mobile WebKit and Chrome 22+, position: fixed always creates a new stacking context, even when z-index is "auto" (See this post)

    stack.zIndex = newContext = h2czContext(zIndex);
    newContext.isPositioned = isPositioned;
    newContext.isFloated = isFloated;
    newContext.opacity = opacity;
    newContext.ownStacking = (zIndex !== 'auto' || opacity < 1 || hasTransformation);

    if (parentStack) {
      parentStack.zIndex.children.push(stack);
    }
  }

  function renderImage(ctx, element, image, bounds, borders) {

    var paddingLeft = getCSSInt(element, 'paddingLeft'),
    paddingTop = getCSSInt(element, 'paddingTop'),
    paddingRight = getCSSInt(element, 'paddingRight'),
    paddingBottom = getCSSInt(element, 'paddingBottom');

    drawImage(
      ctx,
      image,
      0, //sx
      0, //sy
      image.width, //sw
      image.height, //sh
      bounds.left + paddingLeft + borders[3].width, //dx
      bounds.top + paddingTop + borders[0].width, // dy
      bounds.width - (borders[1].width + borders[3].width + paddingLeft + paddingRight), //dw
      bounds.height - (borders[0].width + borders[2].width + paddingTop + paddingBottom) //dh
      );
  }

  function getBorderData(element) {
    return ["Top", "Right", "Bottom", "Left"].map(function(side) {
      return {
        width: getCSSFloat(element, 'border' + side + 'Width'),
        color: getCSS(element, 'border' + side + 'Color')
      };
    });
  }

  function getBorderRadiusData(element) {
    return ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map(function(side) {
      return getCSS(element, 'border' + side + 'Radius');
    });
  }

  var getCurvePoints = (function(kappa) {

    return function(x, y, r1, r2) {
      var ox = (r1) * kappa, // control point offset horizontal
      oy = (r2) * kappa, // control point offset vertical
      xm = x + r1, // x-middle
      ym = y + r2; // y-middle
      return {
        topLeft: bezierCurve({
          x:x,
          y:ym
        }, {
          x:x,
          y:ym - oy
        }, {
          x:xm - ox,
          y:y
        }, {
          x:xm,
          y:y
        }),
        topRight: bezierCurve({
          x:x,
          y:y
        }, {
          x:x + ox,
          y:y
        }, {
          x:xm,
          y:ym - oy
        }, {
          x:xm,
          y:ym
        }),
        bottomRight: bezierCurve({
          x:xm,
          y:y
        }, {
          x:xm,
          y:y + oy
        }, {
          x:x + ox,
          y:ym
        }, {
          x:x,
          y:ym
        }),
        bottomLeft: bezierCurve({
          x:xm,
          y:ym
        }, {
          x:xm - ox,
          y:ym
        }, {
          x:x,
          y:y + oy
        }, {
          x:x,
          y:y
        })
      };
    };
  })(4 * ((Math.sqrt(2) - 1) / 3));

  function bezierCurve(start, startControl, endControl, end) {

    var lerp = function (a, b, t) {
      return {
        x:a.x + (b.x - a.x) * t,
        y:a.y + (b.y - a.y) * t
      };
    };

    return {
      start: start,
      startControl: startControl,
      endControl: endControl,
      end: end,
      subdivide: function(t) {
        var ab = lerp(start, startControl, t),
        bc = lerp(startControl, endControl, t),
        cd = lerp(endControl, end, t),
        abbc = lerp(ab, bc, t),
        bccd = lerp(bc, cd, t),
        dest = lerp(abbc, bccd, t);
        return [bezierCurve(start, ab, abbc, dest), bezierCurve(dest, bccd, cd, end)];
      },
      curveTo: function(borderArgs) {
        borderArgs.push(["bezierCurve", startControl.x, startControl.y, endControl.x, endControl.y, end.x, end.y]);
      },
      curveToReversed: function(borderArgs) {
        borderArgs.push(["bezierCurve", endControl.x, endControl.y, startControl.x, startControl.y, start.x, start.y]);
      }
    };
  }

  function parseCorner(borderArgs, radius1, radius2, corner1, corner2, x, y) {
    if (radius1[0] > 0 || radius1[1] > 0) {
      borderArgs.push(["line", corner1[0].start.x, corner1[0].start.y]);
      corner1[0].curveTo(borderArgs);
      corner1[1].curveTo(borderArgs);
    } else {
      borderArgs.push(["line", x, y]);
    }

    if (radius2[0] > 0 || radius2[1] > 0) {
      borderArgs.push(["line", corner2[0].start.x, corner2[0].start.y]);
    }
  }

  function drawSide(borderData, radius1, radius2, outer1, inner1, outer2, inner2) {
    var borderArgs = [];

    if (radius1[0] > 0 || radius1[1] > 0) {
      borderArgs.push(["line", outer1[1].start.x, outer1[1].start.y]);
      outer1[1].curveTo(borderArgs);
    } else {
      borderArgs.push([ "line", borderData.c1[0], borderData.c1[1]]);
    }

    if (radius2[0] > 0 || radius2[1] > 0) {
      borderArgs.push(["line", outer2[0].start.x, outer2[0].start.y]);
      outer2[0].curveTo(borderArgs);
      borderArgs.push(["line", inner2[0].end.x, inner2[0].end.y]);
      inner2[0].curveToReversed(borderArgs);
    } else {
      borderArgs.push([ "line", borderData.c2[0], borderData.c2[1]]);
      borderArgs.push([ "line", borderData.c3[0], borderData.c3[1]]);
    }

    if (radius1[0] > 0 || radius1[1] > 0) {
      borderArgs.push(["line", inner1[1].end.x, inner1[1].end.y]);
      inner1[1].curveToReversed(borderArgs);
    } else {
      borderArgs.push([ "line", borderData.c4[0], borderData.c4[1]]);
    }

    return borderArgs;
  }

  function calculateCurvePoints(bounds, borderRadius, borders) {

    var x = bounds.left,
    y = bounds.top,
    width = bounds.width,
    height = bounds.height,

    tlh = borderRadius[0][0],
    tlv = borderRadius[0][1],
    trh = borderRadius[1][0],
    trv = borderRadius[1][1],
    brh = borderRadius[2][0],
    brv = borderRadius[2][1],
    blh = borderRadius[3][0],
    blv = borderRadius[3][1];

    var halfHeight = Math.floor(height / 2);
    tlh = tlh > halfHeight ? halfHeight : tlh;
    tlv = tlv > halfHeight ? halfHeight : tlv;
    trh = trh > halfHeight ? halfHeight : trh;
    trv = trv > halfHeight ? halfHeight : trv;
    brh = brh > halfHeight ? halfHeight : brh;
    brv = brv > halfHeight ? halfHeight : brv;
    blh = blh > halfHeight ? halfHeight : blh;
    blv = blv > halfHeight ? halfHeight : blv;

    var topWidth = width - trh,
    rightHeight = height - brv,
    bottomWidth = width - brh,
    leftHeight = height - blv;

    return {
      topLeftOuter: getCurvePoints(
        x,
        y,
        tlh,
        tlv
        ).topLeft.subdivide(0.5),

      topLeftInner: getCurvePoints(
        x + borders[3].width,
        y + borders[0].width,
        Math.max(0, tlh - borders[3].width),
        Math.max(0, tlv - borders[0].width)
        ).topLeft.subdivide(0.5),

      topRightOuter: getCurvePoints(
        x + topWidth,
        y,
        trh,
        trv
        ).topRight.subdivide(0.5),

      topRightInner: getCurvePoints(
        x + Math.min(topWidth, width + borders[3].width),
        y + borders[0].width,
        (topWidth > width + borders[3].width) ? 0 :trh - borders[3].width,
        trv - borders[0].width
        ).topRight.subdivide(0.5),

      bottomRightOuter: getCurvePoints(
        x + bottomWidth,
        y + rightHeight,
        brh,
        brv
        ).bottomRight.subdivide(0.5),

      bottomRightInner: getCurvePoints(
        x + Math.min(bottomWidth, width + borders[3].width),
        y + Math.min(rightHeight, height + borders[0].width),
        Math.max(0, brh - borders[1].width),
        Math.max(0, brv - borders[2].width)
        ).bottomRight.subdivide(0.5),

      bottomLeftOuter: getCurvePoints(
        x,
        y + leftHeight,
        blh,
        blv
        ).bottomLeft.subdivide(0.5),

      bottomLeftInner: getCurvePoints(
        x + borders[3].width,
        y + leftHeight,
        Math.max(0, blh - borders[3].width),
        Math.max(0, blv - borders[2].width)
        ).bottomLeft.subdivide(0.5)
    };
  }

  function getBorderClip(element, borderPoints, borders, radius, bounds) {
    var backgroundClip = getCSS(element, 'backgroundClip'),
    borderArgs = [];

    switch(backgroundClip) {
      case "content-box":
      case "padding-box":
        parseCorner(borderArgs, radius[0], radius[1], borderPoints.topLeftInner, borderPoints.topRightInner, bounds.left + borders[3].width, bounds.top + borders[0].width);
        parseCorner(borderArgs, radius[1], radius[2], borderPoints.topRightInner, borderPoints.bottomRightInner, bounds.left + bounds.width - borders[1].width, bounds.top + borders[0].width);
        parseCorner(borderArgs, radius[2], radius[3], borderPoints.bottomRightInner, borderPoints.bottomLeftInner, bounds.left + bounds.width - borders[1].width, bounds.top + bounds.height - borders[2].width);
        parseCorner(borderArgs, radius[3], radius[0], borderPoints.bottomLeftInner, borderPoints.topLeftInner, bounds.left + borders[3].width, bounds.top + bounds.height - borders[2].width);
        break;

      default:
        parseCorner(borderArgs, radius[0], radius[1], borderPoints.topLeftOuter, borderPoints.topRightOuter, bounds.left, bounds.top);
        parseCorner(borderArgs, radius[1], radius[2], borderPoints.topRightOuter, borderPoints.bottomRightOuter, bounds.left + bounds.width, bounds.top);
        parseCorner(borderArgs, radius[2], radius[3], borderPoints.bottomRightOuter, borderPoints.bottomLeftOuter, bounds.left + bounds.width, bounds.top + bounds.height);
        parseCorner(borderArgs, radius[3], radius[0], borderPoints.bottomLeftOuter, borderPoints.topLeftOuter, bounds.left, bounds.top + bounds.height);
        break;
    }

    return borderArgs;
  }

  function parseBorders(element, bounds, borders){
    var x = bounds.left,
    y = bounds.top,
    width = bounds.width,
    height = bounds.height,
    borderSide,
    bx,
    by,
    bw,
    bh,
    borderArgs,
    // http://www.w3.org/TR/css3-background/#the-border-radius
    borderRadius = getBorderRadiusData(element),
    borderPoints = calculateCurvePoints(bounds, borderRadius, borders),
    borderData = {
      clip: getBorderClip(element, borderPoints, borders, borderRadius, bounds),
      borders: []
    };

    for (borderSide = 0; borderSide < 4; borderSide++) {

      if (borders[borderSide].width > 0) {
        bx = x;
        by = y;
        bw = width;
        bh = height - (borders[2].width);

        switch(borderSide) {
          case 0:
            // top border
            bh = borders[0].width;

            borderArgs = drawSide({
              c1: [bx, by],
              c2: [bx + bw, by],
              c3: [bx + bw - borders[1].width, by + bh],
              c4: [bx + borders[3].width, by + bh]
            }, borderRadius[0], borderRadius[1],
            borderPoints.topLeftOuter, borderPoints.topLeftInner, borderPoints.topRightOuter, borderPoints.topRightInner);
            break;
          case 1:
            // right border
            bx = x + width - (borders[1].width);
            bw = borders[1].width;

            borderArgs = drawSide({
              c1: [bx + bw, by],
              c2: [bx + bw, by + bh + borders[2].width],
              c3: [bx, by + bh],
              c4: [bx, by + borders[0].width]
            }, borderRadius[1], borderRadius[2],
            borderPoints.topRightOuter, borderPoints.topRightInner, borderPoints.bottomRightOuter, borderPoints.bottomRightInner);
            break;
          case 2:
            // bottom border
            by = (by + height) - (borders[2].width);
            bh = borders[2].width;

            borderArgs = drawSide({
              c1: [bx + bw, by + bh],
              c2: [bx, by + bh],
              c3: [bx + borders[3].width, by],
              c4: [bx + bw - borders[3].width, by]
            }, borderRadius[2], borderRadius[3],
            borderPoints.bottomRightOuter, borderPoints.bottomRightInner, borderPoints.bottomLeftOuter, borderPoints.bottomLeftInner);
            break;
          case 3:
            // left border
            bw = borders[3].width;

            borderArgs = drawSide({
              c1: [bx, by + bh + borders[2].width],
              c2: [bx, by],
              c3: [bx + bw, by + borders[0].width],
              c4: [bx + bw, by + bh]
            }, borderRadius[3], borderRadius[0],
            borderPoints.bottomLeftOuter, borderPoints.bottomLeftInner, borderPoints.topLeftOuter, borderPoints.topLeftInner);
            break;
        }

        borderData.borders.push({
          args: borderArgs,
          color: borders[borderSide].color
        });

      }
    }

    return borderData;
  }

  function createShape(ctx, args) {
    var shape = ctx.drawShape();
    for (var index = 0; index < args.length; index++) {
        var border = args[index];

        shape[(index === 0) ? "moveTo" : border[0] + "To" ].apply(null, border.slice(1));
    }
    return shape;
  }

  function renderBorders(ctx, borderArgs, color) {
    if (color !== "transparent") {
      ctx.setVariable( "fillStyle", color);
      createShape(ctx, borderArgs);
      ctx.fill();
      numDraws+=1;
    }
  }

  function selectedValue(el) {
    var value;
    if (isSelect(el)) {
      if (el.options && el.options.length > 0) {
        value = el.options[el.selectedIndex || 0].text;
      }
    }
    return value;
  }

  function formButtonType(el) {
    var value;
    if (el.type === "submit") {
      value = "Submit";
    }
    else if (el.type === "reset") {
      value = "Reset";
    }
    return value;
  }

  function rectNotAvailable(rect) {
    return rect.height === 0
      && rect.width === 0
      && rect.left === 0
      && rect.top === 0
      && rect.right === 0
      && rect.bottom === 0;
  }

  function renderFormValue (el, bounds, stack, backgroundBounds) {

        var valueWrap = doc.createElement('valueWrap');

        ['lineHeight','textAlign','fontFamily','color','fontSize','paddingLeft','paddingTop','width',
          'height','border','borderLeftWidth','borderTopWidth','borderLeftStyle','borderTopStyle',
          'borderLeftColor','borderTopColor'].forEach(function(property) {
            try {
                valueWrap.style[property] = getCSS(el, property);
            } catch (e) {
                // Older IE has issues with "border"
                Util.log("html2canvas: Parse: Exception caught in renderFormValue: " + e.message);
            }
        });

        valueWrap.style.display = "block";
        valueWrap.style.position = "absolute";

        if (/^(submit|reset|button|text|password)$/.test(el.type) || isSelect(el)){
          valueWrap.style.lineHeight = bounds.height + "px";
          valueWrap.style.paddingTop = "0px";

          if (backgroundBounds) {
            // The size and line height should take the border into account
            valueWrap.style.height = backgroundBounds.height + "px";
            valueWrap.style.width = backgroundBounds.width + "px";
            if (parseFloat(valueWrap.style.lineHeight) > backgroundBounds.height) {
              valueWrap.style.lineHeight = backgroundBounds.height + "px";
            }
          }
        }

        if (/^(submit|reset|button)$/.test(el.type)) {
          valueWrap.style.paddingLeft = "0px";
        }

        var valueWrapTop = bounds.top + el.ownerDocument.defaultView.pageYOffset;
        var valueWrapLeft = bounds.left + el.ownerDocument.defaultView.pageXOffset;
        if (getCSS(body, "position") !== "static") {
            // Any margin that the body has will be applied when the valuewrap is appended.
            valueWrapTop -= getCSSInt(body, "marginTop");
            valueWrapLeft -= getCSSInt(body, "marginLeft");
        }
        valueWrap.style.top = valueWrapTop + "px";
        valueWrap.style.left = valueWrapLeft + "px";

        var textNodes = [];

        if (isMultiSelect(el)) {
          for (var i = 0; i < el.options.length; i++) {
            var o = el.options[i];
            var optionStyle = getComputedStyle(o, null);
            var elStyle = getComputedStyle(el);
            var optionText = doc.createTextNode(o.text);
            var items = {text: optionText, style: optionStyle};
            if (_html2canvas.isSafari && o.selected === true) {
              items.bgColor = '#1f50ff';
              items.fgColor = '#ffffff'
            }
            textNodes.push(items);
            var span = document.createElement('span');
            span.style.display = 'block';
            if ((_html2canvas.isIE && !_html2canvas.isEdge)) {
              copyBoxModel(span, elStyle);
            } else {
              copyBoxModelAndStyle(span, optionStyle);
            }
            span.style.color = optionStyle.color;
            span.style.height = optionStyle.height;
            span.style.lineHeight = optionStyle.lineHeight;
            span.style.width = optionStyle.width;
            span.appendChild(optionText);
            valueWrap.appendChild(span);
          }
        } else {
          var textValue = selectedValue(el) || el.value || el.placeholder || formButtonType(el) || "";

          if (isTextArea(el)) {
            var textLines = textValue.split(/(\r\n|\n|\r)/gm);

            for (var textLineIdx in textLines) {
              var textLine = textLines[textLineIdx];
              if (textLine === "\n" || textLine === "\r")
                continue;
              var textNode = doc.createTextNode(textLine);
              textNodes.push({text: textNode});
              valueWrap.appendChild(textNode);

              if (textLineIdx !== textLines.length-1) {
                valueWrap.appendChild(doc.createElement("br"));
              }
            }
          }
          else {
            textNodes.push({text: doc.createTextNode(textValue)});
            valueWrap.appendChild(textNodes[0].text);
          }
        }


        body.appendChild(valueWrap);

        for (var textNodeIdx in textNodes) {
            renderText(el, textNodes[textNodeIdx], stack);
        }

        body.removeChild(valueWrap);
  }

  function drawImage (ctx) {
    ctx.drawImage.apply(ctx, Array.prototype.slice.call(arguments, 1));
    numDraws+=1;
  }

    function getPseudoElement(el, which, stack) {

        function stripQuotes(quoted) {
            var first = quoted.charAt(0);
            if ((first == "'" || first == '"') && first == quoted.charAt(quoted.length - 1)) {
                return quoted.substring(1, quoted.length - 1)
            } else {
                return quoted;
            }
        }

        function parseQuotes(quotes) {
            if (!quotes) {
                return [{open: '"', close: '"'}, {open: "'", close: "'"}];
            }
            var split = quotes.split(" ");
            var result = [];
            for (var i = 0; i < split.length; i += 2) {
                result[result.length] =
                {
                    open: stripQuotes(split[i]),
                    close: stripQuotes(split[i + 1])
                }
            }
            return result;
        }

        function getCounterModifier(style, counterName) {
            var incrementString = style["counter-increment"];
            if (incrementString) {
                var increments = incrementString.split(" ");
                for (var i = 0; i < increments.length; i++) {
                    if (increments[i] == counterName) {
                        var increment = 1;
                        if ((i + 1) < increments.length) {
                            increment = parseInt(increments[i + 1]);
                            if (isNaN(increment)) {
                                increment = 1;
                            }
                        }
                        return increment;
                    }
                }
            }
            return 0;
        }

        function setTargetElementStyleProperty(pseudoStyle,targetElement,property){
          try{
            var style = pseudoStyle[property];
            if (style && 0 != style.length) {
                targetElement.style[property] = style;
            }
          }
          catch(error){
            Util.log(['Tried to assign readonly property ', property, 'Error:', error]);            
          }
        }

        function isMicroClearFixHack(pseudoStyle, which) {
            if (which === ":before") {
                return (pseudoStyle.display === "table" && pseudoStyle.content === "\" \"");
            }
            if (which === ":after") {
                return (elStyle.clear === "both");
            }

            return false;
        }

        function clonePseudoStyle(pseudoStyle, targetElement) {
            if (_html2canvas.isChrome || _html2canvas.isSafari) {
                var props = Object.keys(pseudoStyle).filter(indexedProperty);
                for (var i = 0; i < props.length; i++) {
                    setTargetElementStyleProperty(pseudoStyle, targetElement, props[i]);
                }
            } else {
                var keys = [];
                if (!_html2canvas.isIE) {
                    var cssKeys = Object.keys(pseudoStyle).filter(notIndexedProperty);
                    for (var c = 0; c < cssKeys.length; c++) {
                        keys.push(pseudoStyle[c]);
                    }
                } else {
                    for (var j = 0; j < pseudoStyle.length; j++) {
                        keys.push(pseudoStyle.item(j));
                    }
                }
                for (var k = 0; k < keys.length; k++) {
                    setTargetElementStyleProperty(pseudoStyle, targetElement, keys[k]);
                }

            }
            targetElement.style.content = "none";
        }

        var elStyle = el.ownerDocument.defaultView.getComputedStyle(el, which);
        if (!elStyle || !elStyle.content || elStyle.content === "none" || elStyle.content === "normal" || elStyle.content === "-moz-alt-content" || elStyle.display === "none") {
            return;
        }

        var content = elStyle.content + '';
        var computedStyle = el.ownerDocument.defaultView.getComputedStyle(el, null);
        var quotes = parseQuotes(computedStyle == null ? null : computedStyle.quotes);

        // Create the element
        var tokens = tokenizeContentString(content);
        // Turn the tokens in to an element
        var elps = el.ownerDocument.createElement("span");


        if (isMicroClearFixHack(elStyle, which)) {
            //Assume clearfix hack for html2canvas performance (http://nicolasgallagher.com/micro-clearfix-hack/)
            if (which === ":after") {
                elps.style.clear = "both";
            }

            elps.style.display = "table";
            elps.style.content = "none";
        }
        else {
            clonePseudoStyle(elStyle, elps);
        }

        var quoteLevel = 0;

        for (var tokenNo = 0; tokenNo < tokens.length; tokenNo++) {
            var token = tokens[tokenNo], counterName, modifier;
            if (token.charAt(0) == "'" || token.charAt(0) == '"') {
                // Quoted string, strip off the quotes and add it verbatim
                elps.appendChild(el.ownerDocument.createTextNode(stripQuotes(token)));
            } else if ("open-quote" == token) {
                elps.appendChild(el.ownerDocument.createTextNode(quotes[Math.min(quoteLevel, quotes.length)].open));
                quoteLevel++;
            } else if ("close-quote" == token && quoteLevel > 0) {
                quoteLevel--;
                elps.appendChild(el.ownerDocument.createTextNode(quotes[Math.min(quoteLevel, quotes.length)].close));
            } else if ("no-open-quote" == token) {
                quoteLevel++;
            } else if ("no-close-quote" == token && quoteLevel > 0) {
                quoteLevel--;
            } else if (token.length > 5 && token.substring(0, 5) == "attr(") {
                var attrName = token.substring(5, token.length - 1);
                var attrValue = element.getAttribute(attrName) || "";
                elps.appendChild(el.ownerDocument.createTextNode(attrValue));
            } else if (token.length > 4 && token.substring(0, 4) == 'url(') {
                // TODO what kind of resources might the URL represent other than just an image?
                var img = el.ownerDocument.createElement("img");
                img.src = Util.parseBackgroundImage(token)[0].args[0];
                elps.appendChild(img);
            } else if (token.length > 8 && token.substring(0, 8) == "counter(") {
                // handle counter
                counterName = token.substring(8, token.length - 1);
                modifier = getCounterModifier(elStyle, counterName);
                var targetCounter = stack.counters[counterName] || stack.previousElementCounters[counterName];
                var counterValue = targetCounter ? targetCounter.value + modifier : modifier;
                elps.appendChild(el.ownerDocument.createTextNode(counterValue));
            } else if (token.length > 9 && token.substring(0, 9) == "counters(") {
                // handle counters
                var counterArgs = token.substring(9, token.length - 1).split(",");
                counterName = counterArgs[0].trim();
                var counterSeparator = stripQuotes(counterArgs[1].trim());
                var counter = stack.counters[counterName];
                modifier = getCounterModifier(elStyle, counterName);
                var result = counter.value + modifier;
                while (counter.parent) {
                    result = counter.parent.value + counterSeparator + result;
                    counter = counter.parent;
                }
                elps.appendChild(el.ownerDocument.createTextNode(result));
            }
        }

        return elps;
    }

    function notIndexedProperty(property) {
        return !indexedProperty(property);
    }

    function indexedProperty(property) {
        return (isNaN(window.parseInt(property, 10)));
    }

    function addPseudoPositioningForLaterIE(pseudoElement, stack, which) {
        if (_html2canvas.isIE) {
            var bounds = pseudoElement.getBoundingClientRect();
            var pseudoPosition = getCSS(pseudoElement, "position");

            var pseudoPos;
            if (pseudoPosition === "relative") {
                var parentBounds = _html2canvas.Util.Bounds(pseudoElement.parentNode);
                var parentLeft = parentBounds.left + getCSSInt(pseudoElement.parentNode, "paddingLeft");
                pseudoPos = { left: parentLeft, right: parentLeft+bounds.width, bottom: bounds.bottom};
            }
            else if (pseudoPosition !== "static" || bounds.width === 0 || bounds.height === 0) {
                return;
            }
            else {
                var marginRight = getCSSInt(pseudoElement, "marginRight");
                pseudoPos = { left: bounds.left, right: bounds.right + marginRight, bottom: bounds.bottom};
            }

            if (which === 'before') {
                stack.pseudoPositioningBefore = pseudoPos;
            } else if (which === 'after') {
                stack.pseudoPositioningAfter = pseudoPos;
            }
        }
    }

    function injectPseudoElements(el, stack) {
    var before = getPseudoElement(el, ':before', stack),
    after = getPseudoElement(el, ':after', stack);
    if(!before && !after) {
      return;
    }

    if(before) {
      el.className += " " + pseudoHide + "-before";
      if (el.hasChildNodes()) {
        el.insertBefore(before, el.firstChild);
      } else {
        el.appendChild(before);
      }
      parseElement(before, stack, true);
      addPseudoPositioningForLaterIE(before, stack, "before");
      el.removeChild(before);
      el.className = el.className.replace(pseudoHide + "-before", "").trim();
    }

    if (after) {
      el.className += " " + pseudoHide + "-after";
      el.appendChild(after);
      parseElement(after, stack, true);
      // Commented out for now as we aren't using the after positioning for text rendering currently.
      //addPseudoPositioningForLaterIE(before, stack, "after");
      el.removeChild(after);
      el.className = el.className.replace(pseudoHide + "-after", "").trim();
    }
  }

  function getScroll(element) {
        var document = element.ownerDocument;

        var left = document.documentElement.scrollLeft;
        var top = document.documentElement.scrollTop;

        return {
            "top": top,
            "left": left
        }
    }

  function renderBackgroundRepeat(ctx, image, backgroundPosition, bounds) {
    var offsetX = Math.round(bounds.left + backgroundPosition.left),
    offsetY = Math.round(bounds.top + backgroundPosition.top);

    ctx.createPattern(image);
    ctx.translate(offsetX, offsetY);
    ctx.fill();
    ctx.translate(-offsetX, -offsetY);
  }

  function backgroundRepeatShape(ctx, image, backgroundPosition, bounds, left, top, width, height) {
    var args = [];
    args.push(["line", Math.round(left), Math.round(top)]);
    args.push(["line", Math.round(left + width), Math.round(top)]);
    args.push(["line", Math.round(left + width), Math.round(height + top)]);
    args.push(["line", Math.round(left), Math.round(height + top)]);
    createShape(ctx, args);
    ctx.save();
    ctx.clip();
    renderBackgroundRepeat(ctx, image, backgroundPosition, bounds);
    ctx.restore();
  }

  function renderBackgroundColor(ctx, backgroundBounds, bgcolor) {
    renderRect(
      ctx,
      backgroundBounds.left,
      backgroundBounds.top,
      backgroundBounds.width,
      backgroundBounds.height,
      bgcolor
      );
  }

  function renderBackgroundRepeating(el, bounds, ctx, image, imageIndex) {
    var backgroundSize = Util.BackgroundSize(el, bounds, image, imageIndex),
    backgroundPosition = Util.BackgroundPosition(el, bounds, image, imageIndex, backgroundSize),
    backgroundRepeat = getCSS(el, "backgroundRepeat").split(",").map(Util.trimText);

    image = resizeImage(image, backgroundSize);

    backgroundRepeat = backgroundRepeat[imageIndex] || backgroundRepeat[0];
    backgroundPosition.top = isNaN(backgroundPosition.top) ? 0 : backgroundPosition.top;

    switch (backgroundRepeat) {
      case "repeat-x":
        backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
          bounds.left, bounds.top + backgroundPosition.top, 99999, image.height);
        break;

      case "repeat-y":
        backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
          bounds.left + backgroundPosition.left, bounds.top, image.width, 99999);
        break;

      case "no-repeat":
        backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
          bounds.left + backgroundPosition.left, bounds.top + backgroundPosition.top, image.width, image.height);
        break;

      default:
        renderBackgroundRepeat(ctx, image, backgroundPosition, {
          top: bounds.top,
          left: bounds.left,
          width: image.width,
          height: image.height
        });
        break;
    }
  }

  function renderBackgroundImage(element, bounds, ctx) {
    var backgroundImage = getCSS(element, "backgroundImage"),
    backgroundImages = Util.parseBackgroundImage(backgroundImage),
    image,
    imageIndex = backgroundImages.length;

    while(imageIndex--) {
      backgroundImage = backgroundImages[imageIndex];

      if (!backgroundImage.args || backgroundImage.args.length === 0) {
        continue;
      }

      var key = backgroundImage.method === 'url' ?
      backgroundImage.args[0] :
      backgroundImage.value;

      image = loadImage(key);

      // TODO add support for background-origin
      if (image) {
        renderBackgroundRepeating(element, bounds, ctx, image, imageIndex);
      } else {
        Util.log("html2canvas: Error loading background:", backgroundImage);
      }
    }
  }

  function resizeImage(image, bounds) {
    if(image.width === bounds.width && image.height === bounds.height) {
      return image;
    }

    var ctx, canvas = doc.createElement('canvas');
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    ctx = canvas.getContext("2d");
    drawImage(ctx, image, 0, 0, image.width, image.height, 0, 0, bounds.width, bounds.height );
    return canvas;
  }

  function setOpacity(ctx, element, parentStack) {
    return ctx.setVariable("globalAlpha", getCSS(element, "opacity") * ((parentStack) ? parentStack.opacity : 1));
  }

  function removePx(str) {
    return str.replace("px", "");
  }

  var transformRegExp = /(matrix)\((.+)\)/;

  function getTransform(element) {
    var transform = getCSS(element, "transform") || getCSS(element, "-webkit-transform") || getCSS(element, "-moz-transform") || getCSS(element, "-ms-transform") || getCSS(element, "-o-transform");
    var transformOrigin = getCSS(element, "transform-origin") || getCSS(element, "-webkit-transform-origin") || getCSS(element, "-moz-transform-origin") || getCSS(element, "-ms-transform-origin") || getCSS(element, "-o-transform-origin") || "0px 0px";

    transformOrigin = transformOrigin.split(" ").map(removePx).map(Util.asFloat);

    var matrix;
    if (transform && transform !== "none") {
      var match = transform.match(transformRegExp);
      if (match) {
        switch(match[1]) {
          case "matrix":
            matrix = match[2].split(",").map(Util.trimText).map(Util.asFloat);
            break;
        }
      }
    }

    return {
      origin: transformOrigin,
      matrix: matrix
    };
  }

    function createCounters(counters, reset, increment, previousElementCounters) {
        var newCounters = {};
        // Copy all the old counters in to the new list
        for (var key in counters) {
            if (counters.hasOwnProperty(key)) {
                newCounters[key] = counters[key];
            }
        }
        if (reset && reset != "none") {
            var resetCounters = reset.split(" ");
            var i = 0;
            while (i < resetCounters.length) {
                var newCounter = {};
                var newValue = 0;
                var counterName = resetCounters[i];
                if (resetCounters.length > (i + 1)) {
                    newValue = parseInt(resetCounters[i + 1]);
                    if (isNaN(newValue)) {
                        newValue = 0;
                    } else {
                        i++;
                    }
                }
                newCounter.value = newValue;
                if  (newCounters[counterName]) {
                    newCounter.parent = newCounters[counterName];
                }
                newCounters[counterName] = newCounter;
                i++;
            }
        }
        if (increment && increment != "none") {
            var incrementCounters = increment.split(" ");
            var i = 0;
            while (i < incrementCounters.length) {
                var counterName = incrementCounters[i];
                var shift = 1;
                if (incrementCounters.length > (i + 1)) {
                    shift = parseInt(incrementCounters[i + 1]);
                    if (isNaN(shift)) {
                        shift = 1;
                    } else {
                        i++;
                    }
                }
                if (newCounters[counterName]) {
                    newCounters[counterName].value += shift;
                } else if(previousElementCounters && previousElementCounters[counterName]) {
                    newCounters[counterName] = previousElementCounters[counterName];
                    newCounters[counterName].value += shift;
                }
                i++;
            }
        }
        return newCounters;
    }
  
  function createStack(element, parentStack, tuple, isPseudoElement) {
      var pos = getCSS(element, "position"),
          bounds = tuple.bounds,
          inheritedClip = (parentStack && parentStack.clip) ? Util.Extend( {}, parentStack.clip ) : null,
          ctx = h2cRenderContext((!parentStack) ? documentWidth() : bounds.width , (!parentStack) ? documentHeight() : bounds.height),
          stack = {
              ctx: ctx,
              opacity: setOpacity(ctx, element, parentStack),
              cssPosition: pos,
              borders: getBorderData(element),
              transform: isPseudoElement ? tuple.transform :{},
              clip: pos == 'fixed' ? null : inheritedClip,
              previousElementCounters: parentStack ? parentStack.previousElementCounters ? parentStack.previousElementCounters : {} : {},
              counters : ((getCSS(element, 'display') == "none") ?
                  (parentStack ? parentStack.counters : {}) :
                  createCounters((parentStack ? parentStack.counters : {}), getCSS(element, "counter-reset"), getCSS(element, "counter-increment"), parentStack ? parentStack.previousElementCounters : {}))
          };

      setZ(element, stack, parentStack);

    // TODO correct overflow for absolute content residing under a static position
    if (options.useOverflow === true && shouldClipOverflow(element)) {
        stack.clip = (stack.clip) ? clipBounds(stack.clip, bounds) : bounds;
    }

    elementContexts.set(element, stack);
    return stack;
  }

    function shouldClipOverflow(element) {
    var isSelectElement = /(SELECT)/i.test(element.nodeName);
    if (isSelectElement)
        return true;
    var isCssOverflowSet = isOverflowControlled(element);
    var blockElement = isBlockElement(element);
    var isBodyElement = /(BODY)/i.test(element.nodeName);

    return (isCssOverflowSet) && (blockElement) && (!isBodyElement);
  }

  function isOverflowControlled(element) {
    var isCssOverflowSet = false;
    var OVERFLOW_CONTROLLED = /(hidden|scroll|auto)/;
    var overflow = getCSS(element, "overflow");
    if (overflow) {
      isCssOverflowSet = OVERFLOW_CONTROLLED.test(overflow);
    } else {
      if (OVERFLOW_CONTROLLED.test(getCSS(element, "overflow-x")) ||
          OVERFLOW_CONTROLLED.test(getCSS(element, "overflow-y"))) {
        isCssOverflowSet = true;
      }
    }
    return isCssOverflowSet;
  }

  function isBlockElement(element) {
    var displayType = getElementDisplayType(element);
    var isBlockElement = /(block|inline-block)/.test(displayType);

    if (_html2canvas.isIE && displayType == 'inline') {
      var floatStyle = getCSS(element, "cssFloat");
      var elementPosition = getCSS(element, "position");

      if (floatStyle !== 'none' || elementPosition === "absolute" || elementPosition === "fixed") {
        isBlockElement = true;
      }
    }
    return isBlockElement;
  }

  function getElementDisplayType (element) {
    var cStyle = element.currentStyle ? element.currentStyle : window.getComputedStyle(element, null);
    return cStyle.display;
  }

  function getBackgroundBounds(borders, bounds, clip) {
    var backgroundBounds = {
      left: bounds.left + borders[3].width,
      top: bounds.top + borders[0].width,
      width: bounds.width - (borders[1].width + borders[3].width),
      height: bounds.height - (borders[0].width + borders[2].width)
    };

    if (clip) {
      backgroundBounds = clipBounds(backgroundBounds, clip);
    }

    return backgroundBounds;
  }
 
  function getBoundsAndTransform(element) {
    var bounds = Util.Bounds(element);
    var transform = getTransform(element);
    if (transform && transform.origin) {
      transform.origin[0] += bounds.left;
      transform.origin[1] += bounds.top;

      if (transform.matrix != undefined) {
        transform.matrix[4] = 0;
        transform.matrix[5] = 0;
      }

    }
    return { bounds: bounds, transform: transform };
  }
  function addSelectScrollbar(backgroundBounds, ctx) {
    var canvas = document.createElement("canvas");
    var arrowWidth = 7;
    var arrowHeight = 4;
    if (backgroundBounds.width >= arrowWidth && backgroundBounds.height >= (arrowHeight * 4)) {
      canvas.width = 16;
      canvas.height = backgroundBounds.height;
      var drawCtx = canvas.getContext('2d');
      drawCtx.fillStyle = '#f1f1f1';
      drawCtx.fillRect(0, 0, canvas.width, canvas.height);
      drawCtx.fillStyle = '#434343';
      drawCtx.beginPath();
      drawCtx.moveTo(7, 7);
      drawCtx.lineTo(4, 11);
      drawCtx.lineTo(10, 11);
      drawCtx.fill();
      drawCtx.beginPath();
      drawCtx.moveTo(4, canvas.height - 13);
      drawCtx.lineTo(7, canvas.height - 9);
      drawCtx.lineTo(10, canvas.height - 13);
      drawCtx.fill();
      var leftDrawPosition = (backgroundBounds.left + backgroundBounds.width) - canvas.width;
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, leftDrawPosition, backgroundBounds.top, canvas.width, canvas.height);
    }
  }

  function addSelectDropdownArrow(backgroundBounds, backgroundColor, ctx) {
    var canvas = document.createElement("canvas");
    var arrowSize = 7;
    if (backgroundBounds.width >= arrowSize && backgroundBounds.height >= arrowSize) {
      var xPadding = Math.min(arrowSize, (backgroundBounds.width - arrowSize) * 0.5);
      var yPadding = (backgroundBounds.height - arrowSize) * 0.5;
      canvas.width = Math.min(arrowSize * 3, backgroundBounds.width);
      canvas.height = backgroundBounds.height;
      var drawCtx = canvas.getContext('2d');
      drawCtx.fillStyle = backgroundColor;
      drawCtx.fillRect(0, 0, canvas.width, canvas.height);
      drawCtx.fillStyle = '#000000';
      drawCtx.beginPath();
      drawCtx.moveTo(xPadding, yPadding);
      drawCtx.lineTo(canvas.width * 0.5, yPadding + arrowSize);
      drawCtx.lineTo(xPadding + arrowSize, yPadding);
      drawCtx.fill();
      var leftDrawPosition = (backgroundBounds.left + backgroundBounds.width) - canvas.width;
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, leftDrawPosition, backgroundBounds.top, canvas.width, canvas.height);
    }
  }

  function scrollbarNeeded(element) {
    if (!_html2canvas.isIE || _html2canvas.isEdge) {
      return true;
    } else {
      return element.size < element.options.length;
    }
  }

  function renderElement(element, parentStack, isPseudoElement, ignoreBackground) {
    var tuple = getBoundsAndTransform(element),
      bounds = tuple.bounds,
      image,
      stack = createStack(element, parentStack, tuple, isPseudoElement),
      borders = stack.borders,
      ctx = stack.ctx,
      backgroundBounds,
      borderData,
      backgroundColor = (ignoreElementsRegExp.test(element.nodeName)) ? "#efefef" : getCSS(element, "backgroundColor");
      
      if (element.nodeName.toUpperCase() === "SELECT" && borders.length > 0) {
        //See if we need to generate a border for the select list
        var borderRequired = borders.every(function(border) {
          return (border.width == 0);
        });
      
        if (borderRequired) {
          borders.forEach(function(border) {
            border.width = 2;
          });
        }
      }
      
      backgroundBounds = getBackgroundBounds(borders, bounds, stack.clip);
      borderData = parseBorders(element, bounds, borders);
      
    try {
        renderBoxShadow(ctx, element, bounds, borders, borderData);

        createShape(ctx, borderData.clip);

        ctx.save();
        ctx.clip();

        if (backgroundBounds.height > 0 && backgroundBounds.width > 0 && !ignoreBackground) {
            renderBackgroundColor(ctx, bounds, backgroundColor);
            renderBackgroundImage(element, backgroundBounds, ctx);
        } else if (ignoreBackground) {
            stack.backgroundColor =  backgroundColor;
        }

        ctx.restore();

        borderData.borders.forEach(function(border) {
            renderBorders(ctx, border.args, border.color);
        });

        if (!isPseudoElement) {
            injectPseudoElements(element, stack);
        }

        switch(element.nodeName){
            case "SVG":
            case "svg":
                var s = new XMLSerializer();
                var c = element.ownerDocument.createElement('canvas');
                c.width = element.clientWidth;
                c.height = element.clientHeight;
                        canvg(c, s.serializeToString(element), {renderCallback: function (dom) {
                            bounds.width = c.width;
                            bounds.height = c.height;
                            renderImage(ctx, element, c, bounds, borders);
                        }
                        });
                break;
            case "IMG":
                if ((image = loadImage(element.src))) {
                  try{
                    var fileType = _html2canvas.Util.getFileTypeFromSource(element.src);
                    if (_html2canvas.isIE && fileType && fileType.toUpperCase() === "SVG") {
                        var c = document.createElement('canvas');
                        c.width = element.clientWidth;
                        c.height = element.clientHeight;
                        canvg(c, element.src);
                        renderImage(ctx, element, c, bounds, borders);
                    } else {
                        renderImage(ctx, element, image, bounds, borders);
                    }
                  } catch (ex) {
                    renderImage(ctx, element, image, bounds, borders);
                  }
                } else {
                    Util.log("html2canvas: Error loading <img>:" + element.src);
                }
                break;
            case "INPUT":
                // TODO add all relevant type's, i.e. HTML5 new stuff
                // todo add support for placeholder attribute for browsers which support it
                if (!(/^(radio|checkbox|password|submit|reset|button)$/.test(element.type)) && (element.value || element.placeholder || "").length > 0){
                    renderFormValue(element, bounds, stack, backgroundBounds);
                }
                switch (element.type) {
                    case "image":
                        if (image = loadImage(element.src)) {
                            renderImage(ctx, element, image, bounds, borders);
                        } else {
                            Util.log("html2canvas: Error loading <input type=\"image\" src=" + element.src);
                        }
                        break;

                    case "radio":
                        var canvas = document.createElement("canvas");
                        var size = (Math.min(bounds.width, bounds.height));
                        if (size > 4) {
                            canvas.width = size;
                            canvas.height = size;
                            var drawCtx = canvas.getContext('2d');
                            var r = (size / 2) - 1;
                            var cX = size / 2;
                            var cY = size / 2;
                            drawCtx.fillStyle = '#EEEEEE';
                            drawCtx.strokeStyle = '#555555s';
                            drawCtx.beginPath();
                            drawCtx.arc(cX, cY, r, 0, 2 * Math.PI);
                            drawCtx.closePath();
                            drawCtx.stroke();
                            drawCtx.fill();
                            if (element.checked) {
                                drawCtx.fillStyle = '#424242';
                                drawCtx.beginPath();
                                drawCtx.arc(cX, cY, r * 0.5, 0, 2 * Math.PI);
                                drawCtx.closePath();
                                drawCtx.fill();
                            }
                            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, bounds.left, bounds.top, canvas.width, canvas.height);
                        }
                        break;
                    case "checkbox":
                        var canvas = document.createElement("canvas");
                        var size = (Math.min(bounds.width, bounds.height));
                        if (size > 4) {
                            canvas.width = size;
                            canvas.height = size;
                            var drawCtx = canvas.getContext('2d');
                            drawCtx.fillStyle = '#EEEEEE';
                            drawCtx.strokeStyle = '#555555s';
                            drawCtx.fillRect(0, 0, size, size);
                            drawCtx.strokeRect(0, 0, size, size);
                            if (element.checked) {
                                drawCtx.strokeStyle = 'black';
                                drawCtx.beginPath();
                                drawCtx.moveTo(3, size * 0.5);
                                drawCtx.lineTo(size * 0.5, size - 3);
                                drawCtx.lineTo(size, 0);
                                drawCtx.stroke();
                            }
                            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, bounds.left, bounds.top, canvas.width, canvas.height);
                        }
                        break;
                    case "submit":
                    case "reset":
                    case "button":
                        renderFormValue(element, bounds, stack, backgroundBounds);
                        break;
                }
                break;
            case "TEXTAREA":
                if ((element.value || element.placeholder || "").length > 0){
                    renderFormValue(element, bounds, stack);
                }
                break;
            case "SELECT":
                if ((element.options || element.placeholder || "").length > 0) {
                  renderFormValue(element, bounds, stack, backgroundBounds);
                  if (isMultiSelect(element)) {
                    if (scrollbarNeeded(element)) {
                      addSelectScrollbar(backgroundBounds, ctx);
                    }
                  } else {
                    if (dropdownArrowRequired(element)) {
                      addSelectDropdownArrow(backgroundBounds, backgroundColor, ctx);
                    }
                  }
                }
                break;
            case "LI":
                renderBullet(element, stack);
                renderListItem(element, stack, backgroundBounds);
                break;
            case "CANVAS":
                renderImage(ctx, element, element, bounds, borders);
                break;
        }
    } catch (ex) {
        window.console.error("html2canvas: failed to render element ", ex);
    }

    return stack;
  }
  
  function dropdownArrowRequired(element) {
    var required = false;
    
    if (_html2canvas.isIE) {
      required = true;
    }
    else {
      required = (
        getCSS(element, "appearance") != "none" &&
        getCSS(element, "-webkit-appearance") != "none" &&
        getCSS(element, "-moz-appearance") != "none"
        );
    }
    
    return required;
  }

  function renderBoxShadow(ctx, element, bounds, borders, mainElementBorderData) {
    var boxShadowStyle = getCSS(element, "boxShadow");
    var boxShadowProperties = Util.extractBoxShadowProperties(boxShadowStyle);

    if (!Object.keys(boxShadowProperties).length > 0) return;

    //TODO: not supported (LA-2998)
    if (boxShadowProperties.inset) {
        return;
    }

    //The bounds of the offscreen fake rectangle
    var dummyRectBounds = {
       top: bounds.top-boxShadowProperties.spread,
       left: bounds.left-boxShadowProperties.spread,
       width: bounds.width + boxShadowProperties.spread*2,
       height: bounds.height + boxShadowProperties.spread*2
    }

    //The bounds of onscreen shadow
    var dummyShadowBounds = {
        top: Math.floor(dummyRectBounds.top+boxShadowProperties.vshadow - boxShadowProperties.blur/2),
        left: Math.floor(dummyRectBounds.left+boxShadowProperties.hshadow - boxShadowProperties.blur/2),
        width: Math.ceil(dummyRectBounds.width + boxShadowProperties.blur),
        height: Math.ceil(dummyRectBounds.height + boxShadowProperties.blur)
    }

    var dummyShadowBorderData = parseBorders(element, dummyShadowBounds, borders);

    var shadowCanvas = element.ownerDocument.createElement("canvas");
    drawShadowOnCanvas(shadowCanvas, mainElementBorderData, dummyShadowBorderData, dummyShadowBounds, dummyRectBounds, boxShadowProperties);

    var boxShadowOverlayImage = new Image();
    boxShadowOverlayImage.onload = function() {
        ctx.drawImage(boxShadowOverlayImage, 0, 0, //sx, sy
              shadowCanvas.width, shadowCanvas.height, //sw, sh
              0, 0, //dx, dy
              shadowCanvas.width, shadowCanvas.height); //dw, dh
    };

    boxShadowOverlayImage.src = shadowCanvas.toDataURL("image/png");
  }

  function drawShadowOnCanvas(shadowCanvas, mainElementBorderData, dummyShadowBorderData, dummyShadowBounds, dummyRectBounds, boxShadowProperties) {
    var shadowCtx = shadowCanvas.getContext("2d");

    shadowCanvas.width = (dummyShadowBounds.left+(dummyRectBounds.width*2)) + boxShadowProperties.blur;
    shadowCanvas.height = (dummyShadowBounds.top+(dummyRectBounds.height*2)) + boxShadowProperties.blur;

    shadowCtx.shadowBlur = boxShadowProperties.blur;
    shadowCtx.shadowColor = boxShadowProperties.colour || "rgb(0, 0, 0)";
    shadowCtx.shadowOffsetX = (dummyShadowBounds.left+dummyRectBounds.width) + boxShadowProperties.blur/2;
    shadowCtx.shadowOffsetY = (dummyShadowBounds.top+dummyRectBounds.height) + boxShadowProperties.blur/2;

    shadowCtx.save();

    if (boxShadowProperties.blur < 1) {
        //1) Clip shadow borders:
        drawBorderPath(shadowCtx, dummyShadowBorderData);
        shadowCtx.clip();
    }

    shadowCtx.fillRect(-dummyRectBounds.width, -dummyRectBounds.height, dummyRectBounds.width, dummyRectBounds.height);

    //2) Remove region that's covering main element:
    drawBorderPath(shadowCtx, mainElementBorderData);
    shadowCtx.globalCompositeOperation = "destination-out";
    shadowCtx.fill();

    shadowCtx.restore();
  }

  function drawBorderPath(ctx, borderData) {
    ctx.beginPath();
    borderData.clip.forEach(function(border, index) {
      ctx[(index === 0) ? "moveTo" : border[0] + "To" ].apply(ctx, border.slice(1));
    });
    ctx.closePath();
  }

  function isElementVisible(element) {
    return (
      getCSS(element, 'display') !== "none"
      && getCSS(element, 'visibility') !== "hidden"
      && (!element.hasAttribute("data-html2canvas-ignore") || options.overrideIgnore == true)
      && !hasClass(element, 'assist-no-show'));
  }

  function hasClass(element, cls) {
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
  }

	function isElementInViewport (el) {
		var rect = readCache.getBoundingClientRectForElement(el);

		return (
				(rect.bottom) >= 0
				&& (rect.top) < (element.ownerDocument.defaultView.innerHeight || element.ownerDocument.documentElement.clientHeight)
				&& (rect.right) >= 0
				&& (rect.left) < (element.ownerDocument.defaultView.innerWidth || element.ownerDocument.documentElement.clientWidth)
		);
	}

    function processCounters(counters, element) {
        if (getCSS(element, "display") !== "none") {
            // Process the counter CSS values for elements which will not be rendered at all to ensure that the counts match
            var updatedCounters = createCounters(counters,
                getCSS(element, "counter-reset"),
                getCSS(element, "counter-increment"));
            var before = window.getComputedStyle(element, ":before");
            if (before) {
                createCounters(counters, before["counter-reset"], before["counter-increment"]);
            }
            if (element.tagName.toUpperCase() != "IFRAME") {
                var children = Util.Children(element);
                for (var childIdx = 0; childIdx < children.length; childIdx++) {
                    var child = children[childIdx];

                    if (child.nodeType === child.ELEMENT_NODE) {
                        processCounters(updatedCounters, child);
                    }
                }
            }
            var after = window.getComputedStyle(element, ":after");
            if (after) {
                createCounters(counters, after["counter-reset"], after["counter-increment"]);
            }
        }
    }

    function parseElement (element, stack, isPseudoElement, redacted) {
      function retainSiblingCounters(previousStack) {
        if (previousStack && previousStack.counters) {
            for (var key in previousStack.counters) {
  	      if (previousStack.counters.hasOwnProperty(key)) {
  	          stack.previousElementCounters[key] = previousStack.counters[key];
  	      }
            }
        }
        return previousStack;
      }
    stack.redacted = redacted;

    var permissions = options.assistPermissions;
    var permissionToViewCallback = (permissions) ? permissions.callback : false;
    var permissionDefinitions = (permissions) ? permissions.definitions : false;
    
    if (redacted || hasClass(element, 'assist-no-show') 
        || (permissions && permissionToViewCallback(element, permissionDefinitions, redacted) == false)) { 
        
            renderHiddenElementAsNoShowColor(element, stack, getNoShowBgColor(element.ownerDocument));
            if (!ignoreElementsRegExp.test(element.nodeName)) {
                parseChildren(element, stack, isPseudoElement, true);
            }
        
    } else if (!redacted && isElementVisible(element)) {
        var ignored = false;
        if (ignoreElementsRegExp.test(element.nodeName)) {
            ignored = true;
        }

        if (isElementInViewport(element)) {
            if (ignored) {
                if (typeof options.iframeCacheCallback === "function" && element.nodeName.toUpperCase() == "IFRAME") {
                    var iframeImage = options.iframeCacheCallback(element);
                    if (!iframeImage) {
                        var iframeImageObj = images.iframeCoverImages.get(element);
                        iframeImage = (iframeImageObj) ? iframeImageObj.img : undefined;
                    }

                    renderIframe(element, iframeImage, stack);
                }

                if (typeof options.ignoredElementCallback === "function") {
                    options.ignoredElementCallback(element);
                }
            } else {
                stack = retainSiblingCounters(renderElement(element, stack, isPseudoElement, false)) || stack;
            }
        } else {
            stack = retainSiblingCounters(createStack(element, stack, getBoundsAndTransform(element), isPseudoElement));
            if (!isPseudoElement) {
                injectPseudoElements(element, stack);
            }
        }

        if (!ignored) {
            parseChildren(element, stack, isPseudoElement, false);
        }

    } else {
        // Process counters for elements  which are not rendered at all
        //createCounters(stack.counters, undefined, getCSS(element, "counter-increment"))
        processCounters(stack.counters, element);

        if (!ignoreElementsRegExp.test(element.nodeName) && getCSS(element, "visibility") == "hidden") {
            parseChildren(element, stack, isPseudoElement, false, true);
        }
    }
    return stack;
  }

  function renderIframe(element, img, parentStack) {

    var tuple = getBoundsAndTransform(element),
      bounds = tuple.bounds,
      stack = createStack(element, parentStack, tuple, false),
      borders = stack.borders,
      ctx = stack.ctx,
      borderData = parseBorders(element, bounds, borders);
    try {
        createShape(ctx, borderData.clip);

        ctx.save();
        ctx.clip();
        
        if (!img) {
            renderBackgroundColor(ctx, bounds, "#efefef");
        } else {
            iframeImages.set(element, img);
            drawImage(ctx, img, bounds.left, bounds.top);
        }

        ctx.restore();

        borderData.borders.forEach(function(border) {
            renderBorders(ctx, border.args, border.color);
        });
    } catch (e) {
    }

    return stack;
  }

  function renderHiddenElementAsNoShowColor(element, parentStack, color) {
      var tuple = getBoundsAndTransform(element),
      bounds = tuple.bounds,
      stack = createStack(element, parentStack, tuple,false),
      borders = stack.borders,
      ctx = stack.ctx,
      backgroundBounds = getBackgroundBounds(borders, bounds, stack.clip),
      borderData = parseBorders(element, bounds, borders);

      createShape(ctx, borderData.clip);

      ctx.save();
      ctx.clip();

      if (backgroundBounds.height > 0 && backgroundBounds.width > 0) {
        renderBackgroundColor(ctx, bounds, color);
      }

      ctx.restore();
      
      return stack;
  }

    function parseChildren(element, stack, isPseudoElement, redacted, ignoreText) {
        function parse(node) {
            if (node.nodeType === node.ELEMENT_NODE) {
                if (!isSelectListOption(element, node)) {
                    parseElement(node, stack, isPseudoElement, redacted);
                }
            } else if (node.nodeType === node.TEXT_NODE && !redacted && !ignoreText) {
                renderElementInViewPort(element, node, stack);
            }
        }

        var children = Util.Children(element);
        for (var i = 0; i < children.length; i++) {
            parse(children[i]);
        }
    }

  function renderElementInViewPort(element, node,stack) {
    if (isElementInViewport(element) && element.nodeName.toUpperCase() !== 'TEXTAREA') {
      renderText(element, {text: node}, stack);
    }
  }
  
  function isSelectListOption(parentNode, node) {
    return (parentNode.nodeName.toUpperCase() == "SELECT" && node.nodeName.toUpperCase() == "OPTION");
  }
 
  function isElementAListItem(element) {
    var nodeName = element.nodeName.toUpperCase();

    return (nodeName == 'LI');
  }

  function isWS(node) {
    return ((node.nodeType === Node.COMMENT_NODE) || ((node.nodeType === Node.TEXT_NODE) && !(/[^\t\n\r ]/.test(node.textContent)))) ;
  }

  function positioningElementIgnoringWS(node) {
    while (node) {
      if (isWS(node)) {
        node = node.nextSibling;
      } else {
        return node;
      }
    }
    return undefined;
  }

  function getFirstTextNodeOfElement(element) {
    var cIdx;
    for (cIdx = 0; cIdx < element.childNodes.length;cIdx++) {
      var child = element.childNodes[cIdx];
      if ((child.nodeType === Node.TEXT_NODE) && !isWS(child)) {
        return child;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        return getFirstTextNodeOfElement(child);
      }
    }
    return undefined;
  }

  function yPosOfTextNode(node, textHeight) {
    var bounds;
    if (_html2canvas.isIE || _html2canvas.isSafari) {
      var nonWSMatch = node.textContent.match(/^\s+/);
      var nonWSOffset = 0;
      if (nonWSMatch) {
        nonWSOffset = nonWSMatch[0].length;
      }
      bounds = textRangeBounds(node.textContent.substring(nonWSOffset, nonWSOffset + 1), node, nonWSOffset);
    } else {
      bounds = textRangeBounds(node.textContent.substring(0,1), node, 0);
    }
    return bounds.bottom - textHeight/2.0;
  }

  function yPosOfElement(element, positionRatio) {
    var bounds = getBoundsAndTransform(element).bounds;
    return bounds.bottom + positionRatio * bounds.height;
  }

  function getBulletPosition(element, padding, textHeight) {

    var position = {};
    var elBounds = getBoundsAndTransform(element).bounds;
    position.x = elBounds.left - padding;

    var positioningElement = positioningElementIgnoringWS(element.firstChild);

    if (positioningElement !== undefined) {
      var nodeName; 
      var txtNode;
  
      switch (positioningElement.nodeType) {
        case positioningElement.TEXT_NODE:
          position.y = yPosOfTextNode(positioningElement, textHeight);
          break;
        case positioningElement.ELEMENT_NODE:
          nodeName = positioningElement.nodeName.toUpperCase();
          switch (nodeName) {
            case "IMG":
            case "SVG":
              position.y = yPosOfElement(positioningElement, -0.1);
              break;
            case "UL":
              position.y = getBoundsAndTransform(positioningElement).bounds.top;
              break;
            case "TEXTAREA":
              if (_html2canvas.isIE) {
                position.y = yPosOfElement(positioningElement, -0.5);
              } else {
                position.y = yPosOfElement(positioningElement, 0.0);
              }
              break;
            default:
              if (positioningElement.textContent.length > 0) {
                txtNode = getFirstTextNodeOfElement(positioningElement);
                if (txtNode !== undefined) {
                  position.y = yPosOfTextNode(txtNode, textHeight);
                } else {
                  position.y = yPosOfElement(positioningElement, 0.5);
                }
              } else {
                position.y = yPosOfElement(positioningElement, 0.5);
              }
            }
            break;
        default:
            position.y = yPosOfElement(positioningElement, 0.5);
      }
    } else {
      position.y = elBounds.bottom + 0.5 * elBounds.height;
    }
    return position;
  }

  function renderBullet(element, stack) {
    var fontSize = getCSS(element.parentNode, "fontSize");
    var listStyleType = getCSS(element, "listStyleType");
    var bulletsDisplayed = getCSS(element, "display");

    var textWidth = parseFloat(fontSize, 10);
    var padding = textWidth * listItemPaddingMultiplier;

    if (bulletsDisplayed == false || bulletsDisplayed != "list-item") {
      return;
    }

    var position = getBulletPosition(element, padding, textWidth);

    switch (listStyleType) {
      case 'square':
        renderSquare(position, textWidth, stack.ctx);
        break;
      case 'circle':
        renderCircle(position, textWidth, stack.ctx);
        break;
      case 'disc':
      default:
        renderDisc(position, textWidth, stack.ctx);
        break;
      case 'decimal':
      case "decimal-leading-zero":
      case 'upper-alpha':
      case 'lower-alpha':
      case 'upper-roman':
      case 'lower-roman':
      case 'none':
        break;
    }
  }
 
  function renderSquare(position, textWidth, renderingContext2D) {
    var size = textWidth / 3;

    renderingContext2D.fillRect(position.x - size, position.y - (size / 2), size, size);
  }

  function renderCircle(position, textWidth, renderingContext2D) {
    var size = textWidth / 6;

    position.x -= size;
    renderingContext2D.beginPath();
    renderingContext2D.arc(position.x, position.y, size, 0, Math.PI * 2);
    renderingContext2D.closePath();
    renderingContext2D.stroke();
  }

  function renderDisc(position, textWidth, renderingContext2D) {
    var size = textWidth / 6;

    position.x -= size;
    renderingContext2D.beginPath();
    renderingContext2D.arc(position.x, position.y, size, 0, Math.PI * 2);
    renderingContext2D.closePath();
    renderingContext2D.fill();
  }

  function init() {
    var background = getCSS(element.ownerDocument.documentElement, "backgroundColor"),
      transparentBackground = (Util.isTransparent(background) && element === element.ownerDocument.body);
      
    var stack;
      
    var permissions = options.assistPermissions;
    var permissionToViewCallback = (permissions) ? permissions.callback : false;
    var permissionDefinitions = (permissions) ? permissions.definitions : false;
    
    if (permissions && permissionToViewCallback(element, permissionDefinitions) == false) {
        stack = renderHiddenElementAsNoShowColor(element, null, getNoShowBgColor(element.ownerDocument));
        parseChildren(element, stack, null, true);
    }
    else {
        if (options.isSubParse && !isElementVisible(element)) {
            var tuple = getBoundsAndTransform(element),
              bounds = tuple.bounds,
              image,
              stack = createStack(element, null, tuple, false);
            stack.clip = options.clip;

            processCounters(stack.counters, element);

            if (!ignoreElementsRegExp.test(element.nodeName) && getCSS(element, "visibility") == "hidden") {
                parseChildren(element, stack);
            }
        }
        else {
            stack = renderElement(element, null, false, transparentBackground);
            stack.clip = options.clip;
            parseChildren(element, stack);
        }
    }
    
    if (transparentBackground) {
      background = stack.backgroundColor;
    }

    body.removeChild(hidePseudoElements);

    return {
      backgroundColor: background,
      stack: stack,
      iframeImages: iframeImages,
      elementContexts: elementContexts
    };
  }

  return init();
};

function h2czContext(zindex) {
  return {
    zindex: zindex,
    children: []
  };
}

    function tokenizeContentString(content) {
        function findNextToken(content, start) {
            var nextChar = start;
            // The token should be everything before the next space which isn't in brackets or quotes
            var inBrackets = false;
            var inQuotes = false;
            var quoteChar;
            while (nextChar < content.length && content[nextChar] != " " || inBrackets || inQuotes) {
                if (content[nextChar] == "\\") {
                    nextChar++;
                } else if (!inQuotes && content[nextChar] == "(") {
                    inBrackets = true;
                } else if (!inQuotes && content[nextChar] == ")") {
                    inBrackets = false;
                } else if (inQuotes && content[nextChar] == quoteChar) {
                    inQuotes = false;
                } else if (!inQuotes && (content[nextChar] == '"' || content[nextChar] == "'")) {
                    inQuotes = true;
                    quoteChar = content[nextChar];
                }
                nextChar++;
            }
            return content.substring(start, nextChar);
        }
        var tokens = [];
        var i = 0;
        while (i < content.length) {
            // Look for the start of a token, I.e. not white space. As we will be working from a computed style this should always be a single white space
            if (' ' != content.charAt(i)) {
                var nextToken = findNextToken(content, i);
                i += nextToken.length;
                tokens[tokens.length] = nextToken;
            } else {
                i++;
            }
        }
        return tokens;
    }

_html2canvas.Preload = function( options ) {

  if (!images) {
      images = {
        numLoaded: 0,   // also failed are counted here
        numFailed: 0,
        numTotal: 0,
        iframeCoverImages: new Map(),
        cleanupDone: false
      }
  }

  var pageOrigin,
  Util = _html2canvas.Util,
  methods,
  i,
  count = 0,
  element = options.elements[0] || window.document.body,
  doc = element.ownerDocument,
  domImages = element.querySelectorAll("img,input[type=image]"),
  iframes = element.getElementsByTagName("iframe"),
  imgLen = domImages.length,
  link = doc.createElement("a"),
  supportCORS = (function( img ){
    return (img.crossOrigin !== undefined);
  })(new Image()),
  timeoutTimer;

  link.href = element.ownerDocument.defaultView.location.href;
  pageOrigin  = link.protocol + link.host;

  if(options.showBoundingTextRectangles) {
    _html2canvas.showBoundingTextRectangles = options.showBoundingTextRectangles;
  }

  function isSameOrigin(url){
    link.href = url;
    link.href = link.href; // YES, BELIEVE IT OR NOT, that is required for IE9 - http://jsfiddle.net/niklasvh/2e48b/
    var origin = link.protocol + link.host;
    return (origin === pageOrigin);
  }

  function start(){
    Util.log("html2canvas: start: images: " + images.numLoaded + " / " + images.numTotal + " (failed: " + images.numFailed + ")");
    if (!images.firstRun && images.numLoaded >= images.numTotal){
      Util.log("Finished loading images: # " + images.numTotal + " (failed: " + images.numFailed + ")");

      if (typeof options.complete === "function"){
        options.complete(images);
      }

    }
  }

  // TODO modify proxy to serve images with CORS enabled, where available
  function proxyGetImage(url, img, imageObj){
    var callback_name,
    scriptUrl = options.proxy,
    script;

    link.href = url;
    url = link.href; // work around for pages with base href="" set - WARNING: this may change the url

    callback_name = 'html2canvas_' + (count++);
    imageObj.callbackname = callback_name;

    if (scriptUrl.indexOf("?") > -1) {
      scriptUrl += "&";
    } else {
      scriptUrl += "?";
    }
    scriptUrl += 'url=' + encodeURIComponent(url) + '&callback=' + callback_name;
    script = doc.createElement("script");

    window[callback_name] = function(a){
      if (a.substring(0,6) === "error:"){
        imageObj.succeeded = false;
        images.numLoaded++;
        images.numFailed++;
        start();
      } else {
        setImageLoadHandlers(img, imageObj);
        img.src = a;
      }
      window[callback_name] = undefined; // to work with IE<9  // NOTE: that the undefined callback property-name still exists on the window object (for IE<9)
      try {
        delete window[callback_name];  // for all browser that support this
      } catch(ex) {}
      script.parentNode.removeChild(script);
      script = null;
      delete imageObj.script;
      delete imageObj.callbackname;
    };

    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", scriptUrl);
    imageObj.script = script;
    window.document.body.appendChild(script);

  }

  function loadPseudoElement(element, type) {
    var style = element.ownerDocument.defaultView.getComputedStyle(element, type),
    content = style.content;
      var tokens = tokenizeContentString(content);
      tokens.forEach(function(token) {
          if (token.length > 4 && token.substring(0, 4) == 'url(') {
              methods.loadImage(_html2canvas.Util.parseBackgroundImage(token)[0].args[0]);
          }
      });
    loadBackgroundImages(style.backgroundImage, element);
  }

  function loadPseudoElementImages(element) {
    loadPseudoElement(element, ":before");
    loadPseudoElement(element, ":after");
  }

  function loadGradientImage(backgroundImage, bounds) {
    var img = _html2canvas.Generate.Gradient(backgroundImage, bounds);

    if (img !== undefined){
      images[backgroundImage] = {
        img: img,
        succeeded: true
      };
      images.numTotal++;
      images.numLoaded++;
      start();
    }
  }

  function invalidBackgrounds(background_image) {
    return (background_image && background_image.method && background_image.args && background_image.args.length > 0 );
  }

  function loadBackgroundImages(background_image, el) {
    var bounds;

    _html2canvas.Util.parseBackgroundImage(background_image).filter(invalidBackgrounds).forEach(function(background_image) {
      if (background_image.method === 'url') {
        methods.loadImage(background_image.args[0]);
      } else if(background_image.method.match(/\-?gradient$/)) {
        if(bounds === undefined) {
          bounds = _html2canvas.Util.Bounds(el);
        }
        loadGradientImage(background_image.value, bounds);
      }
    });
  }

  function getImages (el) {
    var elNodeType = false;

    // Firefox fails with permission denied on pages with iframes
    try {
      Util.Children(el).forEach(getImages);
    }
    catch( e ) {}

    try {
      elNodeType = el.nodeType;
    } catch (ex) {
      elNodeType = false;
      Util.log("html2canvas: failed to access some element's nodeType - Exception: " + ex.message);
    }

    if (elNodeType === 1 || elNodeType === undefined) {
      loadPseudoElementImages(el);
      try {
        loadBackgroundImages(Util.getCSS(el, 'backgroundImage'), el);
      } catch(e) {
        Util.log("html2canvas: failed to get background-image - Exception: " + e.message);
      }
      loadBackgroundImages(el);
    }
  }

    function getDataUriContent(dataUri, shouldBase64Decode) {
        var contentMatch = dataUri.match(/.*,/i);
        if (!contentMatch) {
            return "";
        }

        var dataUriContent = dataUri.substr(contentMatch.index + contentMatch[0].length);

        var isBase64Encoded = /.*;base64,/.test(dataUri);
        if (shouldBase64Decode && isBase64Encoded) {
            dataUriContent = atob(dataUriContent);
        } else {
            try {
                dataUriContent = decodeURIComponent(dataUriContent);
            } catch (e) {
                window.console.log(e);
            }
        }

        return dataUriContent;
    }

    function getSvgDataUriDimensions(svgDataUri) {
        var isSvgDataUri = /data:image\/svg\+xml/.test(svgDataUri);
        if (!isSvgDataUri) {
          return undefined;
        }

        var dataUriContent = getDataUriContent(svgDataUri, true);

        var el = document.createElement("div");
        el.innerHTML = dataUriContent;

        var nodeList = el.querySelectorAll('svg');
        if (nodeList.length > 0) {
            var svgEl = nodeList[0];
            return {
                width: svgEl.width.animVal.value,
                height: svgEl.height.animVal.value
            };
        }
        else {
            return {
                width: 0,
                height: 0
            };
        }
    }

  function convertDataUriSvgImageForBrowserCompatibility(svgImage) {
    if (!_html2canvas.isSafari && !_html2canvas.isIE) {
        return svgImage;
    }

    var svgDataUriDimension = getSvgDataUriDimensions(svgImage.src);
    if (svgDataUriDimension) {
        var svgCanvas = document.createElement("canvas");
        svgCanvas.width = svgDataUriDimension.width;
        svgCanvas.height = svgDataUriDimension.height;

        if (_html2canvas.isSafari) {
            var svgCtx = svgCanvas.getContext("2d");
            svgCtx.drawImage(svgImage, 0, 0, svgDataUriDimension.width, svgDataUriDimension.height);

            return svgCanvas;
        }
        else {
            var dataUriContent = getDataUriContent(svgImage.src, true);
            canvg(svgCanvas, dataUriContent);

            return svgCanvas;
        }
    }
    else {
        return svgImage;
    }
  }

  function setImageLoadHandlers(img, imageObj) {
    
    if (imageObj.img instanceof XMLHttpRequest) {
        imageObj.img.onload = function() {
            var url = URL.createObjectURL(this.response);
            img.src = url;
            imageObj.img = img;

            done();
        }
    } else {
        img.onload = function() {
            imageObj.img = convertDataUriSvgImageForBrowserCompatibility(this);
            done();
        };
    }
    imageObj.img.onerror = function(e) {
      images.numLoaded++;
      images.numFailed++;
      imageObj.succeeded = false;
      img.onerror = img.onload = null;
      start();

      window.console.log(e);
    };
    function done() {
      if ( imageObj.timer !== undefined ) {
        // CORS succeeded
        window.clearTimeout( imageObj.timer );
      }

      images.numLoaded++;
      imageObj.succeeded = true;
      img.onerror = img.onload = null;
      start();
    }
    
    img.onerror = function() {
      if (img.crossOrigin === "anonymous") {
        // CORS failed
        window.clearTimeout( imageObj.timer );

        // let's try with proxy instead
        if ( options.proxy ) {
          var src = img.src;
          img = new Image();
          imageObj.img = img;
          img.src = src;

          proxyGetImage( img.src, img, imageObj );
          return;
        }
      }

      images.numLoaded++;
      images.numFailed++;
      imageObj.succeeded = false;
      img.onerror = img.onload = null;
      start();
    };
  }

  methods = {
      loadIframeImageCover: function(iframe) {
        var iframeBounds = iframe.getBoundingClientRect();

        if (iframeBounds.width === 0 || iframeBounds.height === 0) return;
        var width = iframeBounds.width, height = iframeBounds.height;

        var img = new Image(width, height);
        var tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        var tempCtx = tempCanvas.getContext("2d");

        tempCtx.beginPath();
        tempCtx.rect(0, 0, width, height);
        tempCtx.fillStyle = "#efefef";
        tempCtx.fill();

        var src = tempCanvas.toDataURL()
        img.src = src;

        var imageObj = {
            img: img
        };
        images.iframeCoverImages.set(iframe, imageObj);

        images.numTotal++;
        setImageLoadHandlers(img, imageObj);
      },
      loadImage: function (src) {
          try {
              var img, imageObj;
              if (src && images[src] === undefined) {
                  img = new Image();

                  var dataUriImageMatch = src.match(/data:image/i);

                  if (dataUriImageMatch && dataUriImageMatch[0] !== "") {
                        if (src.charAt(0) === "'" && src.charAt(src.length -1) === "'") {
                            img.src = src.substr(1, src.length -2);
                        }
                        else {
                            img.src = src;
                        }

                      img.src = _html2canvas.Util.unescapeQuotes(img.src);

                      imageObj = images[src] = {
                          img: img
                      };
                      images.numTotal++;
                      setImageLoadHandlers(img, imageObj);
                  }
                  else if (isSameOrigin(src) || options.allowTaint === true) {
                      imageObj = images[src] = {
                          img: img
                      };
                      images.numTotal++;
                      setImageLoadHandlers(img, imageObj);
                      img.src = src;
                  } else if (supportCORS && !options.allowTaint && options.useCORS) {

                      var url = src
                          + (src.indexOf("?") > -1 ? "&" : "?")
                          + "CORS=force";

                      var dataObj = img;

                      if (_html2canvas.isIE) {
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET", url, true);
                        xhr.responseType = 'blob';
                        dataObj = xhr;
                      }

                      img.crossOrigin = "anonymous";
                      imageObj = images[src] = {
                          img: dataObj
                      };
                      images.numTotal++;

                      setImageLoadHandlers(img, imageObj);

                      if (_html2canvas.isIE) {
                        xhr.send();
                      } else {
                        img.src = url;
                      }

                  } else if (options.proxy) {
                      imageObj = images[src] = {
                          img: img
                      };
                      images.numTotal++;
                      proxyGetImage(src, img, imageObj);
                  }
              }
          } catch (ex) {
              window.console.error("failed to load image ", src, ex);
          }
    },
    cleanupDOM: function(cause) {
      var img, src;
      if (!images.cleanupDone) {
        if (cause && typeof cause === "string") {
          Util.log("html2canvas: Cleanup because: " + cause);
        } else {
          Util.log("html2canvas: Cleanup after timeout: " + options.timeout + " ms.");
        }

        for (src in images) {
          if (images.hasOwnProperty(src)) {
            img = images[src];
            if (typeof img === "object" && img.callbackname && img.succeeded === undefined) {
              // cancel proxy image request
              window[img.callbackname] = undefined; // to work with IE<9  // NOTE: that the undefined callback property-name still exists on the window object (for IE<9)
              try {
                delete window[img.callbackname];  // for all browser that support this
              } catch(ex) {}
              if (img.script && img.script.parentNode) {
                img.script.setAttribute("src", "about:blank");  // try to cancel running request
                img.script.parentNode.removeChild(img.script);
              }
              images.numLoaded++;
              images.numFailed++;
              Util.log("html2canvas: Cleaned up failed img: '" + src + "' Steps: " + images.numLoaded + " / " + images.numTotal);
            }
          }
        }

        // cancel any pending requests
        if(window.stop !== undefined) {
          window.stop();
        } else if(document.execCommand !== undefined) {
          document.execCommand("Stop", false);
        }
        if (document.close !== undefined) {
          document.close();
        }
        images.cleanupDone = true;
        if (!(cause && typeof cause === "string")) {
          start();
        }
      }
    },

    renderingDone: function() {
      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer);
      }
    }
  };

  if (options.timeout > 0) {
    timeoutTimer = window.setTimeout(methods.cleanupDOM, options.timeout);
  }

  Util.log('html2canvas: Preload starts: finding background-images');
  images.firstRun = true;

  getImages(element);

  Util.log('html2canvas: Preload: Finding images');
  // load <img> images
  for (i = 0; i < imgLen; i+=1){
	  var imageLocation = domImages[i].src;
	  methods.loadImage( imageLocation );
  }

  for (var iframeIdx = 0, iframeLen = iframes.length; iframeIdx < iframeLen; iframeIdx++) {
    var iframe = iframes[iframeIdx];
    methods.loadIframeImageCover( iframe );
  }

  images.firstRun = false;
  Util.log('html2canvas: Preload: Done.');
  if (images.numTotal === images.numLoaded) {
    start();
  }

  return methods;
};

_html2canvas.Renderer = function(parseQueue, options){

  // http://www.w3.org/TR/CSS21/zindex.html
  function createRenderQueue(parseQueue) {
    var queue = [],
    rootContext;

    rootContext = (function buildStackingContext(rootNode) {
      var rootContext = {};
      function insert(context, node, specialParent) {
        var zi = (node.zIndex.zindex === 'auto') ? 0 : Number(node.zIndex.zindex),
        contextForChildren = context, // the stacking context for children
        isPositioned = node.zIndex.isPositioned,
        isFloated = node.zIndex.isFloated,
        stub = {node: node},
        childrenDest = specialParent; // where children without z-index should be pushed into

        if (node.zIndex.ownStacking) {
          // '!' comes before numbers in sorted array
          contextForChildren = stub.context = { '!': [{node:node, children: []}]};
          childrenDest = undefined;
        } else if (isPositioned || isFloated) {
          childrenDest = stub.children = [];
        }

        if (zi === 0 && specialParent) {
          specialParent.push(stub);
        } else {
          if (!context[zi]) { context[zi] = []; }
          context[zi].push(stub);
        }

        node.zIndex.children.forEach(function(childNode) {
          insert(contextForChildren, childNode, childrenDest);
        });
      }
      insert(rootContext, rootNode);
      return rootContext;
    })(parseQueue);

    function zOrder(a, b) {
        if (isNaN(a)) {
            return -1;
        } else if (isNaN(b)) {
            return 1;
        }
        return a-b;
    }

    function sortZ(context) {
      Object.keys(context).sort(zOrder).forEach(function(zi) {
        var nonPositioned = [],
        floated = [],
        positioned = [],
        list = [];

        // positioned after static
        context[zi].forEach(function(v) {
          if (v.node.zIndex.isPositioned || v.node.zIndex.opacity < 1) {
            // http://www.w3.org/TR/css3-color/#transparency
            // non-positioned element with opactiy < 1 should be stacked as if it were a positioned element with ‘z-index: 0’ and ‘opacity: 1’.
            positioned.push(v);
          } else if (v.node.zIndex.isFloated) {
            floated.push(v);
          } else {
            nonPositioned.push(v);
          }
        });

        (function walk(arr) {
          arr.forEach(function(v) {
            list.push(v);
            if (v.children) { walk(v.children); }
          });
        })(nonPositioned.concat(floated, positioned));

        list.forEach(function(v) {
          if (v.context) {
            sortZ(v.context);
          } else {
            queue.push(v.node);
          }
        });
      });
    }

    sortZ(rootContext);

    return queue;
  }

  function getRenderer(rendererName) {
    var renderer;

    if (typeof options.renderer === "string" && _html2canvas.Renderer[rendererName] !== undefined) {
      renderer = _html2canvas.Renderer[rendererName](options);
    } else if (typeof rendererName === "function") {
      renderer = rendererName(options);
    } else {
      throw new Error("Unknown renderer");
    }

    if ( typeof renderer !== "function" ) {
      throw new Error("Invalid renderer defined");
    }
    return renderer;
  }

  return getRenderer(options.renderer)(parseQueue, options, document, createRenderQueue(parseQueue.stack), _html2canvas);
};

_html2canvas.Util.unescapeQuotes = function(string) {
    return string.replace(/\\'/g, "'").replace(/\\"/g, '"');
}

_html2canvas.Util.Support = function (options, doc) {

  function supportSVGRendering() {
    var img = new Image(),
    canvas = doc.createElement("canvas"),
    ctx = (canvas.getContext === undefined) ? false : canvas.getContext("2d");
    if (ctx === false) {
      return false;
    }
    canvas.width = canvas.height = 10;
    img.src = [
    "data:image/svg+xml,",
    "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'>",
    "<foreignObject width='10' height='10'>",
    "<div xmlns='http://www.w3.org/1999/xhtml' style='width:10px;height:10px;'>",
    "sup",
    "</div>",
    "</foreignObject>",
    "</svg>"
    ].join("");
    try {
      ctx.drawImage(img, 0, 0);
      canvas.toDataURL();
    } catch(e) {
      return false;
    }
    _html2canvas.Util.log('html2canvas: Parse: SVG powered rendering available');
    return true;
  }

  return {
    svgRendering: options.svgRendering && supportSVGRendering()
  };
};
window.html2canvas = function(elements, opts) {
  elements = (elements.length) ? elements : [elements];
  var queue,
  canvas,
  options = {
    // general
    logging: false,
    elements: elements,
    background: "#fff",

    // preload options
    proxy: null,
    timeout: 0,    // no timeout
    useCORS: false, // try to load images as CORS (where available), before falling back to proxy
    allowTaint: false, // whether to allow images to taint the canvas, won't need proxy if set to true

    // parse options
    svgRendering: false, // use svg powered rendering where available (FF11+)
    ignoreElements: "IFRAME|OBJECT|PARAM",
    useOverflow: true,
    letterRendering: false,
    chinese: false,

    // render options

    width: null,
    height: null,
    taintTest: true, // do a taint test with all images before applying to canvas
    renderer: "Canvas"
  };

  readCache = _html2canvas.elementReadCache();

  options = _html2canvas.Util.Extend(opts, options);

  _html2canvas.logging = options.logging;
  options.complete = function( images ) {

    if (typeof options.onpreloaded === "function") {
      if ( options.onpreloaded( images ) === false ) {
        return;
      }
    }
    queue = _html2canvas.Parse( images, options );

    if (typeof options.onparsed === "function") {
      if ( options.onparsed( queue ) === false ) {
        return;
      }
    }

    var renderWaitTimeMs = 50;
    setTimeout(function() {
       canvas = _html2canvas.Renderer( queue, options );

       if (typeof options.onrendered === "function") {
         options.onrendered( canvas );
       }

       if (options.scale && options.scaledCanvas && typeof options.onScaledCanvasRendered === "function") {
         options.onScaledCanvasRendered(options.scaledCanvas);
       }
    }, renderWaitTimeMs);
  };

  // for pages without images, we still want this to be async, i.e. return methods before executing
  window.setTimeout( function(){
    _html2canvas.Preload( options );
  }, 0 );

  return {
    render: function( queue, opts ) {
      return _html2canvas.Renderer( queue, _html2canvas.Util.Extend(opts, options) );
    },
    parse: function( images, opts ) {
      readCache.clear();
      return _html2canvas.Parse( images, _html2canvas.Util.Extend(opts, options) );
    },
    preload: function( opts ) {
      return _html2canvas.Preload( _html2canvas.Util.Extend(opts, options) );
    },
    log: _html2canvas.Util.log
  };
};

window.html2canvas.log = _html2canvas.Util.log; // for renderers
window.html2canvas.Renderer = {
  Canvas: undefined // We are assuming this will be used
};
_html2canvas.Renderer.Canvas = function(options) {
  options = options || {};

  var doc = document,
  safeImages = [],
  testCanvas = document.createElement("canvas"),
  testctx = testCanvas.getContext("2d"),
  Util = _html2canvas.Util,
  canvas = options.canvas || (( options.elements === undefined ) ? window.document.body : options.elements[0]).ownerDocument.createElement('canvas');

  function createShape(ctx, args) {
    ctx.beginPath();
    args.forEach(function(arg) {
      ctx[arg.name].apply(ctx, arg['arguments']);
    });
    ctx.closePath();
  }

  function safeImage(item) {
    if (safeImages.indexOf(item['arguments'][0].src ) === -1) {
      try {
        testctx.drawImage(item['arguments'][0], 0, 0);
        testctx.getImageData(0, 0, 1, 1);
      } catch(e) {
        testCanvas = doc.createElement("canvas");
        testctx = testCanvas.getContext("2d");
        return false;
      }
      safeImages.push(item['arguments'][0].src);
    }
    return true;
  }

  function renderItem(ctx, item) {
    switch(item.type){
      case "variable":
        ctx[item.name] = item['arguments'];
        break;
      case "function":
        switch(item.name) {

          case "createPattern":
            if (item['arguments'][0].width > 0 && item['arguments'][0].height > 0) {
              try {
                ctx.fillStyle = ctx.createPattern(item['arguments'][0], "repeat");
              }
              catch(e) {
                Util.log("html2canvas: Renderer: Error creating pattern", e.message);
              }
            }
            break;
          case "drawShape":
            createShape(ctx, item['arguments']);
            break;
          case "drawImage":
            if (options.taintTest && !safeImage(item)) break;
            if (item['arguments'].length > 7) {
                if (item['arguments'][8] <= 0 || item['arguments'][7] <= 0) {
                    break;
                }
            }

            ctx.drawImage.apply( ctx, item['arguments'] );

            break;
          default:
            ctx[item.name].apply(ctx, item['arguments']);
        }
        break;
    }
  }

  return function(parsedData, options, document, queue, _html2canvas) {
    var ctx = canvas.getContext("2d"),
    newCanvas,
    bounds,
    fstyle,
    zStack = parsedData.stack,
    backgroundFillStyle,
    scaledCanvas,
    scaledCtx,
    originalWidth,
    originalHeight;

    canvas.width = canvas.style.width = originalWidth = options.width || zStack.ctx.width;
    canvas.height = canvas.style.height = originalHeight = options.height || zStack.ctx.height;

    fstyle = ctx.fillStyle;
    backgroundFillStyle = (Util.isTransparent(zStack.backgroundColor) && options.background !== undefined) ? options.background : parsedData.backgroundColor;
    ctx.fillStyle = backgroundFillStyle
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if(options.scale) {
        canvas.width *= options.scale;
        canvas.height *= options.scale;
        scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = canvas.width;
        scaledCanvas.height = canvas.height;
        scaledCtx = scaledCanvas.getContext("2d");
        scaledCtx.fillStyle = backgroundFillStyle;
        scaledCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
        ctx.save();
        ctx.scale(options.scale, options.scale);
    }
    
    ctx.fillStyle = fstyle;

    queue.forEach(function(storageContext) {
      // set common settings for canvas
      ctx.textBaseline = "bottom";
      ctx.save();

     if (storageContext.transform.matrix) {
       ctx.translate(storageContext.transform.origin[0], storageContext.transform.origin[1]);
       ctx.transform.apply(ctx, storageContext.transform.matrix);
       ctx.translate(-storageContext.transform.origin[0], -storageContext.transform.origin[1]);
     }

      if (storageContext.clip){
        ctx.beginPath();
        ctx.rect(storageContext.clip.left, storageContext.clip.top, storageContext.clip.width, storageContext.clip.height);
        ctx.clip();
      }

      if (storageContext.ctx.storage) {
        storageContext.ctx.storage.forEach(function(item) {
          renderItem(ctx, item);
        });
      }

      ctx.restore();
    });

    Util.log("html2canvas: Renderer: Canvas renderer done - returning canvas obj");
    
    if(options.scale) {
        scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height, 0, 0, scaledCanvas.width, scaledCanvas.height);
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        ctx.restore();
        ctx.drawImage(scaledCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height, 0, 0, canvas.width, canvas.height);
        options.scaledCanvas = scaledCanvas;
    }

    if (options.elements.length === 1) {
      if (typeof options.elements[0] === "object" && options.elements[0].nodeName !== "BODY") {
        // crop image to the bounds of selected (single) element
        bounds = _html2canvas.Util.Bounds(options.elements[0]);
        newCanvas = document.createElement('canvas');
        newCanvas.width = Math.ceil(bounds.width);
        newCanvas.height = Math.ceil(bounds.height);
        ctx = newCanvas.getContext("2d");

        if (bounds.height > 0 && bounds.width > 0) {
            ctx.drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
        }
        canvas = null;
        return newCanvas;
      }
    }

    return canvas;
  };
};
})(window,document);
