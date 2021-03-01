export abstract class TrackableGoal {
    private _completed = false
    private _started = false

    /**
     * Marks the goal as completed. Also marks it as started if it wasn't started already.
     */
    complete() {
        this._started = true
        this._completed = true
    }

    /**
     * Marks the goal as started.
     */
    start() {
        this._started = true
    }

    /**
     * Whether the goal was completed.
     */
    get completed() { return this._completed }

    /**
     * Whether the goal was started.
     */
    get started() { return this._started }

    abstract getGoal(): Goal
}

export class TrackableGoalBoolean extends TrackableGoal {
    private _value: number = 0

    constructor(readonly text: string) {
        super()
    }

    getGoal(): Goal {
        return {
            completed: this.completed,
            text: this.text
        }
    }
}

export class TrackableGoalNumeric extends TrackableGoal {
    private _value: number = 0

    constructor(readonly text: string, readonly maximum: number) {
        super()
    }

    /**
     * Sets the value of the numeric goal.
     * @param value Value of the numeric goal.
     */
    setValue(value: number) {
        if (value < 0 || value > this.maximum) {
            Warning("Set numeric goal value outside of its range")
        }

        this._value = value
    }

    /**
     * Gets the value of the numeric goal.
     */
    get value() {
        return
    }

    getGoal(): Goal {
        return {
            completed: this.completed,
            text: this.text + ": " + this._value + "/" + this.maximum
        }
    }
}

/**
 * Creates trackable goals and provides a function for creating the UI goals from them.
 */
export class GoalTracker {
    readonly states: TrackableGoal[] = []

    /**
     * Adds a boolean goal.
     * @param text Text for the goal.
     */
    addBoolean(text: string): TrackableGoalBoolean {
        const state = new TrackableGoalBoolean(text)
        this.states.push(state)
        return state
    }

    /**
     * Adds a numeric goal that starts at 0 and goes up to maximum.
     * @param text Text for the goal.
     * @param maximum Maximum number for the goal.
     */
    addNumeric(text: string, maximum: number): TrackableGoalNumeric {
        const state = new TrackableGoalNumeric(text, maximum)
        this.states.push(state)
        return state
    }

    /**
     * Creates UI goals for the tracked goals.
     */
    getGoals(): Goal[] {
        const goals: Goal[] = []

        for (const state of this.states) {
            if (state.started || state.completed) {
                goals.push(state.getGoal())
            }
        }

        return goals
    }
}
