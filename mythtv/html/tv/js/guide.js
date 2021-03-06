
function getChild(element, name)
{
    if (!isValidObject(element))
        return;

    var children = element.children;
    for (var i = 0; i < children.length; i++)
    {
        if (children[i].name == name)
            return children[i];
    }
}

function getChildValue(element, name)
{
    var child = getChild(element, name);
    if (isValidObject(child))
        return child.value;

    return "";
}

function toggleVisibility(layer, show)
{
    // We can override the toggle behaviour with the show arg
    if (typeof show === 'boolean')
    {
        layer.style.display = show ? "block" : "none";
    }
    else
        layer.style.display = (layer.style.display != "block") ? "block" : "none";
}

function checkVisibility(layer)
{
    return (layer.style.display == "block");
}

function moveToPosition(layer, customer)
{
    // getBoundingClientRect() excludes the offset due to scrolling, the
    // values return are relative to the currently displayed area
    var customerLeft = customer.getBoundingClientRect().left;
    var customerTop = customer.getBoundingClientRect().top;
    var customerBottom = customer.getBoundingClientRect().bottom;
    var layerWidth  = layer.clientWidth;
    var layerHeight = layer.clientHeight;
    var pageTop = 0;

    // If our layer is inside an absolute DIV then we need to compensate for
    // that parent DIVs position
    var parentXOffset = layer.parentNode.getBoundingClientRect().left;
    var parentYOffset = layer.parentNode.getBoundingClientRect().top;

    var pageBottom = window.innerHeight; //document.body.clientHeight;
    var pageWidth = document.body.clientWidth; //window.innerHeight;

    //alert("Page Width: " + pageWidth + " Customer Left: " + customerLeft + " Layer Width: " + layerWidth + " Parent Offset: " + parentXOffset);
    //alert("Page Height: " + pageHeight + " Customer Bottom: " + customerBottom + " Layer Height: " + layerHeight + " Parent Offset: " + parentYOffset);

    if ((customerLeft + layerWidth + 10) < pageWidth + window.pageXOffset)
    {
        layer.style.left = (customerLeft + 10 - parentXOffset) + "px";
    }
    else
        layer.style.left = (pageWidth - layerWidth - 5 - parentXOffset) + "px";

    if ((customerBottom + layerHeight) < pageBottom + window.pageYOffset)
    {
        layer.style.top = (customerBottom - parentYOffset) + "px";
    }
    else
        layer.style.top = (customerTop - layerHeight - parentYOffset) + "px";
}

function toggleClass(element, className)
{
    class_array = element.className.split(" ");

    var index = class_array.lastIndexOf(className);
    if (index >= 0)
    {
        class_array.splice(index,1);
    }
    else
    {
        class_array.push(className);
    }

    element.className = class_array.join(" ");
}

var timer;
function startDetailTimer(parent)
{
    var parentID = parent.id;
    timer = setTimeout(function(){showDetail(parentID)}, 1200);
}

// This can be much improved by iterating through Program and further automating
// the creation of the html
function buildProgDetailHtml(parentID, data)
{

}

function showDetail(parentID)
{
    clearTimeout(timer);

    var menu = document.getElementById('recMenu');
    if (checkVisibility(menu))
        return;

    var values = parentID.split("_", 2);
    chanID = values[0];
    startTime = values[1];

    var url = "/tv/guide_util.qjs?action=getProgramDetailHTML&chanID=" + chanID + "&startTime=" + startTime;
    var ajaxRequest = $.ajax( url )
                            .done(function()
                        {
                            var parent = document.getElementById(parentID);
                            var layer = document.getElementById('programDetails');

                            layer.innerHTML = ajaxRequest.responseText;
                            toggleVisibility(layer, true);
                            moveToPosition(layer, parent);

//                             $("#debug").html( ajaxRequest.responseText );
//                             $("#debug").show();
                        });
}

function hideDetail(parent)
{
    clearTimeout(timer);

    var parentID = parent.id;
    var layer = document.getElementById('programDetails');

    if (!isValidObject(layer))
        return;

    toggleVisibility(layer, false);
}

var selectedElement;
var chanID = "";
var startTime = "";
function showMenu(parent, menuName)
{
    hideDetail(parent);
    hideMenu(menuName);

    if (selectedElement === parent)
    {
        selectedElement = null;
        return;
    }

    var parentID = parent.id;
    var values = parentID.split("_", 2);
    chanID = values[0];
    startTime = values[1];

    var menu = document.getElementById(menuName);

    // Toggle the "programSelected" class on the program div, this gives the
    // user visual feedback on which one the menu relates to
    selectedElement = parent;
    toggleClass(selectedElement, "programSelected");

    // Display the menu
    toggleVisibility(menu);

    // Move the menu position to the vicinity of the click event
    // (may change this to immediately be above/below the selected program div
    //  instead)
    moveToPosition(menu, parent);
}

function hideMenu(menuName)
{
    var menu = document.getElementById(menuName);
    // Reset visibility
    if (checkVisibility(menu))
    {
        toggleVisibility(menu);

        // Reset any currently selected program
        if (isValidObject(selectedElement))
            toggleClass(selectedElement, "programSelected");
    }
}

function recordProgram(chanID, startTime, type)
{
    hideMenu("recMenu");
    var url = "/tv/dvr_util.qjs?action=simpleRecord&chanID=" + chanID + "&startTime=" + startTime + "&type=" + type;
    var ajaxRequest = $.ajax( url )
                            .done(function()
                            {
                                var response = ajaxRequest.responseText.split("#");
                                recRuleChanged( response[0], response[1] );
                            });
}

function checkRecordingStatus(chanID, startTime)
{
    var url = "/tv/dvr_util.qjs?action=checkRecStatus&chanID=" + chanID + "&startTime=" + startTime;
    var ajaxRequest = $.ajax( url ).done(function()
                            {
                                var response = ajaxRequest.responseText.split("#");
                                var id = response[0] + "_" + response[1];
                                var layer = document.getElementById(id);
                                toggleClass(layer, "programScheduling");
                                // toggleClass(layer, response[2]);
                                var popup = document.getElementById(id + "_schedpopup");
                                toggleVisibility(popup);
                                // HACK: Easiest way to ensure that everything
                                //       on the page is correctly updated for now
                                //       is to reload
                                reloadGuideContent();
                            });
}

function recRuleChanged(chandID, startTime)
{
    var layer = document.getElementById(chanID + "_" + startTime);
    toggleClass(layer, "programScheduling");
    var popup = document.getElementById(chanID + "_" + startTime + "_schedpopup");
    toggleVisibility(popup);

    setTimeout(function(){checkRecordingStatus(chanID, startTime)}, 2500);
}

function deleteRecRule(chandID, startTime)
{
    var layer = document.getElementById(chanID + "_" + startTime);
    var recRuleID = getChildValue(layer, "recordid");
    hideMenu("editRecMenu");
    var url = "/tv/dvr_util.qjs?action=deleteRecRule&recRuleID=" + recRuleID + "&chanID=" + chanID + "&startTime=" + startTime;
    var ajaxRequest = $.ajax( url )
                            .done(function()
                            {
                                var response = ajaxRequest.responseText.split("#");
                                recRuleChanged( response[0], response[1] );
                            });
}

function leftSlideTransition(oldDivID, newDivID)
{
    // Transition works much better with a fixed width, so temporarily set
    // the width based on the parent,
    $("#" + newDivID).css("width", $("#" + oldDivID).width());
    $("#" + newDivID).css("left", "100%");
    $("#" + oldDivID).css("z-index", "-20");
    $("#" + newDivID).css("z-index", "-10");
    var oldLeft = $("#" + oldDivID).position().left;
    $("#" + oldDivID).animate({opacity: "0.3"}, 800, function() {
                   $("#" + oldDivID).remove(); });
    $("#" + newDivID).animate({left: oldLeft}, 800, function() {
                   $("#" + newDivID).css("width", '');
                   $("#" + newDivID).css("z-index", "0"); });
}

function rightSlideTransition(oldDivID, newDivID)
{
    $("#" + newDivID).css("width", $("#" + oldDivID).width());
    $("#" + newDivID).css("left", "-100%");
    $("#" + oldDivID).css("z-index", "-20");
    $("#" + newDivID).css("z-index", "-10");
    var oldLeft = $("#" + oldDivID).position().left;
    $("#" + oldDivID).animate({opacity: "0.3"}, 800, function() {
                   $("#" + oldDivID).remove(); });
    $("#" + newDivID).animate({left: oldLeft}, 800, function() {
                   $("#" + newDivID).css("width", '');
                   $("#" + newDivID).css("z-index", "0"); });
}

function dissolveTransition(oldDivID, newDivID)
{
    $("#" + newDivID).css("opacity", "0.0");
    var oldLeft = $("#" + oldDivID).position().left;
    $("#" + newDivID).css("left", oldLeft);
    $("#" + oldDivID).animate({opacity: "0.0"}, 800, function() {
                   $("#" + oldDivID).remove(); });
    $("#" + newDivID).animate({opacity: "1.0"}, 800);
}

function loadGuideContent(url, transition)
{
    currentContentURL = url;   // currentContentURL is defined in util.qjs
    if (!transition)
        transition = "dissolve";

    $("#busyPopup").show();

    var guideDivID = "guideGrid";
    var guideDiv = document.getElementById(guideDivID);
    var newDiv = document.createElement('div');
    newDiv.style = "left: 100%";
    document.getElementById("content").insertBefore(newDiv, null);

    var html = $.ajax({
      url: url,
        async: false
     }).responseText;

    newDiv.innerHTML = html;
    newDiv.className = "guideGrid";

    // Need to assign the id to the new div
    newDiv.id = guideDivID;
    guideDiv.id = "old" + guideDivID;
    switch (transition)
    {
        case 'left':
            leftSlideTransition(guideDiv.id, newDiv.id);
            break;
        case 'right':
            rightSlideTransition(guideDiv.id, newDiv.id);
            break;
        case 'dissolve':
            dissolveTransition(guideDiv.id, newDiv.id);
            break;
    }
    newDiv.id = "guideGrid";

    $("#busyPopup").hide();
}

function reloadGuideContent()
{
    loadGuideContent(currentContentURL, "dissolve");  // currentContentURL is defined in util.qjs
}
