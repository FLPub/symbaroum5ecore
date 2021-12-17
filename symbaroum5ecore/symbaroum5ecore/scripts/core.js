/* Structure and portions of code used with permission:
 *  Copyright (c) 2020-2021 DnD5e Helpers Team and Contributors
 *  Full License at "scripts/licenses/DnD5e-Helpers-LICENSE"
 */

/**
 * Main Module Organizational Tools
 */
import { COMMON } from './common.js';
import { logger } from './logger.js';
import { SheetCommon, Syb5eActorSheetCharacter, Syb5eActorSheetNPC } from './modules/actor-sheet.js'
import { Syb5eItemSheet } from './modules/item-sheet.js'
import { SYB5E } from './config.js'

/**
 * Sub Modules
 */

/**
 * Sub Apps
 */

const SUB_MODULES = {
  COMMON,
  SYB5E,
  logger,
  SheetCommon,
  Syb5eActorSheetCharacter,
  Syb5eActorSheetNPC,
  Syb5eItemSheet
}

const SUB_APPS = {
}

/*
  Initialize Module
*/
COMMON.build();

/*
  Initialize all Sub Modules
*/
Hooks.on(`setup`, () => {
  Object.values(SUB_MODULES).forEach(cl => cl.register());

  //GlobalTesting
  Object.entries(SUB_MODULES).forEach(([key, cl])=> window[key] = cl);
  //Object.entries(SUB_APPS).forEach(([key, cl])=> window[key] = cl);
});
