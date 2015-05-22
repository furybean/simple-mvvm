var expect = require('chai').expect;
var expr = require('../src/expr');
var parseExpr = expr.parse;
var getDepends = expr.getDepends;

describe('Parse Expr', function(){
  it('should parse basic Literal', function(){
    expect(parseExpr('1')).to.equal('1');
    expect(parseExpr('null')).to.equal('null');
    expect(parseExpr('false')).to.equal('false');
    expect(parseExpr('"a"')).to.equal('"a"');
    expect(parseExpr('[1, 2, 3]')).to.equal('[1, 2, 3]');
  });

  it('should parse unary expression', function(){
    expect(parseExpr('!a')).to.equal('!this.a');
  });

  it('should parse binary and logical expression', function(){
    expect(parseExpr('a + b')).to.equal('this.a + this.b');
    expect(parseExpr('a > b')).to.equal('this.a > this.b');
  });

  it('should parse call expression', function(){
    expect(parseExpr('a()')).to.equal('this.a()');
  });

  it('should parse condition expression', function() {
    expect(parseExpr('a > 3 ? a : b')).to.equal('(this.a > 3 ? (this.a) : (this.b))');
  });

  it('should parse basic identifier', function(){
    expect(parseExpr('a')).to.equal('this.a');
  });

  it('should parse MemberExpression', function() {
    expect(parseExpr('a.b')).to.equal('this.a.b');
    expect(parseExpr('a.b.c()')).to.equal('this.a.b.c()');
  });
});

describe('Expr depends', function() {
  it('should get depends of basic identifier', function() {
    expect(getDepends('a')).to.deep.equal(['a']);
    expect(getDepends('a + b')).to.deep.equal(['a', 'b']);
  });

  it('should get depends of MemberExpression', function() {
    expect(getDepends('a.b')).to.deep.equal(['a.b']);
    expect(getDepends('a.b.c')).to.deep.equal(['a.b.c']);
    expect(getDepends('a.b.c()')).to.deep.equal(['a.b']);
  });
});