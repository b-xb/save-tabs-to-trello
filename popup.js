// TRELLO API

API_GET_PARAMS=`key=${API_KEY}&token=${API_TOKEN}`;
API_POST_PARAMS={key:API_KEY,token:API_TOKEN};
API_BASE_URL="https://api.trello.com/";

API_GET_PATH = {
  workspaces: _ => `${API_BASE_URL}1/members/me/organizations?${API_GET_PARAMS}`,
  boards: vars => {
    if (!vars || vars[0] == 0)
      return `${API_BASE_URL}1/members/me/boards?${API_GET_PARAMS}`;
    else
      return `${API_BASE_URL}/1/organizations/${vars[0]}/boards?${API_GET_PARAMS}`;
  },
  lists: vars => `${API_BASE_URL}1/boards/${vars[0]}/lists?${API_GET_PARAMS}`,
  cards: vars => `${API_BASE_URL}1/lists/${vars[0]}/cards?${API_GET_PARAMS}`,
}

API_POST_PATH = {
  cards: `${API_BASE_URL}1/cards`,
}

const API_NAME_KEY = {
  workspaces: "displayName",
  boards: "name",
  lists: "name",
  cards: "name",
}

const API_SUB_ITEM = {
  workspaces: "boards",
  boards: "lists",
  lists: null,
}

const SELECTION_KEY = (_item) => `${_item}Selected`;


_STORAGE = {}
const storageHandler = {
  set(obj, prop, value) {
    y = prop.indexOf("URL");
    if (y>=0) {
      obj[prop] = value;
    } else {
      x = prop.indexOf("Selected");
      if (x >= 0) {
        if (obj[prop] != value) {
          cached = !(obj?.[prop]);
          item = prop.slice(0,x);
          switch(item){
            case "workspaces":
              fetch("boards",[value],cached);
              break;
            case "boards":
              fetch("lists",[value],cached);
              break;
            case "lists":
              break;
          }
        }
        obj[prop] = value;
      } else {
        if (prop != "cards")
          updateSelectBoxOptions(prop,value);
        obj[prop] = value;
      }
    }
  }
};

const STORAGE = new Proxy(_STORAGE, storageHandler);

let successCount = 0;
let failCount = 0;
let bookmarkCount = 0;

function getSelectedList() {
  return $("#trello-lists option:selected")?.[0];
}

function getSelectedBoard() {
  return $("#trello-boards option:selected")?.[0];
}

function getBoardURL(){
  return $(getSelectedBoard()).data("url");
}

function getSelectedWorkspace(){
  return $("#trello-workspaces option:selected")?.[0];
}

function getWorkspaceURL(){
  return $(getSelectedWorkspace()).data("url");
}

function updateCount(){
  $( "#results" ).text(`submitted: ${bookmarkCount} | successes:${successCount} | fails:${failCount}`);
}

function apiPostRequest(item,vars={}){
  console.log("woo");
  console.log("item",item);
  url = API_POST_PATH[item];
  Object.assign(vars,API_POST_PARAMS);
  console.log("vars",vars);
  console.log("url",url);
  $.ajax({
    url: url,
    type: "POST",
    dataType: "json",
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(vars),
    cache: false,
    async: false,
    success: function (returnData) {
      // TODO: add attachments here (note this will affect API limits)
      // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-post
      
      successCount++;
      updateCount();
    },
    error: function (jqXHR, textStatus, errorThrown) {
        console.log(jqXHR);
        console.log(textStatus);
        console.log(errorThrown);
    }
  }).fail(function () {
    failCount++;
    updateCount();
  });
}

function apiGetRequest(item,vars=[]){
  url = API_GET_PATH[item](vars);
  $.ajax({
    url: url,
    type: "GET",
    success: function (returnData) {
      updateStorage(item,returnData);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log(jqXHR);
      console.log(textStatus);
      console.log(errorThrown);
    }
  }).fail(function () {

  });
}

function fetchBoards(){
  fetch("boards");
}

function refreshWorkspaces(){
  console.log("refreshing Workspaces");
  fetch("workspaces",[],false);
}

function refreshBoards(){
  console.log("refreshing Boards");
  workspaceID = STORAGE[SELECTION_KEY("workspaces")];
  fetch("boards",[workspaceID],false);
}

function refreshLists(){
  console.log("refreshing Lists");
  boardID = STORAGE[SELECTION_KEY("boards")];
  fetch("lists",[boardID],false);
}

function fetchListsForBoard(boardID){
  fetch("lists",[boardID]);
}

function getListPosition(){
  positionSelected = $("#trello-list-position").find(":selected").val();
  if (positionSelected == "precise")
    // listID = getSelectedList().value;
    // apiGetRequest("cards",[listID]);
    // wait for value to be updates...
    // then return the value
    return $("#trello-list-exact-position").val(); // then remove this line
  else
    return positionSelected;
}

function postCards(bookmarks,listID){
  // Note: number of requests is limitted to 100 every 10 seconds
  successCount = 0;
  failCount = 0;
  bookmarkCount = bookmarks.length;
  position = getListPosition();
  if (position != "bottom") bookmarks.reverse();
  for (bookmark of bookmarks) {
    postCard(bookmark.title,bookmark.url,position,listID);
  }
}

function postCard(name="",desc="",pos="bottom",idList){
  // See https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post
  console.log("idList",idList);
  if (idList) { 
    apiPostRequest("cards",{name,desc,pos,idList});
  }
}

function updateStorage(item,data) {
  STORAGE[item] = data;
  updateCookieValue(item,data);
}

function getSelected(item) {
  keyToGet = SELECTION_KEY(item);
  if (STORAGE[keyToGet])
    return STORAGE[keyToGet];
}

function updateSelected(item,data) {
  keyToUpdate = SELECTION_KEY(item);
  if (STORAGE[keyToUpdate] != data) {
    updateStorage(keyToUpdate,data);
  }
}

function updateCookieValue(key,value){
  console.log(`attempting to set ${key} as ${value}`);
  values = {};
  values[key] = value;
  chrome.storage.local.set(values, () => {
    chrome.storage.local.get([key], function(cookie) {
      console.log(key,"set as",cookie[key]);
    });
  });
}

function updateCookie(){
  chrome.storage.local.set(STORAGE);
}

function fetch(item,vars,cached=true){
  keyForSelection = SELECTION_KEY(item);
  chrome.storage.local.get([item,keyForSelection], function (cookie) {
    console.log("fetch:",cookie);
    console.log("selected:",keyForSelection);
    console.log("cookie selected",cookie?.[keyForSelection]);
    if (cookie?.[keyForSelection]){
      STORAGE[keyForSelection] = cookie[keyForSelection];
    }
    if (cached && cookie?.[item]){
      console.log("loading from cache");
      STORAGE[item] = cookie[item];
    } else {
      console.log("get request");
      apiGetRequest(item,vars);
    }
  });
}

function fetchFromCookie(item){
  chrome.storage.local.get([item], function(cookie) {
    STORAGE[item] = cookie[item];
  });
}

function readCookie(item){
  chrome.storage.local.get([item], function(cookie) {
    console.log(cookie[item]);
  });
}

function testStorage(){
  chrome.storage.local.get(['key'], function(result) {
    console.log('Value currently is ' + result.key);
    value = result.key;
    if (value)
      value = value + 1;
    else
      value = 1;

    chrome.storage.local.set({key: value}, function() {
      console.log('Value is set to ' + value);
    });
  });
}

// Helper Methods

// source: https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
function escapeHtml(html){
  var text = document.createTextNode(html);
  var p = document.createElement('p');
  p.appendChild(text);
  return p.innerHTML;
}

// UI Methods

function toggleTagEditor() {
  $(".tag-editor").toggle();
}

function toggleURLDisplay() {
  $(".url-display").toggle();
}

function selectAll() {
  $(".tabToSave").prop("checked", true);
  updateSelectedCount();
}

function deselectAll() {
  $(".tabToSave").prop("checked", false);
  updateSelectedCount();
}

// TRELLO API UI

function setTrelloEventHandlers(){
  $("#trello-workspaces")
    .change(function () {
      selectedWorkspace = $("#trello-workspaces option:selected")?.[0];
      workspaceID = selectedWorkspace.value;
      if (workspaceID) {
        updateSelected("workspaces",workspaceID);
      }
    });
  $("#trello-boards")
    .change(function () {
      selectedBoard = $("#trello-boards option:selected")?.[0];
      boardID = selectedBoard.value;
      if (boardID) {
        updateSelected("boards",boardID);
      }
    });
  $("#trello-lists")
    .change(function () {
      listID = $("#trello-lists option:selected")?.[0].value;
      if (listID) {
        console.log("select box value:",listID);
        updateSelected("lists",listID);
      }
    });
  $("#trello-list-position")
    .change(function () {
      position = $("#trello-list-position").find(":selected").val();
      if (position == "precise") {
        console.log("false");
        $("#trello-list-exact-position").prop( "disabled", false );
      }
      else {
        console.log("true");
        $("#trello-list-exact-position").prop( "disabled", true );
      }
    });
}

function loadStorage(){
  fetch("workspaces");
}

function newOption(item, option){
  _name = option[API_NAME_KEY[item]];
  var newOption = document.createElement('option');
  $(newOption).data("name", _name);
  $(newOption).data("id", option.id);
  console.log(option.url)
  if (option.url) {
    $(newOption).data("url", option.url);
    console.log("added");
  }
  $(newOption).attr("name", option.id);
  $(newOption).val(option.id);
  newOption.innerHTML = _name;
  return newOption;
}

function updateSelectBoxOptions(item,options){
  selectbox = document.getElementById(`trello-${item}`);
  if (selectbox.innerHTML) selectbox.innerHTML = "";
  console.log("options:",options);
  if (item == "workspaces") {
    selectbox.appendChild(
      newOption(
        "workspaces",
        {
          displayName:"All",
          id:0,
          url:"https://trello.com/u/me/boards",
        }
      )
    );
  }
  for (option of options) {
    selectbox.appendChild(newOption(item,option));
  }
  console.log("updating", item)
  console.log("before:",selectbox.value);
  selected = getSelected(item);
  console.log("selected:",selected);
  console.log("hing", $(selectbox).find(`option[value=${selected}]`) );
  if (selected && $(selectbox).find(`option[value=${selected}]`).length > 0) {
    selectbox.value = selected;
    updateSelected(item,selected);
  } else {
    firstValue = selectbox.firstChild.value;
    if (firstValue) {
      updateSelected(item,firstValue);
    }
  }
  console.log("after:",selectbox.value);
}

function updateSelectBoxValue(item,value) {
  selectbox = document.getElementById(`trello-${item}`);
  if (selectbox.value != value)
    selectbox.value = value;
}

function goToBoard(){
  window.open(getBoardURL(), "_blank");
}

function goToWorkspace(){
  window.open(getWorkspaceURL(), "_blank");
}

function submitForm() {
  $.when( $( "#results" ).text("submitted...") ).then(function(){
      bookmarks = getLinks();
      console.log("bookmarks",bookmarks);
      listID = getSelected("lists");
      console.log("listID",listID);
      postCards(bookmarks,listID);
    }
  )
}

// CHROME API UI

function getLinks() {
  bookmarks = [];
  $('.bookmark .tabToSave:checked').each(function(i,checkbox){
      bookmark_element = checkbox.parentElement;
      bookmark = {
          "title": $(bookmark_element).data("tabdata").title,
          "url": $(bookmark_element).data("tabdata").url
      };
      bookmarks.push(bookmark);
  });
  return bookmarks;
}

function thisWindowTabs(){
  chrome.tabs.query(
      {
          windowId: chrome.windows.WINDOW_ID_CURRENT
      },
      
      function(tabs){
          requestTabs(tabs);
      }
  );

};

function thisDeviceTabs(selectedSession) {
  chrome.windows.get(
    $(selectedSession).data("windowId"),
    {
      populate: true
    },
    function (window) {
      requestTabs(window.tabs)
    }
  );
}

function otherDeviceTabs(selectedSession) {
  chrome.sessions.getDevices(function (devices) {
    devices.forEach(function (device) {
      if (device.deviceName == $(selectedSession).data("deviceName")) {
        sessions = device.sessions;
        sessions.forEach(function (session) {
          if (session.window.sessionId == $(selectedSession).data("sessionId")) {
            requestTabs(session.window.tabs);
          }
        });
      }
    });
  })
}

function recentlyClosedTabs(selectedSession) {
  console.log(selectedSession);

  chrome.sessions.getRecentlyClosed(
    function (sessions) {
      sessions.forEach(
        function (session, index) {
          if (session.lastModified === 0) {
            if (session.window.sessionId === $(selectedSession).data("sessionId")) {
              requestTabs(session.window.tabs);
            }
          }
        }
      );
    }
  );
}

function requestTabs(tabs) {
  $("body").data("tabsdata", tabs);

  form = document.getElementById('bookmarks');

  $("body").data("tabsdata").forEach(function (tab) {

    var mydiv = document.createElement('div');
    $(mydiv).data("tabdata", tab);
    $(mydiv).attr("id", "bookmark-" + $(mydiv).data("tabdata").id);
    $(mydiv).addClass('bookmark');
    mydiv.innerHTML =
      "<input class='tabToSave' type='checkbox' name='tabToSave' id='select-" +
      $(mydiv).data("tabdata").id +
      "' checked>" +
      "<a href='" +
      $(mydiv).data("tabdata").url +
      "' title='" +
      $(mydiv).data("tabdata").url +
      "'>" +
      escapeHtml($(mydiv).data("tabdata").title) +
      "</a>" +
      "<br/>" +
      "<span class='url-display'>" +
      //"<span class='url-display' style='display: none;'>" +
      $(mydiv).data("tabdata").url +
      "<br/>" +
      "</span>";
      // "</span>" +
      // "<input class='tag-editor' type='text' name='tags' size='100' >";
    form.appendChild(mydiv);

  });

  addSelectedLinksCountListener();
}


function storeWindowInfo() {
  chrome.windows.getAll(
    function (windowObj, index) {
      selectbox = document.getElementById('devices');
      windowObj.forEach(
        function (window, index) {
          deviceName = "this-device";
          deviceDisplayName = "This Device";
          var newDevice = document.createElement('option');
          $(newDevice).data("deviceName", deviceName);
          $(newDevice).data("windowId", window.id);
          $(newDevice).attr("name", deviceName + " " + index);
          $(newDevice).val(deviceName + " " + index);
          newDevice.innerHTML = deviceDisplayName + ": " + index;
          selectbox.appendChild(newDevice);
        }
      )
    }
  )
}

function storeDeviceInfo() {
  chrome.sessions.getDevices(
    function (devices) {
      selectbox = document.getElementById('devices');
      devices.forEach(
        function (device) {
          deviceName = device.deviceName
          device.sessions.forEach(
            function (session, index) {
              var newDevice = document.createElement('option');
              $(newDevice).data("deviceName", deviceName);
              $(newDevice).data("sessionId", session.window.sessionId);
              $(newDevice).attr("name", deviceName + " " + index);
              $(newDevice).val(deviceName + " " + index);
              newDevice.innerHTML = deviceName + ": " + index;
              selectbox.appendChild(newDevice);
            }
          );
        }
      );

    }
  )
}

function storedRecentlyClosedInfo() {
  chrome.sessions.getRecentlyClosed(
    function (sessions) {
      //console.log(sessions);
      selectbox = document.getElementById('devices');
      sessions.forEach(
        function (session, index) {
          if (session.lastModified === 0) {
            //console.log("hey!")
            deviceName = "recently-closed";
            deviceDisplayName = "Recently Closed";
            var newDevice = document.createElement('option');
            $(newDevice).data("deviceName", deviceName);
            $(newDevice).data("sessionId", session.window.sessionId);
            $(newDevice).attr("name", deviceName + " " + index);
            $(newDevice).val(deviceName + " " + index);
            newDevice.innerHTML = deviceDisplayName + ": " + index;
            selectbox.appendChild(newDevice);
          } else {
            //console.log("boo!")
          }

        }
      );
    }
  );
}

function deviceSessionSelectListener() {
  $("#devices")
    .change(function () {
      $('#bookmarks').empty();
      $("#devices option:selected").each(function () {
        if ($(this).val() == "this-window") {
          thisWindowTabs();
        } else if ($(this).data("deviceName") == "this-device") {
          thisDeviceTabs($(this));
        } else if ($(this).data("deviceName") == "recently-closed") {
          recentlyClosedTabs($(this));
        } else {
          otherDeviceTabs($(this));
        }
      });
    })
}

function updateSelectedCount(){
  $("#selected-count").text($('.bookmark .tabToSave:checked').length + " Selected");
}

function addSelectedLinksCountListener(){
  updateSelectedCount();
  $(".tabToSave").change(updateSelectedCount);
}

// Run scripts as soon as the document's DOM is ready.
document.addEventListener('DOMContentLoaded', function () {
  setTrelloEventHandlers();
  loadStorage();
  thisWindowTabs();
  storeWindowInfo();
  storeDeviceInfo();
  storedRecentlyClosedInfo();
  deviceSessionSelectListener();
  //document.getElementById('tag-editor-toggle').addEventListener('click', toggleTagEditor);
  document.getElementById('url-display-toggle').addEventListener('click', toggleURLDisplay);
  document.getElementById('select-all-button').addEventListener('click', selectAll);
  document.getElementById('deselect-all-button').addEventListener('click', deselectAll);
  document.getElementById('save-selected').addEventListener('click', submitForm);
  document.getElementById('refresh-lists').addEventListener('click', refreshLists);
  document.getElementById('refresh-boards').addEventListener('click', refreshBoards);
  document.getElementById('refresh-workspaces').addEventListener('click', refreshWorkspaces);
  document.getElementById('open-trello-board').addEventListener('click', goToBoard);
  document.getElementById('open-trello-workspace').addEventListener('click', goToWorkspace);
});




