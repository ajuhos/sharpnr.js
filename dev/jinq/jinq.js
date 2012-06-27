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
           'ő': 26, 'Ő': 26, 'p': 27, 'P': 27, 'q': 28,
           'Q': 28, 'r': 29, 'R': 29, 's': 30, 'S': 30,
           't': 31, 'T': 31, 'u': 32, 'U': 32, 'ú': 32, 
           'Ú': 32, 'ü': 33, 'Ü': 33, 'ű': 33, 'Ű': 33,
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