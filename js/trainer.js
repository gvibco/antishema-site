(function () {
  'use strict';

  const data = window.ANTISCHEMA_DATA || {};
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const engine = window.AntiSchemaEngine;
  const shell = document.getElementById('trainer-shell');

  const letters = ['А', 'Б', 'В', 'Г'];

  let game = null;
  let pending = null;
  let activeScenarios = [];
  let activeTitle = '';
  let activeCategory = 'all';

  function plural(count, forms) {
    const modulo100 = Math.abs(count) % 100;
    const modulo10 = modulo100 % 10;
    if (modulo100 > 10 && modulo100 < 20) return forms[2];
    if (modulo10 === 1) return forms[0];
    if (modulo10 >= 2 && modulo10 <= 4) return forms[1];
    return forms[2];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return map[character];
    });
  }

  function initials(name) {
    return String(name)
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  function scrollToTarget(element) {
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  const icons = {
    shield: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2.5 4.5 5.5v6.2c0 4.6 3.2 8.4 7.5 9.8 4.3-1.4 7.5-5.2 7.5-9.8V5.5L12 2.5Z" fill="currentColor" opacity=".18"/>
        <path d="M12 2.5 4.5 5.5v6.2c0 4.6 3.2 8.4 7.5 9.8 4.3-1.4 7.5-5.2 7.5-9.8V5.5L12 2.5Z" stroke="currentColor" stroke-width="1.6"/>
        <path d="m8.4 12.1 2.4 2.4 4.8-5.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    check: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m5 12.4 4.6 4.6L19 7.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    cross: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`,
    star: `
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="m10 2.8 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8l5-.7L10 2.8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>`,
    lock: `
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="4.5" y="8.5" width="11" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M7 8.5V6.8a3 3 0 0 1 6 0v1.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
    warning: `
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3 2.8 16h14.4L10 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M10 8v3.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="10" cy="13.8" r=".9" fill="currentColor"/>
      </svg>`,
    arrow: `
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  };

  const categoryIcons = {
    bank: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
        <path d="M3 10h18" stroke="currentColor" stroke-width="1.6"/>
        <path d="M6.5 14.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,
    gosuslugi: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M14 3.5V8h4.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M8.5 12.5h7M8.5 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,
    police: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.2 5 6v5.4c0 3.9 2.9 7.3 7 8.4 4.1-1.1 7-4.5 7-8.4V6l-7-2.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="m12 8.4 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4L12 8.4Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>`,
    family: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/>
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="16.8" cy="9.6" r="2.3" stroke="currentColor" stroke-width="1.6"/>
        <path d="M15.2 14.4a4.4 4.4 0 0 1 5.3 4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,
    job: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.2" y="7.5" width="17.6" height="11" rx="2.2" stroke="currentColor" stroke-width="1.6"/>
        <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" stroke="currentColor" stroke-width="1.6"/>
        <path d="M3.5 12.2h17" stroke="currentColor" stroke-width="1.6"/>
      </svg>`,
    shop: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.5 8h13l-1 11.5h-11L5.5 8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M9 8V6.8a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,
    games: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2.8" y="7.5" width="18.4" height="9" rx="4.5" stroke="currentColor" stroke-width="1.6"/>
        <path d="M8 10.5v3M6.5 12h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="16" cy="11.4" r=".9" fill="currentColor"/>
        <circle cx="18" cy="13.4" r=".9" fill="currentColor"/>
      </svg>`,
    school: `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m12 4 9 4.5-9 4.5-9-4.5L12 4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,
  };

  function renderStart() {
    const total = scenarios.length;

    const topicCards = categories.map((category) => {
      const count = scenarios.filter((scenario) => scenario.category === category.id).length;
      return `
        <button class="topic-card" type="button" data-category="${escapeHtml(category.id)}">
          <span class="topic-icon">${categoryIcons[category.id] || icons.shield}</span>
          <span class="topic-body">
            <strong>${escapeHtml(category.title)}</strong>
            <span>${escapeHtml(category.description)}</span>
          </span>
          <span class="topic-count">${count} ${plural(count, ['задание', 'задания', 'заданий'])}</span>
        </button>`;
    }).join('');

    shell.innerHTML = `
      <div class="start-screen is-compact">
        <div class="start-icon">${icons.shield}</div>
        <h3>Сможешь ли ты распознать обман?</h3>
        <p>Выбери тему, которая встречается чаще всего, или пройди все задания подряд. Разбор появится сразу после ответа.</p>
      </div>
      <div class="topics">
        <p class="topics-title">${categories.length} тем</p>
        <div class="topics-grid">${topicCards}</div>
        <div class="topics-all">
          <button class="button" type="button" data-action="start">
            Пройти все ${total} ${plural(total, ['задание', 'задания', 'заданий'])} ${icons.arrow}
          </button>
          <span class="start-note">${icons.lock} ${total} ${plural(total, ['задание', 'задания', 'заданий'])} · ${categories.length} ${plural(categories.length, ['тема', 'темы', 'тем'])} · без регистрации</span>
        </div>
      </div>`;
  }

  function renderError(errors) {
    shell.innerHTML = `
      <div class="start-screen">
        <div class="start-icon">${icons.warning}</div>
        <h3>Не удалось загрузить тренажёр</h3>
        <p>Проверьте файлы проекта и обновите страницу.</p>
        <p class="notice">${escapeHtml(errors.join(' '))}</p>
      </div>`;
  }

  function renderQuestion() {
    const scenario = activeScenarios[game.index];
    if (!scenario) {
      renderResult();
      return;
    }

    const total = activeScenarios.length;
    const answered = pending ? pending.game.index : game.index;
    const score = pending ? pending.game.score : game.score;
    const percent = Math.round((answered / total) * 100);
    const category = categories.find((item) => item.id === scenario.category);

    const meta = `
      <div class="task-meta">
        ${category ? `<span class="chip chip-topic">${escapeHtml(category.title)}</span>` : ''}
        <span class="chip">${escapeHtml(scenario.tag)}</span>
        <span class="chip chip-muted">${escapeHtml(scenario.difficulty)}</span>
      </div>`;

    const body = scenario.type === 'dialog'
      ? renderDialog(scenario)
      : renderRecognize(scenario);

    const choices = scenario.choices.map((choice, index) => {
      const state = choiceState(scenario, choice);
      const status = state === 'correct'
        ? `<span class="choice-status">${icons.check}</span>`
        : state === 'wrong'
          ? `<span class="choice-status">${icons.cross}</span>`
          : '';

      return `
        <button class="choice ${state ? `choice-${state}` : ''}" type="button" data-choice="${escapeHtml(choice.id)}" ${pending ? 'disabled' : ''}>
          <span class="choice-letter">${letters[index] || index + 1}</span>
          <span class="choice-text">${escapeHtml(choice.text)}</span>
          ${status}
        </button>`;
    }).join('');

    shell.innerHTML = `
      <div class="game-top">
        <span class="game-progress-label">Задание ${game.index + 1} из ${total}</span>
        <span class="score-pill">${icons.star} ${score} / ${total}</span>
      </div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${answered}" aria-label="Пройдено заданий">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      ${meta}
      <h3 class="task-title" tabindex="-1">${escapeHtml(scenario.title)}</h3>
      <p class="task-subtitle">${escapeHtml(scenario.subtitle)}</p>
      ${body}
      <div class="choices" role="group" aria-label="Варианты ответа">${choices}</div>
      ${pending ? renderFeedback(scenario) : ''}`;

    const heading = shell.querySelector('.task-title');
    if (heading) heading.focus({ preventScroll: true });
    scrollToTarget(pending ? shell.querySelector('.feedback') : shell);
  }

  function renderDialog(scenario) {
    const messages = scenario.messages.map((message) => `
      <div class="chat-message">
        <span class="avatar">${escapeHtml(initials(message.name))}</span>
        <div class="chat-bubble">
          <span class="chat-name">${escapeHtml(message.name)}</span>
          <p class="chat-text">${escapeHtml(message.text)}</p>
        </div>
      </div>`).join('');

    return `<div class="chat">${messages}</div>`;
  }

  function renderRecognize(scenario) {
    return `
      <div class="recognize-card">
        <div class="recognize-head">
          <span class="avatar">${escapeHtml(initials(scenario.sender))}</span>
          <div>
            <strong>${escapeHtml(scenario.sender)}</strong>
            <small>Входящее сообщение</small>
          </div>
        </div>
        <p class="recognize-text">${escapeHtml(scenario.message)}</p>
        <p class="recognize-question">Это сообщение безопасно?</p>
      </div>`;
  }

  function choiceState(scenario, choice) {
    if (!pending) return '';

    const chosenId = pending.game.answers[game.index].choiceId;
    const correctId = pending.correctChoiceId;

    if (choice.id === correctId) return 'correct';
    if (choice.id === chosenId) return 'wrong';
    return 'dim';
  }

  function renderFeedback(scenario) {
    const title = pending.correct ? 'Верно!' : 'Не совсем';
    const subtitle = pending.correct
      ? 'Ты выбрал безопасное действие.'
      : 'Это ловушка. Вот как её распознать.';
    const isSafe = scenario.redFlag === 'Признаков обмана нет';

    return `
      <div class="feedback ${pending.correct ? 'is-correct' : 'is-wrong'}" role="status" aria-live="polite" tabindex="-1">
        <div class="feedback-head">
          <span class="feedback-icon">${pending.correct ? icons.check : icons.cross}</span>
          <div>
            <h4>${title}</h4>
            <p>${subtitle}</p>
          </div>
        </div>
        <div class="feedback-body">
          <p>${escapeHtml(pending.explanation)}</p>
          <p class="red-flag${isSafe ? ' is-safe' : ''}">${isSafe ? icons.check : icons.warning} ${escapeHtml(scenario.redFlag)}</p>
          <div class="rule-box">
            <span>Запомни</span>
            <p>${escapeHtml(pending.rule)}</p>
          </div>
        </div>
        <button class="button" type="button" data-action="next">
          ${pending.game.finished ? 'Показать результат' : 'Следующее задание'} ${icons.arrow}
        </button>
      </div>`;
  }

  function renderResult() {
    const result = engine.getResult(game);
    const rules = activeScenarios
      .map((scenario) => `
        <li>${icons.check}<span>${escapeHtml(scenario.rule)}</span></li>`)
      .join('');

    shell.innerHTML = `
      <div class="result-screen">
        <p class="eyebrow">Результат · ${escapeHtml(activeTitle)}</p>
        <div class="score-ring" style="--score: ${result.percent}">
          <div class="score-ring-inner">
            <strong>${result.score} / ${result.total}</strong>
            <small>${result.percent}%</small>
          </div>
        </div>
        <h3 tabindex="-1">${escapeHtml(result.title)}</h3>
        <p class="result-message">${escapeHtml(result.message)}</p>
        <ul class="rules-list">${rules}</ul>
        <div class="result-actions">
          <button class="button" type="button" data-action="restart">Пройти ещё раз ${icons.arrow}</button>
          <button class="button button-ghost" type="button" data-action="home">Выбрать другую тему</button>
          <a class="button button-ghost" href="rules.html">Открыть правила</a>
        </div>
      </div>`;

    const heading = shell.querySelector('.result-screen h3');
    if (heading) heading.focus({ preventScroll: true });
    scrollToTarget(shell);
  }

  function startSet(categoryId) {
    const list = engine.filterByCategory(scenarios, categoryId);
    if (!list.length) return;

    const category = categories.find((item) => item.id === categoryId);

    activeCategory = categoryId || 'all';
    activeScenarios = list;
    activeTitle = category ? category.title : 'Все темы';
    game = engine.createGame(activeScenarios);
    pending = null;
    renderQuestion();
  }

  function handleChoice(choiceId) {
    if (!game || pending || game.finished) return;

    const result = engine.submitAnswer(game, activeScenarios, choiceId);
    if (!result) return;

    pending = result;
    renderQuestion();

    const feedback = shell.querySelector('.feedback');
    if (feedback) feedback.focus({ preventScroll: true });
  }

  function handleAction(action) {
    if (action === 'start') {
      startSet('all');
      return;
    }

    if (action === 'restart') {
      startSet(activeCategory || 'all');
      return;
    }

    if (action === 'home') {
      renderStart();
      scrollToTarget(shell);
      return;
    }

    if (action === 'next' && pending) {
      game = pending.game;
      pending = null;

      if (game.finished) {
        renderResult();
      } else {
        renderQuestion();
      }
    }
  }

  shell.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-choice]');
    if (choice) {
      handleChoice(choice.dataset.choice);
      return;
    }

    const topic = event.target.closest('[data-category]');
    if (topic) {
      startSet(topic.dataset.category);
      return;
    }

    const action = event.target.closest('[data-action]');
    if (action) handleAction(action.dataset.action);
  });

  if (!engine) {
    renderError(['Не найден движок тренажёра.']);
    return;
  }

  const errors = engine
    .validateCategories(categories)
    .concat(engine.validateScenarios(scenarios, categories));
  if (errors.length) {
    renderError(errors);
    return;
  }

  renderStart();
})();
