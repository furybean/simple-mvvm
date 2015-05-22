var Class = require('jsface').Class;
var Directive = require('./directive');

var EventDirective = Class(Directive, {
  isPair: true,
  constructor: function(options) {
    if (options) {
      if (options.key !== undefined) {
        this.event = options.key;
      }
    }
    EventDirective.$super.call(this, options);
  },
  bind: function() {
    EventDirective.$super.prototype.bind.call(this);
    if (this.element) {
      this.element.addEventListener(this.event, this.valueFn, false);
    }
  },
  update: function() {
  }
});

module.exports = EventDirective;