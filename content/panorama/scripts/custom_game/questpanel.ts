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

const goalRows: GoalRow[] = []

type GoalRow = {
    label: LabelPanel
    bulletPoint: Panel
    rowPanel: Panel
    goal: NetworkedData<Goal>
}

function createGoalRow(questPanel: Panel, goal: NetworkedData<Goal>): GoalRow {
    const localizeInline = GameUI.CustomUIConfig().localizeInline;

    const rowPanel = $.CreatePanel("Panel", questPanel, "");
    rowPanel.AddClass("Row");

    const bulletPoint = $.CreatePanel("Panel", rowPanel, "");
    bulletPoint.AddClass(goal.completed ? "QuestsCompleted" : "QuestsUncompleted");

    const label = $.CreatePanel("Label", rowPanel, "");
    label.AddClass(goal.completed ? "QuestCompletedText" : "QuestUncompletedText");
    label.text = localizeInline(goal.text);

    label.AddClass("TextGlow");

    return {
        bulletPoint,
        label,
        rowPanel,
        goal,
    }
}

GameEvents.Subscribe("set_goals", event => {
    const localizeInline = GameUI.CustomUIConfig().localizeInline;

    const questPanel = $("#QuestsPanelContainer");

    const newGoals = parseServerArray(event.goals);

    // Add or remove new rows as required
    if (newGoals.length > goalRows.length) {
        for (let i = goalRows.length; i < newGoals.length; i++) {
            goalRows.push(createGoalRow(questPanel, newGoals[i]));
        }
    } else if (newGoals.length < goalRows.length) {
        for (let i = goalRows.length - 1; i >= newGoals.length; i--) {
            goalRows[i].rowPanel.DeleteAsync(0);
        }

        goalRows.splice(newGoals.length);
    }

    // Update the rows
    for (let i = 0; i < newGoals.length; i++) {
        const newGoal = newGoals[i];
        const currentGoal = goalRows[i].goal

        let shouldHighlight = false;

        // Check if the goal at this index changed

        if (currentGoal.completed !== newGoal.completed) {
            goalRows[i].bulletPoint.RemoveClass(currentGoal.completed ? "QuestsCompleted" : "QuestsUncompleted");
            goalRows[i].label.RemoveClass(currentGoal.completed ? "QuestCompletedText" : "QuestUncompletedText");
            goalRows[i].bulletPoint.AddClass(newGoal.completed ? "QuestsCompleted" : "QuestsUncompleted");
            goalRows[i].label.AddClass(newGoal.completed ? "QuestCompletedText" : "QuestUncompletedText");

            // Highlight newly active goals
            if (!newGoal.completed) {
                shouldHighlight = true;
            }
        }

        if (goalRows[i].goal.text !== newGoal.text) {
            goalRows[i].label.text = localizeInline(newGoal.text);
            // Highlight changed goals
            shouldHighlight = true;
        }

        // Add an animation if desired
        if (shouldHighlight) {
            goalRows[i].label.RemoveClass("TextGlow");
            goalRows[i].label.AddClass("TextGlow");
        }

        goalRows[i].goal = newGoal
    }
});
