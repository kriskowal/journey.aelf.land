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
