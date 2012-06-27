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