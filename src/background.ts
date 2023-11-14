let isContextMenuEnabled = false;
let selectedText :string;
let isoToIso = true;
let options = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
};

const timezones :{ [key: string]: string } = {
  NZDT:"+13:00",
  BRST:"-02:00",
  AEDT:"+11:00",
  AWST:"+08:00",
  AKST:"-09:00",
  ACST:"+10:30",
  CEST:"+02:00",
  EST: "-05:00",
  CET: "+01:00",
  PST: "-08:00",
  JST: "+09:00",
  IST: "+05:30",
  AST: "-09:00",
  ART: "-03:00",
  CAT: "+02:00",
  HKT: "+08:00",
  EET: "+02:00",
  NST: "-03:30",
  NDT: "-02:30",
  MSK: "+03:00",
  CLT: "-03:00",
  EAT: "+03:00",
  WAT: "+01:00",
  NPT: "+05:45",
  PKT: "+05:00",
  MST: "-07:00",
  SGT: "+08:00",
  HST: "-10:00",
  GMT: "Z",
  UTC: "Z",
  WET: "Z",
  ET:  "-05:00",
};

const contextMenuId = "convert-time";
function onCreated() {
  if (browser.runtime.lastError) {
    console.error(`DTC: Error creating context menu: ${browser.runtime.lastError}`);
  } else {
    console.log('DTC: Context menu item created successfully');
  }
}

browser.contextMenus.create({
  id: contextMenuId,
  title: "Convert time to local timezone",
  contexts: ["selection"],
  visible: isContextMenuEnabled
}, onCreated);




browser.contextMenus.onClicked.addListener((info, tab) => {
  console.log("DTC: Context menu clicked; id=" + info.menuItemId);
  if (info.menuItemId === contextMenuId){
    convertTime();
    return;
  }

});


function convertTime(){
  // Declare timezones to offset dictionary, might find a better way to do this later
  // long names => short names, so that for example CEST doesnt get mistaken for EST

  let timezone :string | undefined = undefined;
  console.log("DTC: " + selectedText);
  for (let t of Object.keys(timezones)){
    console.log("DTC: " + t);
      if (selectedText.includes(t)){
          timezone = timezones[t as keyof typeof timezones];
          selectedText= selectedText.replace(t, "").trim();
      }
  }
  const timezoneFormat = /^[+-]?((0?\d)|(1[0-4]))(:[0-5]\d)?$/;
  let response:string | undefined = undefined;
  browser.tabs.query({ active: true, currentWindow: true }).then(async function (tabs) {
    const activeTab = tabs[0];
    if (activeTab === undefined || activeTab.id === undefined){
      return;
    }
    while (timezone === undefined){
      response = await browser.tabs.sendMessage(activeTab.id, { type: "getUserTimezone", prompt:"No timezone found in selected text, please enter it manually! (abbreviation or +/-HH:MM)" });

      if (response === undefined){
        return;
    }
    if (Object.keys(timezones).includes(response)){
        timezone = timezones[response as keyof typeof timezones];
    }
    else if (timezoneFormat.test(response)){
        if (!response.startsWith("+") && !response.startsWith("-")){
          response = "+" + response;
        }
        timezone = response;
    }
    else{
        timezone = "Z";
        console.log(`DTC: Invalid or unsupported timezone format (${response}), defaulting to UTC! If you are sure it is valid, please open an issue on GitHub.`);
    }
    }
    
    let iso;
    const iso8601 = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?([Zz]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?$/;
    const MMDDYYYY = /(0?[1-9]|[1][0-2])(.)(0?[1-9]|[12][0-9]|3[01])\2(\d\d\d\d)/;
    const DDMMYYYY = /(0?[1-9]|[12][0-9]|3[01])(.)(0?[1-9]|[1][0-2])\2(\d\d\d\d)/;
    const format12H = /(((0?[1-9])|(1[012]))(([^\d])([0-5]\d))?(\6[0-5]\d)? ?([aApP][mM]))/;
    const format24H = /(((0?[0-9])|(1\d)|(2[0-4]))([^\d])([0-5]\d)(\6[0-5]\d)?)/;
    if (iso8601.test(selectedText)){
        iso = selectedText;
        replaceText((new Date(iso)).toLocaleString());
        return;
    }
    let currentRegex = selectedText.match(MMDDYYYY);
    if (currentRegex){
        iso = `${currentRegex[4]}-${currentRegex[1]}-${currentRegex[3]}`;
    }
    else{
        currentRegex = selectedText.match(DDMMYYYY)
        if (currentRegex){
            iso = `${currentRegex[4]}-${currentRegex[3]}-${currentRegex[1]}`;
        }
    }
    if (!iso){
        const dateObject = new Date();
        iso = dateObject.toISOString().split("T")[0];
    }
    currentRegex = selectedText.match(format12H);
    if (currentRegex){
        let hours = parseInt(currentRegex[2]);
        let mins = currentRegex[7];
        if (currentRegex[9].toLowerCase() === "pm"){
            hours += 12;
        }
        if (mins === undefined){
            mins = "00";
        }
        iso += `T${hours}:${mins}:00${timezone}`;
        console.log("DTC: " + iso);
        replaceText((new Date(iso)).toLocaleString());

        return;
    }
    currentRegex = selectedText.match(format24H);
    if (currentRegex){
      console.log(JSON.stringify(currentRegex));
        iso += `T${currentRegex[2]}:${currentRegex[7]??"00"}:${currentRegex[9]??"00"}${timezone}`;
        console.log("DTC: " + iso);
        replaceText((new Date(iso)).toLocaleString());
        return;
    }
  });
  
}

browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "updateContextMenu") {
      if (message.visible) {
          console.log("DTC: Context menu update received");
          selectedText =message.selectedText;

      }
      browser.contextMenus.update(contextMenuId, { visible: /*change to visible once working*/ message.visible });
 
  }
});

function replaceText(dateString:string) {
  console.log(dateString);
  browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    const activeTab = tabs[0];
    if (activeTab === undefined || activeTab.id === undefined){
      return;
    }
    browser.tabs.sendMessage(activeTab.id, { type: "replaceText", text: dateString, timezones: timezones });
});
}

function contentPrompt(dateString:string) {
  console.log(dateString);
  browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    const activeTab = tabs[0];
    if (activeTab === undefined || activeTab.id === undefined){
      return;
    }
    browser.tabs.sendMessage(activeTab.id, { type: "replaceText", text: dateString, timezones: timezones });
});
}