<script setup lang="ts">
import { createApp, ref } from 'vue'
import $ from 'jquery'
import Mark from 'mark.js'
import 'virtual:windi.css'
import tokenizer from 'sbd'
import { onMessage, sendMessage } from 'webext-bridge'

import getLanguageDefaults from '../../logic/detectLanguage'
import Sentence from '../../components/Sentence.vue'
import { WordUnderCursor } from '../../logic/hover'
import { storageDemo } from '~/logic/storage'

const showExtension = ref(false)
const isRedirecting = ref(false)
const isEnabled = ref(false)
const currentTabLanguage = ref('')
const userLanguage = ref<string>('')
const speakWords = ref<boolean>(false)
const speakSentences = ref<boolean>(false)

const getFullSentence = (e: JQuery.TriggeredEvent) => {
  let str = ''
  let useParent = false
  if ($(e.target).is('a,i,b') && $(e.target).parent().is('p,h1,h2,h3')) {
    str = $(e.target).parent().text()
    useParent = true
  }
  else {
    str = $(e.target).text()
  }
  const sentences = tokenizer.sentences(str, {
    newline_boundaries: false,
    html_boundaries: false,
    sanitize: false,
    allowed_tags: false,
    preserve_whitespace: true,
    // abbreviations: '',
  })
  const target = useParent ? $(e.target).parent()[0] : $(e.target)[0]
  const instance = new Mark(target)
  sentences.forEach((s) => {
    const searchSentence = s.replace(/\n/gi, '').replace(/\s+/g, ' ').trim()
    instance.mark(searchSentence, {
      acrossElements: true,
      separateWordSearch: false,
      element: 'learnsentence',
      exclude: [
        'style *',
        'script *',
        'learnsentence',
        'wordwrap',
        '.learnword',
        '.translatetools',
      ],
      className: 'sentenceHighlight',
    })
  })
  if (!e.clientX || !e.clientY)
    return {}
  const clicked = document.elementFromPoint(e.clientX, e.clientY)
  if (clicked && $(clicked).is('learnsentence')) {
    $(clicked).addClass('thesentence')
    instance.unmark({ exclude: ['.thesentence'] })
    return { clicked, x: e.clientX, y: e.clientY }
  }
  return {}
}

// function trackContentMouseOver() {
//   $(document.body).on('mousemove', (e) => {
//     if (
//       $(e.target).is('body, wordwrap, .learnword, .translatetools')
//     || !!$(e.target).closest('wordwrap, .learnword, .translatetools').length
//     )
//       return
//     const { clicked, x, y } = getFullSentence(e)
//   })
// }

function trackContentClicks() {
  $(document.body).on('click', (e: JQuery.TriggeredEvent) => {
    if (isRedirecting.value)
      return
    if (
      $(e.target).is('body, wordwrap, .learnword, .translatetools')
      || !!$(e.target).closest('wordwrap, .learnword, .translatetools').length
    ) {
      console.log('ignore click....')
      return
    }
    // if (!$(e.target).text() && ($(e.target).find('a').length || $(e.target).closest('a').length)) {
    //   isRedirecting.value = true
    //   if ($(e.target).find('a').length) $(e.target).find('a')[0].click()
    //   if ($(e.target).closest('a').length) $(e.target).closest('a')[0].click()
    //   console.log('redirecting click')
    //   return false
    // }

    const { word } = WordUnderCursor.getFullWord(e)
    if (!word)
      return

    if (!$(e.target).closest('body')[0])
      return // removed from DOM

    if (isEnabled.value)
      isEnabled.value = true
    if (showExtension.value)
      showExtension.value = true

    const isWrappedSentence = !!$(e.target).closest('sentencewrap').length // sentence already wrapped
    if (!isWrappedSentence) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      const { clicked, x, y } = getFullSentence(e)
      if (!clicked || !x || !y)
        return
      const sentenceText = ref<string>($(clicked).text())
      $(clicked).empty()

      if (sentenceText.value !== '' && !!Sentence) {
        createApp(
          {
            extends: Sentence,
            setup(props, context) {
              // necessary otherwise won't run
              if (!Sentence?.setup)
                return
              return {
                ...Sentence.setup({
                  sentence: sentenceText.value,
                  x,
                  y,
                  currentTabLanguage: currentTabLanguage.value,
                  userLanguage: userLanguage.value,
                  speakWords: speakWords.value,
                  speakSentences: speakSentences.value,
                }, context),
              }
            },
          },
        ).mount(clicked)
      }
    }
  })
}

onMessage('content.settings', async ({ data }) => {
  userLanguage.value = data?.currentActiveTab?.userLanguage || ''
  currentTabLanguage.value = data?.currentActiveTab?.currentTabLanguage || ''
  speakWords.value = data?.extensionSettings?.speakWords || false
  speakSentences.value = data?.extensionSettings?.speakSentences || false
})

onMounted(async () => {
  console.log('mounted', storageDemo.value)
  trackContentClicks()
  // trackContentMouseOver()
  try {
    const { currentTabLanguage: initialCurrentTabLanguage, userLanguage: initialUserLanguage } = await getLanguageDefaults()
    userLanguage.value = initialUserLanguage || ''
    currentTabLanguage.value = initialCurrentTabLanguage || ''
  }
  catch (e: any) {
    console.warn('error getLanguageDefaults', e?.message)
  }
  await sendMessage('bg.tab.ready', {
    data: {
      userLanguage: userLanguage.value || '',
      currentTabLanguage: currentTabLanguage.value || '',
    },
  }, 'background')
})
</script>

<template>
  <div />
</template>

<style src="../../styles/fonts.css">

</style>

<style src="../../styles/content.css">

</style>
