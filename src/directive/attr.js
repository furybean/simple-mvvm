var Class = require('jsface').Class;
var Directive = require('./directive');

var AttrDirective = Class(Directive, {
  constructor: function(options) {
    if (options) {
      if (options.attr !== undefined) {
        this.attr = options.attr;
      }
    }
    AttrDirective.$super.call(this, options);
  },
  update: function() {
    if (this.attr && this.element && this.valueFn) {
      this.element[this.attr] = this.valueFn() || '';
    }
  }
});

module.exports = AttrDirective;