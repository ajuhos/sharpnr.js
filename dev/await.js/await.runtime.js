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
