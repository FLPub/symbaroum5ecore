import { ModuleImportDialog } from './apps/import-dialog.js'
import { COMMON } from './../common.js'

export class Importer extends ModuleImportDialog {
  static NAME = 'Importer';
  static importedStateKey = 'imported'
  static migratedVersionKey = 'migrationVersion'

  constructor() {
    /* give our module specific information to the importer app */
    super({
      moduleName: COMMON.DATA.name,
      moduleTitle: COMMON.DATA.title,
      sceneToActivate: 'System Cover',
      postImportJournalName: 'RoS - Core - How To Use This Module',
      importedStateKey: Importer.importedStateKey,
      migratedVersionKey: Importer.migratedVersionKey,
      requiredDnDCoreVersion: '1.5.6',
      folderNameDict: {
        'Symbaroum RoS - How to': 'Symbaroum RoS - How to',
        'Symbaroum RoS - GM Aids': 'Symbaroum RoS - GM Aids',
      },
      dialogContent: `<img src="modules/symbaroum5ecore/images/journal/symbaroum_onelayer.webp" style="height:127px; width:384px; border:0;" />
      <p><b>Initialize Symbaroum RPG - Symbaroum 5E Ruins of Symbaroum - Core System?</b><br><br>
      This will import the RoS - Core - How To Use This Module user guide</p>
      <p>
      No part of this publication may be reproduced, distributed, stored in a retrieval system, or transmitted in any form by any means, electronic, mechanical, photocopying, recording or otherwise without the prior permission of the publishers.<br><br>
            <br>
      Published by: <b>Free League Publishing</b><br>
      Foundry Conversion by <b>Matthew Haentschke and Paul Watson</b>`,
    });
  }

  static shouldShow() {
    return (!COMMON.setting(this.importedStateKey) || this.needsMigration(COMMON.DATA.name, this.migratedVersionKey) ) &&
      COMMON.isFirstGM();
  }

  /* @override */
  static get settingsData() {
    const settingsData = {
      [this.importedStateKey]: {
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
      },
      [this.migratedVersionKey]: {
        scope: 'world',
        config: false,
        type: String,
        default: "0.0.0"
      }
    }

    return settingsData;
  }

  /* @override */
  static get migrationVersions() {
    return [];
  }

  /* @override */
  static async init() {
    /* setup config options */
    let r = document.querySelector(':root');
    await r.style.setProperty('--syb5e-pc-background-image', COMMON.setting('switchCharBGColour'));
    await r.style.setProperty('--syb5e-pc-color', COMMON.setting('charTextColour'));
    await r.style.setProperty('--syb5e-pc-font', COMMON.setting('fontFamily'));
    await r.style.setProperty('--syb5e-pc-sheet-border', COMMON.setting('charBorder'));
    await r.style.setProperty('--syb5e-pc-item-link', COMMON.setting('charItemLink'));
    await r.style.setProperty('--syb5e-pc-tag', COMMON.setting('charTag'));
    await r.style.setProperty('--syb5e-npc-background-image', COMMON.setting('switchNpcBGColour'));
    await r.style.setProperty('--syb5e-npc-color', COMMON.setting('npcTextColour'));
    await r.style.setProperty('--syb5e-npc-font', COMMON.setting('fontFamily'));
    await r.style.setProperty('--syb5e-npc-sheet-border', COMMON.setting('npcBorder'));
    await r.style.setProperty('--syb5e-npc-item-link', COMMON.setting('npcItemLink'));
    await r.style.setProperty('--syb5e-npc-tag', COMMON.setting('npcTag'));

    return this.shouldShow();
  }

}
