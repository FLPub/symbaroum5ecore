/* Code used with permission:
 *  Copyright (c) 2020-2021 DnD5e Helpers Team and Contributors
 *  Full License at "scripts/licenses/DnD5e-Helpers-LICENSE"
 */

import { COMMON } from './common.js'

export class logger {
  static NAME = this.name;

  static info(...args) {
    console.log(`${COMMON?.data?.title || "" }  | `, ...args);
  }
  static debug(...args) {
    if (COMMON.setting('debug'))
      this.info("DEBUG | ", ...args);
  }
  static error(...args) {
    console.error(`${COMMON?.data?.title || "" } | ERROR | `, ...args);
    ui.notifications.error(`${COMMON?.data?.title || "" } | ERROR | ${args[0]}`);
  }

  static notify(...args) {
    ui.notifications.notify(`${args[0]}`);
  }

  static register(){
    logger.info(COMMON.localize('SYB5E.Init.SubModule', {name: this.NAME}));
    this.settings()
  }

  static settings(){
    const config = false;
    const settingsData = {
      debug : {
        scope: "world", config, default: false, type: Boolean,
      },
    };

    COMMON.applySettings(settingsData);
  }
}
