import { COMMON } from '../common.js';
export class SymbaroumJournalSheet extends JournalSheet {
    static NAME = 'SymbaroumJournalSheet';
    get journal() {
        return this.object;
    }

    static register() {
        this.globals();
        this.build();
    }

    static build() {
        this.buildWideSheet(SymbaroumJournalSheet);
    }

    /* -------------------------------------------- */

    static globals() {
        game.syb5e.journalClasses = [];

    }

    _onConfigureSheet(event) {
        event.preventDefault();
        new DocumentSheetConfig(this.journal, {
            top: this.position.top + 40,
            left: this.position.left + ((this.position.width - 400) / 2)
        }).render(true);
    };

    static buildWideSheet(parentClass) {
        class SymbaroumWide extends parentClass {
            static NAME = 'SymbaroumWide';
            static get defaultOptions() {
                const options = super.defaultOptions;
                options.width = 1268
                // edit below for a custom css class
                options.classes.push('symbaroum-dnd5e-mod');
                return options;
            }

            static register() {
                /* register our sheet */
                Journal.registerSheet('syb5e', SymbaroumWide, {
                    makeDefault: false,
                    label: COMMON.localize('SYB5E.journal.widejournal.name'),
                });
            }


        }
        SymbaroumWide.register();

        game.syb5e.journalClasses.push('SymbaroumWide');

    }
}