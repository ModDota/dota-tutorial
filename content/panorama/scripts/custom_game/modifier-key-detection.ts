const shouldDetectModifierKeys: { [key: string]: boolean } = {};

function detectModifierKeys() {
    for (const key of Object.keys(shouldDetectModifierKeys).map(k => parseInt(k) as ModifierKey)) {
        if (shouldDetectModifierKeys[key]) {
            let isDown = false;

            switch (key) {
                case ModifierKey.Alt:
                    isDown = GameUI.IsAltDown();
                    break;
                case ModifierKey.Shift:
                    isDown = GameUI.IsShiftDown();
                    break;
                case ModifierKey.Control:
                    isDown = GameUI.IsControlDown();
                    break;
            }

            if (isDown) {
                GameEvents.SendCustomGameEventToServer("modifier_key_detected", { key });
                shouldDetectModifierKeys[key] = false;
            }
        }
    }

    $.Schedule(0.2, detectModifierKeys);
}

detectModifierKeys();

GameEvents.Subscribe("detect_modifier_key", event => {
    shouldDetectModifierKeys[event.key] = true;
});
