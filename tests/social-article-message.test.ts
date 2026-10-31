import { test } from 'node:test'
import assert from 'node:assert/strict'
import { articlePostMessage } from '../src/lib/social/article-message'

test('market copy preserves dated source facts and qualifications without presenting them as fresh news', () => {
 const article = {
  slug: 'manheim-septemvri-2026',
  title: 'Индексът Manheim за септември 2026: какво означава спадът за купувача',
  intro: 'Обзор на септемврийските данни за 2026 г. от отчета на Cox Automotive от 7 октомври: общият индекс спада с 0.4%, но електромобилите се движат различно. Това не е гаранция за по-ниска цена на конкретен автомобил.',
 }
 const message = articlePostMessage(article)
 assert.ok(message.startsWith('📊 '))
 assert.ok(message.includes(article.title))
 assert.ok(message.replace(/\s+/gu, ' ').includes(article.intro))
 assert.ok(message.includes('0.4%'))
 assert.ok(message.includes('\n\nТова не е гаранция'))
 assert.doesNotMatch(message, /днес|тази седмица|гарантирано|печалба/iu)
 assert.equal(message, articlePostMessage(article))
 assert.ok(message.length <= 2000)
})

test('topic-aware copy does not invent model details, fees or outcomes', () => {
 for (const [title, hook] of [
  ['Offsite Sale: място за получаване', '📍'],
  ['Actual / Not Actual: пробег от САЩ', '🧐'],
  ['Липсващ ключ преди покупката', '🔑'],
  ['Тежести (lien) при кола от Канада', '📄'],
  ['Морски транспорт до България', '🚢'],
  ['Как да планираш бюджета и разходите', '🧮'],
  ['Зарядна съвместимост', '🔌'],
 ]) {
  const intro = 'Провери условията за конкретния автомобил. Резултатът не е гарантиран.'
  const message = articlePostMessage({ title, intro, slug: title })
  assert.ok(message.startsWith(hook), title)
  assert.ok(message.replace(/\s+/gu, ' ').includes(intro))
  assert.doesNotMatch(message, /€|евро|безплатно|спестяваш|нова новина/iu)
 }
})

test('empty and long intros remain usable without truncating source qualifications', () => {
 const empty = articlePostMessage({ title: 'Полезна тема', slug: 'tema', intro: null })
 assert.ok(empty.includes('Полезна тема'))
 assert.ok(empty.includes('👇'))
 assert.doesNotMatch(empty, /undefined|null|практическото ръководство/iu)
 const intro = 'Подробен контекст. '.repeat(150) + 'Това не гарантира регистрация.'
 const long = articlePostMessage({ title: 'Документи', slug: 'dokumenti', intro })
 assert.ok(long.length <= 2000)
 assert.ok(long.includes('Документи'))
 assert.ok(long.includes('👇'))
 assert.ok(!long.includes('Подробен контекст'), 'Omit the whole oversized intro, not its final caveat')
 assert.ok(articlePostMessage({ title: 'А'.repeat(2500), slug: 'long' }).length <= 2000)
})
