var expect = require('chai').expect;
var parseText = require('../src/parse-text');
describe('Parse text', function(){
  it('should parse text only', function(){
    expect(parseText('only text')).to.deep.equal([{type: 'text', value: 'only text'}]);
  });

  it('should parse text only have {{', function(){
    expect(parseText('text{{expr')).to.deep.equal([ {type: 'text', value: 'text'}, {type: 'text', value: '{{expr'} ]);
  });

  it('should parse text have quotation char', function(){
    expect(parseText('text"xx')).to.deep.equal([ {type: 'text', value: 'text"xx'} ]);
    expect(parseText('text"xx"')).to.deep.equal([ {type: 'text', value: 'text"xx"'} ]);
  });

  it('should parse text only have }}', function(){
    expect(parseText('text}}')).to.deep.equal([ {type: 'text', value: 'text}}'} ]);
  });

  it('should parse text and expr', function(){
    expect(parseText('{{expr}}')).to.deep.equal([{type: 'expression', value: 'expr'}]);
    expect(parseText('text{{expr}}')).to.deep.equal([{type: 'text', value: 'text'}, {type: 'expression', value: 'expr'}]);
  });

  it('should parse expr have string', function(){
    expect(parseText('text{{"expr"}}')).to.deep.equal([{type: 'text', value: 'text'}, {type: 'expression', value: '"expr"'}]);
    expect(parseText('text{{"expr{{}}"}}')).to.deep.equal([{type: 'text', value: 'text'}, {type: 'expression', value: '"expr{{}}"'}]);
  });
});