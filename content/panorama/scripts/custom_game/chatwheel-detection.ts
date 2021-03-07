let wasChatWheelOpen: boolean = false;
let selectedPhrase: number | undefined;

const numPhrases = 8;
const updateInterval = 0.01;

(() => {
    const hudRoot = $.GetContextPanel().GetParent()!.GetParent()!;
    function findPanelAtPath(path: string): Panel | undefined {
        const splitPath = path.split("/");
        let panel = hudRoot;
        for (let i = 0; i < splitPath.length; i++) {
            const child = panel.FindChild(splitPath[i]);
            if (child === null) {
                return undefined;
            }
            panel = child;
        }
        return panel;
    }

    class Lazy<T> {
        private _value: T | undefined = undefined
        constructor(private readonly getFn: () => T | undefined) {

        }

        get() {
            if (this._value === undefined) {
                this._value = this.getFn();
            }

            return this._value;
        }
    }

    // Lazily get the UI elements because eg. the phrases aren't there until the player opens the chatwheel.
    const chatWheelLazy = new Lazy<Panel>(() => findPanelAtPath("ChatWheel"));
    const phrasesLazy: Lazy<Panel>[] = [];
    for (let i = 0; i < numPhrases; i++) {
        phrasesLazy.push(new Lazy<Panel>(() => findPanelAtPath(`ChatWheel/PhrasesContainer/Phrase${i}`)));
    }

    function checkChatWheel() {
        const chatWheel = chatWheelLazy.get();
        if (chatWheel) {
            // Check whether the chat wheel was just closed
            const isChatWheelOpen = chatWheel.visible;
            if (wasChatWheelOpen && !isChatWheelOpen && selectedPhrase !== undefined) {
                GameEvents.SendCustomGameEventToServer("chat_wheel_phrase_selected", { phraseIndex: selectedPhrase });
            }

            wasChatWheelOpen = isChatWheelOpen;

            // Detect currently selected phrase using class .Selected
            selectedPhrase = undefined;
            for (let i = 0; i < numPhrases; i++) {
                const phrase = phrasesLazy[i].get();
                if (phrase && phrase.BHasClass("Selected")) {
                    selectedPhrase = i;
                    break;
                }
            }
        } else {
            wasChatWheelOpen = false;
        }

        $.Schedule(updateInterval, checkChatWheel);
    }

    $.Schedule(updateInterval, checkChatWheel);
})();
