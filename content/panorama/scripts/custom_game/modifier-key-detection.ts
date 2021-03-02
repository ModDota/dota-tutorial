const shouldDetectModifierKeys = new Set<ModifierKey>();

function detectModifierKeys() {
    for (const key of shouldDetectModifierKeys.values()) {
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
            shouldDetectModifierKeys.delete(key);
        }
    }

    $.Schedule(0.2, detectModifierKeys);
}

detectModifierKeys();

GameEvents.Subscribe("detect_modifier_key", event => {
    shouldDetectModifierKeys.add(event.key);
});
