'use strict';
var Engine = require('kni/engine');
var Document = require('./document');

var story = require('./journey.json');
var Animator = require('blick');;
var Heavens = require('./heavens');

var scope = {};
scope.window = window;
scope.animator = new Animator();

var style = document.getElementById('style');

var heavens = new Heavens(null, scope);
heavens.setSheet(style.sheet);

var reset = document.querySelector(".reset");
reset.onclick = function onclick() {
    engine.resume();
    redraw();
};

var body = document.querySelector(".body");
var doc = new Document(body, createPage);
var engine = new Engine({
    story: story,
    render: doc,
    dialog: doc,
    handler: {
        waypoint: function waypointed(waypoint) {
            var json = JSON.stringify(waypoint);
            window.history.pushState(waypoint, '', '#' + btoa(json));
            localStorage.setItem('journey.kni', json);
        },
        ask: function ask() {
            redraw();
        },
        goto: function _goto(label, instruction) {
            console.log(label, instruction.type);
        }
    }
});

function createPage(document) {
    this.frame = document.createElement("div");
    this.frame.classList.add("kni-frame");
    this.frame.style.opacity = 0;

    var A = document.createElement("div");
    A.classList.add("kni-frame-a");
    this.frame.appendChild(A);

    var B = document.createElement("div");
    B.classList.add("kni-frame-b");
    A.appendChild(B);

    var C = document.createElement("div");
    C.classList.add("kni-frame-c");
    B.appendChild(C);

    this.body = document.createElement("div");
    this.body.classList.add("kni-body");
    C.appendChild(this.body);

    this.options = document.createElement("table");
    this.body.appendChild(this.options);
    this.afterBody = this.options;
}

function redraw() {
    var t = engine.global.get('t');
    var day = (t / 60 + 0.5) / 14;
    heavens.day = day;
    heavens.month = 0.5;
}

doc.clear();

var waypoint;
var json;
if (waypoint = window.location.hash || null) {
    try {
        waypoint = atob(waypoint.slice(1));
        waypoint = JSON.parse(waypoint);
    } catch (error) {
        console.error(error);
        waypoint = null;
    }
} else if (json = localStorage.getItem('journey.kni')) {
    try {
        waypoint = JSON.parse(json);
    } catch (error) {
        console.error(error);
        waypoint = null;
    }
    window.history.replaceState(waypoint, '', '#' + btoa(json));
}

window.onpopstate = function onpopstate(event) {
    console.log('> back');
    engine.resume(event.state);
    redraw();
};

engine.resume(waypoint);
redraw();

window.onkeypress = function onkeypress(event) {
    var key = event.code;
    var match = /^Digit(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    } else if (key === 'KeyR') {
        engine.resume();
    }
};

