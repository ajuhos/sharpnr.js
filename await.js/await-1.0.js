//AWAIT JS v1.0
//
//Copyright (c) 2012 Ádám Juhos, http://www.etech-studio.hu/
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

"use strict";  

var $$ = {};
var await = {};

//------------------------------------------------------------------------

//OLD IE support:
if(!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(obj, start) {
       for (var i = (start || 0), j = this.length; i < j; i++) {
           if (this[i] === obj) { return i; }
       }
       return -1;
  }
}

$$.code_evaled = 0; 
function eval_global(codetoeval) { 
    if (window.execScript) 
        window.execScript('$$.code_evaled = ' + codetoeval,''); // execScript doesn’t return anything 
    else 
        $$.code_evaled = eval(codetoeval); 
    return $$.code_evaled; 
} 

//------------------------------------------------------------------------

await.$while = function(expression, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  await.processWhile(expression, statement, cbs);
}

await.processWhile = function(expr, statement, callbacks) {
  var exprRef = expr(); 
  if(!exprRef) {
     callbacks["break"]();
     return;
  } 
  statement(function(stmt) {
    if(stmt == "continue" || stmt == undefined) {
       await.processWhile(expr, statement, callbacks);
    }
    else if(stmt == "break") {
       callbacks["break"]();
    }
  });
}

//------------------------------------------------------------------------

await.$doWhile = function(expression, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  await.processDoWhile(expression, statement, cbs);
}

await.processDoWhile = function(expr, statement, callbacks) {
  statement(function(stmt) {
    if(stmt == "continue" || stmt == undefined) {
       var exprRef = expr(); 
       if(!exprRef) {
          callbacks["break"]();
          return;
       } 

       await.processDoWhile(expr, statement, callbacks);
    }
    else if(stmt == "break") {
       callbacks["break"]();
    }
  });
}

//------------------------------------------------------------------------

await.$for = function(expr1, expr2, expr3, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  await.processFor(expr1, expr2, expr3, statement, cbs);
}

await.processFor = function(expr1, expr2, expr3, statement, callbacks, context) {
  if(!context) {
    context = { i: expr1() }; 
  }
  var testExprRef = expr2(context.i);
  if(!testExprRef) {
   callbacks["break"]();
   return;
  } 
  statement(context.i, function(stmt) {
    if(stmt == "continue" || stmt == undefined) {
       context.i = expr3(context.i);                                      
       await.processFor(expr1, expr2, expr3, statement, callbacks, context);
    }
    else if(stmt == "break") {
       callbacks["break"]();
    }
  }); 
}

//------------------------------------------------------------------------

await.forin = function(expr1, expr2, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  await.processForIn(expr1, expr2, statement, cbs);
}

await.processForIn = function (expr1, expr2, statement, callbacks, context) {
  var exprRef = expr2();
  if (!context) {
    context = { keys: [], i: 0, length: 0 };
    if (exprRef) {
      for (var key in exprRef) {
        if(typeof key == "number" || exprRef.hasOwnProperty(key)) {
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
      await.processForIn(expr1, expr2, statement, callbacks, context);
    }
    else if (stmt == "break") {
      callbacks["break"]();
    }
  });
}

//-----------------------------------------------------------------------

await.foreach = function(expr1, expr2, statement, callback) {
  var cbs = [];
  cbs["break"] = callback;
  await.processForeach(expr1, expr2, statement, cbs);
}

await.processForeach = function (expr1, expr2, statement, callbacks, context) {
  var exprRef = expr2();
  if (!context) {
    context = { keys: [], i: 0, length: 0 };
    if (exprRef) {
      for (var key in exprRef) {
        if(typeof key == "number" || exprRef.hasOwnProperty(key)) {
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
      await.processForeach(expr1, expr2, statement, callbacks, context);
    }
    else if (stmt == "break") {
      callbacks["break"]();
    }
  });
}

//-----------------------------------------------------------------------

await.$if = function(exprIf, exprsElseIf, stmtElse, callback) {
  await.processIf(exprIf, exprsElseIf, stmtElse, callback);
}

await.processIf = function(objIf, objsElseIf, stmtElse, callback) {
  if(objIf.e()) {
    objIf.s(callback);
    return;
  } 
  else {
    for (var i in objsElseIf) {
      if(typeof i == "number" && objsElseIf[i].e()) {
        objsElseIf[i].s(callback);
        return;
      }
    }    
  }

  if(stmtElse) {
    stmtElse(callback);
    return;    
  }
         
  callback();
}

//-----------------------------------------------------------------------

await.$switch = function(swcExpr, exprs, stmtDefault, callback) {
  await.processSwitch(swcExpr, exprs, stmtDefault, callback);
}

await.processSwitch = function(swcExpr, objs, stmtDefault, callback) {
  var swc = swcExpr();
    
  for (var i in objs) {
    if(typeof i == "number" && objs[i].v == swc) {
      objs[i].s(callback);
      return;
    }
  }    

  if(stmtDefault) {
    stmtDefault(callback);
    return;    
  }
         
  callback();
}

//--------------------------------------------------------------------------------

await.parser = {};

//------------------------------------------------------------------
//UTILITY METHODS: Character testers

await.parser.isNumber = function(character) {
  return /^[0-9]$/.test(character);
}

await.parser.isLetter = function (character) {
  return /^[a-z]$/.test(character);
}

await.parser.isIdentifierStart = function (character) {
  return /^[a-z_\$\\]$/.test(character);
}

await.parser.isAlphanumeric = function (character) {
  return /^[a-z0-9]$/.test(character);
}

await.parser.isSeparator = function (character) {
  return (['.', ' ', '\n', '\r', '\t', ',', ';', '(', '[', '+', '-', '*', '/', '\\', '&', '|', '~', '^', '<', '>', ':', '=', '!', '%', ')', ']', '{', '}'].indexOf(character) != -1);
}

//------------------------------------------------------------------
//UTILITY METHODS: Character parsers

//Finds the identifier in a statement (no others chars accepted before).
await.parser.findIdentifier = function (source, startIndex) {
  if(!startIndex) { startIndex = 0; }
  var identifier = "";
  
  var state = await.parser.createParserState();   
  state.inIdentifier = false;
     
  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessable(state)) {
      continue;    
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if(await.parser.isSeparator(state.char) && state.char != '.') {
      if(state.inIdentifier) {
        return { output: identifier, cursor: i - identifier.length };
      }
      continue;  
    }
    
    //Check for identifier.
    if(await.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;    
      continue; 
    }
    
    //Process identifier.
    if(state.inIdentifier) {
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
await.parser.findIdentifierFirst = function (source, identifierToFind, startIndex) {
  if(!startIndex) { startIndex = 0; }
  var identifier = "";
  
  var state = await.parser.createParserState();   
  state.inIdentifier = false;
     
  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessable(state)) {
      continue;    
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if(await.parser.isSeparator(state.char) && state.char != '.') {
      if(state.inIdentifier) {
        if(identifier == identifierToFind) {
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
    if(await.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;    
      continue; 
    }
    
    //Process identifier.
    if(state.inIdentifier) {
      identifier += state.char; 
      continue;
    }
  }

  return -1;
}

//Finds the first occurance of an identifier in a statement on aspecific block level.
await.parser.findIdentifierFirstOnLevel = function (source, identifierToFind, segmentLevel, startIndex) {
  if (!startIndex) { startIndex = 0; }
  if (!segmentLevel) { segmentLevel = 0; }
  var identifier = "";

  var state = await.parser.createParserState();
  state.inIdentifier = false;
  state.segmentLevel = 0;

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!await.parser.ensureProcessable(state)) {
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
    if (await.parser.isSeparator(state.char) && state.char != '.') {
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
    if (await.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
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
await.parser.findIdentifierBack = function (source, startIndex) {
  if(!startIndex) { startIndex = 0; }
  var identifier = "";
  
  var state = await.parser.createParserState();   
  state.inIdentifier = false;
     
  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i > 0; i--) {
    state.lastChar = expression[i - 1];
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessableBack(state)) {
      continue;    
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if(await.parser.isSeparator(state.char) && state.char != '.') {
      if(state.inIdentifier) {
        return { output: identifier, cursor: i };
      }
      continue;  
    }
    
    //Check for identifier.
    if(await.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;    
      continue; 
    }

    //Process identifier.
    if(state.inIdentifier) {
      identifier = state.char + identifier; 
      continue;
    }
  }

  return { output: "", cursor: -1 };
}

//Finds the first occurance of an identifier in a statement.
await.parser.findIdentifierFirstBack = function (source, identifierToFind, startIndex) {
  if(!startIndex) { startIndex = 0; }
  var identifier = "";
  
  var state = await.parser.createParserState();   
  state.inIdentifier = false;
     
  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i > 0; i--) {
    state.lastChar = expression[i - 1];
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessableBack(state)) {
      continue;    
    }

    //Check for whitespace, separators and new line.
    //WARNING: Identifiers can contain dots.
    if(await.parser.isSeparator(state.char) && state.char != '.') {
      if(state.inIdentifier) {
        if(identifier == identifierToFind) {
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
    if(await.parser.isIdentifierStart(state.char) && !state.inIdentifier) {
      state.inIdentifier = true;
      identifier = state.char;    
      continue; 
    }
    
    //Process identifier.
    if(state.inIdentifier) {
      identifier = state.char + identifier; 
      continue;
    }
  }

  return -1;
}

//Finds all processable chars in a statement.
await.parser.findAllProcessableChars = function (source, startIndex) {
  if(!startIndex) { startIndex = 0; }
  var state = await.parser.createParserState();   
  var output = "";

  var expression = source; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessable(state, { block: false, string: false })) {
      continue;    
    }

    output += state.char;
  }

  return output;
}

//Finds a specific characters first processable occurance.
await.parser.findProcessableChar = function (source, charToFind, startIndex) {
  if(!startIndex) { startIndex = 0; }
  var state = await.parser.createParserState();   
     
  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessable(state, { block: false })) {
      continue;    
    }

    if(state.char == charToFind) {
      return i;  
    }
  }

  return -1;
}


//Finds a specific characters first processable occurance.
await.parser.findProcessableCharOnSameLevel = function (source, charToFind, startIndex) {
  if(!startIndex) { startIndex = 0; }
  var state = await.parser.createParserState();   
  state.segmentLevel = 0;
  state.arrayLevel = 0;
     
  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessable(state, { block: false })) {     
      continue;    
    }

  
    //Check for block.
    if(state.char == '{') {  
      if(charToFind == "{" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
        return i;
      }   
 
      state.blockLevel++;
      continue;
    }
   
    //Check for block end.
    if(state.char == '}') {
      if(state.blockLevel >= 1) {
        state.blockLevel--;

        if(charToFind == "}" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
          return i;
        }   
        continue;
      }
      else {
        return -1; //Left the context of the query.    
      }
    }

   //Check for segment.
    if(state.char == '(') {
      if(charToFind == "(" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
        return i;
      }   

      state.segmentLevel++;
      continue;
    }
   
    //Check for segment end.
    if(state.char == ')') {
      if(state.segmentLevel >= 1) {
        state.segmentLevel--;

        if(charToFind == ")" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
          return i;
        }   
        continue;
      }
      else {
        return -1; //Left the context of the query.    
      }
    }


   //Check for array.
    if(state.char == '(') {
      if(charToFind == "(" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
        return i;
      }   

      state.arrayLevel++;
      continue;
    }
   
    //Check for array end.
    if(state.char == ')') {
      if(state.arrayLevel >= 1) {
        state.arrayLevel--;

        if(charToFind == ")" && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
          return i;
        }   
        continue;
      }
      else {
        return -1; //Left the context of the query.    
      }
    }

    
    if(state.char == charToFind && state.blockLevel == 0 && state.segmentLevel == 0 && state.arrayLevel == 0) {
      return i;  
    }

  }

  return -1;
}

//Finds a specific characters first processable occurance backwards.
await.parser.findProcessableCharBack = function (source, charToFind, startIndex, allowedChars) {
  if(!startIndex) { startIndex = source.length-1; }
  var state = await.parser.createParserState();   
     
  var expression = source;
  for (var i = startIndex; i > 0; i--) {
    state.lastChar = expression[i - 1];
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessableBack(state, { block: false })) {
      continue;    
    }

    if(state.char == charToFind) {
      return i;  
    }

    if(allowedChars) {
      if(allowedChars.indexOf(state.char) == -1) {
        break;
      }    
    }
  }

  return -1;
}

//Finds the end of a block.
await.parser.findBlockEnd = function (source, startIndex) {
  if(!startIndex) { startIndex = 0; }
  var state = await.parser.createParserState();   
     
  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessable(state)) {
      continue;    
    }

    if(state.char == '}') {
      return i;  
    }
  }

  return source.length;
}

//Finds the end of a segment.
await.parser.findSegmentEnd = function (source, startIndex) {
  if(!startIndex) { startIndex = 0; }
  
  var state = await.parser.createParserState();
  state.segmentLevel = 0;     
     
  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if(!await.parser.ensureProcessable(state)) {
      continue;    
    }

    //Check for segment.
    if(state.char == '(') {
      state.segmentLevel++;
      continue;
    }
   
    //Check for segment end.
    if(state.char == ')') {
      if(state.segmentLevel >= 1) {
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
await.parser.normalize = function (source, startIndex) {
  if (!startIndex) { startIndex = 0; }

  var state = await.parser.createParserState();
  state.segmentLevel = 0;

  var output = "";

  var expression = source + ' '; //Ensure that last char is not important.
  for (var i = startIndex; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    if (!await.parser.ensureProcessable(state)) {
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
await.parser.createParserState = function() {
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
await.parser.ensureProcessable = function(state, opts) {
  if(!opts) { opts = { block: true } }
  if(typeof opts.block == "undefined") { opts.block = true; }
  if(typeof opts.string == "undefined") { opts.string = true; }

  //Do not process anything until end of string.
  //WARNING: String char inside string.
  if(state.inString) {
    if(state.lastChar != "\\" && state.char == state.stringChar) {
      state.inString = false;
    } 
    return false; 
  }

  //Do not process anything until new line.
  if(state.inLineComment) {
    if(state.char == '\n') {
      state.inLineComment = false;
    }   
    return false; 
  }

  //Do not process anything until end of comment.
  if(state.inBlockComment) {
    if(state.lastChar == "*" && state.char == '/') {
      state.inBlockComment = false;
    }  
    return false; 
  }
  
  if(opts.string) {
    //Check for string.
    if(state.char == '"' || state.char == "'") {
      state.inString = true;
      state.stringChar = state.char;
      return false; 
    } 
  }

  //Check for line comment.
  if(state.lastChar == '/' && state.char == '/') {
    state.inLineComment = true;
    return false; 
  }

  //Check for block comment.
  if(state.lastChar == '/' && state.char == '*') {
    state.inBlockComment = true;
    return false; 
  }  

  if(opts.block) {
    //Check for block.
    if(state.char == '{') {
      state.blockLevel++;
      return false;
    }
    
    //Check for block end.
    if(state.char == '}') {
      if(state.blockLevel >= 1) {
        state.blockLevel--;
        return false;
      }
    }
  }
  
  //This char is processable.
  return true;  
}

//Ensures that the current char is not whitespace, string or comment.
await.parser.ensureProcessableBack = function(state) {
  //Do not process anything until end of string.
  //WARNING: String char inside string.
  if(state.inString) {
    if(state.lastChar != "\\" && state.char == state.stringChar) {
      state.inString = false;
    } 
    return false; 
  }
  
  //Do not process anything until end of comment.
  if(state.inBlockComment) {
    if(state.lastChar == "/" && state.char == '*') {
      state.inBlockComment = false;
    }  
    return false; 
  }
  
  //Check for string.
  if(state.char == '"' || state.char == "'") {
    state.inString = true;
    state.stringChar = state.char;
    return false; 
  } 


  //Check for block comment.
  if(state.lastChar == '*' && state.char == '/') {
    state.inBlockComment = true;
    return false; 
  }  

  //Check for block.
  if(state.char == '}') {
    state.blockLevel++;
    return false;
  }

  //Check for block end.
  if(state.char == '{') {
    if(state.blockLevel >= 1) {
      state.blockLevel--;
      return false;
    }
  }
  
  //This char is processable.
  return true;  
}


//----------------------------------------------------------------------------
//PARSER METHODS

//Parses and compiles a JavaScript statement into an async statement.
await.parser.buildStatement = function(expression, counter, opts) { 
  if(!counter) { counter = 0; }
  if(!opts) { opts = { insideLoop: false }; }
  if(typeof opts.insideLoop == "undefined") { opts.insideLoop = false; }
  if(typeof opts.awaitMode == "undefined") { opts.awaitMode = false; }

  var output = "";
  var outputEnd = [];
  
  //Initialize parser state.
  var state = await.parser.createParserState();      
  state.hasDot = false;
  state.inKeyword = false;
  state.keyword = "";
  
  var expression = expression + ' '; //Ensure that last char is not important.
  for(var i = 0; i < expression.length; i++) {
    state.lastChar = state.char;
    state.char = expression.charAt(i);

    //Verify last keyword, if has one.
    if(!state.inKeyword && state.keyword != "" && state.keyword != undefined) {
      var compiled = "";
      if(!opts.awaitMode) {
        switch(state.keyword) {
          case "while":
            compiled = await.parser.buildWhile(expression, i - state.keyword.length - 1, counter);
            break; 
          case "do":
            compiled = await.parser.buildDoWhile(expression, i - state.keyword.length - 1, counter);
            break; 
          case "for":
            compiled = await.parser.buildFor(expression, i - state.keyword.length - 1, counter);
            break; 
          case "foreach":
            compiled = await.parser.buildFor(expression, i - state.keyword.length - 1, counter, {forceForeach:true});
            break; 
          case "break":
            if(opts.insideLoop) {
              compiled = await.parser.buildBreak(expression, i - state.keyword.length - 1, counter);
            }
            break;    
          case "continue":
            if(opts.insideLoop) {
              compiled = await.parser.buildContinue(expression, i - state.keyword.length - 1, counter);
            }
            break; 
          case "if":
            compiled = await.parser.buildIf(expression, i - state.keyword.length - 1, counter);
            break; 
          case "switch":
            compiled = await.parser.buildSwitch(expression, i - state.keyword.length - 1, counter);
            break; 
          //TODO: try
        
          default:
            //Unknown keyword, add to output:
            output += state.keyword;
            break;           
        }
      }
      else if(state.keyword == "await") {
        compiled = await.parser.buildAwait(expression, i - state.keyword.length - 1, counter);
      }
      else {
        //Unknown keyword, add to output:
        output += state.keyword;    
      }

      state.keyword = ""; 

      if(compiled != "") {
        counter++;       
        output += compiled.output;
        if(outputEnd[state.blockLevel - 1]) {
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
    if(!state.inKeyword) {
      output += state.lastChar;
    }

    if(!await.parser.ensureProcessable(state)) {
      state.inKeyword = false;
         
      if(state.char == '}' && outputEnd[state.blockLevel] != undefined) {
        output += outputEnd[state.blockLevel];
        outputEnd[state.blockLevel] = undefined;
      }
      continue;
    }

    //Check for dot, a keyword can't start with dot.
    if(state.char == '.') {
      state.hasDot = true; 
      state.inKeyword = false;

      if(state.keyword != undefined) {
        output += state.keyword;
        state.keyword = "";
      }
      continue;
    }

    //Check for whitespace, separators and new line.
    if(await.parser.isSeparator(state.char)) {
      state.inKeyword = false;
      state.hasDot = false;
      continue;  
    }
    
    //Check for keyword.
    //WARNING: Keywords can't start with a dot.
    if(await.parser.isIdentifierStart(state.char) && !state.hasDot && !state.inKeyword) {
      state.inKeyword = true;
      state.keyword = state.char;    
      continue; 
    }

    //Process keyword.
    if(state.inKeyword) {
      state.keyword += state.char; 
      continue;
    }
  }  

  //Add any remaning end part to the output.
  if(outputEnd[state.blockLevel - 1] != undefined) {
    output += outputEnd[state.blockLevel - 1];
    outputEnd[state.blockLevel - 1] = undefined;
  }

  return output;//.substring(0, output.length - 1); //Remove the extra whitesapce added to ensure correct processing.
}

//-----------------------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable while segment.
await.parser.buildWhile = function(source, startIndex, counter) {
  var expressionStart = await.parser.findProcessableChar(source, '(', startIndex) + 1; //Find the start of the expression.
  var expressionEnd = await.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = "function() { return " + source.substring(expressionStart, expressionEnd) + ";}";
  
  var blockStart = await.parser.findProcessableChar(source, '{', expressionEnd + 1) + 1; //Find the start of the while block;
  var blockEnd = await.parser.findBlockEnd(source, blockStart); //Find the end of the while block;
  var statement = "function($$$cb" + counter + ") {" + await.parser.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1, {insideLoop:true}) + "}";

  var result = "await.$while(" + expression + "," + statement + ", function() {"
  var resultEnd = "});";      

  return { output: result, outputEnd: resultEnd, cursor: blockEnd + 1 }; // Return the cursor and the result of the build.
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable do-while segment.
await.parser.buildDoWhile = function(source, startIndex, counter) {
  var blockStart = await.parser.findProcessableChar(source, '{', startIndex) + 1; //Find the start of the while block;
  var blockEnd = await.parser.findBlockEnd(source, blockStart); //Find the end of the while block;
  var statement = "function($$$cb" + counter + ") {" + await.parser.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1, {insideLoop:true}) + "}";
  
  var expressionStart = await.parser.findProcessableChar(source, '(', blockEnd + 1) + 1; //Find the start of the expression.
  var expressionEnd = await.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = "function() { return " + source.substring(expressionStart, expressionEnd) + ";}";
                
  var result = "await.$doWhile(" + expression + "," + statement + ", function() {"
  var resultEnd = "});";      

  return { output: result, outputEnd: resultEnd, cursor: expressionEnd + 2 /*);*/}; // Return the cursor and the result of the build.
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable for or for-in statement.
await.parser.buildFor = function(source, startIndex, counter, opts) {
  if(!opts) { opts = { forceForeach: false }; }
  if(!opts.forceForeach) { opts.forceForeach = false; }

  var expressionStart = await.parser.findProcessableChar(source, '(', startIndex) + 1; //Find the start of the expression.
  var expressionEnd = await.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = source.substring(expressionStart, expressionEnd);

  var parts = expression.split(';');
  var varName = "";
  var expr1, expr2, expr3 = "";
  if(parts.length == 3) {
    //Try to find a local variable to use in context simulation.
    if(parts[0] != undefined && parts[0] != "") {
      var findVarRes = await.parser.findIdentifier(parts[0]);
      if(findVarRes.output == "var") {  
        varName = await.parser.findIdentifier(parts[0], findVarRes.cursor + 3).output;          
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
    if(parts.length == 2) {
      var findVarRes = await.parser.findIdentifier(parts[0]);
      if(findVarRes.output == "var") {  
        varName = await.parser.findIdentifier(parts[0], findVarRes.cursor + 3).output;          
      }
      expr1 = "function($$$value) { " + parts[0] + " = $$$value; }";
      expr2 = "function(" + varName + ") { return " + parts[1] + ";}";
    }
    else {
      throw "Invalid for statement";
    }
  }
  
  var blockStart = await.parser.findProcessableChar(source, '{', expressionEnd + 1) + 1; //Find the start of the while block;
  var blockEnd = await.parser.findBlockEnd(source, blockStart); //Find the end of the while block;
  var statement = "";
  if(varName != "") {
    statement = "function(" + varName + ", $$$cb" + counter + ") {" + await.parser.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1, {insideLoop:true}) + "}";
  }
  else {
    statement = "function($$$, $$$cb" + counter + ") {" + await.parser.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1, {insideLoop:true}) + "}";
  }

  var result = "";
  if(parts.length == 3)
  {
    result = "await.$for(" + expr1 + "," + expr2 + "," + expr3 + "," + statement + ", function() {"
  }
  else
  {
    result = "await." + (opts.forceForeach ? "foreach" : "forin") + "(" + expr1 + "," + expr2 + "," + statement + ", function() {"
  }
  
  var resultEnd = "});";      

  return { output: result, outputEnd: resultEnd, cursor: blockEnd + 1 }; // Return the cursor and the result of the build.
}

await.parser.buildBreak = function(source, startIndex, counter) {
  counter = counter - 1; //Decrease coutner to match the level of the loop.
  return { output: "$$$cb" + counter + "('break'); return;", outputEnd: "", cursor: startIndex + ("break;").length };
}

await.parser.buildContinue = function(source, startIndex, counter) {
  counter = counter - 1; //Decrease coutner to match the level of the loop.
  return { output: "$$$cb" + counter + "('continue'); return;", outputEnd: "", cursor: startIndex + ("continue;").length };
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable if segment.
await.parser.buildIf = function(source, startIndex, counter) {
  //Build the default if statement:
  var res = await.parser._buildIfInternal(source, startIndex, counter);
  var ifStatement = res.output;
  var result = "await.$if({e:" + ifStatement.expr + ", s:" + ifStatement.stmt + "}, [";
  
  //Build optional statements:
  var hasElseIf = false;
  var hasElse = false;
  while(true) {
    //Try to find an else clause:
    var findElseRes = await.parser.findIdentifier(source, res.cursor);
    if(findElseRes.output == "else") {
      var nextStatementStart = findElseRes.cursor + 4;
      if(await.parser.findIdentifier(source, nextStatementStart).output == "if") {
        //else if statement
        res = await.parser._buildIfInternal(source, nextStatementStart, counter);
        result += (hasElseIf ? ',' : '') + "{e:" + res.output.expr + ", s:" + res.output.stmt + "}";
        hasElseIf = true;
      }          
      else {
        //else statement
        res = await.parser._buildElseInternal(source, nextStatementStart, counter);
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

await.parser._buildIfInternal = function(source, startIndex, counter) {
  var expressionStart = await.parser.findProcessableChar(source, '(', startIndex) + 1; //Find the start of the expression.
  var expressionEnd = await.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = "function() { return " + source.substring(expressionStart, expressionEnd) + ";}";
  
  var blockStart = await.parser.findProcessableChar(source, '{', expressionEnd + 1) + 1; //Find the start of the while block;
  var blockEnd = await.parser.findBlockEnd(source, blockStart); //Find the end of the while block;
  var statement = "function($$$cb" + counter + ") {" + await.parser.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1) + "}";

  var ifStatement = { expr: expression, stmt: statement };
  return { output: ifStatement, cursor: blockEnd + 1 };   
}

await.parser._buildElseInternal = function(source, startIndex, counter) { 
  var blockStart = await.parser.findProcessableChar(source, '{', startIndex) + 1; //Find the start of the while block;
  var blockEnd = await.parser.findBlockEnd(source, blockStart); //Find the end of the while block;

  var statement = "function($$$cb" + counter + ") {" + await.parser.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1) + "}";
  
  return { output: statement, cursor: blockEnd + 1 }; // cursor: sourceEnd };   
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an awaitable switch segment.
await.parser.buildSwitch = function(source, startIndex, counter) {
  var expressionStart = await.parser.findProcessableChar(source, '(', startIndex) + 1; //Find the start of the expression.
  var expressionEnd = await.parser.findSegmentEnd(source, expressionStart); //Find the end of the expression.
  var expression = "function() { return " + source.substring(expressionStart, expressionEnd) + ";}";
      
  var result = "await.$switch(" + expression + ", [";

  var res = { cursor: expressionEnd + 1 };

  //Build case statements:
  var hasCase = false;
  var hasDefault = false;
  while(true) {
    var identifierRes = await.parser.findIdentifier(source, res.cursor);
    if(identifierRes.output == "case") {
      var nextStatementStart = identifierRes.cursor;
      res = await.parser._buildCaseInternal(source, nextStatementStart, counter);
      result += (hasCase ? ',' : '') + "{v:" + res.output.val + ",s:" + res.output.stmt + "}";
      hasCase = true;
      continue;
    }
    else if(identifierRes.output == "default") {
      var nextStatementStart = identifierRes.cursor;
      res = await.parser._buildDefaultCaseInternal(source, nextStatementStart, counter);
      result += "]," + res.output + ",";
      hasDefault = true;
    }

    //no more statements
    break;
  }
    
  result += (!hasDefault ? "],null," : '') + "function() {";  
  var resultEnd = "});";      

  var blockStart = await.parser.findProcessableChar(source, '{', startIndex) + 1; //Find the start of the switch block;
  var blockEnd = await.parser.findBlockEnd(source, blockStart); //Find the end of the switch block;
  
  return { output: result, outputEnd: resultEnd, cursor: blockEnd + 1 }; // Return the cursor and the result of the build.
}

await.parser._buildCaseInternal = function(source, startIndex, counter) {
  var blockStart = await.parser.findProcessableChar(source, ':', startIndex) + 1; //Find the start of the case;
  var blockEnd = await.parser.findIdentifierFirst(source, "break", blockStart); //Find the end of the case;
  var statement = "function($$$cb" + counter + ") {" + await.parser.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1) + "}";

  var val = source.substring(startIndex + ("case").length, blockStart - 1);

  var res = { val: val, stmt: statement };
  return { output: res, cursor: blockEnd + ("break").length };   
}

await.parser._buildDefaultCaseInternal = function(source, startIndex, counter) { 
  var blockStart = await.parser.findProcessableChar(source, ':', startIndex) + 1; //Find the start of the case;
  var blockEnd = await.parser.findIdentifierFirst(source, "break", blockStart); //Find the end of the case;
  var statement = "function($$$cb" + counter + ") {" + await.parser.buildStatement(source.substring(blockStart, blockEnd) + " $$$cb" + counter + "();", counter + 1) + "}";

  return { output: statement, cursor: blockEnd + ("break").length };   
}

//-----------------------------------------------------------------------------------------------------------------------

//Builds an await statement.
await.parser.buildAwait = function (source, startIndex, counter) {
  var argsStart = await.parser.findProcessableCharOnSameLevel(source, '(', startIndex); //Find the start of the argument list.
  var expressionEnd = await.parser.findProcessableCharOnSameLevel(source, ';', argsStart); //Find the end the await statement.  

  //Find the last segment start on the correct level, to ensure that when a call list is provided in the expression
  //the correct call will be used as the base of the await operation.
  argsStart = argsStart - 1; //In simple cases the first is the correct opening char.
  var temp = startIndex;
  var argsEnd = 0;
  var callbackPosition = -1;
  while (true) {
    temp = await.parser.findProcessableCharOnSameLevel(source, '(', temp);
    if (temp != -1 && temp < expressionEnd) {
      argsStart = temp + 1; //Save the potential start position.
      argsEnd = await.parser.findSegmentEnd(source, argsStart); //Find the end of the argument list.

      //Try to find the exact callback position:
      callbackPosition = await.parser.findIdentifierFirstOnLevel(source, "$$", 0, argsStart);
      if (callbackPosition != -1 && callbackPosition < argsEnd) {
        //Prefer user settings over compiler defaults.
        // => Use an earlier method call as the awaited method, when the user exactly specifies the callback position.
        break;
      }

      temp = argsEnd + 1;
    }
    else { break; }
  }
  var hasArgs = (await.parser.findAllProcessableChars(source.substring(argsStart, argsEnd).replace(/ /g, '')).length > 0);

  var callStart = await.parser.findProcessableChar(source, ' ', startIndex) + 1; //Find the start of the function call statement.
  var callEnd = expressionEnd + 1; //Find the end of the function call statement.

  //Find the optional return value of the call:
  var globalName = "";
  var varName = "";
  if (await.parser.findProcessableCharBack(source, '=', startIndex - 1, [' ']) != -1) {
    //Return value exists.
    var findVarNameRes = await.parser.findIdentifierBack(source, startIndex - 1)
    varName = findVarNameRes.output;

    //Is it global or local?
    var varPos = await.parser.findIdentifierFirstBack(source, "var", findVarNameRes.cursor) + ("var").length;
    if (varPos == (-1 + 3) && varName != await.parser.findIdentifier(source, varPos).output) {
      //Global variable
      globalName = varName;
      varName = "";
    }
  }

  //Find the optional code part between the end of the block and the end of the expression.
  var hasCode = (await.parser.findAllProcessableChars(source.substring(argsEnd + 1, callEnd - 1).replace(/ /g, '')).length > 0);
  var code = "";
  if (hasCode) {
    code = (varName != "" ? varName : "arguments[0]") + "=arguments[0]" + await.parser.buildStatement(source.substring(argsEnd + 1, callEnd - 1), counter, { awaitMode: true }) + ";";
  }

  //Find the location of the callback part:
  //Specified by $$, or the last argument.
  var resultStart = "";
  var resultEnd = "";
   
  callbackPosition = await.parser.findIdentifierFirstOnLevel(source, "$$", 0, argsStart);
  if (callbackPosition == -1 || callbackPosition > callEnd) {
    //Default case:
    resultStart = await.parser.buildStatement(source.substring(callStart, argsEnd), counter, { awaitMode: true }) + (hasArgs ? ',' : '') + "function(" + varName + ") {" + (globalName != "" ? globalName + "=arguments[0];" : "") + code;
    resultEnd = "});";
  }
  else {
    //Callback position specified:
    resultStart = await.parser.buildStatement(source.substring(callStart, callbackPosition), counter, { awaitMode: true }) + "function(" + varName + ") {" + (globalName != "" ? globalName + "=arguments[0];" : "") + code;
    resultEnd = "}" + await.parser.buildStatement(source.substring(callbackPosition + ("$$").length, argsEnd) + ");", counter, { awaitMode: true });
  }

  return { output: resultStart, outputEnd: resultEnd, cursor: callEnd };
}  

//-----------------------------------------------------------------------------------------------------------------------

//Parses and compiles a statement.
await.parser.parse = function (expression) {
  var precompiled = await.parser.buildStatement(expression); //Precompile the expression to use awaitable statements.
  var awaited = await.parser.buildStatement(precompiled, 0, { awaitMode: true }); //Compile the await statements.

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

//This method of the library enables you to define async methods in JavaScript.
function async(method) {
  return await.parser.parse(method);
}

//Define foreach to avoid errors.
function foreach(a,b,c) {}