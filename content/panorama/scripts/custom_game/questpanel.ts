/**
 * Converts an array that was passed from the server to a normal array.
 * @param array Array passed from the server which got converted into an object.
 */
// TODO: Move this to a common place
function parseServerArray<T>(array: { [key: string]: T }): T[] {
    const result: T[] = [];

    for (const index in array) {
        result[parseInt(index) - 1] = array[index];
    }

    return result;
}

GameEvents.Subscribe("set_goals", event => {
    // Clear the goals list and add each goal to the list.
    const questPanel = $("#QuestsPanelContainer");
    questPanel.RemoveAndDeleteChildren()

    // TODO: Should we make sure that the goals are sorted by index?
    for (const goal of parseServerArray(event.goals)) {
        const rowPanel = $.CreatePanel("Panel", questPanel, "");
        rowPanel.AddClass("Row");

        const bulletPoint = $.CreatePanel("Panel", rowPanel, "");
        bulletPoint.AddClass(goal.completed ? "QuestsCompleted" : "QuestsUncompleted");

        const label = $.CreatePanel("Label", rowPanel, "");
        label.AddClass(goal.completed ? "QuestCompletedText" : "QuestUncompletedText");
        label.text = goal.text;

        $.Msg("Goal:", goal)
    }
});
