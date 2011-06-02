/*

The Neon Javascript Library: widget 
A widget library for Neon

Part of the Neon Javascript Library
Copyright (c) 2011, Thomas Rutter
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
	* Redistributions of source code must retain the above copyright
		notice, this list of conditions and the following disclaimer.
	* Redistributions in binary form must reproduce the above copyright
		notice, this list of conditions and the following disclaimer in the
		documentation and/or other materials provided with the distribution.
	* Neither the name of the author nor the names of contributors may be used
		to endorse or promote products derived from this software without
		specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

--

See http://neonjs.com for documentation and examples of use.

*/

/*jslint browser:true,newcap:true,undef:true */
/*global neon:true,Range,opera */

/**
@preserve The Neon Javascript Library: widget
Copyright (c) Thomas Rutter 2011
http://neonjs.com
http://neonjs.com/license
*/

neon.widget = (function() {
	
	var
		canedit = document.body.contentEditable !== undefined,
		gid = 0,
		widgets = {};
	
	var htmlconvert = function(input, strippara, wstopara, acceptclasses) {
	// helper function for normalising HTML
	// can strip paragraph tags or generate paragraph tags
	// from whitespace
		var
			i, j,
			matches, attmatches,
			tagname, last,
			delta = 0, lastdelta, // delta is +1 for moving into a block, -1 for leaving, 
				// 0 for non-block
			spanstack = [],
			closetag = 0, lastclose, // whether there is/was a slash to indicate close tag
			text,	tagcode,
			popen = 0, pinitially, // whether a <p> is open
			output = '',
			stack = [],
			topstack,
			strip,
			attname, attvalue,
			classlist = acceptclasses || [],
			classnames, found,
			parsereg = /([\s\S]*?(?=<[\/\w!])|[\s\S]+)((?:<(\/?)(!|[\w\-]+)((?:[^>'"\-]+|-[^>'"\-]|"[\s\S]*?"|'[\s\S]*?'|--[\s\S]*?--)*)>?)?)/g,
				// 1: text; 2: tag; 3: slash; 4: tagname; 5: tagcontents; 6: endtext;
			attribreg = /([^\s=]+)(?:\s*=\s*(?:(["'])([\s\S]*?)\2|(\S*)))?/g,
				// 1: attname; 2: quotemark; 3: quotecontents; 4: nonquotecontents
			blockreg = /^(?:h[1-6]|ul|ol|dl|menu|dir|pre|hr|blockquote|address|center|div|isindex|fieldset|table|style|(no)?script)$/,
			blockseparator = /^(?:li|tr|div|dd|dt|the|tbo|tfo)/,
			filtertag = /^(script|style|base|html|body|head|title|meta|link|font)$/;

		for (matches = parsereg.exec(input); matches; matches = parsereg.exec(input)) {

			lastdelta = delta;
			last = tagname;
			lastclose = closetag;
			delta = 0;
			strip = false;
			tagname = closetag = null;
			topstack = stack[stack.length-1];
			popen = pinitially =
				lastdelta ? 0 :
				last !== 'p' ? popen :
				lastclose ? 0 : 1;
			if (matches[4]) {
				tagname = matches[4].toLowerCase();
				closetag = matches[3];
				if (blockreg.test(tagname)) {
					if (!closetag) {
						if (tagname !== 'hr' && tagname !== 'isindex') {
							delta = 1;
							stack.push(tagname);
						}
					}
					else if (tagname === topstack) {
						delta = -1;
						stack.pop();
					}
					spanstack = [];
				}
			}
			text = matches[1];

			if (topstack !== 'pre') {
				// process paragraphs
				if (!topstack || topstack === 'blockquote' || topstack === 'center' || popen) {
					// add missing <p> at start
					if (!popen && (/\S/.test(text) ||
						(tagname && !delta && tagname !== '!' && tagname !== 'p'))) {
						popen = 1;
						text = '<p>' + text.replace(/^\s*/, '');
					}
					if (popen) {
						// add missing </p> at end
						if (delta ||
							(!closetag && tagname === 'p') ||
							!tagname ||
							(wstopara && /\n\r?\n\s*$/.test(text))
							) {
							popen = 0;
							text = text.replace(/\s*$/, '') + '</p>';
						}
						// add paragraph breaks within based on whitespace
						if (wstopara) {
							if (last === 'br') {
								text = text.replace(/^\s+/, '');
							}
							text = text.replace(/\s*\n\r?\n\s*(?=\S)/g, '</p><p>')
								.replace(/\s*\n\s*/g, '<br>');
						}
					}
				}
				// remove leading spaces
				if (lastdelta || !last ||
					(!pinitially && (!topstack || topstack === 'blockquote' ||
						topstack === 'center')) ||
					last === 'p' || last === 'br' || blockseparator.test(last)) {
					text = text.replace(/^\s+/, '');
				}
				// remove trailing spaces
				if (delta || !tagname ||
					(!popen && (!topstack || topstack === 'blockquote' ||
						topstack === 'center')) ||
					tagname === 'p' || tagname === 'br' || blockseparator.test(tagname)) {
					text = text.replace(/\s+$/, '');
				}
				// normalise remaining whitespace
				text = text.replace(/\s+/g, ' ');
				// convert < and & where it is not part of tag or entity
				text = strippara ? 
					text.replace(/&lt;(?![\/\w!])/g, '<').replace(/&amp;(?![\w#])/g, '&') :
					text.replace(/<(?![\/\w!])/g, '&lt;').replace(/&(?![\w#])/g, '&amp;');

				// account for added para tags
				text = strippara ? text.replace(/<\/?\w+>/g, "\n") :
					text.replace(/<p>/g, "\n<p>").replace(/<\/p>/g, "</p>\n")
					.replace(/<br>/g, "<br>\n");
				// add newline at end (before tag)
				if (
					delta === 1 || (!popen && tagname === '!') || 
					(!closetag && (tagname === 'p' || blockseparator.test(tagname))) || 
					(closetag && (tagname === 'table' || tagname === 'ul' || tagname === 'ol' || tagname === 'dl'))
					) {
					text += "\n";
				}
				// add newline at start (after last tag)
				if (
					lastdelta === -1 || (!pinitially && last === '!') ||
					(lastclose && last === 'p') ||
					last === 'br') {
					text = "\n" + text;
				}
			}
			
			// strip paragraphs?
			if (strippara && 
				(tagname === 'p' || (tagname === 'br' && (topstack ||
					topstack === 'blockquote' || topstack === 'center'))) &&
				!/\S/.test(matches[5])) {
				strip = true;
			}
			// strip close tags for stripped spans
			else if (closetag && tagname === 'span' &&
				spanstack.length && spanstack.pop()) {
				strip = true;
			}

			// start output
			if (topstack !== 'style' && topstack !== 'script') {
				output += text;
			}

			// process the actual tag
			if (tagname === '!') {
				if (!/^(--)?\[(end)?if/i.test(matches[5])) {
					output += '<!' + matches[5] + '>';
				}
			}
			else if (!strip && tagname && !filtertag.test(tagname)) {
				
				// output tag
				tagcode = "<" + (closetag || '') + (tagname || '');
				if (matches[5].length) {
					// filter tag attributes
					for (attmatches = attribreg.exec(matches[5]); attmatches;
						attmatches = attribreg.exec(matches[5])) {
						attname = attmatches[1].toLowerCase();
						attvalue = attmatches[4] || attmatches[3];
						if (attname === 'class') {
							// allow only classnames specified in the optional argument
							classnames = attvalue.split(/\s+/);
							for (i = classnames.length; i--; ) {
								for (j = classlist.length, found = 0; j-- && !found; ) {
									if (classnames[i] === classlist[j]) {
										found = 1;
									}
								}
								if (!found) {
									classnames.splice(i, 1);
								}
							}
							attvalue = classnames.join(' ');
							if (attvalue) {
								tagcode += " class=\"" + attvalue + "\"";
							}
						}
						else if (attname !== 'id' && attname !== 'for' &&
							attname !== 'style' && attname !== 'align' &&
							(attname !== 'name' || tagname !== 'a') &&
							!/^on/.test(attname)) {
							// allow only approved other attributes
							tagcode += " " + attmatches[0];
						}
					}
				}

				tagcode += ">";

				// remove empty spans
				if (!closetag && tagname === 'span') {
					strip = tagcode === '<span>'; 
					spanstack.push(strip);
				}

				if (!strip) {
					output += tagcode;
				}
			}
		}
		// close last p tag
		if (popen && !strippara && !delta && (tagname !== 'p' || !closetag)) {
			 output += '</p>';
		}

		return output.replace(/^\s+|\s+$/g, '');
	};

	var filterinplace = function(editor, acceptclasses) {
		var
			i, j, k,
			classnames, found,
			classlist = acceptclasses || [],
			els = editor[0].getElementsByTagName('*'),
			element;

		for (i = els.length; i--;) {
			element = neon.select(els[i]);

			element.removeAttribute('style').removeAttribute('id')
				.removeAttribute('for').removeAttribute('align');

			if (element[0].tagName === 'a') {
				element.removeAttribute('name');
			}

			if (element[0].className) {
				classnames = element[0].className.split(/\s+/);
				for (j = classnames.length; j--;) {
					for (k = classlist.length, found = 0; k-- && !found;) {
						if (classnames[j] === classlist[k]) {
							found = 1;
						}
					}
					if (!found) {
						classnames.splice(j, 1);
					}
				}
				element[0].className = classnames.join(' ') || null;
			}

			for (j = element[0].attributes.length; j--;) {
				if (/^on/.test(element[0].attributes[j].name.toLowerCase())) {
					element.removeAttribute(element[0].attributes[j].name);
				}
			}
		}
	};

	var extendobject = function(obj, extension) {
		var
			Constructor = function() {},
			name, newobj;
		Constructor.prototype = obj;
		newobj = new Constructor();
		if (extension) {
			for (name in extension) {
				if (extension.hasOwnProperty(name)) {
					newobj[name] = extension[name];
				}
			}
		}
		return newobj;
	};

	/*******************************************
	 *      FLYOUT - A POP-UP BOX/FLYOUT       *
	 *******************************************/

	widgets.flyout = function(elements, opts) {
	// flyout widget
	// turns the selected element into a hot zone which when clicked
	// or hovered will cause a fly-out (such as a fly-out menu) to appear
	// opts.direction specifies first which side of the hot zone the flyout
	// should appear on out of 'l', 'r', 't', 'b', then optionally another
	// letter specifying the alignment, eg if the first is bottom, whether
	// to fly towards the right from the left ('r') or vice versa.  default
	// is 'br'.
		var
			i,
			myopts = opts || {},
			direction = myopts.direction,
			horiz = /^[lr]/.test(direction),
			fuzz = null,
			wasfocused,
			hosts = elements.insert({span:""})
				.setAttribute('tabindex', '-1')
				.addClass("neon-widget-flyout-host"),
			flyouts = hosts.append({div:""}).addClass("neon-widget-flyout")
				.addClass("neon-widget-flyout-hidden"),
			obj = {};

		var show = function(host) {
			var
				hostpos, flyoutpos,
				windowpos,
				addrect, dim,
				flyout = neon.select(host[0].firstChild.nextSibling)
					.removeClass('neon-widget-flyout-hidden')
					.style('top', horiz ? '0' : '100%')
					.style('left', horiz ? '100%' : '0')
					.style('right', 'auto').style('bottom', 'auto') ;
					
			if (myopts.fade) {
				flyout.style('opacity', flyout.getStyle('opacity') || '0', '1',
					myopts.fade > 1 ? myopts.fade : 200, 'out');
			}

			if (myopts.onfocus) {
				myopts.onfocus.call(host);
			}

			// calculate best position for flyout
			windowpos = neon.select(window).getPosition();
			flyoutpos = flyout.getPosition();
			hostpos = host.getPosition();
			flyout.style('top', 'auto').style('left', 'auto');

			addrect = horiz ? 0 : hostpos.right - hostpos.left;
			dim = flyoutpos.right - flyoutpos.left || 1e4;
			flyout.style(hostpos.left+addrect < dim ? 'left' :
				windowpos.right+addrect-hostpos.right < dim ? 'right' :
				/l/.test(direction) ? 'right' : 'left',
				horiz ? '100%' : '0');

			addrect = !horiz ? 0 : hostpos.bottom - hostpos.top;
			dim = flyoutpos.bottom - flyoutpos.top || 1e3;
			flyout.style(hostpos.top+addrect < dim ? 'top' :
				windowpos.bottom+addrect-hostpos.bottom < dim ? 'bottom' :
				/t/.test(direction) ? 'bottom' : 'top',
				!horiz ? '100%' : '0');
		};

		var onfocusin = function(evt) {
			if (fuzz !== evt.currentTarget) {
				return show(neon.select(evt.currentTarget));
			}
			fuzz = null;
		};

		var onfocusout = function() {
			var
				element = this;
			fuzz = element;
			setTimeout(function() {
				var
					flyout;
				if (fuzz === element) {
					if (myopts.onblur) {
						myopts.onblur.call(neon.select(element));
					}
					flyout = neon.select(element.firstChild.nextSibling);
					if (myopts.fade) {
						flyout.style('opacity', flyout.getStyle('opacity') || '1', '0',
							myopts.fade > 1 ? myopts.fade : 400, 'out', function() {
							flyout.addClass("neon-widget-flyout-hidden");
						});
					}
					else {
						flyout.addClass("neon-widget-flyout-hidden");
					}
					fuzz = null;
				}
			}, 0);
		};

		var onkeydown = function(evt) {
			if (evt.which === 27) {
				obj.blur();
				evt.stopPropagation();
			}
		};

		// closes the flyout (unless it's in hover mode)
		// this works by removing focus from the flyout and its contents
		obj.blur = function() {
			var i, j, tmp;
			for (i = hosts.length; i--;) {
				hosts[i].blur();
				tmp = hosts[i].getElementsByTagName("*");
				for (j = tmp.length; j--;) {
					if (tmp[j].blur) {
						tmp[j].blur();
					}
				}
			}
		};

		// dismantles the flyout, restoring the elements to
		// how they were before the flyout was added
		obj.teardown = function() {
			var i;
			hosts.unwatch(myopts.hover ? "mouseenter" : "focusin", onfocusin)
				.unwatch(myopts.hover ? "mouseleave" : "focusout", onfocusout)
				.unwatch("keydown", onkeydown)
				.unwatch("keypress", onkeydown);
			for (i = hosts.length; i--;) {
				neon.select(hosts[i]).insert(hosts[i].firstChild).remove();
			}
		};

		// returns the flyout(s) itself (a div containing your contents)
		// in a fresh neon object
		obj.flyout = neon.select(flyouts);

		flyouts.append(myopts.contents || []);

		if (myopts.fade) {
			flyouts.style('opacity', '0');
		}

		// add events
	
		hosts.watch(myopts.hover ? "mouseenter" : "focusin", onfocusin);
		hosts.watch(myopts.hover ? "mouseleave" : "focusout", onfocusout);
		hosts.watch("keydown", onkeydown);
		// ie in ietester does not fire keydown events??
		hosts.watch("keypress", onkeydown);

		for (i = elements.length; i--;) {
			wasfocused = document.activeElement;
			neon.select(elements[i].previousSibling.firstChild)
				.insert(elements[i]);
			if (wasfocused === elements[i] ||
				neon.select(elements[i]).contains(wasfocused)) {
				// at least in FF3.5, the previous movement using insert()
				// seems to mess up keyboard focus - we focus() again to workaround
				wasfocused.focus();
				// show because it is already focused
				show(neon.select(elements[i].parentNode));
			}
		}

		return obj;
	};

	neon.styleRule('.neon-widget-flyout',
		'position:absolute;z-index:999;border:1px solid ButtonShadow;padding:1px;background:#fff;min-width:14px;box-shadow:0 4px 10px rgba(0,0,0,0.16)')
		.styleRule('.neon-widget-flyout-hidden',
			'display:none')
		// some ugly-ish hacks for ie6/ie7.  the broken background-image makes transparent areas part of the focus:
		.styleRule('.neon-widget-flyout-host',
			'position:relative;display:inline-block;outline:none;z-index:998;background-image:url(x)');
	
	/*******************************************
	 *       FLYOUTMENU - DROP-DOWN MENU       *
	 *******************************************/

	widgets.flyoutMenu = function(el, opts) {
	// creates a fly-out window with a selectable menu in it.
	// It takes the same options as flyout() with some extras.
	// opt.contents is the contents, and any "a" element in
	// that will turn into a menu option.
	// You can change that with myopts.optiontag (default "a").
		var
			i,
			myopts = opts || {},
			objects = [],
			flyouts = [],
			obj = {},
			teardowns = [];

		var setupmenu = function(el) {
			var
				i,
				obj,
				flyout, host, options,
				currentsel = null;

			var updateselection = function(newval) {
				if (currentsel !== null) {
					neon.select(options[currentsel])
						.removeClass('neon-widget-flyoutMenu-selected');
				}
				currentsel = newval;
				if (currentsel !== null) {
					neon.select(options[currentsel])
						.addClass('neon-widget-flyoutMenu-selected');
				}
			};

			var selectnone = function() {
				updateselection(null);
			};

			var select = function(el) {
				if (myopts.onselect) {
					myopts.onselect(el);
				}
				if (!myopts.remainafterselect) {
					obj.blur();
				}
			};

			var onmouseenter = function(evt) {
				for (i = options.length; i--;) {
					if (options[i] === evt.currentTarget) {
						updateselection(i);
					}
				}
			};

			var onclick = function(evt) {
				onmouseenter.call(this, evt);
				select(neon.select(evt.currentTarget));
			};

			var onblur = function() {
				if (myopts.onblur) {
					myopts.onblur.call(this);
				}
				selectnone();
			};

			var onmouseleave = selectnone;

			var onkeydown = function(evt) {
				// arrow keys
				if (evt.which >= 37 && evt.which <= 40) {
					updateselection(
						evt.which >= 39 ?
							(currentsel === null || currentsel === options.length - 1 ? 0 :
								currentsel + 1) :
							(currentsel ? currentsel - 1 : options.length - 1)
						);
					evt.preventDefault();
					evt.stopPropagation();
				}
				if (evt.which === 32 || evt.which === 13) {
					if (currentsel !== null) {
						select(neon.select(options[currentsel]));
						evt.preventDefault();
						evt.stopPropagation();
					}
				}
			};

			obj = widgets.flyout(el, extendobject(myopts, {onblur:onblur}));
			objects.push(obj);
			flyout = obj.flyout
				.addClass('neon-widget-flyoutMenu');
			flyouts.push(flyout[0]);
			host = neon.select(flyout[0].parentNode);
			options = neon.select(flyout[0].getElementsByTagName(myopts.optiontag || "a"))
				//.setAttribute('tabindex', '-1')
				.addClass('neon-widget-flyoutMenu-item');

			host.watch('keydown', onkeydown);
			flyout.watch('mouseleave', onmouseleave);
			options.watch('mouseenter', onmouseenter);
			options.watch('click', onclick);
			teardowns.push(function() {
				host.unwatch('keydown', onkeydown);
				options.unwatch('mouseenter', onmouseenter)
					.unwatch('click', onclick);
				flyout.unwatch('mouseleave', onmouseleave);
			});
			
		};
			
		for (i = el.length; i--;) {
			setupmenu(neon.select(el[i]));
		}

		obj.blur = function() {
			for (i = objects.length; i--;) {
				objects[i].blur();
			}
		};

		obj.teardown = function() {
			for (i = teardowns.length; i--;) {
				teardowns[i]();
			}
			teardowns = [];
			for (i = objects.length; i--;) {
				objects[i].teardown();
			}
			objects = [];
		};

		obj.flyout = neon.select(flyouts);

		return obj;
	};

	neon.styleRule('.neon-widget-flyoutMenu',
		'background:#fff;color:#000;min-width:8em')
		.styleRule('.neon-widget-flyoutMenu-item',
			'display:block;text-decoration:none;color:MenuText;padding:3px 5px;cursor:default')
		.styleRule('.neon-widget-flyoutMenu-selected',
			'background:Highlight;color:HighlightText')
		.styleRule('.neon-widget-flyoutMenu ul, .neon-widget-flyoutMenu ol, .neon-widget-flyoutMenu li',
			'list-style:none;padding:none;margin:none');

	/*******************************************
	 *       RICHTEXT - RICH TEXT EDITOR       *
	 *******************************************/

	widgets.richtext = function(el, opts) {
		var
			i,
			myopts = opts || {},
			container = el.insert({div:''})
				.addClass('neon-widget-richtext'),
			iconsize = myopts.iconsize || 14,
			rawurl = myopts.imageurl || 'images/neon-widget-richtext.png',
			acceptclasses = myopts.acceptclasses || [],
			imageurl = (/^[^\/?#]+:|^\//).test(rawurl) ?
				rawurl : neon.loaddir+rawurl,
			obj = {},
			teardowns = [];

		var setupeditor = function(container) {
			var
				original = neon.select(container[0].nextSibling),
				toolbar = container.append({div:''})
					.addClass('neon-widget-richtext-toolbar'),
				editor = container.append(canedit ? {div:''} : {textarea:''})
					.addClass('neon-widget-richtext-editor'),
				htmltoolbar = canedit && myopts.htmlmode ? container.append({div:''})
					.style('display', 'none')
					.addClass('neon-widget-richtext-toolbar') : null,
				htmleditor = canedit && myopts.htmlmode ?
					container.append({textarea:''})
					.style('display', 'none')
					.addClass('neon-widget-richtext-editor') : null,
				htmlmode = false,
				source,
				savedselection = null, savedelements,
				hiddenfield, form,
				obj = {},
				updators = [];

			var getrange = function() {
				var
					sel, rng, par;
				if (window.getSelection) {
					sel = window.getSelection();
					if (sel.rangeCount &&
						// only use collapsed selection when focused (opera workaround)
						(!sel.isCollapsed || editor[0] === document.activeElement ||
						editor.contains(document.activeElement))) {

						rng = sel.getRangeAt(0);
						if (rng.commonAncestorContainer === editor[0] ||
							editor.contains(rng.commonAncestorContainer)) {
							return rng;
						}
					}
				}
				else {
					try {
						// in ie, after deleting a table you can get createRange failing
						rng = document.selection.createRange();
						if (rng.parentElement) {
							par = rng.parentElement();
							if (par === editor[0] || editor.contains(par)) {
								return rng;
							}
						}
					}
					catch (e) {}
				}
			};

			var saveselection = function() {
				savedselection = getrange() || savedselection;
			};

			var restoreselection = function() {
				var
					sel;
				if (savedselection && !getrange()) {
					if (window.getSelection) {
						sel = window.getSelection();
						sel.removeAllRanges();
						sel.addRange(savedselection);
						// firefox: can throw exceptions if not focused (even if
						// text selected) opera: loses selection when focus called
						if (!window.opera) {
							editor[0].focus();
						}
					}
					else {
						savedselection.select();
					}
				}
			};

			var saveelements = function(tagname) {
				var
					i,
					elements = editor[0].getElementsByTagName(tagname);
				savedelements = [];
				for (i = elements.length; i--;) {
					savedelements[i] = elements[i];
				}
			};

			var findnewelement = function(tagname) {
				var
					i, j,
					elements = editor[0].getElementsByTagName(tagname);
				for (i = elements.length, j = savedelements.length - 1; i--; j--) {
					if (j < 0 || elements[i] !== savedelements[j]) {
						return elements[i];
					}
				}
			};

			var findinselection = function(tagname) {
				var
					i, len, el,
					rng = savedselection,
					comprng,
					selparent;
				if (rng) {
					selparent = rng.commonAncestorContainer || rng.parentElement();
					for (el = selparent; el !== editor[0]; el = el.parentNode) {
						if (el.tagName && el.tagName.toLowerCase() === tagname) {
							return el;
						}
					}
					if (selparent.getElementsByTagName) {
						el = selparent.getElementsByTagName(tagname);
						comprng = document.createRange ?
							document.createRange() : document.body.createTextRange();
						for (i = 0, len = el.length; i < len; i++) {

							// determine if element el[i] is within the range
							if (document.createRange) { // w3c
								comprng.selectNodeContents(el[i]);
								if (rng.compareBoundaryPoints(Range.END_TO_START, comprng) < 0 &&
									rng.compareBoundaryPoints(Range.START_TO_END, comprng) > 0) {
									return el[i];
								}
							}
							else { // microsoft
								comprng.moveToElementText(el[i]);
								if (rng.compareEndPoints("StartToEnd", comprng) < 0 &&
									rng.compareEndPoints("EndToStart", comprng) > 0) {
									return el[i];
								}
							}
						}
					}
				}
			};

			var updatecontrols = function() {
				var i;
				saveselection();
				for (i = updators.length; i--;) {
					updators[i]();
				}
			};

			var onpaste = function() {
				setTimeout(function() {
					filterinplace(editor, acceptclasses);
				}, 0);
			};

			var updateevent = function(evt) {
				if ((evt.which < 65 && evt.which !== 32) ||
					evt.which > 122) {
					setTimeout(function() {
						updatecontrols();
					}, 0);
				}
			};

			var docommand = function(command, param) {
				var
					foc = document.activeElement;
				restoreselection();
				if (savedselection) {
					try {
						document.execCommand('useCSS', false, true);
					} catch (e) {}
					document.execCommand(command, false, param);
					saveselection();
					updatecontrols();
				}
				if (foc && foc !== editor[0] && foc !== document.activeElement) {
					foc.focus();
				}
			};

			var geticon = function(iconnum) {
				return neon.build({span:""})
					.addClass('neon-widget-richtext-toolbar-icon')
					.style('width', iconsize+"px")
					.style('height', iconsize+"px")
					.style('background', 
						'url('+imageurl+
							') -1px -'+((iconsize+2)*iconnum+1)+'px');
			};

			var getcontrol = function(labeltext, control, postlabel) {
				var
					id = "neon-widget-richtext-id" + (++gid),
					contents = [];
				if (labeltext) {
					contents.push({label:labeltext,$for:id,
						$class:"neon-widget-richtext-dialog-mainlabel"});
				}
				contents.push(control.setAttribute('id', id));
				if (postlabel) {
					contents.push({label:postlabel,$for:id});
				}
				return {div:contents,$class:"neon-widget-richtext-dialog-controlrow"};
			};

			var addbutton = function(toolbar, title, callback) {
				var
					button = toolbar.append({span:null,$title:title})
						.setAttribute('tabindex', '0')
						.addClass('neon-widget-richtext-toolbar-selectable');

				var onclick = function(evt) {
					if (evt.which !== 2 && evt.which !== 3) {
						callback();
					}
				};

				var onkeypress = function(evt) {
					if (evt.which === 13 || evt.which === 32) {
						callback();
						evt.preventDefault();
					}
				};

				button.watch('click', onclick);
				button.watch('keypress', onkeypress);
				teardowns.push(function() {
					button.unwatch('click', onclick)
						.unwatch('keypress', onkeypress);
				});

				return button;
			};

			var addcommandbutton = function(command, iconnum, title) {
				var
					button;

				var onclick = function() {
					docommand(command, null);
				};

				button = addbutton(toolbar, title, onclick);
				button.append(geticon(iconnum));

				updators.push(function() {
					try {
						if (document.queryCommandState(command) &&
							command !== "outdent") { // opera issue
							button.addClass('neon-widget-richtext-active');
						}
						else {
							button.removeClass('neon-widget-richtext-active');
						}
					} catch(e) {}
				});
			};

			var addseparator = function() {
				toolbar.append({span:''})
					.addClass('neon-widget-richtext-toolbar-separator');
			};

			var addhtmlbutton = function() {
				var
					onbutton, offbutton;

				var onclickon = function() {
					var
						pos = editor.getPosition();
					htmltoolbar.style('display', 'block');
					htmleditor.style('display', 'block');
					htmleditor[0].value = htmlconvert(editor[0].innerHTML);
					htmlmode = true;
					htmleditor.style('height', ((pos.bottom - pos.top || 200) + 1) + "px");
					toolbar.style('display', 'none');
					editor.style('display', 'none');
				};

				var onclickoff = function() {
					toolbar.style('display', 'block');
					editor.style('display', 'block');
					editor[0].innerHTML = htmlconvert(htmleditor[0].value);
					htmlmode = false;
					htmltoolbar.style('display', 'none');
					htmleditor.style('display', 'none');
				};

				onbutton = addbutton(toolbar, "Edit as HTML", onclickon);
				onbutton.append("HTML");
				offbutton = addbutton(htmltoolbar, "Leave HTML mode and return to editing with toolbar", onclickoff);
				offbutton.append("Leave HTML mode");
			};

			var addlinkchooser = function() {
				var
					chooser = toolbar.append({span:'',$title:'Web link'})
						.setAttribute('tabindex', '0')
						.addClass('neon-widget-richtext-toolbar-selectable'),
					flyoutform = neon.build({form:null})
						.addClass('neon-widget-richtext-dialog'),
					urlinput = neon.build({input:null,$size:20}),
					newwindowinput = neon.build({input:null,$type:"checkbox",
						$value:"1"}),
					titleinput = neon.build({input:null,$size:20}),
					dialogtitle = neon.build("Create link"),
					submitbutton = neon.build({input:null,$type:"submit",$value:"OK"}),
					cancelbutton = neon.build({button:"Cancel"}),
					editlink = null,
					flyout;

				var onfocus = function() {
					saveselection();
					editlink = neon.select(findinselection('a'));
					urlinput[0].value = editlink.length ?
						editlink[0].getAttribute('href') : '';
					titleinput[0].value = editlink.length ?
						editlink[0].getAttribute('title') : '';
					dialogtitle[0].data = editlink.length ?
						"Modify link" : "Create link";
					newwindowinput[0].checked = editlink.length ?
						/^_(blank|new)$/.test(editlink[0].getAttribute('target')) : false;
					// ie compatibility, can't focus immediately during this event
					setTimeout(function() {
						urlinput[0].select();
					}, 0);
				};

				var cancel = function(evt) {
					flyout.blur();
					evt.preventDefault();
				};

				var onsubmit = function(evt) {
					var
						rng = savedselection;
					if (urlinput[0].value &&
						!/^[a-z][a-z0-9+.\-]*:/i.test(urlinput[0].value)) {
						urlinput[0].value = "http://" + urlinput[0].value;
					}
					if (editlink.length &&
						(rng.collapsed || (rng.text !== undefined && !rng.text))) {
						if (urlinput[0].value) {
							editlink.setAttribute('href', urlinput[0].value);
							if (titleinput[0].value) {
								editlink.setAttribute('title', titleinput[0].value);
							}
							else {
								editlink.removeAttribute('title');
							}
							if (newwindowinput[0].checked) {
								editlink.setAttribute('target', '_blank');
							}
							else {
								editlink.removeAttribute('target');
							}
						}
						else {
							// strip the link: move its contents out of it then delete it
							while (editlink[0].firstChild) {
								editlink.insert(editlink[0].firstChild);
							}
							editlink.remove();
						}
					}
					else {
						docommand('unlink', null);
						if (urlinput[0].value) {
							saveelements('a');
							docommand('createLink', urlinput[0].value);
							editlink = neon.select(findnewelement('a'));
							if (editlink.length) {
								if (titleinput[0].value) {
									editlink.setAttribute('title', titleinput[0].value);
								}
								if (newwindowinput[0].checked) {
									editlink.setAttribute('target', '_blank');
								}
							}
						}
					}
					flyout.blur();
					evt.preventDefault();
				};

				chooser.append(geticon(6));

				flyoutform.append({h2:dialogtitle});
				flyoutform.append(getcontrol("Link address", urlinput));
				flyoutform.append(getcontrol("Hover text", titleinput));
				if (myopts.newwindowlinks) {
					flyoutform.append(getcontrol(null, newwindowinput,
						"Open in new window"));
				}
				flyoutform.append({div:[submitbutton, ' ', cancelbutton]})
					.addClass('neon-widget-richtext-dialog-buttonrow');

				flyoutform.watch('submit', onsubmit);
				cancelbutton.watch('click', cancel);
				teardowns.push(function() {
					flyoutform.unwatch('submit', onsubmit);
					cancelbutton.unwatch('click', cancel);
				});

				flyout = widgets.flyout(chooser, extendobject(myopts, {
					contents: flyoutform,
					onfocus: onfocus,
					onblur: restoreselection
					}));

				updators.push(function() {
					if (findinselection('a')) {
						chooser.addClass('neon-widget-richtext-active');
					}
					else {
						chooser.removeClass('neon-widget-richtext-active');
					}
				});
			};

			var addtablechooser = function() {
				var
					chooser = toolbar.append({span:'',$title:'Table'})
						.setAttribute('tabindex', '0')
						.addClass('neon-widget-richtext-toolbar-selectable'),
					flyoutform = neon.build({form:null})
						.addClass('neon-widget-richtext-dialog'),
					columnsinput = neon.build({input:null,$size:6,$value:"2"}),
					rowsinput = neon.build({input:null,$size:6,$value:"6"}),
					dialogtitle = neon.build("Insert table"),
					submitbutton = neon.build({input:null,$type:"submit",
						$value:"OK"}),
					cancelbutton = neon.build({button:"Cancel"}),
					flyout;

				var cancel = function(evt) {
					flyout.blur();
					evt.preventDefault();
				};

				var onfocus = function() {
					setTimeout(function() {
						columnsinput[0].select();
					}, 0);
				};

				var onsubmit = function(evt) {
					var
						i, j, temphr, table, tbody, row;
					if (columnsinput[0].value > 0 && rowsinput[0].value > 0) {
						saveelements('hr');
						docommand('insertHorizontalRule', null);
						temphr = neon.select(findnewelement('hr'));
						if (temphr.length) {
							table = neon.build({table:null});
							tbody = table.append({tbody:null});
							for (i = +rowsinput[0].value; i--;) {
								row = tbody.append({tr:null});
								for (j = +columnsinput[0].value; j--;) {
									row.append({td:null});
								}
							}
							temphr.insert(table);
							temphr.remove();
						}
					}
					flyout.blur();
					evt.preventDefault();
				};

				chooser.append(geticon(8));

				flyoutform.append({h2:dialogtitle});
				flyoutform.append(getcontrol("Columns", columnsinput));
				flyoutform.append(getcontrol("Rows", rowsinput));
				flyoutform.append({div:[submitbutton,' ',cancelbutton]})
					.addClass('neon-widget-richtext-dialog-buttonrow');

				flyoutform.watch('submit', onsubmit);
				cancelbutton.watch('click', cancel);
				teardowns.push(function() {
					flyoutform.unwatch('submit', onsubmit);
					cancelbutton.unwatch('click', cancel);
				});

				flyout = widgets.flyout(chooser, extendobject(myopts, {
					contents: flyoutform,
					onfocus: onfocus,
					onblur: restoreselection
					}));

				updators.push(function() {
					if (findinselection('table')) {
						chooser.addClass('neon-widget-richtext-active');
					}
					else {
						chooser.removeClass('neon-widget-richtext-active');
					}
				});
			};

			var addimagechooser = function() {
				var
					chooser = toolbar.append({span:'',$title:'Image'})
						.setAttribute('tabindex', '0')
						.addClass('neon-widget-richtext-toolbar-selectable'),
					flyoutform = neon.build({form:null})
						.addClass('neon-widget-richtext-dialog'),
					urlinput = neon.build({input:null,$size:20}),
					altinput = neon.build({input:null,$size:20}),
					dialogtitle = neon.build("Insert image"),
					submitbutton = neon.build({input:null,$type:"submit",
						$value:"OK"}),
					cancelbutton = neon.build({button:"Cancel"}),
					editimage = null,
					flyout;

				var cancel = function(evt) {
					flyout.blur();
					evt.preventDefault();
				};

				var onfocus = function() {
					saveselection();
					editimage = neon.select(findinselection('img'));
					urlinput[0].value = editimage.length ?
						editimage[0].getAttribute('src') : '';
					altinput[0].value = editimage.length ?
						editimage[0].getAttribute('alt') : '';
					dialogtitle[0].data = editimage.length ?
						"Modify image" : "Insert image";
					// ie compatibility, can't focus immediately during this event
					setTimeout(function() {
						urlinput[0].select();
					}, 0);
				};

				var onsubmit = function(evt) {
					if (urlinput[0].value &&
						!/^[a-z][a-z0-9+.\-]*:/i.test(urlinput[0].value)) {
						urlinput[0].value = "http://" + urlinput[0].value;
					}
					if (editimage.length) {
						if (urlinput[0].value) {
							editimage.setAttribute('src', urlinput[0].value);
							if (altinput[0].value) {
								editimage.setAttribute('alt', altinput[0].value);
							}
							else {
								editimage.removeAttribute('alt');
							}
						}
						else {
							// remove the image
							editimage.remove();
						}
					}
					else {
						if (urlinput[0].value) {
							saveelements('img');
							docommand('insertImage', urlinput[0].value);
							editimage = neon.select(findnewelement('img'));
							if (editimage.length) {
								if (altinput[0].value) {
									editimage.setAttribute('alt', altinput[0].value);
								}
							}
						}
					}
					flyout.blur();
					evt.preventDefault();
				};

				chooser.append(geticon(7));

				flyoutform.append({h2:dialogtitle});
				flyoutform.append(getcontrol("Image URL", urlinput));
				flyoutform.append(getcontrol("Alternate text", altinput));
				flyoutform.append({div:[submitbutton,' ',cancelbutton]})
					.addClass('neon-widget-richtext-dialog-buttonrow');

				flyoutform.watch('submit', onsubmit);
				cancelbutton.watch('click', cancel);
				teardowns.push(function() {
					flyoutform.unwatch('submit', onsubmit);
					cancelbutton.unwatch('click', cancel);
				});

				flyout = widgets.flyout(chooser, extendobject(myopts, {
					contents: flyoutform,
					onfocus: onfocus,
					onblur: restoreselection
					}));

				updators.push(function() {
					if (findinselection('img')) {
						chooser.addClass('neon-widget-richtext-active');
					}
					else {
						chooser.removeClass('neon-widget-richtext-active');
					}
				});
			};

			var addstylechooser = function() {
				var
					i,
					chooser = toolbar.append({span:'',$title:'Paragraph style'})
						.setAttribute('tabindex', '0')
						.addClass('neon-widget-richtext-toolbar-selectable'),
					text = chooser.append({span:"Paragraph style"})
						.addClass('neon-widget-richtext-toolbar-label'),
					selections = neon.build({div:""})
						.addClass('neon-widget-richtext-toolbar-stylechooser'),
					menu;

				var onselect = function(el) {
					docommand('formatblock', '<'+el[0].parentNode.tagName+'>');
				};

				chooser.append(geticon(9)) // drop arrow icon
					.addClass('neon-widget-richtext-toolbar-sideicon');

				selections.append({p:{a:"Normal"}});
				selections.append({h1:{a:"Heading 1"}});
				selections.append({h2:{a:"Heading 2"}});
				selections.append({h3:{a:"Heading 3"}});
				selections.append({h4:{a:"Heading 4"}});
				selections.append({pre:{a:"Fixed-width"}});

				for (i = selections[0].childNodes.length; i--;) {
					neon.select(selections[0].childNodes[i])
						.addClass("neon-widget-richtext-toolbar-styleelement");
				}
				
				menu = widgets.flyoutMenu(chooser, extendobject(myopts, {
					contents: selections,
					onselect: onselect,
					onblur: restoreselection
					}));

				teardowns.push(function() {
					menu.teardown();
				});

				updators.push(function() {
					var
						value, part;
					try {
						value = document.queryCommandValue('formatblock');
						part = /^(?:h|Heading )(\d)$/.exec(value);
						text.empty().append(
							part ? 'Heading '+part[1] :
							value === 'pre' || value === 'Formatted' ? 'Fixed-width' :
							'Normal'
						);
					} catch(e) {}
				});
				
			};

			obj.getvalue = function() {
				return htmlconvert(
					htmlmode ? htmleditor[0].value :
					canedit ? editor[0].innerHTML :
					editor[0].value, 0, !htmlmode && !canedit);
			};

			obj.setvalue = function(value) {
				if (htmlmode) {
					htmleditor[0].value = htmlconvert(value);
				}
				else if (canedit) {
					editor[0].innerHTML = htmlconvert(value);
				}
				else {
					editor[0].value = htmlconvert(value, 1);
				}
			};

			var updatehiddenfield = function() {
				hiddenfield[0].value = obj.getvalue();
			};

			teardowns.push(function() {
				container.remove();
			});

			// now populate the toolbar

			if (!canedit) {
				toolbar.append({div:"HTML tags accepted"})
					.addClass('neon-widget-richtext-toolbar-altnotice');
			}
			else {
				if (myopts.stylechooser) {
					addstylechooser();
					addseparator();
				}
				addcommandbutton('bold', 0, 'Bold');
				addcommandbutton('italic', 1, 'Italic');
				if (myopts.listbuttons || myopts.listbuttons === undefined) {
					addseparator();
					addcommandbutton('insertunorderedlist', 2, 'Bulleted list');
					addcommandbutton('insertorderedlist', 3, 'Numbered list');
				}
				if (myopts.indentbuttons || myopts.indentbuttons === undefined) {
					addseparator();
					addcommandbutton('outdent', 4, 'Decrease indent');
					addcommandbutton('indent', 5, 'Increase indent');
				}
				if (myopts.linkchooser || myopts.linkchooser === undefined ||
					myopts.imagechooser || myopts.tablecreator) {
					addseparator();
					if (myopts.linkchooser || myopts.linkchooser === undefined) {
						addlinkchooser();
					}
					if (myopts.imagechooser) {
						addimagechooser();
					}
					if (myopts.tablechooser) {
						addtablechooser();
					}
				}

				if (myopts.htmlmode) {
					addseparator();
					addhtmlbutton();
				}

				// strangely in IE6 (and 7?) the following capital E is important
				editor.setAttribute('contentEditable', 'true');
				editor.watch('keyup', updateevent);
				editor.watch('mouseup', updateevent);
				editor.watch('mouseleave', updateevent);
				editor.watch('paste', onpaste);
				toolbar.watch('mousedown', saveselection);

				teardowns.push(function() {
					editor.unwatch('keyup', updateevent)
						.unwatch('mouseup', updateevent)
						.unwatch('mouseleave', updateevent)
						.unwatch('paste', onpaste);
					toolbar.unwatch('mousedown', saveselection);
				});
			}

			if (original[0].tagName.toLowerCase() === 'textarea') {
				source = original[0].value;
				hiddenfield = container.append({
					input:'',
					$type:'hidden',
					$name:original[0].name,
					$value:el[0].value
					});
				form = neon.select(hiddenfield[0].form);
				form.watch('submit', updatehiddenfield);
				teardowns.push(function() {
					original[0].value = obj.getvalue();
					hiddenfield.remove();
					form.unwatch('submit', updatehiddenfield);
				});
			}
			else {
				source = original[0].innerHTML;
				teardowns.push(function() {
					original[0].innerHTML = obj.getvalue();
				});
			}

			original.remove();
			teardowns.push(function() {
				container.insert(original);
			});

			editor[0][canedit ? 'innerHTML' : 'value'] =
				htmlconvert(source, !canedit, 0);

			updatecontrols();

			return obj;
		};
		
		for (i = container.length; i--;) {
			obj = setupeditor(neon.select(container[i]));
		}

		obj.teardown = function() {
			var i;
			for (i = teardowns.length; i--;) {
				teardowns[i]();
			}
			teardowns = [];
		};

		return obj;
	};

	neon.styleRule('.neon-widget-richtext',
		'border:1px solid ButtonShadow;width:auto;padding:1px;background:#fff;color:#000')
		.styleRule('.neon-widget-richtext-toolbar',
			'font:12px sans-serif;margin:0 0 1px 0;background:#f9f6f3')
		// button text needs to be re-set in FF (at least)
		.styleRule('.neon-widget-richtext-toolbar-selectable',
			'display:inline-block;padding:5px;cursor:default')
		.styleRule('.neon-widget-richtext-toolbar-selectable:hover',
			'padding:4px;border:1px solid ButtonShadow')
		.styleRule('.neon-widget-richtext-toolbar-selectable:focus',
			'outline:1px dotted ButtonShadow')
		.styleRule('.neon-widget-richtext-active',
			'padding:4px;border:1px solid ButtonShadow;background:#e0e4e6')
		.styleRule('.neon-widget-richtext-toolbar-styleelement',
			'margin:0;padding:0;white-space:nowrap')
		.styleRule('.neon-widget-richtext-toolbar-separator',
			'display:inline-block;width:5px')
		.styleRule('.neon-widget-richtext-editor',
			'max-height:27em')
		.styleRule('.neon-widget-richtext-editor td, .neon-widget-richtext-editor th'+
			'.neon-widget-richtext-editor div, .neon-widget-richtext-editor table, '+
			'.neon-widget-richtext-editor img, .neon-widget-richtext-editor object',
			'min-height:1em;min-width:1em;outline:1px dotted ButtonShadow')
		.styleRule('.neon-widget-richtext-editor td, .neon-widget-richtext-editor th',
			'height: 1.25em')
	// outline:0 prevents dotted line in firefox
	// position:relative is in case people paste in absolute positioned elements
	// position:relative undone since it causes table editors in wrong place
		.styleRule('div.neon-widget-richtext-editor',
			'cursor:text;padding:1px 0 1px 2px;outline:0;min-height:5em;overflow:auto')
	// min-height needed as textareas don't auto-expand
		.styleRule('textarea.neon-widget-richtext-editor',
			'width:100%;border:0;padding:0;margin:0;background:#fff;color:#000;font:inherit;min-height:14em')
		.styleRule('.neon-widget-richtext-toolbar-altnotice',
			'padding:5px;text-align:right')
		.styleRule('.neon-widget-richtext-dialog',
			'background:#f9f6f3;padding:5px;margin:0')
		.styleRule('.neon-widget-richtext-dialog h2',
			'white-space:nowrap;margin:0 0 5px;font-size:100%')
		.styleRule('.neon-widget-richtext-dialog-controlrow',
			'white-space:nowrap;margin-left:8em;margin-bottom:5px')
		.styleRule('.neon-widget-richtext-dialog-controlrow *',
			'vertical-align:middle')
		.styleRule('.neon-widget-richtext-dialog-mainlabel',
			'display:inline-block;margin-left:-8em;width:7.5em;margin-right:0.5em;overflow:hidden')
		.styleRule('.neon-widget-richtext-dialog-buttonrow',
			'white-space:nowrap;text-align:right;margin-top:9px')
		.styleRule('.neon-widget-richtext-toolbar-icon',
			'display:inline-block;vertical-align:middle')
		.styleRule('.neon-widget-richtext-toolbar-sideicon',
			'margin-left:4px')
		.styleRule('.neon-widget-richtext-toolbar-label',
			'vertical-align:middle');

	return function(func, opts) {
		if (widgets.hasOwnProperty(func)) {
			return widgets[func](this, opts);
		}
	};

}());
