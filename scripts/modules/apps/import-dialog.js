import { COMMON } from './../../common.js';
// This object is intended to be used to convert the module pack names back to "Folder names".
// It is referenced against the manifest.json so it is important that the key is the pack name and the value is the folder name.
/**
 * @description This class is responsible for presenting a Dialog that prompts for importing the content of the modules.
 * @extends Dialog A FormApplication class in Foundry VTT responsible for creating pop-up dialogues.
 */
//TODO replace all relevant display text with localization
export class ModuleImportDialog extends Dialog {

  constructor({
    moduleName,
    moduleTitle,
    sceneToActivate,
    postImportJournalName,
    importedStateKey,
    migratedVersionKey,
    requiredSybCoreVersion = game.modules.get('symbaroum5ecore').data.version,
    requiredDnDCoreVersion,
    manifestPath = `modules/${moduleName}/manifests/manifest.json`,
    folderNameDict = {},
    dialogContent,
  }) {
    super({
      content: dialogContent,
      buttons: {
        initialize: {
          label: 'Import',
          callback: async () => {
            await this.checkVersion().catch(() => {
              throw console.warn('Version check failed.');
            });
            // await this.checkStarterSet();
            await this.prepareModule().catch((e) => {
              let error = console.error('Failed to initialize module', e);
              throw error;
            });
            await this.renderWelcome();
            await this.setImportedState(true);
            await this.updateLastMigratedVersion();
            ui.notifications.notify('Import complete. No Issues.');
          },
        },
        cancel: {
          label: 'Cancel',
          callback: async () => {
            await this.setImportedState(true);
            ui.notifications.notify("Canceled importing content. You can always import the compendiums through the Module's settings menu.");
          },
        },
      },
    });
    this.imported = {
      Actor: {},
      Item: {},
      JournalEntry: {},
      RollTable: {},
      Scene: {},
    };

    /* store provided identifying information */
    this.moduleName = moduleName;
    this.moduleTitle = moduleTitle;
    this.importedStateKey = importedStateKey;
    this.migratedVersionKey = migratedVersionKey;
    this.sceneToActivate = sceneToActivate;
    this.postImportJournalName = postImportJournalName;
    this.requiredSybCoreVersion = requiredSybCoreVersion;
    this.requiredDnDCoreVersion = requiredDnDCoreVersion;
    this.manifestPath = manifestPath;
    this.folderNameDict = folderNameDict;

    /* latch current module/core version */
    this.moduleVersion = game.modules.get(this.moduleName).data.version;
    this.coreVersion = game.modules.get('symbaroum5ecore').data.version;

    /* append our current module version to the provided content */
    this.data.content += `
    <br><a href="https://frialigan.se/">Free League</a> <br><br>
      Module Version: ${this.moduleVersion}
      <br><br>`;

    this.data.title = `Import ${this.moduleTitle}`

  }

  static register() {
    this.settings();
    this.hooks();
  }

  static hooks() {
    Hooks.on('ready', this._init.bind(this))
  }

  static settings() {
    COMMON.applySettings(this.settingsData);
  }

  /* OVERRIDE FOR INITIALIZATION TASKS */
  /* return {Boolean} should this import dialog be shown? */
  static async init() {
    return false;
  }

  /* OVERRIDE FOR IMPORTER SPECIFIC SETTINGS */
  static get settingsData() {
    return {}
  }

  /* OVERRIDE FOR VERSIONS REQUIRING REFRESHED IMPORT */
  static get migrationVersions() {
    return [];
  }

  static needsMigration(moduleName, migratedVersionSetting) {
    const lastMigratedVersion = game.settings.get(moduleName, migratedVersionSetting);
    const neededMigrationVersions = this.migrationVersions;

    const needsMigration = neededMigrationVersions.find( version => isNewerVersion(version, lastMigratedVersion) )
    logger.debug(`${moduleName} ${!!needsMigration ? 'requires migration to '+needsMigration : 'does not require migration'} (last migrated version: ${lastMigratedVersion})`)
    return !!needsMigration;
  }

  static async _init() {
    const render = await this.init();
    if (render) {
      return new this().render(true);
    }
  }

  async setImportedState(bool) {
    await game.settings.set(this.moduleName, this.importedStateKey, bool);
  }

  async updateLastMigratedVersion() {
    await game.settings.set(this.moduleName, this.migratedVersionKey, this.moduleVersion);
  }

  async prepareModule() {
    const manifest = await this.readManifest();
    const modulePacks = await game.modules.get(this.moduleName)?.packs ?? []
    console.warn('Starting import of: ', this.moduleTitle);
    ui.notifications.notify('Starting import of: ' + this.moduleTitle + '. Hold on, this could take a while...');
    await this.importModule(manifest, modulePacks);
  }

  async importModule(manifest, modulePacks) {
    return Promise.all(
      modulePacks.map(async (p) => {
        let moduleFolderId = '';
        let type = p.type;
        const pack = await game.packs.get(`${this.moduleName}.${p.name}`).getDocuments();

        if (type !== 'Playlist' && type !== 'Macro') {
          const moduleFolderName = this.folderNameDict[p.label];
          if (moduleFolderName === 'skipimport') {
            return;
          }
          if (game.folders.getName(moduleFolderName)) {
            moduleFolderId = game.folders.getName(moduleFolderName);
          } else {
            moduleFolderId = await Folder.create({
              name: moduleFolderName,
              type: type,
              parent: null,
              color: manifest[type][moduleFolderName].color || null,
              sort: manifest[type][moduleFolderName].sort || null,
              sorting: manifest[type][moduleFolderName].sorting || 'a',
            });
          }
          const manifestEntity = manifest[type][moduleFolderName].content;
          await this.importFromManifest(manifestEntity, pack, type, moduleFolderId.data._id);
        } else if (type === 'Playlist') {
          const uniquePlaylists = pack.filter((p) => {
            if (!game.playlists.find((n) => n.data.name === p.data.name)) return p;
          });
          Playlist.create(uniquePlaylists.map((p) => p.data));
        } else {
          const uniqueMacros = pack.filter((p) => {
            if (!game.macros.find((n) => n.data.name === p.data.name)) return p;
          });
          Macro.create(uniqueMacros.map((p) => p.data));
        }
        return true;
      })
    );
  }

  async importFromManifest(manifest, pack, type, parent) {
    let folder = ';';
    if (manifest.parent) {
      parent = manifest.parent;
      delete manifest.parent;
    }
    for await (const [key, item] of Object.entries(manifest)) {
      if (key !== 'entities') {
        if (game.folders.getName(key)) {
          folder = game.folders.getName(key);
        } else {
          folder = await Folder.create({
            name: key,
            type: type,
            color: item.color,
            parent: parent || null,
            sort: item.sort || null,
            sorting: item.sorting || 'a',
          });
        }
        const pushParent = Object.values(item);
        await pushParent.forEach((child) => {
          if (child && typeof child === 'object') child.parent = folder.data._id;
        });
        await this.importFromManifest(item.content, pack, type);
      } else if (key === 'entities') {
        try {
          const entityData = Object.keys(item).reduce((result, identifier) => {
            const entity = pack.filter((e) => e.data._id === identifier);
            return [...result, entity[0].data];
          }, []);

          for (let index = entityData.length - 1; index >= 0; index--) {
            let x = entityData[index];
            let fred = x.document.collectionName;
            if (game[fred].get(x._id) != undefined) {
              console.log(x.name, ' Exists', fred);
              delete entityData[index];
            }
          }
          let newentityData = entityData.filter(() => true);

          for await (const entry of newentityData) {
            entry._source.folder = parent || null;
          }

          const cls = getDocumentClass(type);
          const createdEntities = await cls.createDocuments(newentityData, { keepId: true });
          if (Array.isArray(createdEntities)) {
            for await (const entry of createdEntities) {
              this.imported[type][entry.data.name] = entry;
            }
          } else {
            this.imported[type][createdEntities.data.name] = createdEntities;
          }
        } catch (e) {
          console.warn('Could not create entity: ', e);
        }
      } else {
        console.error("I don't understand this key: ", key);
      }
    }
  }
  async performFlagUpdates() {
    const entityTypes = ['actors', 'items', 'journal', 'scenes', 'tables'];
    for await (const entityType of entityTypes) {
      switch (entityType) {
        case 'scenes':
          // eslint-disable-next-line no-case-declarations
          const sceneData = [];
          for await (const entity of Object.values(this.imported.Scene)) {
            sceneData.push({
              _id: entity.data._id,
              thumb: entity.data.thumb,
            });
          }
          await Scene.updateDocuments(sceneData);
          break;
        case 'journal':
          // eslint-disable-next-line no-case-declarations
          const journalData = duplicate(Object.values(this.imported.JournalEntry));
          for (const journalEntry of journalData) {
            const flag = journalEntry.data?.flags[this.moduleName]?.folder.sort;
            if (flag) await journalEntry.updateDocuments('sort', flag);
          }
          break;
      }
    }
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

  async readManifest() {
    const r = await (await fetch(this.manifestPath))
      .json()
      .catch((e) => console.warn('MANIFEST ERROR: \nYou likely have nothing in your manifest, or it may be improperly formatted.', e));
    return r;
  }

  async renderWelcome() {
    setTimeout(() => {
      try {
        game.scenes.getName(this.sceneToActivate).activate();
        Dialog.prompt({
          title: `${this.moduleTitle} Importer`,
          content: `<p>Welcome to the <strong>${this.moduleTitle}</strong> <br><br> All assets have been imported.`,
          label: 'Okay!',
          callback: () => game.journal.getName(this.postImportJournalName).show(),
        });
      } catch (e) {
        console.error("Couldn't initialize welcome: ", e);
      }
    }, 500);
  }
}
