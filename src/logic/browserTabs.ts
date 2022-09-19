import browser from 'webextension-polyfill'

export const getCurrentBrowserTabId = async (): Promise<number | undefined> => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  return tab.id
}
