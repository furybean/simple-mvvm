var Class = require('jsface').Class;
var Directive = require('./directive');
var compileExpr = require('../parse/expr').compile;

function newContext(context) {
  if (context.$extend) {
    return context.$extend();
  }
  var empty = function() {};
  empty.prototype = context;

  return new empty();
}

function insertAfter(newChild, refElement) {
  if (refElement) {
    refElement.parentNode.insertBefore(newChild, refElement.nextSibling);
  }
}

var RepeatDirective = Class(Directive, {
  constructor: function(options) {
    RepeatDirective.$super.call(this, options);
  },

  diff: function (current) {
    var nameOfKey = this.nameOfKey;
    var trackByFn = this.trackByFn;

    var currentMap = {};
    var prevContext = null;

    for (var i = 0, j = current.length; i < j; i++) {
      var item = current[i];

      var subContext = newContext(this.context);
      subContext.$index = i;
      subContext.$prev = prevContext ? trackByFn.call(prevContext) : null;
      subContext[nameOfKey] = item;

      currentMap[trackByFn.call(subContext)] = subContext;

      prevContext = subContext;
    }

    var removed = [];
    var added = [];
    var moved = [];

    var lastMap = this.lastMap || {};

    for (var lastKey in lastMap) {
      if (lastMap.hasOwnProperty(lastKey)) {
        var lastContext = lastMap[lastKey];
        var currentContext = currentMap[lastKey];
        if (!currentContext) {
          removed.push(lastContext);
        } else if (currentContext && lastContext &&
          currentContext[nameOfKey] !== lastContext[nameOfKey]) { // when track by $index
          removed.push(lastContext);
          added.push(currentContext);
        }
      }
    }

    for (var currentKey in currentMap) {
      if (currentMap.hasOwnProperty(currentKey)) {
        var context = currentMap[currentKey];
        var prev = context.$prev;
        if (!lastMap[currentKey]) {
          added.push(context);
        } else if (lastMap[currentKey].$prev !== prev) {
          moved.push(context);
        }
      }
    }

    this.lastMap = currentMap;

    return {
      added: added,
      moved: moved,
      removed: removed
    };
  },

  patch: function (patch) {
    var itemElementMap = this.itemElementMap;
    if (!itemElementMap) {
      itemElementMap = this.itemElementMap = {};
    }

    var childTemplate = this.childTemplate;
    var trackByFn = this.trackByFn;
    var commentNode = this.refNode;

    var added = patch.added;
    var removed = patch.removed;
    var moved = patch.moved;

    removed.forEach(function (removeContext) {
      var key = trackByFn.apply(removeContext);
      var el = itemElementMap[key];
      if (el) {
        el.parentNode && el.parentNode.removeChild(el);
      }
      removeContext.$destroy && removeContext.$destroy();
      delete itemElementMap[key];
    });

    added.forEach(function (newContext) {
      var compile = require('../compile');
      var element = childTemplate.cloneNode(true);

      compile(element, newContext);

      var prevKey = newContext.$prev;
      var refNode;

      if (prevKey !== null && prevKey !== undefined) {
        refNode = itemElementMap[prevKey];
      } else {
        refNode = commentNode;
      }

      insertAfter(element, refNode);

      itemElementMap[trackByFn.call(newContext)] = element;
    });

    moved.forEach(function(moveContext) {
      var key = trackByFn.apply(moveContext);
      var el = itemElementMap[key];
      if (!el) {
        throw new Error('some error happen when diff');
      }

      var prevKey = moveContext.$prev;
      var refNode;

      if (prevKey) {
        refNode = itemElementMap[prevKey];
      } else {
        refNode = commentNode;
      }

      insertAfter(el, refNode);
    })
  },

  update: function() {
    var array = this.valueFn() || [];

    var patches = this.diff(array);
    this.patch(patches);
  },

  parseDefinition: function () {
    var definition = this.expression;
    var nameOfKey;
    var valueExpression;
    var trackByExpression;

    var matches = definition.match(/\s*([\d\w]+)\s+in\s+(.+)\s+track\s+by\s+(.+)/);

    if (matches) {
      nameOfKey = matches[1];
      valueExpression = matches[2];
      trackByExpression = matches[3];
    } else {
      matches = definition.match(/\s*([\d\w]+)\s+in\s+(.+)/);
      if (!matches) {
        throw 'Wrong definition of ng-repeat: ' + definition;
      }

      nameOfKey = matches[1];
      valueExpression = matches[2];
    }

    if (trackByExpression === undefined) {
      trackByExpression = '$index';
    }

    this.nameOfKey = nameOfKey;
    this.trackByFn = compileExpr(trackByExpression);
    this.valueFn = compileExpr(valueExpression, context);
  },

  bind: function() {
    this.parseDefinition();

    var array = this.valueFn() || [];
    Object.observe(array, function () {
      this.update();
    }.bind(this));

    var element = this.element;
    // init childTemplate
    var childTemplate = element.cloneNode(true);
    childTemplate.removeAttribute('d-repeat');
    this.childTemplate = childTemplate;

    // add commentNode and remove element
    var refNode  = this.refNode = document.createComment('d-repeat: ' + this.expression);
    element.parentNode.insertBefore(refNode, element);
    element.parentNode && element.parentNode.removeChild(element);

    this.update();
  }
});

module.exports = RepeatDirective;