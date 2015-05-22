var parsePair = function (line) {
  var keyBeginIndex = 0;
  var valueBeginIndex = 0;
  var result = [];
  var currentPair = {};
  var index;

  function appendPair() {
    currentPair.literal = line.slice(keyBeginIndex, index).trim();

    if (currentPair.value === undefined) {
      currentPair.value = line.slice(valueBeginIndex, index).trim();
    }

    if (index === 0 || currentPair.value) {
      result.push(currentPair);
    }

    currentPair = {};
    keyBeginIndex = valueBeginIndex = index + 1;
  }

  var quotationChar = null;
  var level = 0;
  var curChar = null;
  var prevChar = null;
  var charCount = line.length;

  for (index = 0; index < charCount; index++) {
    prevChar = curChar;
    curChar = line.charAt(index);

    if (curChar === '"' || curChar === '\'') {
      if (!quotationChar) {
        quotationChar = curChar;
        level++;
        continue;
      }

      if (quotationChar && prevChar !== '\\' && curChar === quotationChar) {
        quotationChar = null;
        level--;
        continue;
      }
    }

    if (!quotationChar) {
      if (curChar === ',' && level === 0) {
        appendPair();
      } else if (curChar === ':' && !currentPair.key && !currentPair.value) {
        var key = line.slice(keyBeginIndex, index).trim();
        if (key.length > 0) {
          currentPair.key = key;
          valueBeginIndex = index + 1;
        }
      } else if (curChar === '(' || curChar === '[' || curChar === '{') {
        level++;
      } else if (curChar === ')' || curChar === ']' || curChar === '}') {
        level--;
      }
    }
  }

  if (index === 0 || keyBeginIndex !== index) {
    appendPair();
  }

  return result;
};

module.exports = parsePair;