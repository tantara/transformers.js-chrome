// Type declarations for Firefox WebExtension browser.* API
// Firefox exposes browser.* alongside Chrome's chrome.* namespace
declare namespace browser {
  namespace sidebarAction {
    function open(): Promise<void>
    function close(): Promise<void>
    function setPanel(details: { panel: string }): Promise<void>
  }
}
