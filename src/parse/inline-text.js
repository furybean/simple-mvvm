var parseText = require('./parse-text');

var inlineText = function(text) {
  var parts = parseText(text);
  if (!parts) return '';
  var resultArray = [];
  for (var i = 0, j = parts.length; i < j; i++) {
    var part = parts[i];
    if (part.type === 'text') {
      resultArray.push('"' + part.value + '"');
    } else if (part.type === 'expression') {
      resultArray.push(part.value);
    }
  }
  return resultArray.join(' + ').trim();
};

module.exports = inlineText;