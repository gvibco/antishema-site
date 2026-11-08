(function () {
  'use strict';

  const scenarios = window.ANTISCHEMA_SCENARIOS || [];
  const engine = window.AntiSchemaEngine;
  const shell = document.getElementById('trainer-shell');

  const letters = ['А', 'Б', 'В', 'Г'];

  let game = null;
  let pending = null;

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

  function renderStart() {
    shell.innerHTML = `
      <div class="start-screen">
        <div class="start-icon">${icons.shield}</div>
        <h3>Сможешь ли ты распознать обман?</h3>
        <p>Выбирай ответ, который считаешь безопасным. Разбор появится сразу — без регистрации и оценок.</p>
        <button class="button" type="button" data-action="start">
          Начать тренировку ${icons.arrow}
        </button>
        <div class="start-note">${icons.lock} 6 заданий · без регистрации · около 5 минут</div>
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
    const scenario = scenarios[game.index];
    if (!scenario) {
      renderResult();
      return;
    }

    const total = scenarios.length;
    const answered = pending ? pending.game.index : game.index;
    const score = pending ? pending.game.score : game.score;
    const percent = Math.round((answered / total) * 100);

    const meta = `
      <div class="task-meta">
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
    const rules = scenarios
      .map((scenario) => `
        <li>${icons.check}<span>${escapeHtml(scenario.rule)}</span></li>`)
      .join('');

    shell.innerHTML = `
      <div class="result-screen">
        <p class="eyebrow">Результат</p>
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
          <a class="button button-ghost" href="index.html#flags">Открыть памятку</a>
        </div>
      </div>`;

    const heading = shell.querySelector('.result-screen h3');
    if (heading) heading.focus({ preventScroll: true });
    scrollToTarget(shell);
  }

  function startGame() {
    game = engine.createGame(scenarios);
    pending = null;
    renderQuestion();
  }

  function handleChoice(choiceId) {
    if (!game || pending || game.finished) return;

    const result = engine.submitAnswer(game, scenarios, choiceId);
    if (!result) return;

    pending = result;
    renderQuestion();

    const feedback = shell.querySelector('.feedback');
    if (feedback) feedback.focus({ preventScroll: true });
  }

  function handleAction(action) {
    if (action === 'start' || action === 'restart') {
      startGame();
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

    const action = event.target.closest('[data-action]');
    if (action) handleAction(action.dataset.action);
  });

  if (!engine) {
    renderError(['Не найден движок тренажёра.']);
    return;
  }

  const errors = engine.validateScenarios(scenarios);
  if (errors.length) {
    renderError(errors);
    return;
  }

  renderStart();
})();
