// ==UserScript==
// @name           reddit-inline-image-view
// @namespace      http://github.com/RobSis/
// @updateURL      https://github.com/RobSis/reddit-inline-image-view/blob/master/reddit-inline-image-view.user.js
// @description    Shows directly linked images or imgur images in the current page.
// @version        1.0
// @require        https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// @include        http://www.reddit.com/*
// @exclude        http://www.reddit.com/ads/*
// ==/UserScript==

/*
 * Based on script by /u/drowsap: http://www.reddit.com/r/AskReddit/comments/9ydts/c0f0ltr
 * and drag-resizing code from honestbleep's Reddit Enhancement Suite.
 *
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var imageData = Array();

/*
 * Calculate the drag size for the event.
 *
 * @param e mousedown or mousemove event.
 * @return Size for image resizing.
 */
function getDragSize(e)
{
    return (p = Math.pow)(p(e.clientX - (rc = e.target.getBoundingClientRect()).left, 2) + p(e.clientY - rc.top, 2), .5);
}

/*
 * Get the viewport's vertical size. This should work in most browsers. We'll
 * use this when making images fit the screen by height.
 *
 * @return Viewport size.
 */
function getHeight()
{
    return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
}

/*
 * Function mapped to 'View images' button.
 */
function viewImages(find_string)
{
    var x = $(".content").find(find_string).each(function()
    {
        viewImage($(this));
    });
};

/*
 * Expand the image link specified by given 'a' element.
 * (Add 'img' element after it)
 */
function viewImage(a)
{
    if ((a.hasClass("rexImage")) && (a.next(".rexMorphed").length == 0))
    {
        // add .jpg extension to imgur links without one
        var href=a.attr("href");
        var ext = (href.indexOf('imgur.') >= 0 && href.indexOf('.jpg') < 0 && href.indexOf('.png') < 0 && href.indexOf('.gif') < 0) ? '.jpg' : '';

        var img = document.createElement('img');
        img.setAttribute('class', 'rexMorphed');
        img.setAttribute('style', 'display:block;max-width:500px;');  // TODO: get width of main content div?
        img.setAttribute('src', href+ext);

        imageData[img] = {
            zindex: img.style.zIndex,
            width: img.style.width,
            height: img.style.height,
            position: img.style.position,
            resized: 0,
            resizable: true
        }
        makeImageZoomable(img);
        a.parent().parent().append(img);
    }
}

/*
 * Collapse the image link specified by given 'a' element.
 * (Remove 'img' element after it)
 */
function hideImage(a)
{
    a.parent().parent().find(".rexMorphed").remove();
}

/*
 * Inject expand buttons to any image that can be expanded.
 */
function injectExpandos(find_string, comments)
{
    var x = $(".content").find(find_string).each(function()
    {
        var a=$(this).find("a")
        if (!comments)
        {
            a=$(this).find("a.title")
        }
        var href=a.attr("href");
        var title_text=a.text();
        if ((!a.hasClass("rexMorphed")) && (a.next(".rexMorphed").length == 0) && href &&
                (href.indexOf('imgur.') >= 0 || href.indexOf('.jpeg') >= 0 || href.indexOf('.jpg') >= 0 || href.indexOf('.gif') >= 0 || href.indexOf('.png') >= 0))
        {
            a.addClass('rexImage');
            var theDiv = document.createElement("div");
            theDiv.setAttribute("class", "expando-button collapsed selftext");
            theDiv.addEventListener("click", function()
                {
                    if (theDiv.className.indexOf("collapsed") > 0) {
                        theDiv.setAttribute("class", "expando-button expanded selftext");
                        viewImage(a);
                    } else {
                        theDiv.setAttribute("class", "expando-button collapsed selftext");
                        hideImage(a);
                    }
                });
            a.parent().after(theDiv);
        }
    });
}

/*
 * Set up events for the given img element to make it zoomable via
 * drag to zoom. Most of this is taken directly from honestbleeps's
 * Reddit Enhancement Suite. Event functions are currently written
 * inline. For readability, I may move them. But the code is small
 * enough that I don't yet care.
 *
 * @param imgTag Image element.
 */
function makeImageZoomable(imgTag)
{
    DragData = {};

    imgTag.addEventListener('mousedown', function(e)
    {
        if (e.ctrlKey != 0)
            return true;

        /*
         * This is so we can support the command key on Mac. The combination of OS
         * and browser changes how the key is passed to JavaScript. So we're just
         * going to catch all of them. This means we'll also be catching meta keys
         * for other systems. Oh well! Patches are welcome.
         */
        if (e.metaKey != null)  // Can happen on some platforms
            if (e.metaKey != 0)
                return true;


        if (e.button == 0)
        {
            DragData.width = e.target.width;
            DragData.delta = getDragSize(e);
            DragData.dragging = true;

            e.preventDefault();
        }

    }, true);

    imgTag.addEventListener('contextmenu', function(e)
    {
        if (imageData[e.target].resized != 0)
        {
            imageData[e.target].resized = 0;
            e.target.style.zIndex = imageData[e.target].zIndex;
            e.target.style.maxWidth = e.target.style.width = imageData[e.target].width;
            e.target.style.maxHeight = e.target.style.height = imageData[e.target].height;
            e.target.style.position = imageData[e.target].position;

            // Prevent the context menu from actually appearing.
            e.preventDefault();
            e.returnValue = false;
            e.stopPropagation();
            return false;
        }
        return true;

    }, true);

    imgTag.addEventListener('mousemove', function(e)
    {
        if (DragData.dragging)
        {
            clingdelta = Math.abs(DragData.delta - getDragSize(e));
            if (clingdelta > 5)
            {
                var prevwidth = parseInt(e.target.style.width.replace('px', ''));

                e.target.style.maxWidth = e.target.style.width = Math.floor(((getDragSize(e)) * DragData.width / DragData.delta)) + "px";
                e.target.style.maxHeight = '';
                e.target.style.height = 'auto';
                e.target.style.zIndex = 1000;  // Make sure the image is on top.

                if (e.target.style.position == '')
                {
                    e.target.style.position = 'relative';
                }

                imageData[e.target].resized = (prevwidth - parseInt(e.target.style.width.replace('px', '')));
            }
        }
    }, false);

    imgTag.addEventListener('mouseout', function(e)
    {
        if (DragData.dragging)
        {
            DragData.dragging = false;
            e.preventDefault();
            return false;
        }
        return true;

    }, true);

    imgTag.addEventListener('mouseup', function(e)
    {
        if (DragData.dragging)
        {
            DragData.dragging = false;
            e.preventDefault();
            return false;
        }
        return true;
    }, true);

    imgTag.addEventListener('click', function(e)
    {
        if (e.ctrlKey != 0)
            return true;

        if (e.metaKey != null && e.metaKey != 0)  // Can happen on some platforms
            return true;

        //console.log("Click [click]: "+e.button);
        //console.log("Resize [click]: "+imageData[e.target].resized);

        if (!isNaN(imageData[e.target].resized) && imageData[e.target].resized != 0)
        {
            e.preventDefault();
            return false;
        }
        return true;
    }, true);
}

// Main entry
(function()
{
    injectExpandos("#siteTable div.entry", false);
    injectExpandos(".usertext-body .md", true);

    var header = document.getElementById('header-bottom-left');
    var uls = header.getElementsByTagName('ul');

    for (var i = 0; i < uls.length; i++)
    {
        if (uls[i].className=='tabmenu ')
        {
            var li = document.createElement('li');
            var a = document.createElement('a');
            var text = document.createTextNode('view images');

            a.setAttribute('href','javascript:void(0);');  // just for arrow cursor
            a.addEventListener("click", function() {
                viewImages("#siteTable div.entry p.title a.title");  // topics
                viewImages(".usertext-body div.md p a");  // comment section
            }, false);
            a.appendChild(text);
            li.appendChild(a);
            uls[i].appendChild(li);
        }
    }
    document.addEventListener('dragstart', function() {return false}, false);
})();
