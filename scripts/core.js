/* Structure and portions of code used with permission:
 *  Copyright (c) 2020-2021 DnD5e Helpers Team and Contributors
 *  Full License at "scripts/licenses/DnD5e-Helpers-LICENSE"
 */

/**
 * Main Module Organizational Tools
 */
import { COMMON } from './common.js';
import { logger } from './logger.js';
import { LibWrapperShim } from './libraries/LibWrapper/shim.js'
import { SheetCommon } from './modules/actor-sheet.js'
import { Syb5eItemSheet } from './modules/item-sheet.js'
import { SYB5E } from './config.js'
import { Spellcasting } from './modules/spellcasting.js'
import { Resting } from './modules/resting.js'
import { ActorSyb5e } from './modules/actor.js'
import { ItemSyb5e } from './modules/item.js'
import { DamageRollSyb5e } from './modules/damage-roll.js'
import { ImporterBase } from './modules/importer-base.js'
import { CoreImporter } from './modules/core-importer.js'
import { SymbaroumWide } from './modules/journal.js';

/**
 * Sub Modules
 */

/**
 * Sub Apps
 */
const SUB_MODULES = {
  LibWrapperShim,
  COMMON,
  SYB5E,
  logger,
  SheetCommon,
  ActorSyb5e,
  ItemSyb5e,
  Syb5eItemSheet,
  Spellcasting,
  Resting,
  DamageRollSyb5e,
  SymbaroumWide,
  ImporterBase,
  CoreImporter
}

Hooks.on('init', () => {

  /*
  Initialize Module
  */
  const validBuild = COMMON.build();

  if (!validBuild) return;

  /*
  Initialize all Sub Modules
  */
  Object.values(SUB_MODULES).forEach((cl) => {
    logger.info(COMMON.localize('SYB5E.Init.SubModule', { name: cl.NAME }));
    cl.register();
  });

});
