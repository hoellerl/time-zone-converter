const iso8601 = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?([Zz]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?$/;
const format12H = /(((0?[1-9])|(1[012]))(([^\d])([0-5]\d))?(\6[0-5]\d)? ?([aApP][mM]))/;
const format24H = /(((0?[0-9])|(1\d)|(2[0-4]))([^\d])([0-5]\d)(\5[0-5]\d)?)/;

let range :Range;
// Listen for context menu events on the page
document.addEventListener("mouseup", function () {
    const selection = window.getSelection();
    if (selection === null){
        return;
    }
    const selectedText =selection.toString().trim();
    if (iso8601.test(selectedText) || format12H.test(selectedText) || format24H.test(selectedText)) {
        console.log("DTC: Matched");
        
        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);

            // Send a message to the background script to show the context menu item
            browser.runtime.sendMessage({
                type: "updateContextMenu",
                visible: true,
                selectedText: selectedText,
            });

            return;
        }
    }

    // Send a message to the background script to hide the context menu item
    browser.runtime.sendMessage({
        type: "updateContextMenu",
        visible: false,
    });
});


browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "replaceText") {
        replaceSelectedText( message.text, message.timezones);
    }
});


browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    sendResponse(prompt(message.prompt));
});

function replaceSelectedText(newText:string, tz:{ [key: string]: string }) {
    let selectedText = range.toString();

    if (iso8601.test(selectedText)) {
        selectedText = selectedText.replace(iso8601, newText);
    } else if (format12H.test(selectedText)) {
        selectedText = selectedText.replace(format12H, newText);
    } else if (format24H.test(selectedText)) {
        selectedText = selectedText.replace(format24H, newText);
    }
    for (const item of Object.keys(tz)) {
        const pattern = new RegExp(`[^a-zA-Z0-9]${item}[^a-zA-Z0-9]?`);
        if (pattern.test(selectedText)) {
            selectedText = selectedText.replace(pattern, "");
            break;
        }
    }
    range.deleteContents();
    range.insertNode(document.createTextNode(selectedText));

}

/* May need later for replacing all times on page

function replaceTextInTextNode(oldText:string, newText:string) {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while(node = walk.nextNode()) {
        node.nodeValue = node.nodeValue.replace(new RegExp(oldText, 'g'), newText);
    }
}
*/