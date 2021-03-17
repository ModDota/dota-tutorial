(() => {
    const updateInterval = 0.01;

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

    let wasVoiceVisible = false;

    // "Hud/VoiceChat" class "Transmitting"/"NotTransmitting" & "ShowSelf"
    // Detect when the voice chat element's "ShowSelf" class gets removed (=released voice key)
    const voiceLazy = new Lazy<Panel>(() => findPanelAtPath("VoiceChat"));

    function checkVoiceChat() {
        const voice = voiceLazy.get();
        if (voice) {
            const isVoiceVisible = voice.BHasClass("ShowSelf");
            if (wasVoiceVisible && !isVoiceVisible) {
                GameEvents.SendCustomGameEventToServer("voice_chat", {});
            }

            wasVoiceVisible = isVoiceVisible;
        } else {
            wasVoiceVisible = false;
        }

        $.Schedule(updateInterval, checkVoiceChat);
    }

    $.Schedule(updateInterval, checkVoiceChat);
})();
