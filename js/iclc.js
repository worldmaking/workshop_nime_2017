//////////////////////////////////////////////////////////////////////////////////////////
// Marked 
// https://github.com/chjj/marked
//////////////////////////////////////////////////////////////////////////////////////////

var renderer = new marked.Renderer();
// insert a bit of extra logic to the renderer to pull out heading links:
var toc = [];
renderer.heading = function(text, level, raw) {
    var anchor = this.options.headerPrefix + raw.toLowerCase().replace(/[^\w]+/g, '-');
    if (level > 1) {
		toc.push(
			"\t".repeat(level-2) 
			+ "- [" + text + "](" + anchor + ")"
		);
	}
    return '<h' + level + ' id="' + anchor + '">'
        + text
        + '</h' + level + '>\n';
};



marked.setOptions({
	renderer: renderer,
	gfm: true,
	tables: true,
	sanitize: false,
	smartLists: true,
	smartypants: false,
	
	/*
		Sigh. The API for defining a language for hljs is horrific.
		I tried writing a mode definition for PEG.js, but gave up.
		I'm tempted instead to write a peg.js parser for peg.js
		And then defer to hljs to take care of the javascript portions.
		
		I now have a parser that can handle peg.js pretty well
		
		
		
    var s = "";
    for (var i=0; i<a.length; i++) {
    	var item = a[i];
        if (typeof item == "string") {
        	s += item;
        } else {
        	s += "<span class='hljs-" + item.type + "'>" + item.text + "</span>";
        }
    }
		
	*/
	highlight: function (code, lang) {
		if (lang == "peg") {
			try {
				var a = pegjs_pegjs.parse(code);
				for (var i=0; i<a.length; i++) {
					var v = a[i];
					switch (v.type) {
					case "js": {
						a[i] = hljs.highlight("js", v.text).value;
						break;
					}
					case "comment": {
						a[i] = '<span class="hljs-comment">' + v.text + "</span>";
						break;
					}
					case "argument": {
						a[i] = v.text;
						break;
					}
					case "ruledef": {
						a[i] = '<span class="hljs-type">' + v.text + "</span>";
						break;
					}
					case "rulename": {
						a[i] = '<span class="hljs-variable">' + v.text + "</span>";
						break;
					}
					case "string": {
						a[i] = '<span class="hljs-string">' + v.text + "</span>";
						break;
					}
					case "range":
					case "operator": {
						a[i] = '<span class="hljs-regexp">' + v.text + "</span>";
						break;
					}
					default:
						//console.log(v.type);
					}
				}
				return a.join("");
			
			} catch(e) {
				console.log("ERROR", e.message);
			}
		}
		// fallback:
		return hljs.highlight(lang, code).value;
  	},
});

//////////////////////////////////////////////////////////////////////////////////////////
// Codemirror:
// http://codemirror.net/3/doc/manual.html
//////////////////////////////////////////////////////////////////////////////////////////

// config options: http://codemirror.net/3/doc/manual.html#config
CodeMirror.defaults.value = "\n\n\n";
CodeMirror.defaults.lineWrapping = true;
CodeMirror.defaults.lineNumbers = true;
//CodeMirror.defaults.autofocus = true;
CodeMirror.defaults.undoDepth = 100;

// see http://codemirror.net/3/doc/manual.html#keymaps
CodeMirror.defaults.extraKeys = {
  "Ctrl-Enter": function(cm) {
    // if selection is empty, select entire line or containing block?
    console.log("exec!");
  }
};

// content manipulation: http://codemirror.net/3/doc/manual.html#api_content

/*
// TODO: use the grammar to define syntax highlighting (mode)
// use fake language name "local"
CodeMirror.defineMode("local", function() {
  return {
    startState: function() {
      return {}
    },
    token: function(stream, state) {}
  };
});
CodeMirror.defineMIME("text/x-local", "local");
CodeMirror.defaults.mode = "local";
*/

function random(n) {
  if (n) {
    return Math.floor(Math.random() * n);
  } else {
    return Math.random();
  }
}

//////////////////////////////////////////////////////////////////////////////////////////
// Gibberish:
// http://charlie-roberts.com/gibberish/
//////////////////////////////////////////////////////////////////////////////////////////

Gibberish.init();  
Gibberish.Time.export();
Gibberish.Binops.export();

kick = new Gibberish.Kick({ decay:.2 }).connect();
snare = new Gibberish.Snare({ snappy: 1.5 }).connect();
hat = new Gibberish.Hat({ amp: 1.5 }).connect();
conga = new Gibberish.Conga({ amp:.5, pitch:200 }).connect();

var scene = {};

bpm = 100;
div = 4;
sr = 44100;
tick = sr*60/(bpm*div);
beat = 0;

seq = new Gibberish.Sequencer({ 
  target:scene, 
  key:'beat', 
  durations:tick
});

score = [];

scene.beat = function() {
  if (score.length) {
    var i = beat % score.length;
    var e = score[i];
    if (typeof(e) == "function") e();
  }
  
  beat++;
}

