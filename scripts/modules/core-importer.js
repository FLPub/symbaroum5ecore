import { COMMON } from './../common.js';

export class CoreImporter {
  
  static register() {
    this.hooks();
  }

  static hooks() {
    Hooks.on('sybRegisterImport', this.registerImport)
  }

  static registerImport(cls) {

    class Importer extends cls {
      static NAME = 'CoreImporter';

      /* Data override */
      static get moduleName() { return COMMON.DATA.name }

      static get moduleTitle() { return COMMON.DATA.title}
      static get sceneToActivate() { return 'System Cover'; }

      static get postImportJournalName() { return 'RoS - Core - How To Use This Module' };

      static get folderNameDict() { 
        return {
          'Symbaroum RoS - How to': 'Symbaroum RoS - How to',
          'Symbaroum RoS - GM Aids': 'Symbaroum RoS - GM Aids',
        } 
      };

      static get dialogContent() { return `
        <img src="modules/symbaroum5ecore/images/journal/symbaroum_onelayer.webp" style="height:127px; width:384px; border:0;" />
        <p><b>Initialize Symbaroum RPG - Symbaroum 5E Ruins of Symbaroum - Core System?</b><br><br>
        This will import the RoS - Core - How To Use This Module user guide</p>
        <p>
        No part of this publication may be reproduced, distributed, stored in a retrieval system, or transmitted in any form by any means, electronic, mechanical, photocopying, recording or otherwise without the prior permission of the publishers.<br><br>
              <br>
        Published by: <b>Free League Publishing</b><br>
        Foundry Conversion by <b>Matthew Haentschke and Paul Watson</b>`
      };

      constructor() {

        /* give our module specific information to the importer app */
        super(Importer);
      }

      static shouldShow() {
        return (!COMMON.setting(this.importedStateKey) || this.needsMigration(COMMON.DATA.name, this.migratedVersionKey)) && COMMON.isFirstGM();
      }

      /* @override */
      static async init() {
        /* setup config options */
        let r = document.querySelector(':root');
        await r.style.setProperty('--syb5e-pc-background-image', COMMON.setting('switchCharBGColour'));
        await r.style.setProperty('--syb5e-pc-color', COMMON.setting('charTextColour'));
        await r.style.setProperty('--syb5e-pc-font', COMMON.setting('charFontFamily'));
        await r.style.setProperty('--syb5e-pc-sheet-border', COMMON.setting('charBorder'));
        await r.style.setProperty('--syb5e-pc-item-link', COMMON.setting('charItemLink'));
        await r.style.setProperty('--syb5e-pc-tag', COMMON.setting('charTag'));
        await r.style.setProperty('--syb5e-npc-background-image', COMMON.setting('switchNpcBGColour'));
        await r.style.setProperty('--syb5e-npc-color', COMMON.setting('npcTextColour'));
        await r.style.setProperty('--syb5e-npc-font', COMMON.setting('npcFontFamily'));
        await r.style.setProperty('--syb5e-npc-sheet-border', COMMON.setting('npcBorder'));
        await r.style.setProperty('--syb5e-npc-item-link', COMMON.setting('npcItemLink'));
        await r.style.setProperty('--syb5e-npc-tag', COMMON.setting('npcTag'));

        return this.shouldShow();
      }
    }

    Importer.register();
  }

}

