import browser from 'webextension-polyfill'
import $ from 'jquery'
const SERVER_URL = 'https://libretranslate.de'
const languageOptions = [
  { label: 'English', code: 'en' },
  { label: 'Deutsch', code: 'de' },
  { label: 'Português', code: 'pt' },
  { label: 'Italiano', code: 'it' },
  { label: 'Français', code: 'fr' },
  { label: 'Español', code: 'es' },
]

const detectLanguage = async () => {
  let pageText = ''
  $(document.body).children(':visible').find('p,a,h1,h2').each((i, el) => {
    const text = $(el).text()
    if (text && text.split(' ').length > 4 && pageText.length < 500)
      pageText += ` ${text}`
  })
  if (!pageText) {
    console.warn('Error reading page text')
    return
  }

  let detectLanguage = {}
  if (browser)
    detectLanguage = await browser.i18n.detectLanguage(pageText)
  else
    console.warn('browser detectLanguage failed')
  if (
    detectLanguage
    && detectLanguage.isReliable
    && detectLanguage.languages.length
  ) {
    console.log('browser detectLanguage from browser', detectLanguage.languages[0])
    return detectLanguage.languages[0]
  }
  console.warn('Detect Language failed using browser API')
  return fetch(`${SERVER_URL}/detect`, {
    method: 'POST',
    body: JSON.stringify({
      q: pageText,
    }),
    headers: { 'Content-Type': 'application/json' },
  })
    .then((response) => {
      return response.json()
    })
    .then((data) => {
      if (data && data.length)
        return data[0]
    })
    .catch((e) => {
      console.log('API detect error ', e)
      return false
    })
}

const getBrowserLanguage = (): string => {
  const browserLanguage = languageOptions.filter(l =>
    navigator.language.includes(l.code),
  )
  return browserLanguage.length ? browserLanguage[0].code : 'en'
}

const getLanguageDefaults = async () => {
  const detectLanguageResult = await detectLanguage()
  const currentTabLanguage = detectLanguageResult.language
  const userLanguage = getBrowserLanguage()

  if (userLanguage && currentTabLanguage)
    return { userLanguage, currentTabLanguage }
  throw new Error('could not identify language defaults')
}

export default getLanguageDefaults
export { getBrowserLanguage }
