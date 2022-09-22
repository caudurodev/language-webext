import browser from 'webextension-polyfill'
import { onMessage, sendMessage } from 'webext-bridge'
import { getCurrentBrowserTabId } from '~/logic/browserTabs'

if (__DEV__)
  import('./contentScriptHMR')

let activeTabId = 0

browser.tabs.onActivated.addListener((tabId) => {
  browser.tabs.get(tabId.tabId)
    .then((tab) => {
      if (tab.id)
        activeTabId = tab.id
    })
})

onMessage('bg.isCurrentTabEnabled', async ({ data }) => {
  await sendMessage('content.isEnabled', data, `content-script@${activeTabId}`)
})

onMessage('bg.getCurrentActiveTabLanguage', async () => {
  const language = await sendMessage('content.getCurrentActiveTabLanguage', {}, `content-script@${activeTabId}`)
  return language
})

onMessage('bg.getCurrentActiveTabId', async () => {
  const currentBrowserTabId = await getCurrentBrowserTabId()
  return currentBrowserTabId
})

onMessage('bg.storage', async ({ data }) => {
  await sendMessage('content.storage', data, `content-script@${activeTabId}`)
})

