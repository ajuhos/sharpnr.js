//sharpnr.js v1.0 BETA
//http://www.sharpnrjs.com
//http://www.facebook.com/sharpnrjs
//https://github.com/ajuhos/sharpnr.js
//
//Copyright (c) 2012 Ádám Juhos, http://www.etech-studio.hu/, http://ajuhos.wordpress.com
//Copyright (c) 2012 Balázs Schwarzkopf, http://schwarzkopfb.wordpress.com
//
//Permission is hereby granted, free of charge, to any person obtaining
//a copy of this software and associated documentation files (the
//"Software"), to deal in the Software without restriction, including
//without limitation the rights to use, copy, modify, merge, publish,
//distribute, sublicense, and/or sell copies of the Software, and to
//permit persons to whom the Software is furnished to do so, subject to
//the following conditions:
//
//The above copyright notice and this permission notice shall be
//included in all copies or substantial portions of the Software.
//
//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
//LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
//OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
//WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

//------------------------------------------------------------------------

"use strict"; //As our aim is to mke JavaScript as good a s C#, it is recommended to use strict mode.

var sharpnr = {}; //Namespace definition.

//OLD IE support:

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (obj, start) {
    for (var i = (start || 0), j = this.length; i < j; i++) {
      if (this[i] === obj) { return i; }
    }
    return -1;
  }
}

sharpnr.$$code_evaled = 0;
function eval_global(codetoeval) {
  if (window.execScript)
    window.execScript('sharpnr.$$code_evaled = ' + codetoeval, ''); // execScript doesn’t return anything 
  else
    sharpnr.$$code_evaled = eval(codetoeval);
  return sharpnr.$$code_evaled;
}

sharpnr.parser = {}; //Namespace definition.

//------------------------------------------------------------------
//UTILITY METHODS: Character testers

sharpnr.parser.isNumber = function (character) {
  return /^[0-9]$/.test(character);
}

sharpnr.parser.isLetter = function (character) {
  return /^[a-z]$/.test(character);
}

sharpnr.parser.isIdentifierStart = function (character) {
  return /^[a-z_\$\\]$/.test(character);
}

sharpnr.parser.isAlphanumeric = function (character) {
  return /^[a-z0-9]$/.test(character);
}

sharpnr.parser.isSeparator = function (character) {
  return (['.', ' ', '\n', '\r', '\t', ',', ';', '(', '[', '+', '-', '*', '/', '\\', '&', '|', '~', '^', '<', '>', ':', '=', '!', '%', ')', ']', '{', '}'].indexOf(character) != -1);
}

//------------------------------------------------------------------
//UTILITY METHODS: Character parsers

//Finds the identifier in a statement (no others chars accepted before).
sharpnr.parser.findIdentifier = function (source, startIndex) {
  if (!startIndex) { startIndex = 0; }
  var identifier = "";

  var state = sharpnr.parser.createParserState();
  state.inIdentifier = false;

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state)) {
      continue;
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if (sharpnr.parser.isSeparator(state.char) && state.char != '.') {
      if (state.inIdentifier) {
        return { output: identifier, cursor: i - identifier.length };
      }
      continue;
    }

    //Check for identifier.
    if (sharpnr.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;
      continue;
    }

    //Process identifier.
    if (state.inIdentifier) {
      identifier += state.char;
      continue;
    }
    else {
      break; //Invalid character found.  
    }
  }

  return { output: "", cursor: -1 };
}

//Finds the first occurance of an identifier in a statement.
sharpnr.parser.findIdentifierFirst = function (source, identifierToFind, startIndex) {
  if (!startIndex) { startIndex = 0; }
  var identifier = "";

  var state = sharpnr.parser.createParserState();
  state.inIdentifier = false;

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state)) {
      continue;
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if (sharpnr.parser.isSeparator(state.char) && state.char != '.') {
      if (state.inIdentifier) {
        if (identifier == identifierToFind) {
          return i - identifier.length;
        }
        else {
          state.inIdentifier = false;
          identifier = "";
        }
      }
      continue;
    }

    //Check for identifier.
    if (sharpnr.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;
      continue;
    }

    //Process identifier.
    if (state.inIdentifier) {
      identifier += state.char;
      continue;
    }
  }

  return -1;
}

//Finds the first occurance of an identifier in a statement on aspecific block level.
sharpnr.parser.findIdentifierFirstOnLevel = function (source, identifierToFind, segmentLevel, startIndex) {
  if (!startIndex) { startIndex = 0; }
  if (!segmentLevel) { segmentLevel = 0; }
  var identifier = "";

  var state = sharpnr.parser.createParserState();
  state.inIdentifier = false;
  state.segmentLevel = 0;

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state)) {
      continue;
    }

    //Check for segment.
    if (state.char == '(') {
      state.segmentLevel++;
      continue;
    }

    //Check for segment end.
    if (state.char == ')') {
      if (state.segmentLevel >= 1) {
        state.segmentLevel--;
        continue;
      }
      else if (identifier == identifierToFind && state.segmentLevel == segmentLevel && state.blockLevel == 0) {
        return i - identifier.length;
      }
      else {
        return -1;
      }
    }

    if (state.char == '{' || state.char == '}') {
      if (identifier == identifierToFind && state.segmentLevel == segmentLevel && state.blockLevel == 0) {
        return i - identifier.length;
      }
      else {
        //Left the scope of the query.
        return -1;
      }
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if (sharpnr.parser.isSeparator(state.char) && state.char != '.') {
      if (state.inIdentifier) {
        if (identifier == identifierToFind && state.segmentLevel == segmentLevel && state.blockLevel == 0) {
          return i - identifier.length;
        }
        else {
          state.inIdentifier = false;
          identifier = "";
        }
      }
      continue;
    }

    //Check for identifier.
    if (sharpnr.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;
      continue;
    }

    //Process identifier.
    if (state.inIdentifier) {
      identifier += state.char;
      continue;
    }
  }

  return -1;
}

//Finds the first identifier in a statement backwards.
sharpnr.parser.findIdentifierBack = function (source, startIndex) {
  if (!startIndex) { startIndex = 0; }
  var identifier = "";

  var state = sharpnr.parser.createParserState();
  state.inIdentifier = false;

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i > 0; i--) {
    state.lastChar = expression[i - 1];
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessableBack(state)) {
      continue;
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if (sharpnr.parser.isSeparator(state.char) && state.char != '.') {
      if (state.inIdentifier) {
        return { output: identifier, cursor: i };
      }
      continue;
    }

    //Check for identifier.
    if (sharpnr.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;
      continue;
    }

    //Process identifier.
    if (state.inIdentifier) {
      identifier = state.char + identifier;
      continue;
    }
  }

  return { output: "", cursor: -1 };
}

//Finds the first occurance of an identifier in a statement.
sharpnr.parser.findIdentifierFirstBack = function (source, identifierToFind, startIndex) {
  if (!startIndex) { startIndex = 0; }
  var identifier = "";

  var state = sharpnr.parser.createParserState();
  state.inIdentifier = false;

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i > 0; i--) {
    state.lastChar = expression[i - 1];
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessableBack(state)) {
      continue;
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if (sharpnr.parser.isSeparator(state.char) && state.char != '.') {
      if (state.inIdentifier) {
        if (identifier == identifierToFind) {
          return i - identifier.length;
        }
        else {
          state.inIdentifier = false;
          identifier = "";
        }
      }
      continue;
    }

    //Check for identifier.
    if (sharpnr.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;
      continue;
    }

    //Process identifier.
    if (state.inIdentifier) {
      identifier = state.char + identifier;
      continue;
    }
  }

  return -1;
}

//Finds all processable chars in a statement.
sharpnr.parser.findAllProcessableChars = function (source, startIndex) {
  if (!startIndex) { startIndex = 0; }
  var state = sharpnr.parser.createParserState();
  var output = "";

  var expression = source; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state, { block: false, string: false })) {
      continue;
    }

    output += state.char;
  }

  return output;
}

//Finds a specific characters first processable occurance.
sharpnr.parser.findProcessableChar = function (source, charToFind, startIndex) {
  if (!startIndex) { startIndex = 0; }
  var state = sharpnr.parser.createParserState();

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state, { block: false })) {
      continue;
    }

    if (state.char == charToFind) {
      return i;
    }
  }

  return -1;
}


//Finds a specific characters first processable occurance.
sharpnr.parser.findProcessableCharOnSameLevel = function (source, charToFind, startIndex) {
  if (!startIndex) { startIndex = 0; }
  var state = sharpnr.parser.createParserState();
  state.segmentLevel = 0;
  state.arrayLevel = 0;

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state, { block: false })) {
      continue;
    }


    //Check for block.
    if (state.char == '{') {
      if (charToFind == "{" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
        return i;
      }

      state.blockLevel++;
      continue;
    }

    //Check for block end.
    if (state.char == '}') {
      if (state.blockLevel >= 1) {
        state.blockLevel--;

        if (charToFind == "}" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
          return i;
        }
        continue;
      }
      else {
        return -1; //Left the context of the query.    
      }
    }

    //Check for segment.
    if (state.char == '(') {
      if (charToFind == "(" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
        return i;
      }

      state.segmentLevel++;
      continue;
    }

    //Check for segment end.
    if (state.char == ')') {
      if (state.segmentLevel >= 1) {
        state.segmentLevel--;

        if (charToFind == ")" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
          return i;
        }
        continue;
      }
      else {
        return -1; //Left the context of the query.    
      }
    }


    //Check for array.
    if (state.char == '(') {
      if (charToFind == "(" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
        return i;
      }

      state.arrayLevel++;
      continue;
    }

    //Check for array end.
    if (state.char == ')') {
      if (state.arrayLevel >= 1) {
        state.arrayLevel--;

        if (charToFind == ")" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
          return i;
        }
        continue;
      }
      else {
        return -1; //Left the context of the query.    
      }
    }


    if (state.char == charToFind && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
      return i;
    }

  }

  return -1;
}

//Finds a specific characters first processable occurance backwards.
sharpnr.parser.findProcessableCharBack = function (source, charToFind, startIndex, allowedChars) {
  if (!startIndex) { startIndex = source.length - 1; }
  var state = sharpnr.parser.createParserState();

  var expression = source;
  for (var i = startIndex; i > 0; i--) {
    state.lastChar = expression[i - 1];
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessableBack(state, { block: false })) {
      continue;
    }

    if (state.char == charToFind) {
      return i;
    }

    if (allowedChars) {
      if (allowedChars.indexOf(state.char) == -1) {
        break;
      }
    }
  }

  return -1;
}

//Finds the end of a block.
sharpnr.parser.findBlockEnd = function (source, startIndex) {
  if (!startIndex) { startIndex = 0; }
  var state = sharpnr.parser.createParserState();

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state)) {
      continue;
    }

    if (state.char == '}') {
      return i;
    }
  }

  return source.length;
}

//Finds the end of a segment.
sharpnr.parser.findSegmentEnd = function (source, startIndex) {
  if (!startIndex) { startIndex = 0; }

  var state = sharpnr.parser.createParserState();
  state.segmentLevel = 0;

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state)) {
      continue;
    }

    //Check for segment.
    if (state.char == '(') {
      state.segmentLevel++;
      continue;
    }

    //Check for segment end.
    if (state.char == ')') {
      if (state.segmentLevel >= 1) {
        state.segmentLevel--;
        continue;
      }
      else {
        return i;
      }
    }
  }

  return source.length;
}

//Normalize the segment and block levels of a part.
sharpnr.parser.normalize = function (source, startIndex) {
  if (!startIndex) { startIndex = 0; }

  var state = sharpnr.parser.createParserState();
  state.segmentLevel = 0;

  var output = "";

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!sharpnr.parser.ensureProcessable(state)) {
      output += state.char;
      continue;
    }

    //Do not process invalid blocks. 
    if (state.char == "{" || state.char == "}") {
      continue;
    }

    //Check for segment.
    if (state.char == '(') {
      state.segmentLevel++;
      output += state.char;
      continue;
    }

    //Check for segment end.
    if (state.char == ')') {
      //Do not process invalid segments. 
      if (state.segmentLevel >= 1) {
        state.segmentLevel--;
        output += state.char;
      }
      continue;
    }

    output += state.char;
  }

  return source.length;
}

//--------------------------------------------------------------------------
//PARSER UTILITIES:

//To use parser utilites the parser must use the generic parser state object.
sharpnr.parser.createParserState = function () {
  return {
    char: '',
    lastChar: '',

    inLineComment: false,
    inBlockComment: false,

    inString: false,
    stringChar: '',

    blockLevel: 0
  };
}

//Ensures that the current char is not whitespace, string or comment.
sharpnr.parser.ensureProcessable = function (state, opts) {
  if (!opts) { opts = { block: true } }
  if (typeof opts.block == "undefined") { opts.block = true; }
  if (typeof opts.string == "undefined") { opts.string = true; }

  //Do not process anything until end of string.
  //WARNING: String char inside string.
  if (state.inString) {
    if (state.lastChar != "\\" && state.char == state.stringChar) {
      state.inString = false;
    }
    return false;
  }

  //Do not process anything until new line.
  if (state.inLineComment) {
    if (state.char == '\n') {
      state.inLineComment = false;
    }
    return false;
  }

  //Do not process anything until end of comment.
  if (state.inBlockComment) {
    if (state.lastChar == "*" && state.char == '/') {
      state.inBlockComment = false;
    }
    return false;
  }

  if (opts.string) {
    //Check for string.
    if (state.char == '"' || state.char == "'") {
      state.inString = true;
      state.stringChar = state.char;
      return false;
    }
  }

  //Check for line comment.
  if (state.lastChar == '/' && state.char == '/') {
    state.inLineComment = true;
    return false;
  }

  //Check for block comment.
  if (state.lastChar == '/' && state.char == '*') {
    state.inBlockComment = true;
    return false;
  }

  if (opts.block) {
    //Check for block.
    if (state.char == '{') {
      state.blockLevel++;
      return false;
    }

    //Check for block end.
    if (state.char == '}') {
      if (state.blockLevel >= 1) {
        state.blockLevel--;
        return false;
      }
    }
  }

  //This char is processable.
  return true;
}

//Ensures that the current char is not whitespace, string or comment.
sharpnr.parser.ensureProcessableBack = function (state) {
  //Do not process anything until end of string.
  //WARNING: String char inside string.
  if (state.inString) {
    if (state.lastChar != "\\" && state.char == state.stringChar) {
      state.inString = false;
    }
    return false;
  }

  //Do not process anything until end of comment.
  if (state.inBlockComment) {
    if (state.lastChar == "/" && state.char == '*') {
      state.inBlockComment = false;
    }
    return false;
  }

  //Check for string.
  if (state.char == '"' || state.char == "'") {
    state.inString = true;
    state.stringChar = state.char;
    return false;
  }


  //Check for block comment.
  if (state.lastChar == '*' && state.char == '/') {
    state.inBlockComment = true;
    return false;
  }

  //Check for block.
  if (state.char == '}') {
    state.blockLevel++;
    return false;
  }

  //Check for block end.
  if (state.char == '{') {
    if (state.blockLevel >= 1) {
      state.blockLevel--;
      return false;
    }
  }

  //This char is processable.
  return true;
}

sharpnr.await = {}; //Namespace definition.

//-----------------------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------------------

sharpnr.await.$while = function (expression, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  sharpnr.await.processWhile(expression, statement, cbs);
}

sharpnr.await.processWhile = function (expr, statement, callbacks) {
  var exprRef = expr();
  if (!exprRef) {
    callbacks["break"]();
    return;
  }
  statement(function (stmt) {
    if (stmt == "continue" || stmt == undefined) {
      sharpnr.await.processWhile(expr, statement, callbacks);
    }
    else if (stmt == "break") {
      callbacks["break"]();
    }
  });
}

//------------------------------------------------------------------------

sharpnr.await.$doWhile = function (expression, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  sharpnr.await.processDoWhile(expression, statement, cbs);
}

sharpnr.await.processDoWhile = function (expr, statement, callbacks) {
  statement(function (stmt) {
    if (stmt == "continue" || stmt == undefined) {
      var exprRef = expr();
      if (!exprRef) {
        callbacks["break"]();
        return;
      }

      sharpnr.await.processDoWhile(expr, statement, callbacks);
    }
    else if (stmt == "break") {
      callbacks["break"]();
    }
  });
}

//------------------------------------------------------------------------

sharpnr.await.$for = function (expr1, expr2, expr3, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  sharpnr.await.processFor(expr1, expr2, expr3, statement, cbs);
}

sharpnr.await.processFor = function (expr1, expr2, expr3, statement, callbacks, context) {
  if (!context) {
    context = { i: expr1() };
  }
  var testExprRef = expr2(context.i);
  if (!testExprRef) {
    callbacks["break"]();
    return;
  }
  statement(context.i, function (stmt) {
    if (stmt == "continue" || stmt == undefined) {
      context.i = expr3(context.i);
      sharpnr.await.processFor(expr1, expr2, expr3, statement, callbacks, context);
    }
    else if (stmt == "break") {
      callbacks["break"]();
    }
  });
}

//------------------------------------------------------------------------

sharpnr.await.forin = function (expr1, expr2, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  sharpnr.await.processForIn(expr1, expr2, statement, cbs);
}

sharpnr.await.processForIn = function (expr1, expr2, statement, callbacks, context) {
  var exprRef = expr2();
  if (!context) {
    context = { keys: [], i: 0, length: 0 };
    if (exprRef) {
      for (var key in exprRef) {
        if (typeof key == "number" || exprRef.hasOwnProperty(key)) {
          context.keys.push(key);
          context.length++;
        }
      }
    }
  }
  if (!exprRef || context.length <= context.i) {
    callbacks["break"]();
    return;
  }
  var P = exprRef[context.keys[context.i]];
  expr1(P);
  statement(context.keys[context.i], function (stmt) {
    if (stmt == "continue" || stmt == undefined) {
      context.i++;
      sharpnr.await.processForIn(expr1, expr2, statement, callbacks, context);
    }
    else if (stmt == "break") {
      callbacks["break"]();
    }
  });
}

//-----------------------------------------------------------------------

//DO NOT USE FOREACH !!!
//Currently foreach is under development.
//TODO: Firefox support.
//TODO: One line code support: foreach() {}
//TODO: Support var inside statement: foreach(var item in array)

sharpnr.await.foreach = function (expr1, expr2, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  sharpnr.await.processForeach(expr1, expr2, statement, cbs);
}

sharpnr.await.processForeach = function (expr1, expr2, statement, callbacks, context) {
  var exprRef = expr2();
  if (!context) {
    context = { keys: [], i: 0, length: 0 };
    if (exprRef) {
      for (var key in exprRef) {
        if (typeof key == "number" || exprRef.hasOwnProperty(key)) {
          context.keys.push(key);
          context.length++;
        }
      }
    }
  }
  if (!exprRef || context.length <= context.i) {
    callbacks["break"]();
    return;
  }
  var P = exprRef[context.keys[context.i]];
  expr1(P);
  statement(P, function (stmt) {
    if (stmt == "continue" || stmt == undefined) {
      context.i++;
      sharpnr.await.processForeach(expr1, expr2, statement, callbacks, context);
    }
    else if (stmt == "break") {
      callbacks["break"]();
    }
  });
}

//-----------------------------------------------------------------------

sharpnr.await.$if = function (exprIf, exprsElseIf, stmtElse, callback) {
  sharpnr.await.processIf(exprIf, exprsElseIf, stmtElse, callback);
}

sharpnr.await.processIf = function (objIf, objsElseIf, stmtElse, callback) {
  if (objIf.e()) {
    objIf.s(callback);
    return;
  }
  else {
    for (var i in objsElseIf) {
      if (typeof i == "number" && objsElseIf[i].e()) {
        objsElseIf[i].s(callback);
        return;
      }
    }
  }

  if (stmtElse) {
    stmtElse(callback);
    return;
  }

  callback();
}

//-----------------------------------------------------------------------

sharpnr.await.$switch = function (swcExpr, exprs, stmtDefault, callback) {
  sharpnr.await.processSwitch(swcExpr, exprs, stmtDefault, callback);
}

sharpnr.await.processSwitch = function (swcExpr, objs, stmtDefault, callback) {
  var swc = swcExpr();

  for (var i in objs) {
    if (typeof i == "number" && objs[i].v == swc) {
      objs[i].s(callback);
      return;
    }
  }

  if (stmtDefault) {
    stmtDefault(callback);
    return;
  }

  callback();
}

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
sharpnr.await.compiler.compile = function (expression) {
  var precompiled = sharpnr.await.compiler.buildStatement(expression); //Precompile the expression to use awaitable statements.
  var awaited = sharpnr.await.compiler.buildStatement(precompiled, 0, { awaitMode: true }); //Compile the await statements.

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

//Keywords:
var $$ = {}; //Defines the placeholder keyword for callbacks.
var await = {};

//This method of the library enables you to define async methods in JavaScript.
function async(method) {
  return sharpnr.await.compiler.compile(method);
}

//Define foreach to avoid errors.
function foreach(a, b, c) { }
sharpnr.jinq = 
{
  /*Public members*/
  /****************/

  debug: true,

  order: { ' ': 0,  '!': 0,  '"': 0,  "'": 0,  '#': 0,
           '$': 0,  '%': 0,  '&': 0,  '(': 0,  ')': 0,
           '*': 0,  '+': 0,  ',': 0,  '-': 0,  '.': 0,
           '/': 0,  ':': 0,  ';': 0,  '<': 0,  '>': 0,
           '=': 0,  '?': 0,  '@': 0,  '[': 0,  ']': 0,
           '\\':0,  '^': 0,  '_': 0,  '{': 0,  '}': 0,
           '|': 0,  '~': 0,
           '0': 1,  '1': 2,  '2': 3,  '3': 4,  '4': 5,
           '5': 6,  '6': 7,  '7': 8,  '8': 9,  '9': 10,
           'a': 11, 'A': 11, 'á': 11, 'Á': 11, 'b': 12, 
           'B': 12, 'c': 13, 'C': 13, 'd': 14, 'D': 14,
           'e': 15, 'E': 15, 'é': 15, 'É': 15, 'f': 16,
           'F': 16, 'g': 17, 'G': 17, 'h': 18, 'H': 18, 
           'i': 19, 'I': 19, 'í': 19, 'Í': 19, 'j': 20,
           'J': 20, 'k': 21, 'K': 21, 'l': 22, 'L': 22,
           'm': 23, 'M': 23, 'n': 24, 'N': 24, 'o': 25,
           'O': 25, 'ó': 25, 'Ó': 25, 'ö': 26, 'Ö': 26,
           'õ': 26, 'Õ': 26, 'p': 27, 'P': 27, 'q': 28,
           'Q': 28, 'r': 29, 'R': 29, 's': 30, 'S': 30,
           't': 31, 'T': 31, 'u': 32, 'U': 32, 'ú': 32, 
           'Ú': 32, 'ü': 33, 'Ü': 33, 'û': 33, 'Û': 33,
           'v': 34, 'V': 34, 'w': 35, 'W': 35, 'x': 36,
           'X': 36, 'y': 37, 'Y': 37, 'z': 38, 'Z': 38 },

  range: function(n, from)
  {
    if(n)
    {
      var c = [];

      for(var i = (from || 0); i < (from ? (from + n) : n); i++)
      {
        c.push(i);
      }

      return c;
    }

    return null;
  },

  sequence: function(rule, n, from)
  {
    if(rule && n)
    {
      if(typeof(rule) == 'function')
      {
        var c = [];

        for(var i = (from || 0); i < (from ? (from + n) : n); i++)
        {
          c.push(rule(i));
        }
 
        return c;
      }
      else if(typeof(rule) == 'string')
      {
        rule = sharpnr.jinq.$parseLambda(rule);
        
        if(rule)
        {
          return sharpnr.jinq.sequence(rule, n, from);
        }
      }
      else
      {
        if(sharpnr.jinq.debug)
        {
          console.log('JINQ Exception: invalid rule given on JINQ.sequence()');
        }
      }
    }

    return null;
  },

  /*Private members*/
  /*****************/

  $paramCount: function(str)
  {
    //Expression must contain a lambda operator 
    if(str.indexOf('=>') == -1)
    {
      return null;
    }

    var params = str.split('=>')[0].replace('(','').replace(')', '').removeSpaces().split(',');

    var count = 0;

    for(var i = 0; i < params.length; i++)
    {
      if(params[i])
      {
        count++;
      }
    }

    return count;
  },

  $parseLambda: function(str, context)
  {
    //Expression must contain a lambda operator 
    if(str.indexOf('=>') == -1)
    {
      if(sharpnr.jinq.debug)
      {
        console.log("JINQ Exception: Unparsable lambda expression: '" + str + "'");
      }

      return null;
    }

    try
    {
      //It's a lambda statement or a lambda expression with object return
      var statementStart = str.indexOf('{');
      if(statementStart > -1 && str.lastIndexOf('}') > statementStart)
      {
        var block = str.substring(statementStart, str.lastIndexOf('}') + 1);    

        //It's a lambda statement
        if(!sharpnr.jinq.$isObjectLiteral(block))
        {
          var parameters =  str.substring(0, str.indexOf('=>')) //parameters are before the lambda operator
                               .replace('(', '')
                               .replace(')', '');
          var body       =  str.substring(str.indexOf('=>') + 2) //body is after the lambda op
                               .replace('{', '');
          body           = body.substring(0, body.lastIndexOf('}') - 1); //remove last '}' char

          var varScope   = ''; //variable scope generated from context
          var saveScope  = ''; //code to save variables into context
 
          //generate scopes from context
          if(context)
          {
            for(var key in context)
            {
              varScope += 'var {0} = $obj.{1}; '.format(key, key);
              saveScope += '$obj.{0} = {1}; '.format(key, key);
            }
          }

          //if function body contains a return keyword,
          //scope saver code must be before that
          var retPos = body.indexOf('return');

          if(retPos > -1)
          {
            body = body.insert(saveScope, retPos);
          }
          else
          {
            body = body + saveScope;
          }

          //create function by generated code
          var func = new Function(parameters, varScope + body);

          if(context)
          {
            //make context accessable in new function
            func = func.wrap(context);
          }

          return func;
        }
        //It's a lambda expression with object return
        else
        {
          var params = str.substring(0, str.indexOf('=>'));

          alert('{0} => { return {1}; }'.format(params, block));

          return sharpnr.jinq.$parseLambda( '{0} => { return {1}; }'.format(params, block) );
        }
      }
      //It's a lambda expression
      else
      {
        var parameters = str.substring(0, str.indexOf('=>')) //parameters are after the lambda operator
                            .replace('(', '')
                            .replace(')', '');
        var body       = str.substring(str.indexOf('=>') + 2); //body is after the lambda op

        var varScope   = ''; //variable scope generated from context

        //generate variable scope from context
        if(context)
        {
          for(var key in context)
          {
            varScope += 'var {0} = $obj.{1}; '.format(key, key);
          }
        }

        //create function by generated code
        var func = new Function(parameters, '{0}return ( {1} );'.format(varScope, body));

        if(context)
        {
          //make context accessable in new function
          func = func.wrap(context);
        }

        return func;
      }
    }
    catch(e)
    {
      if(sharpnr.jinq.debug)
      {
        console.log("JINQ Exception: Unparsable lambda expression: '" + str + "'");
      }

      return null;
    }
  },

  $extend: function(obj1, obj2)
  {
    if((typeof(obj1) === 'object') && (typeof(obj2) === 'object'))
    {
      var extended = {};

      if(Object.keys(obj1).length > 0)
      {
        extended = sharpnr.jinq.$extend(extended, obj1);
      }

      for(var key in obj2)
      {
        extended[key] = obj2[key];
      }

      return extended;
    }
    else
    {
      if(sharpnr.jinq.debug)
      {
        console.log("JINQ Exception: invalid objects given on JINQ.extend()");
      }

      return null;
    }
  },

  $isObjectLiteral: function(str)
  {
  }
}

//////////////////////////
//Utilities used by JINQ//
//////////////////////////

//Wraps the function into another one that has an '$obj' parameter.
//This way the original function can have access to the given object now named '$obj'
Function.prototype.wrap = function(obj)
{
  return new Function('$obj', 'return {0};'.format(this))(obj);  
};

String.prototype.insert = function(str, pos)
{
  return this.substring(0, pos) + str + this.substring(pos);
};

String.prototype.format = function() 
{  
  var args = arguments;  
  var pattern = RegExp("{([0-" + (arguments.length-1) + "])}", "g");

  return this.replace(pattern, function(match, index) 
  {  
    return args[index];  
  });  
};

String.prototype.removeSpaces = function()
{
  return this.replace(/\s/g, '');
};

(function (JINQ)
{
///////////////////
//Labda functions//
///////////////////

/// LAMBDA ///
/// multiple String.lambda(multiple params..., [Object context]) ///
//Parse & execute the given lambda expression
//The first n params will be given to expression as arguments and last n+1-th can be the variable context.
String.prototype.l =
String.prototype.lambda = function()
{
  var args = Array.prototype.slice.call(arguments), ctx = null;

  if(JINQ.$paramCount(this) < args.length)
  {
    ctx =  args[args.length - 1];
    args.splice(args.length, 1);
  }

  return JINQ.$parseLambda(this, ctx).apply(null, args);
};

/// PARSELAMBDA ///
/// Function String.parseLambda([Object context]) ///
//Parse the given lambda expression
String.prototype.pl =
String.prototype.parseLambda = function(ctx)
{
  return JINQ.$parseLambda(this, ctx);
};

/////////////////////////////////////
//Collection manipulation functions//
/////////////////////////////////////

/// ASARRAY ///
/// Array Object.asArray() ///
//Converts any object to array
Object.prototype.asArray = function()
{
  if(!this)
  {
    return null;
  }

  var c = [];

  for (var key in this) 
  {
    if ( ( this instanceof Array && this.constructor === Array && key === 'length' ) || 
           key === '$attached' || 
          !this.hasOwnProperty(key) ) 
    {
      continue;
    }

    c.push(this[key]);
  }

  return c;
};

/// RANDOMINDEX ///
/// number Array.randomIndex([min], [max]) ///
//Picks a random index number (i) from the array
Array.prototype.randomIndex = function(min, max)
{
  if(!this || !this.length)
  {
    return null;
  }
  else if(this.length == 1)
  {
    return 0;
  }

  if(!min)
  {
    min = 0;
  }

  if(!max)
  {
    max = this.length;
  }

  return Math.floor(Math.random() * (max - min)) + min;
};

/// RANDOM ///
/// item Array.random([predicate]) ///
//Picks a random item from the array
//If there is a predicate given, the picked item will matching with that
Array.prototype.random = function(predicate)
{
  if(!this || !this.length)
  {
    return null;
  }
  else if(this.length == 1)
  {
    return this[0];
  }
  else
  {
    if(!predicate)
    {
      return this[this.randomIndex()];
    }
    if(typeof(predicate) == 'function')
    {
      var lasts = [];

      var item = this[this.randomIndex()];

      while(true)
      {
        if(lasts.length < this.length)
        {
          if(!predicate(item))
          {
            if(!lasts.contains(item))
            {
              lasts.push(item);
            }

            item = this[this.randomIndex()];
          }
          else
          {
            return item;
          }
        }
        else
        {
          return null;
        }
      }

      return item;
    }
    else if(typeof(predicate) == 'string')
    {
      predicate = JINQ.$parseLambda(predicate, this.$attached);

      if(predicate)
      {
        return this.random(predicate);
      }
    }
    else
    {
      if(JINQ.debug)
      {
        console.log('JINQ Exception: invalid predicate given on Array.random()');
      }

      return null;
    }
  }
};

/// MIN ///
/// item Array.min([selector]) ///
//Picks the smallest number from the array
//If there is a selector given, Array.min() will return with the item what have the smallest value on the selected property
Array.prototype.min = function(selector)
{
  if(this.length == 0)
  {
    return null;
  }

  var m = this[0];

  if(!selector)
  {
    for(var i = 1; i < this.length; i++)
    {
      if(this[i] < m)
      {
        m = this[i];
      }
    }

    return m;
  }
  else if(typeof(selector) === 'function')
  {
     for(var i = 1; i < this.length; i++)
     {
       if(selector(this[i]) < selector(m))
       {
         m = this[i];
       }
     }

     return m;
  }
  else if(typeof(selector) === 'string')
  {
    selector = JINQ.$parseLambda(selector, this.$attached);

    if(selector)
    {
      return this.min(selector);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid selector given on Array.min()');
    }

    return null;
  }

  return this;
};

/// MAX ///
/// item Array.max([selector]) ///
//Picks the biggest number from the array
//If there is a selector given, Array.min() will return with the item what have the biggest value on the selected property
Array.prototype.max = function(selector)
{
  if(this.length == 0)
  {
    return null;
  }

  var m = this[0];

  if(!selector)
  {
    for(var i = 1; i < this.length; i++)
    {
      if(this[i] > m)
      {
        m = this[i];
      }
    }

    return m;
  }
  else if(typeof(selector) === 'function')
  {
     for(var i = 1; i < this.length; i++)
     {
       if(selector(this[i]) > selector(m))
       {
         m = this[i];
       }
     }

     return m;
  }
  else if(typeof(selector) === 'string')
  {
    selector = JINQ.$parseLambda(selector, this.$attached)

    if(selector)
    {
      return this.max(selector);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid selector given on Array.max()');
    }

    return null;
  }

  return this;
};

/// SUM ///
/// number Array.sum([selector]) ///
//Summarize array's items (or items' selected properties)
Array.prototype.sum = function(selector)
{
  var s = 0;

  if(!selector)
  {
    for(var i = 0; i < this.length; i++)
    {
      s += this[i];
    }

    return s;
  }
  else if(typeof(selector) === 'function')
  {
    for(var i = 0; i < this.length; i++)
    {
      s += selector(this[i]);
    }

    return s;
  }
  else if(typeof(selector) === 'string')
  {
    selector = JINQ.$parseLambda(selector, this.$attached);

    if(selector)
    {
      return this.sum(selector);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid selector given on Array.sum()');

      return null;
    }
  }

  return this;
};

Array.prototype.take = function(n, from)
{
  var c = [];

  if(!n)
  {
    return this;
  }
  else
  {
    for(var i = (from || 0); i < (from ? (from + n) : n); i++)
    {
      c.push(this[i]);
    } 
  }
  
  c.$attached = this.$attached;

  return c;
};

Array.prototype.contains = function(value)
{
  if(Array.prototype.indexOf)
  {
    return (this.indexOf(value) > -1);
  }
  else
  {
    for (var i = 0; i < this.length; i++) 
    {
      if (this[i] === value) 
      {
        return true;
      }
    }

    return false;
  }
}

Array.prototype.select = function(selector)
{
  var c = [];

  if(typeof(selector) === 'function')
  {
    for(var i = 0; i < this.length; i++)
    {
      c.push(selector(this[i]));
    }

    c.$attached = this.$attached;

    return c;
  }
  else if(typeof(selector) === 'string')
  {
    selector = JINQ.$parseLambda(selector, this.$attached);

    if(selector)
    {
      return this.select(selector);
    }
  }
  else
  {   
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid selector given on Array.select()');

      return null;
    }
  }

  return this;
};

Array.prototype.where = function(predicate)
{
  var c = [];

  if(typeof(predicate) === 'function')
  {
    for(var i = 0; i < this.length; i++)
    {
      if(predicate(this[i]))
      {
        c.push(this[i]);
      }
    }

    c.$attached = this.$attached;

    return c;
  }
  else if(typeof(predicate) === 'string')
  {
    predicate = JINQ.$parseLambda(predicate, this.$attached);

    if(predicate)
    {
      return this.where(predicate);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid predicate given on Array.where()');

      return null;
    }
  }

  return this;
};

Array.prototype.single = function(predicate)
{
  if(this.length == 0)
  {
    return null;
  }
  else
  {
    if(!predicate)
    {
      if(this.length > 1)
      {
        return null;
      }
      else
      {
        return this[0];
      }
    }
    else if(typeof(predicate) == 'function')
    {
      var item = null;

      for(var i = 0; i < this.length; i++)
      {
        if(predicate(this[i]))
        {
          if(item)
          {
            return null;
          }
          else
          {
            item = this[i];
          }
        }
      }

      return item;
    }
    else if(typeof(predicate) == 'string')
    {
      predicate = JINQ.$parseLambda(predicate, this.$attached);

      if(predicate)
      {
        return this.single(predicate);
      }
    }
    else
    {
      if(JINQ.debug)
      {
        console.log('JINQ Exception: invalid predicate given on Array.single()');
      }
    }
  }

  return null;
};

Array.prototype.first = function(predicate)
{
  if(this.length == 0)
  {
    return null;
  }

  if(!predicate)
  {
    return this[0];
  }
  else if(typeof(predicate) === 'function')
  {
    var i = 0;

    while(true)
    {
      if(predicate(this[i]))
      {
        return this[i];
      }
      else if(i == this.length - 1)
      {
        return null;
      }

      i++;
    }
  }
  else if(typeof(predicate) === 'string')
  {
    predicate = JINQ.$parseLambda(predicate, this.$attached);

    if(predicate)
    {
      return this.first(predicate);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid predicate given on Array.first()');
    }
  }

  return null;
};

Array.prototype.last = function(predicate)
{
  if(this.length == 0)
  {
    return null;
  }

  if(!predicate)
  {
    return this[this.length - 1];
  }
  else if(typeof(predicate) === 'function')
  {
    var i = this.length - 1;

    while(true)
    {
      if(predicate(this[i]))
      {
        return this[i];
      }
      else if(i <= 0)
      {
        return null;
      }

      i--;
    }
  }
  else if(typeof(predicate) === 'string')
  {
    predicate = JINQ.$parseLambda(predicate, this.$attached);

    if(predicate)
    {
      return this.last(predicate);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid predicate given on Array.last()');
    }
  }

  return null;
};

Array.prototype.$reverse = Array.prototype.reverse;

Array.prototype.reverse = function()
{
  var c;

  if(!Array.prototype.$reverse)
  {
    c = [];

    for(var i = this.length - 1; i >= 0; i--)
    {
      c.push(this[i]);
    }
  }
  else
  {
    c = this.$reverse();
  }

  c.$attached = this.$attached;

  return c;
};

Array.prototype.combine = function(selector)
{
  var arrays = [ this ];

  //Collect arrays to combine
  for(var i = 1; i < arguments.length; i++)
  {
    if(typeof(arguments[i]) === 'object' && arguments[i].length)
    {
      
      arrays.push(arguments[i]);
    }
  }

  if(arrays.length <= 1)
  {
    if(JINQ.debug)
    {
      //TODO
      console.log('JINQ Exception: Must give an array at least to Array.combine()');
    }

    return null;
  }

  //Verfy the given arrays
  for(var i = 0; i < arrays.length - 1; i++)
  {
    if(arrays[i].length != arrays[i + 1].length)
    {
      if(JINQ.debug)
      {
        console.log('JINQ Exception: Array.combine() can join arrays only with the same length');
      }

      return null;
    }
  }

  var c = [];  

  if(typeof(selector) === 'function')
  {
    for(var i = 0; i < this.length; i++)
    {
      var p = [];

      for(var j = 0; j < arrays.length; j++)
      {
        p.push(arrays[j][i]);
      }

      c.push(selector.apply(this, p));
    }
  }
  else if(typeof(selector) === 'string')
  {
    selector = JINQ.$parseLambda(selector, this.$attached);

    if(selector)
    {
      return this.combine.apply(this, Array.prototype.concat([ selector ], arrays.slice(1))); //a.slice(1), because the first item is this
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid selector given on Array.combine()');
    }

    return null;
  }

  c.$attached = this.$attached;

  return c;
};

Array.prototype.groupby = function(selector)
{
  var c = [];

  if(typeof(selector) == 'function')
  {
    for(var i = 0; i < this.length; i++)
    {
      var key = selector(this[i]);
      var group = c.attach({ key: key }).first('n => n.key == key');

      if(group)
      {
        group.values.push(this[i]);
      }
      else
      {
        c.push({ key: key, values: [ this[i] ] });
      }
    }

    c.$attached = this.$attached;

    return c;
  }
  else if(typeof(selector) == 'string')
  {
    selector = JINQ.$parseLambda(selector, this.$attached);

    if(selector)
    {
      return this.groupby(selector);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid selector given on Array.groupby()');
    }

    return null;
  }

  return null;
};

/// ORDERBY ///
/// Array Array.orderby([selector]) ///
//Order an array numerically or alphabetically by a selected property
//If no selector given, then ordering will be based on items itself.
//
//Notes:
//
//JINQ's Array.orderby() function uses a stable version of quicksort ("partition-exchange sort") algorithm 
//that, on average, makes O(n log n) comparisons to sort n items.
//$p is a private param, used by alphabetical ordering
//$direction is also a private param, what determinates the direction of ordering
//TODO: descending to alphabetical
Array.prototype.orderby = function(selector, array, $p, $direction)
{
  if(!array)
  {
    array = [].concat(this); //Clone this array
  }
  else
  {
    array = [].concat(array); //Clone given array
  }

  if(array.length <= 1)
  {
    return array;
  }

  if($direction != "asc" && $direction != "desc")
  {
    $direction = "asc";
  }

  //Order method: number > numerical ordering, string > alphabetical ordering
  var o; 

  this.err = function()
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: Array.orderby() can order arrays only if all its elements (or their selected properties) are either strings or numbers.');
    }
  };

  //Without selector
  if(!selector)
  {
    if(typeof(array[0]) == 'number')
    {
      o = 'number';
    }
    else if(typeof(array[0]) == 'string')
    {
      o = 'string';
    }
    else
    {
      this.err();

      return null;
    }

    //Numerical ordering
    if(o == 'number')
    {
      var less = [], greater = [];

      var index = array.randomIndex();
      var pivot = array[index];

      if(typeof(pivot) != o)
      {
        this.err();

        return null;
      }
      else
      {
        array.splice(index, 1);
      }

      for(var i = 0; i < array.length; i++)
      {
        if(typeof(array[i]) != o)
        {
          this.err();

          return null;
        }

        if(array[i] <= pivot)
        {
          less.push(array[i]);
        }
        else
        {
          greater.push(array[i]);
        }
      }

      var res;

      if($direction == "asc")
      {
        res = Array.prototype.concat(less.orderby(), pivot, greater.orderby());
      }
      else
      {
        res = Array.prototype.concat(greater.orderby(undefined, undefined, undefined, "desc"), pivot, less.orderby(undefined, undefined, undefined, "desc"));
      }

      res.$attached = array.$attached;

      return res;
    }
    //Alphabetical ordering
    else
    {
      if(!$p)
      {
        $p = 0;
      }

      //selector to order array by $p-th char of word
      var s = function(word)
      {
        var v = JINQ.order[word[$p]]; 
        return (v || -1);
      };

      var g   = [[]]                     //groups
          ret = [],                      //return
          c   = array.orderby(s),        //collection
          by  = c[0][$p]; //current char what we ordering by (TODO: ?)

      for(var i = 0; i < c.length; i++)
      {
        if(c[i][$p] == by)
        {
          g[g.length - 1].push(c[i]);
        }
        else
        {
          by = c[i][$p];

          g.push([c[i]]);
        }
      }

      for(var i = 0; i < g.length; i++)
      {
        if(g[i].length > 1)
        {
          ret = ret.$concat(g[i].orderby(null, null, $p + 1));
        }
        else
        {
          ret = ret.$concat(g[i]);
        }
      }

      if(array.$attached)
      {
        ret.$attached = array.$attached;
      }

      return ($direction == "asc" ? ret : ret.$reverse()); //vNEXT: speed up descending ordering
    }
  }
  //With selector
  else if(typeof(selector) == 'function')
  {
    if(typeof(selector(array[0])) == 'number')
    {
      o = 'number';
    }
    else if(typeof(selector(array[0])) == 'string')
    {
      o = 'string';
    }
    else
    {
      this.err();

      return null;
    }

    //Numerical ordering
    if(o == 'number')
    {
      var less = [], greater = [];

      var index = array.randomIndex();
      var pivot = array[index];

      if(typeof(selector(pivot)) != o)
      {
        this.err();

        return null;
      }
      else
      {
        array.splice(index, 1);
      }

      for(var i = 0; i < array.length; i++)
      {
        if(typeof(selector(array[i])) != o)
        {
          this.err();

          return null;
        }

        if(selector(array[i]) <= selector(pivot))
        {
          less.push(array[i]);
        }
        else
        {
          greater.push(array[i]);
        }
      }

      var res;
      if($direction == "asc")
      {
        res = Array.prototype.concat(less.orderby(selector), pivot, greater.orderby(selector));
      }
      else
      {
        res = Array.prototype.concat(greater.orderby(selector, undefined, undefined, "desc"), pivot, less.orderby(selector, undefined, undefined, "desc"));
      }

      res.$attached = array.$attached;

      return res;
    }
    //Alphabetical ordering
    else
    {
      if(!$p)
      {
        $p = 0;
      }

      //selector to order array by $p-th char
      var s = function(item)
      {
        var v = JINQ.order[selector(item)[$p]]; 
        return (v || -1);
      };

      var g   = [[]]                //groups
          ret = [],                 //return
          c   = array.orderby(s),   //collection
          by  = selector(c[0])[$p]; //current char what we ordering by (TODO: ?)

      for(var i = 0; i < c.length; i++)
      {
        if(selector(c[i])[$p] == by)
        {
          g[g.length - 1].push(c[i]);
        }
        else
        {
          by = selector(c[i])[$p];

          g.push([c[i]]);
        }
      }

      for(var i = 0; i < g.length; i++)
      {
        if(g[i].length > 1)
        {
          ret = ret.$concat(g[i].orderby(selector, null, $p + 1));
        }
        else
        {
          ret = ret.$concat(g[i]);
        }
      }

      if(array.$attached)
      {
        ret.$attached = array.$attached;
      }

      return ($direction == "asc" ? ret : ret.$reverse()); //vNEXT: speed up descending ordering
    }
  }
  else if(typeof(selector) == 'string')
  {
    selector = JINQ.$parseLambda(selector, array.$attached);

    if(selector)
    {
      return array.orderby(selector, undefined, undefined, $direction);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid selector given on Array.orderby()');
    }

    return null;
  }
};

Array.prototype.orderbydescending = 
Array.prototype.orderbydesc       =
Array.prototype.orderbyd          = function(selector, array)
{
  return this.orderby(selector, array, undefined, "desc");
};

Array.prototype.foreach = function(action)
{
  if(typeof(action) === 'function')
  {
    for(var i = 0; i < this.length; i++)
    {
      action(this[i]);
    }

    return this;
  }
  else if(typeof(action) === 'string')
  {
    action = JINQ.$parseLambda(action, this.$attached);

    if(action)
    {
      return this.foreach(action);
    }
  }
  else
  {
    if(JINQ.debug)
    {
      console.log('JINQ Exception: invalid action given on Array.forEach()');
    }

    return null;
  }

  return this;
};

Array.prototype.attach = function()
{
  if(!this.$attached)
  {
    this.$attached = {};
  }

  for(arg in arguments)
  {
    this.$attached = JINQ.$extend(this.$attached, arguments[arg]);
  }

  return this;
};

Array.prototype.attached = function(selector)
{
  //Celar context
  if(selector === null)
  {
    this.$attached = {};
  }
  //Select value with lambda
  else if(typeof(selector) == 'string')
  {
    selector = JINQ.$parseLambda(selector, this.$attached);

    if(selector)
    {
      return this.attached(selector);
    }
  }
  //Select value with function
  else if(typeof(selector) == 'function')
  {
    return selector();
  }

  return (this.$attached ? this.$attached : null);
};


///Override built-in Array.concat() function///
Array.prototype.$concat = Array.prototype.concat;

Array.prototype.concat = function()
{
  var args = [];
  var attch = (this.$attached || {});

  for(var i = 0; i < arguments.length; i++)
  {
    if(arguments[i].$attached)
    {
      attch = JINQ.$extend(attch, arguments[i].$attached);
    }

    args.push(arguments[i]);
  }

  var ret = Array.prototype.$concat.apply(this, args);

  ret.$attached = attch;

  return ret;
};
})(sharpnr.jinq);

