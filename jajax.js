/**
 *  jQuery-like AJAX for any environment
 *  (Browser, Firefox, Chrome and Safari Extensions).
 *
 *  Ex: jajax(options: object, ondone: function, onerror: function)
 *          function ondone(result, statusText, xhr[, response]);
 *          function onerror(xhr, type: "error"|"parsererror"|"abort"|"timeout", error[, response]);
 *
 *          On Firefox there is response object instead of XHR, xhr is a plain object
 *
 *  @license MIT
 *  @version 1.0.3
 *  @git https://github.com/duzun/jAJAX
 *  @umd AMD, Browser, CommonJs
 *  @author DUzun.Me
 */
/*global XMLHttpRequest | ActiveXObject, setTimeout, clearTimeout, JSON */
;(function (name, root, Object, Array, Function, Date) {
    var undefined
    ,   NIL   = ''
    ,   UNDEFINED = undefined + NIL
    ,   FUNCTION = 'function'
    ;
    (typeof define != FUNCTION || !define.amd
        ? typeof module != UNDEFINED && module.exports
            ? function (deps, factory) { module.exports = factory(); } // CommonJs
            : function (deps, factory) { root[name] = factory(); } // Browser
        : define // AMD
    )
    /*define*/([], function factory() {
        // -------------------------------------------------------------
        var TRUE  = true
        ,   FALSE = false
        ,   NULL  = null
        ,   noop  = Object.noop || function () {} // Object.noop - well, I practice such things :-)
        ,   __    = Object.prototype
        ,   hop   = __.hasOwnProperty
        ,   tos   = __.toString
        ,   now = typeof Date.now == FUNCTION
                    ? function () { return Date.now(); }
                    : function () { return new Date.getTime(); }
        ,   LENGTH = 'length'
        ;
        // -------------------------------------------------------------
        // Helpers
        // ---------------------------------------------------------------------------
        var type = function type(obj) {
            // IE gives us some surprises
            if(obj === null) return 'Null';
            if(obj === undefined) return 'Undefined';
            return tos.call(obj).slice(8, -1);
        } ;
        var isFunction = function isFunction(obj) {
            return obj instanceof Function || type(obj) == 'Function';
        } ;
        var isArray = isFunction(Array.isArray)
            ? Array.isArray
            : (Array.isArray = function isArray(obj) {
                return obj instanceof Array || type(obj) == 'Array';
            })
        ;
        var isArrayLike = function isArrayLike(obj) {
            return hop.call(obj, LENGTH) && typeof obj[LENGTH] === 'number' && !isFunction(obj);
        } ;
        // var isString = function isString(obj) {
            // return obj instanceof String || type(obj) == 'String';
        // } ;
        // -------------------------------------------------------------
        var each = function each(o, f) {
            if(!o) return o;
            var i, s, l;
            if ( isArray(o) || isArrayLike(o) ) {
                for(i=0,l=o[LENGTH]>>>0; i<l; i++) if(hop.call(o, i)) {
                    s = o[i];
                    if(f.call(s, i, s, o) === FALSE) return i;
                }
            }
            else {
                for(i in o) if(hop.call(o, i)) {
                    s = o[i];
                    if(f.call(s, i, s, o) === FALSE) return i;
                }
            }
            return o
        } ;
        // -------------------------------------------------------------
        var extend = function extend(o) {
            function cpy(i,s) { o[i] = s };
            each(arguments, function (i,a) { i && each(a, cpy) });
            return o
        } ;
        // -------------------------------------------------------------
        var TIMERS = typeof self !== UNDEFINED && typeof self.setTimeout == FUNCTION
                    ? self
                    : root
        ;
        if( typeof TIMERS.setTimeout != FUNCTION ) {
            if( typeof require !== UNDEFINED ) {
                // Firefox
                TIMERS = require('sdk/timers');
            }
        }

        var setTimeout    = TIMERS.setTimeout
        ,   clearTimeout  = TIMERS.clearTimeout
        ;
        // -------------------------------------------------------------
        var allTypes = "*/" + "*"
        ,   accepts = {
                "*" : allTypes,
                text: "text/plain",
                html: "text/html",
                xml : "application/xml, text/xml",
                json: "application/json, text/javascript"
            }
        ;
        // -------------------------------------------------------------
        // AJAX method itself
        var jajax = function jajax(o,done,fail) {
            var xhr = jajax.createXHR(FALSE);
            if(!xhr) {
                fail && fail(NULL, 'xhr', 'Couldn\'t create XHR object');
                return xhr
            }

            if(typeof o == 'string') o = {url:o};

            o = extend({
                url        : '',    // String
                type       : 'GET', // String
                cache      : FALSE, // Bool
                timeout    : NULL,  // Number
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8', // String
                dataType   : '',    // String
                mimeType   : '',    // String
                data       : NULL,  // Object
                headers    : NULL,  // Object
                error      : NULL,  // Function
                success    : NULL   // Function
            }, o);

            var headers = {}
            ,   setHeader = function(name, value) { headers[name.toLowerCase()] = [name, value] }
            ,   type = o.type
            ,   abort_to
            ,   onerror = function (error, type, xh, res) {
                    if(o.error) {
                        o.error(xh || res, type, error, res);
                    }
                    if(fail) {
                        fail(xh || res, type, error, res);
                    }
                }
            ,   onsuccecc = function (xh, res) {
                    var result = xh.responseText
                    ,   dataType = o.dataType || jajax.mimeToDataType(o.mimeType || xh.getResponseHeader('content-type'))
                    ,   error
                    ;
                    try {
                        switch(dataType) {
                            case 'json': {
                                result = 'responseJSON' in xh ? xh.responseJSON : (/^\s*$/.test(result) ? NULL : jajax.parseJSON(result));
                            } break;

                            case 'xml': {
                                result = xh.responseXML;
                            } break;

                            case 'script': {
                                // http://perfectionkills.com/global-eval-what-are-the-options/
                                (1,eval)(result);
                            } break;

                            case 'text':
                            default: {
                                // result = xh.responseText
                            } break;
                        }
                    } catch (e) { error = e }

                    if (error) onerror(error, 'parsererror', xh, res)
                    else {
                        if (o.success) {
                            o.success(result, xh.statusText, xh, res);
                        }
                        if(done) {
                            done(result, xh.statusText, xh, res);
                        }
                    }
                }
            ,   oncomplete = function (xh, res) {
                    abort_to && clearTimeout(abort_to);
                    if( (xh.status >= 200 && xh.status < 300) || xh.status == 304 ) {
                        onsuccecc(xh, res);
                    }
                    else {
                        onerror(xh.statusText || NULL, xh.status ? 'error' : 'abort', xh, res);
                    }
                }
            ;

            each({'X-Requested-With': 'XMLHttpRequest'}, setHeader);

            if(o.contentType) {
                setHeader('Content-Type', o.contentType);
            }
            setHeader('Accept', (accepts[o.dataType] ? accepts[o.dataType] + ', ': '') + allTypes + '; q=0.01');

            each(o.headers, setHeader);

            if(jajax.xhr_type == 'REQUEST') {
                each(o.data, function (n,v,d) { if(v == NULL) delete d[n]; });
                var h = {
                        url: o.url,
                        content: o.data ? o.data : {},
                        headers: {},
                        onComplete: function(res) {
                            if(h.aborted) return;
                            var _xhr = {
                                'getResponseHeader': function(name) {
                                    return res.headers[name];
                                },
                                'status': res.status,
                                'statusText': res.statusText,
                                'responseText': res.text,
                                'responseJSON': res.json
                            };
                            oncomplete(_xhr, res);
                        }
                    }
                ;
                each(headers, function (i,a) { if(a[0] && a[0] != NULL) h.headers[a[0]] = a[1] });
                if(o.contentType) h.contentType = o.contentType

                if (o.timeout > 0) abort_to = setTimeout(function() {
                    h.aborted = now();
                    // xhr.abort(); // @todo: abort request
                    onerror(NULL, 'timeout', xhr);
                }, o.timeout);

                type = type.toLowerCase();
                try {
                    xhr.Request(h)[type]();
                }
                catch(er) {
                    // If method type not supported. try to override it
                    try {
                        h.headers['X-HTTP-Method-Override'] = type.toUpperCase();
                        xhr.Request(h)['post']();
                    }
                    catch(er) {
                        // If override doesn't work, try XHR - synchronous in FF
                        switch (type) {
                            case 'delete': {
                                // Firefox REQUEST object doesn't support DELETE,
                                // need to create manual xhr object
                                var XHR = require("sdk/net/xhr");
                                var req = new XHR.XMLHttpRequest();
                                req.open(type, o.url);
                                each(h.headers, function (n,v) { req.setRequestHeader(n, v) });
                                req.send();
                                oncomplete(req);
                            } break;
                            default: throw er;
                        }
                    }
                }
            }
            else {
                type = type.toUpperCase();
                xhr.open(type, o.url, TRUE);

                each(headers, function (i,a) { if(a[1] != NULL) xhr.setRequestHeader( a[0], a[1] + NIL ) });

                if (o.timeout > 0) abort_to = setTimeout(function() {
                    xhr.onreadystatechange = noop;
                    xhr.abort();
                    onerror(NULL, 'timeout', xhr);
                }, o.timeout);

                var callback = function() {
                    if (xhr.readyState == 4) {
                        xhr.onreadystatechange = noop;
                        oncomplete(xhr);
                    }
                };

                xhr.send(o.data ? jajax.param(o.data) : NULL);

                if(xhr.readyState === 4) {
                    // (IE6 & IE7) if it's in cache and has been
                    // retrieved directly we need to fire the callback
                    setTimeout( callback );
                }
                else {
                    xhr.onreadystatechange = callback;
                }
            }

            return xhr;
        };

        ;(function (escape, JSON, $) {
            function serialize(params, obj, traditional, scope) {
                var type
                ,   array = isArray(obj)
                ,   hash = obj && obj !== root && !array && Object.getPrototypeOf(obj) === __
                ;
                each(obj, function(key, value) {
                    type = isArray(value) ? 'array' : typeof(value);
                    if (scope) key = traditional ? scope :
                        scope + '[' + (hash || type == 'object' || type == 'array' ? key : '') + ']'
                    // handle data in serializeArray() format
                    if (!scope && array) params.add(value.name, value.value)
                    // recurse into nested objects
                    else if (type == "array" || (!traditional && type == "object"))
                        serialize(params, value, traditional, key)
                    else params.add(key, value)
                })
            };

            $.param = function(obj, traditional) {
                var params = [];
                params.add = function(k, v) { this.push( escape(k) + ( v == NULL ? '' : '=' + escape(v) ) ) };
                serialize(params, obj, traditional);
                return params.join('&').replace(/%20/g, '+');
            };

            var scriptTypeRE = /^(?:text|application)\/javascript/i
            ,   xmlTypeRE = /^(?:text|application)\/xml/i
            ,   jsonType = 'application/json'
            ,   htmlType = 'text/html'
            ;
            $.mimeToDataType = function (mime) {
                if (mime) mime = mime.split(';', 2)[0]
                return  mime && (
                            mime == htmlType ? 'html' :
                            mime == jsonType ? 'json' :
                            scriptTypeRE.test(mime) ? 'script' :
                            xmlTypeRE.test(mime) && 'xml'
                        ) || 'text'
            };

            var _jdec = JSON && JSON.parse || root.json_decode;
            $.parseJSON = function (text) {
                try { return _jdec(text) }
                catch(err) {
                    // Try to remove one line comments
                    var txt = text.replace(/[\n\r]+\s*\/\/[^\n\r]*/g, '');
                    if(txt != text) {
                        return _jdec(txt);
                    }
                    throw err
                }
            }

            // Functions to create xhrs
            $.createXHR = function (xhr) {
                var meths = {
                    XMLHttpRequest: function _XMLHttpRequest() { return new root.XMLHttpRequest() }
                  , MSXML2 : function _MS2XMLHTTP()  { return new ActiveXObject( 'Msxml2.XMLHTTP' ) }
                  , MSXML  : function _MSXMLHTTP()   { return new ActiveXObject( 'Microsoft.XMLHTTP' ) }
                  , MSXML24: function _MS2XMLHTTP4() { return new ActiveXObject( 'Msxml2.XMLHTTP.4.0' ) }
                    // Lacks DELETE method
                  , REQUEST: function _REQUEST() {
                        // synchronous only and experimental
                        // var XHR = require("sdk/net/xhr");

                        var xhr = _REQUEST.xhr || (_REQUEST.xhr = require("sdk/request"));
                        return xhr
                    }
                }
                each(meths, function (type, _xhr) {
                    try {
                        xhr = _xhr();
                        $.createXHR = _xhr;
                        $.xhr_type = type;
                        return FALSE;
                    }
                    catch( e ) { }
                })
                return xhr
            };

            // Check if XHR is supported
            $.xhr_supported = $.createXHR(FALSE);
        }
        (encodeURIComponent, JSON, jajax));

        jajax.name = name;

        return jajax;
    });
}
('jajax', this, Object, Array, Function, Date));

