var Class = require('jsface').Class;
var Directive = require('./directive');

var TextDirective = Class(Directive, {
  constructor: function(options) {
    TextDirective.$super.call(this, options);
  },

  update: function() {
    var text = this.valueFn();
    if (text !== undefined && text !== null) {
      text = '' + text;
    } else {
      text = '';
    }

    var element = this.element;
    if (element.nodeType === 3) {
      this.element.nodeValue = text;
    } else if (element.nodeType === 1) {
      this.element.innerText = text;
    }
  }
});

module.exports = TextDirective;
