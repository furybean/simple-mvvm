(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//     JavaScript Expression Parser (JSEP) 0.3.0
//     JSEP may be freely distributed under the MIT License
//     http://jsep.from.so/

/*global module: true, exports: true, console: true */
(function (root) {
	'use strict';
	// Node Types
	// ----------
	
	// This is the full set of types that any JSEP node can be.
	// Store them here to save space when minified
	var COMPOUND = 'Compound',
		IDENTIFIER = 'Identifier',
		MEMBER_EXP = 'MemberExpression',
		LITERAL = 'Literal',
		THIS_EXP = 'ThisExpression',
		CALL_EXP = 'CallExpression',
		UNARY_EXP = 'UnaryExpression',
		BINARY_EXP = 'BinaryExpression',
		LOGICAL_EXP = 'LogicalExpression',
		CONDITIONAL_EXP = 'ConditionalExpression',
		ARRAY_EXP = 'ArrayExpression',

		PERIOD_CODE = 46, // '.'
		COMMA_CODE  = 44, // ','
		SQUOTE_CODE = 39, // single quote
		DQUOTE_CODE = 34, // double quotes
		OPAREN_CODE = 40, // (
		CPAREN_CODE = 41, // )
		OBRACK_CODE = 91, // [
		CBRACK_CODE = 93, // ]
		QUMARK_CODE = 63, // ?
		SEMCOL_CODE = 59, // ;
		COLON_CODE  = 58, // :

		throwError = function(message, index) {
			var error = new Error(message + ' at character ' + index);
			error.index = index;
			error.description = message;
			throw error;
		},

	// Operations
	// ----------
	
	// Set `t` to `true` to save space (when minified, not gzipped)
		t = true,
	// Use a quickly-accessible map to store all of the unary operators
	// Values are set to `true` (it really doesn't matter)
		unary_ops = {'-': t, '!': t, '~': t, '+': t},
	// Also use a map for the binary operations but set their values to their
	// binary precedence for quick reference:
	// see [Order of operations](http://en.wikipedia.org/wiki/Order_of_operations#Programming_language)
		binary_ops = {
			'||': 1, '&&': 2, '|': 3,  '^': 4,  '&': 5,
			'==': 6, '!=': 6, '===': 6, '!==': 6,
			'<': 7,  '>': 7,  '<=': 7,  '>=': 7, 
			'<<':8,  '>>': 8, '>>>': 8,
			'+': 9, '-': 9,
			'*': 10, '/': 10, '%': 10
		},
	// Get return the longest key length of any object
		getMaxKeyLen = function(obj) {
			var max_len = 0, len;
			for(var key in obj) {
				if((len = key.length) > max_len && obj.hasOwnProperty(key)) {
					max_len = len;
				}
			}
			return max_len;
		},
		max_unop_len = getMaxKeyLen(unary_ops),
		max_binop_len = getMaxKeyLen(binary_ops),
	// Literals
	// ----------
	// Store the values to return for the various literals we may encounter
		literals = {
			'true': true,
			'false': false,
			'null': null
		},
	// Except for `this`, which is special. This could be changed to something like `'self'` as well
		this_str = 'this',
	// Returns the precedence of a binary operator or `0` if it isn't a binary operator
		binaryPrecedence = function(op_val) {
			return binary_ops[op_val] || 0;
		},
	// Utility function (gets called from multiple places)
	// Also note that `a && b` and `a || b` are *logical* expressions, not binary expressions
		createBinaryExpression = function (operator, left, right) {
			var type = (operator === '||' || operator === '&&') ? LOGICAL_EXP : BINARY_EXP;
			return {
				type: type,
				operator: operator,
				left: left,
				right: right
			};
		},
		// `ch` is a character code in the next three functions
		isDecimalDigit = function(ch) {
			return (ch >= 48 && ch <= 57); // 0...9
		},
		isIdentifierStart = function(ch) {
			return (ch === 36) || (ch === 95) || // `$` and `_`
					(ch >= 65 && ch <= 90) || // A...Z
					(ch >= 97 && ch <= 122); // a...z
		},
		isIdentifierPart = function(ch) {
			return (ch === 36) || (ch === 95) || // `$` and `_`
					(ch >= 65 && ch <= 90) || // A...Z
					(ch >= 97 && ch <= 122) || // a...z
					(ch >= 48 && ch <= 57); // 0...9
		},

		// Parsing
		// -------
		// `expr` is a string with the passed in expression
		jsep = function(expr) {
			// `index` stores the character number we are currently at while `length` is a constant
			// All of the gobbles below will modify `index` as we move along
			var index = 0,
				charAtFunc = expr.charAt,
				charCodeAtFunc = expr.charCodeAt,
				exprI = function(i) { return charAtFunc.call(expr, i); },
				exprICode = function(i) { return charCodeAtFunc.call(expr, i); },
				length = expr.length,

				// Push `index` up to the next non-space character
				gobbleSpaces = function() {
					var ch = exprICode(index);
					// space or tab
					while(ch === 32 || ch === 9) {
						ch = exprICode(++index);
					}
				},
				
				// The main parsing function. Much of this code is dedicated to ternary expressions
				gobbleExpression = function() {
					var test = gobbleBinaryExpression(),
						consequent, alternate;
					gobbleSpaces();
					if(exprICode(index) === QUMARK_CODE) {
						// Ternary expression: test ? consequent : alternate
						index++;
						consequent = gobbleExpression();
						if(!consequent) {
							throwError('Expected expression', index);
						}
						gobbleSpaces();
						if(exprICode(index) === COLON_CODE) {
							index++;
							alternate = gobbleExpression();
							if(!alternate) {
								throwError('Expected expression', index);
							}
							return {
								type: CONDITIONAL_EXP,
								test: test,
								consequent: consequent,
								alternate: alternate
							};
						} else {
							throwError('Expected :', index);
						}
					} else {
						return test;
					}
				},

				// Search for the operation portion of the string (e.g. `+`, `===`)
				// Start by taking the longest possible binary operations (3 characters: `===`, `!==`, `>>>`)
				// and move down from 3 to 2 to 1 character until a matching binary operation is found
				// then, return that binary operation
				gobbleBinaryOp = function() {
					gobbleSpaces();
					var biop, to_check = expr.substr(index, max_binop_len), tc_len = to_check.length;
					while(tc_len > 0) {
						if(binary_ops.hasOwnProperty(to_check)) {
							index += tc_len;
							return to_check;
						}
						to_check = to_check.substr(0, --tc_len);
					}
					return false;
				},

				// This function is responsible for gobbling an individual expression,
				// e.g. `1`, `1+2`, `a+(b*2)-Math.sqrt(2)`
				gobbleBinaryExpression = function() {
					var ch_i, node, biop, prec, stack, biop_info, left, right, i;

					// First, try to get the leftmost thing
					// Then, check to see if there's a binary operator operating on that leftmost thing
					left = gobbleToken();
					biop = gobbleBinaryOp();

					// If there wasn't a binary operator, just return the leftmost node
					if(!biop) {
						return left;
					}

					// Otherwise, we need to start a stack to properly place the binary operations in their
					// precedence structure
					biop_info = { value: biop, prec: binaryPrecedence(biop)};

					right = gobbleToken();
					if(!right) {
						throwError("Expected expression after " + biop, index);
					}
					stack = [left, biop_info, right];

					// Properly deal with precedence using [recursive descent](http://www.engr.mun.ca/~theo/Misc/exp_parsing.htm)
					while((biop = gobbleBinaryOp())) {
						prec = binaryPrecedence(biop);

						if(prec === 0) {
							break;
						}
						biop_info = { value: biop, prec: prec };

						// Reduce: make a binary expression from the three topmost entries.
						while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
							right = stack.pop();
							biop = stack.pop().value;
							left = stack.pop();
							node = createBinaryExpression(biop, left, right);
							stack.push(node);
						}

						node = gobbleToken();
						if(!node) {
							throwError("Expected expression after " + biop, index);
						}
						stack.push(biop_info, node);
					}

					i = stack.length - 1;
					node = stack[i];
					while(i > 1) {
						node = createBinaryExpression(stack[i - 1].value, stack[i - 2], node); 
						i -= 2;
					}
					return node;
				},

				// An individual part of a binary expression:
				// e.g. `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)` (because it's in parenthesis)
				gobbleToken = function() {
					var ch, to_check, tc_len;
					
					gobbleSpaces();
					ch = exprICode(index);

					if(isDecimalDigit(ch) || ch === PERIOD_CODE) {
						// Char code 46 is a dot `.` which can start off a numeric literal
						return gobbleNumericLiteral();
					} else if(ch === SQUOTE_CODE || ch === DQUOTE_CODE) {
						// Single or double quotes
						return gobbleStringLiteral();
					} else if(isIdentifierStart(ch) || ch === OPAREN_CODE) { // open parenthesis
						// `foo`, `bar.baz`
						return gobbleVariable();
					} else if (ch === OBRACK_CODE) {
						return gobbleArray();
					} else {
						to_check = expr.substr(index, max_unop_len);
						tc_len = to_check.length;
						while(tc_len > 0) {
							if(unary_ops.hasOwnProperty(to_check)) {
								index += tc_len;
								return {
									type: UNARY_EXP,
									operator: to_check,
									argument: gobbleToken(),
									prefix: true
								};
							}
							to_check = to_check.substr(0, --tc_len);
						}
						
						return false;
					}
				},
				// Parse simple numeric literals: `12`, `3.4`, `.5`. Do this by using a string to
				// keep track of everything in the numeric literal and then calling `parseFloat` on that string
				gobbleNumericLiteral = function() {
					var number = '', ch, chCode;
					while(isDecimalDigit(exprICode(index))) {
						number += exprI(index++);
					}

					if(exprICode(index) === PERIOD_CODE) { // can start with a decimal marker
						number += exprI(index++);

						while(isDecimalDigit(exprICode(index))) {
							number += exprI(index++);
						}
					}
					
					ch = exprI(index);
					if(ch === 'e' || ch === 'E') { // exponent marker
						number += exprI(index++);
						ch = exprI(index);
						if(ch === '+' || ch === '-') { // exponent sign
							number += exprI(index++);
						}
						while(isDecimalDigit(exprICode(index))) { //exponent itself
							number += exprI(index++);
						}
						if(!isDecimalDigit(exprICode(index-1)) ) {
							throwError('Expected exponent (' + number + exprI(index) + ')', index);
						}
					}
					

					chCode = exprICode(index);
					// Check to make sure this isn't a variable name that start with a number (123abc)
					if(isIdentifierStart(chCode)) {
						throwError('Variable names cannot start with a number (' +
									number + exprI(index) + ')', index);
					} else if(chCode === PERIOD_CODE) {
						throwError('Unexpected period', index);
					}

					return {
						type: LITERAL,
						value: parseFloat(number),
						raw: number
					};
				},

				// Parses a string literal, staring with single or double quotes with basic support for escape codes
				// e.g. `"hello world"`, `'this is\nJSEP'`
				gobbleStringLiteral = function() {
					var str = '', quote = exprI(index++), closed = false, ch;

					while(index < length) {
						ch = exprI(index++);
						if(ch === quote) {
							closed = true;
							break;
						} else if(ch === '\\') {
							// Check for all of the common escape codes
							ch = exprI(index++);
							switch(ch) {
								case 'n': str += '\n'; break;
								case 'r': str += '\r'; break;
								case 't': str += '\t'; break;
								case 'b': str += '\b'; break;
								case 'f': str += '\f'; break;
								case 'v': str += '\x0B'; break;
							}
						} else {
							str += ch;
						}
					}

					if(!closed) {
						throwError('Unclosed quote after "'+str+'"', index);
					}

					return {
						type: LITERAL,
						value: str,
						raw: quote + str + quote
					};
				},
				
				// Gobbles only identifiers
				// e.g.: `foo`, `_value`, `$x1`
				// Also, this function checks if that identifier is a literal:
				// (e.g. `true`, `false`, `null`) or `this`
				gobbleIdentifier = function() {
					var ch = exprICode(index), start = index, identifier;

					if(isIdentifierStart(ch)) {
						index++;
					} else {
						throwError('Unexpected ' + exprI(index), index);
					}

					while(index < length) {
						ch = exprICode(index);
						if(isIdentifierPart(ch)) {
							index++;
						} else {
							break;
						}
					}
					identifier = expr.slice(start, index);

					if(literals.hasOwnProperty(identifier)) {
						return {
							type: LITERAL,
							value: literals[identifier],
							raw: identifier
						};
					} else if(identifier === this_str) {
						return { type: THIS_EXP };
					} else {
						return {
							type: IDENTIFIER,
							name: identifier
						};
					}
				},

				// Gobbles a list of arguments within the context of a function call
				// or array literal. This function also assumes that the opening character
				// `(` or `[` has already been gobbled, and gobbles expressions and commas
				// until the terminator character `)` or `]` is encountered.
				// e.g. `foo(bar, baz)`, `my_func()`, or `[bar, baz]`
				gobbleArguments = function(termination) {
					var ch_i, args = [], node;
					while(index < length) {
						gobbleSpaces();
						ch_i = exprICode(index);
						if(ch_i === termination) { // done parsing
							index++;
							break;
						} else if (ch_i === COMMA_CODE) { // between expressions
							index++;
						} else {
							node = gobbleExpression();
							if(!node || node.type === COMPOUND) {
								throwError('Expected comma', index);
							}
							args.push(node);
						}
					}
					return args;
				},

				// Gobble a non-literal variable name. This variable name may include properties
				// e.g. `foo`, `bar.baz`, `foo['bar'].baz`
				// It also gobbles function calls:
				// e.g. `Math.acos(obj.angle)`
				gobbleVariable = function() {
					var ch_i, node;
					ch_i = exprICode(index);
						
					if(ch_i === OPAREN_CODE) {
						node = gobbleGroup();
					} else {
						node = gobbleIdentifier();
					}
					gobbleSpaces();
					ch_i = exprICode(index);
					while(ch_i === PERIOD_CODE || ch_i === OBRACK_CODE || ch_i === OPAREN_CODE) {
						index++;
						if(ch_i === PERIOD_CODE) {
							gobbleSpaces();
							node = {
								type: MEMBER_EXP,
								computed: false,
								object: node,
								property: gobbleIdentifier()
							};
						} else if(ch_i === OBRACK_CODE) {
							node = {
								type: MEMBER_EXP,
								computed: true,
								object: node,
								property: gobbleExpression()
							};
							gobbleSpaces();
							ch_i = exprICode(index);
							if(ch_i !== CBRACK_CODE) {
								throwError('Unclosed [', index);
							}
							index++;
						} else if(ch_i === OPAREN_CODE) {
							// A function call is being made; gobble all the arguments
							node = {
								type: CALL_EXP,
								'arguments': gobbleArguments(CPAREN_CODE),
								callee: node
							};
						}
						gobbleSpaces();
						ch_i = exprICode(index);
					}
					return node;
				},

				// Responsible for parsing a group of things within parentheses `()`
				// This function assumes that it needs to gobble the opening parenthesis
				// and then tries to gobble everything within that parenthesis, assuming
				// that the next thing it should see is the close parenthesis. If not,
				// then the expression probably doesn't have a `)`
				gobbleGroup = function() {
					index++;
					var node = gobbleExpression();
					gobbleSpaces();
					if(exprICode(index) === CPAREN_CODE) {
						index++;
						return node;
					} else {
						throwError('Unclosed (', index);
					}
				},

				// Responsible for parsing Array literals `[1, 2, 3]`
				// This function assumes that it needs to gobble the opening bracket
				// and then tries to gobble the expressions as arguments.
				gobbleArray = function() {
					index++;
					return {
						type: ARRAY_EXP,
						elements: gobbleArguments(CBRACK_CODE)
					};
				},

				nodes = [], ch_i, node;
				
			while(index < length) {
				ch_i = exprICode(index);

				// Expressions can be separated by semicolons, commas, or just inferred without any
				// separators
				if(ch_i === SEMCOL_CODE || ch_i === COMMA_CODE) {
					index++; // ignore separators
				} else {
					// Try to gobble each expression individually
					if((node = gobbleExpression())) {
						nodes.push(node);
					// If we weren't able to find a binary expression and are out of room, then
					// the expression passed in probably has too much
					} else if(index < length) {
						throwError('Unexpected "' + exprI(index) + '"', index);
					}
				}
			}

			// If there's only one expression just try returning the expression
			if(nodes.length === 1) {
				return nodes[0];
			} else {
				return {
					type: COMPOUND,
					body: nodes
				};
			}
		};

	// To be filled in by the template
	jsep.version = '0.3.0';
	jsep.toString = function() { return 'JavaScript Expression Parser (JSEP) v' + jsep.version; };

	/**
	 * @method jsep.addUnaryOp
	 * @param {string} op_name The name of the unary op to add
	 * @return jsep
	 */
	jsep.addUnaryOp = function(op_name) {
		unary_ops[op_name] = t; return this;
	};

	/**
	 * @method jsep.addBinaryOp
	 * @param {string} op_name The name of the binary op to add
	 * @param {number} precedence The precedence of the binary op (can be a float)
	 * @return jsep
	 */
	jsep.addBinaryOp = function(op_name, precedence) {
		max_binop_len = Math.max(op_name.length, max_binop_len);
		binary_ops[op_name] = precedence;
		return this;
	};

	/**
	 * @method jsep.removeUnaryOp
	 * @param {string} op_name The name of the unary op to remove
	 * @return jsep
	 */
	jsep.removeUnaryOp = function(op_name) {
		delete unary_ops[op_name];
		if(op_name.length === max_unop_len) {
			max_unop_len = getMaxKeyLen(unary_ops);
		}
		return this;
	};

	/**
	 * @method jsep.removeBinaryOp
	 * @param {string} op_name The name of the binary op to remove
	 * @return jsep
	 */
	jsep.removeBinaryOp = function(op_name) {
		delete binary_ops[op_name];
		if(op_name.length === max_binop_len) {
			max_binop_len = getMaxKeyLen(binary_ops);
		}
		return this;
	};

	// In desktop environments, have a way to restore the old value for `jsep`
	if (typeof exports === 'undefined') {
		var old_jsep = root.jsep;
		// The star of the show! It's a function!
		root.jsep = jsep;
		// And a courteous function willing to move out of the way for other similarly-named objects!
		jsep.noConflict = function() {
			if(root.jsep === jsep) {
				root.jsep = old_jsep;
			}
			return jsep;
		};
	} else {
		// In Node.JS environments
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = jsep;
		} else {
			exports.parse = jsep;
		}
	}
}(this));

},{}],2:[function(require,module,exports){
/*
 * JSFace Object Oriented Programming Library
 * https://github.com/tnhu/jsface
 *
 * Copyright (c) 2009-2013 Tan Nhu
 * Licensed under MIT license (https://github.com/tnhu/jsface/blob/master/LICENSE.txt)
 */
(function(context, OBJECT, NUMBER, LENGTH, toString, undefined, oldClass, jsface) {
  /**
   * Return a map itself or null. A map is a set of { key: value }
   * @param obj object to be checked
   * @return obj itself as a map or false
   */
  function mapOrNil(obj) { return (obj && typeof obj === OBJECT && !(typeof obj.length === NUMBER && !(obj.propertyIsEnumerable(LENGTH))) && obj) || null; }

  /**
   * Return an array itself or null
   * @param obj object to be checked
   * @return obj itself as an array or null
   */
  function arrayOrNil(obj) { return (obj && typeof obj === OBJECT && typeof obj.length === NUMBER && !(obj.propertyIsEnumerable(LENGTH)) && obj) || null; }

  /**
   * Return a function itself or null
   * @param obj object to be checked
   * @return obj itself as a function or null
   */
  function functionOrNil(obj) { return (obj && typeof obj === "function" && obj) || null; }

  /**
   * Return a string itself or null
   * @param obj object to be checked
   * @return obj itself as a string or null
   */
  function stringOrNil(obj) { return (toString.apply(obj) === "[object String]" && obj) || null; }

  /**
   * Return a class itself or null
   * @param obj object to be checked
   * @return obj itself as a class or false
   */
  function classOrNil(obj) { return (functionOrNil(obj) && (obj.prototype && obj === obj.prototype.constructor) && obj) || null; }

  /**
   * Util for extend() to copy a map of { key:value } to an object
   * @param key key
   * @param value value
   * @param ignoredKeys ignored keys
   * @param object object
   * @param iClass true if object is a class
   * @param oPrototype object prototype
   */
  function copier(key, value, ignoredKeys, object, iClass, oPrototype) {
    if ( !ignoredKeys || !ignoredKeys.hasOwnProperty(key)) {
      object[key] = value;
      if (iClass) { oPrototype[key] = value; }                       // class? copy to prototype as well
    }
  }

  /**
   * Extend object from subject, ignore properties in ignoredKeys
   * @param object the child
   * @param subject the parent
   * @param ignoredKeys (optional) keys should not be copied to child
   */
  function extend(object, subject, ignoredKeys) {
    if (arrayOrNil(subject)) {
      for (var len = subject.length; --len >= 0;) { extend(object, subject[len], ignoredKeys); }
    } else {
      ignoredKeys = ignoredKeys || { constructor: 1, $super: 1, prototype: 1, $superp: 1 };

      var iClass     = classOrNil(object),
          isSubClass = classOrNil(subject),
          oPrototype = object.prototype, supez, key, proto;

      // copy static properties and prototype.* to object
      if (mapOrNil(subject)) {
        for (key in subject) {
          copier(key, subject[key], ignoredKeys, object, iClass, oPrototype);
        }
      }

      if (isSubClass) {
        proto = subject.prototype;
        for (key in proto) {
          copier(key, proto[key], ignoredKeys, object, iClass, oPrototype);
        }
      }

      // prototype properties
      if (iClass && isSubClass) { extend(oPrototype, subject.prototype, ignoredKeys); }
    }
  }

  /**
   * Create a class.
   * @param parent parent class(es)
   * @param api class api
   * @return class
   */
  function Class(parent, api) {
    if ( !api) {
      parent = (api = parent, 0);                                     // !api means there's no parent
    }

    var clazz, constructor, singleton, statics, key, bindTo, len, i = 0, p,
        ignoredKeys = { constructor: 1, $singleton: 1, $statics: 1, prototype: 1, $super: 1, $superp: 1, main: 1, toString: 0 },
        plugins     = Class.plugins;

    api         = (typeof api === "function" ? api() : api) || {};             // execute api if it's a function
    constructor = api.hasOwnProperty("constructor") ? api.constructor : 0;     // hasOwnProperty is a must, constructor is special
    singleton   = api.$singleton;
    statics     = api.$statics;

    // add plugins' keys into ignoredKeys
    for (key in plugins) { ignoredKeys[key] = 1; }

    // construct constructor
    clazz  = singleton ? {} : (constructor ? constructor : function(){});

    // make sure parent is always an array
    parent = !parent || arrayOrNil(parent) ? parent : [ parent ];
    len = parent && parent.length;

    if ( !singleton && len) {
      clazz.prototype             = classOrNil(parent[0]) ? new parent[0] : parent[0];
      clazz.prototype.constructor = clazz;
    }

    // determine bindTo: where api should be bound
    bindTo = singleton ? clazz : clazz.prototype;

    // do inherit
    while (i < len) {
      p = parent[i++];
      for (key in p) {
        if ( !ignoredKeys[key]) {
          bindTo[key] = p[key];
          if ( !singleton) { clazz[key] = p[key]; }
        }
      }
      for (key in p.prototype) { if ( !ignoredKeys[key]) { bindTo[key] = p.prototype[key]; } }
    }

    // copy properties from api to bindTo
    for (key in api) {
      if ( !ignoredKeys[key]) {
        bindTo[key] = api[key];
      }
    }

    // copy static properties from statics to both clazz and bindTo
    for (key in statics) { clazz[key] = bindTo[key] = statics[key]; }

    // if class is not a singleton, add $super and $superp
    if ( !singleton) {
      p = parent && parent[0] || parent;
      clazz.$super  = p;
      clazz.$superp = p && p.prototype ? p.prototype : p;
    }

    for (key in plugins) { plugins[key](clazz, parent, api); }                 // pass control to plugins
    if (functionOrNil(api.main)) { api.main.call(clazz, clazz); }              // execute main()
    return clazz;
  }

  /* Class plugins repository */
  Class.plugins = {};

  /* Initialization */
  jsface = {
    Class        : Class,
    extend       : extend,
    mapOrNil     : mapOrNil,
    arrayOrNil   : arrayOrNil,
    functionOrNil: functionOrNil,
    stringOrNil  : stringOrNil,
    classOrNil   : classOrNil
  };

  if (typeof module !== "undefined" && module.exports) {                       // NodeJS/CommonJS
    module.exports = jsface;
  } else {
    oldClass          = context.Class;                                         // save current Class namespace
    context.Class     = Class;                                                 // bind Class and jsface to global scope
    context.jsface    = jsface;
    jsface.noConflict = function() { context.Class = oldClass; };              // no conflict
  }
})(this, "object", "number", "length", Object.prototype.toString);
},{}],3:[function(require,module,exports){

module.exports = exports = Change;

/*!
 * Change object constructor
 *
 * The `change` object passed to Object.observe callbacks
 * is immutable so we create a new one to modify.
 */

function Change (path, change) {
  this.path = path;
  this.name = change.name;
  this.type = change.type;
  this.object = change.object;
  this.value = change.object[change.name];
  this.oldValue = change.oldValue;
}


},{}],4:[function(require,module,exports){
// http://wiki.ecmascript.org/doku.php?id=harmony:observe

var Change = require('./change');
var Emitter = require('events').EventEmitter;
var debug = require('debug')('observed');

module.exports = exports = Observable;

/**
 * Observable constructor.
 *
 * The passed `subject` will be observed for changes to
 * all properties, included nested objects and arrays.
 *
 * An `EventEmitter` will be returned. This emitter will
 * emit the following events:
 *
 * - new
 * - updated
 * - deleted
 * - reconfigured
 *
 * @param {Object} subject
 * @param {Observable} [parent] (internal use)
 * @param {String} [prefix] (internal use)
 * @return {EventEmitter}
 */

function Observable (subject, parent, prefix) {
  if ('object' != typeof subject)
    throw new TypeError('object expected. got: ' + typeof subject);

  if (!(this instanceof Observable))
    return new Observable(subject, parent, prefix);

  debug('new', subject, !!parent, prefix);

  Emitter.call(this);
  this._bind(subject, parent, prefix);
};

// add emitter capabilities
for (var i in Emitter.prototype) {
  Observable.prototype[i] = Emitter.prototype[i];
}

Observable.prototype.observers = undefined;
Observable.prototype.onchange = undefined;
Observable.prototype.subject = undefined;

/**
 * Binds this Observable to `subject`.
 *
 * @param {Object} subject
 * @param {Observable} [parent]
 * @param {String} [prefix]
 * @api private
 */

Observable.prototype._bind = function (subject, parent, prefix) {
  if (this.subject) throw new Error('already bound!');
  if (null == subject) throw new TypeError('subject cannot be null');

  debug('_bind', subject);

  this.subject = subject;

  if (parent) {
    parent.observers.push(this);
  } else {
    this.observers = [this];
  }

  this.onchange = onchange(parent || this, prefix);
  Object.observe(this.subject, this.onchange);

  this._walk(parent || this, prefix);
}

/**
 * Walk down through the tree of our `subject`, observing
 * objects along the way.
 *
 * @param {Observable} [parent]
 * @param {String} [prefix]
 * @api private
 */

Observable.prototype._walk = function (parent, prefix) {
  debug('_walk');

  var object = this.subject;

  // keys?
  Object.getOwnPropertyNames(object).forEach(function (name) {
    var value = object[name];

    if ('object' != typeof value) return;
    if (null == value) return;

    var path = prefix
      ? prefix + '.' + name
      : name;

    new Observable(value, parent, path);
  });
}

/**
 * Stop listening to all bound objects
 */

Observable.prototype.stop = function () {
  debug('stop');

  this.observers.forEach(function (observer) {
    Object.unobserve(observer.subject, observer.onchange);
  });
}

/**
 * Stop listening to changes on `subject`
 *
 * @param {Object} subject
 * @api private
 */

Observable.prototype._remove = function (subject) {
  debug('_remove', subject);

  this.observers = this.observers.filter(function (observer) {
    if (subject == observer.subject) {
      Object.unobserve(observer.subject, observer.onchange);
      return false;
    }

    return true;
  });
}

/*!
 * Creates an Object.observe `onchange` listener
 */

function onchange (parent, prefix) {
  return function (ary) {
    debug('onchange');

    ary.forEach(function (change) {
      var object = change.object;
      var type = change.type;
      var name = change.name;
      var value = object[name];

      var path = prefix
        ? prefix + '.' + name
        : name

      if ('new' == type && null != value && 'object' == typeof value) {
        new Observable(value, parent, path);
      } else if ('deleted' == type && 'object' == typeof change.oldValue) {
        parent._remove(change.oldValue);
      }

      change = new Change(path, change);
      parent.emit(type, change);
      parent.emit(type + ' ' + path, change);
      parent.emit('changed', change);
    })
  }
}


},{"./change":3,"debug":5,"events":21}],5:[function(require,module,exports){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

// persist

try {
  if (window.localStorage) debug.enable(localStorage.debug);
} catch(e){}

},{}],6:[function(require,module,exports){
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
},{"./directive":7,"./parse/inline-text":17,"./parse/parse-pair":18,"./view-model":20}],7:[function(require,module,exports){
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
},{"./directive/attr":8,"./directive/class":9,"./directive/event":11,"./directive/model":12,"./directive/repeat":13,"./directive/text":14,"jsface":2}],8:[function(require,module,exports){
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
},{"./directive":10,"jsface":2}],9:[function(require,module,exports){
var Class = require('jsface').Class;
var Directive = require('./directive');

var ClassDirective = Class(Directive, {
  isPair: true,
  constructor: function(options) {
    if (options) {
      if (options.key !== undefined) {
        this.className = options.key;
      }
    }
    ClassDirective.$super.call(this, options);
  },
  update: function() {
    if (this.className && this.className && this.valueFn) {
      var value = !!this.valueFn();
      if (value) {
        this.element.classList.add(this.className);
      } else {
        this.element.classList.remove(this.className);
      }
    }
  }
});

module.exports = ClassDirective;
},{"./directive":10,"jsface":2}],10:[function(require,module,exports){
var Class = require('jsface').Class;
var expr = require('../parse/expr');
var compileExpr = expr.compile;
var getDepends = expr.getDepends;

var Directive = Class({
  constructor: function(options) {
    options = options || {};
    this.element = options.element;
    this.expression = options.expression;
    this.context = options.context;

    this.bind();
  },

  bind: function() {
    var directive = this;
    if (directive.element && directive.expression && directive.context) {
      directive.valueFn = compileExpr(directive.expression, directive.context);

      var depends = getDepends(directive.expression);
      var context = directive.context;

      depends.forEach(function(depend) {
        context.$watch(depend, directive);
      });

      this.update();
    }
  },

  unbind: function() {
    var depends = getDepends(this.expression);
    var context = this.context;
    var directive = this;

    depends.forEach(function(depend) {
      context.$unwatch(depend, directive);
    });
  },

  destroy: function() {
    this.unbind();

    this.element = null;
    this.expression = null;
    this.context = null;
    this.valueFn = null;
  },

  update: function() {
  }
});

module.exports = Directive;
},{"../parse/expr":16,"jsface":2}],11:[function(require,module,exports){
var Class = require('jsface').Class;
var Directive = require('./directive');

var EventDirective = Class(Directive, {
  isPair: true,
  constructor: function(options) {
    if (options) {
      if (options.key !== undefined) {
        this.event = options.key;
      }
    }
    EventDirective.$super.call(this, options);
  },
  bind: function() {
    EventDirective.$super.prototype.bind.call(this);
    if (this.element) {
      this.element.addEventListener(this.event, this.valueFn, false);
    }
  },
  update: function() {
  }
});

module.exports = EventDirective;
},{"./directive":10,"jsface":2}],12:[function(require,module,exports){
var Class = require('jsface').Class;
var Directive = require('./directive');

var setter = function(obj, path, newValue) {
  if (!obj || !path) return;
  var paths = path.split('.'), target = obj;
  for (var i = 0, j = paths.length; i < j; i++) {
    var subPath = paths[i], value = target[subPath];
    if (i == j - 1) {
      target[subPath] = newValue;
    } else {
      if (value)
        target = value;
      else
        return;
    }
  }
};

var ModelDirective = Class(Directive, {
  constructor: function(options) {
    ModelDirective.$super.call(this, options);
  },
  bind: function() {
    var directive = this;

    ModelDirective.$super.prototype.bind.call(this, arguments);

    var element = directive.element;

    var listener = function() {
      if (element.type === 'checkbox') {
        setter(directive.context, directive.expression, element.checked);
      } else {
        setter(directive.context, directive.expression, element.value);
      }
    };

    element.addEventListener('keyup', listener, false);
    element.addEventListener('change', listener, false);
  },
  update: function() {
    var value = this.valueFn();
    var element = this.element;

    if (element) {
      if (element.type === 'checkbox') {
        value = !!value;
        if (element.checked !== value) {
          element.checked = value;
        }
      } else {
        if (element.value !== value) {
          element.value = value;
        }
      }
    }
  }
});

module.exports = ModelDirective;
},{"./directive":10,"jsface":2}],13:[function(require,module,exports){
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
},{"../compile":6,"../parse/expr":16,"./directive":10,"jsface":2}],14:[function(require,module,exports){
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

},{"./directive":10,"jsface":2}],15:[function(require,module,exports){
var compile = require('./compile');

window.$compile = compile;
},{"./compile":6}],16:[function(require,module,exports){
var jsep = require('jsep');

var parsedCache = {};
var dependsCache = {};

//jsep.addBinaryOp('=', 1);

function parseExpr(string) {

  var depends;

  function parseMemberExpression(ast) {
    var path = '';
    var currentObject = ast.object;
    var stack = [ast.property.name];

    while (currentObject) {
      if (currentObject.type === 'Identifier') {
        stack.unshift(currentObject.name);
        path = stack.join('.');

        break;
      } else if (currentObject.type === 'MemberExpression') {
        stack.unshift(currentObject.property.name);
        currentObject = currentObject.object;
      }
    }

    if (depends && depends.indexOf(path) === -1) {
      depends.push(path);
    }

    return path;
  }

  function astToCode(ast) {
    if (ast.type === 'Literal') {
      return typeof ast.value === 'string' ? '"' + ast.value + '"' : '' + ast.value;
    } else if (ast.type === 'ThisExpression') {
      return 'this';
    } else if (ast.type === 'UnaryExpression') {
      return ast.operator + astToCode(ast.argument);
    } else if (ast.type === 'BinaryExpression' || ast.type === 'LogicalExpression') {
      return astToCode(ast.left) + ' ' + ast.operator + ' ' + astToCode(ast.right);
    } else if (ast.type === 'ConditionalExpression') {
      return '(' + astToCode(ast.test) + ' ? (' + astToCode(ast.consequent) + ') : (' + astToCode(ast.alternate) + '))';
    } else if (ast.type === 'Identifier') {
      if (depends && depends.indexOf(ast.name) === -1) {
        depends.push(ast.name);
      }

      return 'this.' + ast.name;
    } else if (ast.type === 'CallExpression') {
      var arguments = ast.arguments;
      var parsedValues = [];
      if (arguments) {
        arguments.forEach(function(arg) {
          parsedValues.push(astToCode(arg));
        });
      }

      var callee = ast.callee;

      if (callee.type === 'Identifier') {
        return astToCode(callee) + '(' + parsedValues.join(', ') + ')';
      }

      return astToCode(callee.object) + '.' + callee.property.name + '(' + parsedValues.join(', ') + ')';
    } else if (ast.type === 'MemberExpression') {
      return 'this.' + parseMemberExpression(ast);
    } else if (ast.type === 'ArrayExpression') {
      var elements = ast.elements, mappedValues = [];

      elements.forEach(function(item) {
        mappedValues.push(astToCode(item));
      });

      return '[' + mappedValues.join(', ') + ']';
    }
  }

  var result = parsedCache[string];

  if (!result) {
    var parsedTree = jsep(string);

    depends = [];
    result = astToCode(parsedTree);

    parsedCache[string] = result;
    dependsCache[string] = depends;
  }

  return result;
}

function getDepends(string) {
  var depends = dependsCache[string];

  if (!depends) {
    parseExpr(string);
    depends = dependsCache[string];
  }

  return depends;
}

var fnCache = {};

var compileExpr = function(string, context) {
  var converted = parseExpr(string);
  var body = 'return ' + converted + ';';

  var fn = fnCache[string];
  if (!fn) {
    fn = new Function(body);
  }
  if (context) {
    return fn.bind(context);
  }
  return fn;
};

module.exports = {
  parse: parseExpr,
  getDepends: getDepends,
  compile: compileExpr
};
},{"jsep":1}],17:[function(require,module,exports){
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
},{"./parse-text":19}],18:[function(require,module,exports){
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
},{}],19:[function(require,module,exports){
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
},{}],20:[function(require,module,exports){
var Observed = require('observed');

var ViewModel = function(object) {
  if (!object) return;

  var callbackMap = {};
  var observer = Observed(object);
  var emptyArray = [];

  object.$watch = function(path, callback) {
    var callbacks = callbackMap[path];
    if (!callbacks) {
      callbacks = callbackMap[path] = [];
    }
    callbacks.push(callback);
  };

  object.$unwatch = function(path, callback) {
    var callbacks = callbackMap[path];
    if (callbacks) {
      if (callback) {
        for (var i = 0, j = callbacks.length; i < j; i++) {
          if (callback === callbacks[i]) {
            callbacks.splice(i, 1);
            break;
          }
        }
      } else {
        callbackMap[path] = [];
      }
    }
  };

  object.$extend = function() {
    return ViewModel(Object.create(this));
  };

  object.$destroy = function() {
    for (var path in callbackMap) {
      if (callbackMap.hasOwnProperty(path)) {
        var callbacks = callbackMap[path] || emptyArray;

        for (var i = 0, j = callbacks.length; i < j; i++) {
          var callback = callbacks[i];
          if (typeof callback === 'object' && callback.destroy) {
            callback.destroy();
          }
        }
      }
    }

    callbackMap = {};
  };

  observer.on('changed', function(change) {
    var path = change.path;
    if (path && path.charAt(0) === '$') return;

    var callbacks = callbackMap[path] || emptyArray;

    for (var i = 0, j = callbacks.length; i < j; i++) {
      var callback = callbacks[i];
      if (typeof callback === 'object' && callback.update) {
        callback.update();
      } else if (typeof callback === 'function') {
        callback(change);
      }
    }
  });

  return object;
};

module.exports = ViewModel;
},{"observed":4}],21:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[15]);
