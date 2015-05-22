var startTag = '{{', finishTag = '}}';

var parseText = function(line) {
  var result = [];
  var index = 0;
  var partBeginIndex = 0;

  var appendText = function(offset) {
    offset = offset || 0;
    if (partBeginIndex >= 0) {
      var text = line.substring(partBeginIndex, index + offset);
      if (text)
        result.push({
          type: 'text',
          value: text
        });
    }
  };

  var appendExpr = function(offset) {
    offset = offset || 0;
    if (partBeginIndex >= 0) {
      result.push({
        type: 'expression',
        value: line.substring(partBeginIndex + 2, index + offset)
      });
    }
  };

  var level = 0;
  var curChar = null;
  var prevChar = null;
  var prevCurChar = null;
  var quotationChar = null;
  var inExpression = false;
  var charCount = line.length;

  for (index = 0; index < charCount; index++) {
    prevChar = curChar;
    curChar = line[index];
    prevCurChar = prevChar + curChar;

    if (prevCurChar === startTag && !inExpression) {
      if (index !== 0) appendText(-1);
      partBeginIndex = index - 1;
      inExpression = true;
    }

    if (prevCurChar === finishTag && level === 0 && inExpression) {
      appendExpr(-1);
      partBeginIndex = index + 1;
      inExpression = false;
    }

    if (inExpression) {
      if (curChar === '"' || curChar === '\'') {
        if (quotationChar && quotationChar === curChar && prevChar !== '\\') {
          quotationChar = null;
          continue;
        }

        if (!quotationChar) {
          quotationChar = curChar;
          continue;
        }
      }

      if (!quotationChar) {
        if (curChar === '(' || curChar === '{'  || curChar === '[') {
          level++;
        } else if (curChar === ')' || curChar === '}'  || curChar === ']') {
          level--;
        }
      }
    }
  }

  if (partBeginIndex < charCount - 1) {
    appendText();
  }

  return result;
};

module.exports = parseText;