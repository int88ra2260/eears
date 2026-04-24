'use strict';

/**
 * Learning Journey v3 聚合 read model（唯讀）。
 * 內部實作於 learningJourney/aggregateReadModelService.js；
 * 舊版 learningJourney/learningJourneyService.js 仍供 migration script／rebuild-cache 使用。
 */
module.exports = require('./learningJourney/aggregateReadModelService');
