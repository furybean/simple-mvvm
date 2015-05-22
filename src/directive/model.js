var Class = require('jsface').Class;
var Directive = require('./directive');

var setter = function(obj, path, newValue) {
  if (!obj || !path) return;
  var paths = path.split('.'), target = obj;
  for (var i = 0, j = paths.length; i < j; i++) {
    var subPath = paths[i], value = target[subPath];
    if (i == j - 1) {
      target[subPath] = newValue;
    } else {
      if (value)
        target = value;
      else
        return;
    }
  }
};

var ModelDirective = Class(Directive, {
  constructor: function(options) {
    ModelDirective.$super.call(this, options);
  },
  bind: function() {
    var directive = this;

    ModelDirective.$super.prototype.bind.call(this, arguments);

    var element = directive.element;

    var listener = function() {
      if (element.type === 'checkbox') {
        setter(directive.context, directive.expression, element.checked);
      } else {
        setter(directive.context, directive.expression, element.value);
      }
    };

    element.addEventListener('keyup', listener, false);
    element.addEventListener('change', listener, false);
  },
  update: function() {
    var value = this.valueFn();
    var element = this.element;

    if (element) {
      if (element.type === 'checkbox') {
        value = !!value;
        if (element.checked !== value) {
          element.checked = value;
        }
      } else {
        if (element.value !== value) {
          element.value = value;
        }
      }
    }
  }
});

module.exports = ModelDirective;