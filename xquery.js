(function(document) {
   
function split(selector) {
   var re = /([a-zA-Z0-9_-]+(?![a-zA-Z0-9_-])|#[a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+|\[[a-z0-9_-]+(?:[$^~]?="[^"]+")?\])+|\s*\+\s*|\s*~\s*|\s*>\s*|\s+/g
   var res = []
   var p = re.exec(selector.trim())
   do {
      res.push(p[0])
      p = re.exec(selector.trim())
   } while (p)
   return res
}

var results = []
var parts = []

function find(query) {
   query = query.trim().replace(/\s{2,}/g, ' ');
   
   query = query.replace(/ > /g, '>');
   query = query.replace(/ + /g, '+');
   query = query.replace(/ ~ /g, '~');
   query = query.replace(/::/g, ':');
   parts = split(query);
   var pos = -1;
   var failed = false;
   
   results = [];
   
   pos = tryToFindID();
   if (pos >= 0) {
      var n = document.getElementById(getId(parts[pos]).slice(1));
      if (n != null) {
         var tag = getTag(parts[pos]);
         if (tag && results[0].tagName.toLowerCase() != tag.toLowerCase()) {
            return;
         }
         var classes = getClasses(parts[pos]);
         if (classes.length && hasAllClasses(n, classes) == -1) {
            return;
         }
         results.push(n);
         applyPseudoClasses(parts[pos]);
         applyAttributes(parts[pos]);
         if (!results.length) return results;
      } else {
         return results;
      }
   }
   else if (pos < 0) {
      pos = tryToFindClassName();
      if (pos >= 0) {
         var classes = getClasses(parts[pos]);
         for (var i = 0; i < classes.length; i++) {
            concat(results, getElementsByClass(classes[i], document, '*'))
         }         
         var tag = getTag(parts[pos]);
         if (tag) {
            for (var i = 0; i < results.length; i++) {
               if (!results[i].tagName.toLowerCase() != tag.toLowerCase()) {
                  results.splice(i--, 1);
               }
            }
         }
         applyPseudoClasses(parts[pos]);
         applyAttributes(parts[pos]);
         if (!results.length) return results;
      }
   }
   if (pos > 0 && (parts[pos-1] == "+" || parts[pos-1] == "~")) pos = -1;
   for (var i = pos-1; i >= 0; i-=2) {
      stepLeft(i);
   }
   if (pos == -1) pos--;
   for (var i = pos+1; i < parts.length; i+=2) {
      stepRight(i);
   }
   return results;
}

function hasClass(el, cls) {
   var re = new RegExp('(^| )' + classes[i] + '( |$)')
   return !!re.exec(el.className)
}

function hasAllClasses(el, classes) {
   for (var i = 0; i < classes.length; i++) {
      var re = new RegExp('(^| )' + classes[i] + '( |$)')
      if (!re.exec(el.className)) return false
   }
   return true
}

function getElementsByClass(searchClass, node, tag) {
   var classElements = new Array();
   if ( node == null )
      node = document;
   if ( tag == null )
      tag = '*';
   var els = node.getElementsByTagName(tag);
   var elsLen = els.length;

   var pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)");
   for (i = 0, j = 0; i < elsLen; i++) {
      if ( pattern.test(els[i].className) ) {
         classElements[j] = els[i];
         j++;
      }
   }
   return classElements;
}

function applyPseudoClasses(expr) {
   var psc = getPseudoClasses(expr);
   psc = psc.replace(/^:/g, '');
   if (psc.length) {
      pseudoclasses = psc.split(':');
      for (var j = 0; j < results.length; j++) {
         for (var i = 0; i < pseudoclasses.length; i++) {
            if (pseudoclasses[i].equals("first-child") && !isFirstElementChild(results[j])) {
               results.splice(j--, 1);
               break;
            }
            if (pseudoclasses[i] == "last-child" && !isLastElementChild(results[j])) {
               results.splice(j--, 1);
               break;
            }
            if (pseudoclasses[i] == "nth-child(odd)" && !isOddElementChild(results[j])) {
               results.splice(j--, 1);
               break;
            }
            if (pseudoclasses[i] == "nth-child(even)" && !isEvenElementChild(results[j])) {
               results.splice(j--, 1);
               break;
            }
            var m = pseudoclasses[i].match(/nth-child\(([1-9][0-9]*)\)/)
            if (m) {
               if (m[1] && !isNthElementChild(results[j], num)) {
                  results.splice(j--, 1);
                  break;
               }
            }
         }
      }
   }
}

function applyAttributes(expr) {
   attr = expr.match(/\[[^=\s]+([$^~]?="[^"]*")?\]/g);
   if (!attr) return
   for (var j = 0; j < results.length; j++) {
      for (var i = 0; i < attr.length; i++) {
         attr[i] = attr[i].replace(/(^\[|\]$)/g, '');
         var pos = attr[i].indexOf("=");
         var key = pos > -1 ? attr[i].slice(0, pos) : attr[i];
         var value = pos > -1 ? attr[i].slice(pos+2, -1) : "";
         key = key.replace(/[$^~]$/g, "");
         var chars = ["^", "$", "~"];
         var c = pos > 0 ? attr[i].slice(pos-1, pos) : "";
         var val = results[j].getAttribute(key)
         if (pos == -1 && results[j].getAttribute(key) === null ||
              c == "^" && (!val || val.indexOf(value) != 0) ||
              c == "$" && (!val || val.indexOf(value) + value.length != val.length) ||
              c == "~" && (!val || val.indexOf(value) == -1) ||
              c != ""  && (!val || chars.indexOf(c) == -1 && val != value)) {
            results.splice(j--, 1);
            break;
         }
      }
   }
}

function checkPseudoClassesOfAncestor(ancestor, expr) {
   var psc = getPseudoClasses(expr);
   psc = psc.replace(/^:/g, '');
   if (psc.length) {
      var pseudoclasses = psc.split(':');
      for (var j = 0; j < results.length; j++) {
         for (var i = 0; i < pseudoclasses.length; i++) {
            if (pseudoclasses[i] == "first-child" && !isFirstElementChild(ancestor)) {
               return false;
            }
            if (pseudoclasses[i] == "last-child" && !isLastElementChild(ancestor)) {
               return false;
            }
            if (pseudoclasses[i].equals("nth-child(odd)") && !isOddElementChild(ancestor)) {
               return false;
            }
            if (pseudoclasses[i].equals("nth-child(even)") && !isEvenElementChild(ancestor)) {
               return false;
            }
            var m = pseudoclasses[i].match(/nth-child\(([1-9][0-9]*)\)/)
            if (m) {
               if (m[1] && !isNthElementChild(ancestor, num)) {
                  return false;
               }
            }
         }
      }
   }
   return true;
}

function isFirstElementChild(el) {
   el = el.previousSibling
   while (el) {
      if (el.nodeType == 1) return false
      el = el.previousSibling
   }
   return true
}

function isLastElementChild(el) {
   el = el.nextSibling
   while (el) {
      if (el.nodeType == 1) return false
      el = el.nextSibling
   }
   return true
}

function isOddElementChild(el) {
   var c = el.parent.children
   for (var i = 1; i <= c.length; i++) {
      if (c[i-1] == el) {
         return i % 2 == 1
      }
   }
   return false
}

function isEvenElementChild(el) {
   var c = el.parent.children
   for (var i = 1; i <= c.length; i++) {
      if (c[i-1] == el) {
         return i % 2 == 0
      }
   }
   return false
}

function isNthElementChild(el, index) {
   var c = el.parent.children
   for (var i = 1; i <= c.length; i++) {
      if (c[i-1] == el) {
         return i == index
      }
   }
   return false
}

function getTag(str) {
   str = str.replace(/(\.|#|:)[^\.#:]+/g, '');
   str = str.replace(/\[[^=\s]+([$^~]?="[^"]*")?\]/g, "");
   return str;
}

function getId(str) {
   str = str.replace(/^[^\\.#:]+/g, '');
   str = str.replace(/\\.[^\\.#:]+/g, '');
   str = str.replace(/:[^:]+/g, '');
   str = str.replace(/\[[^=\s]+([$^~]?="[^"]*")?\]/g, "");
   return str;
}

function getClasses(str) {
   str = str.replace(/^[^\\.#:]+/g, '');
   str = str.replace(/#[^\\.#:]+/g, '');
   str = str.replace(/:[^:]+/g, '');
   str = str.replace(/\[[^=\s]+([$^~]?="[^"]*")?\]/g, "");
   return str.indexOf('.') == 0 ? str.slice(1).split('.') : [];
}

function getPseudoClasses(str) {
   str = str.match(/(:[^:]+)+/);
   if (str) str = str.replace(/\[[^=\s]+([$^~]?="[^"]*")?\]/g, "");
   return str && str[0] && str[0].slice(1).split(':') || '';
}

function getAttributes(str) {
   str = str.match(/\[[^=\s]+([$^~]?="[^"]*")?\]/g);
   return str ? str.join('') : '';
}

function tryToFindID() {
   for (var i = parts.length-1; i >= 0; i--) {
      if (parts[i].trim().indexOf("#") != -1) {
         return i;
      }
   }
   return -1;
}

function tryToFindClassName() {
   for (var i = parts.length-1; i >= 0; i--) {
      if (parts[i].trim().indexOf(".") != -1) {
         return i;
      }
   }
   return -1;
}

function stepLeft(pos) {
   if (pos == 0) return;
   for (var i = 0; i < results.length; i++) {
      var str = parts[pos-1];
      var matches = true;
      if (parts[pos] == ">") {
         matches = checkAncestor(results[i], str, i);
      } else if (parts[pos] == " ") {
         matches = checkAllAncestors(results[i], str, i);
      }
      if (!matches) {
         results.splice(i--, 1);
      }
   }
}

function checkAncestor(node, expr, index) {
   node = node.parentNode;
   if (node == null) {
      return false;
   }
   var id = getId(expr);
   var classes = getClasses(expr);
   var tag = getTag(expr);
   
   if (classes.length) {
      for (var i = 0; i < classes.length; i++) {
         if (getElementsByClass(classes[i], node.parentNode, '*').indexOf(node) == -1) {
            return false;
         }
      }
   }
   if (id && node.id != id.slice(1)) {
      return false;
   }
   if (!node.tagName || node.tagName.toLowerCase() != tag.toLowerCase()) {
      return false;
   }
   if (!checkPseudoClassesOfAncestor(node, expr)) {
      return false;
   }
   return true;
}

function checkAllAncestors(node, expr, index) {
   while (node != null) {
      if (checkAncestor(node, expr, index)) {
         return true;
      }
      node = node.parentNode;
   }
   return false;
}

function stepRight(pos) {
   var expr = parts[pos+1];
   var id = getId(expr);
   var classes = getClasses(expr);
   var tag = getTag(expr);

   if (pos < 0) {
      results = [];
      var checked = false;
      if (id) {
         results.push(document.getElementById(id));
         checked = true;
      }
      if (classes.length) {
         var v = [];
         for (var i = 0; i < classes.length; i++) {
            concat(v, getElementsByClass(classes[i], document, '*'));
         }
         if (!checked) concat(results, v);
         else retain(results, v);
      }
      if (tag) {
         var v = document.getElementsByTagName(tag);
         if (!checked) concat(results, v);
         else retain(results, v);
      }
      applyPseudoClasses(expr);
      applyAttributes(expr);
      return;
   }
   if (parts[pos] == ">" || parts[pos] == " " || parts[pos].match(/^\s*[+~]\s*$/)) {
   
      if (parts[pos].match(/^\s*[+~]\s*$/)) {
         map(results, function(el) {
            var el = el.nextSibling
            while (el && el.nodeType != 1) el = el.nextSibling
            return el
         })
         filter(results, function(el) {
            return el != null
         })
         
         if (parts[pos].match(/^\s*~\s*$/)) {
            each(results, function(el, i) {
               if (!el) return
               var el = el.nextSibling
               while (el && el.nodeType != 1) el = el.nextSibling
               results.push(el)
            })
            filter(results, function(el) {
               return el != null
            })
         }
         
         if (id) {
            filter(results, function(el) {
               return el.id == id
            })
         }
         if (classes.length) {
            filter(results, function(el) {
               return hasAllClasses(el, classes)
            })
         }
         if (tag.length) {
            filter(results, function(el) {
               return el.tagName.toLowerCase() == tag.toLowerCase()
            })
         }
         applyPseudoClasses(expr);
         applyAttributes(expr);
         return
      }
      
      var v = [];
      var checked = false;
      for (var i = 0; i < results.length; i++) {
         var vs = [];
         checked = false;
         
         if (id) {
            vs.push(document.getElementById(id));
            checked = true;
         }
         if (classes.length) {
            var vx = [];
            for (var j = 0; j < results.length; j++) {
               for (var i = 0; i < classes.length; i++) {
                  concat(vx, getElementsByClass(classes[i], results[i], '*'));
               }
            }
            if (!checked) concat(vs, vx);
            else retain(vs, vx);
         }
         if (tag.length) {
            var vx = []
            for (var i = 0; i < results.length; i++) {
               concat(vx, Array.prototype.slice.call(results[i].getElementsByTagName(tag)));
            }
            if (!checked) concat(vs, vx);
            else retain(vs, vx);
         }
         concat(v, vs)
      }
      if (parts[pos] == ">") {
         for (var i = 0; i < v.length; i++) {
            if (results.indexOf(v[i].parentNode) == -1) v.splice(i--, 1)
         }
      }
      results = v;
      applyPseudoClasses(expr);
      applyAttributes(expr);
   }
}

function concat(a1, a2) {
   for (var i = 0; i < a2.length; i++) {
      if (a1.indexOf(a2[i]) == -1) a1.push(a2[i])
   }
}

function retain(a1, a2) {
   for (var i = 0; i < a1.length; i++) {
      if (a2.indexOf(a1[i]) == -1) a1.splice(i--, 1)
   }
}

function each(a, f) {
   if (!f || !(f instanceof Function)) return
   for (var i = 0; i < a.length; i++) {
      f(a[i], i)
   }
}

function map(a, f) {
   if (!f || !(f instanceof Function)) return
   for (var i = 0; i < a.length; i++) {
      a[i] = f(a[i], i)
   }
}

function filter(a, f) {
   if (!f || !(f instanceof Function)) return
   for (var i = 0; i < a.length; i++) {
      if (!f(a[i], i)) a.splice(i--, 1)
   }
}

if (!document.querySelectorAll) document.querySelectorAll = find
if (!document.querySelector) {
   document.querySelector = function() {
      var res = document.querySelectorAll()
      return res && res[0] || []
   }
}
document.find = find
document.findOne = function() {
   var res = document.querySelectorAll()
   return res && res[0] || []
}

})(document)