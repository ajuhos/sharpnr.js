sharpnr.await.compiler = {}; //Namespace definition.

//-----------------------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------------------

//Parses and compiles a JavaScript statement into an async statement.
sharpnr.await.compiler.buildStatement = function (expression, counter, opts) {
  if (!counter) { counter = 0; }
  if (!opts) { opts = { insideLoop: false }; }
  if (typeof opts.insideLoop == "undefined") { opts.insideLoop = false; }
  if (typeof opts.awaitMode == "undefined") { opts.awaitMode = false; }

  var output = "";
  var outputEnd = [];

  //Initialize parser state.
  var state = sharpnr.parser.createParserState();
  state.hasDot = false;
  state.inKeyword = false;
  state.keyword = "";

  var expression = expression + ' '; //Ensure that last char is not important.
  for (var i = 0; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    //Verify last keyword, if has one.
    if (!state.inKeyword && state.keyword != "" && state.keyword != undefined) {
      var compiled = "";
      if (!opts.awaitMode) {
        switch (state.keyword) {
          case "while":
            compiled = sharpnr.await.compiler.buildWhile(expression, i - state.keyword.length - 1, counter);
            break;
          case "do":
            compiled = sharpnr.await.compiler.buildDoWhile(expression, i - state.keyword.length - 1, counter);
            break;
          case "for":
            compiled = sharpnr.await.compiler.buildFor(expression, i - state.keyword.length - 1, counter);
            break;
          case "foreach":
            compiled = sharpnr.await.compiler.buildFor(expression, i - state.keyword.length - 1, counter, { forceForeach: true });
            break;
          case "break":
            if (opts.insideLoop) {
              compiled = sharpnr.await.compiler.buildBreak(expression, i - state.keyword.length - 1, counter);
            }
            break;
          case "continue":
            if (opts.insideLoop) {
              compiled = sharpnr.await.compiler.buildContinue(expression, i - state.keyword.length - 1, counter);
            }
            break;
          case "if":
            compiled = sharpnr.await.compiler.buildIf(expression, i - state.keyword.length - 1, counter);
            break;
          case "switch":
            compiled = sharpnr.await.compiler.buildSwitch(expression, i - state.keyword.length - 1, counter);
            break;
            //TODO: try

          default:
            //Unknown keyword, add to output:
            output += state.keyword;
            break;
        }
      }
      else if (state.keyword == "await") {
        compiled = sharpnr.await.compiler.buildAwait(expression, i - state.keyword.length - 1, counter);
      }
      else {
        //Unknown keyword, add to output:
        output += state.keyword;
      }

      state.keyword = "";

      if (compiled != "") {
        counter++;
        output += compiled.output;
        if (outputEnd[state.blockLevel - 1]) {
          outputEnd[state.blockLevel - 1] = compiled.outputEnd + outputEnd[state.blockLevel - 1];
        }
        else {
          outputEnd[state.blockLevel - 1] = compiled.outputEnd;
        }

        i = compiled.cursor;
        state.char = expression.charAt(i); //Update char to the new position.
        continue;
      }
    }

    //Save last char to output, after processing the keyword (if there was one).
    if (!state.inKeyword) {
      output += state.lastChar;
    }

    if (!sharpnr.parser.ensureProcessable(state)) {
      state.inKeyword = false;

      if (state.char == '}' && outputEnd[state.blockLevel] != undefined) {
        output += outputEnd[state.blockLevel];
        outputEnd[state.blockLevel] = undefined;
      }
      continue;
    }

    //Check for dot, a keyword can't start with dot.
    if (state.char == '.') {
      state.hasDot = true;
      state.inKeyword = false;

      if (state.keyword != undefined) {
        output += state.keyword;
        state.keyword = "";
      }
      continue;
    }

    //Check for whitespace, separators and new line.
    if (sharpnr.parser.isSeparator(state.char)) {
      state.inKeyword = false;
      state.hasDot = false;
      continue;
    }

    //Check for keyword.
    //WARNING: Keywords can't start with a dot.
    if (sharpnr.parser.isIdentifierStart(state.char) && !state.hasDot && !state.inKeyword) {
      state.inKeyword = true;
      state.keyword = state.char;
      continue;
    }

    //Process keyword.
    if (state.inKeyword) {
      state.keyword += state.char;
      continue;
    }
  }

  //Add any remaning end part to the output.
  if (outputEnd[state.blockLevel - 1] != undefined) {
    output += outputEnd[state.blockLevel - 1];
    outputEnd[state.blockLevel - 1] = undefined;
  }

  return output;//.substring(0, output.length - 1); //Remove the extra whitesapce added to ensure correct processing.
}

//-----------------------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable while segment.
sharpnr.await.compiler.buildWhile = function (source, startIndex, counter) {
  var expressionStart = sharpnr.parser.findProcessableChar(source, '(', startIndex) + 1; //Find the start of the expression.
  var expressionEnd = sharpnr.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = "function() { return " + source.substring(expressionStart, expressionEnd) + ";}";

  var blockStart = sharpnr.parser.findProcessableChar(source, '{', expressionEnd + 1) + 1; //Find the start of the while block;
  var blockEnd = sharpnr.parser.findBlockEnd(source, blockStart); //Find the end of the while block;
  var statement = "function($$$cb" + counter + ") {" + sharpnr.await.compiler.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1, { insideLoop: true }) + "}";

  var result = "sharpnr.await.$while(" + expression + "," + statement + ", function() {"
  var resultEnd = "});";

  return { output: result, outputEnd: resultEnd, cursor: blockEnd + 1 }; // Return the cursor and the result of the build.
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable do-while segment.
sharpnr.await.compiler.buildDoWhile = function (source, startIndex, counter) {
  var blockStart = sharpnr.parser.findProcessableChar(source, '{', startIndex) + 1; //Find the start of the while block;
  var blockEnd = sharpnr.parser.findBlockEnd(source, blockStart); //Find the end of the while block;
  var statement = "function($$$cb" + counter + ") {" + sharpnr.await.compiler.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1, { insideLoop: true }) + "}";

  var expressionStart = sharpnr.parser.findProcessableChar(source, '(', blockEnd + 1) + 1; //Find the start of the expression.
  var expressionEnd = sharpnr.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = "function() { return " + source.substring(expressionStart, expressionEnd) + ";}";

  var result = "sharpnr.await.$doWhile(" + expression + "," + statement + ", function() {"
  var resultEnd = "});";

  return { output: result, outputEnd: resultEnd, cursor: expressionEnd + 2 /*);*/ }; // Return the cursor and the result of the build.
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable for or for-in statement.
sharpnr.await.compiler.buildFor = function (source, startIndex, counter, opts) {
  if (!opts) { opts = { forceForeach: false }; }
  if (!opts.forceForeach) { opts.forceForeach = false; }

  var expressionStart = sharpnr.parser.findProcessableChar(source, '(', startIndex) + 1; //Find the start of the expression.
  var expressionEnd = sharpnr.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = source.substring(expressionStart, expressionEnd);

  var parts = expression.split(';');
  var varName = "";
  var expr1, expr2, expr3 = "";
  if (parts.length == 3) {
    //Try to find a local variable to use in context simulation.
    if (parts[0] != undefined && parts[0] != "") {
      var findVarRes = sharpnr.parser.findIdentifier(parts[0]);
      if (findVarRes.output == "var") {
        varName = sharpnr.parser.findIdentifier(parts[0], findVarRes.cursor + 3).output;
        expr1 = "function() { " + parts[0] + "; return " + varName + ";}";
      }
      else {
        expr1 = "function() {}";
      }
    }
    else {
      expr1 = "function() {}";
    }
    expr2 = "function(" + varName + ") { return " + parts[1] + ";}";
    expr3 = "function(" + varName + ") {" + parts[2] + "; return " + varName + ";}";
  }
  else {
    parts = expression.split(" in ");
    if (parts.length == 2) {
      var findVarRes = sharpnr.parser.findIdentifier(parts[0]);
      if (findVarRes.output == "var") {
        varName = sharpnr.parser.findIdentifier(parts[0], findVarRes.cursor + 3).output;
      }
      expr1 = "function($$$value) { " + parts[0] + " = $$$value; }";
      expr2 = "function(" + varName + ") { return " + parts[1] + ";}";
    }
    else {
      throw "Invalid for statement";
    }
  }

  var blockStart = sharpnr.parser.findProcessableChar(source, '{', expressionEnd + 1) + 1; //Find the start of the while block;
  var blockEnd = sharpnr.parser.findBlockEnd(source, blockStart); //Find the end of the while block;
  var statement = "";
  if (varName != "") {
    statement = "function(" + varName + ", $$$cb" + counter + ") {" + sharpnr.await.compiler.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1, { insideLoop: true }) + "}";
  }
  else {
    statement = "function($$$, $$$cb" + counter + ") {" + sharpnr.await.compiler.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1, { insideLoop: true }) + "}";
  }

  var result = "";
  if (parts.length == 3) {
    result = "sharpnr.await.$for(" + expr1 + "," + expr2 + "," + expr3 + "," + statement + ", function() {"
  }
  else {
    result = "sharpnr.await." + (opts.forceForeach ? "foreach" : "forin") + "(" + expr1 + "," + expr2 + "," + statement + ", function() {"
  }

  var resultEnd = "});";

  return { output: result, outputEnd: resultEnd, cursor: blockEnd + 1 }; // Return the cursor and the result of the build.
}

sharpnr.await.compiler.buildBreak = function (source, startIndex, counter) {
  counter = counter - 1; //Decrease coutner to match the level of the loop.
  return { output: "$$$cb" + counter + "('break'); return;", outputEnd: "", cursor: startIndex + ("break;").length };
}

sharpnr.await.compiler.buildContinue = function (source, startIndex, counter) {
  counter = counter - 1; //Decrease coutner to match the level of the loop.
  return { output: "$$$cb" + counter + "('continue'); return;", outputEnd: "", cursor: startIndex + ("continue;").length };
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable if segment.
sharpnr.await.compiler.buildIf = function (source, startIndex, counter) {
  //Build the default if statement:
  var res = sharpnr.parser._buildIfInternal(source, startIndex, counter);
  var ifStatement = res.output;
  var result = "sharpnr.await.$if({e:" + ifStatement.expr + ", s:" + ifStatement.stmt + "}, [";

  //Build optional statements:
  var hasElseIf = false;
  var hasElse = false;
  while (true) {
    //Try to find an else clause:
    var findElseRes = sharpnr.parser.findIdentifier(source, res.cursor);
    if (findElseRes.output == "else") {
      var nextStatementStart = findElseRes.cursor + 4;
      if (sharpnr.parser.findIdentifier(source, nextStatementStart).output == "if") {
        //else if statement
        res = sharpnr.parser._buildIfInternal(source, nextStatementStart, counter);
        result += (hasElseIf ? ',' : '') + "{e:" + res.output.expr + ", s:" + res.output.stmt + "}";
        hasElseIf = true;
      }
      else {
        //else statement
        res = sharpnr.parser._buildElseInternal(source, nextStatementStart, counter);
        result += "]," + res.output + ",";
        hasElse = true;
        break;
      }
    }

    //no more statements
    break;
  }

  result += (!hasElse ? "],null," : '') + "function() {";
  var resultEnd = "});";

  return { output: result, outputEnd: resultEnd, cursor: res.cursor }; // Return the cursor and the result of the build.
}

sharpnr.parser._buildIfInternal = function (source, startIndex, counter) {
  var expressionStart = sharpnr.parser.findProcessableChar(source, '(', startIndex) + 1; //Find the start of the expression.
  var expressionEnd = sharpnr.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = "function() { return " + source.substring(expressionStart, expressionEnd) + ";}";

  var blockStart = sharpnr.parser.findProcessableChar(source, '{', expressionEnd + 1) + 1; //Find the start of the while block;
  var blockEnd = sharpnr.parser.findBlockEnd(source, blockStart); //Find the end of the while block;
  var statement = "function($$$cb" + counter + ") {" + sharpnr.await.compiler.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1) + "}";

  var ifStatement = { expr: expression, stmt: statement };
  return { output: ifStatement, cursor: blockEnd + 1 };
}

sharpnr.parser._buildElseInternal = function (source, startIndex, counter) {
  var blockStart = sharpnr.parser.findProcessableChar(source, '{', startIndex) + 1; //Find the start of the while block;
  var blockEnd = sharpnr.parser.findBlockEnd(source, blockStart); //Find the end of the while block;

  var statement = "function($$$cb" + counter + ") {" + sharpnr.await.compiler.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1) + "}";

  return { output: statement, cursor: blockEnd + 1 }; // cursor: sourceEnd };   
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable switch segment.
sharpnr.await.compiler.buildSwitch = function (source, startIndex, counter) {
  var expressionStart = sharpnr.parser.findProcessableChar(source, '(', startIndex) + 1; //Find the start of the expression.
  var expressionEnd = sharpnr.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = "function() { return " + source.substring(expressionStart, expressionEnd) + ";}";

  var result = "sharpnr.await.$switch(" + expression + ", [";

  var res = { cursor: expressionEnd + 1 };

  //Build case statements:
  var hasCase = false;
  var hasDefault = false;
  while (true) {
    var identifierRes = sharpnr.parser.findIdentifier(source, res.cursor);
    if (identifierRes.output == "case") {
      var nextStatementStart = identifierRes.cursor;
      res = sharpnr.parser._buildCaseInternal(source, nextStatementStart, counter);
      result += (hasCase ? ',' : '') + "{v:" + res.output.val + ",s:" + res.output.stmt + "}";
      hasCase = true;
      continue;
    }
    else if (identifierRes.output == "default") {
      var nextStatementStart = identifierRes.cursor;
      res = sharpnr.parser._buildDefaultCaseInternal(source, nextStatementStart, counter);
      result += "]," + res.output + ",";
      hasDefault = true;
    }

    //no more statements
    break;
  }

  result += (!hasDefault ? "],null," : '') + "function() {";
  var resultEnd = "});";

  var blockStart = sharpnr.parser.findProcessableChar(source, '{', startIndex) + 1; //Find the start of the switch block;
  var blockEnd = sharpnr.parser.findBlockEnd(source, blockStart); //Find the end of the switch block;

  return { output: result, outputEnd: resultEnd, cursor: blockEnd + 1 }; // Return the cursor and the result of the build.
}

sharpnr.parser._buildCaseInternal = function (source, startIndex, counter) {
  var blockStart = sharpnr.parser.findProcessableChar(source, ':', startIndex) + 1; //Find the start of the case;
  var blockEnd = sharpnr.parser.findIdentifierFirst(source, "break", blockStart); //Find the end of the case;
  var statement = "function($$$cb" + counter + ") {" + sharpnr.await.compiler.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1) + "}";

  var val = source.substring(startIndex + ("case").length, blockStart - 1);

  var res = { val: val, stmt: statement };
  return { output: res, cursor: blockEnd + ("break").length };
}

sharpnr.parser._buildDefaultCaseInternal = function (source, startIndex, counter) {
  var blockStart = sharpnr.parser.findProcessableChar(source, ':', startIndex) + 1; //Find the start of the case;
  var blockEnd = sharpnr.parser.findIdentifierFirst(source, "break", blockStart); //Find the end of the case;
  var statement = "function($$$cb" + counter + ") {" + sharpnr.await.compiler.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1) + "}";

  return { output: statement, cursor: blockEnd + ("break").length };
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an await statement.
sharpnr.await.compiler.buildAwait = function (source, startIndex, counter) {
  var argsStart = sharpnr.parser.findProcessableCharOnSameLevel(source, '(', startIndex); //Find the start of the argument list.
  var expressionEnd = sharpnr.parser.findProcessableCharOnSameLevel(source, ';', argsStart); //Find the end the await statement.  

  //Find the last segment start on the correct level, to ensure that when a call list is provided in the expression
  //the correct call will be used as the base of the await operation.
  argsStart = argsStart - 1; //In simple cases the first is the correct opening char.
  var temp = startIndex;
  var argsEnd = 0;
  var callbackPosition = -1;
  while (true) {
    temp = sharpnr.parser.findProcessableCharOnSameLevel(source, '(', temp);
    if (temp != -1 && temp < expressionEnd) {
      argsStart = temp + 1; //Save the potential start position.
      argsEnd = sharpnr.parser.findSegmentEnd(source, argsStart); //Find the end of the argument list.

      //Try to find the exact callback position:
      callbackPosition = sharpnr.parser.findIdentifierFirstOnLevel(source, "$$", 0, argsStart);
      if (callbackPosition != -1 && callbackPosition < argsEnd) {
        //Prefer user settings over compiler defaults.
        // => Use an earlier method call as the awaited method, when the user exactly specifies the callback position.
        break;
      }

      temp = argsEnd + 1;
    }
    else { break; }
  }
  var hasArgs = (sharpnr.parser.findAllProcessableChars(source.substring(argsStart, argsEnd).replace(/ /g, '')).length > 0);

  var callStart = sharpnr.parser.findProcessableChar(source, ' ', startIndex) + 1; //Find the start of the function call statement.
  var callEnd = expressionEnd + 1; //Find the end of the function call statement.

  //Find the optional return value of the call:
  var globalName = "";
  var varName = "";
  if (sharpnr.parser.findProcessableCharBack(source, '=', startIndex - 1, [' ']) != -1) {
    //Return value exists.
    var findVarNameRes = sharpnr.parser.findIdentifierBack(source, startIndex - 1)
    varName = findVarNameRes.output;

    //Is it global or local?
    var varPos = sharpnr.parser.findIdentifierFirstBack(source, "var", findVarNameRes.cursor) + ("var").length;
    if (varPos == (-1 + 3) && varName != sharpnr.parser.findIdentifier(source, varPos).output) {
      //Global variable
      globalName = varName;
      varName = "";
    }
  }

  //Find the optional code part between the end of the block and the end of the expression.
  var hasCode = (sharpnr.parser.findAllProcessableChars(source.substring(argsEnd + 1, callEnd - 1).replace(/ /g, '')).length > 0);
  var code = "";
  if (hasCode) {
    code = (varName != "" ? varName : "arguments[0]") + "=arguments[0]" + sharpnr.await.compiler.buildStatement(source.substring(argsEnd + 1, callEnd - 1), counter, { awaitMode: true }) + ";";
  }

  //Find the location of the callback part:
  //Specified by $$, or the last argument.
  var resultStart = "";
  var resultEnd = "";

  callbackPosition = sharpnr.parser.findIdentifierFirstOnLevel(source, "$$", 0, argsStart);
  if (callbackPosition == -1 || callbackPosition > callEnd) {
    //Default case:
    resultStart = sharpnr.await.compiler.buildStatement(source.substring(callStart, argsEnd), counter, { awaitMode: true }) + (hasArgs ? ',' : '') + "function(" + varName + ") {" + (globalName != "" ? globalName + "=arguments[0];" : "") + code;
    resultEnd = "});";
  }
  else {
    //Callback position specified:
    resultStart = sharpnr.await.compiler.buildStatement(source.substring(callStart, callbackPosition), counter, { awaitMode: true }) + "function(" + varName + ") {" + (globalName != "" ? globalName + "=arguments[0];" : "") + code;
    resultEnd = "}" + sharpnr.await.compiler.buildStatement(source.substring(callbackPosition + ("$$").length, argsEnd) + ");", counter, { awaitMode: true });
  }

  return { output: resultStart, outputEnd: resultEnd, cursor: callEnd };
}

//-----------------------------------------------------------------------------------------------------------------------

//Parses and compiles a statement.
sharpnr.await.complier.compile = function (expression) {
  var precompiled = sharpnr.await.complier.buildStatement(expression); //Precompile the expression to use awaitable statements.
  var awaited = sharpnr.await.complier.buildStatement(precompiled, 0, { awaitMode: true }); //Compile the await statements.

  if (precompiled == awaited) {
    if (console) {
      console.log("AWAIT WARNING: Unnecessary async modifier. (" + awaited + ")");
    }
  }
  try {
    var compiled = eval_global("(" + awaited + ");"); // Compile the expression.
  }
  catch (e) {
    if (console) {
      console.log("AWAIT ERROR: Unknown compiler error. (" + awaited + ")");
    }
  }

  return compiled; //Return the ready expression.    
}