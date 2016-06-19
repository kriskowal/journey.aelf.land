'use strict';
var Animator = require('blick');;
var Engine = require('inkblot/engine');
var Document = require('./document');
var story = require('./journey.json');
var Heavens = require('./heavens');

var scope = {};
scope.window = window;
scope.animator = new Animator();

var style = document.getElementById('style');

var heavens = new Heavens(null, scope);
heavens.setSheet(style.sheet);
var doc = new Document(document.body, redraw);
var engine = new Engine(story, 'start', doc, doc);

doc.clear();
engine.continue();

function redraw() {
    var hour = engine.variables.hour + engine.variables.day * 14;
    var day = (hour + 0.5) / 14;
    heavens.day = day;
    heavens.month = 0.5;
}
redraw();

window.onkeypress = function onkeypress(event) {
    if (engine.variables.end) {
        return;
    }
    var key = event.key || String.fromCharCode(event.charCode);
    var match = /^(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    }
    redraw();
};
