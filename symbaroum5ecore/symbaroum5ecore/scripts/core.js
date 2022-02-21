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
import { Spellcasting } from './modules/spellcasting.js'
import { Resting } from './modules/resting.js'
import { ActorSyb5e } from './modules/actor.js'
import { ItemSyb5e } from './modules/item.js'

import { SybRestDialog } from './modules/apps/syb-rest-dialog.js'
import { SybConfigApp } from './modules/apps/config-app.js'

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
  ActorSyb5e,
  ItemSyb5e,
  SheetCommon,
  Syb5eActorSheetCharacter,
  Syb5eActorSheetNPC,
  Syb5eItemSheet,
  Spellcasting,
  Resting
}

const SUB_APPS = {
  SybRestDialog
}

/*
  Initialize Module
*/
COMMON.build();

/*
  Initialize all Sub Modules
*/
Hooks.on('setup', () => {
  Object.values(SUB_MODULES).forEach( (cl) => {
    logger.info(COMMON.localize('SYB5E.Init.SubModule', {name: cl.NAME}));
    cl.register();
  });

  //GlobalTesting
  //Object.entries(SUB_MODULES).forEach(([key, cl])=> window[key] = cl);
  //Object.entries(SUB_APPS).forEach(([key, cl])=> window[key] = cl);
});
