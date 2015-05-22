var Observed = require('observed');

var ViewModel = function(object) {
  if (!object) return;

  var callbackMap = {};
  var observer = Observed(object);
  var emptyArray = [];

  object.$watch = function(path, callback) {
    var callbacks = callbackMap[path];
    if (!callbacks) {
      callbacks = callbackMap[path] = [];
    }
    callbacks.push(callback);
  };

  object.$unwatch = function(path, callback) {
    var callbacks = callbackMap[path];
    if (callbacks) {
      if (callback) {
        for (var i = 0, j = callbacks.length; i < j; i++) {
          if (callback === callbacks[i]) {
            callbacks.splice(i, 1);
            break;
          }
        }
      } else {
        callbackMap[path] = [];
      }
    }
  };

  object.$extend = function() {
    return ViewModel(Object.create(this));
  };

  object.$destroy = function() {
    for (var path in callbackMap) {
      if (callbackMap.hasOwnProperty(path)) {
        var callbacks = callbackMap[path] || emptyArray;

        for (var i = 0, j = callbacks.length; i < j; i++) {
          var callback = callbacks[i];
          if (typeof callback === 'object' && callback.destroy) {
            callback.destroy();
          }
        }
      }
    }

    callbackMap = {};
  };

  observer.on('changed', function(change) {
    var path = change.path;
    if (path && path.charAt(0) === '$') return;

    var callbacks = callbackMap[path] || emptyArray;

    for (var i = 0, j = callbacks.length; i < j; i++) {
      var callback = callbacks[i];
      if (typeof callback === 'object' && callback.update) {
        callback.update();
      } else if (typeof callback === 'function') {
        callback(change);
      }
    }
  });

  return object;
};

module.exports = ViewModel;