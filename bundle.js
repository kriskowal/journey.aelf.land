global = this;
(function (modules) {

    // Bundle allows the run-time to extract already-loaded modules from the
    // boot bundle.
    var bundle = {};
    var main;

    // Unpack module tuples into module objects.
    for (var i = 0; i < modules.length; i++) {
        var module = modules[i];
        module = modules[i] = new Module(
            module[0],
            module[1],
            module[2],
            module[3],
            module[4]
        );
        bundle[module.filename] = module;
    }

    function Module(id, dirname, basename, dependencies, factory) {
        this.id = id;
        this.dirname = dirname;
        this.filename = dirname + "/" + basename;
        // Dependency map and factory are used to instantiate bundled modules.
        this.dependencies = dependencies;
        this.factory = factory;
    }

    Module.prototype._require = function () {
        var module = this;
        if (module.exports === void 0) {
            module.exports = {};
            var require = function (id) {
                var index = module.dependencies[id];
                var dependency = modules[index];
                if (!dependency)
                    throw new Error("Bundle is missing a dependency: " + id);
                return dependency._require();
            };
            require.main = main;
            module.exports = module.factory(
                require,
                module.exports,
                module,
                module.filename,
                module.dirname
            ) || module.exports;
        }
        return module.exports;
    };

    // Communicate the bundle to all bundled modules
    Module.prototype.modules = bundle;

    return function require(filename) {
        main = bundle[filename];
        main._require();
    }
})([["document.js","inkblot","document.js",{},function (require, exports, module, __filename, __dirname){

// inkblot/document.js
// -------------------

'use strict';

module.exports = Document;

function Document(element) {
    var self = this;
    this.element = element;
    this.engine = null;
    this.carry = '';
    this.cursor = null;
    this.next = null;
    this.options = null;
    this.p = false;
    this.br = false;
    this.onclick = onclick;
    function onclick(event) {
        self.answer(event.target.number);
    }
    Object.seal(this);
}

Document.prototype.write = function write(lift, text, drop) {
    var document = this.element.ownerDocument;
    if (this.p) {
        this.cursor = document.createElement("p");
        this.element.insertBefore(this.cursor, this.options);
        this.p = false;
        this.br = false;
    }
    if (this.br) {
        this.cursor.appendChild(document.createElement("br"));
        this.br = false;
    }
    this.cursor.appendChild(document.createTextNode((this.carry || lift) + text));
    this.carry = drop;
};

Document.prototype.break = function _break() {
    this.br = true;
};

Document.prototype.paragraph = function paragraph() {
    this.p = true;
};

Document.prototype.option = function option(number, label) {
    var document = this.element.ownerDocument;
    var tr = document.createElement("tr");
    this.options.appendChild(tr);
    var th = document.createElement("th");
    tr.appendChild(th);
    th.innerText = number + '.';
    var td = document.createElement("td");
    td.innerText = label;
    td.number = number;
    td.onclick = this.onclick;
    tr.appendChild(td);
};

Document.prototype.flush = function flush() {
    // No-op (for console only)
};

Document.prototype.pardon = function pardon() {
    this.clear();
    // No-op (for console only)
};

Document.prototype.display = function display() {
    // No-op (for console only)
};

Document.prototype.clear = function clear() {
    var document = this.element.ownerDocument;
    this.element.innerHTML = "";
    this.options = document.createElement("table");
    this.element.appendChild(this.options);
    this.cursor = null;
    this.br = false;
    this.p = true;
    this.carry = '';
};

Document.prototype.question = function question() {
};

Document.prototype.answer = function answer(text) {
    this.engine.answer(text);
};

Document.prototype.close = function close() {
};

}],["engine.js","inkblot","engine.js",{"./story":3},function (require, exports, module, __filename, __dirname){

// inkblot/engine.js
// -----------------

'use strict';

var Story = require('./story');

module.exports = Engine;

var debug = typeof process === 'object' && process.env.DEBUG_ENGINE;

function Engine(story, start, render, interlocutor) {
    var self = this;
    this.story = story;
    this.options = [];
    this.keywords = {};
    this.variables = {};
    this.top = new Global();
    this.stack = [this.top];
    this.label = '';
    this.instruction = new Story.constructors.goto(start || 'start');
    this.render = render;
    this.interlocutor = interlocutor;
    this.interlocutor.engine = this;
    this.debug = debug;
    Object.seal(this);
}

Engine.prototype.continue = function _continue() {
    var _continue;
    do {
        if (this.debug) {
            console.log(this.top.at() + '/' + this.label + ' ' + this.instruction.type + ' ' + this.instruction.describe());
        }
        if (!this['$' + this.instruction.type]) {
            throw new Error('Unexpected instruction type: ' + this.instruction.type);
        }
        _continue = this['$' + this.instruction.type](this.instruction);
    } while (_continue);
};

Engine.prototype.print = function print(text) {
    // Implicitly prompt if there are pending options before resuming the
    // narrative.
    if (this.options.length) {
        this.prompt();
        return false;
    }
    this.render.write(this.instruction.lift, text, this.instruction.drop);
    return this.goto(this.instruction.next);
};

Engine.prototype.$text = function text() {
    return this.print(this.instruction.text);
};

Engine.prototype.$print = function print() {
    return this.print('' + this.read());
};

Engine.prototype.$break = function $break() {
    this.render.break();
    return this.goto(this.instruction.next);
};

Engine.prototype.$paragraph = function $paragraph() {
    this.render.paragraph();
    return this.goto(this.instruction.next);
};

Engine.prototype.$goto = function $goto() {
    return this.goto(this.instruction.next);
};

Engine.prototype.$call = function $call() {
    var routine = this.story[this.instruction.label];
    if (!routine) {
        throw new Error('no such routine ' + this.instruction.label);
    }
    this.top = new Frame(this.top, routine.locals, this.instruction.next, this.instruction.branch);
    this.stack.push(this.top);
    return this.goto(this.instruction.branch);
};

Engine.prototype.$subroutine = function $subroutine() {
    // Subroutines exist as targets for labels as well as for reference to
    // locals in calls.
    return this.goto(this.instruction.next);
};

Engine.prototype.$option = function option() {
    this.options.push(this.instruction);
    for (var i = 0; i < this.instruction.keywords.length; i++) {
        var keyword = this.instruction.keywords[i];
        this.keywords[keyword] = this.instruction.branch;
    }
    return this.goto(this.instruction.next);
};

Engine.prototype.$inc = function inc() {
    this.write(this.read() + 1);
    return this.goto(this.instruction.next);
};

Engine.prototype.$set = function set() {
    this.write(this.instruction.value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$add = function add() {
    this.write(this.read() + this.instruction.value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$sub = function sub() {
    this.write(this.read() - this.instruction.value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$jz = function jz() {
    if (!this.read()) {
        return this.goto(this.instruction.branch);
    } else {
        return this.goto(this.instruction.next);
    }
};

Engine.prototype.$jnz = function jnz() {
    if (this.read()) {
        return this.goto(this.instruction.branch);
    } else {
        return this.goto(this.instruction.next);
    }
};

Engine.prototype.$jlt = function jlt() {
    if (this.read() < this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

Engine.prototype.$jgt = function jgt() {
    if (this.read() > this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

Engine.prototype.$jge = function jge() {
    if (this.read() >= this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

Engine.prototype.$jle = function jle() {
    if (this.read() <= this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

Engine.prototype.$switch = function _switch() {
    var branches = this.instruction.branches;
    var value;
    if (this.instruction.mode === 'rand') {
        value = Math.floor(Math.random() * branches.length);
    } else {
        value = this.read();
        if (this.instruction.value !== 0) {
            this.write(value + this.instruction.value);
        }
    }
    if (this.instruction.mode === 'loop') {
        value = value % branches.length;
    } else if (this.instruction.mode === 'hash') {
        value = hash(value) % branches.length;
    }
    var next = branches[Math.min(value, branches.length - 1)];
    return this.goto(next);
};

function hash(x) {
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x);
    return x >>> 0;
}

Engine.prototype.$prompt = function prompt() {
    this.prompt();
    return false;
};

Engine.prototype.goto = function _goto(name, fresh) {
    while (name === null && this.stack.length > 1 && this.options.length === 0) {
        var top = this.stack.pop();
        this.top = this.stack[this.stack.length - 1];
        name = top.next;
    }
    if (name === null) {
        if (this.options.length && !fresh) {
            this.prompt();
            return false;
        } else {
            this.display();
            this.render.break();
            this.interlocutor.close();
            return false;
        }
    }
    var next = this.story[name];
    if (!next) {
        throw new Error('Story missing knot for name: ' + name);
    }
    this.label = name;
    this.instruction = next;
    return true;
};

Engine.prototype.read = function read() {
    var variable = this.instruction.variable;
    if (this.variables[variable] == undefined) {
        this.variables[variable] = 0;
    }
    return this.variables[variable];
};

Engine.prototype.write = function write(value) {
    var variable = this.instruction.variable;
    this.variables[variable] = value;
};

Engine.prototype.answer = function answer(text) {
    this.render.flush();
    if (text === 'quit') {
        this.interlocutor.close();
        return;
    }
    if (text === 'bt') {
        this.top.log();
        this.prompt();
        return;
    }
    var n = +text;
    if (n >= 1 && n <= this.options.length) {
        if (this.goto(this.options[n - 1].branch, true)) {
            this.flush();
            this.continue();
        }
    } else if (this.keywords[text]) {
        if (this.goto(this.keywords[text], true)) {
            this.flush();
            this.continue();
        }
    } else {
        this.render.pardon();
        this.prompt();
    }
};

Engine.prototype.display = function display() {
    this.render.display();
};

function getLength(array) {
    return array.length;
}

Engine.prototype.prompt = function prompt() {
    this.display();
    for (var i = 0; i < this.options.length; i++) {
        var option = this.options[i];
        this.render.option(i + 1, option.label);
    }
    this.interlocutor.question();
};

Engine.prototype.flush = function flush() {
    this.options.length = 0;
    this.keywords = {};
    this.render.clear();
};

function Global() {
    this.scope = Object.create(null);
    this.next = null;
}

Global.prototype.get = function get(name) {
    return this.scope[name] || 0;
};

Global.prototype.set = function set(name, value) {
    this.scope[name] = value;
};

Global.prototype.log = function log() {
    var globals = Object.keys(this.scope);
    for (var i = 0; i < globals.length; i++) {
        var name = globals[i];
        var value = this.scope[name];
        console.log(name, value);
    }
};

Global.prototype.at = function at() {
    return '';
};

function Frame(parent, locals, next, branch) {
    this.locals = locals;
    this.scope = Object.create(null);
    for (var i = 0; i < locals.length; i++) {
        this.scope[locals[i]] = 0;
    }
    this.parent = parent;
    this.next = next;
    this.branch = branch;
}

Frame.prototype.get = function get(name) {
    if (this.locals.indexOf(name) >= 0) {
        return this.scope[name];
    }
    return this.parent.get(name);
};

Frame.prototype.set = function set(name, value) {
    if (this.locals.indexOf(name) >= 0) {
        this.scope[name] = value;
        return;
    }
    return this.parent.set(name, value);
};

Frame.prototype.log = function log() {
    this.parent.log();
    console.log('---', this.branch, '->', this.next);
    for (var i = 0; i < this.locals.length; i++) {
        var name = this.locals[i];
        var value = this.scope[name];
        console.log(name, value);
    }
};

Frame.prototype.at = function at() {
    return this.parent.at() + '/' + this.branch;
};

}],["path.js","inkblot","path.js",{},function (require, exports, module, __filename, __dirname){

// inkblot/path.js
// ---------------

'use strict';

exports.toName = pathToName;

function pathToName(path) {
    var name = path[0];
    var i;
    for (i = 1; i < path.length - 1; i++) {
        name += '.' + path[i];
    }
    var last = path[i];
    if (path.length > 1 && last !== 0) {
        name += '.' + last;
    }
    return name;
}

exports.next = nextPath;

function nextPath(path) {
    path = path.slice();
    path[path.length - 1]++;
    return path;
}

exports.firstChild = firstChildPath;

function firstChildPath(path) {
    path = path.slice();
    path.push(1);
    return path;
}

exports.zerothChild = zerothChildPath;

function zerothChildPath(path) {
    path = path.slice();
    path.push(0);
    return path;
}

}],["story.js","inkblot","story.js",{"./path":2},function (require, exports, module, __filename, __dirname){

// inkblot/story.js
// ----------------

'use strict';

var Path = require('./path');
var constructors = {};

module.exports = Story;

function Story() {
    this.states = {};
    Object.seal(this);
}

Story.constructors = constructors;

Story.prototype.create = function create(path, type, text) {
    var name = Path.toName(path);
    var Node = constructors[type];
    // istanbul ignore if
    if (!Node) {
        throw new Error('No node constructor for type: ' + type);
    }
    var node = new Node(text);
    this.states[name] = node;
    return node;
};

// istanbul ignore next
Story.prototype.dot = function dot() {
    return 'graph {}';
};

constructors.text = Text;
function Text(text) {
    this.type = 'text';
    this.text = text;
    this.lift = ' ';
    this.drop = ' ';
    this.next = null;
    Object.seal(this);
}
Text.prototype.tie = tie;
Text.prototype.describe = function describe() {
    return this.text;
};

constructors.print = Print;
function Print(variable) {
    this.type = 'print';
    this.variable = variable;
    this.next = null;
    Object.seal(this);
}
Print.prototype.tie = tie;
Print.prototype.describe = function describe() {
    return this.variable;
};

constructors.option = Option;
function Option(label) {
    this.type = 'option';
    this.label = label;
    this.keywords = [];
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Option.prototype.tie = tie;
Option.prototype.describe = function describe() {
    return this.label + ' -> ' + this.branch;
};

constructors.goto = Goto;
function Goto(next) {
    this.type = 'goto';
    this.next = next || null;
    Object.seal(this);
}
Goto.prototype.tie = tie;
Goto.prototype.describe = function describe() {
    return this.next;
};

constructors.call = Call;
function Call(label) {
    this.type = 'call';
    this.label = label;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Call.prototype.tie = tie;
Call.prototype.describe = function describe() {
    return this.branch + '() -> ' + this.next;
};

constructors.subroutine = Subroutine;
function Subroutine(locals) {
    this.type = 'subroutine';
    this.locals = locals;
    this.next = null;
    Object.seal(this);
};
Subroutine.prototype.tie = tie;
Subroutine.prototype.describe = function describe() {
    return '(' + this.locals.join(', ') + ')';
};

constructors.jz = Jz;
function Jz(variable) {
    this.type = 'jz';
    this.variable = variable;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jz.prototype.tie = tie;
Jz.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jnz = Jnz;
function Jnz(variable) {
    this.type = 'jnz';
    this.variable = variable;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jnz.prototype.tie = tie;
Jnz.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jeq = Jeq;
function Jeq(variable) {
    this.type = 'jeq';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jeq.prototype.tie = tie;
Jeq.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jne = Jne;
function Jne(variable) {
    this.type = 'jne';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jne.prototype.tie = tie;
Jne.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jlt = Jlt;
function Jlt(variable) {
    this.type = 'jlt';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jlt.prototype.tie = tie;
Jlt.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jgt = Jgt;
function Jgt(variable) {
    this.type = 'jgt';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jgt.prototype.tie = tie;
Jgt.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jle = Jle;
function Jle(variable) {
    this.type = 'jle';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jle.prototype.tie = tie;
Jle.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jge = Jge;
function Jge(variable) {
    this.type = 'jge';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jge.prototype.tie = tie;
Jge.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.inc = Inc;
function Inc(variable) {
    this.type = 'inc';
    this.variable = variable;
    this.next = null;
    Object.seal(this);
}
Inc.prototype.tie = tie;
Inc.prototype.describe = function describe() {
    return this.variable;
};

constructors.switch = Switch;
function Switch(variable) {
    this.type = 'switch';
    this.variable = variable;
    this.value = 0;
    this.mode = null;
    this.branches = [];
    Object.seal(this);
}
Switch.prototype.tie = tie;
Switch.prototype.describe = function describe() {
    return this.variable + ' ' + this.mode;
};

constructors.set = Set;
function Set(variable) {
    this.type = 'set';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Set.prototype.tie = tie;
Set.prototype.describe = function describe() {
    return this.variable + ' ' + this.value;
};

constructors.add = Add;
function Add(variable) {
    this.type = 'add';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Add.prototype.tie = tie;
Add.prototype.describe = function describe() {
    return this.variable + ' ' + this.value;
};

constructors.sub = Sub;
function Sub(variable) {
    this.type = 'sub';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Sub.prototype.tie = tie;
Sub.prototype.describe = function describe() {
    return this.variable + ' ' + this.value;
};

constructors.break = Break;
function Break(variable) {
    this.type = 'break';
    this.next = null;
    Object.seal(this);
}
Break.prototype.tie = tie;
Break.prototype.describe = function describe() {
    return '';
};

constructors.paragraph = Paragraph;
function Paragraph(variable) {
    this.type = 'paragraph';
    this.next = null;
    Object.seal(this);
}
Paragraph.prototype.tie = tie;
Paragraph.prototype.describe = function describe() {
    return '';
};

constructors.prompt = Prompt;
function Prompt(variable) {
    this.type = 'prompt';
    Object.seal(this);
}
Prompt.prototype.tie = tie;
Prompt.prototype.describe = function describe() {
    return '';
};

function tie(end) {
    this.next = end;
}

}],["heavens.js","journey.aelf.land","heavens.js",{"ndim/point2":8},function (require, exports, module, __filename, __dirname){

// journey.aelf.land/heavens.js
// ----------------------------

"use strict";

var Point2 = require("ndim/point2");

var windowSize = new Point2();
var sceneSize = new Point2();
var documentSize = new Point2(2000, 1000);
var offset = new Point2();
var ratio = new Point2();

var solar = new Point2();
var lunar = new Point2();

module.exports = Heavens;

function Heavens(body, scope) {
    // this.animator = scope.animator.add(this);
    this.window = scope.window;
    this.document = this.window.document;
    // this.animator.requestAnimation();
    this.day = 0;
    this.month = 0.5;
    // var day = Date.now() / 240000 * 2 % 1;
    // var month = 0.5; // A childish simplification
}

Heavens.prototype.redraw = function redraw() {
    var scene = this.document.querySelector("#scene");
    windowSize.x = this.window.innerWidth;
    windowSize.y = this.window.innerHeight;
    ratio.x = windowSize.x / 2000;
    ratio.y = windowSize.y / 1000;
    var scale = ratio.x < ratio.y ? ratio.y : ratio.x;
    sceneSize.become(documentSize).scaleThis(scale);
    offset.become(windowSize).subThis(sceneSize).scaleThis(0.5);
    scene.setAttribute("transform",
        "translate(" + offset.x.toFixed(2) + ", " + offset.y.toFixed(2) + ")" +
        " " +
        "scale(" + scale.toFixed(2) + ")" +
        ""
    );
    scene.style.display = "inline";

    var breadth = windowSize.x / documentSize.x / scale * 500;

    //window.document.querySelector("#atmosphere").style.opacity = 0;
    solar.y = (-Math.sin(2 * Math.PI * this.day) * 1000 + 1000).toFixed(2);
    lunar.y = (-Math.sin(2 * Math.PI * this.day + 2 * Math.PI * this.month) * 1000 + 1000).toFixed(2);
    solar.x = (-Math.cos(2 * Math.PI * this.day) * breadth + 1000).toFixed(2);
    lunar.x = (-Math.cos(2 * Math.PI * this.day + 2 * Math.PI * this.month) * breadth + 1000).toFixed(2);
    var cycle =
        Math.sin(2 * Math.PI * this.day) / 1 +
        Math.sin(6 * Math.PI * this.day) / 3 +
        Math.sin(10 * Math.PI * this.day) / 5 +
        Math.sin(14 * Math.PI * this.day) / 7;
        //Math.sin(18 * Math.PI * this.day) / 9;
    var clamped = Math.min(1, Math.max(-1, cycle * 1.5));
    var opacity = clamped / 2 + .5;
    this.document.querySelector("#atmosphere").style.opacity = opacity;
    var rotation = (this.day * 360).toFixed(2);
    this.document.querySelector("#stars").setAttribute("transform", "translate(1000, 750) rotate(" + rotation + ")");
    this.document.querySelector("#sun").setAttribute("transform", "translate(" + solar.x + ", " + solar.y + ")");
    this.document.querySelector("#moon").setAttribute("transform", "translate(" + lunar.x + ", " + lunar.y + ")");
};

}],["index.js","journey.aelf.land","index.js",{"inkblot/engine":1,"inkblot/document":0,"./journey.json":6,"./heavens":4},function (require, exports, module, __filename, __dirname){

// journey.aelf.land/index.js
// --------------------------

'use strict';
var Engine = require('inkblot/engine');
var Document = require('inkblot/document');
var story = require('./journey.json');
var Heavens = require('./heavens');
var doc = new Document(document.getElementById('body'));
var engine = new Engine(story, 'start', doc, doc);
doc.clear();
engine.continue();

var style = document.getElementById('style');
var sheet = style.sheet;
sheet.insertRule('body { color: black }', 0);

var scope = {};
scope.window = window;
var heavens = new Heavens(null, scope);

function redraw() {
    var hour = engine.variables.hour;
    var day = ((hour + 0.5) / 14) % 1.0;
    heavens.day = day;
    heavens.month = 0.5;
    heavens.redraw();
    sheet.deleteRule(0);
    if (day < 0.5) {
        sheet.insertRule('body { color: black; }', 0);
    } else {
        sheet.insertRule('body { color: hsla(240, 25.00%, 83.00%, 1); text-shadow: black 0 0 5pt; }', 0);
    }
}
redraw();

window.onkeypress = function onkeypress(event) {
    if (engine.variables.end) {
        return;
    }
    var key = event.code;
    var match = /^Digit(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    }
    redraw();
};

}],["journey.json","journey.aelf.land","journey.json",{},function (require, exports, module, __filename, __dirname){

// journey.aelf.land/journey.json
// ------------------------------

module.exports = {
    "start": {
        "type": "set",
        "variable": "hour",
        "value": 0,
        "next": "start.1"
    },
    "start.1": {
        "type": "set",
        "variable": "x",
        "value": 0,
        "next": "start.2"
    },
    "start.2": {
        "type": "set",
        "variable": "hunger",
        "value": 0,
        "next": "start.3"
    },
    "start.3": {
        "type": "set",
        "variable": "thirst",
        "value": 0,
        "next": "start.4"
    },
    "start.4": {
        "type": "set",
        "variable": "fish",
        "value": 0,
        "next": "start.5"
    },
    "start.5": {
        "type": "set",
        "variable": "deer",
        "value": 0,
        "next": "start.6"
    },
    "start.6": {
        "type": "set",
        "variable": "water",
        "value": 0,
        "next": "start.7"
    },
    "start.7": {
        "type": "set",
        "variable": "empty",
        "value": 2,
        "next": "start.8"
    },
    "start.8": {
        "type": "set",
        "variable": "river",
        "value": 0,
        "next": "start.9"
    },
    "start.9": {
        "type": "set",
        "variable": "game",
        "value": 0,
        "next": "start.10"
    },
    "start.10": {
        "type": "set",
        "variable": "end",
        "value": 0,
        "next": "start.11"
    },
    "start.11": {
        "type": "text",
        "text": "You begin your journey at",
        "lift": "",
        "drop": " ",
        "next": "start.12"
    },
    "start.12": {
        "type": "call",
        "label": "time",
        "branch": "time",
        "next": "start.13"
    },
    "start.13": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "journey"
    },
    "journey": {
        "type": "jge",
        "variable": "thirst",
        "value": 7,
        "branch": "journey.3",
        "next": "journey.1"
    },
    "journey.1": {
        "type": "text",
        "text": "However, you succumb to your thirst.",
        "lift": " ",
        "drop": " ",
        "next": "death"
    },
    "journey.3": {
        "type": "jge",
        "variable": "hunger",
        "value": 7,
        "branch": "journey.6",
        "next": "journey.4"
    },
    "journey.4": {
        "type": "text",
        "text": "However, You succumb to your hunger.",
        "lift": " ",
        "drop": " ",
        "next": "death"
    },
    "journey.6": {
        "type": "call",
        "label": "setting",
        "branch": "setting",
        "next": "journey.7"
    },
    "journey.7": {
        "type": "paragraph",
        "next": "journey.8"
    },
    "journey.8": {
        "type": "call",
        "label": "status",
        "branch": "status",
        "next": "journey.9"
    },
    "journey.9": {
        "type": "call",
        "label": "inventory",
        "branch": "inventory",
        "next": "journey.10"
    },
    "journey.10": {
        "type": "option",
        "label": "Venture east.",
        "keywords": [],
        "branch": "journey.10.1",
        "next": "journey.11"
    },
    "journey.10.1": {
        "type": "text",
        "text": "You v",
        "lift": "",
        "drop": "",
        "next": "journey.10.2"
    },
    "journey.10.2": {
        "type": "text",
        "text": "enture east.",
        "lift": "",
        "drop": " ",
        "next": "journey.10.3"
    },
    "journey.10.3": {
        "type": "add",
        "variable": "x",
        "value": 1,
        "next": "journey.10.4"
    },
    "journey.10.4": {
        "type": "call",
        "label": "tick",
        "branch": "tick",
        "next": "journey.10.5"
    },
    "journey.10.5": {
        "type": "call",
        "label": "now",
        "branch": "now",
        "next": "journey.10.6"
    },
    "journey.10.6": {
        "type": "call",
        "label": "travel",
        "branch": "travel",
        "next": "journey"
    },
    "journey.11": {
        "type": "jgt",
        "variable": "x",
        "value": 0,
        "branch": "journey.13",
        "next": "journey.12"
    },
    "journey.12": {
        "type": "option",
        "label": "Return west.",
        "keywords": [],
        "branch": "journey.12.1",
        "next": "journey.13"
    },
    "journey.12.1": {
        "type": "text",
        "text": "You r",
        "lift": "",
        "drop": "",
        "next": "journey.12.2"
    },
    "journey.12.2": {
        "type": "text",
        "text": "eturn west.",
        "lift": "",
        "drop": " ",
        "next": "journey.12.3"
    },
    "journey.12.3": {
        "type": "sub",
        "variable": "x",
        "value": 1,
        "next": "journey.12.4"
    },
    "journey.12.4": {
        "type": "call",
        "label": "tick",
        "branch": "tick",
        "next": "journey.12.5"
    },
    "journey.12.5": {
        "type": "call",
        "label": "now",
        "branch": "now",
        "next": "journey"
    },
    "journey.13": {
        "type": "jnz",
        "variable": "river",
        "branch": "journey.17",
        "next": "journey.14"
    },
    "journey.14": {
        "type": "jz",
        "variable": "thirst",
        "branch": "journey.17",
        "next": "journey.15"
    },
    "journey.15": {
        "type": "jz",
        "variable": "water",
        "branch": "journey.17",
        "next": "journey.16"
    },
    "journey.16": {
        "type": "option",
        "label": "Drink from your stored water.",
        "keywords": [],
        "branch": "journey.16.1",
        "next": "journey.17"
    },
    "journey.16.1": {
        "type": "text",
        "text": "You d",
        "lift": "",
        "drop": "",
        "next": "journey.16.2"
    },
    "journey.16.2": {
        "type": "text",
        "text": "rink from your stored water.",
        "lift": "",
        "drop": " ",
        "next": "journey.16.3"
    },
    "journey.16.3": {
        "type": "sub",
        "variable": "thirst",
        "value": 1,
        "next": "journey.16.4"
    },
    "journey.16.4": {
        "type": "sub",
        "variable": "water",
        "value": 1,
        "next": "journey.16.5"
    },
    "journey.16.5": {
        "type": "add",
        "variable": "empty",
        "value": 1,
        "next": "journey"
    },
    "journey.17": {
        "type": "jz",
        "variable": "river",
        "branch": "journey.20",
        "next": "journey.18"
    },
    "journey.18": {
        "type": "option",
        "label": "Rest here, drink your fill, and refill your bottles.",
        "keywords": [],
        "branch": "journey.18.1",
        "next": "journey.19"
    },
    "journey.18.1": {
        "type": "text",
        "text": "You rest here",
        "lift": "",
        "drop": "",
        "next": "journey.18.2"
    },
    "journey.18.2": {
        "type": "switch",
        "variable": "empty",
        "value": 0,
        "mode": "walk",
        "branches": [
            "journey.18.2.1",
            "journey.18.2.2"
        ]
    },
    "journey.18.2.1": {
        "type": "goto",
        "next": "journey.18.3"
    },
    "journey.18.2.2": {
        "type": "text",
        "text": "filling your bottles of water",
        "lift": " ",
        "drop": "",
        "next": "journey.18.2.2.1"
    },
    "journey.18.2.2.1": {
        "type": "call",
        "label": "fill",
        "branch": "fill",
        "next": "journey.18.2.2.2"
    },
    "journey.18.2.2.2": {
        "type": "switch",
        "variable": "thirst",
        "value": 0,
        "mode": "walk",
        "branches": [
            "journey.18.2.2.2.1",
            "journey.18.2.2.2.2",
            "journey.18.2.2.2.3"
        ]
    },
    "journey.18.2.2.2.1": {
        "type": "goto",
        "next": "journey.18.3"
    },
    "journey.18.2.2.2.2": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "journey.18.3"
    },
    "journey.18.2.2.2.3": {
        "type": "goto",
        "next": "journey.18.3"
    },
    "journey.18.3": {
        "type": "switch",
        "variable": "thirst",
        "value": 0,
        "mode": "walk",
        "branches": [
            "journey.18.3.1",
            "journey.18.3.2"
        ]
    },
    "journey.18.3.1": {
        "type": "goto",
        "next": "journey.18.4"
    },
    "journey.18.3.2": {
        "type": "text",
        "text": "drinking your fill from the stream",
        "lift": " ",
        "drop": "",
        "next": "journey.18.3.2.1"
    },
    "journey.18.3.2.1": {
        "type": "set",
        "variable": "thirst",
        "value": 0,
        "next": "journey.18.4"
    },
    "journey.18.4": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "journey"
    },
    "journey.19": {
        "type": "option",
        "label": "Try fishing.",
        "keywords": [],
        "branch": "journey.19.1",
        "next": "journey.20"
    },
    "journey.19.1": {
        "type": "call",
        "label": "fishing",
        "branch": "fishing",
        "next": "journey"
    },
    "journey.20": {
        "type": "jz",
        "variable": "hunger",
        "branch": "journey.23",
        "next": "journey.21"
    },
    "journey.21": {
        "type": "jz",
        "variable": "fish",
        "branch": "journey.23",
        "next": "journey.22"
    },
    "journey.22": {
        "type": "option",
        "label": "Eat one of your fish.",
        "keywords": [],
        "branch": "journey.22.1",
        "next": "journey.23"
    },
    "journey.22.1": {
        "type": "text",
        "text": "You e",
        "lift": "",
        "drop": "",
        "next": "journey.22.2"
    },
    "journey.22.2": {
        "type": "text",
        "text": "at one of your fish.",
        "lift": "",
        "drop": " ",
        "next": "journey.22.3"
    },
    "journey.22.3": {
        "type": "sub",
        "variable": "fish",
        "value": 1,
        "next": "journey.22.4"
    },
    "journey.22.4": {
        "type": "sub",
        "variable": "hunger",
        "value": 1,
        "next": "journey"
    },
    "journey.23": {
        "type": "jz",
        "variable": "hunger",
        "branch": "journey.26",
        "next": "journey.24"
    },
    "journey.24": {
        "type": "jz",
        "variable": "deer",
        "branch": "journey.26",
        "next": "journey.25"
    },
    "journey.25": {
        "type": "option",
        "label": "Eat a meal of smoked venison.",
        "keywords": [],
        "branch": "journey.25.1",
        "next": "journey.26"
    },
    "journey.25.1": {
        "type": "text",
        "text": "You e",
        "lift": "",
        "drop": "",
        "next": "journey.25.2"
    },
    "journey.25.2": {
        "type": "text",
        "text": "at a meal of smoked venison.",
        "lift": "",
        "drop": " ",
        "next": "journey.25.3"
    },
    "journey.25.3": {
        "type": "sub",
        "variable": "deer",
        "value": 1,
        "next": "journey.25.4"
    },
    "journey.25.4": {
        "type": "sub",
        "variable": "hunger",
        "value": 1,
        "next": "journey"
    },
    "journey.26": {
        "type": "prompt"
    },
    "travel": {
        "type": "subroutine",
        "locals": [],
        "next": "travel.1"
    },
    "travel.1": {
        "type": "text",
        "text": "You have",
        "lift": " ",
        "drop": " ",
        "next": "travel.2"
    },
    "travel.2": {
        "type": "switch",
        "variable": "travel.2",
        "value": 0,
        "mode": "rand",
        "branches": [
            "travel.2.1",
            "travel.2.2",
            "travel.2.3",
            "travel.2.4"
        ]
    },
    "travel.2.1": {
        "type": "text",
        "text": "come",
        "lift": "",
        "drop": " ",
        "next": "travel.3"
    },
    "travel.2.2": {
        "type": "text",
        "text": "traveled",
        "lift": "",
        "drop": " ",
        "next": "travel.3"
    },
    "travel.2.3": {
        "type": "text",
        "text": "journeyed",
        "lift": "",
        "drop": " ",
        "next": "travel.3"
    },
    "travel.2.4": {
        "type": "text",
        "text": "ventured",
        "lift": "",
        "drop": " ",
        "next": "travel.3"
    },
    "travel.3": {
        "type": "print",
        "variable": "x",
        "next": "travel.4"
    },
    "travel.4": {
        "type": "text",
        "text": "league",
        "lift": " ",
        "drop": "",
        "next": "travel.5"
    },
    "travel.5": {
        "type": "switch",
        "variable": "x",
        "value": 0,
        "mode": "walk",
        "branches": [
            "travel.5.1",
            "travel.5.2",
            "travel.5.3"
        ]
    },
    "travel.5.1": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "travel.6"
    },
    "travel.5.2": {
        "type": "goto",
        "next": "travel.6"
    },
    "travel.5.3": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "travel.6"
    },
    "travel.6": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "fishing": {
        "type": "subroutine",
        "locals": [],
        "next": "fishing.1"
    },
    "fishing.1": {
        "type": "text",
        "text": "You spread out your hooks and line and settle in for a bit of fishing.",
        "lift": " ",
        "drop": " ",
        "next": "fishing.2"
    },
    "fishing.2": {
        "type": "jz",
        "variable": "thirst",
        "branch": "fish.again",
        "next": "fishing.3"
    },
    "fishing.3": {
        "type": "set",
        "variable": "thirst",
        "value": 0,
        "next": "fishing.4"
    },
    "fishing.4": {
        "type": "text",
        "text": "While your line bobs, you take a spare moment to quench your thirst from the running water.",
        "lift": " ",
        "drop": " ",
        "next": "fish.again"
    },
    "fish.again": {
        "type": "call",
        "label": "reset.fish.chances",
        "branch": "reset.fish.chances",
        "next": "fish.loop"
    },
    "fish.loop": {
        "type": "jz",
        "variable": "fish.chances",
        "branch": "done.fishing",
        "next": "fish.loop.1"
    },
    "fish.loop.1": {
        "type": "sub",
        "variable": "fish.chances",
        "value": 1,
        "next": "fish.loop.2"
    },
    "fish.loop.2": {
        "type": "switch",
        "variable": "fish.loop.2",
        "value": 0,
        "mode": "rand",
        "branches": [
            "fish.loop.2.1",
            "fish.loop.2.2",
            "fish.loop.2.3"
        ]
    },
    "fish.loop.2.1": {
        "type": "goto",
        "next": "fish.loop"
    },
    "fish.loop.2.2": {
        "type": "goto",
        "next": "fish.loop"
    },
    "fish.loop.2.3": {
        "type": "goto",
        "next": "done.fishing"
    },
    "done.fishing": {
        "type": "jz",
        "variable": "fish.chances",
        "branch": "done.fishing.7",
        "next": "done.fishing.1"
    },
    "done.fishing.1": {
        "type": "switch",
        "variable": "done.fishing.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.1.1",
            "done.fishing.1.2",
            "done.fishing.1.3"
        ]
    },
    "done.fishing.1.1": {
        "type": "text",
        "text": "A fish wanders by and tentatively nibbles your line.",
        "lift": "",
        "drop": " ",
        "next": "done.fishing.2"
    },
    "done.fishing.1.2": {
        "type": "text",
        "text": "You feel a nibble on your line.",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.2"
    },
    "done.fishing.1.3": {
        "type": "text",
        "text": "Out of the blue, you feel a tug and your rod dips toward the water.",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.2"
    },
    "done.fishing.2": {
        "type": "switch",
        "variable": "done.fishing.2",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.2.1",
            "done.fishing.2.2"
        ]
    },
    "done.fishing.2.1": {
        "type": "text",
        "text": "You have",
        "lift": "",
        "drop": " ",
        "next": "done.fishing.2.1.1"
    },
    "done.fishing.2.1.1": {
        "type": "switch",
        "variable": "done.fishing.2.1.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.2.1.1.1",
            "done.fishing.2.1.1.2"
        ]
    },
    "done.fishing.2.1.1.1": {
        "type": "text",
        "text": "him",
        "lift": "",
        "drop": "",
        "next": "done.fishing.2.1.2"
    },
    "done.fishing.2.1.1.2": {
        "type": "text",
        "text": "her",
        "lift": "",
        "drop": "",
        "next": "done.fishing.2.1.2"
    },
    "done.fishing.2.1.2": {
        "type": "text",
        "text": "on line and drag the fish",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.2.1.3"
    },
    "done.fishing.2.1.3": {
        "type": "switch",
        "variable": "done.fishing.2.1.3",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.2.1.3.1",
            "done.fishing.2.1.3.2"
        ]
    },
    "done.fishing.2.1.3.1": {
        "type": "text",
        "text": "in",
        "lift": "",
        "drop": "",
        "next": "done.fishing.2.1.4"
    },
    "done.fishing.2.1.3.2": {
        "type": "text",
        "text": "to shore",
        "lift": "",
        "drop": "",
        "next": "done.fishing.2.1.4"
    },
    "done.fishing.2.1.4": {
        "type": "text",
        "text": "!",
        "lift": "",
        "drop": " ",
        "next": "done.fishing.3"
    },
    "done.fishing.2.2": {
        "type": "text",
        "text": "The fish drags your line and you pull",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.2.2.1"
    },
    "done.fishing.2.2.1": {
        "type": "switch",
        "variable": "done.fishing.2.2.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.2.2.1.1",
            "done.fishing.2.2.1.2"
        ]
    },
    "done.fishing.2.2.1.1": {
        "type": "text",
        "text": "him",
        "lift": "",
        "drop": "",
        "next": "done.fishing.2.2.2"
    },
    "done.fishing.2.2.1.2": {
        "type": "text",
        "text": "her",
        "lift": "",
        "drop": "",
        "next": "done.fishing.2.2.2"
    },
    "done.fishing.2.2.2": {
        "type": "text",
        "text": "to the shore!",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.3"
    },
    "done.fishing.3": {
        "type": "add",
        "variable": "fish",
        "value": 1,
        "next": "done.fishing.4"
    },
    "done.fishing.4": {
        "type": "text",
        "text": "You now have",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.5"
    },
    "done.fishing.5": {
        "type": "print",
        "variable": "fish",
        "next": "done.fishing.6"
    },
    "done.fishing.6": {
        "type": "text",
        "text": "fish.",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.7"
    },
    "done.fishing.7": {
        "type": "jnz",
        "variable": "fish.chances",
        "branch": "done.fishing.9",
        "next": "done.fishing.8"
    },
    "done.fishing.8": {
        "type": "switch",
        "variable": "done.fishing.8",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.8.1",
            "done.fishing.8.2",
            "done.fishing.8.3",
            "done.fishing.8.4"
        ]
    },
    "done.fishing.8.1": {
        "type": "text",
        "text": "Time passes but no fish have bitten.",
        "lift": "",
        "drop": " ",
        "next": "done.fishing.9"
    },
    "done.fishing.8.2": {
        "type": "text",
        "text": "You may have felt a nibble, but the time is lost.",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.9"
    },
    "done.fishing.8.3": {
        "type": "text",
        "text": "The fish seem shy this hour.",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.9"
    },
    "done.fishing.8.4": {
        "type": "text",
        "text": "After a while, a fish wallows by your hook but pays it no heed.",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.9"
    },
    "done.fishing.9": {
        "type": "paragraph",
        "next": "done.fishing.10"
    },
    "done.fishing.10": {
        "type": "call",
        "label": "tick",
        "branch": "tick",
        "next": "done.fishing.11"
    },
    "done.fishing.11": {
        "type": "call",
        "label": "now",
        "branch": "now",
        "next": "done.fishing.12"
    },
    "done.fishing.12": {
        "type": "call",
        "label": "status",
        "branch": "status",
        "next": "done.fishing.13"
    },
    "done.fishing.13": {
        "type": "call",
        "label": "inventory",
        "branch": "inventory",
        "next": "done.fishing.14"
    },
    "done.fishing.14": {
        "type": "option",
        "label": "Try again.",
        "keywords": [],
        "branch": "done.fishing.16",
        "next": "done.fishing.15"
    },
    "done.fishing.15": {
        "type": "option",
        "label": "Perhaps another time.",
        "keywords": [],
        "branch": "done.fishing.15.1",
        "next": "done.fishing.16"
    },
    "done.fishing.15.1": {
        "type": "text",
        "text": "You pack up and return to the trail.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "done.fishing.16": {
        "type": "switch",
        "variable": "done.fishing.16",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.16.1",
            "done.fishing.16.2",
            "done.fishing.16.3",
            "done.fishing.16.4"
        ]
    },
    "done.fishing.16.1": {
        "type": "text",
        "text": "You bait your hook with a worm and toss it out again.",
        "lift": "",
        "drop": " ",
        "next": "fish.again"
    },
    "done.fishing.16.2": {
        "type": "text",
        "text": "You try a fresh worm you find in the loam.",
        "lift": " ",
        "drop": " ",
        "next": "fish.again"
    },
    "done.fishing.16.3": {
        "type": "text",
        "text": "You cast your line off once",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.16.3.1"
    },
    "done.fishing.16.3.1": {
        "type": "switch",
        "variable": "done.fishing.16.3.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.16.3.1.1",
            "done.fishing.16.3.1.2"
        ]
    },
    "done.fishing.16.3.1.1": {
        "type": "text",
        "text": "again",
        "lift": "",
        "drop": "",
        "next": "done.fishing.16.3.2"
    },
    "done.fishing.16.3.1.2": {
        "type": "text",
        "text": "more",
        "lift": "",
        "drop": "",
        "next": "done.fishing.16.3.2"
    },
    "done.fishing.16.3.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "fish.again"
    },
    "done.fishing.16.4": {
        "type": "text",
        "text": "You cast off once",
        "lift": " ",
        "drop": " ",
        "next": "done.fishing.16.4.1"
    },
    "done.fishing.16.4.1": {
        "type": "switch",
        "variable": "done.fishing.16.4.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "done.fishing.16.4.1.1",
            "done.fishing.16.4.1.2"
        ]
    },
    "done.fishing.16.4.1.1": {
        "type": "text",
        "text": "again",
        "lift": "",
        "drop": "",
        "next": "done.fishing.16.4.2"
    },
    "done.fishing.16.4.1.2": {
        "type": "text",
        "text": "more",
        "lift": "",
        "drop": "",
        "next": "done.fishing.16.4.2"
    },
    "done.fishing.16.4.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "fish.again"
    },
    "reset.fish.chances": {
        "type": "subroutine",
        "locals": [],
        "next": "reset.fish.chances.1"
    },
    "reset.fish.chances.1": {
        "type": "set",
        "variable": "fish.chances",
        "value": 1,
        "next": "reset.fish.chances.2"
    },
    "reset.fish.chances.2": {
        "type": "switch",
        "variable": "hour",
        "value": 0,
        "mode": "walk",
        "branches": [
            "reset.fish.chances.2.1",
            "reset.fish.chances.2.2",
            "reset.fish.chances.2.3",
            "reset.fish.chances.2.4",
            "reset.fish.chances.2.5",
            "reset.fish.chances.2.6",
            "reset.fish.chances.2.7",
            "reset.fish.chances.2.8",
            "reset.fish.chances.2.9",
            "reset.fish.chances.2.10",
            "reset.fish.chances.2.11",
            "reset.fish.chances.2.12",
            "reset.fish.chances.2.13",
            "reset.fish.chances.2.14"
        ]
    },
    "reset.fish.chances.2.1": {
        "type": "set",
        "variable": "fish.chances",
        "value": 6,
        "next": null
    },
    "reset.fish.chances.2.2": {
        "type": "set",
        "variable": "fish.chances",
        "value": 3,
        "next": null
    },
    "reset.fish.chances.2.3": {
        "type": "goto",
        "next": null
    },
    "reset.fish.chances.2.4": {
        "type": "goto",
        "next": null
    },
    "reset.fish.chances.2.5": {
        "type": "goto",
        "next": null
    },
    "reset.fish.chances.2.6": {
        "type": "set",
        "variable": "fish.chances",
        "value": 3,
        "next": null
    },
    "reset.fish.chances.2.7": {
        "type": "set",
        "variable": "fish.chances",
        "value": 6,
        "next": null
    },
    "reset.fish.chances.2.8": {
        "type": "set",
        "variable": "fish.chances",
        "value": 6,
        "next": null
    },
    "reset.fish.chances.2.9": {
        "type": "set",
        "variable": "fish.chances",
        "value": 3,
        "next": null
    },
    "reset.fish.chances.2.10": {
        "type": "goto",
        "next": null
    },
    "reset.fish.chances.2.11": {
        "type": "goto",
        "next": null
    },
    "reset.fish.chances.2.12": {
        "type": "goto",
        "next": null
    },
    "reset.fish.chances.2.13": {
        "type": "set",
        "variable": "fish.chances",
        "value": 3,
        "next": null
    },
    "reset.fish.chances.2.14": {
        "type": "set",
        "variable": "fish.chances",
        "value": 6,
        "next": null
    },
    "tick": {
        "type": "subroutine",
        "locals": [],
        "next": "tick.1"
    },
    "tick.1": {
        "type": "add",
        "variable": "hour",
        "value": 1,
        "next": "tick.2"
    },
    "tick.2": {
        "type": "switch",
        "variable": "hour",
        "value": 0,
        "mode": "walk",
        "branches": [
            "tick.2.1",
            "tick.2.2",
            "tick.2.3",
            "tick.2.4",
            "tick.2.5",
            "tick.2.6",
            "tick.2.7",
            "tick.2.8",
            "tick.2.9",
            "tick.2.10",
            "tick.2.11",
            "tick.2.12",
            "tick.2.13",
            "tick.2.14"
        ]
    },
    "tick.2.1": {
        "type": "goto",
        "next": "tick.3"
    },
    "tick.2.2": {
        "type": "add",
        "variable": "thirst",
        "value": 1,
        "next": "tick.3"
    },
    "tick.2.3": {
        "type": "add",
        "variable": "hunger",
        "value": 1,
        "next": "tick.3"
    },
    "tick.2.4": {
        "type": "add",
        "variable": "thirst",
        "value": 1,
        "next": "tick.3"
    },
    "tick.2.5": {
        "type": "goto",
        "next": "tick.3"
    },
    "tick.2.6": {
        "type": "add",
        "variable": "thirst",
        "value": 1,
        "next": "tick.3"
    },
    "tick.2.7": {
        "type": "goto",
        "next": "tick.3"
    },
    "tick.2.8": {
        "type": "goto",
        "next": "tick.3"
    },
    "tick.2.9": {
        "type": "add",
        "variable": "hunger",
        "value": 1,
        "next": "tick.3"
    },
    "tick.2.10": {
        "type": "goto",
        "next": "tick.3"
    },
    "tick.2.11": {
        "type": "add",
        "variable": "thirst",
        "value": 1,
        "next": "tick.3"
    },
    "tick.2.12": {
        "type": "goto",
        "next": "tick.3"
    },
    "tick.2.13": {
        "type": "add",
        "variable": "thirst",
        "value": 1,
        "next": "tick.3"
    },
    "tick.2.14": {
        "type": "add",
        "variable": "hunger",
        "value": 1,
        "next": "tick.3"
    },
    "tick.3": {
        "type": "jge",
        "variable": "hour",
        "value": 14,
        "branch": null,
        "next": "tick.4"
    },
    "tick.4": {
        "type": "set",
        "variable": "hour",
        "value": 0,
        "next": null
    },
    "now": {
        "type": "subroutine",
        "locals": [],
        "next": "now.1"
    },
    "now.1": {
        "type": "text",
        "text": "The hour rolls on, now",
        "lift": " ",
        "drop": " ",
        "next": "now.2"
    },
    "now.2": {
        "type": "call",
        "label": "time",
        "branch": "time",
        "next": "now.3"
    },
    "now.3": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "setting": {
        "type": "subroutine",
        "locals": [],
        "next": "setting.1"
    },
    "setting.1": {
        "type": "switch",
        "variable": "x",
        "value": 0,
        "mode": "hash",
        "branches": [
            "setting.1.1",
            "setting.1.2",
            "setting.1.3"
        ]
    },
    "setting.1.1": {
        "type": "call",
        "label": "forest",
        "branch": "forest",
        "next": null
    },
    "setting.1.2": {
        "type": "call",
        "label": "clearing",
        "branch": "clearing",
        "next": null
    },
    "setting.1.3": {
        "type": "call",
        "label": "river",
        "branch": "river",
        "next": null
    },
    "forest": {
        "type": "subroutine",
        "locals": [],
        "next": "forest.1"
    },
    "forest.1": {
        "type": "set",
        "variable": "river",
        "value": 0,
        "next": "forest.2"
    },
    "forest.2": {
        "type": "switch",
        "variable": "forest.2",
        "value": 0,
        "mode": "rand",
        "branches": [
            "forest.2.1",
            "forest.2.2",
            "forest.2.3"
        ]
    },
    "forest.2.1": {
        "type": "text",
        "text": "You find yourself in a copse of",
        "lift": "",
        "drop": " ",
        "next": "forest.2.1.1"
    },
    "forest.2.1.1": {
        "type": "call",
        "label": "tree",
        "branch": "tree",
        "next": "forest.2.1.2"
    },
    "forest.2.1.2": {
        "type": "text",
        "text": "trees.",
        "lift": " ",
        "drop": " ",
        "next": "forest.3"
    },
    "forest.2.2": {
        "type": "text",
        "text": "You find yourself among the trunks of",
        "lift": " ",
        "drop": " ",
        "next": "forest.2.2.1"
    },
    "forest.2.2.1": {
        "type": "call",
        "label": "tree",
        "branch": "tree",
        "next": "forest.2.2.2"
    },
    "forest.2.2.2": {
        "type": "text",
        "text": "trees.",
        "lift": " ",
        "drop": " ",
        "next": "forest.3"
    },
    "forest.2.3": {
        "type": "text",
        "text": "The trunks of",
        "lift": " ",
        "drop": " ",
        "next": "forest.2.3.1"
    },
    "forest.2.3.1": {
        "type": "call",
        "label": "tree",
        "branch": "tree",
        "next": "forest.2.3.2"
    },
    "forest.2.3.2": {
        "type": "text",
        "text": "surround you.",
        "lift": " ",
        "drop": " ",
        "next": "forest.3"
    },
    "forest.3": {
        "type": "switch",
        "variable": "forest.3",
        "value": 0,
        "mode": "rand",
        "branches": [
            "forest.3.1",
            "forest.3.2",
            "forest.3.3",
            "forest.3.4",
            "forest.3.5",
            "forest.3.6"
        ]
    },
    "forest.3.1": {
        "type": "text",
        "text": "A gentle breeze brings the smell of a rich",
        "lift": "",
        "drop": " ",
        "next": "forest.3.1.1"
    },
    "forest.3.1.1": {
        "type": "switch",
        "variable": "forest.3.1.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "forest.3.1.1.1",
            "forest.3.1.1.2"
        ]
    },
    "forest.3.1.1.1": {
        "type": "text",
        "text": "duff",
        "lift": "",
        "drop": "",
        "next": "forest.3.1.2"
    },
    "forest.3.1.1.2": {
        "type": "text",
        "text": "loam",
        "lift": "",
        "drop": "",
        "next": "forest.3.1.2"
    },
    "forest.3.1.2": {
        "type": "text",
        "text": "all around.",
        "lift": " ",
        "drop": " ",
        "next": "forest.4"
    },
    "forest.3.2": {
        "type": "text",
        "text": "Your passing raises a light dust.",
        "lift": " ",
        "drop": " ",
        "next": "forest.4"
    },
    "forest.3.3": {
        "type": "text",
        "text": "A squirrel scrambles up and around a nearby tree.",
        "lift": " ",
        "drop": " ",
        "next": "forest.4"
    },
    "forest.3.4": {
        "type": "text",
        "text": "A squirrel chirps from a distant branch.",
        "lift": " ",
        "drop": " ",
        "next": "forest.4"
    },
    "forest.3.5": {
        "type": "text",
        "text": "A",
        "lift": " ",
        "drop": " ",
        "next": "forest.3.5.1"
    },
    "forest.3.5.1": {
        "type": "switch",
        "variable": "forest.3.5.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "forest.3.5.1.1",
            "forest.3.5.1.2",
            "forest.3.5.1.3",
            "forest.3.5.1.4",
            "forest.3.5.1.5",
            "forest.3.5.1.6",
            "forest.3.5.1.7"
        ]
    },
    "forest.3.5.1.1": {
        "type": "text",
        "text": "yellow",
        "lift": "",
        "drop": "",
        "next": "forest.3.5.2"
    },
    "forest.3.5.1.2": {
        "type": "text",
        "text": "yellow",
        "lift": "",
        "drop": "",
        "next": "forest.3.5.2"
    },
    "forest.3.5.1.3": {
        "type": "text",
        "text": "orange",
        "lift": "",
        "drop": "",
        "next": "forest.3.5.2"
    },
    "forest.3.5.1.4": {
        "type": "text",
        "text": "orange",
        "lift": "",
        "drop": "",
        "next": "forest.3.5.2"
    },
    "forest.3.5.1.5": {
        "type": "text",
        "text": "red",
        "lift": "",
        "drop": "",
        "next": "forest.3.5.2"
    },
    "forest.3.5.1.6": {
        "type": "text",
        "text": "purple",
        "lift": "",
        "drop": "",
        "next": "forest.3.5.2"
    },
    "forest.3.5.1.7": {
        "type": "text",
        "text": "blue",
        "lift": "",
        "drop": "",
        "next": "forest.3.5.2"
    },
    "forest.3.5.2": {
        "type": "text",
        "text": "butterfly passes over the trail.",
        "lift": " ",
        "drop": " ",
        "next": "forest.4"
    },
    "forest.3.6": {
        "type": "text",
        "text": "Nothing stirs and the wood keeps its secrets.",
        "lift": " ",
        "drop": " ",
        "next": "forest.4"
    },
    "forest.4": {
        "type": "switch",
        "variable": "x",
        "value": 0,
        "mode": "hash",
        "branches": [
            "forest.4.1",
            "forest.4.2",
            "forest.4.3",
            "forest.4.4",
            "forest.4.5",
            "forest.4.6"
        ]
    },
    "forest.4.1": {
        "type": "text",
        "text": "A broken stump stands beside the path.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "forest.4.2": {
        "type": "text",
        "text": "The path passes between two noble trunks.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "forest.4.3": {
        "type": "text",
        "text": "A blackened trunk stands beside the path.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "forest.4.4": {
        "type": "text",
        "text": "Branches overhead crowd the way.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "forest.4.5": {
        "type": "switch",
        "variable": "forest.4.5",
        "value": 0,
        "mode": "rand",
        "branches": [
            "forest.4.5.0.1",
            "forest.4.5.0.2",
            "forest.4.5.0.3"
        ]
    },
    "forest.4.5.0.1": {
        "type": "text",
        "text": "You hear burrowing from a thicket beside the road.",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "forest.4.5.0.2": {
        "type": "text",
        "text": "There is a thicket nearby.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "forest.4.5.0.3": {
        "type": "text",
        "text": "A nearby thicket appears to be the home of some burrowing creature.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "forest.4.6": {
        "type": "text",
        "text": "Saplings adorn the forest floor.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "tree": {
        "type": "subroutine",
        "locals": [],
        "next": "tree.1"
    },
    "tree.1": {
        "type": "switch",
        "variable": "x",
        "value": 0,
        "mode": "hash",
        "branches": [
            "tree.1.1",
            "tree.1.2",
            "tree.1.3",
            "tree.1.4",
            "tree.1.5",
            "tree.1.6",
            "tree.1.7",
            "tree.1.8",
            "tree.1.9",
            "tree.1.10",
            "tree.1.11",
            "tree.1.12",
            "tree.1.13"
        ]
    },
    "tree.1.1": {
        "type": "text",
        "text": "willow",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.2": {
        "type": "text",
        "text": "rowan",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.3": {
        "type": "text",
        "text": "elm",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.4": {
        "type": "text",
        "text": "fir",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.5": {
        "type": "text",
        "text": "cedar",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.6": {
        "type": "text",
        "text": "holly",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.7": {
        "type": "text",
        "text": "hawthorne",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.8": {
        "type": "text",
        "text": "alder",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.9": {
        "type": "text",
        "text": "ash",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.10": {
        "type": "text",
        "text": "oak",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.11": {
        "type": "text",
        "text": "elder",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.12": {
        "type": "text",
        "text": "birch",
        "lift": "",
        "drop": "",
        "next": null
    },
    "tree.1.13": {
        "type": "text",
        "text": "yew",
        "lift": "",
        "drop": "",
        "next": null
    },
    "clearing": {
        "type": "subroutine",
        "locals": [],
        "next": "clearing.1"
    },
    "clearing.1": {
        "type": "set",
        "variable": "river",
        "value": 0,
        "next": "clearing.2"
    },
    "clearing.2": {
        "type": "switch",
        "variable": "clearing.2",
        "value": 0,
        "mode": "rand",
        "branches": [
            "clearing.2.1",
            "clearing.2.2",
            "clearing.2.3"
        ]
    },
    "clearing.2.1": {
        "type": "text",
        "text": "You find yourself in a clearing.",
        "lift": "",
        "drop": " ",
        "next": "clearing.3"
    },
    "clearing.2.2": {
        "type": "text",
        "text": "The forest opens to clearing.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.3"
    },
    "clearing.2.3": {
        "type": "text",
        "text": "The trees clear around you, revealing the sky above.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.3"
    },
    "clearing.3": {
        "type": "switch",
        "variable": "x",
        "value": 0,
        "mode": "hash",
        "branches": [
            "clearing.3.1",
            "clearing.3.2",
            "clearing.3.3",
            "clearing.3.4",
            "clearing.3.5"
        ]
    },
    "clearing.3.1": {
        "type": "text",
        "text": "Green grass bows to the wind.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.4"
    },
    "clearing.3.2": {
        "type": "text",
        "text": "Amber grasses dance in the breeze.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.4"
    },
    "clearing.3.3": {
        "type": "text",
        "text": "A sheet of gray shale tilts out of the earth.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.4"
    },
    "clearing.3.4": {
        "type": "text",
        "text": "The lands all around are pocked with boulders.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.4"
    },
    "clearing.3.5": {
        "type": "text",
        "text": "A shallow gorge hosts a dry creek bed running along the way.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.4"
    },
    "clearing.4": {
        "type": "jgt",
        "variable": "hour",
        "value": 7,
        "branch": "clearing.6",
        "next": "clearing.5"
    },
    "clearing.5": {
        "type": "switch",
        "variable": "clearing.5",
        "value": 0,
        "mode": "rand",
        "branches": [
            "clearing.5.1",
            "clearing.5.2",
            "clearing.5.3",
            "clearing.5.4",
            "clearing.5.5",
            "clearing.5.6"
        ]
    },
    "clearing.5.1": {
        "type": "text",
        "text": "Stars twinkle overhead.",
        "lift": "",
        "drop": " ",
        "next": "clearing.6"
    },
    "clearing.5.2": {
        "type": "text",
        "text": "The night sky is breathtaking.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.6"
    },
    "clearing.5.3": {
        "type": "text",
        "text": "The constellations of the galaxy",
        "lift": " ",
        "drop": " ",
        "next": "clearing.5.3.1"
    },
    "clearing.5.3.1": {
        "type": "switch",
        "variable": "clearing.5.3.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "clearing.5.3.1.1",
            "clearing.5.3.1.2"
        ]
    },
    "clearing.5.3.1.1": {
        "type": "text",
        "text": "mill",
        "lift": "",
        "drop": "",
        "next": "clearing.5.3.2"
    },
    "clearing.5.3.1.2": {
        "type": "text",
        "text": "wheel",
        "lift": "",
        "drop": "",
        "next": "clearing.5.3.2"
    },
    "clearing.5.3.2": {
        "type": "text",
        "text": "about the sky.",
        "lift": " ",
        "drop": " ",
        "next": "clearing.6"
    },
    "clearing.5.4": {
        "type": "goto",
        "next": "clearing.6"
    },
    "clearing.5.5": {
        "type": "goto",
        "next": "clearing.6"
    },
    "clearing.5.6": {
        "type": "goto",
        "next": "clearing.6"
    },
    "clearing.6": {
        "type": "jle",
        "variable": "hour",
        "value": 7,
        "branch": null,
        "next": "clearing.7"
    },
    "clearing.7": {
        "type": "switch",
        "variable": "clearing.7",
        "value": 0,
        "mode": "rand",
        "branches": [
            "clearing.7.1",
            "clearing.7.2",
            "clearing.7.3",
            "clearing.7.4",
            "clearing.7.5",
            "clearing.7.6"
        ]
    },
    "clearing.7.1": {
        "type": "text",
        "text": "The sun",
        "lift": "",
        "drop": " ",
        "next": "clearing.7.1.1"
    },
    "clearing.7.1.1": {
        "type": "switch",
        "variable": "clearing.7.1.1",
        "value": 0,
        "mode": "rand",
        "branches": [
            "clearing.7.1.1.1",
            "clearing.7.1.1.2"
        ]
    },
    "clearing.7.1.1.1": {
        "type": "text",
        "text": "treks across",
        "lift": "",
        "drop": "",
        "next": "clearing.7.1.2"
    },
    "clearing.7.1.1.2": {
        "type": "text",
        "text": "scans",
        "lift": "",
        "drop": "",
        "next": "clearing.7.1.2"
    },
    "clearing.7.1.2": {
        "type": "text",
        "text": "the heavens.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "clearing.7.2": {
        "type": "text",
        "text": "A marmot squeaks on a distant rock.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "clearing.7.3": {
        "type": "text",
        "text": "Buck deer flee the road.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "clearing.7.4": {
        "type": "goto",
        "next": null
    },
    "clearing.7.5": {
        "type": "goto",
        "next": null
    },
    "clearing.7.6": {
        "type": "goto",
        "next": null
    },
    "river": {
        "type": "subroutine",
        "locals": [],
        "next": "river.1"
    },
    "river.1": {
        "type": "set",
        "variable": "river",
        "value": 1,
        "next": "river.2"
    },
    "river.2": {
        "type": "switch",
        "variable": "x",
        "value": 0,
        "mode": "hash",
        "branches": [
            "river.2.1",
            "river.2.2",
            "river.2.3",
            "river.2.4",
            "river.2.5",
            "river.2.6",
            "river.2.7"
        ]
    },
    "river.2.1": {
        "type": "text",
        "text": "A river with fresh water flows through here.",
        "lift": "",
        "drop": " ",
        "next": "river.3"
    },
    "river.2.2": {
        "type": "text",
        "text": "A wide stream flows across the way.",
        "lift": " ",
        "drop": " ",
        "next": "river.3"
    },
    "river.2.3": {
        "type": "text",
        "text": "Waters flow down from the hills to the north, over the trail here.",
        "lift": " ",
        "drop": " ",
        "next": "river.3"
    },
    "river.2.4": {
        "type": "text",
        "text": "A small creek flows from a narrow culvert, over the trail.",
        "lift": " ",
        "drop": " ",
        "next": "river.3"
    },
    "river.2.5": {
        "type": "text",
        "text": "A stout bridge carries the road over a narrow channel of water.",
        "lift": " ",
        "drop": " ",
        "next": "river.3"
    },
    "river.2.6": {
        "type": "text",
        "text": "Stepping stones wade in a shallow stream, guiding your track over the water.",
        "lift": " ",
        "drop": " ",
        "next": "river.3"
    },
    "river.2.7": {
        "type": "text",
        "text": "A cascade of deep, cold pools fall from the hillside to the north and spill through myriad channels through the trail.",
        "lift": " ",
        "drop": " ",
        "next": "river.3"
    },
    "river.3": {
        "type": "switch",
        "variable": "river.3",
        "value": 0,
        "mode": "rand",
        "branches": [
            "river.3.1",
            "river.3.2",
            "river.3.3",
            "river.3.4"
        ]
    },
    "river.3.1": {
        "type": "text",
        "text": "The trickle of water is music to your ears.",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "river.3.2": {
        "type": "text",
        "text": "The promise of refreshment puts your heart and feet at ease.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "river.3.3": {
        "type": "text",
        "text": "The damp reaches your nose and cools your skin.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "river.3.4": {
        "type": "text",
        "text": "Light plays on the water.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "fill": {
        "type": "subroutine",
        "locals": [],
        "next": "fill.1"
    },
    "fill.1": {
        "type": "jz",
        "variable": "empty",
        "branch": null,
        "next": "fill.2"
    },
    "fill.2": {
        "type": "add",
        "variable": "water",
        "value": 1,
        "next": "fill.3"
    },
    "fill.3": {
        "type": "sub",
        "variable": "empty",
        "value": 1,
        "next": "fill"
    },
    "inventory": {
        "type": "subroutine",
        "locals": [],
        "next": "inventory.1"
    },
    "inventory.1": {
        "type": "jnz",
        "variable": "hunger",
        "branch": "inventory.3",
        "next": "inventory.2"
    },
    "inventory.2": {
        "type": "jnz",
        "variable": "thirst",
        "branch": "inventory.3",
        "next": null
    },
    "inventory.3": {
        "type": "text",
        "text": "You have",
        "lift": "",
        "drop": " ",
        "next": "inventory.4"
    },
    "inventory.4": {
        "type": "switch",
        "variable": "water",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.4.1",
            "inventory.4.2"
        ]
    },
    "inventory.4.1": {
        "type": "switch",
        "variable": "deer",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.4.1.0.1",
            "inventory.4.1.0.2"
        ]
    },
    "inventory.4.1.0.1": {
        "type": "switch",
        "variable": "fish",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.4.1.0.1.0.1",
            "inventory.4.1.0.1.0.2"
        ]
    },
    "inventory.4.1.0.1.0.1": {
        "type": "text",
        "text": "no food nor water to spare.",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "inventory.4.1.0.1.0.2": {
        "type": "goto",
        "next": "inventory.5"
    },
    "inventory.4.1.0.2": {
        "type": "goto",
        "next": "inventory.5"
    },
    "inventory.4.2": {
        "type": "goto",
        "next": "inventory.5"
    },
    "inventory.5": {
        "type": "switch",
        "variable": "water",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.5.1",
            "inventory.5.2"
        ]
    },
    "inventory.5.1": {
        "type": "text",
        "text": "no water",
        "lift": "",
        "drop": " ",
        "next": "inventory.5.1.1"
    },
    "inventory.5.1.1": {
        "type": "switch",
        "variable": "deer",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.5.1.1.1",
            "inventory.5.1.1.2"
        ]
    },
    "inventory.5.1.1.1": {
        "type": "switch",
        "variable": "fish",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.5.1.1.1.0.1",
            "inventory.5.1.1.1.0.2"
        ]
    },
    "inventory.5.1.1.1.0.1": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "inventory.6"
    },
    "inventory.5.1.1.1.0.2": {
        "type": "text",
        "text": "but",
        "lift": " ",
        "drop": " ",
        "next": "inventory.6"
    },
    "inventory.5.1.1.2": {
        "type": "text",
        "text": "but",
        "lift": " ",
        "drop": " ",
        "next": "inventory.6"
    },
    "inventory.5.2": {
        "type": "goto",
        "next": "inventory.6"
    },
    "inventory.6": {
        "type": "switch",
        "variable": "water",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.6.1",
            "inventory.6.2"
        ]
    },
    "inventory.6.1": {
        "type": "goto",
        "next": "inventory.7"
    },
    "inventory.6.2": {
        "type": "print",
        "variable": "water",
        "next": "inventory.6.2.1"
    },
    "inventory.6.2.1": {
        "type": "text",
        "text": "bottle",
        "lift": " ",
        "drop": "",
        "next": "inventory.6.2.2"
    },
    "inventory.6.2.2": {
        "type": "switch",
        "variable": "water",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.6.2.2.1",
            "inventory.6.2.2.2",
            "inventory.6.2.2.3"
        ]
    },
    "inventory.6.2.2.1": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "inventory.6.2.3"
    },
    "inventory.6.2.2.2": {
        "type": "goto",
        "next": "inventory.6.2.3"
    },
    "inventory.6.2.2.3": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "inventory.6.2.3"
    },
    "inventory.6.2.3": {
        "type": "text",
        "text": "of water",
        "lift": " ",
        "drop": " ",
        "next": "inventory.6.2.4"
    },
    "inventory.6.2.4": {
        "type": "switch",
        "variable": "deer",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.6.2.4.1",
            "inventory.6.2.4.2"
        ]
    },
    "inventory.6.2.4.1": {
        "type": "switch",
        "variable": "fish",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.6.2.4.1.0.1",
            "inventory.6.2.4.1.0.2"
        ]
    },
    "inventory.6.2.4.1.0.1": {
        "type": "text",
        "text": "and naught to eat.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "inventory.6.2.4.1.0.2": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "inventory.7"
    },
    "inventory.6.2.4.2": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "inventory.7"
    },
    "inventory.7": {
        "type": "switch",
        "variable": "deer",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.7.1",
            "inventory.7.2"
        ]
    },
    "inventory.7.1": {
        "type": "goto",
        "next": "inventory.8"
    },
    "inventory.7.2": {
        "type": "text",
        "text": "smoked venision for",
        "lift": "",
        "drop": " ",
        "next": "inventory.7.2.1"
    },
    "inventory.7.2.1": {
        "type": "print",
        "variable": "deer",
        "next": "inventory.7.2.2"
    },
    "inventory.7.2.2": {
        "type": "text",
        "text": "meal",
        "lift": " ",
        "drop": "",
        "next": "inventory.7.2.3"
    },
    "inventory.7.2.3": {
        "type": "switch",
        "variable": "deer",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.7.2.3.1",
            "inventory.7.2.3.2",
            "inventory.7.2.3.3"
        ]
    },
    "inventory.7.2.3.1": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "inventory.8"
    },
    "inventory.7.2.3.2": {
        "type": "goto",
        "next": "inventory.8"
    },
    "inventory.7.2.3.3": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "inventory.8"
    },
    "inventory.8": {
        "type": "switch",
        "variable": "fish",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.8.1",
            "inventory.8.2"
        ]
    },
    "inventory.8.1": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": null
    },
    "inventory.8.2": {
        "type": "switch",
        "variable": "deer",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.8.2.0.1",
            "inventory.8.2.0.2"
        ]
    },
    "inventory.8.2.0.1": {
        "type": "goto",
        "next": "inventory.9"
    },
    "inventory.8.2.0.2": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "inventory.9"
    },
    "inventory.9": {
        "type": "switch",
        "variable": "fish",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.9.1",
            "inventory.9.2"
        ]
    },
    "inventory.9.1": {
        "type": "goto",
        "next": "inventory.10"
    },
    "inventory.9.2": {
        "type": "text",
        "text": "fish for",
        "lift": "",
        "drop": " ",
        "next": "inventory.9.2.1"
    },
    "inventory.9.2.1": {
        "type": "print",
        "variable": "fish",
        "next": "inventory.9.2.2"
    },
    "inventory.9.2.2": {
        "type": "text",
        "text": "meal",
        "lift": " ",
        "drop": "",
        "next": "inventory.9.2.3"
    },
    "inventory.9.2.3": {
        "type": "switch",
        "variable": "fish",
        "value": 0,
        "mode": "walk",
        "branches": [
            "inventory.9.2.3.1",
            "inventory.9.2.3.2",
            "inventory.9.2.3.3"
        ]
    },
    "inventory.9.2.3.1": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "inventory.10"
    },
    "inventory.9.2.3.2": {
        "type": "goto",
        "next": "inventory.10"
    },
    "inventory.9.2.3.3": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "inventory.10"
    },
    "inventory.10": {
        "type": "text",
        "text": "in reserve.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "time": {
        "type": "subroutine",
        "locals": [],
        "next": "time.1"
    },
    "time.1": {
        "type": "switch",
        "variable": "hour",
        "value": 0,
        "mode": "walk",
        "branches": [
            "time.1.1",
            "time.1.2",
            "time.1.3",
            "time.1.4",
            "time.1.5",
            "time.1.6",
            "time.1.7",
            "time.1.8",
            "time.1.9",
            "time.1.10",
            "time.1.11",
            "time.1.12",
            "time.1.13",
            "time.1.14"
        ]
    },
    "time.1.1": {
        "type": "text",
        "text": "high don, the hour of the rowan",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.2": {
        "type": "text",
        "text": "elm hour, the hour after high don",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.3": {
        "type": "text",
        "text": "fir hour, the hour before high non",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.4": {
        "type": "text",
        "text": "high non, with the sun directly overhead",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.5": {
        "type": "text",
        "text": "cedar hour, the hour after high non",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.6": {
        "type": "text",
        "text": "holly hour, the hour before high dusk",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.7": {
        "type": "text",
        "text": "high dusk, the hour of the hawthorne",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.8": {
        "type": "text",
        "text": "low dusk, the hour of the alder",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.9": {
        "type": "text",
        "text": "ash hour, the hour after low dusk",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.10": {
        "type": "text",
        "text": "oak hour, the hour before low non",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.11": {
        "type": "text",
        "text": "low non, the hour of the elder and the middle of the night",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.12": {
        "type": "text",
        "text": "birch hour, the hour after low non",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.13": {
        "type": "text",
        "text": "yew hour, the hour before low don",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "time.1.14": {
        "type": "text",
        "text": "low don, the hour of the willow",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "status": {
        "type": "subroutine",
        "locals": [],
        "next": "status.1"
    },
    "status.1": {
        "type": "switch",
        "variable": "thirst",
        "value": 0,
        "mode": "walk",
        "branches": [
            "status.1.1",
            "status.1.2",
            "status.1.3",
            "status.1.4",
            "status.1.5"
        ]
    },
    "status.1.1": {
        "type": "switch",
        "variable": "hunger",
        "value": 0,
        "mode": "walk",
        "branches": [
            "status.1.1.0.1",
            "status.1.1.0.2",
            "status.1.1.0.3"
        ]
    },
    "status.1.1.0.1": {
        "type": "goto",
        "next": "status.2"
    },
    "status.1.1.0.2": {
        "type": "goto",
        "next": "status.2"
    },
    "status.1.1.0.3": {
        "type": "text",
        "text": "You",
        "lift": "",
        "drop": " ",
        "next": "status.1.1.0.3.1"
    },
    "status.1.1.0.3.1": {
        "type": "call",
        "label": "hunger",
        "branch": "hunger",
        "next": "status.1.1.0.3.2"
    },
    "status.1.1.0.3.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "status.2"
    },
    "status.1.2": {
        "type": "switch",
        "variable": "hunger",
        "value": 0,
        "mode": "walk",
        "branches": [
            "status.1.2.0.1",
            "status.1.2.0.2",
            "status.1.2.0.3"
        ]
    },
    "status.1.2.0.1": {
        "type": "goto",
        "next": "status.2"
    },
    "status.1.2.0.2": {
        "type": "text",
        "text": "You are thirsty.",
        "lift": "",
        "drop": " ",
        "next": "status.2"
    },
    "status.1.2.0.3": {
        "type": "text",
        "text": "You",
        "lift": " ",
        "drop": " ",
        "next": "status.1.2.0.3.1"
    },
    "status.1.2.0.3.1": {
        "type": "call",
        "label": "hunger",
        "branch": "hunger",
        "next": "status.1.2.0.3.2"
    },
    "status.1.2.0.3.2": {
        "type": "text",
        "text": "and have some thirst.",
        "lift": " ",
        "drop": " ",
        "next": "status.2"
    },
    "status.1.3": {
        "type": "text",
        "text": "You are quite thirsty",
        "lift": " ",
        "drop": "",
        "next": "status.1.3.1"
    },
    "status.1.3.1": {
        "type": "switch",
        "variable": "hunger",
        "value": 0,
        "mode": "walk",
        "branches": [
            "status.1.3.1.1",
            "status.1.3.1.2"
        ]
    },
    "status.1.3.1.1": {
        "type": "goto",
        "next": "status.1.3.2"
    },
    "status.1.3.1.2": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "status.1.3.1.2.1"
    },
    "status.1.3.1.2.1": {
        "type": "call",
        "label": "hunger",
        "branch": "hunger",
        "next": "status.1.3.2"
    },
    "status.1.3.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "status.2"
    },
    "status.1.4": {
        "type": "text",
        "text": "You are parched.",
        "lift": " ",
        "drop": " ",
        "next": "status.2"
    },
    "status.1.5": {
        "type": "text",
        "text": "Your thirst consumes you.",
        "lift": " ",
        "drop": " ",
        "next": "status.2"
    },
    "status.2": {
        "type": "jge",
        "variable": "thirst",
        "value": 5,
        "branch": "status.4",
        "next": "dying"
    },
    "status.4": {
        "type": "jge",
        "variable": "hunger",
        "value": 5,
        "branch": null,
        "next": "dying"
    },
    "dying": {
        "type": "text",
        "text": "You are at death’s door.",
        "lift": " ",
        "drop": " ",
        "next": null
    },
    "hunger": {
        "type": "subroutine",
        "locals": [],
        "next": "hunger.1"
    },
    "hunger.1": {
        "type": "switch",
        "variable": "hunger",
        "value": 0,
        "mode": "walk",
        "branches": [
            "hunger.1.1",
            "hunger.1.2",
            "hunger.1.3",
            "hunger.1.4",
            "hunger.1.5",
            "hunger.1.6",
            "hunger.1.7",
            "hunger.1.8",
            "hunger.1.9"
        ]
    },
    "hunger.1.1": {
        "type": "goto",
        "next": null
    },
    "hunger.1.2": {
        "type": "text",
        "text": "could eat",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "hunger.1.3": {
        "type": "text",
        "text": "have an appetite",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "hunger.1.4": {
        "type": "text",
        "text": "are hungry",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "hunger.1.5": {
        "type": "text",
        "text": "need food badly",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "hunger.1.6": {
        "type": "text",
        "text": "are starving",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "hunger.1.7": {
        "type": "text",
        "text": "have missed more meals than you care to remember",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "hunger.1.8": {
        "type": "text",
        "text": "are emaciated and wasting away",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "hunger.1.9": {
        "type": "text",
        "text": "are likely to die of your hunger soon",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "death": {
        "type": "text",
        "text": "The",
        "lift": " ",
        "drop": " ",
        "next": "death.1"
    },
    "death.1": {
        "type": "print",
        "variable": "x",
        "next": "death.2"
    },
    "death.2": {
        "type": "text",
        "text": "league marker serves as your grave stone.",
        "lift": " ",
        "drop": " ",
        "next": "death.3"
    },
    "death.3": {
        "type": "set",
        "variable": "end",
        "value": 1,
        "next": null
    }
}

}],["point.js","ndim","point.js",{},function (require, exports, module, __filename, __dirname){

// ndim/point.js
// -------------

"use strict";

module.exports = Point;
function Point() {
}

Point.prototype.add = function (that) {
    return this.clone().addThis(that);
};

Point.prototype.sub = function (that) {
    return this.clone().addThis(that);
};

// not dot or cross, just elementwise multiplication
Point.prototype.mul = function (that) {
    return this.clone().mulThis(that);
};

Point.prototype.div = function (that) {
    return this.clone().divThis(that);
};

Point.prototype.scale = function (n) {
    return this.clone().scaleThis(n);
};

Point.prototype.bitwiseAnd = function (n) {
    return this.clone().bitwiseAndThis(n);
};

Point.prototype.bitwiseOr = function (n) {
    return this.clone().bitwiseOrThis(n);
};

Point.prototype.round = function () {
    return this.clone().roundThis();
};

Point.prototype.floor = function () {
    return this.clone().floorThis();
};

Point.prototype.ceil = function () {
    return this.clone().ceilThis();
};

Point.prototype.abs = function () {
    return this.clone().absThis();
};

Point.prototype.min = function () {
    return this.clone().minThis();
};

Point.prototype.max = function () {
    return this.clone().maxThis();
};

}],["point2.js","ndim","point2.js",{"./point":7},function (require, exports, module, __filename, __dirname){

// ndim/point2.js
// --------------

"use strict";

var Point = require("./point");

module.exports = Point2;
function Point2(x, y) {
    this.x = x;
    this.y = y;
}

Point2.prototype = Object.create(Point.prototype);
Point2.prototype.constructor = Point2;

Point2.zero = new Point2(0, 0);
Point2.one = new Point2(1, 1);

Point2.prototype.addThis = function (that) {
    this.x = this.x + that.x;
    this.y = this.y + that.y;
    return this;
};

Point2.prototype.subThis = function (that) {
    this.x = this.x - that.x;
    this.y = this.y - that.y;
    return this;
};

Point2.prototype.mulThis = function (that) {
    this.x = this.x * that.x;
    this.y = this.y * that.y;
    return this;
};

Point2.prototype.divThis = function (that) {
    this.x = this.x / that.x;
    this.y = this.y / that.y;
    return this;
};

Point2.prototype.scaleThis = function (n) {
    this.x = this.x * n;
    this.y = this.y * n;
    return this;
};

Point2.prototype.bitwiseAndThis = function (n) {
    this.x = this.x & n;
    this.y = this.y & n;
    return this;
};

Point2.prototype.bitwiseOrThis = function (n) {
    this.x = this.x | n;
    this.y = this.y | n;
    return this;
};

Point2.prototype.dot = function (that) {
    return this.x * that.x + this.y * that.y;
};

Point2.prototype.roundThis = function () {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
};

Point2.prototype.floorThis = function () {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    return this;
};

Point2.prototype.ceilThis = function () {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    return this;
};

Point2.prototype.absThis = function () {
    this.x = Math.abs(this.x);
    this.y = Math.abs(this.y);
};

Point2.prototype.minThis = function (that) {
    this.x = Math.min(this.x, that.x);
    this.y = Math.min(this.y, that.y);
};

Point2.prototype.maxThis = function (that) {
    this.x = Math.max(this.x, that.x);
    this.y = Math.max(this.y, that.y);
};

Point2.prototype.transpose = function () {
    return this.clone().transposeThis();
};

Point2.prototype.transposeThis = function () {
    var temp = this.x;
    this.x = this.y;
    this.y = temp;
    return this;
};

Point2.prototype.distance = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Point2.prototype.clone = function () {
    return new Point2(this.x, this.y);
};

Point2.prototype.copyFrom = function (that) {
    this.x = that.x;
    this.y = that.y;
    return this;
};

// TODO deprecated for copyFrom
Point2.prototype.become = function (that) {
    this.x = that.x;
    this.y = that.y;
    return this;
};

Point2.prototype.toString = function () {
    return "[x=" + this.x + " y=" + this.y + "]";
};

Point2.prototype.hash = function () {
    return this.x + "," + this.y;
};

Point2.prototype.equals = function (that) {
    return this.x === that.x && this.y === that.y;
};

Point2.prototype.lessThan = function (that) {
    return this.x < that.x && this.y < that.y;
};

}]])("journey.aelf.land/index.js")
