var Class = require('jsface').Class;
var Directive = require('./directive');

var ClassDirective = Class(Directive, {
  isPair: true,
  constructor: function(options) {
    if (options) {
      if (options.key !== undefined) {
        this.className = options.key;
      }
    }
    ClassDirective.$super.call(this, options);
  },
  update: function() {
    if (this.className && this.className && this.valueFn) {
      var value = !!this.valueFn();
      if (value) {
        this.element.classList.add(this.className);
      } else {
        this.element.classList.remove(this.className);
      }
    }
  }
});

module.exports = ClassDirective;