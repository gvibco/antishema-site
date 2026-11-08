(function (global) {
  'use strict';

  const TYPES = ['dialog', 'recognize'];

  function createGame(scenarios) {
    return {
      index: 0,
      answers: [],
      score: 0,
      finished: scenarios.length === 0,
      total: scenarios.length,
    };
  }

  function submitAnswer(game, scenarios, choiceId) {
    if (game.finished) return null;

    const scenario = scenarios[game.index];
    if (!scenario) return null;

    const choice = scenario.choices.find((item) => item.id === choiceId);
    if (!choice) return null;

    const correct = choice.correct === true;
    const nextIndex = game.index + 1;

    return {
      game: {
        index: nextIndex,
        answers: game.answers.concat({
          scenarioId: scenario.id,
          choiceId: choice.id,
          correct,
        }),
        score: game.score + (correct ? 1 : 0),
        finished: nextIndex >= scenarios.length,
        total: scenarios.length,
      },
      correct,
      explanation: scenario.explanation,
      rule: scenario.rule,
      correctChoiceId: scenario.choices.find((item) => item.correct).id,
    };
  }

  function getResult(game) {
    const total = game.total;
    const score = game.score;
    const percent = total === 0 ? 0 : Math.round((score / total) * 100);

    if (percent === 100) {
      return {
        score,
        total,
        percent,
        level: 'expert',
        title: 'Защитник',
        message: 'Отличный результат! Ты видишь уловки мошенников и знаешь, как действовать безопасно.',
      };
    }

    if (percent >= 66) {
      return {
        score,
        total,
        percent,
        level: 'confident',
        title: 'Уверенный пользователь',
        message: 'Хороший результат. Осталось закрепить пару правил — и будешь готов к любой схеме.',
      };
    }

    if (percent >= 34) {
      return {
        score,
        total,
        percent,
        level: 'learner',
        title: 'Начинающий защитник',
        message: 'Ты уже замечаешь часть ловушек. Пройди тренажёр ещё раз и запомни красные флаги.',
      };
    }

    return {
      score,
      total,
      percent,
      level: 'risk',
      title: 'Нужна тренировка',
      message: 'Мошенники часто давят на страх и спешку. Перечитай памятку и попробуй снова.',
    };
  }

  function validateScenarios(scenarios) {
    const errors = [];

    if (!Array.isArray(scenarios) || scenarios.length < 5) {
      errors.push('Нужно минимум 5 сценариев.');
    }

    if (!Array.isArray(scenarios)) return errors;

    const ids = new Set();

    scenarios.forEach((scenario, index) => {
      const label = scenario && scenario.id ? scenario.id : `#${index + 1}`;

      if (!scenario || typeof scenario !== 'object') {
        errors.push(`Сценарий ${label}: должен быть объектом.`);
        return;
      }

      if (!scenario.id) {
        errors.push(`Сценарий ${label}: отсутствует id.`);
      } else if (ids.has(scenario.id)) {
        errors.push(`Сценарий ${label}: id повторяется.`);
      } else {
        ids.add(scenario.id);
      }

      if (!TYPES.includes(scenario.type)) {
        errors.push(`Сценарий ${label}: неизвестный тип задания.`);
      }

      if (!scenario.title) {
        errors.push(`Сценарий ${label}: отсутствует заголовок.`);
      }

      if (!Array.isArray(scenario.choices) || scenario.choices.length < 2) {
        errors.push(`Сценарий ${label}: нужно минимум два варианта ответа.`);
      } else if (scenario.choices.filter((choice) => choice.correct === true).length !== 1) {
        errors.push(`Сценарий ${label}: нужен ровно один правильный ответ.`);
      }

      if (!scenario.explanation) {
        errors.push(`Сценарий ${label}: отсутствует объяснение.`);
      }

      if (!scenario.redFlag) {
        errors.push(`Сценарий ${label}: отсутствует красный флаг.`);
      }

      if (!scenario.rule) {
        errors.push(`Сценарий ${label}: отсутствует правило.`);
      }

      if (scenario.type === 'dialog' && (!Array.isArray(scenario.messages) || scenario.messages.length === 0)) {
        errors.push(`Сценарий ${label}: в диалоге нет сообщений.`);
      }

      if (scenario.type === 'recognize' && !scenario.message) {
        errors.push(`Сценарий ${label}: нет сообщения для распознавания.`);
      }
    });

    return errors;
  }

  const api = { createGame, submitAnswer, getResult, validateScenarios };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.AntiSchemaEngine = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
