﻿//Keywords:
var $$ = {}; //Defines the placeholder keyword for callbacks.
var await = {};

//This method of the library enables you to define async methods in JavaScript.
function async(method) {
  return sharpnr.await.compiler.compile(method.toString());
}

//Define foreach to avoid errors.
function foreach(a, b, c) { }