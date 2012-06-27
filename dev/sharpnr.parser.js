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