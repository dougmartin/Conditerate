(function($) {

	var templateCache = {};

	//
	// helper functions
	//
	function astNode(type, attrs) {
		return jQuery.extend({"type": type}, attrs || {});
	}
	
	function token(type, lexeme, line, column) {
		return {
			"type": type,
			"lexeme": lexeme,
			"line": line,
			"column": column
		}
	}	
	
	function getValue(vars, val) {
		return val ? (typeof val === "function" ? val(vars) : val) : "";
	}

	function isArray(val) {
		return val.constructor.toString().indexOf("Array") !== -1;
	}
	
	function limit(val, start, length) {
		if (!isArray(val)) {
			return val;
		}
		return val.slice(start, start + length);
	}

	//
	// pipeline: fn = emit(optimize(parse(tokenize(template))));
	//
	function emit(ast) {

		function emitNode(node, ifNull) {
			var code, i;
			
			function emitList(list) {
				for (i = 0; i < list.length; i++) {
					code.push(emitNode(list[i]));
					if (i + 1 < list.length) {
						code.push(",");
					}
				}
			}
			
			if (!node) {
				return ifNull || "";
			}
			
			switch (node.type) {
				case "text":
					code = ["'", node.text.replace(/'/g, "\\'"), "'"];
					break;
					
				case "conditerate":
					code = [(node.isInternal ? "function (vars) {" : "vars = vars || {}; "), "return "];
					if (node.segments.length == 1) {
						code.push(emitNode(node.segments[0]));
					}
					else {
						code.push("[");
						emitList(node.segments);
						code.push('].join("")');
					}
					if (node.isInternal) {
						code.push(";}");
					}
					break;
					
				case "conditerator":
					code = ["$.conditerator(vars, ", emitNode(node.condition), ", ", emitNode(node.prefix, "''"), ", ", emitNode(node.loop, "''"), ", ", emitNode(node.suffix, "''"), ", ", emitNode(node.forElse, "''"), ")"];
					break;
					
				case "string":
					if ((node.delimiter == "~") || (node.delimiter == "`")) {
						node.delimiter = "'";
						node.contents = node.contents.replace(/'/g, "\\'");
					}
					code = [node.delimiter, node.contents, node.delimiter];
					break;
					
				case "function":
					code = [node.name, "("];
					emitList(node.args);
					code.push(")")
					break;
					
				case "identifier":
					code = ["vars.hasOwnProperty('", node.name, "') ? vars['", node.name, "'] : ''"];
					break;
					
				case "literal":
					code = [node.value];
					break;
			}
			return code.join("");
		}

		return [(ast.type != "conditerate" ? "return " : ""), emitNode(ast), ";"].join("");
	}

	function optimize(ast) {
		var i, newSegments;
		
		if (!ast) {
			return ast;
		}
		
		switch (ast.type) {
			case "conditerate":
				// conditerates always start with text nodes, so if there is just one convert the ast to plain text
				if (ast.segments.length == 1) {
					return ast.segments[0];
				}
				
				// remove empty text nodes and optimize each segment
				newSegments = [];
				for (i = 0; i < ast.segments.length; i++) {
					if (ast.segments[i].type == "text") {
						if (ast.segments[i].text.length > 0) {
							newSegments.push(ast.segments[i]);
						}
					}
					else {
						newSegments.push(optimize(ast.segments[i]));
					}
				}
				ast.segments = newSegments;
				break;
				
			case "conditerator":
				// convert {@ foo @} from a conditerator to foo's base type
				if (!ast.loop) {
					return astNode(ast.condition, ast.condition);
				}
				ast.condition = optimize(ast.condition);
				ast.prefix = optimize(ast.prefix);
				ast.loop = optimize(ast.loop);
				ast.suffix = optimize(ast.suffix);
				ast.forElse = optimize(ast.forElse);
				break;
		}
		return ast;
	}
	
	function parse(tokens, isInternal) {
		var tokenIndex = -1, 
		eofToken = token("eof", "<end of template>"),
		ast, nextToken, node, expressions;
		
		function advance() {
			tokenIndex++;
			nextToken = tokenIndex < tokens.length ? tokens[tokenIndex] : eofToken;
		}
		
		function expectedError(expected) {
			throw new Error(["Conditerate syntax error at line ", nextToken.line, ", column ", nextToken.column, ": Expected ", expected, " found ", nextToken.lexeme, " (", nextToken.type, ")"].join(""));
		}
		
		function match(tokenType, expected) {
			var lastToken = nextToken;
			if (nextToken.type != tokenType) {
				expectedError(expected || tokenType);
			}
			advance();
			return lastToken;
		}
		
		function matchIf(tokenType) {
			if (nextToken.type == tokenType) {
				match(tokenType);
				return true;
			}
			return false;
		}
		
		function parseExpression() {
			var node, lastToken, paramNode;
			
			switch (nextToken.type) {
				case "string":
					if (nextToken.lexeme.indexOf("{@") != -1) {
						// reenter the parser as an internal conditerate
						node = parse(tokenize(nextToken.lexeme), true);
					}
					else {
						node = astNode("string", {"contents": nextToken.lexeme, "delimiter": nextToken.delimiter});
					}
					match("string");
					break;
					
				case "function":
					lastToken = match("function");
					node = astNode("function", {"name": lastToken.lexeme, "args": []});
					match("(");
					while ((nextToken.type != eofToken) && (nextToken.type != ")")) {
						paramNode = parseExpression();
						if (paramNode) {
							node.args.push(paramNode);
						}
						matchIf(",");
					}
					match(")");
					break;
					
				case "identifier":
					node = astNode("identifier", {"name": nextToken.lexeme});
					match("identifier");
					break;
					
				case "literal":
					node = astNode("literal", {"value": nextToken.lexeme});
					match("literal");
					break;
					
				default:
					// empty expressions are ok
					break;
			}
			
			return node;
		}
		
		advance();
		
		ast = astNode("conditerate", {"segments": [], "isInternal": isInternal});
		
		while (nextToken != eofToken) {
			switch (nextToken.type) {
				case "text":
					node = astNode("text", {"text": nextToken.lexeme});
					match("text");
					break;
					
				case "{@":
					match("{@");
					node = astNode("conditerator", {
						"condition": parseExpression(),
						"prefix": null,
						"loop": null,
						"suffix": null,
						"forElse": null
					});
					
					if (!node.condition) {
						expectedError("condition for conditerator");
					}
					
					if (matchIf("?:")) {
						node.loop = node.condition;
						node.forElse = parseExpression();
					}
					else if (matchIf("?")) {
						expressions = [];
						while ((nextToken.type != ":") && (nextToken.type != "@}") && (expressions.length < 4)) {
							expressions.push(parseExpression());
						}
						switch (expressions.length) {
							case 0:
								expectedError("expression after ?");
								break;
							case 1:
								node.loop = expressions[0];
								break;
							case 2:
								node.prefix = expressions[0];
								node.loop = expressions[1];
								break;
							case 3:
								node.prefix = expressions[0];
								node.loop = expressions[1];
								node.suffix = expressions[2];
								break;
							default:
								expectedError("1 to 3 expressions after ?");
								break;
						}
						
						if (matchIf(":")) {
							node.forElse = parseExpression();
						}
					}
					match("@}");
					break;
					
				default:
					expectedError("text or start of conditerator");
					break;
			}
			ast.segments.push(node);
		}
		
		return ast;
	}
	
	function tokenize(template) {
		var ch, followingCh, delimiter, tokenObj, conditeratorCount,
			eof = "",
			inConditerator = false,
			i = 0;
			line = 1,
			column = 1,
			startingLine = 1,
			startingColumn = 1,
			tokens = [],
			lexeme = [],
			stream = template.split("");
			
		function pushToken(tokenType) {
			var tokenObj = token(tokenType, lexeme.join(""), startingLine, startingColumn);
			tokens.push(tokenObj);
			startingLine = line;
			startingColumn = column;
			lexeme = [];
			return tokenObj;
		}
		
		function advanceToken(tokenType) {
			var tokenObj = token(tokenType, tokenType, startingLine, startingColumn);
			tokens.push(tokenObj);
			i += tokenType.length;
			ch = getCh();
			startingLine = line;
			startingColumn = column;
			lexeme = [];
			return tokenObj;
		}		
		
		function getCh() {
			if (i >= stream.length) {
				return eof;
			}
			
			column++;
			if (stream[i] == "\n") {
				column = 1;
				line++;
			}
			
			return stream[i];
		}
		
		function getNextCh() {
			i++;
			return getCh();
		}
		
		ch = getCh();
		while (ch != eof) {
			if (inConditerator) {
				while ((ch != eof) && inConditerator) {
					// eat whitespace
					while ((ch != eof) && (" \t\r\n".indexOf(ch) != -1)) {
						ch = getNextCh();
					}
					lexeme = [];
					
					followingCh = i + 1 < stream.length ? stream[i + 1] : eof;
					
					if ((ch == "@") && (followingCh == "}")) {
						advanceToken("@}");
						inConditerator = false;
					}
					else if ((ch == "?") && (followingCh == ":")) {
						advanceToken("?:");
					}
					else if ((ch == "'") || (ch == '"') || (ch == "~") || (ch == "`")) {
						delimiter = ch;
						
						conditeratorCount = 0;
						ch = getNextCh();
						while ((ch != eof) && ((ch != delimiter) || (conditeratorCount > 0))) {
							followingCh = i + 1 < stream.length ? stream[i + 1] : eof;
							// enable escaping
							if (ch == "\\") {
								lexeme.push(getNextCh());
							}
							else {
								lexeme.push(ch);
								if ((ch == "{") && (followingCh == "@")) {
									conditeratorCount++;
								}
								else if ((ch == "@") && (followingCh == "}")) {
									conditeratorCount--;
								}
							}
							ch = getNextCh();
						}
						ch = getNextCh();
						
						tokenObj = pushToken("string");
						tokenObj.delimiter = delimiter;
					}
					else if ("(),?:".indexOf(ch) != -1) {
						advanceToken(ch);
					}
					else if (ch != eof) {
						while ((ch != eof) && (" \t\r\n(),?:'\"".indexOf(ch) == -1)) {
							lexeme.push(ch);
							ch = getNextCh();
						}
						
						if (ch == "(") {
							pushToken("function");
						}
						else if (/[_A-Za-z$][_A-Za-z0-9]*/.test(lexeme.join(""))) {
							pushToken("identifier");
						}
						else {
							pushToken("literal");
						}
					}
				}
			}
			else {
				// eat text up to next conditerator
				while (ch != eof) {
					while ((ch != eof) && (ch != "{")) {
						lexeme.push(ch);
						ch = getNextCh();
					}
					
					if ((ch == "{") && (i + 1 < stream.length) && (stream[i + 1] == "@")) {
						pushToken("text");
						advanceToken("{@");
						inConditerator = true;
						break;
					}
				}
			}
		}
		
		pushToken("text");
		
		return tokens;
	}
	
	function compile(template) {
		return emit(optimize(parse(tokenize(template))));
	}
	
	function isCached(template) {
		return templateCache.hasOwnProperty(template);
	}
	
	function dumpCache() {
		var template, results = [];
		
		function escapeSpecialChars(s) {
			return s.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
		}
		
		$.each(templateCache, function (template, fn) {
			results.push([escapeSpecialChars(template), " => ", escapeSpecialChars(fn.toString())].join(""));
		});
		
		return results.join("<br/>");
	}

	//
	// non-selector version
	//
	$.conditerate = function(template, vars, options) {
		var result, 
			fn = templateCache.hasOwnProperty(template) ? templateCache[template] : null,
			settings = {
				cacheTemplate: true
			};
			
		if (options) {
			$.extend(settings, options);
		}
			
		if (!fn) {
			fn = new Function("vars", compile(template));
			if (settings.cacheTemplate) {
				templateCache[template] = fn;
			}
		}
		
		return arguments.length == 1 ? fn : fn(vars);
	};
	
	//
	// selector version
	//
	$.fn.conditerate = function(template, vars, options) {
		return this.each(function () {
			$(this).html($.conditerate(template, vars || {}, options));
		});
	};
	
	// 
	// for generated code and direct use
	//
	$.conditerator = function(vars, condition, prefix, loop, suffix, forElse) {
		var i, iterator, iteratorVars, result, isEven;
		
		if (!condition) {
			return getValue(vars, forElse);
		}
		
		result = [getValue(vars, prefix)];

		iterator = isArray(condition) ? condition : [condition];
		for (i = 0; i < iterator.length; i++) {
			loopVars = {};
			
			isEven = i % 2 == 0;
			iteratorVars = {
				"$": iterator[i],
				"$0": i,
				"$1": i + 1,
				"$even": isEven,
				"$odd": !isEven,
				"$class": isEven ? "even" : "odd",
				"$first": i == 0,
				"$last": i == iterator.length - 1
			};
			
			jQuery.extend(loopVars, vars, iteratorVars)
			
			if (!isArray(iterator[i]) && (typeof iterator[i] == "object")) {
				jQuery.extend(loopVars, iterator[i])
			}
			
			result.push(getValue(loopVars, loop));
		}
		
		result.push(getValue(vars, suffix));
		
		return result.join("");
	}	
	
	// for external unit testing
	$.conditerateInternals = {
		"emit": emit,
		"optimize": optimize,
		"parse": parse,
		"tokenize": tokenize,
		"compile": compile,
		"isCached": isCached,
		"dumpCache": dumpCache
	};
	
})(jQuery);
