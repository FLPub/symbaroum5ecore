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

  static get menuData() {
    return {
      'forceImport': {
        name: `SYB5E.menu.forceImport.name`,
        label: `SYB5E.menu.forceImport.label`,
        hint: `SYB5E.menu.forceImport.hint`,
      },

    };
  }

  static get requiredSybCoreVersion() { return game.modules.get('symbaroum5ecore').data.version };
  static get requiredDnDCoreVersion() { return '1.5.6' };

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
  } = ModuleImportDialog) {
    super({
      content: '',
      buttons: {},
    });

    // this.imported = {
    //   Actor: {},
    //   Item: {},
    //   JournalEntry: {},
    //   RollTable: {},
    //   Scene: {},
    // };

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

    /* latch current module/core version */
    this.moduleVersion = game.modules.get(this.moduleName).data.version;
    this.coreVersion = game.modules.get('symbaroum5ecore').data.version;
  }

  async render(...args) {
    // this.data.content = this.generateDialogHeader();
    const needsImport = !ModuleImportDialog.isImported(this);
    // if (needsImport) {
    //   this.data.content += this.generateDialogContent();
    // } else {
    //   const initialMigrationVersion = ModuleImportDialog.neededMigration(this);
    //   this.data.content += this.generatePatchNotes(initialMigrationVersion);
    // }

    // /* append our current module version to the provided content */
    // this.data.content += this.generateDialogFooter();

    const mode = needsImport ? 'Import' : 'Upgrade';
    // this.data.title = `${mode} ${this.moduleName}`;

    const importCallback = async () => {
      await this.checkVersion().catch(() => {
        throw console.warn('Version check failed.');
      });

      await this.prepareModule(this.adventurePack, this.adventurePackName).catch((e) => {
        let error = console.error('Failed to initialize module', e);
        throw error;
      });

      // await this.renderWelcome();

      await this.updateLastMigratedVersion();
      ui.notifications.notify('Import complete. No Issues.');
    };

    const migrateCallback = async () => {
      await this.checkVersion().catch(() => {
        throw console.warn('Version check failed.');
      });

      let migrationVersion = false;
      while ((migrationVersion = ModuleImportDialog.neededMigration(this))) {
        await this.moduleUpdate(migrationVersion, this.adventurePack, this.adventurePackName).catch((e) => {
          let error = console.error(`Failed to upgrade module to ${migrationVersion}`, e);
          throw error;
        });

        ui.notifications.notify(`Upgrade to ${migrationVersion} complete. No Issues.`);
      }
    };

    const buttons = {
      initialize: {
        label: mode,
        callback: needsImport ? importCallback : migrateCallback,
      },
    };

    this.data.buttons = buttons;

    return super.render(...args);
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
        await importer.setImportedState(false);
        return importer.render(true);
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
    ui.notifications.notify('Starting import of: ' + this.moduleTitle + '. Hold on, this could take a while...');
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
    debugger;
    // await checkVersion();
    await adventure.sheet.render(true);
    Hooks.on('importAdventure', (created, updated) => {
      if (created || updated) {
        this.setImportedState(true);
        ui.notifications.notify("Import Complete");
        return
      } else {
        ui.notifications.warn("There was a problem with the Import");
      }
    });


  };


  // async importModule(folderMapping) {
  //   const manifest = await this.readManifest();
  //   const modulePacks = (await game.modules.get(this.moduleName)?.packs) ?? [];

  //   return Promise.all(
  //     modulePacks.map(async (p) => {
  //       let moduleFolderId = '';
  //       let type = p.type;
  //       const pack = await game.packs.get(`${this.moduleName}.${p.name}`).getDocuments();

  //       if (type !== 'Playlist' && type !== 'Macro') {
  //         const moduleFolderName = folderMapping[p.label] ?? 'skipimport';
  //         if (moduleFolderName === 'skipimport') {
  //           return;
  //         }
  //         if (game.folders.getName(moduleFolderName)) {
  //           moduleFolderId = game.folders.getName(moduleFolderName);
  //         } else {
  //           moduleFolderId = await Folder.create({
  //             name: moduleFolderName,
  //             type: type,
  //             parent: null,
  //             color: manifest[type][moduleFolderName].color || null,
  //             sort: manifest[type][moduleFolderName].sort || null,
  //             sorting: manifest[type][moduleFolderName].sorting || 'a',
  //           });
  //         }
  //         const manifestEntity = manifest[type][moduleFolderName].content;
  //         await this.importFromManifest(manifestEntity, pack, type, moduleFolderId.data._id);
  //       } else if (type === 'Playlist') {
  //         const uniquePlaylists = pack.filter((p) => {
  //           if (!game.playlists.find((n) => n.data.name === p.data.name)) return p;
  //         });
  //         Playlist.create(uniquePlaylists.map((p) => p.data));
  //       } else {
  //         const uniqueMacros = pack.filter((p) => {
  //           if (!game.macros.find((n) => n.data.name === p.data.name)) return p;
  //         });
  //         Macro.create(uniqueMacros.map((p) => p.data));
  //       }
  //       return true;
  //     })
  //   );
  // }

  // async importFromManifest(manifest, pack, type, parent) {
  //   let folder = ';';
  //   if (manifest.parent) {
  //     parent = manifest.parent;
  //     delete manifest.parent;
  //   }
  //   for await (const [key, item] of Object.entries(manifest)) {
  //     if (key !== 'entities') {
  //       if (game.folders.getName(key)) {
  //         folder = game.folders.getName(key);
  //       } else {
  //         folder = await Folder.create({
  //           name: key,
  //           type: type,
  //           color: item.color,
  //           parent: parent || null,
  //           sort: item.sort || null,
  //           sorting: item.sorting || 'a',
  //         });
  //       }
  //       const pushParent = Object.values(item);
  //       await pushParent.forEach((child) => {
  //         if (child && typeof child === 'object') child.parent = folder.data._id;
  //       });
  //       await this.importFromManifest(item.content, pack, type);
  //     } else if (key === 'entities') {
  //       try {
  //         const entityData = Object.keys(item).reduce((result, identifier) => {
  //           const entity = pack.filter((e) => e.data._id === identifier);
  //           return [...result, entity[0].data];
  //         }, []);

  //         for (let index = entityData.length - 1; index >= 0; index--) {
  //           let x = entityData[index];
  //           let fred = x.document.collectionName;
  //           if (game[fred].get(x._id) != undefined) {
  //             console.log(x.name, ' Exists', fred);
  //             delete entityData[index];
  //           }
  //         }
  //         let newentityData = entityData.filter(() => true);

  //         for await (const entry of newentityData) {
  //           entry._source.folder = parent || null;
  //         }

  //         const cls = getDocumentClass(type);
  //         const createdEntities = await cls.createDocuments(newentityData, { keepId: true });
  //         if (Array.isArray(createdEntities)) {
  //           for await (const entry of createdEntities) {
  //             this.imported[type][entry.data.name] = entry;
  //           }
  //         } else {
  //           this.imported[type][createdEntities.data.name] = createdEntities;
  //         }
  //       } catch (e) {
  //         console.warn('Could not create entity: ', e);
  //       }
  //     } else {
  //       console.error("I don't understand this key: ", key);
  //     }
  //   }
  // }
  // async performFlagUpdates() {
  //   const entityTypes = ['actors', 'items', 'journal', 'scenes', 'tables'];
  //   for await (const entityType of entityTypes) {
  //     switch (entityType) {
  //       case 'scenes':
  //         // eslint-disable-next-line no-case-declarations
  //         const sceneData = [];
  //         for await (const entity of Object.values(this.imported.Scene)) {
  //           sceneData.push({
  //             _id: entity.data._id,
  //             thumb: entity.data.thumb,
  //           });
  //         }
  //         await Scene.updateDocuments(sceneData);
  //         break;
  //       case 'journal':
  //         // eslint-disable-next-line no-case-declarations
  //         const journalData = duplicate(Object.values(this.imported.JournalEntry));
  //         for (const journalEntry of journalData) {
  //           const flag = journalEntry.data?.flags[this.moduleName]?.folder.sort;
  //           if (flag) await journalEntry.updateDocuments('sort', flag);
  //         }
  //         break;
  //     }
  //   }
  // }

  async moduleUpdate(toMigrationVersion, adventurePack, adventurePackName) {
    const thisMigration = this.migrationData[toMigrationVersion] ?? { data: [] };
    debugger;
    const pack = game.packs.get(adventurePack);
    const adventureId = pack.index.find(a => a.name === adventurePackName)?._id;
    const tPack = await pack.getDocument(adventureId);
    const aPack = tPack.toObject()

    await this.getUpdateIDs(aPack, thisMigration);

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
        const u = await cls.updateDocuments(updateData, { diff: false, recursive: false, noHook: true });
        updated++;
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
    logger.info(` Updated ${updated} Asset, Created ${created} Asset`);




    await this.migrationComplete(toMigrationVersion);
  }

  async getUpdateIDs(aPack, updateAssets) {

    for (let key in updateAssets.data) {
      if (updateAssets.data.hasOwnProperty(key)) {
        if (updateAssets.data[key].action === "update") {
          const tempID = await game[updateAssets.data[key].assetType].getName(updateAssets.data[key].assetName).id;
          const tempClass = await game[updateAssets.data[key].assetType].getName(updateAssets.data[key].assetName).documentName;
          Object.assign(updateAssets.data[key], { assetID: tempID, assetClass: tempClass });
        } else {
          Object.assign(updateAssets.data[key], { assetClass: 'new' });
        }
      }
    }
    return updateAssets;
  }


  async migrationComplete(toVersion) {
    await this.updateLastMigratedVersion(toVersion);
    return new Promise((resolve) => {
      Dialog.prompt({
        title: `Ruins of Symbaroum 5e Updater`,
        content: this.generatePatchNotes(toVersion),
        label: 'Okay!',
        callback: () => {
          resolve(console.log('All Done'));
        },
      });
    });
  }

  async checkVersion() {
    const currentDnD = game.system.data.version;
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

  // async readManifest() {
  //   const r = await (await fetch(this.manifestPath)).json().catch((e) => console.warn('MANIFEST ERROR: \nYou likely have nothing in your manifest, or it may be improperly formatted.', e));
  //   return r;
  // }

  // async renderWelcome() {
  //   setTimeout(() => {
  //     try {
  //       game.scenes.getName(this.sceneToActivate)?.activate();
  //       Dialog.prompt({
  //         title: `${this.moduleTitle} Importer`,
  //         content: `<p>Welcome to the <strong>${this.moduleTitle}</strong> <br><br> All assets have been imported.`,
  //         label: 'Okay!',
  //         callback: () => game.journal.getName(this.postImportJournalName).show(),
  //       });
  //     } catch (e) {
  //       console.error("Couldn't initialize welcome: ", e);
  //     }
  //   }, 500);
  // }
}
