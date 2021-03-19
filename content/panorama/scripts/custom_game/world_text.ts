type WorldText = {
    panel: LabelPanel
    location: [number, number, number]
}

(() => {
    const root = $.GetContextPanel();
    const worldTexts = new Map<number, WorldText>()

    function addWorldText(index: number, text: string, location: [number, number, number]) {
        const panel = $.CreatePanel("Label", root, "")
        panel.text = text;
        panel.AddClass("WorldText")

        worldTexts.set(index, {
            panel,
            location,
        })
    }

    function removeWorldText(index: number) {
        const worldText = worldTexts.get(index)
        if (worldText) {
            worldTexts.delete(index)
            worldText.panel.DeleteAsync(0);
        } else {
            $.Warning("Tried to delete non-existent world text with index", index)
        }
    }

    function update() {
        const ratio = 1080 / Game.GetScreenHeight();

        for (const { location, panel } of worldTexts.values()) {
            const screenLocation = [
                Game.WorldToScreenX(...location),
                Game.WorldToScreenY(...location)
            ]

            panel.style.x = `${Math.round(screenLocation[0] * ratio)}px`
            panel.style.y = `${Math.round(screenLocation[1] * ratio)}px`
        }

        $.Schedule(0.01, update);
    }

    GameEvents.Subscribe("add_world_text", event => addWorldText(event.index, event.text, [event.location.x, event.location.y, event.location.z]))
    GameEvents.Subscribe("remove_world_text", event => removeWorldText(event.index))

    $.Schedule(0.01, update);
})();
