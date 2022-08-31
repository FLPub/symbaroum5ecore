import { COMMON } from '../common.js'
import { ModuleImportDialog } from './apps/import-dialog.js';
import { logger } from './../logger.js'

export class ImporterBase {

  static register() {
    this.globals();
    this.hooks();
  }

  static globals() {
    COMMON.addAbstract(ModuleImportDialog, 'ImporterBase')
  }

  static hooks() {
    Hooks.on('ready', this._callRegistrations)
  }

  static async callHook(hook, ...args) {
    if ( CONFIG.debug.hooks ) {
      logger.info(`Calling ${hook} hook with args:`);
      logger.info(args);
    }

    return Hooks.callAll(hook, ...args);
  }

  static _callRegistrations() {
    Hooks.call('sybRegisterImport', globalThis.game.syb5e.abstract.ImporterBase);
    return ImporterBase.callHook('sybRunImport');
  }
}
