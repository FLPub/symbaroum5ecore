import { COMMON } from './../../common.js';
// This object is intended to be used to convert the module pack names back to "Folder names".
// It is referenced against the manifest.json so it is important that the key is the pack name and the value is the folder name.
/**
 * @description This class is responsible for presenting a Dialog that prompts for importing the content of the modules.
 * @extends Dialog A FormApplication class in Foundry VTT responsible for creating pop-up dialogues.
 */
//TODO replace all relevant display text with localization
export class ModuleImportDialog extends Dialog {

  /* Default class data for overrides */
  static get moduleName() { return '**NONE**'; }
  static get moduleTitle() { return '**NONE**'; }
  static get sceneToActivate() { return '**NONE**'; }
  static get adventurePack() { return '**NONE**'; }
  static get adventurePackName() { return '**NONE**'; }


  static get postImportJournalName() { return '**NONE**' };
  static get importedStateKey() { return 'imported' };
  static get migratedVersionKey() { return 'migrationVersion' };
  static get migrationVersions() { return Object.keys(this.migrationData).sort() };

  /** OVERRIDE FOR IMPORTER SPECIFIC MIGRATION VERSIONS *
   /**
    * updateAssets
    * Param for number of dice to roll for each die type/rolls
    * @param {Text} assetType - Allowed Asset types : 'actors', 'items','journal' & 'scenes'
    * @param {Text} assetName - The name of the asset
    * @param {Text} action - Allowed Actions: 'update', 'delete' & 'add'
    *
    * NOTE: 'add' will not delete existing assets so they need to be deleted first if you want to replace.
    * 
    * Examples:
    * { assetType: 'actors', assetName: 'Hannah Singleton', action: 'delete' },
    * { assetType: 'actors', assetName: 'Hannah Singleton', action: 'add' },
    * { assetType: 'actors', assetName: 'Holroyd', action: 'update' },
    * { assetType: 'items', assetName: '20mm Gatling Gun', action: 'update' },
    * { assetType: 'journal', assetName: 'ALIEN RPG GM RULES INDEX', action: 'update' },
    * { assetType: 'scenes', assetName: 'Station Layout', action: 'update' },  
    *
    */

  static get migrationData() { return {} };
  static get acFolderIDs() { return {} }

  static get menuData() {
    return {
      'forceImport': {
        name: `SYB5E.menu.forceImport.name`,
        label: `SYB5E.menu.forceImport.label`,
        hint: `SYB5E.menu.forceImport.hint`,
      },

    };
  }

  static get requiredSybCoreVersion() { return game.modules.get('symbaroum5ecore').version };
  static get requiredDnDCoreVersion() { return '2.0.3' };

  constructor({
    moduleName,
    moduleTitle,
    adventurePack,
    adventurePackName,
    sceneToActivate,
    postImportJournalName,
    importedStateKey,
    migratedVersionKey,
    migrationVersions,
    migrationData,
    menuData,
    requiredSybCoreVersion,
    requiredDnDCoreVersion,
    acFolderIDs,
  } = ModuleImportDialog) {
    super({
      content: '',
      buttons: {},
    });

    /* store provided identifying information */
    this.moduleName = moduleName;
    this.moduleTitle = moduleTitle;
    this.adventurePack = adventurePack;
    this.adventurePackName = adventurePackName;
    this.importedStateKey = importedStateKey;
    this.migratedVersionKey = migratedVersionKey;
    this.migrationVersions = migrationVersions;
    this.migrationData = migrationData;
    this.menuData = menuData;
    this.sceneToActivate = sceneToActivate;
    this.postImportJournalName = postImportJournalName;
    this.requiredSybCoreVersion = requiredSybCoreVersion;
    this.requiredDnDCoreVersion = requiredDnDCoreVersion;
    this.acFolderIDs = acFolderIDs;

    /* latch current module/core version */
    this.moduleVersion = game.modules.get(this.moduleName).version;
    this.coreVersion = game.modules.get('symbaroum5ecore').version;
  }

  async importAdventure() {

    await this.checkVersion().catch(() => {
      throw console.warn('Version check failed.');
    });

    return await this.prepareModule(this.adventurePack, this.adventurePackName).catch((e) => {
      const error = console.error('Failed to initialize module', e);
      throw error;
    });


  }

  async migrateAdventure() {
    await this.checkVersion().catch(() => {
      throw console.warn('Version check failed.');
    });

    let migrationVersion = false;
    if (migrationVersion = ModuleImportDialog.neededMigration(this)) {
      this.confirmMigrate(migrationVersion, this.adventurePack, this.adventurePackName)
        .then(async () => {
          await this.moduleUpdate(migrationVersion, this.adventurePack, this.adventurePackName)
          await this.migrateAdventure();
        })
        .catch((e) => {
          //let error = new Error(`Failed to upgrade module to ${migrationVersion}`, e);
          //throw error;
          console.log(e);
        });

    }
  }

  async migrateToV10() {
    await this.checkVersion().catch(() => {
      throw console.warn('Version check failed.');
    });
    let migrationVersion = false;
    if (migrationVersion = ModuleImportDialog.neededMigration(this)) {

      this.confirmUpdate('2.0.0', this.adventurePack, this.adventurePackName)
        .then(async () => {
          await this.migrateFolders(this.moduleName, this.moduleTitle, this.adventurePack, this.adventurePackName);
          await this.moduleUpdate(migrationVersion, this.adventurePack, this.adventurePackName);
          await this.migrateAdventure();
        })
        .catch((e) => {
          //let error = new Error(`Failed to upgrade module to ${updateVersion}`, e);
          //throw error;
          console.log(e);
        });
    }
  }

  /** @todo no longer a render override */
  async render() {
    const needsImport = !ModuleImportDialog.isImported(this);

    if (needsImport) return this.importAdventure();
    else if (game.settings.get(this.moduleName, 'migrationVersion') < '2.0.0') {
      return this.migrateToV10();
    } else return this.migrateAdventure();
  }

  static register() {
    this.settings();
    this.hooks();
  }

  static hooks() {
    Hooks.on('sybRunImport', this._init.bind(this));
  }

  static settings() {
    COMMON.applySettings(this.getSettingsData(), this.moduleName);
    const callerClass = this;
    class formAppWrapper extends FormApplication {
      async render() {
        const importer = new callerClass()
        return importer.ReImport();
      }
    }

    Object.entries(this.menuData).forEach(([key, value]) => {
      game.settings.registerMenu(this.moduleName, key, {
        ...value,
        name: COMMON.localize(value.name),
        hint: COMMON.localize(value.hint),
        label: COMMON.localize(value.label),
        type: formAppWrapper,
        restricted: true,
      });
    });
  }

  static get utils() {
    return {
      isFirstGM: COMMON.isFirstGM,
    };
  }

  static isImported({ moduleName = this.moduleName, importedStateKey = this.importedStateKey } = {}) {
    return game.settings.get(moduleName, importedStateKey);
  }

  static isMigrated({ moduleName = this.moduleName, migratedVersionKey = this.migratedVersionKey, migrationVersions = this.migrationVersions }) {
    return !ModuleImportDialog.neededMigration({ moduleName, migratedVersionKey, migrationVersions });
  }

  /* OVERRIDE FOR INITIALIZATION TASKS */
  /* return {Boolean} should this import dialog be shown? */
  static async init() {
    return (!this.isImported(this) || !this.isMigrated(this)) && this.utils.isFirstGM();
  }

  /* OVERRIDE FOR IMPORTER SPECIFIC SETTINGS */
  static getSettingsData() {
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
        default: '0.0.0',
      },
    };

    return settingsData;
  }

  generateDialogContent() { return '' };

  generateDialogHeader() {
    return `<img src="modules/symbaroum5ecore/images/journal/symbaroum_onelayer.webp" style="height:127px; width:384px; border:0;" alt="" />`;
  }

  generateDialogFooter() {
    return `<br><br>No part of this publication may be reproduced, distributed, stored in a retrieval system, or transmitted in any form by any means, electronic, mechanical, photocopying, recording or otherwise without the prior permission of the publishers.<br><br>
            Published by: <b>Free League Publishing</b><br>
            Foundry Conversion by <b>Matthew Haentschke and Paul Watson</b><br>
            <a href="https://frialigan.se/">Free League</a> <br><br>
      Module Version: ${this.moduleVersion}
      <br><br>`;
  }

  generatePatchNotes(migrationVersion) {
    return `
      <h2> <b>${this.moduleTitle} Update v${migrationVersion}</b></h2>
      This script will correct the following issues:
      <ul>
      ${this.migrationData[migrationVersion].notes.reduce((acc, curr) => {
      acc += `<li>${curr}</li>`;
      return acc;
    }, '')}
      </ul>
      <br>
      If maps are active or contain tokens,lights or notes they will not be replaced as I don't want to overwrite any work you have done. <br>
      You will need to import these manually when convenient.`;
  }

  static neededMigration({ moduleName = this.moduleName, migratedVersionSetting = this.migratedVersionKey, migrationVersions = this.migrationVersions }) {
    const lastMigratedVersion = game.settings.get(moduleName, migratedVersionSetting);
    const neededMigrationVersions = migrationVersions;

    const needsMigration = neededMigrationVersions.find((version) => isNewerVersion(version, lastMigratedVersion));
    logger.debug(`${moduleName} ${!!needsMigration ? 'requires migration to ' + needsMigration : 'does not require migration'} (last migrated version: ${lastMigratedVersion})`);
    return needsMigration ?? false;
  }

  static async _init() {
    const render = await this.init.call(this);
    if (render) {
      return new this().render(true);
    }
  }

  async setImportedState(bool) {
    await game.settings.set(this.moduleName, this.importedStateKey, bool);
  }

  async updateLastMigratedVersion(version = undefined) {

    if (!version) {
      /* find the most recent migration version in the data and use that */
      version = this.migrationVersions.reduce((acc, current) => {
        if (isNewerVersion(current, acc)) acc = current;
        return acc;
      }, '0.0.0');
    }

    await game.settings.set(this.moduleName, this.migratedVersionKey, version);
  }

  async prepareModule(adventurePack, adventurePackName) {
    console.warn('Starting import of: ', this.moduleTitle);
    await this.ModuleImport(adventurePack, adventurePackName);
  }


  async ModuleImport(adventurePack, adventurePackName) {
    //
    // Imports all assets in the Adventure Collection.  
    // Will overwrite existing assets. 
    //
    const pack = game.packs.get(adventurePack);
    const adventureId = pack.index.find(a => a.name === adventurePackName)?._id;
    logger.info(`For ${adventurePackName} the Id is: ${adventureId}`)
    const adventure = await pack.getDocument(adventureId);
    // debugger;
    // await checkVersion();
    await adventure.sheet.render(true);
    Hooks.on('importAdventure', (created, updated) => {
      if (adventure.name === adventurePackName) {
        if (created || updated) {
          this.setImportedState(true);
          this.updateLastMigratedVersion();
          ui.notifications.notify('Import complete. No Issues.');
          game.journal.getName(this.postImportJournalName).show()
          return
        } else {
          ui.notifications.warn("There was a problem with the Import");
        }
      }
    });


  }


  async moduleUpdate(toMigrationVersion, adventurePack, adventurePackName) {
    const thisMigration = this.migrationData[toMigrationVersion] ?? { data: [] };
    const pack = game.packs.get(adventurePack);
    const adventureId = pack.index.find(a => a.name === adventurePackName)?._id;
    const tPack = await pack.getDocument(adventureId);
    const aPack = tPack.toObject()
    this.updateAssetIDs(thisMigration);

    const toUpdate = {};
    const toCreate = {};
    let created = 0;
    let updated = 0;

    for (const [field, cls] of Object.entries(Adventure.contentFields)) {
      const newUpdate = [];
      const newAdd = [];
      for (const { assetType, assetName, action, assetID, assetClass } of thisMigration.data) {
        if (assetClass === cls.documentName || assetClass === 'new') {
          switch (action) {
            case 'delete':
              try {
                const isThere = game[assetType].getName(assetName);
                if (isThere) {
                  console.log('It Exists');
                  await isThere.delete({ deleteSubfolders: true, deleteContents: true });
                }
              } catch (error) {
                console.warn(`${assetName} already deleted`);
              }
              break;
            case 'add':
              if (!game[assetType].getName(assetName)) {
                const [c] = aPack[field].partition(d => d.name != assetName);
                if (c.length) {
                  newAdd.push(c[0]);
                }
              } else {
                console.warn(`${assetName} ${assetType} Exists so no overwrite.  Delete first!`);
                // Uncomment the next line if you want a distructive add.
                // await assetName.delete({ deleteSubfolders: true, deleteContents: true });
              }

              break;
            case 'update':
              const [u] = aPack[field].partition(d => d._id != assetID);
              if (u.length) {
                newUpdate.push(u[0]);
              }
              break;
            default:
              break;
          }
        }
      }
      // Now create the update entries for that asset class.
      if (newAdd.length) {
        toCreate[cls.documentName] = newAdd;
      }
      if (newUpdate.length) {
        toUpdate[cls.documentName] = newUpdate;
      }
    }


    //
    // Now update any assets.
    //
    if (toUpdate) {
      for (const [documentName, updateData] of Object.entries(toUpdate)) {
        const cls = getDocumentClass(documentName);
        await cls.updateDocuments(updateData, { diff: false, recursive: false, noHook: true });
        updated++;
      }
    }

    //
    // Now create any new assets
    //

    if (toCreate) {
      for (const [documentName, createData] of Object.entries(toCreate)) {
        const cls = getDocumentClass(documentName);
        await cls.createDocuments(createData, { keepId: true, keepEmbeddedId: true, renderSheet: false });
        created++;
      }
    }
    logger.info(` Updated ${updated} Asset, Created ${created} Asset`);

    await this.updateLastMigratedVersion(toMigrationVersion);
    ui.notifications.info(`Migration to v${toMigrationVersion} complete`);
    return;
  }

  async updateAssetIDs(updateAssets) {

    for (let key in updateAssets.data) {
      if (updateAssets.data.hasOwnProperty(key)) {
        if (updateAssets.data[key].action === "update") {
          const tempID = game[updateAssets.data[key].assetType].getName(updateAssets.data[key].assetName).id;
          const tempClass = game[updateAssets.data[key].assetType].getName(updateAssets.data[key].assetName).documentName;
          Object.assign(updateAssets.data[key], { assetID: tempID, assetClass: tempClass });
        } else {
          Object.assign(updateAssets.data[key], { assetClass: 'new' });
        }
      }
    }
  }


  async confirmMigrate() {
    return Dialog.prompt({
      title: `Ruins of Symbaroum 5e Updater`,
      content: 'V9 to V10 Migration',
      label: 'Okay!',
      rejectClose: true,
    });
  }

  async confirmUpdate(toVersion) {
    return Dialog.prompt({
      title: `Ruins of Symbaroum 5e Updater`,
      content: this.generatePatchNotes(toVersion),
      label: 'Okay!',
      rejectClose: true,
    });
  }

  async checkVersion() {
    const currentDnD = game.system.version;
    if (isNewerVersion(this.requiredDnDCoreVersion, currentDnD)) {
      throw Dialog.prompt({
        title: 'Version Check',
        content: `<h2>Failed to Import</h2><p>Your DnD5e - Fith Edition System system version (${current})is below the minimum required version (${this.requiredDnDCoreVersion}).</p><p>Please update your system before proceeding.</p>`,
        label: 'Okay!',
        callback: () => ui.notifications.warn('Aborted importing of compendium content. Update your dnd5e system and try again.'),
      });
    }

    if (isNewerVersion(this.requiredSybCoreVersion, this.coreVersion)) {
      throw Dialog.prompt({
        title: 'Version Check',
        content: `<h2>Failed to Import</h2><p>Your Symbaroum 5e Core system version (${this.coreVersion})is below the minimum required version (${this.requiredSybCoreVersion}).</p><p>Please update before proceeding.</p>`,
        label: 'Okay!',
        callback: () => ui.notifications.warn('Aborted importing of compendium content. Update your Symbaroum 5e Core module and try again.'),
      });
    }
  }


  async ReImport(adventurePack = this.adventurePack, adventurePackName = this.adventurePackName) {
    //
    // Non distructive import that only imports assets missing in the world. 
    //
    const pack = game.packs.get(adventurePack);
    const adventureId = pack.index.find(a => a.name === adventurePackName)?._id;
    logger.info(`For ${adventurePackName} the Id is: ${adventureId}`)
    const adventure = await pack.getDocument(adventureId);
    const adventureData = adventure.toObject();
    const toCreate = {};
    let created = 0;

    for (const [field, cls] of Object.entries(Adventure.contentFields)) {
      const collection = game.collections.get(cls.documentName);
      const [c] = adventureData[field].partition(d => collection.has(d._id));
      if (c.length) {
        toCreate[cls.documentName] = c;
        created += c.length;
      }
    }

    //
    // Now create any new assets
    //

    if (toCreate) {
      for (const [documentName, createData] of Object.entries(toCreate)) {
        const cls = getDocumentClass(documentName);
        await cls.createDocuments(createData, { keepId: true, keepEmbeddedId: true, renderSheet: false });
        created++;
      }
    }
    ui.notifications.warn(`Re-Import Completed Created ${created} Assets`);

    logger.info(` Created ${created} Assets`);
  };

  async migrateFolders(moduleName, moduleTitle, adventurePack = this.adventurePack, adventurePackName = this.adventurePackName, acFolderIDs = this.acFolderIDs) {

    ui.notifications.warn(`PG Starting Upgrade`);

    // Get the existing folder contents and save
    let folderAssetIds = [];
    let updateAsset;
    let folderDeletes = [];

    for (const { folderName, folderID } of acFolderIDs) {
      game.folders.contents.filter(a => {
        if (a.name === folderName && a.id !== folderID) {
          // console.log(a);
          folderAssetIds.push([a.name, a.id, a.contents, a.type]);
        }
      });
    };
    // Now work out what is installed and run the adventure import to get the proper folder structure and import deleted assets
    await ReImportFolders(adventurePack, adventurePackName, moduleTitle);

    // Now go through the old asset list and move the asssets to the correct new folders
    folderAssetIds.forEach(fName => {
      for (const { folderName, folderID } of acFolderIDs) {
        if (folderName === fName[0]) {
          fName[2].forEach(iName => {
            switch (fName[3]) {
              case 'JournalEntry':
                updateAsset = game.journal.get(iName.id);
                updateAsset.update({ folder: folderID });
                break;
              case 'Actor':
                updateAsset = game.actors.get(iName.id);
                updateAsset.update({ folder: folderID });
                break;
              case 'Item':
                updateAsset = game.items.get(iName.id);
                updateAsset.update({ folder: folderID });
                break;
              case 'Scene':
                updateAsset = game.scenes.get(iName.id);
                updateAsset.update({ folder: folderID });
                break;
              case 'RollTable':
                updateAsset = game.tables.get(iName.id);
                updateAsset.update({ folder: folderID });
                break;
              default:
                break;
            }
          });
        }
      };
      // store the old folder ID's we want to delete
      folderDeletes.push(fName[1])
    });

    // delete the old folders
    await Folder.deleteDocuments(folderDeletes);

    logger.info(`Asset Moves Completed`);

    // Cleanup old odd folders and journals if necessary
    // await deleteCoreFolders()

    // Refresh sidebar
    ui.sidebar.render();
    logger.warn('Status: Upgrade Completed');


    async function ReImportFolders(adventurePack, adventurePackName, moduleTitle) {
      //
      // Non distructive import that only imports assets missing in the world. 
      //
      const pack = game.packs.get(adventurePack);
      const adventureId = pack.index.find(a => a.name === adventurePackName)?._id;
      logger.info(`For ${adventurePackName} the Id is: ${adventureId}`)
      const adventure = await pack.getDocument(adventureId);
      const adventureData = adventure.toObject();
      const toCreate = {};
      let created = 0;

      for (const [field, cls] of Object.entries(Adventure.contentFields)) {
        const newUpdate = [];
        const newAdd = [];
        const collection = game.collections.get(cls.documentName);
        const [c, u] = adventureData[field].partition(d => collection.has(d._id));
        if (c.length) {
          toCreate[cls.documentName] = c;
          created += c.length;
        }
      }

      //
      // Now create any new assets
      //

      if (toCreate) {
        for (const [documentName, createData] of Object.entries(toCreate)) {
          const cls = getDocumentClass(documentName);
          const c = await cls.createDocuments(createData, { keepId: true, keepEmbeddedId: true, renderSheet: false });
          created++;
        }
      }
      ui.notifications.warn(`${moduleTitle} Upgrade Re-Import Completed Created ${created} Assets`);

      logger.info(`Created ${created} Assets`);
      return;
    };
  }
}
