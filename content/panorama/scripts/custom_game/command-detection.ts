/**
 * Dictionary object for commands to detect.
 */
const shouldDetectCommand: { [key: number]: boolean } = {};
const addedKeybind: { [key: string]: boolean } = {};

function onCommand(command: DOTAKeybindCommand_t) {
    if (shouldDetectCommand[command]) {
        GameEvents.SendCustomGameEventToServer("command_detected", { command: command });
        shouldDetectCommand[command] = false;
    }
}

GameEvents.Subscribe("detect_command", event => {
    const { command } = event;

    shouldDetectCommand[command] = true;

    const keybind = Game.GetKeybindForCommand(command);

    if (!addedKeybind[keybind]) {
        const commandName = `Command_${event.command}`

        Game.CreateCustomKeyBind(keybind, commandName)
        Game.AddCommand(commandName, () => onCommand(command), "", 0);
        addedKeybind[keybind] = true
    }
});
