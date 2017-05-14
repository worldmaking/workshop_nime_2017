"use strict";

/*
	A collection of utilities:
*/

const random = function(n) {
  if (n) {
    return Math.floor(Math.random() * n);
  } else {
    return Math.random();
  }
}

// a modulo operation that handles negative n more appropriately
// e.g. wrap(-1, 3) returns 2
// see http://en.wikipedia.org/wiki/Modulo_operation
// see also http://jsperf.com/modulo-for-negative-numbers 
const wrap = function (n, m) {
	return ((n%m)+m)%m;
};

const mtof = function(pitch) {
	return 440 * Math.pow(2, (+pitch - 69)/12);
}

const uid = (function() {
	var id = -1;
	return function(prefix) {
		id++;
		return (prefix || "uid")+id;
	}
})();

const array_shuffle = function(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}


//////////////////////////////////////////////////////////////////////////////////////////
// Gibberish:
// http://charlie-roberts.com/gibberish/
//////////////////////////////////////////////////////////////////////////////////////////

//MIDI.init()
Gibberish.init();  
Gibberish.Time.export();
Gibberish.Binops.export();

var sr = Gibberish.context.sampleRate;

var kick = new Gibberish.Kick({ decay:.2 }).connect();
var snare = new Gibberish.Snare({ snappy: 1.5 }).connect();
var hat = new Gibberish.Hat({ amp: 1.5 }).connect();
var conga = new Gibberish.Conga({ amp:.25, freq:400 }).connect();
var tom = new Gibberish.Tom({ amp:.25, freq:400 }).connect();
var strings = new Gibberish.PolyKarplusStrong({maxVoices: 32}).connect();
var bass = new Gibberish.MonoSynth({ 
  attack:44, 
  decay:Gibberish.Time.beats( .25 ),
  filterMult:.25,
  octave2:0, 
  octave3:0
}).connect()

//////////////////////////////////////////////////////////////////////////////////////////

// The given instruction name is not in the commands object
const ERR_INSTR_NOT_FOUND = "Instruction not recognized."
// The max loop cycles tests
const ERR_LIMIT_REACHED = "Limit reached. Probably an infinity loop."

const isCommand = o => typeof o === "string" && o[0] === "@";
const isProgram = Array.isArray;
const isFn = x => typeof x === "function";
const isString = x => typeof x === "string"
const isDef = x => typeof x !== "undefined"

class Context {
	constructor(parent) {
		if (parent instanceof Context) this.parent = parent;
		else if (parent) this.local = Object.assign({}, parent); 
		//else this.local = {};
	}
	
	// Create a child
	child (local) {
		const c = new Context(this);
		c.local = Object.assign({}, local);
		return c;
	}
	
	// get a value from a context
	get (id) {
		let target = this
		while (target.value(id) === undefined && target.parent) {
	  		target = target.parent
		}
		return target.value(id)
	}
	
	// get a value from the local scope of a context
	value (id) {
		return this.local ? this.local[id] : undefined
	}

	// set a value from a context
	set (id, value) {
		let target = this
		while (target.value(id) === undefined && target.parent) {
			target = target.parent
		}
		target.let(id, value);
	}

	// set a value into the local scope of a context
	let (id, value) {
		if (!this.local) this.local = {}
		this.local[id] = value;
	}
}

class Process {
	constructor(name, commands, program, context, time, rate) {
		if (!name) { name = uid("proc"); }
		this.name = name;
		this.commands = commands;
		// a stack of values for operations
   		this.stack = [];
   		// the operations are stored in a stack (in reverse order)
    	this.operations = program ? [program] : []; // or just [program] ?
    	// the context is used to store variables with scope
    	this.context = new Context(context);
    	this.time = typeof time === "number" ? time : 0;
		this.rate = typeof rate === "number" ? rate : 1;
		// bind error to allow destructuring in commands
		this.error = this.error.bind(this);
	}
	
	// wait an amount of time
	wait (time) { this.time += this.rate * time; }
	
	// run all operations until time is reached
	resume (t = Infinity, limit = 10000) {
		const isProgram = Array.isArray;
		const { operations, commands } = this;
		//console.log("resume", this.time, t);
		while (this.time <= t && operations.length && --limit > 0) {
			//this.step(commands);
			if (operations.length) {
				const instr = operations.pop();
				if (instr === null || instr === undefined) {
					// ignore
				} else if (typeof instr === "function") {
					// it runs the functions but outside the loop
					setTimeout(() => { instr(this.time) }, 0);
				} else if (isProgram(instr)) { // i.e. Array.isArray
					// if it's program, and since the operations are stored into an stack,
					// we need add to the program operations in reverse order
					for (let i = instr.length - 1; i >= 0; i--) {
						operations.push(instr[i]);
					}
				} else if (isCommand(instr)) {
					const cmd = commands[instr];
					if (typeof cmd === "function") {
						//console.log("run", instr);
						cmd(this);
					} else {
						this.error("step > ", ERR_INSTR_NOT_FOUND, instr);
					}
					//console.log(instr);
					//console.log(cmd);
				} else {
					// if it's a value, push it into the stack
					this.stack.push(instr);
				}
			}
		}
		if (limit === 0) throw Error(ERR_LIMIT_REACHED);
		return operations.length > 0;
	}
	
	// an utility function to write errors
	error (instr, msg, obj) {
		console.error(instr, msg, obj, "name", this.name, "time", this.time)
	}
};

class VM {
	constructor(options) {
		if (!options) {
			options = {
				context: null,
				commands: []
			};
		}
		//this.bpm = 100;
		//this.bpm2bpa = 1./(60*sr); // multiplier to convert bpm to beats per audio sample
		this.name = uid("vm");
		this.time = 0;
		this.procs = [];	// priority list of Processes, first due at top of stack
		this.procsByName = {};
		this.context = Object.assign({}, options.context);
		this.commands = options.commands;
	}
	
	// install a set of commands:
	addCommands (lib) {
		if (isFn(lib)) this.commands = lib(this.comands);
    	else if (lib) Object.assign(this.commands, lib);
    	// expand any aliases:
  		Object.keys(this.commands).forEach(name => {
    		const op = this.commands[name];
    		if (isString(op)) this.commands[name] = this.commands[op];
  		});
	}
	
	// Run a program
	run (program, name) {
		// wrap with @sync to synchronize new programs to the pulse
		program = ["@sync", program]; 
		return this.fork(name, this.context, program);
	}
	
	// Create a new process
	fork (name, parent, program, delay = 0, rate) {
		const time = this.time + delay;
		// if has parent and no rate, try to use its rate
   		if (!rate && parent) rate = parent.rate;
   		// if has parent try to use it's context
    	const context = parent ? parent.context || parent : undefined;
    	// create the new process and insert into the process stack
    	const proc = new Process(name, this.commands, program, context, time, rate);
    	this.insert(proc, this.procs)
		// if has name, register it
		this.procsByName[name] = proc;
		//if (this.onfork) this.onfork({ proc, name, parent, program, delay, rate });
		return proc;
	}
	
	// insert a process into stack by time priority (topmost is next due)
	insert (proc, procs) {
	  if (procs.length === 0) {
		// no need to sort: just push it
		procs.push(proc);
	  } else {
		// procs are sorted on insertion
		let i = procs.length - 1;
		let p = procs[i];
		while (p && p.time <= proc.time) {
		  i--;
		  p = procs[i];
		}
		procs.splice(i + 1, 0, proc);
	  }
	  return proc;
	}
	
	// run the vm for the given amount of time (Infinity if not specified)
	resume (dur = Infinity, limit = 10) {
		const { procs } = this;
		const nextTime = this.time + dur;
		//console.log("nextTime", nextTime, this.at(procs));
		if (procs.length > 0) {
			while (procs.length > 0 && this.at(procs) < nextTime && --limit) {
				const proc = procs.pop();
				const t = proc.time;
				if (proc.resume(t)) {
		  			// the proc has more operations, re-schedule
					this.insert(proc, this.procs);
				} else {
		  			//if (this.onended) this.onended({ proc, time: this.time })
				}
				this.time = t;
			}
			
			if (limit == 0) {
				console.log("runaway loop detected in VM");
			}
		} 
		// update clock:
		this.time = nextTime;
		
		//console.log("procs:", procs.length, this.at(procs), this.time);
		//console.log("time", this.time);
		
		return procs.length > 0;
	}
	
	// get time of the next process
	at (procs) {
		const len = procs.length
		return len ? procs[len - 1].time : Infinity
	}
  	
  	// The stop function can stop a proccess by name or by object
  	// TODO: problem is that this doesn't stop all child processes
	stop (name) {
		let proc;
		if (typeof name === "string") {
			proc = this.procsByName[name]
		  	this.procsByName[name] = null
		} else {
		  	proc = name
		  	name = null
		}
		//if (this.onstop) this.onstop({ name, proc })
		this.remove(proc, this.procs);
	}
	
	// remove a process process
	remove (proc, procs) {
		let i = procs.length - 1;
		while (i >= 0 && procs[i] !== proc) {
			i--;
		}
		// if found, remove it
		if (i !== -1) procs.splice(i, 1);
		return i !== -1; // TODO: is it needed?
	}

	
	// wipe out all running processes in this VM:
	stopAll () {
    	this.procs.length = 0;
  	}
}

// public:
VM.uid = uid;

var bpm = 100;	// somehow need to make this globally modifiable
var bpm2bpa = 1./(60*sr); // multiplier to convert bpm to beats per audio sample
var external = {
	linked: false,
	t: 0,
}
























