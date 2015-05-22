var Class = require('jsface').Class;

var directiveMap = {};

var registerDirective = function(name, directive) {
  if (name && typeof directive === 'function') {
    directiveMap[name] = directive;
  }
};

var createDirective = function(name, options) {
  if (!name) return;
  var createFn = directiveMap[name];
  return new createFn(options);
};

var RepeatDirective = require('./directive/repeat');
var AttrDirective = require('./directive/attr');
var TextDirective = require('./directive/text');
var ClassDirective = require('./directive/class');
var EventDirective = require('./directive/event');
var ModelDirective = require('./directive/model');

registerDirective('d-repeat', RepeatDirective);
registerDirective('d-attr', AttrDirective);
registerDirective('d-text', TextDirective);
registerDirective('d-class', ClassDirective);
registerDirective('d-event', EventDirective);
registerDirective('d-model', ModelDirective);

var events = ['click', 'dblclick', 'mousedown', 'mouseup', 'focus', 'blur'];

var addEventDir = function(event) {
  registerDirective('d-' + event, Class(EventDirective, {
    isPair: false,
    constructor: function(options) {
      EventDirective.call(this, options);
    },
    event: event
  }));
};

for (var i = 0, j = events.length; i < j; i++) {
  var event = events[i];
  addEventDir(event);
}

module.exports = {
  register: registerDirective,
  create: createDirective,
  isPair: function(type) {
    var fn = directiveMap[type];
    if (!fn) return false;
    return !!fn.prototype.isPair
  },
  has: function(type) {
    return type in directiveMap;
  }
};