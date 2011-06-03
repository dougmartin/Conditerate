Conditerate
===========
 
Conditerate is a jQuery plugin that compiles and executes "conditerator" (conditional iterator) templates.  Conditerator templates provide a succinct syntax for testing and looping on arrays to generate output.

The plugin exposes the following functions:

1. $(selector).conditerate(template, vars)
2. $.conditerate(template, vars)
3. $.conditerator(vars, condition, prefix, loop, suffix, forElse)

The first function is the one most commonly used.  The other functions are used internally but can be used externally if you are feeling adventureous.

Syntax
------

Conditerators are multiple item expressions in one of the following forms, where items in [] are optional:
 
	{@ condition [?: else] @}
	{@ condition [? [loop] [: else]] @}
	{@ condition [? [prefix] [loop] [: else]] @}
	{@ condition [? [prefix] [loop] [suffix] [: else]] @}
	
Each item in the expression can itself be a conditerator, allowing for nested behavior.
	
In the first form the condition is evaluated and if it is not "falsy" (false, zero, the empty string, null, undefined or NaN) then its value is output, otherwise the value of the else expression is output.  Here is an example:
	
	$("#hello").conditerate("{@ name @}", {name: 'Doug'}) => Doug
	$("#hello").conditerate("{@ name ?: 'Who are you?' @}") => Who are you?

The rest of the forms follow the same basic form.  The condition is evaluated and if it not falsy then the loop expression is evaluated once for non-arrays and once per item for arrays.  The prefix and/or suffix expressions are evaluated only once in either case if they exist.  Here are some examples:
	
	$("#welcome").conditerate("{@ user ? 'Welcome {@ name @}!' : 'Please login...' @}", {user: {name: 'Doug', isAdmin: true}})
	
	=> Welcome Doug!
	
	----------------------------
	
	$.getJSON("http://twitter.com/status/user_timeline/dougmartin.json?count=2&callback=?", function (data) {
		$("#twitter").conditerate("{@ tweets ? '<ol>' '<li>{@ text @}</li>' '</ol>' @}", {tweets: data});
	});
	
	=>
	
	<div id="twitter">
		<ol>
			<li>First tweet here...</li>
			<li>And the second tweet here...</li>
		</ol>
	</div>

Special String Delimiters
-------------------------
	
To avoid having to double escape single or double quote string delimiters in the template string there are two extra string delimiters available: the tilde and the backtick.  So within a template these are all valid strings:

	$("#test").conditerate("{@ name ? 'Your name is \\'{@ name @}\\'' @}");
	$("#test").conditerate('{@ name ? "Your name is \\"{@ name @}\\"" @}');
	$("#test").conditerate("{@ name ? `Your name is '{@ name @}'` @}");
	$("#test").conditerate("{@ name ? ~Your name is '{@ name @}'~ @}");
	
As you can see the tilde and backtick strings make the template much cleaner.

Special Loop Variables
----------------------

Each time the loop expression is evaluated a number of special variables are automatically included. Each special variable is prefixed with the dollar sign:

1. $ - value of the loop
2. $0 - zero-based index of the loop
3. $1 - one-based index of the loop
4. $even - true if loop index is even
5. $odd - true if loop index is odd
6. $class - "even" if index is even, "odd" if index is odd
7. $first - true on the first iteration of the loop
8. $last- true on the last iteration of the loop

More Examples
-------------
	
	var vars = {
		errors: [
			"Invalid birthdate entered",
			"Please check that you accept the terms of use"
		]
	};
	
	$("#top").conditerate("{@ errors ? `<table class='error'>` `<tr><td class='{@ $odd ? 'odd' : 'even' @}'>{@ $ @}</td></tr>` '</table>' @}", vars) 
	
	*OR*
	
	$("#top").conditerate("{@ errors ? `<table class='error'>` `<tr><td class='{@ $class @}'>{@ $ @}</td></tr>` '</table>' @}", vars) 
	
	=> 
	
	<div id="top">
		<table class='error'>
			<tr>
				<td class='odd'>Invalid birthdate entered</td>
			</tr>
			<tr>
				<td class='even'>Please check that you accept the terms of use</td>
			</tr>
		</table>
	</div>
	
	-----------------------
	
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
	
	$("#userlist").conditerate("{@ users ? '<ol>' '<li>{@ name @}{@ isAdmin ? \" (admin)\" @}</li>' '</ol>' @}", vars) 
	
	=> 
	
	<div id="userlist">
		<ol>
			<li>Doug (admin)</li>
			<li>Jeff</li>
			<li>Greg (admin)</li>
		</ol>
	</div>
	
