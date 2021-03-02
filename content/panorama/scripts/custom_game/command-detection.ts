/**
 * Dictionary object for commands to detect.
 */
const shouldDetectCommand = new Set<number>();
const addedKeybind = new Set<string>();

function onCommand(command: DOTAKeybindCommand_t) {
    if (shouldDetectCommand.has(command)) {
        GameEvents.SendCustomGameEventToServer("command_detected", { command: command });
        shouldDetectCommand.delete(command);
    }
}

GameEvents.Subscribe("detect_command", event => {
    const { command } = event;

    shouldDetectCommand.add(command);

    const keybind = Game.GetKeybindForCommand(command);

    if (!addedKeybind.has(keybind)) {
        const commandName = `Command_${event.command}`;

        Game.CreateCustomKeyBind(keybind, commandName);
        Game.AddCommand(commandName, () => onCommand(command), "", 0);
        addedKeybind.add(keybind);
    }
});
