var parsePair = require('./parse/parse-pair');
var inlineText = require('./parse/inline-text');
var directive = require('./directive');
var createDirective = directive.create;
var isPairDirective = directive.isPair;
var hasDirective = directive.has;
var ViewModel = require('./view-model');

var maybeIncludeExpression = function(text) {
  return /\{\{\s*(.+?)\s*\}\}/ig.test(text);
};

function walk(node, callback) {
  if (node.nodeType === 1 || node.nodeType === 3) {
    var returnValue = callback(node);
    if (returnValue === false) {
      return;
    }
  }

  if (node.nodeType === 1) {
    var current = node.firstChild;
    while (current) {
      walk(current, callback);
      current = current.nextSibling;
    }
  }
}

var bindDirs = function(element, dirs, context) {
  for (var i = 0, j = dirs.length; i < j; i++) {
    var dir = dirs[i];
    var type = dir.type;

    if (isPairDirective(type)) {
      var pairs = parsePair(dir.value);
      for (var k = 0, l = pairs.length; k < l; k++) {
        var pair = pairs[k];
        createDirective(dir.type, {
          element: element, expression: pair.value, context: context, key: pair.key, attr: dir.attr
        });
      }
    } else {
      createDirective(dir.type, {
        element: element, expression: dir.value, context: context, attr: dir.attr
      });
    }
  }
};

var compile = function(element, context) {
  context = new ViewModel(context);

  walk(element, function(el) {
    var dirs = [];

    if (el.nodeType === 1) {
      var attributes = el.attributes;

      for (var i = 0, j = attributes.length; i < j; i++){
        var attrNode = attributes.item(i);
        var attrName = attrNode.nodeName;
        var attrValue = attrNode.nodeValue;

        if (maybeIncludeExpression(attrNode.nodeValue)) {
          dirs.push({
            type: 'd-attr',
            attr: attrName,
            value: inlineText(attrValue)
          });
        }

        if (hasDirective(attrName)) {
          dirs.push({
            type: attrName,
            attr: attrName,
            value: attrValue
          });
        }

        if (attrName === 'd-repeat') {
          createDirective('d-repeat', { element: el, expression: attrNode.nodeValue, context: context });

          return false;
        }
      }
    } else if (el.nodeType === 3) {
      var text = el.nodeValue;

      if (maybeIncludeExpression(text)) {
        var expression = inlineText(text);
        dirs.push({
          type: 'd-text',
          value: expression
        });
      }
    }

    if (dirs.length > 0) {
      bindDirs(el, dirs, context);
    }
  });
};

module.exports = compile;