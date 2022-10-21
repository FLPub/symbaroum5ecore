import { COMMON } from './../common.js';

export class CoreImporter {
  static register() {
    this.hooks();
  }

  static hooks() {
    Hooks.on('sybRegisterImport', this.registerImport);
  }

  static registerImport(cls) {
    class Importer extends cls {
      static NAME = 'CoreImporter';

      /* Data override */
      static get moduleName() {
        return COMMON.DATA.name;
      }

      static get moduleTitle() {
        return COMMON.DATA.title;
      }
      static get sceneToActivate() {
        return 'System Cover';
      }
      static get adventurePack() {
        return 'symbaroum5ecore.ruins-of-symbaroum-5e-core';
      }
      static get adventurePackName() {
        return 'Ruins of Symbaroum 5E - Core';
      }

      static get postImportJournalName() {
        return 'RoS - Core - How To Use This Module';
      }

      static get migrationData() {
        return {
        };
      }

      constructor() {
        /* give our module specific information to the importer app */
        super(Importer);
      }

      static shouldShow() {
        return (!COMMON.setting(this.importedStateKey) || this.neededMigration(COMMON.DATA.name, this.migratedVersionKey)) && COMMON.isFirstGM();
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
