// Minimal MV3 service worker — keeps side panel open on action click
chrome.action.onClicked.addListener(async tab => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (e) {}
});
