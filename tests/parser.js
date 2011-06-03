module("parser")

test("Basic requirements", function() {
	expect(2);
	ok(jQuery, "jQuery");
	ok($, "$");
});

/*

The following tests are not cross-browser safe.  Firefox changes the single quotes to doubles quotes.

test("Empty string code", function() {
	conditerateOutput("", ["return '';"]);
});

test("Single variable code", function() {
	conditerateOutput("{@ foo @}", ["return vars.hasOwnProperty('foo') ? vars['foo'] : '';"]);
});

test("Single space code", function() {
	conditerateOutput(" ", ["return ' ';"]);
});

test("Check for existance code", function() {
	conditerateOutput("{@ foo ? 'foo found' @}", ["return $.conditerator(vars, vars.hasOwnProperty('foo') ? vars['foo'] : '', '', 'foo found', '', '');"]);
});

test("Value or else code", function() {
	conditerateOutput("{@ foo ?: 'foo not found' @}", ["return $.conditerator(vars, vars.hasOwnProperty('foo') ? vars['foo'] : '', '', vars.hasOwnProperty('foo') ? vars['foo'] : '', '', 'foo not found');"]);
});
*/

test("Empty string output", function() {
	conditerateOutput("", "", {});
});

test("Single space output", function() {
	conditerateOutput(" ", " ", {});
});

test("Single variable output", function() {
	conditerateOutput("{@ foo @}", "bar", {"foo": "bar"});
});

test("Check for existance output", function() {
	conditerateOutput("{@ foo ? 'foo found' @}", "foo found", {"foo": "bar"});
	conditerateOutput("{@ foo ? 'foo found' @}", "", {});
});

test("Value or else output", function() {
	conditerateOutput("{@ foo ?: 'foo not found' @}", "foo not found", {});
	conditerateOutput("{@ foo ?: 'foo not found' @}", "bar", {"foo": "bar"});
});

test("Tilde strings", function () {
	conditerateOutput("{@ 'foo' ? ~{@ $1 @} => '{@ $ @}'~ @}", "1 => 'foo'", {});
});

test("Backtick strings", function () {
	conditerateOutput("{@ 'foo' ? `{@ $1 @} => '{@ $ @}'` @}", "1 => 'foo'", {});
});

test("All strings", function () {
	conditerateOutput("{@ name ? 'Your name is \\'{@ name @}\\'' @}", "", {});
	conditerateOutput('{@ name ? "Your name is \\"{@ name @}\\"" @}', "", {});
	conditerateOutput("{@ name ? `Your name is '{@ name @}'` @}", "", {});
	conditerateOutput("{@ name ? ~Your name is '{@ name @}'~ @}", "", {});
});

test("User list", function() {
	conditerateOutput("{@ users ? '<ol>' '<li>{@ name @}</li>' '</ol>' : 'no users found' @}", "<ol><li>doug</li><li>jeff</li></ol>", {"users": [{"name": "doug"}, {"name": "jeff"}]});
});

test("User list with birthyears", function() {
	conditerateOutput("{@ users ? '<ol>' '<li>{@ name @} was born in {@ year @}</li>' '</ol>' : 'no users found' @}", "<ol><li>doug was born in 1971</li><li>jeff was born in 1965</li></ol>", {"users": [{"name": "doug", "year": 1971}, {"name": "jeff", "year": 1965}]});
});

function ucfirst(s) {
	return s.charAt(0).toUpperCase() + s.substr(1);
}

test("ucfirst", function() {
	conditerateOutput("{@ ucfirst('foo') @}", "Foo", {});
});

test("User list with ucfirst", function() {
	conditerateOutput("{@ users ? '<ol>' '<li>{@ ucfirst(name) @}</li>' '</ol>' : 'no users found' @}", "<ol><li>Doug</li><li>Jeff</li></ol>", {"users": [{"name": "doug"}, {"name": "jeff"}]});
});

test("User list with formating", function() {
	conditerateOutput("{@ users ? '<ol>' '<li>{@ name ? 'His name is {@ ucfirst($) @}' @}</li>' '</ol>' : 'no users found' @}", "<ol><li>His name is Doug</li><li>His name is Jeff</li></ol>", {"users": [{"name": "doug"}, {"name": "jeff"}]});
});

test("Single quoted string", function() {
	conditerateOutput("'test'", "'test'", {});
});

test("Double quoted string", function() {
	conditerateOutput('"test"', '"test"', {});
});

function range(start, end) {
	var i, results = [];
	for (i = start; i <= end; i++) {
		results.push(i);
	}
	return results;
}

test("Single quoted string with variable", function() {
	conditerateOutput("{@ range(1,5) ? \"'{@ $ @}'\" @}", "'1''2''3''4''5'", {});
});

test("Double quoted string with variable", function() {
	conditerateOutput('{@ range(1,5) ? \'"{@ $ @}"\' @}', '"1""2""3""4""5"', {});
});

test("Escaped single quote", function () {
	conditerateOutput("\\\\'test\\\\'", "\\'test\\'", {});
});

var vars = {
	users: [
		{
			name: "Doug",
			isAdmin: true
		},
		{
			name: "Jeff",
			isAdmin: false
		},
		{
			name: "Greg",
			isAdmin: true
		},
	]
};
test("Escaped single quote in loop", function () {
	conditerateOutput("{@ users ? '<ol>' `<li>{@ name @}{@ isAdmin ? ' (admin)' @}</li>` '</ol>' @}", "<ol><li>Doug (admin)</li><li>Jeff</li><li>Greg (admin)</li></ol>", vars);
});

var errors = {
	errors: [
		"Invalid birthdate entered",
		"Please check that you accept the terms of use"
	]
};
test("Table with escaped vars", function () {
	conditerateOutput("{@ errors ? `<table class='error'>` `<tr><td class='{@ $odd ? 'odd' : 'even' @}'>{@ $ @}</td></tr>` '</table>' @}", "<table class='error'><tr><td class='even'>Invalid birthdate entered</td></tr><tr><td class='odd'>Please check that you accept the terms of use</td></tr></table>", errors);
});

test("Even/odd classes", function () {
	conditerateOutput("{@ range(0, 3) ? ' {@ $class @} ' @}", " even  odd  even  odd ", {});
});

